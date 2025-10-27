/**
 * Reflect Stablecoin Integration Library (V2)
 * Provides typed helpers for interacting with the Reflect API.
 */

export type StableSymbol = "USDC" | "USDT";

export interface TipAction {
  fromWallet: string;
  toWallet: string;
  amount: number;
  symbol: StableSymbol;
  storyId?: string;
}

export interface ReflectQuote {
  id: string;
  symbol: string;
  amount: number;
  rate: number;
  expiresAt: string;
}

export type ReflectTransactionStatus = "submitted" | "confirmed" | "failed";

export interface ReflectTransaction {
  reflectTxId: string;
  signature: string;
  status: ReflectTransactionStatus;
}

export type TipRecordStatus = "pending" | "success" | "failed";

export interface TipRecord {
  id: string;
  txSig: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
  symbol: string;
  reflectQuoteId: string;
  reflectTxId: string;
  storyId?: string;
  status: TipRecordStatus;
  createdAt: Date;
}

const REFLECT_API_BASE = (process.env.REFLECT_API_URL ?? "https://api.reflect.finance").replace(/\/+$/, "");
const REFLECT_API_KEY = process.env.REFLECT_API_KEY;
const REQUEST_TIMEOUT_MS = 5_000;

export type ReflectPayoutStatus = "pending" | "queued" | "settled" | "failed" | "cancelled";

export interface ReflectPayout {
  id: string;
  eventId: string;
  reflectTipId: string | null;
  currency: StableSymbol;
  amount: number;
  status: ReflectPayoutStatus;
  attemptCount: number;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReflectPayoutInput {
  eventId: string;
  amount: number;
  currency: StableSymbol;
  recipientAddress: string;
  metadata?: Record<string, unknown>;
}

export interface ReflectPayoutResult {
  success: boolean;
  payout: ReflectPayout;
  reflectResponse: unknown;
  error?: string;
}

export interface SolanaVerification {
  id: string;
  eventId: string;
  status: "pending" | "verified" | "failed";
  signature: string;
  slot?: number;
  heliusResponse: Record<string, unknown>;
  errorCode?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export class ReflectApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ReflectApiError";
    this.status = options.status ?? 502;
    this.code = options.code ?? "ReflectError";
    this.details = options.details;
  }
}

if (!REFLECT_API_KEY) {
  console.warn("[reflect] REFLECT_API_KEY is not configured – API calls will fail until set.");
}

async function reflectFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!REFLECT_API_KEY) {
    throw new ReflectApiError("Reflect API key is not configured", { status: 500, code: "MissingCredentials" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${REFLECT_API_KEY}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${REFLECT_API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? safeParseJson(text) : undefined;

    if (!response.ok) {
      const errorCode =
        typeof payload === "object" && payload && "code" in payload
          ? String((payload as Record<string, unknown>).code)
          : response.status >= 500
            ? "ReflectUnavailable"
            : "InvalidRequest";

      throw new ReflectApiError(
        `Reflect API error (${response.status})`,
        {
          status: response.status,
          code: errorCode,
          details: payload ?? text,
        },
      );
    }

    return (payload as T) ?? ({} as T);
  } catch (error) {
    if (error instanceof ReflectApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ReflectApiError("Reflect API request timed out", {
        status: 504,
        code: "TIMEOUT",
      });
    }

    throw new ReflectApiError("Failed to reach Reflect API", {
      status: 502,
      code: "NetworkError",
      details: error instanceof Error ? error.message : error,
    });
  } finally {
    clearTimeout(timer);
  }
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function checkHealth(): Promise<{ success: boolean; message?: string }> {
  const response = await reflectFetch<{ success: boolean; message?: string }>("/health", {
    method: "GET",
  });
  return response;
}

export async function getQuote(input: { symbol: StableSymbol; amount: number; action?: "mint" | "redeem" }): Promise<ReflectQuote> {
  const payload = {
    symbol: input.symbol,
    amount: input.amount,
    action: input.action ?? "mint",
  };

  const response = await reflectFetch<ReflectQuote>("/stablecoin/get-quote-for-mint-or-redeem", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response?.id || !response.expiresAt) {
    throw new ReflectApiError("Reflect quote response missing required fields", {
      status: 502,
      code: "InvalidQuoteResponse",
      details: response,
    });
  }

  return response;
}

export async function generateMintTransaction(input: {
  recipient: string;
  amount: number;
  symbol: StableSymbol;
  quoteId: string;
}): Promise<ReflectTransaction> {
  const response = await reflectFetch<
    ReflectTransaction & { success?: boolean }
  >("/stablecoin/generate-mint-transaction", {
    method: "POST",
    body: JSON.stringify({
      recipient: input.recipient,
      amount: input.amount,
      symbol: input.symbol,
      quoteId: input.quoteId,
    }),
  });

  if (!response?.signature || !response.reflectTxId) {
    throw new ReflectApiError("Reflect mint response missing signature or reflectTxId", {
      status: 502,
      code: "InvalidMintResponse",
      details: response,
    });
  }

  return {
    reflectTxId: response.reflectTxId,
    signature: response.signature,
    status: response.status ?? "submitted",
  };
}

function coerceAttemptCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function coerceAmount(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizePayoutStatus(status?: string | null): ReflectPayoutStatus {
  const allowed: ReflectPayoutStatus[] = ["pending", "queued", "settled", "failed", "cancelled"];
  if (status && allowed.includes(status as ReflectPayoutStatus)) {
    return status as ReflectPayoutStatus;
  }
  return "queued";
}

export async function createReflectPayout(input: CreateReflectPayoutInput): Promise<ReflectPayoutResult> {
  const now = new Date();

  // Provide deterministic sandbox behaviour for local development and tests
  if (process.env.USE_REFLECT_SANDBOX === "true" || process.env.NODE_ENV === "test") {
    const sandboxId = input.eventId ?? crypto.randomUUID();
    const payout: ReflectPayout = {
      id: `sandbox-payout-${sandboxId}`,
      eventId: input.eventId,
      reflectTipId: `sandbox-reflect-${sandboxId}`,
      currency: input.currency,
      amount: Number(input.amount),
      status: "queued",
      attemptCount: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };

    return {
      success: true,
      payout,
      reflectResponse: {
        sandbox: true,
        eventId: input.eventId,
        recipient: input.recipientAddress,
        metadata: input.metadata ?? {},
        generatedAt: now.toISOString()
      }
    };
  }

  try {
    const response = await reflectFetch<{
      payoutId?: string;
      id?: string;
      reflectTipId?: string | null;
      status?: string;
      amount?: number | string;
      currency?: string;
      attemptCount?: number | string;
      retryCount?: number | string;
      lastError?: string | null;
      error?: string;
      success?: boolean;
      createdAt?: string;
      updatedAt?: string;
      [key: string]: unknown;
    }>("/stablecoin/create-payout", {
      method: "POST",
      body: JSON.stringify({
        eventId: input.eventId,
        amount: input.amount,
        currency: input.currency,
        recipient: input.recipientAddress,
        metadata: input.metadata ?? {}
      })
    });

    const payout: ReflectPayout = {
      id: response.payoutId ?? response.id ?? crypto.randomUUID(),
      eventId: input.eventId,
      reflectTipId: (response.reflectTipId ?? null) as string | null,
      currency: ((response.currency as StableSymbol) ?? input.currency),
      amount: coerceAmount(response.amount, input.amount),
      status: normalizePayoutStatus(typeof response.status === "string" ? response.status : undefined),
      attemptCount: coerceAttemptCount(response.attemptCount ?? response.retryCount),
      lastError: (response.lastError ?? response.error ?? null) as string | null,
      createdAt: response.createdAt ? new Date(response.createdAt) : now,
      updatedAt: response.updatedAt ? new Date(response.updatedAt) : now
    };

    return {
      success: response.success ?? true,
      payout,
      reflectResponse: response,
      error: response.error ?? undefined
    };
  } catch (error) {
    if (error instanceof ReflectApiError) {
      const payout: ReflectPayout = {
        id: crypto.randomUUID(),
        eventId: input.eventId,
        reflectTipId: null,
        currency: input.currency,
        amount: Number(input.amount),
        status: error.status === 504 ? "queued" : "failed",
        attemptCount: 1,
        lastError: error.message,
        createdAt: now,
        updatedAt: now
      };

      return {
        success: false,
        payout,
        reflectResponse: {
          code: error.code,
          status: error.status,
          details: error.details
        },
        error: error.message
      };
    }

    throw error;
  }
}
