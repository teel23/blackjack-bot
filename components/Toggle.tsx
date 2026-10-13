'use client';

export default function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-8 w-[52px] shrink-0 rounded-full bg-surface-3 transition-colors peer-checked:bg-good peer-focus-visible:ring-2 peer-focus-visible:ring-info"
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </label>
  );
}
