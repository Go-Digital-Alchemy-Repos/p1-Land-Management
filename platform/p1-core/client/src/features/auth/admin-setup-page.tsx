import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ShieldCheck, Loader2 } from "lucide-react";

const setupSchema = z
  .object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    setupToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetupForm = z.infer<typeof setupSchema>;

export default function AdminSetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: setupStatus, isLoading: statusLoading } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/setup/status"],
  });

  useEffect(() => {
    if (setupStatus && !setupStatus.needsSetup) {
      setLocation("/admin/login");
    }
  }, [setupStatus, setLocation]);

  const requiresToken = !!import.meta.env.VITE_SETUP_TOKEN_REQUIRED;

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      setupToken: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (values: SetupForm) => {
      const res = await apiRequest("POST", "/api/setup/admin", {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        ...(values.setupToken ? { setupToken: values.setupToken } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setup/status"] });
      toast({
        title: "Admin account created",
        description: "You can now sign in with your new admin credentials.",
      });
      setLocation("/admin/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Setup failed",
        description: error.message || "Could not create admin account",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: SetupForm) {
    setupMutation.mutate(values);
  }

  if (statusLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]" data-testid="setup-loading">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (setupStatus && !setupStatus.needsSetup) {
    return null;
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="font-heading text-3xl font-bold" data-testid="text-setup-title">
              Welcome to P1 Land &amp; Property Management
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-setup-subtitle">
              Set up your administrator account to get started
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Admin Account</CardTitle>
              <CardDescription>
                This will be the primary administrator for P1’s website and customer management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                              placeholder="Jane"
                              data-testid="input-setup-first-name"
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
                              data-testid="input-setup-last-name"
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
                            placeholder="admin@yoursite.com"
                            data-testid="input-setup-email"
                            {...field}
                          />
                        </FormControl>
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
                            placeholder="Choose a strong password"
                            data-testid="input-setup-password"
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
                            data-testid="input-setup-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {requiresToken && (
                    <FormField
                      control={form.control}
                      name="setupToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setup Token</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter the setup token"
                              data-testid="input-setup-token"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={setupMutation.isPending}
                    data-testid="button-setup-submit"
                  >
                    {setupMutation.isPending ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Create Admin Account
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
