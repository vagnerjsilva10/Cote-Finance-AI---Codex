import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import {
  getFinancialCalendarSchemaErrorMessage,
  isFinancialCalendarSchemaMismatchError,
} from '@/lib/server/financial-calendar';
import { HttpError } from '@/lib/server/multi-tenant';

export function buildFinancialCalendarErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (
    error instanceof Error &&
    /(required|invalid|obrigat[oó]rio|obrigat[oó]rios|inv[aá]lida|inv[aá]lido|must be|At least one field|n[aã]o pode|n[aã]o aceita|n[aã]o encontrado|devem ser alterados na origem|n[aã]o podem ser exclu[ií]dos|seguro cancelar)/i.test(
      error.message
    )
  ) {
    const status = /n[aã]o encontrado/i.test(error.message) ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (isFinancialCalendarSchemaMismatchError(error)) {
    return NextResponse.json({ error: getFinancialCalendarSchemaErrorMessage() }, { status: 503 });
  }

  const prismaError = asPrismaServiceUnavailableError(error);
  if (prismaError) {
    return NextResponse.json({ error: prismaError.message }, { status: 503 });
  }

  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 }
  );
}
