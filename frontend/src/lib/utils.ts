import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Development mode detection utility
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";

// Safe console logging for development only
export const devLog = {
  log: (...args: any[]) => isDevelopment && console.log(...args),
  error: (...args: any[]) => isDevelopment && console.error(...args),
  warn: (...args: any[]) => isDevelopment && console.warn(...args),
  info: (...args: any[]) => isDevelopment && console.info(...args),
};
