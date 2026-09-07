import { useMutation, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";

interface BackupManifest {
  schemaVersion: 1;
  createdAt: string;
  key: string;
  reason: "scheduled" | "manual" | "startup";
  appVersion: string;
  gitCommitSha: string | null;
  environment: string;
  railwayEnvironment: string | null;
  railwayProjectId: string | null;
  railwayServiceId: string | null;
  storageSource: "env" | "settings";
  bucketName: string;
  bucketPrefix: string;
  tableCount: number;
  totalRowCount: number;
  mediaAssetCount: number;
  restoreOrder: string[];
}

interface BackupStatusResponse {
  enabled: boolean;
  configured: boolean;
  intervalHours: number;
  retentionDays: number;
  maxSnapshots: number;
  storage: {
    bucketName: string;
    prefix: string;
    source: "env" | "settings";
  } | null;
  latest: BackupManifest | null;
  recent: BackupManifest[];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function reasonLabel(reason: BackupManifest["reason"]) {
  if (reason === "startup") return "Startup";
  if (reason === "scheduled") return "Scheduled";
  return "Manual";
}

export default function SystemBackupsPage() {
  const { toast } = useToast();
  const [restoreTarget, setRestoreTarget] = useState<BackupManifest | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<BackupStatusResponse>({
    queryKey: ["/api/admin/system/backups/status"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/system/backups/run", {
        reason: "manual",
      });
      return response.json() as Promise<BackupManifest>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/system/backups/status"] });
      toast({
        title: "Backup started successfully",
        description: "A fresh system snapshot was created and stored in R2.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await apiRequest("POST", "/api/admin/system/backups/restore", { key });
      return response.json() as Promise<{
        restored: true;
        message: string;
        manifest: BackupManifest;
      }>;
    },
    onSuccess: async (result) => {
      setRestoreTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/system/backups/status"] });
      toast({
        title: "Restore completed",
        description: `The database was restored from the backup created ${formatDateTime(result.manifest.createdAt)}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const latest = data?.latest ?? null;
  const recent = data?.recent ?? [];

  return (
    <AdminSidebar>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-heading font-semibold"
              data-testid="text-system-backups-title"
            >
              System Backups
            </h1>
            <p className="mt-1 text-muted-foreground">
              Monitor automated snapshots, verify retention, and run a manual backup before risky
              changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={
                isFetching || runBackupMutation.isPending || restoreBackupMutation.isPending
              }
              data-testid="button-refresh-backup-status"
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => runBackupMutation.mutate()}
              disabled={
                !data?.configured || runBackupMutation.isPending || restoreBackupMutation.isPending
              }
              data-testid="button-run-backup-now"
            >
              {runBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Run Backup Now
            </Button>
          </div>
        </div>

        {!isLoading && data && !data.configured && (
          <Alert variant="destructive" data-testid="alert-backups-not-configured">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Backup storage is not configured yet</AlertTitle>
            <AlertDescription>
              Add the backup R2 environment variables in Railway, or keep the existing Cloudflare R2
              integration configured so the backup service has a place to write snapshots.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && data && data.configured && (
          <Alert data-testid="alert-backups-configured">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Backups are ready</AlertTitle>
            <AlertDescription>
              Snapshots are stored in <strong>{data.storage?.bucketName}</strong> at prefix{" "}
              <strong>{data.storage?.prefix}</strong>. The system keeps the newest{" "}
              <strong>{data.maxSnapshots}</strong> backups and also prunes anything older than{" "}
              <strong>{data.retentionDays}</strong> days.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card data-testid="card-backup-enabled">
            <CardContent className="pt-5">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Backup Service</p>
                    <div className="mt-1">
                      <Badge variant={data?.enabled ? "default" : "outline"}>
                        {data?.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-backup-interval">
            <CardContent className="pt-5">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interval</p>
                    <p className="text-xl font-semibold">{data?.intervalHours}h</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-backup-retention">
            <CardContent className="pt-5">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rolling Retention</p>
                    <p className="text-xl font-semibold">{data?.maxSnapshots} backups</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-backup-latest-age">
            <CardContent className="pt-5">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Latest Backup</p>
                    <p className="text-sm font-semibold">
                      {latest
                        ? formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })
                        : "No backups yet"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card data-testid="card-latest-backup-details">
            <CardHeader>
              <CardTitle>Latest Backup</CardTitle>
              <CardDescription>
                The most recent snapshot created by the backup system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                </div>
              ) : latest ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{reasonLabel(latest.reason)}</Badge>
                    <Badge variant="outline">{latest.environment}</Badge>
                    {latest.railwayEnvironment && (
                      <Badge variant="outline">{latest.railwayEnvironment}</Badge>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Created
                      </p>
                      <p className="mt-1 text-sm">{formatDateTime(latest.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        App Version
                      </p>
                      <p className="mt-1 text-sm">{latest.appVersion}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tables
                      </p>
                      <p className="mt-1 text-sm">{latest.tableCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Rows
                      </p>
                      <p className="mt-1 text-sm">{latest.totalRowCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Media Rows
                      </p>
                      <p className="mt-1 text-sm">{latest.mediaAssetCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Storage Source
                      </p>
                      <p className="mt-1 text-sm capitalize">{latest.storageSource}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Backup Object Key
                    </p>
                    <p className="mt-1 break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs">
                      {latest.key}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">
                    No backup has been recorded yet. Once the first scheduled or manual run
                    completes, details will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-backup-policy">
            <CardHeader>
              <CardTitle>Policy</CardTitle>
              <CardDescription>
                Current automatic backup settings for this environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-5 w-4/5" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bucket
                    </p>
                    <p className="mt-1 text-sm">{data?.storage?.bucketName || "Not configured"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Prefix
                    </p>
                    <p className="mt-1 break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs">
                      {data?.storage?.prefix || "Not configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Retention Rule
                    </p>
                    <p className="mt-1 text-sm">
                      Keep newest <strong>{data?.maxSnapshots ?? 0}</strong> snapshots and prune
                      anything older than <strong>{data?.retentionDays ?? 0}</strong> days.
                    </p>
                  </div>
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Restore is available with confirmation</AlertTitle>
                    <AlertDescription>
                      Restoring replaces the live database with the selected snapshot. Use it
                      carefully, ideally after creating a fresh manual backup first.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-recent-backups">
          <CardHeader>
            <CardTitle>Recent Backups</CardTitle>
            <CardDescription>
              The newest snapshots currently retained in your rolling backup window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : recent.length > 0 ? (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead className="w-[120px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((backup) => (
                      <TableRow key={backup.key} data-testid={`row-backup-${backup.createdAt}`}>
                        <TableCell>
                          <div className="min-w-[180px]">
                            <p className="font-medium">{formatDateTime(backup.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{reasonLabel(backup.reason)}</Badge>
                        </TableCell>
                        <TableCell>{backup.totalRowCount.toLocaleString()}</TableCell>
                        <TableCell>{backup.appVersion}</TableCell>
                        <TableCell className="max-w-[320px]">
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {backup.key}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreTarget(backup)}
                            disabled={
                              restoreBackupMutation.isPending || runBackupMutation.isPending
                            }
                            data-testid={`button-restore-backup-${backup.createdAt}`}
                          >
                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">No backup history is available yet for this environment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open && !restoreBackupMutation.isPending) {
            setRestoreTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the live database with the snapshot from{" "}
              <strong>
                {restoreTarget ? formatDateTime(restoreTarget.createdAt) : "the selected backup"}
              </strong>
              . Any content changes made after that point will be lost. Creating a fresh manual
              backup first is strongly recommended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {restoreTarget && (
            <div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
              <p>
                <span className="font-medium">Reason:</span> {reasonLabel(restoreTarget.reason)}
              </p>
              <p className="mt-1">
                <span className="font-medium">Rows:</span>{" "}
                {restoreTarget.totalRowCount.toLocaleString()}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {restoreTarget.key}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreBackupMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (restoreTarget) {
                  restoreBackupMutation.mutate(restoreTarget.key);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={restoreBackupMutation.isPending}
              data-testid="button-confirm-restore-backup"
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}
