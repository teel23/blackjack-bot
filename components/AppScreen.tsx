'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import { IconBack, IconClose, IconGear } from './Icons';
import TabBar from './TabBar';

/** A tab screen: sticky header, scrolling content, responsible-play footer, bottom tab bar. */
export default function AppScreen({
  title,
  children,
  back,
  action,
  settings = true,
}: {
  title: ReactNode;
  children: ReactNode;
  back?: string;
  action?: ReactNode;
  settings?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-safe">
          {back && (
            <Link href={back} aria-label="Back" className="-ml-2 grid min-h-11 min-w-11 place-items-center rounded-full text-muted">
              <IconBack />
            </Link>
          )}
          <h1 className="flex-1 truncate text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
          {action}
          {settings && (
            <Link href="/settings/" aria-label="Settings" className="-mr-2 grid min-h-11 min-w-11 place-items-center rounded-full text-muted">
              <IconGear />
            </Link>
          )}
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-lg flex-1 px-safe pt-4"
        style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <Footer />
      </main>
      <TabBar />
    </div>
  );
}

/** A full-screen flow (lesson, drill, review) with a close button and no tab bar. */
export function FocusScreen({
  title,
  children,
  onClose,
  closeHref,
  right,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  closeHref?: string;
  right?: ReactNode;
}) {
  const close = (
    <span className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted">
      <IconClose />
    </span>
  );
  return (
    <div className="flex min-h-dvh flex-col game-surface">
      <header className="sticky top-0 z-20 bg-bg/95 pt-safe">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-safe">
          {onClose ? (
            <button onClick={onClose} aria-label="Close" className="-ml-2">
              {close}
            </button>
          ) : (
            <Link href={closeHref ?? '/'} aria-label="Close" className="-ml-2">
              {close}
            </Link>
          )}
          <div className="min-w-0 flex-1 truncate text-center text-base font-semibold">{title}</div>
          <div className="flex min-w-11 justify-end">{right}</div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-safe pb-safe">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
