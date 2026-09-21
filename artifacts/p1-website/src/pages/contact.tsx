import { acquisitionSource, trackAcquisition } from "@/lib/acquisition";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { localBusinessSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Phone, Clock, MapPin } from "lucide-react";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { CredentialsStrip } from "@/components/content/CredentialsStrip";

const WORK_TYPES = [
  ["maintenance", "Grounds maintenance contract"],
  ["sitework", "Clearing, grading or drainage project"],
  ["farm", "Farm or large acreage"],
  ["pond", "Pond or waterway"],
  ["snow", "Snow and ice"],
  ["unsure", "Not sure yet"],
] as const;

const FAQS = [
  {
    question: "What's your minimum property size?",
    answer: "One acre. We work on commercial, industrial, agricultural, municipal and institutional property. We don't take residential lawns.",
  },
  {
    question: "Do you work in both North and South Carolina?",
    answer: "Yes. We cover Upstate South Carolina and the Charlotte region, including York and Lancaster counties on the SC side of the line.",
  },
  {
    question: "How soon can you start?",
    answer: "It depends on the season and the size of the job. Your estimate includes a start date, and maintenance contracts can usually begin soon after you sign.",
  },
  {
    question: "Do you offer ongoing maintenance contracts?",
    answer: "Yes. Weekly, biweekly, monthly and seasonal schedules, priced per visit or per season.",
  },
  {
    question: "Are you licensed and insured?",
    answer: "Yes, in both states. If your company needs a certificate of insurance or vendor paperwork, tell us in the form and we'll send it with the estimate.",
  },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [acreage, setAcreage] = useState("");
  const [workType, setWorkType] = useState("");

  const formStarted = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ payload: string; key: string } | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (submitted) successHeading.current?.focus(); }, [submitted]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type");
    if (WORK_TYPES.some(([value]) => value === requested)) setWorkType(requested || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const get = (key: string) => String(fd.get(key) || "").trim();
    const payload = JSON.stringify({
      name: get("name"), email: get("email"), phone: get("phone"),
      company: get("company"), address: get("address"), acreage: get("acreage"),
      propertyType: get("propertyType"), services: [get("workType")],
      message: get("project"), website: get("website"),
      attribution: acquisitionSource(),
    });
    if (!request.current || request.current.payload !== payload) {
      request.current = { payload, key: crypto.randomUUID() };
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/forms/p1-estimate/submit", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": request.current.key },
        body: payload, signal: AbortSignal.timeout(20000),
      });
      const receipt = await response.json().catch(() => null);
      if (!response.ok || !receipt?.submissionId) throw new Error("We couldn't confirm your request. Please try again, or call us directly. Your information is still here.");
      setSubmitted(true);
      request.current = null;
    } catch (cause) {
      trackAcquisition("form_error");
      setError("We couldn’t confirm your request. Please try again or call us. Your information is still here.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Layout>
      <SEO 
        title="Request a Site Visit or Estimate | P1"
        description="Tell us about your property and we'll walk it with you. Free site visit and written estimate for sites of an acre or more in Upstate SC and Charlotte."
        jsonLd={[
          localBusinessSchema(), faqSchema(FAQS),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />

      {/* PAGE HEADLINE */}
      <PageHero
        eyebrow="P1 Land & Property Management"
        title="Tell us about the property"
        subtitle="An address and a few sentences are enough. We'll call you back within one business day to set up a time to walk it. The visit and the written estimate are free."
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="site-shell grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* FORM COLUMN */}
          <div className="lg:col-span-7 bg-card border border-border p-8 md:p-12 rounded-xl shadow-lg">
            <h2 className="text-3xl font-serif font-bold text-secondary mb-8">Tell us about the property</h2>
            
            {submitted ? (
              <div className="py-16 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h3 ref={successHeading} tabIndex={-1} className="text-2xl font-serif font-bold text-secondary">Got it.</h3>
                <p className="text-lg text-secondary/80 max-w-md mx-auto">
                  Someone from P1 will call or email you within one business day to set up a time to walk the property.
                </p>
                <p className="text-base text-secondary/70 max-w-md mx-auto">
                  Prefer to talk now? Call us directly at{" "}
                  <a href={PHONE_HREF} className="font-bold text-primary hover:underline">{PHONE_DISPLAY}</a>.
                </p>
                <Button onClick={() => { formStarted.current = false; setSubmitted(false); }} variant="outline" className="mt-8">Submit Another Request</Button>
              </div>
            ) : (
              <form onFocus={() => { if (!formStarted.current) { formStarted.current = true; trackAcquisition("form_start"); } }} onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
                <fieldset className="space-y-3 rounded-lg border border-border p-4">
                  <legend className="px-1 font-medium text-secondary">What kind of work is this? *</legend>
                  <div className="grid gap-3 sm:grid-cols-2">{WORK_TYPES.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-secondary"><input required name="workType" type="radio" value={value} checked={workType === value} onChange={() => setWorkType(value)} />{label}</label>)}</div>
                </fieldset>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input id="name" name="name" autoComplete="name" required maxLength={150} className="bg-background" />
                </div>
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Leave this empty</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (optional)</Label>
                    <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className="bg-background" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" name="company" maxLength={300} className="bg-background" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Property Address / City *</Label>
                  <Input id="address" name="address" maxLength={500} required className="bg-background" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="acreage">Approximate acreage *</Label>
                    <Select name="acreage" required value={acreage} onValueChange={setAcreage}>
                      <SelectTrigger id="acreage" className="bg-background">
                        <SelectValue placeholder="Select Acreage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1">Under 1 acre</SelectItem>
                        <SelectItem value="1-5">1–5 acres</SelectItem>
                        <SelectItem value="5-20">5–20 acres</SelectItem>
                        <SelectItem value="20-100">20–100 acres</SelectItem>
                        <SelectItem value="100+">100+ acres</SelectItem>
                      </SelectContent>
                    </Select>
                    {acreage === "under-1" && <p className="text-sm leading-relaxed text-secondary/80">We work on properties of an acre or more. If your site is smaller, we're probably not the right fit, but call us and we'll point you to someone good.</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property type *</Label>
                    <Select name="propertyType" required>
                      <SelectTrigger id="propertyType" className="bg-background">
                        <SelectValue placeholder="Select Property Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial / office / retail</SelectItem>
                        <SelectItem value="industrial">Industrial / manufacturing / distribution</SelectItem>
                        <SelectItem value="agricultural">Farm / agricultural</SelectItem>
                        <SelectItem value="municipal">Municipal / public</SelectItem>
                        <SelectItem value="institutional">Institutional (school, church, hospital, campus)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timing">When do you need this done?</Label>
                  <Select name="timing"><SelectTrigger id="timing" className="bg-background"><SelectValue placeholder="Select timing" /></SelectTrigger><SelectContent><SelectItem value="asap">As soon as possible</SelectItem><SelectItem value="30-days">Within 30 days</SelectItem><SelectItem value="1-3-months">1–3 months</SelectItem><SelectItem value="planning">Planning ahead</SelectItem></SelectContent></Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Tell us about your project *</Label>
                  <Textarea id="project" name="project" required maxLength={5000} rows={4} className="bg-background resize-y" placeholder="Any specific issues or timeline requirements?" />
                </div>

                <p className="text-sm text-secondary/80">We use these details to respond to your project inquiry. Please avoid including sensitive information.</p>
                {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
                <Button disabled={pending} type="submit" size="lg" className="w-full text-lg h-14 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  {pending ? "Sending request…" : "Send It Over"}
                </Button>
              </form>
            )}
          </div>

          {/* CONTACT DETAILS & INFO */}
          <div className="lg:col-span-5 space-y-12">
            
            <div className="bg-secondary text-white p-8 rounded-xl shadow-lg space-y-8">
              <h3 className="text-2xl font-serif font-bold">Contact Details</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <a className="font-bold text-lg" href={PHONE_HREF}>{PHONE_DISPLAY}</a>
                    <p className="text-white/60 text-sm">Call us direct</p>
                  </div>
                </div>
                <p className="text-white/80">To protect our team from spam, please use the secure estimate form on this page.</p>
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <p className="font-bold text-lg">Service Areas:</p>
                    <p className="text-white/80">Upstate South Carolina and the Charlotte region</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <p className="font-bold text-lg">Hours:</p>
                    <p className="text-white/80">Monday–Friday, 7 AM–6 PM · Saturday by appointment</p>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/20">
                <p className="font-bold italic text-white/90">
                  "Photos from after a hard rain tell us more than photos on a dry day."
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-serif font-bold text-secondary">What happens next</h3>
              <ul className="space-y-4">
                {[
                  "We call you back within one business day to ask a few questions and set a time.",
                  "We walk the property with you. Bring whoever knows where the problems are.",
                  "You get a written estimate with the scope, the order of work, the timeline and the price.",
                  "You decide. No pressure and no follow-up calls every other day."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-secondary/80">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                      {i + 1}
                    </div>
                    <span className="mt-0.5 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      <CredentialsStrip />

      {/* FAQ */}
      <section className="py-24 bg-muted border-t border-border">
        <div className="site-shell space-y-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary text-center">
            FAQ: Contact P1
          </h2>
          
          <FaqAccordion items={FAQS} />
        </div>
      </section>

    </Layout>
  );
}
