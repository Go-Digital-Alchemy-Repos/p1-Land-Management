import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight, Plus, Trash2, ToggleLeft, ToggleRight, GitMerge, Info } from "lucide-react";
import type { Redirect } from "@shared/schema";

const formSchema = z.object({
  fromPath: z.string().min(1, "Required").startsWith("/", "Must start with /"),
  toPath: z.string().min(1, "Required"),
  statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function RedirectForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromPath: "",
      toPath: "",
      statusCode: 301,
      note: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/admin/cms/redirects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/redirects"] });
      form.reset();
      toast({ title: "Redirect created" });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create redirect",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="fromPath"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">From Path</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="/old-slug"
                    className="font-mono text-sm"
                    data-testid="input-redirect-from"
                  />
                </FormControl>
                <FormDescription className="text-xs">Must start with /</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toPath"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">To Path or URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="/new-slug or https://example.com"
                    className="font-mono text-sm"
                    data-testid="input-redirect-to"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Relative or absolute destination
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="statusCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v) as 301 | 302)}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-redirect-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="301">301 — Permanent redirect</SelectItem>
                    <SelectItem value="302">302 — Temporary redirect</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Note (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Old blog URL"
                    className="text-sm"
                    data-testid="input-redirect-note"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending}
          data-testid="button-add-redirect"
        >
          <Plus className="h-4 w-4 mr-2" />
          {createMutation.isPending ? "Adding…" : "Add Redirect"}
        </Button>
      </form>
    </Form>
  );
}

function RedirectRow({ redirect }: { redirect: Redirect }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/admin/cms/redirects/${redirect.id}`, {
        isActive: !redirect.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/redirects"] });
    },
    onError: () => {
      toast({ title: "Failed to update redirect", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/admin/cms/redirects/${redirect.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/redirects"] });
      toast({ title: "Redirect deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete redirect", variant: "destructive" });
    },
  });

  return (
    <>
      <div
        className={`flex items-center gap-3 py-3 border-b last:border-0 ${!redirect.isActive ? "opacity-50" : ""}`}
        data-testid={`redirect-row-${redirect.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {redirect.fromPath}
            </code>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{redirect.toPath}</code>
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0"
              data-testid={`redirect-code-${redirect.id}`}
            >
              {redirect.statusCode}
            </Badge>
            {!redirect.isActive && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 bg-slate-100 text-slate-500"
              >
                Inactive
              </Badge>
            )}
          </div>
          {redirect.note && <p className="text-xs text-muted-foreground mt-1">{redirect.note}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            title={redirect.isActive ? "Deactivate" : "Activate"}
            data-testid={`button-toggle-redirect-${redirect.id}`}
          >
            {redirect.isActive ? (
              <ToggleRight className="h-4 w-4 text-emerald-500" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            data-testid={`button-delete-redirect-${redirect.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              The redirect from{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{redirect.fromPath}</code> will
              be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={`button-confirm-delete-redirect-${redirect.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CmsRedirectsTab() {
  const [showForm, setShowForm] = useState(false);

  const { data: redirectsList, isLoading } = useQuery<Redirect[]>({
    queryKey: ["/api/admin/cms/redirects"],
  });

  return (
    <div className="space-y-5 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">Redirect Manager</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Manage 301/302 redirects for slug changes, retired pages, and URL migrations. Redirects
            apply server-side before the frontend loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Use <strong>301</strong> for permanent URL changes (slug renamed, page moved). Use{" "}
              <strong>302</strong> for temporary redirects. Inactive redirects are saved but not
              applied.
            </span>
          </div>

          {showForm ? (
            <div className="rounded-md border p-4 bg-muted/20">
              <p className="text-sm font-medium mb-3">New Redirect</p>
              <RedirectForm onSuccess={() => setShowForm(false)} />
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setShowForm(false)}
                data-testid="button-cancel-redirect"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              data-testid="button-new-redirect"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Redirect
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active Redirects</CardTitle>
          <CardDescription className="text-xs">
            {redirectsList?.length ?? 0} redirect{(redirectsList?.length ?? 0) !== 1 ? "s" : ""}{" "}
            configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : !redirectsList || redirectsList.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No redirects configured yet. Add one above.
            </div>
          ) : (
            <div>
              {redirectsList.map((r) => (
                <RedirectRow key={r.id} redirect={r} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
