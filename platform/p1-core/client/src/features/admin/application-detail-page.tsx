import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Send,
  UserCheck,
  XCircle,
  Shield,
  RefreshCw,
  RotateCcw,
  Users,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Calendar,
  CreditCard,
  Award,
  MessageSquare,
  Eye,
} from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@shared/types";
import type {
  ProviderApplication,
  ProviderApplicationCredential,
  ProviderApplicationDecision,
  ProviderApplicationReference,
  ProviderApplicationTimeline,
  ProviderBackgroundCheck,
  ProviderInterview,
} from "@shared/schema";

type AdminApplicationDetail = Omit<ProviderApplication, "formData" | "submittedSnapshot"> & {
  userName?: string | null;
  userEmail?: string | null;
  formData?: Record<string, unknown> | null;
  submittedSnapshot?: Record<string, unknown> | null;
  timeline?: ProviderApplicationTimeline[];
  credentials?: ProviderApplicationCredential[];
  references?: ProviderApplicationReference[];
  backgroundCheck?: ProviderBackgroundCheck | null;
  interview?: ProviderInterview | null;
  decision?: ProviderApplicationDecision | null;
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

function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) return url;
  } catch {
    return undefined;
  }
  return undefined;
}

function statusBadgeVariant(
  status: ApplicationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (["active_member", "approved_pending_subscription"].includes(status)) return "default";
  if (status === "denied") return "destructive";
  if (status === "withdrawn") return "secondary";
  return "outline";
}

const TABS = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "application", label: "Application", icon: FileText },
  { id: "credentials", label: "Credentials", icon: Award },
  { id: "references", label: "References", icon: Users },
  { id: "background", label: "Background Check", icon: Shield },
  { id: "interview", label: "Interview", icon: Video },
  { id: "decision", label: "Decision", icon: UserCheck },
  { id: "timeline", label: "Timeline", icon: Clock },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [bgStatus, setBgStatus] = useState("");
  const [bgNotes, setBgNotes] = useState("");
  const [bgAdminDetails, setBgAdminDetails] = useState("");
  const [bgExternalId, setBgExternalId] = useState("");
  const [bgReportUrl, setBgReportUrl] = useState("");
  const [intScheduledAt, setIntScheduledAt] = useState("");
  const [intInterviewer, setIntInterviewer] = useState("");
  const [intFormat, setIntFormat] = useState("video");
  const [intMeetingUrl, setIntMeetingUrl] = useState("");
  const [intNotes, setIntNotes] = useState("");
  const [intOutcome, setIntOutcome] = useState("");
  const [discountReviewNote, setDiscountReviewNote] = useState("");

  const { data: application, isLoading } = useQuery<AdminApplicationDetail>({
    queryKey: ["/api/admin/applications", id],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
  };

  const changeStatus = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}/status`, {
        status: newStatus,
        note: statusNote || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setNewStatus("");
      setStatusNote("");
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/timeline`, {
        note: adminNote,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setAdminNote("");
      toast({ title: "Note added" });
    },
  });

  const initiateBgCheck = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/applications/${id}/background-check/initiate`,
        {},
      );
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Background check initiated" });
    },
    onError: () => {
      toast({ title: "Failed to initiate", variant: "destructive" });
    },
  });

  const syncBgCheck = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/background-check/sync`);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Status synced" });
    },
    onError: () => {
      toast({ title: "Failed to sync", variant: "destructive" });
    },
  });

  const resendBgInvite = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/background-check/resend`);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Invite resent" });
    },
    onError: () => {
      toast({ title: "Failed to resend", variant: "destructive" });
    },
  });

  const updateBgCheck = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (bgStatus) body.status = bgStatus;
      if (bgNotes) body.notes = bgNotes;
      if (bgAdminDetails) body.adminStatusDetails = bgAdminDetails;
      if (bgExternalId) body.vendorExternalId = bgExternalId;
      if (bgReportUrl) body.reportUrl = bgReportUrl;
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}/background-check`, body);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setBgStatus("");
      setBgNotes("");
      setBgAdminDetails("");
      setBgExternalId("");
      setBgReportUrl("");
      toast({ title: "Background check updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const scheduleInterview = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (intScheduledAt) body.scheduledAt = intScheduledAt;
      if (intInterviewer) body.interviewerUserId = intInterviewer;
      if (intFormat) body.format = intFormat;
      if (intMeetingUrl) body.meetingUrl = intMeetingUrl;
      const res = await apiRequest("POST", `/api/admin/applications/${id}/interview`, body);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setIntScheduledAt("");
      setIntInterviewer("");
      setIntMeetingUrl("");
      toast({ title: "Interview scheduled" });
    },
    onError: () => {
      toast({ title: "Failed to schedule interview", variant: "destructive" });
    },
  });

  const completeInterview = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { outcome: intOutcome };
      if (intNotes) body.notes = intNotes;
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}/interview`, body);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setIntOutcome("");
      setIntNotes("");
      toast({ title: "Interview updated" });
    },
    onError: () => {
      toast({ title: "Failed to update interview", variant: "destructive" });
    },
  });

  const addDiscountNote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/timeline`, {
        note: `[Accessibility Discount Review] ${discountReviewNote}`,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setDiscountReviewNote("");
      toast({ title: "Discount review note added" });
    },
  });

  const resendReference = useMutation({
    mutationFn: async (refId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/applications/${id}/references/${refId}/resend`,
      );
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Reference email resent" });
    },
    onError: () => {
      toast({ title: "Failed to resend reference email", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <AdminSidebar>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminSidebar>
    );
  }

  if (!application) {
    return (
      <AdminSidebar>
        <div className="p-4 sm:p-6">
          <p>Application not found.</p>
          <Link href="/admin/applications">
            <Button variant="ghost" className="mt-4">
              Back to Applications
            </Button>
          </Link>
        </div>
      </AdminSidebar>
    );
  }

  const currentStatus = application.status as ApplicationStatus;
  const timeline = application.timeline ?? [];
  const credentials = application.credentials ?? [];
  const references = application.references ?? [];
  const bgCheck = application.backgroundCheck;
  const interview = application.interview;
  const decision = application.decision;
  const fd = recordFrom(application.formData);
  const snap = recordFrom(application.submittedSnapshot);
  const snapFd = Object.keys(recordFrom(snap.formData)).length > 0 ? recordFrom(snap.formData) : fd;
  const corePlatformQuestions = recordFrom(snapFd.corePlatformQuestions);
  const professionalWebsite = displayValue(snapFd.professionalWebsite);

  const completedRefs = references.filter((r) => r.status === "completed").length;

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-5xl">
        <div className="mb-4">
          <Link href="/admin/applications">
            <Button variant="ghost" size="sm" data-testid="button-back-applications">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">
              {displayValue(snapFd.fullName) || application.userName || "Applicant"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {displayValue(snapFd.applyingAs) && (
                <span className="capitalize">{displayValue(snapFd.applyingAs)} &middot; </span>
              )}
              ID: {application.id?.slice(0, 8)}
            </p>
          </div>
          <Badge
            variant={statusBadgeVariant(currentStatus)}
            className="text-sm px-3 py-1"
            data-testid="badge-app-status"
          >
            {APPLICATION_STATUS_LABELS[currentStatus] ?? currentStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  let badge = "";
                  if (tab.id === "references") badge = `${completedRefs}/${references.length}`;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{tab.label}</p>
                        {badge && <p className="text-xs opacity-75">{badge}</p>}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Applicant Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{displayValue(snapFd.fullName) || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">
                            {displayValue(snapFd.email) || application.userEmail || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{displayValue(snapFd.phone) || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">
                            {[displayValue(snapFd.city), displayValue(snapFd.country)]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Applying As</p>
                          <p className="font-medium capitalize">
                            {displayValue(snapFd.applyingAs) || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Professional Title</p>
                          <p className="font-medium">
                            {displayValue(snapFd.professionalTitle) || "—"}
                          </p>
                        </div>
                        {displayValue(snapFd.organizationName) && (
                          <div>
                            <p className="text-muted-foreground">Organization</p>
                            <p className="font-medium">{displayValue(snapFd.organizationName)}</p>
                          </div>
                        )}
                        {professionalWebsite && (
                          <div>
                            <p className="text-muted-foreground">Website</p>
                            {safeHref(professionalWebsite) ? (
                              <a
                                href={safeHref(professionalWebsite)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {professionalWebsite}
                              </a>
                            ) : (
                              <p className="text-sm">{professionalWebsite}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Submitted</p>
                          <p className="font-medium">
                            {application.submittedAt
                              ? new Date(application.submittedAt).toLocaleString()
                              : "Not yet"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {application.createdAt
                              ? new Date(application.createdAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stage Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {[
                          { label: "Payment", value: application.paymentStatus, icon: CreditCard },
                          {
                            label: "Background",
                            value: application.backgroundCheckStatus,
                            icon: Shield,
                          },
                          { label: "References", value: application.referencesStatus, icon: Users },
                          { label: "Interview", value: application.interviewStatus, icon: Video },
                        ].map((s) => {
                          const Icon = s.icon;
                          return (
                            <div
                              key={s.label}
                              className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center"
                            >
                              <Icon className="w-4 h-4 mb-1 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                              <Badge
                                variant={
                                  s.value === "completed" || s.value === "paid"
                                    ? "default"
                                    : s.value === "in_progress"
                                      ? "outline"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {s.value}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {(displayValue(snapFd.accessibilityStartingFee) ||
                    displayValue(snapFd.accessibilitySlidingScale)) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Accessibility & Pricing Review
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Starting Fee</p>
                            <p className="font-medium">
                              {displayValue(snapFd.accessibilityStartingFee) || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sliding Scale</p>
                            <p className="font-medium capitalize">
                              {displayValue(snapFd.accessibilitySlidingScale) || "—"}
                            </p>
                          </div>
                          {displayValue(snapFd.accessibilityDetails) && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Details</p>
                              <p className="bg-muted/50 rounded p-2 text-xs mt-1">
                                {displayValue(snapFd.accessibilityDetails)}
                              </p>
                            </div>
                          )}
                        </div>
                        <Separator />
                        <div>
                          <Label htmlFor="discountReview" className="text-xs">
                            Discount Review Note
                          </Label>
                          <Textarea
                            id="discountReview"
                            value={discountReviewNote}
                            onChange={(e) => setDiscountReviewNote(e.target.value)}
                            placeholder="Record discount review outcome (approved/denied/amount)..."
                            rows={2}
                            className="text-sm mt-1"
                            data-testid="textarea-discount-review"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => addDiscountNote.mutate()}
                            disabled={!discountReviewNote || addDiscountNote.isPending}
                            data-testid="button-add-discount-note"
                          >
                            {addDiscountNote.isPending && (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            )}
                            Save Discount Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {![
                        "approved_pending_subscription",
                        "active_member",
                        "denied",
                        "withdrawn",
                      ].includes(currentStatus) && (
                        <>
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setNewStatus("approved_pending_subscription");
                              setActiveTab("decision");
                            }}
                            data-testid="button-quick-approve"
                          >
                            <UserCheck className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => {
                              setNewStatus("denied");
                              setActiveTab("decision");
                            }}
                            data-testid="button-quick-deny"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Deny
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveTab("timeline")}
                        data-testid="button-quick-add-note"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" /> Add Note
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                      ) : (
                        <div className="space-y-2">
                          {timeline.slice(0, 5).map((entry) => (
                            <div key={entry.id} className="flex gap-2 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium capitalize">
                                  {entry.action.replace(/_/g, " ")}
                                </p>
                                <p className="text-muted-foreground">
                                  {entry.createdAt &&
                                    new Date(entry.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {timeline.length > 5 && (
                            <button
                              onClick={() => setActiveTab("timeline")}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View all ({timeline.length})
                            </button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "application" && (
              <div className="space-y-4 max-w-3xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Submitted Application</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      {[
                        { label: "Full Name", value: displayValue(snapFd.fullName) },
                        { label: "Email", value: displayValue(snapFd.email) },
                        { label: "Phone", value: displayValue(snapFd.phone) },
                        { label: "City", value: displayValue(snapFd.city) },
                        { label: "Country", value: displayValue(snapFd.country) },
                        { label: "Applying As", value: displayValue(snapFd.applyingAs) },
                        {
                          label: "Professional Title",
                          value: displayValue(snapFd.professionalTitle),
                        },
                        { label: "Organization", value: displayValue(snapFd.organizationName) },
                        { label: "Website", value: displayValue(snapFd.professionalWebsite) },
                        {
                          label: "Starting Fee",
                          value: displayValue(snapFd.accessibilityStartingFee),
                        },
                        {
                          label: "Sliding Scale",
                          value: displayValue(snapFd.accessibilitySlidingScale),
                        },
                        {
                          label: "Sliding Scale Details",
                          value: displayValue(snapFd.accessibilityDetails),
                        },
                      ]
                        .filter((f) => f.value)
                        .map((field) => (
                          <div key={field.label}>
                            <p className="text-muted-foreground text-xs">{field.label}</p>
                            <p className="font-medium">{field.value}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {Object.keys(corePlatformQuestions).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Core Platform Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-sm">
                        {Object.entries(corePlatformQuestions).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-muted-foreground text-xs capitalize">
                              {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                            </p>
                            <p className="bg-muted/50 rounded p-2 mt-1">
                              {displayValue(val) || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Terms & Agreements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {snapFd.termsAccepted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Terms & Conditions Accepted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {snapFd.termsInsuranceAgreement ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Insurance Agreement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {snapFd.termsLicensureProof ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Licensure Proof Agreement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {snapFd.termsStatementOfFaith ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Statement of Faith</span>
                      </div>
                      {displayValue(snapFd.termsSignature) && (
                        <div className="mt-2">
                          <p className="text-muted-foreground text-xs">E-Signature</p>
                          <p className="font-medium italic">
                            {displayValue(snapFd.termsSignature)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "credentials" && (
              <div className="space-y-4 max-w-3xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Credentials & Licensure ({credentials.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {credentials.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No credentials submitted</p>
                    ) : (
                      <div className="space-y-3">
                        {credentials.map((c) => (
                          <div
                            key={c.id}
                            className="border rounded-lg p-3 space-y-2"
                            data-testid={`card-credential-${c.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{c.credentialType}</span>
                              </div>
                              <Badge
                                variant={
                                  c.verificationStatus === "verified"
                                    ? "default"
                                    : c.verificationStatus === "rejected"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {c.verificationStatus}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {c.issuer && (
                                <div>
                                  <p className="text-muted-foreground text-xs">Issuer</p>
                                  <p>{c.issuer}</p>
                                </div>
                              )}
                              {c.licenseNumber && (
                                <div>
                                  <p className="text-muted-foreground text-xs">License #</p>
                                  <p className="font-mono text-xs">{c.licenseNumber}</p>
                                </div>
                              )}
                              {c.stateOrCountry && (
                                <div>
                                  <p className="text-muted-foreground text-xs">State/Country</p>
                                  <p>{c.stateOrCountry}</p>
                                </div>
                              )}
                              {c.middleName && (
                                <div>
                                  <p className="text-muted-foreground text-xs">Middle Name</p>
                                  <p>{c.middleName}</p>
                                </div>
                              )}
                              {c.verificationUrl && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-xs">Verification URL</p>
                                  {safeHref(c.verificationUrl) ? (
                                    <a
                                      href={safeHref(c.verificationUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-xs break-all"
                                    >
                                      {c.verificationUrl}
                                    </a>
                                  ) : (
                                    <p className="text-xs break-all">{c.verificationUrl}</p>
                                  )}
                                </div>
                              )}
                              {c.issuedAt && (
                                <div>
                                  <p className="text-muted-foreground text-xs">Issued</p>
                                  <p>{new Date(c.issuedAt).toLocaleDateString()}</p>
                                </div>
                              )}
                              {c.expiresAt && (
                                <div>
                                  <p className="text-muted-foreground text-xs">Expires</p>
                                  <p>{new Date(c.expiresAt).toLocaleDateString()}</p>
                                </div>
                              )}
                              {c.documentUrl && (
                                <div className="col-span-2">
                                  <a
                                    href={c.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs"
                                  >
                                    View Document
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "references" && (
              <div className="space-y-4 max-w-3xl">
                {references.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
                      <p className="text-muted-foreground">No references submitted</p>
                    </CardContent>
                  </Card>
                ) : (
                  references.map((r, idx) => {
                    const rd = recordFrom(r.responseData);
                    const hasResponse = Object.keys(rd).length > 0;
                    const flags = recordFrom(r.concernFlags);
                    const hasConcerns = Object.keys(flags).length > 0;

                    return (
                      <Card key={r.id} data-testid={`card-reference-${r.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              Reference {idx + 1}: {r.refereeName}
                              {hasConcerns && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            </CardTitle>
                            <Badge
                              variant={
                                r.status === "completed"
                                  ? "default"
                                  : r.status === "opened"
                                    ? "outline"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {r.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Email</p>
                              <p>{r.refereeEmail}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Relationship</p>
                              <p>{r.relationship || "—"}</p>
                            </div>
                            {r.emailSentAt && (
                              <div>
                                <p className="text-muted-foreground text-xs">Email Sent</p>
                                <p>{new Date(r.emailSentAt).toLocaleString()}</p>
                              </div>
                            )}
                            {r.openedAt && (
                              <div>
                                <p className="text-muted-foreground text-xs">Form Opened</p>
                                <p>{new Date(r.openedAt).toLocaleString()}</p>
                              </div>
                            )}
                            {r.responseReceivedAt && (
                              <div>
                                <p className="text-muted-foreground text-xs">Response Received</p>
                                <p>{new Date(r.responseReceivedAt).toLocaleString()}</p>
                              </div>
                            )}
                          </div>

                          {hasConcerns && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1 mb-2">
                                <AlertTriangle className="w-4 h-4" /> Concern Flags
                              </p>
                              <div className="space-y-1 text-sm">
                                {Boolean(flags.safetyConcern) && (
                                  <p className="text-red-600">
                                    Safety Concern:{" "}
                                    {displayValue(flags.safetyConcernDetails) || "Yes"}
                                  </p>
                                )}
                                {Boolean(flags.professionalConcern) && (
                                  <p className="text-red-600">
                                    Professional Concern:{" "}
                                    {displayValue(flags.professionalConcernDetails) || "Yes"}
                                  </p>
                                )}
                                {Boolean(flags.notRecommended) && (
                                  <p className="text-red-600">Not Recommended</p>
                                )}
                              </div>
                            </div>
                          )}

                          {r.status !== "completed" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendReference.mutate(r.id)}
                                disabled={resendReference.isPending}
                                data-testid={`button-resend-ref-${r.id}`}
                              >
                                {resendReference.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4 mr-1" />
                                )}
                                Resend Email
                              </Button>
                            </div>
                          )}

                          {hasResponse && (
                            <div className="border-t pt-3 space-y-3 text-sm">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Full Response
                              </p>
                              {[
                                { label: "Respondent Name", value: displayValue(rd.firstName) },
                                { label: "Relationship", value: displayValue(rd.relationship) },
                                {
                                  label: "Core Platform Observation",
                                  value: displayValue(rd.corePlatformObservation),
                                },
                                {
                                  label: "Core Platform Understanding",
                                  value: displayValue(rd.corePlatformUnderstanding),
                                },
                                {
                                  label: "Cultural Connection",
                                  value: displayValue(rd.culturalConnection),
                                },
                                { label: "Safety Concern", value: displayValue(rd.safetyConcern) },
                                {
                                  label: "Safety Details",
                                  value: displayValue(rd.safetyConcernDetails),
                                },
                                {
                                  label: "Professional Concern",
                                  value: displayValue(rd.professionalConcern),
                                },
                                {
                                  label: "Professional Details",
                                  value: displayValue(rd.professionalConcernDetails),
                                },
                                { label: "Recommends", value: displayValue(rd.recommendation) },
                                {
                                  label: "Additional Comments",
                                  value: displayValue(rd.additionalComments),
                                },
                              ]
                                .filter((f) => f.value)
                                .map((field) => (
                                  <div key={field.label}>
                                    <p className="text-muted-foreground text-xs">{field.label}</p>
                                    <p className="bg-muted/50 rounded p-2 mt-0.5">{field.value}</p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "background" && (
              <div className="space-y-4 max-w-3xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Background Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!bgCheck ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          No background check record exists yet.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => initiateBgCheck.mutate()}
                          disabled={initiateBgCheck.isPending}
                          data-testid="button-initiate-bg-check"
                        >
                          {initiateBgCheck.isPending && (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          )}
                          <Shield className="w-4 h-4 mr-1" />
                          Initiate Background Check
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge
                              variant={
                                bgCheck.status === "clear" || bgCheck.status === "completed"
                                  ? "default"
                                  : bgCheck.status === "issue" || bgCheck.status === "consider"
                                    ? "destructive"
                                    : "outline"
                              }
                              className="mt-0.5"
                              data-testid="badge-bg-status"
                            >
                              {bgCheck.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Provider Label</p>
                            <p className="font-medium" data-testid="text-bg-provider-label">
                              {bgCheck.providerFacingLabel || "—"}
                            </p>
                          </div>
                          {bgCheck.vendorName && (
                            <div>
                              <p className="text-muted-foreground">Vendor</p>
                              <p className="font-medium">{bgCheck.vendorName}</p>
                            </div>
                          )}
                          {bgCheck.vendorExternalId && (
                            <div>
                              <p className="text-muted-foreground">External ID</p>
                              <p className="font-mono text-xs">{bgCheck.vendorExternalId}</p>
                            </div>
                          )}
                          {bgCheck.requestedAt && (
                            <div>
                              <p className="text-muted-foreground">Requested</p>
                              <p className="font-medium">
                                {new Date(bgCheck.requestedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {bgCheck.lastStatusSyncAt && (
                            <div>
                              <p className="text-muted-foreground">Last Synced</p>
                              <p className="font-medium">
                                {new Date(bgCheck.lastStatusSyncAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {bgCheck.completedAt && (
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p className="font-medium">
                                {new Date(bgCheck.completedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {bgCheck.result && (
                            <div>
                              <p className="text-muted-foreground">Result</p>
                              <p className="font-medium">{bgCheck.result}</p>
                            </div>
                          )}
                        </div>

                        {bgCheck.adminStatusDetails && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Admin Details</p>
                            <p className="bg-muted/50 rounded p-2 text-xs">
                              {bgCheck.adminStatusDetails}
                            </p>
                          </div>
                        )}
                        {bgCheck.notes && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Notes</p>
                            <p className="bg-muted/50 rounded p-2 text-xs">{bgCheck.notes}</p>
                          </div>
                        )}
                        {bgCheck.reportUrl && (
                          <a
                            href={bgCheck.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                            data-testid="link-bg-report"
                          >
                            View Report
                          </a>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {bgCheck.status === "not_sent" && (
                            <Button
                              size="sm"
                              onClick={() => initiateBgCheck.mutate()}
                              disabled={initiateBgCheck.isPending}
                              data-testid="button-initiate-bg-check"
                            >
                              {initiateBgCheck.isPending && (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              )}
                              Initiate
                            </Button>
                          )}
                          {bgCheck.vendorExternalId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncBgCheck.mutate()}
                              disabled={syncBgCheck.isPending}
                              data-testid="button-sync-bg-check"
                            >
                              {syncBgCheck.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Sync Status
                            </Button>
                          )}
                          {["invited", "expired"].includes(bgCheck.status) &&
                            bgCheck.vendorExternalId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendBgInvite.mutate()}
                                disabled={resendBgInvite.isPending}
                                data-testid="button-resend-bg-invite"
                              >
                                {resendBgInvite.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                )}
                                Resend Invite
                              </Button>
                            )}
                        </div>

                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Manual Update
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="bgStatus" className="text-xs">
                              Status
                            </Label>
                            <select
                              id="bgStatus"
                              className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                              value={bgStatus}
                              onChange={(e) => setBgStatus(e.target.value)}
                              data-testid="select-bg-status"
                            >
                              <option value="">No change</option>
                              {[
                                "not_sent",
                                "pending",
                                "invited",
                                "in_progress",
                                "clear",
                                "consider",
                                "issue",
                                "expired",
                                "completed",
                              ].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="bgExternalId" className="text-xs">
                              Vendor External ID
                            </Label>
                            <Input
                              id="bgExternalId"
                              value={bgExternalId}
                              onChange={(e) => setBgExternalId(e.target.value)}
                              placeholder="External ID"
                              className="h-8 text-sm"
                              data-testid="input-bg-external-id"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="bgAdminDetails" className="text-xs">
                            Admin Status Details
                          </Label>
                          <Input
                            id="bgAdminDetails"
                            value={bgAdminDetails}
                            onChange={(e) => setBgAdminDetails(e.target.value)}
                            placeholder="Internal status details"
                            className="h-8 text-sm"
                            data-testid="input-bg-admin-details"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bgReportUrl" className="text-xs">
                            Report URL
                          </Label>
                          <Input
                            id="bgReportUrl"
                            value={bgReportUrl}
                            onChange={(e) => setBgReportUrl(e.target.value)}
                            placeholder="https://..."
                            autoPrependHttps
                            className="h-8 text-sm"
                            data-testid="input-bg-report-url"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bgNotes" className="text-xs">
                            Notes
                          </Label>
                          <Textarea
                            id="bgNotes"
                            value={bgNotes}
                            onChange={(e) => setBgNotes(e.target.value)}
                            placeholder="Internal notes..."
                            className="text-sm"
                            rows={2}
                            data-testid="textarea-bg-notes"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBgCheck.mutate()}
                          disabled={
                            updateBgCheck.isPending ||
                            (!bgStatus &&
                              !bgNotes &&
                              !bgAdminDetails &&
                              !bgExternalId &&
                              !bgReportUrl)
                          }
                          data-testid="button-update-bg-check"
                        >
                          {updateBgCheck.isPending && (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          )}
                          Update Background Check
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "interview" && (
              <div className="space-y-4 max-w-3xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Interview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {interview ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Scheduled</p>
                            <p className="font-medium">
                              {interview.scheduledAt
                                ? new Date(interview.scheduledAt).toLocaleString()
                                : "Not scheduled"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Format</p>
                            <p className="font-medium capitalize">{interview.format || "Video"}</p>
                          </div>
                          {interview.interviewerUserId && (
                            <div>
                              <p className="text-muted-foreground">Interviewer</p>
                              <p className="font-mono text-xs">{interview.interviewerUserId}</p>
                            </div>
                          )}
                          {interview.meetingUrl && (
                            <div>
                              <p className="text-muted-foreground">Meeting Link</p>
                              {safeHref(interview.meetingUrl) ? (
                                <a
                                  href={safeHref(interview.meetingUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs"
                                >
                                  {interview.meetingUrl}
                                </a>
                              ) : (
                                <p className="text-xs">{interview.meetingUrl}</p>
                              )}
                            </div>
                          )}
                          {interview.completedAt && (
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p className="font-medium">
                                {new Date(interview.completedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {interview.outcome && (
                            <div>
                              <p className="text-muted-foreground">Outcome</p>
                              <Badge
                                variant={
                                  interview.outcome === "passed"
                                    ? "default"
                                    : interview.outcome === "failed"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-xs capitalize"
                              >
                                {interview.outcome}
                              </Badge>
                            </div>
                          )}
                        </div>
                        {interview.notes && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Interview Notes</p>
                            <p className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap">
                              {interview.notes}
                            </p>
                          </div>
                        )}

                        {!interview.completedAt && (
                          <>
                            <Separator />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Complete Interview
                            </p>
                            <div>
                              <Label htmlFor="intOutcome" className="text-xs">
                                Outcome
                              </Label>
                              <select
                                id="intOutcome"
                                className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                value={intOutcome}
                                onChange={(e) => setIntOutcome(e.target.value)}
                                data-testid="select-interview-outcome"
                              >
                                <option value="">Select outcome...</option>
                                <option value="passed">Passed</option>
                                <option value="failed">Failed</option>
                                <option value="needs_followup">Needs Follow-up</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="intNotes" className="text-xs">
                                Notes / Recommendation
                              </Label>
                              <Textarea
                                id="intNotes"
                                value={intNotes}
                                onChange={(e) => setIntNotes(e.target.value)}
                                placeholder="Interview notes and recommendation..."
                                className="text-sm"
                                rows={3}
                                data-testid="textarea-interview-notes"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => completeInterview.mutate()}
                              disabled={!intOutcome || completeInterview.isPending}
                              data-testid="button-complete-interview"
                            >
                              {completeInterview.isPending && (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              )}
                              Record Outcome
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">No interview scheduled yet.</p>
                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Schedule Interview
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="intScheduledAt" className="text-xs">
                              Date & Time
                            </Label>
                            <Input
                              id="intScheduledAt"
                              type="datetime-local"
                              value={intScheduledAt}
                              onChange={(e) => setIntScheduledAt(e.target.value)}
                              className="h-8 text-sm"
                              data-testid="input-interview-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="intFormat" className="text-xs">
                              Format
                            </Label>
                            <select
                              id="intFormat"
                              className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                              value={intFormat}
                              onChange={(e) => setIntFormat(e.target.value)}
                              data-testid="select-interview-format"
                            >
                              <option value="video">Video Call</option>
                              <option value="phone">Phone Call</option>
                              <option value="in_person">In Person</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="intInterviewer" className="text-xs">
                            Interviewer (User ID)
                          </Label>
                          <Input
                            id="intInterviewer"
                            value={intInterviewer}
                            onChange={(e) => setIntInterviewer(e.target.value)}
                            placeholder="User ID of interviewer"
                            className="h-8 text-sm"
                            data-testid="input-interviewer"
                          />
                        </div>
                        <div>
                          <Label htmlFor="intMeetingUrl" className="text-xs">
                            Meeting URL
                          </Label>
                          <Input
                            id="intMeetingUrl"
                            value={intMeetingUrl}
                            onChange={(e) => setIntMeetingUrl(e.target.value)}
                            placeholder="https://zoom.us/..."
                            autoPrependHttps
                            className="h-8 text-sm"
                            data-testid="input-meeting-url"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => scheduleInterview.mutate()}
                          disabled={scheduleInterview.isPending}
                          data-testid="button-schedule-interview"
                        >
                          {scheduleInterview.isPending && (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          )}
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule Interview
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "decision" && (
              <div className="space-y-4 max-w-3xl">
                {decision && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Current Decision</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Decision</p>
                          <Badge
                            variant={decision.decision === "approved" ? "default" : "destructive"}
                            className="text-xs capitalize"
                          >
                            {decision.decision}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Decided</p>
                          <p className="font-medium">
                            {decision.createdAt
                              ? new Date(decision.createdAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        {decision.reason && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Reason</p>
                            <p className="bg-muted/50 rounded p-2 text-xs mt-1">
                              {decision.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Change Application Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="newStatus">New Status</Label>
                      <select
                        id="newStatus"
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        data-testid="select-new-status"
                      >
                        <option value="">Select status...</option>
                        {APPLICATION_STATUS.filter((s) => s !== currentStatus).map((s) => (
                          <option key={s} value={s}>
                            {APPLICATION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="statusNote">Note (optional)</Label>
                      <Textarea
                        id="statusNote"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Reason for status change"
                        rows={2}
                        data-testid="input-status-note"
                      />
                    </div>
                    <div className="flex gap-2">
                      {newStatus === "approved_pending_subscription" && (
                        <Button
                          size="sm"
                          onClick={() => changeStatus.mutate()}
                          disabled={changeStatus.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-approve"
                        >
                          {changeStatus.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-1" />
                          )}
                          Approve Application
                        </Button>
                      )}
                      {newStatus === "denied" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => changeStatus.mutate()}
                          disabled={changeStatus.isPending}
                          data-testid="button-deny"
                        >
                          {changeStatus.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          Deny Application
                        </Button>
                      )}
                      {newStatus &&
                        !["approved_pending_subscription", "denied"].includes(newStatus) && (
                          <Button
                            size="sm"
                            onClick={() => changeStatus.mutate()}
                            disabled={changeStatus.isPending}
                            data-testid="button-update-status"
                          >
                            {changeStatus.isPending && (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            )}
                            Update Status
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>

                {(currentStatus === "denied" ||
                  currentStatus === "approved_pending_subscription") && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base text-muted-foreground">
                        Future Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>The following actions will be available in a future release:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Request More Information from applicant</li>
                        <li>Reopen denied application for reconsideration</li>
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-4 max-w-3xl">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Note</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Internal note about this application..."
                      data-testid="textarea-admin-note"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addNote.mutate()}
                      disabled={!adminNote || addNote.isPending}
                      data-testid="button-add-note"
                    >
                      {addNote.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      <Send className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Activity Timeline ({timeline.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No timeline entries</p>
                    ) : (
                      <div className="space-y-4">
                        {timeline.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex gap-3 text-sm"
                            data-testid={`timeline-entry-${entry.id}`}
                          >
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <div className="w-0.5 flex-1 bg-muted-foreground/20 mt-1" />
                            </div>
                            <div className="pb-4">
                              <p className="font-medium capitalize">
                                {entry.action.replace(/_/g, " ")}
                              </p>
                              {entry.fromStatus && entry.toStatus && (
                                <p className="text-xs text-muted-foreground">
                                  {APPLICATION_STATUS_LABELS[
                                    entry.fromStatus as ApplicationStatus
                                  ] ?? entry.fromStatus}
                                  {" → "}
                                  {APPLICATION_STATUS_LABELS[entry.toStatus as ApplicationStatus] ??
                                    entry.toStatus}
                                </p>
                              )}
                              {entry.note && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {entry.note}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.createdAt && new Date(entry.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
}
