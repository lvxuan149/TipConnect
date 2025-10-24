const steps = [
  { title: "Story basics", description: "Title, focus area, intro copy." },
  { title: "Proof points", description: "Add milestones, media and links." },
  { title: "Call to action", description: "Set Blink CTA and share message." },
];

export default function StoryCreatePage() {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Create a Story</h1>
        <p className="text-sm text-white/70">
          Draft a new impact story. Wallet gating will come later—this is a
          placeholder view for the authenticated flow.
        </p>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Creation Flow</h2>
        <ol className="mt-4 grid gap-3 text-sm text-white/80">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-md border border-white/10 bg-white/5 p-3"
            >
              <span className="text-xs uppercase tracking-wide text-white/50">
                Step {index + 1}
              </span>
              <div className="mt-2 font-medium">{step.title}</div>
              <p className="text-white/60">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            className="rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-black/90 transition hover:bg-white"
          >
            Start draft
          </button>
        </div>
      </section>
    </div>
  );
}
