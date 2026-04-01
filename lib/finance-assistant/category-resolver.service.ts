import 'server-only';

import { prisma } from '@/lib/prisma';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import {
  buildShortCategoryName,
  isLikelyEnglishCategoryName,
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

function scoreReasonRank(reason: string) {
  if (reason === 'exact_normalized_match') return 4;
  if (reason === 'alias_match') return 3;
  if (reason === 'prefix_match') return 2;
  if (reason === 'token_similarity_match') return 1;
  return 0;
}

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
      if (isLikelyEnglishCategoryName(category.name)) continue;
      return category;
    }
  }

  return null;
}

export async function resolveCategoryForWorkspace(params: {
  workspaceId: string;
  flowType: 'expense' | 'income';
  categoryHint: string | null | undefined;
  rawUtterance?: string | null;
}) {
  const sourceHint = (params.categoryHint || '').trim();
  const utteranceHint = (params.rawUtterance || '').trim();
  const fallbackHint = params.flowType === 'income' ? 'Recebimento' : 'Outros';
  const effectiveHint = sourceHint || utteranceHint || fallbackHint;
  const hintQueue = [utteranceHint, sourceHint, fallbackHint].map((item) => item.trim()).filter(Boolean);

  const candidates = await collectWorkspaceCategoryCandidates(params.workspaceId);
  let match = matchCategoryCandidate({
    categoryHint: effectiveHint,
    flowType: params.flowType,
    candidates,
  });
  let matchedHintUsed = effectiveHint;

  for (const hint of hintQueue) {
    const current = matchCategoryCandidate({
      categoryHint: hint,
      flowType: params.flowType,
      candidates,
    });

    const currentRank = scoreReasonRank(current.reason);
    const bestRank = scoreReasonRank(match.reason);
    const shouldReplace = currentRank > bestRank || (currentRank === bestRank && current.score > match.score);
    if (shouldReplace) {
      match = current;
      matchedHintUsed = hint;
    }
  }

  if (match.candidate && match.score >= 0.74) {
    const result: CategoryResolutionResult = {
      categoryId: match.candidate.id,
      categoryName: match.candidate.name,
      matchedExistingCategoryId: match.candidate.id,
      matchedExistingCategoryName: match.candidate.name,
      matchScore: match.score,
      wasAutoCreated: false,
      reason: match.reason,
      sourceHint: matchedHintUsed,
    };

    return result;
  }

  const shortCategoryName = buildShortCategoryName({
    hint: match.canonicalHint || utteranceHint || effectiveHint,
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
      sourceHint: matchedHintUsed,
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
      sourceHint: matchedHintUsed,
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
    sourceHint: matchedHintUsed,
  };

  return result;
}
