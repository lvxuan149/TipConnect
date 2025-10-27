import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectPayouts, events } from "@/drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    // Build query conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(reflectPayouts.status, status));
    }

    if (startDate) {
      conditions.push(gte(reflectPayouts.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(reflectPayouts.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get payout history with event details
    const payoutHistory = await db
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
        createdAt: reflectPayouts.createdAt,
        eventType: events.type,
        eventSigner: events.signer,
        eventReceiver: events.receiver,
        eventSignature: events.tx_signature,
        storyId: events.story_id
      })
      .from(reflectPayouts)
      .leftJoin(events, eq(reflectPayouts.eventId, events.id))
      .where(whereClause)
      .orderBy(desc(reflectPayouts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: reflectPayouts.id })
      .from(reflectPayouts)
      .where(whereClause);

    const totalCount = totalCountResult.length;

    const items = payoutHistory.map(payout => {
      const amountValue = typeof payout.amount === "string" ? parseFloat(payout.amount) : Number(payout.amount ?? 0);
      const attempts = typeof payout.attemptCount === "string" ? parseInt(payout.attemptCount, 10) : Number(payout.attemptCount ?? 0);

      return {
        id: payout.id,
        event_id: payout.eventId,
        event_type: payout.eventType,
        event_signature: payout.eventSignature,
        amount: amountValue,
        currency: payout.currency,
        status: payout.status,
        reflect_tip_id: payout.reflectTipId,
        attempt_count: attempts,
        created_at: payout.createdAt,
        updated_at: payout.updatedAt,
        last_error: payout.lastError,
        metadata: {
          signer: payout.eventSigner,
          receiver: payout.eventReceiver,
          story_id: payout.storyId
        }
      };
    });

    return NextResponse.json({
      items,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error("Payout history error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
