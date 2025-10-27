import { NextResponse } from "next/server";
import { checkHealth, ReflectApiError } from "@/lib/reflect";

export async function GET() {
  const checkedAt = new Date();
  let reflectStatus: "ok" | "degraded" | "down" = "ok";
  let reflectMessage: string | undefined;
  const issues: string[] = [];

  try {
    const health = await checkHealth();
    if (!health.success) {
      reflectStatus = "degraded";
      reflectMessage = health.message ?? "Reflect API reported degraded status";
      issues.push("reflect:degraded");
    }
  } catch (error) {
    reflectStatus = "down";
    if (error instanceof ReflectApiError) {
      reflectMessage = error.message;
      issues.push(`reflect:${error.code ?? "error"}`);
      console.error("[reflect.health]", {
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      reflectMessage = message;
      issues.push("reflect:unexpected-error");
      console.error("[reflect.health]", message);
    }
  }

  const heliusConfigured = Boolean(process.env.HELIUS_API_KEY);
  const heliusStatus: "ok" | "degraded" | "down" = heliusConfigured ? "ok" : "degraded";
  if (!heliusConfigured) {
    issues.push("helius:missing-api-key");
  }

  const success = reflectStatus === "ok" && heliusStatus === "ok";

  const body: Record<string, unknown> = {
    success,
    reflect: reflectStatus,
    helius: heliusStatus,
    updatedAt: checkedAt.toISOString()
  };

  if (reflectMessage) {
    body.message = reflectMessage;
  }

  if (issues.length > 0) {
    body.issues = issues;
  }

  return NextResponse.json(body, {
    status: success ? 200 : 503
  });
}
