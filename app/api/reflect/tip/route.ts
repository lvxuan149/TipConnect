import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMintTransaction, getQuote, ReflectApiError } from "@/lib/reflect";
import { db } from "@/lib/db";
import { transactions } from "@/drizzle/schema";

const tipSchema = z.object({
  recipient: z.string().min(1, "recipient is required"),
  amount: z.coerce.number().gt(0, "amount must be greater than 0"),
  symbol: z.enum(["USDC", "USDT"] as const),
  quoteId: z.string().min(1).optional(),
  fromWallet: z.string().min(1).optional(),
  storyId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  let payload: z.infer<typeof tipSchema>;

  try {
    const body = await request.json();
    payload = tipSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: "InvalidRequest", message },
      { status: 400 }
    );
  }

  const { recipient, amount, symbol, fromWallet, storyId } = payload;

  try {
    const quote = payload.quoteId
      ? { id: payload.quoteId }
      : await getQuote({ symbol, amount, action: "mint" });

    const mint = await generateMintTransaction({
      recipient,
      amount,
      symbol,
      quoteId: quote.id
    });

    if (fromWallet) {
      const insertRecord = {
        txSig: mint.signature,
        fromWallet,
        toWallet: recipient,
        amount: amount.toFixed(2),
        symbol,
        reflectQuoteId: quote.id,
        reflectTxId: mint.reflectTxId,
        storyId: storyId ?? null,
        status: mint.status ?? "submitted"
      };

      await db
        .insert(transactions)
        .values(insertRecord)
        .onConflictDoNothing();
    }

    return NextResponse.json({
      reflectTxId: mint.reflectTxId,
      signature: mint.signature,
      status: mint.status ?? "submitted",
      quoteId: quote.id
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ReflectApiError) {
      const status = error.status >= 500 ? 502 : 400;
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details ?? null },
        { status }
      );
    }

    console.error("[reflect.tip]", error);
    return NextResponse.json(
      { error: "ReflectTipFailed", message: "Unable to generate tip transaction" },
      { status: 500 }
    );
  }
}
