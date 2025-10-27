import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyTx, processPendingVerifications, getVerificationStats } from '@/jobs/verifyTx';
import { db } from '@/lib/db';
import { eventVerifications } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getHeliusTx, verifyTransactionSignature, VerificationErrors } from '@/lib/helius';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/helius', () => ({
  getHeliusTx: vi.fn(),
  verifyTransactionSignature: vi.fn(),
  VerificationErrors: {
    TX_NOT_FOUND: 'tx_not_found',
    INVALID_SIGNATURE: 'invalid_signature',
  },
}));

describe('/jobs/verifyTx - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyTx', () => {
    it('should verify a valid transaction successfully', async () => {
      const mockSignature = 'valid_tx_signature';
      const mockVerification = {
        id: 'verification_id',
        tx_signature: mockSignature,
        event_id: 'event_id',
        verification_status: 'pending',
      };

      const mockHeliusResponse = {
        signature: mockSignature,
        slot: 12345678,
        amount: 1.5,
        from: 'sender',
        to: 'receiver',
        timestamp: Date.now(),
      };

      // Mock database queries
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([mockVerification]),
        }),
      } as any);

      // Mock Helius API call
      vi.mocked(getHeliusTx).mockResolvedValue(mockHeliusResponse);
      vi.mocked(verifyTransactionSignature).mockReturnValue(true);

      // Mock database update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await verifyTx(mockSignature);

      expect(result.success).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.signature).toBe(mockSignature);
      expect(result.verificationId).toBe('verification_id');
      expect(result.heliusResponse).toEqual(mockHeliusResponse);

      // Verify database was updated with verified status
      expect(db.update).toHaveBeenCalledWith(eventVerifications);
    });

    it('should handle transaction not found', async () => {
      const mockSignature = 'nonexistent_tx_signature';
      const mockVerification = {
        id: 'verification_id',
        tx_signature: mockSignature,
        event_id: 'event_id',
        verification_status: 'pending',
      };

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([mockVerification]),
        }),
      } as any);

      vi.mocked(getHeliusTx).mockResolvedValue(null);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await verifyTx(mockSignature);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe(VerificationErrors.TX_NOT_FOUND);
    });

    it('should handle invalid transaction signature', async () => {
      const mockSignature = 'invalid_tx_signature';
      const mockVerification = {
        id: 'verification_id',
        tx_signature: mockSignature,
        event_id: 'event_id',
        verification_status: 'pending',
      };

      const mockHeliusResponse = {
        signature: mockSignature,
        slot: 12345678,
        amount: 1.5,
        from: 'sender',
        to: 'receiver',
        timestamp: Date.now(),
      };

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([mockVerification]),
        }),
      } as any);

      vi.mocked(getHeliusTx).mockResolvedValue(mockHeliusResponse);
      vi.mocked(verifyTransactionSignature).mockReturnValue(false);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await verifyTx(mockSignature);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe(VerificationErrors.INVALID_SIGNATURE);
    });

    it('should skip already verified transactions', async () => {
      const mockSignature = 'already_verified_signature';
      const mockVerification = {
        id: 'verification_id',
        tx_signature: mockSignature,
        event_id: 'event_id',
        verification_status: 'verified',
      };

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([mockVerification]),
        }),
      } as any);

      const result = await verifyTx(mockSignature);

      expect(result.success).toBe(true);
      expect(result.status).toBe('verified');
      expect(getHeliusTx).not.toHaveBeenCalled();
    });

    it('should handle missing verification record', async () => {
      const mockSignature = 'nonexistent_verification';

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(verifyTx(mockSignature)).rejects.toThrow(
        `Verification record not found for signature: ${mockSignature}`
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockSignature = 'error_tx_signature';
      const mockVerification = {
        id: 'verification_id',
        tx_signature: mockSignature,
        event_id: 'event_id',
        verification_status: 'pending',
      };

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([mockVerification]),
        }),
      } as any);

      vi.mocked(getHeliusTx).mockRejectedValue(new Error('Network error'));

      // Mock error update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await verifyTx(mockSignature);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Network error');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('processPendingVerifications', () => {
    it('should process pending verifications in batch', async () => {
      const pendingVerifications = [
        { id: 'v1', tx_signature: 'tx1', verification_status: 'pending' },
        { id: 'v2', tx_signature: 'tx2', verification_status: 'pending' },
        { id: 'v3', tx_signature: 'tx3', verification_status: 'pending' },
      ];

      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(pendingVerifications),
        }),
      } as any);

      // Mock verifyTx to return success for all
      vi.mocked(getHeliusTx).mockResolvedValue({
        signature: 'tx',
        slot: 12345678,
        amount: 1.5,
        from: 'sender',
        to: 'receiver',
        timestamp: Date.now(),
      });
      vi.mocked(verifyTransactionSignature).mockReturnValue(true);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const results = await processPendingVerifications(10);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(db.select).toHaveBeenCalledWith(eventVerifications);
    });

    it('should return empty array when no pending verifications', async () => {
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const results = await processPendingVerifications(10);

      expect(results).toHaveLength(0);
    });

    it('should handle processing errors', async () => {
      vi.mocked(db.select).mockRejectedValue(new Error('Database error'));

      await expect(processPendingVerifications(10)).rejects.toThrow('Database error');
    });
  });

  describe('getVerificationStats', () => {
    it('should return verification statistics', async () => {
      const mockStats = [
        { verification_status: 'pending', count: 5 },
        { verification_status: 'verified', count: 10 },
        { verification_status: 'failed', count: 2 },
      ];

      vi.mocked(db.select).mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(mockStats),
        }),
      } as any);

      const stats = await getVerificationStats();

      expect(stats).toEqual({
        pending: 5,
        verified: 10,
        failed: 2,
      });
    });

    it('should handle empty stats', async () => {
      vi.mocked(db.select).mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const stats = await getVerificationStats();

      expect(stats).toEqual({
        pending: 0,
        verified: 0,
        failed: 0,
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(db.select).mockRejectedValue(new Error('Database error'));

      const stats = await getVerificationStats();

      expect(stats).toEqual({
        pending: 0,
        verified: 0,
        failed: 0,
      });
    });
  });
});