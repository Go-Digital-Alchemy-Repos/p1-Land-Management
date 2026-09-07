import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LockKeyhole, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MembershipAccessRule } from "@shared/schema";

interface MembershipAccessRuleCardProps {
  resourceType: "cms_page" | "blog_post";
  resourceId?: string;
  disabled?: boolean;
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MembershipAccessRuleCard({
  resourceType,
  resourceId,
  disabled,
}: MembershipAccessRuleCardProps) {
  const { toast } = useToast();
  const [accessLevel, setAccessLevel] = useState("public");
  const [planIds, setPlanIds] = useState("");
  const [entitlements, setEntitlements] = useState("");
  const [teaser, setTeaser] = useState("");

  const queryKey = ["/api/admin/membership/access-rules", resourceType, resourceId];
  const { data: rule } = useQuery<MembershipAccessRule | null>({
    queryKey,
    queryFn: async () => {
      if (!resourceId) return null;
      const res = await fetch(`/api/admin/membership/access-rules/${resourceType}/${resourceId}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!resourceId,
  });

  useEffect(() => {
    setAccessLevel(rule?.accessLevel ?? "public");
    setPlanIds((rule?.planIds ?? []).join(", "));
    setEntitlements((rule?.entitlements ?? []).join(", "));
    setTeaser(rule?.teaser ?? "");
  }, [rule]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!resourceId) throw new Error("Save this content before configuring membership access.");
      await apiRequest("PUT", `/api/admin/membership/access-rules/${resourceType}/${resourceId}`, {
        accessLevel,
        planIds: splitList(planIds),
        entitlements: splitList(entitlements),
        teaser: teaser || null,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/membership/access-rules"] }),
      ]);
      toast({ title: "Membership access rule saved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save membership access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isDisabled = disabled || !resourceId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LockKeyhole className="h-4 w-4" />
          Membership Access
        </CardTitle>
        <CardDescription>
          Restrict this content by login, active membership, plan IDs, or entitlement keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Access Level</Label>
          <Select value={accessLevel} onValueChange={setAccessLevel} disabled={isDisabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="logged_in">Logged In</SelectItem>
              <SelectItem value="any_member">Any Active Membership</SelectItem>
              <SelectItem value="plans">Specific Plans</SelectItem>
              <SelectItem value="entitlements">Specific Entitlements</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Plan IDs</Label>
          <Input
            value={planIds}
            onChange={(event) => setPlanIds(event.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Entitlements</Label>
          <Input
            value={entitlements}
            onChange={(event) => setEntitlements(event.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Teaser</Label>
          <Textarea
            value={teaser}
            onChange={(event) => setTeaser(event.target.value)}
            disabled={isDisabled}
          />
        </div>
        {!resourceId ? (
          <p className="text-xs text-muted-foreground md:col-span-2">
            Save this content before configuring membership access.
          </p>
        ) : null}
        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={isDisabled || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Access Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
