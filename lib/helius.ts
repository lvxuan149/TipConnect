/**
 * Helius Transaction Verification Library
 * Handles verification of Solana transactions via Helius API
 */

const HELIUS_API_BASE = process.env.HELIUS_API_URL || 'https://api.devnet.helius.dev';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

export interface HeliusTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  meta: {
    err: any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions: any[];
    logMessages: string[];
  };
  transaction: {
    message: {
      accountKeys: string[];
      instructions: any[];
      recentBlockhash: string;
    };
    signatures: string[];
  };
}

export interface VerificationResult {
  success: boolean;
  signature: string;
  slot?: number;
  error?: string;
  errorCode?: string;
  verifiedAt?: Date;
}

export interface EventVerificationInput {
  eventId: string;
  signature: string;
}

/**
 * Verify a Solana transaction signature via Helius API
 */
export async function verifyTransaction(signature: string): Promise<VerificationResult> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${HELIUS_API_BASE}/v0/transactions/${signature}?api-key=${HELIUS_API_KEY}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          signature,
          error: 'Transaction not found',
          errorCode: 'TRANSACTION_NOT_FOUND'
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        signature,
        error: `Helius API error: ${response.status} - ${errorText}`,
        errorCode: 'API_ERROR'
      };
    }

    const tx: HeliusTransaction = await response.json();

    // Verify transaction is valid and confirmed
    if (tx.meta?.err) {
      return {
        success: false,
        signature,
        error: `Transaction failed: ${JSON.stringify(tx.meta.err)}`,
        errorCode: 'TRANSACTION_FAILED',
        slot: tx.slot
      };
    }

    if (!tx.slot || tx.slot === 0) {
      return {
        success: false,
        signature,
        error: 'Transaction not confirmed (slot = 0)',
        errorCode: 'UNCONFIRMED'
      };
    }

    return {
      success: true,
      signature,
      slot: tx.slot,
      verifiedAt: new Date()
    };

  } catch (error) {
    console.error('Error verifying transaction with Helius:', error);
    return {
      success: false,
      signature,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Verify multiple transactions in parallel
 */
export async function verifyTransactions(signatures: string[]): Promise<VerificationResult[]> {
  const batchSize = 5; // Limit concurrent requests
  const results: VerificationResult[] = [];

  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(signature => verifyTransaction(signature))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          signature: batch[index],
          error: `Batch verification failed: ${result.reason}`,
          errorCode: 'BATCH_ERROR'
        });
      }
    });
  }

  return results;
}

/**
 * Extract transaction details relevant for tip verification
 */
export function extractTipDetails(tx: HeliusTransaction): {
  signer: string;
  receiver?: string;
  amount?: number;
  type: string;
} {
  // Extract signer (first signature)
  const signer = tx.transaction.signatures[0];

  // Analyze instructions to determine transaction type and details
  let type = 'unknown';
  let receiver: string | undefined;
  let amount: number | undefined;

  for (const instruction of tx.transaction.message.instructions) {
    // This is a simplified implementation
    // In practice, you'd need to decode specific instruction types
    // based on your tip/transfer logic

    if (instruction.programIdIndex !== undefined) {
      const programId = tx.transaction.message.accountKeys[instruction.programIdIndex];

      // Check for SPL transfer instruction
      if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        type = 'tip';
        // Extract receiver and amount from instruction data
        // This would need proper instruction decoding
      }
    }
  }

  return { signer, receiver, amount, type };
}

/**
 * Check if signature is a valid base58 string
 */
export function isValidSignature(signature: string): boolean {
  try {
    // Basic validation - check length and characters
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature) &&
           signature.length >= 88 &&
           signature.length <= 88;
  } catch {
    return false;
  }
}

/**
 * Background verification worker function
 */
export async function createEventVerification(input: EventVerificationInput): Promise<{
  id: string;
  eventId: string;
  status: 'pending' | 'verified' | 'failed';
  signature: string;
  slot?: number;
  heliusResponse: Record<string, unknown>;
  errorCode?: string;
  verifiedAt?: Date;
}> {
  if (!isValidSignature(input.signature)) {
    throw new Error(`Invalid signature format: ${input.signature}`);
  }

  const verification = await verifyTransaction(input.signature);

  return {
    id: crypto.randomUUID(),
    eventId: input.eventId,
    status: verification.success ? 'verified' : 'failed',
    signature: verification.signature,
    slot: verification.slot,
    heliusResponse: {
      success: verification.success,
      slot: verification.slot,
      verifiedAt: verification.verifiedAt?.toISOString(),
      error: verification.error
    },
    errorCode: verification.errorCode,
    verifiedAt: verification.verifiedAt
  };
}
