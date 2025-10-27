import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionStatus } from "@/lib/dynamic";

const verifySchema = z.object({
  token: z.string().min(1),
  sessionId: z.string().optional()
});

function decodeBase64Url(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

export async function POST(request: Request) {
  let payload: z.infer<typeof verifySchema>;

  try {
    const body = await request.json();
    payload = verifySchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: "InvalidRequest", message },
      { status: 400 }
    );
  }

  const { token } = payload;
  const parts = token.split(".");

  if (parts.length !== 3) {
    return NextResponse.json(
      { error: "InvalidToken", message: "Token must be a valid JWT" },
      { status: 400 }
    );
  }

  try {
    const payloadJson = decodeBase64Url(parts[1]);
    const decoded = JSON.parse(payloadJson) as Record<string, unknown>;

    const exp = typeof decoded.exp === "number" ? decoded.exp : undefined;
    const expiresAt = exp ? new Date(exp * 1000) : undefined;
    const expired = Boolean(expiresAt && expiresAt.getTime() < Date.now());

    const resolvedSessionId =
      payload.sessionId ??
      (typeof decoded.sessionId === "string" ? decoded.sessionId : undefined) ??
      (typeof decoded.sid === "string" ? decoded.sid : undefined);

    let sessionStatus: Awaited<ReturnType<typeof getSessionStatus>> | null = null;

    if (resolvedSessionId) {
      sessionStatus = await getSessionStatus(resolvedSessionId).catch((error) => {
        console.error("[dynamic.verify] session lookup error", error);
        return null;
      });
    }

    const sessionResult = sessionStatus?.success === true && sessionStatus.session
      ? {
          sessionId: sessionStatus.session.sessionId,
          status: sessionStatus.session.status,
          walletAddress: sessionStatus.session.walletAddress ?? null,
          expiresAt: sessionStatus.session.expiresAt.toISOString()
        }
      : null;

    const valid =
      !expired &&
      Boolean(resolvedSessionId) &&
      (!sessionStatus || sessionStatus.success !== false);

    return NextResponse.json({
      valid,
      expired,
      sessionId: resolvedSessionId ?? null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      session: sessionResult,
      payload: decoded
    });
  } catch (error) {
    console.error("[dynamic.verify]", error);
    return NextResponse.json(
      { error: "TokenVerificationFailed", message: "Unable to verify token" },
      { status: 400 }
    );
  }
}
