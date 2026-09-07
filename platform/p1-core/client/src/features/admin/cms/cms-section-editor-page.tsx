import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { AdminSaveBar } from "@/components/shared/admin-save-bar";
import { AdminMobileActionBar } from "@/components/shared/admin-mobile-action-bar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Layers } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CmsSection } from "@shared/schema";
import { PageBuilder } from "./builder/page-builder";
import type { BlockInstance, BuilderContent } from "./builder/block-registry";
import { cn } from "@/lib/utils";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

const EMPTY_CONTENT: BuilderContent = { blocks: [] };

const sectionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().default("general"),
});

type SectionForm = z.infer<typeof sectionFormSchema>;

const CATEGORIES = ["general", "hero", "cta", "testimonials", "faq", "features", "content", "team"];

export default function CmsSectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";

  const [builderContent, setBuilderContent] = useState<BuilderContent>(EMPTY_CONTENT);
  const [initialized, setInitialized] = useState(false);
  const [savedBuilderSnapshot, setSavedBuilderSnapshot] = useState(() =>
    JSON.stringify(EMPTY_CONTENT),
  );

  const { data: section, isLoading: sectionLoading } = useQuery<CmsSection>({
    queryKey: ["/api/admin/cms/sections", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cms/sections/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Section not found");
      return res.json();
    },
    enabled: !isNew,
  });

  const editorLock = useEditorLock({
    resourceType: "cms_section",
    resourceId: isNew ? null : (section?.id ?? id ?? null),
    enabled: !isNew,
  });

  const form = useForm<SectionForm>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { name: "", description: "", category: "general" },
  });

  useEffect(() => {
    if (section && !initialized) {
      form.reset({
        name: section.name,
        description: section.description ?? "",
        category: section.category ?? "general",
      });
      const blocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
      setBuilderContent({ blocks });
      setSavedBuilderSnapshot(JSON.stringify({ blocks }));
      setInitialized(true);
    }
  }, [section, initialized, form]);

  useLockConflictGuard({
    active: !isNew,
    resourceId: isNew ? null : (section?.id ?? id ?? null),
    resourceLabel: "saved section",
    editorLock,
    onConflict: () => navigate("/admin/cms/sections"),
  });

  const applySavedState = (data: SectionForm, content: BuilderContent) => {
    form.reset(data);
    setBuilderContent(content);
    setSavedBuilderSnapshot(JSON.stringify(content));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: SectionForm & { content: BuilderContent }) => {
      return apiRequest("POST", "/api/admin/cms/sections", {
        ...payload,
        blocks: payload.content.blocks,
      });
    },
    onSuccess: async (res, variables) => {
      const created: CmsSection = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Section created" });
      applySavedState(
        {
          name: variables.name,
          description: variables.description,
          category: variables.category,
        },
        variables.content,
      );
      saveState.markSaved();
      navigate(`/admin/cms/sections/${created.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create section", variant: "destructive" });
      saveState.markError();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: SectionForm & { content: BuilderContent }) => {
      return apiRequest("PUT", `/api/admin/cms/sections/${id}`, {
        ...payload,
        blocks: payload.content.blocks,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections", id] });
      toast({ title: "Section saved" });
      applySavedState(
        {
          name: variables.name,
          description: variables.description,
          category: variables.category,
        },
        variables.content,
      );
      saveState.markSaved();
    },
    onError: () => {
      toast({ title: "Failed to save section", variant: "destructive" });
      saveState.markError();
    },
  });

  const onSave = () => {
    form.handleSubmit((data) => {
      const payload = {
        ...data,
        content: builderContent,
      };
      if (isNew) {
        createMutation.mutate(payload);
      } else {
        updateMutation.mutate(payload);
      }
    })();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const builderDirty = JSON.stringify(builderContent) !== savedBuilderSnapshot;
  const isDirty = form.formState.isDirty || builderDirty;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved changes to this saved section. Leave without saving?",
  });

  if (!isNew && sectionLoading) {
    return (
      <AdminSidebar>
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="admin-has-mobile-action-bar p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {editorLock.summary ? (
          <EditorLockBanner
            variant={editorLock.summary.variant}
            title={editorLock.summary.title}
            description={editorLock.summary.description}
            isLoading={editorLock.isLoading}
            onRefresh={editorLock.acquire}
          />
        ) : null}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                unsavedChangesGuard.confirmDiscardChanges(() => navigate("/admin/cms/sections"))
              }
            >
              <ArrowLeft className="h-4 w-4" />
              Sections
            </Button>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-500" />
              <h1
                className="text-xl font-heading font-semibold"
                data-testid="text-section-editor-title"
              >
                {isNew ? "New Section" : form.watch("name") || "Edit Section"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminSaveBar
              state={saveState.state}
              type="button"
              onSave={onSave}
              primaryLabel="Save Section"
              disabled={isSaving || editorLock.isReadOnly}
              className="w-auto"
              buttonTestId="button-save-section"
            />
          </div>
        </div>

        <Card
          className={cn(
            editorLock.hasLocking &&
              editorLock.isReadOnly &&
              "pointer-events-none select-none opacity-70",
          )}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Section Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Homepage Hero"
                            {...field}
                            data-testid="input-section-name"
                          />
                        </FormControl>
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-section-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Description{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of when to use this section…"
                          rows={2}
                          {...field}
                          data-testid="input-section-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Blocks</h2>
          <Card
            className={cn(
              editorLock.hasLocking &&
                editorLock.isReadOnly &&
                "pointer-events-none select-none opacity-70",
            )}
          >
            <CardContent className="pt-4">
              <PageBuilder content={builderContent} onChange={setBuilderContent} />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <AdminSaveBar
            state={saveState.state}
            type="button"
            onSave={onSave}
            primaryLabel="Save Section"
            disabled={isSaving || editorLock.isReadOnly}
            className="w-auto"
            buttonTestId="button-save-section-bottom"
          />
        </div>
      </div>
      <AdminMobileActionBar>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving || editorLock.isReadOnly}
          data-testid="button-save-section-mobile"
        >
          Save Section
        </Button>
      </AdminMobileActionBar>
      {unsavedChangesGuard.dialog}
    </AdminSidebar>
  );
}
