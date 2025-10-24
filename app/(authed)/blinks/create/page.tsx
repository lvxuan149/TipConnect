const steps = [
  {
    title: "Select story",
    details: "Choose an existing story or draft to anchor the Blink.",
  },
  {
    title: "Configure Blink",
    details:
      "Set pledge amount, messaging, and amplification incentives for sharers.",
  },
  {
    title: "Preview & publish",
    details:
      "Review the Blink embed, run wallet checks, and confirm distribution.",
  },
];

const currentStep = 1;

export default function BlinkCreatePage() {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Create a Blink</h1>
        <p className="text-sm text-white/70">
          Three-step wizard placeholder. Replace the static state once wallet
          auth and mutations are wired.
        </p>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Wizard Steps</h2>
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const status =
              index < currentStep
                ? "complete"
                : index === currentStep
                ? "active"
                : "upcoming";

            return (
              <div
                key={step.title}
                className="flex gap-4 rounded-md border border-white/10 bg-white/5 p-4"
                data-status={status}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-sm font-semibold text-white/80">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <span className="text-xs uppercase tracking-wide text-white/50">
                      {status}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{step.details}</p>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/60"
            disabled
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-black/90 transition hover:bg-white"
          >
            Continue
          </button>
        </footer>
      </section>
    </div>
  );
}
