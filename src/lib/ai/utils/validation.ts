export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().replace(/[<>]/g, "").slice(0, 10000);
}

export function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeToolParams(params: unknown): unknown {
  if (typeof params !== "object" || params === null) {
    return {};
  }

  const sanitized: unknown = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeInput(item) : item,
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeToolParams(value);
    }
  }

  return sanitized;
}
