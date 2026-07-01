import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useFollowups } from "@/hooks/useFollowups";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, AlertTriangle, GripVertical, List, LayoutGrid, Send, MoveRight,
  CalendarPlus, Clock, X, Filter, UserCheck, MessageCircle, Trash2, XCircle, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnviarCatalogosDialog } from "@/components/EnviarCatalogosDialog";
import { WhatsAppSendDialog } from "@/components/WhatsAppSendDialog";
import { DeleteOpportunityButton } from "@/components/DeleteOpportunityButton";
import { CancelLeadButton, LOSS_MOTIVOS } from "@/components/CancelLeadButton";
import { bantCompleteness } from "@/hooks/useBant";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tempColors: Record<string, string> = {
  quente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  morno: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  frio: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const TEMPERATURES = ["quente", "morno", "frio"] as const;

const OpportunityCard = memo(function OpportunityCard({ opp, onDragStart, onSendCatalog, onDeleted }: { opp: Opportunity; onDragStart: (e: React.DragEvent, id: string) => void; onSendCatalog: (opp: Opportunity) => void; onDeleted: () => void }) {
  const hasNoAction = !opp.next_action_at && opp.status === "open";
  const isOverdue = opp.next_action_at && new Date(opp.next_action_at) < new Date() && opp.status === "open";
  const isLost = opp.status === "lost";

  return (
    <Card
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, opp.id); }}
      className={cn(
        "cursor-grab active:cursor-grabbing border shadow-sm hover:shadow-md transition-all mb-2",
        hasNoAction && !isLost && "border-destructive/50 ring-1 ring-destructive/30",
        isOverdue && !isLost && "border-orange-400/50 ring-1 ring-orange-400/30",
        isLost && "opacity-60 border-muted bg-muted/30"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <Link to={`/oportunidades/${opp.id}`} className="block space-y-2">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-sm font-semibold leading-tight line-clamp-2", isLost ? "text-muted-foreground line-through" : "text-foreground")}>{opp.title}</p>
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
          </div>
          <p className="text-xs text-muted-foreground">{opp.clientes?.nome_loja ?? "—"}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              R$ {Number(opp.estimated_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </span>
            {isLost ? (
              <Badge variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive">Perdida</Badge>
            ) : (
              <Badge variant="secondary" className={cn("text-[10px] h-5", tempColors[opp.temperature] ?? "")}>
                {opp.temperature}
              </Badge>
            )}
          </div>
          {hasNoAction && !isLost && (
            <div className="flex items-center gap-1 text-destructive text-[10px] font-medium">
              <AlertTriangle className="h-3 w-3" /> Sem próxima ação
            </div>
          )}
          {isOverdue && !hasNoAction && !isLost && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-[10px] font-medium">
              <AlertTriangle className="h-3 w-3" /> Ação atrasada
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[11px] border-secondary/40 text-secondary hover:bg-secondary/10 hover:text-secondary"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendCatalog(opp); }}
          >
            <Send className="h-3 w-3 mr-1" /> Catálogos
          </Button>
          {opp.status === "open" && (
            <CancelLeadButton
              opportunityId={opp.id}
              companyId={opp.company_id}
              status={opp.status}
              onChanged={onDeleted}
              variant="icon"
            />
          )}
          <DeleteOpportunityButton
            opportunityId={opp.id}
            ownerId={opp.owner_id}
            title={opp.title}
            onDeleted={onDeleted}
          />
        </div>
      </CardContent>
    </Card>
  );
});

export default function Pipeline() {
  const navigate = useNavigate();
  const { stages, loading: stagesLoading } = usePipelineStages();
  const stageById = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages]);
  const { opportunities, loading: oppsLoading, moveToStage, refetch } = useOpportunities();
  const { create: createFollowup } = useFollowups();
  const { isAdminOrGestor } = useUserRole();
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("list");
  const [catalogoOpp, setCatalogoOpp] = useState<Opportunity | null>(null);
  const [waOpp, setWaOpp] = useState<Opportunity | null>(null);
  const [followupOpp, setFollowupOpp] = useState<Opportunity | null>(null);
  const [fuForm, setFuForm] = useState({ subject: "", due_date: "", due_time: "", notes: "" });
  const [convertOpp, setConvertOpp] = useState<Opportunity | null>(null);
  const [converting, setConverting] = useState(false);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [noActionOnly, setNoActionOnly] = useState(false);
  const [vendedorFilter, setVendedorFilter] = useState<string>("all");
  const [vendedores, setVendedores] = useState<{ user_id: string; nome: string }[]>([]);
  // Lost-leads filters
  const [showLost, setShowLost] = useState(false);
  const [lossMotivoFilter, setLossMotivoFilter] = useState<string>("all");
  const [lossPeriodo, setLossPeriodo] = useState<string>("30"); // dias: 7,30,90,365,all

  // Carrega lista de vendedores para todos
  useEffect(() => {
    supabase.from("profiles").select("user_id, nome").order("nome").then(({ data }) => {
      setVendedores(data ?? []);
    });
  }, []);

  const openStages = useMemo(() => stages.filter(s => s.name !== "Fechado ganho" && s.name !== "Fechado perdido"), [stages]);
  const closedStages = useMemo(() => stages.filter(s => s.name === "Fechado ganho" || s.name === "Fechado perdido"), [stages]);

  // Apply filters (kanban shows all, list applies filters)
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (showLost) {
        if (o.status !== "lost") return false;
        if (lossMotivoFilter !== "all") {
          const reason = (o.loss_reason ?? "").toLowerCase();
          if (!reason.startsWith(lossMotivoFilter.toLowerCase())) return false;
        }
        if (lossPeriodo !== "all") {
          const dias = parseInt(lossPeriodo, 10);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - dias);
          const ref = new Date(o.updated_at ?? o.created_at);
          if (ref < cutoff) return false;
        }
        if (vendedorFilter !== "all" && o.owner_id !== vendedorFilter) return false;
        return true;
      }
      if (o.status !== "open" && o.status !== "won") return false;
      if (stageFilter !== "all" && o.stage_id !== stageFilter) return false;
      if (tempFilter !== "all" && o.temperature !== tempFilter) return false;
      if (noActionOnly && o.next_action_at) return false;
      if (vendedorFilter !== "all" && o.owner_id !== vendedorFilter) return false;
      return true;
    });
  }, [opportunities, stageFilter, tempFilter, noActionOnly, vendedorFilter, isAdminOrGestor, showLost, lossMotivoFilter, lossPeriodo]);

  const oppsByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages.forEach(s => { map[s.id] = []; });
    opportunities.forEach(o => {
      if (map[o.stage_id]) map[o.stage_id].push(o);
    });
    return map;
  }, [opportunities, stages]);

  const totalValue = useMemo(
    () => opportunities.filter(o => o.status === "open").reduce((a, o) => a + (Number(o.estimated_value) || 0), 0),
    [opportunities]
  );

  const noActionCount = useMemo(
    () => opportunities.filter(o => o.status === "open" && !o.next_action_at).length,
    [opportunities]
  );

  const lostTotalCount = useMemo(
    () => opportunities.filter(o => o.status === "lost").length,
    [opportunities]
  );

  const filteredValue = useMemo(
    () => filteredOpportunities.reduce((a, o) => a + (Number(o.estimated_value) || 0), 0),
    [filteredOpportunities]
  );

  const activeFilterCount =
    (showLost ? 1 : 0) +
    (!showLost && stageFilter !== "all" ? 1 : 0) +
    (!showLost && tempFilter !== "all" ? 1 : 0) +
    (!showLost && noActionOnly ? 1 : 0) +
    (showLost && lossMotivoFilter !== "all" ? 1 : 0) +
    (showLost && lossPeriodo !== "all" ? 1 : 0) +
    (vendedorFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setStageFilter("all");
    setTempFilter("all");
    setNoActionOnly(false);
    setVendedorFilter("all");
    setShowLost(false);
    setLossMotivoFilter("all");
    setLossPeriodo("30");
  };

  const exportLostCSV = () => {
    if (filteredOpportunities.length === 0) {
      toast.info("Nenhum lead perdido no filtro atual.");
      return;
    }
    const escape = (v: any) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };
    const periodoLabel =
      lossPeriodo === "all" ? "Todo o periodo" : `Ultimos ${lossPeriodo} dias`;
    const motivoLabel = lossMotivoFilter === "all" ? "Todos" : lossMotivoFilter;

    const headers = [
      "Titulo", "Cliente", "Valor estimado (R$)",
      "Motivo (categoria)", "Motivo completo",
      "Data perda", "Data criacao", "Etapa", "Temperatura", "Observacoes",
    ];
    const rows = filteredOpportunities.map(o => {
      const reason = o.loss_reason ?? "";
      const categoria = LOSS_MOTIVOS.find(m => reason.toLowerCase().startsWith(m.toLowerCase())) ?? "";
      const dataPerda = o.updated_at ?? o.created_at;
      const stageName = stages.find(s => s.id === o.stage_id)?.name ?? "";
      return [
        o.title ?? "",
        o.clientes?.nome_loja ?? "",
        Number(o.estimated_value ?? 0).toFixed(2).replace(".", ","),
        categoria,
        reason,
        dataPerda ? format(new Date(dataPerda), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
        o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy", { locale: ptBR }) : "",
        stageName,
        o.temperature ?? "",
        o.notes ?? "",
      ];
    });

    const meta = [
      ["Relatorio de Leads Perdidos"],
      ["Gerado em", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
      ["Periodo", periodoLabel],
      ["Motivo", motivoLabel],
      ["Total de leads", String(filteredOpportunities.length)],
      ["Valor total estimado (R$)", filteredValue.toFixed(2).replace(".", ",")],
      [],
    ];

    const csv = "\uFEFF" + [
      ...meta.map(r => r.map(escape).join(";")),
      headers.map(escape).join(";"),
      ...rows.map(r => r.map(escape).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-perdidos_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredOpportunities.length} lead(s) exportado(s).`);
  };

  const handleDragStart = useCallback((_: React.DragEvent, id: string) => setDraggedId(id), []);

  /**
   * Bloqueia o avanço para "Proposta" se a etapa atual for "Qualificação BANT"
   * e o BANT da oportunidade não estiver completo.
   */
  const ensureBantBeforeProposta = async (opp: Opportunity, targetStageName: string | undefined): Promise<boolean> => {
    if (targetStageName !== "Proposta") return true;
    const currentStage = stages.find(s => s.id === opp.stage_id);
    if (currentStage?.name !== "Qualificação BANT") return true;
    const { data } = await (supabase as any)
      .from("qualificacao_bant")
      .select("*")
      .eq("opportunity_id", opp.id)
      .maybeSingle();
    const { isComplete, completed, total } = bantCompleteness(data ?? null);
    if (!isComplete) {
      toast.error(`Preencha o BANT antes (${completed}/${total}). Abra a oportunidade → aba BANT.`);
      return false;
    }
    return true;
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (!draggedId) return;
    const opp = opportunities.find(o => o.id === draggedId);
    if (!opp || opp.stage_id === stageId) { setDraggedId(null); return; }

    const stage = stages.find(s => s.id === stageId);

    if (!(await ensureBantBeforeProposta(opp, stage?.name))) {
      setDraggedId(null);
      return;
    }

    if (stage?.name === "Fechado perdido") {
      const reason = prompt("Motivo da perda (obrigatório):");
      if (!reason?.trim()) { toast.error("Motivo da perda é obrigatório."); setDraggedId(null); return; }
      await supabase.from("opportunities").update({ loss_reason: reason, status: "lost" }).eq("id", draggedId);
    } else if (stage?.name === "Fechado ganho" || stage?.name === "Fechamento") {
      await supabase.from("opportunities").update({ status: "won" }).eq("id", draggedId);
    }

    const { error } = await moveToStage(draggedId, stageId);
    if (error) toast.error("Erro ao mover oportunidade.");
    else {
      await supabase.from("timeline_events").insert({
        opportunity_id: draggedId,
        company_id: opp.company_id,
        user_id: opp.owner_id,
        event_type: "stage_change",
        description: `Movido para: ${stage?.name ?? ""}`,
      });
      refetch();
    }
    setDraggedId(null);
  };

  const moveOppToStage = async (opp: Opportunity, stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage || opp.stage_id === stageId) return;

    if (!(await ensureBantBeforeProposta(opp, stage.name))) return;

    if (stage.name === "Fechado perdido") {
      const reason = prompt("Motivo da perda (obrigatório):");
      if (!reason?.trim()) { toast.error("Motivo da perda é obrigatório."); return; }
      await supabase.from("opportunities").update({ loss_reason: reason, status: "lost" }).eq("id", opp.id);
    } else if (stage.name === "Fechado ganho" || stage.name === "Fechamento") {
      await supabase.from("opportunities").update({ status: "won" }).eq("id", opp.id);
    }
    const { error } = await moveToStage(opp.id, stageId);
    if (error) { toast.error("Erro ao mover oportunidade."); return; }
    await supabase.from("timeline_events").insert({
      opportunity_id: opp.id,
      company_id: opp.company_id,
      user_id: opp.owner_id,
      event_type: "stage_change",
      description: `Movido para: ${stage.name}`,
    });
    toast.success(`Movido para "${stage.name}"`);
    refetch();
  };

  const openFollowupDialog = (opp: Opportunity) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFuForm({
      subject: `Follow-up: ${opp.title}`,
      due_date: tomorrow.toISOString().split("T")[0],
      due_time: "09:00",
      notes: "",
    });
    setFollowupOpp(opp);
  };

  const submitFollowup = async () => {
    if (!followupOpp || !fuForm.subject.trim() || !fuForm.due_date) {
      toast.error("Assunto e data são obrigatórios."); return;
    }
    const { error } = await createFollowup({
      client_id: followupOpp.company_id,
      opportunity_id: followupOpp.id,
      due_date: fuForm.due_date,
      due_time: fuForm.due_time || null,
      subject: fuForm.subject,
      notes: fuForm.notes || null,
      type: "outro",
    });
    if (error) { toast.error("Erro ao agendar follow-up."); return; }
    toast.success("Follow-up agendado!");
    setFollowupOpp(null);
  };

  const lastStage = stages.length > 0 ? stages[stages.length - 1] : null;

  const handleConvert = async () => {
    if (!convertOpp || !lastStage) return;
    setConverting(true);
    try {
      await supabase
        .from("opportunities")
        .update({
          stage_id: lastStage.id,
          probability: lastStage.default_probability,
          status: "won",
        })
        .eq("id", convertOpp.id);

      await supabase.from("timeline_events").insert({
        opportunity_id: convertOpp.id,
        company_id: convertOpp.company_id,
        user_id: convertOpp.owner_id,
        event_type: "converted",
        description: `Lead convertido em cliente.`,
      });

      toast.success(`"${convertOpp.title}" convertido em cliente!`);
      setConvertOpp(null);
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao converter em cliente.");
    } finally {
      setConverting(false);
    }
  };

  const loading = stagesLoading || oppsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Pipeline</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {opportunities.filter(o => o.status === "open").length} oportunidades · R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} no funil
            {noActionCount > 0 && (
              <span className="text-destructive font-medium ml-2">
                · {noActionCount} sem ação
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/oportunidades/nova">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Plus className="h-4 w-4 mr-1" /> Nova Oportunidade
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick filters — only on list view */}
      {view === "list" && (
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">{activeFilterCount} ativo{activeFilterCount > 1 ? "s" : ""}</Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant={showLost ? "default" : "outline"}
                  size="sm"
                  className={cn("h-8 text-xs", showLost && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                  onClick={() => setShowLost(v => !v)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  {showLost ? "Vendo perdidos" : "Ver perdidos"}
                  {!showLost && lostTotalCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{lostTotalCount}</Badge>
                  )}
                </Button>
                {showLost && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                    onClick={exportLostCSV}
                    disabled={filteredOpportunities.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
                    <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{filteredOpportunities.length}</Badge>
                  </Button>
                )}
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" /> Limpar
                  </Button>
                )}
              </div>
            </div>

            {showLost ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {/* Motivo da perda */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Motivo</Label>
                  <Select value={lossMotivoFilter} onValueChange={setLossMotivoFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">Todos os motivos</SelectItem>
                      {LOSS_MOTIVOS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Período</Label>
                  <Select value={lossPeriodo} onValueChange={setLossPeriodo}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="365">Último ano</SelectItem>
                      <SelectItem value="all">Todo o período</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendedor */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Vendedor</Label>
                  <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">Todos os vendedores</SelectItem>
                      {vendedores.map(v => (
                        <SelectItem key={v.user_id} value={v.user_id}>{v.nome || "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {/* Stage */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Etapa</Label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">Todas as etapas</SelectItem>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Temperatura</Label>
                  <Select value={tempFilter} onValueChange={setTempFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">Todas</SelectItem>
                      {TEMPERATURES.map(t => (
                        <SelectItem key={t} value={t}>
                          <span className="capitalize">{t}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* No action */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Status de ação</Label>
                  <Button
                    variant={noActionOnly ? "default" : "outline"}
                    size="sm"
                    className={cn("w-full h-9 justify-start", noActionOnly && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                    onClick={() => setNoActionOnly(v => !v)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                    {noActionOnly ? "Apenas sem ação" : "Sem ação definida"}
                  </Button>
                </div>

                {/* Vendedor */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Vendedor</Label>
                  <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">Todos os vendedores</SelectItem>
                      {vendedores.map(v => (
                        <SelectItem key={v.user_id} value={v.user_id}>{v.nome || "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(activeFilterCount > 0 || showLost) && (
              <p className="text-xs text-muted-foreground mt-3">
                {filteredOpportunities.length} {showLost ? "lead(s) perdido(s)" : `resultado${filteredOpportunities.length !== 1 ? "s" : ""}`} · R$ {filteredValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {view === "kanban" ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4 min-w-max">
            {[...openStages, ...closedStages].map(stage => {
              const stageOpps = oppsByStage[stage.id] ?? [];
              const stageValue = stageOpps.reduce((a, o) => a + (Number(o.estimated_value) || 0), 0);
              return (
                <div
                  key={stage.id}
                  className="w-72 shrink-0 flex flex-col bg-muted/30 rounded-xl"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="p-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] h-5">{stageOpps.length}</Badge>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {stageValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                  <div className="p-2 flex-1 min-h-[100px] space-y-0">
                    {stageOpps.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 text-center py-6">Arraste aqui</p>
                    ) : (
                      stageOpps.map(opp => (
                        <OpportunityCard key={opp.id} opp={opp} onDragStart={handleDragStart} onSendCatalog={setCatalogoOpp} onDeleted={refetch} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        /* List view — rich rows with quick actions */
        <div className="space-y-2">
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {showLost ? (
                <>
                  <p className="text-sm">Nenhum lead perdido encontrado nesse período/motivo.</p>
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">Limpar filtros</Button>
                </>
              ) : opportunities.filter(o => o.status === "open").length === 0 ? (
                <>
                  <p>Nenhuma oportunidade aberta</p>
                  <Link to="/oportunidades/nova" className="text-primary text-sm hover:underline">Criar primeira oportunidade</Link>
                </>
              ) : (
                <>
                  <p className="text-sm">Nenhuma oportunidade encontrada com os filtros atuais</p>
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">Limpar filtros</Button>
                </>
              )}
            </div>
          ) : (
            filteredOpportunities.map(opp => {
              const stage = stageById.get(opp.stage_id);
              const hasNoAction = !opp.next_action_at;
              const isOverdue = opp.next_action_at && new Date(opp.next_action_at) < new Date();
              const nextActionLabel = opp.next_action_at
                ? format(new Date(opp.next_action_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                : null;
              return (
                <Card
                  key={opp.id}
                  className={cn(
                    "hover:shadow-md transition-shadow",
                    hasNoAction && "border-destructive/40",
                    isOverdue && !hasNoAction && "border-orange-400/50"
                  )}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/oportunidades/${opp.id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{opp.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{opp.clientes?.nome_loja ?? "—"}</p>
                          </div>
                          <span className="text-sm font-bold text-foreground shrink-0">
                            R$ {Number(opp.estimated_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {lastStage && opp.stage_id === lastStage.id && (
                            <Badge className="text-[10px] h-5 gap-1 bg-green-600 hover:bg-green-600 text-white border-0">
                              <UserCheck className="h-3 w-3" /> Cliente
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 gap-1 border-2 font-semibold"
                            style={{ borderColor: stage?.color, color: stage?.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                            {stage?.name ?? "—"}
                          </Badge>
                          <Badge variant="secondary" className={cn("text-[10px] h-5", tempColors[opp.temperature])}>
                            {opp.temperature}
                          </Badge>
                          {hasNoAction ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" /> Sem próxima ação
                            </span>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[11px]",
                              isOverdue ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"
                            )}>
                              <Clock className="h-3 w-3" />
                              {isOverdue ? "Atrasado: " : "Próximo: "}{nextActionLabel}
                              {opp.next_action_description && (
                                <span className="hidden sm:inline text-muted-foreground/70">— {opp.next_action_description}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 shrink-0 sm:border-l sm:pl-3 sm:ml-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-[11px]" title="Mover etapa">
                              <MoveRight className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Mover</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                            <DropdownMenuLabel>Mover para etapa</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {stages.map(s => (
                              <DropdownMenuItem
                                key={s.id}
                                disabled={s.id === opp.stage_id}
                                onClick={() => moveOppToStage(opp, s.id)}
                                className="gap-2"
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="flex-1">{s.name}</span>
                                {s.id === opp.stage_id && <span className="text-[10px] text-muted-foreground">atual</span>}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-[11px] border-secondary/40 text-secondary hover:bg-secondary/10 hover:text-secondary"
                          onClick={() => setCatalogoOpp(opp)}
                          title="Enviar catálogos"
                        >
                          <Send className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Catálogo</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-[11px] text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                          onClick={() => setWaOpp(opp)}
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-[11px]"
                          onClick={() => openFollowupDialog(opp)}
                          title="Agendar follow-up"
                        >
                          <CalendarPlus className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Follow-up</span>
                        </Button>

                        {lastStage && opp.stage_id !== lastStage.id && (
                          <Button
                            size="sm"
                            className="h-9 text-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            onClick={() => setConvertOpp(opp)}
                            title="Converter em cliente"
                          >
                            <UserCheck className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Converter</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {catalogoOpp && (
        <EnviarCatalogosDialog
          open={!!catalogoOpp}
          onOpenChange={(v) => !v && setCatalogoOpp(null)}
          clienteId={catalogoOpp.company_id}
          clienteNome={catalogoOpp.clientes?.nome_loja ?? ""}
          clienteTelefone={catalogoOpp.clientes?.telefone}
          clienteCelular={catalogoOpp.clientes?.celular}
          opportunityId={catalogoOpp.id}
        />
      )}

      {waOpp && (
        <WhatsAppSendDialog
          open={!!waOpp}
          onOpenChange={(v) => !v && setWaOpp(null)}
          clienteId={waOpp.company_id}
          clienteNome={waOpp.clientes?.nome_loja ?? ""}
          clienteTelefone={waOpp.clientes?.telefone}
          clienteCelular={waOpp.clientes?.celular}
          opportunityId={waOpp.id}
          defaultTemplateKey="followup_pipeline"
          templateKeys={["followup_pipeline", "followup_quente", "saudacao_inicial"]}
          extraVars={{
            etapa_funil: stages.find(s => s.id === waOpp.stage_id)?.name ?? "",
          }}
        />
      )}

      {/* Quick follow-up dialog */}
      <Dialog open={!!followupOpp} onOpenChange={(v) => !v && setFollowupOpp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar follow-up</DialogTitle>
          </DialogHeader>
          {followupOpp && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {followupOpp.title} · {followupOpp.clientes?.nome_loja ?? "—"}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fu-subject">Assunto *</Label>
                <Input id="fu-subject" value={fuForm.subject} onChange={(e) => setFuForm({ ...fuForm, subject: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="fu-date">Data *</Label>
                  <Input id="fu-date" type="date" value={fuForm.due_date} onChange={(e) => setFuForm({ ...fuForm, due_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fu-time">Hora</Label>
                  <Input id="fu-time" type="time" value={fuForm.due_time} onChange={(e) => setFuForm({ ...fuForm, due_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fu-notes">Notas</Label>
                <Textarea id="fu-notes" rows={2} value={fuForm.notes} onChange={(e) => setFuForm({ ...fuForm, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFollowupOpp(null)}>Cancelar</Button>
            <Button onClick={submitFollowup}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to client confirmation */}
      <AlertDialog open={!!convertOpp} onOpenChange={(v) => !v && !converting && setConvertOpp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-secondary" /> Converter em cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {convertOpp && (
                <>
                  A oportunidade <strong>{convertOpp.title}</strong> ({convertOpp.clientes?.nome_loja ?? "—"}) será movida para a etapa final <strong>{lastStage?.name ?? ""}</strong> e marcada como ganha. A conversão será registrada no histórico.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvert}
              disabled={converting}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {converting ? "Convertendo..." : "Sim, converter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
