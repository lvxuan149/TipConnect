import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const start = Date.now();
  try {
    // Use optimized SQL query for better performance
    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END), 0) as total_sol,
        COUNT(DISTINCT CASE WHEN type = 'tip' THEN signer END) as supporters,
        COUNT(CASE WHEN type = 'share' THEN 1 END) as shares
      FROM events
    `);

    const data = result.rows?.[0] ?? {
      total_sol: 0,
      supporters: 0,
      shares: 0
    };

    const payload = {
      total_sol: Number(data.total_sol || 0).toFixed(3), // Convert from lamports to SOL
      supporters: Number(data.supporters || 0),
      shares: Number(data.shares || 0)
    };

    const latency = Date.now() - start;

    console.log('[overview]', {
      table_checked: 'events',
      duration_ms: latency,
      total_sol: payload.total_sol,
      supporters: payload.supporters,
      shares: payload.shares
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=300"
      }
    });
  } catch (error: any) {
    console.error('[overview error]', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
}
