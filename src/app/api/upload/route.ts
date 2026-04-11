import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { isR2Configured, r2Client, r2Config } from "@/lib/r2/client";
import { createClient } from "@/utils/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/**
 * POST /api/upload
 *
 * Handles file uploads to Cloudflare R2 with fallback to Supabase Storage.
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 },
      );
    }

    // 3. Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `El archivo es demasiado grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        },
        { status: 413 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF, WebP, SVG)",
        },
        { status: 400 },
      );
    }

    // 4. Generate unique filename
    const fileExt = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${folder}/${user.id}-${timestamp}-${randomStr}.${fileExt}`;

    // 5. Upload Logic
    if (isR2Configured() && r2Client && r2Config) {
      logger.info(`Uploading file to Cloudflare R2: ${fileName}`);

      const buffer = Buffer.from(await file.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      });

      await r2Client.send(command);

      const publicUrl = `${r2Config.publicUrl}/${fileName}`;

      logger.info(`File uploaded successfully to R2: ${publicUrl}`);

      return NextResponse.json({
        url: publicUrl,
        storage: "r2",
        key: fileName,
      });
    } else {
      // 6. Fallback to Supabase Storage
      logger.info(
        `Cloudflare R2 not configured. Falling back to Supabase Storage: ${fileName}`,
      );

      // Determine bucket from folder or use a default one
      // Common buckets in this project: 'avatars', 'products', 'general'
      const bucketMappings: Record<string, string> = {
        avatars: "avatars",
        products: "products",
        organizations: "general", // Mapping organizations to a general bucket if not specified
        logos: "general",
      };

      const bucketName = bucketMappings[folder] || "general";

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        logger.error("Supabase Storage upload error:", uploadError);
        return NextResponse.json(
          {
            error: "Error subiendo a almacenamiento de respaldo",
            details: uploadError.message,
          },
          { status: 500 },
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      logger.info(
        `File uploaded successfully to Supabase Storage: ${publicUrl}`,
      );

      return NextResponse.json({
        url: publicUrl,
        storage: "supabase",
        key: data.path,
      });
    }
  } catch (error) {
    logger.error("Unexpected error in /api/upload:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
