import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import type { Event } from "@shared/schema/events";
import { CoreArchivePresentationHost } from "@/features/admin/cms/builder/core-archive-presentation-host";
import { EventsArchivePresentation } from "@/features/admin/cms/builder/events-archive-presentation";
export function EventsArchiveSection({ props = {} }: { props?: Record<string, unknown> }) {
  const [location] = useLocation();
  const query = useQuery<Event[]>({ queryKey: ["/api/events/all"] });
  return (
    <CoreArchivePresentationHost>
      <EventsArchivePresentation
        props={props}
        events={query.data}
        isLoading={query.isLoading}
        error={query.error}
        location={location}
      />
    </CoreArchivePresentationHost>
  );
}
export default function EventsPage() {
  return (
    <PageLayout>
      <EventsArchiveSection />
    </PageLayout>
  );
}
