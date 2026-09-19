import {
  EmailFormattingToolbar,
  EmailVariableTokens,
  EmailTemplatePreviewPanel,
} from "@/components/shared/email-template-editor-presentation";
import {
  EmailTemplateLibrary,
  emailTemplateSearchText,
} from "@/components/shared/email-template-library-presentation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bold,
  Code2,
  Eraser,
  Eye,
  FileText,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Pilcrow,
  RefreshCw,
  Save,
  Search,
  Send,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";

interface EmailTemplate {
  version: string;
  id: string;
  slug: string;
  name: string;
  module: EmailTemplateModule;
  subject: string;
  htmlBody: string;
  description: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

type EmailTemplateModule = "events" | "forms" | "users" | "crm" | "system";

type EmailTemplateStatusFilter = "all" | "active" | "inactive";

const EMAIL_TEMPLATE_MODULE_OPTIONS: Array<{
  value: EmailTemplateModule;
  label: string;
  description: string;
}> = [
  {
    value: "events",
    label: "Events",
    description: "Registration, reminders, payments, and recordings.",
  },
  { value: "forms", label: "Forms", description: "Contact and managed form notifications." },
  { value: "users", label: "Users", description: "Account, welcome, and password emails." },
  { value: "crm", label: "CRM", description: "Lead and client workflow notifications." },
  { value: "system", label: "System", description: "Fallback and platform-level emails." },
];

const EMAIL_TEMPLATE_MODULE_FEATURES: Partial<Record<EmailTemplateModule, keyof SiteFeatures>> = {
  events: "eventsEnabled",
  crm: "crmEnabled",
};

const EMAIL_TEMPLATE_MODULE_LABELS = EMAIL_TEMPLATE_MODULE_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {} as Record<EmailTemplateModule, string>,
);

function getTemplateModuleLabel(module: string | null | undefined) {
  return EMAIL_TEMPLATE_MODULE_LABELS[(module || "system") as EmailTemplateModule] || "System";
}

export function isEmailTemplateModuleEnabled(
  module: EmailTemplateModule | undefined,
  siteFeatures: SiteFeatures,
) {
  const featureKey = EMAIL_TEMPLATE_MODULE_FEATURES[module || "system"];
  return featureKey ? siteFeatures[featureKey] : true;
}

type EmailTemplateSearchable = Pick<
  EmailTemplate,
  "name" | "slug" | "subject" | "description" | "variables" | "isActive"
> & {
  module?: EmailTemplateModule;
};

export function getEmailTemplateModuleCounts<T extends EmailTemplateSearchable>(templates: T[]) {
  const counts = EMAIL_TEMPLATE_MODULE_OPTIONS.reduce(
    (acc, option) => {
      acc[option.value] = 0;
      return acc;
    },
    {} as Record<EmailTemplateModule, number>,
  );

  for (const template of templates) {
    const module = template.module || "system";
    counts[module] = (counts[module] || 0) + 1;
  }

  return counts;
}

export function filterEmailTemplates<T extends EmailTemplateSearchable>(
  templates: T[],
  filters: {
    searchQuery?: string;
    moduleFilter?: EmailTemplateModule | "all";
    statusFilter?: EmailTemplateStatusFilter;
    siteFeatures?: SiteFeatures;
  },
): T[] {
  const query = (filters.searchQuery || "").trim().toLowerCase();
  const moduleFilter = filters.moduleFilter || "all";
  const statusFilter = filters.statusFilter || "all";

  return templates.filter((template) => {
    const module = template.module || "system";
    const matchesEnabledModule =
      !filters.siteFeatures || isEmailTemplateModuleEnabled(module, filters.siteFeatures);
    const matchesModule = moduleFilter === "all" || module === moduleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && template.isActive) ||
      (statusFilter === "inactive" && !template.isActive);
    const searchable = emailTemplateSearchText(template);
    const matchesSearch = !query || searchable.includes(query);

    return matchesEnabledModule && matchesModule && matchesStatus && matchesSearch;
  });
}

function TemplateEditor({
  template,
  open,
  onClose,
}: {
  template: EmailTemplate;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [editorTab, setEditorTab] = useState<"visual" | "html">("visual");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const isApplyingExternalHtmlRef = useRef(false);
  const editorLock = useEditorLock({
    resourceType: "email_template",
    resourceId: open ? template.slug : null,
    enabled: open,
  });

  useEffect(() => {
    setWriteBlocked(false);
    setSubject(template.subject);
    setHtmlBody(template.htmlBody);
    setPreviewHtml(null);
    setEditorTab("visual");
    setLinkUrl("");
    setShowLinkPanel(false);
  }, [template]);

  useEffect(() => {
    if (!open) return;
    const editor = visualEditorRef.current;
    if (!editor) return;

    const current = editor.innerHTML;
    if (current === htmlBody) return;

    isApplyingExternalHtmlRef.current = true;
    editor.innerHTML = htmlBody;
    requestAnimationFrame(() => {
      isApplyingExternalHtmlRef.current = false;
    });
  }, [htmlBody, open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (writeBlocked || editorLock.isReadOnly)
        throw new Error("Reload the saved template before trying again.");
      await apiRequest("PUT", `/api/admin/email-templates/${template.slug}`, {
        template: { subject, htmlBody },
        expectedVersion: template.version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template saved" });
      onClose();
    },
    onError: (err: Error) => {
      setWriteBlocked(true);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Error saving template", description: err.message, variant: "destructive" });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/email-templates/${template.slug}/preview`, {
        htmlBody,
        subject,
      });
      return res.json();
    },
    onSuccess: (data: { subject: string; html: string }) => {
      setPreviewHtml(data.html);
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/email-templates/${template.slug}/test`);
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({
        title: data.success ? "Test email sent" : "Email not sent",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test email failed", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      previewMutation.mutate();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [open, subject, htmlBody]);

  const syncVisualHtml = () => {
    const editor = visualEditorRef.current;
    if (!editor || isApplyingExternalHtmlRef.current) return;
    setHtmlBody(editor.innerHTML);
  };

  const focusVisualEditor = () => {
    visualEditorRef.current?.focus();
  };

  const applyCommand = (command: string, value?: string) => {
    focusVisualEditor();
    if (typeof document === "undefined") return;
    document.execCommand(command, false, value);
    syncVisualHtml();
  };

  const insertVariable = (variable: string) => {
    focusVisualEditor();
    if (typeof document === "undefined") return;
    const token = `{{${variable}}}`;
    document.execCommand("insertText", false, token);
    syncVisualHtml();
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    applyCommand("createLink", normalized);
    setShowLinkPanel(false);
    setLinkUrl("");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" size="xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit: {template.name}
          </SheetTitle>
          <SheetDescription className="sr-only">Edit email template</SheetDescription>
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
            <div className="flex flex-wrap items-start gap-2">
              <Badge variant="outline" className="text-xs">
                {getTemplateModuleLabel(template.module)}
              </Badge>
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">{template.description}</p>
            </div>

            <EmailVariableTokens
              ui={{ Badge }}
              variables={template.variables}
              onInsert={insertVariable}
            />
            <div className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-template-subject"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label>Email Body</Label>
                  <Tabs
                    value={editorTab}
                    onValueChange={(value) => setEditorTab(value as "visual" | "html")}
                  >
                    <TabsList className="h-9 rounded-full">
                      <TabsTrigger
                        value="visual"
                        className="rounded-full px-3 text-xs"
                        data-testid="tab-email-visual"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Visual
                      </TabsTrigger>
                      <TabsTrigger
                        value="html"
                        className="rounded-full px-3 text-xs"
                        data-testid="tab-email-html"
                      >
                        <Code2 className="mr-1.5 h-3.5 w-3.5 text-violet-600" />
                        HTML
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <p className="text-xs text-muted-foreground">
                  Visual mode shows the email the way editors expect to work with it. HTML mode
                  remains available for advanced changes.
                </p>

                {editorTab === "visual" ? (
                  <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
                    <EmailFormattingToolbar
                      ui={{ Button }}
                      applyCommand={applyCommand}
                      onLink={() => {
                        focusVisualEditor();
                        setShowLinkPanel((current) => !current);
                      }}
                    />
                    {showLinkPanel ? (
                      <div className="border-b bg-muted/15 px-3 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="template-link-url" className="text-xs">
                              Link URL
                            </Label>
                            <Input
                              id="template-link-url"
                              value={linkUrl}
                              onChange={(event) => setLinkUrl(event.target.value)}
                              placeholder="https://example.com"
                              autoPrependHttps
                              className="h-9"
                              data-testid="input-template-link-url"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={applyLink}
                            data-testid="button-template-apply-link"
                          >
                            Apply Link
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="bg-muted/20 p-4">
                      <div className="mx-auto max-w-2xl rounded-xl border bg-white shadow-sm">
                        <div className="border-b px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                          Email content editor
                        </div>
                        <div
                          ref={visualEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={syncVisualHtml}
                          onBlur={syncVisualHtml}
                          className="min-h-[320px] px-6 py-5 text-[15px] leading-7 text-slate-700 outline-none"
                          data-testid="visual-template-body"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Textarea
                    id="template-body"
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    rows={16}
                    className="font-mono text-xs"
                    data-testid="input-template-body"
                  />
                )}
              </div>
            </div>

            <EmailTemplatePreviewPanel
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewMutation.mutate()}
                  disabled={previewMutation.isPending}
                  data-testid="button-refresh-template-preview"
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
              }
            >
              {" "}
              {previewHtml ? (
                <iframe
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={previewHtml}
                  className="w-full h-[420px] bg-white"
                  title="Email preview"
                  data-testid="iframe-email-preview"
                />
              ) : (
                <div className="flex h-[220px] items-center justify-center bg-white text-sm text-muted-foreground">
                  {previewMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading preview…
                    </span>
                  ) : (
                    "Preview unavailable."
                  )}
                </div>
              )}
            </EmailTemplatePreviewPanel>
          </div>
        </SheetBody>
        <SheetFooter>
          {writeBlocked && (
            <p role="alert">
              Save was not confirmed. Your draft is retained. Download it before closing, then
              reopen the saved template to compare.
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify({ slug: template.slug, subject, htmlBody }, null, 2)], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = `${template.slug}-draft.json`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download draft
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || editorLock.isReadOnly || writeBlocked}
            data-testid="button-save-template"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
          <Button
            variant="outline"
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
            data-testid="button-preview-template"
          >
            {previewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Refresh Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            data-testid="button-test-email"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function EmailTemplatesTab() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<EmailTemplateModule | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EmailTemplateStatusFilter>("all");

  const { data: snapshot, isLoading } = useQuery<{ version: string; templates: EmailTemplate[] }>({
    queryKey: ["/api/admin/email-templates"],
  });
  const { data: siteFeaturesData, isLoading: isSiteFeaturesLoading } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;
  const enabledModuleOptions = useMemo(
    () =>
      EMAIL_TEMPLATE_MODULE_OPTIONS.filter((module) =>
        isEmailTemplateModuleEnabled(module.value, siteFeatures),
      ),
    [siteFeatures],
  );

  const templateList = snapshot?.templates || [];
  const visibleTemplateList = useMemo(() => {
    return filterEmailTemplates(templateList, {
      siteFeatures,
    });
  }, [siteFeatures, templateList]);

  const moduleCounts = useMemo(() => {
    return getEmailTemplateModuleCounts(visibleTemplateList);
  }, [visibleTemplateList]);

  const filteredTemplates = useMemo(() => {
    return filterEmailTemplates(visibleTemplateList, {
      searchQuery,
      moduleFilter,
      statusFilter,
    });
  }, [moduleFilter, searchQuery, statusFilter, visibleTemplateList]);

  useEffect(() => {
    if (moduleFilter !== "all" && !isEmailTemplateModuleEnabled(moduleFilter, siteFeatures)) {
      setModuleFilter("all");
    }
  }, [moduleFilter, siteFeatures]);

  const toggleMutation = useMutation({
    mutationFn: async ({ slug, isActive }: { slug: string; isActive: boolean }) => {
      await apiRequest("PUT", `/api/admin/email-templates/${slug}`, {
        template: { isActive },
        expectedVersion: templateList.find((template) => template.slug === slug)?.version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template updated" });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/email-templates/restore", {
        expectedVersion: snapshot?.version,
      });
      return res.json();
    },
    onSuccess: async (payload: { restored: number }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({
        title: "System email templates restored",
        description: `${payload.restored} templates are now available in the library.`,
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || isSiteFeaturesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-templates-heading">
          Email Templates
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage system email templates. Templates use {"{{variable}}"} placeholders for dynamic
          content.
        </p>
      </div>

      <EmailTemplateLibrary
        ui={{
          Card,
          CardContent,
          Badge,
          Input,
          Select,
          SelectTrigger,
          SelectValue,
          SelectContent,
          SelectItem,
          Button,
          Switch,
        }}
        enabledModuleOptions={enabledModuleOptions}
        moduleCounts={moduleCounts}
        moduleFilter={moduleFilter}
        setModuleFilter={(v) => setModuleFilter(v as EmailTemplateModule | "all")}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={(v) => setStatusFilter(v as EmailTemplateStatusFilter)}
        onRestore={() => {
          if (
            window.confirm(
              "Restore system template content to defaults? Custom content in system templates will be replaced. Existing activation choices and custom templates will be preserved.",
            )
          )
            restoreMutation.mutate();
        }}
        restoring={restoreMutation.isPending}
        canRestore={!!snapshot}
        filteredTemplates={filteredTemplates}
        visibleTemplateList={visibleTemplateList}
        templateList={templateList}
        onEdit={setEditingTemplate}
        onToggle={(t, isActive) => toggleMutation.mutate({ slug: t.slug, isActive })}
        moduleLabel={getTemplateModuleLabel}
      />

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          open={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
