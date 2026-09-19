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

test('menu revision is retained during navigation, replaced by new publication, and explicitly cleared', () => {
  const menus = {schemaVersion: 1 as const, stackId: 'p1-land-management' as const, revision: 'a'.repeat(64), locations: {main_navigation: {id:'main',version:1,items:[]},p1_footer_services:null,p1_footer_service_areas:null,p1_footer_company:null}};
  const previous = {...old,menus};
  assert.equal(snapshotForRoute(previous,'/contact').menus, menus);
  const next = {route:'/contact',content:{},global:{}};
  assert.equal(retainPublishedIdentity(previous,next).menus, menus);
  assert.equal(retainPublishedIdentity(previous,{...next,menus:null}).menus, null);
  const replacement = {...menus,revision:'b'.repeat(64)};
  assert.equal(retainPublishedIdentity(previous,{...next,menus:replacement}).menus, replacement);
});
