import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/seo';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/site';
import { acquisitionSource, trackAcquisition } from '@/lib/acquisition';
import { commercialPayload, commercialErrors, commercialErrorSummary, inquiryAttempt, sendCommercialInquiry } from '@/lib/commercial-inquiry';
import { responsiveImageProps } from '@/lib/responsive-images';
import { breadcrumbSchema } from '@/lib/structured-data';
import { ContextualLinks } from '@/components/content/ContextualLinks';
import hero from '@/assets/service-commercial.png';
import dataCenterCampus from '@/assets/data-center-campus.png';

const capabilities = [
  { title: 'Grounds & Vegetation Management', text: 'Bring acreage, overgrowth and perimeter vegetation into a practical maintenance plan.', href: '/services/commercial-landscaping', label: 'recurring grounds care', value: 'grounds_vegetation' },
  { title: 'Stormwater & Drainage', text: "Keep ponds, ditches, and drainage working together to move water where it needs to go.", href: '/services/drainage', label: 'Drainage services', value: 'stormwater_drainage' },
  { title: 'Grading & Erosion', text: "Repair washouts, restore damaged ground, and correct uneven grades.", href: '/services/grading-site-preparation', label: 'Grading and site preparation', value: 'grading_erosion' },
  { title: 'Tree & Land Management', text: 'Plan clearing, tree work and brush management around the areas you use and the land you want to retain.', href: '/services/tree-services', label: 'Tree and land services', value: 'tree_land' },
  { title: 'Roads, Access & Exterior Infrastructure', text: "Maintain gravel access roads and site grades around the way you use your property.", href: '/services/property-reconstruction', label: 'Property reconstruction', value: 'roads_access' },
  { title: 'Storm Cleanup & Repairs', text: "Tell us about storm debris, washouts, or damaged ground. We'll confirm availability and the work needed. This form is not emergency dispatch.", href: '/services/property-reconstruction', label: 'Property repairs', value: 'emergency_corrective' },
  { title: 'Recurring Site Management', text: "Set a regular maintenance schedule, decide what to check, and agree how we'll keep you updated.", href: '/services/commercial-landscaping', label: 'Recurring grounds management', value: 'recurring_site_management' },
  { title: 'Commercial Snow & Ice Management', text: 'Plan seasonal plowing, anti-icing and documented storm response around your site, access priorities and winter risk.', href: '/services/commercial-snow-ice-management', label: 'Snow and ice management', value: 'commercial_snow_ice' },
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
    <p className="mt-4">Thanks for telling us about your property. We'll contact you to talk through the work and available dates. Your appointment isn't booked yet.</p>
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
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{[...capabilities.map(item => ({ value: item.value, title: item.title })), { value: 'general_site_assessment', title: 'General site assessment / not sure yet' }].map(item => <label key={item.value} htmlFor={`commercial-service-${item.value}`} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-sm border border-slate-300 p-3 text-sm"><input id={`commercial-service-${item.value}`} className="mt-1 h-4 w-4 shrink-0 accent-primary" type="checkbox" name="services" value={item.value} />{item.title}</label>)}</div>
      {errors.services && <p id="services-error" className="mt-2 text-sm font-semibold text-red-800">{errors.services}</p>}
    </fieldset>
    <div className="grid gap-6 sm:grid-cols-2">
      <div><label htmlFor="commercial-serviceTiming" className="font-semibold">Type of need (required)</label><select id="commercial-serviceTiming" name="serviceTiming" required className={fieldClass} aria-invalid={!!errors.serviceTiming} aria-describedby={errors.serviceTiming ? 'serviceTiming-error' : undefined}><option value="">Select one</option><option value="immediate">One-time project or repair</option><option value="recurring">Regular maintenance</option><option value="both">Both</option></select>{errors.serviceTiming && <p id="serviceTiming-error" className="mt-2 text-sm text-red-800">{errors.serviceTiming}</p>}</div>
      <div><label htmlFor="commercial-projectStage" className="font-semibold">Property / project stage (required)</label><select id="commercial-projectStage" name="projectStage" required className={fieldClass} aria-invalid={!!errors.projectStage} aria-describedby={errors.projectStage ? 'projectStage-error' : undefined}><option value="">Select one</option><option value="development_construction">Preparing for construction</option><option value="turnover_establishment">Finishing a new site</option><option value="long_term_operations">Caring for an established property</option><option value="unknown">Not sure yet</option></select>{errors.projectStage && <p id="projectStage-error" className="mt-2 text-sm text-red-800">{errors.projectStage}</p>}</div>
    </div>
    <details className="border-y border-slate-200 py-4"><summary className="cursor-pointer font-semibold text-primary">Add property details (optional)</summary><div className="mt-5 grid gap-6 sm:grid-cols-2">{input('title', 'Your role / title', 'text', false, 'organization-title', 150)}{input('propertyName', 'Property / project name', 'text', false, undefined, 300)}{input('propertyType', 'Property type / industry', 'text', false, undefined, 150)}{input('acreage', 'Approximate acreage — range or unknown is fine', 'text', false, undefined, 100)}</div></details>
    <div><label htmlFor="commercial-message" className="font-semibold">Anything else we should know? (optional)</label><textarea id="commercial-message" name="message" rows={4} maxLength={5000} className={fieldClass} aria-describedby="commercial-privacy" /><p id="commercial-privacy" className="mt-2 text-sm text-slate-600">Share the need and useful timing. Please do not include access codes, facility-security plans or sensitive documents.</p></div>
    <div hidden aria-hidden="true"><label htmlFor="commercial-website">Leave this field empty</label><input id="commercial-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <p className="text-sm text-slate-600">We'll use these details to follow up on your inquiry and arrange a free site assessment. We'll confirm access and available dates with you.</p>
    <button disabled={busy} type="submit" className={`${ctaClass} w-full disabled:opacity-70`}>{busy ? 'Sending your request…' : 'Get a Free Site Assessment'}</button>
    <p className="text-sm text-slate-600">Prefer to talk? <a className="font-semibold text-primary underline" href={PHONE_HREF}>{PHONE_DISPLAY}</a></p>
  </form>;
}

export default function Commercial() {
  return <Layout assessmentCta>
    <SEO
      title="Commercial & Industrial Site Management | P1 Land Management"
      description="Grounds care, drainage, clearing, and repairs for large commercial properties in Upstate SC and greater Charlotte. Start with a free site assessment."
      jsonLd={breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Commercial Site Management', path: '/commercial' },
      ])}
    />
    <section className="relative isolate overflow-hidden bg-secondary text-white">
      <img src={hero} alt="Illustrative aerial view of maintained commercial grounds" fetchPriority="high" decoding="async" {...responsiveImageProps(hero, "100vw")} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-slate-950/80" />
      <div className="site-shell py-20 md:py-28"><div className="max-w-4xl">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-white">Commercial & Industrial / Exterior Site Operations</p>
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">Grounds and Land Care for Large Commercial & Industrial Properties</h1>
        <p className="mt-7 max-w-3xl text-xl font-semibold md:text-2xl">One Team to Call for Your Property's Exterior Care.</p>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">Nearly 30 years of experience in grounds care, drainage, and earthwork. We help you plan the work around deliveries, access, and daily operations, from site preparation to regular maintenance.</p>
        <div className="mt-9 flex flex-col gap-4 sm:flex-row"><a href="#assessment-request" className={ctaClass}>Get a Free Site Assessment</a><a href={PHONE_HREF} className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white px-6 py-4 font-bold text-white">Discuss Your Property</a></div>
        <p className="mt-7 text-sm text-slate-200">Serving Upstate South Carolina and greater Charlotte. We'll confirm coverage for your property when we talk.</p>
      </div></div>
    </section>
    <section className="site-shell py-20"><div className="grid items-center gap-12 lg:grid-cols-2">
      <div><p className="text-sm font-bold uppercase tracking-widest text-primary">One Team to Call</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">A Plan for the Whole Property</h2><p className="mt-6 text-lg leading-relaxed text-muted-foreground">A washed-out road may need both grading and drainage. Overgrown ground may need clearing before regular mowing can begin. We look at how those jobs fit together and explain what should happen first.</p><p className="mt-4 text-muted-foreground">We'll explain what our crew will handle and where a specialist may be needed.</p></div>
      <div className="rounded-sm border border-border bg-muted p-6 md:p-9" aria-label="Grounds, drainage, clearing, access roads, and repairs in one property plan"><ul className="grid grid-cols-2 gap-3">{['Grounds & vegetation', 'Water & drainage', 'Land & trees', 'Roads & access', 'Repairs & restoration'].map(label => <li key={label} className="border border-border bg-background p-4 font-semibold">{label}</li>)}</ul><div className="mx-auto h-8 w-px bg-secondary" /><p className="bg-secondary p-5 text-center text-xl font-bold text-white">One Team. A Clear Work Plan.</p><p className="mt-4 text-center text-sm text-muted-foreground">Clear priorities, regular updates, and a plan in writing</p></div>
    </div></section>
    <section className="bg-muted py-20"><div className="site-shell"><p className="text-sm font-bold uppercase tracking-widest text-primary">How We Can Help</p><h2 className="mt-4 max-w-3xl text-3xl font-bold md:text-4xl">Walk the Property. Plan the Work.</h2><p className="mt-5 max-w-3xl text-muted-foreground">We'll look at the whole site, talk through what needs attention now, and plan regular care alongside larger repairs.</p><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{capabilities.map((item, index) => <article key={item.value} className="flex flex-col border border-border bg-background p-7"><p className="text-sm font-bold text-primary">0{index + 1}</p><h3 className="mt-4 text-2xl font-bold">{item.title}</h3><p className="my-5 flex-1 leading-relaxed text-muted-foreground">{item.text}</p><Link href={item.href} className="font-bold text-primary underline underline-offset-4">{item.label}</Link></article>)}</div></div></section>
    <section className="site-shell py-20"><p className="text-sm font-bold uppercase tracking-widest text-primary">From the Ground Up</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">From Site Preparation to Regular Upkeep</h2><ol className="mt-10 grid gap-8 md:grid-cols-3">{[
      ['Site Preparation', "Plan clearing, grading, and drainage around your construction schedule and project requirements."],
      ['Getting the Grounds Established', "Get new grounds established, clear leftover debris, and decide what ongoing care will include."],
      ['Ongoing Care', "Keep a regular maintenance schedule and review new problems as they arise. Larger repairs get a separate estimate for your approval."],
    ].map(([title, text], index) => <li key={title} className="border-t-4 border-primary pt-6"><p className="text-sm font-bold text-primary">PHASE 0{index + 1}</p><h3 className="mt-3 text-2xl font-bold">{title}</h3><p className="mt-4 leading-relaxed text-muted-foreground">{text}</p></li>)}</ol></section>
    <section className="bg-secondary py-20 text-white"><div className="site-shell grid gap-12 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-widest text-white">Data centers & complex campuses</p><h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">The land outside a secure facility still needs a clear plan.</h2><p className="mt-6 text-lg leading-relaxed text-slate-200">Perimeter vegetation, ponds, trees, and service roads all affect how the grounds work. We look at them together when planning maintenance for a secure facility.</p><p className="mt-5 leading-relaxed text-slate-200">We'll confirm access, work hours, safety rules, and the records your site team needs before scheduling the crew.</p><Link href="/commercial/data-centers-secure-facilities" className="mt-7 inline-block font-bold text-white underline underline-offset-4">Explore data center & secure facility grounds</Link></div><div><img src={dataCenterCampus} alt="Aerial view of a data-center campus with maintained green space, tree buffers and a stormwater pond" loading="lazy" decoding="async" {...responsiveImageProps(dataCenterCampus, "(min-width: 1024px) 45vw, 100vw")} className="aspect-[4/3] w-full object-cover" /><ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">{['Perimeter vegetation & buffers', 'Drainage, erosion & ponds', 'Service roads & access areas', 'Restoration & storm cleanup'].map(item => <li key={item} className="border-l-2 border-white/60 pl-3">{item}</li>)}</ul></div></div></section>
    <section className="site-shell py-20"><div className="grid gap-12 lg:grid-cols-2"><div><h2 className="text-3xl font-bold">Site management shaped around your property.</h2><p className="mt-5 leading-relaxed text-muted-foreground">We work with manufacturing and automotive-supplier campuses, <Link href="/commercial/data-centers-secure-facilities" className="font-bold text-primary underline">data centers, distribution and logistics facilities</Link>, industrial parks, biopharmaceutical and corporate campuses, mixed-use developments, utility properties and managed commercial acreage.</p></div><div><h3 className="text-2xl font-bold">Regular Care That Fits Your Site</h3><ol className="mt-5 space-y-4">{["Choose the areas to check and set a service schedule.", "Agree which photos, observations, and updates are useful to your team.", "Talk through new issues before deciding on additional work.", "Approve repairs and agree who will handle them and when."].map((item, index) => <li key={item} className="flex gap-4"><span className="font-bold text-primary">0{index + 1}</span><span>{item}</span></li>)}</ol><p className="mt-5 text-sm text-muted-foreground">Your agreement sets out reporting and response arrangements.</p></div></div></section>
    <section className="bg-muted py-20"><div className="site-shell"><p className="text-sm font-bold uppercase tracking-widest text-primary">P1 Commercial Site Assessment</p><h2 className="mt-4 max-w-3xl text-3xl font-bold md:text-4xl">Start With a Site Walk</h2><div className="mt-9 grid gap-8 md:grid-cols-3">{[
      ['1. Tell Us About the Property', 'Tell us where it is, what you need and its current stage. A city or region is enough to start if the address is not yet confirmed.'],
      ['2. Walk the Site Together', "We'll find a time to walk the property around your operating schedule and our availability. Together, we'll look at what needs attention first."],
      ['3. Plan the Next Steps', "After the visit, we'll talk through what we found and recommend the next steps. You'll know what the proposed work includes before making a decision."],
    ].map(([title, text]) => <div key={title}><h3 className="text-xl font-bold">{title}</h3><p className="mt-4 leading-relaxed text-muted-foreground">{text}</p></div>)}</div><p className="mt-8 max-w-3xl text-sm text-muted-foreground">Before work starts, we'll confirm access, scheduling, vendor paperwork, and any specialist or technical studies needed. Security clearance, uptime, and emergency response commitments need a separate written agreement.</p></div></section>
    <section tabIndex={-1} aria-labelledby="assessment-request-heading" id="assessment-request" className="site-shell scroll-mt-24 py-20"><div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div className="lg:sticky lg:top-28"><p className="text-sm font-bold uppercase tracking-widest text-primary">Start the conversation</p><h2 id="assessment-request-heading" className="mt-4 text-3xl font-bold md:text-4xl">Get a Free Site Assessment</h2><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Tell us about your property and what needs attention. We'll get in touch to talk through the work.</p><div className="mt-8 space-y-4"><p><a href={PHONE_HREF} className="text-xl font-bold text-primary underline">{PHONE_DISPLAY}</a></p><p className="text-muted-foreground">To protect our team from spam, please use the secure form on this page.</p><Link href="/service-areas" className="inline-block font-bold text-primary underline">Review our service areas</Link></div></div><AssessmentForm /></div></section>
    <ContextualLinks />
  </Layout>;
}
