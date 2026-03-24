import { NextResponse } from 'next/server';
import {
  asPrismaServiceUnavailableError,
  getDatabaseConfigValidationIssue,
  prisma,
} from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  const hasDirectDatabaseUrl = Boolean(process.env.DIRECT_DATABASE_URL);
  const migrateInBuildEnabled = process.env.PRISMA_RUN_MIGRATIONS === '1';
  const dbIssue = getDatabaseConfigValidationIssue();
  let dbHost = 'unknown';
  let dbPort = 'unknown';

  try {
    if (dbUrl) {
      const url = new URL(dbUrl.replace('postgresql://', 'http://'));
      dbHost = url.hostname;
      dbPort = url.port || '5432';
    }
  } catch (e) {
    const parts = dbUrl.split('@')[1]?.split('/')[0]?.split(':');
    if (parts) {
      dbHost = parts[0];
      dbPort = parts[1] || '5432';
    }
  }

  if (dbIssue) {
    return NextResponse.json(
      {
        dbHost,
        dbPort,
        hasDirectDatabaseUrl,
        migrateInBuildEnabled,
        status: 'error',
        error: dbIssue,
      },
      { status: 503 }
    );
  }

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      dbHost,
      dbPort,
      hasDirectDatabaseUrl,
      migrateInBuildEnabled,
      status: 'connected',
    });
  } catch (error: any) {
    const prismaError = asPrismaServiceUnavailableError(error);
    return NextResponse.json({ 
      dbHost, 
      dbPort, 
      hasDirectDatabaseUrl,
      migrateInBuildEnabled,
      status: 'error', 
      error: prismaError?.message || error.message,
      detail: prismaError?.detail || (error instanceof Error ? error.message : String(error || '')),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }, { status: prismaError ? 503 : 500 });
  }
}
