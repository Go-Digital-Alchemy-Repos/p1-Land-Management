import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/seo';
import { PHONE_DISPLAY, PHONE_HREF, EMAIL } from '@/lib/site';
import { acquisitionSource, trackAcquisition } from '@/lib/acquisition';
import { commercialPayload, commercialErrors, commercialErrorSummary, inquiryAttempt, sendCommercialInquiry } from '@/lib/commercial-inquiry';
import hero from '@/assets/service-commercial.png';
import dataCenterCampus from '@/assets/data-center-campus.png';

const capabilities = [
  { title: 'Grounds & Vegetation Management', text: 'Bring acreage, overgrowth and perimeter vegetation into a practical maintenance plan.', href: '/services/commercial-property-management', label: 'Commercial grounds services', value: 'grounds_vegetation' },
  { title: 'Stormwater & Drainage', text: 'Discuss drainage correction, ponds and waterway maintenance as connected parts of your property.', href: '/services/drainage', label: 'Drainage services', value: 'stormwater_drainage' },
  { title: 'Grading & Erosion', text: 'Address grading, washouts and land restoration with a defined corrective scope.', href: '/services/grading-site-preparation', label: 'Grading and site preparation', value: 'grading_erosion' },
  { title: 'Tree & Land Management', text: 'Plan clearing, tree work and brush management around the areas you use and the land you want to retain.', href: '/services/tree-services', label: 'Tree and land services', value: 'tree_land' },
  { title: 'Roads, Access & Exterior Infrastructure', text: 'Discuss site grading, gravel access and exterior improvements in the context of how your property operates.', href: '/services/property-reconstruction', label: 'Property reconstruction', value: 'roads_access' },
  { title: 'Emergency & Corrective Response', text: 'Discuss storm debris, damaged ground and corrective work. Availability and scope must be confirmed; this form is not emergency dispatch.', href: '/services/property-reconstruction', label: 'Corrective property work', value: 'emergency_corrective' },
  { title: 'Recurring Site Management', text: 'Build an agreed maintenance schedule with inspection priorities, communication and follow-up expectations defined together.', href: '/services/commercial-property-management', label: 'Ongoing property management', value: 'recurring_site_management' },
];
const fieldClass = 'mt-2 w-full rounded-sm border border-slate-400 bg-white px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2';
const ctaClass = 'inline-flex min-h-12 items-center justify-center rounded-sm bg-primary px-6 py-4 text-center font-bold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

function AssessmentForm() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [receipt, setReceipt] = useState('');
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const started = useRef(false);
  const inFlight = useRef(false);
  const outcome = useRef<HTMLDivElement>(null);
  useEffect(() => { if (receipt || failure || Object.keys(errors).length) outcome.current?.focus(); }, [receipt, failure, errors]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const payload = commercialPayload(new FormData(event.currentTarget), acquisitionSource());
    const invalid = commercialErrors(payload);
    setErrors(invalid); setFailure('');
    if (Object.keys(invalid).length) { trackAcquisition('form_error'); return; }
    attempt.current = inquiryAttempt(attempt.current, payload, () => crypto.randomUUID());
    inFlight.current = true; setBusy(true);
    try { setReceipt(await sendCommercialInquiry(attempt.current)); }
    catch (error) { setFailure(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'We could not confirm receipt before the connection timed out. Your details are still here; retrying the same request is safe.'); trackAcquisition('form_error'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (receipt) return <div ref={outcome} tabIndex={-1} role="status" className="rounded-sm border-2 border-primary bg-white p-6 md:p-10">
    <h3 className="text-3xl font-bold">Your inquiry has been received</h3>
    <p className="mt-4">Inquiry reference: <strong className="break-all">{receipt}</strong></p>
    <p className="mt-4">P1 will review your property and requested scope, then contact you to discuss fit, availability and next steps. This is not a confirmed appointment or service commitment.</p>
    <a href={PHONE_HREF} className="mt-6 inline-block font-bold text-primary underline">Call P1: {PHONE_DISPLAY}</a>
  </div>;
  const input = (name: string, label: string, type = 'text', required = false, autoComplete?: string, maxLength = 200) => <div>
    <label htmlFor={`commercial-${name}`} className="font-semibold">{label}{required ? ' (required)' : ''}</label>
    <input id={`commercial-${name}`} name={name} type={type} autoComplete={autoComplete} required={required} maxLength={maxLength} className={fieldClass} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : name === 'email' || name === 'phone' ? 'contact-channel-help' : undefined} />
    {errors[name] && <p id={`${name}-error`} className="mt-2 text-sm font-semibold text-red-800">{errors[name]}</p>}
  </div>;
  return <form onSubmit={submit} noValidate onFocus={() => { if (!started.current) { started.current = true; trackAcquisition('form_start'); } }} className="space-y-7 rounded-sm border border-slate-300 bg-white p-5 md:p-9" aria-busy={busy}>
    {(failure || Object.keys(errors).length > 0) && <div ref={outcome} tabIndex={-1} role="alert" className="border-l-4 border-red-800 bg-red-50 p-4 text-red-900">
      {failure || 'Please review the highlighted fields. Your entries have been kept.'}
      {Object.keys(errors).length > 0 && <ul className="mt-2 list-disc pl-5">{Object.entries(errors).map(([key, message]) => <li key={key}><a href={`#commercial-${key}`} className="underline">{commercialErrorSummary(key, message)}</a></li>)}</ul>}
    </div>}
    <div className="grid gap-6 sm:grid-cols-2">{input('name', 'Your name', 'text', true, 'name', 150)}{input('company', 'Company / organization', 'text', true, 'organization', 300)}</div>
    <fieldset><legend className="font-semibold">How can we reach you?</legend><p id="contact-channel-help" className="mt-1 text-sm text-slate-600">Provide an email address or phone number. Both are welcome, but only one is required.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">{input('email', 'Email', 'email', false, 'email', 254)}{input('phone', 'Phone', 'tel', false, 'tel', 50)}</div>
    </fieldset>
    {input('address', 'Property location — address or city / region', 'text', true, undefined, 500)}
    <fieldset id="commercial-services" tabIndex={-1} aria-describedby={errors.services ? 'services-error' : undefined} aria-invalid={!!errors.services}>
      <legend className="font-semibold">What does your site need? (select at least one)</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{[...capabilities.map(item => ({ value: item.value, title: item.title })), { value: 'general_site_assessment', title: 'General site assessment / not sure yet' }].map(item => <label key={item.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-sm border border-slate-300 p-3 text-sm"><input className="mt-1 h-4 w-4 shrink-0 accent-primary" type="checkbox" name="services" value={item.value} />{item.title}</label>)}</div>
      {errors.services && <p id="services-error" className="mt-2 text-sm font-semibold text-red-800">{errors.services}</p>}
    </fieldset>
    <div className="grid gap-6 sm:grid-cols-2">
      <div><label htmlFor="commercial-serviceTiming" className="font-semibold">Type of need (required)</label><select id="commercial-serviceTiming" name="serviceTiming" required className={fieldClass} aria-invalid={!!errors.serviceTiming} aria-describedby={errors.serviceTiming ? 'serviceTiming-error' : undefined}><option value="">Select one</option><option value="immediate">Immediate / corrective project</option><option value="recurring">Recurring management</option><option value="both">Both</option></select>{errors.serviceTiming && <p id="serviceTiming-error" className="mt-2 text-sm text-red-800">{errors.serviceTiming}</p>}</div>
      <div><label htmlFor="commercial-projectStage" className="font-semibold">Property / project stage (required)</label><select id="commercial-projectStage" name="projectStage" required className={fieldClass} aria-invalid={!!errors.projectStage} aria-describedby={errors.projectStage ? 'projectStage-error' : undefined}><option value="">Select one</option><option value="development_construction">Development / construction</option><option value="turnover_establishment">Turnover / establishment</option><option value="long_term_operations">Long-term operations</option><option value="unknown">Not sure yet</option></select>{errors.projectStage && <p id="projectStage-error" className="mt-2 text-sm text-red-800">{errors.projectStage}</p>}</div>
    </div>
    <details className="border-y border-slate-200 py-4"><summary className="cursor-pointer font-semibold text-primary">Add property details (optional)</summary><div className="mt-5 grid gap-6 sm:grid-cols-2">{input('title', 'Your role / title', 'text', false, 'organization-title', 150)}{input('propertyName', 'Property / project name', 'text', false, undefined, 300)}{input('propertyType', 'Property type / industry', 'text', false, undefined, 150)}{input('acreage', 'Approximate acreage — range or unknown is fine', 'text', false, undefined, 100)}</div></details>
    <div><label htmlFor="commercial-message" className="font-semibold">Anything else we should know? (optional)</label><textarea id="commercial-message" name="message" rows={4} maxLength={5000} className={fieldClass} aria-describedby="commercial-privacy" /><p id="commercial-privacy" className="mt-2 text-sm text-slate-600">Share the need and useful timing. Please do not include access codes, facility-security plans or sensitive documents.</p></div>
    <div hidden aria-hidden="true"><label htmlFor="commercial-website">Leave this field empty</label><input id="commercial-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <p className="text-sm text-slate-600">Your information is used to review and follow up on this inquiry. Staff will confirm assessment scope, access, availability and any fee before a property walk.</p>
    <button disabled={busy} type="submit" className={`${ctaClass} w-full disabled:opacity-70`}>{busy ? 'Sending your request…' : 'Request a Site Assessment'}</button>
    <p className="text-sm text-slate-600">Prefer to talk? <a className="font-semibold text-primary underline" href={PHONE_HREF}>{PHONE_DISPLAY}</a></p>
  </form>;
}

export default function Commercial() {
  return <Layout assessmentCta>
    <SEO title="Commercial & Industrial Site Management | P1 Land Management" description="Coordinate grounds, drainage, land and exterior site needs across your commercial property. Request a P1 Commercial Site Assessment in Upstate SC and greater Charlotte." />
    <section className="relative isolate overflow-hidden bg-secondary text-white">
      <img src={hero} alt="Illustrative aerial view of maintained commercial grounds" fetchPriority="high" decoding="async" sizes="100vw" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-slate-950/80" />
      <div className="site-shell py-20 md:py-28"><div className="max-w-4xl">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-white">Commercial & Industrial / Exterior Site Operations</p>
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">Complete Exterior Site Management for Large Commercial & Industrial Properties</h1>
        <p className="mt-7 max-w-3xl text-xl font-semibold md:text-2xl">One accountable partner for everything outside the building envelope.</p>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">Connect maintenance, corrective work and property improvements within an agreed scope. P1 helps you plan the exterior work your site needs, with specialist responsibilities identified where appropriate.</p>
        <div className="mt-9 flex flex-col gap-4 sm:flex-row"><a href="#assessment-request" className={ctaClass}>Request a Site Assessment</a><a href={PHONE_HREF} className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white px-6 py-4 font-bold text-white">Discuss Your Property</a></div>
        <p className="mt-7 text-sm text-slate-200">Upstate South Carolina & greater Charlotte · Property location and serviceability confirmed during review</p>
      </div><p className="mt-12 text-xs text-slate-200">Illustrative imagery — not a documented P1 client property.</p></div>
    </section>
    <section className="site-shell py-20"><div className="grid items-center gap-12 lg:grid-cols-2">
      <div><p className="text-sm font-bold uppercase tracking-widest text-primary">One exterior partner</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">A connected plan for a complex property.</h2><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Grounds, water, land and access affect one another. Bring them into one scope discussion, with practical coordination and clear responsibility for the work agreed with P1.</p><p className="mt-4 text-muted-foreground">Consolidate where practical. Confirm self-performed work, qualified specialist involvement, exclusions and your team’s responsibilities before work begins.</p></div>
      <div className="rounded-sm border border-border bg-muted p-6 md:p-9" aria-label="Grounds, water, land, access and corrective work connect through one agreed P1 scope"><ul className="grid grid-cols-2 gap-3">{['Grounds & vegetation', 'Water & drainage', 'Land & trees', 'Roads & access', 'Corrective work'].map(label => <li key={label} className="border border-border bg-background p-4 font-semibold">{label}</li>)}</ul><div className="mx-auto h-8 w-px bg-secondary" /><p className="bg-secondary p-5 text-center text-xl font-bold text-white">P1 coordination / one agreed work plan</p><p className="mt-4 text-center text-sm text-muted-foreground">Defined scope · site priorities · communication · follow-up</p></div>
    </div></section>
    <section className="bg-muted py-20"><div className="site-shell"><p className="text-sm font-bold uppercase tracking-widest text-primary">Seven connected capabilities</p><h2 className="mt-4 max-w-3xl text-3xl font-bold md:text-4xl">Start with the whole site. Define the work precisely.</h2><p className="mt-5 max-w-3xl text-muted-foreground">These groups help organize your assessment. Specific tasks, delivery method and availability are confirmed for each property; they are not a blanket promise of every trade or service.</p><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{capabilities.map((item, index) => <article key={item.value} className="flex flex-col border border-border bg-background p-7"><p className="text-sm font-bold text-primary">0{index + 1}</p><h3 className="mt-4 text-2xl font-bold">{item.title}</h3><p className="my-5 flex-1 leading-relaxed text-muted-foreground">{item.text}</p><Link href={item.href} className="font-bold text-primary underline underline-offset-4">{item.label}</Link></article>)}</div></div></section>
    <section className="site-shell py-20"><p className="text-sm font-bold uppercase tracking-widest text-primary">Property lifecycle</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">Continuity from development to daily operations.</h2><ol className="mt-10 grid gap-8 md:grid-cols-3">{[
      ['Development / Construction', 'Discuss clearing, grading, vegetation and corrective site needs alongside construction milestones. Coordinate scope with the project team.'],
      ['Turnover / Establishment', 'Identify cleanup, establishment and perimeter priorities. Agree the property baseline and responsibilities for ongoing care.'],
      ['Long-Term Operations', 'Set a recurring work plan, review developing issues and separate routine maintenance from approved corrective projects.'],
    ].map(([title, text], index) => <li key={title} className="border-t-4 border-primary pt-6"><p className="text-sm font-bold text-primary">PHASE 0{index + 1}</p><h3 className="mt-3 text-2xl font-bold">{title}</h3><p className="mt-4 leading-relaxed text-muted-foreground">{text}</p></li>)}</ol></section>
    <section className="bg-secondary py-20 text-white"><div className="site-shell grid gap-12 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-widest text-white">Data centers & complex campuses</p><h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">The land outside a secure facility still needs a clear plan.</h2><p className="mt-6 text-lg leading-relaxed text-slate-200">Perimeter vegetation, berms, buffer areas and undeveloped acreage sit alongside drainage, ponds, trees and service roads. Consider those exterior needs together when defining a property scope.</p><p className="mt-5 leading-relaxed text-slate-200">Discuss access coordination, work windows, safety expectations, communication and documentation with your site team. The agreed plan must fit the customer’s protocols; no security clearance, uptime guarantee or response commitment is implied.</p><Link href="/services/pond-waterway-management" className="mt-7 inline-block font-bold text-white underline underline-offset-4">Explore pond & waterway maintenance</Link></div><div><img src={dataCenterCampus} alt="Aerial view of a data-center campus with maintained green space, tree buffers and a stormwater pond" loading="lazy" decoding="async" sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/3] w-full object-cover" /><ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">{['Perimeter vegetation & buffers', 'Drainage, erosion & ponds', 'Service roads & access areas', 'Restoration & storm cleanup'].map(item => <li key={item} className="border-l-2 border-white/60 pl-3">{item}</li>)}</ul></div></div></section>
    <section className="site-shell py-20"><div className="grid gap-12 lg:grid-cols-2"><div><h2 className="text-3xl font-bold">Site management shaped around your property.</h2><p className="mt-5 leading-relaxed text-muted-foreground">Use the assessment to discuss fit for manufacturing and automotive-supplier campuses, distribution and logistics centers, industrial parks, biopharmaceutical and corporate campuses, mixed-use developments, utility properties and managed commercial acreage.</p></div><div><h3 className="text-2xl font-bold">Define what recurring management means for your site.</h3><ol className="mt-5 space-y-4">{['Agree inspection areas, priorities and a practical service schedule.', 'Specify the observations, photos and updates your team needs.', 'Review emerging issues and separate recommendations from approved work.', 'Confirm corrective scope, responsibility and the next review.'].map((item, index) => <li key={item} className="flex gap-4"><span className="font-bold text-primary">0{index + 1}</span><span>{item}</span></li>)}</ol><p className="mt-5 text-sm text-muted-foreground">Reporting format and response arrangements are defined in the agreement.</p></div></div></section>
    <section className="bg-muted py-20"><div className="site-shell"><p className="text-sm font-bold uppercase tracking-widest text-primary">P1 Commercial Site Assessment</p><h2 className="mt-4 max-w-3xl text-3xl font-bold md:text-4xl">A useful starting point before a long-term commitment.</h2><div className="mt-9 grid gap-8 md:grid-cols-3">{[
      ['1. Share the property', 'Tell us where it is, what you need and its current stage. A city or region is enough to start if the address is not yet confirmed.'],
      ['2. Confirm the assessment', 'Staff reviews fit and confirms availability, access requirements, scope, any fee and a property walk. Your inquiry does not reserve a time.'],
      ['3. Agree the next steps', 'Discuss a reviewed baseline of observations, priorities and recommended work. The assessment deliverable and recurring or corrective proposal are agreed with you.'],
    ].map(([title, text]) => <div key={title}><h3 className="text-xl font-bold">{title}</h3><p className="mt-4 leading-relaxed text-muted-foreground">{text}</p></div>)}</div><p className="mt-8 max-w-3xl text-sm text-muted-foreground">Agree the assessment scope, reviewed observations and proposed next steps with P1. Discuss procurement requirements and supporting evidence privately during qualification.</p></div></section>
    <section tabIndex={-1} aria-labelledby="assessment-request-heading" id="assessment-request" className="site-shell scroll-mt-24 py-20"><div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div className="lg:sticky lg:top-28"><p className="text-sm font-bold uppercase tracking-widest text-primary">Start the conversation</p><h2 id="assessment-request-heading" className="mt-4 text-3xl font-bold md:text-4xl">Request a Site Assessment</h2><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Tell us about the exterior work, the property and the relationship you are looking for. We will use these details to review the request and discuss the next step.</p><div className="mt-8 space-y-4"><p><a href={PHONE_HREF} className="text-xl font-bold text-primary underline">{PHONE_DISPLAY}</a></p><p><a href={`mailto:${EMAIL}`} className="break-all font-bold text-primary underline">{EMAIL}</a></p><Link href="/service-areas" className="inline-block font-bold text-primary underline">Review our service areas</Link></div></div><AssessmentForm /></div></section>
  </Layout>;
}
