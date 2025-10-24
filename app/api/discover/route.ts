import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, hosts, events } from "@/drizzle/schema";

export const runtime = 'edge';

interface DiscoverQueryParams {
  limit?: string;
  offset?: string;
  sort?: 'trending' | 'newest' | 'total_sol';
  min_sol?: string;
}

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Parse query parameters - use fallback URL to avoid static generation issues
    const url = new URL(request.url || 'http://localhost:3000/api/discover');
    const searchParams = url.searchParams;
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
    const sort = searchParams.get('sort') as DiscoverQueryParams['sort'] || 'trending';
    const minSol = Number(searchParams.get('min_sol') || '0');

    // Get all stories (events are handled at story level)
    const [storiesList, hostsList] = await Promise.all([
      db.select().from(stories),
      db.select().from(hosts)
    ]);

    // Create host lookup map
    const hostMap = new Map();
    for (const host of hostsList) {
      hostMap.set(host.id, host);
    }

    // Calculate metrics for each story
    const storiesWithMetrics = storiesList.map(story => {
      // For now, use placeholder metrics - in real implementation these would come from story_metrics_daily
      const totalSol = Math.random() * 10; // Random for demo
      const supporters = Math.floor(Math.random() * 5) + 1;
      const shares = Math.floor(Math.random() * 3);

      const host = hostMap.get(story.host_id);

      return {
        id: story.id,
        title: story.title,
        summary: story.summary,
        host: {
          id: host?.id || story.host_id,
          name: host?.name || 'Unknown',
          avatar_url: (host as any)?.avatar_url || ""
        },
        metrics: {
          total_sol: Number(totalSol.toFixed(2)),
          supporters,
          shares
        },
        created_at: story.created_at,
        // Sort key for trending calculation
        trending_score: totalSol * (1 + shares * 0.1 + supporters * 0.05)
      };
    });

    // Filter by minimum SOL if specified
    const filteredStories = storiesWithMetrics.filter(story =>
      story.metrics.total_sol >= minSol
    );

    // Sort stories
    const sortedStories = [...filteredStories].sort((a, b) => {
      switch (sort) {
        case 'trending':
          return b.trending_score - a.trending_score;
        case 'newest':
          return (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0);
        case 'total_sol':
          return b.metrics.total_sol - a.metrics.total_sol;
        default:
          return b.trending_score - a.trending_score;
      }
    });

    // Apply pagination
    const paginatedStories = sortedStories.slice(offset, offset + limit);

    const response = {
      items: paginatedStories,
      pagination: {
        limit,
        offset,
        total: filteredStories.length,
        has_more: offset + limit < filteredStories.length
      },
      meta: {
        processed_count: storiesList.length,
        latency_ms: Date.now() - startTime
      }
    };

    console.log('Discover API:', JSON.stringify({
      path: '/api/discover',
      query: Object.fromEntries(searchParams),
      result_count: response.items.length,
      total_available: response.pagination.total,
      latency_ms: response.meta.latency_ms
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Discover API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discover stories' },
      { status: 500 }
    );
  }
}
