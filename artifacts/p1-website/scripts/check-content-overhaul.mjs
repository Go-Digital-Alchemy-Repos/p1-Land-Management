import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const pages = JSON.parse(read('src/lib/location-pages.json'));
const inbound = JSON.parse(read('src/lib/location-inbound-links.json'));
const { render } = await import(pathToFileURL(resolve(root, 'dist/server/entry-server.js')));
const routes = [...read('src/app-routes.tsx').matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]);
const sitemap = read('public/sitemap.xml');
const cache = new Map(routes.map(path => [path, render(path)]));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
assert.equal(pages.length, 19);
for (const path of routes) {
  const { html } = cache.get(path);
  assert(html.includes('Get a Free Site Assessment'), `${path}: assessment CTA`);
  assert(!html.includes('Get a Free Estimate'), `${path}: retired CTA label`);
  assert(!html.includes('href="/commercial-snow-ice-management"'), `${path}: retired snow link`);
}
for (const page of pages) {
  const result = cache.get(page.path);
  assert(result, page.path);
  assert(sitemap.includes(page.path), `${page.path}: sitemap`);
  assert(!/\b(residential|homeowner)\b/i.test(result.html), `${page.path}: prohibited positioning`);
  for (const link of page.links) {
    assert(result.html.includes(`href="${link.href}"`), `${page.path}: missing ${link.href}`);
    assert(result.html.toLowerCase().includes(escape(link.label).toLowerCase()), `${page.path}: missing anchor ${link.label}`);
  }
  if (page.parent) assert(result.html.includes(`href="${page.parent}"`), `${page.path}: county parent`);
  const schemas = Array.isArray(result.head.jsonLd) ? result.head.jsonLd : [result.head.jsonLd];
  const faq = schemas.find(schema => schema?.['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map(item => [item.name, item.acceptedAnswer.text]), page.faqs.map(item => [item.question, item.answer]));
  assert(schemas.some(schema => schema?.['@type'] === 'BreadcrumbList'));
  assert(schemas.some(schema => schema?.['@type'] === 'LandscapingBusiness' && schema['@id'] === 'https://www.p1landmanagement.com/#business'));
  assert(cache.get('/service-areas').html.includes(`href="${page.path}"`), `${page.path}: hub inbound`);
  const footer = result.html.slice(result.html.indexOf('<footer'));
  assert(!footer.includes(`href="${page.path}"`), `${page.path}: footer city expansion`);
}
for (const [path, links] of Object.entries(inbound)) {
  for (const link of links) {
    assert(cache.get(path).html.includes(`href="${link.href}"`), `${path}: missing inbound ${link.href}`);
    assert(cache.get(path).html.toLowerCase().includes(escape(link.label).toLowerCase()), `${path}: missing inbound anchor ${link.label}`);
  }
}
assert(!cache.get('/').html.includes('Rating on Google'), 'No empty server-rendered rating block');
assert(!cache.get('/services/commercial-landscaping').html.includes('href="/commercial"'), 'Landscaping must not compete back up to the hub');
console.log(`PASS ${pages.length} location pages, ${routes.length} CTA surfaces, prescribed linking, schema parity, sitemap and footer boundaries.`);
