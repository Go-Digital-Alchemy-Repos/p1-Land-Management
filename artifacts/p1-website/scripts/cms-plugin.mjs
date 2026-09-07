import path from 'node:path';
export function cmsPlugin() {
  return {
    name: 'p1-editable-content', enforce: 'post',
    transform(code, id) {
      const normalized = id.replaceAll('\\', '/');
      if (!/\/src\/(pages\/|components\/layout\/)/.test(normalized) || !/\.tsx(?:\?|$)/.test(normalized)) return;
      const global = /\/(SiteHeader|SiteFooter)\.tsx/.test(normalized);
      const runtime = path.resolve(import.meta.dirname, '../src/lib', global ? 'cms-layout-jsx-runtime.ts' : 'cms-jsx-runtime.ts');
      return { code: code.replace(/(["'])react\/jsx-(?:dev-)?runtime\1/g, JSON.stringify(runtime)), map: null };
    }
  };
}
