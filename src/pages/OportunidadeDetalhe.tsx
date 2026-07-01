import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Calendar, AlertTriangle, Building2, User as UserIcon, Thermometer, Target, Clock, Send, UserCheck, BookOpen, CheckCircle2, Package, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EnviarCatalogosDialog } from "@/components/EnviarCatalogosDialog";
import { PlaybookPanel } from "@/components/PlaybookPanel";
import { BantPanel } from "@/components/BantPanel";
import { DeleteOpportunityButton } from "@/components/DeleteOpportunityButton";
import { CancelLeadButton } from "@/components/CancelLeadButton";
import { AmostrasPanel } from "@/components/AmostrasPanel";
import { useAmostras } from "@/hooks/useAmostras";

const tempColors: Record<string, string> = {
  quente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  morno: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  frio: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export default function OportunidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stages } = usePipelineStages();
  const [opp, setOpp] = useState<any>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const { amostras } = useAmostras(id ? { opportunityId: id } : {});

  const reloadOpp = () => {
    if (!id) return;
    supabase.from("opportunities").select("*, clientes(nome_loja, cidade, telefone, celular, email)").eq("id", id).maybeSingle()
      .then(({ data }) => { if (data) setOpp(data); });
    supabase.from("timeline_events").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setTimeline((data as TimelineEvent[]) ?? []));
  };

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from("opportunities").select("*, clientes(nome_loja, cidade, telefone, celular, email)").eq("id", id).maybeSingle(),
      supabase.from("opportunity_brands").select("brand_id, brands(name)").eq("opportunity_id", id),
      supabase.from("timeline_events").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(20),
    ]).then(([oppRes, brandsRes, timelineRes]) => {
      setOpp(oppRes.data);
      setBrands((brandsRes.data ?? []).map((b: any) => b.brands?.name ?? ""));
      setTimeline((timelineRes.data as TimelineEvent[]) ?? []);
      setLoading(false);
    });
  }, [id, user?.id]);

  if (loading) return <div className="space-y-4 max-w-3xl mx-auto"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!opp) return <p className="text-center py-12 text-muted-foreground">Oportunidade não encontrada</p>;

  const stage = stages.find(s => s.id === opp.stage_id);
  const hasNoAction = !opp.next_action_at && opp.status === "open";
  const isOverdue = opp.next_action_at && new Date(opp.next_action_at) < new Date() && opp.status === "open";

  const eventTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      created: "Criação", stage_change: "Mudança de etapa", note: "Nota",
      contact: "Contato", visit: "Visita", proposal: "Proposta", converted: "Convertido em cliente",
      lost: "Lead cancelado", sample_sent: "Amostra enviada",
    };
    return map[t] ?? t;
  };

  const isWon = opp.status === "won";
  const lastStage = stages.length > 0 ? stages[stages.length - 1] : null;

  const handleConvert = async () => {
    if (!user || !opp?.company_id) return;
    setConverting(true);
    try {
      // (a) Cria pedido rascunho
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: opp.company_id,
          cliente_nome: opp.clientes?.nome_loja ?? null,
          representante_id: user.id,
          vendedor_id: user.id,
          status: "Rascunho",
          origem: "CRM",
          tipo: "Pedido",
        })
        .select("id")
        .single();
      if (pedidoError || !pedido) throw pedidoError ?? new Error("Falha ao criar pedido");

      // (b) Move oportunidade para última etapa + status won
      if (lastStage) {
        await supabase
          .from("opportunities")
          .update({
            stage_id: lastStage.id,
            probability: lastStage.default_probability,
            status: "won",
          })
          .eq("id", opp.id);
      }

      // (c) Timeline
      await supabase.from("timeline_events").insert({
        opportunity_id: opp.id,
        company_id: opp.company_id,
        user_id: user.id,
        event_type: "converted",
        description: `Lead convertido em cliente. Pedido rascunho criado.`,
      });

      toast.success("Lead convertido! Abrindo novo pedido...");
      // (d) Redireciona para o pedido
      navigate(`/pedidos/${pedido.id}/edit`);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao converter em cliente.");
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-primary">{opp.title}</h1>
              {opp.status === "lost" && (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  <XCircle className="h-3 w-3 mr-1" /> Lead cancelado
                </Badge>
              )}
              {amostras.length > 0 && (
                <Badge variant="outline" className="border-secondary/40 text-secondary">
                  <Package className="h-3 w-3 mr-1" /> {amostras.length} amostra{amostras.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{opp.clientes?.nome_loja ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {opp.company_id && !isWon && opp.status !== "lost" && (
            <Button
              size="sm"
              onClick={() => setConvertOpen(true)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm"
            >
              <UserCheck className="h-4 w-4 mr-1" /> Converter em Cliente
            </Button>
          )}
          {opp.status !== "lost" && !isWon && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCatalogosOpen(true)}
              className="border-secondary/40 text-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              <Send className="h-4 w-4 mr-1" /> Enviar Catálogos
            </Button>
          )}
          {!isWon && (
            <CancelLeadButton
              opportunityId={opp.id}
              companyId={opp.company_id}
              status={opp.status}
              onChanged={reloadOpp}
            />
          )}
          <Link to={`/oportunidades/${id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" /> Editar</Button>
          </Link>
          <DeleteOpportunityButton
            opportunityId={opp.id}
            ownerId={opp.owner_id}
            title={opp.title}
            variant="button"
            onDeleted={() => navigate("/pipeline")}
          />
        </div>
      </div>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-secondary" /> Converter lead em cliente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Você está prestes a converter <strong>{opp.clientes?.nome_loja}</strong> em cliente ativo.
              </span>
              <span className="block">Ao confirmar, o sistema irá:</span>
              <span className="block pl-4 text-sm">
                • Criar um pedido em rascunho<br />
                • Mover a oportunidade para <strong>{lastStage?.name ?? "última etapa"}</strong> (Ganha)<br />
                • Registrar a conversão no histórico<br />
                • Abrir o novo pedido para você preencher
              </span>
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

      <EnviarCatalogosDialog
        open={catalogosOpen}
        onOpenChange={setCatalogosOpen}
        clienteId={opp.company_id}
        clienteNome={opp.clientes?.nome_loja ?? ""}
        clienteTelefone={opp.clientes?.telefone}
        clienteCelular={opp.clientes?.celular}
        opportunityId={opp.id}
      />

      {/* Alerts */}
      {hasNoAction && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Esta oportunidade não tem próxima ação definida. Defina um follow-up!
        </div>
      )}
      {isOverdue && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-300/50 rounded-lg text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          A próxima ação está atrasada: {new Date(opp.next_action_at).toLocaleString("pt-BR")}
        </div>
      )}

      <Tabs defaultValue="playbook" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="playbook" className="gap-1.5"><BookOpen className="h-4 w-4" /> Playbook</TabsTrigger>
          <TabsTrigger value="bant" className="gap-1.5"><CheckCircle2 className="h-4 w-4" /> BANT</TabsTrigger>
          <TabsTrigger value="amostras" className="gap-1.5">
            <Package className="h-4 w-4" /> Amostras
            {amostras.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{amostras.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="bant" className="mt-4">
          <BantPanel opportunityId={opp.id} />
        </TabsContent>

        <TabsContent value="amostras" className="mt-4">
          <AmostrasPanel
            opportunityId={opp.id}
            clienteId={opp.company_id}
            clienteNome={opp.clientes?.nome_loja ?? ""}
          />
        </TabsContent>

        <TabsContent value="playbook" className="mt-4">
          {opp.stage_id && (
            <PlaybookPanel
              opportunityId={opp.id}
              stageId={opp.stage_id}
              companyId={opp.company_id}
              ownerId={opp.owner_id}
              clientId={opp.client_id}
              clienteNome={opp.clientes?.nome_loja ?? ""}
              clienteTelefone={opp.clientes?.telefone}
              clienteCelular={opp.clientes?.celular}
              onStageChanged={() => {
                // recarrega dados da oportunidade
                supabase.from("opportunities").select("*, clientes(nome_loja, cidade, telefone, celular, email)").eq("id", opp.id).maybeSingle()
                  .then(({ data }) => { if (data) setOpp(data); });
                supabase.from("timeline_events").select("*").eq("opportunity_id", opp.id).order("created_at", { ascending: false }).limit(20)
                  .then(({ data }) => { setTimeline((data as TimelineEvent[]) ?? []); });
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="detalhes" className="mt-4 space-y-4">
          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage?.color }} />
                  <span className="text-sm font-semibold">{stage?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>R$ {Number(opp.estimated_value ?? 0).toLocaleString("pt-BR")} · {opp.probability}% chance</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary" className={cn("text-xs", tempColors[opp.temperature])}>{opp.temperature}</Badge>
                </div>
                {opp.expected_close_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Prev: {new Date(opp.expected_close_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{opp.clientes?.nome_loja} {opp.clientes?.cidade ? `· ${opp.clientes.cidade}` : ""}</span>
                </div>
                {opp.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> {opp.contact_name}
                  </div>
                )}
                {opp.next_action_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(opp.next_action_at).toLocaleString("pt-BR")}</p>
                      {opp.next_action_description && <p className="text-xs text-muted-foreground">{opp.next_action_description}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {brands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brands.map((b, i) => (
                <Badge key={i} variant="outline" className="text-xs">{b}</Badge>
              ))}
            </div>
          )}

          {(opp.regime_tributario || opp.marcas_concorrentes) && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Perfil fiscal & concorrência</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {opp.regime_tributario && (
                  <div>
                    <span className="text-xs text-muted-foreground">Regime tributário</span>
                    <p className="font-medium">{opp.regime_tributario}</p>
                  </div>
                )}
                {opp.marcas_concorrentes && (
                  <div>
                    <span className="text-xs text-muted-foreground">Outras marcas que trabalha</span>
                    <p className="whitespace-pre-wrap">{opp.marcas_concorrentes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {opp.notes && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{opp.notes}</p></CardContent>
            </Card>
          )}

          {opp.loss_reason && (
            <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-destructive">Motivo da perda</p>
                <p className="text-sm text-muted-foreground mt-1">{opp.loss_reason}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map(ev => (
                    <div key={ev.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5">{eventTypeLabel(ev.event_type)}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
