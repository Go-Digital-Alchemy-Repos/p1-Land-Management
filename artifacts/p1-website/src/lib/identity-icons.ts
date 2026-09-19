/** Keep browser navigation consistent with server-rendered identity links. */
export function updateIdentityIcons(document: Document, faviconUrl: string | null) {
  for (const [rel, fallback] of [['icon', '/favicon.ico'], ['apple-touch-icon', '/apple-touch-icon.png']] as const) {
    const matches = [...document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)];
    const link = matches.shift() ?? document.createElement('link');
    link.rel = rel;
    link.href = faviconUrl ?? fallback;
    link.removeAttribute('type');
    if (faviconUrl) link.removeAttribute('sizes');
    else if (rel === 'apple-touch-icon') link.setAttribute('sizes', '180x180');
    if (!link.parentNode) document.head.appendChild(link);
    matches.forEach(extra => extra.remove());
  }
}
