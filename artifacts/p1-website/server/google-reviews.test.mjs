import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleReviewsStore, fetchGoogleReviews } from './google-reviews.mjs';

const env = {
  GOOGLE_BUSINESS_CLIENT_ID: 'client',
  GOOGLE_BUSINESS_CLIENT_SECRET: 'secret',
  GOOGLE_BUSINESS_REFRESH_TOKEN: 'refresh',
  GOOGLE_BUSINESS_ACCOUNT_ID: 'accounts/123',
  GOOGLE_BUSINESS_LOCATION_ID: 'locations/456',
};

const response = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });

test('fetches the verified location and only returns five-star reviews with comments', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('oauth2.googleapis.com')) return response({ access_token: 'access' });
    return response({
      averageRating: 4.8,
      totalReviewCount: 19,
      reviews: [
        { reviewId: 'five', starRating: 'FIVE', comment: 'Excellent work.', reviewer: { displayName: 'A Customer' }, createTime: '2026-01-01T00:00:00Z' },
        { reviewId: 'four', starRating: 'FOUR', comment: 'Good work.', reviewer: { displayName: 'B Customer' } },
        { reviewId: 'rating-only', starRating: 'FIVE', reviewer: { displayName: 'C Customer' } },
      ],
    });
  };
  const result = await fetchGoogleReviews({ env, fetchImpl });
  assert.equal(result.averageRating, 4.8);
  assert.equal(result.totalReviewCount, 19);
  assert.deepEqual(result.reviews.map(review => review.id), ['five']);
  assert.match(calls[1].url, /accounts\/123\/locations\/456\/reviews/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer access');
});

test('shares refreshes, caches fresh data, and serves stale data after a transient failure', async () => {
  let clock = 0;
  let reviewCalls = 0;
  const fetchImpl = async url => {
    if (String(url).includes('oauth2.googleapis.com')) return response({ access_token: 'access' });
    reviewCalls += 1;
    if (reviewCalls > 1) return response({ error: { status: 'UNAVAILABLE' } }, 503);
    return response({ averageRating: 5, totalReviewCount: 1, reviews: [{ reviewId: 'one', starRating: 'FIVE', comment: 'Great.', reviewer: { displayName: 'Customer' } }] });
  };
  const store = createGoogleReviewsStore({ env, fetchImpl, now: () => clock, freshMs: 100, staleMs: 1000 });
  const [first, shared] = await Promise.all([store.snapshot(), store.snapshot()]);
  assert.equal(first.reviews.length, 1);
  assert.deepEqual(shared, first);
  assert.equal(reviewCalls, 1);
  clock = 150;
  const stale = await store.snapshot();
  assert.equal(stale.stale, true);
  assert.equal(reviewCalls, 2);
});

test('fails closed when server credentials are incomplete', async () => {
  await assert.rejects(() => fetchGoogleReviews({ env: {} }), error => error.code === 'NOT_CONFIGURED');
});
