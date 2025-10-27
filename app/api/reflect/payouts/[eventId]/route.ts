import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectPayouts, events, eventVerifications } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

// GET /api/reflect/payouts/[eventId] - Get payout details for an event
export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { eventId } = params;

  try {
    // Get payout record
    const payoutRecord = await db
      .select({
        id: reflectPayouts.id,
        eventId: reflectPayouts.eventId,
        reflectTipId: reflectPayouts.reflectTipId,
        status: reflectPayouts.status,
        currency: reflectPayouts.currency,
        amount: reflectPayouts.amount,
        attemptCount: reflectPayouts.attemptCount,
        lastError: reflectPayouts.lastError,
        updatedAt: reflectPayouts.updatedAt,
        createdAt: reflectPayouts.createdAt
      })
      .from(reflectPayouts)
      .where(eq(reflectPayouts.eventId, eventId))
      .limit(1);

    if (payoutRecord.length === 0) {
      return NextResponse.json(
        { error: "Payout not found for this event" },
        { status: 404 }
      );
    }

    const payout = payoutRecord[0];

    const amountValue = typeof payout.amount === "string" ? parseFloat(payout.amount) : Number(payout.amount ?? 0);
    const attempts = typeof payout.attemptCount === "string" ? parseInt(payout.attemptCount, 10) : Number(payout.attemptCount ?? 0);

    return NextResponse.json({
      id: payout.id,
      event_id: payout.eventId,
      amount: amountValue,
      currency: payout.currency,
      status: payout.status,
      reflect_tx_id: payout.reflectTipId,
      attempt_count: attempts,
      last_error: payout.lastError,
      updated_at: payout.updatedAt,
      created_at: payout.createdAt
    });

  } catch (error) {
    console.error("Payout lookup error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/reflect/payouts/[eventId] - Cancel a pending payout
export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { eventId } = params;

  try {
    // Check if payout exists and is in cancelable state
    const payoutRecord = await db
      .select()
      .from(reflectPayouts)
      .where(and(
        eq(reflectPayouts.eventId, eventId),
        eq(reflectPayouts.status, 'pending')
      ))
      .limit(1);

    if (payoutRecord.length === 0) {
      return NextResponse.json(
        { error: "Payout not found or cannot be cancelled" },
        { status: 404 }
      );
    }

    // Update payout status to failed (cancellation)
    await db
      .update(reflectPayouts)
      .set({
        status: 'cancelled',
        lastError: 'Payout cancelled by user',
        updatedAt: new Date()
      })
      .where(eq(reflectPayouts.eventId, eventId));

    return NextResponse.json({
      ok: true,
      message: "Payout cancelled successfully"
    });

  } catch (error) {
    console.error("Payout cancellation error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
