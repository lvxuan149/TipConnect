import { GlowCard, Section, Button } from "@/components/ui/GlowCard";

export default function Page() {
  return (
    <div className="space-y-12 bg-radial-mask">
      <Section
        title="Tip, Connect, Together"
        desc="Web3 gratitude social protocol on Solana. Blink actions → real-time reputation."
      >
        <GlowCard className="relative overflow-hidden">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-white/80">
                Celebrate creators with instant, verifiable appreciation. Tips propagate along social graph to fuel on-chain reputation.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button href="/discover">Discover Stories</Button>
                <a href="/creators" className="text-sm text-white/70 hover:text-white">Browse creators</a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70 backdrop-blur">
              <div>✨ Gratitude events stream into the protocol.</div>
              <div>📈 Real-time aggregations update creator reputation.</div>
              <div>🔗 Wallet connections form the trust graph.</div>
            </div>
          </div>
        </GlowCard>
      </Section>

      <Section title="Why TipConnect?" desc="Purpose-built primitives for regenerative creator economies.">
        <div className="grid gap-4 md:grid-cols-2">
          <GlowCard>
            <h2 className="text-lg font-semibold">⚡ Instant Gratitude</h2>
            <p className="mt-2 text-white/70">On-chain tips with verifiable tx signatures stream directly into a creator&rsquo;s ledger.</p>
          </GlowCard>
          <GlowCard>
            <h2 className="text-lg font-semibold">🔗 Reputation Signals</h2>
            <p className="mt-2 text-white/70">Gratitude → Reputation → Transparency → Propagation, all observable through the network.</p>
          </GlowCard>
        </div>
      </Section>
    </div>
  );
}
