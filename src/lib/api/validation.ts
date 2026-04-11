import { ValidationError } from "./errors";

/**
 * Regla de validación para un campo
 *
 * @template T - Tipo de los valores permitidos en el enum
 *
 * @property {boolean} [required] - Si el campo es requerido
 * @property {'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'url'} [type] - Tipo de dato esperado
 * @property {number} [minLength] - Longitud mínima (para strings)
 * @property {number} [maxLength] - Longitud máxima (para strings)
 * @property {number} [min] - Valor mínimo (para números)
 * @property {number} [max] - Valor máximo (para números)
 * @property {RegExp} [pattern] - Patrón regex para validación
 * @property {T[]} [enum] - Lista de valores permitidos
 * @property {(value: any) => boolean | string} [custom] - Función de validación personalizada
 *
 * @example
 * const rule: ValidationRule = {
 *   required: true,
 *   type: 'email',
 *   minLength: 5
 * }
 */
export type ValidationRule<T = unknown> = {
  required?: boolean;
  type?: "string" | "number" | "boolean" | "object" | "array" | "email" | "url";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: T[];
  custom?: (value: unknown) => boolean | string;
};

/**
 * Esquema de validación que mapea nombres de campos a sus reglas
 *
 * @example
 * const schema: ValidationSchema = {
 *   email: { required: true, type: 'email' },
 *   age: { type: 'number', min: 0, max: 120 }
 * }
 */
export type ValidationSchema = {
  [key: string]: ValidationRule;
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/.+\..+$/;

// Argentina phone number regex
const ARGENTINA_PHONE_REGEX = /^(\+54)?[0-9]{10,11}$/;

/**
 * Valida un campo individual según una regla de validación
 *
 * @param fieldName - Nombre del campo a validar (para mensajes de error)
 * @param value - Valor a validar
 * @param rule - Regla de validación a aplicar
 * @returns Array de mensajes de error (vacío si no hay errores)
 *
 * @internal
 * Esta función es usada internamente por validateRequestBody y validateQueryParams
 */
function validateField(
  fieldName: string,
  value: unknown,
  rule: ValidationRule,
): string[] {
  const errors: string[] = [];

  // Required validation
  if (
    rule.required &&
    (value === undefined || value === null || value === "")
  ) {
    errors.push(`${fieldName} is required`);
    return errors; // Don't continue if required field is missing
  }

  // Skip other validations if field is not provided and not required
  if (value === undefined || value === null || value === "") {
    return errors;
  }

  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push(`${fieldName} must be a string`);
        }
        break;
      case "number":
        if (typeof value !== "number" && !Number.isFinite(Number(value))) {
          errors.push(`${fieldName} must be a number`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          errors.push(`${fieldName} must be a boolean`);
        }
        break;
      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`${fieldName} must be an object`);
        }
        break;
      case "array":
        if (!Array.isArray(value)) {
          errors.push(`${fieldName} must be an array`);
        }
        break;
      case "email":
        if (typeof value === "string" && !EMAIL_REGEX.test(value)) {
          errors.push(`${fieldName} must be a valid email address`);
        }
        break;
      case "url":
        if (typeof value === "string" && !URL_REGEX.test(value)) {
          errors.push(`${fieldName} must be a valid URL`);
        }
        break;
    }
  }

  // String validations
  if (typeof value === "string") {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(
        `${fieldName} must be no more than ${rule.maxLength} characters`,
      );
    }
  }

  // Number validations
  if (typeof value === "number") {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${fieldName} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${fieldName} must be no more than ${rule.max}`);
    }
  }

  // Pattern validation
  if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
    errors.push(`${fieldName} format is invalid`);
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rule.enum.join(", ")}`);
  }

  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      errors.push(
        typeof result === "string" ? result : `${fieldName} is invalid`,
      );
    }
  }

  return errors;
}

/**
 * Valida el cuerpo de una petición HTTP contra un esquema de validación
 *
 * @param body - Objeto con los datos a validar (típicamente de request.json())
 * @param schema - Esquema de validación que define las reglas para cada campo
 * @throws {ValidationError} Si la validación falla, lanza un error con los detalles
 *
 * @example
 * ```typescript
 * const schema: ValidationSchema = {
 *   email: { required: true, type: 'email' },
 *   password: { required: true, type: 'string', minLength: 8 }
 * }
 *
 * try {
 *   validateRequestBody(requestBody, schema)
 *   // Validación exitosa
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     // Manejar error de validación
 *   }
 * }
 * ```
 */
export function validateRequestBody(
  body: unknown,
  schema: ValidationSchema,
): void {
  const errors: string[] = [];

  for (const [fieldName, rule] of Object.entries(schema)) {
    const fieldErrors = validateField(fieldName, body?.[fieldName], rule);
    errors.push(...fieldErrors);
  }

  if (errors.length > 0) {
    throw new ValidationError(`Validation failed: ${errors.join(", ")}`);
  }
}

/**
 * Valida los parámetros de consulta (query parameters) de una URL contra un esquema
 *
 * Convierte automáticamente strings a números o booleanos según el tipo especificado
 * en el esquema.
 *
 * @param searchParams - URLSearchParams de la petición
 * @param schema - Esquema de validación que define las reglas para cada parámetro
 * @throws {ValidationError} Si la validación falla, lanza un error con los detalles
 *
 * @example
 * ```typescript
 * const schema: ValidationSchema = {
 *   page: { type: 'number', min: 1 },
 *   limit: { type: 'number', min: 1, max: 100 },
 *   active: { type: 'boolean' }
 * }
 *
 * const searchParams = new URL(request.url).searchParams
 * validateQueryParams(searchParams, schema)
 * ```
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: ValidationSchema,
): void {
  const errors: string[] = [];

  for (const [fieldName, rule] of Object.entries(schema)) {
    let value: unknown = searchParams.get(fieldName);

    // Convert string values to appropriate types
    if (value !== null && rule.type) {
      switch (rule.type) {
        case "number":
          value = Number(value);
          break;
        case "boolean":
          value = value === "true";
          break;
      }
    }

    const fieldErrors = validateField(fieldName, value, rule);
    errors.push(...fieldErrors);
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Query parameter validation failed: ${errors.join(", ")}`,
    );
  }
}

/**
 * Esquemas de validación comunes reutilizables en toda la aplicación
 *
 * Estos esquemas pueden ser usados directamente o extendidos para casos específicos
 *
 * @example
 * ```typescript
 * // Usar directamente
 * validateRequestBody(body, commonSchemas.userLogin)
 *
 * // Extender para casos específicos
 * const customSchema = {
 *   ...commonSchemas.userRegistration,
 *   phone: { required: true, type: 'string', pattern: PHONE_REGEX }
 * }
 * ```
 */
export const commonSchemas = {
  // User registration
  userRegistration: {
    email: { required: true, type: "email" as const },
    password: { required: true, type: "string" as const, minLength: 8 },
    firstName: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 50,
    },
    phone: {
      type: "string" as const,
      pattern: ARGENTINA_PHONE_REGEX,
      custom: (value: string) =>
        !value ||
        ARGENTINA_PHONE_REGEX.test(value) ||
        "Phone number must be a valid Argentina number",
    },
  },

  // User login
  userLogin: {
    email: { required: true, type: "email" as const },
    password: { required: true, type: "string" as const, minLength: 1 },
  },

  // Contact form
  contactForm: {
    name: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 100,
    },
    email: { required: true, type: "email" as const },
    subject: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 200,
    },
    message: {
      required: true,
      type: "string" as const,
      minLength: 10,
      maxLength: 1000,
    },
  },

  // Newsletter subscription
  newsletter: {
    email: { required: true, type: "email" as const },
    name: { type: "string" as const, maxLength: 100 },
  },

  // Checkout request
  checkout: {
    items: { required: true, type: "array" as const },
    payer_info: { required: true, type: "object" as const },
  },

  // Pagination
  pagination: {
    page: { type: "number" as const, min: 1 },
    limit: { type: "number" as const, min: 1, max: 100 },
    sort: { type: "string" as const, enum: ["asc", "desc"] },
  },
};

/**
 * Sanitiza datos de entrada eliminando espacios en blanco y normalizando strings
 *
 * Esta función recursivamente sanitiza strings, arrays y objetos:
 * - Strings: elimina espacios al inicio y final (trim)
 * - Arrays: sanitiza cada elemento
 * - Objetos: sanitiza cada propiedad
 *
 * @param data - Datos a sanitizar (puede ser string, array, objeto o primitivo)
 * @returns Datos sanitizados con el mismo tipo y estructura
 *
 * @example
 * ```typescript
 * sanitizeInput("  hello  ") // "hello"
 * sanitizeInput({ name: "  John  ", age: 30 }) // { name: "John", age: 30 }
 * sanitizeInput(["  a  ", "  b  "]) // ["a", "b"]
 * ```
 */
export function sanitizeInput(data: unknown): unknown {
  if (typeof data === "string") {
    return data.trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (data && typeof data === "object") {
    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Parsea y valida el cuerpo de una petición HTTP en un solo paso
 *
 * Esta función combina el parsing del JSON, sanitización y validación.
 * Útil para API routes de Next.js.
 *
 * @param request - Objeto Request de Next.js
 * @param schema - Esquema de validación a aplicar
 * @returns Promise que resuelve con el cuerpo parseado y validado
 * @throws {ValidationError} Si el JSON es inválido o la validación falla
 *
 * @example
 * ```typescript
 * // En un API route
 * export async function POST(request: Request) {
 *   const body = await parseAndValidateBody(request, {
 *     email: { required: true, type: 'email' },
 *     name: { required: true, type: 'string', minLength: 2 }
 *   })
 *
 *   // body está validado y sanitizado
 *   // ...
 * }
 * ```
 */
export async function parseAndValidateBody(
  request: Request,
  schema: ValidationSchema,
): Promise<unknown> {
  try {
    const body = await request.json();
    const sanitizedBody = sanitizeInput(body);
    validateRequestBody(sanitizedBody, schema);
    return sanitizedBody;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError("Invalid JSON in request body");
    }
    throw error;
  }
}
