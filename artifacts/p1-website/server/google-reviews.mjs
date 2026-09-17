const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVIEWS_ORIGIN = 'https://mybusiness.googleapis.com';
const FIVE_STAR_RATING = 'FIVE';

function cleanId(value, prefix) {
  return String(value || '').trim().replace(new RegExp(`^${prefix}/`), '').replace(/\/.*/, '');
}

function configFromEnv(env) {
  const config = {
    clientId: env.GOOGLE_BUSINESS_CLIENT_ID?.trim(),
    clientSecret: env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim(),
    refreshToken: env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim(),
    accountId: cleanId(env.GOOGLE_BUSINESS_ACCOUNT_ID, 'accounts'),
    locationId: cleanId(env.GOOGLE_BUSINESS_LOCATION_ID, 'locations'),
  };
  return Object.values(config).every(Boolean) ? config : null;
}

async function jsonResponse(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${label} failed with status ${response.status}`);
    error.status = response.status;
    error.cause = payload?.error?.status || payload?.error || undefined;
    throw error;
  }
  return payload;
}

async function accessToken(config, fetchImpl) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });
  const payload = await jsonResponse(fetchImpl, TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  }, 'Google OAuth token refresh');
  if (!payload.access_token) throw new Error('Google OAuth token response did not include an access token');
  return payload.access_token;
}

function publicReview(review) {
  return {
    id: String(review.reviewId || ''),
    author: String(review.reviewer?.displayName || 'Google customer').slice(0, 120),
    comment: String(review.comment || '').trim().slice(0, 4000),
    createTime: review.createTime || null,
    updateTime: review.updateTime || review.createTime || null,
  };
}

export async function fetchGoogleReviews({ env = process.env, fetchImpl = fetch, limit = 6 } = {}) {
  const config = configFromEnv(env);
  if (!config) {
    const error = new Error('Google Business Profile reviews are not configured');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }

  const token = await accessToken(config, fetchImpl);
  const parent = `accounts/${config.accountId}/locations/${config.locationId}`;
  const reviews = [];
  let averageRating = null;
  let totalReviewCount = null;
  let pageToken = '';

  for (let page = 0; page < 5 && reviews.length < limit; page += 1) {
    const params = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    if (pageToken) params.set('pageToken', pageToken);
    const payload = await jsonResponse(fetchImpl, `${REVIEWS_ORIGIN}/v4/${parent}/reviews?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, 'Google Business Profile review fetch');
    if (averageRating === null && Number.isFinite(Number(payload.averageRating))) averageRating = Number(payload.averageRating);
    if (totalReviewCount === null && Number.isFinite(Number(payload.totalReviewCount))) totalReviewCount = Number(payload.totalReviewCount);
    reviews.push(...(payload.reviews || [])
      .filter(review => review.starRating === FIVE_STAR_RATING && String(review.comment || '').trim())
      .map(publicReview));
    pageToken = payload.nextPageToken || '';
    if (!pageToken) break;
  }

  return {
    source: 'google_business_profile',
    averageRating,
    totalReviewCount,
    reviews: reviews.slice(0, limit),
    fetchedAt: new Date().toISOString(),
  };
}

export function createGoogleReviewsStore({ env = process.env, fetchImpl = fetch, now = Date.now, freshMs = 6 * 60 * 60 * 1000, staleMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  let cached = null;
  let inFlight = null;

  return {
    async snapshot() {
      const age = cached ? now() - cached.storedAt : Infinity;
      if (cached && age < freshMs) return cached.value;
      if (!inFlight) {
        inFlight = fetchGoogleReviews({ env, fetchImpl })
          .then(value => {
            cached = { value, storedAt: now() };
            return value;
          })
          .finally(() => { inFlight = null; });
      }
      try {
        return await inFlight;
      } catch (error) {
        if (cached && age < staleMs) return { ...cached.value, stale: true };
        throw error;
      }
    },
  };
}
