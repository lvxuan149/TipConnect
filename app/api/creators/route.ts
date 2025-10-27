import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hosts, events, stories } from "@/drizzle/schema";

export const runtime = 'edge';

export async function GET() {
  try {
    // Get all hosts, stories, and events for aggregation
    const [hostsList, allStories, allEvents] = await Promise.all([
      db.select().from(hosts),
      db.select().from(stories),
      db.select().from(events)
    ]);

    // Create metrics map for each host
    const hostMetrics = new Map();

    // Initialize metrics for all hosts
    for (const host of hostsList) {
      hostMetrics.set(host.id, {
        total_sol: 0,
        supporters: new Set(),
        shares: 0,
        stories_count: 0
      });
    }

    // Count stories per host
    for (const story of allStories) {
      const metrics = hostMetrics.get(story.host_id);
      if (metrics) {
        metrics.stories_count += 1;
      }
    }

    // Aggregate events metrics
    for (const event of allEvents) {
      const story = allStories.find((s) => s.id === event.story_id);
      if (!story) continue;

      const metrics = hostMetrics.get(story.host_id);
      if (!metrics) continue;

      if (event.type === "tip") {
        metrics.total_sol += Number(event.amount || 0);
        metrics.supporters.add(event.signer);
      } else if (event.type === "share") {
        metrics.shares += 1;
      }
    }

    // Build response array
    const items = hostsList.map((host) => {
      const metrics = hostMetrics.get(host.id) || {
        total_sol: 0,
        supporters: new Set(),
        shares: 0,
        stories_count: 0
      };

      return {
        id: host.id,
        name: host.name,
        avatar_url: host.avatar_url || "",
        headline: host.headline || `${metrics.stories_count} stories`,
        total_sol: metrics.total_sol / 1e9, // Convert from lamports to SOL
        supporters: metrics.supporters.size,
        shares: metrics.shares,
        stories_count: metrics.stories_count
      };
    }).sort((a, b) => b.total_sol - a.total_sol);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error in /api/creators:", error);
    return NextResponse.json({ error: "Failed to fetch creators" }, { status: 500 });
  }
}