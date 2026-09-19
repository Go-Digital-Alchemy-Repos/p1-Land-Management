import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { CmsForm } from "@shared/schema";
import { STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FormPresentation,
  type PublicFormRendererProps,
} from "@/features/admin/cms/builder/form-presentation";
import { FormPresentationHostProvider } from "@/features/admin/cms/builder/form-presentation-host";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import * as select from "@/components/ui/select";
const ui = { Button, Input, Label, Textarea, Checkbox, ...select };
export function PublicFormRenderer(props: PublicFormRendererProps) {
  const { toast } = useToast();
  const query = useQuery<CmsForm>({
    queryKey: ["/api/forms", props.slug],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${props.slug}`, { credentials: "include" });
      if (!response.ok) throw new Error("Form not found");
      return response.json();
    },
    staleTime: STALE_TIMES.LIVE,
    enabled: !props.formOverride,
  });
  return (
    <FormPresentationHostProvider value={{ ui, toast }}>
      <FormPresentation
        {...props}
        form={query.data}
        isLoading={query.isLoading}
        submit={async (values, idempotencyKey) => {
          const response = await fetch(props.submitUrl ?? `/api/forms/${props.slug}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
            credentials: "include",
            body: JSON.stringify(props.buildSubmitBody ? props.buildSubmitBody(values) : values),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(payload.message || payload.error || "Failed to submit form.");
          return payload;
        }}
      />
    </FormPresentationHostProvider>
  );
}
