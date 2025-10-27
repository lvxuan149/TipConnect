import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectPayouts, events, eventVerifications } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createReflectPayout } from "@/lib/reflect";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

export async function POST(req: NextRequest, { params }: { params: { payoutId: string } }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { payoutId } = params;

  try {
    // Get existing payout record
    const existingPayout = await db
      .select({
        id: reflectPayouts.id,
        eventId: reflectPayouts.eventId,
        status: reflectPayouts.status,
        amount: reflectPayouts.amount,
        currency: reflectPayouts.currency,
        attemptCount: reflectPayouts.attemptCount,
        lastError: reflectPayouts.lastError,
        reflectTipId: reflectPayouts.reflectTipId
      })
      .from(reflectPayouts)
      .where(eq(reflectPayouts.id, payoutId))
      .limit(1);

    if (existingPayout.length === 0) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      );
    }

    const payout = existingPayout[0];

    // Check if payout can be retried
    if (payout.status === 'settled' || payout.status === 'queued') {
      return NextResponse.json(
        { error: "Payout cannot be retried - already processed or queued" },
        { status: 400 }
      );
    }

    // Check retry limit (max 3 retries)
    const currentAttemptCount = typeof payout.attemptCount === "string"
      ? parseInt(payout.attemptCount, 10)
      : Number(payout.attemptCount ?? 0);
    if (currentAttemptCount >= 3) {
      return NextResponse.json(
        { error: "Maximum retry limit (3) reached" },
        { status: 400 }
      );
    }

    // Get event details for retry
    const eventRecord = await db
      .select({
        id: events.id,
        type: events.type,
        signer: events.signer,
        receiver: events.receiver,
        tx_signature: events.tx_signature
      })
      .from(events)
      .where(eq(events.id, payout.eventId))
      .limit(1);

    if (eventRecord.length === 0) {
      return NextResponse.json(
        { error: "Associated event not found" },
        { status: 404 }
      );
    }

    const event = eventRecord[0];

    // Verify event is still verified
    const verificationRecord = await db
      .select()
      .from(eventVerifications)
      .where(and(
        eq(eventVerifications.eventId, payout.eventId),
        eq(eventVerifications.status, 'verified')
      ))
      .limit(1);

    if (verificationRecord.length === 0) {
      return NextResponse.json(
        { error: "Event verification no longer valid. Cannot retry payout." },
        { status: 400 }
      );
    }

    // Create new Reflect payout attempt
    const amount = typeof payout.amount === "string" ? parseFloat(payout.amount) : Number(payout.amount ?? 0);
    const recipientAddress = event.receiver; // Use event receiver as payout recipient

    const payoutInput = {
      eventId: payout.eventId,
      amount,
      currency: (payout.currency as "USDC" | "USDT") ?? "USDC",
      recipientAddress,
      metadata: {
        eventType: event.type,
        originalSignature: event.tx_signature,
        signer: event.signer,
        receiver: event.receiver,
        retryAttempt: currentAttemptCount + 1,
        originalPayoutId: payout.id
      }
    };

    const retryResult = await createReflectPayout(payoutInput);

    const attemptCount = Math.max(retryResult.payout.attemptCount, currentAttemptCount + 1);

    // Update existing payout record with retry attempt
    await db
      .update(reflectPayouts)
      .set({
        status: retryResult.payout.status,
        reflectTipId: retryResult.payout.reflectTipId || payout.reflectTipId,
        amount: retryResult.payout.amount,
        currency: retryResult.payout.currency,
        attemptCount,
        lastError: retryResult.error ?? retryResult.payout.lastError ?? null,
        updatedAt: retryResult.payout.updatedAt
      })
      .where(eq(reflectPayouts.id, payoutId));

    return NextResponse.json({
      payout_id: payout.id,
      event_id: payout.eventId,
      status: retryResult.payout.status,
      attempt_count: attemptCount,
      amount: retryResult.payout.amount,
      currency: retryResult.payout.currency,
      reflect_tip_id: retryResult.payout.reflectTipId || payout.reflectTipId,
      success: retryResult.success,
      error: retryResult.error,
      message: `Retry attempt ${attemptCount} ${retryResult.success ? 'successful' : 'failed'}`
    });

  } catch (error) {
    console.error("Payout retry error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}