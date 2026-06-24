import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => ((fd.get(k) as string) || "").trim();
    const services = fd.getAll("service").join(", ") || "Not specified";

    const lines = [
      `Name: ${get("firstName")} ${get("lastName")}`,
      `Phone: ${get("phone")}`,
      `Email: ${get("email")}`,
      `Property Address / City: ${get("address")}`,
      `Approximate Acreage: ${get("acreage") || "Not specified"}`,
      `Property Type: ${get("propertyType") || "Not specified"}`,
      `Service(s) Needed: ${services}`,
      `How they heard about us: ${get("referral") || "N/A"}`,
      "",
      "Project Details:",
      get("project") || "(none provided)",
    ];

    const subject = encodeURIComponent("Free Estimate Request — P1 Land & Property Management");
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
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
      <section className="bg-secondary text-white py-24 px-4 text-center">
        <div className="container mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif font-extrabold tracking-tight text-white">
            Get a Free On-Site Estimate
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Tell us about your property and what you need. We'll schedule a time to walk the land and give you a straight, no-obligation estimate. Most assessments scheduled within 48 hours.
          </p>
        </div>
      </section>

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* FORM COLUMN */}
          <div className="lg:col-span-7 bg-card border border-border p-8 md:p-12 rounded-xl shadow-lg">
            <h2 className="text-3xl font-serif font-bold text-secondary mb-8">Request Your Free Estimate</h2>
            
            {submitted ? (
              <div className="py-16 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-secondary">Your Request Is Ready to Send</h3>
                <p className="text-lg text-secondary/80 max-w-md mx-auto">
                  We've opened a pre-filled email addressed to our team — just hit send in your email app and we'll reach out within 1 business day to schedule your free on-site visit.
                </p>
                <p className="text-base text-secondary/70 max-w-md mx-auto">
                  Prefer to talk now? Call us directly at{" "}
                  <a href={PHONE_HREF} className="font-bold text-primary hover:underline">{PHONE_DISPLAY}</a>.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-8">Submit Another Request</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" required className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" name="lastName" required className="bg-background" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" name="phone" type="tel" required className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" required className="bg-background" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Property Address / City *</Label>
                  <Input id="address" name="address" required className="bg-background" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Approximate Acreage *</Label>
                    <Select name="acreage" required>
                      <SelectTrigger className="bg-background">
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
                    <Label>Property Type *</Label>
                    <Select name="propertyType" required>
                      <SelectTrigger className="bg-background">
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
                  <Label>Service Needed *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
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
                  <Label htmlFor="project">Tell us about your project</Label>
                  <Textarea id="project" name="project" rows={4} className="bg-background resize-y" placeholder="Any specific issues or timeline requirements?" />
                </div>

                <div className="space-y-2">
                  <Label>How did you hear about us? (Optional)</Label>
                  <Select name="referral">
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search">Search Engine (Google)</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="referral">Friend / Colleague</SelectItem>
                      <SelectItem value="truck">Saw your trucks</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="lg" className="w-full text-lg h-14 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  Request My Free Estimate
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
                    <p className="font-bold text-lg">+1 (704) 221-8928</p>
                    <p className="text-white/60 text-sm">Call us direct</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <p className="font-bold text-lg">info@p1landmanagement.com</p>
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
                  "We respond to all estimate requests within 1 business day. Most on-site visits scheduled within 48 hours."
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-serif font-bold text-secondary">What Happens After You Submit</h3>
              <ul className="space-y-4">
                {[
                  "One of our team members reviews your request and reaches out within 1 business day",
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
      <section className="py-24 px-4 bg-muted border-t border-border">
        <div className="container mx-auto max-w-4xl space-y-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="grid gap-6">
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-lg text-secondary mb-2">What is your minimum property size?</h4>
              <p className="text-secondary/80 leading-relaxed">P1 specializes in properties 1 acre and larger. We do not take standard residential lawn maintenance jobs.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-lg text-secondary mb-2">Do you serve both South Carolina and North Carolina?</h4>
              <p className="text-secondary/80 leading-relaxed">Yes. We serve Upstate South Carolina (Greenville, Spartanburg, and surrounding areas) and the Charlotte, NC region (Charlotte, Concord, Mooresville, Lake Norman, Gastonia, and surrounding areas).</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-lg text-secondary mb-2">How quickly can you start a project?</h4>
              <p className="text-secondary/80 leading-relaxed">Timeline depends on project type and current schedule. After your estimate, we'll give you a realistic start date. Maintenance contracts can often begin within two weeks of signing.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-lg text-secondary mb-2">Do you offer ongoing maintenance contracts?</h4>
              <p className="text-secondary/80 leading-relaxed">Yes. We offer weekly, bi-weekly, and monthly maintenance programs for commercial, agricultural, and large residential properties.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-lg text-secondary mb-2">Are you licensed and insured?</h4>
              <p className="text-secondary/80 leading-relaxed">Yes. P1 Land & Property Management is fully licensed and insured for all services we provide.</p>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
