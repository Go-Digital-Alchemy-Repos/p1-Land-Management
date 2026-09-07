import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createContentStore } from './content.mjs';

const definition = key => ({ key, defaultContent: { title: 'Original', image: '/default.webp', link: '/contact' }, fields: [
  { path: 'title', type: 'text', maxLength: 40 }, { path: 'image', type: 'image' }, { path: 'link', type: 'ctaTarget' },
] });
const manifest = { routes: [{ path: '/', id: 'home' }], puck: { editableComponents: [definition('home-content'), definition('site-chrome')] } };
const reply = (url, overrides = {}, etag = '"revision-1"') => {
  const key = new URL(url).pathname.split('/').at(-1);
  return Response.json({ stackId: 'p1-land-management', routeId: 'home', componentKey: key, revision: 1, publishedAt: '2026-09-07T12:00:00Z', content: { title: 'Published' }, ...overrides }, { headers: { etag } });
};
const temp = async t => { const dir = await mkdtemp(path.join(os.tmpdir(), 'p1-content-test-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };

test('published content preserves revision, defaults, and unknown routes are absent', async () => {
  const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: async url => reply(url) });
  const snapshot = await store.snapshot('/');
  assert.equal(snapshot.revision, 1); assert.equal(snapshot.globalRevision, 1);
  assert.equal(snapshot.content.title, 'Published'); assert.equal(snapshot.content.image, '/default.webp');
  assert.equal(await store.snapshot('/admin'), null);
});

test('rejects foreign identity, invalid revision, unknown fields, unsafe images and links, invalid dates', async () => {
  const invalid = [{ stackId: 'foreign' }, { routeId: 'other' }, { componentKey: 'other' }, { revision: -1 }, { revision: '1' },
    { content: { surprise: 'field' } }, { content: { title: 'x'.repeat(41) } }, { content: { image: '//evil.example/a' } },
    { content: { image: '/\\evil.example/a' } }, { content: { link: 'javascript:alert(1)' } }, { content: { link: '/\\evil.example' } },
    { publishedAt: 'invalid' }];
  for (const value of invalid) {
    const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: async url => reply(url, value) });
    assert.equal((await store.snapshot('/')).revision, 0, JSON.stringify(value));
  }
});

test('ETag revalidation and invalidation replace published content', async () => {
  let phase = 0; const headers = [];
  const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: async (url, options) => {
    headers.push(options.headers);
    if (phase === 1) return new Response(null, { status: 304 });
    return reply(url, { revision: phase ? 2 : 1, content: { title: phase ? 'Second revision' : 'Published' } });
  } });
  await store.snapshot('/'); phase = 1; store.invalidate();
  assert.equal((await store.snapshot('/')).content.title, 'Published');
  assert.equal(headers.at(-1)['If-None-Match'], '"revision-1"');
  phase = 2; store.invalidate(); assert.equal((await store.snapshot('/')).content.title, 'Second revision');
});

test('last good persisted content survives process restart and backend outage', async t => {
  const cacheDir = await temp(t);
  await createContentStore({ manifest, origin: 'https://core.example', cacheDir, fetcher: async url => reply(url) }).snapshot('/');
  const offline = createContentStore({ manifest, origin: 'https://core.example', cacheDir, fetcher: async () => { throw new Error('offline'); } });
  assert.equal((await offline.snapshot('/')).content.title, 'Published');
});

test('corrupt or foreign persisted records never become public', async t => {
  const cacheDir = await temp(t);
  await writeFile(path.join(cacheDir, 'home--home-content.json'), JSON.stringify({ stackId: 'other', routeId: 'home', componentKey: 'home-content', revision: 9, content: { title: 'Foreign' } }));
  const store = createContentStore({ manifest, cacheDir, origin: 'https://core.example', fetcher: async () => { throw new Error('offline'); } });
  assert.equal((await store.snapshot('/')).content.title, 'Original');
});

test('failed cache writes do not roll back freshly accepted content', async t => {
  const dir = await temp(t); const cacheDir = path.join(dir, 'file'); await writeFile(cacheDir, 'not a directory');
  const store = createContentStore({ manifest, origin: 'https://core.example', cacheDir, fetcher: async url => reply(url) });
  assert.equal((await store.snapshot('/')).content.title, 'Published');
  assert.equal((await store.snapshot('/')).revision, 1);
});

test('concurrent page requests share in-flight content fetches', async () => {
  let calls = 0;
  const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: async url => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return reply(url); } });
  const responses = await Promise.all(Array.from({ length: 8 }, () => store.snapshot('/')));
  assert(responses.every(value => value.revision === 1)); assert.equal(calls, 2);
});

test('outage and malformed backend responses retain the last accepted snapshot', async () => {
  let failure;
  const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: async url => {
    if (failure === 'network') throw new Error('unreachable');
    if (failure === 'identity') return reply(url, { stackId: 'wrong' });
    if (failure === 'json') return new Response('invalid', { status: 200 });
    if (failure === 'status') return new Response('unavailable', { status: 503 });
    return reply(url);
  } });
  await store.snapshot('/');
  for (failure of ['network', 'identity', 'json', 'status']) {
    store.invalidate(); const snapshot = await store.snapshot('/');
    assert.equal(snapshot.revision, 1); assert.equal(snapshot.content.title, 'Published');
  }
});

test('publish invalidation during an in-flight fetch forces the next request to revalidate', async () => {
  const releases = []; let calls = 0; let hold = true;
  const store = createContentStore({ manifest, origin: 'https://core.example', fetcher: url => {
    calls++;
    return hold ? new Promise(resolve => releases.push(() => resolve(reply(url)))) : Promise.resolve(reply(url, { revision: 2 }));
  } });
  const initial = store.snapshot('/');
  store.invalidate(); hold = false; releases.forEach(release => release()); await initial;
  assert.equal((await store.snapshot('/')).revision, 2); assert.equal(calls, 4);
});

test('unconditional 304 and invalid persisted JSON degrade to seed safely', async t => {
  const cacheDir = await temp(t);
  await writeFile(path.join(cacheDir, 'home--home-content.json'), 'broken json');
  const store = createContentStore({ manifest, cacheDir, origin: 'https://core.example', fetcher: async () => new Response(null, { status: 304 }) });
  const snapshot = await store.snapshot('/'); assert.equal(snapshot.revision, 0); assert.equal(snapshot.content.title, 'Original');
});


test('all 35 routes stay within the routine Core read budget while publishing refreshes immediately', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  const routes = Array.from({ length: 35 }, (_, i) => ({ path: `/page-${i}`, id: `page-${i}` }));
  const full = { routes, puck: { editableComponents: [...routes.map(r => definition(`${r.id}-content`)), definition('site-chrome')] } };
  let calls = 0, revision = 1;
  const store = createContentStore({ manifest: full, origin: 'https://core.example', fetcher: async url => {
    calls++;
    const routeId = new URL(url).pathname.split('/').at(-2);
    return reply(url, { routeId, revision, content: { title: `Revision ${revision}` } });
  } });
  // Frequent visits to every route share the same private-network source IP.
  for (let elapsed = 0; elapsed < 15 * 60 * 1000; elapsed += 5000) {
    t.mock.timers.setTime(1_000_000 + elapsed);
    await Promise.all(routes.map(route => store.snapshot(route.path)));
  }
  assert.equal(calls, 144); // 36 components, four refresh rounds.
  revision = 2;
  store.invalidate();
  const published = await store.snapshot('/page-0');
  assert.equal(published.revision, 2);
  assert.equal(published.globalRevision, 2);
  assert.equal(published.content.title, 'Revision 2');
  assert.equal(calls, 146);
});
