import {
  areEquivalentCategoryKeys,
  normalizeCategoryKey,
  normalizeCategoryToken,
  resolveCanonicalCategoryHint,
} from '@/lib/finance-assistant/category-normalizer';

export type CategoryCandidate = {
  id: string;
  name: string;
};

export type CategoryMatchResult = {
  candidate: CategoryCandidate | null;
  score: number;
  reason: string;
  canonicalHint: string | null;
};

function tokenize(value: string) {
  return normalizeCategoryToken(value).split(' ').filter(Boolean);
}

function computeTokenSimilarity(a: string, b: string) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(aTokens.size, bTokens.size);
}

function findAliasCanonical(params: { hint: string; flowType: 'expense' | 'income' }) {
  return resolveCanonicalCategoryHint(params);
}

export function matchCategoryCandidate(params: {
  categoryHint: string;
  flowType: 'expense' | 'income';
  candidates: CategoryCandidate[];
}): CategoryMatchResult {
  const normalizedHint = normalizeCategoryKey(params.categoryHint);
  const aliasCanonical = findAliasCanonical({
    hint: params.categoryHint,
    flowType: params.flowType,
  });

  let best: CategoryMatchResult = {
    candidate: null,
    score: 0,
    reason: 'no_match',
    canonicalHint: aliasCanonical,
  };

  for (const candidate of params.candidates) {
    const normalizedCandidate = normalizeCategoryKey(candidate.name);
    if (!normalizedCandidate) continue;

    if (normalizedCandidate === normalizedHint && normalizedHint) {
      return {
        candidate,
        score: 1,
        reason: 'exact_normalized_match',
        canonicalHint: aliasCanonical,
      };
    }

    if (aliasCanonical && areEquivalentCategoryKeys(aliasCanonical, normalizedCandidate)) {
      return {
        candidate,
        score: 0.97,
        reason: 'alias_match',
        canonicalHint: aliasCanonical,
      };
    }

    const tokenSimilarity = computeTokenSimilarity(params.categoryHint, candidate.name);
    const startsWithScore =
      normalizedHint && normalizedCandidate.startsWith(normalizedHint) ? 0.82 : 0;
    const similarity = Math.max(tokenSimilarity, startsWithScore);
    if (similarity > best.score) {
      best = {
        candidate,
        score: similarity,
        reason: similarity === startsWithScore ? 'prefix_match' : 'token_similarity_match',
        canonicalHint: aliasCanonical,
      };
    }
  }

  return best;
}
