import { NextRequest, NextResponse } from "next/server";
import { gt, sql } from "drizzle-orm";
import { refreshHostMetrics } from "@/lib/hostMetrics";
import { db } from "@/lib/db";
import { hosts, events, stories } from "@/drizzle/schema";

const TEN_MINUTES_MS = 10 * 60 * 1000;

type ReplayParams = {
  fromSlot?: number;
  limit?: number;
  dryRun?: boolean;
  scope?: string;
};

async function getRecentMetrics(now: number) {
  const windowStart = now - TEN_MINUTES_MS;
  const recentEvents = await db.select().from(events).where(gt(events.timestamp, windowStart));

  const ingestedTotal = recentEvents.length;
  const duplicatesTotal = 0; // duplicates are dropped on insert; expose placeholder until tracked
  const dlqTotal = 0; // no DLQ persistence yet; placeholder for observability
  const p95LatencyMs = 0; // latency distribution not tracked yet; expose placeholder

  return {
    windowMs: TEN_MINUTES_MS,
    ingested_total: ingestedTotal,
    duplicates_total: duplicatesTotal,
    dlq_total: dlqTotal,
    p95_ms: p95LatencyMs
  };
}

function parseBody(input: unknown): ReplayParams {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  return {
    fromSlot: typeof value.fromSlot === "number" ? value.fromSlot : undefined,
    limit: typeof value.limit === "number" ? value.limit : undefined,
    dryRun: typeof value.dryRun === "boolean" ? value.dryRun : false,
    scope: typeof value.scope === "string" ? value.scope : undefined
  };
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  const params = parseBody(await req.json().catch(() => ({})));

  let response: any;

  if (params.scope === 'creators') {
    response = await replayCreators(params.dryRun || false);
  } else {
    // Default behavior for backward compatibility
    const metrics = await getRecentMetrics(now);
    response = {
      params,
      ...metrics
    };
    console.log(JSON.stringify({ msg: "replay_request", window_ms: metrics.windowMs, params, metrics }));
  }

  return NextResponse.json(response);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');
  const dryRun = searchParams.get('dry-run') === 'true';

  if (scope === 'creators') {
    const response = await replayCreators(dryRun);
    console.log(JSON.stringify({ msg: "replay_creators", dryRun, result: response.result }));
    return NextResponse.json(response);
  } else {
    // Default behavior for backward compatibility
    const now = Date.now();
    const metrics = await getRecentMetrics(now);
    console.log(JSON.stringify({ msg: "replay_metrics", window_ms: metrics.windowMs, metrics }));
    return NextResponse.json(metrics);
  }
}

async function replayCreators(dryRun: boolean) {
  const startTime = Date.now();
  const logs: string[] = [];

  logs.push(`[${new Date().toISOString()}] Starting creators replay operation`);
  logs.push(`Dry-run: ${dryRun}`);

  try {
    // Get current data
    const [allHosts, allStories, allEvents] = await Promise.all([
      db.select().from(hosts),
      db.select().from(stories),
      db.select().from(events)
    ]);

    logs.push(`[${new Date().toISOString()}] Found ${allHosts.length} hosts, ${allStories.length} stories, ${allEvents.length} events`);

    // Calculate current metrics
    const hostMetricsMap = new Map();

    for (const host of allHosts) {
      const hostStories = allStories.filter(s => s.host_id === host.id);
      let totalTipValue = 0;
      const supporters = new Set<string>();
      let shareCount = 0;

      for (const story of hostStories) {
        const storyEvents = allEvents.filter(e => e.story_id === story.id);
        for (const event of storyEvents) {
          if (event.type === "tip") {
            totalTipValue += Number(event.amount || 0);
            supporters.add(event.signer);
          } else if (event.type === "share") {
            shareCount += 1;
          }
        }
      }

      hostMetricsMap.set(host.id, {
        host_id: host.id,
        host_name: host.name,
        total_tip_value_sol: totalTipValue,
        unique_supporters: supporters.size,
        share_count: shareCount,
        stories_count: hostStories.length
      });

      logs.push(`[${new Date().toISOString()}] ${host.name}: ${totalTipValue.toFixed(2)} SOL, ${supporters.size} supporters, ${shareCount} shares, ${hostStories.length} stories`);
    }

    const ingested_total = allStories.length;
    const creators_processed = allHosts.length;

    // Count duplicates
    const eventSignatures = new Map<string, number>();
    let duplicates = 0;
    for (const event of allEvents) {
      const key = `${event.tx_signature}-${event.type}`;
      const count = eventSignatures.get(key) || 0;
      if (count > 0) {
        duplicates++;
      }
      eventSignatures.set(key, count + 1);
    }

    const duplicates_total = duplicates;
    const overview_latency_ms = Date.now() - startTime;

    if (!dryRun) {
      logs.push(`[${new Date().toISOString()}] Updating host_metrics table...`);
      const refreshResult = await refreshHostMetrics();
      logs.push(`[${new Date().toISOString()}] Host metrics refreshed: ingested_total=${refreshResult.ingested_total}, duplicates_total=${refreshResult.duplicates_total}, overview_latency_ms=${refreshResult.overview_latency_ms}`);
    } else {
      logs.push(`[${new Date().toISOString()}] Dry-run mode: skipping database update`);
    }

    const details = Array.from(hostMetricsMap.values());

    const totalTime = Date.now() - startTime;
    logs.push(`[${new Date().toISOString()}] Replay completed in ${totalTime}ms`);

    return {
      success: true,
      scope: 'creators',
      dryRun,
      result: {
        ingested_total,
        duplicates_total,
        overview_latency_ms,
        creators_processed,
        details
      },
      logs
    };

  } catch (error) {
    logs.push(`[${new Date().toISOString()}] ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      success: false,
      scope: 'creators',
      dryRun,
      result: {
        ingested_total: 0,
        duplicates_total: 0,
        overview_latency_ms: Date.now() - startTime,
        creators_processed: 0
      },
      logs
    };
  }
}
