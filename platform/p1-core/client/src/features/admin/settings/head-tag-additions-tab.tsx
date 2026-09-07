import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code2, Loader2, Save } from "lucide-react";
import type { SettingsData } from "../settings-page";

export function HeadTagAdditionsTab({ settings }: { settings: SettingsData }) {
  const { toast } = useToast();
  const storedValue = settings.head_tag_additions?.public_head_html?.value || "";
  const [headHtml, setHeadHtml] = useState(storedValue);

  useEffect(() => {
    setHeadHtml(storedValue);
  }, [storedValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/settings", {
        key: "public_head_html",
        value: headHtml,
        category: "head_tag_additions",
        isSecret: false,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Head tag additions updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save head tag additions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasChanges = headHtml !== storedValue;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-head-tag-additions-heading">
          Head Tag Additions
        </h3>
        <p className="text-sm text-muted-foreground">
          Add raw third-party tags that should be inserted into the public site&apos;s {"<head>"}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4 text-primary" />
            Public Head Markup
          </CardTitle>
          <CardDescription>
            Use this for custom meta tags, verification tags, or vendor scripts that must be added
            globally to the public website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">A quick note on Google Analytics</p>
            <p className="mt-1">
              The existing <span className="font-medium">Integrations &gt; Google Analytics</span>{" "}
              card is still the right place for your structured GA4 configuration. Use this area
              when you specifically need to paste a raw vendor head tag.
            </p>
            <p className="mt-2">
              Tags pasted here load directly on the public site and are not automatically gated by
              cookie-consent preferences.
            </p>
            <p className="mt-2">
              For GA4, enter the measurement ID in the integration card instead of pasting the full
              Google script snippet here. That keeps analytics aligned with the site&apos;s consent
              flow.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-head-html">Head tag markup</Label>
            <Textarea
              id="public-head-html"
              value={headHtml}
              onChange={(event) => setHeadHtml(event.target.value)}
              placeholder={`<!-- Example -->\n<meta name="google-site-verification" content="..." />\n<meta name="facebook-domain-verification" content="..." />`}
              className="min-h-[280px] font-mono text-xs"
              data-testid="textarea-public-head-html"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-head-tag-additions"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Head Tags
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
