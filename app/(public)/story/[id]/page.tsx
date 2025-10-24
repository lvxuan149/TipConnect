'use client';

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { GlowCard, Section, Button } from "@/components/ui/GlowCard";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 从 /api/discover 取全量，再按 id 定位
  const { data } = useSWR("/api/discover", fetcher);
  const story = (data?.items ?? []).find((s: any) => s.id === id);

  if (!story) {
    return (
      <Section title="Story">
        <GlowCard>Loading…（或未找到该 Story）</GlowCard>
      </Section>
    );
  }

  return (
    <div className="min-h-screen bg-radial-mask">
      <Section
        title={story.title}
        desc={story.summary || "—"}
      >
        <div className="grid gap-6 md:grid-cols-5">
          {/* 左侧：统计 & 操作 */}
          <div className="md:col-span-2">
            <GlowCard className="mb-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-white/70">
                  💰 Total SOL=
                  <span className="font-semibold text-white"> {Number(story.total_sol || 0).toFixed(1)}</span>
                </div>
                <div className="text-white/70">
                  👥 Supporters=
                  <span className="font-semibold text-white"> {story.supporters || 0}</span>
                </div>
                <div className="text-white/70">
                  📣 Amplifiers=
                  <span className="font-semibold text-white"> {story.shares || 0}</span>
                </div>
              </div>
            </GlowCard>

            {/* Blink CTA（占位。未接钱包时引导连接） */}
            <GlowCard>
              <div className="text-sm text-white/80 mb-3">
                Blink an action for this Story:
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href="#" className="px-4">Tip</Button>
                <Button href="#" className="px-4">Share</Button>
                <Button href="#" className="px-4">Vote</Button>
                {/* 未来：Airdrop / Guess … */}
              </div>
              <p className="text-xs text-white/60 mt-3">
                未连接钱包时点击将提示 Connect Wallet；连接后跳转到链上签名流程。
              </p>
            </GlowCard>
          </div>

          {/* 右侧：内容与时间线（占位） */}
          <div className="md:col-span-3">
            <GlowCard>
              <div className="text-sm text-white/70">About this Story</div>
              <p className="mt-2 text-white/80">
                {story.summary || "—"}
              </p>

              <div className="mt-6 text-sm text-white/70">Recent Blinks (placeholder)</div>
              <ul className="mt-2 grid gap-2">
                <li className="rounded-2xl border border-white/10 p-3">👤 Alice tipped 1.0 SOL</li>
                <li className="rounded-2xl border border-white/10 p-3">👤 Bob shared this Story</li>
                <li className="rounded-2xl border border-white/10 p-3">👤 Carol voted 👍</li>
              </ul>
              <p className="text-xs text-white/50 mt-2">
                * 时间线为展示占位；接入事件流后可替换为真实数据。
              </p>
            </GlowCard>
          </div>
        </div>

        <div className="mt-8">
          <Button onClick={() => router.back()} className="opacity-90">← Back</Button>
        </div>
      </Section>
    </div>
  );
}