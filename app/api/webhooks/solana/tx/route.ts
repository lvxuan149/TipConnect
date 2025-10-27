import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventVerifications } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { createEventVerification, isValidSignature } from "@/lib/helius";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Validate required fields
  const txSignature = String(body.txSignature ?? "");
  const type = String(body.type ?? "");

  if (!txSignature || !type) {
    return NextResponse.json(
      { error: "Missing required fields: txSignature, type" },
      { status: 422 }
    );
  }

  if (!isValidSignature(txSignature)) {
    return NextResponse.json(
      { error: "Invalid transaction signature format" },
      { status: 400 }
    );
  }

  // Prepare event record
  const eventPayload = {
    tx_signature: txSignature,
    type,
    signer: String(body.signer ?? ""),
    receiver: String(body.receiver ?? ""),
    amount: String(Number(body.amount ?? 0)),
    story_id: body.storyId ? String(body.storyId) : null,
    timestamp: Number(body.timestamp ?? Date.now())
  };

  try {
    let insertedEventId: string | undefined;
    const insertResult = await db
      .insert(events)
      .values(eventPayload)
      .onConflictDoNothing()
      .returning({ id: events.id });

    if (insertResult.length > 0) {
      insertedEventId = insertResult[0].id;
    }

    if (!insertedEventId) {
      const existingEvent = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.tx_signature, txSignature), eq(events.type, type)))
        .limit(1);

      insertedEventId = existingEvent[0]?.id;
    }

    if (!insertedEventId) {
      throw new Error("Unable to determine event identifier after insert");
    }

    const idempotent = insertResult.length === 0;

    // Check for existing verification
    const existingVerification = await db
      .select({
        id: eventVerifications.id,
        status: eventVerifications.status,
        signature: eventVerifications.signature,
        slot: eventVerifications.slot,
        heliusResponse: eventVerifications.heliusResponse,
        errorCode: eventVerifications.errorCode,
        verifiedAt: eventVerifications.verifiedAt
      })
      .from(eventVerifications)
      .where(eq(eventVerifications.eventId, insertedEventId))
      .limit(1);

    let verificationRecord: {
      id: string;
      status: "pending" | "verified" | "failed";
      signature: string;
      slot: number | null;
      heliusResponse: Record<string, unknown>;
      errorCode: string | null;
      verifiedAt: Date | null;
    } | null = null;

    if (existingVerification.length > 0) {
      const current = existingVerification[0];
      verificationRecord = {
        id: current.id,
        status: current.status as "pending" | "verified" | "failed",
        signature: current.signature,
        slot: current.slot ?? null,
        heliusResponse: current.heliusResponse as Record<string, unknown>,
        errorCode: current.errorCode ?? null,
        verifiedAt: current.verifiedAt ?? null
      };
    }
    let verificationError: string | null = null;

    if (!verificationRecord) {
      try {
        const createdVerification = await createEventVerification({
          eventId: insertedEventId,
          signature: txSignature
        });

        verificationRecord = {
          id: createdVerification.id,
          status: createdVerification.status,
          signature: createdVerification.signature,
          slot: createdVerification.slot ?? null,
          heliusResponse: createdVerification.heliusResponse,
          errorCode: createdVerification.errorCode ?? null,
          verifiedAt: createdVerification.verifiedAt ?? null
        };

        await db.insert(eventVerifications).values({
          id: verificationRecord.id,
          eventId: insertedEventId,
          status: verificationRecord.status,
          signature: verificationRecord.signature,
          slot: verificationRecord.slot,
          heliusResponse: verificationRecord.heliusResponse,
          errorCode: verificationRecord.errorCode,
          verifiedAt: verificationRecord.verifiedAt
        }).onConflictDoUpdate({
          target: eventVerifications.eventId,
          set: {
            status: verificationRecord.status,
            signature: verificationRecord.signature,
            slot: verificationRecord.slot,
            heliusResponse: verificationRecord.heliusResponse,
            errorCode: verificationRecord.errorCode,
            verifiedAt: verificationRecord.verifiedAt
          }
        });
      } catch (verifError) {
        verificationError = verifError instanceof Error ? verifError.message : "Verification failed";

        const failureRecord = {
          id: crypto.randomUUID(),
          eventId: insertedEventId,
          status: "failed" as const,
          signature: txSignature,
          slot: null,
          heliusResponse: {
            success: false,
            error: verificationError,
            verifiedAt: new Date().toISOString()
          },
          errorCode: "VERIFICATION_ERROR",
          verifiedAt: null
        };

        verificationRecord = {
          id: failureRecord.id,
          status: failureRecord.status,
          signature: failureRecord.signature,
          slot: failureRecord.slot,
          heliusResponse: failureRecord.heliusResponse,
          errorCode: failureRecord.errorCode,
          verifiedAt: failureRecord.verifiedAt
        };

        await db.insert(eventVerifications).values(failureRecord).onConflictDoUpdate({
          target: eventVerifications.eventId,
          set: {
            status: failureRecord.status,
            signature: failureRecord.signature,
            slot: failureRecord.slot,
            heliusResponse: failureRecord.heliusResponse,
            errorCode: failureRecord.errorCode,
            verifiedAt: failureRecord.verifiedAt
          }
        });
      }
    }

    if (!verificationRecord) {
      throw new Error("Verification record missing after processing");
    }

    console.log(JSON.stringify({
      ingested: !idempotent,
      duplicate: idempotent,
      eventId: insertedEventId,
      verificationId: verificationRecord.id,
      verificationStatus: verificationRecord.status,
      verificationError
    }));

    return NextResponse.json({
      ok: true,
      idempotent,
      eventId: insertedEventId,
      verificationId: verificationRecord.id,
      verificationStatus: verificationRecord.status,
      error: verificationError,
      queuedAt: new Date().toISOString()
    }, { status: 202 });
  } catch (e) {
    console.error("ingest_error", e);
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const signature = searchParams.get("signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature parameter" },
      { status: 400 }
    );
  }

  try {
    // Find verification by signature
    const verification = await db
      .select({
        id: eventVerifications.id,
        eventId: eventVerifications.eventId,
        status: eventVerifications.status,
        signature: eventVerifications.signature,
        slot: eventVerifications.slot,
        heliusResponse: eventVerifications.heliusResponse,
        errorCode: eventVerifications.errorCode,
        verifiedAt: eventVerifications.verifiedAt,
        createdAt: eventVerifications.createdAt
      })
      .from(eventVerifications)
      .where(eq(eventVerifications.signature, signature))
      .limit(1);

    if (verification.length === 0) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    const verif = verification[0];

    return NextResponse.json({
      id: verif.id,
      tx_signature: verif.signature,
      status: verif.status,
      slot: verif.slot,
      verified_at: verif.verifiedAt,
      error_message: verif.errorCode,
      helius_response: verif.heliusResponse,
      created_at: verif.createdAt
    });

  } catch (e) {
    console.error("verification_lookup_error", e);
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 });
  }
}
