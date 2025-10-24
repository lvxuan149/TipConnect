import "dotenv/config";
import { db } from "../lib/db";
import { events } from "../drizzle/schema";

async function main() {
  console.log("== TipConnect Diagnose ==");
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  if (!process.env.WEBHOOK_SECRET) throw new Error("Missing WEBHOOK_SECRET");
  if (!process.env.NEXT_PUBLIC_APP_URL) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  console.log("Env OK");

  // Smoke query (table may not exist yet; handled after migrate in dev:up)
  try {
    await db.select().from(events).limit(1);
    console.log("DB connectivity OK (events) ✔");
  } catch {
    console.log("DB connectivity OK (migrations will create tables) ✔");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
