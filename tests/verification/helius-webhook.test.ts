import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../lib/db';
import { eventVerifications, events } from '../../drizzle/schema';
import { verifyWebhookSignature } from '../../lib/helius';

// Mock dependencies
vi.mock('../../lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../lib/helius', () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock('../../jobs/verifyTx', () => ({
  verifyTx: vi.fn(),
}));

describe('/api/webhooks/helius - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without webhook secret', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: JSON.stringify({ signature: 'test_signature' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('should reject requests with invalid signature', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: JSON.stringify({ signature: 'test_signature' }),
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'invalid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('should accept requests with valid signature', async () => {
      const payload = JSON.stringify({ signature: 'test_signature' });
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: payload,
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test_event_id' }]),
        }),
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('accepted');
    });
  });

  describe('Duplicate Handling', () => {
    it('should return 409 for duplicate transactions', async () => {
      const payload = JSON.stringify({ signature: 'duplicate_signature' });
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: payload,
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{ id: 'existing_verification' }]),
        }),
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.status).toBe('duplicate');
      expect(data.message).toBe('Transaction already processed');
    });
  });

  describe('Payload Validation', () => {
    it('should reject empty request body', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: '',
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Empty request body');
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should reject missing transaction signature', async () => {
      const payload = JSON.stringify({ type: 'transaction' });
      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: payload,
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing transaction signature');
    });
  });

  describe('Event Creation', () => {
    it('should create verification record with correct fields', async () => {
      const payload = JSON.stringify({
        type: 'transaction',
        signature: 'test_tx_signature',
        accountData: {
          from: 'sender_address',
          to: 'receiver_address',
          amount: 1.5,
          slot: 12345,
        },
      });

      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: payload,
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);

      // Mock no duplicate verification found
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Mock no existing event found
      const mockSelect = vi.mocked(db.select);
      mockSelect.mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any).mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Mock event insertion
      const mockInsert = vi.mocked(db.insert);
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'new_event_id' }]),
          }),
        }),
      } as any);

      // Mock verification insertion
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn(),
        }),
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('accepted');
      expect(data.verificationId).toBeDefined();
      expect(data.eventId).toBe('new_event_id');

      // Verify event creation with correct data
      expect(mockInsert).toHaveBeenCalledWith(events);
      expect(mockInsert).toHaveBeenCalledWith(eventVerifications);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const payload = JSON.stringify({
        type: 'transaction',
        signature: 'test_tx_signature',
      });

      const request = new Request('http://localhost:3000/api/webhooks/helius', {
        method: 'POST',
        body: payload,
        headers: {
          'content-type': 'application/json',
          'x-helius-signature': 'valid_signature',
        },
      });

      vi.mocked(verifyWebhookSignature).mockReturnValue(true);
      vi.mocked(db.select).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});