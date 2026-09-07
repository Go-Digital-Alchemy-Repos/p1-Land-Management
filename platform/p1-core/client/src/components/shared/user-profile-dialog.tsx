import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { AvatarUpload } from "@/components/shared/avatar-upload";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
      passwordForm.reset();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [open, user]);

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PUT", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update profile",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      passwordForm.reset();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to change password",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2" data-testid="text-profile-title">
            <User className="h-5 w-5" />
            My Profile
          </SheetTitle>
          <SheetDescription className="sr-only">Edit your profile and password</SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="flex flex-col items-center gap-3 py-2">
            <AvatarUpload
              currentImageUrl={user.profileImageUrl}
              fallbackInitials={`${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`}
              size="lg"
            />
            <div className="text-center">
              <p className="font-medium text-sm" data-testid="text-profile-name">
                {user.firstName} {user.lastName}
              </p>
              <Badge
                variant="outline"
                className="text-xs capitalize"
                data-testid="badge-profile-role"
              >
                {user.role}
              </Badge>
            </div>
          </div>

          <Separator />

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
              className="space-y-3"
            >
              <div className="flex gap-3">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-profile-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-profile-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-profile-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="sm"
                disabled={profileMutation.isPending}
                data-testid="button-save-profile"
              >
                {profileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Profile
              </Button>
            </form>
          </Form>

          <Separator />

          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4" />
              Change Password
            </h4>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}
                className="space-y-3"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            {...field}
                            data-testid="input-current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            data-testid="button-toggle-current-password"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            {...field}
                            data-testid="input-new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            data-testid="button-toggle-new-password"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={passwordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </form>
            </Form>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
