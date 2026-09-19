import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Máscara de telefone brasileiro: (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
export function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11)

  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

// Máscara de nome: só letras/espaços/hífen/apóstrofo, com capitalização por palavra
export function maskName(value: string, maxLen = 50): string {
  return value
    .replace(/[^A-Za-zÀ-ÿ'\-\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen)
    .split(" ")
    .map((word) =>
      word.length > 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : ""
    )
    .join(" ")
}

// Máscara de email: minúsculo, sem espaços, só caracteres válidos e um único "@"
export function maskEmail(value: string, maxLen = 80): string {
  let formatted = value
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9@._+\-]/g, "")

  const atIndex = formatted.indexOf("@")
  if (atIndex !== -1) {
    const local = formatted.slice(0, atIndex).replace(/@/g, "")
    const domain = formatted.slice(atIndex + 1).replace(/@/g, "")
    formatted = `${local}@${domain}`
  }

  return formatted.slice(0, maxLen)
}

// Retorna headers com o token JWT de autenticação do localStorage se disponível no browser
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }
}
