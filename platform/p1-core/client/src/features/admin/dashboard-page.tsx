import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRM_LEAD_STAGE_LABELS, type CrmLeadStage } from "@shared/schema";
export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery<{
    stages: Array<{ stage: CrmLeadStage; count: number }>;
    submissions: number;
    failedJobs: number;
  }>({ queryKey: ["/api/admin/dashboard-stats"], refetchInterval: 30_000 });
  return (
    <AdminSidebar>
      <main className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">P1 business dashboard</h1>
        {isLoading ? (
          <p>Loading inquiry summary…</p>
        ) : isError ? (
          <p role="alert">Unable to load inquiry summary. Please refresh.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Accepted inquiries</CardTitle>
                </CardHeader>
                <CardContent>{data?.submissions ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Failed delivery jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.failedJobs ?? 0} ·{" "}
                  <Link className="underline" href="/admin/forms">
                    Review and retry
                  </Link>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>CRM pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(CRM_LEAD_STAGE_LABELS).map(([stage, label]) => (
                  <div className="flex justify-between" key={stage}>
                    <span>{label}</span>
                    <span>{data?.stages.find((item) => item.stage === stage)?.count ?? 0}</span>
                  </div>
                ))}
                <Link className="inline-block pt-4 underline" href="/admin/crm">
                  Open pipeline
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </AdminSidebar>
  );
}
