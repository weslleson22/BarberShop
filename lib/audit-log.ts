/**
 * @file lib/audit-log.ts
 * @description Serviço centralizado de AuditLog.
 *
 * REGRAS:
 * - NUNCA registrar: senha, token, JWT, secrets, refreshToken, accessToken
 * - Falha silenciosa (não interrompe o fluxo principal da aplicação)
 * - Respeita Multi-Tenant (barbershopId)
 * - Respeita RBAC (userId + role)
 * - Dados sensíveis são sanitizados antes de gravar em metadata
 */

import { prisma } from "@/lib/prisma";
import { AuditAction, AuditEntity } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Campos sensíveis que JAMAIS devem aparecer nos logs
// ─────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "accessToken",
  "refreshToken",
  "jwt",
  "secret",
  "apiKey",
  "api_key",
  "privateKey",
  "private_key",
  "clientSecret",
  "client_secret",
  "authorization",
  "cookie",
  "sessionId",
  "session_id",
  "cvv",
  "cardNumber",
  "card_number",
]);

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface CreateAuditLogInput {
  /** ID do usuário que realizou a ação (null = sistema/automatizado) */
  userId?: string | null;

  /** ID da barbearia (null = ação global, ex: DEVELOPER sem tenant) */
  barbershopId?: string | null;

  /** A ação realizada */
  action: AuditAction;

  /** A entidade afetada */
  entity: AuditEntity;

  /** ID do registro afetado */
  entityId?: string | null;

  /** IP do cliente (deve ser anonimizado se necessário) */
  ipAddress?: string | null;

  /** User-Agent do cliente */
  userAgent?: string | null;

  /** Dados adicionais — serão sanitizados automaticamente */
  metadata?: Record<string, unknown>;

  /** Indica se a operação foi bem-sucedida */
  success?: boolean;

  /** Mensagem de erro (quando success = false) */
  errorMessage?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Sanitização recursiva de dados sensíveis
// ─────────────────────────────────────────────────────────────

function sanitizeMetadata(
  data: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  // Limita profundidade para evitar loops em objetos circulares
  if (depth > 5) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(
        value as Record<string, unknown>,
        depth + 1
      );
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === "object"
          ? sanitizeMetadata(item as Record<string, unknown>, depth + 1)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ─────────────────────────────────────────────────────────────
// Função principal — falha silenciosa
// ─────────────────────────────────────────────────────────────

export async function createAuditLog(
  input: CreateAuditLogInput
): Promise<void> {
  try {
    const sanitizedMetadata = input.metadata
      ? sanitizeMetadata(input.metadata)
      : {};

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        barbershopId: input.barbershopId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent
          ? input.userAgent.substring(0, 500)
          : null,
        metadata: sanitizedMetadata as import("@prisma/client").Prisma.InputJsonValue,
        success: input.success ?? true,
        errorMessage: input.errorMessage ?? null,
      },
    });
  } catch (error) {
    // Falha silenciosa — AuditLog nunca deve quebrar o fluxo principal
    console.error("[AuditLog] Falha ao registrar audit log:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: extrai IP e User-Agent da requisição Next.js
// ─────────────────────────────────────────────────────────────

export function extractRequestContext(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipRaw = forwarded ? forwarded.split(",")[0].trim() : realIp;

  return {
    ipAddress: ipRaw ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Re-exporta enums para conveniência nos pontos de integração
// ─────────────────────────────────────────────────────────────

export { AuditAction, AuditEntity };
