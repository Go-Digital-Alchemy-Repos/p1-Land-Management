import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const { render } = await import(pathToFileURL(resolve(root, 'dist/server/entry-server.js')));
const services = ['commercial-landscaping', 'commercial-snow-ice-management', 'industrial-agricultural', 'land-clearing', 'grading-site-preparation', 'drainage', 'turf-installation-seeding', 'tree-services', 'pond-waterway-management', 'property-reconstruction'];
const grids = ['/', '/services'].map(route => ({ route, html: render(route).html }));
const gallery = render('/gallery').html;
const src = tag => tag.match(/\bsrc="([^"]+)"/)?.[1];
for (const slug of services) {
  const route = `/services/${slug}`;
  const html = render(route).html;
  const hero = [...html.matchAll(/<img\b[^>]*>/g)].find(([tag]) => /fetchPriority="high"/i.test(tag));
  assert(hero, `${route}: hero image`);
  const heroSrc = src(hero[0]);
  for (const grid of grids) {
    const card = [...grid.html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(([tag]) => tag.includes(`href="${route}"`) && tag.includes('<img'));
    assert(card, `${grid.route}: card for ${slug}`);
    const cardSrc = src(card[0].match(/<img\b[^>]*>/)[0]);
    if (slug === 'industrial-agricultural') {
      assert.match(cardSrc, /farm-industrial-maintenance-1280-[^/]+\.webp$/, `${grid.route}: industrial card must use the requested maintenance image`);
    } else {
      assert.equal(cardSrc, heroSrc, `${grid.route}: ${slug} must match its hero`);
    }
  }
  if (slug !== 'commercial-snow-ice-management') assert([...gallery.matchAll(/<img\b[^>]*>/g)].some(([tag]) => src(tag) === heroSrc), `${slug}: gallery must match its hero`);
}
console.log('PASS industrial grid cards use the requested maintenance image; 9 other grid cards and all 9 gallery service images match their heroes.');
