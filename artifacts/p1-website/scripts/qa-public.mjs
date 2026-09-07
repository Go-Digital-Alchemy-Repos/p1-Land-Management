import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(pathToFileURL(resolve(root, 'dist/server/entry-server.js')).href);
const paths = [...readFileSync(resolve(root, 'src/App.tsx'), 'utf8').matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]);
assert.equal(paths.length, 35, 'Review route inventory when adding or removing pages');
const warnings = [];
const originalError = console.error;
console.error = (...args) => warnings.push(args.join(' '));
try {
  for (const path of paths) {
    const result = render(path);
    assert(result.head?.title && result.head.description, `${path}: metadata`);
    assert.equal((result.html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: one heading`);
    assert(result.fields.page.seoTitle && result.fields.page.seoDescription && result.fields.page.seoImage, `${path}: editable SEO`);
    if (path === "/") assert(/href="\/contact"[^>]*class="[^"]*inline-flex|class="[^"]*inline-flex[^>]*href="\/contact"/.test(result.html), "Slot CTA must retain button styling");
    assert(!/Marcus T\.|50-Acre Forestry|P1 took over our|fill-current|Est\. 2009|±0\.1/.test(result.html), `${path}: unverified proof`);
    assert(!/Yes\. P1 is licensed and insured for commercial work|Licensed and insured for commercial work/.test(result.html), `${path}: unsupported commercial credential claim`);
    assert(!/never need to call anyone else|Free on-site property assessments|One contractor\. No gaps\./.test(result.html), `${path}: unsupported universal service claim`);
    for (const match of result.html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const pathname = href.split('?')[0].replace(/\/$/, '') || '/';
      assert(paths.includes(pathname), `${path}: unknown internal link ${href}`);
    }
    for (const type of ['text', 'image', 'ctaTarget']) {
      const found = Object.entries(result.fields.page).find(([key, value]) => !key.startsWith('seo') && value.field.type === type);
      if (!found) continue;
      const [key] = found;
      const replacement = type === 'text' ? 'QA custom visible copy' : type === 'image' ? '/qa-cms-image.webp' : '/contact?qa=1';
      const edited = render(path, { route: path, content: { [key]: replacement }, global: {} });
      // seoTitle may be the first text field; either head or visible output is valid.
      assert((edited.html + JSON.stringify(edited.head)).includes(replacement), `${path}: ${type} override`);
    }
    const html = readFileSync(resolve(root, `dist/public/${path === '/' ? '' : path.slice(1) + '/'}index.html`), 'utf8');
    assert(!html.includes('GeneralContractor'), `${path}: competing business schema`);
    assert(html.includes('href="#main-content"'), `${path}: skip link`);
    const main = html.match(/<main\b[^>]*\bid="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert(main, `${path}: main landmark`);
    const headings = [...main.matchAll(/<h([1-6])\b[^>]*>/g)].map((match) => Number(match[1]));
    assert.equal(headings[0], 1, `${path}: main starts with h1`);
    assert(!headings.some((level, index) => index > 0 && level - headings[index - 1] > 1), `${path}: heading level jump`);
    for (const image of main.matchAll(/<img\b[^>]*>/g)) assert(/\balt="[^"]*"/.test(image[0]) || /\baria-hidden="true"/.test(image[0]), `${path}: image alternative text`);
    for (const image of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const src = image[1].split('?')[0];
      assert(!/\.(?:png|jpe?g|avif)$/i.test(src), `${path}: public raster image must use WebP (${src})`);
    }
    for (const srcSet of html.matchAll(/\bsrcSet="([^"]+)"/g)) {
      assert(!/\.(?:png|jpe?g|avif)(?:\s|,|$)/i.test(srcSet[1]), `${path}: responsive image candidates must use WebP`);
    }
    for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      assert(match[0].includes('data-seo-jsonld'), `${path}: schema cleanup marker`);
      JSON.parse(match[1]);
    }
  }
  const home = render('/');
  for (const type of ['text', 'image', 'ctaTarget']) {
    const found = Object.entries(home.fields.global).find(([, item]) => item.field.type === type);
    if (!found) continue;
    const [key] = found;
    const replacement = type === 'text' ? 'QA global text' : type === 'image' ? '/qa-global.webp' : '/contact?global=1';
    assert(render('/', { route: '/', content: {}, global: { [key]: replacement } }).html.includes(replacement), `Global ${type} override`);
    if (type !== 'text') {
      assert(!render('/', { route: '/', content: {}, global: { [key]: 'javascript:alert(1)' } }).html.includes('javascript:alert'), `Unsafe ${type} rejected`);
    }
  }
  const edited = render('/contact', { route: '/contact', content: { seoTitle: 'QA SEO title', seoDescription: 'QA description', seoImage: '/qa.webp' }, global: {} });
  assert.equal(edited.head.title, 'QA SEO title');
  assert.equal(edited.head.description, 'QA description');
  assert.equal(edited.head.image, '/qa.webp');
  assert.equal(warnings.length, 0, `React render warnings: ${warnings.slice(0, 3).join('\n')}`);
} finally { console.error = originalError; }

const manifestPath = resolve(root, 'dist/public/.vite/manifest.json');
if (!existsSync(manifestPath)) throw new Error('Build with Vite manifest enabled before measuring JavaScript budgets');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert(!Object.values(manifest).some((item) => /\.avif$/i.test(item.file)), 'Public asset manifest must not package AVIF images');
const entry = Object.keys(manifest).find(key => manifest[key].isEntry);
assert(entry, 'Manifest entry');
let worst = { route: '', bytes: 0 };
for (const key of Object.keys(manifest).filter(key => /^src\/pages\/.*\.tsx$/.test(key))) {
  const files = new Set();
  const visit = name => {
    const item = manifest[name];
    assert(item, `Manifest dependency ${name}`);
    if (files.has(item.file)) return;
    files.add(item.file);
    (item.imports || []).forEach(visit);
  };
  visit(entry); visit(key);
  const bytes = [...files].filter(file => file.endsWith('.js')).reduce((sum, file) => sum + gzipSync(readFileSync(resolve(root, 'dist/public', file))).length, 0);
  if (bytes > worst.bytes) worst = { route: key, bytes };
  assert(bytes <= 150 * 1024, `${key}: initial JS ${(bytes / 1024).toFixed(1)} KiB exceeds 150 KiB`);
}
console.log(`PASS ${paths.length} routes: SSR, metadata, CMS text/image/link overrides, internal links, proof, JSON-LD and no React warnings.`);
console.log(`PASS initial JS <=150 KiB gzip; largest ${worst.route}: ${(worst.bytes / 1024).toFixed(1)} KiB.`);
