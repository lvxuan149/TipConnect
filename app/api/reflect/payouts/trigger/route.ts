import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectPayouts, eventVerifications, events } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createReflectPayout } from "@/lib/reflect";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { eventId, recipientAddress, metadata } = body;

    if (!eventId || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, recipientAddress" },
        { status: 400 }
      );
    }

    // Verify event exists and is verified
    const eventRecord = await db
      .select({
        id: events.id,
        type: events.type,
        amount: events.amount,
        signer: events.signer,
        receiver: events.receiver,
        tx_signature: events.tx_signature
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (eventRecord.length === 0) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const event = eventRecord[0];

    // Check verification status
    const verificationRecord = await db
      .select()
      .from(eventVerifications)
      .where(and(
        eq(eventVerifications.eventId, eventId),
        eq(eventVerifications.status, 'verified')
      ))
      .limit(1);

    if (verificationRecord.length === 0) {
      return NextResponse.json(
        { error: "Event not verified. Cannot trigger payout." },
        { status: 400 }
      );
    }

    // Check if payout already exists
    const existingPayout = await db
      .select()
      .from(reflectPayouts)
      .where(eq(reflectPayouts.eventId, eventId))
      .limit(1);

    if (existingPayout.length > 0) {
      const payout = existingPayout[0];
      const amountValue = typeof payout.amount === "string" ? parseFloat(payout.amount) : Number(payout.amount ?? 0);
      const attempts = typeof payout.attemptCount === "string" ? parseInt(payout.attemptCount, 10) : Number(payout.attemptCount ?? 0);

      return NextResponse.json({
        payout_id: payout.id,
        event_id: eventId,
        status: payout.status,
        amount: amountValue,
        currency: payout.currency,
        attempt_count: attempts,
        reflect_tip_id: payout.reflectTipId,
        last_error: payout.lastError,
        message: "Payout already exists"
      });
    }

    // Create Reflect payout
    const amount = parseFloat(event.amount ?? "0");
    const currency: "USDC" | "USDT" = metadata?.currency && (metadata.currency === "USDT") ? "USDT" : "USDC";
    const payoutInput = {
      eventId,
      amount,
      currency,
      recipientAddress,
      metadata: {
        eventType: event.type,
        originalSignature: event.tx_signature,
        signer: event.signer,
        receiver: event.receiver,
        ...metadata
      }
    };

    const payoutResult = await createReflectPayout(payoutInput);

    // Store payout record in database
    const payoutRecord = {
      id: payoutResult.payout.id,
      eventId,
      reflectTipId: payoutResult.payout.reflectTipId,
      status: payoutResult.payout.status,
      currency: payoutResult.payout.currency,
      amount: payoutResult.payout.amount,
      attemptCount: payoutResult.payout.attemptCount,
      lastError: payoutResult.payout.lastError,
      updatedAt: payoutResult.payout.updatedAt,
      createdAt: payoutResult.payout.createdAt
    };

    await db.insert(reflectPayouts).values(payoutRecord);

    return NextResponse.json({
      payout_id: payoutResult.payout.id,
      event_id: eventId,
      status: payoutResult.payout.status,
      amount: payoutResult.payout.amount,
      currency: payoutResult.payout.currency,
      reflect_tip_id: payoutResult.payout.reflectTipId,
      attempt_count: payoutResult.payout.attemptCount,
      last_error: payoutResult.payout.lastError,
      success: payoutResult.success,
      error: payoutResult.error
    });

  } catch (error) {
    console.error("Payout trigger error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
