import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, events } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get all stories for this creator
    const creatorStories = await db
      .select()
      .from(stories)
      .where(eq(stories.host_id, id));

    if (creatorStories.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get all events for filtering
    const allEvents = await db.select().from(events);

    // Group events by story and calculate metrics
    const items = creatorStories.map(story => {
      const storyEvents = allEvents.filter(e => e.story_id === story.id);

      const totalSol = storyEvents
        .filter(e => e.type === "tip")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const supporters = new Set(
        storyEvents
          .filter(e => e.type === "tip")
          .map(e => e.signer)
      );

      const shares = storyEvents.filter(e => e.type === "share").length;

      return {
        id: story.id,
        title: story.title,
        summary: story.summary,
        created_at: story.created_at,
        metrics: {
          total_sol: totalSol,
          supporters: supporters.size,
          shares: shares
        }
      };
    }).sort((a, b) => b.metrics.total_sol - a.metrics.total_sol);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error in /api/creators/[id]/stories:", error);
    return NextResponse.json({ error: "Failed to fetch creator stories" }, { status: 500 });
  }
}