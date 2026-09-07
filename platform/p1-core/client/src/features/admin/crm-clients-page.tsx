import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CRM_CLIENT_ONBOARDING_STATUS_LABELS,
  CRM_CLIENT_ONBOARDING_STATUSES,
  CRM_CLIENT_STATUS_LABELS,
  CRM_CLIENT_STATUSES,
  CRM_CLIENT_TYPE_LABELS,
  CRM_CLIENT_TYPES,
  CRM_CONTACT_METHOD_LABELS,
  CRM_CONTACT_METHODS,
  type CrmClient,
  type CrmClientOnboardingStatus,
  type CrmClientNote,
  type CrmClientStatus,
  type CrmClientTask,
  type CrmClientType,
  type CrmClientUpdate,
  type CrmContactMethod,
  type CrmLead,
} from "@shared/schema";
import { AdminSidebar } from "./admin-sidebar";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Database,
  Mail,
  MessageSquare,
  Search,
  UserRound,
} from "lucide-react";

type ClientDetail = CrmClient & {
  sourceLead?: CrmLead;
  notes: CrmClientNote[];
  tasks: CrmClientTask[];
};

const STATUS_COLORS: Record<CrmClientStatus, string> = {
  onboarding: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  inactive: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function humanizeFieldName(key: string) {
  const specialLabels: Record<string, string> = {
    addressLine1: "Address",
    address_line_1: "Address",
    city: "City",
    email: "Email Address",
    emailAddress: "Email Address",
    email_address: "Email Address",
    fullName: "Full Name",
    full_name: "Full Name",
    message: "Project Details / Message",
    phone: "Phone Number",
    phoneNumber: "Phone Number",
    phone_number: "Phone Number",
    projectDetails: "Project Details / Message",
    project_details: "Project Details / Message",
    servicesNeeded: "Services Needed",
    services_needed: "Services Needed",
  };

  if (specialLabels[key]) return specialLabels[key];

  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isBlankSubmittedValue(value: unknown) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function getMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function formatSource(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replace(/[_-]+/g, " ");
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isLikelyPhoneField(label: string) {
  return /phone|mobile|cell/i.test(label);
}

function SubmittedValue({ label, value }: { label: string; value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={`${String(item)}-${index}`} variant="secondary" className="font-medium">
            {String(item)}
          </Badge>
        ))}
      </div>
    );
  }

  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, nestedValue]) => !isBlankSubmittedValue(nestedValue),
    );
    if (entries.length === 0) return <span className="text-muted-foreground">Not provided</span>;
    return (
      <div className="space-y-1">
        {entries.map(([nestedKey, nestedValue]) => (
          <div key={nestedKey} className="text-sm">
            <span className="font-medium text-muted-foreground">
              {humanizeFieldName(nestedKey)}:
            </span>{" "}
            <SubmittedValue label={nestedKey} value={nestedValue} />
          </div>
        ))}
      </div>
    );
  }

  const text = String(value ?? "").trim();
  if (!text) return <span className="text-muted-foreground">Not provided</span>;
  if (isLikelyEmail(text)) {
    return (
      <a className="text-primary hover:underline" href={`mailto:${text}`}>
        {text}
      </a>
    );
  }
  if (isLikelyPhoneField(label)) {
    return (
      <a className="text-primary hover:underline" href={`tel:${text.replace(/[^\d+]/g, "")}`}>
        {text}
      </a>
    );
  }
  if (isLikelyUrl(text)) {
    return (
      <a className="text-primary hover:underline" href={text} target="_blank" rel="noreferrer">
        {text}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap">{text}</span>;
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-1 text-muted-foreground">{value}</dd>
    </div>
  );
}

function textOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function tagsToInput(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function tagsFromInput(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  type = "text",
  placeholder,
  onSave,
}: {
  label: string;
  value: string | Date | null | undefined;
  type?: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        defaultValue={type === "date" ? formatDateInput(value) : String(value ?? "")}
        placeholder={placeholder}
        onBlur={(event) => onSave(event.target.value)}
      />
    </div>
  );
}

function ClientDetailSheet({
  clientId,
  onClose,
}: {
  clientId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const { data: client } = useQuery<ClientDetail>({
    queryKey: ["/api/admin/crm/clients", clientId ?? ""],
    enabled: Boolean(clientId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients", clientId ?? ""] }),
    ]);
  };

  const updateClientMutation = useMutation({
    mutationFn: async (data: CrmClientUpdate) =>
      apiRequest("PATCH", `/api/admin/crm/clients/${clientId}`, data),
    onSuccess: refresh,
    onError: (error: Error) =>
      toast({
        title: "Could not update client",
        description: error.message,
        variant: "destructive",
      }),
  });
  const addNoteMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/crm/clients/${clientId}/notes`, { body: note }),
    onSuccess: async () => {
      setNote("");
      await refresh();
    },
  });
  const addTaskMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/crm/clients/${clientId}/tasks`, {
        title: taskTitle,
        dueAt: taskDueAt || null,
      }),
    onSuccess: async () => {
      setTaskTitle("");
      setTaskDueAt("");
      await refresh();
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/admin/crm/clients/tasks/${id}`, { completed }),
    onSuccess: refresh,
  });
  const updateClient = (data: CrmClientUpdate) => updateClientMutation.mutate(data);
  const saveText = (field: keyof CrmClientUpdate, value: string, extras: CrmClientUpdate = {}) => {
    updateClient({ [field]: textOrNull(value), ...extras } as CrmClientUpdate);
  };
  const saveDate = (field: keyof CrmClientUpdate, value: string) => {
    updateClient({ [field]: value ? new Date(value) : null } as CrmClientUpdate);
  };
  const contactLine =
    client?.primaryEmail ||
    client?.email ||
    client?.primaryPhone ||
    client?.phone ||
    "No contact info";
  const companyLine = client?.companyName || client?.company || "No company";
  const clientMetadata = client?.metadata ?? {};
  const leadMetadata = client?.sourceLead?.metadata ?? {};
  const submittedEntries = Object.entries(client?.formData ?? {}).filter(
    ([, value]) => !isBlankSubmittedValue(value),
  );
  const formName =
    getMetadataValue(clientMetadata, ["formName", "formTitle", "formLabel"]) ??
    getMetadataValue(leadMetadata, ["formName", "formTitle", "formLabel"]) ??
    "Not recorded";
  const ipAddress =
    getMetadataValue(clientMetadata, ["ipAddress", "ip", "remoteAddress"]) ??
    getMetadataValue(leadMetadata, ["ipAddress", "ip", "remoteAddress"]) ??
    "Not recorded";
  const convertedAt =
    getMetadataValue(clientMetadata, ["convertedAt"]) ??
    getMetadataValue(leadMetadata, ["convertedAt"]) ??
    client?.clientSince ??
    client?.createdAt;

  return (
    <Sheet open={Boolean(clientId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="xl">
        <SheetHeader>
          <SheetTitle>{client?.name ?? "Client"}</SheetTitle>
          <SheetDescription>
            {client
              ? `${CRM_CLIENT_TYPE_LABELS[client.clientType ?? "individual"]} · ${contactLine}`
              : "Loading client..."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {client ? (
            <>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="overview">
                    <UserRound className="mr-1.5 h-4 w-4 text-blue-600" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="contact">
                    <Mail className="mr-1.5 h-4 w-4 text-rose-600" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="company">
                    <Building2 className="mr-1.5 h-4 w-4 text-indigo-600" />
                    Company
                  </TabsTrigger>
                  <TabsTrigger value="billing">
                    <CreditCard className="mr-1.5 h-4 w-4 text-amber-600" />
                    Billing/Admin
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <MessageSquare className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <ClipboardList className="mr-1.5 h-4 w-4 text-orange-600" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="data">
                    <Database className="mr-1.5 h-4 w-4 text-cyan-600" />
                    Data
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field
                      label="Client Name"
                      value={client.name}
                      onSave={(value) => saveText("name", value)}
                    />
                    <div className="space-y-1.5">
                      <Label>Client Type</Label>
                      <Select
                        value={client.clientType ?? "individual"}
                        onValueChange={(value) =>
                          updateClient({ clientType: value as CrmClientType })
                        }
                      >
                        <SelectTrigger data-testid="select-crm-client-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {CRM_CLIENT_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select
                        value={client.status}
                        onValueChange={(status) =>
                          updateClient({ status: status as CrmClientStatus })
                        }
                      >
                        <SelectTrigger data-testid="select-crm-client-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {CRM_CLIENT_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Onboarding</Label>
                      <Select
                        value={client.onboardingStatus ?? "not_started"}
                        onValueChange={(value) =>
                          updateClient({ onboardingStatus: value as CrmClientOnboardingStatus })
                        }
                      >
                        <SelectTrigger data-testid="select-crm-onboarding-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_ONBOARDING_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {CRM_CLIENT_ONBOARDING_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field
                      label="Next Follow-Up"
                      type="date"
                      value={client.nextFollowUpAt}
                      onSave={(value) => saveDate("nextFollowUpAt", value)}
                    />
                    <Field
                      label="Client Since"
                      type="date"
                      value={client.clientSince}
                      onSave={(value) => saveDate("clientSince", value)}
                    />
                    <p className="text-sm">
                      <span className="font-medium">Source:</span> {client.source}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Company:</span> {companyLine}
                    </p>
                    <p className="text-sm sm:col-span-2">
                      <span className="font-medium">Source Lead:</span>{" "}
                      {client.sourceLead?.name ?? "Not linked"}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field
                      label="Primary Email"
                      value={client.primaryEmail ?? client.email}
                      onSave={(value) =>
                        saveText("primaryEmail", value, { email: textOrNull(value) })
                      }
                    />
                    <Field
                      label="Secondary Email"
                      value={client.secondaryEmail}
                      onSave={(value) => saveText("secondaryEmail", value)}
                    />
                    <Field
                      label="Primary Phone"
                      value={client.primaryPhone ?? client.phone}
                      onSave={(value) =>
                        saveText("primaryPhone", value, { phone: textOrNull(value) })
                      }
                    />
                    <Field
                      label="Alternate Phone"
                      value={client.alternatePhone}
                      onSave={(value) => saveText("alternatePhone", value)}
                    />
                    <div className="space-y-1.5">
                      <Label>Preferred Contact</Label>
                      <Select
                        value={client.preferredContactMethod ?? "no_preference"}
                        onValueChange={(value) =>
                          updateClient({ preferredContactMethod: value as CrmContactMethod })
                        }
                      >
                        <SelectTrigger data-testid="select-crm-contact-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRM_CONTACT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {CRM_CONTACT_METHOD_LABELS[method]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field
                      label="Address Line 1"
                      value={client.addressLine1}
                      onSave={(value) => saveText("addressLine1", value)}
                    />
                    <Field
                      label="Address Line 2"
                      value={client.addressLine2}
                      onSave={(value) => saveText("addressLine2", value)}
                    />
                    <Field
                      label="City"
                      value={client.city}
                      onSave={(value) => saveText("city", value)}
                    />
                    <Field
                      label="State/Region"
                      value={client.region}
                      onSave={(value) => saveText("region", value)}
                    />
                    <Field
                      label="Postal Code"
                      value={client.postalCode}
                      onSave={(value) => saveText("postalCode", value)}
                    />
                    <Field
                      label="Country"
                      value={client.country}
                      onSave={(value) => saveText("country", value)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="company" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field
                      label="Company Name"
                      value={client.companyName ?? client.company}
                      onSave={(value) =>
                        saveText("companyName", value, { company: textOrNull(value) })
                      }
                    />
                    <Field
                      label="Legal Name"
                      value={client.legalName}
                      onSave={(value) => saveText("legalName", value)}
                    />
                    <Field
                      label="Website"
                      value={client.website}
                      onSave={(value) => saveText("website", value)}
                    />
                    <Field
                      label="Industry"
                      value={client.industry}
                      onSave={(value) => saveText("industry", value)}
                    />
                    <Field
                      label="Company Size"
                      value={client.companySize}
                      onSave={(value) => saveText("companySize", value)}
                    />
                    <Field
                      label="Business Type"
                      value={client.businessType}
                      onSave={(value) => saveText("businessType", value)}
                    />
                    <Field
                      label="Company Phone"
                      value={client.companyPhone}
                      onSave={(value) => saveText("companyPhone", value)}
                    />
                    <Field
                      label="Company Email"
                      value={client.companyEmail}
                      onSave={(value) => saveText("companyEmail", value)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="billing" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field
                      label="Billing Contact"
                      value={client.billingContactName}
                      onSave={(value) => saveText("billingContactName", value)}
                    />
                    <Field
                      label="Billing Email"
                      value={client.billingEmail}
                      onSave={(value) => saveText("billingEmail", value)}
                    />
                    <Field
                      label="Billing Phone"
                      value={client.billingPhone}
                      onSave={(value) => saveText("billingPhone", value)}
                    />
                    <Field
                      label="Account Owner ID"
                      value={client.accountOwnerId}
                      onSave={(value) => saveText("accountOwnerId", value)}
                    />
                    <Field
                      label="Service Start"
                      type="date"
                      value={client.serviceStartDate}
                      onSave={(value) => saveDate("serviceStartDate", value)}
                    />
                    <Field
                      label="Renewal Date"
                      type="date"
                      value={client.renewalDate}
                      onSave={(value) => saveDate("renewalDate", value)}
                    />
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Internal Tags</Label>
                      <Input
                        defaultValue={tagsToInput(client.internalTags)}
                        placeholder="vip, newsletter, renewal"
                        onBlur={(event) =>
                          updateClient({ internalTags: tagsFromInput(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="space-y-3">
                  <Textarea
                    rows={3}
                    placeholder="Add a client note..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!note.trim() || addNoteMutation.isPending}
                  >
                    Add Note
                  </Button>
                  <div className="space-y-2">
                    {client.notes.map((item) => (
                      <div key={item.id} className="rounded-md border p-3 text-sm">
                        <p className="whitespace-pre-wrap">{item.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                    <Input
                      placeholder="Client task"
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                    />
                    <Input
                      type="date"
                      value={taskDueAt}
                      onChange={(event) => setTaskDueAt(event.target.value)}
                    />
                    <Button
                      onClick={() => addTaskMutation.mutate()}
                      disabled={!taskTitle.trim() || addTaskMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                  {client.tasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) =>
                          updateTaskMutation.mutate({ id: task.id, completed: checked === true })
                        }
                      />
                      <span
                        className={cn(
                          "text-sm",
                          task.completed && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDate(task.dueAt)}
                      </span>
                    </label>
                  ))}
                </TabsContent>
                <TabsContent value="data">
                  <div className="space-y-4">
                    <section className="rounded-xl border bg-background p-5 shadow-sm">
                      <div>
                        <h3 className="text-base font-semibold">Record Details</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          When and where this client first entered the system.
                        </p>
                      </div>
                      <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                        <DetailItem
                          label="Lead Entered"
                          value={formatDateTime(client.sourceLead?.createdAt ?? client.createdAt)}
                        />
                        <DetailItem
                          label="Converted to Client"
                          value={formatDateTime(convertedAt)}
                        />
                        <DetailItem label="IP Address" value={ipAddress} />
                        <DetailItem label="Form" value={formName} />
                        <DetailItem label="Client Source" value={formatSource(client.source)} />
                      </dl>
                    </section>

                    <section className="rounded-xl border bg-background p-5 shadow-sm">
                      <div>
                        <h3 className="text-base font-semibold">Information Submitted</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          The information originally provided by this client.
                        </p>
                      </div>

                      {submittedEntries.length === 0 ? (
                        <p className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                          No submitted form information was recorded for this client.
                        </p>
                      ) : (
                        <div className="mt-6 divide-y">
                          {submittedEntries.map(([key, value]) => {
                            const label = humanizeFieldName(key);
                            return (
                              <div
                                key={key}
                                className="grid gap-2 py-3 text-sm sm:grid-cols-[220px_minmax(0,1fr)]"
                              >
                                <div className="font-medium text-muted-foreground">{label}</div>
                                <div className="min-w-0 text-foreground">
                                  <SubmittedValue label={label} value={value} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading client...</div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CrmClientsContent() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CrmClientStatus | "all">("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: clients = [], isLoading } = useQuery<CrmClient[]>({
    queryKey: ["/api/admin/crm/clients", { status, query }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(
        `/api/admin/crm/clients${params.toString() ? `?${params}` : ""}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to load CRM clients");
      return response.json();
    },
  });

  return (
    <div className="flex min-h-screen flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-heading font-bold" data-testid="text-crm-clients-title">
          CRM Clients
        </h1>
        <p className="text-sm text-muted-foreground">
          Track won leads through onboarding, active service, and inactive status.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search clients..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as CrmClientStatus | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CRM_CLIENT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {CRM_CLIENT_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_120px_140px_150px_120px] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>
            <UserRound className="mr-1 inline h-3 w-3" />
            Client
          </span>
          <span>Type</span>
          <span>
            <ClipboardList className="mr-1 inline h-3 w-3" />
            Status
          </span>
          <span>Company</span>
          <span>
            <CalendarClock className="mr-1 inline h-3 w-3" />
            Follow-Up
          </span>
        </div>
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => setSelectedClientId(client.id)}
            className="grid w-full grid-cols-[1fr_120px_140px_150px_120px] gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{client.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {client.primaryEmail ||
                  client.email ||
                  client.primaryPhone ||
                  client.phone ||
                  "No contact info"}
              </span>
            </span>
            <span>{CRM_CLIENT_TYPE_LABELS[client.clientType ?? "individual"]}</span>
            <span>
              <Badge variant="outline" className={STATUS_COLORS[client.status]}>
                {CRM_CLIENT_STATUS_LABELS[client.status]}
              </Badge>
            </span>
            <span className="truncate">{client.companyName || client.company || "—"}</span>
            <span>{formatDate(client.nextFollowUpAt)}</span>
          </button>
        ))}
        {!isLoading && clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No clients yet. Move a lead to Won to create one.
          </div>
        ) : null}
      </div>

      <ClientDetailSheet clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
    </div>
  );
}

export default function AdminCrmClientsPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
      <AdminSidebar>
        <CrmClientsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}
