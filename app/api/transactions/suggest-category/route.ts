import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

const KEYWORD_CATEGORY_RULES: Array<{ keywords: string[]; category: string; confidence: number }> = [
  { keywords: ['uber', '99', 'combustivel', 'gasolina', 'onibus', 'metro', 'pedagio'], category: 'Transporte', confidence: 0.88 },
  { keywords: ['ifood', 'mercado', 'supermercado', 'restaurante', 'padaria', 'lanche'], category: 'Alimentação', confidence: 0.9 },
  { keywords: ['farmacia', 'medico', 'consulta', 'dentista', 'hospital'], category: 'Saúde', confidence: 0.87 },
  { keywords: ['curso', 'faculdade', 'escola', 'livro'], category: 'Educação', confidence: 0.8 },
  { keywords: ['aluguel', 'condominio', 'energia', 'luz', 'agua', 'internet', 'moradia'], category: 'Moradia', confidence: 0.83 },
  { keywords: ['salario', 'pagamento', 'prolabore', 'recebimento'], category: 'Salário', confidence: 0.78 },
  { keywords: ['freela', 'freelance', 'job'], category: 'Freelance', confidence: 0.78 },
  { keywords: ['pix'], category: 'PIX', confidence: 0.7 },
  { keywords: ['google ads', 'meta ads', 'trafego', 'marketing'], category: 'Marketing', confidence: 0.76 },
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isTableMissingError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /CategorySuggestion|does not exist|Unknown arg/i.test(message);
};

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { searchParams } = new URL(req.url);
    const description = (searchParams.get('description') || '').trim();

    if (description.length < 2) {
      return NextResponse.json({ suggestion: null });
    }

    const normalized = normalizeText(description);
    if (!normalized) {
      return NextResponse.json({ suggestion: null });
    }

    try {
      const exactMemory = await prisma.categorySuggestion.findUnique({
        where: {
          workspace_id_keyword: {
            workspace_id: context.workspaceId,
            keyword: normalized.slice(0, 120),
          },
        },
        select: {
          category_name: true,
          confidence: true,
          updated_at: true,
        },
      });

      if (exactMemory?.category_name) {
        return NextResponse.json({
          suggestion: {
            category: exactMemory.category_name,
            confidence: Number(exactMemory.confidence || 0.9),
            source: 'history',
            updatedAt: exactMemory.updated_at,
          },
        });
      }
    } catch (error) {
      if (!isTableMissingError(error)) throw error;
    }

    const rule = KEYWORD_CATEGORY_RULES.find((item) =>
      item.keywords.some((keyword) => normalized.includes(keyword))
    );

    if (rule) {
      return NextResponse.json({
        suggestion: {
          category: rule.category,
          confidence: rule.confidence,
          source: 'rules',
        },
      });
    }

    return NextResponse.json({ suggestion: null });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Suggest Category Error:', error);
    return NextResponse.json({ error: 'Falha ao sugerir categoria' }, { status: 500 });
  }
}
