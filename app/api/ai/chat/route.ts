import { NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_KEY_MISSING_ERROR } from '@/lib/gemini';
import {
  HttpError,
  PLAN_LIMITS,
  getWorkspacePlan,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatBRL = (value: unknown) =>
  toNumber(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function getCurrentMonthAiUsage(workspaceId: string) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return await prisma.workspaceEvent.count({
      where: {
        workspace_id: workspaceId,
        type: {
          in: ['ai.chat.used', 'ai.classify.used'],
        },
        created_at: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });
  } catch {
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const plan = await getWorkspacePlan(context.workspaceId, context.userId);
    const aiLimit = PLAN_LIMITS[plan].aiInteractionsPerMonth;

    if (typeof aiLimit === 'number') {
      const usage = await getCurrentMonthAiUsage(context.workspaceId);
      if (usage >= aiLimit) {
        return NextResponse.json(
          {
            error: `AI limit reached for ${plan}. Upgrade your workspace plan to continue.`,
            code: 'PLAN_LIMIT_REACHED',
            plan,
            limit: aiLimit,
          },
          { status: 403 }
        );
      }
    }

    const ai = getGeminiClient();
    const payload = await req.json().catch(() => ({}));

    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    const history = Array.isArray(payload?.history) ? payload.history : [];
    const contextPayload = payload?.context ?? {};

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const financialSummary = contextPayload?.financialSummary ?? {};
    const topExpenseCategories = Array.isArray(financialSummary?.topExpenseCategories)
      ? financialSummary.topExpenseCategories
      : [];
    const recentTransactions = Array.isArray(financialSummary?.recentTransactions)
      ? financialSummary.recentTransactions
      : [];
    const goals = Array.isArray(financialSummary?.goals) ? financialSummary.goals : [];
    const investments = financialSummary?.investments ?? {};
    const debts = financialSummary?.debts ?? {};

    const systemInstruction = `Você é o Cote, assistente financeiro da plataforma Cote Finance AI.
Responda sempre em português do Brasil, de forma clara, prática e orientada por dados.
Não invente números. Use somente o contexto recebido abaixo.

CONTEXTO DO USUÁRIO
- Nome: ${contextPayload?.userName || 'Usuário'}
- Aba ativa: ${contextPayload?.activeTab || 'dashboard'}
- WhatsApp conectado: ${contextPayload?.isWhatsAppConnected ? 'Sim' : 'Não'}

RESUMO FINANCEIRO
- Saldo total: R$ ${formatBRL(financialSummary?.balance)}
- Entradas totais: R$ ${formatBRL(financialSummary?.totalIncome)}
- Saídas totais: R$ ${formatBRL(financialSummary?.totalExpenses)}
- Entradas no mês: R$ ${formatBRL(financialSummary?.monthIncome)}
- Saídas no mês: R$ ${formatBRL(financialSummary?.monthExpenses)}
- Saldo no mês: R$ ${formatBRL(financialSummary?.monthBalance)}
- Taxa de economia no mês: ${toNumber(financialSummary?.monthSavingsRate).toFixed(2)}%

GASTOS POR CATEGORIA (TOP)
${JSON.stringify(topExpenseCategories)}

ÚLTIMAS TRANSAÇÕES
${JSON.stringify(recentTransactions)}

METAS
${JSON.stringify(goals)}

INVESTIMENTOS
- Total investido: R$ ${formatBRL(investments?.totalInvested)}
- Valor atual: R$ ${formatBRL(investments?.totalCurrent)}
- Resultado: R$ ${formatBRL(investments?.profit)}
- Rentabilidade: ${toNumber(investments?.profitability).toFixed(2)}%
- Principais ativos: ${JSON.stringify(investments?.topInvestments || [])}

DÍVIDAS
- Quantidade ativas: ${toNumber(debts?.activeCount)}
- Total restante: R$ ${formatBRL(debts?.totalRemaining)}
- Maior dívida: ${JSON.stringify(debts?.highestDebt || null)}

REGRAS DE RESPOSTA
1) Quando o usuário perguntar sobre saldo, gastos, investimentos ou dívidas, cite os números do contexto.
2) Ao sugerir economia, proponha ações práticas com prioridade.
3) Se perguntarem por prioridade de dívidas, considere juros mensais e valor restante.
4) Se perguntarem sobre WhatsApp e estiver desconectado, oriente a conectar na aba Integrações.
5) Se faltarem dados, avise isso com objetividade e sugira o próximo passo.
6) Prefira texto limpo com parágrafos curtos e lista numerada simples. Evite excesso de markdown decorativo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'ai.chat.used',
      payload: {
        promptChars: message.length,
      },
    });

    return NextResponse.json({ text: response.text || '' });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === GEMINI_KEY_MISSING_ERROR) {
      return NextResponse.json({ error: GEMINI_KEY_MISSING_ERROR }, { status: 503 });
    }

    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Falha ao processar mensagem' }, { status: 500 });
  }
}
