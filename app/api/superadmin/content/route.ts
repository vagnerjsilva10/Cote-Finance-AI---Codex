import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_OPS_KEY = 'superadmin.content-ops';

const DEFAULT_CONTENT_CONFIG = {
  brand: {
    productName: 'Cote Finance AI',
    signature: 'By Cote Juros',
    supportEmail: 'suporte@cotejuros.com.br',
    privacyUrl: '/privacidade',
    termsUrl: '/termos',
  },
  acquisition: {
    defaultPrimaryCta: 'Começar grátis',
    defaultSecondaryCta: 'Ver como funciona',
    riskReversal: 'Sem compromisso • Cancele quando quiser',
    trustLine: 'Seus dados são protegidos com criptografia e boas práticas modernas de segurança.',
  },
  pricing: {
    freeDescription: 'Ideal para começar a organizar suas finanças.',
    proDescription: 'Mais escolhido por quem quer controle financeiro completo.',
    premiumDescription: 'Controle total com inteligência financeira avançada.',
  },
  editorial: {
    voiceAndTone: 'Clareza, confiança e linguagem simples para explicar dinheiro sem parecer técnico demais.',
    priorityMessage: 'Mostrar para onde o dinheiro está indo e o que pode ser ajustado no dia a dia.',
    currentFocus: 'Conversão de landing, checkout e tráfego pago.',
  },
};

const CONTENT_SURFACES = [
  {
    key: 'landing',
    label: 'Landing principal',
    route: '/landing',
    file: 'app/landing/page.tsx',
    status: 'Ativa',
    objective: 'Aquisição orgânica e institucional',
    notes: 'Página principal da marca com narrativa mais ampla, pricing e CTA final.',
  },
  {
    key: 'paid_landing',
    label: 'LP de tráfego pago',
    route: '/lp',
    file: 'app/lp/paid-landing-client.tsx',
    status: 'Ativa',
    objective: 'Campanhas pagas e funis de conversão',
    notes: 'Copy mais agressiva para performance, prova social e CTA curto.',
  },
  {
    key: 'checkout',
    label: 'Checkout',
    route: '/app/checkout',
    file: 'app/app/checkout/page.tsx',
    status: 'Ativa',
    objective: 'Conversão em assinatura',
    notes: 'Microcopy de confiança, trial, risco reverso e métodos de pagamento.',
  },
];

type ContentConfig = typeof DEFAULT_CONTENT_CONFIG;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeContentConfig(raw: unknown): ContentConfig {
  const saved = asObject(raw);
  const brand = asObject(saved?.brand);
  const acquisition = asObject(saved?.acquisition);
  const pricing = asObject(saved?.pricing);
  const editorial = asObject(saved?.editorial);

  return {
    brand: {
      productName: pickString(brand?.productName, DEFAULT_CONTENT_CONFIG.brand.productName),
      signature: pickString(brand?.signature, DEFAULT_CONTENT_CONFIG.brand.signature),
      supportEmail: pickString(brand?.supportEmail, DEFAULT_CONTENT_CONFIG.brand.supportEmail),
      privacyUrl: pickString(brand?.privacyUrl, DEFAULT_CONTENT_CONFIG.brand.privacyUrl),
      termsUrl: pickString(brand?.termsUrl, DEFAULT_CONTENT_CONFIG.brand.termsUrl),
    },
    acquisition: {
      defaultPrimaryCta: pickString(acquisition?.defaultPrimaryCta, DEFAULT_CONTENT_CONFIG.acquisition.defaultPrimaryCta),
      defaultSecondaryCta: pickString(acquisition?.defaultSecondaryCta, DEFAULT_CONTENT_CONFIG.acquisition.defaultSecondaryCta),
      riskReversal: pickString(acquisition?.riskReversal, DEFAULT_CONTENT_CONFIG.acquisition.riskReversal),
      trustLine: pickString(acquisition?.trustLine, DEFAULT_CONTENT_CONFIG.acquisition.trustLine),
    },
    pricing: {
      freeDescription: pickString(pricing?.freeDescription, DEFAULT_CONTENT_CONFIG.pricing.freeDescription),
      proDescription: pickString(pricing?.proDescription, DEFAULT_CONTENT_CONFIG.pricing.proDescription),
      premiumDescription: pickString(pricing?.premiumDescription, DEFAULT_CONTENT_CONFIG.pricing.premiumDescription),
    },
    editorial: {
      voiceAndTone: pickString(editorial?.voiceAndTone, DEFAULT_CONTENT_CONFIG.editorial.voiceAndTone),
      priorityMessage: pickString(editorial?.priorityMessage, DEFAULT_CONTENT_CONFIG.editorial.priorityMessage),
      currentFocus: pickString(editorial?.currentFocus, DEFAULT_CONTENT_CONFIG.editorial.currentFocus),
    },
  };
}

async function readContentConfig() {
  const setting = await prisma.platformSetting.findUnique({ where: { key: CONTENT_OPS_KEY } });
  return normalizeContentConfig(setting?.value ?? null);
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const config = await readContentConfig();

    return NextResponse.json({
      config,
      surfaces: CONTENT_SURFACES,
      summary: {
        surfaces: CONTENT_SURFACES.length,
        activeSurfaces: CONTENT_SURFACES.filter((surface) => surface.status === 'Ativa').length,
        primaryCta: config.acquisition.defaultPrimaryCta,
        supportEmail: config.brand.supportEmail,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar operações de conteúdo.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const body = (await req.json()) as { config?: ContentConfig };
    const config = normalizeContentConfig(body?.config ?? null);

    await prisma.platformSetting.upsert({
      where: { key: CONTENT_OPS_KEY },
      update: { value: config },
      create: { key: CONTENT_OPS_KEY, value: config },
    });

    return NextResponse.json({
      ok: true,
      config,
      surfaces: CONTENT_SURFACES,
      summary: {
        surfaces: CONTENT_SURFACES.length,
        activeSurfaces: CONTENT_SURFACES.filter((surface) => surface.status === 'Ativa').length,
        primaryCta: config.acquisition.defaultPrimaryCta,
        supportEmail: config.brand.supportEmail,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao salvar operações de conteúdo.' }, { status: 500 });
  }
}
