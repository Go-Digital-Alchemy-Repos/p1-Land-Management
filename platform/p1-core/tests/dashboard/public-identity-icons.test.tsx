// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { updateIdentityIcons } from '../../../../artifacts/p1-website/src/lib/identity-icons';
afterEach(() => { document.head.innerHTML = ''; });
it('updates icons on identity navigation and removes stale duplicates and MIME assumptions', () => {
  document.head.innerHTML = '<link rel="icon" href="/favicon.ico" type="image/x-icon"><link rel="icon" href="/old.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">';
  updateIdentityIcons(document, '/api/public-branding/favicon?v=one');
  expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1);
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/api/public-branding/favicon?v=one');
  expect(document.querySelector('link[rel="icon"]')?.hasAttribute('type')).toBe(false);
  expect(document.querySelector('link[rel="apple-touch-icon"]')?.hasAttribute('sizes')).toBe(false);
  updateIdentityIcons(document, '/api/public-branding/favicon?v=two');
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/api/public-branding/favicon?v=two');
  updateIdentityIcons(document, null);
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.ico');
  expect(document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png');
  expect(document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('sizes')).toBe('180x180');
});
