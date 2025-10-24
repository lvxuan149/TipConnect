import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hosts, events, stories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get host details and their stories
    const [hostList, allEvents, hostStories] = await Promise.all([
      db.select().from(hosts).where(eq(hosts.id, id)).limit(1),
      db.select().from(events), // Get all events for filtering
      db.select().from(stories).where(eq(stories.host_id, id))
    ]);

    const host = hostList[0];
    if (!host) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Get story IDs for this host
    const hostStoryIds = hostStories.map(s => s.id);

    // Filter events for this host's stories
    const hostEvents = allEvents.filter(e => hostStoryIds.includes(e.story_id));

    // Aggregate metrics
    let totalSol = 0;
    const supporters = new Set<string>();
    let shares = 0;

    for (const event of hostEvents) {
      if (event.type === "tip") {
        totalSol += Number(event.amount || 0);
        supporters.add(event.signer);
      } else if (event.type === "share") {
        shares += 1;
      }
    }

    // Build stories with their individual metrics
    const storiesWithMetrics = hostStories.map(story => {
      const storyEvents = hostEvents.filter(e => e.story_id === story.id);
      const storyTotalSol = storyEvents
        .filter(e => e.type === "tip")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      return {
        id: story.id,
        title: story.title,
        total_sol: storyTotalSol
      };
    }).sort((a, b) => b.total_sol - a.total_sol);

    return NextResponse.json({
      id: host.id,
      name: host.name,
      avatar_url: (host as any).avatar_url || "",
      headline: (host as any).headline || `${hostStories.length} stories`,
      reputation: {
        total_sol: totalSol,
        supporters: supporters.size,
        shares: shares
      },
      stories: storiesWithMetrics
    });
  } catch (error) {
    console.error("Error in /api/creators/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch creator details" }, { status: 500 });
  }
}