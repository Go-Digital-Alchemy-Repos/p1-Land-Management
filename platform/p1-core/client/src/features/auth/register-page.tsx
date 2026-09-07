import { useLocation } from "wouter";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useSpecializations } from "@/hooks/use-specializations";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    specializations: z.array(z.string()).optional(),
    ageAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "You must confirm you are 18 or older" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const { specializations: specList } = useSpecializations();

  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      specializations: [],
      ageAcknowledged: undefined as unknown as true,
    },
  });

  function redirectByRole(role: string) {
    if (redirectTo) {
      setLocation(redirectTo);
      return;
    }
    if (role === "admin") {
      setLocation("/admin");
    } else if (role === "therapist") {
      setLocation("/therapist");
    } else {
      setLocation("/");
    }
  }

  async function onSubmit(values: RegisterForm) {
    const {
      confirmPassword: _confirmPassword,
      specializations,
      ageAcknowledged: _ageAcknowledged,
      ...rest
    } = values;
    const data = {
      ...rest,
      role: "therapist" as const,
      ...(specializations && specializations.length > 0 ? { specializations } : {}),
    };
    register.mutate(data, {
      onSuccess: (result) => {
        toast({ title: "Account created!", description: "Welcome to Core Platform." });
        redirectByRole(result.role);
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
    <PageLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full space-y-6 max-w-lg">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold" data-testid="text-register-title">
              Create an Account
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-register-subtitle">
              Join the Core Platform community
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Register</CardTitle>
              <CardDescription>Fill in your details to get started</CardDescription>
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
                            <Input placeholder="John" data-testid="input-first-name" {...field} />
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
                            <Input placeholder="Doe" data-testid="input-last-name" {...field} />
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
                    name="specializations"
                    render={() => (
                      <FormItem>
                        <FormLabel>Specializations</FormLabel>
                        <p className="text-xs text-muted-foreground mb-2">
                          Select all that apply. You can update these later from your profile.
                        </p>
                        <div
                          className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto border rounded-md p-3"
                          data-testid="checkbox-group-specializations"
                        >
                          {specList.map(({ name: spec }) => {
                            const current = form.getValues("specializations") || [];
                            const isChecked = current.includes(spec);
                            return (
                              <div key={spec} className="flex items-center gap-2">
                                <Checkbox
                                  id={`reg-spec-${spec}`}
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
                                  data-testid={`checkbox-spec-${spec.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                />
                                <Label
                                  htmlFor={`reg-spec-${spec}`}
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
                            data-testid="input-password"
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
                            data-testid="input-confirm-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">Required Acknowledgments</p>

                    <FormField
                      control={form.control}
                      name="ageAcknowledged"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true ? true : undefined)
                              }
                              data-testid="checkbox-age-acknowledgment"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I confirm that I am 18 years of age or older
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    data-testid="button-register"
                  >
                    {isPending ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Create Account
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/admin/login" className="text-accent underline" data-testid="link-login">
                  Sign in here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
