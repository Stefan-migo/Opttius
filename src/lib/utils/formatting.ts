/**
 * Utilidades compartidas para formateo de datos
 *
 * Este módulo centraliza funciones de formateo que se usan repetidamente
 * en toda la aplicación, reduciendo duplicación de código.
 *
 * @module lib/utils/formatting
 */

/**
 * Opciones de localización para formateo
 */
export type Locale = "es-CL" | "es-AR" | "es-ES";

/** Zona horaria por defecto para ópticas en Chile */
const DEFAULT_TIMEZONE = "America/Santiago";

/**
 * Opciones para formateo de fechas
 */
export interface DateFormatOptions {
  locale?: Locale;
  includeTime?: boolean;
  includeYear?: boolean;
  format?: "short" | "medium" | "long" | "full";
  /** Zona horaria para mostrar la fecha (default: America/Santiago) */
  timeZone?: string;
}

/**
 * Opciones para formateo de moneda
 */
export interface CurrencyFormatOptions {
  locale?: Locale;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formatea una fecha según las opciones especificadas
 *
 * @param date - Fecha a formatear (string ISO, Date object, o timestamp)
 * @param options - Opciones de formateo
 * @returns Fecha formateada como string
 *
 * @example
 * formatDate('2024-01-15') // '15/1/2024'
 * formatDate('2024-01-15', { includeTime: true }) // '15/1/2024, 10:30'
 * formatDate('2024-01-15', { format: 'long' }) // '15 de enero de 2024'
 */
export function formatDate(
  date: string | Date | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  if (!date) {
    return "Sin fecha";
  }

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (isNaN(dateObj.getTime())) {
      return "Sin fecha";
    }

    const {
      locale = "es-CL",
      includeTime = false,
      includeYear = true,
      format = "short",
      timeZone = DEFAULT_TIMEZONE,
    } = options;

    const formatOptions: Intl.DateTimeFormatOptions = {};

    switch (format) {
      case "short":
        formatOptions.day = "numeric";
        formatOptions.month = "numeric";
        if (includeYear) {
          formatOptions.year = "numeric";
        }
        break;
      case "medium":
        formatOptions.day = "numeric";
        formatOptions.month = "short";
        if (includeYear) {
          formatOptions.year = "numeric";
        }
        break;
      case "long":
        formatOptions.day = "numeric";
        formatOptions.month = "long";
        if (includeYear) {
          formatOptions.year = "numeric";
        }
        break;
      case "full":
        formatOptions.weekday = "long";
        formatOptions.day = "numeric";
        formatOptions.month = "long";
        if (includeYear) {
          formatOptions.year = "numeric";
        }
        break;
    }

    if (includeTime) {
      formatOptions.hour = "2-digit";
      formatOptions.minute = "2-digit";
    }
    formatOptions.timeZone = timeZone;

    return dateObj.toLocaleDateString(locale, formatOptions);
  } catch (error) {
    return "Sin fecha";
  }
}

/**
 * Formatea una fecha con formato relativo (Hoy, Ayer, o fecha completa)
 *
 * @param date - Fecha a formatear
 * @param locale - Locale a usar (default: 'es-ES')
 * @returns Fecha formateada con formato relativo
 *
 * @example
 * formatRelativeDate('2024-01-15') // 'Hoy' si es hoy, 'Ayer' si fue ayer, o '15 de enero' si es otra fecha
 */
export function formatRelativeDate(
  date: string | Date | number | null | undefined,
  locale: Locale = "es-ES",
): string {
  if (!date) {
    return "Sin fecha";
  }

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (isNaN(dateObj.getTime())) {
      return "Sin fecha";
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return dateObj.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year:
          dateObj.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  } catch (error) {
    return "Sin fecha";
  }
}

/**
 * Formatea un número como moneda
 *
 * @param amount - Cantidad a formatear
 * @param options - Opciones de formateo
 * @returns Cantidad formateada como moneda
 *
 * @example
 * formatCurrency(10000) // '$10.000' (CLP)
 * formatCurrency(10000, { locale: 'es-AR', currency: 'ARS' }) // '$10.000' (ARS)
 * formatCurrency(10000.50, { maximumFractionDigits: 2 }) // '$10.000,50'
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "$0";
  }

  const {
    locale = "es-CL",
    currency = "CLP",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formatea un número como precio (sin símbolo de moneda, solo formato numérico)
 *
 * @param price - Precio a formatear
 * @param locale - Locale a usar (default: 'es-CL')
 * @returns Precio formateado
 *
 * @example
 * formatPrice(10000) // '10.000'
 * formatPrice(10000.50) // '10.000,50'
 */
export function formatPrice(
  price: number | null | undefined,
  locale: Locale = "es-CL",
): string {
  if (price === null || price === undefined || isNaN(price)) {
    return "0";
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formatea un número con separadores de miles
 *
 * @param number - Número a formatear
 * @param locale - Locale a usar (default: 'es-CL')
 * @returns Número formateado
 *
 * @example
 * formatNumber(10000) // '10.000'
 * formatNumber(1000000) // '1.000.000'
 */
export function formatNumber(
  number: number | null | undefined,
  locale: Locale = "es-CL",
): string {
  if (number === null || number === undefined || isNaN(number)) {
    return "0";
  }

  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Formatea una fecha y hora completa
 *
 * @param dateTime - Fecha y hora a formatear
 * @param locale - Locale a usar (default: 'es-CL')
 * @returns Fecha y hora formateada
 *
 * @example
 * formatDateTime('2024-01-15T10:30:00') // '15/1/2024, 10:30'
 */
export function formatDateTime(
  dateTime: string | Date | number | null | undefined,
  locale: Locale = "es-CL",
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  if (!dateTime) {
    return "Sin fecha";
  }

  try {
    const dateObj =
      typeof dateTime === "string" || typeof dateTime === "number"
        ? new Date(dateTime)
        : dateTime;

    if (isNaN(dateObj.getTime())) {
      return "Sin fecha";
    }

    return dateObj.toLocaleString(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  } catch (error) {
    return "Sin fecha";
  }
}

/**
 * Formatea un tiempo relativo (hace X minutos, hace X horas, etc.)
 *
 * @param date - Fecha a comparar
 * @param locale - Locale a usar (default: 'es-ES')
 * @returns Tiempo relativo formateado
 *
 * @example
 * formatTimeAgo(new Date(Date.now() - 30000)) // 'Hace 30 segundos'
 * formatTimeAgo(new Date(Date.now() - 3600000)) // 'Hace 1 hora'
 */
export function formatTimeAgo(
  date: string | Date | number | null | undefined,
  locale: Locale = "es-ES",
): string {
  if (!date) {
    return "Sin fecha";
  }

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (isNaN(dateObj.getTime())) {
      return "Sin fecha";
    }

    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - dateObj.getTime()) / 1000,
    );

    if (diffInSeconds < 60) {
      return "Hace menos de un minuto";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? "minuto" : "minutos"}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `Hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `Hace ${diffInWeeks} ${diffInWeeks === 1 ? "semana" : "semanas"}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `Hace ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `Hace ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
  } catch (error) {
    return "Sin fecha";
  }
}
