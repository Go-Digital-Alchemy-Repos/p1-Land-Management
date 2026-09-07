import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { AdminSaveBar } from "@/components/shared/admin-save-bar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Users,
  Download,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  BarChart3,
  Bell,
  Square,
  CheckSquare,
  Video,
  Repeat,
  DollarSign,
  Search,
  X,
} from "lucide-react";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { CmsRichTextEditor } from "@/features/admin/cms/builder/cms-rich-text-editor";
import { ImagePositionPicker } from "@/features/admin/cms/components/image-position-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StructuredDataStatus } from "@/components/shared/structured-data-status";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { stripHtml } from "@/lib/html";
import {
  formatEventDate,
  fromDateTimeLocalValue,
  getDefaultEventTimeZone,
  toDateTimeLocalValue,
} from "@/lib/event-datetime";
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_AUDIENCES,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORIES,
  EVENT_DELIVERY_MODE_LABELS,
  EVENT_DELIVERY_MODES,
  EVENT_FORMAT_LABELS,
  EVENT_FORMATS,
  EVENT_PRESET_DEFAULTS,
  EVENT_REGISTRATION_APPROVAL_MODE_LABELS,
  EVENT_REGISTRATION_APPROVAL_MODES,
  EVENT_STATUSES,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type CmsForm,
  type Event,
  type EventOrganizer,
  type EventRegistration,
  type EventType,
  type EventVenue,
  type InsertEventVenue,
} from "@shared/schema";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useAdminEditDeepLink } from "@/features/frontend-edit/frontend-edit";
import {
  CapacityBadge,
  EventAnalytics,
  centsToDollarInput,
  dollarInputToCents,
  downloadCsv,
  eventStatusLabel,
  getAdminEventSearchText,
  paymentStatusVariant,
  registrationStatusVariant,
  slugifyEventTitle,
  statusVariant,
  visibilityLabel,
} from "@/features/admin/events/events-page-utils";
import {
  defaultFormValues,
  defaultVenueFormValues,
  eventFormSchema,
  venueFormSchema,
  type EventFormValues,
  type VenueFormValues,
} from "@/features/admin/events/events-form-schema";

export { centsToDollarInput, dollarInputToCents } from "@/features/admin/events/events-page-utils";

interface AdminEventsPageProps {
  initialCreate?: boolean;
}

export default function AdminEventsPage({ initialCreate = false }: AdminEventsPageProps) {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
      <AdminSidebar>
        <EventsContent initialCreate={initialCreate} />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

const DAYS_OF_WEEK = [
  { value: "MO", label: "Mon" },
  { value: "TU", label: "Tue" },
  { value: "WE", label: "Wed" },
  { value: "TH", label: "Thu" },
  { value: "FR", label: "Fri" },
  { value: "SA", label: "Sat" },
  { value: "SU", label: "Sun" },
];

const EVENT_EDITOR_TABS = ["details", "registrations", "video-archive", "recurring"] as const;
type EventEditorTab = (typeof EVENT_EDITOR_TABS)[number];

function normalizeEventEditorTab(tab: string | null): EventEditorTab {
  return EVENT_EDITOR_TABS.includes(tab as EventEditorTab) ? (tab as EventEditorTab) : "details";
}

function EventsContent({ initialCreate = false }: AdminEventsPageProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<EventEditorTab>("details");
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState("all");
  const initialCreateOpenedRef = useRef(false);
  const saveFeedbackRef = useRef({
    markSaved: () => {},
    markError: () => {},
    clearFeedback: () => {},
  });
  const editorLock = useEditorLock({
    resourceType: "event",
    resourceId: dialogOpen && editingEvent?.id ? editingEvent.id : null,
    enabled: dialogOpen && Boolean(editingEvent?.id),
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });
  const { data: forms = [] } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.OPERATIONAL,
  });
  const { data: venues = [] } = useQuery<EventVenue[]>({
    queryKey: ["/api/admin/events/venues"],
    staleTime: STALE_TIMES.OPERATIONAL,
  });
  const { data: organizers = [] } = useQuery<EventOrganizer[]>({
    queryKey: ["/api/admin/events/organizers"],
    staleTime: STALE_TIMES.OPERATIONAL,
  });
  const activeForms = forms.filter((managedForm) => managedForm.isActive);
  const eventList = events ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const hasActiveEventFilters =
    Boolean(normalizedSearchTerm) ||
    eventTypeFilter !== "all" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    deliveryModeFilter !== "all";
  const filteredEvents = useMemo(
    () =>
      eventList.filter((event) => {
        if (
          normalizedSearchTerm &&
          !getAdminEventSearchText(event).includes(normalizedSearchTerm)
        ) {
          return false;
        }
        if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) {
          return false;
        }
        if (categoryFilter !== "all" && event.category !== categoryFilter) {
          return false;
        }
        if (statusFilter !== "all" && (event.status ?? "published") !== statusFilter) {
          return false;
        }
        if (
          deliveryModeFilter !== "all" &&
          (event.deliveryMode ?? (event.isVirtual ? "virtual" : "in_person")) !== deliveryModeFilter
        ) {
          return false;
        }
        return true;
      }),
    [
      categoryFilter,
      deliveryModeFilter,
      eventList,
      eventTypeFilter,
      normalizedSearchTerm,
      statusFilter,
    ],
  );

  function clearEventFilters() {
    setSearchTerm("");
    setEventTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDeliveryModeFilter("all");
  }

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultFormValues,
  });
  const venueForm = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: defaultVenueFormValues,
  });

  const watchRegistrationEnabled = form.watch("registrationEnabled");
  const watchRegistrationType = form.watch("registrationType");
  const watchEventTitle = form.watch("title");
  const watchEventSlug = form.watch("slug");
  const watchEventDescription = form.watch("description");
  const watchEventImageUrl = form.watch("imageUrl");
  const watchEventImagePositionX = form.watch("imagePositionX");
  const watchEventImagePositionY = form.watch("imagePositionY");
  const watchEventDate = form.watch("date");
  const watchEventLocation = form.watch("location");
  const watchEventRecordingUrl = form.watch("recordingUrl");
  const watchShowInArchives = form.watch("showInArchives");
  const watchRecordingAccess = form.watch("recordingAccess");
  const watchIsRecurring = form.watch("isRecurring");
  const watchRecurrencePattern = form.watch("recurrencePattern");

  useEffect(() => {
    if (editingEvent) return;
    const slugState = form.getFieldState("slug");
    if (slugState.isDirty) return;
    form.setValue("slug", slugifyEventTitle(watchEventTitle || ""), { shouldDirty: false });
  }, [editingEvent, form, watchEventTitle]);

  useLockConflictGuard({
    active: dialogOpen && Boolean(editingEvent?.id),
    resourceId: dialogOpen && editingEvent?.id ? editingEvent.id : null,
    resourceLabel: "event",
    editorLock,
    onConflict: () => {
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset(defaultFormValues);
    },
  });

  const { data: registrations, isLoading: registrantsLoading } = useQuery<EventRegistration[]>({
    queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
    enabled: !!editingEvent,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/events/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event duplicated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error duplicating event", description: err.message, variant: "destructive" });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "reminder" | "recording" }) => {
      const res = await apiRequest("POST", `/api/admin/events/${id}/notify`, { type });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Notifications sent", description: data.message });
    },
    onError: (err: Error) => {
      toast({
        title: "Error sending notifications",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/checkin`, { attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
      toast({ title: "Attendance updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error updating attendance",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
      toast({ title: "Registration status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/registrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
      toast({ title: "Registration removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmedCount = registrations?.filter((r) => r.status === "confirmed").length ?? 0;
  const pendingCount = registrations?.filter((r) => r.status === "pending").length ?? 0;
  const waitlistedCount = registrations?.filter((r) => r.status === "waitlisted").length ?? 0;
  const attendedCount = registrations?.filter((r) => r.attended).length ?? 0;

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const payload = buildPayload(data);
      await apiRequest("POST", "/api/admin/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event created" });
      saveFeedbackRef.current.markSaved();
      setDialogOpen(false);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      applySaveErrorToForm(error);
      saveFeedbackRef.current.markError();
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const payload = buildPayload(data);
      await apiRequest("PUT", `/api/admin/events/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event saved" });
      saveFeedbackRef.current.markSaved();
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      applySaveErrorToForm(error);
      saveFeedbackRef.current.markError();
      toast({ title: "Failed to save event", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const createVenueMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      const payload: Partial<InsertEventVenue> = {
        ...data,
        isVirtual: data.isVirtual ?? false,
      };
      const res = await apiRequest("POST", "/api/admin/events/venues", payload);
      return res.json() as Promise<EventVenue>;
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create venue",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function buildPayload(data: EventFormValues) {
    const tags = (data.tags ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const deliveryMode = data.deliveryMode || (data.isVirtual ? "virtual" : "in_person");

    return {
      ...data,
      slug: data.slug?.trim() ?? "",
      tags,
      registrationFormId:
        data.registrationFormId && data.registrationFormId !== "none"
          ? data.registrationFormId
          : null,
      venueId: data.venueId && data.venueId !== "none" ? data.venueId : null,
      organizerId: data.organizerId && data.organizerId !== "none" ? data.organizerId : null,
      isVirtual: deliveryMode === "virtual" || deliveryMode === "hybrid",
      deliveryMode,
      timezone: data.timezone?.trim() || "",
      date: fromDateTimeLocalValue(data.date, data.timezone),
      endDate: fromDateTimeLocalValue(data.endDate, data.timezone),
      registrationOpensAt: fromDateTimeLocalValue(data.registrationOpensAt, data.timezone),
      registrationClosesAt: fromDateTimeLocalValue(data.registrationClosesAt, data.timezone),
      registrationFee: data.registrationType === "paid" ? data.registrationFee || null : null,
      capacity: data.capacity || null,
      recurrenceEndDate: fromDateTimeLocalValue(data.recurrenceEndDate, data.timezone),
      recurrenceCount: data.recurrenceCount || null,
      recurrenceInterval: data.recurrenceInterval || null,
    };
  }

  function applySaveErrorToForm(error: Error) {
    const message = error.message || "Save failed";
    if (/end date must not precede start date/i.test(message)) {
      form.setError("endDate", { type: "server", message });
      setActiveTab("details");
      return;
    }
    if (/registration close date must not precede registration open date/i.test(message)) {
      form.setError("registrationClosesAt", { type: "server", message });
      setActiveTab("registrations");
      return;
    }
    if (/recurrence end date must not precede/i.test(message)) {
      form.setError("recurrenceEndDate", { type: "server", message });
      setActiveTab("recurring");
    }
  }

  function openCreate() {
    setEditingEvent(null);
    form.reset({
      ...defaultFormValues,
      timezone: getDefaultEventTimeZone(),
    });
    saveFeedbackRef.current.clearFeedback();
    setActiveTab("details");
    setDialogOpen(true);
  }

  function applyPreset(eventType: EventType) {
    const defaults = EVENT_PRESET_DEFAULTS[eventType];
    form.setValue("eventType", eventType, { shouldDirty: true });
    form.setValue("category", defaults.category, { shouldDirty: true });
    form.setValue("audience", defaults.audience, { shouldDirty: true });
    form.setValue("format", defaults.format, { shouldDirty: true });
    form.setValue("deliveryMode", defaults.deliveryMode, { shouldDirty: true });
    form.setValue("isVirtual", defaults.deliveryMode !== "in_person", { shouldDirty: true });
    form.setValue("registrationEnabled", defaults.registrationEnabled, { shouldDirty: true });
    form.setValue("registrationApprovalMode", defaults.registrationApprovalMode, {
      shouldDirty: true,
    });
  }

  function formatVenueAddress(venue: EventVenue): string {
    return [venue.address, venue.city, venue.region, venue.postalCode, venue.country]
      .filter(Boolean)
      .join(", ");
  }

  function applyVenueRecord(venue: EventVenue) {
    form.setValue("venueId", venue.id, { shouldDirty: true });
    form.setValue("locationName", venue.name, { shouldDirty: true });
    form.setValue("locationAddress", formatVenueAddress(venue), { shouldDirty: true });
    form.setValue("location", venue.isVirtual ? "Virtual" : venue.name, { shouldDirty: true });
    form.setValue("latitude", venue.latitude ?? "", { shouldDirty: true });
    form.setValue("longitude", venue.longitude ?? "", { shouldDirty: true });
    form.setValue("isVirtual", Boolean(venue.isVirtual), { shouldDirty: true });
    if (venue.isVirtual) {
      form.setValue("deliveryMode", "virtual", { shouldDirty: true });
    } else if (form.getValues("deliveryMode") === "virtual") {
      form.setValue("deliveryMode", "in_person", { shouldDirty: true });
    }
  }

  function applyVenue(venueId: string) {
    form.setValue("venueId", venueId, { shouldDirty: true });
    if (venueId === "none") return;

    const venue = venues.find((item) => item.id === venueId);
    if (!venue) return;

    applyVenueRecord(venue);
  }

  function openVenueDialog() {
    venueForm.reset(defaultVenueFormValues);
    setVenueDialogOpen(true);
  }

  function onVenueSubmit(values: VenueFormValues) {
    createVenueMutation.mutate(values, {
      onSuccess: (venue) => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events/venues"] });
        applyVenueRecord(venue);
        venueForm.reset(defaultVenueFormValues);
        setVenueDialogOpen(false);
        toast({ title: "Venue created" });
      },
    });
  }

  function applyOrganizer(organizerId: string) {
    form.setValue("organizerId", organizerId, { shouldDirty: true });
    if (organizerId === "none") return;

    const organizer = organizers.find((item) => item.id === organizerId);
    if (!organizer) return;

    form.setValue("speakerName", organizer.name, { shouldDirty: true });
    form.setValue("speakerBio", organizer.description ?? "", { shouldDirty: true });
    form.setValue("speakerImageUrl", organizer.imageUrl ?? "", { shouldDirty: true });
  }

  useEffect(() => {
    if (!initialCreate || initialCreateOpenedRef.current) return;
    initialCreateOpenedRef.current = true;
    openCreate();
  }, [initialCreate]);

  function openEdit(event: Event) {
    setEditingEvent(event);
    const eventTimeZone = event.timezone ?? "";
    form.reset({
      title: event.title,
      slug: event.slug ?? "",
      description: event.description ?? "",
      date: toDateTimeLocalValue(event.date, eventTimeZone),
      endDate: toDateTimeLocalValue(event.endDate, eventTimeZone),
      location: event.location ?? "",
      isVirtual: event.isVirtual ?? false,
      zoomLink: event.zoomLink ?? "",
      memberOnly: event.memberOnly ?? false,
      imageUrl: event.imageUrl ?? "",
      imagePositionX: event.imagePositionX ?? 50,
      imagePositionY: event.imagePositionY ?? 50,
      status: event.status ?? "published",
      visibility: event.visibility ?? "public",
      eventType: event.eventType ?? "",
      category: event.category ?? "",
      audience: event.audience ?? "",
      format: event.format ?? "",
      deliveryMode: event.deliveryMode ?? (event.isVirtual ? "virtual" : "in_person"),
      tags: Array.isArray(event.tags) ? event.tags.join(", ") : "",
      registrationFormId: event.registrationFormId ?? "none",
      timezone: eventTimeZone,
      venueId: event.venueId ?? "none",
      organizerId: event.organizerId ?? "none",
      locationName: event.locationName ?? "",
      locationAddress: event.locationAddress ?? "",
      latitude: event.latitude ?? "",
      longitude: event.longitude ?? "",
      virtualJoinUrl: event.virtualJoinUrl ?? "",
      virtualDialInInfo: event.virtualDialInInfo ?? "",
      registrationEnabled: event.registrationEnabled ?? false,
      registrationType: event.registrationType ?? "free",
      registrationFee: event.registrationFee ?? undefined,
      registrationCurrency: event.registrationCurrency ?? "usd",
      registrationOpensAt: toDateTimeLocalValue(event.registrationOpensAt, eventTimeZone),
      registrationClosesAt: toDateTimeLocalValue(event.registrationClosesAt, eventTimeZone),
      capacity: event.capacity ?? undefined,
      waitlistEnabled: event.waitlistEnabled ?? false,
      registrationApprovalMode: event.registrationApprovalMode ?? "automatic",
      recordingUrl: event.recordingUrl ?? "",
      showInArchives: event.showInArchives ?? false,
      recordingAccess: event.recordingAccess ?? "free",
      recordingPrice: event.recordingPrice ?? undefined,
      speakerName: event.speakerName ?? "",
      speakerBio: event.speakerBio ?? "",
      speakerImageUrl: event.speakerImageUrl ?? "",
      isRecurring: event.isRecurring ?? false,
      recurrencePattern: event.recurrencePattern ?? "",
      recurrenceInterval: event.recurrenceInterval ?? 1,
      recurrenceDaysOfWeek: event.recurrenceDaysOfWeek ?? "",
      recurrenceEndDate: toDateTimeLocalValue(event.recurrenceEndDate, eventTimeZone),
      recurrenceCount: event.recurrenceCount ?? undefined,
    });
    saveFeedbackRef.current.clearFeedback();
    setActiveTab(normalizeEventEditorTab(new URLSearchParams(window.location.search).get("tab")));
    setDialogOpen(true);
  }

  useAdminEditDeepLink(eventList, (event) => event.id, openEdit);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDirty = dialogOpen && form.formState.isDirty;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved changes to this event. Close without saving?",
  });
  saveFeedbackRef.current = saveState;

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogOpen(true);
      return;
    }

    unsavedChangesGuard.confirmDiscardChanges(() => setDialogOpen(false));
  };

  const handleEditorTabChange = (value: string) => {
    const tab = normalizeEventEditorTab(value);
    setActiveTab(tab);

    if (!editingEvent) return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  function onSubmit(values: EventFormValues) {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-events-title">
          Events
        </h1>
        <Button onClick={openCreate} data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div
        className="mb-4 rounded-lg border bg-card p-4 shadow-sm"
        data-testid="admin-events-filter-toolbar"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,auto))_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search events"
              className="pl-9"
              data-testid="input-admin-event-search"
            />
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger data-testid="select-admin-event-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EVENT_TYPES.map((eventType) => (
                <SelectItem key={eventType} value={eventType}>
                  {EVENT_TYPE_LABELS[eventType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="select-admin-event-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EVENT_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {EVENT_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-admin-event-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {EVENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {eventStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deliveryModeFilter} onValueChange={setDeliveryModeFilter}>
            <SelectTrigger data-testid="select-admin-event-delivery-filter">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery Modes</SelectItem>
              {EVENT_DELIVERY_MODES.map((deliveryMode) => (
                <SelectItem key={deliveryMode} value={deliveryMode}>
                  {EVENT_DELIVERY_MODE_LABELS[deliveryMode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveEventFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearEventFilters}
              data-testid="button-clear-admin-event-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground" data-testid="text-admin-event-count">
          Showing {filteredEvents.length} of {eventList.length} events
        </p>
      </div>

      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <Card
            key={event.id}
            data-testid={`card-event-${event.id}`}
            className="cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
            onClick={() => openEdit(event)}
          >
            <div className={event.imageUrl ? "flex flex-col sm:flex-row" : ""}>
              {event.imageUrl && (
                <div
                  className="sm:w-32 sm:min-w-[8rem] shrink-0"
                  data-testid={`img-event-thumbnail-${event.id}`}
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="h-32 sm:h-full w-full object-cover"
                    style={getImageObjectPositionStyle(event.imagePositionX, event.imagePositionY)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                  <div>
                    <CardTitle
                      className="text-lg flex items-center gap-2"
                      data-testid={`text-event-title-${event.id}`}
                    >
                      {event.title}
                      {event.registrationEnabled && event.capacity && (
                        <CapacityBadge eventId={event.id} capacity={event.capacity} />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {event.date
                          ? formatEventDate(event.date, event.timezone, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {event.registrationEnabled && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-analytics-${event.id}`}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end">
                          <EventAnalytics
                            eventId={event.id}
                            registrationEnabled={event.registrationEnabled}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    {new Date(event.date) > new Date() && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => notifyMutation.mutate({ id: event.id, type: "reminder" })}
                        disabled={notifyMutation.isPending}
                        data-testid={`button-notify-reminder-${event.id}`}
                        title="Send Reminder"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                    {event.recordingUrl && new Date(event.date) < new Date() && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => notifyMutation.mutate({ id: event.id, type: "recording" })}
                        disabled={notifyMutation.isPending}
                        data-testid={`button-notify-recording-${event.id}`}
                        title="Notify Recording"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => duplicateMutation.mutate(event.id)}
                      disabled={duplicateMutation.isPending}
                      data-testid={`button-duplicate-event-${event.id}`}
                      title="Duplicate Event"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(event)}
                      data-testid={`button-edit-event-${event.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(event)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {event.description && (
                    <p
                      className="text-sm text-muted-foreground mb-2 line-clamp-2"
                      data-testid={`text-event-desc-${event.id}`}
                    >
                      {stripHtml(event.description)}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={statusVariant(event.status)}
                      data-testid={`badge-status-${event.id}`}
                    >
                      {(event.status ?? "published").charAt(0).toUpperCase() +
                        (event.status ?? "published").slice(1)}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-visibility-${event.id}`}>
                      {visibilityLabel(event.visibility)}
                    </Badge>
                    {event.eventType && (
                      <Badge variant="secondary" data-testid={`badge-event-type-${event.id}`}>
                        {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                      </Badge>
                    )}
                    {event.category && (
                      <Badge variant="outline" data-testid={`badge-event-category-${event.id}`}>
                        {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
                      </Badge>
                    )}
                    {event.registrationApprovalMode === "manual" && (
                      <Badge variant="outline" data-testid={`badge-manual-approval-${event.id}`}>
                        Manual Approval
                      </Badge>
                    )}
                    {event.isVirtual && (
                      <Badge variant="secondary" data-testid={`badge-virtual-${event.id}`}>
                        Virtual
                      </Badge>
                    )}
                    {event.memberOnly && (
                      <Badge variant="secondary" data-testid={`badge-member-only-${event.id}`}>
                        Members Only
                      </Badge>
                    )}
                    {event.isRecurring && (
                      <Badge variant="secondary" data-testid={`badge-recurring-${event.id}`}>
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </Badge>
                    )}
                    {event.showInArchives && (
                      <Badge variant="secondary" data-testid={`badge-archived-${event.id}`}>
                        <Video className="h-3 w-3 mr-1" />
                        In Archives
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
        {eventList.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No events found.</p>
        )}
        {eventList.length > 0 && filteredEvents.length === 0 && (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-event-matches">
            No events match your search or filters.
          </p>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <SheetContent side="right" size="full">
          <SheetHeader>
            <SheetTitle data-testid="text-event-dialog-title">
              {editingEvent ? "Edit Event" : "Create Event"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editingEvent ? "Edit event details" : "Create a new event"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {editorLock.summary ? (
              <div className="mb-4">
                <EditorLockBanner
                  variant={editorLock.summary.variant}
                  title={editorLock.summary.title}
                  description={editorLock.summary.description}
                  isLoading={editorLock.isLoading}
                  onRefresh={editorLock.acquire}
                />
              </div>
            ) : null}
            <div
              className={cn(
                editorLock.hasLocking &&
                  editorLock.isReadOnly &&
                  "pointer-events-none select-none opacity-70",
              )}
            >
              <Form {...form}>
                <form id="event-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <Tabs value={activeTab} onValueChange={handleEditorTabChange}>
                    <TabsList
                      className="w-full grid grid-cols-4 mb-6"
                      data-testid="tabs-event-editor"
                    >
                      <TabsTrigger
                        value="details"
                        className="text-xs sm:text-sm"
                        data-testid="tab-details"
                      >
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5 hidden text-purple-600 sm:inline-block" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="registrations"
                        className="text-xs sm:text-sm"
                        data-testid="tab-registrations"
                      >
                        <Users className="h-3.5 w-3.5 mr-1.5 hidden text-blue-600 sm:inline-block" />
                        Registrants
                      </TabsTrigger>
                      <TabsTrigger
                        value="video-archive"
                        className="text-xs sm:text-sm"
                        data-testid="tab-video-archive"
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5 hidden text-rose-600 sm:inline-block" />
                        Video Archive
                      </TabsTrigger>
                      <TabsTrigger
                        value="recurring"
                        className="text-xs sm:text-sm"
                        data-testid="tab-recurring"
                      >
                        <Repeat className="h-3.5 w-3.5 mr-1.5 hidden text-emerald-600 sm:inline-block" />
                        Recurring
                      </TabsTrigger>
                    </TabsList>

                    {/* ===== DETAILS TAB ===== */}
                    <TabsContent value="details" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left column */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Basic Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-event-title" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL Slug</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(event) =>
                                          field.onChange(slugifyEventTitle(event.target.value))
                                        }
                                        placeholder={slugifyEventTitle(
                                          watchEventTitle || "event-name",
                                        )}
                                        data-testid="input-event-slug"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Public URL: /events/
                                      {watchEventSlug ||
                                        slugifyEventTitle(watchEventTitle || "event-name")}
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <CmsRichTextEditor
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder="Add the event overview, key details, and any helpful registration notes..."
                                        data-testid="input-event-description"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Event Image</FormLabel>
                                    <CmsImageUpload
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      data-testid="input-event-image-url"
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {watchEventImageUrl && (
                                <ImagePositionPicker
                                  imageUrl={watchEventImageUrl}
                                  positionX={watchEventImagePositionX ?? 50}
                                  positionY={watchEventImagePositionY ?? 50}
                                  onPositionChange={(x, y) => {
                                    form.setValue("imagePositionX", x, { shouldDirty: true });
                                    form.setValue("imagePositionY", y, { shouldDirty: true });
                                  }}
                                />
                              )}
                              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">Event Preset</p>
                                  <p className="text-xs text-muted-foreground">
                                    Choose a services/education template to prefill the flexible
                                    event settings.
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="eventType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Event Type</FormLabel>
                                        <Select
                                          onValueChange={(value: EventType) => applyPreset(value)}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-type">
                                              <SelectValue placeholder="Select a preset" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {EVENT_TYPES.map((eventType) => (
                                              <SelectItem key={eventType} value={eventType}>
                                                {EVENT_TYPE_LABELS[eventType]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="deliveryMode"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Delivery Mode</FormLabel>
                                        <Select
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue("isVirtual", value !== "in_person", {
                                              shouldDirty: true,
                                            });
                                          }}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-delivery-mode">
                                              <SelectValue placeholder="Select delivery" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {EVENT_DELIVERY_MODES.map((mode) => (
                                              <SelectItem key={mode} value={mode}>
                                                {EVENT_DELIVERY_MODE_LABELS[mode]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-category">
                                              <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {EVENT_CATEGORIES.map((category) => (
                                              <SelectItem key={category} value={category}>
                                                {EVENT_CATEGORY_LABELS[category]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="audience"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Audience</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-audience">
                                              <SelectValue placeholder="Select audience" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {EVENT_AUDIENCES.map((audience) => (
                                              <SelectItem key={audience} value={audience}>
                                                {EVENT_AUDIENCE_LABELS[audience]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="format"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Format</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-format">
                                              <SelectValue placeholder="Select format" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {EVENT_FORMATS.map((format) => (
                                              <SelectItem key={format} value={format}>
                                                {EVENT_FORMAT_LABELS[format]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="leadership, CE, onboarding"
                                            data-testid="input-event-tags"
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                          Separate tags with commas.
                                        </p>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="status"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Status</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "published"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-event-status">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="draft">Draft</SelectItem>
                                          <SelectItem value="published">Published</SelectItem>
                                          <SelectItem value="canceled">Canceled</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="visibility"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Visibility</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "public"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-event-visibility">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="public">Public</SelectItem>
                                          <SelectItem value="members_only">Members Only</SelectItem>
                                          <SelectItem value="counselors_only">
                                            Verified Providers Only
                                          </SelectItem>
                                          <SelectItem value="admins_only">Admins Only</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="memberOnly"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-event-member-only"
                                      />
                                    </FormControl>
                                    <FormLabel className="!mt-0">Members Only (legacy)</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Schedule</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="date"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Start Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="datetime-local"
                                          {...field}
                                          data-testid="input-event-date"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="endDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>End Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="datetime-local"
                                          {...field}
                                          data-testid="input-event-end-date"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="timezone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Timezone</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="e.g. America/New_York"
                                        data-testid="input-event-timezone"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Structured Data (JSON-LD)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <StructuredDataStatus
                                contentType="event"
                                fields={{
                                  hasTitle: !!watchEventTitle,
                                  hasDescription: !!watchEventDescription,
                                  hasDate: !!watchEventDate,
                                  hasLocation: !!watchEventLocation,
                                  hasRecordingUrl: !!watchEventRecordingUrl,
                                }}
                                data-testid="structured-data-status-event"
                              />
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Location & Attendance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="venueId"
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="flex items-center justify-between gap-3">
                                      <FormLabel>Saved Venue</FormLabel>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={openVenueDialog}
                                        disabled={editorLock.isReadOnly}
                                        data-testid="button-create-venue"
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        New venue
                                      </Button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        onValueChange={applyVenue}
                                        value={field.value || "none"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-event-venue">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">No saved venue</SelectItem>
                                          {venues.map((venue) => (
                                            <SelectItem key={venue.id} value={venue.id}>
                                              {venue.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="isVirtual"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-event-virtual"
                                      />
                                    </FormControl>
                                    <FormLabel className="!mt-0">Virtual Event</FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-event-location" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="locationName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Location Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="e.g. Conference Center"
                                        data-testid="input-event-location-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="locationAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Location Address</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        data-testid="input-event-location-address"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="latitude"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Latitude</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="input-event-latitude" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="longitude"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Longitude</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="input-event-longitude" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="zoomLink"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zoom / Meeting Link</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="https://zoom.us/j/..."
                                        autoPrependHttps
                                        data-testid="input-event-zoom-link"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="virtualJoinUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Virtual Join URL</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="https://..."
                                        autoPrependHttps
                                        data-testid="input-event-virtual-join-url"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="virtualDialInInfo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dial-In Info</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Phone number, access code, etc."
                                        data-testid="input-event-dial-in-info"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Speaker / Host</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="organizerId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Saved Organizer</FormLabel>
                                    <Select
                                      onValueChange={applyOrganizer}
                                      value={field.value || "none"}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-event-organizer">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">No saved organizer</SelectItem>
                                        {organizers.map((organizer) => (
                                          <SelectItem key={organizer.id} value={organizer.id}>
                                            {organizer.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="speakerName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Speaker Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-event-speaker-name" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="speakerBio"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Speaker Bio</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} data-testid="input-event-speaker-bio" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="speakerImageUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Speaker Image</FormLabel>
                                    <CmsImageUpload
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      data-testid="input-event-speaker-image-url"
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ===== REGISTRANTS TAB ===== */}
                    <TabsContent value="registrations" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Registration Settings</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="registrationEnabled"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium">
                                      Enable Registration
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Allow users to register for this event
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-event-registration"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {watchRegistrationEnabled && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="registrationType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Registration Type</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "free"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-event-registration-type">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="free">Free</SelectItem>
                                          <SelectItem value="paid">Paid</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                {watchRegistrationType === "paid" && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="registrationFee"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Fee (USD)</FormLabel>
                                          <FormControl>
                                            <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                $
                                              </span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="pl-7"
                                                placeholder="400.00"
                                                value={centsToDollarInput(field.value)}
                                                onChange={(event) => {
                                                  field.onChange(
                                                    dollarInputToCents(event.target.value),
                                                  );
                                                }}
                                                data-testid="input-event-registration-fee"
                                              />
                                            </div>
                                          </FormControl>
                                          <p className="text-xs text-muted-foreground">
                                            Enter the amount in dollars. Payments are processed in
                                            cents behind the scenes.
                                          </p>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="registrationCurrency"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Currency</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              placeholder="usd"
                                              data-testid="input-event-registration-currency"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="registrationOpensAt"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Opens At</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                            data-testid="input-event-reg-opens"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="registrationClosesAt"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Closes At</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                            data-testid="input-event-reg-closes"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name="capacity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Capacity</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          {...field}
                                          value={field.value ?? ""}
                                          data-testid="input-event-capacity"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="registrationApprovalMode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Confirmation Rule</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "automatic"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-registration-approval-mode">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {EVENT_REGISTRATION_APPROVAL_MODES.map((mode) => (
                                            <SelectItem key={mode} value={mode}>
                                              {EVENT_REGISTRATION_APPROVAL_MODE_LABELS[mode]}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <p className="text-xs text-muted-foreground">
                                        Manual approval creates pending registrations for review.
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="registrationFormId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Custom Intake Form</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "none"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-registration-form">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">No custom form</SelectItem>
                                          {activeForms.map((managedForm) => (
                                            <SelectItem key={managedForm.id} value={managedForm.id}>
                                              {managedForm.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <p className="text-xs text-muted-foreground">
                                        Use Forms to collect event-specific intake details.
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="waitlistEnabled"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                      <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium">
                                          Enable Waitlist
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                          Allow users to join a waitlist when event is full
                                        </p>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-event-waitlist"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Registrants & Waitlist</CardTitle>
                              {editingEvent && registrations && registrations.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (registrations && editingEvent) {
                                      downloadCsv(registrations, editingEvent.title);
                                    }
                                  }}
                                  data-testid="button-export-csv"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export CSV
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {!editingEvent ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Save the event first to manage registrants.
                              </p>
                            ) : registrantsLoading ? (
                              <div className="flex items-center justify-center p-8">
                                <LoadingSpinner />
                              </div>
                            ) : !registrations || registrations.length === 0 ? (
                              <p
                                className="text-center text-muted-foreground py-8"
                                data-testid="text-no-registrants"
                              >
                                No registrants yet.
                              </p>
                            ) : (
                              <>
                                <div className="flex gap-2 flex-wrap mb-4">
                                  <Badge
                                    variant="default"
                                    data-testid="badge-confirmed-count"
                                    className="flex items-center gap-1"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {confirmedCount} Confirmed
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    data-testid="badge-waitlisted-count"
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    {waitlistedCount} Waitlisted
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    data-testid="badge-pending-count"
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    {pendingCount} Pending
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    data-testid="badge-attended-count"
                                    className="flex items-center gap-1"
                                  >
                                    <CheckSquare className="h-3 w-3" />
                                    {attendedCount} Attended
                                  </Badge>
                                </div>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                  {registrations.map((reg) => (
                                    <Card
                                      key={reg.id}
                                      data-testid={`card-registrant-${reg.id}`}
                                      className="shadow-none"
                                    >
                                      <CardContent className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                  checkInMutation.mutate({
                                                    id: reg.id,
                                                    attended: !reg.attended,
                                                  })
                                                }
                                                disabled={checkInMutation.isPending}
                                                data-testid={`button-checkin-${reg.id}`}
                                                title={
                                                  reg.attended ? "Remove check-in" : "Check-in"
                                                }
                                              >
                                                {reg.attended ? (
                                                  <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                  <Square className="h-4 w-4 text-muted-foreground" />
                                                )}
                                              </Button>
                                              <div className="min-w-0">
                                                <p
                                                  className="font-medium text-sm truncate flex items-center gap-1.5"
                                                  data-testid={`text-registrant-name-${reg.id}`}
                                                >
                                                  {reg.fullName}
                                                  {!reg.userId && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] px-1.5 py-0"
                                                      data-testid={`badge-guest-${reg.id}`}
                                                    >
                                                      Guest
                                                    </Badge>
                                                  )}
                                                </p>
                                                <p
                                                  className="text-xs text-muted-foreground truncate"
                                                  data-testid={`text-registrant-email-${reg.id}`}
                                                >
                                                  {reg.email}
                                                </p>
                                                {reg.phone && (
                                                  <p
                                                    className="text-xs text-muted-foreground truncate"
                                                    data-testid={`text-registrant-phone-${reg.id}`}
                                                  >
                                                    {reg.phone}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap ml-9">
                                              {reg.registeredAt && (
                                                <span
                                                  className="text-[10px] text-muted-foreground"
                                                  data-testid={`text-registrant-date-${reg.id}`}
                                                >
                                                  Registered{" "}
                                                  {new Date(reg.registeredAt).toLocaleDateString()}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap ml-9">
                                              <Badge
                                                variant={registrationStatusVariant(reg.status)}
                                                className="text-[10px]"
                                                data-testid={`badge-registrant-status-${reg.id}`}
                                              >
                                                {reg.status.charAt(0).toUpperCase() +
                                                  reg.status.slice(1)}
                                              </Badge>
                                              {editingEvent?.registrationType === "paid" && (
                                                <>
                                                  <Badge
                                                    variant={paymentStatusVariant(
                                                      reg.paymentStatus,
                                                    )}
                                                    className="text-[10px]"
                                                    data-testid={`badge-payment-status-${reg.id}`}
                                                  >
                                                    {reg.paymentStatus
                                                      ? reg.paymentStatus
                                                          .replace("_", " ")
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                        reg.paymentStatus.replace("_", " ").slice(1)
                                                      : "N/A"}
                                                  </Badge>
                                                  {reg.amountPaid ? (
                                                    <span
                                                      className="text-[10px] font-medium"
                                                      data-testid={`text-amount-paid-${reg.id}`}
                                                    >
                                                      ${(reg.amountPaid / 100).toFixed(2)}
                                                    </span>
                                                  ) : null}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                data-testid={`button-registrant-actions-${reg.id}`}
                                              >
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {reg.status !== "confirmed" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "confirmed",
                                                    })
                                                  }
                                                  data-testid={`action-confirm-${reg.id}`}
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                  Confirm
                                                </DropdownMenuItem>
                                              )}
                                              {reg.status !== "waitlisted" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "waitlisted",
                                                    })
                                                  }
                                                  data-testid={`action-waitlist-${reg.id}`}
                                                >
                                                  <Clock className="h-4 w-4 mr-2" />
                                                  Waitlist
                                                </DropdownMenuItem>
                                              )}
                                              {reg.status !== "canceled" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "canceled",
                                                    })
                                                  }
                                                  data-testid={`action-cancel-${reg.id}`}
                                                >
                                                  <XCircle className="h-4 w-4 mr-2" />
                                                  Cancel
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  deleteRegistrationMutation.mutate(reg.id)
                                                }
                                                className="text-destructive"
                                                data-testid={`action-remove-${reg.id}`}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* ===== VIDEO ARCHIVE TAB ===== */}
                    <TabsContent value="video-archive" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Recording Link
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="recordingUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Recording URL</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                      autoPrependHttps
                                      data-testid="input-event-recording-url"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    YouTube and Vimeo links are automatically embeddable
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {watchEventRecordingUrl && (
                              <FormField
                                control={form.control}
                                name="showInArchives"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm font-medium">
                                        Show in Video Archives
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        Display this recording on the public Video Archives page
                                      </p>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-show-in-archives"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </CardContent>
                        </Card>

                        {watchEventRecordingUrl && watchShowInArchives && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Pricing & Access
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="recordingAccess"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Access Type</FormLabel>
                                    <Select
                                      value={field.value || "free"}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-recording-access">
                                          <SelectValue placeholder="Select access type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="free">
                                          Free - Open to all verified providers
                                        </SelectItem>
                                        <SelectItem value="paid">
                                          Paid — One-time purchase via Stripe
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {watchRecordingAccess === "paid" && (
                                <FormField
                                  control={form.control}
                                  name="recordingPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Price (USD)</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            $
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0.50"
                                            className="pl-7"
                                            placeholder="29.99"
                                            value={
                                              field.value ? (field.value / 100).toFixed(2) : ""
                                            }
                                            onChange={(e) => {
                                              const cents = Math.round(
                                                parseFloat(e.target.value || "0") * 100,
                                              );
                                              field.onChange(cents);
                                            }}
                                            data-testid="input-recording-price"
                                          />
                                        </div>
                                      </FormControl>
                                      <p className="text-xs text-muted-foreground">
                                        One-time purchase price. Verified providers will pay via
                                        Stripe and have permanent access after purchase.
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                <h4 className="text-sm font-medium">How it works</h4>
                                {watchRecordingAccess === "paid" ? (
                                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                                    <li>
                                      Verified providers see a "Purchase" button on the Video
                                      Archives page
                                    </li>
                                    <li>
                                      They're redirected to Stripe Checkout to complete payment
                                    </li>
                                    <li>
                                      After payment, they have permanent access to the recording
                                    </li>
                                    <li>
                                      The recording URL is protected — only purchasers can access it
                                    </li>
                                  </ul>
                                ) : (
                                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                                    <li>All verified providers can view this recording for free</li>
                                    <li>
                                      The recording will appear in the Video Archives with a "Free"
                                      badge
                                    </li>
                                  </ul>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    {/* ===== RECURRING TAB ===== */}
                    <TabsContent value="recurring" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Repeat className="h-4 w-4" />
                              Recurring Event
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="isRecurring"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium">
                                      Make this a recurring event
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Automatically generate future instances of this event
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-is-recurring"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {watchIsRecurring && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="recurrencePattern"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Repeat Frequency</FormLabel>
                                      <Select
                                        value={field.value || ""}
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-recurrence-pattern">
                                            <SelectValue placeholder="Select frequency" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="daily">Daily</SelectItem>
                                          <SelectItem value="weekly">Weekly</SelectItem>
                                          <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                                          <SelectItem value="monthly">Monthly</SelectItem>
                                          <SelectItem value="quarterly">
                                            Quarterly (Every 3 Months)
                                          </SelectItem>
                                          <SelectItem value="yearly">Yearly</SelectItem>
                                          <SelectItem value="custom">Custom Interval</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {watchRecurrencePattern === "custom" && (
                                  <FormField
                                    control={form.control}
                                    name="recurrenceInterval"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Repeat Every (days)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            {...field}
                                            value={field.value ?? ""}
                                            data-testid="input-recurrence-interval"
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                          Number of days between each occurrence
                                        </p>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {(watchRecurrencePattern === "weekly" ||
                                  watchRecurrencePattern === "biweekly") && (
                                  <FormField
                                    control={form.control}
                                    name="recurrenceDaysOfWeek"
                                    render={({ field }) => {
                                      const selected = field.value
                                        ? field.value.split(",").filter(Boolean)
                                        : [];
                                      const toggle = (day: string) => {
                                        const newVal = selected.includes(day)
                                          ? selected.filter((d) => d !== day)
                                          : [...selected, day];
                                        field.onChange(newVal.join(","));
                                      };
                                      return (
                                        <FormItem>
                                          <FormLabel>Repeat On</FormLabel>
                                          <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map((day) => (
                                              <Button
                                                key={day.value}
                                                type="button"
                                                size="sm"
                                                variant={
                                                  selected.includes(day.value)
                                                    ? "default"
                                                    : "outline"
                                                }
                                                onClick={() => toggle(day.value)}
                                                data-testid={`button-day-${day.value}`}
                                              >
                                                {day.label}
                                              </Button>
                                            ))}
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                      );
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>

                        {watchIsRecurring && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">End Conditions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="recurrenceEndDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="datetime-local"
                                        {...field}
                                        data-testid="input-recurrence-end-date"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Stop generating events after this date
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="relative flex items-center py-2">
                                <Separator className="flex-1" />
                                <span className="px-3 text-xs text-muted-foreground">OR</span>
                                <Separator className="flex-1" />
                              </div>

                              <FormField
                                control={form.control}
                                name="recurrenceCount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Number of Occurrences</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="e.g. 12"
                                        data-testid="input-recurrence-count"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Total number of event instances to generate
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                <h4 className="text-sm font-medium">Recurrence Summary</h4>
                                <p className="text-xs text-muted-foreground">
                                  {!watchRecurrencePattern &&
                                    "Select a frequency to see the recurrence summary."}
                                  {watchRecurrencePattern === "daily" &&
                                    "This event will repeat every day."}
                                  {watchRecurrencePattern === "weekly" &&
                                    `This event will repeat every week${form.getValues("recurrenceDaysOfWeek") ? ` on ${form.getValues("recurrenceDaysOfWeek")?.split(",").join(", ")}` : ""}.`}
                                  {watchRecurrencePattern === "biweekly" &&
                                    `This event will repeat every 2 weeks${form.getValues("recurrenceDaysOfWeek") ? ` on ${form.getValues("recurrenceDaysOfWeek")?.split(",").join(", ")}` : ""}.`}
                                  {watchRecurrencePattern === "monthly" &&
                                    "This event will repeat on the same day each month."}
                                  {watchRecurrencePattern === "quarterly" &&
                                    "This event will repeat every 3 months."}
                                  {watchRecurrencePattern === "yearly" &&
                                    "This event will repeat on the same date each year."}
                                  {watchRecurrencePattern === "custom" &&
                                    form.getValues("recurrenceInterval") &&
                                    ` This event will repeat every ${form.getValues("recurrenceInterval")} day(s).`}
                                </p>
                                {(form.getValues("recurrenceEndDate") ||
                                  form.getValues("recurrenceCount")) && (
                                  <p className="text-xs text-muted-foreground">
                                    {form.getValues("recurrenceEndDate") &&
                                      `Ends: ${new Date(form.getValues("recurrenceEndDate")!).toLocaleDateString()}`}
                                    {form.getValues("recurrenceCount") &&
                                      `${form.getValues("recurrenceEndDate") ? " · " : ""}${form.getValues("recurrenceCount")} occurrence(s)`}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          </SheetBody>
          <SheetFooter>
            <AdminSaveBar
              state={saveState.state}
              form="event-form"
              primaryLabel={editingEvent ? "Save Event" : "Create Event"}
              disabled={isSaving || editorLock.isReadOnly}
              buttonTestId="button-submit-event"
            />
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
        <DialogContent className="z-[1200] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Saved Venue</DialogTitle>
            <DialogDescription>
              Save reusable venue details and attach the venue to this event.
            </DialogDescription>
          </DialogHeader>
          <Form {...venueForm}>
            <form
              id="venue-form"
              onSubmit={venueForm.handleSubmit(onVenueSubmit)}
              className="space-y-5"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Basics</h3>
                <FormField
                  control={venueForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-venue-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={venueForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-venue-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={venueForm.control}
                  name="isVirtual"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-venue-virtual"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Virtual venue</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Address</h3>
                <FormField
                  control={venueForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-venue-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    control={venueForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Region</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-region" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-latitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-longitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Contact</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    control={venueForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-venue-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-venue-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={venueForm.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} autoPrependHttps data-testid="input-venue-website-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Visitor Info</h3>
                <FormField
                  control={venueForm.control}
                  name="parkingInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Options</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-venue-parking" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={venueForm.control}
                  name="accessibilityInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accessibility</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-venue-accessibility" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={venueForm.control}
                  name="transitInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transit / Rideshare</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-venue-transit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={venueForm.control}
                  name="arrivalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-venue-arrival" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVenueDialogOpen(false)}
              data-testid="button-cancel-venue"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="venue-form"
              disabled={createVenueMutation.isPending}
              data-testid="button-submit-venue"
            >
              {createVenueMutation.isPending ? "Saving..." : "Save Venue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {unsavedChangesGuard.dialog}
    </div>
  );
}
