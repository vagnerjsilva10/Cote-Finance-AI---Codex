import { NextResponse } from 'next/server';
import {
  asPrismaServiceUnavailableError,
  classifyPrismaRuntimeError,
  getConfiguredDatabaseRuntimeInfo,
  getDatabaseConfigValidationIssue,
  getDatabaseRuntimeInfo,
  prisma,
} from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const runtimeInfo = getDatabaseRuntimeInfo();
  const configuredRuntimeInfo = getConfiguredDatabaseRuntimeInfo();
  const migrateInBuildEnabled = process.env.PRISMA_RUN_MIGRATIONS === '1';
  const dbIssue = getDatabaseConfigValidationIssue();
  const warnings: string[] = [];

  if (
    configuredRuntimeInfo.usesPooler &&
    configuredRuntimeInfo.connectionLimit !== null &&
    configuredRuntimeInfo.connectionLimit <= 1
  ) {
    warnings.push(
      'DATABASE_URL esta usando pooler com connection_limit=1. Isso aumenta muito o risco de timeout ao abrir transacoes e sob carga concorrente.'
    );
  }
  if (
    configuredRuntimeInfo.usesPooler &&
    runtimeInfo.connectionLimit !== configuredRuntimeInfo.connectionLimit
  ) {
    warnings.push(
      `Runtime elevou connection_limit para ${runtimeInfo.connectionLimit ?? 'desconhecido'} para reduzir timeout de conexao. Ajuste o DATABASE_URL no provedor para manter esse valor de forma explicita.`
    );
  }

  if (dbIssue) {
    return NextResponse.json(
      {
        dbHost: runtimeInfo.host,
        dbPort: runtimeInfo.port,
        hasDirectDatabaseUrl: runtimeInfo.hasDirectDatabaseUrl,
        usesPooler: runtimeInfo.usesPooler,
        usesPgBouncer: runtimeInfo.usesPgBouncer,
        connectionLimit: runtimeInfo.connectionLimit,
        configuredDbHost: configuredRuntimeInfo.host,
        configuredDbPort: configuredRuntimeInfo.port,
        configuredConnectionLimit: configuredRuntimeInfo.connectionLimit,
        migrateInBuildEnabled,
        warnings,
        status: 'error',
        error: dbIssue,
      },
      { status: 503 }
    );
  }

  try {
    const startedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      dbHost: runtimeInfo.host,
      dbPort: runtimeInfo.port,
      hasDirectDatabaseUrl: runtimeInfo.hasDirectDatabaseUrl,
      usesPooler: runtimeInfo.usesPooler,
      usesPgBouncer: runtimeInfo.usesPgBouncer,
      connectionLimit: runtimeInfo.connectionLimit,
      configuredDbHost: configuredRuntimeInfo.host,
      configuredDbPort: configuredRuntimeInfo.port,
      configuredConnectionLimit: configuredRuntimeInfo.connectionLimit,
      migrateInBuildEnabled,
      warnings,
      pingMs: Date.now() - startedAt,
      status: 'connected',
    });
  } catch (error: any) {
    const prismaError = asPrismaServiceUnavailableError(error);
    const classified = classifyPrismaRuntimeError(error);
    return NextResponse.json({ 
      dbHost: runtimeInfo.host,
      dbPort: runtimeInfo.port,
      hasDirectDatabaseUrl: runtimeInfo.hasDirectDatabaseUrl,
      usesPooler: runtimeInfo.usesPooler,
      usesPgBouncer: runtimeInfo.usesPgBouncer,
      connectionLimit: runtimeInfo.connectionLimit,
      configuredDbHost: configuredRuntimeInfo.host,
      configuredDbPort: configuredRuntimeInfo.port,
      configuredConnectionLimit: configuredRuntimeInfo.connectionLimit,
      migrateInBuildEnabled,
      warnings,
      status: 'error', 
      error: prismaError?.message || error.message,
      detail: prismaError?.detail || (error instanceof Error ? error.message : String(error || '')),
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorKind: classified?.kind || 'UNKNOWN',
    }, { status: prismaError ? 503 : 500 });
  }
}
