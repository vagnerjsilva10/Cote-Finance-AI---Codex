import 'server-only';

import { prisma } from '@/lib/prisma';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import {
  buildShortCategoryName,
  normalizeCategoryKey,
} from '@/lib/finance-assistant/category-normalizer';
import { matchCategoryCandidate, type CategoryCandidate } from '@/lib/finance-assistant/category-matcher';

export type CategoryResolutionResult = {
  categoryId: string;
  categoryName: string;
  matchedExistingCategoryId: string | null;
  matchedExistingCategoryName: string | null;
  matchScore: number;
  wasAutoCreated: boolean;
  reason: string;
  sourceHint: string;
};

async function collectWorkspaceCategoryCandidates(workspaceId: string): Promise<CategoryCandidate[]> {
  const [transactionRows, suggestionRows] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        category_id: {
          not: null,
        },
      },
      select: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 400,
      orderBy: {
        date: 'desc',
      },
    }),
    prisma.categorySuggestion.findMany({
      where: {
        workspace_id: workspaceId,
        category_id: {
          not: null,
        },
      },
      select: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 200,
      orderBy: {
        updated_at: 'desc',
      },
    }),
  ]);

  const map = new Map<string, CategoryCandidate>();
  for (const row of transactionRows) {
    if (!row.category) continue;
    map.set(row.category.id, { id: row.category.id, name: row.category.name });
  }
  for (const row of suggestionRows) {
    if (!row.category) continue;
    map.set(row.category.id, { id: row.category.id, name: row.category.name });
  }

  return [...map.values()];
}

async function findCategoryByNormalizedName(normalized: string) {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    take: 600,
    orderBy: {
      name: 'asc',
    },
  });

  for (const category of categories) {
    if (normalizeCategoryKey(category.name) === normalized) {
      return category;
    }
  }

  return null;
}

export async function resolveCategoryForWorkspace(params: {
  workspaceId: string;
  flowType: 'expense' | 'income';
  categoryHint: string | null | undefined;
}) {
  const sourceHint = (params.categoryHint || '').trim();
  const fallbackHint = params.flowType === 'income' ? 'Recebimento' : 'Outros';
  const effectiveHint = sourceHint || fallbackHint;

  const candidates = await collectWorkspaceCategoryCandidates(params.workspaceId);
  const match = matchCategoryCandidate({
    categoryHint: effectiveHint,
    flowType: params.flowType,
    candidates,
  });

  if (match.candidate && match.score >= 0.74) {
    const result: CategoryResolutionResult = {
      categoryId: match.candidate.id,
      categoryName: match.candidate.name,
      matchedExistingCategoryId: match.candidate.id,
      matchedExistingCategoryName: match.candidate.name,
      matchScore: match.score,
      wasAutoCreated: false,
      reason: match.reason,
      sourceHint: effectiveHint,
    };

    return result;
  }

  const shortCategoryName = buildShortCategoryName({
    hint: match.canonicalHint || effectiveHint,
    flowType: params.flowType,
  });
  const normalizedTarget = normalizeCategoryKey(shortCategoryName);
  const existingGlobalCategory = normalizedTarget
    ? await findCategoryByNormalizedName(normalizedTarget)
    : null;

  if (existingGlobalCategory) {
    const result: CategoryResolutionResult = {
      categoryId: existingGlobalCategory.id,
      categoryName: existingGlobalCategory.name,
      matchedExistingCategoryId: existingGlobalCategory.id,
      matchedExistingCategoryName: existingGlobalCategory.name,
      matchScore: Math.max(match.score, 0.69),
      wasAutoCreated: false,
      reason: 'normalized_global_match',
      sourceHint: effectiveHint,
    };

    return result;
  }

  const created = await prisma.category.create({
    data: {
      name: shortCategoryName,
      color: '#3B82F6',
      icon: 'tag',
    },
    select: {
      id: true,
      name: true,
    },
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    type: 'whatsapp.assistant.category_auto_created',
    payload: {
      categoryId: created.id,
      categoryName: created.name,
      sourceHint: effectiveHint,
      flowType: params.flowType,
      matchScore: match.score,
    },
  });

  const result: CategoryResolutionResult = {
    categoryId: created.id,
    categoryName: created.name,
    matchedExistingCategoryId: null,
    matchedExistingCategoryName: null,
    matchScore: match.score,
    wasAutoCreated: true,
    reason: 'auto_created',
    sourceHint: effectiveHint,
  };

  return result;
}
