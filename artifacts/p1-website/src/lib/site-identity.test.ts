import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteIdentity, applyBusinessIdentity, applyKnownPhoneReference } from './site-identity.ts';
import { cmsFieldKey } from './cms-field-identity.ts';
import { BUSINESS_NAME, PHONE_DISPLAY, PHONE_HREF, SITE_URL } from './site.ts';
const projected = { version: 'v1', companyName: 'P1 Verified Name', companyAddress: 'Carolinas service region', phoneDisplay: '(803) 555-0123', phoneHref: 'tel:+18035550123', logoUrl: '/api/public-branding/logo', faviconUrl: '/api/public-branding/favicon', googleBusinessUrl: 'https://maps.google.com/example' };
test('bundled appearance and contact values remain when identity is absent', () => {
  const result = resolveSiteIdentity(null, {}, '/assets/wordmark.svg');
  assert.equal(result.companyName, BUSINESS_NAME); assert.equal(result.phoneDisplay, PHONE_DISPLAY); assert.equal(result.phoneHref, PHONE_HREF); assert.equal(result.logoUrl, '/assets/wordmark.svg'); assert.equal(result.faviconUrl, null); assert.equal(result.companyAddress, null);
});
test('configured identity wins over published chrome and version-controls favicon', () => {
  const result = resolveSiteIdentity(projected, { [cmsFieldKey(BUSINESS_NAME, 'alt')]: 'Old name', [cmsFieldKey(PHONE_DISPLAY)]: '(999) 555-1234' }, '/assets/wordmark.svg');
  assert.equal(result.companyName, projected.companyName); assert.equal(result.phoneHref, projected.phoneHref); assert.equal(result.phoneDisplay, projected.phoneDisplay); assert.equal(result.faviconUrl, '/api/public-branding/favicon?v=v1');
});
test('null identity fields preserve published site-chrome overrides', () => {
  const result = resolveSiteIdentity({ ...projected, companyName: null, logoUrl: null, phoneDisplay: null, phoneHref: null, googleBusinessUrl: null }, { [cmsFieldKey(BUSINESS_NAME, 'alt')]: 'Published name', [cmsFieldKey('/assets/wordmark.svg', 'image')]: '/published-logo.webp', [cmsFieldKey(PHONE_DISPLAY)]: '(803) 555-0123' }, '/assets/wordmark.svg');
  assert.equal(result.companyName, 'Published name'); assert.equal(result.logoUrl, '/published-logo.webp'); assert.equal(result.phoneDisplay, '(803) 555-0123'); assert.equal(result.phoneHref, 'tel:+18035550123');
});
test('a published telephone-target-only change keeps the visible number aligned', () => {
  const result = resolveSiteIdentity(null, { [cmsFieldKey('tel:7042218928', 'ctaTarget')]: 'tel:8035550123' });
  assert.equal(result.phoneDisplay, '(803) 555-0123'); assert.equal(result.phoneHref, 'tel:8035550123');
});
test('unsafe published URL overrides do not bypass previous URL safeguards', () => {
  const result = resolveSiteIdentity(null, { [cmsFieldKey('/assets/wordmark.svg', 'image')]: 'javascript:alert(1)', [cmsFieldKey('tel:7042218928', 'ctaTarget')]: 'javascript:alert(1)' }, '/assets/wordmark.svg');
  assert.equal(result.logoUrl, '/assets/wordmark.svg'); assert.equal(result.phoneHref, PHONE_HREF);
});
test('schema applies one business identity without inventing a storefront or changing third parties', () => {
  const value = [{ '@id': `${SITE_URL}/#business`, name: BUSINESS_NAME, telephone: '+17042218928', logo: '/old.svg', sameAs: ['old'], address: { '@type': 'PostalAddress', addressRegion: 'NC', addressCountry: 'US' } }, { '@id': 'other', name: 'Another business' }, { '@id': `${SITE_URL}/#business` }];
  const result = applyBusinessIdentity(value, resolveSiteIdentity(projected, {})) as typeof value;
  assert.equal(result[0].name, projected.companyName); assert.equal(result[0].telephone, '+18035550123'); assert.deepEqual(result[0].sameAs, [projected.googleBusinessUrl]); assert.deepEqual(result[0].address, value[0].address); assert.deepEqual(result[1], value[1]); assert.deepEqual(result[2], value[2]);
});

test('known phone CTAs and visible text use configured identity without changing other numbers', () => {
  assert.equal(applyKnownPhoneReference('tel:7042218928', 'tel:9995551234', 'ctaTarget', projected), projected.phoneHref);
  assert.equal(applyKnownPhoneReference('+1 (704) 221-8928', '(999) 555-1234', 'text', projected), projected.phoneDisplay);
  assert.equal(applyKnownPhoneReference('Call (704) 221-8928', 'Call (704) 221-8928', 'text', projected), `Call ${projected.phoneDisplay}`);
  assert.equal(applyKnownPhoneReference('tel:8035550000', 'tel:8035550000', 'ctaTarget', projected), 'tel:8035550000');
  assert.equal(applyKnownPhoneReference('tel:7042218928', 'tel:8035550000', 'ctaTarget', null), 'tel:8035550000');
  assert.equal(applyKnownPhoneReference('(704) 221-8928', 'Published phone', 'text', null), 'Published phone');
});
test('an incoherent projected phone pair cannot create mismatched public contact values', () => {
  const bad = { ...projected, phoneHref: 'tel:+18035550000' };
  assert.equal(resolveSiteIdentity(bad, {}).phoneDisplay, PHONE_DISPLAY);
  assert.equal(applyKnownPhoneReference('tel:7042218928', 'tel:7042218928', 'ctaTarget', bad), 'tel:7042218928');
});
test('identity consumer honors precisely the Core international and domestic phone pairs', () => {
  for (const [phoneDisplay, phoneHref] of [
    ['+1234567', 'tel:+1234567'], ['+123456789', 'tel:+123456789'],
    ['+4412345678', 'tel:+4412345678'], ['+123456789012345', 'tel:+123456789012345'],
    ['(704) 221-8928', 'tel:+17042218928'], ['1 (704) 221-8928', 'tel:+17042218928'],
  ]) {
    const identity = {...projected, phoneDisplay, phoneHref};
    const result = resolveSiteIdentity(identity, {});
    assert.equal(result.phoneDisplay, phoneDisplay); assert.equal(result.phoneHref, phoneHref);
    assert.equal(applyKnownPhoneReference('tel:7042218928', 'tel:7042218928', 'ctaTarget', identity), phoneHref);
  }
  for (const [phoneDisplay, phoneHref] of [
    ['1234567', 'tel:+1234567'], ['7042218928', 'tel:+7042218928'],
    ['27042218928', 'tel:+27042218928'], ['+1234567', 'tel:+11234567'],
    ['+4412345678', 'tel:+14412345678'], ['+123456', 'tel:+123456'],
    ['+1234567890123456', 'tel:+1234567890123456'], ['Call 7042218928', 'tel:+17042218928'],
  ]) {
    const result = resolveSiteIdentity({...projected, phoneDisplay, phoneHref}, {});
    assert.equal(result.phoneDisplay, PHONE_DISPLAY); assert.equal(result.phoneHref, PHONE_HREF);
  }
});
