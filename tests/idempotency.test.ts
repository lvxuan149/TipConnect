import { describe, it, expect } from "vitest";
import { db } from "../lib/db";
import { events } from "../drizzle/schema";

describe("idempotency", () => {
  it("ignores duplicate (tx_signature,type)", async () => {
    const before = await db.select().from(events);
    // insert duplicate of known seed
    await db.insert(events).values({
      tx_signature: "tx_bbb222",
      type: "tip",
      signer: "Bob",
      receiver: "HostA",
      amount: 2.0,
      story_id: "story-1",
      timestamp: Date.now()
    }).onConflictDoNothing();
    const after = await db.select().from(events);
    expect(after.length).toBe(before.length);
  });
});
