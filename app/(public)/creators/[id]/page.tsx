'use client';

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { GlowCard, Section, Button } from "@/components/ui/GlowCard";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 复用已有端点，前端筛选出该 creator
  const { data: cdata } = useSWR("/api/creators", fetcher);
  const creator = (cdata?.items ?? []).find((c: any) => c.id === id);

  // 该创作者的 stories：从 creators API 已带两个；更多可再从 /api/discover 过滤
  const { data: sdata } = useSWR("/api/discover", fetcher);
  const allStories = (sdata?.items ?? []).filter((s: any) =>
    creator?.stories?.some((x: any) => x.id === s.id)
  );

  if (!creator) {
    return (
      <Section title="Creator">
        <GlowCard>Loading…（或未找到该创作者）</GlowCard>
      </Section>
    );
  }

  const rep = creator.reputation ?? { total_sol: 0, supporters: 0, shares: 0 };

  return (
    <div className="min-h-screen bg-radial-mask">
      <Section
        title={creator.name}
        desc={creator.bio || "—"}
      >
        <GlowCard className="mb-6">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="text-white/70">
              💰 Total SOL=
              <span className="font-semibold text-white"> {Number(rep.total_sol || 0).toFixed(1)}</span>
            </div>
            <div className="text-white/70">
              👥 Supporters=
              <span className="font-semibold text-white"> {rep.supporters || 0}</span>
            </div>
            <div className="text-white/70">
              📣 Amplifiers=
              <span className="font-semibold text-white"> {rep.shares || 0}</span>
            </div>
          </div>
        </GlowCard>

        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Stories</div>
        <div className="grid gap-4 md:grid-cols-2">
          {(allStories.length ? allStories : creator.stories || []).map((s: any) => (
            <GlowCard key={s.id} className="hover:shadow-glow">
              <a href={`/story/${s.id}`} className="text-lg font-semibold hover:underline">
                {s.title}
              </a>
              <p className="text-white/70 mt-1">{s.summary || "—"}</p>

              {/* 小统计（若从 /api/discover 取到全量） */}
              {"total_sol" in s && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="text-white/70">💰 {Number(s.total_sol || 0).toFixed(1)}</div>
                  <div className="text-white/70">👥 {s.supporters || 0}</div>
                  <div className="text-white/70">📣 {s.shares || 0}</div>
                </div>
              )}

              <div className="mt-4">
                <Button href={`/story/${s.id}`}>View Story</Button>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="mt-8">
          <Button onClick={() => router.back()} className="opacity-90">← Back</Button>
        </div>
      </Section>
    </div>
  );
}