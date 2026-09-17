export function splitFormPages<T extends { type: string }>(fields: T[]) {
  const pages: Array<{ meta: T | null; fields: T[] }> = [];
  let current = { meta: null as T | null, fields: [] as T[] };

  for (const field of fields) {
    if (field.type === "page") {
      if (current.meta || current.fields.length) {
        pages.push(current);
      }
      current = { meta: field, fields: [] };
      continue;
    }
    current.fields.push(field);
  }

  if (current.meta || current.fields.length) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [{ meta: null, fields }];
}
