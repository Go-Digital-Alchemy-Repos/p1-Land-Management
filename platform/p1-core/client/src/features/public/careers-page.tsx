import { CoreArchivePresentationHost } from "@/features/admin/cms/builder/core-archive-presentation-host";
import { CareerListingsPresentation } from "@/features/admin/cms/builder/career-listings-presentation";
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

export function CareerListingsSection({ props = {} }: { props?: Record<string, unknown> }) {
  return (
    <CoreArchivePresentationHost>
      <CareerListingsPresentation
        props={props}
        useJobs={(query) => {
          const jobs = useQuery<CareerJob[]>({ queryKey: [query] });
          const filters = useQuery<{ departments: string[]; locations: string[] }>({
            queryKey: ["/api/careers/filters"],
          });
          return { jobs: jobs.data ?? [], isLoading: jobs.isLoading, filters: filters.data };
        }}
      />
    </CoreArchivePresentationHost>
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
