import React, { type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BuilderHostProvider, type BuilderHost } from "./builder-host";
import { ALL_BLOCKS, getBlockDef, createBlock } from "./block-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as select from "@/components/ui/select";
import * as tabs from "@/components/ui/tabs";
import * as dialog from "@/components/ui/dialog";
import * as resize from "@/components/ui/resizable";
import { CmsImageUpload } from "../components/cms-image-upload";
import { CmsRichTextEditor } from "./cms-rich-text-editor";
import { ImagePositionPicker } from "./image-position-picker-workspace";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { BlockRenderer } from "./block-renderer";
import { FrontendPreviewDialog } from "./page-builder-preview";
import type { CmsSection } from "@shared/schema";
function useCatalog(
  needs: { forms?: boolean; pages?: boolean; galleries?: boolean; team?: boolean } = {},
) {
  const forms = useQuery<any[]>({
    enabled: !!needs.forms,
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.LIVE,
  });
  const pages = useQuery<any[]>({
    enabled: !!needs.pages,
    queryKey: ["/api/admin/cms/pages"],
    staleTime: STALE_TIMES.LIVE,
  });
  const galleries = useQuery<any[]>({
    enabled: !!needs.galleries,
    queryKey: ["/api/admin/cms/galleries"],
    staleTime: STALE_TIMES.LIVE,
  });
  const team = useQuery<any[]>({
    enabled: !!needs.team,
    queryKey: ["/api/admin/cms/team"],
    staleTime: STALE_TIMES.LIVE,
  });
  return {
    forms: forms.data ?? [],
    pages: pages.data ?? [],
    galleries: galleries.data ?? [],
    team: team.data ?? [],
    teamLoading: team.isLoading,
    teamError: team.isError,
  };
}
export function CoreBuilderHost({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const host: BuilderHost = {
    ui: {
      Button,
      Input,
      Textarea,
      Label,
      Badge,
      Switch,
      Separator,
      ScrollArea,
      ...select,
      ...tabs,
      ...dialog,
      ...resize,
    },
    blocks: ALL_BLOCKS,
    getBlockDef,
    createBlock,
    canUseSections: true,
    useCatalog,
    useSections: () => {
      const q = useQuery<CmsSection[]>({ queryKey: ["/api/admin/cms/sections"] });
      return { sections: q.data ?? [], isLoading: q.isLoading, error: q.error?.message };
    },
    saveSection: async (input) => {
      const response = await apiRequest("POST", "/api/admin/cms/sections", input);
      const result = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      return result;
    },
    notice: (message) => toast({ title: message }),
    components: {
      CmsImageUpload,
      CmsRichTextEditor,
      ImagePositionPicker,
      ErrorBoundary,
      AdminBlockRenderer: BlockRenderer,
      FrontendPreviewDialog,
    },
  };
  return <BuilderHostProvider value={host}>{children}</BuilderHostProvider>;
}
