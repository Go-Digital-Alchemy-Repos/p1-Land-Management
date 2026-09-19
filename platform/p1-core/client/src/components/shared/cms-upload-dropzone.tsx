import { useState, type ComponentType } from "react";
import { UploadCloud, Image, Library } from "lucide-react";
import { cn } from "../../lib/utils";
export function CmsUploadDropzone({
  Button,
  multiple = false,
  acceptedMode = "images",
  label,
  testId,
  isUploading = false,
  disabled = false,
  uploadProgress,
  showLibraryButton = true,
  onChooseLibrary,
  onFiles,
  onBrowse,
}: {
  Button: ComponentType<any>;
  multiple?: boolean;
  acceptedMode?: "images" | "all";
  label?: string;
  testId?: string;
  isUploading?: boolean;
  disabled?: boolean;
  uploadProgress?: number;
  showLibraryButton?: boolean;
  onChooseLibrary: () => void;
  onFiles: (files: File[]) => void;
  onBrowse: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && !isUploading) onFiles(Array.from(e.dataTransfer.files));
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
        isDragging
          ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20"
          : "border-muted-foreground/25 hover:border-violet-300 bg-muted/10 hover:bg-muted/20",
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid={testId ? `${testId}-dropzone` : "cms-image-dropzone"}
    >
      {isUploading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
          <div className="h-10 w-10 rounded-full flex items-center justify-center">
            <UploadCloud className="h-5 w-5 text-violet-500 animate-bounce" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Uploading…</p>
          {uploadProgress !== undefined && (
            <progress value={uploadProgress} max={100} className="w-full max-w-[200px] h-1.5" />
          )}
          {uploadProgress !== undefined && (
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-7 px-4 text-center select-none">
          <div className="h-11 w-11 rounded-full flex items-center justify-center mb-1">
            <Image className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/80">
              Drop {multiple ? "files" : acceptedMode === "all" ? "file" : "image"} here or{" "}
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={onBrowse}
                aria-label={label ? `Upload ${label.toLowerCase()}` : "Upload image"}
                className="text-violet-500 hover:text-violet-600 underline underline-offset-2"
              >
                browse
              </button>
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
              disabled={disabled || isUploading}
              size="sm"
              variant="ghost"
              className="mt-1 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onChooseLibrary();
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
  );
}
