import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import {
  getEditablePlanCatalog,
  saveEditablePlanCatalog,
  type EditablePlanConfig,
} from '@/lib/server/superadmin-governance';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizePlanConfig(value: unknown, fallback: EditablePlanConfig): EditablePlanConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;

  return {
    ...fallback,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback.name,
    active: typeof raw.active === 'boolean' ? raw.active : fallback.active,
    visible: typeof raw.visible === 'boolean' ? raw.visible : fallback.visible,
    default: typeof raw.default === 'boolean' ? raw.default : fallback.default,
    sortOrder: typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder) ? raw.sortOrder : fallback.sortOrder,
    monthlyPrice:
      typeof raw.monthlyPrice === 'number' && Number.isFinite(raw.monthlyPrice) ? raw.monthlyPrice : fallback.monthlyPrice,
    annualPrice:
      typeof raw.annualPrice === 'number' && Number.isFinite(raw.annualPrice) ? raw.annualPrice : fallback.annualPrice,
    trialDays: typeof raw.trialDays === 'number' && Number.isFinite(raw.trialDays) ? raw.trialDays : fallback.trialDays,
    description:
      typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : fallback.description,
    features: Array.isArray(raw.features)
      ? raw.features.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : fallback.features,
    trustBadges: Array.isArray(raw.trustBadges)
      ? raw.trustBadges.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : fallback.trustBadges,
    limits:
      raw.limits && typeof raw.limits === 'object' && !Array.isArray(raw.limits)
        ? {
            transactionsPerMonth:
              (raw.limits as Record<string, unknown>).transactionsPerMonth === null
                ? null
                : typeof (raw.limits as Record<string, unknown>).transactionsPerMonth === 'number'
                  ? ((raw.limits as Record<string, unknown>).transactionsPerMonth as number)
                  : fallback.limits.transactionsPerMonth,
            aiInteractionsPerMonth:
              (raw.limits as Record<string, unknown>).aiInteractionsPerMonth === null
                ? null
                : typeof (raw.limits as Record<string, unknown>).aiInteractionsPerMonth === 'number'
                  ? ((raw.limits as Record<string, unknown>).aiInteractionsPerMonth as number)
                  : fallback.limits.aiInteractionsPerMonth,
            reports:
              (raw.limits as Record<string, unknown>).reports === 'full'
                ? 'full'
                : (raw.limits as Record<string, unknown>).reports === 'basic'
                  ? 'basic'
                  : fallback.limits.reports,
          }
        : fallback.limits,
  };
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const plans = await getEditablePlanCatalog();

    return NextResponse.json({
      plans,
      summary: {
        total: plans.length,
        active: plans.filter((plan) => plan.active).length,
        visible: plans.filter((plan) => plan.visible).length,
        defaultPlan: plans.find((plan) => plan.default)?.code || 'FREE',
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao carregar o catálogo de planos.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      plans?: unknown[];
      defaultPlan?: string;
    };

    const current = await getEditablePlanCatalog();
    const desiredDefault = body.defaultPlan === 'PRO' || body.defaultPlan === 'PREMIUM' ? body.defaultPlan : 'FREE';
    const nextPlans = current.map((plan, index) => {
      const incoming = Array.isArray(body.plans)
        ? body.plans.find(
            (candidate) =>
              candidate &&
              typeof candidate === 'object' &&
              !Array.isArray(candidate) &&
              (candidate as Record<string, unknown>).code === plan.code
          )
        : null;

      return {
        ...sanitizePlanConfig(incoming, plan),
        code: plan.code,
        sortOrder:
          incoming &&
          typeof incoming === 'object' &&
          !Array.isArray(incoming) &&
          typeof (incoming as Record<string, unknown>).sortOrder === 'number'
            ? ((incoming as Record<string, unknown>).sortOrder as number)
            : index + 1,
        default: plan.code === desiredDefault,
      };
    });

    const saved = await saveEditablePlanCatalog(nextPlans);

    await prisma.platformSetting.upsert({
      where: { key: 'superadmin.last-plan-update' },
      update: {
        value: {
          updatedBy: access.email,
          updatedAt: new Date().toISOString(),
          plans: saved.map((plan) => plan.code),
        },
      },
      create: {
        key: 'superadmin.last-plan-update',
        value: {
          updatedBy: access.email,
          updatedAt: new Date().toISOString(),
          plans: saved.map((plan) => plan.code),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      plans: saved,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao atualizar o catálogo de planos.' }, { status: 500 });
  }
}
