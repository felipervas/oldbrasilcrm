import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, MessageSquare, CalendarPlus, FileText, CheckCircle2,
  XCircle, Clock, Users, Package, MapPin, Loader2, Phone
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fazerCheckOut } from "@/hooks/useVisitas";
import { EnviarCatalogosDialog } from "@/components/EnviarCatalogosDialog";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";

type Resultado = "vendeu" | "vai_pensar" | "sem_interesse" | "nao_encontrado";

interface ClienteResumo {
  id: string;
  nome_loja: string;
  nome_contato?: string | null;
  telefone?: string | null;
  celular?: string | null;
  observacoes?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
}

interface PedidoMini {
  id: string;
  numero: string | null;
  valor_total: number;
  status: string;
  created_at: string;
}

interface OpportunityMini {
  id: string;
  title: string;
  estimated_value: number;
  temperature: string;
  stage_id: string;
  stage_name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  visitaId: string | null;
  cliente: ClienteResumo | null;
  onPedidoRapido?: (clienteId: string) => void;
  onFinalizada?: () => void;
}

export function VisitaEmAndamentoSheet({
  open, onOpenChange, visitaId, cliente, onPedidoRapido, onFinalizada,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [pedidos, setPedidos] = useState<PedidoMini[]>([]);
  const [opportunity, setOpportunity] = useState<OpportunityMini | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);

  // Check-out
  const [resultado, setResultado] = useState<Resultado>("vai_pensar");
  const [obs, setObs] = useState("");
  const [valor, setValor] = useState("");
  const [finalizando, setFinalizando] = useState(false);

  // Observação rápida
  const [obsRapida, setObsRapida] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  // Agendar retorno
  const [agendaData, setAgendaData] = useState("");
  const [agendaAssunto, setAgendaAssunto] = useState("Retorno da visita");
  const [agendando, setAgendando] = useState(false);

  // Catálogo
  const [catalogoOpen, setCatalogoOpen] = useState(false);

  useEffect(() => {
    if (!open || !cliente) return;
    setTab("resumo");
    setResultado("vai_pensar");
    setObs("");
    setValor("");
    setObsRapida("");
    setAgendaData("");
    fetchResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente?.id]);

  const fetchResumo = async () => {
    if (!cliente) return;
    setLoadingResumo(true);
    const [pedRes, oppRes] = await Promise.all([
      supabase
        .from("pedidos")
        .select("id,numero,valor_total,status,created_at")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("opportunities")
        .select("id,title,estimated_value,temperature,stage_id,pipeline_stages!stage_id(name)")
        .eq("company_id", cliente.id)
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setPedidos((pedRes.data as any) ?? []);
    if (oppRes.data) {
      const ps = Array.isArray((oppRes.data as any).pipeline_stages)
        ? (oppRes.data as any).pipeline_stages[0]
        : (oppRes.data as any).pipeline_stages;
      setOpportunity({
        id: oppRes.data.id,
        title: oppRes.data.title,
        estimated_value: oppRes.data.estimated_value,
        temperature: oppRes.data.temperature,
        stage_id: oppRes.data.stage_id,
        stage_name: ps?.name,
      });
    } else {
      setOpportunity(null);
    }
    setLoadingResumo(false);
  };

  const handleObservacaoRapida = async () => {
    if (!user || !cliente || !obsRapida.trim()) return;
    setSavingObs(true);
    const { error } = await supabase.from("interactions").insert({
      client_id: cliente.id,
      created_by: user.id,
      type: "visita_observacao",
      subject: "Observação durante visita",
      description: obsRapida.trim(),
    });
    setSavingObs(false);
    if (error) {
      toast.error("Erro ao salvar observação.");
      return;
    }
    toast.success("Observação salva na timeline!");
    setObsRapida("");
  };

  const handleAgendarRetorno = async () => {
    if (!user || !cliente) return;
    if (!agendaData) {
      toast.error("Escolha uma data.");
      return;
    }
    setAgendando(true);
    const { error } = await supabase.from("followups").insert({
      assigned_to: user.id,
      client_id: cliente.id,
      subject: agendaAssunto || "Retorno da visita",
      due_date: agendaData,
      type: "visita",
      status: "pendente",
    });
    setAgendando(false);
    if (error) {
      toast.error("Erro ao agendar retorno.");
      return;
    }
    toast.success("Retorno agendado!");
    setAgendaData("");
  };

  const handlePedidoRapido = () => {
    if (!cliente) return;
    onOpenChange(false);
    onPedidoRapido?.(cliente.id);
  };

  const handleFinalizar = async () => {
    if (!user || !visitaId || !cliente) return;
    setFinalizando(true);
    const { error } = await fazerCheckOut({
      visitaId,
      clienteId: cliente.id,
      userId: user.id,
      resultado,
      observacoes: obs.trim() || undefined,
      valorGerado: valor ? parseFloat(valor.replace(",", ".")) || 0 : 0,
    });
    setFinalizando(false);
    if (error) {
      toast.error("Erro ao finalizar visita.");
      return;
    }
    toast.success("Visita finalizada!");
    onOpenChange(false);
    onFinalizada?.();
  };

  if (!cliente) return null;

  const enderecoCurto = [cliente.endereco, cliente.bairro, cliente.cidade]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="p-4 pb-3 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                Visita em andamento
              </span>
            </div>
            <SheetTitle className="text-primary text-left">{cliente.nome_loja}</SheetTitle>
            {enderecoCurto && (
              <p className="text-xs text-muted-foreground text-left flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {enderecoCurto}
              </p>
            )}
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="px-4 py-3">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="acoes">Ações</TabsTrigger>
              <TabsTrigger value="checkout">Check-out</TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="resumo" className="space-y-4 mt-4">
              {loadingResumo ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {opportunity && (
                    <div className="rounded-lg border p-3 bg-secondary/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Pipeline</span>
                        <Badge variant="outline" className="text-xs">{opportunity.stage_name}</Badge>
                      </div>
                      <p className="font-medium text-sm">{opportunity.title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{opportunity.temperature}</span>
                        <span className="text-sm font-semibold text-secondary">
                          R$ {Number(opportunity.estimated_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Package className="h-3 w-3" /> Últimos pedidos
                    </h4>
                    {pedidos.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum pedido registrado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pedidos.map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-sm bg-muted/50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium">#{p.numero ?? p.id.slice(0, 6)}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(p.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                R$ {Number(p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                              <Badge variant="outline" className="text-[10px] h-4">{p.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cliente.observacoes && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Observações do cliente</h4>
                      <p className="text-sm bg-muted/50 rounded px-3 py-2">{cliente.observacoes}</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                  >
                    <FileText className="h-4 w-4" /> Ver ficha completa
                  </Button>
                </>
              )}
            </TabsContent>

            {/* AÇÕES RÁPIDAS */}
            <TabsContent value="acoes" className="space-y-3 mt-4">
              <Button
                size="lg"
                className="w-full h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base"
                onClick={handlePedidoRapido}
              >
                <ShoppingCart className="h-5 w-5" /> Fazer Pedido
              </Button>

              <WhatsAppActionButton
                phone={cliente?.celular || cliente?.telefone}
                message={`Olá ${cliente?.nome_contato || cliente?.nome_loja}, passando aqui no estabelecimento agora.`}
                size="lg"
                variant="outline"
                className="w-full h-14 text-base"
              >
                <MessageSquare className="h-5 w-5" /> Enviar WhatsApp
              </WhatsAppActionButton>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base"
                onClick={() => setCatalogoOpen(true)}
              >
                <FileText className="h-5 w-5" /> Enviar Catálogo
              </Button>

              <Separator className="my-2" />

              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-xs font-medium">Registrar observação rápida</Label>
                <Textarea
                  value={obsRapida}
                  onChange={(e) => setObsRapida(e.target.value)}
                  placeholder="Ex: Cliente pediu para passar amanhã com amostra..."
                  rows={2}
                />
                <Button size="sm" className="w-full" disabled={!obsRapida.trim() || savingObs} onClick={handleObservacaoRapida}>
                  {savingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Salvar na timeline
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <CalendarPlus className="h-3 w-3" /> Agendar retorno
                </Label>
                <Input
                  value={agendaAssunto}
                  onChange={(e) => setAgendaAssunto(e.target.value)}
                  placeholder="Assunto"
                  className="h-9 text-sm"
                />
                <Input
                  type="date"
                  value={agendaData}
                  onChange={(e) => setAgendaData(e.target.value)}
                  className="h-9"
                />
                <Button size="sm" className="w-full" disabled={!agendaData || agendando} onClick={handleAgendarRetorno}>
                  {agendando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                  Agendar
                </Button>
              </div>
            </TabsContent>

            {/* CHECK-OUT */}
            <TabsContent value="checkout" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs font-medium mb-2 block">Resultado da visita</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "vendeu", label: "Vendeu", icon: CheckCircle2, color: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300" },
                    { v: "vai_pensar", label: "Vai pensar", icon: Clock, color: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
                    { v: "sem_interesse", label: "Sem interesse", icon: XCircle, color: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300" },
                    { v: "nao_encontrado", label: "Não encontrado", icon: Users, color: "border-muted-foreground/30 bg-muted text-muted-foreground" },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    const active = resultado === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setResultado(opt.v)}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition-all ${
                          active ? `${opt.color} ring-2 ring-offset-1 ring-secondary` : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {resultado === "vendeu" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor gerado (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                    placeholder="0,00"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Como foi a visita? Quais próximos passos?"
                  rows={4}
                />
              </div>

              <Button
                size="lg"
                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={finalizando}
                onClick={handleFinalizar}
              >
                {finalizando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Finalizar visita
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {cliente && (
        <EnviarCatalogosDialog
          open={catalogoOpen}
          onOpenChange={setCatalogoOpen}
          clienteId={cliente.id}
          clienteNome={cliente.nome_loja}
          clienteTelefone={cliente.telefone}
          clienteCelular={cliente.celular}
        />
      )}
    </>
  );
}
