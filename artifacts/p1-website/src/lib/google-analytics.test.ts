import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGoogleAnalytics } from './google-analytics.ts';

function configuration(measurementId: string | null = 'G-TEST123', source = 'managed') {
  globalThis.fetch = async () => Response.json({schemaVersion:1,googleAnalytics:{source,measurementId}});
}

function browser(href = 'https://www.p1landmanagement.com/?email=private@example.com') {
  const scripts: unknown[] = [];
  const fakeWindow = { location: { href }, dataLayer: [] as unknown[] };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    referrer: 'https://example.com/private?token=secret',
    createElement: () => ({}), head: { appendChild: (script: unknown) => scripts.push(script) },
  } });
  return { fakeWindow, scripts, calls: () => fakeWindow.dataLayer.map(value => Array.from(value as ArrayLike<unknown>)) };
}

test('initial and SPA page views send once without query strings or sensitive referrers', async () => {
  configuration();
  const b = browser(); const track = createGoogleAnalytics();
  await track(); await track();
  b.fakeWindow.location.href = 'https://www.p1landmanagement.com/contact?message=private#secret';
  await track();
  assert.equal(b.scripts.length, 1);
  const events = b.calls().filter(call => call[0] === 'event');
  assert.equal(events.length, 2);
  assert.deepEqual(events[1], ['event', 'page_view', {
    send_to: 'G-TEST123',
    page_location: 'https://www.p1landmanagement.com/contact',
    page_referrer: 'https://www.p1landmanagement.com/', page_title: '/contact',
  }]);
  const serialized = JSON.stringify(b.calls());
  assert.ok(!serialized.includes('private')); assert.ok(!serialized.includes('secret'));
  const config = b.calls().find(call => call[0] === 'config')![2] as Record<string, unknown>;
  assert.equal(config.send_page_view, false); assert.equal(config.allow_google_signals, false);
});

test('missing/invalid IDs, staging, admin and CMS previews send nothing', async () => {
  for (const id of [null, '', 'G-<script>']) {
    configuration(id); const b = browser(); await createGoogleAnalytics()(); assert.equal(b.calls().length, 0);
  }
  for (const url of ['http://localhost:4173/', 'https://staging.up.railway.app/', 'https://www.p1landmanagement.com/admin/login', 'https://www.p1landmanagement.com/?cmsPreview=private']) {
    configuration(); const b = browser(url); await createGoogleAnalytics()();
    assert.equal(b.calls().length, 0); assert.equal(b.scripts.length, 0);
  }
});


test('disabled or unavailable runtime config never falls back to a previous build ID', async () => {
  configuration('G-TEST123', 'disabled');
  const b = browser(); await createGoogleAnalytics()();
  assert.equal(b.scripts.length, 0);
  globalThis.fetch = async () => { throw new Error('unavailable'); };
  await createGoogleAnalytics()(); assert.equal(b.scripts.length, 0);
});

test('saved replacement applies to a new document without duplicate page views', async () => {
  configuration('G-NEW123'); const b = browser(); const track = createGoogleAnalytics();
  await Promise.all([track(), track()]);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.calls().filter(call => call[0] === 'event').length, 1);
  assert.equal(b.calls().find(call => call[0] === 'config')![1], 'G-NEW123');
});


test('navigation to a preview cancels pending tracking', async () => {
  let resolve!: (response: Response) => void;
  globalThis.fetch = () => new Promise<Response>(r => { resolve = r; });
  const b = browser(); const track = createGoogleAnalytics(); const pending = track();
  b.fakeWindow.location.href = 'https://www.p1landmanagement.com/?cmsPreview=private';
  await track();
  resolve(Response.json({schemaVersion:1,googleAnalytics:{source:'managed',measurementId:'G-TEST123'}}));
  await pending; assert.equal(b.scripts.length, 0);
});
