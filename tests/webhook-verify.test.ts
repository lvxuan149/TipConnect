/**
 * Webhook Verification Tests
 * Tests for Solana transaction verification via webhooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTransaction, verifyTransactions, createEventVerification, isValidSignature } from '@/lib/helius';

// Mock fetch for Helius API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Helius Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.HELIUS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isValidSignature', () => {
    it('should validate correct signature format', () => {
      const validSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x';
      expect(isValidSignature(validSignature)).toBe(true);
    });

    it('should reject invalid signature length', () => {
      const invalidSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3';
      expect(isValidSignature(invalidSignature)).toBe(false);
    });

    it('should reject signatures with invalid characters', () => {
      const invalidSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x0';
      expect(isValidSignature(invalidSignature)).toBe(false);
    });

    it('should reject empty signatures', () => {
      expect(isValidSignature('')).toBe(false);
    });
  });

  describe('verifyTransaction', () => {
    const mockSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x';

    it('should verify a valid transaction successfully', async () => {
      const mockResponse = {
        signature: mockSignature,
        slot: 123456789,
        blockTime: 1635678900,
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000, 2000000],
          postBalances: [995000, 2005000],
          innerInstructions: [],
          logMessages: ['Program log: Instruction: Transfer']
        },
        transaction: {
          message: {
            accountKeys: ['11111111111111111111111111111111', '22222222222222222222222222222222'],
            instructions: [{
              programIdIndex: 0,
              accounts: [0, 1],
              data: 'base64data'
            }],
            recentBlockhash: 'ELe7xeDeC91Kk3eLyTqCZixH3JGSQp2tM9bBuEBwJr7U'
          },
          signatures: [mockSignature]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: true,
        signature: mockSignature,
        slot: 123456789,
        verifiedAt: expect.any(Date)
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/transactions/${mockSignature}?api-key=test-api-key`)
      );
    });

    it('should handle transaction not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Transaction not found'
      });

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: false,
        signature: mockSignature,
        error: 'Transaction not found',
        errorCode: 'TRANSACTION_NOT_FOUND'
      });
    });

    it('should handle failed transactions', async () => {
      const mockResponse = {
        signature: mockSignature,
        slot: 123456789,
        blockTime: 1635678900,
        meta: {
          err: { InstructionError: [0, 'CustomProgramError'] },
          fee: 5000,
          preBalances: [1000000, 2000000],
          postBalances: [1000000, 2000000],
          innerInstructions: [],
          logMessages: ['Program log: Error: Custom program error']
        },
        transaction: {
          message: {
            accountKeys: ['11111111111111111111111111111111'],
            instructions: [],
            recentBlockhash: 'ELe7xeDeC91Kk3eLyTqCZixH3JGSQp2tM9bBuEBwJr7U'
          },
          signatures: [mockSignature]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: false,
        signature: mockSignature,
        error: expect.stringContaining('Transaction failed'),
        errorCode: 'TRANSACTION_FAILED',
        slot: 123456789
      });
    });

    it('should handle unconfirmed transactions (slot = 0)', async () => {
      const mockResponse = {
        signature: mockSignature,
        slot: 0,
        blockTime: null,
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000],
          postBalances: [1000000],
          innerInstructions: [],
          logMessages: []
        },
        transaction: {
          message: {
            accountKeys: ['11111111111111111111111111111111'],
            instructions: [],
            recentBlockhash: 'ELe7xeDeC91Kk3eLyTqCZixH3JGSQp2tM9bBuEBwJr7U'
          },
          signatures: [mockSignature]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: false,
        signature: mockSignature,
        error: 'Transaction not confirmed (slot = 0)',
        errorCode: 'UNCONFIRMED'
      });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: false,
        signature: mockSignature,
        error: 'Helius API error: 500 - Internal server error',
        errorCode: 'API_ERROR'
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyTransaction(mockSignature);

      expect(result).toEqual({
        success: false,
        signature: mockSignature,
        error: 'Network error',
        errorCode: 'NETWORK_ERROR'
      });
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.HELIUS_API_KEY;

      await expect(verifyTransaction(mockSignature)).rejects.toThrow(
        'HELIUS_API_KEY is not configured'
      );
    });
  });

  describe('verifyTransactions', () => {
    it('should verify multiple transactions in batches', async () => {
      const signatures = [
        '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x',
        '2k9t8H1yJ5vR3zL6wP4sQ7nX2mU5iO8fG1dA3bC6eF9hJ2kL4mN6pR8sT1vW3xY5z'
      ];

      // Mock successful responses for both signatures
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            signature: signatures[0],
            slot: 123456789,
            meta: { err: null },
            transaction: { message: { accountKeys: [] }, signatures: [signatures[0]] }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            signature: signatures[1],
            slot: 123456790,
            meta: { err: null },
            transaction: { message: { accountKeys: [] }, signatures: [signatures[1]] }
          })
        });

      const results = await verifyTransactions(signatures);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure in batch', async () => {
      const signatures = [
        '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x',
        'invalid_signature'
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            signature: signatures[0],
            slot: 123456789,
            meta: { err: null },
            transaction: { message: { accountKeys: [] }, signatures: [signatures[0]] }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Transaction not found'
        });

      const results = await verifyTransactions(signatures);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].errorCode).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('createEventVerification', () => {
    const mockEventId = 'event_123';

    it('should create successful verification record', async () => {
      const mockSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: mockSignature,
          slot: 123456789,
          meta: { err: null },
          transaction: { message: { accountKeys: [] }, signatures: [mockSignature] }
        })
      });

      const result = await createEventVerification({
        eventId: mockEventId,
        signature: mockSignature
      });

      expect(result).toEqual({
        id: expect.any(String),
        eventId: mockEventId,
        status: 'verified',
        signature: mockSignature,
        slot: 123456789,
        heliusResponse: expect.stringContaining('"success":true'),
        verifiedAt: expect.any(Date)
      });
    });

    it('should reject invalid signature format', async () => {
      await expect(createEventVerification({
        eventId: mockEventId,
        signature: 'invalid_signature'
      })).rejects.toThrow('Invalid signature format: invalid_signature');
    });

    it('should create failed verification record', async () => {
      const mockSignature = '5j7s8F2Xg4V9Z3K1pN6qR8wT3Y5uI7oE2a9bC4d1f6gH8jK3mN5pQ7rS9tU1vW3x';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Transaction not found'
      });

      const result = await createEventVerification({
        eventId: mockEventId,
        signature: mockSignature
      });

      expect(result).toEqual({
        id: expect.any(String),
        eventId: mockEventId,
        status: 'failed',
        signature: mockSignature,
        heliusResponse: expect.stringContaining('"success":false'),
        errorCode: 'TRANSACTION_NOT_FOUND'
      });
    });
  });
});
