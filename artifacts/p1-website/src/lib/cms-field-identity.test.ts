import test from 'node:test';
import assert from 'node:assert/strict';
import { cmsFieldKey, fieldId } from './cms-field-identity.ts';

test('reviewed commercial copy corrections retain their existing CMS field keys', () => {
  const revised =
    'P1 reviews the property, the requested work and operating constraints before proposing an agreed scope and service schedule. Site-assessment availability, access requirements and any fee are confirmed during qualification.';
  assert.equal(fieldId(revised), 'fk6zm5t');
  assert.equal(cmsFieldKey(revised), 'f1dhnb5v');
});

test('new CMS defaults retain their derived field key until a reviewed alias exists', () => {
  const value = 'A future reviewed content default.';
  assert.equal(cmsFieldKey(value), fieldId(value));
});
