/**
 * Content keys were originally derived from defaults. Keep a prior key when a
 * reviewed copy change updates that default, so saved CMS revisions stay
 * renderable and editable. Add a reviewed entry before changing a default;
 * do not reuse a key for a different source field.
 */
const CMS_FIELD_KEY_ALIASES: Record<string, string> = {
  f20gmb7: 'fxavif',
  f10vu3v4: 'fjq0g7j',
  fi1sz6l: 'f1kn99ts',
  fwq9eqd: 'fg5y74s',
  f11ul7m8: 'f1sz1s82',
  fj8y74p: 'f1cjfg7a',
  f1tflixw: 'f2f8aux',
  fsqmo46: 'fa7rbfc',
  fk6zm5t: 'f1dhnb5v',
  fl3zh0g: 'f19nok1s',
  fs607fa: 'f1niaye8',
};

export function fieldId(value: string, kind = 'text') {
  let hash = 2166136261;
  for (const char of `${kind}:${value}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return 'f' + (hash >>> 0).toString(36);
}

export function cmsFieldKey(value: string, kind = 'text') {
  const derived = fieldId(value, kind);
  return CMS_FIELD_KEY_ALIASES[derived] || derived;
}

export function legacyCmsFieldKey(value: string, kind = 'text') {
  return CMS_FIELD_KEY_ALIASES[fieldId(value, kind)];
}
