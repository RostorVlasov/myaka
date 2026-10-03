import { writeFile } from "node:fs/promises";
import { siteUrl } from "../lib/site-config.ts";

const url = new URL(siteUrl);
if (!['https:', 'http:'].includes(url.protocol) || url.search || url.hash || url.pathname !== '/') {
  throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query or hash.');
}
const xml = (value) => value.replace(/[<>&"']/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[char]);

await writeFile('dist/client/robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /healthz\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile('dist/client/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xml(siteUrl)}</loc></url></urlset>\n`);
console.log(`Static robots.txt and sitemap.xml: ${siteUrl}`);
