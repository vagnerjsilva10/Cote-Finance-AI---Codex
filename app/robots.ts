import type { MetadataRoute } from 'next';
import { absoluteUrl, getSiteUrl } from '@/lib/blog/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/api', '/auth', '/dashboard', '/checkout'],
    },
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/blog/sitemap.xml')],
    host: getSiteUrl(),
  };
}
