import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export formatting utilities
export {
  type CurrencyFormatOptions,
  type DateFormatOptions,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
  formatRelativeDate,
  formatTimeAgo,
  type Locale,
} from "./utils/formatting";
