const MAX_RESPONSE_BYTES = 1024 * 1024;
async function readPayload(response) {
  if (response.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw Error('Invalid head response');
  const advertised = response.headers.get('content-length');
  if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > MAX_RESPONSE_BYTES)) throw Error('Head response too large');
  if (!response.body) throw Error('Missing head response');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw Error('Head response too large');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const joined = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined));
  if (!data || Object.keys(data).sort().join(',') !== 'html,schemaVersion,stackId' || data.schemaVersion !== 1 || data.stackId !== 'p1-land-management' || typeof data.html !== 'string' || data.html.length > 100000) throw Error('Invalid head payload');
  return data.html;
}
/** One bounded, coalesced refresh every 30 seconds. Failure drops expired markup rather than replaying stale scripts. */
export function createHeadTagStore({ origin, fetcher = fetch, now = Date.now, ttl = 30000, timeout = 1800 }) {
  let cached = { html: '', expires: 0 }, pending;
  return {
    async snapshot() {
      if (!origin) return '';
      if (now() < cached.expires) return cached.html;
      if (!pending) pending = (async () => {
        let html = '';
        try {
          const response = await fetcher(`${origin.replace(/\/$/, '')}/api/p1/website-head-tags`, {
            signal: AbortSignal.timeout(timeout), redirect: 'error', headers: { Accept: 'application/json' },
          });
          html = await readPayload(response);
        } catch { /* An unavailable or invalid source must not break pages or retain expired executable markup. */ }
        cached = { html, expires: now() + ttl };
        return html;
      })().finally(() => { pending = undefined; });
      return pending;
    },
  };
}
/** Owner-authored raw markup is public-page-only and remains subject to the unchanged gateway CSP. */
export function insertHeadTags(document, markup) {
  if (!markup) return document;
  return document.replace('</head>', () => `${markup}\n</head>`);
}
