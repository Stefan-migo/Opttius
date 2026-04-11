"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  folder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  placeholder = "Seleccionar imagen...",
  className = "",
  folder = "products",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal preview with external value
  useEffect(() => {
    if (value !== preview) {
      setPreview(value || null);
    }
  }, [value]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      // Upload to Supabase Storage
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir la imagen");
      }

      const data = await response.json();

      if (data.url) {
        onChange(data.url);
        setPreview(data.url);
        // Use setTimeout to avoid updating state during render
        setTimeout(() => {
          toast.success("Imagen subida exitosamente");
        }, 0);
      } else {
        throw new Error("No se recibió URL de la imagen");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleManualUrl = (url: string) => {
    onChange(url);
    setPreview(url);
  };

  const clearImage = () => {
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 pt-2 ${className}`}>
      {/* Upload Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File Upload */}
        <Card
          className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: "var(--admin-border-primary)" }}
        >
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-2 block">
              Subir desde dispositivo
            </Label>
            <div className="space-y-2">
              <input
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
              />
              <Button
                className="w-full"
                disabled={uploading}
                type="button"
                variant="outline"
                onClick={openFileDialog}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500">
                Máximo 5MB. Formatos: JPG, PNG, WebP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Manual URL */}
        <Card
          className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: "var(--admin-border-primary)" }}
        >
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-2 block">
              URL de imagen
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="https://ejemplo.com/imagen.jpg"
                value={value}
                onChange={(e) => handleManualUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Pega la URL de una imagen existente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {(preview || value) && (
        <Card
          className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: "var(--admin-border-primary)" }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Vista previa</Label>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <img
                alt="Preview"
                className="w-full h-auto max-h-48 object-contain rounded-md border bg-white p-2"
                src={preview || value}
                onError={() => {
                  toast.error("Error al cargar la imagen");
                  setPreview(null);
                }}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
