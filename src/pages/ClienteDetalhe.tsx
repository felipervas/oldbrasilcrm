import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInteractions } from "@/hooks/useInteractions";
import { useFollowups } from "@/hooks/useFollowups";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useVisitas } from "@/hooks/useVisitas";
import { AmostrasPanel } from "@/components/AmostrasPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Phone, MessageCircle, Edit, Save,
  Plus, CheckCircle2, Clock, AlertTriangle, PhoneCall, Video,
  Mail as MailIcon, Calendar, MapPin, Briefcase, Send,
  ShoppingCart, Sparkles, FileText, Copy, Printer, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EnviarCatalogosDialog } from "@/components/EnviarCatalogosDialog";
import { SugestoesRecompraCard } from "@/components/SugestoesRecompraCard";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";
import { differenceInDays, format } from "date-fns";

const interactionTypeLabels: Record<string, string> = {
  visita: "Visita", ligacao: "Ligação", whatsapp: "WhatsApp",
  whatsapp_enviado: "WhatsApp", email: "E-mail",
  visita_check_in: "Check-in", visita_finalizada: "Visita finalizada",
  outro: "Outro",
};
const interactionTypeIcons: Record<string, typeof Phone> = {
  visita: Video, ligacao: PhoneCall, whatsapp: MessageCircle,
  whatsapp_enviado: MessageCircle, email: MailIcon,
  visita_check_in: MapPin, visita_finalizada: MapPin,
  outro: Clock,
};
const followupTypeLabels: Record<string, string> = {
  visita: "Visita", ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", outro: "Outro",
};

const STATUS_COLORS: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Enviado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Confirmado: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

interface PedidoRow {
  id: string;
  numero: string | null;
  identificador: string | null;
  created_at: string;
  status: string;
  valor_total: number;
  qtd_itens: number | null;
  forma_pagamento: string | null;
  desconto_geral_pct: number;
}

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { interactions, loading: loadingInt, fetch: fetchInt, create: createInt } = useInteractions(id);
  const { followups, loading: loadingFu, fetch: fetchFu, create: createFu, complete: completeFu } = useFollowups(id);
  const { opportunities } = useOpportunities();
  const { stages } = usePipelineStages();
  const { visitas, loading: loadingVisitas } = useVisitas();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  // Pedidos (histórico)
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [pedidoDescontos, setPedidoDescontos] = useState<Record<string, number>>({});
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Modals
  const [intModalOpen, setIntModalOpen] = useState(false);
  const [fuModalOpen, setFuModalOpen] = useState(false);
  const [visitaModalOpen, setVisitaModalOpen] = useState(false);
  const [negocioModalOpen, setNegocioModalOpen] = useState(false);
  const [intForm, setIntForm] = useState({ type: "ligacao", subject: "", description: "", interaction_date: new Date().toISOString().slice(0, 16) });
  const [fuForm, setFuForm] = useState({ type: "visita", subject: "", notes: "", due_date: "", due_time: "" });
  const [visitaForm, setVisitaForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), observation: "" });
  const [negocioForm, setNegocioForm] = useState({ title: "", value: "", expected_close_date: "", notes: "" });
  const [promptNextFu, setPromptNextFu] = useState(false);
  const [catalogosOpen, setCatalogosOpen] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    setLoading(true);
    supabase.from("clientes").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!active) return;
      setClient(data);
      setForm(data ?? {});
      setLoading(false);
    });
    fetchInt();
    fetchFu();
    return () => { active = false; };
  }, [id, user?.id]);

  // Carrega pedidos do cliente + cálculo de desconto médio
  useEffect(() => {
    if (!id) return;
    setLoadingPedidos(true);
    (async () => {
      const { data: peds } = await supabase
        .from("pedidos")
        .select("id, numero, identificador, created_at, status, valor_total, qtd_itens, forma_pagamento, desconto_geral_pct")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (peds ?? []) as PedidoRow[];
      setPedidos(list);

      // Buscar itens para calcular desconto médio
      if (list.length > 0) {
        const ids = list.map(p => p.id);
        const { data: itens } = await supabase
          .from("itens_pedido")
          .select("pedido_id, desconto_pct")
          .in("pedido_id", ids);
        const map: Record<string, { sum: number; count: number }> = {};
        (itens ?? []).forEach(it => {
          if (!map[it.pedido_id]) map[it.pedido_id] = { sum: 0, count: 0 };
          map[it.pedido_id].sum += Number(it.desconto_pct) || 0;
          map[it.pedido_id].count += 1;
        });
        const desc: Record<string, number> = {};
        Object.entries(map).forEach(([pid, v]) => {
          const itensAvg = v.count > 0 ? v.sum / v.count : 0;
          const geral = list.find(p => p.id === pid)?.desconto_geral_pct ?? 0;
          desc[pid] = Math.max(itensAvg, Number(geral) || 0);
        });
        setPedidoDescontos(desc);
      }
      setLoadingPedidos(false);
    })();
  }, [id]);

  const clientOpps = useMemo(
    () => opportunities.filter(o => o.company_id === id),
    [opportunities, id]
  );
  const clientVisitas = useMemo(
    () => visitas.filter((v: any) => v.cliente_id === id),
    [visitas, id]
  );

  // Last contact info
  const lastInteraction = interactions.length > 0 ? interactions[0] : null;
  const daysSinceContact = lastInteraction
    ? differenceInDays(new Date(), new Date(lastInteraction.interaction_date))
    : null;

  // Métricas resumo
  const ticketMedio = useMemo(() => {
    const confirmados = pedidos.filter(p => p.status === "Confirmado" || p.status === "Enviado");
    if (confirmados.length === 0) return 0;
    const total = confirmados.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);
    return total / confirmados.length;
  }, [pedidos]);

  const ultimaCompra = useMemo(
    () => pedidos.find(p => p.status === "Confirmado" || p.status === "Enviado"),
    [pedidos]
  );

  const handleSave = async () => {
    const { error } = await supabase.from("clientes").update(form).eq("id", id);
    if (error) { toast.error("Erro ao salvar."); return; }
    setClient(form);
    setEditing(false);
    toast.success("Cliente atualizado!");
  };

  const handleCreateInteraction = async () => {
    if (!intForm.subject.trim()) { toast.error("Assunto é obrigatório."); return; }
    const { error } = await createInt({
      client_id: id!,
      opportunity_id: null,
      type: intForm.type,
      subject: intForm.subject,
      description: intForm.description || null,
      interaction_date: intForm.interaction_date,
      photo_url: null,
    });
    if (error) { toast.error("Erro ao registrar interação."); return; }
    toast.success("Interação registrada!");
    setIntModalOpen(false);
    setIntForm({ type: "ligacao", subject: "", description: "", interaction_date: new Date().toISOString().slice(0, 16) });
  };

  const handleQuickVisita = async () => {
    const { error } = await createInt({
      client_id: id!,
      opportunity_id: null,
      type: "visita",
      subject: "Visita ao cliente",
      description: visitaForm.observation || null,
      interaction_date: visitaForm.date + "T12:00:00",
      photo_url: null,
    });
    if (error) { toast.error("Erro ao registrar visita."); return; }
    toast.success("Visita registrada!");
    setVisitaModalOpen(false);
    setVisitaForm({ date: format(new Date(), "yyyy-MM-dd"), observation: "" });
  };

  const handleCreateFollowup = async () => {
    if (!fuForm.subject.trim() || !fuForm.due_date) { toast.error("Assunto e data são obrigatórios."); return; }
    const { error } = await createFu({
      client_id: id!,
      due_date: fuForm.due_date,
      due_time: fuForm.due_time || null,
      type: fuForm.type,
      subject: fuForm.subject,
      notes: fuForm.notes || null,
    });
    if (error) { toast.error("Erro ao agendar."); return; }
    toast.success("Follow-up agendado!");
    setFuModalOpen(false);
    setPromptNextFu(false);
    setFuForm({ type: "visita", subject: "", notes: "", due_date: "", due_time: "" });
  };

  const handleCreateNegocio = async () => {
    if (!negocioForm.title.trim()) { toast.error("Título é obrigatório."); return; }
    const value = parseFloat(negocioForm.value) || 0;
    const firstStage = stages.sort((a, b) => a.sort_order - b.sort_order)[0];
    if (!firstStage) { toast.error("Nenhum estágio de pipeline configurado."); return; }

    const { error } = await supabase.from("opportunities").insert({
      title: negocioForm.title.trim(),
      company_id: id!,
      owner_id: user!.id,
      stage_id: firstStage.id,
      estimated_value: value,
      expected_close_date: negocioForm.expected_close_date || null,
      notes: negocioForm.notes || null,
      status: "open",
      temperature: "morno",
      probability: firstStage.default_probability,
    });
    if (error) { toast.error("Erro ao criar negócio."); return; }
    toast.success("Negócio criado no pipeline!");
    setNegocioModalOpen(false);
    setNegocioForm({ title: "", value: "", expected_close_date: "", notes: "" });
  };

  const handleComplete = async (fuId: string) => {
    const { error } = await completeFu(fuId);
    if (error) { toast.error("Erro."); return; }
    toast.success("Follow-up concluído!");
    setPromptNextFu(true);
  };

  const handleDuplicarPedido = async (pedidoId: string) => {
    if (!user) return;
    const { data: orig } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!orig) { toast.error("Pedido original não encontrado."); return; }

    const { data: itens } = await supabase
      .from("itens_pedido")
      .select("*")
      .eq("pedido_id", pedidoId);

    const { data: novo, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: orig.cliente_id,
        cliente_nome: orig.cliente_nome,
        representante_id: user.id,
        vendedor_id: orig.vendedor_id,
        status: "Rascunho",
        subtotal: orig.subtotal,
        desconto: orig.desconto,
        desconto_geral_pct: orig.desconto_geral_pct,
        desconto_geral_valor: orig.desconto_geral_valor,
        frete_valor: orig.frete_valor,
        valor_total: orig.valor_total,
        forma_pagamento: orig.forma_pagamento,
        prazo_pagamento: orig.prazo_pagamento,
        observacoes: orig.observacoes,
        origem: "Duplicado",
      })
      .select("id")
      .maybeSingle();
    if (error || !novo) { toast.error("Erro ao duplicar pedido."); return; }

    if (itens && itens.length > 0) {
      const { error: itensErr } = await supabase.from("itens_pedido").insert(
        itens.map(it => ({
          pedido_id: novo.id,
          produto_id: it.produto_id,
          produto_nome: it.produto_nome,
          produto_marca: it.produto_marca,
          quantidade: it.quantidade,
          preco_tabela: it.preco_tabela,
          preco_unitario: it.preco_unitario,
          preco_praticado: it.preco_praticado,
          desconto_pct: it.desconto_pct,
          subtotal: it.subtotal,
          unidade_medida: it.unidade_medida,
          referencia: it.referencia,
        }))
      );
      if (itensErr) {
        await supabase.from("pedidos").delete().eq("id", novo.id); // desfaz para não deixar duplicado vazio
        toast.error("Não foi possível duplicar os itens. Tente de novo.");
        return;
      }
    }
    toast.success("Pedido duplicado como Rascunho!");
    navigate(`/pedidos/${novo.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (!client) return <p className="text-center py-12 text-muted-foreground">Cliente não encontrado</p>;

  const today = new Date().toISOString().split("T")[0];
  const enderecoCompleto = useMemo(
    () => [
      client.endereco || client.logradouro,
      client.numero,
      client.bairro,
      client.cidade,
      client.estado,
      client.cep,
    ].filter(Boolean).join(", "),
    [client]
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">{client.nome_loja}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {client.cidade}{client.estado ? `, ${client.estado}` : ""}
            {client.segmento ? ` • ${client.segmento}` : ""}
          </p>
        </div>
      </div>

      {/* Big Action Buttons (sticky) */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            onClick={() => client.telefone || client.celular
              ? (window.location.href = `tel:${client.celular || client.telefone}`)
              : toast.error("Sem telefone cadastrado.")}
            className="h-auto min-h-[52px] py-3 flex flex-col gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Phone className="h-5 w-5" />
            <span className="text-xs font-semibold">Ligar</span>
          </Button>
          <WhatsAppActionButton
            phone={client.celular || client.telefone}
            message={`Olá ${client?.nome_contato || client?.nome_loja || ""}, tudo bem?`}
            className="h-auto min-h-[52px] py-3 flex flex-col gap-1"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs font-semibold">WhatsApp</span>
          </WhatsAppActionButton>
          <Button
            onClick={() => navigate(`/pedidos/novo?cliente=${client.id}`)}
            className="h-auto min-h-[52px] py-3 flex flex-col gap-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-semibold">Novo Pedido</span>
          </Button>
          <Button
            onClick={() => setFuModalOpen(true)}
            className="h-auto min-h-[52px] py-3 flex flex-col gap-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs font-semibold">Agendar Visita</span>
          </Button>
        </div>
      </div>

      <EnviarCatalogosDialog
        open={catalogosOpen}
        onOpenChange={setCatalogosOpen}
        clienteId={client.id}
        clienteNome={client.nome_loja}
        clienteTelefone={client.telefone}
        clienteCelular={client.celular}
      />


      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center gap-1 h-auto p-1">
          <TabsTrigger value="resumo" className="text-xs sm:text-sm whitespace-nowrap">Resumo</TabsTrigger>
          <TabsTrigger value="pedidos" className="text-xs sm:text-sm whitespace-nowrap">Pedidos</TabsTrigger>
          <TabsTrigger value="visitas" className="text-xs sm:text-sm whitespace-nowrap">Visitas</TabsTrigger>
          <TabsTrigger value="interacoes" className="text-xs sm:text-sm whitespace-nowrap">Interações</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm whitespace-nowrap">Pipeline</TabsTrigger>
          <TabsTrigger value="recompra" className="text-xs sm:text-sm whitespace-nowrap">Recompra</TabsTrigger>
          <TabsTrigger value="amostras" className="text-xs sm:text-sm whitespace-nowrap">Amostras</TabsTrigger>
        </TabsList>

        {/* TAB RESUMO */}
        <TabsContent value="resumo" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Total pedidos</p>
                <p className="text-xl font-bold text-primary">{pedidos.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Ticket médio</p>
                <p className="text-xl font-bold text-secondary">
                  R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Última compra</p>
                <p className="text-sm font-bold text-foreground">
                  {ultimaCompra
                    ? new Date(ultimaCompra.created_at).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Status</p>
                <Badge
                  variant={client.status === "ativo" ? "default" : "secondary"}
                  className="mt-1"
                >
                  {client.status === "ativo" ? "Ativo" : client.status === "inativo" ? "Inativo" : (client.status || "—")}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Último Contato */}
          <Card className={cn(
            "border-0 shadow-sm",
            daysSinceContact !== null && daysSinceContact >= 30
              ? "border-l-4 border-l-destructive"
              : daysSinceContact !== null && daysSinceContact >= 14
                ? "border-l-4 border-l-amber-500"
                : "border-l-4 border-l-green-500"
          )}>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Último Contato</p>
                {lastInteraction ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(lastInteraction.interaction_date).toLocaleDateString("pt-BR")}
                    </p>
                    <Badge variant={daysSinceContact! >= 30 ? "destructive" : daysSinceContact! >= 14 ? "secondary" : "default"} className="text-[10px]">
                      {daysSinceContact === 0 ? "Hoje" : `${daysSinceContact}d atrás`}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{interactionTypeLabels[lastInteraction.type] || lastInteraction.type}</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-destructive font-medium mt-1">Nenhum contato registrado</p>
                )}
              </div>
              {(daysSinceContact === null || daysSinceContact >= 14) && (
                <Button size="sm" variant="outline" onClick={() => setIntModalOpen(true)} className="text-xs shrink-0">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Registrar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Endereço */}
          {enderecoCompleto && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Endereço</p>
                  <p className="text-sm font-medium break-words">{enderecoCompleto}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoCompleto)}`, "_blank")}
                >
                  Rota
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {client.tags && (
            <div className="flex flex-wrap gap-1">
              {client.tags.split(",").map((t: string, i: number) => t.trim() && (
                <Badge key={i} variant="outline" className="text-[10px]">{t.trim()}</Badge>
              ))}
            </div>
          )}

          {/* Dados cadastrais */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Dados cadastrais</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
              ) : (
                <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "nome_loja", label: "Razão Social" },
                { key: "nome_fantasia", label: "Nome Fantasia" },
                { key: "cnpj", label: "CNPJ" },
                { key: "inscricao_estadual", label: "Inscrição Estadual" },
                { key: "nome_contato", label: "Contato" },
                { key: "pessoa_compras", label: "Pessoa de Compras" },
                { key: "telefone", label: "Telefone" },
                { key: "celular", label: "Celular/WhatsApp" },
                { key: "email", label: "E-mail" },
                { key: "instagram", label: "Instagram" },
                { key: "endereco", label: "Endereço" },
                { key: "bairro", label: "Bairro" },
                { key: "cidade", label: "Cidade" },
                { key: "estado", label: "Estado" },
                { key: "cep", label: "CEP" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {editing ? (
                    <Input value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <p className="text-sm font-medium break-words">{client[f.key] || "—"}</p>
                  )}
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Regime tributário</Label>
                {editing ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.regime_tributario ?? ""}
                    onChange={e => setForm({ ...form, regime_tributario: e.target.value })}
                  >
                    <option value="">Não informado</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                    <option value="MEI">MEI</option>
                    <option value="Isento/Não contribuinte">Isento/Não contribuinte</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium break-words">{client.regime_tributario || "—"}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Outras marcas que trabalha</Label>
                {editing ? (
                  <Textarea
                    rows={2}
                    value={form.marcas_concorrentes ?? ""}
                    onChange={e => setForm({ ...form, marcas_concorrentes: e.target.value })}
                    placeholder="Ex: Nestlé, Frooty..."
                  />
                ) : (
                  <p className="text-sm break-words whitespace-pre-wrap">{client.marcas_concorrentes || "—"}</p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                {editing ? (
                  <Textarea value={form.observacoes ?? ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                ) : (
                  <p className="text-sm">{client.observacoes || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PEDIDOS */}
        <TabsContent value="pedidos" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Histórico de Pedidos ({pedidos.length})</h3>
            <Button size="sm" onClick={() => navigate(`/pedidos/novo?cliente=${client.id}`)}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>

          {loadingPedidos ? (
            <Skeleton className="h-32" />
          ) : pedidos.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhum pedido registrado.</p>
                <Button variant="link" size="sm" onClick={() => navigate(`/pedidos/novo?cliente=${client.id}`)}>
                  Criar primeiro pedido
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-2 sm:hidden">
                {pedidos.map(p => {
                  const desc = pedidoDescontos[p.id] ?? 0;
                  const alto = desc > 15;
                  return (
                    <Card key={p.id} className={cn("border-0 shadow-sm", alto && "ring-2 ring-amber-400")}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">#{p.numero || p.identificador || p.id.slice(0, 8)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString("pt-BR")} • {p.qtd_itens || 0} itens
                            </p>
                          </div>
                          <Badge className={cn("text-[10px]", STATUS_COLORS[p.status] || "")}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-base font-bold text-primary">
                              R$ {Number(p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            {desc > 0 && (
                              <Badge variant="outline" className={cn("text-[10px] w-fit", alto && "border-amber-500 text-amber-600")}>
                                Desc. {desc.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/pedidos/${p.id}`)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDuplicarPedido(p.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <Card className="border-0 shadow-sm hidden sm:block">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Pgto</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Desc. %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.map(p => {
                        const desc = pedidoDescontos[p.id] ?? 0;
                        const alto = desc > 15;
                        return (
                          <TableRow key={p.id} className={cn(alto && "bg-amber-50 dark:bg-amber-950/20")}>
                            <TableCell className="font-medium">#{p.numero || p.identificador || p.id.slice(0, 8)}</TableCell>
                            <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>{p.qtd_itens || 0}</TableCell>
                            <TableCell className="text-xs">{p.forma_pagamento || "—"}</TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {Number(p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {desc > 0 ? (
                                <Badge variant="outline" className={cn("text-[10px]", alto && "border-amber-500 text-amber-700 dark:text-amber-400")}>
                                  {desc.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-[10px]", STATUS_COLORS[p.status] || "")}>{p.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" title="Ver/Reimprimir" onClick={() => navigate(`/pedidos/${p.id}`)}>
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" title="Duplicar" onClick={() => handleDuplicarPedido(p.id)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB VISITAS */}
        <TabsContent value="visitas" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Visitas registradas ({clientVisitas.length})</h3>
            <Button size="sm" onClick={() => setVisitaModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registrar
            </Button>
          </div>
          {loadingVisitas ? (
            <Skeleton className="h-32" />
          ) : clientVisitas.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhuma visita registrada.</p>
                <Button variant="link" size="sm" onClick={() => setVisitaModalOpen(true)}>
                  Registrar primeira visita
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientVisitas.map((v: any) => (
                <Card key={v.id} className="border-0 shadow-sm border-l-4 border-l-secondary">
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          {new Date(v.check_in_at).toLocaleDateString("pt-BR")} às {new Date(v.check_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {v.status === "finalizada" ? "Finalizada" : "Em andamento"}
                        </Badge>
                        {v.resultado && v.resultado !== "em_andamento" && (
                          <Badge className="text-[10px]">{v.resultado}</Badge>
                        )}
                      </div>
                      {v.endereco_aprox && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">📍 {v.endereco_aprox}</p>
                      )}
                      {v.observacoes && (
                        <p className="text-xs mt-1 break-words">{v.observacoes}</p>
                      )}
                      {Number(v.valor_gerado) > 0 && (
                        <p className="text-xs font-semibold text-secondary mt-1">
                          💰 Gerou R$ {Number(v.valor_gerado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB INTERAÇÕES */}
        <TabsContent value="interacoes" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Histórico de Interações</h3>
            <Button size="sm" onClick={() => setIntModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
          </div>
          {loadingInt ? (
            <Skeleton className="h-32" />
          ) : interactions.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhuma interação registrada ainda.</p>
                <Button variant="link" size="sm" onClick={() => setIntModalOpen(true)}>Registrar primeira interação</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {interactions.map(i => {
                const Icon = interactionTypeIcons[i.type] || Clock;
                return (
                  <Card key={i.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{interactionTypeLabels[i.type] || i.type}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(i.interaction_date).toLocaleString("pt-BR")}</span>
                        </div>
                        {i.subject && <p className="text-sm font-medium mt-1 break-words">{i.subject}</p>}
                        {i.description && <p className="text-sm text-muted-foreground mt-0.5 break-words">{i.description}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Follow-ups embutidos para acesso rápido */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Follow-ups</h3>
              <Button size="sm" variant="outline" onClick={() => setFuModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Agendar
              </Button>
            </div>
            {loadingFu ? (
              <Skeleton className="h-20" />
            ) : followups.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum follow-up agendado.</p>
            ) : (
              <div className="space-y-2">
                {followups.map(f => {
                  const isOverdue = f.due_date < today && f.status === "pendente";
                  return (
                    <Card key={f.id} className={cn("border-0 shadow-sm", isOverdue && "border-l-4 border-l-destructive")}>
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={f.status === "concluido" ? "default" : isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                              {f.status === "concluido" ? "Concluído" : isOverdue ? "Vencido" : "Pendente"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{followupTypeLabels[f.type ?? ""] || f.type}</Badge>
                          </div>
                          <p className="text-sm font-medium mt-1 break-words">{f.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(f.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                            {f.due_time ? ` às ${f.due_time.slice(0, 5)}` : ""}
                          </p>
                        </div>
                        {f.status === "pendente" && (
                          <Button size="sm" variant="outline" onClick={() => handleComplete(f.id)} className="shrink-0">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB PIPELINE */}
        <TabsContent value="pipeline" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Oportunidades ({clientOpps.length})</h3>
            <Button size="sm" onClick={() => setNegocioModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Negócio
            </Button>
          </div>
          {clientOpps.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhum negócio vinculado a este cliente.</p>
                <Button variant="link" size="sm" onClick={() => setNegocioModalOpen(true)}>
                  Criar primeira oportunidade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientOpps.map(o => {
                const stage = stages.find(s => s.id === o.stage_id);
                const isQuente = o.temperature === "quente";
                return (
                  <Link key={o.id} to={`/oportunidades/${o.id}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{o.title}</p>
                            {isQuente && <span title="Oportunidade quente">🔥</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage?.color || "#6B7280" }} />
                            <span className="text-xs text-muted-foreground">{stage?.name || "—"}</span>
                            <Badge variant="outline" className="text-[10px]">{o.probability}%</Badge>
                          </div>
                          {o.next_action_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Próxima ação: {new Date(o.next_action_at).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-secondary">
                            R$ {Number(o.estimated_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </p>
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground inline" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB SUGESTÃO DE RECOMPRA */}
        <TabsContent value="recompra" className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold">Sugestão de Recompra</h3>
          </div>
          <SugestoesRecompraCard clienteId={id!} />
        </TabsContent>

        {/* TAB AMOSTRAS */}
        <TabsContent value="amostras" className="space-y-3">
          <AmostrasPanel
            clienteId={id!}
            clienteNome={client?.nome_loja ?? ""}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Interação */}
      <Dialog open={intModalOpen} onOpenChange={setIntModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Interação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={intForm.type} onValueChange={v => setIntForm({ ...intForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Input value={intForm.subject} onChange={e => setIntForm({ ...intForm, subject: e.target.value })} placeholder="Resumo da interação" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={intForm.description} onChange={e => setIntForm({ ...intForm, description: e.target.value })} placeholder="Detalhes..." />
            </div>
            <div className="space-y-1">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={intForm.interaction_date} onChange={e => setIntForm({ ...intForm, interaction_date: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleCreateInteraction}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Visita Rápida */}
      <Dialog open={visitaModalOpen} onOpenChange={setVisitaModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Visita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={visitaForm.date} onChange={e => setVisitaForm({ ...visitaForm, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={visitaForm.observation} onChange={e => setVisitaForm({ ...visitaForm, observation: e.target.value })} placeholder="Como foi a visita..." rows={4} />
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleQuickVisita}>
              <MapPin className="h-4 w-4 mr-1" /> Registrar Visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Follow-up */}
      <Dialog open={fuModalOpen || promptNextFu} onOpenChange={v => { setFuModalOpen(v); if (!v) setPromptNextFu(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promptNextFu ? "Agendar próximo follow-up?" : "Agendar Visita / Follow-up"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={fuForm.type} onValueChange={v => setFuForm({ ...fuForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(followupTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Input value={fuForm.subject} onChange={e => setFuForm({ ...fuForm, subject: e.target.value })} placeholder="Ex: Visita ou retornar ligação" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={fuForm.due_date} onChange={e => setFuForm({ ...fuForm, due_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={fuForm.due_time} onChange={e => setFuForm({ ...fuForm, due_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={fuForm.notes} onChange={e => setFuForm({ ...fuForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateFollowup}>Agendar</Button>
              {promptNextFu && <Button variant="outline" className="flex-1" onClick={() => setPromptNextFu(false)}>Não, obrigado</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Negócio */}
      <Dialog open={negocioModalOpen} onOpenChange={setNegocioModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Negócio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input value={negocioForm.title} onChange={e => setNegocioForm({ ...negocioForm, title: e.target.value })} placeholder="Ex: Fornecimento linha Unika" />
            </div>
            <div className="space-y-1">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" step="0.01" min="0" value={negocioForm.value} onChange={e => setNegocioForm({ ...negocioForm, value: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Data Prevista de Fechamento</Label>
              <Input type="date" value={negocioForm.expected_close_date} onChange={e => setNegocioForm({ ...negocioForm, expected_close_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={negocioForm.notes} onChange={e => setNegocioForm({ ...negocioForm, notes: e.target.value })} placeholder="Detalhes do negócio..." />
            </div>
            <Button className="w-full" onClick={handleCreateNegocio}>
              <Briefcase className="h-4 w-4 mr-1" /> Criar Negócio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
