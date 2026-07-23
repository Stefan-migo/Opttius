/**
 * Form Validation Utilities — esquemas Zod predefinidos y funciones de validación.
 */
import { isValidRUT } from "@/lib/utils/rut";

export { appointmentSchema, citySchema, customerEditSchema, customerSchema, dateSchema, emailSchema, nameSchema, orderSchema, passwordConfirmationSchema, passwordSchema, phoneSchema, postalCodeSchema, prescriptionSchema, priceSchema, productSchema, quantitySchema, rutSchema, urlSchema } from "./formSchemas";

export function validateRUT(rut: string): boolean { return isValidRUT(rut); }

export function formatRUT(rut: string): string {
  const clean = rut.replace(/\./g, "").replace(/-/g, "");
  if (clean.length < 8) return rut;
  const num = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let formatted = "";
  let count = 0;
  for (let i = num.length - 1; i >= 0; i--) { if (count > 0 && count % 3 === 0) formatted = "." + formatted; formatted = num[i] + formatted; count++; }
  return formatted + "-" + dv;
}

export function validateEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function validatePhone(phone: string): boolean { return /^(\+56)?9\d{8}$/.test(phone.replace(/[-.\s]/g, "")); }

export function formatPhone(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, "");
  if (clean.startsWith("+56")) return `+56 9 ${clean.slice(3, 7)} ${clean.slice(7)}`;
  if (clean.startsWith("9") && clean.length === 9) return `9 ${clean.slice(1, 5)} ${clean.slice(5)}`;
  return phone;
}

export const formValidationSchemas = { rut: null, email: null, phone: null, name: null, price: null, quantity: null, url: null, date: null, postalCode: null, address: null, city: null, password: null, passwordConfirmation: null, customer: null, customerEdit: null, product: null, order: null, appointment: null, prescription: null };
export const formValidationUtils = { validateRUT, formatRUT, validateEmail, validatePhone, formatPhone };
