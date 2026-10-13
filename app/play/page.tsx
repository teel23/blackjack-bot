'use client';

import Lobby from '@/components/table/Lobby';
import Table from '@/components/table/Table';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useApp } from '@/lib/state/store';

export default function PlayPage() {
  const mode = useApp((s) => s.data.table.mode);
  if (!mode) return <Lobby />;
  return (
    <ErrorBoundary>
      <Table />
    </ErrorBoundary>
  );
}
