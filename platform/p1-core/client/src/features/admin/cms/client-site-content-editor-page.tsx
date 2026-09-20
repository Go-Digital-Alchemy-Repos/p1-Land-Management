import { useAuth } from "@/hooks/use-auth";
import { StructuredWebsiteEditorPresentation } from "@/components/shared/structured-website-editor-presentation";
import { useRoute } from "wouter";
import { useEffect, useMemo, useState, useRef } from "react";
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
  ownedBlog?: { postId: string; sourceSlug: string };
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
  const { hasAdminPermission } = useAuth();
  const ownership = useRef({ endpoint });
  if (ownership.current.endpoint !== endpoint) ownership.current = { endpoint };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const owns = (owner: { endpoint: string }) => mounted.current && ownership.current === owner;
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [reloading, setReloading] = useState(false);
  const {
    data: incomingData,
    isLoading,
    error,
  } = useQuery<EditorPayload>({ queryKey: [endpoint] });
  const [data, setData] = useState<EditorPayload | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const { data: revisions = [] } = useQuery<ClientSiteContentRevision[]>({
    queryKey: [`${endpoint}/revisions`],
    enabled: Boolean(data),
  });

  const initializedEndpoint = useRef(endpoint);
  useEffect(() => {
    const changedEndpoint = initializedEndpoint.current !== endpoint;
    if (changedEndpoint) {
      initializedEndpoint.current = endpoint;
      setReloading(false);
      setData(null);
      setContent({});
    }
    if (!incomingData) return;
    if (
      !changedEndpoint &&
      data &&
      JSON.stringify(contentRef.current) !== JSON.stringify(data.draftContent)
    ) {
      if (incomingData.ownedBlog) setData({ ...data, ownedBlog: incomingData.ownedBlog });
      return;
    }
    setData(incomingData);
    setContent(incomingData.draftContent);
  }, [incomingData, endpoint]);
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

  const refresh = async (owner = ownership.current) => {
    if (!owns(owner)) return false;
    // fetchQuery rejects failed reads; cached data alone is never a reload confirmation.
    const [latest] = await Promise.all([
      queryClient.fetchQuery<EditorPayload>({ queryKey: [owner.endpoint], staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: [`${owner.endpoint}/revisions`], staleTime: 0 }),
    ]);
    if (!owns(owner)) return false;
    setData(latest);
    setContent(latest.draftContent);
    return true;
  };
  const refreshAfterMutation = async (successTitle: string, owner: { endpoint: string }) => {
    try {
      if (await refresh(owner)) toast({ title: successTitle });
    } catch (cause) {
      if (!owns(owner)) return;
      toast({
        title: "Content changed, but the latest revision could not be reloaded",
        description: `${(cause as Error).message}. Local content is retained. Reload the latest revision before continuing.`,
        variant: "destructive",
      });
    }
  };
  const save = useMutation({
    onMutate: () => ({ owner: ownership.current }),
    mutationFn: () => {
      if (data?.ownedBlog)
        throw Error("This article is managed in Blog. Archived Website fields are read-only.");
      return apiRequest("PUT", `${endpoint}/draft`, {
        content,
        expectedRevision: data!.draftRevision,
      });
    },
    onSuccess: (_result, _variables, context) =>
      context && refreshAfterMutation("Draft saved", context.owner),
    onError: (cause: Error, _variables, context) =>
      context &&
      owns(context.owner) &&
      toast({
        title: "Draft could not be saved",
        description: cause.message,
        variant: "destructive",
      }),
  });
  const publish = useMutation({
    onMutate: () => ({ owner: ownership.current }),
    mutationFn: () => {
      if (data?.ownedBlog)
        throw Error("This article is managed in Blog. Archived Website fields are read-only.");
      return apiRequest("POST", `${endpoint}/publish`, { expectedRevision: data!.draftRevision });
    },
    onSuccess: (_result, _variables, context) =>
      context && refreshAfterMutation("Content published", context.owner),
    onError: (cause: Error, _variables, context) =>
      context &&
      owns(context.owner) &&
      toast({
        title: "Content could not be published",
        description: cause.message,
        variant: "destructive",
      }),
  });
  const restore = useMutation({
    onMutate: () => ({ owner: ownership.current }),
    mutationFn: (revision: number) => {
      if (data?.ownedBlog)
        throw Error("This article is managed in Blog. Archived Website fields are read-only.");
      return apiRequest("POST", `${endpoint}/revisions/${revision}/restore`, {
        expectedRevision: data!.draftRevision,
      });
    },
    onSuccess: (_result, _variables, context) =>
      context && refreshAfterMutation("Revision restored as a new draft", context.owner),
    onError: (cause: Error, _variables, context) =>
      context &&
      owns(context.owner) &&
      toast({
        title: "Revision could not be restored",
        description: cause.message,
        variant: "destructive",
      }),
  });

  return (
    <AdminSidebar>
      {isLoading ? (
        <p role="status">Loading editor…</p>
      ) : error && !data ? (
        <p role="alert">{(error as Error).message}</p>
      ) : data && previewMessage ? (
        <StructuredWebsiteEditorPresentation
          ui={{ Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea }}
          draftRevision={data.draftRevision}
          publishedRevision={data.publishedRevision}
          fields={data.component.fields}
          revisions={revisions}
          valueAt={(path) => getPath(content, path)}
          onChange={(path, value) => {
            if (!data.ownedBlog) setContent(setPath(content, path, value));
          }}
          dirty={isDirty}
          busy={
            !!data.ownedBlog ||
            save.isPending ||
            publish.isPending ||
            restore.isPending ||
            reloading
          }
          alerts={
            <>
              {error && <p role="alert">{(error as Error).message}. Local content is retained.</p>}
              {data.ownedBlog && (
                <p role="status">
                  This article is managed in Blog. These Website fields and revisions are archived
                  and no longer affect the article.{" "}
                  {hasAdminPermission("content") && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        unsavedChanges.confirmDiscardChanges(() =>
                          window.location.assign(
                            `/admin/cms/blog/${encodeURIComponent(data.ownedBlog!.postId)}`,
                          ),
                        )
                      }
                    >
                      Open Blog editor
                    </Button>
                  )}
                </p>
              )}
            </>
          }
          toolbar={
            <Button
              variant="outline"
              disabled={save.isPending || publish.isPending || restore.isPending || reloading}
              onClick={() =>
                unsavedChanges.confirmDiscardChanges(() => {
                  const owner = ownership.current;
                  setReloading(true);
                  void refresh(owner)
                    .catch(
                      (cause: Error) =>
                        owns(owner) &&
                        toast({
                          title: "Could not reload content",
                          description: cause.message,
                          variant: "destructive",
                        }),
                    )
                    .finally(() => {
                      if (owns(owner)) setReloading(false);
                    });
                })
              }
            >
              Reload latest revision
            </Button>
          }
          publishDisabled={
            isDirty || data.draftRevision === 0 || data.publishedRevision === data.draftRevision
          }
          onSave={() => {
            if (!save.isPending && !publish.isPending && !restore.isPending) save.mutate();
          }}
          onPublish={() => {
            if (!save.isPending && !publish.isPending && !restore.isPending && !isDirty)
              publish.mutate();
          }}
          onRestore={(revision) =>
            unsavedChanges.confirmDiscardChanges(() => restore.mutate(revision))
          }
          preview={
            <ClientSitePreviewFrame
              src={data.previewUrl}
              title="P1 website preview"
              message={previewMessage}
              className="h-[820px] w-full rounded border"
            />
          }
        />
      ) : null}

      {unsavedChanges.dialog}
    </AdminSidebar>
  );
}
