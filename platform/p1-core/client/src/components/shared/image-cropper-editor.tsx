import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import imageCompression from "browser-image-compression";
import "react-image-crop/dist/ReactCrop.css";
import { Loader2, CropIcon } from "lucide-react";

export interface ImageCropperEditorProps {
  imageSrc: string | null;
  fileName?: string;
  aspect?: number;
  circularCrop?: boolean;
  title?: string;
  description?: string;
  applyLabel?: string;
  outputMimeType?: "image/jpeg" | "image/png" | "image/webp";
  confirmDisabled?: boolean;
  onConfirm: (file: File) => void | Promise<void>;
  useWebWorker?: boolean;
  showCoordinates?: boolean;
  onProcessingChange?: (processing: boolean) => void;
  components?: {
    Header?: React.ElementType;
    Title?: React.ElementType;
    Description?: React.ElementType;
    Body?: React.ElementType;
    Footer?: React.ElementType;
    Button?: React.ElementType;
  };
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

export async function getCroppedFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  outputMimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<File> {
  if (
    !image.width ||
    !image.height ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > image.width + 1 ||
    crop.y + crop.height > image.height + 1
  )
    throw new Error("Choose a crop within the image.");
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  if (!canvas.width || !canvas.height)
    throw new Error("Choose a crop with a positive width and height.");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing is unavailable.");
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
        if (!blob || blob.type !== outputMimeType) {
          reject(new Error("The browser could not encode this image format."));
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

export function ImageCropperEditor({
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
  useWebWorker = true,
  showCoordinates = false,
  onProcessingChange,
  components = {},
}: ImageCropperEditorProps) {
  const {
    Header = "header",
    Title = "h2",
    Description = "p",
    Body = "div",
    Footer = "footer",
    Button = "button",
  } = components;
  const [error, setError] = useState("");
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
    if (processing || confirmDisabled) return;
    setProcessing(true);
    onProcessingChange?.(true);
    setError("");
    try {
      const cropped = await getCroppedFile(imgRef.current, completedCrop, fileName, outputMimeType);
      const compressed = await imageCompression(cropped, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker,
        fileType: outputMimeType,
        initialQuality: 0.88,
      });
      if (compressed.type !== outputMimeType)
        throw new Error("The browser could not encode this image format.");
      const compressedFile = new File([compressed], withFileExtension(fileName, outputMimeType), {
        type: outputMimeType,
      });
      if (compressedFile.size > 2 * 1024 * 1024)
        throw new Error("The cropped image is still larger than 2 MB. Choose a smaller crop.");
      await onConfirm(compressedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image. Please try again.");
    } finally {
      setProcessing(false);
      onProcessingChange?.(false);
    }
  }

  return (
    <div className="media-crop-editor flex h-full min-h-0 flex-col">
      <Header className="media-crop-header">
        <Title className="flex items-center gap-2">
          <CropIcon className="h-4 w-4" />
          {title}
        </Title>
        <Description>{description}</Description>
      </Header>
      <Body className="media-crop-body">
        {error && <p role="alert">{error}</p>}
        {imageSrc && (
          <div className="media-crop-image flex items-center justify-center rounded-lg overflow-hidden bg-muted/50 p-2">
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
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
                className="media-crop-preview max-h-[400px] max-w-full object-contain"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>
        )}
        {showCoordinates && crop && (
          <div className="media-crop-coordinates">
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key}>
                {key} (%)
                <input
                  type="number"
                  min={key === "width" || key === "height" ? 1 : 0}
                  max={100}
                  value={Math.round(crop[key] * 100) / 100}
                  disabled={processing}
                  onChange={(e) => {
                    const next = {
                      ...crop,
                      unit: "%" as const,
                      [key]: Math.max(
                        key === "width" || key === "height" ? 1 : 0,
                        Math.min(100, Number(e.target.value)),
                      ),
                    };
                    next.width = Math.min(next.width, 100 - next.x);
                    next.height = Math.min(next.height, 100 - next.y);
                    setCrop(next);
                    if (imgRef.current)
                      setCompletedCrop(
                        cropToPixelCrop(next, imgRef.current.width, imgRef.current.height),
                      );
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-3">
          Your photo will be compressed to under 2 MB automatically.
        </p>
      </Body>
      <Footer className="media-crop-footer">
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button
          type="button"
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
      </Footer>
    </div>
  );
}
