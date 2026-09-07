import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Users } from "lucide-react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { teamBiographyEditorHtml, teamMemberInputSchema, type TeamMemberInput } from "@shared/team";
import type { TeamMember } from "@shared/schema";
import { CmsImageUpload } from "./components/cms-image-upload";
import { CmsRichTextEditor } from "./builder/cms-rich-text-editor";
import { MediaPickerDialog } from "./components/media-picker-dialog";

export default function CmsTeamPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [form, setForm] = useState<TeamMemberInput>(() =>
    teamMemberInputSchema.parse({ name: "New member" }),
  );
  const [mediaOpen, setMediaOpen] = useState(false);
  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<TeamMember[]>({ queryKey: ["/api/admin/cms/team"] });
  const save = useMutation({
    mutationFn: async () => {
      const data = teamMemberInputSchema.parse(form);
      return apiRequest(
        editing === "new" ? "POST" : "PUT",
        editing === "new"
          ? "/api/admin/cms/team"
          : `/api/admin/cms/team/${(editing as TeamMember).id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/team"] });
      setEditing(null);
      toast({ title: "Team member saved" });
    },
    onError: (error: Error) =>
      toast({
        title: "Could not save team member",
        description: error.message,
        variant: "destructive",
      }),
  });
  const openEditor = (member: TeamMember | "new") => {
    setEditing(member);
    setForm(
      member === "new"
        ? {
            name: "",
            role: "",
            biography: "",
            excerpt: "",
            photoUrl: "",
            photoAlt: "",
            status: "draft",
          }
        : {
            ...teamMemberInputSchema.parse(member),
            biography: teamBiographyEditorHtml(member.biography),
          },
    );
  };
  const filtered = members.filter(
    (member) =>
      (status === "all" || member.status === status) &&
      `${member.name} ${member.role}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <AdminSidebar>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Team</h1>
            <p className="mt-1 text-muted-foreground">
              Manage the people featured on your website. Add the Team reusable section to any page
              to select members and a layout.
            </p>
          </div>
          <Button onClick={() => openEditor("new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            aria-label="Search team members"
            placeholder="Search by name or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <select
            aria-label="Filter by status"
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {isLoading ? (
          <p role="status">Loading team members…</p>
        ) : isError ? (
          <div role="alert">
            Could not load team members.{" "}
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {members.length
                ? "No matching team members."
                : "No team members yet. Add your first member to get started."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.photoAlt || member.name}
                      className="h-20 w-20 rounded-md object-cover"
                    />
                  ) : (
                    <Users className="h-20 w-20 rounded-md bg-muted p-5 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold break-words">{member.name}</h2>
                    <p className="text-sm text-muted-foreground break-words">{member.role}</p>
                    <Badge variant="secondary" className="my-2">
                      {member.status}
                    </Badge>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditor(member)}
                        aria-label={`Edit ${member.name}`}
                      >
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !save.isPending) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add Team Member" : "Edit Team Member"}</DialogTitle>
            <DialogDescription>
              Published members can appear in Team sections. Archive a member to remove them from
              public sections while keeping their record.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team-name">Name</Label>
                <Input
                  id="team-name"
                  required
                  maxLength={160}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-role">Role / title</Label>
                <Input
                  id="team-role"
                  maxLength={240}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <CmsImageUpload
                label="Photo"
                value={form.photoUrl}
                onChange={(photoUrl) => setForm((current) => ({ ...current, photoUrl }))}
                showLibraryButton={false}
                data-testid="team-photo-upload"
              />
              <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>
                Media Library
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-alt">Photo description</Label>
              <Input
                id="team-alt"
                maxLength={300}
                value={form.photoAlt}
                onChange={(e) => setForm({ ...form, photoAlt: e.target.value })}
                placeholder="Defaults to the member’s name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-excerpt">Bio excerpt</Label>
              <Textarea
                id="team-excerpt"
                maxLength={1000}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Optional short introduction; otherwise generated from the biography"
              />
            </div>
            <div className="space-y-2">
              <Label>Full biography</Label>
              <CmsRichTextEditor
                value={form.biography}
                onChange={(biography) => setForm((current) => ({ ...current, biography }))}
                placeholder="Shown when visitors open the member’s biography"
                data-testid="team-biography-editor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-status">Status</Label>
              <select
                id="team-status"
                className="block w-full rounded-md border bg-background p-2"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as TeamMemberInput["status"] })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button disabled={save.isPending || !form.name.trim()} type="submit">
                {save.isPending ? "Saving…" : "Save Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <MediaPickerDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        typeFilter="images"
        onSelect={(url, asset) => {
          setForm({ ...form, photoUrl: url, photoAlt: asset.alt || "" });
          setMediaOpen(false);
        }}
      />
    </AdminSidebar>
  );
}
