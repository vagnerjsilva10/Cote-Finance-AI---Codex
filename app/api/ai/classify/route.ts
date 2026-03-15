import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_KEY_MISSING_ERROR } from '@/lib/gemini';
import {
  HttpError,
  getWorkspacePlan,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  getAiUsageEffectiveOffset,
  getRuntimePlanLimits,
  resolveFeatureFlagState,
} from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getCurrentMonthAiUsage(workspaceId: string) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const actualUsage = await prisma.workspaceEvent.count({
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
    const offset = await getAiUsageEffectiveOffset(workspaceId);
    return Math.max(0, actualUsage + offset);
  } catch {
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const plan = await getWorkspacePlan(context.workspaceId, context.userId);
    const aiFlag = await resolveFeatureFlagState({
      key: 'advanced_ai_insights',
      plan,
      workspaceId: context.workspaceId,
      userId: context.userId,
    });

    if (!aiFlag.enabled) {
      return NextResponse.json(
        {
          error: 'A camada de IA está indisponível para esta conta no rollout atual.',
          code: 'FEATURE_DISABLED',
          feature: aiFlag.flag.key,
          source: aiFlag.source,
        },
        { status: 403 }
      );
    }

    const runtimeLimits = await getRuntimePlanLimits(plan);
    const aiLimit = runtimeLimits.aiInteractionsPerMonth;

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
    const body = await req.json().catch(() => ({}));
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const amount = body?.amount;

    if (!description || typeof amount === 'undefined' || amount === null) {
      return NextResponse.json(
        { error: 'Description and amount are required' },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Classifique a seguinte transação financeira:
Descrição: ${description}
Valor: ${amount}

Retorne a categoria mais provável e um score de confiança (0-1).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['category', 'confidence'],
        },
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'ai.classify.used',
      payload: {
        descriptionChars: description.length,
      },
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
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

    console.error('AI Classify Error:', error);
    return NextResponse.json({ error: 'Falha ao classificar transação' }, { status: 500 });
  }
}
