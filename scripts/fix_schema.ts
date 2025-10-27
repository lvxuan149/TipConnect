import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_SDjp2UvGNcn5@ep-wandering-pond-ahargg9f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function fixSchema() {
  console.log("🔧 正在修复数据库 schema...");

  const sql = neon(DATABASE_URL);

  try {
    // 添加 avatar_url 和 headline 字段到 hosts 表
    console.log("添加 hosts 表字段...");
    await sql`ALTER TABLE hosts ADD COLUMN IF NOT EXISTS avatar_url TEXT;`;
    await sql`ALTER TABLE hosts ADD COLUMN IF NOT EXISTS headline TEXT;`;

    // 添加 cover_url 字段到 stories 表
    console.log("添加 stories 表字段...");
    await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_url TEXT;`;

    console.log("✅ Schema 修复完成！");

    // 验证字段是否存在
    console.log("🔍 验证字段存在性...");
    const hostColumns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'hosts' AND column_name IN ('avatar_url', 'headline');`;
    const storyColumns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'cover_url';`;

    console.log("hosts 表字段:", hostColumns);
    console.log("stories 表字段:", storyColumns);

  } catch (error) {
    console.error("❌ Schema 修复失败:", error);
    throw error;
  }
}

fixSchema().catch(console.error);