import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Máscara de telefone brasileiro: (00) 00000-0000 / (00) 0000-0000
export function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11)

  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
}
