'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ACTION_TYPES, ActionKey } from './actionTypes';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get('actionType') as ActionKey) || 'all';

  const go = (key: ActionKey) => {
    const q = new URLSearchParams(sp);
    if (key === 'all') q.delete('actionType');
    else q.set('actionType', key);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <nav aria-label="Action types" className="sticky top-20 space-y-2">
      {ACTION_TYPES.map(({ key, label }) => {
        const active = current === key || (key === 'all' && !sp.get('actionType'));
        return (
          <button
            key={key}
            onClick={() => go(key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(key); }}
            aria-current={active ? 'page' : undefined}
            className={`w-full text-left px-3 py-2 rounded-xl border transition
              ${active
                ? 'border-brand/40 bg-white/5 text-white'
                : 'border-white/10 text-white/80 hover:bg-white/5'}`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileActionPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get('actionType') as ActionKey) || 'all';

  return (
    <label className="block md:hidden">
      <span className="sr-only">Choose Action Type</span>
      <select
        aria-label="Action Type"
        className="w-full rounded-xl border border-white/10 bg-[#0E1218]/70 p-2"
        value={current}
        onChange={(e) => {
          const q = new URLSearchParams(sp);
          const v = e.target.value as ActionKey;
          if (v === 'all') q.delete('actionType');
          else q.set('actionType', v);
          router.push(`${pathname}?${q.toString()}`, { scroll: false });
        }}
      >
        {ACTION_TYPES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
      </select>
    </label>
  );
}