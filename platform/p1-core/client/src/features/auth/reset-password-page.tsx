import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/reset-password", { token, password });
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    resetMutation.mutate();
  }

  if (!token) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-md px-4 py-24">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Invalid or missing reset link. Please request a new password reset.
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (success) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-md px-4 py-24">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-heading font-semibold" data-testid="text-reset-success">
                Password Reset Successfully
              </h2>
              <p className="text-muted-foreground">You can now log in with your new password.</p>
              <Button onClick={() => navigate("/admin/login")} data-testid="button-go-login">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-24">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-heading">Set New Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resetMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
