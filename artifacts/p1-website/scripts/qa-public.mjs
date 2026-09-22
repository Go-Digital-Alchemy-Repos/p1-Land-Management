import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(root, 'dist/public');
function assertLocalAssetLink(route, href) {
  const pathname = href.split('?')[0].replace(/\/$/, '') || '/';
  const asset = resolve(publicRoot, `.${pathname}`);
  assert(asset.startsWith(`${publicRoot}/`), `${route}: unsafe local asset link ${href}`);
  assert(existsSync(asset), `${route}: missing local asset link ${href}`);
}
assert.throws(
  () => assertLocalAssetLink('/qa', '/assets/qa-missing.webp'),
  /missing local asset link/,
  'Asset-link audit must reject a missing local file',
);
function assertGlobalOverride(key, type, output, replacement) {
  assert(output.includes(replacement), `${key}: global ${type} override`);
}
assert.throws(
  () => assertGlobalOverride('qa-global', 'text', '', 'QA global text'),
  /qa-global: global text override/,
  'Global-field audit must reject a visible field whose override did not render',
);
const { render } = await import(pathToFileURL(resolve(root, 'dist/server/entry-server.js')).href);
const routeSource = readFileSync(resolve(root, 'src/app-routes.tsx'), 'utf8');
const paths = [...routeSource.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map(match => match[1])
  .filter(path => !path.includes(':') && !path.includes('*'));
assert(paths.length > 0, 'Public route inventory must not be empty');
assert.equal(new Set(paths).size, paths.length, 'Public route paths must be unique');
const companyIconUrl = 'https://www.p1landmanagement.com/p1-symbol.svg';
const headerSource = readFileSync(resolve(root, 'src/components/layout/SiteHeader.tsx'), 'utf8');
assert(!headerSource.includes('View All Services'), 'Header must not restore the retired View All Services item');
assert(!/\b(?:Blog|Gallery)\b/.test(headerSource), 'Header main navigation must exclude Blog and Gallery');
assert(!/href=["']\/service-areas["']/.test(headerSource), 'Service Areas must stay out of the Services dropdown and mobile menu');
const commercialInquirySource = readFileSync(resolve(root, 'src/lib/commercial-inquiry.ts'), 'utf8');
const residentialOfferPattern = /\b(?:large residential|(?<!non-)residential (?:properties|development|acreage|estate)|HOAs?|estate (?:maintenance|lawns?)|waterfront estates?|rural estates?|new homes?|neighborhoods?)\b/i;
assert(!residentialOfferPattern.test(readFileSync(resolve(root, 'public/llms.txt'), 'utf8')), 'AI-facing site summary must not advertise residential work');
const expectedPublicForms = [
  { id: 'p1-estimate', routeId: 'contact', endpoint: '/api/forms/p1-estimate/submit', method: 'POST', authentication: 'public', handlerOwner: 'platform' },
  { id: 'p1-commercial-assessment', routeId: 'commercial', endpoint: '/api/forms/p1-commercial-assessment/submit', method: 'POST', authentication: 'public', handlerOwner: 'platform' },
];
const contractManifests = [
  resolve(root, 'config/client-site-manifest.json'),
  resolve(root, '../../platform/p1-core/config/p1-client-site-manifest.json'),
].map((path) => JSON.parse(readFileSync(path, 'utf8')));
for (const contractManifest of contractManifests) {
  assert.deepEqual(
    contractManifest.forms.map(({ id, routeId, endpoint, method, authentication, handlerOwner }) => ({ id, routeId, endpoint, method, authentication, handlerOwner })),
    expectedPublicForms,
    'Public intake forms must have an identical, explicit site-to-platform contract',
  );
}
assert(commercialInquirySource.includes(expectedPublicForms[1].endpoint), 'Commercial inquiry transport must use the declared CMS form endpoint');
const warnings = [];
const originalError = console.error;
console.error = (...args) => warnings.push(args.join(' '));
try {
  for (const path of paths) {
    const result = render(path);
    assert(result.head?.title && result.head.description, `${path}: metadata`);
    if (path === '/about') assert(result.html.includes('Land and Grounds Care With'), 'Fragment-based hero title uses title case');
    assert(result.head.title.length <= 60, `${path}: title must be 60 characters or fewer (${result.head.title.length})`);
    assert(result.head.description.length <= 160, `${path}: description must be 160 characters or fewer (${result.head.description.length})`);
    assert(result.fields.page.seoTitle && result.fields.page.seoDescription && result.fields.page.seoImage, `${path}: editable SEO`);
    if (path === "/") assert(/href="\/contact"[^>]*class="[^"]*inline-flex|class="[^"]*inline-flex[^>]*href="\/contact"/.test(result.html), "Slot CTA must retain button styling");
    assert(!/Marcus T\.|50-Acre Forestry|P1 took over our|fill-current|Est\. 2009|±0\.1/.test(result.html), `${path}: unverified proof`);
    assert(!/Yes\. P1 is licensed and insured for commercial work|Licensed and insured for commercial work/.test(result.html), `${path}: unsupported commercial credential claim`);
    assert(!/never need to call anyone else|Free on-site property assessments|One contractor\. No gaps\./.test(result.html), `${path}: unsupported universal service claim`);
    assert(!residentialOfferPattern.test(result.html), `${path}: must not advertise residential work`);
    for (const match of result.html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const pathname = href.split('?')[0].replace(/\/$/, '') || '/';
      if (/\.[a-z0-9]{2,8}$/i.test(pathname)) {
        assertLocalAssetLink(path, href);
        continue;
      }
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
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: one heading`);
    assert(html.includes('href="#main-content"'), `${path}: skip link`);
    const main = html.match(/<main\b[^>]*\bid="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert(main, `${path}: main landmark`);
    const headings = [...main.matchAll(/<h([1-6])\b[^>]*>/g)].map((match) => Number(match[1]));
    assert.equal(headings[0], 1, `${path}: main starts with h1`);
    assert(!headings.some((level, index) => index > 0 && level - headings[index - 1] > 1), `${path}: heading level jump`);
    for (const image of main.matchAll(/<img\b[^>]*>/g)) assert(/\balt="[^"]*"/.test(image[0]) || /\baria-hidden="true"/.test(image[0]), `${path}: image alternative text`);
    for (const control of main.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
      const markup = control[0];
      if (/\btype="hidden"|\baria-hidden="true"/.test(markup)) continue;
      const id = markup.match(/\bid="([^"]+)"/)?.[1];
      const before = main.slice(0, control.index);
      const isWrappedByLabel = before.lastIndexOf('<label') > before.lastIndexOf('</label>')
        && main.indexOf('</label>', control.index) !== -1;
      const hasAccessibleName = /\baria-label="[^"]+"|\baria-labelledby="[^"]+"/.test(markup)
        || isWrappedByLabel
        || (id ? new RegExp(`<label\\b[^>]*\\bfor="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(main) : false);
      assert(hasAccessibleName, `${path}: visible ${control[1]} must have a programmatic label`);
    }
    for (const image of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const src = image[1].split('?')[0];
      assert(!/\.(?:png|jpe?g|avif)$/i.test(src), `${path}: public raster image must use WebP (${src})`);
    }
    for (const srcSet of html.matchAll(/\bsrcSet="([^"]+)"/g)) {
      assert(!/\.(?:png|jpe?g|avif)(?:\s|,|$)/i.test(srcSet[1]), `${path}: responsive image candidates must use WebP`);
    }
    for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      assert(match[0].includes('data-seo-jsonld'), `${path}: schema cleanup marker`);
      const jsonLd = JSON.parse(match[1]);
      if (jsonLd['@type'] === 'LandscapingBusiness') {
        assert.equal(jsonLd.logo, companyIconUrl, `${path}: business schema uses the P1 symbol`);
        assert.equal(jsonLd.image, 'https://www.p1landmanagement.com/opengraph.jpg', `${path}: business schema retains its social image`);
      }
      if (jsonLd['@type'] === 'Article') {
        assert.equal(jsonLd.publisher?.logo?.url, companyIconUrl, `${path}: article publisher uses the P1 symbol`);
      }
    }
    if (html.includes('"@type":"FAQPage"')) {
      assert(html.includes('data-content-type="faq"'), `${path}: FAQ content is semantically labelled`);
      const faqItems = [...html.matchAll(/<details\b[^>]*\bdata-faq-item(?:="")?[^>]*>/g)];
      assert(faqItems.length > 0, `${path}: FAQPage uses native accordion items`);
      for (const item of faqItems) assert(!/\bopen(?:=|\s|>)/.test(item[0]), `${path}: FAQ answers are collapsed initially`);
    }
  }
  assert(routeSource.includes('<Route path="/forms/:slug" component={PublicForm} />'), 'Standalone form route must remain explicit');
  for (const path of ['/forms/p1-estimate', '/forms/p1-commercial-assessment', '/forms/example-form']) {
    const result = render(path);
    assert.equal(result.head?.noindex, true, `${path}: standalone form must not be indexed`);
    assert(result.html.includes('Complete Your Request'), `${path}: standalone form route must render its public shell`);
    assert(!result.html.includes('Looks Like This Ground'), `${path}: standalone form route must not render the 404 page`);
  }
  assert(render('/forms/not/a-form').html.includes('Looks Like This Ground'), 'Malformed standalone form path must remain a 404');
  const home = render('/');
  assert(home.html.includes('data-component="cta-band"'), 'Homepage must retain its final CTA band');
  assert(!home.html.includes('related-pages-heading'), 'Homepage must not render an empty related-links section');
  // These fields are registered for the editor but not rendered on the Home
  // document. Keep both their stable keys and reasons explicit so a newly hidden
  // global cannot silently escape the override audit.
  const intentionallyHiddenGlobalFields = new Map([
    ['f15oz4jr', 'phone display is supplied by the locked site-identity record'],
    ['f9spy6u', 'phone link is supplied by the locked site-identity record'],
    ['f1jhcqx9', 'map destination is retained site-identity metadata'],
    ['f1hf0vxg', 'Services heading is only rendered within a closed navigation branch'],
    ['f5fayod', 'Service Areas heading is only rendered within a closed navigation branch'],
    ['fgf0583', 'Company heading is only rendered within a closed navigation branch'],
    ['fl6vzc3', 'Hours heading is only rendered within a closed navigation branch'],
  ]);
  const supportedGlobalTypes = new Set(['text', 'textarea', 'image', 'imageAlt', 'ctaTarget']);
  for (const [key, item] of Object.entries(home.fields.global).filter(([, item]) => supportedGlobalTypes.has(item.field.type))) {
    const type = item.field.type;
    const replacement = type === 'image' ? '/qa-global.webp'
      : type === 'imageAlt' ? 'QA global image alternative'
        : type === 'ctaTarget' ? '/contact?global=1'
          : `QA global ${type} ${key}`;
    const edited = render('/', { route: '/', content: {}, global: { [key]: replacement } });
    const editedOutput = edited.html + JSON.stringify(edited.head);
    if (intentionallyHiddenGlobalFields.has(key)) {
      assert(!editedOutput.includes(replacement), `${key}: hidden-global classification must remain accurate (${intentionallyHiddenGlobalFields.get(key)})`);
      continue;
    }
    assertGlobalOverride(key, type, editedOutput, replacement);
    if (type === 'image' || type === 'ctaTarget') {
      assert(!render('/', { route: '/', content: {}, global: { [key]: 'javascript:alert(1)' } }).html.includes('javascript:alert'), `${key}: unsafe ${type} rejected`);
    }
  }
  const edited = render('/contact', { route: '/contact', content: { seoTitle: 'QA SEO title', seoDescription: 'QA description', seoImage: '/qa.webp' }, global: {} });
  assert.equal(edited.head.title, 'QA SEO Title');
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
const budgetFailures = [];
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
  if (bytes > 150 * 1024)
    budgetFailures.push(`${key}: initial JS ${(bytes / 1024).toFixed(1)} KiB exceeds 150 KiB`);
}
assert.deepEqual(budgetFailures, [], budgetFailures.join('\n'));
console.log(`PASS ${paths.length} routes: SSR, metadata, CMS text/image/link overrides, internal links, proof, FAQ accordion/JSON-LD and no React warnings.`);
console.log(`PASS initial JS <=150 KiB gzip; largest ${worst.route}: ${(worst.bytes / 1024).toFixed(1)} KiB.`);

// A service hero replacement must also reach its discovery cards and gallery.
await import('./check-service-images.mjs');
