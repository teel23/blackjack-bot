'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconLearn, IconPlay, IconStats, IconToday } from './Icons';

const TABS = [
  { href: '/', label: 'Today', Icon: IconToday, match: (p: string) => p === '/' },
  { href: '/learn/', label: 'Learn', Icon: IconLearn, match: (p: string) => p.startsWith('/learn') || p.startsWith('/drills') },
  { href: '/play/', label: 'Play', Icon: IconPlay, match: (p: string) => p.startsWith('/play') || p.startsWith('/sessions') },
  { href: '/chart/', label: 'Chart', Icon: IconChart, match: (p: string) => p.startsWith('/chart') },
  { href: '/stats/', label: 'Stats', Icon: IconStats, match: (p: string) => p.startsWith('/stats') },
];

export default function TabBar() {
  const pathname = usePathname() || '/';
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md pb-safe"
    >
      <ul className="mx-auto flex max-w-lg" style={{ height: 'var(--tabbar-h)' }}>
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active ? 'text-gold' : 'text-muted'
                }`}
              >
                <Icon size={24} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
