import { CmsUploadDropzone } from "@/components/shared/cms-upload-dropzone";
import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, RefreshCw, Library, FileText } from "lucide-react";
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
        <CmsUploadDropzone
          Button={Button}
          multiple={multiple}
          acceptedMode={acceptedMode}
          label={label}
          testId={testId}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          showLibraryButton={showLibraryButton}
          onChooseLibrary={() => setPickerOpen(true)}
          onFiles={handleFiles}
          onBrowse={() => fileInputRef.current?.click()}
        />
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
