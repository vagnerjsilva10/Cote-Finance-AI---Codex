import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
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

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ dbHost, dbPort, status: 'connected' });
  } catch (error: any) {
    return NextResponse.json({ 
      dbHost, 
      dbPort, 
      status: 'error', 
      error: error.message 
    }, { status: 500 });
  }
}
