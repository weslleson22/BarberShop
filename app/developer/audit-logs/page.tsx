"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
  Building2,
  Globe,
  Eye,
} from "lucide-react";

// ─── Helpers de data (Intl nativo) ────────────────────────
function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateStr));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return `há ${months} meses`;
}

// ─── Tipos ───────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  success: boolean;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string | null;
  barbershopId: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
  barbershop: { id: string; name: string; slug: string | null } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Cores por action ───────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-500/15 text-green-400 border-green-500/30",
  LOGOUT: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  LOGIN_FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  CREATE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  UPDATE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  VIEW: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  APPOINTMENT_CREATED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPOINTMENT_CANCELLED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  SUBSCRIPTION_ACTIVATED: "bg-green-500/15 text-green-400 border-green-500/30",
  SUBSCRIPTION_CANCELED: "bg-red-500/15 text-red-400 border-red-500/30",
  TRIAL_STARTED: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  TRIAL_EXPIRED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PAYMENT_RECEIVED: "bg-green-500/15 text-green-400 border-green-500/30",
  PAYMENT_FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  WEBHOOK_RECEIVED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  WEBHOOK_FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  DATA_DELETED: "bg-red-500/15 text-red-400 border-red-500/30",
  DATA_EXPORTED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

function getActionColor(action: string) {
  return (
    ACTION_COLORS[action] ??
    "bg-gray-500/15 text-gray-400 border-gray-500/30"
  );
}

// ─── Ações disponíveis para filtro ─────────────────────────

const AUDIT_ACTIONS = [
  "LOGIN", "LOGOUT", "LOGIN_FAILED", "PASSWORD_CHANGED",
  "CREATE", "UPDATE", "DELETE", "VIEW",
  "APPOINTMENT_CREATED", "APPOINTMENT_UPDATED", "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_CANCELLED", "APPOINTMENT_COMPLETED", "APPOINTMENT_NO_SHOW",
  "USER_INVITED", "USER_ACTIVATED", "USER_DEACTIVATED", "USER_ROLE_CHANGED",
  "CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_DELETED",
  "SERVICE_CREATED", "SERVICE_UPDATED", "SERVICE_DELETED",
  "SUBSCRIPTION_CREATED", "SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_SUSPENDED", "TRIAL_STARTED", "TRIAL_EXPIRED",
  "PAYMENT_RECEIVED", "PAYMENT_FAILED",
  "PRIVACY_REQUEST_CREATED", "PRIVACY_REQUEST_PROCESSED",
  "DATA_EXPORTED", "DATA_DELETED",
  "BARBERSHOP_APPROVED", "BARBERSHOP_SUSPENDED", "BARBERSHOP_CREATED",
  "PLAN_CREATED", "PLAN_UPDATED",
  "WEBHOOK_RECEIVED", "WEBHOOK_PROCESSED", "WEBHOOK_FAILED",
];

const AUDIT_ENTITIES = [
  "USER", "BARBERSHOP", "CLIENT", "SERVICE", "APPOINTMENT",
  "PAYMENT", "SUBSCRIPTION", "INVOICE", "SUBSCRIPTION_EVENT",
  "PLAN", "NOTIFICATION", "PRIVACY_REQUEST", "TENANT_FEEDBACK",
  "WEBHOOK", "SYSTEM",
];

// ─── Componente principal ────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterSuccess, setFilterSuccess] = useState("all");

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "50");
        if (search) params.set("search", search);
        if (filterAction !== "all") params.set("action", filterAction);
        if (filterEntity !== "all") params.set("entity", filterEntity);
        if (filterSuccess !== "all") params.set("success", filterSuccess);

        const res = await fetch(`/api/developer/audit-logs?${params}`);
        if (!res.ok) throw new Error("Erro ao buscar logs");
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, filterAction, filterEntity, filterSuccess]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // ── Render ──────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
              <p className="text-sm text-muted-foreground">
                Rastreamento de ações dos usuários no sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pagination.total.toLocaleString("pt-BR")} registros
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, entidade, IP..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {AUDIT_ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSuccess} onValueChange={setFilterSuccess}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">✅ Sucesso</SelectItem>
              <SelectItem value="false">❌ Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[140px]">Ação</TableHead>
                <TableHead className="w-[110px]">Entidade</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Barbearia</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
                <TableHead className="w-[130px]">IP</TableHead>
                <TableHead className="w-[130px]">Quando</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>Nenhum log encontrado</p>
                    <p className="text-xs mt-1">
                      Os logs aparecerão aqui conforme os usuários utilizarem o sistema
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSelected(log)}
                  >
                    {/* Ação */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    {/* Entidade */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.entity}
                        {log.entityId && (
                          <span className="ml-1 opacity-50">
                            :{log.entityId.substring(0, 8)}
                          </span>
                        )}
                      </span>
                    </TableCell>

                    {/* Usuário */}
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                            {log.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {log.user.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {log.user.role}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> Sistema
                        </span>
                      )}
                    </TableCell>

                    {/* Barbearia */}
                    <TableCell>
                      {log.barbershop ? (
                        <span className="text-xs flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {log.barbershop.name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[200px] text-xs">
                              {log.errorMessage ?? "Operação falhou"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>

                    {/* IP */}
                    <TableCell>
                      {log.ipAddress ? (
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Quando */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(log.createdAt)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatDate(log.createdAt)}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Ver detalhes */}
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {pagination.page} de {pagination.totalPages} —{" "}
              {pagination.total.toLocaleString("pt-BR")} registros
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sheet de detalhes */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Detalhes do Log
            </SheetTitle>
            <SheetDescription>
              ID: <span className="font-mono text-xs">{selected?.id}</span>
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <ScrollArea className="mt-6 h-[calc(100vh-120px)]">
              <div className="space-y-4 pr-4">
                {/* Ação e status */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`${getActionColor(selected.action)}`}
                  >
                    {selected.action}
                  </Badge>
                  {selected.success ? (
                    <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30">
                      ✅ Sucesso
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">
                      ❌ Falha
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Entidade */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Entidade
                  </p>
                  <p className="text-sm font-mono">
                    {selected.entity}
                    {selected.entityId && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ID: {selected.entityId}
                      </span>
                    )}
                  </p>
                </div>

                <Separator />

                {/* Usuário */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Usuário
                  </p>
                  {selected.user ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{selected.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selected.user.email}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {selected.user.role}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sistema (automático)</p>
                  )}
                </div>

                <Separator />

                {/* Barbearia */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Barbearia
                  </p>
                  {selected.barbershop ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{selected.barbershop.name}</p>
                      {selected.barbershop.slug && (
                        <p className="text-xs text-muted-foreground font-mono">
                          /{selected.barbershop.slug}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">— (global)</p>
                  )}
                </div>

                <Separator />

                {/* Data e hora */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Data & Hora
                  </p>
                  <p className="text-sm font-mono">
                    {formatDate(selected.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(selected.createdAt)}
                  </p>
                </div>

                <Separator />

                {/* Rede */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Contexto de Rede
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP</span>
                      <span className="font-mono">
                        {selected.ipAddress ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">User-Agent</span>
                      <span className="font-mono text-right truncate max-w-[280px]" title={selected.userAgent ?? ""}>
                        {selected.userAgent ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Erro */}
                {!selected.success && selected.errorMessage && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                        Mensagem de Erro
                      </p>
                      <p className="text-xs text-red-300 bg-red-500/10 rounded p-2 border border-red-500/20">
                        {selected.errorMessage}
                      </p>
                    </div>
                  </>
                )}

                {/* Metadata */}
                {selected.metadata &&
                  Object.keys(selected.metadata).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Metadata
                        </p>
                        <pre className="text-[10px] font-mono bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(selected.metadata, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
