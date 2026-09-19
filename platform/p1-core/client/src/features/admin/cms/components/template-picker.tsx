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
import { TemplatePicker as SharedTemplatePicker } from "../../../../components/shared/page-template-picker";
export function TemplatePicker(
  props: Omit<ComponentProps<typeof SharedTemplatePicker>, "primitives">,
) {
  return (
    <SharedTemplatePicker
      {...props}
      primitives={primitives as unknown as PageTemplatePrimitives}
      onOpenWizard={() => {
        props.onClose();
        props.onOpenWizard();
      }}
    />
  );
}
