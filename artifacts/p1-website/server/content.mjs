import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export function createContentStore({ manifest, origin, cacheDir, timeout = 1800, ttl = 5000, fetcher = fetch }) {
  const cache = new Map();
  const pending = new Map();
  let generation = 0;
  const components = new Map(manifest.puck.editableComponents.map(component => [component.key, component]));
  const routes = new Map(manifest.routes.map(route => [route.path, route]));

  function validate(component, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const result = {};
    const fields = new Map(component.fields.map(field => [field.path, field]));
    for (const [key, value] of Object.entries(data)) {
      const field = fields.get(key);
      if (!field || typeof value !== 'string' || value.length > (field.maxLength || 12000)) return null;
      if (field.type === 'image' && (!(/^\/(?!\/)/.test(value) || /^https:\/\/www\.p1landmanagement\.com\//.test(value)) || /[\u0000-\u001f\\]/.test(value))) return null;
      if (field.type === 'ctaTarget' && !(/^(\/(?!\/)|#[A-Za-z]|https:\/\/|mailto:|tel:)/.test(value) && !/[\u0000-\u001f\\]/.test(value))) return null;
      result[key] = value;
    }
    return { ...component.defaultContent, ...result };
  }

  function validIdentity(data, routeId, key) {
    return data?.stackId === 'p1-land-management' && data.routeId === routeId && data.componentKey === key
      && Number.isInteger(data.revision) && data.revision >= 0
      && (data.publishedAt == null || (typeof data.publishedAt === 'string' && Number.isFinite(Date.parse(data.publishedAt))))
      && (data.etag == null || (typeof data.etag === 'string' && !/[\r\n]/.test(data.etag)));
  }

  async function load(routeId, key, id, definition) {
    const startedGeneration = generation;
    let entry = cache.get(id);
    if (!entry && cacheDir) {
      try {
        const stored = JSON.parse(await readFile(path.join(cacheDir, `${id}.json`), 'utf8'));
        const content = validIdentity(stored, routeId, key) && validate(definition, stored.content);
        if (content) entry = { ...stored, content, checkedAt: 0 };
      } catch { /* Missing or invalid local cache is never published. */ }
    }
    if (entry && Date.now() - entry.checkedAt < ttl) return entry;
    const fallback = entry || { content: definition.defaultContent, revision: 0 };
    if (!origin) return fallback;
    const checkedAt = () => startedGeneration === generation ? Date.now() : 0;
    let next;
    try {
      const response = await fetcher(`${origin}/api/client-site-content/${routeId}/${key}`, {
        signal: AbortSignal.timeout(timeout), headers: entry?.etag ? { 'If-None-Match': entry.etag } : {},
      });
      if (response.status === 304) {
        if (!entry?.etag) throw new Error('Unexpected conditional response');
        next = { ...entry, checkedAt: checkedAt() };
      } else {
        if (!response.ok) throw new Error('Content unavailable');
        const data = await response.json();
        if (!validIdentity(data, routeId, key)) throw new Error('Invalid content identity');
        const content = validate(definition, data.content);
        if (!content) throw new Error('Invalid content');
        next = {
          stackId: 'p1-land-management', routeId, componentKey: key, content, revision: data.revision,
          publishedAt: data.publishedAt, etag: response.headers.get('etag'), checkedAt: checkedAt(),
        };
      }
    } catch {
      const stale = { ...fallback, checkedAt: checkedAt() };
      cache.set(id, stale);
      return stale;
    }
    cache.set(id, next);
    // Persistence is best-effort; disk errors must not undo valid published content in memory.
    if (cacheDir) {
      const name = path.join(cacheDir, `${id}.json`);
      const temporary = `${name}.${randomUUID()}.tmp`;
      try {
        await mkdir(cacheDir, { recursive: true });
        await writeFile(temporary, JSON.stringify(next));
        await rename(temporary, name);
      } catch { await unlink(temporary).catch(() => {}); }
    }
    return next;
  }

  function component(routeId, key) {
    const definition = components.get(key);
    if (!definition) return Promise.resolve({ content: {}, revision: 0 });
    const id = `${routeId}--${key}`;
    if (pending.has(id)) return pending.get(id);
    const work = load(routeId, key, id, definition).finally(() => pending.delete(id));
    pending.set(id, work);
    return work;
  }

  return {
    routes,
    invalidate() { generation++; for (const value of cache.values()) value.checkedAt = 0; },
    async snapshot(routePath) {
      const route = routes.get(routePath);
      if (!route) return null;
      const [page, global] = await Promise.all([component(route.id, `${route.id}-content`), component('home', 'site-chrome')]);
      return { route: routePath, content: page.content, global: global.content, revision: page.revision, globalRevision: global.revision, publishedAt: page.publishedAt };
    },
  };
}
