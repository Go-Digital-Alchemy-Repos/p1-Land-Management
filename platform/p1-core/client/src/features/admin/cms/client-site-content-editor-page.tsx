import { useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClientSitePreviewFrame } from "./builder/client-site-preview-frame";
import type { ClientSiteEditableComponent } from "@shared/client-site-content-contract";
import type { ClientSiteContentRevision } from "@shared/schema";

interface EditorPayload {
  stackId: string;
  route: { id: string; path: string };
  component: ClientSiteEditableComponent;
  previewUrl: string;
  draftContent: Record<string, unknown>;
  draftRevision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
}

function getPath(source: Record<string, unknown>, path: string): string {
  let value: unknown = source;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : "";
}

function setPath(
  source: Record<string, unknown>,
  path: string,
  value: string,
): Record<string, unknown> {
  const clone = structuredClone(source);
  const segments = path.split(".");
  let cursor = clone;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) cursor[segment] = value;
    else {
      const child = cursor[segment];
      cursor[segment] = child && typeof child === "object" && !Array.isArray(child) ? child : {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
  });
  return clone;
}

export default function ClientSiteContentEditorPage(): JSX.Element {
  const [, params] = useRoute("/admin/cms/website/:routeId/:componentKey");
  const routeId = params?.routeId ?? "home";
  const componentKey = params?.componentKey ?? "home-content";
  const endpoint = `/api/admin/client-site-content/${routeId}/${componentKey}`;
  const { toast } = useToast();
  const [content, setContent] = useState<Record<string, unknown>>({});
  const { data, isLoading, error } = useQuery<EditorPayload>({ queryKey: [endpoint] });
  const { data: revisions = [] } = useQuery<ClientSiteContentRevision[]>({
    queryKey: [`${endpoint}/revisions`],
    enabled: Boolean(data),
  });

  useEffect(() => {
    if (data) setContent(data.draftContent);
  }, [data]);
  const isDirty = Boolean(data && JSON.stringify(content) !== JSON.stringify(data.draftContent));
  const unsavedChanges = useUnsavedChangesGuard({ isDirty });

  const previewMessage = useMemo(
    () =>
      data
        ? {
            type: "core-platform:client-site-preview" as const,
            protocolVersion: "1.0" as const,
            clientStackId: data.stackId,
            routeId,
            componentKey,
            revision: data.draftRevision,
            content,
          }
        : null,
    [content, data],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [endpoint] }),
      queryClient.invalidateQueries({ queryKey: [`${endpoint}/revisions`] }),
    ]);
  };
  const save = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `${endpoint}/draft`, { content, expectedRevision: data!.draftRevision }),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Draft saved" });
    },
    onError: (cause: Error) =>
      toast({
        title: "Draft could not be saved",
        description: cause.message,
        variant: "destructive",
      }),
  });
  const publish = useMutation({
    mutationFn: () =>
      apiRequest("POST", `${endpoint}/publish`, { expectedRevision: data!.draftRevision }),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Content published" });
    },
    onError: (cause: Error) =>
      toast({
        title: "Content could not be published",
        description: cause.message,
        variant: "destructive",
      }),
  });
  const restore = useMutation({
    mutationFn: (revision: number) =>
      apiRequest("POST", `${endpoint}/revisions/${revision}/restore`, {
        expectedRevision: data!.draftRevision,
      }),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Revision restored as a new draft" });
    },
    onError: (cause: Error) =>
      toast({
        title: "Revision could not be restored",
        description: cause.message,
        variant: "destructive",
      }),
  });

  return (
    <AdminSidebar>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold">P1 website editor</h1>
            <p className="mt-1 text-muted-foreground">
              Edit bounded content while site behavior stays locked.
            </p>
          </div>
          {data ? (
            <div className="text-sm text-muted-foreground">
              Draft r{data.draftRevision} · Published{" "}
              {data.publishedRevision ? `r${data.publishedRevision}` : "never"}
            </div>
          ) : null}
        </div>
        {isLoading ? (
          <p>Loading editor…</p>
        ) : error ? (
          <p className="text-destructive">{(error as Error).message}</p>
        ) : data && previewMessage ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Editable content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.component.fields.map((field) => {
                    const value = getPath(content, field.path);
                    const id = `field-${field.path.replaceAll(".", "-")}`;
                    const common = {
                      id,
                      value,
                      maxLength: field.maxLength,
                      onChange: (
                        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                      ) => setContent(setPath(content, field.path, event.target.value)),
                    };
                    return (
                      <div className="space-y-2" key={field.path}>
                        <Label htmlFor={id}>{field.label}</Label>
                        {field.type === "textarea" ? (
                          <Textarea {...common} rows={4} />
                        ) : (
                          <Input {...common} />
                        )}
                        {field.maxLength ? (
                          <p className="text-xs text-muted-foreground">
                            {value.length}/{field.maxLength}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => save.mutate()}
                      disabled={save.isPending || publish.isPending}
                    >
                      Save draft
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => publish.mutate()}
                      disabled={
                        save.isPending ||
                        publish.isPending ||
                        isDirty ||
                        data.draftRevision === 0 ||
                        data.publishedRevision === data.draftRevision
                      }
                    >
                      Publish
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Revision history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved revisions yet.</p>
                  ) : (
                    revisions.map((revision) => (
                      <div
                        key={revision.id}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <span>
                          r{revision.revision} · {revision.kind}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            unsavedChanges.confirmDiscardChanges(() =>
                              restore.mutate(revision.revision),
                            )
                          }
                          disabled={restore.isPending}
                        >
                          Restore
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Live preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientSitePreviewFrame
                  src={data.previewUrl}
                  title="P1 website preview"
                  message={previewMessage}
                  className="h-[820px] w-full rounded border"
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
      {unsavedChanges.dialog}
    </AdminSidebar>
  );
}
