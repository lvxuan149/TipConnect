import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const rawUrl = process.env.DATABASE_URL || "";
// Ensure channel_binding=disable in case it's missing
const url = rawUrl.includes("channel_binding=") ? rawUrl : (rawUrl + (rawUrl.includes("?") ? "&" : "?") + "channel_binding=disable");

if (!url) {
  throw new Error("DATABASE_URL is not set");
}
const sql = neon(url);
export const db = drizzle(sql);
export default db;
