import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!requireRole(user, ["DEVELOPER"])) {
      return NextResponse.json({ error: "Acesso restrito ao desenvolvedor da plataforma" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50")));
    const skip = (page - 1) * limit;

    // Filtros
    const action = searchParams.get("action") ?? undefined;
    const entity = searchParams.get("entity") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const barbershopId = searchParams.get("barbershopId") ?? undefined;
    const success = searchParams.get("success");
    const search = searchParams.get("search") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (barbershopId) where.barbershopId = barbershopId;
    if (success !== null && success !== undefined) {
      where.success = success === "true";
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { barbershop: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          success: true,
          errorMessage: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          userId: true,
          barbershopId: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          barbershop: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API] /api/developer/audit-logs error:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar audit logs" },
      { status: 500 }
    );
  }
}
