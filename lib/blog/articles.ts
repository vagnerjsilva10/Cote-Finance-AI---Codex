import { articleCatalogPart1 } from './catalog-1';
import { articleCatalogPart2 } from './catalog-2';
import { articleCatalogPart3 } from './catalog-3';
import { articleCatalogPart4 } from './catalog-4';
import { createFaqs, createSections, enrichArticle, type BlogArticleSummary, type BlogCategory } from './types';

export const blogArticles: BlogArticleSummary[] = [
  ...articleCatalogPart1,
  ...articleCatalogPart2,
  ...articleCatalogPart3,
  ...articleCatalogPart4,
]
  .map((seed) => ({
    ...seed,
    sections: createSections(seed),
    faqs: createFaqs(seed),
  }))
  .map(enrichArticle)
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

export function getAllBlogArticles() {
  return blogArticles;
}

export function getFeaturedBlogArticles() {
  return blogArticles.filter((article) => article.featured);
}

export function getBlogArticleBySlug(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function getRelatedBlogArticles(currentSlug: string, category: BlogCategory, limit = 3) {
  const currentArticle = getBlogArticleBySlug(currentSlug);
  const explicitRelated =
    currentArticle?.relatedSlugs
      ?.map((slug) => getBlogArticleBySlug(slug))
      .filter((article): article is BlogArticleSummary => Boolean(article && article.slug !== currentSlug)) ?? [];

  if (explicitRelated.length >= limit) {
    return explicitRelated.slice(0, limit);
  }

  const alreadyAdded = new Set(explicitRelated.map((article) => article.slug));
  const currentKeywords = new Set(currentArticle?.keywords.map((keyword) => keyword.toLowerCase()) ?? []);

  const rankedCandidates = blogArticles
    .filter((article) => article.slug !== currentSlug && !alreadyAdded.has(article.slug))
    .map((article) => {
      const keywordOverlap = article.keywords.filter((keyword) => currentKeywords.has(keyword.toLowerCase())).length;
      const sameCategoryScore = article.category === category ? 10 : 0;
      const featuredScore = article.featured ? 1 : 0;

      return {
        article,
        score: sameCategoryScore + keywordOverlap * 3 + featuredScore,
      };
    })
    .sort((a, b) => b.score - a.score || new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime())
    .map((item) => item.article);

  return [...explicitRelated, ...rankedCandidates].slice(0, limit);
}
