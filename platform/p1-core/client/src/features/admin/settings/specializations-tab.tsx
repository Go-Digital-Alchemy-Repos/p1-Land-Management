import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";

type Specialization = { id: number; name: string; sortOrder: number };

export function SpecializationsTab({ showHeader = true }: { showHeader?: boolean } = {}) {
  const { toast } = useToast();
  const { settings: directorySettings } = useDirectorySettings();
  const [addName, setAddName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Specialization | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Specialization | null>(null);

  const { data: specs, isLoading } = useQuery<Specialization[]>({
    queryKey: ["/api/specializations"],
  });
  const specialtyLabelPlural = directorySettings.specialtyLabelPlural || "Specializations";
  const specialtyLabelLower = specialtyLabelPlural.toLowerCase();
  const participantLabelLower = directorySettings.participantLabelPlural.toLowerCase();

  const addMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/specializations", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setAddName("");
      setAddOpen(false);
      toast({ title: `${specialtyLabelPlural} updated` });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PUT", `/api/specializations/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setEditTarget(null);
      toast({ title: `${specialtyLabelPlural} updated` });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/specializations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setDeleteTarget(null);
      toast({ title: `${specialtyLabelPlural} updated` });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleStartEdit(spec: Specialization) {
    setEditTarget(spec);
    setEditName(spec.name);
  }

  return (
    <>
      <Card>
        {showHeader ? (
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {specialtyLabelPlural} Settings
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage the list of {specialtyLabelLower} available in {participantLabelLower}
                  profiles and the directory filter.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="bg-accent text-accent-foreground flex-shrink-0"
                data-testid="button-add-specialization"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            </div>
          </CardHeader>
        ) : (
          <CardContent className="flex items-center justify-end border-b py-4">
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="bg-accent text-accent-foreground flex-shrink-0"
              data-testid="button-add-specialization"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </CardContent>
        )}
        <CardContent className="[padding-top:15px]">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !specs?.length ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No {specialtyLabelLower} yet.
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {specs.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  data-testid={`specialization-row-${spec.id}`}
                >
                  <span className="text-sm">{spec.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(spec)}
                      data-testid={`button-edit-specialization-${spec.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(spec)}
                      data-testid={`button-delete-specialization-${spec.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Add {specialtyLabelPlural}</SheetTitle>
            <SheetDescription>
              Enter a name for the new {specialtyLabelLower} item.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-2">
              <Label htmlFor="add-spec-name">Name</Label>
              <Input
                id="add-spec-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Parenting Challenges"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addName.trim()) addMutation.mutate(addName.trim());
                }}
                data-testid="input-add-specialization-name"
                autoFocus
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(addName.trim())}
              disabled={!addName.trim() || addMutation.isPending}
              data-testid="button-save-add-specialization"
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {specialtyLabelPlural}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Edit {specialtyLabelPlural}</SheetTitle>
            <SheetDescription>Update the name of this {specialtyLabelLower} item.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-2">
              <Label htmlFor="edit-spec-name">Name</Label>
              <Input
                id="edit-spec-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editName.trim() && editTarget) {
                    editMutation.mutate({ id: editTarget.id, name: editName.trim() });
                  }
                }}
                data-testid="input-edit-specialization-name"
                autoFocus
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editTarget && editMutation.mutate({ id: editTarget.id, name: editName.trim() })
              }
              disabled={!editName.trim() || editMutation.isPending}
              data-testid="button-save-edit-specialization"
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Delete {specialtyLabelPlural}</SheetTitle>
            <SheetDescription>
              This will remove <strong>{deleteTarget?.name}</strong> from the directory filters and
              {participantLabelLower} profile options. Existing profiles that already have this
              {specialtyLabelLower} item will retain it until they save changes.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-specialization"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
