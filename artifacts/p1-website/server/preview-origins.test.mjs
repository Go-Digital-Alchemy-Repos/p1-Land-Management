import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptsPreviewParent, BUSINESS_CENTER_ORIGIN } from '../config/preview-origins.mjs';
test('preview parent accepts only original public origin or exact Business Center origin', () => {
  const publicOrigin = 'https://www.p1landmanagement.com';
  assert(acceptsPreviewParent(publicOrigin, publicOrigin));
  assert(acceptsPreviewParent(BUSINESS_CENTER_ORIGIN, publicOrigin));
  for (const origin of ['null', 'http://dashboard.p1landmanagement.com', 'https://dashboard.p1landmanagement.com.evil.test', 'https://other.p1landmanagement.com', 'https://evil.test']) assert.equal(acceptsPreviewParent(origin, publicOrigin), false);
});
