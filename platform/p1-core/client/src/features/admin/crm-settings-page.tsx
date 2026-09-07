import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CRM_PIPELINE_COLORS,
  DEFAULT_CRM_PIPELINE_CONFIG,
  crmPipelineConfigSchema,
  crmPipelineSettingsResponseSchema,
  type CrmPipelineConfig,
} from "@shared/crm-pipeline-settings";
import {
  CRM_PIPELINE_COLOR_CLASSES,
  CRM_PIPELINE_QUERY_KEY,
  useCrmPipelineSettings,
} from "@/hooks/use-crm-pipeline-settings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminSidebar } from "./admin-sidebar";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SettingsEditor() {
  const query = useCrmPipelineSettings();
  const [draft, setDraft] = useState<CrmPipelineConfig>();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (query.data) setDraft((current) => current ?? query.data.config);
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: async (config: CrmPipelineConfig) => {
      const response = await apiRequest("PUT", CRM_PIPELINE_QUERY_KEY[0], config);
      return crmPipelineSettingsResponseSchema.parse(await response.json());
    },
    onSuccess: (data) => {
      setDraft(data.config);
      queryClient.setQueryData(CRM_PIPELINE_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: CRM_PIPELINE_QUERY_KEY });
      setSaved(true);
    },
  });
  const parsed = crmPipelineConfigSchema.safeParse(draft);
  const locked =
    !query.data ||
    query.isError ||
    query.data.issue === "unsupported_version" ||
    mutation.isPending;
  function update(stages: CrmPipelineConfig["stages"]) {
    setSaved(false);
    setDraft({ version: 1, stages });
  }
  return (
    <div className="max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">CRM pipeline settings</h1>
        <p>Customize stage labels, colors and display order. Lead lifecycle rules remain fixed.</p>
      </div>
      <Link href="/admin/crm">Back to Pipeline</Link>
      <nav aria-label="Related CRM settings" className="rounded-md border p-4">
        <h2 className="font-semibold">Connected settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These settings apply across this Core Platform site.
        </p>
        <ul className="mt-3 space-y-3 text-sm">
          <li>
            <Link
              className="font-medium underline underline-offset-4"
              href="/admin/settings/integrations"
            >
              Integrations
            </Link>
            <p className="text-muted-foreground">
              Manage CRM intake credentials and email providers.
            </p>
          </li>
          <li>
            <Link
              className="font-medium underline underline-offset-4"
              href="/admin/settings/email-templates"
            >
              Email templates
            </Link>
            <p className="text-muted-foreground">
              Edit the platform's transactional email templates.
            </p>
          </li>
          <li>
            <Link
              className="font-medium underline underline-offset-4"
              href="/admin/design/branding"
            >
              Branding
            </Link>
            <p className="text-muted-foreground">Manage site identity and branding assets.</p>
          </li>
        </ul>
      </nav>
      {query.isLoading && <p role="status">Loading pipeline settings…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load settings.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {query.data?.issue === "invalid_stored_config" && (
        <p role="alert">
          Stored settings are invalid. Defaults are shown; saving replaces the invalid
          configuration.
        </p>
      )}
      {query.data?.issue === "unsupported_version" && (
        <p role="alert">
          Stored settings use an unsupported version. Editing is disabled until compatibility is
          restored.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!locked && parsed.success) mutation.mutate(parsed.data);
        }}
      >
        <fieldset disabled={locked} className="min-w-0 space-y-4">
          {draft?.stages.map((stage, index) => (
            <div
              key={stage.key}
              className="space-y-3 rounded-md border p-4"
              data-testid={`pipeline-setting-${stage.key}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-2 py-1 text-sm ${CRM_PIPELINE_COLOR_CLASSES[stage.color]}`}
                >
                  {stage.label}
                </span>
                <code className="text-xs">{stage.key}</code>
              </div>
              {stage.key === "won" && (
                <p className="text-sm">Won: moving a lead here creates its client profile.</p>
              )}
              {stage.key === "lost" && (
                <p className="text-sm">Lost: marks the lead as lost without creating a client.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`label-${stage.key}`}>Stage label</Label>
                  <Input
                    id={`label-${stage.key}`}
                    value={stage.label}
                    maxLength={40}
                    onChange={(event) =>
                      update(
                        draft.stages.map((item) =>
                          item.key === stage.key ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`color-${stage.key}`}>Color</Label>
                  <select
                    id={`color-${stage.key}`}
                    className="block h-10 w-full rounded-md border bg-background px-3"
                    value={stage.color}
                    onChange={(event) =>
                      update(
                        draft.stages.map((item) =>
                          item.key === stage.key
                            ? { ...item, color: event.target.value as typeof stage.color }
                            : item,
                        ),
                      )
                    }
                  >
                    {CRM_PIPELINE_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {([-1, 1] as const).map((offset) => (
                  <Button
                    key={offset}
                    type="button"
                    variant="outline"
                    disabled={index + offset < 0 || index + offset >= draft.stages.length}
                    aria-label={`Move ${stage.label} ${offset < 0 ? "up" : "down"}`}
                    onClick={() => {
                      const stages = [...draft.stages];
                      [stages[index], stages[index + offset]] = [
                        stages[index + offset],
                        stages[index],
                      ];
                      update(stages);
                    }}
                  >
                    Move {offset < 0 ? "up" : "down"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {draft && !parsed.success && <p role="alert">{parsed.error.issues[0]?.message}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={locked || !parsed.success}>
              Save pipeline settings
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(structuredClone(DEFAULT_CRM_PIPELINE_CONFIG));
                setSaved(false);
              }}
            >
              Restore defaults
            </Button>
          </div>
        </fieldset>
      </form>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {saved && <p role="status">Pipeline settings saved.</p>}
    </div>
  );
}
export default function CrmSettingsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <SettingsEditor />
      </AdminSidebar>
    </ProtectedRoute>
  );
}
