type ActivityPageProps = {
  params: {
    txSig: string;
  };
};

const sections = [
  {
    label: "Transaction summary",
    items: [
      { name: "Signature", value: "—" },
      { name: "Slot", value: "—" },
      { name: "Status", value: "Pending confirmation" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { name: "Creator wallet", value: "—" },
      { name: "Supporter wallet", value: "—" },
    ],
  },
];

export default function ActivityPage({ params }: ActivityPageProps) {
  const { txSig } = params;

  return (
    <div className="grid gap-6">
      <header className="card">
        <div className="flex flex-col gap-2">
          <span className="text-sm uppercase tracking-wide text-white/50">
            Transaction
          </span>
          <h1 className="wrap-balance text-2xl font-semibold">
            {decodeURIComponent(txSig)}
          </h1>
          <p className="text-sm text-white/70">
            Full Solana transaction details will be surfaced here when access to
            mainnet data is wired.
          </p>
        </div>
      </header>

      <div className="grid gap-4">
        {sections.map((section) => (
          <section key={section.label} className="card">
            <h2 className="text-lg font-semibold">{section.label}</h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/70">
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                >
                  <dt className="font-medium text-white/80">{item.name}</dt>
                  <dd className="text-white/60">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
