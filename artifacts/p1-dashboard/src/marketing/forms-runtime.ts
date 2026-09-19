import { useEffect, useRef, useState } from "react";
import {
  listMarketingForms,
  listMarketingFormSubmissions,
  createMarketingForm,
  updateMarketingForm,
} from "@workspace/api-client-react/dashboard";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import type {
  MarketingForm,
  MarketingFormInput,
  WebsiteEditorReservation,
} from "../../../../lib/api-client-react/src/dashboard/models";
import type {
  CmsForm,
  CmsFormField,
  CmsFormSubmission,
} from "../../../../platform/p1-core/shared/schema/forms";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import { FIELD_LIBRARY } from "../../../../platform/p1-core/client/src/components/shared/forms-workspace";
import { validateFormFields } from "./FormFieldsEditor";
export function toForm(form: MarketingForm): CmsForm {
  return {
    ...form,
    description: form.description ?? null,
    fields: form.fields as CmsFormField[],
    settings: {
      submitButtonText: "Submit",
      successMessage: "Thanks!",
      mailchimpEnabled: false,
      mailchimpTag: "",
      notifyAdmins: false,
      storeAsContactMessage: false,
      createCrmLead: false,
      ...form.settings,
    },
    createdAt: form.createdAt ? new Date(form.createdAt) : null,
    updatedAt: form.updatedAt ? new Date(form.updatedAt) : null,
  };
}
export function formEditProblem(form: CmsForm): string | null {
  if (!Array.isArray(form.fields)) return "Saved field data is not editable";
  if (form.fields.some((field) => !field || typeof field !== "object"))
    return "Saved field data is not editable";
  const basic = validateFormFields(form.fields);
  if (basic) return basic;
  if (
    form.fields.some(
      (field) => !FIELD_LIBRARY.some((item) => item.type === field.type),
    )
  )
    return "This form contains an unsupported field type";
  if (
    form.fields.some(
      (field) =>
        field.options !== undefined &&
        (!Array.isArray(field.options) ||
          field.options.some(
            (option) => !option || typeof option !== "object",
          )),
    )
  )
    return "Saved choices are not editable";
  return null;
}
export async function loadForms() {
  return (await listMarketingForms()).map(toForm);
}
export async function loadSubmissions(
  id: string,
): Promise<CmsFormSubmission[]> {
  return (await listMarketingFormSubmissions(id)).map((row) => ({
    ...row,
    source: row.source ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
  }));
}
export async function saveForm(id: string | null, input: MarketingFormInput) {
  return toForm(
    id
      ? await updateMarketingForm(id, {
          ...input,
          expectedUpdatedAt: input.expectedUpdatedAt ?? null,
        })
      : await createMarketingForm(input),
  );
}
export function useFormsQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const [data, setData] = useState<T | undefined>(),
    [isLoading, setLoading] = useState(enabled),
    [error, setError] = useState<Error | null>(null);
  const fn = useRef(queryFn);
  fn.current = queryFn;
  const key = JSON.stringify(queryKey);
  const resource = JSON.stringify(queryKey.slice(0, -1));
  const priorResource = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!enabled || priorResource.current !== resource) setData(undefined);
    priorResource.current = resource;
    setError(null);
    setLoading(enabled);
    if (enabled)
      void fn
        .current()
        .then(
          (value) => {
            if (alive) setData(value);
          },
          (e) => {
            if (alive) setError(e as Error);
          },
        )
        .finally(() => {
          if (alive) setLoading(false);
        });
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  return { data, isLoading, error };
}
export function useFormsMutation<T, V>({
  mutationFn,
  onSuccess,
  onError,
}: {
  mutationFn: (value: V) => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (error: Error) => void;
}) {
  const [isPending, setPending] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const mutate = async (value: V) => {
    if (gate.current) return;
    gate.current = true;
    setPending(true);
    try {
      const result = await mutationFn(value);
      if (alive.current) onSuccess(result);
    } catch (e) {
      if (alive.current) onError(e as Error);
    } finally {
      gate.current = false;
      if (alive.current) setPending(false);
    }
  };
  return { mutate, isPending };
}
export function useEditorSaveState({
  isDirty,
  isSaving,
}: {
  isDirty: boolean;
  isSaving: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  return {
    state: isSaving ? "saving" : isDirty ? "unsaved" : feedback,
    markSaved: () => setFeedback("saved"),
    markError: () => setFeedback("error"),
    clearFeedback: () => setFeedback(""),
  };
}
export function useUnsavedChangesGuard({
  isDirty,
  message,
}: {
  isDirty: boolean;
  message: string;
}) {
  useCmsUnsavedChanges(isDirty, message);
  return {
    confirmDiscardChanges: (action: () => void) => {
      if (!isDirty || window.confirm(message)) action();
    },
    dialog: null,
  };
}
export function useFormReservation(id: string | null) {
  const [reservation, setReservation] =
      useState<WebsiteEditorReservation | null>(null),
    [error, setError] = useState("");
  const abort = useRef(new AbortController());
  async function action(
    kind: "acquire" | "heartbeat",
    signal = abort.current.signal,
  ) {
    if (!id) return;
    const next = await customFetch<WebsiteEditorReservation>(
      `/api/v1/marketing/cms/editor-locks/form/${encodeURIComponent(id)}/${kind}`,
      { method: "POST", signal },
    );
    if (signal.aborted) throw Error("Editor closed");
    setReservation(next);
    setError("");
    return next;
  }
  async function acquire() {
    const signal = abort.current.signal;
    try {
      await action("acquire", signal);
    } catch (e) {
      if (!signal.aborted && signal === abort.current.signal) {
        setReservation(null);
        setError((e as Error).message);
      }
    }
  }
  async function verify() {
    if (!id) return;
    const next = await action("heartbeat");
    if (!next?.ownedByCurrentUser)
      throw Error("Another editor holds this form. Your draft is retained.");
  }
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    setReservation(null);
    setError("");
    if (!id) return () => controller.abort();
    void acquire();
    const timer = setInterval(
      () =>
        void verify().catch((e) => {
          if (!controller.signal.aborted) {
            setReservation(null);
            setError(e.message);
          }
        }),
      30000,
    );
    return () => {
      controller.abort();
      clearInterval(timer);
      void customFetch(
        `/api/v1/marketing/cms/editor-locks/form/${encodeURIComponent(id)}/release`,
        { method: "POST", keepalive: true },
      ).catch(() => {});
    };
  }, [id]);
  const isReadOnly = Boolean(id && !reservation?.ownedByCurrentUser);
  return {
    verify,
    acquire,
    hasLocking: Boolean(id),
    isReadOnly,
    isLoading: Boolean(id && !reservation && !error),
    summary: isReadOnly
      ? {
          variant: "warning",
          title: error ? "Reservation unavailable" : "Form reservation",
          description:
            error ||
            (reservation?.lock?.lockedByName &&
              `Held by ${reservation.lock.lockedByName}`) ||
            "Checking edit access…",
        }
      : null,
  };
}
