import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import imageCompression from "browser-image-compression";
import "react-image-crop/dist/ReactCrop.css";
import { Loader2, CropIcon } from "lucide-react";
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

interface ImageCropperSheetProps {
  imageSrc: string | null;
  fileName?: string;
  aspect?: number;
  circularCrop?: boolean;
  title?: string;
  description?: string;
  applyLabel?: string;
  outputMimeType?: "image/jpeg" | "image/png" | "image/webp";
  confirmDisabled?: boolean;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

function extensionForMimeType(mimeType: "image/jpeg" | "image/png" | "image/webp") {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

function withFileExtension(fileName: string, mimeType: "image/jpeg" | "image/png" | "image/webp") {
  return fileName.replace(/\.[^.]+$/, "") + extensionForMimeType(mimeType);
}

function makeInitialCrop(width: number, height: number, aspect?: number): Crop {
  if (!aspect) {
    return {
      unit: "%",
      x: 5,
      y: 5,
      width: 90,
      height: 90,
    };
  }

  return centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height), width, height);
}

function cropToPixelCrop(crop: Crop, width: number, height: number): PixelCrop {
  if (crop.unit === "%") {
    return {
      unit: "px",
      x: Math.round(((crop.x ?? 0) * width) / 100),
      y: Math.round(((crop.y ?? 0) * height) / 100),
      width: Math.round(((crop.width ?? 0) * width) / 100),
      height: Math.round(((crop.height ?? 0) * height) / 100),
    };
  }

  return {
    unit: "px",
    x: Math.round(crop.x ?? 0),
    y: Math.round(crop.y ?? 0),
    width: Math.round(crop.width ?? 0),
    height: Math.round(crop.height ?? 0),
  };
}

async function getCroppedFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  outputMimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<File> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image"));
          return;
        }
        resolve(
          new File([blob], withFileExtension(fileName, outputMimeType), { type: outputMimeType }),
        );
      },
      outputMimeType,
      0.95,
    );
  });
}

export function ImageCropperSheet({
  imageSrc,
  fileName = "avatar.jpg",
  aspect,
  circularCrop = false,
  title = "Crop Photo",
  description = "Drag the handles to adjust the crop area, then click Apply.",
  applyLabel = "Apply & Upload",
  outputMimeType = "image/jpeg",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ImageCropperSheetProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!imageSrc) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setProcessing(false);
    }
  }, [imageSrc]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initialCrop = makeInitialCrop(width, height, aspect);
      setCrop(initialCrop);
      setCompletedCrop(cropToPixelCrop(initialCrop, width, height));
    },
    [aspect],
  );

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedFile(imgRef.current, completedCrop, fileName, outputMimeType);
      const compressed = await imageCompression(cropped, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: outputMimeType,
        initialQuality: 0.88,
      });
      const compressedFile = new File([compressed], withFileExtension(fileName, outputMimeType), {
        type: outputMimeType,
      });
      onConfirm(compressedFile);
    } catch (err) {
      console.error("[ImageCropper] error:", err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Sheet
      open={!!imageSrc}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg z-[1300]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CropIcon className="h-4 w-4" />
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {imageSrc && (
            <div className="flex items-center justify-center rounded-lg overflow-hidden bg-muted/50 p-2">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                circularCrop={circularCrop}
                keepSelection
                minWidth={50}
                minHeight={50}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[400px] max-w-full object-contain"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-3">
            Your photo will be compressed to under 2 MB automatically.
          </p>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!completedCrop || processing || confirmDisabled}
            data-testid="button-apply-crop"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CropIcon className="h-4 w-4 mr-2" />
            )}
            {applyLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
