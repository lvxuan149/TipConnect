import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, hosts, events, eventVerifications, transactions } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;

    const storyRecord = await db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        createdAt: stories.created_at,
        hostId: stories.host_id,
        hostName: hosts.name,
        hostLinks: hosts.web2_links
      })
      .from(stories)
      .leftJoin(hosts, eq(stories.host_id, hosts.id))
      .where(eq(stories.id, storyId))
      .limit(1);

    if (storyRecord.length === 0) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    const story = storyRecord[0];

    const [tipEvents, shareEvents, payoutTransactions] = await Promise.all([
      db
        .select({
          id: events.id,
          txSignature: events.tx_signature,
          signer: events.signer,
          receiver: events.receiver,
          amount: events.amount,
          timestamp: events.timestamp,
          type: events.type,
          verificationStatus: eventVerifications.status,
          verificationSlot: eventVerifications.slot,
          verificationError: eventVerifications.errorCode,
          verifiedAt: eventVerifications.verifiedAt
        })
        .from(events)
        .leftJoin(eventVerifications, eq(eventVerifications.eventId, events.id))
        .where(and(eq(events.story_id, storyId), eq(events.type, "tip"))),
      db
        .select({
          id: events.id,
          timestamp: events.timestamp
        })
        .from(events)
        .where(and(eq(events.story_id, storyId), eq(events.type, "share"))),
      db
        .select({
          id: transactions.id,
          txSig: transactions.txSig,
          status: transactions.status,
          amount: transactions.amount,
          symbol: transactions.symbol,
          createdAt: transactions.createdAt,
          reflectTxId: transactions.reflectTxId,
          reflectQuoteId: transactions.reflectQuoteId
        })
        .from(transactions)
        .where(eq(transactions.storyId, storyId))
        .orderBy(transactions.createdAt)
    ]);

    const supporters = new Set<string>();
    let totalSol = 0;
    let verifiedSol = 0;
    let latestTimestamp = 0;

    const tips = tipEvents.map((event) => {
      const amount = Number(event.amount ?? 0);
      totalSol += amount;

      if (event.verificationStatus === "verified") {
        verifiedSol += amount;
      }

      supporters.add(event.signer);
      latestTimestamp = Math.max(latestTimestamp, Number(event.timestamp ?? 0));

      return {
        id: event.id,
        tx_signature: event.txSignature,
        signer: event.signer,
        receiver: event.receiver,
        amount_sol: Number(amount.toFixed(6)),
        timestamp: event.timestamp ? new Date(Number(event.timestamp)).toISOString() : null,
        verification: event.verificationStatus
          ? {
              status: event.verificationStatus,
              slot: event.verificationSlot ?? undefined,
              verified_at: event.verifiedAt ?? undefined,
              error_code: event.verificationError ?? undefined
            }
          : null
      };
    });

    const hostMeta = (() => {
      if (!story.hostLinks) {
        return { avatar_url: "", headline: "" };
      }

      try {
        const links = JSON.parse(story.hostLinks || "[]");
        const primary = Array.isArray(links) ? links[0] ?? {} : {};
        return {
          avatar_url: typeof primary.avatar_url === "string" ? primary.avatar_url : "",
          headline: typeof primary.headline === "string" ? primary.headline : ""
        };
      } catch {
        return { avatar_url: "", headline: "" };
      }
    })();

    const response = {
      id: story.id,
      title: story.title,
      summary: story.summary,
      created_at: story.createdAt,
      host: {
        id: story.hostId,
        name: story.hostName,
        avatar_url: hostMeta.avatar_url,
        headline: hostMeta.headline
      },
      metrics: {
        total_sol: Number(totalSol.toFixed(6)),
        verified_sol: Number(verifiedSol.toFixed(6)),
        supporters: supporters.size,
        shares: shareEvents.length,
        tips_count: tips.length,
        last_tip_at: latestTimestamp ? new Date(latestTimestamp).toISOString() : null
      },
      tips,
      payouts: payoutTransactions.map((record) => ({
        id: record.id,
        tx_signature: record.txSig,
        status: record.status,
        amount: Number(record.amount),
        symbol: record.symbol,
        reflect_tx_id: record.reflectTxId,
        reflect_quote_id: record.reflectQuoteId,
        created_at: record.createdAt
      }))
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "max-age=10, s-maxage=30, stale-while-revalidate=120"
      }
    });
  } catch (error) {
    console.error("[discover.story]", error);
    return NextResponse.json(
      { error: "Failed to load story details" },
      { status: 500 }
    );
  }
}
