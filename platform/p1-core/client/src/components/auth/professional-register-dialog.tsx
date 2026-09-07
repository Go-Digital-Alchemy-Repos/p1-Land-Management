import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSpecializations } from "@/hooks/use-specializations";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserPlus } from "lucide-react";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    specializations: z.array(z.string()).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function ProfessionalRegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const { specializations: specList } = useSpecializations();
  const { settings: directorySettings } = useDirectorySettings();
  const listingLabel =
    directorySettings.listingLabelSingular ||
    directorySettings.participantLabelSingular ||
    "Directory Profile";
  const specialtyLabel = directorySettings.specialtyLabelPlural || "Categories";

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      specializations: [],
    },
  });

  async function onSubmit(values: RegisterForm) {
    const { confirmPassword: _confirmPassword, specializations, ...rest } = values;
    const data = {
      ...rest,
      role: "therapist" as const,
      ...(specializations && specializations.length > 0 ? { specializations } : {}),
    };
    register.mutate(data, {
      onSuccess: () => {
        toast({ title: "Application submitted!", description: "Welcome to Core Platform." });
        onOpenChange(false);
        setLocation("/therapist");
      },
      onError: (error: Error) => {
        toast({
          title: "Registration failed",
          description: error.message || "Could not create account",
          variant: "destructive",
        });
      },
    });
  }

  const isPending = register.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listingLabel} Registration</DialogTitle>
          <DialogDescription>
            Fill in your basic details to register. Once your account is created, you can apply to
            be listed in the directory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        data-testid="input-professional-first-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        data-testid="input-professional-last-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      data-testid="input-professional-email"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription data-testid="text-email-privacy-note">
                    Your email will remain hidden and private at all times from the public.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specializations"
              render={() => (
                <FormItem>
                  <FormLabel>{specialtyLabel}</FormLabel>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select all that apply. You can update these later from your profile.
                  </p>
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto border rounded-md p-3"
                    data-testid="checkbox-group-professional-specializations"
                  >
                    {specList.map(({ name: spec }) => {
                      const current = form.getValues("specializations") || [];
                      const isChecked = current.includes(spec);
                      return (
                        <div key={spec} className="flex items-center gap-2">
                          <Checkbox
                            id={`professional-spec-${spec}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const prev = form.getValues("specializations") || [];
                              if (checked) {
                                form.setValue("specializations", [...prev, spec], {
                                  shouldDirty: true,
                                });
                              } else {
                                form.setValue(
                                  "specializations",
                                  prev.filter((s) => s !== spec),
                                  { shouldDirty: true },
                                );
                              }
                            }}
                            data-testid={`checkbox-professional-spec-${spec.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          />
                          <Label
                            htmlFor={`professional-spec-${spec}`}
                            className="text-xs font-normal cursor-pointer leading-tight"
                          >
                            {spec}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      data-testid="input-professional-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter your password"
                      data-testid="input-professional-confirm-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-professional-register"
            >
              {isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Submit Application
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
