import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { ClipboardList, Eye, Loader2, Search, Filter } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@shared/types";
import type { ProviderApplication } from "@shared/schema";

type AdminApplicationListItem = ProviderApplication & {
  userName: string;
  userEmail: string;
};

function recordFrom(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function statusBadgeVariant(
  status: ApplicationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (["active_member", "approved_pending_subscription"].includes(status)) return "default";
  if (status === "denied") return "destructive";
  if (status === "withdrawn") return "secondary";
  return "outline";
}

function subStatusBadge(value: string) {
  if (value === "completed" || value === "paid" || value === "clear") return "default";
  if (value === "in_progress") return "outline";
  if (value === "issue" || value === "consider") return "destructive";
  return "secondary";
}

const FILTER_OPTIONS = [
  { value: "", label: "All Applications" },
  { value: "submitted", label: "Submitted" },
  {
    value: "awaiting_background_check,background_check_in_progress",
    label: "Waiting on Background Check",
  },
  { value: "awaiting_references,references_in_progress", label: "Waiting on References" },
  { value: "ready_for_interview,interview_scheduled", label: "Ready for / In Interview" },
  { value: "interview_completed", label: "Interview Completed" },
  { value: "approved_pending_subscription", label: "Approved — Pending Subscription" },
  { value: "active_member", label: "Active Members" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "draft", label: "Drafts" },
];

export default function AdminApplicationsPage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: applications, isLoading } = useQuery<AdminApplicationListItem[]>({
    queryKey: ["/api/admin/applications"],
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
  });

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/applications/stats"],
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
  });

  const totalApps = applications?.length ?? 0;
  const pendingCount =
    (stats?.submitted ?? 0) +
    (stats?.awaiting_background_check ?? 0) +
    (stats?.background_check_in_progress ?? 0) +
    (stats?.awaiting_references ?? 0) +
    (stats?.references_in_progress ?? 0) +
    (stats?.ready_for_interview ?? 0) +
    (stats?.interview_scheduled ?? 0) +
    (stats?.interview_completed ?? 0);

  const filterStatuses = statusFilter ? statusFilter.split(",") : [];

  const filtered = (applications ?? []).filter((app) => {
    if (filterStatuses.length > 0 && !filterStatuses.includes(app.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (app.userName || "").toLowerCase();
      const email = (app.userEmail || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">
              Applications
            </h1>
            <p className="text-muted-foreground text-sm">Manage provider membership applications</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold" data-testid="text-total-apps">
                {totalApps}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-pending-apps">
                {pendingCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-approved-apps">
                {(stats?.approved_pending_subscription ?? 0) + (stats?.active_member ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Denied</p>
              <p className="text-2xl font-bold text-red-600" data-testid="text-denied-apps">
                {stats?.denied ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Applications ({filtered.length})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-56"
                    data-testid="input-search-applications"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <select
                    className="pl-8 h-9 border rounded-md text-sm bg-background pr-3 w-full sm:w-auto"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="select-status-filter"
                  >
                    {FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Background</TableHead>
                      <TableHead>References</TableHead>
                      <TableHead>Interview</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((app) => {
                      const fd = recordFrom(app.formData);
                      return (
                        <TableRow
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          data-testid={`row-application-${app.id}`}
                          onClick={() => navigate(`/admin/applications/${app.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(`/admin/applications/${app.id}`);
                            }
                          }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{app.userName}</p>
                              <p className="text-xs text-muted-foreground">{app.userEmail}</p>
                              {displayValue(fd.applyingAs) && (
                                <p className="text-xs text-muted-foreground capitalize">
                                  {displayValue(fd.applyingAs)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusBadgeVariant(app.status as ApplicationStatus)}
                              className="text-xs whitespace-nowrap"
                            >
                              {APPLICATION_STATUS_LABELS[app.status as ApplicationStatus] ??
                                app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={subStatusBadge(app.paymentStatus)} className="text-xs">
                              {app.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={subStatusBadge(app.backgroundCheckStatus)}
                              className="text-xs"
                            >
                              {app.backgroundCheckStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={subStatusBadge(app.referencesStatus)}
                              className="text-xs"
                            >
                              {app.referencesStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={subStatusBadge(app.interviewStatus)}
                              className="text-xs"
                            >
                              {app.interviewStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={subStatusBadge(app.decisionStatus)} className="text-xs">
                              {app.decisionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/applications/${app.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-view-${app.id}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>
                  {searchQuery || statusFilter
                    ? "No applications match your filters"
                    : "No applications yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  );
}
