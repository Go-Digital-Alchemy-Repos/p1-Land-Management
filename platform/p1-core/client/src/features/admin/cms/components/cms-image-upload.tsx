import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, X, RefreshCw, Image, Library, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "./media-picker-dialog";
import type { CmsMediaAsset, CmsMediaLibraryAsset } from "@shared/schema";

const IMAGE_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const IMAGE_ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const MEDIA_ACCEPTED_TYPES = [
  ...IMAGE_ACCEPTED_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.ms-word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "application/rtf",
  "text/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
];
const MEDIA_ACCEPTED_EXTENSIONS = [
  ...IMAGE_ACCEPTED_EXTENSIONS,
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
];
const MAX_BYTES = 10 * 1024 * 1024;

function inferAssetKind(mimeType?: string | null): "image" | "document" {
  return mimeType?.startsWith("image/") ? "image" : "document";
}

function inferAssetKindFromValue(value: string): "image" | "document" {
  return /\.(png|jpe?g|webp|gif|svg)(?:\?.*)?$/i.test(value) ? "image" : "document";
}

function isAcceptedFile(file: File, acceptedMode: "images" | "all") {
  const extensionIndex = file.name.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : "";
  const acceptedTypes = acceptedMode === "all" ? MEDIA_ACCEPTED_TYPES : IMAGE_ACCEPTED_TYPES;
  const acceptedExtensions =
    acceptedMode === "all" ? MEDIA_ACCEPTED_EXTENSIONS : IMAGE_ACCEPTED_EXTENSIONS;
  return acceptedTypes.includes(file.type) || acceptedExtensions.includes(extension);
}

export interface CmsImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onChangeMany?: (assets: CmsMediaLibraryAsset[]) => void;
  multiple?: boolean;
  showLibraryButton?: boolean;
  label?: string;
  helpText?: string;
  className?: string;
  acceptedMode?: "images" | "all";
  "data-testid"?: string;
}

export function CmsImageUpload({
  value,
  onChange,
  onChangeMany,
  multiple = false,
  showLibraryButton = true,
  label,
  helpText,
  className,
  acceptedMode = "images",
  "data-testid": testId,
}: CmsImageUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CmsMediaLibraryAsset | null>(null);

  const uploadFile = useCallback(
    (file: File, onProgress?: (progress: number) => void) => {
      if (!isAcceptedFile(file, acceptedMode)) {
        throw new Error(
          acceptedMode === "all"
            ? "Accepted file types: images, PDF, Word, Excel, PowerPoint, CSV, TXT, RTF, and OpenDocument files"
            : "Only PNG, JPEG, WebP, and GIF files are accepted",
        );
      }
      if (file.size > MAX_BYTES) {
        throw new Error(
          `File must be under 10 MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
        );
      }

      const fd = new FormData();
      fd.append("file", file);

      return new Promise<CmsMediaLibraryAsset>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/cms/upload");
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 90));
        };

        xhr.onload = () => {
          onProgress?.(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const asset = JSON.parse(xhr.responseText) as CmsMediaAsset;
              resolve({
                ...asset,
                assetKind: inferAssetKind(asset.mimeType),
                usageRefs: [],
                usageCount: 0,
                liveUsageCount: 0,
                isInUse: false,
              });
            } catch {
              reject(new Error("Invalid server response"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Upload failed"));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });
    },
    [acceptedMode],
  );

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: CmsMediaLibraryAsset[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const asset = await uploadFile(files[index], (progress) => {
          const totalProgress = ((index + progress / 100) / files.length) * 100;
          setUploadProgress(Math.min(100, Math.round(totalProgress)));
        });
        uploaded.push(asset);
      }
      return uploaded;
    },
    onSuccess: (assets) => {
      const [firstAsset] = assets;
      if (!firstAsset) return;
      if (multiple && onChangeMany) {
        onChangeMany(assets);
      } else {
        onChange(firstAsset.url);
      }
      setSelectedAsset(firstAsset);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/media"] });
      toast({
        title: `${assets.length} ${
          acceptedMode === "all" ? "file" : "image"
        }${assets.length === 1 ? "" : "s"} uploaded successfully`,
      });
      setTimeout(() => setUploadProgress(0), 800);
    },
    onError: (err: Error) => {
      setUploadProgress(0);
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[] | undefined | null) => {
      const selectedFiles = Array.from(files ?? []);
      if (selectedFiles.length === 0) return;
      uploadMutation.mutate(multiple ? selectedFiles : selectedFiles.slice(0, 1));
    },
    [multiple, uploadMutation],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const isUploading = uploadMutation.isPending;
  const displayAssetKind = value
    ? selectedAsset?.url === value
      ? selectedAsset.assetKind
      : inferAssetKindFromValue(value)
    : "image";
  const acceptAttr =
    acceptedMode === "all"
      ? "image/png,image/jpeg,image/webp,image/gif,application/pdf,application/msword,application/vnd.ms-word,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain,application/rtf,text/rtf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.odt,.ods,.odp"
      : "image/png,image/jpeg,image/webp,image/gif";

  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      {label && <p className="text-sm font-medium leading-none">{label}</p>}

      {value ? (
        <div className="relative group rounded-lg border bg-muted/20 overflow-hidden">
          {displayAssetKind === "image" ? (
            <img
              src={value}
              alt="Preview"
              className="w-full object-cover max-h-48 rounded-lg"
              data-testid={testId ? `${testId}-preview` : "cms-image-preview"}
            />
          ) : (
            <div className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 p-4 sm:p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-sm">
                <FileText className="h-7 w-7 text-violet-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedAsset?.originalName || "Uploaded document"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedAsset?.mimeType || "Document file"}
                </p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg" />
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs gap-1 shadow"
              onClick={() => fileInputRef.current?.click()}
              data-testid={testId ? `${testId}-replace` : "cms-image-replace"}
            >
              <RefreshCw className="h-3 w-3" />
              Replace
            </Button>
            {showLibraryButton && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs gap-1 shadow"
                onClick={() => setPickerOpen(true)}
                data-testid={testId ? `${testId}-library` : "cms-image-library"}
              >
                <Library className="h-3 w-3" />
                Library
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 w-7 p-0 shadow"
              onClick={() => onChange("")}
              data-testid={testId ? `${testId}-remove` : "cms-image-remove"}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            isDragging
              ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20"
              : "border-muted-foreground/25 hover:border-violet-300 bg-muted/10 hover:bg-muted/20",
          )}
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-label={label ? `Upload ${label.toLowerCase()}` : "Upload image"}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (!isUploading && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          data-testid={testId ? `${testId}-dropzone` : "cms-image-dropzone"}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
              <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <UploadCloud className="h-5 w-5 text-violet-500 animate-bounce" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Uploading…</p>
              <Progress value={uploadProgress} className="w-full max-w-[200px] h-1.5" />
              <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-7 px-4 text-center select-none">
              <div className="h-11 w-11 rounded-full bg-muted/60 flex items-center justify-center mb-1">
                <Image className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">
                  Drop {multiple ? "files" : acceptedMode === "all" ? "file" : "image"} here or{" "}
                  <span className="text-violet-500 hover:text-violet-600 underline underline-offset-2">
                    browse
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {acceptedMode === "all"
                    ? "Images, PDF, Word, Excel, PowerPoint, CSV, TXT, RTF, OpenDocument · Max 10 MB"
                    : "PNG, JPG, WebP, GIF · Max 10 MB"}
                </p>
              </div>
              {showLibraryButton && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPickerOpen(true);
                  }}
                  data-testid={testId ? `${testId}-pick-library` : "cms-image-pick-library"}
                >
                  <Library className="h-3.5 w-3.5" />
                  Pick from library
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        data-testid={testId ? `${testId}-file-input` : "cms-image-file-input"}
      />

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        typeFilter={acceptedMode === "all" ? "all" : "images"}
        multiple={multiple}
        onSelectMany={onChangeMany}
        onSelect={(url, asset) => {
          setSelectedAsset(asset);
          onChange(url);
        }}
      />
    </div>
  );
}
