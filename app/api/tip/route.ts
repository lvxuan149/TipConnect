import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { generateMintTransaction, getQuote, ReflectApiError, ReflectTransactionStatus } from "@/lib/reflect";

const tipRequestSchema = z.object({
  fromWallet: z.string().min(1, "fromWallet is required"),
  toWallet: z.string().min(1, "toWallet is required"),
  amount: z.coerce.number().gt(0, "amount must be greater than 0"),
  symbol: z.enum(["USDC", "USDT"] as const),
  storyId: z.string().min(1).optional()
});

function mapTransactionStatus(status: ReflectTransactionStatus): "pending" | "success" | "failed" {
  switch (status) {
    case "confirmed":
      return "success";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

export async function POST(request: Request) {
  let payload: z.infer<typeof tipRequestSchema>;

  try {
    const body = await request.json();
    payload = tipRequestSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: "InvalidRequest", message },
      { status: 400 }
    );
  }

  const { fromWallet, toWallet, symbol, storyId } = payload;
  const amount = Number(payload.amount.toFixed(2));

  try {
    const quote = await getQuote({ symbol, amount, action: "mint" });
    const mint = await generateMintTransaction({
      recipient: toWallet,
      amount,
      symbol,
      quoteId: quote.id
    });

    const status = mapTransactionStatus(mint.status);

    const insertRecord = {
      txSig: mint.signature,
      fromWallet,
      toWallet,
      amount: amount.toFixed(2),
      symbol,
      reflectQuoteId: quote.id,
      reflectTxId: mint.reflectTxId,
      storyId: storyId ?? null,
      status
    };

    const inserted = await db
      .insert(transactions)
      .values(insertRecord)
      .onConflictDoNothing()
      .returning();

    let record = inserted[0];
    let idempotent = false;

    if (!record) {
      idempotent = true;
      const existing = await db
        .select()
        .from(transactions)
        .where(eq(transactions.txSig, mint.signature))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Failed to persist tip transaction");
      }

      record = existing[0];
    }

    return NextResponse.json(
      {
        success: true,
        txSig: record.txSig,
        reflectTxId: record.reflectTxId,
        status: record.status,
        idempotent
      },
      { status: idempotent ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ReflectApiError) {
      const code = error.code ?? "ReflectUnavailable";
      const message = error.message;

      if (code === "TIMEOUT") {
        return NextResponse.json(
          { error: "TransactionTimeout", message },
          { status: 504 }
        );
      }

      if (error.status >= 500) {
        return NextResponse.json(
          { error: "ReflectUnavailable", message },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "InvalidRequest", message },
        { status: 400 }
      );
    }

    console.error("[tip.error]", error);

    return NextResponse.json(
      { error: "TipProcessingFailed", message: "Unable to process tip" },
      { status: 500 }
    );
  }
}
