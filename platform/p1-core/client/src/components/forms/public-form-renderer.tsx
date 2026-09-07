import { STALE_TIMES } from "@/lib/queryClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CmsForm, CmsFormField, CmsFormListColumn } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html";

interface PublicFormRendererProps {
  slug: string;
  formOverride?: CmsForm;
  submitUrl?: string;
  buildSubmitBody?: (values: FormValues) => unknown;
  className?: string;
  showHeader?: boolean;
  descriptionOverride?: string;
  buttonTextOverride?: string;
  compact?: boolean;
  onSubmitSuccess?: () => void;
}

type FormValues = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function plainText(value: unknown) {
  return stripHtml(text(value));
}

function objectValue(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function buildInitialValues(fields: CmsFormField[]) {
  return Object.fromEntries(
    fields.map((field) => {
      switch (field.type) {
        case "checkbox":
        case "multiselect":
          return [field.key, []];
        case "consent":
          return [field.key, false];
        case "name":
          return [
            field.key,
            field.config?.nameFormat === "split"
              ? { firstName: "", lastName: "" }
              : { fullName: "" },
          ];
        case "address":
          return [
            field.key,
            { street: "", street2: "", city: "", state: "", postalCode: "", country: "" },
          ];
        case "list":
          return [field.key, []];
        case "hidden":
          return [field.key, field.config?.defaultValue ?? ""];
        default:
          return [field.key, ""];
      }
    }),
  ) as FormValues;
}

function supportsChoices(type: CmsFormField["type"]) {
  return ["select", "multiselect", "checkbox", "radio", "image-choice"].includes(type);
}

function isStructuralField(type: CmsFormField["type"]) {
  return ["html", "section", "page"].includes(type);
}

function fieldSpanClass(field: CmsFormField, compact: boolean) {
  if (
    compact ||
    field.width !== "half" ||
    ["textarea", "address", "consent", "list", "html", "section", "page", "image-choice"].includes(
      field.type,
    )
  ) {
    return "md:col-span-2";
  }
  return "md:col-span-1";
}

function splitPages(fields: CmsFormField[]) {
  const pages: Array<{ meta: CmsFormField | null; fields: CmsFormField[] }> = [];
  let current = { meta: null as CmsFormField | null, fields: [] as CmsFormField[] };

  for (const field of fields) {
    if (field.type === "page") {
      if (current.meta || current.fields.length) {
        pages.push(current);
      }
      current = { meta: field, fields: [] };
      continue;
    }
    current.fields.push(field);
  }

  if (current.meta || current.fields.length) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [{ meta: null, fields }];
}

function currentPageFields(page: { meta: CmsFormField | null; fields: CmsFormField[] }) {
  return page.fields;
}

function validatePageFields(fields: CmsFormField[], values: FormValues) {
  for (const field of fields) {
    if (isStructuralField(field.type) || field.type === "hidden") continue;
    if (!field.required) continue;

    const value = values[field.key];

    if (field.type === "checkbox" || field.type === "multiselect") {
      if (arrayValue(value).length === 0) return `${field.label} is required`;
      continue;
    }

    if (field.type === "consent") {
      if (value !== true) return `${field.label} is required`;
      continue;
    }

    if (field.type === "name") {
      const record = objectValue(value);
      if (field.config?.nameFormat === "split") {
        if (!text(record.firstName) && !text(record.lastName)) return `${field.label} is required`;
      } else if (!text(record.fullName)) {
        return `${field.label} is required`;
      }
      continue;
    }

    if (field.type === "address") {
      const record = objectValue(value);
      if (
        !text(record.street) &&
        !text(record.city) &&
        !text(record.state) &&
        !text(record.postalCode) &&
        !text(record.country)
      ) {
        return `${field.label} is required`;
      }
      continue;
    }

    if (field.type === "list") {
      if (arrayValue(value).length === 0) return `${field.label} is required`;
      continue;
    }

    if (field.type === "image-choice" && field.config?.selectionMode === "multiple") {
      if (arrayValue(value).length === 0) return `${field.label} is required`;
      continue;
    }

    if (!text(value)) {
      return `${field.label} is required`;
    }
  }

  return null;
}

function ChoiceGroup({
  field,
  value,
  onChange,
}: {
  field: CmsFormField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const choiceLayout =
    field.config?.choiceLayout === "grid"
      ? "grid gap-3 sm:grid-cols-2"
      : field.config?.choiceLayout === "inline"
        ? "flex flex-wrap gap-4"
        : "space-y-3";
  const multiple =
    field.type === "checkbox" ||
    field.type === "multiselect" ||
    (field.type === "image-choice" && field.config?.selectionMode === "multiple");
  const selectedValues = multiple ? arrayValue(value).map((item) => text(item)) : [];
  const selectedValue = multiple ? "" : text(value);

  return (
    <div className={choiceLayout}>
      {(field.options ?? []).map((option) => {
        const checked = multiple
          ? selectedValues.includes(option.value)
          : selectedValue === option.value;
        const toggle = (nextChecked: boolean) => {
          if (multiple) {
            const nextValues = nextChecked
              ? [...selectedValues, option.value]
              : selectedValues.filter((item) => item !== option.value);
            onChange(Array.from(new Set(nextValues)));
          } else {
            onChange(nextChecked ? option.value : "");
          }
        };

        if (field.type === "image-choice") {
          return (
            <div
              key={option.value}
              onClick={() => toggle(!checked)}
              className={cn(
                "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                checked ? "border-primary ring-2 ring-primary/10" : "hover:border-primary/50",
              )}
            >
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt={plainText(option.label)}
                  className="mb-3 h-32 w-full rounded-lg object-cover"
                />
              ) : null}
              <div className="flex items-center gap-3">
                <Checkbox checked={checked} className="pointer-events-none" />
                <span className="text-sm font-medium">{plainText(option.label)}</span>
              </div>
            </div>
          );
        }

        if (multiple) {
          return (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-lg border px-3 py-2"
            >
              <Checkbox checked={checked} onCheckedChange={(next) => toggle(Boolean(next))} />
              <span className="text-sm">{plainText(option.label)}</span>
            </label>
          );
        }

        return (
          <label key={option.value} className="flex items-start gap-3 rounded-lg border px-3 py-2">
            <input
              type="radio"
              checked={checked}
              onChange={() => onChange(option.value)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">{plainText(option.label)}</span>
          </label>
        );
      })}
    </div>
  );
}

function ListField({
  field,
  value,
  onChange,
}: {
  field: CmsFormField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const columns =
    Array.isArray(field.config?.listColumns) && field.config.listColumns.length > 0
      ? field.config.listColumns
      : [{ id: "item", label: "Item", placeholder: "" } satisfies CmsFormListColumn];
  const rows = arrayValue(value).map((row) => objectValue(row));
  const maxRows = typeof field.config?.maxRows === "number" ? field.config.maxRows : 10;

  const updateRow = (index: number, columnId: string, nextValue: string) => {
    const nextRows = [...rows];
    const row = objectValue(nextRows[index]);
    nextRows[index] = { ...row, [columnId]: nextValue };
    onChange(nextRows);
  };

  const addRow = () => {
    if (rows.length >= maxRows) return;
    const nextRow = Object.fromEntries(columns.map((column) => [column.id, ""]));
    onChange([...rows, nextRow]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border bg-muted/10 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            {columns.map((column) => (
              <div key={column.id} className="space-y-1.5">
                <Label>{plainText(column.label)}</Label>
                <Input
                  value={text(row[column.id])}
                  onChange={(event) => updateRow(index, column.id, event.target.value)}
                  placeholder={column.placeholder}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 text-destructive"
            onClick={() => removeRow(index)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove Row
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= maxRows}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  );
}

function renderFieldInput(
  field: CmsFormField,
  value: unknown,
  setValue: (next: unknown) => void,
  compact: boolean,
) {
  if (field.type === "html") {
    return (
      <div
        className="rounded-xl border bg-muted/20 p-4 text-sm"
        dangerouslySetInnerHTML={{ __html: text(field.config?.htmlContent) }}
      />
    );
  }

  if (field.type === "section") {
    return (
      <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
        {text(field.config?.sectionTitle) ? (
          <h4 className="text-lg font-semibold">{plainText(field.config?.sectionTitle)}</h4>
        ) : null}
        {text(field.config?.sectionSubtitle) ? (
          <p className="text-sm text-muted-foreground">
            {plainText(field.config?.sectionSubtitle)}
          </p>
        ) : null}
        {field.config?.showDivider !== false ? (
          <div
            className="h-px w-full"
            style={{ backgroundColor: text(field.config?.dividerColor) || "#e2e8f0" }}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        value={text(value)}
        onChange={(event) => setValue(event.target.value)}
        placeholder={field.placeholder}
        rows={compact ? 3 : 5}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select value={text(value)} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              plainText(field.placeholder) || `Select ${plainText(field.label).toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {plainText(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "multiselect") {
    const current = arrayValue(value).map((item) => text(item));
    return (
      <select
        multiple
        value={current}
        onChange={(event) =>
          setValue(Array.from(event.target.selectedOptions).map((option) => option.value))
        }
        className="flex min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {plainText(option.label)}
          </option>
        ))}
      </select>
    );
  }

  if (supportsChoices(field.type)) {
    return <ChoiceGroup field={field} value={value} onChange={setValue} />;
  }

  if (field.type === "consent") {
    return (
      <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
        <label className="flex items-start gap-3">
          <Checkbox checked={value === true} onCheckedChange={(next) => setValue(Boolean(next))} />
          <span className="text-sm font-medium">
            {plainText(field.config?.consentCheckboxLabel) || plainText(field.label)}
          </span>
        </label>
        {text(field.config?.consentDescription) ? (
          <p className="text-sm text-muted-foreground">
            {plainText(field.config?.consentDescription)}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "name") {
    const record = objectValue(value);
    if (field.config?.nameFormat === "split") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={text(record.firstName)}
            onChange={(event) => setValue({ ...record, firstName: event.target.value })}
            placeholder="First name"
          />
          <Input
            value={text(record.lastName)}
            onChange={(event) => setValue({ ...record, lastName: event.target.value })}
            placeholder="Last name"
          />
        </div>
      );
    }

    return (
      <Input
        value={text(record.fullName)}
        onChange={(event) => setValue({ fullName: event.target.value })}
        placeholder={field.placeholder || "Full name"}
      />
    );
  }

  if (field.type === "address") {
    const record = objectValue(value);
    const compactLayout = field.config?.addressLayout === "compact";
    return (
      <div className={cn("grid gap-4", compactLayout ? "md:grid-cols-2" : "grid-cols-1")}>
        <Input
          value={text(record.street)}
          onChange={(event) => setValue({ ...record, street: event.target.value })}
          placeholder="Street address"
        />
        {field.config?.showStreet2 ? (
          <Input
            value={text(record.street2)}
            onChange={(event) => setValue({ ...record, street2: event.target.value })}
            placeholder="Address line 2"
          />
        ) : null}
        <Input
          value={text(record.city)}
          onChange={(event) => setValue({ ...record, city: event.target.value })}
          placeholder="City"
        />
        <Input
          value={text(record.state)}
          onChange={(event) => setValue({ ...record, state: event.target.value })}
          placeholder="State / Province"
        />
        <Input
          value={text(record.postalCode)}
          onChange={(event) => setValue({ ...record, postalCode: event.target.value })}
          placeholder="Postal code"
        />
        {field.config?.showCountry !== false ? (
          <Input
            value={text(record.country)}
            onChange={(event) => setValue({ ...record, country: event.target.value })}
            placeholder="Country"
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "list") {
    return <ListField field={field} value={value} onChange={setValue} />;
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "tel"
        ? "tel"
        : field.type === "website"
          ? "url"
          : field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : field.type === "time"
                ? "time"
                : "text";

  return (
    <Input
      type={inputType}
      value={text(value)}
      onChange={(event) => setValue(event.target.value)}
      placeholder={field.placeholder}
      autoPrependHttps={field.type === "website"}
    />
  );
}

export function PublicFormRenderer({
  slug,
  formOverride,
  submitUrl,
  buildSubmitBody,
  className,
  showHeader = true,
  descriptionOverride,
  buttonTextOverride,
  compact = false,
  onSubmitSuccess,
}: PublicFormRendererProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<FormValues>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const submissionKeyRef = useRef<string | null>(null);

  const { data: form, isLoading } = useQuery<CmsForm>({
    queryKey: ["/api/forms", slug],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${slug}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Form not found");
      }
      return response.json();
    },
    staleTime: STALE_TIMES.LIVE,
    enabled: !formOverride,
  });
  const effectiveForm = formOverride ?? form;

  const fields = useMemo(
    () => (Array.isArray(effectiveForm?.fields) ? effectiveForm.fields : []),
    [effectiveForm?.fields],
  );
  const pages = useMemo(() => splitPages(fields), [fields]);
  const activePage = pages[currentPageIndex] ?? pages[0] ?? { meta: null, fields: fields };
  const visibleFields = currentPageFields(activePage);

  useEffect(() => {
    setValues(buildInitialValues(fields));
    setCurrentPageIndex(0);
    submissionKeyRef.current = null;
  }, [fields, slug]);

  const description =
    plainText(descriptionOverride) ||
    (typeof effectiveForm?.description === "string" && effectiveForm.description.trim()
      ? plainText(effectiveForm.description)
      : "");
  const submitLabel =
    buttonTextOverride ??
    (typeof effectiveForm?.settings === "object" &&
    effectiveForm?.settings &&
    typeof effectiveForm.settings.submitButtonText === "string" &&
    effectiveForm.settings.submitButtonText.trim()
      ? effectiveForm.settings.submitButtonText.trim()
      : "Submit");

  const mutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = submissionKeyRef.current ?? crypto.randomUUID();
      submissionKeyRef.current = idempotencyKey;
      const response = await fetch(submitUrl ?? `/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        credentials: "include",
        body: JSON.stringify(buildSubmitBody ? buildSubmitBody(values) : values),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to submit form.");
      }

      return payload;
    },
    onSuccess: (payload) => {
      toast({
        title: "Form submitted",
        description: payload.message || "Thanks! Your submission has been received.",
      });
      setValues(buildInitialValues(fields));
      setCurrentPageIndex(0);
      submissionKeyRef.current = null;
      onSubmitSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading && !formOverride) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!effectiveForm) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        This form is unavailable right now.
      </div>
    );
  }

  const isLastPage = currentPageIndex >= pages.length - 1;
  const pageTitle = text(activePage.meta?.config?.pageTitle);
  const pageDescription = text(activePage.meta?.config?.pageDescription);
  const nextButtonText = text(activePage.meta?.config?.nextButtonText) || "Next";
  const previousButtonText = text(activePage.meta?.config?.previousButtonText) || "Previous";

  return (
    <div className={cn("space-y-4", className)} data-testid={`public-form-${slug}`}>
      {showHeader && (
        <div className="space-y-1">
          <h3 className="font-semibold public-heading-3">{plainText(effectiveForm.name)}</h3>
          {description ? <p className="text-sm public-supporting-copy">{description}</p> : null}
        </div>
      )}
      {!showHeader && description ? (
        <p className="text-sm public-supporting-copy">{description}</p>
      ) : null}

      {pages.length > 1 ? (
        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              Step {currentPageIndex + 1} of {pages.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(((currentPageIndex + 1) / pages.length) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${((currentPageIndex + 1) / pages.length) * 100}%` }}
            />
          </div>
          {pageTitle ? <h4 className="text-base font-semibold">{pageTitle}</h4> : null}
          {pageDescription ? (
            <p className="text-sm text-muted-foreground">{pageDescription}</p>
          ) : null}
        </div>
      ) : null}

      <form
        className={cn("space-y-4", compact ? "space-y-3" : "space-y-4")}
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
          {visibleFields.map((field) => {
            if (field.type === "hidden") return null;
            const structural = isStructuralField(field.type);
            return (
              <div key={field.id} className={cn("space-y-1.5", fieldSpanClass(field, compact))}>
                {!["html", "section"].includes(field.type) ? (
                  <Label htmlFor={`${slug}-${field.key}`}>{plainText(field.label)}</Label>
                ) : null}
                {renderFieldInput(
                  field,
                  values[field.key],
                  (next) => setValues((current) => ({ ...current, [field.key]: next })),
                  compact,
                )}
                {!structural && field.helpText ? (
                  <p className="text-xs public-helper-text">{plainText(field.helpText)}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pages.length > 1 && currentPageIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentPageIndex((current) => Math.max(0, current - 1))}
            >
              {previousButtonText}
            </Button>
          ) : null}

          {!isLastPage ? (
            <Button
              type="button"
              onClick={() => {
                const error = validatePageFields(visibleFields, values);
                if (error) {
                  toast({
                    title: "Complete this step",
                    description: error,
                    variant: "destructive",
                  });
                  return;
                }
                setCurrentPageIndex((current) => Math.min(pages.length - 1, current + 1));
              }}
            >
              {nextButtonText}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={compact ? "w-full" : undefined}
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
