import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@shared/schema";
import { AdminPermission } from "@shared/types";
import {
  Plus,
  Search,
  KeyRound,
  Trash2,
  Mail,
  MoreHorizontal,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Shield,
  PanelsTopLeft,
  Palette,
  FolderKanban,
  UserRound,
} from "lucide-react";

type SafeUser = Omit<User, "password"> & { country?: string | null };
type ActiveForm = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  editor: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
};

const EDITOR_PERMISSION_OPTIONS = [
  {
    value: AdminPermission.DIRECTORY,
    label: "Directory",
    description: "Profiles, applications, specializations, and directory settings.",
    icon: PanelsTopLeft,
  },
  {
    value: AdminPermission.CONTENT,
    label: "Content",
    description: "Pages, media, forms, events, blog, and SEO tools.",
    icon: FolderKanban,
  },
  {
    value: AdminPermission.DESIGN,
    label: "Design",
    description: "Branding, typography, menus, sidebars, and reusable sections.",
    icon: Palette,
  },
  {
    value: AdminPermission.CRM,
    label: "CRM",
    description: "Pipeline, leads, notes, and follow-up tasks.",
    icon: FolderKanban,
  },
] as const;

const SYSTEM_ROLE_OPTIONS = [
  {
    value: "admin" as const,
    label: "System Admin",
    description: "Full access to every admin tool, including System settings.",
    icon: ShieldCheck,
  },
  {
    value: "editor" as const,
    label: "Editor",
    description: "Access only to the Directory, Content, and Design areas you assign.",
    icon: FolderKanban,
  },
] as const;

function displayRole(role: string): string {
  if (role === "admin") return "System Admin";
  if (role === "editor") return "Editor";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function summarizePermissions(user: SafeUser) {
  if (user.role === "admin") return "Full system access";
  const permissions = Array.isArray(user.adminPermissions) ? user.adminPermissions : [];
  if (permissions.length === 0) return "No tool groups assigned";

  return permissions
    .map(
      (permission) =>
        EDITOR_PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ??
        permission,
    )
    .join(", ");
}

function SystemRoleSelector({
  role,
  onChange,
  testIdPrefix = "role",
}: {
  role: "admin" | "editor";
  onChange: (role: "admin" | "editor") => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="System role">
      {SYSTEM_ROLE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = role === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            data-testid={`${testIdPrefix}-${option.value}`}
            className={[
              "rounded-lg border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:bg-muted/30",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{option.label}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <UsersContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function UsersContent() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<SafeUser | null>(null);

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });

  const { data: forms = [] } = useQuery<ActiveForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });

  const activeForms = useMemo(() => forms.filter((form) => form.isActive), [forms]);

  const filtered = users?.filter((user) => {
    const matchesSearch =
      !search ||
      `${user.firstName ?? ""} ${user.lastName ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-users-title">
            User Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage admin and editor accounts used to operate the platform. Directory members are
            managed separately in the Directory app.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-user">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          data-testid="input-search-users"
        />
      </div>

      <div className="rounded-lg border">
        <Table data-testid="table-users">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((user) => (
              <TableRow
                key={user.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid={`row-user-${user.id}`}
                onClick={() => setDetailUser(user)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setDetailUser(user);
                  }
                }}
              >
                <TableCell data-testid={`text-user-name-${user.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"}
                    </span>
                    {user.isSuspended && (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs"
                      >
                        Suspended
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell data-testid={`text-user-email-${user.id}`}>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[user.role] || ""}
                    data-testid={`badge-role-${user.id}`}
                  >
                    {displayRole(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {summarizePermissions(user)}
                </TableCell>
                <TableCell data-testid={`text-user-created-${user.id}`}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailUser(user);
                    }}
                    data-testid={`button-actions-${user.id}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!filtered || filtered.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} activeForms={activeForms} />
      <UserDetailSheet
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onUserUpdated={setDetailUser}
        activeForms={activeForms}
      />
    </div>
  );
}

function EditorPermissionsPanel({
  permissions,
  onToggle,
}: {
  permissions: string[];
  onToggle: (permission: string) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <Label className="text-sm font-medium">Editor Permissions</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Choose which primary admin tool groups this editor can access.
        </p>
      </div>
      <div className="space-y-3">
        {EDITOR_PERMISSION_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
            >
              <Checkbox
                checked={permissions.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
                data-testid={`checkbox-permission-${option.value}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FormNotificationPanel({
  selectedFormIds,
  onToggle,
  activeForms,
}: {
  selectedFormIds: string[];
  onToggle: (formId: string) => void;
  activeForms: ActiveForm[];
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <Label className="text-sm font-medium">Email Notification Settings</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Select which forms you'd like this user to receive notifications from.
        </p>
      </div>
      {activeForms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active forms are available yet.</p>
      ) : (
        <div className="space-y-3">
          {activeForms.map((form) => (
            <label
              key={form.id}
              className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
            >
              <Checkbox
                checked={selectedFormIds.includes(form.id)}
                onCheckedChange={() => onToggle(form.id)}
                data-testid={`checkbox-form-notification-${form.slug}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{form.name}</span>
                  {form.isSystem && (
                    <Badge variant="outline" className="text-[10px]">
                      System
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Slug: {form.slug}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateUserSheet({
  open,
  onOpenChange,
  activeForms,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeForms: ActiveForm[];
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [adminPermissions, setAdminPermissions] = useState<string[]>([AdminPermission.CONTENT]);
  const [formNotificationFormIds, setFormNotificationFormIds] = useState<string[]>([]);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("editor");
    setAdminPermissions([AdminPermission.CONTENT]);
    setFormNotificationFormIds([]);
    setSendWelcome(true);
    setShowPassword(false);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/users", {
        email,
        password,
        firstName,
        lastName,
        role,
        adminPermissions,
        formNotificationFormIds,
        sendWelcomeEmail: sendWelcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "System user created successfully" });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <SheetTitle className="font-heading">Create System User</SheetTitle>
          <SheetDescription>
            Add a new admin or editor account for platform operations.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form
            id="create-user-form"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-first">First Name</Label>
                <Input
                  id="create-first"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  data-testid="input-create-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last">Last Name</Label>
                <Input
                  id="create-last"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  data-testid="input-create-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                data-testid="input-create-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  data-testid="input-create-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div>
                <Label htmlFor="create-role" className="text-sm font-medium">
                  System Role
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Admins have full platform access. Editors are limited to the tool groups you
                  choose below.
                </p>
              </div>
              <SystemRoleSelector role={role} onChange={setRole} testIdPrefix="create-role" />
            </div>

            {role === "editor" ? (
              <EditorPermissionsPanel
                permissions={adminPermissions}
                onToggle={(permission) =>
                  setAdminPermissions((current) => toggleValue(current, permission))
                }
              />
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    System Admins can access every admin tool group, including System settings.
                  </p>
                </div>
              </div>
            )}

            <FormNotificationPanel
              selectedFormIds={formNotificationFormIds}
              onToggle={(formId) =>
                setFormNotificationFormIds((current) => toggleValue(current, formId))
              }
              activeForms={activeForms}
            />

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="send-welcome" className="text-sm font-medium">
                    Send welcome email
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email the new user their login details and a quick start link.
                  </p>
                </div>
                <Switch
                  id="send-welcome"
                  checked={sendWelcome}
                  onCheckedChange={setSendWelcome}
                  data-testid="switch-send-welcome"
                />
              </div>
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-create"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            disabled={createMutation.isPending}
            data-testid="button-submit-create"
          >
            {createMutation.isPending ? "Creating..." : "Create System User"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function UserDetailSheet({
  user,
  onClose,
  onUserUpdated,
  activeForms,
}: {
  user: SafeUser | null;
  onClose: () => void;
  onUserUpdated: (user: SafeUser | null) => void;
  activeForms: ActiveForm[];
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [formNotificationFormIds, setFormNotificationFormIds] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email);
    setRole(user.role === "admin" ? "admin" : "editor");
    setAdminPermissions(Array.isArray(user.adminPermissions) ? user.adminPermissions : []);
    setFormNotificationFormIds(
      Array.isArray(user.formNotificationFormIds) ? user.formNotificationFormIds : [],
    );
    setNewPassword("");
    setShowPassword(false);
    setActiveTab("profile");
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/admin/users/${user!.id}`, {
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        role,
        adminPermissions,
        formNotificationFormIds,
      });
      return response.json();
    },
    onSuccess: (updated: SafeUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "System user updated successfully" });
      onUserUpdated(updated);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setNewPassword("");
      setShowPassword(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/reset-password`, {});
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: `Reset link sent to ${user?.email}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/admin/users/${user!.id}/suspend`);
      return response.json();
    },
    onSuccess: (updated: SafeUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      const action = updated.isSuspended ? "suspended" : "reactivated";
      toast({
        title: `Account ${action}`,
        description: `${user?.firstName} ${user?.lastName}'s account has been ${action}.`,
      });
      onUserUpdated({ ...updated });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/users/${user!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "System user deleted" });
      setDeleteConfirmOpen(false);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const fullName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "";

  return (
    <>
      <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" size="default">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="font-heading" data-testid="text-detail-name">
                  {fullName}
                </SheetTitle>
                <SheetDescription data-testid="text-detail-email">{user?.email}</SheetDescription>
              </div>
              {user && (
                <div className="flex flex-col items-end gap-1 pt-1">
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[user.role] || ""}
                    data-testid="badge-detail-role"
                  >
                    {displayRole(user.role)}
                  </Badge>
                  {user.isSuspended && (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs"
                    >
                      Suspended
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          <SheetBody>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="profile" className="flex-1" data-testid="tab-detail-profile">
                  <UserRound className="mr-1.5 h-4 w-4 text-blue-600" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="flex-1" data-testid="tab-detail-security">
                  <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Access &amp; Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-0">
                {user && (
                  <form
                    id="detail-profile-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="detail-first">First Name</Label>
                        <Input
                          id="detail-first"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          data-testid="input-detail-first-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="detail-last">Last Name</Label>
                        <Input
                          id="detail-last"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          data-testid="input-detail-last-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-email">Email</Label>
                      <Input
                        id="detail-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        data-testid="input-detail-email"
                      />
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <div>
                        <Label htmlFor="detail-role" className="text-sm font-medium">
                          System Role
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Editors can only access the tool groups you assign here. System remains
                          admin-only.
                        </p>
                      </div>
                      <SystemRoleSelector
                        role={role}
                        onChange={setRole}
                        testIdPrefix="detail-role"
                      />
                    </div>

                    {role === "editor" ? (
                      <EditorPermissionsPanel
                        permissions={adminPermissions}
                        onToggle={(permission) =>
                          setAdminPermissions((current) => toggleValue(current, permission))
                        }
                      />
                    ) : (
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">
                            System Admins always have full platform access, including the System
                            tool group.
                          </p>
                        </div>
                      </div>
                    )}

                    <FormNotificationPanel
                      selectedFormIds={formNotificationFormIds}
                      onToggle={(formId) =>
                        setFormNotificationFormIds((current) => toggleValue(current, formId))
                      }
                      activeForms={activeForms}
                    />
                  </form>
                )}
              </TabsContent>

              <TabsContent value="security" className="mt-0 space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">Reset Password</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a new password directly for this account.
                  </p>
                  <form
                    id="detail-reset-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      resetPasswordMutation.mutate();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="New password (min 6 chars)"
                        minLength={6}
                        required
                        data-testid="input-detail-new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={resetPasswordMutation.isPending || !newPassword.trim()}
                      data-testid="button-detail-reset-password"
                    >
                      {resetPasswordMutation.isPending ? "Saving..." : "Set"}
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">Send Reset Email</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email a password reset link to{" "}
                    <span className="font-medium">{user?.email}</span>.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendResetLinkMutation.mutate()}
                    disabled={sendResetLinkMutation.isPending}
                    data-testid="button-detail-send-reset-link"
                  >
                    {sendResetLinkMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {user?.isSuspended ? (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-medium text-sm">Suspend Account</h3>
                    </div>
                    <Switch
                      checked={user?.isSuspended ?? false}
                      onCheckedChange={() => suspendMutation.mutate()}
                      disabled={suspendMutation.isPending}
                      data-testid="switch-suspend-account"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user?.isSuspended
                      ? "This system user is suspended and can no longer log in."
                      : "Suspending this system user will prevent them from logging in."}
                  </p>
                </div>

                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="font-medium text-sm text-destructive">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this system account. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                    data-testid="button-detail-delete"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </SheetBody>

          {activeTab === "profile" && (
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-detail-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="detail-profile-form"
                disabled={updateMutation.isPending}
                data-testid="button-detail-save"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{fullName}</strong> ({user?.email}
              )? This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
