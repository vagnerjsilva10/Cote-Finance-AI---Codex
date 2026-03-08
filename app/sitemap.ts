import type { MetadataRoute } from 'next';
import { getAllBlogArticles } from '@/lib/blog/articles';
import { absoluteUrl } from '@/lib/blog/seo';

const staticPages = [
  {
    path: '/',
    changeFrequency: 'weekly' as const,
    priority: 1,
  },
  {
    path: '/blog',
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    path: '/central-de-ajuda',
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  },
  {
    path: '/politica-de-privacidade',
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  },
  {
    path: '/termos-de-uso',
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const articles = getAllBlogArticles();

  return [
    ...staticPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}`),
      lastModified: article.publishedAt,
      changeFrequency: 'monthly' as const,
      priority: article.featured ? 0.8 : 0.7,
    })),
  ];
}
