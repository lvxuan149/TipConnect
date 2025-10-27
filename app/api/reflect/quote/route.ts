import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuote, ReflectApiError } from "@/lib/reflect";

const quoteSchema = z.object({
  symbol: z.enum(["USDC", "USDT"] as const),
  amount: z.coerce.number().positive("amount must be greater than 0"),
  action: z.enum(["mint", "redeem"]).optional()
});

export async function POST(request: Request) {
  let payload: z.infer<typeof quoteSchema>;

  try {
    const body = await request.json();
    payload = quoteSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: "InvalidRequest", message },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuote({
      symbol: payload.symbol,
      amount: payload.amount,
      action: payload.action
    });

    const expiresIn = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000));

    return NextResponse.json({
      ...quote,
      expiresInSeconds: expiresIn
    });
  } catch (error) {
    if (error instanceof ReflectApiError) {
      const status = error.status >= 500 ? 502 : 400;
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details ?? null },
        { status }
      );
    }

    console.error("[reflect.quote]", error);
    return NextResponse.json(
      { error: "ReflectQuoteFailed", message: "Unable to retrieve quote" },
      { status: 500 }
    );
  }
}
