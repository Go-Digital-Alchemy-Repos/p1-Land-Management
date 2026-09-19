import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { HeadTagPresentation } from "@/components/shared/head-tag-presentation";
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
    <HeadTagPresentation
      html={headHtml}
      onChange={setHeadHtml}
      onSave={() => saveMutation.mutate()}
      busy={saveMutation.isPending}
      editorDisabled={saveMutation.isPending}
      saveDisabled={!hasChanges || saveMutation.isPending}
    />
  );
}
