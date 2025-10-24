import { db } from "../lib/db";
import { events, hosts, stories } from "../drizzle/schema";

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
  { id: "story-alice-1", title: "Decentralized App Launch", summary: "Launching my new DeFi tool for the community", host_id: "creator-alice" },
  { id: "story-alice-2", title: "Open Source Contribution", summary: "Contributing to major protocols and tools", host_id: "creator-alice" },
  { id: "story-bob-1", title: "NFT Collection Drop", summary: "New generative art series celebrating digital culture", host_id: "creator-bob" },
  { id: "story-bob-2", title: "Digital Art Workshop", summary: "Free workshop on creating NFTs and digital art", host_id: "creator-bob" },
  { id: "story-carol-1", title: "Web3 Education Series", summary: "Comprehensive blockchain basics for beginners", host_id: "creator-carol" },
  { id: "story-carol-2", title: "Community Governance Proposal", summary: "New DAO structure for community decisions", host_id: "creator-carol" },
  { id: "story-dave-1", title: "DeFi Protocol Research", summary: "In-depth analysis of yield farming strategies", host_id: "creator-dave" },
  { id: "story-eve-1", title: "Smart Contract Security", summary: "Security audit frameworks and best practices", host_id: "creator-eve" }
];

const EVENTS = [
  // Alice's stories events
  { tx_signature: "tx_alice_tip_1", type: "tip", signer: "user1", receiver: "Alice", amount: 2.5, story_id: "story-alice-1", timestamp: Date.now() - 86400000 },
  { tx_signature: "tx_alice_tip_2", type: "tip", signer: "user2", receiver: "Alice", amount: 1.0, story_id: "story-alice-1", timestamp: Date.now() - 72000000 },
  { tx_signature: "tx_alice_share_1", type: "share", signer: "user3", receiver: "Alice", amount: 0, story_id: "story-alice-1", timestamp: Date.now() - 60000000 },
  { tx_signature: "tx_alice_tip_3", type: "tip", signer: "user4", receiver: "Alice", amount: 3.2, story_id: "story-alice-2", timestamp: Date.now() - 36000000 },

  // Bob's story events
  { tx_signature: "tx_bob_tip_1", type: "tip", signer: "user5", receiver: "Bob", amount: 1.5, story_id: "story-bob-1", timestamp: Date.now() - 48000000 },
  { tx_signature: "tx_bob_tip_2", type: "tip", signer: "user6", receiver: "Bob", amount: 4.0, story_id: "story-bob-1", timestamp: Date.now() - 24000000 },
  { tx_signature: "tx_bob_share_1", type: "share", signer: "user7", receiver: "Bob", amount: 0, story_id: "story-bob-1", timestamp: Date.now() - 12000000 },
  { tx_signature: "tx_bob_tip_3", type: "tip", signer: "user8", receiver: "Bob", amount: 2.2, story_id: "story-bob-2", timestamp: Date.now() - 6000000 },
  { tx_signature: "tx_bob_share_2", type: "share", signer: "user9", receiver: "Bob", amount: 0, story_id: "story-bob-2", timestamp: Date.now() - 3000000 },

  // Carol's story events
  { tx_signature: "tx_carol_tip_1", type: "tip", signer: "user10", receiver: "Carol", amount: 0.8, story_id: "story-carol-1", timestamp: Date.now() - 18000000 },
  { tx_signature: "tx_carol_share_1", type: "share", signer: "user11", receiver: "Carol", amount: 0, story_id: "story-carol-1", timestamp: Date.now() - 9000000 },
  { tx_signature: "tx_carol_tip_2", type: "tip", signer: "user12", receiver: "Carol", amount: 1.5, story_id: "story-carol-2", timestamp: Date.now() - 15000000 },
  { tx_signature: "tx_carol_share_2", type: "share", signer: "user13", receiver: "Carol", amount: 0, story_id: "story-carol-2", timestamp: Date.now() - 7000000 },

  // Dave's story events
  { tx_signature: "tx_dave_tip_1", type: "tip", signer: "user14", receiver: "Dave", amount: 5.0, story_id: "story-dave-1", timestamp: Date.now() - 20000000 },

  // Eve's story events
  { tx_signature: "tx_eve_tip_1", type: "tip", signer: "user15", receiver: "Eve", amount: 3.7, story_id: "story-eve-1", timestamp: Date.now() - 10000000 },
  { tx_signature: "tx_eve_share_1", type: "share", signer: "user16", receiver: "Eve", amount: 0, story_id: "story-eve-1", timestamp: Date.now() - 5000000 }
];

async function ensureBasics() {
  // Insert creators
  for (const creator of CREATORS) {
    await db.insert(hosts).values({
      id: creator.id,
      name: creator.name,
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
      host_id: story.host_id
    }).onConflictDoNothing();
  }
}

async function main() {
  await ensureBasics();

  // Insert events
  for (const event of EVENTS) {
    try {
      await db.insert(events).values(event).onConflictDoNothing();
    } catch {}
  }

  console.log("Seed OK. Sample creators, stories, and events inserted.");
  console.log("Creators:", CREATORS.length);
  console.log("Stories:", STORIES.length);
  console.log("Events:", EVENTS.length);
}
main().catch((e)=>{console.error(e); process.exit(1)});
