import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

function verifyAuth(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-webhook-secret");
  return secret && header && secret === header;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // minimal shape: { txSignature, type, signer, receiver, amount, storyId, timestamp }
  const rec = {
    tx_signature: String(body.txSignature ?? ""),
    type: String(body.type ?? ""),
    signer: String(body.signer ?? ""),
    receiver: String(body.receiver ?? ""),
    amount: Number(body.amount ?? 0),
    story_id: body.storyId ? String(body.storyId) : null,
    timestamp: Number(body.timestamp ?? Date.now())
  };

  try {
    const result = (await db.insert(events).values(rec).onConflictDoNothing()) as
      | { rowsAffected?: number; rowCount?: number }
      | Array<unknown>
      | undefined;
    const rows =
      Array.isArray(result)
        ? result.length
        : typeof result === "object" && result !== null
          ? Number(result.rowsAffected ?? result.rowCount ?? 0)
          : 0;
    console.log(JSON.stringify({ ingested: rows, duplicate: rows === 0 }));
    return NextResponse.json({ ok: true, idempotent: true });
  } catch (e) {
    console.error("ingest_error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
