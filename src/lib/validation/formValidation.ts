/**
 * Form Validation Utilities
 * 
 * Utilidades y esquemas de validación comunes para formularios.
 * Proporciona esquemas Zod predefinidos y funciones de validación reutilizables.
 * 
 * @module lib/validation/formValidation
 */

import { z } from "zod";

/**
 * Esquema de validación para RUT chileno
 */
export const rutSchema = z
  .string()
  .min(1, "El RUT es requerido")
  .refine(
    (value) => {
      // Formato: XX.XXX.XXX-X o XXXXXXXX-X
      const rutRegex = /^(\d{1,2}\.?\d{3}\.?\d{3}-)[\dKk]$/;
      return rutRegex.test(value);
    },
    { message: "Formato de RUT inválido" }
  )
  .refine(
    (value) => {
      // Validar dígito verificador
      const cleanRut = value.replace(/\./g, "").replace(/-/g, "");
      const rut = cleanRut.slice(0, -1);
      const dv = cleanRut.slice(-1).toUpperCase();
      
      let sum = 0;
      let multiplier = 2;
      
      for (let i = rut.length - 1; i >= 0; i--) {
        sum += parseInt(rut[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
      }
      
      const expectedDv = 11 - (sum % 11);
      const calculatedDv = expectedDv === 11 ? "0" : expectedDv === 10 ? "K" : expectedDv.toString();
      
      return calculatedDv === dv;
    },
    { message: "RUT inválido" }
  );

/**
 * Esquema de validación para email
 */
export const emailSchema = z
  .string()
  .min(1, "El email es requerido")
  .email("Email inválido");

/**
 * Esquema de validación para teléfono chileno
 */
export const phoneSchema = z
  .string()
  .min(1, "El teléfono es requerido")
  .refine(
    (value) => {
      // Formato: +56 9 XXXX XXXX o 9 XXXX XXXX
      const phoneRegex = /^(\+56\s?)?9\s?\d{4}\s?\d{4}$/;
      return phoneRegex.test(value.replace(/[-.]/g, " "));
    },
    { message: "Formato de teléfono inválido" }
  )
  .optional();

/**
 * Esquema de validación para nombre
 */
export const nameSchema = z
  .string()
  .min(1, "El nombre es requerido")
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(100, "El nombre no puede exceder 100 caracteres")
  .refine(
    (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value),
    { message: "El nombre solo puede contener letras y espacios" }
  );

/**
 * Esquema de validación para precio
 */
export const priceSchema = z
  .string()
  .min(1, "El precio es requerido")
  .refine(
    (value) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
    { message: "El precio debe ser un número positivo" }
  )
  .transform((value) => parseFloat(value));

/**
 * Esquema de validación para cantidad
 */
export const quantitySchema = z
  .string()
  .min(1, "La cantidad es requerida")
  .refine(
    (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    { message: "La cantidad debe ser un número positivo" }
  )
  .transform((value) => parseInt(value));

/**
 * Esquema de validación para URL
 */
export const urlSchema = z
  .string()
  .url("URL inválida")
  .optional();

/**
 * Esquema de validación para fecha
 */
export const dateSchema = z
  .string()
  .min(1, "La fecha es requerida")
  .refine(
    (value) => !isNaN(Date.parse(value)),
    { message: "Fecha inválida" }
  );

/**
 * Esquema de validación para código postal chileno
 */
export const postalCodeSchema = z
  .string()
  .min(1, "El código postal es requerido")
  .refine(
    (value) => /^\d{7}$/.test(value),
    { message: "El código postal debe tener 7 dígitos" }
  );

/**
 * Esquema de validación para dirección
 */
export const addressSchema = z
  .string()
  .min(1, "La dirección es requerida")
  .min(5, "La dirección debe tener al menos 5 caracteres")
  .max(200, "La dirección no puede exceder 200 caracteres");

/**
 * Esquema de validación para ciudad
 */
export const citySchema = z
  .string()
  .min(1, "La ciudad es requerida")
  .min(2, "La ciudad debe tener al menos 2 caracteres")
  .max(100, "La ciudad no puede exceder 100 caracteres");

/**
 * Esquema de validación para contraseña
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .refine(
    (value) => /[A-Z]/.test(value),
    { message: "La contraseña debe contener al menos una mayúscula" }
  )
  .refine(
    (value) => /[a-z]/.test(value),
    { message: "La contraseña debe contener al menos una minúscula" }
  )
  .refine(
    (value) => /\d/.test(value),
    { message: "La contraseña debe contener al menos un número" }
  )
  .refine(
    (value) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
    { message: "La contraseña debe contener al menos un carácter especial" }
  );

/**
 * Esquema de validación para confirmación de contraseña
 */
export const passwordConfirmationSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "La confirmación es requerida"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

/**
 * Esquema de validación para cliente
 */
export const customerSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  rut: rutSchema.optional(),
  address_line_1: addressSchema.optional(),
  address_line_2: addressSchema.optional(),
  city: citySchema.optional(),
  state: z.string().optional(),
  postal_code: postalCodeSchema.optional(),
  country: z.string().default("Chile"),
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
  branch_id: z.string().optional(),
});

/**
 * Esquema de validación para producto
 */
export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
  price: priceSchema,
  sku: z.string().min(1, "El SKU es requerido").max(50, "El SKU no puede exceder 50 caracteres"),
  barcode: z.string().max(50, "El código de barras no puede exceder 50 caracteres").optional(),
  brand: z.string().max(100, "La marca no puede exceder 100 caracteres").optional(),
  category_id: z.string().min(1, "La categoría es requerida"),
  status: z.enum(["active", "draft", "archived"], {
    errorMap: () => ({ message: "Estado inválido" }),
  }),
});

/**
 * Esquema de validación para orden
 */
export const orderSchema = z.object({
  customer_id: z.string().min(1, "El cliente es requerido"),
  items: z.array(z.object({
    product_id: z.string().min(1, "El producto es requerido"),
    quantity: quantitySchema,
    price: priceSchema,
  })).min(1, "La orden debe tener al menos un item"),
  shipping_address: addressSchema,
  shipping_city: citySchema,
  shipping_state: z.string().min(1, "La región es requerida"),
  shipping_postal_code: postalCodeSchema,
  shipping_phone: phoneSchema,
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

/**
 * Esquema de validación para cita
 */
export const appointmentSchema = z.object({
  customer_id: z.string().min(1, "El cliente es requerido"),
  appointment_date: dateSchema,
  appointment_time: z.string().min(1, "La hora es requerida"),
  duration_minutes: z.number().min(15, "La duración mínima es 15 minutos").max(180, "La duración máxima es 180 minutos"),
  appointment_type: z.enum(["examen", "entrega", "ajuste", "revisión", "otro"], {
    errorMap: () => ({ message: "Tipo de cita inválido" }),
  }),
  reason: z.string().min(1, "El motivo es requerido").max(200, "El motivo no puede exceder 200 caracteres"),
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

/**
 * Esquema de validación para receta
 */
export const prescriptionSchema = z.object({
  customer_id: z.string().min(1, "El cliente es requerido"),
  right_eye_sphere: z.string().optional(),
  right_eye_cylinder: z.string().optional(),
  right_eye_axis: z.string().optional(),
  right_eye_addition: z.string().optional(),
  left_eye_sphere: z.string().optional(),
  left_eye_cylinder: z.string().optional(),
  left_eye_axis: z.string().optional(),
  left_eye_addition: z.string().optional(),
  pd_far: z.string().optional(),
  pd_near: z.string().optional(),
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

/**
 * Función para validar RUT
 */
export function validateRUT(rut: string): boolean {
  const cleanRut = rut.replace(/\./g, "").replace(/-/g, "");
  if (cleanRut.length < 8 || cleanRut.length > 9) return false;
  
  const rutNumber = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDv = 11 - (sum % 11);
  const calculatedDv = expectedDv === 11 ? "0" : expectedDv === 10 ? "K" : expectedDv.toString();
  
  return calculatedDv === dv;
}

/**
 * Función para formatear RUT
 */
export function formatRUT(rut: string): string {
  const cleanRut = rut.replace(/\./g, "").replace(/-/g, "");
  if (cleanRut.length < 8) return rut;
  
  const rutNumber = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  
  // Formatear con puntos: XX.XXX.XXX
  let formatted = "";
  let count = 0;
  
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      formatted = "." + formatted;
    }
    formatted = rutNumber[i] + formatted;
    count++;
  }
  
  return formatted + "-" + dv;
}

/**
 * Función para validar email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Función para validar teléfono chileno
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[-.\s]/g, "");
  const phoneRegex = /^(\+56)?9\d{8}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Función para formatear teléfono chileno
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  
  if (cleanPhone.startsWith("+56")) {
    return `+56 9 ${cleanPhone.slice(3, 7)} ${cleanPhone.slice(7)}`;
  }
  
  if (cleanPhone.startsWith("9") && cleanPhone.length === 9) {
    return `9 ${cleanPhone.slice(1, 5)} ${cleanPhone.slice(5)}`;
  }
  
  return phone;
}

/**
 * Exportar todos los esquemas y funciones
 */
export const formValidationSchemas = {
  rut: rutSchema,
  email: emailSchema,
  phone: phoneSchema,
  name: nameSchema,
  price: priceSchema,
  quantity: quantitySchema,
  url: urlSchema,
  date: dateSchema,
  postalCode: postalCodeSchema,
  address: addressSchema,
  city: citySchema,
  password: passwordSchema,
  passwordConfirmation: passwordConfirmationSchema,
  customer: customerSchema,
  product: productSchema,
  order: orderSchema,
  appointment: appointmentSchema,
  prescription: prescriptionSchema,
};

export const formValidationUtils = {
  validateRUT,
  formatRUT,
  validateEmail,
  validatePhone,
  formatPhone,
};
