const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function check(path: string) {
  try {
    const res = await fetch(base + path);
    console.log(path, res.status, await res.text().catch(() => ''));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(path, 'ERROR', message);
  }
}

(async () => {
  console.log('🏥 Running health check...');
  await check("/api/overview");
  await check("/api/discover");
  await check("/api/creators");
  console.log('✅ Health check completed');
})();
