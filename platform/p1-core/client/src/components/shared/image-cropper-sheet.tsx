import { ImageCropperEditor, type ImageCropperEditorProps } from "./image-cropper-editor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** Retained sheet wrapper; the editor is also used by the dashboard's native dialog. */
export function ImageCropperSheet(props: ImageCropperEditorProps) {
  return (
    <Sheet
      open={!!props.imageSrc}
      onOpenChange={(open) => {
        if (!open) props.onCancel();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg z-[1300]">
        <ImageCropperEditor
          {...props}
          components={{
            Header: SheetHeader,
            Title: SheetTitle,
            Description: SheetDescription,
            Body: SheetBody,
            Footer: SheetFooter,
            Button,
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
