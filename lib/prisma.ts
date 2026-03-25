import 'server-only';
import { PrismaClient } from '@prisma/client';

const DATABASE_URL_PROTOCOL_REGEX = /^(postgresql|postgres):\/\//i;
const DATABASE_ENV_KEYS = ['DATABASE_URL', 'DIRECT_DATABASE_URL', 'SHADOW_DATABASE_URL'] as const;

export const DATABASE_URL_MISSING_ERROR =
  'DATABASE_URL ausente. Configure a conexao PostgreSQL no ambiente.';
export const DATABASE_URL_INVALID_ERROR =
  'DATABASE_URL invalida. Use postgresql:// ou postgres:// sem aspas extras.';
export const PRISMA_UNAVAILABLE_MESSAGE =
  'Banco de dados indisponivel no momento. Verifique a configuracao do ambiente e tente novamente.';
export const DATABASE_SCHEMA_MISMATCH_MESSAGE =
  'A estrutura do banco de dados nao esta alinhada com a versao atual da aplicacao.';

export type DatabaseRuntimeInfo = {
  host: string;
  port: string;
  usesPooler: boolean;
  usesPgBouncer: boolean;
  connectionLimit: number | null;
  hasDirectDatabaseUrl: boolean;
};

export type PrismaRuntimeErrorKind =
  | 'DB_TRANSACTION_TIMEOUT'
  | 'DB_CONNECTION_TIMEOUT'
  | 'DB_LOCK_TIMEOUT'
  | 'DB_UNAVAILABLE'
  | 'UNKNOWN';

export class PrismaServiceUnavailableError extends Error {
  detail?: string;

  constructor(detail?: string) {
    super(PRISMA_UNAVAILABLE_MESSAGE);
    this.name = 'PrismaServiceUnavailableError';
    this.detail = detail;
  }
}

function sanitizePrismaDiagnosticDetail(value: string) {
  return value
    .replace(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://$1:[REDACTED]@')
    .replace(/(password|senha)=([^&\s]+)/gi, '$1=[REDACTED]');
}

function sanitizeDatabaseEnvValue(value: string | undefined) {
  if (typeof value !== 'string') return value;

  let normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function sanitizeDatabaseEnv() {
  for (const key of DATABASE_ENV_KEYS) {
    const currentValue = process.env[key];
    const sanitizedValue = sanitizeDatabaseEnvValue(currentValue);
    if (typeof sanitizedValue === 'string') {
      process.env[key] = sanitizedValue;
    }
  }
}

function parseDatabaseRuntimeInfo(databaseUrl: string | undefined): DatabaseRuntimeInfo {
  const fallback: DatabaseRuntimeInfo = {
    host: 'unknown',
    port: 'unknown',
    usesPooler: false,
    usesPgBouncer: false,
    connectionLimit: null,
    hasDirectDatabaseUrl: Boolean(sanitizeDatabaseEnvValue(process.env.DIRECT_DATABASE_URL)),
  };

  const normalized = sanitizeDatabaseEnvValue(databaseUrl);
  if (!normalized) {
    return fallback;
  }

  try {
    const url = new URL(normalized);
    const connectionLimitRaw = url.searchParams.get('connection_limit');
    const connectionLimit =
      connectionLimitRaw && Number.isFinite(Number(connectionLimitRaw))
        ? Math.max(0, Number(connectionLimitRaw))
        : null;

    return {
      host: url.hostname || fallback.host,
      port: url.port || '5432',
      usesPooler: /pooler/i.test(url.hostname),
      usesPgBouncer: url.searchParams.get('pgbouncer') === 'true',
      connectionLimit,
      hasDirectDatabaseUrl: fallback.hasDirectDatabaseUrl,
    };
  } catch {
    return fallback;
  }
}

function getDatabaseConfigIssue() {
  const rawDatabaseUrl = sanitizeDatabaseEnvValue(process.env.DATABASE_URL);
  if (!rawDatabaseUrl) {
    return DATABASE_URL_MISSING_ERROR;
  }

  if (!DATABASE_URL_PROTOCOL_REGEX.test(rawDatabaseUrl)) {
    return DATABASE_URL_INVALID_ERROR;
  }

  return null;
}

sanitizeDatabaseEnv();

const databaseConfigIssue = getDatabaseConfigIssue();

if (databaseConfigIssue) {
  console.error(`[Prisma] ${databaseConfigIssue}`);
}

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export function assertPrismaAvailable() {
  if (databaseConfigIssue) {
    throw new PrismaServiceUnavailableError(databaseConfigIssue);
  }
}

export function getDatabaseConfigValidationIssue() {
  return databaseConfigIssue;
}

export function getDatabaseRuntimeInfo() {
  return parseDatabaseRuntimeInfo(process.env.DATABASE_URL);
}

export function classifyPrismaRuntimeError(error: unknown): {
  kind: PrismaRuntimeErrorKind;
  detail: string;
} | null {
  const detail = error instanceof Error ? error.message : String(error || '');
  const normalized = detail.toLowerCase();

  if (!detail) {
    return null;
  }

  if (
    normalized.includes('unable to start a transaction in the given time') ||
    normalized.includes('transaction api error') ||
    normalized.includes('p2028')
  ) {
    return {
      kind: 'DB_TRANSACTION_TIMEOUT',
      detail: sanitizePrismaDiagnosticDetail(detail),
    };
  }

  if (
    normalized.includes('timed out fetching a new connection') ||
    normalized.includes('p2024')
  ) {
    return {
      kind: 'DB_CONNECTION_TIMEOUT',
      detail: sanitizePrismaDiagnosticDetail(detail),
    };
  }

  if (
    normalized.includes('advisory lock') ||
    normalized.includes('deadlock') ||
    normalized.includes('could not obtain lock') ||
    normalized.includes('canceling statement due to lock timeout')
  ) {
    return {
      kind: 'DB_LOCK_TIMEOUT',
      detail: sanitizePrismaDiagnosticDetail(detail),
    };
  }

  if (
    normalized.includes("can't reach database server") ||
    normalized.includes('authentication failed against database server') ||
    normalized.includes('p1000') ||
    normalized.includes('p1001') ||
    normalized.includes('p1002') ||
    normalized.includes('p1012')
  ) {
    return {
      kind: 'DB_UNAVAILABLE',
      detail: sanitizePrismaDiagnosticDetail(detail),
    };
  }

  return {
    kind: 'UNKNOWN',
    detail: sanitizePrismaDiagnosticDetail(detail),
  };
}

export function asPrismaServiceUnavailableError(error: unknown) {
  if (error instanceof PrismaServiceUnavailableError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error || '');
  const name = error instanceof Error ? error.name : '';

  if (databaseConfigIssue) {
    return new PrismaServiceUnavailableError(databaseConfigIssue);
  }

  if (
    name === 'PrismaClientInitializationError' ||
    /Error validating datasource `db`|Environment variable not found: DATABASE_URL|Can't reach database server|Authentication failed against database server|Timed out fetching a new connection|Timed out trying to acquire a postgres advisory lock|Unable to start a transaction in the given time|the URL must start with the protocol `postgresql:\/\/` or `postgres:\/\/`|P1000|P1001|P1002|P1012|P2024|P2028/i.test(
      message
    )
  ) {
    return new PrismaServiceUnavailableError(sanitizePrismaDiagnosticDetail(message));
  }

  return null;
}
