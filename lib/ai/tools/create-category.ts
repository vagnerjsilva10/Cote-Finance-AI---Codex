import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  buildShortCategoryName,
  isLikelyEnglishCategoryName,
  normalizeCategoryKey,
  toCategoryDisplayName,
} from '@/lib/finance-assistant/category-normalizer';

export type CreateCategoryToolInput = {
  workspaceId: string;
  categoryHint?: string | null;
  flowType?: 'income' | 'expense';
};

export type CreateCategoryToolResult = {
  categoryId: string;
  categoryName: string;
  created: boolean;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('createCategory requires a valid workspaceId.');
  }
  return workspaceId;
}

function sanitizeHint(value: string | null | undefined) {
  const hint = String(value || '').replace(/\s+/g, ' ').trim();
  if (!hint) return 'Outros';
  return hint.slice(0, 40);
}

export async function createCategoryTool(input: CreateCategoryToolInput): Promise<CreateCategoryToolResult> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const hint = sanitizeHint(input.categoryHint);
  const flowType = input.flowType === 'income' ? 'income' : 'expense';

  const shortName = buildShortCategoryName({
    hint,
    flowType,
  });
  const normalizedKey = normalizeCategoryKey(shortName);
  const finalName = !isLikelyEnglishCategoryName(shortName) && shortName ? shortName : 'Outros';

  const existing = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 400,
  });

  const matched = existing.find((category) => normalizeCategoryKey(category.name) === normalizedKey);
  if (matched) {
    await prisma.categorySuggestion.upsert({
      where: {
        workspace_id_keyword: {
          workspace_id: workspaceId,
          keyword: normalizedKey || normalizeCategoryKey(hint) || 'outros',
        },
      },
      create: {
        workspace_id: workspaceId,
        keyword: normalizedKey || normalizeCategoryKey(hint) || 'outros',
        category_id: matched.id,
        category_name: matched.name,
        confidence: 1,
      },
      update: {
        category_id: matched.id,
        category_name: matched.name,
        confidence: 1,
      },
    });

    return {
      categoryId: matched.id,
      categoryName: matched.name,
      created: false,
    };
  }

  const created = await prisma.category.create({
    data: {
      name: toCategoryDisplayName(finalName) || 'Outros',
      icon: 'tag',
      color: '#3B82F6',
    },
    select: {
      id: true,
      name: true,
    },
  });

  await prisma.categorySuggestion.upsert({
    where: {
      workspace_id_keyword: {
        workspace_id: workspaceId,
        keyword: normalizedKey || normalizeCategoryKey(hint) || 'outros',
      },
    },
    create: {
      workspace_id: workspaceId,
      keyword: normalizedKey || normalizeCategoryKey(hint) || 'outros',
      category_id: created.id,
      category_name: created.name,
      confidence: 1,
    },
    update: {
      category_id: created.id,
      category_name: created.name,
      confidence: 1,
    },
  });

  return {
    categoryId: created.id,
    categoryName: created.name,
    created: true,
  };
}

