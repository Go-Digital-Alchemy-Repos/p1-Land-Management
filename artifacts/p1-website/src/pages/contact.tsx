import { acquisitionSource, trackAcquisition } from "@/lib/acquisition";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { localBusinessSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Phone, Mail, Clock, MapPin } from "lucide-react";
import { EMAIL, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

const SERVICES = [
  "Land Clearing", "Grading & Site Prep", "Drainage", "Turf & Seeding",
  "Tree Services", "Pond & Waterway", "Property Maintenance", "Property Reconstruction", "Not Sure"
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const formStarted = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ payload: string; key: string } | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (submitted) successHeading.current?.focus(); }, [submitted]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const get = (key: string) => String(fd.get(key) || "").trim();
    const payload = JSON.stringify({
      name: get("name"), email: get("email"), phone: get("phone"),
      company: get("company"), address: get("address"), acreage: get("acreage"),
      propertyType: get("propertyType"), services: fd.getAll("service"),
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
        title="Get a Free Estimate | P1 Land & Property Management"
        description="Request a free on-site estimate for land clearing, grading, drainage, turf, pond management, or property maintenance. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          localBusinessSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />

      {/* PAGE HEADLINE */}
      <PageHero
        eyebrow="Get In Touch"
        title={
          <>
            Get a Free{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              On-Site Estimate
            </em>
          </>
        }
        subtitle="Tell us about your property and what you need. We'll schedule a time to walk the land and give you a straight, no-obligation estimate. Scheduling depends on your project and availability."
      />

      <section className="py-10 md:py-16 bg-background">
        <div className="site-shell grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* FORM COLUMN */}
          <div className="lg:col-span-7 bg-card border border-border p-8 md:p-12 rounded-xl shadow-lg">
            <h2 className="text-3xl font-serif font-bold text-secondary mb-8">Request Your Free Estimate</h2>
            
            {submitted ? (
              <div className="py-16 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h3 ref={successHeading} tabIndex={-1} className="text-2xl font-serif font-bold text-secondary">Your Request Has Been Received</h3>
                <p className="text-lg text-secondary/80 max-w-md mx-auto">
                  Your estimate request has been saved. Our team will review your project and contact you to discuss the next step.
                </p>
                <p className="text-base text-secondary/70 max-w-md mx-auto">
                  Prefer to talk now? Call us directly at{" "}
                  <a href={PHONE_HREF} className="font-bold text-primary hover:underline">{PHONE_DISPLAY}</a>.
                </p>
                <Button onClick={() => { formStarted.current = false; setSubmitted(false); }} variant="outline" className="mt-8">Submit Another Request</Button>
              </div>
            ) : (
              <form onFocus={() => { if (!formStarted.current) { formStarted.current = true; trackAcquisition("form_start"); } }} onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
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
                    <Label htmlFor="acreage">Approximate Acreage (optional)</Label>
                    <Select name="acreage">
                      <SelectTrigger id="acreage" className="bg-background">
                        <SelectValue placeholder="Select Acreage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1–5 acres</SelectItem>
                        <SelectItem value="5-20">5–20 acres</SelectItem>
                        <SelectItem value="20-100">20–100 acres</SelectItem>
                        <SelectItem value="100+">100+ acres</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type (optional)</Label>
                    <Select name="propertyType">
                      <SelectTrigger id="propertyType" className="bg-background">
                        <SelectValue placeholder="Select Property Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="agricultural">Agricultural</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="residential">Large Residential</SelectItem>
                        <SelectItem value="hoa">HOA</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label id="services-label">Services Needed (optional)</Label>
                  <div role="group" aria-labelledby="services-label" className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                    {SERVICES.map((service, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Checkbox id={`service-${i}`} name="service" value={service} />
                        <label htmlFor={`service-${i}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                          {service}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Tell us about your project *</Label>
                  <Textarea id="project" name="project" required maxLength={5000} rows={4} className="bg-background resize-y" placeholder="Any specific issues or timeline requirements?" />
                </div>

                <p className="text-sm text-secondary/80">We use these details to respond to your project inquiry. Please avoid including sensitive information.</p>
                {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
                <Button disabled={pending} type="submit" size="lg" className="w-full text-lg h-14 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  {pending ? "Sending request…" : "Request My Free Estimate"}
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
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <a className="font-bold text-lg" href={`mailto:${EMAIL}`}>{EMAIL}</a>
                    <p className="text-white/60 text-sm">Email us</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <p className="font-bold text-lg">Service Areas:</p>
                    <p className="text-white/80">Upstate South Carolina<br/>Greater Charlotte, North Carolina</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <p className="font-bold text-lg">Hours:</p>
                    <p className="text-white/80">Monday – Friday: 7:00 AM – 6:00 PM<br/>Saturday: By Appointment<br/>Sunday: Closed</p>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/20">
                <p className="font-bold italic text-white/90">
                  "Tell us about your property and we’ll discuss scope, availability, and next steps."
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-serif font-bold text-secondary">What Happens After You Submit</h3>
              <ul className="space-y-4">
                {[
                  "One of our team members reviews your request and contacts you",
                  "We schedule a free on-site visit at a time that works for you",
                  "We walk your property, assess the scope, and give you a clear, written estimate",
                  "No pressure, no obligation — just a straight answer on what your property needs and what it will cost"
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

      {/* FAQ */}
      <section className="py-24 bg-muted border-t border-border">
        <div className="site-shell space-y-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="grid gap-6">
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-2">What is your minimum property size?</h3>
              <p className="text-secondary/80 leading-relaxed">P1 specializes in properties 1 acre and larger. We do not take standard residential lawn maintenance jobs.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-2">Do you serve both South Carolina and North Carolina?</h3>
              <p className="text-secondary/80 leading-relaxed">Yes. We serve Upstate South Carolina (Greenville, Spartanburg, and surrounding areas) and the Charlotte, NC region (Charlotte, Concord, Mooresville, Lake Norman, Gastonia, and surrounding areas).</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-2">How quickly can you start a project?</h3>
              <p className="text-secondary/80 leading-relaxed">Timeline depends on project type and current schedule. After your estimate, we'll give you a realistic start date.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-2">Do you offer ongoing maintenance contracts?</h3>
              <p className="text-secondary/80 leading-relaxed">Yes. We offer weekly, bi-weekly, and monthly maintenance programs for commercial, agricultural, and large residential properties.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-2">Are you licensed and insured?</h3>
              <p className="text-secondary/80 leading-relaxed">Ask our team for current insurance documentation and any license information relevant to your project before work begins.</p>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
