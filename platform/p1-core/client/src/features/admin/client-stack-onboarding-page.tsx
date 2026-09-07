import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClipboardCheck, Globe2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type RecordType = "A" | "AAAA" | "ALIAS" | "ANAME" | "CNAME";
type ReadinessState = "pass" | "pending" | "fail";

interface DomainPlan {
  stackId: string;
  publicOrigin: string;
  adminOrigin: string;
  records: Array<{ fqdn: string; type: RecordType; value: string }>;
  manualInstructions: string[];
  rollbackInstructions: string[];
  requiredVerification: string[];
}

const readinessLabels: Record<string, string> = {
  ownership: "Domain ownership",
  authoritativeDns: "Authoritative DNS",
  certificate: "HTTPS certificate",
  publicRouting: "Public routing",
  adminRouting: "Admin routing",
  sameOriginApi: "Same-origin /api behavior",
  applicationHealth: "Application readiness",
  canonicalRedirect: "Canonical redirect",
  rollbackPlan: "Rollback plan",
};

export default function ClientStackOnboardingPage() {
  const { toast } = useToast();
  const [stackId, setStackId] = useState("");
  const [publicDomain, setPublicDomain] = useState("");
  const [adminDomain, setAdminDomain] = useState("");
  const [canonicalHost, setCanonicalHost] = useState<"apex" | "www">("www");
  const [publicTarget, setPublicTarget] = useState("");
  const [adminTarget, setAdminTarget] = useState("");
  const [dnsOperator, setDnsOperator] = useState("");
  const [launchOwner, setLaunchOwner] = useState("");
  const [apexRecordType, setApexRecordType] = useState<RecordType>("ALIAS");
  const [plan, setPlan] = useState<DomainPlan | null>(null);
  const [readiness, setReadiness] = useState<Record<string, ReadinessState>>(
    Object.fromEntries(Object.keys(readinessLabels).map((key) => [key, "pending"])),
  );
  const [readinessResult, setReadinessResult] = useState<{
    status: string;
    pending: string[];
    failed: string[];
  } | null>(null);
  const [dnsVerification, setDnsVerification] = useState<{
    status: string;
    records: Array<{
      fqdn: string;
      type: RecordType;
      expectedValue: string;
      status: "passed" | "pending" | "failed" | "manual-review";
      observedValues: string[];
      message: string;
    }>;
  } | null>(null);
  const [evidenceRecords, setEvidenceRecords] = useState<
    Array<{ id: string; kind: string; recordedAt: string; recordedByUserId: string | null }>
  >([]);

  const planMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/client-stack-onboarding/domain-plan", {
        stackId,
        publicDomain,
        adminDomain,
        canonicalHost,
        publicRecords: [
          {
            host: "@",
            type: apexRecordType,
            value: publicTarget,
            ttl: 300,
            proxyMode: "provider-managed",
          },
          {
            host: "www",
            type: "CNAME",
            value: publicTarget,
            ttl: 300,
            proxyMode: "provider-managed",
          },
        ],
        adminRecord: { type: "CNAME", value: adminTarget, ttl: 300, proxyMode: "dns-only" },
        dnsOperator,
        launchOwner,
        routingMode: "same-origin-proxy",
      });
      return response.json() as Promise<DomainPlan>;
    },
    onSuccess: (result) => {
      setPlan(result);
      setReadinessResult(null);
      setDnsVerification(null);
      setEvidenceRecords([]);
    },
    onError: (error: Error) =>
      toast({
        title: "Could not generate the domain plan",
        description: error.message,
        variant: "destructive",
      }),
  });

  const readinessMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Generate the domain plan before evaluating readiness.");
      const response = await apiRequest("POST", "/api/admin/client-stack-onboarding/readiness", {
        stackId: plan.stackId,
        checks: readiness,
      });
      return response.json() as Promise<{ status: string; pending: string[]; failed: string[] }>;
    },
    onSuccess: setReadinessResult,
    onError: (error: Error) =>
      toast({
        title: "Could not evaluate readiness",
        description: error.message,
        variant: "destructive",
      }),
  });

  const dnsVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Generate the domain plan before verification.");
      const response = await apiRequest(
        "POST",
        "/api/admin/client-stack-onboarding/dns-verification",
        {
          stackId: plan.stackId,
          records: plan.records,
        },
      );
      return response.json() as Promise<NonNullable<typeof dnsVerification>>;
    },
    onSuccess: setDnsVerification,
    onError: (error: Error) =>
      toast({
        title: "Could not verify DNS propagation",
        description: error.message,
        variant: "destructive",
      }),
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Generate the domain plan before loading saved evidence.");
      const response = await apiRequest(
        "GET",
        `/api/admin/client-stack-onboarding/${encodeURIComponent(plan.stackId)}/evidence`,
      );
      return response.json() as Promise<typeof evidenceRecords>;
    },
    onSuccess: setEvidenceRecords,
    onError: (error: Error) =>
      toast({
        title: "Could not load onboarding evidence",
        description: error.message,
        variant: "destructive",
      }),
  });

  const generatePlan = (event: FormEvent) => {
    event.preventDefault();
    planMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Globe2 className="h-6 w-6" /> Client stack onboarding
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a manual DNS plan and record read-only launch evidence. This workflow never
          requests provider credentials or changes DNS.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>1. Domain plan</CardTitle>
          <CardDescription>
            Enter the approved names and hosting targets. Record the current DNS values with the
            provider before applying this plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={generatePlan}>
            <Field
              label="Client stack ID"
              value={stackId}
              onChange={setStackId}
              placeholder="better-farms-foundation"
            />
            <Field
              label="Public apex domain"
              value={publicDomain}
              onChange={setPublicDomain}
              placeholder="betterfarms.org"
            />
            <Field
              label="Protected admin domain"
              value={adminDomain}
              onChange={setAdminDomain}
              placeholder="admin.betterfarms.org"
            />
            <Field
              label="Public-site target"
              value={publicTarget}
              onChange={setPublicTarget}
              placeholder="sites.example-host.com"
            />
            <Field
              label="Admin/backend target"
              value={adminTarget}
              onChange={setAdminTarget}
              placeholder="core-platform.up.railway.app"
            />
            <Field
              label="Manual DNS operator"
              value={dnsOperator}
              onChange={setDnsOperator}
              placeholder="Named operator"
            />
            <Field
              label="Launch owner"
              value={launchOwner}
              onChange={setLaunchOwner}
              placeholder="Named approver"
            />
            <div className="space-y-2">
              <Label>Apex record type</Label>
              <Select
                value={apexRecordType}
                onValueChange={(value) => setApexRecordType(value as RecordType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A", "AAAA", "ALIAS", "ANAME"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canonical public host</Label>
              <RadioGroup
                className="flex gap-5 pt-2"
                value={canonicalHost}
                onValueChange={(value) => setCanonicalHost(value as "apex" | "www")}
              >
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="apex" />
                  Apex
                </label>
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="www" />
                  www
                </label>
              </RadioGroup>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={planMutation.isPending}>
                {planMutation.isPending ? "Generating…" : "Generate manual plan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>Generated instructions</CardTitle>
            <CardDescription>
              Public origin: {plan.publicOrigin} · Admin origin: {plan.adminOrigin}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <InstructionList title="Manual DNS instructions" items={plan.manualInstructions} />
            <InstructionList title="Rollback preparation" items={plan.rollbackInstructions} />
            <InstructionList title="Required verification" items={plan.requiredVerification} />
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <h3 className="font-medium">Read-only DNS propagation check</h3>
                <p className="mt-1 text-muted-foreground">
                  Queries public DNS only. It never sends provider credentials or changes records.
                  ALIAS and ANAME records require provider read-only evidence because they are not
                  standard DNS types.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => dnsVerificationMutation.mutate()}
                disabled={dnsVerificationMutation.isPending}
              >
                {dnsVerificationMutation.isPending ? "Verifying DNS…" : "Verify published DNS"}
              </Button>
              <Button
                variant="outline"
                onClick={() => evidenceMutation.mutate()}
                disabled={evidenceMutation.isPending}
              >
                {evidenceMutation.isPending ? "Loading evidence…" : "View recorded evidence"}
              </Button>
              {dnsVerification && (
                <div className="space-y-2">
                  <p className="font-medium">
                    DNS status:{" "}
                    {dnsVerification.status === "ready" ? "ready" : dnsVerification.status}
                  </p>
                  {dnsVerification.records.map((record) => (
                    <div className="rounded border p-3" key={`${record.fqdn}-${record.type}`}>
                      <p className="font-medium">
                        {record.fqdn} {record.type}: {record.status}
                      </p>
                      <p className="text-muted-foreground">{record.message}</p>
                      {record.observedValues.length > 0 && (
                        <p className="text-muted-foreground">
                          Observed: {record.observedValues.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {evidenceRecords.length > 0 && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Recorded evidence</p>
                  {evidenceRecords.map((record) => (
                    <p key={record.id}>
                      {record.kind.replaceAll("_", " ")} —{" "}
                      {new Date(record.recordedAt).toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              2. Record read-only readiness evidence
            </CardTitle>
            <CardDescription>
              Set each observed check after the DNS operator completes their verification. Pending
              does not authorize a cutover.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(readinessLabels).map(([key, label]) => (
              <div
                className="flex flex-col justify-between gap-2 border-b pb-3 sm:flex-row sm:items-center"
                key={key}
              >
                <Label>{label}</Label>
                <Select
                  value={readiness[key]}
                  onValueChange={(value) =>
                    setReadiness((current) => ({ ...current, [key]: value as ReadinessState }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button
              onClick={() => readinessMutation.mutate()}
              disabled={readinessMutation.isPending}
            >
              {readinessMutation.isPending ? "Evaluating…" : "Evaluate release readiness"}
            </Button>
            {readinessResult && (
              <div
                className={
                  readinessResult.status === "ready"
                    ? "rounded-md bg-emerald-50 p-3 text-emerald-900"
                    : "rounded-md bg-amber-50 p-3 text-amber-900"
                }
              >
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Status: {readinessResult.status}
                </div>
                {readinessResult.pending.length > 0 && (
                  <p className="mt-1">Pending: {readinessResult.pending.join(", ")}</p>
                )}
                {readinessResult.failed.length > 0 && (
                  <p className="mt-1">Blocked: {readinessResult.failed.join(", ")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
      />
    </div>
  );
}

function InstructionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="font-medium">{title}</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
