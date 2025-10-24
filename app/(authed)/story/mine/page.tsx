const pseudoWallet = {
  address: "Cn3c...hG8B",
  label: "Pseudo wallet (preview)",
};

const myStories = [
  {
    id: "climate-bridge",
    title: "Climate Bridge: Community Solar Ramp",
    status: "In review",
    lastUpdated: "2 days ago",
  },
  {
    id: "waterway-stewards",
    title: "Waterway Stewards: Clean-up Sprint",
    status: "Draft",
    lastUpdated: "5 days ago",
  },
];

export default function MyStoriesPage() {
  return (
    <div className="grid gap-6">
      <header className="card">
        <div className="space-y-2">
          <span className="text-sm uppercase tracking-wide text-white/50">
            Connected wallet
          </span>
          <h1 className="text-xl font-semibold">Your Stories</h1>
          <p className="text-sm text-white/70">
            Using a pseudo-authenticated state until wallet connection is
            implemented.
          </p>
        </div>
        <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <div className="font-mono text-xs text-white/70">
            {pseudoWallet.address}
          </div>
          <div className="text-white/60">{pseudoWallet.label}</div>
        </div>
      </header>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Drafts & published stories</h2>
          <button
            type="button"
            className="rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-black/90 transition hover:bg-white"
          >
            New story
          </button>
        </div>

        {myStories.length === 0 ? (
          <div className="card text-sm text-white/70">
            No stories yet. Once wallet support ships, this view will show your
            drafts and published campaigns.
          </div>
        ) : (
          <div className="grid gap-3">
            {myStories.map((story) => (
              <div
                key={story.id}
                className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/80"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-white/90">
                      {story.title}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-white/50">
                      {story.status}
                    </div>
                  </div>
                  <div className="text-white/60">
                    Last updated: {story.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
