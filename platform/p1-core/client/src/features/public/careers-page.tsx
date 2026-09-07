import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Briefcase, Building2, MapPin, Search, X } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeo } from "@/hooks/use-seo";
import { stripHtml } from "@/lib/html";
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_WORK_MODE_LABELS,
  type CareerJob,
} from "@shared/schema";

interface FilterOptions {
  departments: string[];
  locations: string[];
}

function formatSalary(job: CareerJob) {
  if (!job.salaryVisible || (!job.salaryMin && !job.salaryMax)) return null;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.salaryCurrency || "USD",
    maximumFractionDigits: 0,
  });
  if (job.salaryMin && job.salaryMax) {
    return `${formatter.format(job.salaryMin)}-${formatter.format(job.salaryMax)} / ${job.salaryPeriod}`;
  }
  return `${formatter.format(job.salaryMin || job.salaryMax || 0)} / ${job.salaryPeriod}`;
}

function JobCard({ job }: { job: CareerJob }) {
  const salary = formatSalary(job);
  return (
    <Link href={`/careers/${job.slug}`} className="block">
      <Card className="cursor-pointer hover-elevate" data-testid={`card-career-job-${job.id}`}>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg break-words">{job.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {job.department && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
              <Badge variant="outline">{CAREER_WORK_MODE_LABELS[job.workMode]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(job.summary || job.description) && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {stripHtml(job.summary || job.description || "")}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {salary ? (
              <span className="font-medium">{salary}</span>
            ) : (
              <span className="text-muted-foreground">Salary available during hiring process</span>
            )}
            <Button size="sm">View Job</Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CareerListingsSection({ props = {} }: { props?: Record<string, unknown> }) {
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("all");
  const [employmentType, setEmploymentType] = useState("all");
  const [workMode, setWorkMode] = useState("all");
  const [location, setLocation] = useState("all");
  const heading =
    typeof props.heading === "string" && props.heading.trim()
      ? props.heading.trim()
      : "Open Positions";
  const subheading =
    typeof props.subheading === "string" && props.subheading.trim()
      ? props.subheading.trim()
      : "Browse current opportunities and apply directly through the Career Center.";
  const eyebrow =
    typeof props.eyebrow === "string" && props.eyebrow.trim()
      ? props.eyebrow.trim()
      : "Career Center";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (department !== "all") params.set("department", department);
    if (employmentType !== "all") params.set("employmentType", employmentType);
    if (workMode !== "all") params.set("workMode", workMode);
    if (location !== "all") params.set("location", location);
    const qs = params.toString();
    return `/api/careers/jobs${qs ? `?${qs}` : ""}`;
  }, [q, department, employmentType, workMode, location]);

  const { data: jobs = [], isLoading } = useQuery<CareerJob[]>({ queryKey: [query] });
  const { data: filters } = useQuery<FilterOptions>({ queryKey: ["/api/careers/filters"] });

  const clearFilters = () => {
    setQ("");
    setDepartment("all");
    setEmploymentType("all");
    setWorkMode("all");
    setLocation("all");
  };

  return (
    <section
      className="container mx-auto px-4 py-10 space-y-8"
      data-testid="section-career-listings"
    >
      <section className="space-y-3">
        <Badge variant="outline" className="gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">{heading}</h1>
        <p className="max-w-2xl text-muted-foreground">{subheading}</p>
      </section>

      <section className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search jobs"
            className="pl-9"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(filters?.departments ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employmentType} onValueChange={setEmploymentType}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(CAREER_EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={workMode} onValueChange={setWorkMode}>
          <SelectTrigger>
            <SelectValue placeholder="Work mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All work modes</SelectItem>
            {Object.entries(CAREER_WORK_MODE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {(filters?.locations ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters">
          <X className="h-4 w-4" />
        </Button>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))
        ) : jobs.length > 0 ? (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No open roles match those filters.
            </CardContent>
          </Card>
        )}
      </section>
    </section>
  );
}

export default function CareersPage() {
  useSeo({
    title: "Careers | Core Platform",
    description: "Explore current job openings and apply to join the team.",
    canonical: typeof window !== "undefined" ? `${window.location.origin}/careers` : undefined,
  });

  return (
    <PageLayout>
      <CareerListingsSection />
    </PageLayout>
  );
}
