import {usePublicFormVerification} from '../forms/PublicFormVerification';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import * as SelectParts from '../ui/select';
import { FormPresentation } from '../../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation';
import { FormPresentationHostProvider } from '../../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation-host';
import type { CmsForm } from '../../../../../platform/p1-core/shared/schema/forms';
import type { MenuFormRequest } from './PublishedMenu';

async function readJson(response: Response, maxBytes: number) {
  if (!response.headers.get('content-type')?.includes('application/json') || !response.body) throw Error('The form service is unavailable. Please try again.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) {const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) throw Error('The form response was too large.'); chunks.push(value);}} finally {await reader.cancel();}
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) {bytes.set(chunk,offset);offset += chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
// Core and the public app have separate React type versions; Vite deduplicates their runtime.
const ui = {Button,Input,Label,Textarea,Checkbox,...SelectParts} as unknown as NonNullable<ComponentProps<typeof FormPresentationHostProvider>["value"]>["ui"];
export default function MenuFormDialog({request, onClose}: {request: MenuFormRequest; onClose: () => void}) {
  const {item,opener,fallback} = request;
  const [form,setForm] = useState<CmsForm>(); const [loading,setLoading] = useState(true);
  const [error,setError] = useState(''); const [attempt,setAttempt] = useState(0);
  const [notice,setNotice] = useState<{title:string;description?:string;variant?:'default'|'destructive'}>();
  const [accepted,setAccepted] = useState(false); const [busy,setBusy] = useState(false); const pending = useRef(false);
  const preview = new URLSearchParams(window.location.search).has('cmsPreview');
  const verification=usePublicFormVerification(preview || accepted);
  const host = useMemo(() => ({ui,toast:setNotice}),[]);
  useEffect(() => {
    const controller = new AbortController(); let disposed = false; const timer = setTimeout(() => controller.abort(),15000);
    setLoading(true);setError('');
    void fetch(`/api/forms/${encodeURIComponent(item.formSlug!)}`,{signal:controller.signal,credentials:'omit',redirect:'error'})
      .then(async response => {if (!response.ok) throw Error('This form is currently unavailable.');const data = await readJson(response,524288);if (!data || data.slug !== item.formSlug || !Array.isArray(data.fields) || data.fields.length > 200) throw Error('This form could not be loaded.');return data as CmsForm;})
      .then(data => {if (!controller.signal.aborted) setForm(data);})
      .catch(() => {if (!disposed) setError('This form could not be loaded. Please try again.');})
      .finally(() => {clearTimeout(timer);if (!disposed) setLoading(false);});
    return () => {disposed = true;clearTimeout(timer);controller.abort();};
  },[item.formSlug,attempt]);
  async function submit(values: Record<string,unknown>, idempotencyKey:string) {
    if (preview || pending.current) throw Error('A submission is already in progress or this is a preview.');
    const verificationHeaders=verification.headers();
    pending.current = true; setBusy(true);
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(item.formSlug!)}/submit`,{method:'POST',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey,...verificationHeaders},body:JSON.stringify(values)});
      const result = await readJson(response,16384);
      if (!response.ok || typeof result.submissionId !== 'string') throw Error('We could not confirm receipt. Your entries are retained; please retry.');
      return {message:typeof result.message === 'string' ? result.message : 'Your inquiry has been received.'};
    } catch(error) {verification.reset();throw error;} finally {pending.current = false; setBusy(false);}
  }
  return <Dialog open onOpenChange={open => {if (!open && !pending.current) onClose();}}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto" onCloseAutoFocus={event => {event.preventDefault();if (opener.isConnected && opener.getClientRects().length) opener.focus();else if (fallback?.isConnected && fallback.getClientRects().length) fallback.focus();else document.querySelector<HTMLButtonElement>('[data-p1-menu-trigger]')?.focus();}}>
    <DialogTitle>{item.modalTitle || form?.name || item.label}</DialogTitle>
    <DialogDescription>{item.modalDescription || 'Complete this form to contact P1.'}</DialogDescription>
    {!accepted && verification.control}
    {error ? <div role="alert"><p>{error}</p><Button onClick={() => setAttempt(value => value+1)}>Try again</Button></div> : <FormPresentationHostProvider value={host}>{!accepted && <><fieldset disabled={busy} aria-busy={busy}><FormPresentation slug={item.formSlug!} form={form} isLoading={loading} preview={preview} submit={submit} showHeader={false} onSubmitSuccess={() => setAccepted(true)} /></fieldset></>}</FormPresentationHostProvider>}
    {notice && <div role={notice.variant === 'destructive' ? 'alert' : 'status'} className="rounded border p-3"><strong>{notice.title}</strong><p>{notice.description}</p></div>}
  </DialogContent></Dialog>;
}
