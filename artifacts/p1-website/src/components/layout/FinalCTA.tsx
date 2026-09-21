import { ContextualLinks } from "@/components/content/ContextualLinks";
import { FinalCTABand, type CtaVariant } from "./FinalCTABand";

export type { CtaVariant } from "./FinalCTABand";

/** Standard final CTA, including contextual links where a route has them. */
export function FinalCTA({ variant = "general" }: { variant?: CtaVariant }) {
  return (
    <>
      <ContextualLinks />
      <FinalCTABand variant={variant} />
    </>
  );
}
