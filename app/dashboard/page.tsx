'use client';

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const METRIC_DEFINITIONS = [
  { key: "ingested_total", label: "Ingested (10m)" },
  { key: "duplicates_total", label: "Duplicates (10m)" },
  { key: "dlq_total", label: "DLQ (10m)" },
  { key: "p95_ms", label: "P95 Latency" }
] as const;

type MetricDefinition = (typeof METRIC_DEFINITIONS)[number];
type MetricKey = MetricDefinition["key"];

type ReplayMetricsResponse = {
  windowMs?: number;
} & Partial<Record<MetricKey, number>>;

function formatValue(key: MetricKey, value: unknown) {
  if (value === null || value === undefined) return "—";
  if (key === "p95_ms") return `${value} ms`;
  return String(value);
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<ReplayMetricsResponse>("/api/ops/replay", fetcher, { refreshInterval: 30_000 });

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Operations Dashboard</h1>
        {data?.windowMs && (
          <span className="text-sm text-white/60">Window: {Math.round(data.windowMs / 60000)} min</span>
        )}
      </div>

      {isLoading && (
        <div className="card">Loading replay metrics…</div>
      )}

      {data && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {METRIC_DEFINITIONS.map(def => {
            const value = data?.[def.key];
            return (
              <div key={def.key} className="card">
                <div className="text-sm text-white/60">{def.label}</div>
                <div className="mt-2 text-2xl font-semibold">{formatValue(def.key, value)}</div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !data && (
        <div className="card">Replay metrics unavailable.</div>
      )}
    </div>
  );
}
