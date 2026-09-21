import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(value?: number | null) {
  return value ? `${new Intl.NumberFormat("vi-VN").format(value)}đ` : "Liên hệ báo giá"
}
