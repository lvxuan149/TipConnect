import { db } from "../lib/db";
import { events, hosts, stories, eventVerifications } from "../drizzle/schema";

// Sample data for creators
const CREATORS = [
  {
    id: "creator-alice",
    name: "Alice Chen",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    headline: "Web3 developer building open-source tools"
  },
  {
    id: "creator-bob",
    name: "Bob Martinez",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    headline: "Digital artist and NFT creator"
  },
  {
    id: "creator-carol",
    name: "Carol Kim",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
    headline: "Community organizer and educator"
  },
  {
    id: "creator-dave",
    name: "Dave Wilson",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=dave",
    headline: "DeFi researcher and protocol analyst"
  },
  {
    id: "creator-eve",
    name: "Eve Rodriguez",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve",
    headline: "Smart contract security expert"
  }
];

const STORIES = [
  { id: "story-alice-1", title: "Decentralized App Launch", summary: "Launching my new DeFi tool for the community", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=defi-app", host_id: "creator-alice" },
  { id: "story-alice-2", title: "Open Source Contribution", summary: "Contributing to major protocols and tools", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=opensource", host_id: "creator-alice" },
  { id: "story-bob-1", title: "NFT Collection Drop", summary: "New generative art series celebrating digital culture", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=nft-art", host_id: "creator-bob" },
  { id: "story-bob-2", title: "Digital Art Workshop", summary: "Free workshop on creating NFTs and digital art", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=art-workshop", host_id: "creator-bob" },
  { id: "story-carol-1", title: "Web3 Education Series", summary: "Comprehensive blockchain basics for beginners", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=web3-edu", host_id: "creator-carol" },
  { id: "story-carol-2", title: "Community Governance Proposal", summary: "New DAO structure for community decisions", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=dao-gov", host_id: "creator-carol" },
  { id: "story-dave-1", title: "DeFi Protocol Research", summary: "In-depth analysis of yield farming strategies", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=yield-research", host_id: "creator-dave" },
  { id: "story-eve-1", title: "Smart Contract Security", summary: "Security audit frameworks and best practices", cover_url: "https://api.dicebear.com/7.x/shapes/svg?seed=security-audit", host_id: "creator-eve" }
];

const EVENTS = [
  // Alice's stories events
  { id: "evt_alice_tip_1", tx_signature: "tx_alice_tip_1", type: "tip", signer: "user1", receiver: "Alice", amount: "2.5", story_id: "story-alice-1", timestamp: Date.now() - 86400000 },
  { id: "evt_alice_tip_2", tx_signature: "tx_alice_tip_2", type: "tip", signer: "user2", receiver: "Alice", amount: "1.0", story_id: "story-alice-1", timestamp: Date.now() - 72000000 },
  { id: "evt_alice_share_1", tx_signature: "tx_alice_share_1", type: "share", signer: "user3", receiver: "Alice", amount: "0", story_id: "story-alice-1", timestamp: Date.now() - 60000000 },
  { id: "evt_alice_tip_3", tx_signature: "tx_alice_tip_3", type: "tip", signer: "user4", receiver: "Alice", amount: "3.2", story_id: "story-alice-2", timestamp: Date.now() - 36000000 },

  // Bob's story events
  { id: "evt_bob_tip_1", tx_signature: "tx_bob_tip_1", type: "tip", signer: "user5", receiver: "Bob", amount: "1.5", story_id: "story-bob-1", timestamp: Date.now() - 48000000 },
  { id: "evt_bob_tip_2", tx_signature: "tx_bob_tip_2", type: "tip", signer: "user6", receiver: "Bob", amount: "4.0", story_id: "story-bob-1", timestamp: Date.now() - 24000000 },
  { id: "evt_bob_share_1", tx_signature: "tx_bob_share_1", type: "share", signer: "user7", receiver: "Bob", amount: "0", story_id: "story-bob-1", timestamp: Date.now() - 12000000 },
  { id: "evt_bob_tip_3", tx_signature: "tx_bob_tip_3", type: "tip", signer: "user8", receiver: "Bob", amount: "2.2", story_id: "story-bob-2", timestamp: Date.now() - 6000000 },
  { id: "evt_bob_share_2", tx_signature: "tx_bob_share_2", type: "share", signer: "user9", receiver: "Bob", amount: "0", story_id: "story-bob-2", timestamp: Date.now() - 3000000 },

  // Carol's story events
  { id: "evt_carol_tip_1", tx_signature: "tx_carol_tip_1", type: "tip", signer: "user10", receiver: "Carol", amount: "0.8", story_id: "story-carol-1", timestamp: Date.now() - 18000000 },
  { id: "evt_carol_share_1", tx_signature: "tx_carol_share_1", type: "share", signer: "user11", receiver: "Carol", amount: "0", story_id: "story-carol-1", timestamp: Date.now() - 9000000 },
  { id: "evt_carol_tip_2", tx_signature: "tx_carol_tip_2", type: "tip", signer: "user12", receiver: "Carol", amount: "1.5", story_id: "story-carol-2", timestamp: Date.now() - 15000000 },
  { id: "evt_carol_share_2", tx_signature: "tx_carol_share_2", type: "share", signer: "user13", receiver: "Carol", amount: "0", story_id: "story-carol-2", timestamp: Date.now() - 7000000 },

  // Dave's story events
  { id: "evt_dave_tip_1", tx_signature: "tx_dave_tip_1", type: "tip", signer: "user14", receiver: "Dave", amount: "5.0", story_id: "story-dave-1", timestamp: Date.now() - 20000000 },

  // Eve's story events
  { id: "evt_eve_tip_1", tx_signature: "tx_eve_tip_1", type: "tip", signer: "user15", receiver: "Eve", amount: "3.7", story_id: "story-eve-1", timestamp: Date.now() - 10000000 },
  { id: "evt_eve_share_1", tx_signature: "tx_eve_share_1", type: "share", signer: "user16", receiver: "Eve", amount: "0", story_id: "story-eve-1", timestamp: Date.now() - 5000000 }
];

const SOLANA_VERIFICATIONS = [
  {
    eventId: "evt_alice_tip_1",
    status: "verified",
    signature: "tx_alice_tip_1",
    slot: 25317923,
    heliusResponse: {
      signature: "tx_alice_tip_1",
      meta: { err: null },
      slot: 25317923
    },
    errorCode: null,
    verifiedAt: new Date()
  },
  {
    eventId: "evt_bob_tip_1",
    status: "failed",
    signature: "tx_bob_tip_1",
    slot: null,
    heliusResponse: {
      signature: "tx_bob_tip_1",
      meta: { err: "timeout" }
    },
    errorCode: "TIMEOUT",
    verifiedAt: null
  }
];

const REFLECT_PAYOUTS = [
  {
    id: "payout_evt_alice_tip_1",
    eventId: "evt_alice_tip_1",
    reflectTipId: "reflect_tx_alice_tip_1",
    status: "settled",
    currency: "USDC",
    amount: "2.50",
    attemptCount: 1,
    lastError: null,
    updatedAt: new Date()
  },
  {
    id: "payout_evt_bob_tip_1",
    eventId: "evt_bob_tip_1",
    reflectTipId: "reflect_tx_bob_tip_1",
    status: "failed",
    currency: "USDC",
    amount: "1.50",
    attemptCount: 3,
    lastError: "HeliusDown",
    updatedAt: new Date()
  }
];

// Sample verification data for testing different states
const EVENT_VERIFICATIONS = [
  // Verified transactions (should match some events above)
  {
    id: "verify-alice-tip-1",
    tx_signature: "tx_alice_tip_1",
    event_id: "1", // Will be updated dynamically
    verification_status: "verified" as const,
    verified_at: new Date(Date.now() - 86400000),
    helius_response: {
      signature: "tx_alice_tip_1",
      slot: 12345678,
      amount: 2.5,
      from: "user1",
      to: "Alice",
      timestamp: Date.now() - 86400000,
      source: "helius-rpc"
    },
    error_message: null,
    created_at: new Date(Date.now() - 86400000),
    updated_at: new Date(Date.now() - 86400000)
  },
  {
    id: "verify-bob-tip-1",
    tx_signature: "tx_bob_tip_1",
    event_id: "2", // Will be updated dynamically
    verification_status: "verified" as const,
    verified_at: new Date(Date.now() - 48000000),
    helius_response: {
      signature: "tx_bob_tip_1",
      slot: 12345679,
      amount: 1.5,
      from: "user5",
      to: "Bob",
      timestamp: Date.now() - 48000000,
      source: "helius-rpc"
    },
    error_message: null,
    created_at: new Date(Date.now() - 48000000),
    updated_at: new Date(Date.now() - 48000000)
  },
  // Pending verification
  {
    id: "verify-carol-tip-1",
    tx_signature: "tx_carol_tip_1",
    event_id: "3", // Will be updated dynamically
    verification_status: "pending" as const,
    verified_at: null,
    helius_response: null,
    error_message: null,
    created_at: new Date(Date.now() - 18000000),
    updated_at: new Date(Date.now() - 18000000)
  },
  // Failed verification
  {
    id: "verify-failed-tx",
    tx_signature: "tx_invalid_signature",
    event_id: "4", // Will be updated dynamically
    verification_status: "failed" as const,
    verified_at: null,
    helius_response: null,
    error_message: "tx_not_found",
    created_at: new Date(Date.now() - 72000000),
    updated_at: new Date(Date.now() - 72000000)
  }
];

async function ensureBasics() {
  // Insert creators
  for (const creator of CREATORS) {
    await db.insert(hosts).values({
      id: creator.id,
      name: creator.name,
      avatar_url: creator.avatar_url,
      headline: creator.headline,
      web2_links: JSON.stringify([{
        avatar_url: creator.avatar_url,
        headline: creator.headline
      }])
    }).onConflictDoNothing();
  }

  // Insert stories
  for (const story of STORIES) {
    await db.insert(stories).values({
      id: story.id,
      title: story.title,
      summary: story.summary,
      cover_url: story.cover_url,
      host_id: story.host_id
    }).onConflictDoNothing();
  }
}

async function main() {
  await ensureBasics();

  // Insert events
  const insertedEvents = [];
  for (const event of EVENTS) {
    try {
      const result = await db.insert(events).values(event).onConflictDoNothing().returning();
      if (result.length > 0) {
        insertedEvents.push(result[0]);
      }
    } catch {}
  }

  // Insert verification records with proper event_id mapping
  for (let i = 0; i < EVENT_VERIFICATIONS.length && i < insertedEvents.length; i++) {
    const verification = { ...EVENT_VERIFICATIONS[i] };
    verification.event_id = insertedEvents[i].id;

    try {
      await db.insert(eventVerifications).values(verification).onConflictDoNothing();
    } catch (error) {
      console.error(`Error inserting verification for ${verification.tx_signature}:`, error);
    }
  }

  console.log("Seed OK. Sample creators, stories, events, and verifications inserted.");
  console.log("Creators:", CREATORS.length);
  console.log("Stories:", STORIES.length);
  console.log("Events:", EVENTS.length);
  console.log("Event Verifications:", EVENT_VERIFICATIONS.length);
}
main().catch((e)=>{console.error(e); process.exit(1)});
