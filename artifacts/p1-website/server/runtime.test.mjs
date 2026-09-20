import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const listen = async server => { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return server.address().port; };
const request = (port, path, headers = {}, method = 'GET') => new Promise((resolveResponse, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path, method, headers }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolveResponse({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    res.on('error', reject);
  });
  req.setTimeout(5000, () => req.destroy(new Error('Request timeout'))); req.on('error', reject); req.end();
});

test('production HTTP routes and proxy boundaries against local upstream', { timeout: 20000 }, async t => {
  const upstreamRequests = [];
  const upstream = http.createServer((req, res) => {
    upstreamRequests.push({ path: req.url, headers: req.headers });
    if (req.url === '/api/p1/website-menus') {
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',revision:'b'.repeat(64),locations:{main_navigation:{id:'qa-main',version:3,items:[{id:'qa-link',label:'QA Published Menu',url:'/contact',action:'internal-link',openInNewTab:false,formSlug:null,modalTitle:null,modalDescription:null,children:[]}]},p1_footer_services:null,p1_footer_service_areas:null,p1_footer_company:{id:'qa-empty',version:1,items:[]}}}));
    }
    if (req.url === '/api/p1/website-redirects') {
      const redirects = [
        {fromPath:'/old-cms-page',toPath:'/contact',statusCode:301},
        {fromPath:'/about',toPath:'/contact',statusCode:302},
      ];
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',version:createHash('sha256').update(JSON.stringify(redirects)).digest('hex'),redirects}));
    }
    if (req.url === '/api/p1/website-robots') {
      const content='User-agent: FixtureBot\nDisallow: /fixture-only\n';
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',version:createHash('sha256').update(content).digest('hex'),content}));
    }
    if (req.url === '/api/p1/website-identity') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',version:'a'.repeat(64),companyName:'QA Identity Company',companyAddress:null,phoneDisplay:'(704) 555-1234',phoneHref:'tel:+17045551234',logoUrl:'/r2/cms/branding/qa.webp',faviconUrl:'/r2/cms/branding/icon.webp',googleBusinessUrl:'https://www.google.com/maps/place/QA'}));
    } else if (req.url === '/api/p1/website-social') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',iconStyle:'outline',links:[{platform:'facebook',url:'https://example.test/profile'}]}));
    } else if (req.url === '/api/p1/website-fonts') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',body:{name:'Inter',fallback:'sans-serif'},heading:{name:'Lora',fallback:'serif'}}));
    } else if (req.url === '/api/p1/website-colors') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',colors:{brand_primary_color:'#FF0000',text_h1_color:'#123456'}}));
    } else if (req.url === '/api/p1/website-head-tags') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,stackId:'p1-land-management',html:'<meta name="p1-head-fixture" content="literal $&"><script>window.syntheticHeadRan=true</script>'}));
    } else if (req.url.startsWith('/api/client-site-content/')) {
      const [routeId, componentKey] = req.url.split('/').slice(-2);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ stackId: 'p1-land-management', routeId, componentKey, revision: 77,
        publishedAt: '2026-09-07T12:00:00Z', content: componentKey === 'home-content' ? { seoTitle: 'QA Published Home', seoDescription: 'QA public description' } : {} }));
    } else if (req.url === '/admin/assets/dashboard-qa.js') {
      res.setHeader('Content-Type', 'text/javascript'); res.end('/* QA dashboard bundle */');
    } else if (req.url === '/admin') {
      res.writeHead(301, { Location: '/admin/' }); res.end();
    } else if (req.url === '/admin/') {
      res.setHeader('Content-Type', 'text/html'); res.end('<main>QA private dashboard login</main>');
    } else { res.statusCode = 404; res.end('No mock endpoint'); }
  });
  const upstreamPort = await listen(upstream);
  t.after(() => new Promise(resolveClose => upstream.close(resolveClose)));
  let unexpectedRequests = 0;
  const trap = http.createServer((req, res) => { unexpectedRequests++; res.end('Unexpected target'); });
  const trapPort = await listen(trap);
  t.after(() => new Promise(resolveClose => trap.close(resolveClose)));
  const reservation = http.createServer(); const port = await listen(reservation);
  await new Promise(resolveClose => reservation.close(resolveClose));
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: root, env: { ...process.env, NODE_ENV: 'production', PORT: String(port), P1_CORE_ORIGIN: `http://127.0.0.1:${upstreamPort}`, P1_CONTENT_CACHE_DIR: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => { if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } });
  let diagnostics = '';
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Public server startup timed out: ${diagnostics}`)), 10000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Public server exited ${code}: ${diagnostics}`)); });
    child.stdout.on('data', chunk => { if (String(chunk).includes('P1 website listening')) { clearTimeout(timer); resolveReady(); } });
  });

  await t.test('public form proxy preserves the Turnstile token outside the submission body', async () => {
    await request(port, '/api/forms/p1-estimate/submit', { 'X-Turnstile-Token': 'synthetic-challenge-token' }, 'POST');
    const forwarded = upstreamRequests.find(item => item.path === '/api/forms/p1-estimate/submit');
    assert.equal(forwarded?.headers['x-turnstile-token'], 'synthetic-challenge-token');
  });
  await t.test('one identity revision drives SSR, serialized hydration and navigation without credential forwarding',async()=>{
    const page=await request(port,'/',{Cookie:'private',Authorization:'Bearer private'});
    assert.equal(page.status,200);
    assert(page.body.includes('QA Identity Company'));
    assert(page.body.includes('tel:+17045551234'));
    const telephoneLinks=[...page.body.matchAll(/<a[^>]*href="(tel:[^"]+)"/g)].map(match=>match[1]);
    assert(telephoneLinks.length>=3);assert(telephoneLinks.every(href=>href==='tel:+17045551234'));
    assert(page.body.includes('/r2/cms/branding/qa.webp'));
    assert(page.body.includes('/r2/cms/branding/icon.webp?v='+'a'.repeat(64)));
    const serialized=JSON.parse(page.body.match(/<script type="application\/json" id="p1-published-content">([\s\S]*?)<\/script>/)[1]);
    const navigation=JSON.parse((await request(port,'/api/p1/page-content?path=/contact')).body);
    assert.deepEqual(navigation.identity,serialized.identity);
    assert.equal(serialized.identity.version,'a'.repeat(64));
    const reads=upstreamRequests.filter(r=>r.path==='/api/p1/website-identity');assert.equal(reads.length,1);assert.equal(reads[0].headers.cookie,undefined);assert.equal(reads[0].headers.authorization,undefined);
  });
  await t.test('published menus use the same SSR, hydration and navigation snapshot without private credentials',async()=>{
    const page=await request(port,'/',{Cookie:'private',Authorization:'Bearer private'});
    const serialized=JSON.parse(page.body.match(/<script type="application\/json" id="p1-published-content">([\s\S]*?)<\/script>/)[1]);
    assert(page.body.includes('QA Published Menu'));
    assert.equal(serialized.menus.revision,'b'.repeat(64));
    assert.deepEqual(serialized.menus.locations.p1_footer_company.items,[]);
    const navigation=JSON.parse((await request(port,'/api/p1/page-content?path=/contact')).body);
    assert.deepEqual(navigation.menus,serialized.menus);
    const reads=upstreamRequests.filter(r=>r.path==='/api/p1/website-menus');
    assert.equal(reads.length,1);assert.equal(reads[0].headers.cookie,undefined);assert.equal(reads[0].headers.authorization,undefined);
  });
  await t.test('global head markup appears only on public documents without expanding CSP',async()=>{
    const page=await request(port,'/');
    assert.equal(page.status,200);assert(page.body.includes('<meta name="p1-head-fixture" content="literal $&">'));
    assert(page.body.indexOf('name="p1-head-fixture"')<page.body.indexOf('</head>'));
    assert(!page.headers['content-security-policy'].includes("script-src 'self' 'unsafe-inline'"));
    assert(!page.headers['content-security-policy'].includes('sha256-'));
    const preview=await request(port,'/?cmsPreview=1');assert(!preview.body.includes('p1-head-fixture'));
    const admin=await request(port,'/admin/');assert(!admin.body.includes('p1-head-fixture'));
    const requests=upstreamRequests.filter(r=>r.path==='/api/p1/website-head-tags');assert.equal(requests.length,1);assert.equal(requests[0].headers.cookie,undefined);assert.equal(requests[0].headers.authorization,undefined);
  });
  await t.test('public palette reaches public and preview documents without visitor credentials or admin leakage',async()=>{
    for(const route of ['/', '/?cmsPreview=1']){const response=await request(port,route);assert(response.body.includes('id="p1-website-colors"'));assert(response.body.includes('id="p1-website-fonts"'));assert(response.body.includes('--primary:0 100% 50%'));assert(response.body.includes('h1{color:#123456}'));}
    for(const route of ['/admin/','/not-a-page','/api/p1/page-content?path=%2F'])assert(!(await request(port,route)).body.includes('id="p1-website-colors"'));
    const fontReads=upstreamRequests.filter(r=>r.path==='/api/p1/website-fonts');assert.equal(fontReads.length,1);assert.equal(fontReads[0].headers.cookie,undefined);assert.equal(fontReads[0].headers.authorization,undefined);
    const reads=upstreamRequests.filter(r=>r.path==='/api/p1/website-colors');assert.equal(reads.length,1);assert.equal(reads[0].headers.cookie,undefined);assert.equal(reads[0].headers.authorization,undefined);
  });
  await t.test('draft typography is stateless, no-store, non-indexable and framed only by the approved editor',async()=>{
    const before=upstreamRequests.length;
    const response=await request(port,'/cms-preview/typography?body=Inter&bodyType=sans-serif&heading=Lora&headingType=serif');
    assert.equal(response.status,200);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.headers['x-robots-tag'],'noindex, nofollow');assert.equal(response.headers['referrer-policy'],'no-referrer');assert.equal(response.headers['x-frame-options'],undefined);
    assert(response.headers['content-security-policy'].includes("script-src 'none'"));assert(response.headers['content-security-policy'].includes("frame-ancestors 'self' https://dashboard.p1landmanagement.com"));
    assert(response.body.includes("--app-font-display:'Lora',serif"));assert(!response.body.includes('p1-head-fixture'));assert(!response.body.includes('id="p1-website-colors"'));
    assert.equal(upstreamRequests.length,before);
    const bad=await request(port,'/cms-preview/typography?body=%3Cscript%3E&bodyType=serif');assert.equal(bad.status,400);assert(!bad.body.includes('<script>'));
    assert.equal((await request(port,'/cms-preview/typography',{},'POST')).status,405);
  });
  await t.test('footer social projection is credential-free, no-store and rejects queries and writes',async()=>{
    const response=await request(port,'/api/p1/social-links',{Cookie:'private-session',Authorization:'Bearer private'});
    assert.equal(response.status,200);assert.equal(response.headers['cache-control'],'no-store');assert.deepEqual(JSON.parse(response.body),{iconStyle:'outline',links:[{platform:'facebook',url:'https://example.test/profile'}]});
    const reads=upstreamRequests.filter(r=>r.path==='/api/p1/website-social');assert.equal(reads.length,1);assert.equal(reads[0].headers.cookie,undefined);assert.equal(reads[0].headers.authorization,undefined);
    assert.equal((await request(port,'/api/p1/social-links?key=secret')).status,400);assert.equal((await request(port,'/api/p1/social-links',{},'POST')).status,405);
  });
  await t.test('absolute and network-path targets reject without forwarding credentials', async () => {
    const before = upstreamRequests.length;
    for (const target of [`http://127.0.0.1:${trapPort}/api/secret`, `//127.0.0.1:${trapPort}/api/secret`, '/%E0%A4%A']) {
      const response = await request(port, target, { Cookie: 'qa_session=private', Authorization: 'Bearer qa-private' });
      assert.equal(response.status, 400);
    }
    assert.equal(unexpectedRequests, 0); assert.equal(upstreamRequests.length, before);
  });
  await t.test('map requests are allowed after direct and client-side directory navigation', async () => {
    for (const pathname of ['/', '/service-areas']) {
      const response = await request(port, pathname);
      assert.equal(response.status, 200);
      const policy = response.headers['content-security-policy'];
      assert.match(policy, /connect-src 'self' https:\/\/tiles\.openfreemap\.org(?: |;)/);
      assert.match(policy, /frame-src 'self' https:\/\/challenges\.cloudflare\.com;/);
      assert.match(policy, /script-src 'self' https:\/\/www\.googletagmanager\.com https:\/\/challenges\.cloudflare\.com;/);
      assert.doesNotMatch(policy, /unsafe-eval|https:\/\/\*/);
    }
    const directory = await request(port, '/service-areas');
    const html = directory.body.replace(/<!--.*?-->/g, '');
    const mapHeading = html.indexOf('Find Your Service Area');
    assert(mapHeading >= 0 && mapHeading < html.indexOf('Upstate South Carolina</h2>'));
    assert(html.includes('Browse all 30 service locations'));
    const locations = JSON.parse(await readFile(resolve(root, 'src/lib/service-locations.json'), 'utf8'));
    const routes = await readFile(resolve(root, 'src/app-routes.tsx'), 'utf8');
    const expected = [...routes.matchAll(/<Route\s+path="(\/service-areas\/[^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(locations.map(location => location.path).sort(), expected.sort());
    for (const location of locations) {
      assert(html.includes(`href="${location.path}"`));
      const [longitude, latitude] = location.coordinates;
      assert(Number.isFinite(longitude) && longitude > -84 && longitude < -79);
      assert(Number.isFinite(latitude) && latitude > 34 && latitude < 37);
    }
  });
  await t.test('unknown public and CMS routes return genuine 404', async () => {
    const missing = await request(port, '/not-a-p1-page'); assert.equal(missing.status, 404); assert.equal(missing.headers['x-robots-tag'], 'noindex');
    assert.equal((await request(port, '/api/p1/page-content?path=%2Fmissing')).status, 404);
  });
  await t.test('CMS redirects govern GET/HEAD, preserve queries, and stay out of the sitemap', async () => {
    for (const method of ['GET','HEAD']) {
      const response = await request(port, '/old-cms-page?utm_source=qa&x=%2F&x=2', {}, method);
      assert.equal(response.status, 301);
      assert.equal(response.headers.location, '/contact?utm_source=qa&x=%2F&x=2');
      if(method==='HEAD')assert.equal(response.body,'');
    }
    assert.equal((await request(port,'/old-cms-page',{},'POST')).status,405);
    assert.equal((await request(port,'/about')).status,302);
    const sitemap=await request(port,'/sitemap.xml');
    assert.equal(sitemap.status,200);
    assert(!sitemap.body.includes('<loc>https://www.p1landmanagement.com/about</loc>'));
    assert(sitemap.body.includes('<loc>https://www.p1landmanagement.com/contact</loc>'));
    const projection=await request(port,'/api/p1/website-redirects',{Cookie:'private',Authorization:'Bearer private'});
    assert.equal(projection.status,200);
    assert.equal(projection.headers['cache-control'],'no-store');
    assert.equal(JSON.parse(projection.body).redirects.length,2);
    assert.equal((await request(port,'/api/p1/website-redirects?path=/about')).status,400);
    assert.equal((await request(port,'/api/p1/website-redirects',{},'POST')).status,405);
    const reads=upstreamRequests.filter(r=>r.path==='/api/p1/website-redirects');
    assert.equal(reads.length,1);
    assert.equal(reads[0].headers.cookie,undefined);
    assert.equal(reads[0].headers.authorization,undefined);
  });
  await t.test('canonical redirects preserve query strings', async () => {
    for (const pathname of ['/contact/', '/contact.html', '/contact/index.html']) {
      const response = await request(port, `${pathname}?utm_source=qa`);
      assert.equal(response.status, 308); assert.equal(response.headers.location, '/contact?utm_source=qa');
    }
    const apex = await request(port, '/contact', { Host: 'p1landmanagement.com' });
    assert.equal(apex.status, 308); assert.equal(apex.headers.location, 'https://www.p1landmanagement.com/contact');
    const legacyService = await request(port, '/services/commercial-property-management?utm_source=qa');
    assert.equal(legacyService.status, 301);
    assert.equal(legacyService.headers.location, '/services/commercial-landscaping?utm_source=qa');
    const consolidatedCharlotte = await request(port, '/service-areas/charlotte-nc?utm_source=qa');
    assert.equal(consolidatedCharlotte.status, 301);
    assert.equal(consolidatedCharlotte.headers.location, '/service-areas/charlotte-north-carolina?utm_source=qa');
    const renamedService = await request(port, '/services/commercial-landscaping');
    assert.equal(renamedService.status, 200);
    assert(renamedService.body.includes('Commercial Landscaping'));
    const setup = await request(port, '/setup/?utm_source=owner-invite');
    assert.equal(setup.status, 308);
    assert.equal(setup.headers.location, '/admin/setup?utm_source=owner-invite');
    assert.equal(setup.headers['x-robots-tag'], 'noindex, nofollow');
  });
  await t.test('snow service redirects permanently and preserves inquiry context', async () => {
    const old = await request(port, '/commercial-snow-ice-management?utm_source=winter');
    assert.equal(old.status, 301);
    assert.equal(old.headers.location, '/services/commercial-snow-ice-management?utm_source=winter');
    const current = await request(port, '/services/commercial-snow-ice-management');
    assert.equal(current.status, 200);
    assert(current.body.includes('Get a Free Site Assessment'));
  });

  await t.test('retired testimonials page permanently redirects to Contact', async () => {
    const response = await request(port, '/testimonials?utm_source=qa');
    assert.equal(response.status, 301);
    assert.equal(response.headers.location, '/contact?utm_source=qa');
    const apex = await request(port, '/testimonials/', { Host: 'p1landmanagement.com' });
    assert.equal(apex.status, 301);
    assert.equal(apex.headers.location, 'https://www.p1landmanagement.com/contact');
  });
  await t.test('HTML and hydration state share a published revision without fetching drafts', async () => {
    const response = await request(port, '/'); assert.equal(response.status, 200);
    assert(response.body.includes('<title>QA Published Home</title>'));
    const state = response.body.match(/<script type="application\/json" id="p1-published-content">([\s\S]*?)<\/script>/);
    assert(state, 'Published hydration state'); const parsed = JSON.parse(state[1]);
    assert.equal(parsed.revision, 77); assert.equal(parsed.content.seoTitle, 'QA Published Home');
    const snapshot = await request(port, '/api/p1/page-content?path=%2F');
    assert.equal(snapshot.headers['cache-control'], 'no-store'); assert.equal(JSON.parse(snapshot.body).revision, 77);
    assert(!upstreamRequests.some(item => /draft|preview/.test(item.path)));
    assert(!/<script[^>]+src="[^"]*(?:admin|dashboard)/.test(response.body));
    const preview = await request(port, '/?cmsPreview=1'); assert.equal(preview.headers['x-robots-tag'], 'noindex, nofollow');
    assert.equal(preview.headers['x-frame-options'], undefined);
    assert(preview.headers['content-security-policy'].includes("frame-ancestors 'self' https://dashboard.p1landmanagement.com;"));
    assert.equal(preview.headers['cache-control'], 'private, no-store');
    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
    assert(!response.headers['content-security-policy'].includes('dashboard.p1landmanagement.com'));
    const unknown = await request(port, '/not-a-page?cmsPreview=1');
    assert.equal(unknown.headers['x-frame-options'], 'SAMEORIGIN');
    assert(!unknown.headers['content-security-policy'].includes('dashboard.p1landmanagement.com'));
  });
  await t.test('Google reviews endpoint fails closed until server credentials are configured', async () => {
    const response = await request(port, '/api/p1/google-reviews');
    assert.equal(response.status, 503);
    assert.equal(response.headers['content-type'], 'application/json');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
    assert.deepEqual(JSON.parse(response.body), { error: 'Reviews are temporarily unavailable.' });
  });
  await t.test('favicon MIME, security headers and hashed-asset caching', async () => {
    const favicon = await request(port, '/favicon.svg'); assert.equal(favicon.status, 200); assert.equal(favicon.headers['content-type'], 'image/svg+xml');
    assert.equal(favicon.headers['x-content-type-options'], 'nosniff');
    const faviconIco = await request(port, '/favicon.ico'); assert.equal(faviconIco.status, 200); assert.equal(faviconIco.headers['content-type'], 'image/x-icon');
    const home = await request(port, '/');
    const asset = home.body.match(/<script[^>]*src="(\/assets\/[^"?]+\.js)"/); assert(asset, 'Public entry asset');
    const script = await request(port, asset[1]); assert.equal(script.status, 200);
    assert.equal(script.headers['cache-control'], 'public, max-age=31536000, immutable');
    const head = await request(port, asset[1], {}, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, '');
  });
  await t.test('production only serves indexable public documents on the canonical host', async () => {
    const health = await request(port, '/healthz', { Host: 'healthcheck.railway.app' });
    assert.equal(health.status, 200);
    assert.equal(health.headers.location, undefined);
    assert.deepEqual(JSON.parse(health.body), { status: 'ok' });
    const home = await request(port, '/', { Host: 'www.p1landmanagement.com' });
    assert.equal(home.status, 200);
    assert.equal(home.headers['x-robots-tag'], undefined);
    assert(home.body.includes('name="robots" content="index, follow"'));
    const railwayAlias = await request(port, '/contact/?utm_source=qa', { Host: 'p1-land-management-production.up.railway.app' });
    assert.equal(railwayAlias.status, 308);
    assert.equal(railwayAlias.headers.location, 'https://www.p1landmanagement.com/contact?utm_source=qa');
    const robots = await request(port, '/robots.txt', { Host: 'www.p1landmanagement.com' });
    assert.equal(robots.status, 200);
    assert.equal(robots.body, 'User-agent: FixtureBot\nDisallow: /fixture-only\n');
    assert.equal(robots.headers['cache-control'], 'no-cache');
    assert.equal((await request(port, '/robots.txt', { Host: 'www.p1landmanagement.com' }, 'HEAD')).body, '');
    assert(!/^Disallow:\s*\/\s*$/m.test(robots.body), 'Production robots must not block the entire site');
    const preview = await request(port, '/?cmsPreview=1', { Host: 'www.p1landmanagement.com' });
    assert.equal(preview.headers['x-robots-tag'], 'noindex, nofollow');
  });
  await t.test('dashboard routes and assets proxy to configured upstream', async () => {
    let adminPath = '/admin'; let admin;
    for (let hop = 0; hop < 4; hop++) {
      admin = await request(port, adminPath);
      if (![301,302,307,308].includes(admin.status)) break;
      adminPath = admin.headers.location;
    }
    assert.equal(adminPath, '/admin/'); assert.equal(admin.status, 200); assert(admin.body.includes('QA private dashboard login'));
    assert.equal(admin.headers['x-robots-tag'], 'noindex, nofollow');
    const asset = await request(port, '/admin/assets/dashboard-qa.js'); assert.equal(asset.status, 200); assert.equal(asset.headers['content-type'], 'text/javascript');
    assert.equal(asset.headers['x-robots-tag'], 'noindex, nofollow');
    assert(upstreamRequests.some(item => item.path === '/admin/assets/dashboard-qa.js'));
    for (const exactPath of ['/admin/cms/team/', '/admin/index.html', '/api/test/', '/uploads/photo.html', '/r2/photo.html']) {
      const response = await request(port, exactPath);
      assert.equal(response.headers.location, undefined, `Gateway must preserve ${exactPath}`);
      assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow', `Operational response stays out of search: ${exactPath}`);
      assert(upstreamRequests.some(item => item.path === exactPath));
    }
    const asset404 = await request(port, '/assets/missing.html');
    assert.equal(asset404.status, 404); assert.equal(asset404.headers.location, undefined);
    const apexAdmin = await request(port, '/admin/', { Host: 'p1landmanagement.com' });
    assert.equal(apexAdmin.headers.location, 'https://www.p1landmanagement.com/admin/');
  });
});

test('staging manifest blocks indexing across public and proxied responses regardless of Host', { timeout: 20000 }, async t => {
  const temporary = await mkdtemp(resolve(os.tmpdir(), 'p1-staging-runtime-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(resolve(temporary, 'server')); await mkdir(resolve(temporary, 'config'));
  await copyFile(resolve(root, 'server/index.mjs'), resolve(temporary, 'server/index.mjs'));
  await copyFile(resolve(root, 'server/head-tags.mjs'), resolve(temporary, 'server/head-tags.mjs'));
  await copyFile(resolve(root, 'server/website-colors.mjs'), resolve(temporary, 'server/website-colors.mjs'));
  await copyFile(resolve(root, 'server/website-fonts.mjs'), resolve(temporary, 'server/website-fonts.mjs'));
  await copyFile(resolve(root, 'server/public-settings.mjs'), resolve(temporary, 'server/public-settings.mjs'));
  await copyFile(resolve(root, 'server/website-identity.mjs'), resolve(temporary, 'server/website-identity.mjs'));
  await copyFile(resolve(root, 'server/website-blog.mjs'), resolve(temporary, 'server/website-blog.mjs'));
  await copyFile(resolve(root, 'server/website-menus.mjs'), resolve(temporary, 'server/website-menus.mjs'));
  await copyFile(resolve(root, 'server/website-robots.mjs'), resolve(temporary, 'server/website-robots.mjs'));
  await copyFile(resolve(root, 'server/website-redirects.mjs'), resolve(temporary, 'server/website-redirects.mjs'));
  await copyFile(resolve(root, 'server/website-social.mjs'), resolve(temporary, 'server/website-social.mjs'));
  await copyFile(resolve(root, 'server/typography-preview.mjs'), resolve(temporary, 'server/typography-preview.mjs'));
  await copyFile(resolve(root, 'server/content.mjs'), resolve(temporary, 'server/content.mjs'));
  await copyFile(resolve(root, 'server/client-ip.mjs'), resolve(temporary, 'server/client-ip.mjs')); 
  await copyFile(resolve(root, 'server/google-reviews.mjs'), resolve(temporary, 'server/google-reviews.mjs'));
  await copyFile(resolve(root, 'config/preview-origins.mjs'), resolve(temporary, 'config/preview-origins.mjs'));
  await symlink(resolve(root, 'dist'), resolve(temporary, 'dist'), 'dir');
  const manifest = JSON.parse(await readFile(resolve(root, 'config/client-site-manifest.json'), 'utf8'));
  manifest.origins.publicSite = 'https://p1-staging-example.up.railway.app';
  manifest.origins.admin = manifest.origins.publicSite;
  await writeFile(resolve(temporary, 'config/client-site-manifest.json'), JSON.stringify(manifest));
  const upstream = http.createServer((req, res) => {
    if (req.url.startsWith('/api/client-site-content/')) { res.statusCode = 503; res.end('Use published fallback'); return; }
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.end('Mock admin response');
  });
  const upstreamPort = await listen(upstream);
  t.after(() => new Promise(resolveClose => upstream.close(resolveClose)));
  const reservation = http.createServer(); const port = await listen(reservation);
  await new Promise(resolveClose => reservation.close(resolveClose));
  const child = spawn(process.execPath, [resolve(temporary, 'server/index.mjs')], {
    cwd: temporary, env: { ...process.env, NODE_ENV: 'production', PORT: String(port), P1_CORE_ORIGIN: `http://127.0.0.1:${upstreamPort}`, P1_CONTENT_CACHE_DIR: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => { if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } });
  let diagnostics = '';
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Staging server startup timed out: ${diagnostics}`)), 10000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Staging server exited ${code}: ${diagnostics}`)); });
    child.stdout.on('data', chunk => { if (String(chunk).includes('P1 website listening')) { clearTimeout(timer); resolveReady(); } });
  });
  for (const pathname of ['/', '/contact', '/?cmsPreview=1', '/sitemap.xml', '/api/p1/page-content?path=%2F', '/admin', '/admin/assets/example.js', '/not-a-page', '/favicon.svg']) {
    const response = await request(port, pathname, { Host: 'www.p1landmanagement.com' });
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow', pathname);
    if (pathname === '/') assert(response.body.includes('name="robots" content="noindex, nofollow"'));
  }
  const robots = await request(port, '/robots.txt', { Host: 'www.p1landmanagement.com' });
  assert.equal(robots.status, 200);
  assert.equal(robots.body, 'User-agent: *\nDisallow: /\n');
  assert.equal(robots.headers['content-type'], 'text/plain; charset=utf-8');
  assert.equal(robots.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal((await request(port, '/robots.txt', {}, 'HEAD')).body, '');
});
