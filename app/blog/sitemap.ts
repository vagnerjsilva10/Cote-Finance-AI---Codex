import type { MetadataRoute } from 'next';
import { getAllBlogArticles } from '@/lib/blog/articles';
import { absoluteUrl } from '@/lib/blog/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllBlogArticles();

  return [
    {
      url: absoluteUrl('/blog'),
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...articles.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}`),
      lastModified: article.publishedAt,
      changeFrequency: 'monthly' as const,
      priority: article.featured ? 0.8 : 0.7,
    })),
  ];
}
