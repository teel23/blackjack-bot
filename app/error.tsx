'use client';

import { ErrorFallback } from '@/components/ErrorBoundary';

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback onReset={reset} />;
}
