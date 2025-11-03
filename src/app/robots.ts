import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/login',
          '/subscribe/link-account',
        ],
      },
    ],
    sitemap: 'https://www.ladderlegendsacademy.com/sitemap.xml',
  };
}
