'use client';

import { dismissNotice, useApp } from '@/lib/state/store';

export default function NoticeBanner() {
  const notice = useApp((s) => s.notice);
  if (!notice) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 px-safe pt-safe"
      style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface-3 p-3 shadow-2xl anim-fade">
        <span aria-hidden="true" className="text-lg leading-6">⚠️</span>
        <p className="flex-1 text-sm leading-5">{notice}</p>
        <button
          onClick={dismissNotice}
          className="min-h-11 min-w-11 rounded-xl bg-surface-2 px-3 text-sm font-semibold"
        >
          OK
        </button>
      </div>
    </div>
  );
}
