import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCrmPipelineSettings, pipelinePresentation } from "@/hooks/use-crm-pipeline-settings";
import { DEFAULT_CRM_PIPELINE_CONFIG } from "@shared/crm-pipeline-settings";
import { createContext, useContext, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CRM_LEAD_STAGES,
  type CrmLead,
  type CrmClient,
  type CrmLeadNote,
  type CrmLeadStage,
  type CrmLeadTask,
} from "@shared/schema";
import { AdminSidebar } from "./admin-sidebar";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarClock,
  ClipboardList,
  Database,
  Handshake,
  MessageSquare,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

type LeadDetail = CrmLead & { notes: CrmLeadNote[]; tasks: CrmLeadTask[]; client?: CrmClient };

const PipelinePresentation = createContext(pipelinePresentation(DEFAULT_CRM_PIPELINE_CONFIG));

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function LeadCard({
  lead,
  onOpen,
  onMove,
  dragState,
}: {
  lead: CrmLead;
  onOpen: (id: string) => void;
  onMove?: (leadId: string, stage: CrmLeadStage) => void;
  dragState?: ReturnType<typeof useDraggable>;
}) {
  const presentation = useContext(PipelinePresentation);
  const transform = dragState?.transform;
  return (
    <div
      ref={dragState?.setNodeRef}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      {...dragState?.listeners}
      {...dragState?.attributes}
      className={cn(
        "w-full cursor-grab rounded-md border bg-background p-3 text-left shadow-sm transition-colors hover:border-primary active:cursor-grabbing",
        dragState?.isDragging && "opacity-40",
      )}
      data-testid={`card-crm-lead-${lead.id}`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onOpen(lead.id)}
        aria-label={`Open ${lead.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{lead.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.email || lead.phone || "No contact info"}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {lead.source}
          </Badge>
        </div>
        {lead.company ? (
          <p className="mt-2 truncate text-xs text-muted-foreground">{lead.company}</p>
        ) : null}
        {lead.nextFollowUpAt ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
            <CalendarClock className="h-3 w-3" />
            {formatDate(lead.nextFollowUpAt)}
          </p>
        ) : null}
      </button>
      {onMove ? (
        <div
          className="mt-3"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Label className="sr-only" htmlFor={`move-lead-${lead.id}`}>
            Move {lead.name} to stage
          </Label>
          <Select
            value={lead.stage}
            onValueChange={(stage) => onMove(lead.id, stage as CrmLeadStage)}
          >
            <SelectTrigger
              id={`move-lead-${lead.id}`}
              className="h-8 w-full text-xs"
              data-testid={`select-move-crm-lead-${lead.id}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presentation.stages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {presentation.labels[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

function DraggableLeadCard({
  lead,
  onOpen,
  onMove,
}: {
  lead: CrmLead;
  onOpen: (id: string) => void;
  onMove: (leadId: string, stage: CrmLeadStage) => void;
}) {
  const dragState = useDraggable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  return <LeadCard lead={lead} onOpen={onOpen} onMove={onMove} dragState={dragState} />;
}

function PipelineColumn({
  stage,
  leads,
  isLoading,
  onOpen,
  onMove,
}: {
  stage: CrmLeadStage;
  leads: CrmLead[];
  isLoading: boolean;
  onOpen: (id: string) => void;
  onMove: (leadId: string, stage: CrmLeadStage) => void;
}) {
  const presentation = useContext(PipelinePresentation);
  const { isOver, setNodeRef } = useDroppable({
    id: stage,
    data: { type: "stage", stage },
  });

  return (
    <Card
      className={cn(
        "flex min-h-0 snap-start flex-col transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className={cn("rounded-full border px-2 py-1", presentation.colors[stage])}>
            {presentation.labels[stage]}
          </span>
          <Badge variant="secondary">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="min-h-40 flex-1 space-y-2 overflow-y-auto">
        {leads.map((lead) => (
          <DraggableLeadCard key={lead.id} lead={lead} onOpen={onOpen} onMove={onMove} />
        ))}
        {!isLoading && leads.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Drop leads here
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreateLeadSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/crm", { ...form, source: "manual" });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/crm"] });
      toast({ title: "Lead created" });
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
      onOpenChange(false);
    },
    onError: (error: Error) =>
      toast({ title: "Could not create lead", description: error.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Create Lead</SheetTitle>
          <SheetDescription>Add a manual CRM lead to the pipeline.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                data-testid="input-crm-lead-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              rows={5}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
            />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || mutation.isPending}
            data-testid="button-save-crm-lead"
          >
            Create Lead
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function LeadDetailSheet({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const presentation = useContext(PipelinePresentation);
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const { data: lead } = useQuery<LeadDetail>({
    queryKey: ["/api/admin/crm", leadId ?? ""],
    enabled: Boolean(leadId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm", leadId ?? ""] }),
    ]);
  };

  const updateLeadMutation = useMutation({
    mutationFn: async (data: Partial<CrmLead>) =>
      apiRequest("PATCH", `/api/admin/crm/${leadId}`, data),
    onSuccess: refresh,
    onError: (error: Error) =>
      toast({ title: "Could not update lead", description: error.message, variant: "destructive" }),
  });
  const addNoteMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/crm/${leadId}/notes`, { body: note }),
    onSuccess: async () => {
      setNote("");
      await refresh();
    },
  });
  const addTaskMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/crm/${leadId}/tasks`, {
        title: taskTitle,
        dueAt: taskDueAt || null,
      }),
    onSuccess: async () => {
      setTaskTitle("");
      setTaskDueAt("");
      await refresh();
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/admin/crm/tasks/${id}`, { completed }),
    onSuccess: refresh,
  });

  return (
    <Sheet open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="xl">
        <SheetHeader>
          <SheetTitle>{lead?.name ?? "Lead"}</SheetTitle>
          <SheetDescription>{lead?.email || lead?.phone || "No contact info"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {lead ? (
            <>
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select
                    value={lead.stage}
                    onValueChange={(stage) =>
                      updateLeadMutation.mutate({ stage: stage as CrmLeadStage })
                    }
                  >
                    <SelectTrigger data-testid="select-crm-lead-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presentation.stages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {presentation.labels[stage]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Next Follow-Up</Label>
                  <Input
                    type="date"
                    defaultValue={
                      lead.nextFollowUpAt
                        ? new Date(lead.nextFollowUpAt).toISOString().slice(0, 10)
                        : ""
                    }
                    onBlur={(event) =>
                      updateLeadMutation.mutate({
                        nextFollowUpAt: event.target.value ? new Date(event.target.value) : null,
                      } as Partial<CrmLead>)
                    }
                  />
                </div>
                <p className="text-sm">
                  <span className="font-medium">Source:</span> {lead.source}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Company:</span> {lead.company || "—"}
                </p>
                {lead.client ? (
                  <p className="text-sm sm:col-span-2">
                    <span className="font-medium">Client:</span> {lead.client.name} (
                    {lead.client.status})
                  </p>
                ) : null}
              </div>

              <Tabs defaultValue="notes">
                <TabsList>
                  <TabsTrigger value="notes">
                    <MessageSquare className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <ClipboardList className="mr-1.5 h-4 w-4 text-orange-600" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="data">
                    <Database className="mr-1.5 h-4 w-4 text-cyan-600" />
                    Data
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="space-y-3">
                  <Textarea
                    rows={3}
                    placeholder="Add an internal note..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!note.trim() || addNoteMutation.isPending}
                  >
                    Add Note
                  </Button>
                  <div className="space-y-2">
                    {lead.notes.map((item) => (
                      <div key={item.id} className="rounded-md border p-3 text-sm">
                        <p className="whitespace-pre-wrap">{item.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                    <Input
                      placeholder="Follow-up task"
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                    />
                    <Input
                      type="date"
                      value={taskDueAt}
                      onChange={(event) => setTaskDueAt(event.target.value)}
                    />
                    <Button
                      onClick={() => addTaskMutation.mutate()}
                      disabled={!taskTitle.trim() || addTaskMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                  {lead.tasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) =>
                          updateTaskMutation.mutate({ id: task.id, completed: checked === true })
                        }
                      />
                      <span
                        className={cn(
                          "text-sm",
                          task.completed && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDate(task.dueAt)}
                      </span>
                    </label>
                  ))}
                </TabsContent>
                <TabsContent value="data">
                  <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                    {JSON.stringify({ formData: lead.formData, metadata: lead.metadata }, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading lead...</div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CrmContent() {
  const { user } = useAuth();
  const pipeline = useCrmPipelineSettings();
  const presentation = pipeline.presentation;
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<CrmLeadStage | "all">("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const { data: leads = [], isLoading } = useQuery<CrmLead[]>({
    queryKey: ["/api/admin/crm", { stage, query }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stage !== "all") params.set("stage", stage);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/crm${params.toString() ? `?${params}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load CRM leads");
      return response.json();
    },
  });

  const leadsByStage = useMemo(() => {
    return CRM_LEAD_STAGES.reduce<Record<CrmLeadStage, CrmLead[]>>(
      (acc, currentStage) => {
        acc[currentStage] = leads.filter((lead) => lead.stage === currentStage);
        return acc;
      },
      {} as Record<CrmLeadStage, CrmLead[]>,
    );
  }, [leads]);

  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, nextStage }: { leadId: string; nextStage: CrmLeadStage }) => {
      await apiRequest("PATCH", `/api/admin/crm/${leadId}`, { stage: nextStage });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/crm"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients"] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead((event.active.data.current?.lead as CrmLead | undefined) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const lead = event.active.data.current?.lead as CrmLead | undefined;
    const nextStage = event.over?.data.current?.stage as CrmLeadStage | undefined;
    setActiveLead(null);
    if (!lead || !nextStage || lead.stage === nextStage) return;
    moveLeadMutation.mutate({ leadId: lead.id, nextStage });
  };

  return (
    <PipelinePresentation.Provider value={presentation}>
      <div className="flex min-h-dvh min-w-0 flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {user?.role === "admin" && <Link href="/admin/crm/settings">Pipeline settings</Link>}
            {(pipeline.isError || pipeline.data?.issue) && (
              <p role="status">
                Pipeline settings unavailable or invalid; default presentation is in use.
              </p>
            )}
            <h1 className="text-2xl font-heading font-bold" data-testid="text-crm-title">
              CRM Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Track inbound leads from forms, social sources, and manual outreach.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-crm-lead">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search leads..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={stage} onValueChange={(value) => setStage(value as CrmLeadStage | "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {presentation.stages.map((item) => (
                <SelectItem key={item} value={item}>
                  {presentation.labels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveLead(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid min-h-[520px] snap-x snap-mandatory auto-cols-[minmax(280px,85vw)] grid-flow-col gap-4 overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-6 xl:overflow-visible">
            {presentation.stages.map((item) => (
              <PipelineColumn
                key={item}
                stage={item}
                leads={leadsByStage[item] ?? []}
                isLoading={isLoading}
                onOpen={setSelectedLeadId}
                onMove={(leadId, nextStage) => moveLeadMutation.mutate({ leadId, nextStage })}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} onOpen={() => undefined} /> : null}
          </DragOverlay>
        </DndContext>

        <div className="overflow-x-auto rounded-lg border">
          <div className="grid min-w-[640px] grid-cols-[1fr_140px_140px_120px] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>
              <UserRound className="mr-1 inline h-3 w-3" />
              Lead
            </span>
            <span>
              <Handshake className="mr-1 inline h-3 w-3" />
              Stage
            </span>
            <span>
              <ClipboardList className="mr-1 inline h-3 w-3" />
              Source
            </span>
            <span>Created</span>
          </div>
          {leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedLeadId(lead.id)}
              className="grid min-w-[640px] w-full grid-cols-[1fr_140px_140px_120px] gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{lead.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {lead.email || lead.phone || "No contact info"}
                </span>
              </span>
              <span>{presentation.labels[lead.stage]}</span>
              <span className="truncate">{lead.source}</span>
              <span>{formatDate(lead.createdAt)}</span>
            </button>
          ))}
        </div>

        <CreateLeadSheet open={createOpen} onOpenChange={setCreateOpen} />
        <LeadDetailSheet leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      </div>
    </PipelinePresentation.Provider>
  );
}

export default function AdminCrmPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
      <AdminSidebar>
        <CrmContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}
