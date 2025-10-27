import { NextResponse } from "next/server";
import { z } from "zod";
import { createDynamicSession } from "@/lib/dynamic";
import { db } from "@/lib/db";
import { dynamicSessions } from "@/drizzle/schema";

const sessionSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
  ttlHours: z.coerce.number().min(1).max(72).optional()
});

export async function POST(request: Request) {
  let payload: z.infer<typeof sessionSchema>;

  try {
    const body = await request.json();
    payload = sessionSchema.parse(body ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: "InvalidRequest", message },
      { status: 400 }
    );
  }

  try {
    const result = await createDynamicSession(payload);

    if (!result.success || !result.session) {
      return NextResponse.json(
        {
          error: result.error ?? "DynamicSessionFailed",
          errorCode: result.errorCode ?? "SESSION_ERROR"
        },
        { status: 502 }
      );
    }

    const session = result.session;
    const metadataJson = JSON.stringify(session.metadata ?? {});

    await db
      .insert(dynamicSessions)
      .values({
        sessionId: session.sessionId,
        userId: session.userId ?? null,
        walletAddress: session.walletAddress ?? null,
        status: session.status,
        metadata: metadataJson,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      })
      .onConflictDoUpdate({
        target: dynamicSessions.sessionId,
        set: {
          userId: session.userId ?? null,
          walletAddress: session.walletAddress ?? null,
          status: session.status,
          metadata: metadataJson,
          expiresAt: session.expiresAt
        }
      });

    return NextResponse.json(
      {
        success: true,
        session: {
          sessionId: session.sessionId,
          status: session.status,
          expiresAt: session.expiresAt.toISOString(),
          walletAddress: session.walletAddress ?? null,
          metadata: session.metadata ?? {},
          createdAt: session.createdAt.toISOString(),
          userId: session.userId ?? null
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[dynamic.session]", error);
    return NextResponse.json(
      { error: "DynamicSessionError", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
