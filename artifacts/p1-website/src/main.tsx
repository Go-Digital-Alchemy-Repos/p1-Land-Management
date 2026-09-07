import { createRoot, hydrateRoot } from 'react-dom/client';
import { ClientCmsApp } from './lib/cms-app';
import type { CmsSnapshot } from './lib/cms';
import './index.css';
const rootEl = document.getElementById('root')!;
const element = document.getElementById('p1-published-content');
let initial: CmsSnapshot = { route: window.location.pathname, content: {}, global: {} };
try { if (element?.textContent) initial = JSON.parse(element.textContent); } catch { /* Safe built-in content. */ }
if (rootEl.hasChildNodes()) hydrateRoot(rootEl, <ClientCmsApp initial={initial} />);
else createRoot(rootEl).render(<ClientCmsApp initial={initial} />);
