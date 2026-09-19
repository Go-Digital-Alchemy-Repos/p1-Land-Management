import type { PageTemplatePrimitives } from "../../../../components/shared/page-template-primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ComponentProps } from "react";
const primitives = {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  Separator,
};
import { LandingPageWizard as SharedLandingPageWizard } from "../../../../components/shared/page-landing-wizard";
import { PageRenderer } from "../builder/block-renderer";
export function LandingPageWizard(
  props: Omit<ComponentProps<typeof SharedLandingPageWizard>, "primitives" | "renderPreview">,
) {
  return (
    <SharedLandingPageWizard
      {...props}
      primitives={primitives as unknown as PageTemplatePrimitives}
      renderPreview={(blocks) => <PageRenderer blocks={blocks} />}
    />
  );
}
