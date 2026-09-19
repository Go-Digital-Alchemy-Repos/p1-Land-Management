import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  listMarketingForms,
  getMarketingForm,
  getMarketingFormBuilder,
  createMarketingForm,
  updateMarketingForm,
  deleteMarketingForm,
  listMarketingFormSubmissions,
  deleteMarketingFormSubmission,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingForm,
  MarketingFormInput,
  MarketingFormSubmission,
} from "../../../../lib/api-client-react/src/dashboard/models";
import type {
  CmsForm,
  CmsFormField,
  CmsFormFieldType,
  CmsFormFieldConfig,
  CmsFormFieldOption,
  CmsFormListColumn,
  CmsFormSubmission,
} from "../../../../platform/p1-core/shared/schema/forms";
import {
  FormsWorkspace,
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
  type EditableForm,
} from "../../../../platform/p1-core/client/src/components/shared/forms-workspace";
import {
  useFormsQuery as useQuery,
  useFormsMutation as useMutation,
  useEditorSaveState,
  useUnsavedChangesGuard,
  useFormReservation,
  loadForms,
  loadSubmissions,
  saveForm,
  toForm,
  formEditProblem,
} from "./forms-runtime";
import { formPrimitives, FormsMediaProvider } from "./forms-primitives";
import { FormDeliveryQueue } from "./FormDeliveryQueue";
import { BuilderPreview } from "./BuilderPreview";
import { validateFormFields } from "./FormFieldsEditor";
import "./forms-workspace.css";
const PUBLIC_SITE_ORIGIN = "https://www.p1landmanagement.com";
const message = (error: unknown) =>
  (error as Error).message || "Form request failed";
function FormPreview({ value }: { value: MarketingFormInput }) {
  const [url, setUrl] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void getMarketingFormBuilder({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setUrl(result.previewUrl);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  if (loading) return <p role="status">Loading form preview connection…</p>;
  if (error)
    return (
      <p role="alert">
        {error}{" "}
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
        >
          Retry preview connection
        </button>
      </p>
    );
  return (
    <BuilderPreview
      previewUrl={url}
      blocks={[]}
      form={{
        ...value,
        name: value.name || "Untitled form",
        slug: value.slug || "draft-form",
      }}
      label="form"
    />
  );
}
export default function FormManager({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const toast = (item: {
    title: string;
    description?: string;
    variant?: string;
  }) => setNotice([item.title, item.description].filter(Boolean).join(": "));
  const [showPreview, setShowPreview] = useState(false);
  const [isReloading, setReloading] = useState(false);
  const reloadGate = useRef(false);
  const reloadAbort = useRef<AbortController | null>(null);
  useEffect(() => () => reloadAbort.current?.abort(), []);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [includeInactiveEntries, setIncludeInactiveEntries] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const queryClient = {
    invalidateQueries: (_: unknown) => setRefresh((n) => n + 1),
  };
  const [activeTab, setActiveTab] = useState<"builder" | "entries">("builder");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedEntriesFormId, setSelectedEntriesFormId] = useState<
    string | null
  >(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableForm | null>(null);
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState("");
  const saveFeedbackRef = useRef({
    markSaved: () => {},
    markError: () => {},
    clearFeedback: () => {},
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldType, setDraggingFieldType] =
    useState<CmsFormFieldType | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [formSettingsOpen, setFormSettingsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<
    Record<"standard" | "advanced", boolean>
  >({
    standard: true,
    advanced: true,
  });

  const {
    data: forms = [],
    isLoading,
    error: formsError,
  } = useQuery<CmsForm[]>({
    queryKey: ["forms", refresh],
    queryFn: () => loadForms(),
  });

  const activeForms = useMemo(
    () =>
      includeInactiveEntries ? forms : forms.filter((form) => form.isActive),
    [forms, includeInactiveEntries],
  );

  const {
    data: submissions = [],
    isLoading: isSubmissionsLoading,
    error: entriesError,
  } = useQuery<CmsFormSubmission[]>({
    queryKey: ["submissions", selectedEntriesFormId, refresh],
    enabled: Boolean(selectedEntriesFormId),
    queryFn: () => loadSubmissions(selectedEntriesFormId!),
  });

  useEffect(() => {
    if (draft) return;
    if (!selectedFormId && forms.length > 0) {
      const first = forms.find((form) => !formEditProblem(form));
      if (!first) return;
      const normalized = normalizeEditableForm(first);
      setSelectedFormId(first.id);
      setFormSettingsOpen(true);
      setDraft(normalized);
      setSavedDraftSnapshot(serializeEditableForm(normalized));
      return;
    }

    if (selectedFormId) {
      const match = forms.find((form) => form.id === selectedFormId);
      if (match && !formEditProblem(match)) {
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

    if (
      selectedEntriesFormId &&
      !activeForms.some((form) => form.id === selectedEntriesFormId)
    ) {
      setSelectedEntriesFormId(activeForms[0]?.id ?? null);
      setSelectedEntryId(null);
    }
  }, [activeForms, selectedEntriesFormId]);

  useEffect(() => {
    setSelectedEntryId(null);
  }, [selectedEntriesFormId]);

  useEffect(() => {
    if (
      selectedEntryId &&
      !submissions.some((submission) => submission.id === selectedEntryId)
    ) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, submissions]);

  const saveMutation = useMutation({
    mutationFn: async (form: EditableForm) => {
      const fieldError = validateFormFields(form.fields);
      if (fieldError) throw Error(fieldError);
      if (
        form.isActive &&
        !window.confirm(
          "Save this active form? Changes will affect new submissions wherever the form is used.",
        )
      )
        return null;
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
        return await saveForm(null, payload);
      }

      await editorLock.verify();
      return await saveForm(form.id, {
        ...payload,
        expectedUpdatedAt: form.expectedUpdatedAt,
      });
    },
    onSuccess: (saved) => {
      if (!saved) return;
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
  const isDirty =
    !!draft && serializeEditableForm(draft) !== savedDraftSnapshot;
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
      if (!window.confirm("Delete this form and its saved submissions?"))
        return false;
      await editorLock.verify();
      await deleteMarketingForm(id);
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
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
    mutationFn: async ({
      formId,
      submissionId,
    }: {
      formId: string;
      submissionId: string;
    }) => {
      if (!window.confirm("Delete this saved submission?")) return false;
      await deleteMarketingFormSubmission(formId, submissionId);
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      queryClient.invalidateQueries({
        queryKey: ["submissions", selectedEntriesFormId, refresh],
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

  const selectedFieldLibraryItem = selectedField
    ? getFieldLibraryItem(selectedField.type)
    : null;
  const selectedSubmission = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedEntryId) ??
      null,
    [selectedEntryId, submissions],
  );

  const publicFormLink =
    typeof window !== "undefined" && draft?.slug
      ? `${PUBLIC_SITE_ORIGIN}/forms/${draft.slug}`
      : "";

  const editorLock = useFormReservation(
    activeTab === "builder" && draft && !draft.id.startsWith("draft-")
      ? draft.id
      : null,
  );
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

  const updateFieldConfig = (
    fieldId: string,
    updates: Partial<CmsFormFieldConfig>,
  ) => {
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
              config: createDefaultConfig(type),
              width: isFullWidthField(type) ? "full" : "half",
              required:
                !isStructuralField(type) && type !== "hidden"
                  ? field.required
                  : false,
            })
          : field,
      ),
    }));
  };

  const addField = (type: CmsFormFieldType, index?: number) => {
    updateDraft((current) => {
      const field = createField(type);
      const insertAt =
        typeof index === "number" ? index : current.fields.length;
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
              options: (field.options ?? []).filter(
                (option) => option.value !== optionId,
              ),
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
      const currentIndex = draft.fields.findIndex(
        (field) => field.id === draggingFieldId,
      );
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
    if (isSaving || isReloading) return;
    unsavedChangesGuard.confirmDiscardChanges(() => {
      const blank = { ...createBlankForm(), isActive: false };
      switchToDraft(blank);
    });
  };

  const handleSelectForm = (form: CmsForm) => {
    if (isSaving || isReloading) return;
    if (selectedFormId === form.id) return;
    const problem = formEditProblem(form);
    if (problem) {
      toast({
        title: `Unable to edit ${form.name}`,
        description: `${problem}. Saved data and entries are unchanged.`,
      });
      return;
    }
    unsavedChangesGuard.confirmDiscardChanges(() => {
      switchToDraft(normalizeEditableForm(form));
    });
  };

  const handleTabChange = (value: string) => {
    if (isSaving || isReloading) return;
    const nextTab = value === "entries" ? "entries" : "builder";
    if (nextTab === activeTab) return;

    if (nextTab === "entries") {
      unsavedChangesGuard.confirmDiscardChanges(() => setActiveTab("entries"));
      return;
    }

    setActiveTab("builder");
  };

  return (
    <FormsMediaProvider canUseMedia={canUseMedia}>
      <div className="native-forms">
        {notice && <p role="status">{notice}</p>}
        {(formsError || entriesError) && (
          <p role="alert">
            {(formsError || entriesError)?.message}{" "}
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              Retry loading forms
            </button>
          </p>
        )}
        <div className="forms-native-tools">
          <button type="button" onClick={() => setShowPreview((v) => !v)}>
            Toggle public preview
          </button>
          {activeTab === "entries" && (
            <button
              type="button"
              aria-pressed={includeInactiveEntries}
              onClick={() => setIncludeInactiveEntries((v) => !v)}
            >
              {includeInactiveEntries
                ? "Show active forms only"
                : "Include inactive forms"}
            </button>
          )}
          {activeTab === "entries" && (
            <button
              type="button"
              disabled={
                isSubmissionsLoading || !!entriesError || !submissions.length
              }
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(submissions, null, 2)], {
                    type: "application/json",
                  }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${activeForms.find((form) => form.id === selectedEntriesFormId)?.slug.replace(/[^a-zA-Z0-9_-]/g, "_") || "form"}-submissions.json`;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Export JSON
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || isReloading}
            onClick={async () => {
              if (reloadGate.current) return;
              if (!draft || draft.id.startsWith("draft-")) return;
              if (
                isDirty &&
                !window.confirm(
                  "Discard this draft and reload the latest saved form?",
                )
              )
                return;
              reloadGate.current = true;
              setReloading(true);
              try {
                const controller = new AbortController();
                reloadAbort.current = controller;
                const fresh = await getMarketingForm(draft.id, {
                  signal: controller.signal,
                });
                if (controller.signal.aborted) return;
                const loaded = toForm(fresh);
                const problem = formEditProblem(loaded);
                if (problem) throw Error(problem);
                const normalized = normalizeEditableForm(loaded);
                setDraft(normalized);
                setSavedDraftSnapshot(serializeEditableForm(normalized));
                setRefresh((n) => n + 1);
              } catch (e) {
                toast({ title: message(e) });
              } finally {
                reloadGate.current = false;
                setReloading(false);
              }
            }}
          >
            Reload saved form
          </button>
        </div>
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
            saveMutation: {
              ...saveMutation,
              isPending: saveMutation.isPending || isReloading,
            },
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
          components={formPrimitives}
          deliveryMonitor={
            <section className="forms-delivery-panel">
              {showDeliveries ? (
                <FormDeliveryQueue close={() => setShowDeliveries(false)} />
              ) : (
                <button type="button" onClick={() => setShowDeliveries(true)}>
                  Lead delivery monitoring
                </button>
              )}
            </section>
          }
          preview={showPreview && draft ? <FormPreview value={draft} /> : null}
        />
      </div>
    </FormsMediaProvider>
  );
}
