import { useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ChevronDown } from 'lucide-react';
import type { PublicWebsiteMenuItem } from '../../../../../platform/p1-core/shared/public-menus';

export type MenuFormRequest = { item: PublicWebsiteMenuItem; opener: HTMLElement; fallback?: HTMLElement };
type Props = { items: PublicWebsiteMenuItem[]; variant?: 'desktop' | 'mobile' | 'footer'; onNavigate?: () => void; onForm: (request: MenuFormRequest) => void };

/** Kept outside layout/: assigned menu content must not pass through the legacy CMS JSX transformer. */
export function PublishedMenu({items, variant = 'footer', onNavigate, onForm}: Props) {
  return <ul className={variant === 'desktop' ? 'flex flex-wrap items-center gap-x-5 gap-y-2' : 'space-y-3'}>
    {items.map(item => <MenuBranch key={item.id} item={item} variant={variant} onNavigate={onNavigate} onForm={onForm} />)}
  </ul>;
}
function MenuBranch({item, variant, onNavigate, onForm}: Omit<Props, 'items'> & {item: PublicWebsiteMenuItem}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const navigate = () => {setOpen(false); onNavigate?.();};
  const classes = 'rounded-sm text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';
  let link: ReactNode;
  if (item.action === 'form-modal') link = <button type="button" className={classes} onClick={event => {setOpen(false); onForm({item, opener: event.currentTarget});}}>{item.label}</button>;
  else if (item.url.startsWith('/') && !item.openInNewTab) link = <Link href={item.url} className={classes} onClick={navigate}>{item.label}</Link>;
  else link = <a href={item.url} target={item.openInNewTab ? '_blank' : undefined} rel={item.openInNewTab ? 'noopener noreferrer' : undefined} className={classes} onClick={navigate}>{item.label}</a>;
  return <li className="relative min-w-0" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}} onKeyDown={event => {if (event.key === 'Escape' && open) {event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus();}}}>
    <div className="flex items-center justify-between gap-2">{link}{item.children.length > 0 && <button ref={toggle} type="button" aria-label={`${open ? 'Hide' : 'Show'} links under ${item.label}`} aria-expanded={open} aria-controls={id} className="shrink-0 rounded p-2 hover:bg-primary/10 focus-visible:outline focus-visible:outline-primary" onClick={() => setOpen(value => !value)}><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} /></button>}</div>
    {item.children.length > 0 && <div id={id} hidden={!open} className={variant === 'desktop' ? 'absolute left-0 top-full z-50 max-h-[65vh] w-72 max-w-[calc(100vw-2rem)] overflow-auto rounded-md border bg-background p-4 text-foreground shadow-lg' : 'mt-3 border-l border-current/20 pl-4'}>
      <PublishedMenu items={item.children} variant={variant === 'desktop' ? 'mobile' : variant} onNavigate={navigate} onForm={request => onForm({...request, fallback: toggle.current ?? request.fallback})} />
    </div>}
  </li>;
}
