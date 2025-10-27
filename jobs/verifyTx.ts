import { db } from "@/lib/db";
import { eventVerifications } from "@/drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { getHeliusTx, verifyTransactionSignature, VerificationErrors } from "@/lib/helius";

/**
 * Verification result interface
 */
interface VerificationResult {
  success: boolean;
  verificationId: string;
  signature: string;
  status: 'verified' | 'failed';
  error?: string;
  heliusResponse?: any;
  processingTime: number;
}

/**
 * Verify a single transaction signature
 * This is the main verification logic as specified in the API contract
 */
export async function verifyTx(signature: string): Promise<VerificationResult> {
  const startTime = Date.now();

  try {
    // Find the verification record
    const verificationRecord = await db
      .select()
      .from(eventVerifications)
      .where(eq(eventVerifications.tx_signature, signature))
      .limit(1);

    if (!verificationRecord.length) {
      throw new Error(`Verification record not found for signature: ${signature}`);
    }

    const verification = verificationRecord[0];

    // Skip if already verified
    if (verification.verification_status === 'verified') {
      return {
        success: true,
        verificationId: verification.id,
        signature,
        status: 'verified',
        processingTime: Date.now() - startTime,
      };
    }

    // Fetch transaction from Helius API
    const tx = await getHeliusTx(signature);

    if (!tx) {
      // Transaction not found - mark as failed
      await db
        .update(eventVerifications)
        .set({
          verification_status: 'failed',
          error_message: VerificationErrors.TX_NOT_FOUND,
          updated_at: new Date(),
        })
        .where(eq(eventVerifications.id, verification.id));

      return {
        success: false,
        verificationId: verification.id,
        signature,
        status: 'failed',
        error: VerificationErrors.TX_NOT_FOUND,
        processingTime: Date.now() - startTime,
      };
    }

    // Verify transaction signature and validity
    const isValid = verifyTransactionSignature(tx);

    if (isValid) {
      // Update verification record as verified
      await db
        .update(eventVerifications)
        .set({
          verification_status: 'verified',
          verified_at: new Date(),
          helius_response: tx,
          updated_at: new Date(),
        })
        .where(eq(eventVerifications.id, verification.id));

      console.log(`✅ Transaction verified: ${signature} (slot: ${tx.slot}, amount: ${tx.amount} SOL)`);

      return {
        success: true,
        verificationId: verification.id,
        signature,
        status: 'verified',
        heliusResponse: tx,
        processingTime: Date.now() - startTime,
      };
    } else {
      // Transaction verification failed
      await db
        .update(eventVerifications)
        .set({
          verification_status: 'failed',
          error_message: VerificationErrors.INVALID_SIGNATURE,
          helius_response: tx,
          updated_at: new Date(),
        })
        .where(eq(eventVerifications.id, verification.id));

      return {
        success: false,
        verificationId: verification.id,
        signature,
        status: 'failed',
        error: VerificationErrors.INVALID_SIGNATURE,
        heliusResponse: tx,
        processingTime: Date.now() - startTime,
      };
    }

  } catch (error) {
    console.error(`❌ Verification error for ${signature}:`, error);

    // Try to update error status if we can find the record
    try {
      const verificationRecord = await db
        .select()
        .from(eventVerifications)
        .where(eq(eventVerifications.tx_signature, signature))
        .limit(1);

      if (verificationRecord.length > 0) {
        await db
          .update(eventVerifications)
          .set({
            verification_status: 'failed',
            error_message: error instanceof Error ? error.message : VerificationErrors.RPC_ERROR,
            updated_at: new Date(),
          })
          .where(eq(eventVerifications.id, verificationRecord[0].id));
      }
    } catch (dbError) {
      console.error(`Failed to update error status for ${signature}:`, dbError);
    }

    return {
      success: false,
      verificationId: '',
      signature,
      status: 'failed',
      error: error instanceof Error ? error.message : VerificationErrors.RPC_ERROR,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Process pending verifications
 * This would typically be called by a cron job or background worker
 */
export async function processPendingVerifications(limit: number = 50): Promise<VerificationResult[]> {
  try {
    // Find pending verifications
    const pendingVerifications = await db
      .select()
      .from(eventVerifications)
      .where(eq(eventVerifications.verification_status, 'pending'))
      .limit(limit);

    if (!pendingVerifications.length) {
      console.log('No pending verifications to process');
      return [];
    }

    console.log(`Processing ${pendingVerifications.length} pending verifications...`);

    const results: VerificationResult[] = [];

    // Process each verification
    for (const verification of pendingVerifications) {
      const result = await verifyTx(verification.tx_signature);
      results.push(result);

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`Verification batch completed: ${successCount} success, ${failureCount} failures`);

    return results;
  } catch (error) {
    console.error('Error processing pending verifications:', error);
    throw error;
  }
}

/**
 * Retry failed verifications (optional retry logic)
 */
export async function retryFailedVerifications(maxRetries: number = 3): Promise<VerificationResult[]> {
  try {
    // Find failed verifications that haven't exceeded retry limit
    const failedVerifications = await db
      .select()
      .from(eventVerifications)
      .where(and(
        eq(eventVerifications.verification_status, 'failed'),
        // Note: We would need to add a retry_count column to track retries
        // For now, we'll retry all failed transactions
      ))
      .limit(20);

    if (!failedVerifications.length) {
      console.log('No failed verifications to retry');
      return [];
    }

    console.log(`Retrying ${failedVerifications.length} failed verifications...`);

    const results: VerificationResult[] = [];

    // Reset to pending and retry
    for (const verification of failedVerifications) {
      // Reset to pending status
      await db
        .update(eventVerifications)
        .set({
          verification_status: 'pending',
          error_message: null,
          updated_at: new Date(),
        })
        .where(eq(eventVerifications.id, verification.id));

      // Retry verification
      const result = await verifyTx(verification.tx_signature);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Error retrying failed verifications:', error);
    throw error;
  }
}

/**
 * Get verification statistics
 */
export async function getVerificationStats() {
  try {
    const stats = await db
      .select({
        pending: { count: eventVerifications.verification_status },
        verified: { count: eventVerifications.verification_status },
        failed: { count: eventVerifications.verification_status },
      })
      .from(eventVerifications)
      .groupBy(eventVerifications.verification_status);

    // Transform to object format
    const result = {
      pending: 0,
      verified: 0,
      failed: 0,
    };

    stats.forEach(stat => {
      if (stat.verification_status === 'pending') result.pending = Number(stat.count);
      if (stat.verification_status === 'verified') result.verified = Number(stat.count);
      if (stat.verification_status === 'failed') result.failed = Number(stat.count);
    });

    return result;
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return {
      pending: 0,
      verified: 0,
      failed: 0,
    };
  }
}

// CLI interface for manual testing
if (require.main === module) {
  const command = process.argv[2];

  async function runCommand() {
    try {
      switch (command) {
        case 'process':
          await processPendingVerifications();
          break;
        case 'retry':
          await retryFailedVerifications();
          break;
        case 'stats':
          const stats = await getVerificationStats();
          console.log('Verification Stats:', stats);
          break;
        default:
          if (command && command.startsWith('verify:')) {
            const signature = command.replace('verify:', '');
            const result = await verifyTx(signature);
            console.log('Verification Result:', result);
          } else {
            console.log('Usage: tsx jobs/verifyTx.ts [process|retry|stats|verify:<signature>]');
          }
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      process.exit(1);
    }
  }

  runCommand();
}