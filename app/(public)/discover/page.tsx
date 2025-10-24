'use client';

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { GlowCard, Section, Button } from '@/components/ui/GlowCard';
import { Sidebar, MobileActionPicker } from './ui/Sidebar';
import type { ActionKey } from './ui/actionTypes';

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function DiscoverPage() {
  const sp = useSearchParams();
  const actionType = (sp.get('actionType') as ActionKey) || 'all';

  // 优先让后端过滤；若后端尚未实现，则前端兜底过滤
  const url = actionType === 'all' ? '/api/discover' : `/api/discover?actionType=${actionType}`;
  const { data: list } = useSWR(url, fetcher);
  const { data: overview } = useSWR('/api/overview', fetcher);

  const items = (list?.items ?? []) as any[];
  const filtered = actionType === 'all'
    ? items
    : items.filter(s => (s.actionTypes ?? []).includes(actionType));

  return (
    <div className="min-h-screen bg-radial-mask">
      <Section title="Discover" desc="Stories worth amplifying with on-chain gratitude.">
        {/* 顶部协议级总览 */}
        <div className="mb-4 flex items-center justify-center gap-6 rounded-xl bg-[#0E1218]/70 p-3 text-[#A3CEFF]">
          <span>💰 <strong>{Number(overview?.total_sol ?? 0).toFixed(2)}</strong> SOL</span>
          <span>👥 <strong>{overview?.total_supporters ?? 0}</strong> Supporters</span>
          <span>📣 <strong>{overview?.total_shares ?? 0}</strong> Shares</span>
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {/* 左侧分类（桌面） */}
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* 右侧内容 */}
          <main className="space-y-3">
            {/* 移动端分类选择器 */}
            <MobileActionPicker />

            {/* 卡片网格 */}
            {filtered.length === 0 ? (
              <GlowCard>
                <div className="text-white/80">
                  No stories yet under this action.
                  {' '}
                  <a className="underline text-brand-light" href="/discover">Try All Stories</a>
                  {' '}or{' '}
                  <a className="underline text-brand-light" href="/discover?actionType=tip">Tip & Thank</a>.
                </div>
              </GlowCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((s: any) => (
                  <GlowCard key={s.id} className="hover:shadow-glow">
                    <a href={`/story/${s.id}`} className="text-lg font-semibold hover:underline">{s.title}</a>
                    <p className="text-white/70 mt-1">{s.summary}</p>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div className="text-white/70">💰 {Number(s.metrics?.sol ?? s.total_sol ?? 0).toFixed(2)} SOL</div>
                      <div className="text-white/70">👥 {s.metrics?.supporters ?? s.supporters ?? 0}</div>
                      <div className="text-white/70">📣 {s.metrics?.shares ?? s.shares ?? 0}</div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button href={`/story/${s.id}`}>View Story</Button>
                      <a
                        className="btn rounded-full border border-white/10 hover:bg-white/5"
                        aria-label={`Share Blink for ${s.title}`}
                        href={s.blink?.url ?? `https://blink.tipconnect.so/s/${s.id}`}
                        target="_blank"
                      >
                        Share Blink
                      </a>
                    </div>
                  </GlowCard>
                ))}
              </div>
            )}
          </main>
        </div>
      </Section>
    </div>
  );
}