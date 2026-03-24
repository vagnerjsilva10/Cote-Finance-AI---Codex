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
    /Error validating datasource `db`|Environment variable not found: DATABASE_URL|Can't reach database server|Authentication failed against database server|Timed out fetching a new connection|Timed out trying to acquire a postgres advisory lock|the URL must start with the protocol `postgresql:\/\/` or `postgres:\/\/`|P1000|P1001|P1002|P1012/i.test(
      message
    )
  ) {
    return new PrismaServiceUnavailableError(sanitizePrismaDiagnosticDetail(message));
  }

  return null;
}
