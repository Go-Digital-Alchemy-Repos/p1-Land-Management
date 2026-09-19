import {
  useBuilderPreviewData,
  previewResourceKey,
} from "./builder-preview-data";
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  listMarketingSections,
  createMarketingSection,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingSection,
  MarketingSectionBuilder,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  BuilderHostProvider,
  type BuilderHost,
} from "../../../../platform/p1-core/client/src/features/admin/cms/builder/builder-host";
import { PageBuilderWorkspace } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/page-builder-workspace";
import { ImagePositionPicker } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/image-position-picker-workspace";
import type {
  BlockDef,
  BlockInstance,
} from "../../../../platform/p1-core/shared/cms-builder/block-registry";
import { builderPrimitives, BuilderErrorBoundary } from "./builder-primitives";
import { formPrimitives, FormsMediaProvider } from "./forms-primitives";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { BuilderPreview } from "./BuilderPreview";
import { NativeBuilderBlockPreview } from "./NativeBuilderBlockPreview";
import "./native-page-builder.css";
interface AdapterContextValue {
  disabled: boolean;
  canUseMedia: boolean;
  previewUrl?: string | null;
  previewData: ReturnType<typeof useBuilderPreviewData>;
}
const AdapterContext = createContext<AdapterContextValue>({
  disabled: true,
  canUseMedia: false,
  previewData: {},
});
function NativeRichText(props: any) {
  const context = useContext(AdapterContext);
  return (
    <CmsRichTextEditor
      label="Block content"
      {...props}
      disabled={context.disabled}
      canUseMedia={context.canUseMedia}
    />
  );
}
function NativeCanvasPreview(props: any) {
  const context = useContext(AdapterContext);
  return (
    <NativeBuilderBlockPreview
      {...props}
      resource={context.previewData[previewResourceKey(props.block) ?? ""]}
      brandingResource={context.previewData.branding}
      socialResource={context.previewData.social}
    />
  );
}
function NativeErrorBoundary(props: any) {
  return <BuilderErrorBoundary {...props} />;
}
function NativeFrontendPreview({ open, onOpenChange, blocks }: any) {
  const context = useContext(AdapterContext);
  return (
    <builderPrimitives.Dialog open={open} onOpenChange={onOpenChange}>
      <builderPrimitives.DialogContent>
        <h2>Frontend Preview</h2>
        <BuilderPreview
          blocks={blocks}
          previewUrl={context.previewUrl}
          label="page"
        />
      </builderPrimitives.DialogContent>
    </builderPrimitives.Dialog>
  );
}
const components = {
  CmsImageUpload: formPrimitives.CmsImageUpload,
  CmsRichTextEditor: NativeRichText,
  ImagePositionPicker,
  ErrorBoundary: NativeErrorBoundary,
  AdminBlockRenderer: NativeCanvasPreview,
  FrontendPreviewDialog: NativeFrontendPreview,
};
export function NativePageBuilder({
  blocks,
  onChange,
  catalog,
  canUseMedia,
  canUseSections = false,
  disabled,
  onNotice,
  canPreviewData = () => false,
}: {
  blocks: MarketingSection["blocks"];
  onChange: (blocks: MarketingSection["blocks"]) => void;
  catalog: MarketingSectionBuilder;
  canUseMedia: boolean;
  canUseSections?: boolean;
  disabled: boolean;
  canPreviewData?: (
    kind: "forms" | "blog" | "galleries" | "team" | "events" | "careers",
  ) => boolean;
  onNotice: (message: string) => void;
}) {
  const [sections, setSections] = useState<any[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [sectionRevision, setSectionRevision] = useState(0);
  useEffect(() => {
    if (!canUseSections) {
      setSections([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    listMarketingSections({ signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted)
          setSections(
            rows.map((row) => ({
              ...row,
              createdAt: row.createdAt ? new Date(row.createdAt) : null,
              updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
            })),
          );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canUseSections, sectionRevision]);
  const definitions = useMemo(
    () =>
      catalog.blocks.map((def) => ({
        ...def,
        iconName: def.iconName ?? "Layers",
      })) as BlockDef[],
    [catalog],
  );
  const getDefinition = useCallback(
    (type: string) =>
      definitions.find((def) => def.type === (catalog.aliases[type] || type)),
    [definitions, catalog],
  );
  const previewData = useBuilderPreviewData(
    blocks as unknown as BlockInstance[],
    canPreviewData,
  );
  const host: BuilderHost = {
    ui: builderPrimitives as BuilderHost["ui"],
    blocks: definitions,
    getBlockDef: getDefinition,
    createBlock: (type) => {
      const def = getDefinition(type);
      if (!def) throw new Error("This block is unavailable in this workspace.");
      return {
        id: crypto.randomUUID(),
        type: def.type,
        props: structuredClone(def.defaultProps),
      };
    },
    canUseSections,
    useCatalog: () => catalog,
    useSections: () => ({ sections, isLoading: loading, error }),
    saveSection: async (input) => {
      if (disabled || !canUseSections)
        throw new Error("Reusable sections are unavailable.");
      const saved = await createMarketingSection({
        ...input,
        blocks: input.blocks.map((block) => ({ ...block })),
      });
      setSectionRevision((v) => v + 1);
      return saved;
    },
    notice: onNotice,
    components,
  };
  return (
    <AdapterContext.Provider
      value={{
        disabled,
        canUseMedia,
        previewUrl: catalog.previewUrl,
        previewData,
      }}
    >
      <FormsMediaProvider canUseMedia={canUseMedia}>
        <BuilderHostProvider value={host}>
          <fieldset
            className="native-page-builder"
            disabled={disabled}
            ref={(node) => {
              if (node) node.inert = disabled;
            }}
          >
            <PageBuilderWorkspace
              key={String(disabled)}
              content={{ blocks: blocks as unknown as BlockInstance[] }}
              onChange={(content) => {
                if (!disabled)
                  onChange(content.blocks.map((block) => ({ ...block })));
              }}
            />
          </fieldset>
        </BuilderHostProvider>
      </FormsMediaProvider>
    </AdapterContext.Provider>
  );
}
