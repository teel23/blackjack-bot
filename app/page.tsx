'use client';

import Link from 'next/link';
import AppScreen from '@/components/AppScreen';

export default function TodayPage() {
  return (
    <AppScreen title="Today">
      <Link href="/play/" className="block rounded-3xl felt p-6 text-lg font-bold text-white">
        Go to the table →
      </Link>
    </AppScreen>
  );
}
