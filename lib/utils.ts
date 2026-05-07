import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";
}

