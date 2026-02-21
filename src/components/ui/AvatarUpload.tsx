"use client";

import { useState, useRef, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, X, Check, User, Loader2 } from "lucide-react";

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
    <div className={`relative ${className}`}>
      {/* Main Avatar Container */}
      <div
        className={`
          ${config.container} rounded-full bg-epoch-accent/20 flex items-center justify-center mx-auto relative overflow-hidden
          ${isEditing ? "cursor-pointer border-2 border-dashed" : ""}
          ${isDragOver ? "border-epoch-accent bg-epoch-accent/10" : "border-transparent"}
          ${hasError ? "border-red-500" : ""}
          ${isSuccess ? "border-admin-success" : ""}
        `}
        onDrop={isEditing ? handleDrop : undefined}
        onDragOver={isEditing ? handleDragOver : undefined}
        onDragLeave={isEditing ? handleDragLeave : undefined}
        onClick={isEditing ? triggerFileInput : undefined}
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
            src={currentImage}
            alt="Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User
            className={`${size === "sm" ? "h-8 w-8" : size === "md" ? "h-12 w-12" : "h-16 w-16"} text-epoch-primary`}
          />
        )}

        {/* Upload hint for drag and drop */}
        {isEditing && isDragOver && (
          <div className="absolute inset-0 bg-epoch-accent/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-epoch-primary" />
          </div>
        )}
      </div>

      {/* Camera Button (only when editing) */}
      {isEditing && (
        <Button
          size="sm"
          variant="secondary"
          className={`
            absolute bottom-0 right-0 rounded-full ${config.button} 
            bg-epoch-accent hover:bg-epoch-accent/90 disabled:opacity-50
          `}
          onClick={triggerFileInput}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2
              className={`${config.icon} animate-spin text-epoch-primary`}
            />
          ) : (
            <Camera className={`${config.icon} text-epoch-primary`} />
          )}
        </Button>
      )}

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-2">
          <Progress value={uploadState.progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Subiendo... {uploadState.progress}%
          </p>
        </div>
      )}

      {/* Error Display */}
      {hasError && uploadState.error && (
        <Alert className="mt-2 border-red-500 bg-red-50">
          <AlertDescription className="text-red-600 text-sm">
            {uploadState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Instructions (when editing) */}
      {isEditing && !isUploading && !hasError && !currentImage && (
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Haz clic o arrastra una imagen
          </p>
          <p className="text-xs text-muted-foreground/70">
            JPG, PNG, GIF, WebP (máx. 5MB)
          </p>
        </div>
      )}
    </div>
  );
}
