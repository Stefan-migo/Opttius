import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "./errors";
export { ValidationError };
import { logger } from "@/lib/logger";

/**
 * Helpers para usar Zod en rutas API de Next.js
 *
 * Este módulo proporciona funciones convenientes para validar
 * request bodies, query parameters y path parameters usando Zod.
 * Todas las funciones incluyen logging automático de errores y
 * manejo consistente de excepciones.
 *
 * @module lib/api/validation/zod-helpers
 *
 * @example
 * ```typescript
 * import { parseAndValidateBody } from '@/lib/api/validation/zod-helpers'
 * import { createProductSchema } from '@/lib/api/validation/zod-schemas'
 *
 * export async function POST(request: NextRequest) {
 *   const data = await parseAndValidateBody(request, createProductSchema)
 *   // data está validado y tipado correctamente
 * }
 * ```
 */

/**
 * Valida un objeto usando un schema Zod (para cuando el body ya fue parseado)
 *
 * Esta función es útil cuando ya tienes el objeto parseado y solo necesitas validarlo.
 * Para validar directamente desde un Request, usa `parseAndValidateBody`.
 *
 * @template T - Tipo del schema Zod (inferido automáticamente)
 * @param body - Objeto ya parseado a validar
 * @param schema - Schema Zod para validar el body
 * @returns Datos validados y parseados con el tipo inferido del schema
 * @throws {ValidationError} Si la validación falla, con detalles de los errores
 *
 * @example
 * ```typescript
 * const body = await request.json()
 * const validated = validateBody(body, createProductSchema)
 * // validated tiene el tipo correcto según createProductSchema
 * ```
 *
 * @see {@link parseAndValidateBody} Para validar directamente desde un Request
 */
export function validateBody<T extends z.ZodTypeAny>(
  body: unknown,
  schema: T,
): z.infer<T> {
  try {
    const validated = schema.parse(body);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      logger.warn(
        {
          errors: errors.map((e) => `${e.field}: ${e.message}`).join(", "),
          body: JSON.stringify(body),
        },
        "Validation failed",
      );

      throw new ValidationError(
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(", ")}`,
        errors,
      );
    }

    // Log unexpected errors
    if (error instanceof Error) {
      logger.error(error, "Unexpected error in validateBody", {
        body: JSON.stringify(body),
      });
    } else {
      logger.error(
        new Error(String(error)),
        "Unexpected error in validateBody",
        {
          body: JSON.stringify(body),
        },
      );
    }

    throw error;
  }
}

/**
 * Valida y parsea el body de una request usando un schema Zod
 *
 * Esta es la función más común para validar request bodies en API routes.
 * Combina el parsing del JSON y la validación en un solo paso.
 *
 * @template T - Tipo del schema Zod (inferido automáticamente)
 * @param request - Objeto NextRequest de Next.js
 * @param schema - Schema Zod para validar el body
 * @returns Promise que resuelve con los datos validados y parseados
 * @throws {ValidationError} Si el JSON es inválido o la validación falla
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const data = await parseAndValidateBody(request, createProductSchema)
 *   // data está validado y tipado
 *   await createProduct(data)
 * }
 * ```
 */
export async function parseAndValidateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return validateBody(body, schema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ValidationError("Invalid JSON in request body");
    }

    throw error;
  }
}

/**
 * Valida query parameters usando un schema Zod
 *
 * Convierte automáticamente los query parameters de strings a sus tipos apropiados
 * según el schema (números, booleanos, etc.).
 *
 * @template T - Tipo del schema Zod (inferido automáticamente)
 * @param request - Objeto NextRequest de Next.js
 * @param schema - Schema Zod para validar los query parameters
 * @returns Query parameters validados y parseados con tipos correctos
 * @throws {ValidationError} Si la validación falla
 *
 * @example
 * ```typescript
 * const query = parseAndValidateQuery(request, z.object({
 *   page: z.coerce.number().min(1),
 *   limit: z.coerce.number().min(1).max(100),
 *   search: z.string().optional()
 * }))
 * // query.page y query.limit son números, no strings
 * ```
 */
export function parseAndValidateQuery<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
): z.infer<T> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, string | string[]> = {};

    // Convertir URLSearchParams a objeto
    searchParams.forEach((value, key) => {
      if (params[key]) {
        // Si ya existe, convertir a array
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    });

    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      logger.warn(
        {
          errors: errors.map((e) => `${e.field}: ${e.message}`).join(", "),
        },
        "Query validation failed",
      );

      throw new ValidationError(
        `Query validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(", ")}`,
        errors,
      );
    }

    throw error;
  }
}

/**
 * Valida path parameters usando un schema Zod
 *
 * Útil para validar parámetros de ruta dinámicos (ej: `/api/products/[id]`).
 *
 * @template T - Tipo del schema Zod (inferido automáticamente)
 * @param params - Objeto con los path parameters (típicamente de `params` en route handlers)
 * @param schema - Schema Zod para validar los path parameters
 * @returns Path parameters validados y parseados
 * @throws {ValidationError} Si la validación falla
 *
 * @example
 * ```typescript
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   const { id } = parseAndValidateParams(params, z.object({
 *     id: z.string().uuid()
 *   }))
 *   // id está validado como UUID
 * }
 * ```
 */
export function parseAndValidateParams<T extends z.ZodTypeAny>(
  params: Record<string, string | string[] | undefined>,
  schema: T,
): z.infer<T> {
  try {
    const validated = schema.parse(params);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      logger.warn(
        {
          errors: errors.map((e) => `${e.field}: ${e.message}`).join(", "),
        },
        "Path params validation failed",
      );

      throw new ValidationError(
        `Path params validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(", ")}`,
        errors,
      );
    }

    throw error;
  }
}

/**
 * Middleware wrapper para manejar errores de validación automáticamente
 *
 * Envuelve un handler de API route con validación automática del body.
 * Si la validación falla, retorna una respuesta 400 con los errores.
 * Si hay un error inesperado, retorna 500.
 *
 * @template T - Tipo del schema Zod
 * @param schema - Schema Zod para validar el body del request
 * @param handler - Función handler que recibe los datos validados y el request
 * @returns Handler envuelto que maneja validación y errores automáticamente
 *
 * @example
 * ```typescript
 * export const POST = withValidation(
 *   createProductSchema,
 *   async (data, request) => {
 *     // data está validado y tipado
 *     const product = await createProduct(data)
 *     return NextResponse.json(product)
 *   }
 * )
 * ```
 */
export function withValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    validatedData: z.infer<T>,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const validatedData = await parseAndValidateBody(request, schema);
      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            details: error.details || undefined,
          },
          { status: 400 },
        );
      }

      if (error instanceof Error) {
        logger.error(error, "Unexpected error in validation handler");
      } else {
        logger.error(
          new Error(String(error)),
          "Unexpected error in validation handler",
        );
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Helper para crear respuestas de error de validación consistentes
 *
 * Convierte errores de validación (ValidationError o ZodError) en respuestas
 * HTTP 400 con formato consistente.
 *
 * @param error - Error de validación (ValidationError o ZodError)
 * @returns NextResponse con status 400 y detalles del error
 *
 * @example
 * ```typescript
 * try {
 *   const data = await parseAndValidateBody(request, schema)
 * } catch (error) {
 *   return validationErrorResponse(error)
 * }
 * ```
 */
export function validationErrorResponse(
  error: ValidationError | z.ZodError,
): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details || undefined,
      },
      { status: 400 },
    );
  }

  if (error instanceof z.ZodError) {
    const errors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: "Validation failed",
        details: errors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: "Validation error" }, { status: 400 });
}
