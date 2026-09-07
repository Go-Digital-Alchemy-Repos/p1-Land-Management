import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { EditorSaveIndicator } from "@/components/shared/editor-save-indicator";
import { MarkdownDocument } from "@/components/shared/markdown-document";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  docSlugFromMarkdownPath,
  extractMarkdownHeadings,
  markdownToExcerpt,
  type MarkdownLinkResolution,
} from "@/lib/markdown";
import {
  BookOpenText,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Layers3,
  ListTree,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import type { Doc } from "@shared/schema";

const PREFERRED_CATEGORIES = [
  "Getting Started",
  "Admin Guides",
  "Architecture",
  "Architecture Decisions",
  "Operations & Recovery",
  "Deployment & Release",
  "API Reference",
  "Engineering Quality",
  "Security",
  "Product & Planning",
  "Reference",
];

function sortCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const aIndex = PREFERRED_CATEGORIES.indexOf(a);
    const bIndex = PREFERRED_CATEGORIES.indexOf(b);

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });
}

export default function DocsPage() {
  const { toast } = useToast();
  const [, routeParams] = useRoute("/admin/docs/:slug");
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState<Partial<Doc> | null>(null);
  const [savedDocSnapshot, setSavedDocSnapshot] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const saveFeedbackRef = useRef({
    markSaved: () => {},
    markError: () => {},
    clearFeedback: () => {},
  });

  const editorLock = useEditorLock({
    resourceType: "doc",
    resourceId: sheetOpen && editingDoc?.id ? editingDoc.id : null,
    enabled: sheetOpen && Boolean(editingDoc?.id),
  });

  useLockConflictGuard({
    active: sheetOpen && Boolean(editingDoc?.id),
    resourceId: sheetOpen && editingDoc?.id ? editingDoc.id : null,
    resourceLabel: "document",
    editorLock,
    onConflict: () => {
      setSheetOpen(false);
      setEditingDoc(null);
      setShowPreview(false);
    },
  });

  const { data: allDocs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/admin/docs"],
  });

  const docBySlug = useMemo(() => new Map(allDocs.map((doc) => [doc.slug, doc])), [allDocs]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/docs/sync");
      return res.json();
    },
    onSuccess: async (payload: {
      total: number;
      created: number;
      updated: number;
      docs: Doc[];
    }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      const firstDoc = payload.docs?.[0] ?? null;
      setSelectedDoc(firstDoc);
      toast({
        title: "System documentation synced",
        description: `${payload.total} documents available, ${payload.created} created, ${payload.updated} refreshed.`,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Doc>) => {
      const res = await apiRequest("POST", "/api/admin/docs", data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      saveFeedbackRef.current.markSaved();
      setSheetOpen(false);
      setEditingDoc(null);
      setSavedDocSnapshot("");
      toast({ title: "Document created" });
    },
    onError: (error: Error) => {
      saveFeedbackRef.current.markError();
      toast({
        title: "Failed to create document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Doc> & { id: string }) => {
      const res = await apiRequest("PUT", `/api/admin/docs/${id}`, data);
      return res.json();
    },
    onSuccess: async (updated: Doc) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      saveFeedbackRef.current.markSaved();
      setSheetOpen(false);
      setEditingDoc(null);
      setSavedDocSnapshot("");
      if (selectedDoc?.id === updated.id) {
        setSelectedDoc(updated);
      }
      toast({ title: "Document updated" });
    },
    onError: (error: Error) => {
      saveFeedbackRef.current.markError();
      toast({
        title: "Failed to update document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/docs/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSelectedDoc(null);
      toast({ title: "Document deleted" });
    },
  });

  const filteredDocs = useMemo(
    () =>
      allDocs.filter((doc) => {
        const matchesCategory = !selectedCategory || doc.category === selectedCategory;
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !normalizedQuery ||
          doc.title.toLowerCase().includes(normalizedQuery) ||
          doc.content.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesSearch;
      }),
    [allDocs, searchQuery, selectedCategory],
  );

  const categories = useMemo(
    () => sortCategories([...new Set(allDocs.map((doc) => doc.category))]),
    [allDocs],
  );

  const categoryOptions = useMemo(
    () => sortCategories([...new Set([...PREFERRED_CATEGORIES, ...categories])]),
    [categories],
  );

  const selectedDocHeadings = useMemo(
    () =>
      selectedDoc
        ? extractMarkdownHeadings(selectedDoc.content).filter((heading) => heading.level <= 3)
        : [],
    [selectedDoc],
  );

  const selectDoc = useCallback(
    (doc: Doc) => {
      setSelectedDoc(doc);
      navigate(`/admin/docs/${doc.slug}`);
    },
    [navigate],
  );

  const resolveDocLink = useCallback(
    (href: string): MarkdownLinkResolution | null => {
      const trimmed = href.trim();

      if (trimmed.startsWith("#")) {
        return { href: trimmed };
      }

      const adminDocMatch = trimmed.match(/^\/admin\/docs\/([^#/?]+)/);
      if (adminDocMatch && docBySlug.has(adminDocMatch[1])) {
        return { href: `/admin/docs/${adminDocMatch[1]}`, docSlug: adminDocMatch[1] };
      }

      const relativeSlug = docSlugFromMarkdownPath(trimmed);
      if (relativeSlug && docBySlug.has(relativeSlug)) {
        return { href: `/admin/docs/${relativeSlug}`, docSlug: relativeSlug };
      }

      return null;
    },
    [docBySlug],
  );

  const handleDocLinkClick = useCallback(
    (slug: string) => {
      const doc = docBySlug.get(slug);
      if (doc) {
        selectDoc(doc);
      }
    },
    [docBySlug, selectDoc],
  );

  useEffect(() => {
    const routedDoc = routeParams?.slug ? docBySlug.get(routeParams.slug) : null;
    if (routedDoc) {
      if (selectedDoc?.id !== routedDoc.id) {
        setSelectedDoc(routedDoc);
      }
      return;
    }

    if (!selectedDoc && filteredDocs.length > 0) {
      setSelectedDoc(filteredDocs[0]);
      return;
    }

    if (selectedDoc && !allDocs.some((doc) => doc.id === selectedDoc.id)) {
      setSelectedDoc(filteredDocs[0] ?? null);
      return;
    }

    if (
      selectedDoc &&
      filteredDocs.length > 0 &&
      !filteredDocs.some((doc) => doc.id === selectedDoc.id)
    ) {
      setSelectedDoc(filteredDocs[0] ?? null);
    }
  }, [allDocs, docBySlug, filteredDocs, routeParams?.slug, selectedDoc]);

  useEffect(() => {
    if (selectedCategory && !categories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [categories, selectedCategory]);

  const handleSave = () => {
    if (!editingDoc?.title || !editingDoc?.slug || !editingDoc?.category || !editingDoc?.content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (editingDoc.id) {
      updateMutation.mutate(editingDoc as Partial<Doc> & { id: string });
    } else {
      createMutation.mutate(editingDoc);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDirty = sheetOpen && !!editingDoc && JSON.stringify(editingDoc) !== savedDocSnapshot;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved changes to this document. Close without saving?",
  });
  saveFeedbackRef.current = saveState;

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetOpen(true);
      return;
    }

    unsavedChangesGuard.confirmDiscardChanges(() => setSheetOpen(false));
  };

  const openCreate = () => {
    const blankDoc = {
      title: "",
      slug: "",
      category: categoryOptions[0] ?? "Getting Started",
      content: "",
      isPublished: true,
      sortOrder: allDocs.length + 1,
    };
    setEditingDoc(blankDoc);
    setSavedDocSnapshot(JSON.stringify(blankDoc));
    saveFeedbackRef.current.clearFeedback();
    setShowPreview(false);
    setSheetOpen(true);
  };

  const openEdit = (doc: Doc) => {
    const nextDoc = { ...doc };
    setEditingDoc(nextDoc);
    setSavedDocSnapshot(JSON.stringify(nextDoc));
    saveFeedbackRef.current.clearFeedback();
    setShowPreview(false);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <AdminSidebar>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="flex min-h-0 flex-col gap-6 p-4 sm:p-6 xl:h-[calc(100dvh-4rem)] xl:overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">
              Developer Resource Center
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Browse system documentation, generated architecture indexes, route maps, schemas,
              services, and long-form technical specs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              data-testid="button-sync-system-docs"
            >
              {syncMutation.isPending ? <LoadingSpinner /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync System Docs
            </Button>
            <Button onClick={openCreate} data-testid="button-create-doc">
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpenText className="h-4 w-4" />
                Documents
              </div>
              <div className="mt-1 text-2xl font-semibold" data-testid="text-doc-count">
                {allDocs.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers3 className="h-4 w-4" />
                Systems
              </div>
              <div className="mt-1 text-2xl font-semibold">{categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListTree className="h-4 w-4" />
                Visible results
              </div>
              <div className="mt-1 text-2xl font-semibold">{filteredDocs.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[280px_360px_minmax(0,1fr)] xl:overflow-hidden">
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">System Index</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-docs"
                />
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
              <ScrollArea className="min-h-0 flex-1 pr-3">
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${!selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    data-testid="button-category-all"
                  >
                    <span>All Systems</span>
                    <span className="text-xs opacity-80">{allDocs.length}</span>
                  </button>
                  {categories.map((category) => {
                    const count = allDocs.filter((doc) => doc.category === category).length;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedCategory === category ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className="min-w-0 truncate">{category}</span>
                        <span className="text-xs opacity-80">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Documents & Indexes</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
              <ScrollArea className="min-h-0 flex-1 pr-3">
                <div className="space-y-3">
                  {filteredDocs.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                      <BookOpenText className="mx-auto mb-3 h-10 w-10 opacity-50" />
                      <p>No documentation found yet.</p>
                      <p className="mt-1">
                        Use “Sync System Docs” to import the repo documentation into the admin
                        library.
                      </p>
                    </div>
                  ) : (
                    filteredDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className={`w-full rounded-md border p-4 text-left transition-colors ${selectedDoc?.id === doc.id ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"}`}
                        onClick={() => selectDoc(doc)}
                        data-testid={`card-doc-${doc.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="font-medium leading-snug">{doc.title}</div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">
                                {doc.category}
                              </Badge>
                              {doc.slug.startsWith("system-") && (
                                <Badge variant="secondary" className="text-xs">
                                  Generated
                                </Badge>
                              )}
                              {!doc.isPublished && (
                                <Badge variant="secondary" className="text-xs">
                                  Draft
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {markdownToExcerpt(doc.content)}
                            </p>
                          </div>
                          <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden">
            {selectedDoc ? (
              <>
                <CardHeader className="shrink-0 border-b">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <CardTitle className="font-heading text-xl" data-testid="text-doc-title">
                          {selectedDoc.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Technical documentation for Core Platform systems, architecture, modules,
                          and operating workflows.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{selectedDoc.category}</Badge>
                        {selectedDoc.slug.startsWith("system-") && (
                          <Badge variant="secondary">Generated Index</Badge>
                        )}
                        {selectedDoc.isPublished ? (
                          <Badge data-testid="badge-published">Published</Badge>
                        ) : (
                          <Badge variant="secondary" data-testid="badge-draft">
                            Draft
                          </Badge>
                        )}
                        <Badge variant="secondary">Slug: {selectedDoc.slug}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(selectedDoc)}
                        data-testid="button-edit-doc"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(selectedDoc.id)}
                        data-testid="button-delete-doc"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid min-h-0 flex-1 gap-6 overflow-hidden pb-4 pt-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <ScrollArea className="min-h-0 pr-4">
                    <MarkdownDocument
                      content={selectedDoc.content}
                      resolveLink={resolveDocLink}
                      onDocLinkClick={handleDocLinkClick}
                      data-testid="text-doc-content"
                    />
                  </ScrollArea>
                  <aside className="hidden min-h-0 border-l pl-4 lg:block">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Hash className="h-4 w-4" />
                      On this page
                    </div>
                    <ScrollArea className="h-full pr-2">
                      {selectedDocHeadings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No headings found.</p>
                      ) : (
                        <nav className="space-y-1" data-testid="doc-table-of-contents">
                          {selectedDocHeadings.map((heading) => (
                            <a
                              key={heading.id}
                              href={`#${heading.id}`}
                              className={cn(
                                "block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                                heading.level === 3 && "pl-5 text-xs",
                              )}
                            >
                              {heading.text}
                            </a>
                          ))}
                        </nav>
                      )}
                    </ScrollArea>
                  </aside>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                <div className="space-y-3">
                  <BookOpenText className="mx-auto h-12 w-12 opacity-50" />
                  <p>Select a document to read it here.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" size="xl">
          <SheetHeader>
            <SheetTitle>{editingDoc?.id ? "Edit Document" : "New Document"}</SheetTitle>
            <SheetDescription className="sr-only">
              {editingDoc?.id ? "Edit document content" : "Create a new document"}
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

            {editingDoc && (
              <div
                className={cn(
                  "space-y-4",
                  editorLock.hasLocking &&
                    editorLock.isReadOnly &&
                    "pointer-events-none select-none opacity-70",
                )}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingDoc.title || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                      data-testid="input-doc-title"
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={editingDoc.slug || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, slug: e.target.value })}
                      data-testid="input-doc-slug"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={editingDoc.category || ""}
                      onValueChange={(value) => setEditingDoc({ ...editingDoc, category: value })}
                    >
                      <SelectTrigger data-testid="select-doc-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingDoc.isPublished ?? true}
                        onCheckedChange={(value) =>
                          setEditingDoc({ ...editingDoc, isPublished: value })
                        }
                        data-testid="switch-doc-published"
                      />
                      <Label>{editingDoc.isPublished ? "Published" : "Draft"}</Label>
                    </div>
                    <div>
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={editingDoc.sortOrder || 0}
                        onChange={(e) =>
                          setEditingDoc({
                            ...editingDoc,
                            sortOrder: Number.parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20"
                        data-testid="input-doc-sort"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Content (Markdown)</Label>
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                      {showPreview ? (
                        <>
                          <EyeOff className="mr-1 h-4 w-4" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-4 w-4" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>
                  {showPreview ? (
                    <div className="min-h-[300px] rounded-md border p-4">
                      <MarkdownDocument content={editingDoc.content || ""} />
                    </div>
                  ) : (
                    <Textarea
                      value={editingDoc.content || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                      rows={18}
                      className="font-mono text-sm"
                      data-testid="textarea-doc-content"
                    />
                  )}
                </div>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <div className="flex w-full items-center justify-between gap-3">
              <EditorSaveIndicator state={saveState.state} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    unsavedChangesGuard.confirmDiscardChanges(() => setSheetOpen(false))
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || editorLock.isReadOnly}
                  data-testid="button-save-doc"
                >
                  {isSaving && <LoadingSpinner />}
                  {editingDoc?.id ? "Save Document" : "Create Document"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {unsavedChangesGuard.dialog}
    </AdminSidebar>
  );
}
