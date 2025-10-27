import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventVerifications } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/helius";
import * as crypto from "crypto";

// Webhook payload interface matching Helius format
interface HeliusWebhookPayload {
  type: "transaction";
  signature: string;
  accountData?: {
    from: string;
    to: string;
    amount: number;
    slot: number;
  };
  [key: string]: any;
}

/**
 * Verify webhook authentication
 */
function verifyAuth(req: NextRequest, body: string): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  const signature = req.headers.get("x-helius-signature");

  if (!secret || !signature) {
    console.error("Missing webhook secret or signature");
    return false;
  }

  return verifyWebhookSignature(body, signature, secret);
}

/**
 * Handle duplicate transaction signatures
 */
async function handleDuplicateSignature(signature: string): Promise<boolean> {
  try {
    const existingVerification = await db
      .select()
      .from(eventVerifications)
      .where(eq(eventVerifications.tx_signature, signature))
      .limit(1);

    return existingVerification.length > 0;
  } catch (error) {
    console.error("Error checking duplicate signature:", error);
    // In case of error, assume it's not duplicate to avoid missing transactions
    return false;
  }
}

/**
 * Create or find associated event record
 */
async function createAssociatedEvent(payload: HeliusWebhookPayload): Promise<string | null> {
  try {
    // Check if event already exists for this signature
    const existingEvent = await db
      .select()
      .from(events)
      .where(eq(events.tx_signature, payload.signature))
      .limit(1);

    if (existingEvent.length > 0) {
      return existingEvent[0].id;
    }

    // Create new event record if it doesn't exist
    const eventData = {
      type: "tip", // Default to tip type for Helius webhooks
      signer: payload.accountData?.from || "",
      receiver: payload.accountData?.to || "",
      amount: String(payload.accountData?.amount || 0),
      tx_signature: payload.signature,
      story_id: null, // Helius webhooks may not include story context
      timestamp: Date.now(),
    };

    const result = await db.insert(events).values(eventData).returning();
    return result[0]?.id || null;
  } catch (error) {
    console.error("Error creating associated event:", error);
    return null;
  }
}

/**
 * Trigger background verification task
 */
async function triggerVerification(signature: string): Promise<void> {
  try {
    // In a real implementation, this would queue a background job
    // For now, we'll call the verification function directly
    const { verifyTx } = await import("@/jobs/verifyTx");

    // Execute verification asynchronously without waiting
    verifyTx(signature).catch((error) => {
      console.error(`Background verification failed for ${signature}:`, error);
    });
  } catch (error) {
    console.error("Error triggering background verification:", error);
  }
}

export async function POST(req: NextRequest) {
  // Verify request authentication
  const body = await req.text().catch(() => "");

  if (!body) {
    return NextResponse.json(
      { error: "Empty request body" },
      { status: 400 }
    );
  }

  if (!verifyAuth(req, body)) {
    console.error("Webhook authentication failed");
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  let payload: HeliusWebhookPayload;

  try {
    payload = JSON.parse(body);
  } catch (error) {
    console.error("Invalid JSON payload:", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Validate required payload fields
  if (!payload.signature) {
    return NextResponse.json(
      { error: "Missing transaction signature" },
      { status: 400 }
    );
  }

  try {
    // Check for duplicate transaction
    const isDuplicate = await handleDuplicateSignature(payload.signature);

    if (isDuplicate) {
      return NextResponse.json(
        {
          status: "duplicate",
          message: "Transaction already processed"
        },
        { status: 409 }
      );
    }

    // Create or find associated event
    const eventId = await createAssociatedEvent(payload);

    if (!eventId) {
      return NextResponse.json(
        {
          error: "Failed to create associated event"
        },
        { status: 500 }
      );
    }

    // Create verification record
    const verificationId = crypto.randomUUID();
    await db.insert(eventVerifications).values({
      id: verificationId,
      tx_signature: payload.signature,
      event_id: eventId,
      verification_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Trigger background verification
    await triggerVerification(payload.signature);

    console.log(`Webhook processed: signature=${payload.signature}, eventId=${eventId}, verificationId=${verificationId}`);

    return NextResponse.json({
      status: "accepted",
      message: "Transaction stored and verification pending",
      verificationId,
      eventId,
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process webhook"
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for webhook monitoring
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "helius-webhook",
  });
}