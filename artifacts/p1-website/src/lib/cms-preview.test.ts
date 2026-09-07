import test from 'node:test';
import assert from 'node:assert/strict';
// Native Node type stripping keeps this regression independent of a browser/DOM dependency.
import { applyPreviewOverlay } from './cms-preview.ts';

test('early draft survives initial same-route published fetch completion', () => {
  const initial = { route: '/', content: { title: 'Prerendered' }, global: { phone: 'Original' }, revision: 1 };
  const draft = { route: '/', content: { title: 'Unsaved editor change' } };
  assert.equal(applyPreviewOverlay(initial, draft).content.title, 'Unsaved editor change');
  const fetched = { ...initial, content: { title: 'Published response arriving later' }, global: { phone: 'Updated' }, revision: 2 };
  const result = applyPreviewOverlay(fetched, draft);
  assert.equal(result.content.title, 'Unsaved editor change');
  assert.equal(result.global.phone, 'Updated');
  assert.equal(result.revision, 2);
  assert.equal(fetched.content.title, 'Published response arriving later', 'Published snapshot must remain unmodified');
});

test('global draft survives page refresh while published page content updates', () => {
  const fetched = { route: '/contact', content: { title: 'Published contact' }, global: { phone: 'Published phone' } };
  const result = applyPreviewOverlay(fetched, { route: '/contact', global: { phone: 'Draft phone' } });
  assert.equal(result.global.phone, 'Draft phone');
  assert.equal(result.content.title, 'Published contact');
});

test('a route change and cleared preview show the new published snapshot', () => {
  const next = { route: '/about', content: { title: 'About' }, global: {} };
  assert.equal(applyPreviewOverlay(next, { route: '/', content: { title: 'Home draft' } }), next);
  assert.equal(applyPreviewOverlay(next, null), next);
});

test('empty accepted overlay replaces old fields instead of resurrecting published fields', () => {
  const current = { route: '/', content: { title: 'Published title' }, global: {} };
  assert.deepEqual(applyPreviewOverlay(current, { route: '/', content: {} }).content, {});
});
