import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotForRoute, retainPublishedIdentity } from './cms-route-snapshot.ts';
const identity = { version: 'a', companyName: 'P1', companyAddress: null, phoneDisplay: null, phoneHref: null, logoUrl: '/logo.webp', faviconUrl: null, googleBusinessUrl: null };
const old = { route: '/', global: { published: 'chrome' }, content: { home: 'only home' }, identity };
test('route loading retains identity and chrome but not previous route content', () => {
  const next = snapshotForRoute(old, '/contact');
  assert.equal(next.identity, identity); assert.deepEqual(next.content, {}); assert.equal(next.global, old.global);
  assert.equal(snapshotForRoute(old, '/'), old);
});
test('successful route response without identity retains last valid identity', () => {
  const next = retainPublishedIdentity(old, { route: '/contact', global: {}, content: { title: 'Contact' } });
  assert.equal(next.identity, identity); assert.deepEqual(next.content, { title: 'Contact' });
  const cleared = { ...identity, version: 'b', companyName: null, logoUrl: null };
  assert.equal(retainPublishedIdentity(old, { ...next, identity: cleared }).identity, cleared);
});
