import { FederationPanel, useFederationStatus } from "./federation-panel";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { LogIn } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LegacyLoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function redirectByRole(role: string) {
    if (role === "admin") {
      setLocation("/admin");
    } else if (role === "therapist") {
      setLocation("/therapist");
    } else {
      setLocation("/");
    }
  }

  async function onSubmit(values: LoginForm) {
    login.mutate(values, {
      onSuccess: (data) => {
        toast({ title: "Welcome back!", description: "You have been logged in." });
        redirectByRole(data.role);
      },
      onError: (error: Error) => {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      },
    });
  }

  const isPending = login.isPending;

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold" data-testid="text-login-title">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-login-subtitle">
              Sign in to P1 Land &amp; Property Management
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            data-testid="input-email"
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
                            placeholder="Enter your password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Link
                      href="/admin/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-forgot-password"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    data-testid="button-login"
                  >
                    {isPending ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {import.meta.env.DEV && (
            <Card className="border-dashed border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Dev Test Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  type="button"
                  className="w-full rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/30 px-3 py-2 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  data-testid="button-fill-client"
                  onClick={() => {
                    form.setValue("email", "client@test.com");
                    form.setValue("password", "Client123!");
                  }}
                >
                  <span className="font-medium text-amber-800 dark:text-amber-300">Customer</span>
                  <span className="ml-2 text-muted-foreground">client@test.com / Client123!</span>
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/30 px-3 py-2 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  data-testid="button-fill-therapist"
                  onClick={() => {
                    form.setValue("email", "therapist@test.com");
                    form.setValue("password", "Therapist123!");
                  }}
                >
                  <span className="font-medium text-amber-800 dark:text-amber-300">Therapist</span>
                  <span className="ml-2 text-muted-foreground">
                    therapist@test.com / Therapist123!
                  </span>
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/30 px-3 py-2 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  data-testid="button-fill-admin"
                  onClick={() => {
                    form.setValue("email", "admin@coreplatform.com");
                    form.setValue("password", "Admin123!");
                  }}
                >
                  <span className="font-medium text-amber-800 dark:text-amber-300">Admin</span>
                  <span className="ml-2 text-muted-foreground">
                    admin@coreplatform.com / Admin123!
                  </span>
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function LoginPage(){
 const status=useFederationStatus();
 if(status.isLoading)return <p role="status">Loading sign-in options…</p>;
 if(status.error)return <p role="alert">Sign-in options are temporarily unavailable. Refresh to try again.</p>;
 return status.data?.enabled ? <FederationPanel/> : <LegacyLoginPage/>;
}
