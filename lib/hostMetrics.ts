import { db } from "@/lib/db";
import { hosts, events, stories, hostMetrics } from "@/drizzle/schema";
import { eq, sql, inArray } from "drizzle-orm";

export interface HostMetricsData {
  host_id: string;
  total_tip_value_sol: number;
  unique_supporters: number;
  share_count: number;
  stories_count: number;
  updated_at: Date;
}

export async function refreshHostMetrics(): Promise<{
  ingested_total: number;
  duplicates_total: number;
  overview_latency_ms: number;
}> {
  const startTime = Date.now();

  try {
    // Get all hosts and stories in one query
    const allHosts = await db.select().from(hosts);
    const allStories = await db.select().from(stories);

    let ingested_total = 0;
    let duplicates_total = 0;

    // Process each host
    for (const host of allHosts) {
      // Get stories for this host
      const hostStories = allStories.filter(s => s.host_id === host.id);
      const storyIds = hostStories.map(s => s.id);

      if (storyIds.length === 0) {
        // Host with no stories - set default metrics
        await db.insert(hostMetrics)
          .values({
            host_id: host.id,
            total_tip_value_sol: "0",
            unique_supporters: "0",
            share_count: "0",
            stories_count: "0",
            updated_at: new Date()
          })
          .onConflictDoUpdate({
            target: hostMetrics.host_id,
            set: {
              total_tip_value_sol: "0",
              unique_supporters: "0",
              share_count: "0",
              stories_count: "0",
              updated_at: new Date()
            }
          });
        continue;
      }

      // Get events for this host's stories using inArray (only if storyIds is not empty)
      let hostEvents = [];
      if (storyIds.length > 0) {
        hostEvents = await db
          .select()
          .from(events)
          .where(inArray(events.story_id, storyIds));
      }

      // Calculate metrics manually
      let totalTipValue = 0;
      const supporters = new Set<string>();
      let shareCount = 0;

      for (const event of hostEvents) {
        if (event.type === "tip") {
          totalTipValue += Number(event.amount || 0);
          supporters.add(event.signer);
        } else if (event.type === "share") {
          shareCount += 1;
        }
      }

      // Upsert host metrics
      await db.insert(hostMetrics)
        .values({
          host_id: host.id,
          total_tip_value_sol: totalTipValue.toString(),
          unique_supporters: supporters.size.toString(),
          share_count: shareCount.toString(),
          stories_count: storyIds.length.toString(),
          updated_at: new Date()
        })
        .onConflictDoUpdate({
          target: hostMetrics.host_id,
          set: {
            total_tip_value_sol: totalTipValue.toString(),
            unique_supporters: supporters.size.toString(),
            share_count: shareCount.toString(),
            stories_count: storyIds.length.toString(),
            updated_at: new Date()
          }
        });

      ingested_total += storyIds.length;
    }

    // Count duplicate events
    const allEvents = await db.select().from(events);
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
    duplicates_total = duplicates;

    const latency = Date.now() - startTime;

    console.log(`Host metrics refreshed: ingested_total=${ingested_total}, duplicates_total=${duplicates_total}, overview_latency_ms=${latency}`);

    return {
      ingested_total,
      duplicates_total,
      overview_latency_ms: latency
    };

  } catch (error) {
    console.error("Error refreshing host metrics:", error);
    const latency = Date.now() - startTime;

    return {
      ingested_total: 0,
      duplicates_total: 0,
      overview_latency_ms: latency
    };
  }
}

export async function getHostMetrics(hostId: string): Promise<HostMetricsData | null> {
  const result = await db
    .select()
    .from(hostMetrics)
    .where(eq(hostMetrics.host_id, hostId))
    .limit(1);

  return result[0] || null;
}

export async function getAllHostMetrics(): Promise<HostMetricsData[]> {
  return await db.select().from(hostMetrics);
}