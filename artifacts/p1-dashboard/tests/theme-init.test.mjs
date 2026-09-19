import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
for (const preference of ['light', 'dark', 'system', null]) {
  test(`the system theme stays light with legacy preference ${preference}`, () => {
    const attributes = {};
    const document = { documentElement: { dataset: { theme: 'dark' } }, querySelector: () => ({ setAttribute: (key, value) => { attributes[key] = value; } }) };
    runInNewContext(script, { document, localStorage: { getItem: () => preference }, matchMedia: () => ({ matches: true }) });
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(attributes.content, '#f5f5f5');
  });
}
test('theme does not require browser storage or a theme meta element', () => {
  const document = { documentElement: { dataset: {} }, querySelector: () => null };
  runInNewContext(script, { document });
  assert.equal(document.documentElement.dataset.theme, 'light');
});
