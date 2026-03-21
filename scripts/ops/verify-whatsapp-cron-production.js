#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_LOOKBACK_MINUTES = 30;
const DEFAULT_CRON_PATH = '/api/cron/whatsapp-digest';

function parseArgs(argv) {
  const options = {
    strict: false,
    lookbackMinutes: DEFAULT_LOOKBACK_MINUTES,
    cronPath: DEFAULT_CRON_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      options.strict = true;
      continue;
    }

    if (token === '--url' && argv[index + 1]) {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--secret' && argv[index + 1]) {
      options.secret = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--cron-path' && argv[index + 1]) {
      options.cronPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--lookback-minutes' && argv[index + 1]) {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.lookbackMinutes = value;
      }
      index += 1;
      continue;
    }
  }

  return options;
}

function parseEnvFile(content) {
  const output = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    output[key] = value;
  }
  return output;
}

function loadEnvFromFiles() {
  const files = ['.env.local', '.env.production', '.env.development', '.env'];
  const merged = {};
  for (const relativePath of files) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(absolutePath, 'utf8'));
    Object.assign(merged, parsed);
  }
  return merged;
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeBaseUrl(rawBaseUrl) {
  if (!rawBaseUrl) return '';
  return rawBaseUrl.trim().replace(/\/+$/, '');
}

function normalizeCronPath(rawPath) {
  if (!rawPath) return DEFAULT_CRON_PATH;
  const trimmed = rawPath.trim();
  if (!trimmed) return DEFAULT_CRON_PATH;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFileValues = loadEnvFromFiles();
  const getEnv = (name) => process.env[name] || envFileValues[name] || '';

  const baseUrl = normalizeBaseUrl(
    options.url || getEnv('CRON_BASE_URL') || getEnv('APP_URL') || getEnv('NEXT_PUBLIC_APP_URL')
  );
  const cronSecret = options.secret || getEnv('CRON_SECRET');
  const cronPath = normalizeCronPath(options.cronPath || getEnv('CRON_PATH'));

  if (!baseUrl) {
    throw new Error(
      'URL base ausente. Defina CRON_BASE_URL/APP_URL/NEXT_PUBLIC_APP_URL ou use --url.'
    );
  }

  if (!cronSecret) {
    throw new Error('CRON_SECRET ausente. Defina no ambiente ou use --secret.');
  }

  const endpoint = `${baseUrl}${cronPath}`;
  const requestStartedAt = new Date();

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  });

  const responseText = await response.text();
  let cronResult;
  try {
    cronResult = responseText ? JSON.parse(responseText) : {};
  } catch {
    cronResult = { raw: responseText };
  }

  const prisma = new PrismaClient();
  const lookbackStart = new Date(requestStartedAt.getTime() - options.lookbackMinutes * 60_000);

  const [digestEventCount, alertEventCount, recentDigestEvents, recentAlertEvents] = await Promise.all([
    prisma.workspaceEvent.count({
      where: {
        created_at: { gte: lookbackStart },
        type: { startsWith: 'whatsapp.daily_digest.sent.' },
      },
    }),
    prisma.workspaceEvent.count({
      where: {
        created_at: { gte: lookbackStart },
        type: { startsWith: 'whatsapp.alert.sent.' },
      },
    }),
    prisma.workspaceEvent.findMany({
      where: {
        created_at: { gte: lookbackStart },
        type: { startsWith: 'whatsapp.daily_digest.sent.' },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        workspace_id: true,
        type: true,
        created_at: true,
      },
    }),
    prisma.workspaceEvent.findMany({
      where: {
        created_at: { gte: lookbackStart },
        type: { startsWith: 'whatsapp.alert.sent.' },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        workspace_id: true,
        type: true,
        created_at: true,
      },
    }),
  ]);

  await prisma.$disconnect();

  const digestsSent = safeNumber(cronResult?.digestsSent, -1);
  const alertsSent = safeNumber(cronResult?.alertsSent, -1);

  const validationErrors = [];
  if (!response.ok) {
    validationErrors.push(`Cron endpoint retornou HTTP ${response.status}.`);
  }

  if (digestsSent > 0 && digestEventCount === 0) {
    validationErrors.push(
      'Cron reportou digestsSent > 0, mas não há eventos whatsapp.daily_digest.sent.* no período.'
    );
  }

  if (alertsSent > 0 && alertEventCount === 0) {
    validationErrors.push(
      'Cron reportou alertsSent > 0, mas não há eventos whatsapp.alert.sent.* no período.'
    );
  }

  if (options.strict && digestEventCount === 0) {
    validationErrors.push('Modo estrito: nenhum evento whatsapp.daily_digest.sent.* encontrado.');
  }

  if (options.strict && alertEventCount === 0) {
    validationErrors.push('Modo estrito: nenhum evento whatsapp.alert.sent.* encontrado.');
  }

  const report = {
    ok: validationErrors.length === 0,
    strict: options.strict,
    endpoint,
    lookbackMinutes: options.lookbackMinutes,
    http: {
      status: response.status,
      ok: response.ok,
    },
    cronResult,
    dbValidation: {
      digestEventCount,
      alertEventCount,
      recentDigestEvents: recentDigestEvents.map((event) => ({
        id: event.id,
        workspaceId: event.workspace_id,
        type: event.type,
        createdAt: event.created_at.toISOString(),
      })),
      recentAlertEvents: recentAlertEvents.map((event) => ({
        id: event.id,
        workspaceId: event.workspace_id,
        type: event.type,
        createdAt: event.created_at.toISOString(),
      })),
    },
    validationErrors,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});

