import { buildSubmissionCsv } from "@shared/form-submission-export";
import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  type CmsForm,
  type CmsFormField,
  type CmsFormFieldConfig,
  type CmsFormFieldOption,
  type CmsFormFieldType,
  type CmsFormKind,
  type CmsFormListColumn,
  type CmsFormSubmission,
  cmsFormFieldConfigSchema,
} from "@shared/schema";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { EditorSaveIndicator } from "@/components/shared/editor-save-indicator";
import { AdminSidebar } from "./admin-sidebar";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CmsImageUpload } from "./cms/components/cms-image-upload";
import {
  Plus,
  GripVertical,
  Trash2,
  Mail,
  Save,
  Copy,
  PanelTopOpen,
  Type,
  Pilcrow,
  Hash,
  CheckSquare,
  CircleDot,
  EyeOff,
  Code2,
  SeparatorHorizontal,
  FileStack,
  Image,
  UserRound,
  CalendarDays,
  Clock3,
  Phone,
  MapPin,
  Link2,
  ListChecks,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  ArrowLeft,
  Download,
  Inbox,
} from "lucide-react";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

import {
  FormsWorkspace,
  EditableForm,
  FIELD_LIBRARY,
  FIELD_LIBRARY_GROUPS,
  createBlankForm,
  normalizeEditableForm,
  serializeEditableForm,
  createField,
  normalizeField,
  isStructuralField,
  isFullWidthField,
  moveItem,
  slugify,
  generateId,
  getFieldLibraryItem,
  createDefaultOptions,
  createDefaultConfig,
} from "../../components/shared/forms-workspace";

export default function AdminFormsPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
      <AdminSidebar>
        <FormsPageContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function FailedDeliveries() {
  const [status, setStatus] = useState("actionable");
  type DeliveryPage = {
    items: Array<{
      id: string;
      submissionId: string;
      kind: string;
      status: string;
      attemptCount: number;
      createdAt: string;
      lastErrorCode: string | null;
      deliveryResult: { leadId: string } | null;
    }>;
    nextCursor: string | null;
  };
  const query = useInfiniteQuery({
    queryKey: ["/api/admin/form-delivery-jobs", status],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<DeliveryPage> => {
      const params = new URLSearchParams({ status, limit: "50" });
      if (pageParam) params.set("cursor", pageParam);
      const response = await apiRequest("GET", `/api/admin/form-delivery-jobs?${params}`);
      return response.json();
    },
    getNextPageParam: (last: DeliveryPage) => last.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
  const jobs = query.data?.pages.flatMap((page) => page.items) ?? [];
  const isError = query.isError;
  const retry = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/form-delivery-jobs/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/form-delivery-jobs"] }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead delivery monitoring</CardTitle>
        <CardDescription>
          Accepted inquiries remain stored while dashboard, CRM and notification jobs retry.
          Commercial handoff status appears here until delivered.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label>
          Delivery status{" "}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="actionable">Pending and failed</option>
            <option value="completed">Completed commercial handoffs</option>
            <option value="all">All monitored deliveries</option>
          </select>
        </label>
        <p>{jobs.length} deliveries shown, newest first.</p>
        {isError ? (
          <p role="alert">Delivery status could not be loaded.</p>
        ) : jobs.length === 0 ? (
          <p>No commercial handoffs or failed delivery jobs.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-4 py-2">
              <span>
                {job.kind} · {job.status} · Receipt {job.submissionId.slice(0, 8)} ·{" "}
                {job.attemptCount} attempts · {new Date(job.createdAt).toLocaleString()}
                {job.lastErrorCode ? ` · ${job.lastErrorCode}` : ""}
                {job.deliveryResult
                  ? ` · Dashboard lead ${job.deliveryResult.leadId.slice(0, 8)}`
                  : ""}
              </span>
              {job.status === "failed" && (
                <Button disabled={retry.isPending} onClick={() => retry.mutate(job.id)}>
                  Retry delivery
                </Button>
              )}
            </div>
          ))
        )}
        {query.hasNextPage && (
          <Button disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            Load more deliveries
          </Button>
        )}
        {retry.isError && <p role="alert">Retry failed. Refresh and try again.</p>}
      </CardContent>
    </Card>
  );
}

function FormsPageContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"builder" | "entries">("builder");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedEntriesFormId, setSelectedEntriesFormId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableForm | null>(null);
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState("");
  const saveFeedbackRef = useRef({
    markSaved: () => {},
    markError: () => {},
    clearFeedback: () => {},
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldType, setDraggingFieldType] = useState<CmsFormFieldType | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [formSettingsOpen, setFormSettingsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<"standard" | "advanced", boolean>>({
    standard: true,
    advanced: true,
  });

  const { data: forms = [], isLoading } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.LIVE,
  });

  const activeForms = useMemo(() => forms.filter((form) => form.isActive), [forms]);

  const { data: submissions = [], isLoading: isSubmissionsLoading } = useQuery<CmsFormSubmission[]>(
    {
      queryKey: ["/api/admin/forms", selectedEntriesFormId, "submissions"],
      enabled: Boolean(selectedEntriesFormId),
      queryFn: async () => {
        const response = await fetch(`/api/admin/forms/${selectedEntriesFormId}/submissions`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load form entries.");
        }
        return response.json();
      },
    },
  );

  useEffect(() => {
    if (draft) return;
    if (!selectedFormId && forms.length > 0) {
      const normalized = normalizeEditableForm(forms[0]);
      setSelectedFormId(forms[0].id);
      setFormSettingsOpen(true);
      setDraft(normalized);
      setSavedDraftSnapshot(serializeEditableForm(normalized));
      return;
    }

    if (selectedFormId) {
      const match = forms.find((form) => form.id === selectedFormId);
      if (match) {
        const normalized = normalizeEditableForm(match);
        setDraft(normalized);
        setSavedDraftSnapshot(serializeEditableForm(normalized));
      }
    }
  }, [forms, selectedFormId, draft]);

  useEffect(() => {
    if (!selectedEntriesFormId && activeForms.length > 0) {
      setSelectedEntriesFormId(activeForms[0].id);
      setSelectedEntryId(null);
      return;
    }

    if (selectedEntriesFormId && !activeForms.some((form) => form.id === selectedEntriesFormId)) {
      setSelectedEntriesFormId(activeForms[0]?.id ?? null);
      setSelectedEntryId(null);
    }
  }, [activeForms, selectedEntriesFormId]);

  useEffect(() => {
    setSelectedEntryId(null);
  }, [selectedEntriesFormId]);

  useEffect(() => {
    if (selectedEntryId && !submissions.some((submission) => submission.id === selectedEntryId)) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, submissions]);

  const saveMutation = useMutation({
    mutationFn: async (form: EditableForm) => {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        kind: form.kind,
        isSystem: form.isSystem,
        isActive: form.isActive,
        fields: form.fields,
        settings: form.settings,
      };

      if (form.id.startsWith("draft-")) {
        const response = await apiRequest("POST", "/api/admin/forms", payload);
        return (await response.json()) as CmsForm;
      }

      const response = await apiRequest("PUT", `/api/admin/forms/${form.id}`, {
        ...payload,
        expectedUpdatedAt: form.expectedUpdatedAt,
      });
      return (await response.json()) as CmsForm;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      const normalized = normalizeEditableForm(saved);
      setSelectedFormId(saved.id);
      setDraft(normalized);
      setSavedDraftSnapshot(serializeEditableForm(normalized));
      saveFeedbackRef.current.markSaved();
      toast({ title: "Form saved" });
    },
    onError: (error: Error) => {
      saveFeedbackRef.current.markError();
      toast({
        title: "Unable to save form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSaving = saveMutation.isPending;
  const isDirty = !!draft && serializeEditableForm(draft) !== savedDraftSnapshot;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty: activeTab === "builder" && isDirty,
    message: "You have unsaved changes to this form. Leave without saving?",
  });
  saveFeedbackRef.current = saveState;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      setSelectedFieldId(null);
      setSelectedFormId(null);
      setDraft(null);
      setSavedDraftSnapshot("");
      toast({ title: "Form deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to delete form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async ({ formId, submissionId }: { formId: string; submissionId: string }) => {
      await apiRequest("DELETE", `/api/admin/forms/${formId}/submissions/${submissionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/forms", selectedEntriesFormId, "submissions"],
      });
      toast({ title: "Entry deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to delete entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedField = useMemo(
    () => draft?.fields.find((field) => field.id === selectedFieldId) ?? null,
    [draft?.fields, selectedFieldId],
  );

  const groupedFieldLibrary = useMemo(
    () =>
      FIELD_LIBRARY_GROUPS.map((group) => ({
        ...group,
        items: FIELD_LIBRARY.filter((item) => item.group === group.key),
      })),
    [],
  );

  const selectedFieldLibraryItem = selectedField ? getFieldLibraryItem(selectedField.type) : null;
  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedEntryId) ?? null,
    [selectedEntryId, submissions],
  );

  const publicFormLink =
    typeof window !== "undefined" && draft?.slug
      ? `${window.location.origin}/forms/${draft.slug}`
      : "";

  const editorLock = useEditorLock({
    resourceType: "form",
    resourceId:
      activeTab === "builder" && draft && !draft.id.startsWith("draft-") ? draft.id : null,
    enabled: activeTab === "builder" && Boolean(draft) && !draft?.id.startsWith("draft-"),
  });

  useLockConflictGuard({
    active: activeTab === "builder" && Boolean(draft?.id) && !draft?.id?.startsWith("draft-"),
    resourceId:
      activeTab === "builder" && draft && !draft.id.startsWith("draft-") ? draft.id : null,
    resourceLabel: "form",
    editorLock,
    onConflict: () => {
      setActiveTab("entries");
      setSelectedFormId(null);
      setSelectedFieldId(null);
      setFormSettingsOpen(false);
      setDraft(null);
      setSavedDraftSnapshot("");
    },
  });

  const updateDraft = (updater: (current: EditableForm) => EditableForm) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const updateField = (fieldId: string, updates: Partial<CmsFormField>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId ? normalizeField({ ...field, ...updates }) : field,
      ),
    }));
  };

  const updateFieldConfig = (fieldId: string, updates: Partial<CmsFormFieldConfig>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              config: { ...(field.config ?? {}), ...updates },
            })
          : field,
      ),
    }));
  };

  const replaceFieldType = (fieldId: string, type: CmsFormFieldType) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              type,
              options: createDefaultOptions(type),
              config: cmsFormFieldConfigSchema.parse(createDefaultConfig(type)),
              width: isFullWidthField(type) ? "full" : "half",
              required: !isStructuralField(type) && type !== "hidden" ? field.required : false,
            })
          : field,
      ),
    }));
  };

  const addField = (type: CmsFormFieldType, index?: number) => {
    updateDraft((current) => {
      const field = createField(type);
      const insertAt = typeof index === "number" ? index : current.fields.length;
      const nextFields = [...current.fields];
      nextFields.splice(insertAt, 0, field);
      setSelectedFieldId(field.id);
      return { ...current, fields: nextFields };
    });
  };

  const removeField = (fieldId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const updateChoice = (
    fieldId: string,
    optionId: string,
    updates: Partial<CmsFormFieldOption>,
  ) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: (field.options ?? []).map((option) =>
                option.value === optionId ? { ...option, ...updates } : option,
              ),
            })
          : field,
      ),
    }));
  };

  const addChoice = (fieldId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: [
                ...(field.options ?? []),
                {
                  label: "New Option",
                  value: slugify(`new-option-${generateId().slice(0, 4)}`),
                  imageUrl: "",
                },
              ],
            })
          : field,
      ),
    }));
  };

  const removeChoice = (fieldId: string, optionId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: (field.options ?? []).filter((option) => option.value !== optionId),
            })
          : field,
      ),
    }));
  };

  const addListColumn = (fieldId: string) => {
    const nextColumn: CmsFormListColumn = {
      id: generateId(),
      label: "Column",
      placeholder: "",
    };
    const listColumns = Array.isArray(selectedField?.config?.listColumns)
      ? selectedField.config.listColumns
      : [];
    updateFieldConfig(fieldId, { listColumns: [...listColumns, nextColumn] });
  };

  const updateListColumn = (
    fieldId: string,
    columnId: string,
    updates: Partial<CmsFormListColumn>,
  ) => {
    const listColumns = Array.isArray(selectedField?.config?.listColumns)
      ? selectedField.config.listColumns
      : [];
    updateFieldConfig(fieldId, {
      listColumns: listColumns.map((column) =>
        column.id === columnId ? { ...column, ...updates } : column,
      ),
    });
  };

  const removeListColumn = (fieldId: string, columnId: string) => {
    const listColumns = Array.isArray(selectedField?.config?.listColumns)
      ? selectedField.config.listColumns
      : [];
    updateFieldConfig(fieldId, {
      listColumns: listColumns.filter((column) => column.id !== columnId),
    });
  };

  const onDropFieldAtIndex = (index: number) => {
    if (draggingFieldType) {
      addField(draggingFieldType, index);
    } else if (draggingFieldId && draft) {
      const currentIndex = draft.fields.findIndex((field) => field.id === draggingFieldId);
      if (currentIndex !== -1) {
        updateDraft((current) => ({
          ...current,
          fields: moveItem(current.fields, currentIndex, index),
        }));
        setSelectedFieldId(draggingFieldId);
      }
    }

    setDraggingFieldType(null);
    setDraggingFieldId(null);
    setDropIndex(null);
  };

  const switchToDraft = (nextDraft: EditableForm) => {
    setSelectedFormId(nextDraft.id);
    setSelectedFieldId(null);
    setFormSettingsOpen(true);
    setDraft(nextDraft);
    setSavedDraftSnapshot(serializeEditableForm(nextDraft));
    saveFeedbackRef.current.clearFeedback();
  };

  const handleCreateForm = () => {
    unsavedChangesGuard.confirmDiscardChanges(() => {
      const blank = createBlankForm();
      switchToDraft(blank);
    });
  };

  const handleSelectForm = (form: CmsForm) => {
    if (selectedFormId === form.id) return;
    unsavedChangesGuard.confirmDiscardChanges(() => {
      switchToDraft(normalizeEditableForm(form));
    });
  };

  const handleTabChange = (value: string) => {
    const nextTab = value === "entries" ? "entries" : "builder";
    if (nextTab === activeTab) return;

    if (nextTab === "entries") {
      unsavedChangesGuard.confirmDiscardChanges(() => setActiveTab("entries"));
      return;
    }

    setActiveTab("builder");
  };

  return (
    <FormsWorkspace
      model={{
        activeTab,
        handleTabChange,
        draft,
        forms,
        isLoading,
        selectedFormId,
        handleSelectForm,
        handleCreateForm,
        editorLock,
        saveState,
        saveMutation,
        deleteMutation,
        selectedField,
        selectedFieldId,
        setSelectedFieldId,
        formSettingsOpen,
        setFormSettingsOpen,
        updateDraft,
        publicFormLink,
        toast,
        dropIndex,
        setDropIndex,
        onDropFieldAtIndex,
        setDraggingFieldId,
        setDraggingFieldType,
        selectedFieldLibraryItem,
        updateField,
        replaceFieldType,
        updateFieldConfig,
        addChoice,
        removeChoice,
        updateChoice,
        addListColumn,
        updateListColumn,
        removeListColumn,
        removeField,
        groupedFieldLibrary,
        openGroups,
        setOpenGroups,
        addField,
        activeForms,
        selectedEntriesFormId,
        setSelectedEntriesFormId,
        submissions,
        isSubmissionsLoading,
        selectedSubmission,
        setSelectedEntryId,
        deleteSubmissionMutation,
        unsavedChangesGuard,
      }}
      components={
        {
          Card,
          CardHeader,
          CardTitle,
          CardDescription,
          CardContent,
          Button,
          Input,
          Textarea,
          Label,
          Badge,
          Switch,
          Tabs,
          TabsList,
          TabsTrigger,
          TabsContent,
          Select,
          SelectTrigger,
          SelectValue,
          SelectContent,
          SelectItem,
          CmsImageUpload,
          EditorLockBanner,
          EditorSaveIndicator,
        } as import("../../components/shared/forms-workspace").FormsPrimitives
      }
      deliveryMonitor={<FailedDeliveries />}
    />
  );
}
