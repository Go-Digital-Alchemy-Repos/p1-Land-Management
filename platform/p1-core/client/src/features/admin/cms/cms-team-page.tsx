import {
  TeamListPresentation,
  TeamEditorPresentation,
} from "@/components/shared/team-admin-presentation";
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

const teamUI = {
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Card,
  CardContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};

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
      <TeamListPresentation
        ui={teamUI}
        members={members}
        filtered={filtered}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        onEdit={openEditor}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
      />
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !save.isPending) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <TeamEditorPresentation
            ui={teamUI}
            isNew={editing === "new"}
            form={form}
            setForm={setForm}
            busy={save.isPending}
            disabled={save.isPending}
            onSave={() => save.mutate()}
            onClose={() => setEditing(null)}
            photo={
              <>
                {" "}
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
              </>
            }
            biography={
              <>
                {" "}
                <CmsRichTextEditor
                  value={form.biography}
                  onChange={(biography) => setForm((current) => ({ ...current, biography }))}
                  placeholder="Shown when visitors open the member’s biography"
                  data-testid="team-biography-editor"
                />
              </>
            }
          />
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
