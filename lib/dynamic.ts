/**
 * Dynamic SDK Walletless Onboarding Library
 * Handles session creation and transaction submission for users without wallets
 */

const DYNAMIC_API_BASE = process.env.DYNAMIC_API_URL || 'https://app.dynamicauth.com';
const DYNAMIC_API_KEY = process.env.DYNAMIC_API_KEY;
const DYNAMIC_ENV_ID = process.env.DYNAMIC_ENV_ID;

export interface DynamicSession {
  id: string;
  sessionId: string;
  userId?: string;
  walletAddress?: string;
  status: 'created' | 'active' | 'completed' | 'expired';
  metadata: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateSessionInput {
  userId?: string;
  email?: string;
  metadata?: Record<string, any>;
  ttlHours?: number; // Time to live in hours, default 24
}

export interface DynamicSessionResult {
  success: boolean;
  session?: DynamicSession;
  error?: string;
  errorCode?: string;
}

export interface SubmitTransactionInput {
  sessionId: string;
  transaction: string; // Base64 encoded transaction
  signers?: string[]; // Additional signers if needed
}

export interface TransactionSubmissionResult {
  success: boolean;
  signature?: string;
  verificationId?: string;
  error?: string;
  errorCode?: string;
}

export interface DynamicApiResponse {
  userId: string;
  sessionId: string;
  publicKey?: string;
  embeddedWidget?: string;
  status: 'created' | 'pending' | 'completed';
  createdAt: string;
  expiresAt: string;
}

/**
 * Create a new Dynamic session for walletless onboarding
 */
export async function createDynamicSession(input: CreateSessionInput): Promise<DynamicSessionResult> {
  if (!DYNAMIC_API_KEY || !DYNAMIC_ENV_ID) {
    throw new Error('DYNAMIC_API_KEY and DYNAMIC_ENV_ID must be configured');
  }

  try {
    const ttlHours = input.ttlHours || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Generate unique session ID
    const sessionId = `session_${crypto.randomUUID()}_${Date.now()}`;

    const requestBody = {
      environmentId: DYNAMIC_ENV_ID,
      sessionId,
      userId: input.userId,
      email: input.email,
      ttlSeconds: ttlHours * 3600,
      metadata: {
        source: 'tipconnect',
        createdAt: new Date().toISOString(),
        ...input.metadata
      }
    };

    const response = await fetch(`${DYNAMIC_API_BASE}/api/v0/sdk/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DYNAMIC_API_KEY}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Dynamic API error: ${response.status} - ${errorText}`,
        errorCode: 'API_ERROR'
      };
    }

    const dynamicData: DynamicApiResponse = await response.json();

    const session: DynamicSession = {
      id: crypto.randomUUID(),
      sessionId: dynamicData.sessionId,
      userId: dynamicData.userId,
      walletAddress: dynamicData.publicKey,
      status: 'created',
      metadata: JSON.parse(JSON.stringify(dynamicData)),
      expiresAt: new Date(dynamicData.expiresAt),
      createdAt: new Date(dynamicData.createdAt)
    };

    return {
      success: true,
      session
    };

  } catch (error) {
    console.error('Error creating Dynamic session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Get session details and current status
 */
export async function getSessionStatus(sessionId: string): Promise<DynamicSessionResult> {
  if (!DYNAMIC_API_KEY) {
    throw new Error('DYNAMIC_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${DYNAMIC_API_BASE}/api/v0/sdk/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${DYNAMIC_API_KEY}`,
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Session not found',
          errorCode: 'SESSION_NOT_FOUND'
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        error: `Dynamic API error: ${response.status} - ${errorText}`,
        errorCode: 'API_ERROR'
      };
    }

    const dynamicData: DynamicApiResponse = await response.json();

    // Determine session status based on API response
    let status: 'created' | 'active' | 'completed' | 'expired' = 'created';
    if (dynamicData.status === 'completed') {
      status = 'completed';
    } else if (dynamicData.publicKey) {
      status = 'active';
    } else if (new Date(dynamicData.expiresAt) < new Date()) {
      status = 'expired';
    }

    const session: DynamicSession = {
      id: crypto.randomUUID(), // Generate new ID for this session object
      sessionId: dynamicData.sessionId,
      userId: dynamicData.userId,
      walletAddress: dynamicData.publicKey,
      status,
      metadata: JSON.parse(JSON.stringify(dynamicData)),
      expiresAt: new Date(dynamicData.expiresAt),
      createdAt: new Date(dynamicData.createdAt)
    };

    return {
      success: true,
      session
    };

  } catch (error) {
    console.error('Error getting session status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Submit a transaction through a Dynamic session
 */
export async function submitTransaction(input: SubmitTransactionInput): Promise<TransactionSubmissionResult> {
  if (!DYNAMIC_API_KEY) {
    throw new Error('DYNAMIC_API_KEY is not configured');
  }

  try {
    // First verify session is active
    const sessionResult = await getSessionStatus(input.sessionId);
    if (!sessionResult.success || !sessionResult.session) {
      return {
        success: false,
        error: 'Invalid or expired session',
        errorCode: 'INVALID_SESSION'
      };
    }

    if (sessionResult.session.status !== 'active' && sessionResult.session.status !== 'created') {
      return {
        success: false,
        error: `Session cannot submit transactions. Status: ${sessionResult.session.status}`,
        errorCode: 'SESSION_INACTIVE'
      };
    }

    const requestBody = {
      sessionId: input.sessionId,
      transaction: input.transaction,
      signers: input.signers || []
    };

    const response = await fetch(`${DYNAMIC_API_BASE}/api/v0/sdk/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DYNAMIC_API_KEY}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Dynamic API error: ${response.status} - ${errorText}`,
        errorCode: 'API_ERROR'
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Transaction submission failed',
        errorCode: result.errorCode || 'SUBMISSION_FAILED'
      };
    }

    // Generate verification ID for the submitted transaction
    const verificationId = crypto.randomUUID();

    return {
      success: true,
      signature: result.signature,
      verificationId
    };

  } catch (error) {
    console.error('Error submitting transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Expire a session manually
 */
export async function expireSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  if (!DYNAMIC_API_KEY) {
    throw new Error('DYNAMIC_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${DYNAMIC_API_BASE}/api/v0/sdk/sessions/${sessionId}/expire`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DYNAMIC_API_KEY}`,
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Dynamic API error: ${response.status} - ${errorText}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error expiring session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<{
  cleaned: number;
  errors: string[];
}> {
  // This would typically query the database for expired sessions
  // and call expireSession() or mark them as expired
  // For now, return a placeholder implementation
  return {
    cleaned: 0,
    errors: []
  };
}

/**
 * Generate widget configuration for frontend
 */
export function generateWidgetConfig(sessionId: string): {
  environmentId: string;
  sessionId: string;
  containerId?: string;
  appearance?: 'light' | 'dark';
  onSuccess?: string; // Callback URL
  onFailure?: string; // Callback URL
} {
  if (!DYNAMIC_ENV_ID) {
    throw new Error('DYNAMIC_ENV_ID is not configured');
  }

  return {
    environmentId: DYNAMIC_ENV_ID,
    sessionId,
    containerId: 'dynamic-widget-container',
    appearance: 'light',
    onSuccess: `${process.env.NEXT_PUBLIC_APP_URL}/api/dynamic/success`,
    onFailure: `${process.env.NEXT_PUBLIC_APP_URL}/api/dynamic/error`
  };
}

/**
 * Validate session before use
 */
export function validateSession(session: DynamicSession): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();

  if (session.expiresAt < now) {
    return { valid: false, reason: 'Session expired' };
  }

  if (session.status === 'expired') {
    return { valid: false, reason: 'Session already expired' };
  }

  if (!session.sessionId) {
    return { valid: false, reason: 'Missing session ID' };
  }

  return { valid: true };
}

/**
 * Extend session expiration
 */
export async function extendSession(
  sessionId: string,
  additionalHours: number = 24
): Promise<DynamicSessionResult> {
  if (!DYNAMIC_API_KEY) {
    throw new Error('DYNAMIC_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${DYNAMIC_API_BASE}/api/v0/sdk/sessions/${sessionId}/extend`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DYNAMIC_API_KEY}`,
        },
        body: JSON.stringify({
          additionalTtlSeconds: additionalHours * 3600
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Dynamic API error: ${response.status} - ${errorText}`,
        errorCode: 'API_ERROR'
      };
    }

    const result = await response.json();

    // Fetch updated session details
    return await getSessionStatus(sessionId);

  } catch (error) {
    console.error('Error extending session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}