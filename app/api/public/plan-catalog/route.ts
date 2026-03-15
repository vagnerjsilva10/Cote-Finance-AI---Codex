import { NextResponse } from 'next/server';

import { getEditablePlanCatalog } from '@/lib/server/superadmin-governance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await getEditablePlanCatalog();

    return NextResponse.json({
      plans: plans
        .filter((plan) => plan.active && plan.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((plan) => ({
          code: plan.code,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          trialDays: plan.trialDays,
          description: plan.description,
          features: plan.features,
          trustBadges: plan.trustBadges,
          default: plan.default,
        })),
    });
  } catch (error) {
    console.error('Public plan catalog error:', error);
    return NextResponse.json({ error: 'Falha ao carregar catálogo de planos.' }, { status: 500 });
  }
}
