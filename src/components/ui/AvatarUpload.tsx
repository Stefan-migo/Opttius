"use client";

import { Camera, Check, Loader2, Upload, User } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFileUpload } from "@/hooks/useFileUpload";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess: (url: string) => Promise<void>;
  onUploadError?: (error: string) => void;
  isEditing?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AvatarUpload({
  currentAvatarUrl,
  onUploadSuccess,
  onUploadError,
  isEditing = false,
  size = "md",
  className = "",
}: AvatarUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadState, uploadAvatar, resetUploadState } = useFileUpload();

  // Size configurations
  const sizeConfig = {
    sm: { container: "w-16 h-16", button: "h-6 w-6 p-0", icon: "h-3 w-3" },
    md: { container: "w-24 h-24", button: "h-8 w-8 p-0", icon: "h-4 w-4" },
    lg: { container: "w-32 h-32", button: "h-10 w-10 p-0", icon: "h-5 w-5" },
  };

  const config = sizeConfig[size];

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      try {
        // Upload to Supabase
        const uploadedUrl = await uploadAvatar(file);

        if (uploadedUrl) {
          await onUploadSuccess(uploadedUrl);
          setPreview(null);
          URL.revokeObjectURL(previewUrl); // Clean up
        } else {
          setPreview(null);
          URL.revokeObjectURL(previewUrl);
          onUploadError?.("Error al subir la imagen");
        }
      } catch (error) {
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        onUploadError?.(errorMessage);
      }
    },
    [uploadAvatar, onUploadSuccess, onUploadError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const currentImage = preview || currentAvatarUrl;
  const isUploading = uploadState.status === "uploading";
  const hasError = uploadState.status === "error";
  const isSuccess = uploadState.status === "success";

  return (
    <div
      className={`relative flex flex-col items-center w-full max-w-[180px] sm:max-w-[200px] ${className}`}
    >
      {/* Main Avatar Container - clickable/droppable when editing */}
      <div
        className={`
          ${config.container} rounded-full bg-epoch-accent/20 flex items-center justify-center mx-auto relative overflow-hidden shrink-0
          ${isEditing ? "cursor-pointer border-2 border-dashed ring-2 ring-transparent" : ""}
          ${isDragOver ? "border-epoch-accent bg-epoch-accent/10 ring-epoch-accent/30" : "border-transparent"}
          ${hasError ? "border-red-500" : ""}
          ${isSuccess ? "border-admin-success" : ""}
        `}
        onClick={isEditing ? triggerFileInput : undefined}
        onDragLeave={isEditing ? handleDragLeave : undefined}
        onDragOver={isEditing ? handleDragOver : undefined}
        onDrop={isEditing ? handleDrop : undefined}
      >
        {/* Background overlay during upload */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Success overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-admin-success/80 flex items-center justify-center z-10 animate-pulse">
            <Check className="h-6 w-6 text-white" />
          </div>
        )}

        {/* Avatar Image or Placeholder */}
        {currentImage ? (
          <img
            alt="Avatar"
            className="w-full h-full rounded-full object-cover"
            src={currentImage}
          />
        ) : (
          <User
            className={`${size === "sm" ? "h-8 w-8" : size === "md" ? "h-12 w-12" : "h-16 w-16"} text-epoch-primary`}
          />
        )}

        {/* Upload hint for drag and drop */}
        {isEditing && isDragOver && (
          <div className="absolute inset-0 bg-epoch-accent/20 flex items-center justify-center z-[5]">
            <Upload className="h-6 w-6 text-epoch-primary" />
          </div>
        )}
      </div>

      {/* Upload Button - always visible when editing, below avatar */}
      {isEditing && (
        <Button
          className="mt-3 w-full max-w-[140px] sm:max-w-[160px] h-9 sm:h-10 rounded-xl bg-epoch-accent hover:bg-epoch-accent/90 text-[#1A2B23] font-semibold text-xs sm:text-sm disabled:opacity-50 shrink-0"
          disabled={isUploading}
          size="sm"
          type="button"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            triggerFileInput();
          }}
        >
          {isUploading ? (
            <Loader2
              className={`${config.icon} animate-spin mr-2 shrink-0 text-[#1A2B23]`}
            />
          ) : (
            <Camera className={`${config.icon} mr-2 shrink-0 text-[#1A2B23]`} />
          )}
          <span className="truncate">
            {currentImage ? "Cambiar foto" : "Agregar foto"}
          </span>
        </Button>
      )}

      {/* Hidden File Input */}
      <Input
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
      />

      {/* Upload Instructions - always visible when editing */}
      {isEditing && !isUploading && !hasError && (
        <div className="text-center mt-2 w-full px-1">
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">
            Haz clic o arrastra una imagen
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-500/80 mt-0.5">
            JPG, PNG, GIF, WebP (máx. 5MB)
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-2 w-full">
          <Progress className="h-2" value={uploadState.progress} />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Subiendo... {uploadState.progress}%
          </p>
        </div>
      )}

      {/* Error Display */}
      {hasError && uploadState.error && (
        <Alert className="mt-2 w-full border-red-500 bg-red-50 dark:bg-red-950/30">
          <AlertDescription className="text-red-600 dark:text-red-400 text-sm">
            {uploadState.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
