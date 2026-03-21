import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { WHATSAPP_AUTOMATION_ELIGIBLE_PLANS } from '@/lib/server/whatsapp-capabilities';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';
import { sendWorkspaceWhatsAppAlerts } from '@/lib/server/whatsapp-alerts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WORKSPACE_MAX = 250;
const WORKSPACE_TIMEOUT_MS = 45000;
const WORKSPACE_RETRY_ATTEMPTS = 2;

type CronWorkspaceResult =
  | {
      workspaceId: string;
      success: true;
      attempt: number;
      durationMs: number;
      digest: Awaited<ReturnType<typeof sendWorkspaceWhatsAppDigest>>;
      alerts: Awaited<ReturnType<typeof sendWorkspaceWhatsAppAlerts>>;
    }
  | {
      workspaceId: string;
      success: false;
      attempt: number;
      durationMs: number;
      error: string;
      digest: null;
      alerts: null;
    };

type CronEnvValidation = {
  ok: boolean;
  missingRequired: string[];
  warnings: string[];
};

function validateCronEnv(): CronEnvValidation {
  const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'];
  if (process.env.NODE_ENV === 'production') {
    required.push('CRON_SECRET');
  }

  const missingRequired = required.filter((key) => !process.env[key]?.trim());
  const warnings: string[] = [];

  if (!process.env.WHATSAPP_APP_SECRET?.trim()) {
    warnings.push('WHATSAPP_APP_SECRET ausente (assinatura do webhook fica sem validação forte).');
  }

  if (!process.env.WHATSAPP_API_VERSION?.trim()) {
    warnings.push('WHATSAPP_API_VERSION ausente (fallback padrão v21.0 em uso).');
  }

  if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim()) {
    warnings.push('WHATSAPP_BUSINESS_ACCOUNT_ID ausente (sem validação explícita da WABA).');
  }

  if (!process.env.WHATSAPP_EXPECTED_DISPLAY_PHONE_NUMBER?.trim()) {
    warnings.push('WHATSAPP_EXPECTED_DISPLAY_PHONE_NUMBER ausente (sem trava explícita do número comercial).');
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    warnings,
  };
}

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = req.headers.get('authorization')?.trim();

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production';
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || 'Erro desconhecido');
}

function isRetryableError(error: unknown) {
  const message = normalizeErrorMessage(error);
  return /timeout|upstream request timeout|failed to fetch|network|temporarily unavailable|ECONNRESET|ETIMEDOUT/i.test(
    message
  );
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return (await Promise.race([operation, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function processWorkspace(workspaceId: string) {
  const digest = await withTimeout(
    sendWorkspaceWhatsAppDigest({
      workspaceId,
      source: 'cron',
    }),
    WORKSPACE_TIMEOUT_MS,
    `Timeout no resumo diário para workspace ${workspaceId}`
  );

  const alerts = await withTimeout(
    sendWorkspaceWhatsAppAlerts({
      workspaceId,
      source: 'cron',
    }),
    WORKSPACE_TIMEOUT_MS,
    `Timeout nos alertas automáticos para workspace ${workspaceId}`
  );

  return { digest, alerts };
}

async function processWorkspaceWithRetry(workspaceId: string): Promise<CronWorkspaceResult> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= WORKSPACE_RETRY_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const { digest, alerts } = await processWorkspace(workspaceId);
      const durationMs = Date.now() - startedAt;
      return {
        workspaceId,
        success: true,
        attempt,
        durationMs,
        digest,
        alerts,
      };
    } catch (error) {
      lastError = error;
      const durationMs = Date.now() - startedAt;
      const retryable = isRetryableError(error);

      console.error('WHATSAPP_CRON_WORKSPACE_ERROR', {
        workspaceId,
        attempt,
        durationMs,
        retryable,
        error: normalizeErrorMessage(error),
      });

      if (!retryable || attempt >= WORKSPACE_RETRY_ATTEMPTS) {
        return {
          workspaceId,
          success: false,
          attempt,
          durationMs,
          error: normalizeErrorMessage(error),
          digest: null,
          alerts: null,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return {
    workspaceId,
    success: false,
    attempt: WORKSPACE_RETRY_ATTEMPTS,
    durationMs: 0,
    error: normalizeErrorMessage(lastError),
    digest: null,
    alerts: null,
  };
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  const envValidation = validateCronEnv();

  if (!envValidation.ok) {
    console.error('WHATSAPP_CRON_ENV_INVALID', {
      missingRequired: envValidation.missingRequired,
      warnings: envValidation.warnings,
      nodeEnv: process.env.NODE_ENV,
    });
    return NextResponse.json(
      {
        error: 'Configuração obrigatória do WhatsApp/Cron ausente em produção.',
        missingRequired: envValidation.missingRequired,
        warnings: envValidation.warnings,
      },
      { status: 500 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.info('WHATSAPP_CRON_START', {
    nodeEnv: process.env.NODE_ENV,
    maxWorkspaces: WORKSPACE_MAX,
    warnings: envValidation.warnings,
  });

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        whatsapp_status: 'CONNECTED',
        whatsapp_phone_number: {
          not: null,
        },
        subscription: {
          is: {
            status: 'ACTIVE',
            plan: {
              in: [...WHATSAPP_AUTOMATION_ELIGIBLE_PLANS],
            },
          },
        },
      },
      select: {
        id: true,
      },
      take: WORKSPACE_MAX,
    });

    console.info('WHATSAPP_CRON_WORKSPACES_FOUND', {
      total: workspaces.length,
    });

    const results: CronWorkspaceResult[] = [];
    let digestsSent = 0;
    let alertsSent = 0;
    let failures = 0;

    for (const workspace of workspaces) {
      const result = await processWorkspaceWithRetry(workspace.id);
      results.push(result);

      if (result.success) {
        if (result.digest.sent) digestsSent += 1;
        if (result.alerts.sent) alertsSent += 1;
        console.info('WHATSAPP_CRON_WORKSPACE_SUCCESS', {
          workspaceId: workspace.id,
          attempt: result.attempt,
          durationMs: result.durationMs,
          digestSent: result.digest.sent,
          alertsSent: result.alerts.sent,
          digestReason: result.digest.sent ? null : result.digest.reason,
          alertsReason: result.alerts.sent ? null : result.alerts.reason,
        });
      } else {
        failures += 1;
      }
    }

    const durationMs = Date.now() - startedAt;
    const successes = results.length - failures;
    const totalDeliveries = digestsSent + alertsSent;

    console.info('WHATSAPP_CRON_FINISH', {
      scanned: results.length,
      successes,
      failures,
      digestsSent,
      alertsSent,
      totalDeliveries,
      durationMs,
    });

    return NextResponse.json({
      success: failures === 0,
      scanned: results.length,
      successes,
      failures,
      digestsSent,
      alertsSent,
      totalDeliveries,
      durationMs,
      warnings: envValidation.warnings,
      results,
    });
  } catch (error: unknown) {
    console.error('WHATSAPP_CRON_FATAL', {
      error: normalizeErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: normalizeErrorMessage(error) || 'Failed to process WhatsApp automations' },
      { status: 500 }
    );
  }
}
