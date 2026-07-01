import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CalendarCheck, AlertTriangle, Briefcase,
  CheckCircle2, Clock, ChevronRight, MessageCircle, ArrowUpRight, Sparkles, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardBlocks } from "@/components/DashboardBlocks";
import { AppTour } from "@/components/AppTour";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";
import { useClientesRetencao } from "@/hooks/useClientesRetencao";
import { STATUS_RETENCAO_META } from "@/lib/retencao";

interface RiskClient {
  id: string;
  nome_loja: string;
  celular: string | null;
  last_interaction: string | null;
  days_without_contact: number;
}

interface UpcomingFollowup {
  id: string;
  subject: string;
  due_date: string;
  due_time: string | null;
  type: string | null;
  status: string;
  client_name: string;
  client_id: string;
}

interface StageSummary {
  name: string;
  color: string;
  count: number;
  value: number;
}

/** Quantos dias para trás olhamos o histórico de contato (1 ano basta para "em risco"). */
const RISK_WINDOW_DAYS = 365;

const brl = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const initials = (name: string) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/** Converte "yyyy-MM-dd" (ou timestamp) numa data LOCAL (evita erro de fuso de ~3h). */
const toLocalDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`);

const typeLabels: Record<string, string> = {
  visita: "Visita", ligacao: "Ligação", email: "E-mail", whatsapp: "WhatsApp", outro: "Outro",
};

/* ───────────────────────── UI: componentes leves (estilo 21st.dev) ─────────────────────────
   Tudo sem bibliotecas novas — só React + Tailwind + requestAnimationFrame.
   Os keyframes são injetados 1x via <DashboardKeyframes/> (não mexe no tailwind.config). */

function DashboardKeyframes() {
  return (
    <style>{`
      @keyframes ccGradientMove {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      .cc-gradient-text{background-image:linear-gradient(90deg,hsl(var(--primary)),hsl(var(--primary)/0.5),hsl(var(--primary)),hsl(var(--primary)/0.5),hsl(var(--primary)));background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ccGradientMove 6s ease-in-out infinite}
      @keyframes ccShimmer{100%{transform:translateX(100%)}}
      .cc-shimmer{position:relative;overflow:hidden}
      .cc-shimmer::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,hsl(var(--foreground)/0.06),transparent);animation:ccShimmer 1.6s ease-in-out infinite}
      @media (prefers-reduced-motion: reduce){.cc-gradient-text,.cc-shimmer::after{animation:none}}
    `}</style>
  );
}

/** Número que "conta" de 0 até o valor, com formatação PT-BR. */
function NumberTicker({
  value, duration = 900, prefix = "", suffix = "", decimals = 0, className,
}: { value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0); // valor exibido agora — p/ continuar suave se o número mudar no meio
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = displayRef.current;
    const to = Number(value) || 0;
    if (reduce || from === to) { setDisplay(to); displayRef.current = to; return; }

    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const v = from + (to - from) * ease(p);
      displayRef.current = v;
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = Number(display).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}

/** Card com brilho radial que segue o mouse (fallback gracioso sem hover). */
function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.setProperty("--spot-opacity", "1");
  };
  const onLeave = () => ref.current?.style.setProperty("--spot-opacity", "0");
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ "--spot-opacity": "0" } as CSSProperties}
      className={
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm " +
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 min-h-[110px] " +
        className
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spot-opacity)",
          background:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / 0.15), transparent 65%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Skeleton com brilho passando por cima (sensação de "carregando" melhor). */
function ShimmerSkeleton({ className = "" }: { className?: string }) {
  return <div className={`cc-shimmer bg-muted/70 ${className}`} />;
}

/** Donut do pipeline por valor, 100% CSS (conic-gradient), sem lib de gráfico. */
function PipelineDonut({
  stages, centerLabel, centerSub, size = 132, showLegend = true,
}: { stages: StageSummary[]; centerLabel?: string; centerSub?: string; size?: number; showLegend?: boolean }) {
  const total = useMemo(() => stages.reduce((a, s) => a + (Number(s.value) || 0), 0), [stages]);
  const gradient = useMemo(() => {
    if (total <= 0) return "hsl(var(--muted))";
    let acc = 0;
    const stops: string[] = [];
    stages.forEach((s) => {
      const start = (acc / total) * 360;
      acc += Number(s.value) || 0;
      const end = (acc / total) * 360;
      stops.push(`${s.color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [stages, total]);

  const hole = Math.round(size * 0.64);
  const ring = (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label="Distribuição do pipeline por valor">
      <div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
      <div
        className="absolute rounded-full bg-card flex flex-col items-center justify-center text-center"
        style={{ width: hole, height: hole, top: (size - hole) / 2, left: (size - hole) / 2 }}
      >
        {centerLabel && <span className="text-sm font-bold text-foreground tabular-nums leading-none">{centerLabel}</span>}
        {centerSub && <span className="text-[10px] text-muted-foreground mt-1">{centerSub}</span>}
      </div>
    </div>
  );

  if (!showLegend) return <div className="flex justify-center">{ring}</div>;

  return (
    <div className="flex items-center gap-5">
      {ring}
      <ul className="flex-1 min-w-0 space-y-1.5">
        {stages.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.name} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate text-foreground/90">{s.name}</span>
              <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [hadError, setHadError] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [totalClientes, setTotalClientes] = useState(0);
  const [followupsHoje, setFollowupsHoje] = useState(0);
  const [emRisco, setEmRisco] = useState(0);
  const [negociosAbertos, setNegociosAbertos] = useState(0);
  const [riskClients, setRiskClients] = useState<RiskClient[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<UpcomingFollowup[]>([]);
  const [stageSummary, setStageSummary] = useState<StageSummary[]>([]);
  const { retencaoMap } = useClientesRetencao();
  const fetchIdRef = useRef(0); // protege contra respostas antigas chegarem depois das novas

  // Contagem de carteira em risco (atencao + em_risco + inativo) — memoizada
  const carteiraRisco = useMemo(() => {
    const c = { atencao: 0, em_risco: 0, inativo: 0 };
    retencaoMap?.forEach((r) => {
      if (r.status_retencao === "atencao") c.atencao++;
      else if (r.status_retencao === "em_risco") c.em_risco++;
      else if (r.status_retencao === "inativo") c.inativo++;
    });
    return c;
  }, [retencaoMap]);
  const retencaoLoading = retencaoMap == null;

  const fetchDashboard = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    const myId = ++fetchIdRef.current;
    setLoading(true);
    setHadError(false);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");
      // Só buscamos interações do último ano — suficiente para "30+ dias" e bem mais leve.
      const riskWindow = format(addDays(new Date(), -RISK_WINDOW_DAYS), "yyyy-MM-dd");

      // Um único lote de consultas (antes eram 8 + o nome do perfil à parte = 9).
      // As 2 contagens "head:true" não trazem linhas (são baratas) e garantem que os
      // KPIs mostrem o número REAL mesmo se a carteira passar de 1000 clientes.
      const [
        clientesCountRes,
        allClientsRes,
        interactionsRes,
        followups7dRes,
        stagesRes,
        oppsCountRes,
        oppsRes,
        profileRes,
      ] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }).neq("status", "inativo"),
        supabase.from("clientes").select("id, nome_loja, celular, status").neq("status", "inativo"),
        supabase.from("interactions").select("client_id, interaction_date")
          .gte("interaction_date", riskWindow)
          .order("interaction_date", { ascending: false }),
        supabase.from("followups").select("id, subject, due_date, due_time, type, status, client_id, clientes(nome_loja)")
          .eq("status", "pendente")
          .gte("due_date", today).lte("due_date", in7days)
          .order("due_date", { ascending: true }),
        supabase.from("pipeline_stages").select("id, name, color, sort_order")
          .order("sort_order", { ascending: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("opportunities").select("stage_id, estimated_value, status")
          .eq("status", "open"),
        supabase.from("profiles").select("nome").eq("user_id", uid).maybeSingle(),
      ]);

      // Se esta resposta já não é a mais recente, descarta (evita "voltar" para dados antigos).
      if (myId !== fetchIdRef.current) return;

      // Se alguma consulta falhar, avisa sem travar a tela.
      const firstError = [
        clientesCountRes, allClientsRes, interactionsRes, followups7dRes,
        stagesRes, oppsCountRes, oppsRes, profileRes,
      ].find((r) => r.error)?.error;
      if (firstError) {
        console.error("Dashboard:", firstError);
        setHadError(true);
        toast.error("Não foi possível carregar alguns dados do painel.");
      }

      // Nome do perfil (saudação) — maybeSingle não dá erro quando não há linha.
      if (profileRes.data?.nome) setProfileName(profileRes.data.nome);

      // Clientes ativos — contagem exata (cai para o tamanho da lista se faltar)
      const clients = allClientsRes.data ?? [];
      setTotalClientes(clientesCountRes.count ?? clients.length);

      // Follow-ups da semana + contagem de "hoje" derivada (sem consulta extra)
      const followups = followups7dRes.data ?? [];
      setFollowupsHoje(followups.filter((f: any) => f.due_date === today).length);
      setUpcomingFollowups(
        followups.slice(0, 10).map((f: any) => {
          // O embed pode vir como objeto OU array dependendo da FK — tratamos os dois.
          const cli = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
          return {
            id: f.id,
            subject: f.subject,
            due_date: f.due_date,
            due_time: f.due_time,
            type: f.type,
            status: f.status,
            client_name: cli?.nome_loja ?? "—",
            client_id: f.client_id,
          };
        })
      );

      // Negócios em aberto — contagem exata (cai para o tamanho da lista se faltar)
      const opps = oppsRes.data ?? [];
      setNegociosAbertos(oppsCountRes.count ?? opps.length);

      // Última interação por cliente (a lista já vem ordenada do mais recente)
      const interactions = interactionsRes.data ?? [];
      const lastInteractionMap = new Map<string, string>();
      interactions.forEach((i) => {
        if (!lastInteractionMap.has(i.client_id)) lastInteractionMap.set(i.client_id, i.interaction_date);
      });

      // Calcula a lista de risco UMA vez e deriva contagem + top 5 dela.
      const now = new Date();
      const riskyAll: RiskClient[] = clients
        .map((c) => {
          const last = lastInteractionMap.get(c.id) ?? null;
          const days = last ? differenceInDays(now, toLocalDate(last)) : 999;
          return { id: c.id, nome_loja: c.nome_loja, celular: c.celular, last_interaction: last, days_without_contact: days };
        })
        .filter((c) => c.days_without_contact >= 30)
        .sort((a, b) => b.days_without_contact - a.days_without_contact);

      setEmRisco(riskyAll.length);
      setRiskClients(riskyAll.slice(0, 5));

      // Resumo do pipeline — agrega em UMA passada (antes era O(estágios × oportunidades))
      const stages = stagesRes.data ?? [];
      const byStage = new Map<string, { count: number; value: number }>();
      opps.forEach((o) => {
        const cur = byStage.get(o.stage_id) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(o.estimated_value) || 0; // nunca vira NaN
        byStage.set(o.stage_id, cur);
      });
      setStageSummary(
        stages
          .map((s) => {
            const agg = byStage.get(s.id) ?? { count: 0, value: 0 };
            return { name: s.name, color: s.color, count: agg.count, value: agg.value };
          })
          .filter((s) => s.name !== "Fechado ganho" && s.name !== "Fechado perdido")
      );
    } catch (e) {
      if (myId !== fetchIdRef.current) return;
      console.error("Dashboard:", e);
      setHadError(true);
      toast.error("Erro ao carregar o painel. Tente atualizar a página.");
    } finally {
      if (myId === fetchIdRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const markFollowupDone = async (id: string) => {
    const target = upcomingFollowups.find((f) => f.id === id);
    const { error } = await supabase.from("followups").update({ status: "concluido" }).eq("id", id);
    if (error) { toast.error("Erro ao concluir follow-up."); return; }
    toast.success("Follow-up concluído!");
    setUpcomingFollowups((prev) => prev.filter((f) => f.id !== id));
    // Só desconta do KPI "Follow-ups hoje" se o concluído era realmente de hoje.
    if (target && target.due_date === format(new Date(), "yyyy-MM-dd")) {
      setFollowupsHoje((prev) => Math.max(0, prev - 1));
    }
  };

  const totalPipelineValue = useMemo(
    () => stageSummary.reduce((a, s) => a + s.value, 0),
    [stageSummary],
  );
  const maxStageValue = useMemo(
    () => Math.max(...stageSummary.map((s) => s.value), 1),
    [stageSummary],
  );

  const kpis = useMemo(() => ([
    { key: "clientes", icon: Users, label: "Clientes ativos", value: totalClientes, badge: "Total",
      chip: "bg-primary/10 text-primary", num: "text-foreground", card: "" },
    { key: "hoje", icon: CalendarCheck, label: "Follow-ups hoje", value: followupsHoje, badge: "Hoje",
      chip: "bg-secondary/15 text-secondary", num: "text-foreground", card: "" },
    { key: "risco", icon: AlertTriangle, label: "Em risco (30+ dias)", value: emRisco, badge: "Atenção",
      chip: "bg-destructive/10 text-destructive", num: "text-destructive",
      card: "ring-1 ring-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent" },
    { key: "pipeline", icon: Briefcase, label: "Negócios em aberto", value: negociosAbertos, badge: "Pipeline",
      chip: "bg-primary/10 text-primary", num: "text-foreground", card: "" },
  ] as const), [totalClientes, followupsHoje, emRisco, negociosAbertos]);

  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardKeyframes />
        <ShimmerSkeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => <ShimmerSkeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ShimmerSkeleton className="h-64 rounded-2xl" />
          <ShimmerSkeleton className="h-64 rounded-2xl" />
        </div>
        <ShimmerSkeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in-50 duration-500">
      <DashboardKeyframes />

      {/* Aviso amigável quando algum dado não carregou — com botão de tentar de novo */}
      {hadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Alguns dados não carregaram. Os números podem estar incompletos.
          </span>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => fetchDashboard()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Tentar de novo
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cc-gradient-text text-2xl sm:text-3xl font-bold tracking-tight">
            {isAdminOrGestor ? "Painel Administrativo" : "Cockpit do Vendedor"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {profileName ? `Olá, ${profileName}! ` : ""}
            {isAdminOrGestor ? "Visão geral de toda a equipe" : "Visão geral para não perder nenhuma venda"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <SpotlightCard key={k.key} className={k.card}>
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-xl p-2.5 transition-transform group-hover:scale-110 ${k.chip}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant={k.key === "risco" ? "destructive" : "secondary"} className="text-[10px]">
                    {k.badge}
                  </Badge>
                </div>
                <NumberTicker value={k.value} className={`block text-3xl font-bold tabular-nums tracking-tight ${k.num}`} />
                <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Duas colunas: Alertas de Risco + Próximos Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Alertas de Risco */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="rounded-lg bg-destructive/10 p-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Alertas de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskClients.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-9 w-9 mb-2 text-green-500 opacity-70" />
                <p className="text-sm">Todos os clientes foram contatados recentemente!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {riskClients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10 hover:border-destructive/25 hover:bg-destructive/[0.07] transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                      {initials(c.nome_loja)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/clientes/${c.id}`} className="text-sm font-medium text-foreground hover:underline truncate block">
                        {c.nome_loja}
                      </Link>
                      <p className="text-xs text-destructive font-medium">
                        {c.days_without_contact >= 999 ? "Nunca contatado" : `${c.days_without_contact} dias sem contato`}
                      </p>
                    </div>
                    <WhatsAppActionButton
                      phone={c.celular}
                      message={`Olá ${c.nome_loja}, tudo bem? Aqui é da Cellos Representações!`}
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      Contatar
                    </WhatsAppActionButton>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Follow-ups */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="rounded-lg bg-secondary/15 p-1.5 text-secondary">
                <Clock className="h-4 w-4" />
              </span>
              Próximos Follow-ups (7 dias)
            </CardTitle>
            <Link to="/agenda" className="text-xs text-primary hover:underline shrink-0">Ver agenda</Link>
          </CardHeader>
          <CardContent>
            {upcomingFollowups.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CalendarCheck className="h-9 w-9 mb-2 opacity-40" />
                <p className="text-sm">Nenhum follow-up nos próximos 7 dias</p>
                <Link to="/agenda" className="text-xs text-primary hover:underline mt-1">Agendar follow-up</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingFollowups.map((f) => {
                  const isToday = f.due_date === format(new Date(), "yyyy-MM-dd");
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isToday
                          ? "bg-secondary/10 border-secondary/25"
                          : "bg-muted/30 border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{f.client_name}</span>
                          <Badge variant="outline" className="text-[10px] h-4">{typeLabels[f.type ?? "outro"] ?? f.type}</Badge>
                          <span className={`text-[10px] font-medium ${isToday ? "text-secondary" : "text-muted-foreground"}`}>
                            {isToday ? "Hoje" : format(toLocalDate(f.due_date), "dd/MM", { locale: ptBR })}
                            {f.due_time ? ` ${f.due_time.slice(0, 5)}` : ""}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 ml-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        onClick={() => markFollowupDone(f.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo do Pipeline */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Briefcase className="h-4 w-4" />
            </span>
            Pipeline Resumo
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              Total: <NumberTicker value={totalPipelineValue} prefix="R$ " />
            </span>
            <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Ver pipeline <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stageSummary.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Briefcase className="h-9 w-9 mb-2 opacity-40" />
              <p className="text-sm">Nenhuma oportunidade no pipeline</p>
              <Link to="/oportunidades/nova" className="text-xs text-primary hover:underline mt-1">Criar oportunidade</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:items-center">
              {/* Donut: onde o dinheiro está concentrado (visão rápida) */}
              <PipelineDonut
                stages={stageSummary}
                centerLabel={brl(totalPipelineValue)}
                centerSub="em aberto"
                showLegend={false}
              />
              {/* Barras: detalhe por etapa */}
              <div className="space-y-3.5">
                {stageSummary.map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-foreground truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4 ml-1 shrink-0">{s.count}</Badge>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 ml-2">
                        {brl(s.value)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max((s.value / maxStageValue) * 100, s.count > 0 ? 5 : 0)}%`,
                          background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carteira em risco — clicável para filtrar /clientes pelo status correspondente */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="rounded-lg bg-orange-500/10 p-1.5 text-orange-500">
              <AlertTriangle className="h-4 w-4" />
            </span>
            Carteira em risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["atencao", "em_risco", "inativo"] as const).map((st) => {
              const meta = STATUS_RETENCAO_META[st];
              return (
                <Link
                  key={st}
                  to={`/clientes?retencao=${st}`}
                  className="group rounded-xl border p-3 hover:shadow-md hover:-translate-y-0.5 transition-all text-center relative overflow-hidden"
                >
                  <ArrowUpRight className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`text-2xl font-bold tabular-nums ${st === "atencao" ? "text-amber-600" : st === "em_risco" ? "text-orange-600" : "text-red-600"}`}>
                    {retencaoLoading
                      ? <ShimmerSkeleton className="h-7 w-10 mx-auto rounded-md" />
                      : <NumberTicker value={carteiraRisco[st]} />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${meta.dotClass}`} />
                    {meta.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DashboardBlocks />

      <AppTour />
    </div>
  );
}
