import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const getQuoteMock = vi.fn();
const generateMintTransactionMock = vi.fn();
const checkHealthMock = vi.fn();

let returningResult: any[] = [];
let selectResult: any[] = [];

const insertMock = vi.fn(() => {
  const builder: any = {};
  builder.values = vi.fn().mockImplementation(() => builder);
  builder.onConflictDoNothing = vi.fn().mockImplementation(() => builder);
  builder.returning = vi.fn().mockImplementation(() => Promise.resolve(returningResult));
  return builder;
});

const selectMock = vi.fn(() => {
  const builder: any = {};
  builder.from = vi.fn().mockImplementation(() => builder);
  builder.where = vi.fn().mockImplementation(() => builder);
  builder.limit = vi.fn().mockImplementation(() => Promise.resolve(selectResult));
  return builder;
});

vi.mock("@/lib/reflect", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reflect")>("@/lib/reflect");
  return {
    ...actual,
    getQuote: getQuoteMock,
    generateMintTransaction: generateMintTransactionMock,
    checkHealth: checkHealthMock
  };
});

vi.mock("@/lib/db", () => {
  return {
    db: {
      insert: insertMock,
      select: selectMock
    },
    default: {
      insert: insertMock,
      select: selectMock
    }
  };
});

let POST: (request: Request) => Promise<Response>;
let ReflectApiErrorClass: typeof import("@/lib/reflect")["ReflectApiError"];

beforeAll(async () => {
  ({ POST } = await import("@/app/api/tip/route"));
  ({ ReflectApiError: ReflectApiErrorClass } = await import("@/lib/reflect"));
});

beforeEach(() => {
  returningResult = [];
  selectResult = [];
  getQuoteMock.mockReset();
  generateMintTransactionMock.mockReset();
  checkHealthMock.mockReset();
  insertMock.mockClear();
  selectMock.mockClear();
});

describe("Tip API", () => {
  it("processes a successful tip", async () => {
    returningResult = [
      {
        txSig: "sig_123",
        reflectTxId: "tx_reflect_456",
        status: "pending"
      }
    ];

    getQuoteMock.mockResolvedValue({
      id: "quote_123",
      symbol: "USDC",
      amount: 1.5,
      rate: 1.0,
      expiresAt: "2025-10-28T00:00:00Z"
    });

    generateMintTransactionMock.mockResolvedValue({
      reflectTxId: "tx_reflect_456",
      signature: "sig_123",
      status: "submitted"
    });

    const request = new Request("http://localhost/api/tip", {
      method: "POST",
      body: JSON.stringify({
        fromWallet: "SenderPubkey",
        toWallet: "ReceiverPubkey",
        amount: 1.5,
        symbol: "USDC",
        storyId: "story_abc"
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({
      success: true,
      txSig: "sig_123",
      reflectTxId: "tx_reflect_456",
      status: "pending",
      idempotent: false
    });
    expect(getQuoteMock).toHaveBeenCalledWith({ symbol: "USDC", amount: 1.5, action: "mint" });
    expect(generateMintTransactionMock).toHaveBeenCalledWith({
      recipient: "ReceiverPubkey",
      amount: 1.5,
      symbol: "USDC",
      quoteId: "quote_123"
    });
  });

  it("returns idempotent response for duplicate txSig", async () => {
    returningResult = [];
    selectResult = [
      {
        txSig: "sig_dup",
        reflectTxId: "tx_reflect_dup",
        status: "pending"
      }
    ];

    getQuoteMock.mockResolvedValue({
      id: "quote_dup",
      symbol: "USDC",
      amount: 2.0,
      rate: 1.0,
      expiresAt: "2025-10-28T00:00:00Z"
    });

    generateMintTransactionMock.mockResolvedValue({
      reflectTxId: "tx_reflect_dup",
      signature: "sig_dup",
      status: "submitted"
    });

    const request = new Request("http://localhost/api/tip", {
      method: "POST",
      body: JSON.stringify({
        fromWallet: "SenderPubkey",
        toWallet: "ReceiverPubkey",
        amount: 2.0,
        symbol: "USDC"
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      txSig: "sig_dup",
      reflectTxId: "tx_reflect_dup",
      status: "pending",
      idempotent: true
    });
  });

  it("maps Reflect timeouts to 504", async () => {
    returningResult = [];
    selectResult = [];

    getQuoteMock.mockResolvedValue({
      id: "quote_fail",
      symbol: "USDC",
      amount: 3.0,
      rate: 1.0,
      expiresAt: "2025-10-28T00:00:00Z"
    });

    generateMintTransactionMock.mockRejectedValue(
      new ReflectApiErrorClass("Reflect API request timed out", { status: 504, code: "TIMEOUT" })
    );

    const request = new Request("http://localhost/api/tip", {
      method: "POST",
      body: JSON.stringify({
        fromWallet: "SenderPubkey",
        toWallet: "ReceiverPubkey",
        amount: 3.0,
        symbol: "USDC"
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(504);
    expect(json).toEqual({
      error: "TransactionTimeout",
      message: "Reflect API request timed out"
    });
  });
});
