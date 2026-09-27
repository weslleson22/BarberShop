"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuthHeaders } from "@/lib/utils";
import DropdownHeader from "@/components/shared/DropdownHeader";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
  Building2,
  Globe,
  X,
  AlertTriangle,
  Filter,
  Clock,
  Activity,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

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

// ── Helpers de data ────────────────────────────────────────────

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function formatDateFull(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(dateStr));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `há ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

// ── Cores por ação ─────────────────────────────────────────────

function getActionStyle(action: string): { dot: string; text: string } {
  if (action.includes("FAILED") || action.includes("ERROR") || action.includes("REJECTED"))
    return { dot: "bg-red-500", text: "text-red-400" };
  if (["LOGIN","ACTIVATED","APPROVED","RECEIVED","STARTED"].some((k) => action.includes(k)))
    return { dot: "bg-emerald-500", text: "text-emerald-400" };
  if (["DELETE","DELETED","CANCELLED","SUSPENDED","EXPIRED","CANCELED"].some((k) => action.includes(k)))
    return { dot: "bg-orange-500", text: "text-orange-400" };
  if (action === "CREATE" || action.includes("CREATED"))
    return { dot: "bg-blue-500", text: "text-blue-400" };
  if (["UPDATE","UPDATED","CHANGED"].some((k) => action.includes(k)))
    return { dot: "bg-yellow-500", text: "text-yellow-400" };
  if (action === "LOGOUT")
    return { dot: "bg-slate-500", text: "text-slate-400" };
  return { dot: "bg-gray-500", text: "text-gray-400" };
}

// ── Listas de filtro ───────────────────────────────────────────

const AUDIT_ACTIONS = [
  "LOGIN","LOGOUT","LOGIN_FAILED","PASSWORD_CHANGED",
  "CREATE","UPDATE","DELETE","VIEW",
  "APPOINTMENT_CREATED","APPOINTMENT_UPDATED","APPOINTMENT_CONFIRMED",
  "APPOINTMENT_CANCELLED","APPOINTMENT_COMPLETED","APPOINTMENT_NO_SHOW",
  "USER_INVITED","USER_ACTIVATED","USER_DEACTIVATED","USER_ROLE_CHANGED",
  "CLIENT_CREATED","CLIENT_UPDATED","CLIENT_DELETED",
  "SERVICE_CREATED","SERVICE_UPDATED","SERVICE_DELETED",
  "SUBSCRIPTION_CREATED","SUBSCRIPTION_ACTIVATED","SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_SUSPENDED","TRIAL_STARTED","TRIAL_EXPIRED",
  "PAYMENT_RECEIVED","PAYMENT_FAILED",
  "DATA_EXPORTED","DATA_DELETED",
  "BARBERSHOP_APPROVED","BARBERSHOP_SUSPENDED","BARBERSHOP_CREATED",
  "PLAN_CREATED","PLAN_UPDATED",
  "WEBHOOK_RECEIVED","WEBHOOK_PROCESSED","WEBHOOK_FAILED",
];

const AUDIT_ENTITIES = [
  "USER","BARBERSHOP","CLIENT","SERVICE","APPOINTMENT",
  "PAYMENT","SUBSCRIPTION","INVOICE","SUBSCRIPTION_EVENT",
  "PLAN","NOTIFICATION","PRIVACY_REQUEST","WEBHOOK","SYSTEM",
];

// ── Componente principal ───────────────────────────────────────

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0, page: 1, limit: 50, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterSuccess, setFilterSuccess] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && user?.role !== "DEVELOPER") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (filterAction !== "all") params.set("action", filterAction);
      if (filterEntity !== "all") params.set("entity", filterEntity);
      if (filterSuccess !== "all") params.set("success", filterSuccess);

      const res = await fetch(`/api/developer/audit-logs?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar logs");
      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterAction, filterEntity, filterSuccess]);

  useEffect(() => {
    if (user?.role === "DEVELOPER") fetchLogs(1);
  }, [fetchLogs, user]);

  // Live mode: refresh a cada 10s
  useEffect(() => {
    if (liveMode) {
      liveRef.current = setInterval(() => fetchLogs(1), 10000);
    } else {
      if (liveRef.current) clearInterval(liveRef.current);
    }
    return () => { if (liveRef.current) clearInterval(liveRef.current); };
  }, [liveMode, fetchLogs]);

  if (authLoading || user?.role !== "DEVELOPER") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const activeFiltersCount = [filterAction !== "all", filterEntity !== "all", filterSuccess !== "all"].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-6 max-w-[1600px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Logs</h1>
              <p className="text-[11px] text-muted-foreground leading-none">
                {pagination.total.toLocaleString("pt-BR")} registros encontrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                liveMode
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${liveMode ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
              Live
            </button>
            <button
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Busca + filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar logs..."
              className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-border bg-card">
            {[
              { label: "Ação", value: filterAction, setter: setFilterAction, options: AUDIT_ACTIONS, width: "160px" },
              { label: "Entidade", value: filterEntity, setter: setFilterEntity, options: AUDIT_ENTITIES, width: "140px" },
            ].map(({ label, value, setter, options, width }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
                <select
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  style={{ minWidth: width }}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="all">Todos</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</label>
              <select
                value={filterSuccess}
                onChange={(e) => setFilterSuccess(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50 min-w-[120px]"
              >
                <option value="all">Todos</option>
                <option value="true">✅ Sucesso</option>
                <option value="false">❌ Falha</option>
              </select>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={() => { setFilterAction("all"); setFilterEntity("all"); setFilterSuccess("all"); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 border border-border rounded-md transition-all"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layout dois painéis */}
        <div className={`flex gap-3 items-start`}>

          {/* Tabela de logs */}
          <div className={`flex-1 min-w-0 rounded-xl border border-border bg-[#0a0a0a] overflow-hidden ${selected ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
            {/* Cabeçalho */}
            <div className="grid grid-cols-[140px_90px_1fr_140px_80px_120px] gap-2 px-4 py-2 border-b border-border/50 bg-card/20">
              {["Hora","Status","Evento","Usuário","Origem","IP"].map((h) => (
                <span key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  {h === "Hora" && <Clock className="h-3 w-3" />}{h}
                </span>
              ))}
            </div>

            {/* Linhas */}
            <div className="divide-y divide-border/20 flex-1">
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[140px_90px_1fr_140px_80px_120px] gap-2 px-4 py-2.5">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <div key={j} className="h-3 rounded bg-muted/20 animate-pulse" />
                    ))}
                  </div>
                ))
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum log encontrado</p>
                  <p className="text-xs text-muted-foreground/50 mt-1 max-w-xs">
                    Os logs aparecerão aqui conforme as ações ocorrerem no sistema. Faça login ou logout para gerar os primeiros registros.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const style = getActionStyle(log.action);
                  const isSelected = selected?.id === log.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelected(isSelected ? null : log)}
                      className={`grid grid-cols-[140px_90px_1fr_140px_80px_120px] gap-2 px-4 py-2 cursor-pointer transition-colors text-[11px] font-mono ${
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                      }`}
                    >
                      <span className="text-muted-foreground whitespace-nowrap truncate">
                        {formatTimestamp(log.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                        {log.success
                          ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          : <XCircle className="h-3 w-3 text-red-500" />
                        }
                        <span className={`text-[10px] ${log.success ? "text-emerald-400" : "text-red-400"}`}>
                          {log.success ? "200" : "ERR"}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`font-semibold ${style.text} whitespace-nowrap`}>{log.action}</span>
                        <span className="text-muted-foreground truncate">
                          {log.entity}{log.entityId ? `:${log.entityId.substring(0, 8)}` : ""}
                        </span>
                      </span>
                      <span className="text-muted-foreground truncate">
                        {log.user?.name ?? "sistema"}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {log.barbershop?.slug ?? (log.user?.role ?? "—")}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1 truncate">
                        {log.ipAddress ? (
                          <><Globe className="h-3 w-3 shrink-0 opacity-50" /><span className="truncate">{log.ipAddress}</span></>
                        ) : "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Painel de detalhes */}
          {selected && (
            <div className="w-full md:w-[400px] shrink-0 rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  {selected.success
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />
                  }
                  <span className={`text-sm font-semibold font-mono ${getActionStyle(selected.action).text}`}>
                    {selected.action}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-200px)] divide-y divide-border/40">
                {/* Request started */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {selected.success ? "Request started" : "Request failed"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{formatDateFull(selected.createdAt)}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(selected.createdAt)}</p>
                </div>

                {/* Campos principais */}
                {[
                  { label: "Log ID", value: selected.id },
                  { label: "Action", value: selected.action },
                  { label: "Entity", value: `${selected.entity}${selected.entityId ? ` / ${selected.entityId}` : ""}` },
                  { label: "Status", value: selected.success ? "Success (200)" : "Failed (ERR)" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-2.5 flex items-start justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
                    <span className="text-[11px] font-mono text-foreground text-right break-all">{value}</span>
                  </div>
                ))}

                {/* Usuário */}
                {selected.user && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Usuário</p>
                    <div className="space-y-1.5">
                      {[
                        { k: "Nome", v: selected.user.name },
                        { k: "Email", v: selected.user.email },
                        { k: "Role", v: selected.user.role },
                      ].map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">{k}</span>
                          <span className={`text-[11px] font-mono ${k === "Role" ? "text-primary" : "text-foreground"}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barbearia */}
                {selected.barbershop && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Barbearia</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">Nome</span>
                        <span className="text-[11px] font-mono text-foreground">{selected.barbershop.name}</span>
                      </div>
                      {selected.barbershop.slug && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">Slug</span>
                          <span className="text-[11px] font-mono text-foreground">/{selected.barbershop.slug}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rede */}
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Rede</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">IP</span>
                      <span className="text-[11px] font-mono text-foreground">{selected.ipAddress ?? "—"}</span>
                    </div>
                    {selected.userAgent && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">User Agent</span>
                        <span className="text-[10px] font-mono text-foreground/70 break-all leading-relaxed">{selected.userAgent}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Erro */}
                {!selected.success && selected.errorMessage && (
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-300 font-mono leading-relaxed">{selected.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Metadata</p>
                    <pre className="text-[10px] font-mono bg-muted/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-foreground/70 leading-relaxed">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {pagination.page} de {pagination.totalPages} — {pagination.total.toLocaleString("pt-BR")} registros
            </span>
            <div className="flex gap-1.5">
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40 transition-all"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40 transition-all"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
