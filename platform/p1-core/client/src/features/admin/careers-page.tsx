import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Briefcase, Download, ExternalLink, LinkIcon, Plus, Settings, Users } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdminEditDeepLink } from "@/features/frontend-edit/frontend-edit";
import {
  CAREER_APPLICATION_STATUS_LABELS,
  CAREER_APPLICATION_STATUSES,
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_JOB_STATUS_LABELS,
  CAREER_JOB_STATUSES,
  CAREER_WORK_MODE_LABELS,
  type CareerApplication,
  type CareerApplicationNote,
  type CareerJob,
  type CareerSettings,
} from "@shared/schema";
import type { TherapistWithUser } from "@shared/types/directory";
import { DIRECTORY_MODE_PROFILE_ALIASES } from "@shared/types/directory-settings";

type CareerApplicationWithJob = CareerApplication & {
  job?: CareerJob | null;
  notes?: CareerApplicationNote[];
};

const emptyJob = {
  title: "",
  slug: "",
  department: "",
  employmentType: "full_time",
  workMode: "on_site",
  location: "",
  locationAddress: "",
  directoryProfileId: "none",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "USD",
  salaryPeriod: "year",
  salaryVisible: false,
  status: "draft",
  visibility: "public",
  summary: "",
  description: "",
  requirements: "",
  benefits: "",
  applicationInstructions: "",
  publishedAt: "",
  closesAt: "",
  metaTitle: "",
  metaDescription: "",
  noindex: false,
};

function toLocalInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromJob(job?: CareerJob | null) {
  if (!job) return emptyJob;
  return {
    title: job.title,
    slug: job.slug,
    department: job.department ?? "",
    employmentType: job.employmentType,
    workMode: job.workMode,
    location: job.location ?? "",
    locationAddress: job.locationAddress ?? "",
    directoryProfileId: job.directoryProfileId ?? "none",
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    salaryCurrency: job.salaryCurrency ?? "USD",
    salaryPeriod: job.salaryPeriod ?? "year",
    salaryVisible: job.salaryVisible,
    status: job.status,
    visibility: job.visibility,
    summary: job.summary ?? "",
    description: job.description ?? "",
    requirements: job.requirements ?? "",
    benefits: job.benefits ?? "",
    applicationInstructions: job.applicationInstructions ?? "",
    publishedAt: toLocalInput(job.publishedAt),
    closesAt: toLocalInput(job.closesAt),
    metaTitle: job.metaTitle ?? "",
    metaDescription: job.metaDescription ?? "",
    noindex: job.noindex,
  };
}

function JobEditor({ job, onClose }: { job?: CareerJob | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(fromJob(job));
  const { data: profiles = [] } = useQuery<TherapistWithUser[]>({
    queryKey: ["/api/admin/therapists"],
  });
  const storeLocations = profiles.filter((profile) =>
    DIRECTORY_MODE_PROFILE_ALIASES.store_locator.includes(profile.directoryMode),
  );
  useEffect(() => setForm(fromJob(job)), [job?.id]);

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        directoryProfileId: form.directoryProfileId === "none" ? null : form.directoryProfileId,
        publishedAt: form.publishedAt || null,
        closesAt: form.closesAt || null,
      };
      const response = await apiRequest(
        job ? "PUT" : "POST",
        job ? `/api/admin/careers/jobs/${job.id}` : "/api/admin/careers/jobs",
        payload,
      );
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/careers/jobs"] });
      toast({ title: job ? "Job updated" : "Job created" });
      onClose();
    },
    onError: (error: Error) =>
      toast({ title: "Could not save job", description: error.message, variant: "destructive" }),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="auto-generated"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Input
            value={form.department}
            onChange={(event) => set("department", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={form.location} onChange={(event) => set("location", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Linked store location</Label>
          <Select
            value={form.directoryProfileId}
            onValueChange={(value) => set("directoryProfileId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No linked location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked location</SelectItem>
              {storeLocations.map((profile) => {
                const name =
                  [profile.user?.firstName, profile.user?.lastName].filter(Boolean).join(" ") ||
                  profile.title ||
                  profile.city ||
                  "Untitled location";
                const detail = [profile.city, profile.state, profile.country]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <SelectItem key={profile.id} value={profile.id}>
                    {detail ? `${name} (${detail})` : name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Store Locator pages can show published jobs linked here.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Employment type</Label>
          <Select
            value={form.employmentType}
            onValueChange={(value) => set("employmentType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAREER_EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Work mode</Label>
          <Select value={form.workMode} onValueChange={(value) => set("workMode", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAREER_WORK_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(value) => set("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAREER_JOB_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CAREER_JOB_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Publish at</Label>
          <Input
            value={form.publishedAt}
            type="datetime-local"
            onChange={(event) => set("publishedAt", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Close at</Label>
          <Input
            value={form.closesAt}
            type="datetime-local"
            onChange={(event) => set("closesAt", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Salary range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.salaryMin}
              type="number"
              placeholder="Min"
              onChange={(event) => set("salaryMin", event.target.value)}
            />
            <Input
              value={form.salaryMax}
              type="number"
              placeholder="Max"
              onChange={(event) => set("salaryMax", event.target.value)}
            />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={form.salaryVisible}
          onCheckedChange={(value) => set("salaryVisible", value)}
        />
        Show salary publicly
      </label>
      <div className="space-y-1.5">
        <Label>Summary</Label>
        <Textarea
          value={form.summary}
          onChange={(event) => set("summary", event.target.value)}
          rows={3}
        />
      </div>
      {(["description", "requirements", "benefits", "applicationInstructions"] as const).map(
        (key) => (
          <div key={key} className="space-y-1.5">
            <Label>
              {key === "applicationInstructions"
                ? "Application instructions"
                : key[0].toUpperCase() + key.slice(1)}
            </Label>
            <Textarea
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
              rows={5}
            />
          </div>
        ),
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>SEO title</Label>
          <Input
            value={form.metaTitle}
            onChange={(event) => set("metaTitle", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>SEO description</Label>
          <Input
            value={form.metaDescription}
            onChange={(event) => set("metaDescription", event.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.noindex}
          onCheckedChange={(value) => set("noindex", value === true)}
        />
        Hide from search engines
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save Job"}
        </Button>
      </div>
    </form>
  );
}

function JobsTab({ initialCreate = false }: { initialCreate?: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CareerJob | null>(null);
  const { data: jobs = [] } = useQuery<CareerJob[]>({ queryKey: ["/api/admin/careers/jobs"] });

  useEffect(() => {
    if (initialCreate) {
      setEditing(null);
      setOpen(true);
    }
  }, [initialCreate]);

  useAdminEditDeepLink(
    jobs,
    (job) => job.id,
    (job) => {
      setEditing(job);
      setOpen(true);
    },
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>Create and publish Career Center listings.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Job" : "Create Job"}</DialogTitle>
            </DialogHeader>
            <JobEditor job={editing} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-muted-foreground">/careers/{job.slug}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={job.status === "published" ? "default" : "outline"}>
                    {CAREER_JOB_STATUS_LABELS[job.status]}
                  </Badge>
                </TableCell>
                <TableCell>{CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}</TableCell>
                <TableCell>{job.location || "Remote/unspecified"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(job);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApplicationsTab() {
  const { toast } = useToast();
  const { data: applications = [] } = useQuery<CareerApplicationWithJob[]>({
    queryKey: ["/api/admin/careers/applications"],
  });
  const [selected, setSelected] = useState<CareerApplicationWithJob | null>(null);
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/admin/careers/applications/${id}`, {
        status,
        note,
      });
      return response.json();
    },
    onSuccess: async () => {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/careers/applications"] });
      toast({ title: "Application updated" });
    },
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Review applicants and update hiring status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow
                  key={application.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(application)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {application.firstName} {application.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{application.email}</div>
                  </TableCell>
                  <TableCell>{application.job?.title ?? "Deleted job"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CAREER_APPLICATION_STATUS_LABELS[application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(application.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Application Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div>
                <div className="font-medium">
                  {selected.firstName} {selected.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{selected.email}</div>
                {selected.phone && (
                  <div className="text-sm text-muted-foreground">{selected.phone}</div>
                )}
              </div>
              <Button variant="outline" asChild>
                <a href={`/api/admin/careers/applications/${selected.id}/resume`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </a>
              </Button>
              {selected.coverLetter && (
                <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
                  {selected.coverLetter}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={selected.status}
                  onValueChange={(status) => mutation.mutate({ id: selected.id, status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAREER_APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CAREER_APPLICATION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Internal note</Label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
                <Button
                  variant="outline"
                  onClick={() => mutation.mutate({ id: selected.id, status: selected.status })}
                >
                  Save Note
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select an application to review.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<CareerSettings>({
    queryKey: ["/api/admin/careers/settings"],
  });
  const [draft, setDraft] = useState<CareerSettings | null>(null);
  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/admin/careers/settings", draft);
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/careers/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/careers/settings"] }),
      ]);
      toast({ title: "Career settings saved" });
    },
  });
  const update = (path: "sharing" | "integrations", key: string, value: unknown) => {
    setDraft((current) =>
      current ? { ...current, [path]: { ...current[path], [key]: value } } : current,
    );
  };
  if (!draft)
    return (
      <Card>
        <CardContent className="py-8">Loading settings...</CardContent>
      </Card>
    );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Share Options</CardTitle>
          <CardDescription>Control share actions on public job pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span>Enable sharing</span>
            <Switch
              checked={draft.sharing.enabled}
              onCheckedChange={(value) => update("sharing", "enabled", value)}
            />
          </label>
          {[
            ["copyLink", "Copy link"],
            ["nativeShare", "Native share"],
            ["email", "Email"],
            ["linkedin", "LinkedIn"],
            ["facebook", "Facebook"],
            ["x", "X/Twitter"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(draft.sharing[key as keyof typeof draft.sharing])}
                onCheckedChange={(value) => update("sharing", key, value === true)}
              />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Enable job discovery and ATS bridge points when partner credentials are available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span>Google Indexing API</span>
            <Switch
              checked={draft.integrations.googleIndexingEnabled}
              onCheckedChange={(value) => update("integrations", "googleIndexingEnabled", value)}
            />
          </label>
          <Textarea
            placeholder="Google service account JSON"
            value={draft.integrations.googleServiceAccountJson}
            onChange={(event) =>
              update("integrations", "googleServiceAccountJson", event.target.value)
            }
            rows={3}
          />
          <label className="flex items-center justify-between gap-3">
            <span>Indeed XML feed</span>
            <Switch
              checked={draft.integrations.indeedFeedEnabled}
              onCheckedChange={(value) => update("integrations", "indeedFeedEnabled", value)}
            />
          </label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LinkIcon className="h-4 w-4" />
            /api/careers/feed/indeed.xml
          </div>
          <label className="flex items-center justify-between gap-3">
            <span>Indeed Apply endpoint</span>
            <Switch
              checked={draft.integrations.indeedApplyEnabled}
              onCheckedChange={(value) => update("integrations", "indeedApplyEnabled", value)}
            />
          </label>
          <Input
            placeholder="Indeed Apply shared secret"
            value={draft.integrations.indeedApplySecret}
            onChange={(event) => update("integrations", "indeedApplySecret", event.target.value)}
          />
          <label className="flex items-center justify-between gap-3">
            <span>ZipRecruiter sync</span>
            <Switch
              checked={draft.integrations.zipRecruiterEnabled}
              onCheckedChange={(value) => update("integrations", "zipRecruiterEnabled", value)}
            />
          </label>
          <Input
            placeholder="ZipRecruiter API key"
            value={draft.integrations.zipRecruiterApiKey}
            onChange={(event) => update("integrations", "zipRecruiterApiKey", event.target.value)}
          />
          <label className="flex items-center justify-between gap-3">
            <span>LinkedIn API sync</span>
            <Switch
              checked={draft.integrations.linkedinApiEnabled}
              onCheckedChange={(value) => update("integrations", "linkedinApiEnabled", value)}
            />
          </label>
          <Input
            placeholder="LinkedIn partner ID"
            value={draft.integrations.linkedinPartnerId}
            onChange={(event) => update("integrations", "linkedinPartnerId", event.target.value)}
          />
          <label className="flex items-center justify-between gap-3">
            <span>Generic webhook</span>
            <Switch
              checked={draft.integrations.genericWebhookEnabled}
              onCheckedChange={(value) => update("integrations", "genericWebhookEnabled", value)}
            />
          </label>
          <Input
            placeholder="Webhook URL"
            value={draft.integrations.genericWebhookUrl}
            onChange={(event) => update("integrations", "genericWebhookUrl", event.target.value)}
          />
          <Input
            placeholder="Webhook secret"
            value={draft.integrations.genericWebhookSecret}
            onChange={(event) => update("integrations", "genericWebhookSecret", event.target.value)}
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type CareerAdminTab = "jobs" | "applications" | "settings";
const CAREER_ADMIN_TABS = new Set<string>(["jobs", "applications", "settings"]);

function normalizeCareerAdminTab(
  value: string | null | undefined,
  fallback: CareerAdminTab,
): CareerAdminTab {
  return CAREER_ADMIN_TABS.has(value || "") ? (value as CareerAdminTab) : fallback;
}

interface AdminCareersPageProps {
  initialCreate?: boolean;
  initialTab?: CareerAdminTab;
}

export default function AdminCareersPage({
  initialCreate = false,
  initialTab = "jobs",
}: AdminCareersPageProps) {
  const [tab, setTab] = useState<CareerAdminTab>(initialTab);

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    setTab(normalizeCareerAdminTab(queryTab, initialTab));
  }, [initialTab]);

  return (
    <AdminSidebar>
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Briefcase className="h-6 w-6" />
              Career Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Publish jobs, review applicants, and manage integrations.
            </p>
          </div>
          <Badge variant="outline">Production V1</Badge>
        </div>
        <Tabs value={tab} onValueChange={(value) => setTab(normalizeCareerAdminTab(value, "jobs"))}>
          <TabsList>
            <TabsTrigger value="jobs">
              <Briefcase className="mr-2 h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="applications">
              <Users className="mr-2 h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="jobs">
            <JobsTab initialCreate={initialCreate} />
          </TabsContent>
          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </AdminSidebar>
  );
}
