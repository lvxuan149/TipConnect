import { createHash, createHmac } from 'crypto';

// Helius RPC response interface matching contract
export interface HeliusTxResponse {
  signature: string;
  slot: number;
  amount: number;
  from: string;
  to: string;
  timestamp: number;
  blockTime?: number;
  meta?: {
    err: null | any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
  };
}

// Internal RPC response structure from Helius
interface HeliusRpcResponse {
  jsonrpc: string;
  id: number;
  result: HeliusTransactionDetail | null;
}

interface HeliusTransactionDetail {
  slot: number;
  transaction: {
    message: {
      accountKeys: string[];
      recentBlockhash: string;
      instructions: any[];
    };
    signatures: string[];
  };
  meta: {
    err: null | any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    logMessages: string[];
    preTokenBalances: any[];
    postTokenBalances: any[];
    innerInstructions: any[];
    computeUnitsConsumed?: number;
  };
  blockTime?: number;
  confirmationStatus?: 'confirmed' | 'finalized';
}

// Helius client configuration
const HELIUS_API_BASE = process.env.HELIUS_API_BASE || 'https://rpc.helius.xyz';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

if (!HELIUS_API_KEY) {
  console.warn('HELIUS_API_KEY not found in environment variables');
}

/**
 * Fetch transaction details from Helius RPC API
 * @param signature Solana transaction signature
 * @returns Formatted transaction response or null if not found
 */
export async function getHeliusTx(signature: string): Promise<HeliusTxResponse | null> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${HELIUS_API_BASE}/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Helius RPC error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: HeliusRpcResponse = await response.json();

    if (!data.result) {
      console.log(`Transaction not found: ${signature}`);
      return null;
    }

    const tx = data.result;

    // Extract transfer information from meta
    const { meta, slot, blockTime } = tx;
    const timestamp = blockTime ? blockTime * 1000 : Date.now(); // Convert to milliseconds

    // Calculate amount transferred (simplified - assumes SOL transfer)
    let amount = 0;
    let from = '';
    let to = '';

    if (meta && meta.preBalances && meta.postBalances && meta.preBalances.length >= 2) {
      const balanceChange = meta.postBalances[0] - meta.preBalances[0];
      amount = Math.abs(balanceChange) / 1e9; // Convert lamports to SOL

      // Determine direction based on balance change
      if (balanceChange < 0) {
        from = tx.transaction.message.accountKeys[0];
        to = tx.transaction.message.accountKeys[1];
      } else {
        from = tx.transaction.message.accountKeys[1];
        to = tx.transaction.message.accountKeys[0];
      }
    }

    return {
      signature,
      slot,
      amount,
      from,
      to,
      timestamp,
      blockTime,
      meta,
    };
  } catch (error) {
    console.error('Error fetching Helius transaction:', error);
    return null;
  }
}

/**
 * Verify transaction signature and basic validity
 * @param tx Transaction response from Helius
 * @returns boolean indicating if transaction is valid
 */
export function verifyTransactionSignature(tx: HeliusTxResponse): boolean {
  // Basic validation checks
  if (!tx.signature || !tx.from || !tx.to) {
    return false;
  }

  if (tx.amount <= 0) {
    return false;
  }

  // Check if transaction has no errors
  if (tx.meta?.err !== null) {
    return false;
  }

  // Additional signature validation could be added here
  // For now, we trust Helius's response since the transaction was found
  return true;
}

/**
 * Validate Helius webhook signature
 * @param payload Raw webhook payload
 * @param signature x-helius-signature header value
 * @param secret Helius webhook secret
 * @returns boolean indicating if signature is valid
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Use timing-safe comparison
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Error types for structured error handling
 */
export const VerificationErrors = {
  TX_NOT_FOUND: 'tx_not_found',
  INVALID_SIGNATURE: 'invalid_signature',
  AMOUNT_MISMATCH: 'amount_mismatch',
  RPC_TIMEOUT: 'rpc_timeout',
  RPC_ERROR: 'rpc_error',
  NETWORK_ERROR: 'network_error',
} as const;

export type VerificationError = typeof VerificationErrors[keyof typeof VerificationErrors];
