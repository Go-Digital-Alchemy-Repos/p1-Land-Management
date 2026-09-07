import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/forgot-password", { email });
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    forgotMutation.mutate();
  }

  if (sent) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h2
                  className="text-xl font-heading font-semibold"
                  data-testid="text-forgot-success"
                >
                  Check Your Email
                </h2>
                <p className="text-muted-foreground" data-testid="text-forgot-success-message">
                  If an account with that email exists, a password reset link has been sent. Please
                  check your inbox and spam folder.
                </p>
                <div className="pt-2">
                  <Link href="/admin/login">
                    <Button variant="outline" data-testid="link-back-to-login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold" data-testid="text-forgot-title">
              Forgot Password
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-forgot-subtitle">
              Enter your email and we'll send you a link to reset your password
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-heading">Reset Your Password</CardTitle>
              <CardDescription>
                We'll email you a secure link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotMutation.isPending || !email}
                  data-testid="button-send-reset"
                >
                  {forgotMutation.isPending ? (
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/admin/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-back-to-login-form"
                >
                  <span className="inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Back to Login
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
