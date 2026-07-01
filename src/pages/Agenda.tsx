import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowups, Followup } from "@/hooks/useFollowups";
import { useRotaDoDia, type RotaCliente } from "@/hooks/useRotaDoDia";
import { useVisitas, fazerCheckIn } from "@/hooks/useVisitas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Plus, CheckCircle2, Calendar as CalIcon, RotateCcw, History,
  CalendarPlus, Truck, ExternalLink, MessageCircle, Route as RouteIcon, MapPin, Phone,
  Navigation, Loader2, Map as MapIcon, ListChecks, ShoppingBag, TrendingUp, DollarSign,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { openInGoogleCalendar } from "@/lib/googleCalendar";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";
import { MOTIVO_LABEL, MOTIVO_COLOR } from "@/lib/priorizacao";
import { VisitaEmAndamentoSheet } from "@/components/VisitaEmAndamentoSheet";
import { useUserRole } from "@/hooks/useUserRole";

const typeLabels: Record<string, string> = {
  visita: "Visita", ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", outro: "Outro", feedback_entrega: "Feedback de entrega",
};
const typeColors: Record<string, string> = {
  visita: "bg-blue-500", ligacao: "bg-green-500", whatsapp: "bg-teal-500", email: "bg-orange-500", outro: "bg-muted-foreground", feedback_entrega: "bg-amber-500",
};

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Helper para abrir Google Maps de um endereço completo (sem precisar de coords).
 */
function buildMapsUrlFromAddress(parts: (string | null | undefined)[]) {
  const address = parts.filter(Boolean).join(", ").trim();
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

const VIEW_USER_KEY = "agenda_view_user_id";

export default function Agenda() {
  const { user } = useAuth();
  const [tab, setTab] = useState("hoje");
  const [team, setTeam] = useState<{ user_id: string; nome: string; role: string }[]>([]);
  const [viewUserId, setViewUserId] = useState<string>(() => {
    try { return localStorage.getItem(VIEW_USER_KEY) || ""; } catch { return ""; }
  });

  useEffect(() => {
    supabase.from("profiles").select("user_id, nome, role").order("nome").then(({ data }) => {
      setTeam((data ?? []) as any);
    });
  }, []);

  const effectiveUserId = viewUserId || user?.id || "";
  const isOwn = !viewUserId || viewUserId === user?.id;

  const handleChange = (v: string) => {
    const next = v === "__self__" ? "" : v;
    setViewUserId(next);
    try {
      if (next) localStorage.setItem(VIEW_USER_KEY, next);
      else localStorage.removeItem(VIEW_USER_KEY);
    } catch {/* noop */}
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Agenda &amp; Rotas</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Compromissos do dia, semana e roteiro inteligente de visitas
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Label className="text-xs whitespace-nowrap text-muted-foreground">Ver agenda de:</Label>
        <Select value={viewUserId || "__self__"} onValueChange={handleChange}>
          <SelectTrigger className="w-full sm:w-[260px] min-h-[40px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__self__">Minha agenda</SelectItem>
            {team
              .filter((t) => t.user_id !== user?.id)
              .map((t) => (
                <SelectItem key={t.user_id} value={t.user_id}>
                  {t.nome} {t.role && t.role !== "vendedor" ? `(${t.role})` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {!isOwn && (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">
            Visualizando agenda de outro usuário
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="hoje" className="gap-1"><CalIcon className="h-4 w-4" />Hoje</TabsTrigger>
          <TabsTrigger value="semana" className="gap-1"><CalendarPlus className="h-4 w-4" />Semana</TabsTrigger>
          <TabsTrigger value="roteiro" className="gap-1"><RouteIcon className="h-4 w-4" />Roteiro</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4">
          <HojeTab viewUserId={effectiveUserId} isOwn={false} />
        </TabsContent>
        <TabsContent value="semana" className="mt-4">
          <SemanaTab viewUserId={effectiveUserId} isOwn={false} />
        </TabsContent>
        <TabsContent value="roteiro" className="mt-4">
          <RoteiroTab viewUserId={effectiveUserId} isOwn={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==========================================================================
 *  TAB 1 — HOJE
 *  Lista cronológica de compromissos (followups) + visitas pendentes do dia.
 * ======================================================================== */
function HojeTab({ viewUserId, isOwn }: { viewUserId: string; isOwn: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followups, loading, fetch, complete } = useFollowups(undefined, isOwn ? undefined : viewUserId);
  const { rota } = useRotaDoDia(isOwn ? undefined : viewUserId);
  const [visitaAtiva, setVisitaAtiva] = useState<{ visitaId: string; cliente: any } | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  useEffect(() => { fetch(); }, [fetch]);

  const today = new Date().toISOString().slice(0, 10);

  const todaysFollowups = useMemo(() => {
    return followups
      .filter((f) => f.due_date === today && f.status === "pendente")
      .sort((a, b) => (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99"));
  }, [followups, today]);

  const visitasHoje = useMemo(() => {
    return rota.filter((r) => !r.visitaHojeId).slice(0, 5);
  }, [rota]);

  const handleCheckIn = async (item: RotaCliente) => {
    if (!user) return;
    if (item.visitaHojeId) {
      setVisitaAtiva({ visitaId: item.visitaHojeId, cliente: item.cliente });
      return;
    }
    setCheckingInId(item.cliente.id);
    const { visitaId, error } = await fazerCheckIn({
      userId: user.id,
      clienteId: item.cliente.id,
      motivo: item.prioridade.motivoPrincipal,
    });
    setCheckingInId(null);
    if (error || !visitaId) { toast.error("Erro ao fazer check-in."); return; }
    toast.success("Check-in registrado!");
    setVisitaAtiva({ visitaId, cliente: item.cliente });
  };

  const handleLigar = (tel?: string | null) => {
    if (!tel) { toast.error("Cliente sem telefone."); return; }
    window.location.href = `tel:${tel.replace(/\D/g, "")}`;
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>;

  const totalCompromissos = todaysFollowups.length + visitasHoje.length;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent border-secondary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hoje, {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalCompromissos} {totalCompromissos === 1 ? "compromisso" : "compromissos"}
            </p>
          </div>
          <CalIcon className="h-10 w-10 text-secondary opacity-70" />
        </CardContent>
      </Card>

      {todaysFollowups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1">Tarefas agendadas</h3>
          {todaysFollowups.map((f) => (
            <Card key={f.id} className="border-l-4 border-l-secondary">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[f.type ?? ""] || f.type}
                      </Badge>
                      {f.due_time && (
                        <span className="text-[11px] font-bold text-secondary">
                          ⏰ {f.due_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-1">{f.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {(f as any).clientes?.nome_loja ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-3">
                  <Button size="sm" variant="outline" className="h-9 text-xs px-1" onClick={() => handleLigar((f as any).clientes?.celular || (f as any).clientes?.telefone)}>
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <WhatsAppActionButton
                    phone={(f as any).clientes?.celular || (f as any).clientes?.telefone}
                    message={`Olá ${(f as any).clientes?.nome_loja ?? "Cliente"}, tudo bem? Lembrando do compromisso de hoje${f.due_time ? ` às ${f.due_time.slice(0, 5)}` : ""}.`}
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs px-1"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </WhatsAppActionButton>
                  <Button size="sm" variant="outline" className="h-9 text-xs px-1" onClick={() => navigate(`/pedidos/novo?cliente=${f.client_id}`)}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 text-xs px-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={async () => { await complete(f.id); toast.success("Concluído!"); }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {visitasHoje.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1 flex items-center gap-1">
            <RouteIcon className="h-3 w-3" /> Visitas sugeridas
          </h3>
          {visitasHoje.map((item) => {
            const c = item.cliente;
            const enderecoCurto = [c.endereco, c.bairro, c.cidade].filter(Boolean).join(", ");
            const mapsUrl = buildMapsUrlFromAddress([c.endereco, c.bairro, c.cidade]);
            return (
              <Card key={c.id} className="border-l-4 border-l-amber-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.prioridade.motivos.slice(0, 2).map((m) => (
                      <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MOTIVO_COLOR[m]}`}>
                        {MOTIVO_LABEL[m]}
                      </span>
                    ))}
                  </div>
                  <p className="font-semibold text-sm truncate">{c.nome_loja}</p>
                  {enderecoCurto && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {enderecoCurto}
                    </p>
                  )}
                  <div className="grid grid-cols-4 gap-1 mt-3">
                    <Button size="sm" variant="outline" className="h-9 text-xs px-1" onClick={() => handleLigar(c.celular || c.telefone)}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <WhatsAppActionButton
                      phone={c.celular || c.telefone}
                      message={`Olá ${c.nome_loja}, tudo bem? Estou indo na sua loja hoje!`}
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs px-1"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </WhatsAppActionButton>
                    {mapsUrl ? (
                      <Button size="sm" variant="outline" className="h-9 text-xs px-1" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
                        <Navigation className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-9 text-xs px-1" disabled>
                        <Navigation className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-9 text-xs px-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      onClick={() => handleCheckIn(item)}
                      disabled={checkingInId === c.id}
                    >
                      {checkingInId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalCompromissos === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground">Nenhum compromisso agendado para hoje</p>
            <p className="text-xs mt-1">Confira a aba "Roteiro" para sugestões de visitas.</p>
          </CardContent>
        </Card>
      )}

      <VisitaEmAndamentoSheet
        open={!!visitaAtiva}
        onOpenChange={(v) => !v && setVisitaAtiva(null)}
        visitaId={visitaAtiva?.visitaId ?? null}
        cliente={visitaAtiva?.cliente ?? null}
        onPedidoRapido={(cId) => navigate(`/pedidos/novo?cliente=${cId}`)}
        onFinalizada={() => fetch()}
      />

    </div>
  );
}

/* ==========================================================================
 *  TAB 2 — SEMANA (calendário mensal completo, com modal de novo follow-up)
 *  Mantém a lógica da Agenda original (mensal compacto + dia selecionado).
 * ======================================================================== */
function SemanaTab({ viewUserId, isOwn }: { viewUserId: string; isOwn: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followups, loading, fetch, create, complete, reschedule } = useFollowups(undefined, isOwn ? undefined : viewUserId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rescheduleFu, setRescheduleFu] = useState<Followup | null>(null);
  const [reschedDate, setReschedDate] = useState<Date | undefined>(undefined);
  const [reschedTime, setReschedTime] = useState("");
  const [fuForm, setFuForm] = useState({ type: "visita", subject: "", notes: "", due_date: "", due_time: "", client_id: "" });
  const [clientes, setClientes] = useState<{ id: string; nome_loja: string }[]>([]);
  const [feedbackFu, setFeedbackFu] = useState<Followup | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    supabase.from("clientes").select("id, nome_loja").order("nome_loja").then(({ data }) => setClientes(data ?? []));
  }, [user?.id]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const followupsByDate = useMemo(() => {
    const map: Record<string, Followup[]> = {};
    followups.forEach((f) => {
      if (!map[f.due_date]) map[f.due_date] = [];
      map[f.due_date].push(f);
    });
    return map;
  }, [followups]);

  const selectedFollowups = selectedDate ? (followupsByDate[selectedDate] ?? []) : [];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const monthLabel = currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const handleCreate = async () => {
    if (!fuForm.subject.trim() || !fuForm.due_date || !fuForm.client_id) {
      toast.error("Cliente, assunto e data são obrigatórios.");
      return;
    }
    const { error } = await create({
      client_id: fuForm.client_id,
      due_date: fuForm.due_date,
      due_time: fuForm.due_time || null,
      type: fuForm.type,
      subject: fuForm.subject,
      notes: fuForm.notes || null,
    });
    if (error) { toast.error("Erro ao agendar."); return; }
    toast.success("Follow-up agendado!");
    setModalOpen(false);
    setFuForm({ type: "visita", subject: "", notes: "", due_date: "", due_time: "", client_id: "" });
  };

  const handleComplete = async (fu: Followup) => {
    if (fu.type === "feedback_entrega") {
      setFeedbackFu(fu);
      setFeedbackNote("");
      return;
    }
    const { error } = await complete(fu.id);
    if (error) { toast.error("Erro."); return; }
    toast.success("Concluído!");
  };

  const submitFeedback = async () => {
    if (!feedbackFu || !feedbackNote.trim() || !user) { toast.error("Descreva como foi a entrega."); return; }
    setSavingFeedback(true);
    const { error: intError } = await supabase.from("interactions").insert({
      client_id: feedbackFu.client_id,
      created_by: user.id,
      type: "feedback_entrega",
      subject: "Feedback pós-entrega",
      description: feedbackNote.trim(),
    });
    if (intError) { toast.error("Erro ao registrar feedback."); setSavingFeedback(false); return; }
    const { error } = await complete(feedbackFu.id);
    setSavingFeedback(false);
    if (error) { toast.error("Feedback salvo, mas erro ao concluir."); return; }
    toast.success("Feedback registrado!");
    setFeedbackFu(null);
    setFeedbackNote("");
  };

  const openReschedule = (fu: Followup) => {
    setRescheduleFu(fu);
    setReschedDate(new Date(fu.due_date + "T00:00:00"));
    setReschedTime(fu.due_time?.slice(0, 5) ?? "");
  };

  const handleReschedule = async () => {
    if (!rescheduleFu || !reschedDate) { toast.error("Selecione uma nova data."); return; }
    const newDate = format(reschedDate, "yyyy-MM-dd");
    const newTime = reschedTime || null;
    if (newDate === rescheduleFu.due_date && newTime === rescheduleFu.due_time) {
      toast.error("A nova data/hora é igual à atual.");
      return;
    }
    const { error } = await reschedule(rescheduleFu, newDate, newTime);
    if (error) { toast.error("Erro ao remarcar."); return; }
    toast.success("Remarcado!");
    setRescheduleFu(null);
    setReschedDate(undefined);
    setReschedTime("");
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => { setFuForm({ ...fuForm, due_date: selectedDate || today }); setModalOpen(true); }} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" /> Agendar
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
          <CardTitle className="text-base capitalize">{monthLabel}</CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysOfWeek.map((d) => <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayFollowups = followupsByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasOverdue = dayFollowups.some((f) => f.status === "pendente" && dateStr < today);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "relative p-2 rounded-lg text-sm transition-colors hover:bg-muted/50 min-h-[44px]",
                    isToday && "ring-2 ring-primary",
                    isSelected && "bg-primary/10 font-bold",
                    hasOverdue && "text-destructive font-semibold",
                  )}
                >
                  {day}
                  {dayFollowups.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-0.5">
                      {dayFollowups.slice(0, 3).map((f, idx) => (
                        <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", typeColors[f.type ?? "outro"])} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            {selectedFollowups.length > 0 && ` — ${selectedFollowups.length} follow-up(s)`}
          </h3>
          {selectedFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum follow-up neste dia.</p>
          ) : (
            selectedFollowups.map((f) => {
              const isOverdue = f.due_date < today && f.status === "pendente";
              const wasRescheduled = !!f.foi_remarcado;
              return (
                <Card key={f.id} className={cn("border-0 shadow-sm", isOverdue && "border-l-4 border-l-destructive")}>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={f.status === "concluido" ? "default" : isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                          {f.status === "concluido" ? "Concluído" : isOverdue ? "Vencido" : "Pendente"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{typeLabels[f.type ?? ""] || f.type}</Badge>
                        {wasRescheduled && (
                          <Badge variant="outline" className="text-[10px] border-orange-400/60 text-orange-700 bg-orange-50 gap-1">
                            <History className="h-3 w-3" /> Remarcado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1">{f.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f as any).clientes?.nome_loja ?? "—"}
                        {f.due_time ? ` · ${f.due_time.slice(0, 5)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {f.type === "feedback_entrega" && f.notes?.startsWith("pedido_id:") && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/pedidos/${f.notes!.replace("pedido_id:", "")}`)}>
                          <ExternalLink className="h-4 w-4 mr-1" /> Pedido
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openInGoogleCalendar({
                        title: f.subject,
                        description: f.notes ?? "",
                        date: f.due_date,
                        time: f.due_time,
                        location: (f as any).clientes?.cidade ?? null,
                      })}>
                        <CalendarPlus className="h-4 w-4 mr-1" /> Google
                      </Button>
                      <WhatsAppActionButton
                        phone={(f as any).clientes?.celular || (f as any).clientes?.telefone}
                        message={`Olá ${(f as any).clientes?.nome_loja ?? "Cliente"}, tudo bem? ${f.subject}`}
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                      </WhatsAppActionButton>
                      {f.status === "pendente" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openReschedule(f)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Remarcar
                          </Button>
                          <Button size="sm" onClick={() => handleComplete(f)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select value={fuForm.client_id} onValueChange={(v) => setFuForm({ ...fuForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_loja}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={fuForm.type} onValueChange={(v) => setFuForm({ ...fuForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Input value={fuForm.subject} onChange={(e) => setFuForm({ ...fuForm, subject: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={fuForm.due_date} onChange={(e) => setFuForm({ ...fuForm, due_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={fuForm.due_time} onChange={(e) => setFuForm({ ...fuForm, due_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={fuForm.notes} onChange={(e) => setFuForm({ ...fuForm, notes: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleCreate}>Agendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleFu} onOpenChange={(v) => { if (!v) { setRescheduleFu(null); setReschedDate(undefined); setReschedTime(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" /> Remarcar
            </DialogTitle>
          </DialogHeader>
          {rescheduleFu && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-sm font-medium">{rescheduleFu.subject}</p>
                <p className="text-xs text-muted-foreground">
                  Atual: {new Date(rescheduleFu.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  {rescheduleFu.due_time ? ` às ${rescheduleFu.due_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <div className="space-y-1">
                <Label>Nova data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !reschedDate && "text-muted-foreground")}>
                      <CalIcon className="mr-2 h-4 w-4" />
                      {reschedDate ? format(reschedDate, "PPP", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={reschedDate} onSelect={setReschedDate} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Nova hora</Label>
                <Input type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} />
              </div>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={handleReschedule}>
                Confirmar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!feedbackFu} onOpenChange={(v) => { if (!v) { setFeedbackFu(null); setFeedbackNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-amber-600" /> Feedback da entrega</DialogTitle>
          </DialogHeader>
          {feedbackFu && (
            <div className="space-y-4">
              <Textarea value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} rows={4} placeholder="Como foi a entrega?" />
              <Button className="w-full" onClick={submitFeedback} disabled={savingFeedback}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar e concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ==========================================================================
 *  TAB 3 — ROTEIRO
 *  Lista priorizada agrupada por bairro/cidade. Sem dependência de coords.
 * ======================================================================== */
function RoteiroTab({ viewUserId, isOwn }: { viewUserId: string; isOwn: boolean }) {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const { rota, loading, refetch } = useRotaDoDia(isOwn ? undefined : viewUserId);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [visitaAtiva, setVisitaAtiva] = useState<{ visitaId: string; cliente: any } | null>(null);

  // Histórico - estatísticas
  const [showHistorico, setShowHistorico] = useState(false);

  const grupos = useMemo(() => {
    const map = new Map<string, RotaCliente[]>();
    for (const item of rota) {
      const c = item.cliente;
      const key = [c.bairro, c.cidade].filter(Boolean).join(", ") || "Sem localização";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [rota]);

  const handleCheckIn = useCallback(async (item: RotaCliente) => {
    if (!user) return;
    if (item.visitaHojeId) {
      setVisitaAtiva({ visitaId: item.visitaHojeId, cliente: item.cliente });
      return;
    }
    setCheckingInId(item.cliente.id);
    const { visitaId, error } = await fazerCheckIn({
      userId: user.id,
      clienteId: item.cliente.id,
      motivo: item.prioridade.motivoPrincipal,
    });
    setCheckingInId(null);
    if (error || !visitaId) { toast.error("Erro ao fazer check-in."); return; }
    toast.success("Check-in registrado!");
    setVisitaAtiva({ visitaId, cliente: item.cliente });
    refetch();
  }, [user?.id, refetch]);

  const handleLigar = (tel?: string | null) => {
    if (!tel) { toast.error("Cliente sem telefone."); return; }
    window.location.href = `tel:${tel.replace(/\D/g, "")}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent border-secondary/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Visitas sugeridas</p>
              <p className="text-2xl font-bold text-primary">{rota.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bairros</p>
              <p className="text-2xl font-bold text-primary">{grupos.length}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 min-h-[40px]" onClick={() => setShowHistorico(!showHistorico)}>
            <History className="h-4 w-4 mr-1" />
            {showHistorico ? "Ocultar histórico" : "Ver histórico"}
          </Button>
        </CardContent>
      </Card>

      {showHistorico && <HistoricoVisitas userId={viewUserId || user!.id} isAdminOrGestor={isAdminOrGestor} />}

      {rota.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <RouteIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Sem visitas prioritárias para hoje</p>
            <p className="text-sm text-muted-foreground mt-1">
              O roteiro aparece quando há clientes em risco, oportunidades quentes ou tarefas do dia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map(([nomeGrupo, items]) => (
            <div key={nomeGrupo} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <MapPin className="h-3 w-3 text-secondary" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{nomeGrupo}</h3>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
              {items.map((item) => {
                const c = item.cliente;
                const enderecoCompleto = [c.endereco, c.bairro, c.cidade].filter(Boolean).join(", ");
                const mapsUrl = buildMapsUrlFromAddress([c.endereco, c.bairro, c.cidade]);
                const jaVisitado = !!item.visitaHojeId;
                return (
                  <Card key={c.id} className={`border-l-4 ${jaVisitado ? "border-l-green-500 bg-green-500/5" : "border-l-secondary"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.prioridade.motivos.map((m) => (
                          <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MOTIVO_COLOR[m]}`}>
                            {MOTIVO_LABEL[m]}
                          </span>
                        ))}
                      </div>
                      <p className="font-semibold text-sm">{c.nome_loja}</p>
                      {enderecoCompleto && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{enderecoCompleto}</span>
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-1.5 mt-3">
                        {mapsUrl ? (
                          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
                            <Navigation className="h-3.5 w-3.5" /> Iniciar rota
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-9 text-xs" disabled>
                            <Navigation className="h-3.5 w-3.5 opacity-50" /> Sem endereço
                          </Button>
                        )}
                        <WhatsAppActionButton
                          phone={c.celular || c.telefone}
                          message={`Olá ${c.nome_loja}, tudo bem? Estou indo na sua loja hoje!`}
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </WhatsAppActionButton>
                        <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => handleLigar(c.celular || c.telefone)}>
                          <Phone className="h-3.5 w-3.5" /> Ligar
                        </Button>
                        <Button
                          size="sm"
                          className={`h-9 text-xs ${jaVisitado ? "bg-green-600 hover:bg-green-700 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                          onClick={() => handleCheckIn(item)}
                          disabled={checkingInId === c.id}
                        >
                          {checkingInId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : jaVisitado ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Visitado</>
                          ) : (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Cheguei</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <VisitaEmAndamentoSheet
        open={!!visitaAtiva}
        onOpenChange={(v) => !v && setVisitaAtiva(null)}
        visitaId={visitaAtiva?.visitaId ?? null}
        cliente={visitaAtiva?.cliente ?? null}
        onPedidoRapido={(cId) => navigate(`/pedidos/novo?cliente=${cId}`)}
        onFinalizada={refetch}
      />
    </div>
  );
}

function HistoricoVisitas({ userId, isAdminOrGestor }: { userId: string; isAdminOrGestor: boolean }) {
  const [from] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to] = useState(format(new Date(), "yyyy-MM-dd"));
  const { visitas, loading } = useVisitas({ from, to, vendedorId: userId });

  const stats = useMemo(() => {
    const total = visitas.length;
    const finalizadas = visitas.filter((v) => v.status === "finalizada").length;
    const vendeu = visitas.filter((v) => v.resultado === "vendeu").length;
    const valorTotal = visitas.reduce((acc, v) => acc + Number(v.valor_gerado || 0), 0);
    const conversao = finalizadas > 0 ? (vendeu / finalizadas) * 100 : 0;
    return { total, vendeu, valorTotal, conversao };
  }, [visitas]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Últimos 30 dias</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={ListChecks} label="Visitas" value={stats.total.toString()} />
          <Stat icon={ShoppingBag} label="Vendas" value={stats.vendeu.toString()} />
          <Stat icon={TrendingUp} label="Conv." value={`${stats.conversao.toFixed(0)}%`} />
          <Stat icon={DollarSign} label="Valor" value={`R$ ${stats.valorTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] uppercase">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
