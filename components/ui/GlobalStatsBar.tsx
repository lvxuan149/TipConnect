'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function GlobalStatsBar() {
  const { data, error, isLoading } = useSWR("/api/overview", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false
  });

  if (error) return <div className="text-red-500">Failed to load overview</div>;
  if (isLoading || !data) return <div className="animate-pulse h-6 w-full bg-slate-800 rounded-lg" />;

  const { total_sol, supporters, shares } = data;

  // Safely parse numbers with fallback to 0
  const solAmount = Number(total_sol || 0);
  const supportersCount = Number(supporters || 0);
  const sharesCount = Number(shares || 0);

  return (
    <div className="flex items-center justify-center text-sm md:text-base gap-6 py-3 rounded-xl bg-[#0E1218]/70 backdrop-blur-md text-[#A3CEFF]">
      <span>💰 <strong>{solAmount.toFixed(2)}</strong> SOL</span>
      <span>👥 <strong>{supportersCount}</strong> Supporters</span>
      <span>📣 <strong>{sharesCount}</strong> Shares</span>
    </div>
  );
}