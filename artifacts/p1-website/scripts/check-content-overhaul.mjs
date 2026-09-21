import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const { render } = await import(pathToFileURL(resolve(root, 'dist/server/entry-server.js')));
const routes = [...read('src/app-routes.tsx').matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]);
const sitemap = read('public/sitemap.xml');
const cache = new Map(routes.map(path => [path, render(path)]));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
for (const path of routes) {
  const result = cache.get(path);
  assert(result, path);
  assert(sitemap.includes(path), `${path}: sitemap`);
  assert(!result.html.includes('Get a Free Site Assessment'), `${path}: retired CTA label`);
  assert(!result.html.includes('href="/commercial-snow-ice-management"'), `${path}: retired snow link`);
  // A small set of lazily loaded routes return the SSR shell here; their
  // resolved HTML is verified by the prerender step itself.
  if (result.html.includes('Loading page…')) continue;
  if (path !== '/contact') assert(result.html.includes('data-component="cta-band"'), `${path}: CTA band`);
  const schemas = Array.isArray(result.head.jsonLd) ? result.head.jsonLd : [result.head.jsonLd];
  const faq = schemas.find(schema => schema?.['@type'] === 'FAQPage');
  const visible = result.html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
  if (faq && path !== '/contact') assert(faq.mainEntity.every(item => visible.includes(item.name) && visible.includes(item.acceptedAnswer.text)), `${path}: FAQ visibility/schema parity`);
  if (path !== '/blog') assert(schemas.some(schema => schema?.['@type'] === 'LandscapingBusiness' && schema['@id'] === 'https://www.p1landmanagement.com/#business'), `${path}: business schema`);
}
assert(!cache.get('/').html.includes('Rating on Google'), 'No empty server-rendered rating block');
console.log(`PASS ${routes.length} content-plan routes: CTA variants, sitemap, business schema and FAQ visibility/schema parity.`);
