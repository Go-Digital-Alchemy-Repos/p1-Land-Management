import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
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
    if (req.url.startsWith('/api/client-site-content/')) {
      const [routeId, componentKey] = req.url.split('/').slice(-2);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ stackId: 'p1-land-management', routeId, componentKey, revision: 77,
        publishedAt: '2026-09-07T12:00:00Z', content: componentKey === 'home-content' ? { seoTitle: 'QA Published Home', seoDescription: 'QA public description' } : {} }));
    } else if (req.url === '/admin/assets/dashboard-qa.js') {
      res.setHeader('Content-Type', 'text/javascript'); res.end('/* QA dashboard bundle */');
    } else if (req.url === '/admin') {
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

  await t.test('absolute and network-path targets reject without forwarding credentials', async () => {
    const before = upstreamRequests.length;
    for (const target of [`http://127.0.0.1:${trapPort}/api/secret`, `//127.0.0.1:${trapPort}/api/secret`]) {
      const response = await request(port, target, { Cookie: 'qa_session=private', Authorization: 'Bearer qa-private' });
      assert.equal(response.status, 400);
    }
    assert.equal(unexpectedRequests, 0); assert.equal(upstreamRequests.length, before);
  });
  await t.test('unknown public and CMS routes return genuine 404', async () => {
    const missing = await request(port, '/not-a-p1-page'); assert.equal(missing.status, 404); assert.equal(missing.headers['x-robots-tag'], 'noindex');
    assert.equal((await request(port, '/api/p1/page-content?path=%2Fmissing')).status, 404);
  });
  await t.test('canonical redirects preserve query strings', async () => {
    for (const pathname of ['/contact/', '/contact.html', '/contact/index.html']) {
      const response = await request(port, `${pathname}?utm_source=qa`);
      assert.equal(response.status, 308); assert.equal(response.headers.location, '/contact?utm_source=qa');
    }
    const apex = await request(port, '/contact', { Host: 'p1landmanagement.com' });
    assert.equal(apex.status, 308); assert.equal(apex.headers.location, 'https://www.p1landmanagement.com/contact');
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
  });
  await t.test('favicon MIME, security headers and hashed-asset caching', async () => {
    const favicon = await request(port, '/favicon.svg'); assert.equal(favicon.status, 200); assert.equal(favicon.headers['content-type'], 'image/svg+xml');
    assert.equal(favicon.headers['x-content-type-options'], 'nosniff');
    const home = await request(port, '/');
    const asset = home.body.match(/<script[^>]*src="(\/assets\/[^"?]+\.js)"/); assert(asset, 'Public entry asset');
    const script = await request(port, asset[1]); assert.equal(script.status, 200);
    assert.equal(script.headers['cache-control'], 'public, max-age=31536000, immutable');
    const head = await request(port, asset[1], {}, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, '');
  });
  await t.test('dashboard routes and assets proxy to configured upstream', async () => {
    const admin = await request(port, '/admin'); assert.equal(admin.status, 200); assert(admin.body.includes('QA private dashboard login'));
    const asset = await request(port, '/admin/assets/dashboard-qa.js'); assert.equal(asset.status, 200); assert.equal(asset.headers['content-type'], 'text/javascript');
    assert(upstreamRequests.some(item => item.path === '/admin/assets/dashboard-qa.js'));
  });
});
