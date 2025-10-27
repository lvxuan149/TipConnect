import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const rawUrl = process.env.DATABASE_URL || "";

if (!rawUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Use the URL as-is since it's already properly configured
const url = rawUrl;
const sql = neon(url);
export const db = drizzle(sql);
export default db;
