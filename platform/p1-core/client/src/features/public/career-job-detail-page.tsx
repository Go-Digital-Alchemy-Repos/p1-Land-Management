import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  Briefcase,
  CheckCircle2,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MapPin,
  Share2,
  Twitter,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { JsonLd } from "@/components/shared/json-ld";
import { useFrontendEditTarget } from "@/features/frontend-edit/frontend-edit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/use-seo";
import { buildBreadcrumbLd, buildJobPostingLd } from "@/lib/structured-data";
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_WORK_MODE_LABELS,
  type CareerJob,
  type CareerSettings,
  type SeoSettings,
} from "@shared/schema";

function formatSalary(job: CareerJob) {
  if (!job.salaryVisible || (!job.salaryMin && !job.salaryMax)) return null;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.salaryCurrency || "USD",
    maximumFractionDigits: 0,
  });
  if (job.salaryMin && job.salaryMax)
    return `${formatter.format(job.salaryMin)}-${formatter.format(job.salaryMax)} / ${job.salaryPeriod}`;
  return `${formatter.format(job.salaryMin || job.salaryMax || 0)} / ${job.salaryPeriod}`;
}

function RichSection({ title, html }: { title: string; html?: string | null }) {
  if (!html) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function ShareActions({ job, settings }: { job: CareerJob; settings?: CareerSettings }) {
  const { toast } = useToast();
  const sharing = settings?.sharing;
  if (!sharing?.enabled) return null;
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/careers/${job.slug}`
      : `/careers/${job.slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(job.title);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Job link copied" });
  };

  const nativeShare = async () => {
    await navigator.share?.({ title: job.title, url });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {sharing.copyLink && (
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
      )}
      {sharing.nativeShare && canNativeShare && (
        <Button variant="outline" size="sm" onClick={nativeShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      )}
      {sharing.email && (
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}>
            <Mail className="mr-2 h-4 w-4" />
            Email
          </a>
        </Button>
      )}
      {sharing.linkedin && (
        <Button variant="outline" size="icon" asChild aria-label="Share on LinkedIn">
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        </Button>
      )}
      {sharing.facebook && (
        <Button variant="outline" size="icon" asChild aria-label="Share on Facebook">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            <Facebook className="h-4 w-4" />
          </a>
        </Button>
      )}
      {sharing.x && (
        <Button variant="outline" size="icon" asChild aria-label="Share on X">
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noreferrer"
          >
            <Twitter className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}

export default function CareerJobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const { data: job, isLoading } = useQuery<CareerJob>({ queryKey: [`/api/careers/jobs/${slug}`] });
  const { data: settings } = useQuery<CareerSettings>({ queryKey: ["/api/careers/settings"] });
  const { data: globalSeo } = useQuery<SeoSettings>({ queryKey: ["/api/seo/global"] });
  const salary = job ? formatSalary(job) : null;

  useFrontendEditTarget(
    job
      ? {
          kind: "career-job",
          id: job.id,
          label: `Edit ${job.title}`,
        }
      : null,
  );

  useSeo({
    title: job ? `${job.metaTitle || job.title} | Careers` : "Careers",
    description: job?.metaDescription || job?.summary || undefined,
    canonical:
      job && typeof window !== "undefined"
        ? `${window.location.origin}/careers/${job.slug}`
        : undefined,
    noindex: job?.noindex,
  });

  const applicationMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/careers/jobs/${slug}/apply`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Could not submit application");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Application received" });
    },
    onError: (error: Error) => {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    },
  });

  const schemas = useMemo(() => {
    if (!job) return [];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      buildJobPostingLd(job, globalSeo),
      buildBreadcrumbLd([
        { name: "Careers", url: `${origin}/careers` },
        { name: job.title, url: `${origin}/careers/${job.slug}` },
      ]),
    ];
  }, [job, globalSeo]);

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("consentAccepted", String(consentAccepted));
    const source = new URLSearchParams(window.location.search).get("source") || "website";
    formData.set("source", source);
    applicationMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <main className="container mx-auto px-4 py-10">Loading job...</main>
      </PageLayout>
    );
  }
  if (!job) {
    return (
      <PageLayout>
        <main className="container mx-auto px-4 py-10">Job not found.</main>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <JsonLd schemas={schemas} />
      <main className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <article className="space-y-8">
          <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
            Back to careers
          </Link>
          <header className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
              <Badge variant="outline">{CAREER_WORK_MODE_LABELS[job.workMode]}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">{job.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
              {job.department && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              {salary && <span>{salary}</span>}
            </div>
            <ShareActions job={job} settings={settings} />
          </header>
          {job.summary && <p className="text-lg text-muted-foreground">{job.summary}</p>}
          <RichSection title="About the Role" html={job.description} />
          <RichSection title="Requirements" html={job.requirements} />
          <RichSection title="Benefits" html={job.benefits} />
          <RichSection title="Application Instructions" html={job.applicationInstructions} />
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Apply for this job</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Application received</AlertTitle>
                  <AlertDescription>
                    Thanks for applying. We sent a confirmation to your email.
                  </AlertDescription>
                </Alert>
              ) : (
                <form className="space-y-4" onSubmit={submitApplication}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" name="firstName" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" name="lastName" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resume">Resume</Label>
                    <Input
                      id="resume"
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coverLetter">Cover letter</Label>
                    <Textarea id="coverLetter" name="coverLetter" rows={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input id="linkedinUrl" name="linkedinUrl" type="url" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                    <Input id="portfolioUrl" name="portfolioUrl" type="url" />
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={consentAccepted}
                      onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                    />
                    <span>
                      I consent to Core Platform storing my application materials for hiring review.
                    </span>
                  </label>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={applicationMutation.isPending || !consentAccepted}
                  >
                    {applicationMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>
    </PageLayout>
  );
}
