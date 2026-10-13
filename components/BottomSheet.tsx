'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { IconClose } from './Icons';

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="anim-fade relative max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-surface px-safe pt-3 outline-none"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        <div className="mb-2 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close sheet" className="-mr-2 grid min-h-11 min-w-11 place-items-center rounded-full text-muted">
            <IconClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
