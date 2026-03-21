import { notFound } from 'next/navigation';

import { FinancialCalendarQaClient } from './qa-client';

export const dynamic = 'force-dynamic';

export default function FinancialCalendarQaPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <FinancialCalendarQaClient />
      </div>
    </main>
  );
}
