import { db } from "../lib/db";
import { hosts, stories } from "../drizzle/schema";

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

async function seedBasic() {
  console.log("🌱 开始播种基础数据...");

  try {
    // Insert creators
    console.log("插入创建者数据...");
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
    console.log("插入故事数据...");
    for (const story of STORIES) {
      await db.insert(stories).values({
        id: story.id,
        title: story.title,
        summary: story.summary,
        cover_url: story.cover_url,
        host_id: story.host_id
      }).onConflictDoNothing();
    }

    console.log("✅ 基础数据播种完成！");
    console.log(`创建者: ${CREATORS.length}`);
    console.log(`故事: ${STORIES.length}`);

  } catch (error) {
    console.error("❌ 播种失败:", error);
    throw error;
  }
}

seedBasic().catch(console.error);