'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FOCUS_CATEGORIES, type FocusKey } from './categories';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get('focus') as FocusKey) || 'all';

  const go = (key: FocusKey) => {
    const q = new URLSearchParams(sp);
    if (key === 'all') q.delete('focus'); else q.set('focus', key);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <nav aria-label="Reputation focus" className="sticky top-20 space-y-2">
      {FOCUS_CATEGORIES.map(({ key, label }) => {
        const active = current === key || (key === 'all' && !sp.get('focus'));
        return (
          <button
            key={key}
            onClick={() => go(key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(key); }}
            aria-current={active ? 'page' : undefined}
            className={`w-full text-left px-3 py-2 rounded-xl border transition
              ${active
                ? 'border-blue-500/40 bg-white/5 text-white'
                : 'border-white/10 text-white/80 hover:bg-white/5'}`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileFocusPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get('focus') as FocusKey) || 'all';

  return (
    <label className="block md:hidden">
      <span className="sr-only">Choose Focus</span>
      <select
        aria-label="Reputation Focus"
        className="w-full rounded-xl border border-white/10 bg-[#0E1218]/70 p-2"
        value={current}
        onChange={(e) => {
          const q = new URLSearchParams(sp);
          const v = e.target.value as FocusKey;
          if (v === 'all') q.delete('focus'); else q.set('focus', v);
          router.push(`${pathname}?${q.toString()}`, { scroll: false });
        }}
      >
        {FOCUS_CATEGORIES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
      </select>
    </label>
  );
}