"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuthHeaders } from "@/lib/utils";
import DropdownHeader from "@/components/shared/DropdownHeader";
import {
  CheckCircle2, XCircle, RefreshCw, Search, ChevronLeft, ChevronRight,
  ClipboardList, User, Globe, X, AlertTriangle, Filter, Clock, Activity,
  Zap, ArrowUp, Shield, Scissors, Calendar, Settings, CreditCard,
  Copy, Check,
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
  user: { id: string; name: string; email: string; role: string; avatar?: string | null } | null;
  barbershop: { id: string; name: string; slug: string | null } | null;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Helpers ────────────────────────────────────────────────────

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

function formatFeedTime(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "agora mesmo";
  if (secs < 60) return `há ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(d);
}

function formatDateFull(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  }).format(new Date(dateStr));
}

// ── Configuração visual de ações ───────────────────────────────

interface ActionConfig {
  dot: string;
  text: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
}

function getActionConfig(action: string): ActionConfig {
  if (action === "LOGIN")
    return { dot:"bg-emerald-500", text:"text-emerald-400", bg:"bg-emerald-500/10", border:"border-emerald-500/20", icon:<Shield className="h-3.5 w-3.5"/>, label:"Entrou no sistema" };
  if (action === "LOGOUT")
    return { dot:"bg-slate-400", text:"text-slate-400", bg:"bg-slate-500/10", border:"border-slate-500/20", icon:<Shield className="h-3.5 w-3.5"/>, label:"Saiu do sistema" };
  if (action === "LOGIN_FAILED")
    return { dot:"bg-red-500", text:"text-red-400", bg:"bg-red-500/10", border:"border-red-500/20", icon:<XCircle className="h-3.5 w-3.5"/>, label:"Falha de autenticação" };
  if (action.includes("APPOINTMENT"))
    return { dot:"bg-blue-500", text:"text-blue-400", bg:"bg-blue-500/10", border:"border-blue-500/20", icon:<Calendar className="h-3.5 w-3.5"/>, label: action.includes("CREATED") ? "Agendamento criado" : action.includes("CANCELLED") ? "Agendamento cancelado" : action.includes("COMPLETED") ? "Atendimento concluído" : "Agendamento atualizado" };
  if (action.includes("CLIENT"))
    return { dot:"bg-violet-500", text:"text-violet-400", bg:"bg-violet-500/10", border:"border-violet-500/20", icon:<User className="h-3.5 w-3.5"/>, label: action.includes("CREATED") ? "Cliente cadastrado" : action.includes("DELETED") ? "Cliente removido" : "Cliente atualizado" };
  if (action.includes("SERVICE"))
    return { dot:"bg-yellow-500", text:"text-yellow-400", bg:"bg-yellow-500/10", border:"border-yellow-500/20", icon:<Scissors className="h-3.5 w-3.5"/>, label: action.includes("CREATED") ? "Serviço criado" : action.includes("DELETED") ? "Serviço removido" : "Serviço atualizado" };
  if (action.includes("SUBSCRIPTION") || action.includes("TRIAL") || action.includes("PAYMENT"))
    return { dot:"bg-orange-500", text:"text-orange-400", bg:"bg-orange-500/10", border:"border-orange-500/20", icon:<CreditCard className="h-3.5 w-3.5"/>, label: action.includes("PAYMENT_RECEIVED") ? "Pagamento recebido" : action.includes("PAYMENT_FAILED") ? "Pagamento falhou" : action.includes("TRIAL_STARTED") ? "Trial iniciado" : "Assinatura atualizada" };
  if (action.includes("BARBERSHOP"))
    return { dot:"bg-cyan-500", text:"text-cyan-400", bg:"bg-cyan-500/10", border:"border-cyan-500/20", icon:<Settings className="h-3.5 w-3.5"/>, label: action.includes("APPROVED") ? "Barbearia aprovada" : action.includes("SUSPENDED") ? "Barbearia suspensa" : "Barbearia criada" };
  if (action.includes("FAILED") || action.includes("ERROR"))
    return { dot:"bg-red-500", text:"text-red-400", bg:"bg-red-500/10", border:"border-red-500/20", icon:<AlertTriangle className="h-3.5 w-3.5"/>, label:"Operação falhou" };
  return { dot:"bg-gray-500", text:"text-gray-400", bg:"bg-gray-500/10", border:"border-gray-500/20", icon:<Activity className="h-3.5 w-3.5"/>, label: action.replace(/_/g," ").toLowerCase() };
}

// ── Descrição legível para o Feed ───────────────────────────────

function buildFeedDescription(log: AuditLogEntry): string {
  const m = log.metadata as any;
  switch (log.action) {
    case "LOGIN": return `entrou no sistema`;
    case "LOGOUT": return `saiu do sistema`;
    case "LOGIN_FAILED": return `tentativa de login falhou${m?.email ? ` (${m.email})` : ""}`;
    case "APPOINTMENT_CREATED": return `criou um agendamento${m?.clientName ? ` para ${m.clientName}` : ""}${m?.serviceName ? ` — ${m.serviceName}` : ""}`;
    case "APPOINTMENT_CANCELLED": return `cancelou um agendamento`;
    case "APPOINTMENT_COMPLETED": return `concluiu um atendimento`;
    case "CLIENT_CREATED": return `cadastrou o cliente ${m?.clientName ?? ""}`;
    case "CLIENT_DELETED": return `removeu o cliente ${m?.clientName ?? ""}`;
    case "CLIENT_UPDATED": return `atualizou cadastro de cliente`;
    case "SERVICE_CREATED": return `criou o serviço "${m?.serviceName ?? ""}"${m?.price ? ` — R$ ${m.price}` : ""}`;
    case "SERVICE_UPDATED": return `atualizou o serviço "${m?.serviceName ?? ""}"`;
    case "SERVICE_DELETED": return `removeu o serviço "${m?.serviceName ?? ""}"`;
    case "BARBERSHOP_APPROVED": return `aprovou uma barbearia na plataforma`;
    case "BARBERSHOP_SUSPENDED": return `suspendeu uma barbearia`;
    case "BARBERSHOP_CREATED": return `criou uma nova barbearia`;
    case "TRIAL_STARTED": return `trial iniciado`;
    case "TRIAL_EXPIRED": return `trial expirou`;
    case "PAYMENT_RECEIVED": return `pagamento recebido`;
    case "PAYMENT_FAILED": return `pagamento falhou`;
    default: return log.action.replace(/_/g, " ").toLowerCase();
  }
}

// ── Avatar do usuário ─────────────────────────────────────────

function UserAvatar({ user, size = "sm" }: { user: AuditLogEntry["user"]; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (!user) {
    return (
      <div className={`${dim} rounded-full bg-muted flex items-center justify-center shrink-0`}>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  }
  const initials = user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const colors: Record<string, string> = {
    DEVELOPER: "from-violet-500 to-purple-600",
    ADMIN: "from-amber-500 to-orange-500",
    BARBER: "from-blue-500 to-cyan-500",
    RECEPTIONIST: "from-emerald-500 to-teal-500",
    CLIENT: "from-rose-500 to-pink-500",
  };
  const gradient = colors[user.role] ?? "from-gray-500 to-gray-600";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 font-bold text-white`}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
        : initials}
    </div>
  );
}

// ── Helpers de Formatação estilo Vercel (Request & Messages) ──────

function getLogRequest(log: AuditLogEntry): { method: string; path: string; full: string } {
  const meta = (log.metadata as Record<string, unknown>) || {};
  let method = typeof meta.method === "string" ? meta.method.toUpperCase() : "";
  let path = typeof meta.path === "string" ? meta.path : "";

  if (!path && typeof meta.route === "string") {
    path = meta.route;
  }

  // Fallback inteligente para registros sem path explícito
  if (!method || !path) {
    switch (log.action) {
      case "LOGIN":
      case "LOGIN_FAILED":
        method = "POST";
        path = "/api/auth/login";
        break;
      case "LOGOUT":
        method = "POST";
        path = "/api/auth/logout";
        break;
      case "CLIENT_CREATED":
        method = "POST";
        path = "/api/clients";
        break;
      case "CLIENT_UPDATED":
        method = "PUT";
        path = log.entityId ? `/api/clients/${log.entityId.slice(0, 8)}` : "/api/clients";
        break;
      case "CLIENT_DELETED":
        method = "DELETE";
        path = log.entityId ? `/api/clients/${log.entityId.slice(0, 8)}` : "/api/clients";
        break;
      case "SERVICE_CREATED":
        method = "POST";
        path = "/api/services";
        break;
      case "SERVICE_UPDATED":
        method = "PUT";
        path = log.entityId ? `/api/services/${log.entityId.slice(0, 8)}` : "/api/services";
        break;
      case "SERVICE_DELETED":
        method = "DELETE";
        path = log.entityId ? `/api/services/${log.entityId.slice(0, 8)}` : "/api/services";
        break;
      case "APPOINTMENT_CREATED":
        method = "POST";
        path = "/api/appointments";
        break;
      case "APPOINTMENT_UPDATED":
        method = "PUT";
        path = log.entityId ? `/api/appointments/${log.entityId.slice(0, 8)}` : "/api/appointments";
        break;
      case "APPOINTMENT_CANCELLED":
        method = "DELETE";
        path = log.entityId ? `/api/appointments/${log.entityId.slice(0, 8)}` : "/api/appointments";
        break;
      case "BARBERSHOP_CREATED":
        method = "POST";
        path = "/api/auth/register";
        break;
      case "BARBERSHOP_APPROVED":
      case "BARBERSHOP_SUSPENDED":
        method = "PATCH";
        path = "/api/developer/barbershops";
        break;
      case "CREATE":
        method = "POST";
        path = log.entity === "SYSTEM" ? "/api/developer/backup" : `/api/${log.entity.toLowerCase()}`;
        break;
      case "VIEW":
        method = "GET";
        path = path || (log.entity === "SYSTEM" ? "/dashboard" : `/${log.entity.toLowerCase()}`);
        break;
      default:
        method = log.action.includes("CREATE") ? "POST" : log.action.includes("DELETE") ? "DELETE" : log.action.includes("UPDATE") ? "PUT" : "GET";
        path = `/api/${log.entity.toLowerCase()}${log.entityId ? `/${log.entityId.slice(0, 8)}` : ""}`;
    }
  }

  return { method, path, full: `${method} ${path}` };
}

function getMethodBadge(method: string) {
  switch (method) {
    case "GET":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "POST":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "PUT":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "PATCH":
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "DELETE":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    default:
      return "bg-card text-muted-foreground border-border";
  }
}

function getLogStatus(log: AuditLogEntry): { code: number; text: string; color: string; bg: string; border: string } {
  const meta = (log.metadata as Record<string, unknown>) || {};
  let code = typeof meta.statusCode === "number" ? meta.statusCode : (log.success ? 200 : 500);

  if (!log.success) {
    if (log.errorMessage?.includes("401") || log.errorMessage?.toLowerCase().includes("não autorizado")) code = 401;
    else if (log.errorMessage?.includes("403") || log.errorMessage?.toLowerCase().includes("restrito")) code = 403;
    else if (log.errorMessage?.includes("404") || log.errorMessage?.toLowerCase().includes("não encontrad")) code = 404;
    else if (code === 200) code = 400;
  }

  if (code >= 200 && code < 300) {
    return { code, text: `${code}`, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  } else if (code >= 300 && code < 400) {
    return { code, text: `${code}`, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" };
  } else if (code >= 400 && code < 500) {
    return { code, text: `${code}`, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  } else {
    return { code, text: `${code}`, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" };
  }
}

function getLogMessage(log: AuditLogEntry): { text: string; isError: boolean } {
  if (log.errorMessage) {
    return { text: log.errorMessage, isError: true };
  }
  const meta = (log.metadata as Record<string, unknown>) || {};
  if (typeof meta.message === "string" && meta.message.trim()) {
    return { text: meta.message, isError: !log.success };
  }
  if (meta.type === "navigation") {
    return { text: `Navegação para ${meta.path || meta.title || "página"}`, isError: false };
  }
  return { text: buildFeedDescription(log), isError: !log.success };
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
  "PAYMENT","SUBSCRIPTION","INVOICE","PLAN","WEBHOOK","SYSTEM",
];

// ── Componente principal ───────────────────────────────────────

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── Estado global ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"logs" | "feed">("feed");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [feed, setFeed] = useState<AuditLogEntry[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "off" | "error">("off");

  // Filtros (tab Logs)
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterSuccess, setFilterSuccess] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  const searchRef = useRef(search);
  const filterActionRef = useRef(filterAction);
  const filterEntityRef = useRef(filterEntity);
  const filterSuccessRef = useRef(filterSuccess);

  useEffect(() => {
    activeTabRef.current = activeTab;
    searchRef.current = search;
    filterActionRef.current = filterAction;
    filterEntityRef.current = filterEntity;
    filterSuccessRef.current = filterSuccess;
  }, [activeTab, search, filterAction, filterEntity, filterSuccess]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && user?.role !== "DEVELOPER") router.replace("/dashboard");
  }, [user, authLoading, router]);

  // ── Fetch paginado (tab Logs) ──────────────────────────────
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

      const token = typeof window !== "undefined"
        ? (localStorage.getItem("auth_token") || localStorage.getItem("auth-token") || "")
        : "";
      if (token) params.set("token", token);

      const res = await fetch(`/api/developer/audit-logs?${params}`, {
        headers: getAuthHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const loadedLogs = Array.isArray(data.logs) ? data.logs : [];
      setLogs(loadedLogs);
      setPagination(data.pagination || { total: loadedLogs.length, page, limit: 50, totalPages: Math.ceil(loadedLogs.length / 50) || 1 });
      // Preenche o feed com os registros já existentes caso o feed esteja vazio
      setFeed(prev => {
        if (prev.length > 0) return prev;
        return loadedLogs;
      });
    } catch { /* silencioso */ } finally { setLoading(false); }
  }, [search, filterAction, filterEntity, filterSuccess]);

  useEffect(() => {
    if (user?.role === "DEVELOPER") fetchLogs(1);
  }, [fetchLogs, user]);

  // Ao alternar para a aba "logs", dispara busca imediata
  useEffect(() => {
    if (activeTab === "logs" && user?.role === "DEVELOPER") {
      fetchLogs(pagination.page || 1);
    }
  }, [activeTab, fetchLogs, user?.role]);

  // ── Conexão SSE (Feed em tempo real) ───────────────────────
  const connectSSE = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setSseStatus("connecting");
    // Suporte tanto para auth_token (padrão) quanto auth-token (legado)
    const token = typeof window !== "undefined"
      ? (localStorage.getItem("auth_token") || localStorage.getItem("auth-token") || "")
      : "";
    const url = `/api/developer/audit-logs/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    sseRef.current = es;

    es.addEventListener("connected", () => {
      setSseStatus("live");
    });

    es.addEventListener("heartbeat", () => { /* keepalive — nada a fazer */ });

    es.addEventListener("logs", (e) => {
      try {
        const incoming: AuditLogEntry[] = JSON.parse(e.data);
        if (!incoming.length) return;

        // Atualiza feed de atividades
        setFeed(prev => {
          const map = new Map<string, AuditLogEntry>();
          prev.forEach(item => map.set(item.id, item));
          incoming.forEach(item => map.set(item.id, item));
          return Array.from(map.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 200);
        });

        // Atualiza logs do sistema em tempo real se não houver filtro ativo
        setLogs(prev => {
          if (searchRef.current || filterActionRef.current !== "all" || filterEntityRef.current !== "all" || filterSuccessRef.current !== "all") {
            return prev;
          }
          const map = new Map<string, AuditLogEntry>();
          prev.forEach(item => map.set(item.id, item));
          incoming.forEach(item => map.set(item.id, item));
          return Array.from(map.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50);
        });

        setPagination(prev => ({
          ...prev,
          total: prev.total + incoming.length,
        }));

        // Incrementar contador de novos se o feed não estiver visível
        if (activeTabRef.current !== "feed" || document.hidden) {
          setNewCount(c => c + incoming.length);
        }
      } catch { /* JSON parse error */ }
    });

    es.addEventListener("reconnect", () => {
      es.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) connectSSE();
      }, 500);
    });

    es.onerror = () => {
      setSseStatus("connecting");
      es.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      // Tenta reconectar após 3s
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) connectSSE();
      }, 3000);
    };
  }, []);

  // ── Sincronização em segundo plano (Fallback & Garantia Real-Time) ──
  const syncLatestLogs = useCallback(async () => {
    try {
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("auth_token") || localStorage.getItem("auth-token") || "")
        : "";
      const res = await fetch(`/api/developer/audit-logs?limit=40&page=1${token ? `&token=${encodeURIComponent(token)}` : ""}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.logs) && data.logs.length > 0) {
        // Atualiza feed
        setFeed(prev => {
          const map = new Map<string, AuditLogEntry>();
          prev.forEach(item => map.set(item.id, item));
          let hasNew = false;
          data.logs.forEach((item: AuditLogEntry) => {
            if (!map.has(item.id)) hasNew = true;
            map.set(item.id, item);
          });
          if (!hasNew && prev.length > 0) return prev;
          return Array.from(map.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 250);
        });

        // Sincroniza logs do sistema em tempo real se sem filtros na página 1
        setLogs(prev => {
          if (searchRef.current || filterActionRef.current !== "all" || filterEntityRef.current !== "all" || filterSuccessRef.current !== "all") {
            return prev;
          }
          const map = new Map<string, AuditLogEntry>();
          prev.forEach(item => map.set(item.id, item));
          data.logs.forEach((item: AuditLogEntry) => map.set(item.id, item));
          return Array.from(map.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50);
        });

        if (data.pagination?.total) {
          setPagination(prev => ({
            ...prev,
            total: Math.max(prev.total, data.pagination.total),
            totalPages: Math.max(prev.totalPages, data.pagination.totalPages),
          }));
        }
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    if (user?.role === "DEVELOPER") {
      connectSSE();
      // Polling de redundância a cada 4 segundos garante dados frescos mesmo se o SSE oscilar
      const interval = setInterval(syncLatestLogs, 4000);
      return () => {
        isUnmountedRef.current = true;
        clearInterval(interval);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        sseRef.current?.close();
      };
    }
  }, [user, connectSSE, syncLatestLogs]);

  // Zerar contador ao ver o feed
  useEffect(() => {
    if (activeTab === "feed") setNewCount(0);
  }, [activeTab]);

  if (authLoading || user?.role !== "DEVELOPER") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const activeFiltersCount = [filterAction !== "all", filterEntity !== "all", filterSuccess !== "all"].filter(Boolean).length;
  // Se logs ainda não carregou mas o feed já tem dados, exibe os dados do feed como fallback imediato
  const displayLogs = logs.length > 0 ? logs : (activeFiltersCount === 0 && !search ? feed : []);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-6 max-w-[1600px] mx-auto space-y-4">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Audit Logs</h1>
              <p className="text-[11px] text-muted-foreground leading-none">
                Rastreamento em tempo real de todas as ações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SSE status indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
              sseStatus === "live"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : sseStatus === "connecting"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : sseStatus === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-card border-border text-muted-foreground"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                sseStatus === "live" ? "bg-emerald-400 animate-pulse" :
                sseStatus === "connecting" ? "bg-yellow-400 animate-pulse" :
                sseStatus === "error" ? "bg-red-400" : "bg-muted-foreground"
              }`} />
              <Zap className="h-3 w-3" />
              {sseStatus === "live" ? "Live" : sseStatus === "connecting" ? "Conectando..." : sseStatus === "error" ? "Reconectando" : "Offline"}
            </div>

            {activeTab === "logs" && (
              <button
                onClick={() => fetchLogs(pagination.page)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === "feed"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            Feed de Atividades
            {newCount > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === "logs"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Logs do Sistema
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
              {Math.max(pagination.total, displayLogs.length).toLocaleString("pt-BR")}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB: FEED DE ATIVIDADES (tempo real)              */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === "feed" && (
          <div className="flex gap-4 items-start">
            {/* Timeline */}
            <div ref={feedRef} className={`flex-1 min-w-0 ${selected ? "hidden md:block" : ""}`}>
              {/* Indicador topo */}
              {sseStatus === "live" && (
                <div className="flex items-center gap-2 mb-3 text-[11px] text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado — atualizações em tempo real (polling a cada 3s)
                </div>
              )}

              {feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-border bg-card/30">
                  <div className="relative mb-4">
                    <Activity className="h-12 w-12 text-muted-foreground/20" />
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/20 animate-ping" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Aguardando atividades...</p>
                  <p className="text-xs text-muted-foreground/50 mt-1.5 max-w-xs">
                    {sseStatus === "connecting"
                      ? "Estabelecendo conexão em tempo real..."
                      : "Realize um login, crie um cliente ou agende um serviço para ver eventos aqui."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {feed.map((log, idx) => {
                    const cfg = getActionConfig(log.action);
                    const isCurrentUser = log.userId === user?.id;
                    const isSelected = selected?.id === log.id;
                    const isNew = idx < 3; // Os 3 mais recentes ganham efeito visual sutil

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelected(isSelected ? null : log)}
                        className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : isNew
                            ? `${cfg.border} ${cfg.bg} hover:border-opacity-50`
                            : "border-border/40 bg-card/30 hover:bg-card/60 hover:border-border"
                        }`}
                      >
                        {/* Dot de linha do tempo */}
                        <div className="relative mt-1 shrink-0">
                          <UserAvatar user={log.user} size="sm" />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${cfg.dot}`} />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                            {/* Nome do autor */}
                            <span className="text-xs font-semibold text-foreground truncate">
                              {log.user?.name ?? "Sistema"}
                            </span>

                            {/* Badge "Você" */}
                            {isCurrentUser && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/20 leading-none">
                                Você
                              </span>
                            )}

                            {/* Role badge */}
                            {log.user && (
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border leading-none ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {log.user.role}
                              </span>
                            )}

                            {/* Tempo */}
                            <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {formatFeedTime(log.createdAt)}
                            </span>
                          </div>

                          {/* Descrição legível */}
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            <span className={`font-medium ${cfg.text}`}>{cfg.icon}</span>
                            {" "}
                            {buildFeedDescription(log)}
                            {log.barbershop && (
                              <span className="opacity-60"> · {log.barbershop.name}</span>
                            )}
                          </p>

                          {/* Metadados rápidos */}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${cfg.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {log.action}
                            </span>
                            {!log.success && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                Falhou
                              </span>
                            )}
                            {log.ipAddress && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                <Globe className="h-3 w-3" />
                                {log.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Indicador novo (pulsante) */}
                        {isNew && idx === 0 && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Painel de detalhes (Feed) */}
            {selected && (
              <DetailPanel log={selected} onClose={() => setSelected(null)} currentUserId={user?.id} />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB: LOGS DO SISTEMA (terminal style)             */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === "logs" && (
          <>
            {/* Filtros */}
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
                  { label:"Ação", value:filterAction, setter:setFilterAction, options:AUDIT_ACTIONS, width:"160px" },
                  { label:"Entidade", value:filterEntity, setter:setFilterEntity, options:AUDIT_ENTITIES, width:"140px" },
                ].map(({ label, value, setter, options, width }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
                    <select value={value} onChange={(e) => setter(e.target.value)} style={{ minWidth: width }}
                      className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50">
                      <option value="all">Todos</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</label>
                  <select value={filterSuccess} onChange={(e) => setFilterSuccess(e.target.value)}
                    className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50 min-w-[120px]">
                    <option value="all">Todos</option>
                    <option value="true">✅ Sucesso</option>
                    <option value="false">❌ Falha</option>
                  </select>
                </div>
                {activeFiltersCount > 0 && (
                  <div className="flex items-end">
                    <button onClick={() => { setFilterAction("all"); setFilterEntity("all"); setFilterSuccess("all"); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 border border-border rounded-md transition-all">
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Layout dois painéis */}
            <div className="flex gap-3 items-start">
              {/* Tabela terminal */}
              <div className={`flex-1 min-w-0 rounded-xl border border-border bg-[#0a0a0a] overflow-hidden flex flex-col ${selected ? "hidden md:flex" : ""}`}>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[125px_85px_240px_1fr_135px_110px] min-w-[980px] gap-2 px-4 py-2.5 border-b border-border/50 bg-card/20">
                    {[
                      { name: "Hora", icon: <Clock className="h-3 w-3" /> },
                      { name: "Status" },
                      { name: "Request" },
                      { name: "Messages" },
                      { name: "Usuário" },
                      { name: "Origem / IP" },
                    ].map(h => (
                      <span key={h.name} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                        {h.icon}
                        {h.name}
                      </span>
                    ))}
                  </div>
                  <div className="divide-y divide-border/20">
                    {loading && displayLogs.length === 0 ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[125px_85px_240px_1fr_135px_110px] min-w-[980px] gap-2 px-4 py-2.5">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <div key={j} className="h-3 rounded bg-muted/20 animate-pulse" />
                          ))}
                        </div>
                      ))
                    ) : displayLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Nenhum log encontrado</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 max-w-sm">
                          Navegue pelo sistema ou limpe os filtros para visualizar as requisições em tempo real.
                        </p>
                      </div>
                    ) : (
                      displayLogs.map(log => {
                        const req = getLogRequest(log);
                        const status = getLogStatus(log);
                        const msg = getLogMessage(log);
                        const isSelected = selected?.id === log.id;
                        const isCurrentUser = log.userId === user?.id;

                        return (
                          <div
                            key={log.id}
                            onClick={() => setSelected(isSelected ? null : log)}
                            className={`grid grid-cols-[125px_85px_240px_1fr_135px_110px] min-w-[980px] gap-2 px-4 py-2.5 cursor-pointer transition-colors text-[11px] font-mono items-center ${
                              isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                            }`}
                          >
                            {/* Hora */}
                            <span className="text-muted-foreground whitespace-nowrap truncate">{formatTimestamp(log.createdAt)}</span>

                            {/* Status */}
                            <span className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${status.bg} ${status.color} ${status.border}`}>
                                {status.text}
                              </span>
                            </span>

                            {/* Request (Method + Path) */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 ${getMethodBadge(req.method)}`}>
                                {req.method}
                              </span>
                              <span className="text-foreground font-medium truncate text-[11px]" title={req.path}>
                                {req.path}
                              </span>
                            </div>

                            {/* Messages */}
                            <div className="min-w-0 pr-2">
                              <span className={`truncate block text-[11px] ${msg.isError ? "text-red-400 font-medium" : "text-muted-foreground"}`} title={msg.text}>
                                {msg.isError && <span className="text-red-500 mr-1">⚠</span>}
                                {msg.text}
                              </span>
                            </div>

                            {/* Usuário */}
                            <span className="text-muted-foreground truncate flex items-center gap-1">
                              <span className="truncate">{log.user?.name ?? "sistema"}</span>
                              {isCurrentUser && <span className="text-[8px] px-1 py-0.2 rounded bg-primary/20 text-primary font-bold shrink-0">Você</span>}
                            </span>

                            {/* Origem / IP */}
                            <span className="text-muted-foreground flex items-center gap-1 truncate text-[10px]">
                              {log.ipAddress ? (
                                <>
                                  <Globe className="h-3 w-3 shrink-0 opacity-50" />
                                  <span className="truncate">{log.ipAddress}</span>
                                </>
                              ) : log.barbershop?.slug ? (
                                <span className="truncate">/{log.barbershop.slug}</span>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Painel detalhes (Logs tab) */}
              {selected && (
                <DetailPanel log={selected} onClose={() => setSelected(null)} currentUserId={user?.id} />
              )}
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Página {pagination.page} de {pagination.totalPages} — {pagination.total.toLocaleString("pt-BR")} registros</span>
                <div className="flex gap-1.5">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40 transition-all"
                    disabled={pagination.page <= 1 || loading} onClick={() => fetchLogs(pagination.page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40 transition-all"
                    disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchLogs(pagination.page + 1)}>
                    Próxima <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Painel de Detalhes Lateral ────────────────────────────────

interface DetailPanelProps {
  log: AuditLogEntry;
  onClose: () => void;
  currentUserId?: string;
}

function DetailPanel({ log, onClose, currentUserId }: DetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const cfg = getActionConfig(log.action);
  const isCurrentUser = log.userId === currentUserId;

  const copyMetadata = () => {
    navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 rounded-xl border border-border bg-[#0a0a0a] flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-1.5 rounded-md ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {cfg.icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">{cfg.label}</h3>
            <span className="text-[10px] font-mono text-muted-foreground truncate block">{log.id}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          title="Fechar detalhes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] divide-y divide-border/20 [&>*]:pt-3.5 [&>*:first-child]:pt-0">
        {/* Status e Ação */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs font-mono font-medium text-foreground">{log.action}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
              log.success
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {log.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {getLogStatus(log).text}
          </span>
        </div>

        {/* Requisição HTTP */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Requisição (Request)
          </span>
          <div className="p-2.5 rounded-lg bg-card/40 border border-border/40 space-y-1.5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${getMethodBadge(getLogRequest(log).method)}`}>
                {getLogRequest(log).method}
              </span>
              <span className="text-foreground truncate select-all">{getLogRequest(log).path}</span>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/20 flex justify-between items-center">
              <span>Status HTTP</span>
              <span className={`font-bold ${getLogStatus(log).color}`}>{getLogStatus(log).code}</span>
            </div>
          </div>
        </div>

        {/* Mensagem / Detalhes */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Mensagem (Messages)
          </span>
          <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
            getLogMessage(log).isError ? "bg-red-500/10 border-red-500/30 text-red-300 font-mono" : "bg-card/40 border-border/40 text-foreground"
          }`}>
            {getLogMessage(log).text}
          </div>
        </div>

        {/* Usuário executor */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Usuário Executor
          </span>
          {log.user ? (
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-card/40 border border-border/40">
              <UserAvatar user={log.user} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground truncate">{log.user.name}</span>
                  {isCurrentUser && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                      Você
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground truncate block">{log.user.email}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {log.user.role}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card/20 border border-border/30 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Ação do Sistema (Automático)</span>
            </div>
          )}
        </div>

        {/* Entidade Alvo */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Recurso / Entidade
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-mono text-foreground font-medium">{log.entity}</span>
            </div>
            {log.entityId && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[200px]" title={log.entityId}>
                  {log.entityId}
                </span>
              </div>
            )}
            {log.barbershop && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Barbearia</span>
                <span className="text-foreground truncate">
                  {log.barbershop.name}
                  {log.barbershop.slug && (
                    <span className="text-muted-foreground text-[10px] font-mono ml-1">
                      (/{log.barbershop.slug})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data e Hora */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Data e Hora
          </span>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Horário</span>
              <span className="font-mono text-foreground">{formatDateFull(log.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Relativo</span>
              <span className="text-muted-foreground text-[11px]">{formatFeedTime(log.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Contexto de Rede */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
            Contexto de Rede
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> IP
              </span>
              <span className="font-mono text-foreground">{log.ipAddress ?? "—"}</span>
            </div>
            {log.userAgent && (
              <div>
                <span className="text-muted-foreground text-[10px] block mb-1">User Agent</span>
                <div className="p-2 rounded bg-muted/20 border border-border/30 text-[10px] font-mono text-muted-foreground break-all leading-relaxed">
                  {log.userAgent}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Erro (se houver) */}
        {!log.success && log.errorMessage && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold block mb-2">
              Mensagem de Erro
            </span>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span className="break-all">{log.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Metadados / Payload JSON */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Metadados (JSON)
              </span>
              <button
                onClick={copyMetadata}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>
            <pre className="text-[10px] font-mono bg-card/40 border border-border/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-foreground/80 leading-relaxed max-h-56">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
