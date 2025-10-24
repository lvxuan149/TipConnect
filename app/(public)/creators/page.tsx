'use client';

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { GlowCard, Section, Button } from '@/components/ui/GlowCard';
import { Sidebar, MobileFocusPicker } from './ui/Sidebar';
import type { FocusKey } from './ui/categories';

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function CreatorsPage() {
  const sp = useSearchParams();
  const focus = (sp.get('focus') as FocusKey) || 'all';

  // 读取 Creators 列表（契约见你的 /docs/API.md）
  const { data: cdata } = useSWR('/api/creators', fetcher);
  const { data: overview } = useSWR('/api/overview', fetcher);

  const raw = (cdata?.items ?? []) as any[];

  // 容错映射：支持老字段与新字段共存
  const creators = raw.map((c) => {
    const m = c.metrics ?? {};
    return {
      id: c.id,
      name: c.display_name ?? c.name ?? '—',
      avatar_url: c.avatar_url ?? null,
      bio: c.bio ?? '',
      story_count: c.story_count ?? (c.stories?.length ?? 0),
      total: Number(m.total_tip_value_sol ?? m.total_sol ?? 0),
      supporters: Number(m.unique_supporters ?? m.supporters ?? 0),
      shares: Number(m.share_count ?? m.shares ?? 0),
    };
  });

  // 前端排序（后端未实现时兜底；若你在 /api/creators 已支持 sort，可直接透传）
  const sorted = [...creators].sort((a, b) => {
    switch (focus) {
      case 'top_tips':        return b.total - a.total;
      case 'most_supporters': return b.supporters - a.supporters;
      case 'most_shared':     return b.shares - a.shares;
      default:                return 0;
    }
  });

  return (
    <div className="min-h-screen bg-radial-mask">
      <Section title="Creators" desc="Discover mission-aligned creators and their latest stories.">
        {/* 顶部协议级总览（与 Discover 一致） */}
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
            {/* 移动端下拉 */}
            <MobileFocusPicker />

            {/* 卡片栅格 */}
            {sorted.length === 0 ? (
              <GlowCard>No creators yet. Try Discover.</GlowCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sorted.map((c) => (
                  <GlowCard key={c.id} className="hover:shadow-glow">
                    <div className="flex items-start gap-3">
                      {/* 头像占位（可换为 <Image>） */}
                      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm">👤</div>
                      <div className="flex-1">
                        <a href={`/creators/${c.id}`} className="text-lg font-semibold hover:underline">{c.name}</a>
                        <p className="text-white/70 mt-1 line-clamp-2">{c.bio || '—'}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-white/70">💰 {c.total.toFixed(2)} SOL</div>
                      <div className="text-white/70">👥 {c.supporters}</div>
                      <div className="text-white/70">📣 {c.shares}</div>
                      <div className="text-white/70">📚 {c.story_count} stories</div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button href={`/creators/${c.id}`}>View Profile</Button>
                      <a className="btn rounded-full border border-white/10 hover:bg-white/5" href={`/story/mine`}>
                        My Story
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