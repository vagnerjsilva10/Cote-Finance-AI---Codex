'use client';

import { FinancialCalendarView } from '@/components/financial-calendar/financial-calendar-view';

export function FinancialCalendarQaClient() {
  return (
    <FinancialCalendarView
      currentPlan="PRO"
      activeWorkspaceId="qa-workspace"
      getAuthHeaders={async (withJsonContentType = false) => {
        const headers: Record<string, string> = {};
        if (withJsonContentType) {
          headers['Content-Type'] = 'application/json';
        }
        return headers;
      }}
      onUpgrade={() => undefined}
      onNavigateTab={() => undefined}
    />
  );
}
