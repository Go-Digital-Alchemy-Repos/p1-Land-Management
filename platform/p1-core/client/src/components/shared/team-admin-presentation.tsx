import type { ComponentType, ReactNode, Dispatch, SetStateAction } from "react";
import { Plus, Pencil, Users } from "lucide-react";
export interface TeamEditorValue {
  name: string;
  role: string;
  biography: string;
  excerpt: string;
  photoUrl: string;
  photoAlt: string;
  status: "draft" | "published" | "archived";
}
export interface TeamPresentationUI {
  Button: ComponentType<any>;
  Input: ComponentType<any>;
  Textarea: ComponentType<any>;
  Label: ComponentType<any>;
  Badge: ComponentType<any>;
  Card: ComponentType<any>;
  CardContent: ComponentType<any>;
  DialogHeader: ComponentType<any>;
  DialogTitle: ComponentType<any>;
  DialogDescription: ComponentType<any>;
}
export function TeamListPresentation<
  T extends Omit<TeamEditorValue, "status"> & { id: string; status: string },
>({
  ui,
  members,
  filtered,
  search,
  status,
  onSearch,
  onStatus,
  onEdit,
  isLoading,
  isError,
  error,
  onRetry,
  imageUrl = (value) => value || undefined,
}: {
  ui: TeamPresentationUI;
  members: T[];
  filtered: T[];
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onEdit: (member: T | "new") => void;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  onRetry: () => void;
  imageUrl?: (value: string) => string | undefined;
}) {
  const { Button, Input, Badge, Card, CardContent } = ui;
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Team</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the people featured on your website. Add the Team reusable section to any page to
            select members and a layout.
          </p>
        </div>
        <Button onClick={() => onEdit("new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search team members"
          placeholder="Search by name or role"
          value={search}
          onChange={(event: { target: { value: string } }) => onSearch(event.target.value)}
          className="max-w-sm"
        />
        <select
          aria-label="Filter by status"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(event) => onStatus(event.target.value)}
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
          {error || "Could not load team members."}{" "}
          <Button variant="outline" onClick={onRetry}>
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
                {imageUrl(member.photoUrl) ? (
                  <img
                    src={imageUrl(member.photoUrl)}
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
                      onClick={() => onEdit(member)}
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
  );
}
export function TeamEditorPresentation({
  ui,
  isNew,
  form,
  setForm,
  busy,
  disabled,
  photo,
  biography,
  notice,
  onSave,
  onClose,
}: {
  ui: TeamPresentationUI;
  isNew: boolean;
  form: TeamEditorValue;
  setForm: Dispatch<SetStateAction<TeamEditorValue>>;
  busy: boolean;
  disabled: boolean;
  photo: ReactNode;
  biography: ReactNode;
  notice?: ReactNode;
  onSave: () => void;
  onClose: () => void;
}) {
  const { Button, Input, Textarea, Label, DialogHeader, DialogTitle, DialogDescription } = ui;
  return (
    <>
      {" "}
      <DialogHeader>
        <DialogTitle>{isNew ? "Add Team Member" : "Edit Team Member"}</DialogTitle>
        <DialogDescription>
          Published members can appear in Team sections. Archive a member to remove them from public
          sections while keeping their record.
        </DialogDescription>
      </DialogHeader>
      {notice}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <fieldset
          disabled={disabled}
          ref={(node) => {
            node?.toggleAttribute("inert", disabled);
          }}
          className="space-y-4 m-0 p-0 border-0 min-w-0"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                required
                maxLength={160}
                value={form.name}
                onChange={(e: { target: { value: string } }) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-role">Role / title</Label>
              <Input
                id="team-role"
                maxLength={240}
                value={form.role}
                onChange={(e: { target: { value: string } }) =>
                  setForm({ ...form, role: e.target.value })
                }
              />
            </div>
          </div>
          {photo}
          <div className="space-y-2">
            <Label htmlFor="team-alt">Photo description</Label>
            <Input
              id="team-alt"
              maxLength={300}
              value={form.photoAlt}
              onChange={(e: { target: { value: string } }) =>
                setForm({ ...form, photoAlt: e.target.value })
              }
              placeholder="Defaults to the member’s name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-excerpt">Bio excerpt</Label>
            <Textarea
              id="team-excerpt"
              maxLength={1000}
              value={form.excerpt}
              onChange={(e: { target: { value: string } }) =>
                setForm({ ...form, excerpt: e.target.value })
              }
              placeholder="Optional short introduction; otherwise generated from the biography"
            />
          </div>
          <div className="space-y-2">
            <Label>Full biography</Label>
            {biography}
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-status">Status</Label>
            <select
              id="team-status"
              className="block w-full rounded-md border bg-background p-2"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TeamEditorValue["status"] })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={disabled || !form.name.trim()} type="submit">
            {busy ? "Saving…" : "Save Member"}
          </Button>
        </div>
      </form>
    </>
  );
}
