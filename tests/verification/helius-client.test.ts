import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getHeliusTx, verifyTransactionSignature, verifyWebhookSignature } from '@/lib/helius';

// Mock fetch for Helius RPC calls
global.fetch = vi.fn();

describe('lib/helius - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    process.env.HELIUS_API_KEY = 'test_api_key';
  });

  describe('getHeliusTx', () => {
    it('should fetch and format transaction data successfully', async () => {
      const mockSignature = 'test_signature';
      const mockRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          slot: 12345678,
          transaction: {
            message: {
              accountKeys: ['sender_address', 'receiver_address'],
              recentBlockhash: 'blockhash',
              instructions: [],
            },
            signatures: [mockSignature],
          },
          meta: {
            err: null,
            fee: 5000,
            preBalances: [1000000000, 500000000],
            postBalances: [998500000, 501000000],
            logMessages: [],
            preTokenBalances: [],
            postTokenBalances: [],
            innerInstructions: [],
          },
          blockTime: 1698512345,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockRpcResponse),
      } as Response);

      const result = await getHeliusTx(mockSignature);

      expect(result).toEqual({
        signature: mockSignature,
        slot: 12345678,
        amount: 0.0015, // (500000000 lamports)
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: 1698512345000, // Convert seconds to milliseconds
        blockTime: 1698512345,
        meta: mockRpcResponse.result.meta,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://rpc.helius.xyz/?api-key=test_api_key',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [
              mockSignature,
              {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
              },
            ],
          }),
        })
      );
    });

    it('should return null when transaction not found', async () => {
      const mockSignature = 'nonexistent_signature';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: 1,
          result: null,
        }),
      } as Response);

      const result = await getHeliusTx(mockSignature);

      expect(result).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      const mockSignature = 'error_signature';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getHeliusTx(mockSignature);

      expect(result).toBeNull();
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.HELIUS_API_KEY;

      await expect(getHeliusTx('test_signature')).rejects.toThrow(
        'HELIUS_API_KEY environment variable is required'
      );
    });

    it('should handle network errors', async () => {
      const mockSignature = 'network_error_signature';

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await getHeliusTx(mockSignature);

      expect(result).toBeNull();
    });
  });

  describe('verifyTransactionSignature', () => {
    it('should verify valid transaction', () => {
      const validTx = {
        signature: 'valid_signature',
        slot: 12345678,
        amount: 1.5,
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: Date.now(),
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000000],
          postBalances: [998500000],
        },
      };

      const result = verifyTransactionSignature(validTx);

      expect(result).toBe(true);
    });

    it('should reject transaction without signature', () => {
      const invalidTx = {
        signature: '',
        slot: 12345678,
        amount: 1.5,
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: Date.now(),
      };

      const result = verifyTransactionSignature(invalidTx);

      expect(result).toBe(false);
    });

    it('should reject transaction with zero or negative amount', () => {
      const zeroAmountTx = {
        signature: 'test_signature',
        slot: 12345678,
        amount: 0,
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: Date.now(),
      };

      const negativeAmountTx = {
        signature: 'test_signature',
        slot: 12345678,
        amount: -1.5,
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: Date.now(),
      };

      expect(verifyTransactionSignature(zeroAmountTx)).toBe(false);
      expect(verifyTransactionSignature(negativeAmountTx)).toBe(false);
    });

    it('should reject transaction with errors', () => {
      const errorTx = {
        signature: 'test_signature',
        slot: 12345678,
        amount: 1.5,
        from: 'sender_address',
        to: 'receiver_address',
        timestamp: Date.now(),
        meta: {
          err: { type: 'InvalidAccountError' },
          fee: 5000,
        },
      };

      const result = verifyTransactionSignature(errorTx);

      expect(result).toBe(false);
    });

    it('should reject transaction without from/to addresses', () => {
      const incompleteTx = {
        signature: 'test_signature',
        slot: 12345678,
        amount: 1.5,
        from: '',
        to: '',
        timestamp: Date.now(),
      };

      const result = verifyTransactionSignature(incompleteTx);

      expect(result).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = '{"signature": "test_signature", "amount": 1.5}';
      const secret = 'webhook_secret';
      const expectedSignature = 'valid_hmac_signature';

      // Mock createHmac to return expected signature
      const mockCreateHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(expectedSignature),
      };

      vi.doMock('crypto', () => ({
        createHmac: vi.fn().mockReturnValue(mockCreateHmac),
      }));

      const result = verifyWebhookSignature(payload, expectedSignature, secret);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = '{"signature": "test_signature"}';
      const secret = 'webhook_secret';
      const validSignature = 'valid_hmac_signature';
      const invalidSignature = 'invalid_hmac_signature';

      const mockCreateHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(validSignature),
      };

      vi.doMock('crypto', () => ({
        createHmac: vi.fn().mockReturnValue(mockCreateHmac),
      }));

      const result = verifyWebhookSignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('should reject when signature or secret is missing', () => {
      const payload = 'test_payload';

      expect(verifyWebhookSignature(payload, '', 'secret')).toBe(false);
      expect(verifyWebhookSignature(payload, 'signature', '')).toBe(false);
      expect(verifyWebhookSignature(payload, '', '')).toBe(false);
    });
  });
});