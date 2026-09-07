import { applyPreviewOverlay, type CmsPreviewOverlay } from "./cms-preview";
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type CmsValues = Record<string, string>;
export type CmsSnapshot = { route: string; content: CmsValues; global: CmsValues; revision?: number; publishedAt?: string; globalRevision?: number };
export type CmsField = { path: string; label: string; type: 'text' | 'textarea' | 'image' | 'imageAlt' | 'ctaTarget'; required: boolean; maxLength: number };
export type CmsCollection = { page: Record<string, { field: CmsField; value: string }>; global: Record<string, { field: CmsField; value: string }> };
export function routeId(path: string) { return path === '/' ? 'home' : path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/g, '-'); }
export function fieldId(value: string, kind = 'text') {
  let hash = 2166136261;
  for (const char of `${kind}:${value}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return 'f' + (hash >>> 0).toString(36);
}
const Context = createContext<{ snapshot: CmsSnapshot; collect?: CmsCollection }>({ snapshot: { route: '/', content: {}, global: {} } });
export function useCms() { return useContext(Context); }
export function safeValue(value: unknown, kind: string): value is string {
  if (typeof value !== 'string' || value.length > 12000) return false;
  if (kind === 'ctaTarget') return /^(\/(?!\/)|#[a-zA-Z]|https:\/\/|mailto:|tel:)/.test(value) && !/[\u0000-\u001f\\]/.test(value);
  if (kind === 'image') return !/[\u0000-\u001f\\]/.test(value) && (/^\/(?!\/)/.test(value) || /^https:\/\/www\.p1landmanagement\.com\//.test(value));
  return true;
}
export function cmsValue(context: ReturnType<typeof useCms>, original: string, kind: CmsField['type'] = 'text', global = false, explicitKey?: string) {
  const key = explicitKey || fieldId(original, kind === 'imageAlt' ? 'alt' : kind === 'textarea' ? 'text' : kind);
  const values = global ? context.snapshot.global : context.snapshot.content;
  if (original.trim() && context.collect) {
    const group = global ? context.collect.global : context.collect.page;
    const label = explicitKey === 'seoTitle' ? 'SEO title' : explicitKey === 'seoDescription' ? 'SEO description' : `${kind === 'ctaTarget' ? 'Link' : kind === 'image' ? 'Image' : kind === 'imageAlt' ? 'Image description' : 'Text'}: ${original.trim().slice(0,95)}`;
    group[key] = { field: { path: key, label, type: kind, required: false, maxLength: kind === 'textarea' ? 12000 : 2000 }, value: original };
  }
  const value = values[key];
  return safeValue(value, kind) ? value : original;
}
export function CmsProvider({ snapshot, collect, children }: { snapshot: CmsSnapshot; collect?: CmsCollection; children: ReactNode }) {
  const [preview, setPreview] = useState<CmsPreviewOverlay | null>(null);
  const active = applyPreviewOverlay(snapshot, preview);
  useEffect(() => {
    setPreview(null);
    if (!new URLSearchParams(location.search).has('cmsPreview') || window.parent === window) return;
    const id = routeId(snapshot.route);
    const componentKey = new URLSearchParams(location.search).get('cmsComponent') || `${id}-content`;
    const routeKey = componentKey === 'site-chrome' ? 'home' : id;
    let lastRevision = -1;
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (event.origin !== location.origin || event.source !== window.parent || !data || data.type !== 'core-platform:client-site-preview' || data.protocolVersion !== '1.0' || data.clientStackId !== 'p1-land-management' || data.routeId !== routeKey || data.componentKey !== componentKey || !Number.isInteger(data.revision) || data.revision < 0 || data.revision < lastRevision || !data.content || typeof data.content !== "object" || Array.isArray(data.content)) return;
      const clean = Object.fromEntries(Object.entries(data.content).filter(([k,v]) => /^[a-z][a-zA-Z0-9]*$/.test(k) && typeof v === 'string' && v.length <= 12000));
      lastRevision = data.revision;
      setPreview({ route: snapshot.route, [componentKey === 'site-chrome' ? 'global' : 'content']: clean });
    };
    window.addEventListener('message', listener);
    window.parent.postMessage({ type: 'core-platform:client-site-preview-ready', protocolVersion: '1.0', clientStackId: 'p1-land-management', routeId: routeKey, componentKey }, location.origin);
    return () => window.removeEventListener('message', listener);
  }, [snapshot.route]);
  return <Context.Provider value={{ snapshot: active, collect }}>{children}</Context.Provider>;
}
