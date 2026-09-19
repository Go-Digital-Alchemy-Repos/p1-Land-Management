import { useState } from "react";
import { TemplatePicker } from "../../../../platform/p1-core/client/src/components/shared/page-template-picker";
import { LandingPageWizard } from "../../../../platform/p1-core/client/src/components/shared/page-landing-wizard";
import type { MarketingSection } from "../../../../lib/api-client-react/src/dashboard/models";
import { BuilderPreview } from "./BuilderPreview";
import { pageTemplatePrimitives } from "./page-template-primitives";
export default function PageTemplatePicker({
  disabled,
  onSelect,
  previewUrl,
  onClose,
  onCreateLanding,
}: {
  disabled: boolean;
  previewUrl?: string | null;
  onSelect: (blocks: MarketingSection["blocks"], name: string) => void;
  onClose?: () => void;
  onCreateLanding?: (blocks: MarketingSection["blocks"], title: string) => void;
}) {
  const [wizard, setWizard] = useState(false);
  return (
    <>
      <p>
        Starter layouts include illustrative copy and claims. Verify and replace
        examples before publication.
      </p>
      <TemplatePicker
        primitives={pageTemplatePrimitives}
        open={!wizard && !disabled}
        onClose={() => onClose?.()}
        onOpenWizard={() => setWizard(true)}
        onSelect={(content, name) => {
          if (!disabled)
            onSelect(
              content.blocks.map((block) => ({ ...block })),
              name,
            );
        }}
      />
      <LandingPageWizard
        primitives={pageTemplatePrimitives}
        open={wizard && !disabled}
        onClose={() => {
          setWizard(false);
          onClose?.();
        }}
        onCreate={(content, title) => {
          if (!disabled)
            (onCreateLanding || onSelect)(
              content.blocks.map((block) => ({ ...block })),
              title,
            );
        }}
        renderPreview={(blocks) => (
          <BuilderPreview
            previewUrl={previewUrl}
            blocks={blocks}
            label="page"
          />
        )}
      />
    </>
  );
}
