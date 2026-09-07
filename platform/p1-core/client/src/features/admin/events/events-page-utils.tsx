import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { stripHtml } from "@/lib/html";
import type { Event, EventRegistration } from "@shared/schema";

export function centsToDollarInput(cents: number | null | undefined): string {
  return cents ? (cents / 100).toFixed(2) : "";
}

export function dollarInputToCents(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const dollars = Number.parseFloat(value);
  if (!Number.isFinite(dollars)) return undefined;
  return Math.round(dollars * 100);
}

export function statusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "outline";
    case "canceled":
      return "destructive";
    case "completed":
    case "archived":
      return "secondary";
    default:
      return "default";
  }
}

export function visibilityLabel(v: string | null | undefined): string {
  switch (v) {
    case "members_only":
      return "Members Only";
    case "counselors_only":
      return "Verified Providers Only";
    case "admins_only":
      return "Admins Only";
    default:
      return "Public";
  }
}

export function eventStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getAdminEventSearchText(event: Event): string {
  const tags = Array.isArray(event.tags) ? event.tags.join(" ") : "";
  return [
    event.title,
    event.slug,
    stripHtml(event.description ?? ""),
    event.location,
    event.locationName,
    event.locationAddress,
    event.speakerName,
    tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function slugifyEventTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function registrationStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "waitlisted":
      return "secondary";
    case "pending":
      return "outline";
    case "canceled":
      return "destructive";
    default:
      return "outline";
  }
}

export function paymentStatusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    case "refunded":
      return "outline";
    default:
      return "outline";
  }
}

export function downloadCsv(registrations: EventRegistration[], eventTitle: string) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Payment Status",
    "Amount Paid",
    "Registered At",
    "Canceled At",
    "Attended",
    "Checked In At",
    "Notes",
  ];
  const escCsv = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const rows = registrations.map((r) => [
    escCsv(r.fullName),
    escCsv(r.email),
    escCsv(r.phone || ""),
    escCsv(r.status),
    escCsv(r.paymentStatus || ""),
    escCsv(r.amountPaid ? (r.amountPaid / 100).toFixed(2) : "0.00"),
    escCsv(r.registeredAt ? new Date(r.registeredAt).toISOString() : ""),
    escCsv(r.canceledAt ? new Date(r.canceledAt).toISOString() : ""),
    escCsv(r.attended ? "Yes" : "No"),
    escCsv(r.checkedInAt ? new Date(r.checkedInAt).toISOString() : ""),
    escCsv(r.notes || ""),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations-${eventTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EventAnalytics({
  eventId,
  registrationEnabled,
}: {
  eventId: string;
  registrationEnabled: boolean;
}) {
  const { data: analytics, isLoading } = useQuery<{
    confirmed: number;
    waitlisted: number;
    canceled: number;
    attended: number;
    totalRevenueCents: number;
  }>({
    queryKey: ["/api/admin/events", eventId, "analytics"],
    enabled: registrationEnabled,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!analytics) return null;

  return (
    <div className="space-y-3 p-2 min-w-[200px]">
      <h4 className="font-semibold text-sm border-b pb-2">Event Analytics</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground">Confirmed:</span>
        <span className="font-medium text-right">{analytics.confirmed}</span>
        <span className="text-muted-foreground">Waitlisted:</span>
        <span className="font-medium text-right">{analytics.waitlisted}</span>
        <span className="text-muted-foreground">Attended:</span>
        <span className="font-medium text-right">{analytics.attended}</span>
        {analytics.totalRevenueCents > 0 && (
          <>
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium text-right">
              ${(analytics.totalRevenueCents / 100).toFixed(2)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function CapacityBadge({ eventId, capacity }: { eventId: string; capacity: number }) {
  const { data: analytics } = useQuery<{ confirmed: number }>({
    queryKey: ["/api/admin/events", eventId, "analytics"],
  });

  return (
    <Badge variant="outline" className="ml-auto" data-testid={`badge-capacity-${eventId}`}>
      {analytics?.confirmed ?? 0} / {capacity} seats
    </Badge>
  );
}
