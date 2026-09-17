import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGoogleAnalytics } from './google-analytics.ts';

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

test('initial and SPA page views send once without query strings or sensitive referrers', () => {
  const b = browser(); const track = createGoogleAnalytics('G-TEST123');
  track(); track();
  b.fakeWindow.location.href = 'https://www.p1landmanagement.com/contact?message=private#secret';
  track();
  assert.equal(b.scripts.length, 1);
  const events = b.calls().filter(call => call[0] === 'event');
  assert.equal(events.length, 2);
  assert.deepEqual(events[1], ['event', 'page_view', {
    page_location: 'https://www.p1landmanagement.com/contact',
    page_referrer: 'https://www.p1landmanagement.com/', page_title: '/contact',
  }]);
  const serialized = JSON.stringify(b.calls());
  assert.ok(!serialized.includes('private')); assert.ok(!serialized.includes('secret'));
  const config = b.calls().find(call => call[0] === 'config')![2] as Record<string, unknown>;
  assert.equal(config.send_page_view, false); assert.equal(config.allow_google_signals, false);
});

test('missing/invalid IDs, staging, admin and CMS previews send nothing', () => {
  for (const id of [undefined, '', 'G-<script>']) {
    const b = browser(); createGoogleAnalytics(id)(); assert.equal(b.calls().length, 0);
  }
  for (const url of ['http://localhost:4173/', 'https://staging.up.railway.app/', 'https://www.p1landmanagement.com/admin/login', 'https://www.p1landmanagement.com/?cmsPreview=private']) {
    const b = browser(url); createGoogleAnalytics('G-TEST123')();
    assert.equal(b.calls().length, 0); assert.equal(b.scripts.length, 0);
  }
});
