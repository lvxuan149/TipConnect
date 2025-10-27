import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

type CheckStatus = "pass" | "fail";

function evaluateStatus(checks: CheckStatus[]) {
  return checks.every((status) => status === "pass") ? "ok" : "degraded";
}

export async function GET() {
  const timestamp = new Date();

  const requiredEnv = [
    "DATABASE_URL",
    "WEBHOOK_SECRET",
    "REFLECT_API_KEY",
    "HELIUS_API_KEY",
    "DYNAMIC_ENV_ID",
    "DYNAMIC_API_KEY"
  ];

  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  const environmentStatus: CheckStatus = missingEnv.length === 0 ? "pass" : "fail";

  let databaseStatus: CheckStatus = "pass";
  let databaseLatency = 0;
  let databaseError: string | null = null;

  try {
    const start = Date.now();
    await db.execute(sql`select 1`);
    databaseLatency = Date.now() - start;
  } catch (error) {
    databaseStatus = "fail";
    databaseError = error instanceof Error ? error.message : "Unknown database error";
  }

  const serviceStatus = {
    reflect: Boolean(process.env.REFLECT_API_KEY),
    helius: Boolean(process.env.HELIUS_API_KEY),
    dynamic: Boolean(process.env.DYNAMIC_API_KEY)
  };

  const overallStatus = evaluateStatus([environmentStatus, databaseStatus]);

  return NextResponse.json({
    status: overallStatus,
    timestamp: timestamp.toISOString(),
    checks: {
      environment: {
        status: environmentStatus,
        missing: missingEnv
      },
      database: {
        status: databaseStatus,
        latency_ms: databaseLatency,
        error: databaseError
      },
      services: serviceStatus
    },
    meta: {
      nodeVersion: process.versions.node,
      platform: process.platform,
      pid: process.pid
    }
  });
}
