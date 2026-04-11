import { useState } from "react";

interface UploadOptions {
  bucket: string;
  path?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export interface UploadProgress {
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
}

export function useFileUpload() {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    status: "idle",
  });

  const uploadFile = async (
    file: File,
    options: UploadOptions,
  ): Promise<string | null> => {
    const {
      bucket,
      path,
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
    } = options;

    try {
      setUploadState({ progress: 0, status: "uploading" });

      // Validate file size
      if (file.size > maxSize) {
        throw new Error(
          `El archivo es muy grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`,
        );
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(", ")}`,
        );
      }

      setUploadState({ progress: 10, status: "uploading" });

      // Build FormData for our API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", options.bucket); // Mapping bucket to folder for the API

      // Call our centralized upload API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al subir el archivo");
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error("No se recibió la URL del archivo subido");
      }

      setUploadState({
        progress: 100,
        status: "success",
        url: data.url,
      });

      return data.url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setUploadState({
        progress: 0,
        status: "error",
        error: errorMessage,
      });
      return null;
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    return uploadFile(file, {
      bucket: "avatars",
      path: "avatar",
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    });
  };

  const resetUploadState = () => {
    setUploadState({ progress: 0, status: "idle" });
  };

  return {
    uploadState,
    uploadFile,
    uploadAvatar,
    resetUploadState,
  };
}

// Utility function to create optimized image URLs
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
): string {
  if (!url) return url;

  // If it's a Supabase storage URL, we can add transformation parameters
  if (url.includes("supabase.co/storage")) {
    const transformParams = new URLSearchParams();
    if (width) transformParams.set("width", width.toString());
    if (height) transformParams.set("height", height.toString());
    transformParams.set("quality", "80");
    transformParams.set("format", "webp");

    return transformParams.toString()
      ? `${url}?${transformParams.toString()}`
      : url;
  }

  return url;
}
