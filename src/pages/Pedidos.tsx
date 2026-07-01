import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Search, ShoppingCart, X, MessageCircle, Edit, CalendarIcon, ChevronLeft, ChevronRight, FileEdit, Trash2, ArrowRight, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Pedido {
  id: string;
  numero: string | null;
  cliente_id: string;
  cliente_nome: string | null;
  valor_total: number;
  subtotal: number;
  desconto: number;
  qtd_itens: number;
  situacao: string | null;
  status: string | null;
  forma_pagamento: string | null;
  created_at: string;
  observacoes: string | null;
  nota_fiscal: string | null;
  tipo: string | null;
  origem: string | null;
  data_conclusao: string | null;
  clientes: { nome_loja: string; celular: string | null } | null;
}

interface PedidoItem {
  id: string;
  produto_nome: string | null;
  produto_marca: string | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  unidade_medida: string | null;
}

interface Cliente {
  id: string;
  nome_loja: string;
  celular: string | null;
}


const situacaoColors: Record<string, string> = {
  Rascunho: "bg-amber-100 text-amber-800 border-amber-200",
  Emitido: "bg-blue-100 text-blue-700 border-blue-200",
  "Em produção": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Enviado: "bg-orange-100 text-orange-700 border-orange-200",
  Concluído: "bg-green-100 text-green-700 border-green-200",
  Cancelado: "bg-red-100 text-red-700 border-red-200",
};

const situacoes = ["Emitido", "Em produção", "Enviado", "Concluído", "Cancelado"];
const PAGE_SIZE = 25;

export default function Pedidos() {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  // Drawer
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItems, setDrawerItems] = useState<PedidoItem[]>([]);

  // Autocomplete cliente (usado em filtros futuros — modal antigo removido)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch] = useState("");

  // Rascunhos (pedidos pendentes)
  interface Rascunho {
    id: string;
    cliente_nome: string | null;
    valor_total: number;
    qtd_itens: number;
    created_at: string;
  }
  const [rascunhos, setRascunhos] = useState<Rascunho[]>([]);

  const fetchRascunhos = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("pedidos")
      .select("id, cliente_nome, valor_total, qtd_itens, created_at")
      .eq("status", "Rascunho")
      .order("created_at", { ascending: false });
    const { data } = await q;
    setRascunhos((data as Rascunho[]) ?? []);
  }, [user?.id, isAdminOrGestor]);

  useEffect(() => { fetchRascunhos(); }, [fetchRascunhos]);

  const descartarRascunho = async (id: string) => {
    await supabase.from("itens_pedido").delete().eq("pedido_id", id);
    await supabase.from("pedidos").delete().eq("id", id);
    toast.success("Rascunho descartado.");
    fetchRascunhos();
    fetchPedidos();
  };

  const fetchPedidos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("pedidos")
      .select("*, clientes(nome_loja, celular)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Todos os usuários autenticados veem todos os pedidos

    if (filtroSituacao === "Rascunho") {
      query = query.eq("status", "Rascunho");
    } else {
      query = query.neq("status", "Rascunho");
      if (filtroSituacao !== "todos") query = query.eq("situacao", filtroSituacao);
    }
    if (dataInicio) query = query.gte("created_at", dataInicio.toISOString());
    if (dataFim) {
      const end = new Date(dataFim);
      end.setHours(23, 59, 59);
      query = query.lte("created_at", end.toISOString());
    }
    if (search) query = query.or(`cliente_nome.ilike.%${search}%,numero.ilike.%${search}%`);

    const { data, count } = await query;
    setPedidos((data as Pedido[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [user?.id, page, filtroSituacao, dataInicio, dataFim, search, isAdminOrGestor]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const openDrawer = async (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setDrawerOpen(true);
    const { data } = await supabase
      .from("itens_pedido")
      .select("id, produto_nome, produto_marca, quantidade, preco_unitario, subtotal, unidade_medida")
      .eq("pedido_id", pedido.id);
    setDrawerItems((data as PedidoItem[]) ?? []);
  };

  const changeSituacao = async (newSit: string) => {
    if (!selectedPedido) return;
    const updates: { situacao: string; data_conclusao?: string } = { situacao: newSit };
    if (newSit === "Concluído") updates.data_conclusao = new Date().toISOString();
    await supabase.from("pedidos").update(updates).eq("id", selectedPedido.id);
    setSelectedPedido({ ...selectedPedido, situacao: newSit });
    toast.success(`Situação alterada para ${newSit}`);
    fetchPedidos();
  };

  const filteredTotal = pedidos.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && pedidos.length === 0) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{total} pedidos no total</p>
        </div>
        <Button onClick={() => navigate("/pedidos/novo")} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" /> Novo Pedido
        </Button>
      </div>

      {/* Banner de Rascunhos / Pedidos pendentes */}
      {rascunhos.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50 ring-1 ring-amber-200">
          <CardContent className="p-3 md:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-amber-700 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm md:text-base">
                  {rascunhos.length} pedido{rascunhos.length > 1 ? "s" : ""} pendente{rascunhos.length > 1 ? "s" : ""} (rascunho)
                </p>
                <p className="text-xs text-amber-800">Continue de onde parou para não perder o trabalho.</p>
              </div>
            </div>
            <div className="space-y-2">
              {rascunhos.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-2 bg-white rounded-lg p-2 md:p-3 border border-amber-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-amber-950">{r.cliente_nome ?? "Sem cliente"}</p>
                    <p className="text-[11px] text-amber-900/80">
                      {r.qtd_itens ?? 0} {r.qtd_itens === 1 ? "item" : "itens"} ·
                      {" "}R$ {Number(r.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ·
                      {" "}iniciado {format(new Date(r.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="min-h-[36px] bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => navigate(`/pedidos/${r.id}/edit`)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 md:mr-1" />
                    <span className="hidden md:inline">Continuar</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="min-h-[36px] text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Descartar este rascunho?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O rascunho de {r.cliente_nome ?? "cliente sem nome"} será removido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => descartarRascunho(r.id)} className="bg-destructive hover:bg-destructive/90">
                          Descartar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {rascunhos.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-amber-800 hover:bg-amber-100"
                  onClick={() => { setFiltroSituacao("Rascunho"); setPage(0); }}
                >
                  Ver todos os {rascunhos.length} rascunhos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente ou nº..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 min-h-[44px]" />
            </div>
            <Select value={filtroSituacao} onValueChange={v => { setFiltroSituacao(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Rascunho">Rascunho (pendente)</SelectItem>
                {situacoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-h-[44px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicio} onSelect={d => { setDataInicio(d); setPage(0); }} className="p-3 pointer-events-auto" /></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-h-[44px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yy") : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataFim} onSelect={d => { setDataFim(d); setPage(0); }} className="p-3 pointer-events-auto" /></PopoverContent>
            </Popover>
            {(dataInicio || dataFim || search || filtroSituacao !== "todos") && (
              <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setFiltroSituacao("todos"); setDataInicio(undefined); setDataFim(undefined); setPage(0); }} className="min-h-[44px]">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[100px]">Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead className="text-center">Desc. Médio</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhum pedido encontrado. Crie seu primeiro pedido!
                </TableCell></TableRow>
              )}
              {pedidos.map(p => {
                const sub = Number(p.subtotal) || 0;
                const desc = Number(p.desconto) || 0;
                const descPct = sub > 0 ? (desc / sub) * 100 : 0;
                const altoDesc = descPct > 15;
                const cli = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => p.status === "Rascunho" ? navigate(`/pedidos/${p.id}/edit`) : openDrawer(p)}>
                    <TableCell className="font-mono text-xs">{p.numero ?? p.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{p.cliente_nome ?? cli?.nome_loja ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">R$ {Number(p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center">{p.qtd_itens ?? 0}</TableCell>
                    <TableCell className="text-center">
                      {descPct > 0 ? (
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", altoDesc ? "bg-secondary/20 text-secondary" : "text-muted-foreground")}>
                          {descPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge className={cn("text-[11px]", situacaoColors[p.status === "Rascunho" ? "Rascunho" : (p.situacao ?? "Emitido")] ?? "")}>{p.status === "Rascunho" ? "Rascunho" : (p.situacao ?? "Emitido")}</Badge></TableCell>
                    <TableCell className="text-sm">{p.forma_pagamento ?? "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {pedidos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Nenhum pedido encontrado. Crie seu primeiro!
          </div>
        )}
        {pedidos.map(p => {
          const sub = Number(p.subtotal) || 0;
          const desc = Number(p.desconto) || 0;
          const descPct = sub > 0 ? (desc / sub) * 100 : 0;
          const altoDesc = descPct > 15;
          const cli = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
          return (
            <Card key={p.id} className={cn("border-0 shadow-sm", altoDesc && "ring-1 ring-secondary/40")} onClick={() => p.status === "Rascunho" ? navigate(`/pedidos/${p.id}/edit`) : openDrawer(p)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{p.cliente_nome ?? cli?.nome_loja ?? "—"}</span>
                  <Badge className={cn("text-[11px]", situacaoColors[p.status === "Rascunho" ? "Rascunho" : (p.situacao ?? "Emitido")] ?? "")}>{p.status === "Rascunho" ? "Rascunho" : (p.situacao ?? "Emitido")}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>#{p.numero ?? p.id.slice(0, 8)}</span>
                  <span className="font-semibold text-foreground">R$ {Number(p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.qtd_itens ?? 0} itens • {p.forma_pagamento ?? "—"}</span>
                  <span>{format(new Date(p.created_at), "dd/MM/yyyy")}</span>
                </div>
                {descPct > 0 && (
                  <div className={cn("flex items-center justify-between text-[11px] pt-1 border-t border-border", altoDesc ? "text-secondary font-semibold" : "text-muted-foreground")}>
                    <span>Desconto médio</span>
                    <span>{descPct.toFixed(1)}%{altoDesc ? " ⚠️" : ""}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer totals + pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          Total filtrado: <span className="font-semibold text-foreground">R$ {filteredTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span> | {total} pedidos
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-9 w-9"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-3 text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-9 w-9"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Drawer Detalhes */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedPedido && (() => {
            const selCli = Array.isArray(selectedPedido.clientes) ? selectedPedido.clientes[0] : selectedPedido.clientes;
            return (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <span>Pedido #{selectedPedido.numero ?? selectedPedido.id.slice(0, 8)}</span>
                  <Badge className={cn(situacaoColors[selectedPedido.status === "Rascunho" ? "Rascunho" : (selectedPedido.situacao ?? "Emitido")] ?? "")}>{selectedPedido.status === "Rascunho" ? "Rascunho" : (selectedPedido.situacao ?? "Emitido")}</Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <button className="font-medium text-primary hover:underline" onClick={() => { setDrawerOpen(false); navigate(`/clientes/${selectedPedido.cliente_id}`); }}>
                      {selectedPedido.cliente_nome ?? selCli?.nome_loja ?? "—"}
                    </button>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Total</p>
                    <p className="font-bold text-lg">R$ {Number(selectedPedido.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pagamento</p>
                    <p className="font-medium">{selectedPedido.forma_pagamento ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{format(new Date(selectedPedido.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>

                {selectedPedido.observacoes && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Observações</p>
                    <p>{selectedPedido.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                {drawerItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item registrado</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Unit.</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drawerItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">
                              <p className="font-medium">{item.produto_nome ?? "—"}</p>
                              {item.produto_marca && <p className="text-muted-foreground">{item.produto_marca}</p>}
                            </TableCell>
                            <TableCell className="text-xs text-center">{Number(item.quantidade)} {item.unidade_medida ?? ""}</TableCell>
                            <TableCell className="text-xs text-right">R$ {Number(item.preco_unitario).toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right font-medium">R$ {Number(item.subtotal).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Label>Alterar Situação</Label>
                <div className="flex flex-wrap gap-2">
                  {situacoes.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedPedido.situacao === s ? "default" : "outline"}
                      className="min-h-[44px]"
                      onClick={() => changeSituacao(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="min-h-[44px]" onClick={() => { setDrawerOpen(false); navigate(`/pedidos/${selectedPedido.id}/edit`); }}>
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => window.open(`/pedidos/${selectedPedido.id}/imprimir`, "_blank")}
                >
                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => { setDrawerOpen(false); navigate(`/pedidos/${selectedPedido.id}`); }}
                >
                  <FileDown className="h-4 w-4 mr-1" /> Ver PDF
                </Button>
                <WhatsAppActionButton
                  phone={selCli?.celular}
                  message={`Olá ${selCli?.nome_loja ?? ""}! Seu pedido #${selectedPedido?.numero ?? selectedPedido?.id.slice(0, 8)} está com situação: ${selectedPedido?.situacao}. Total: R$ ${Number(selectedPedido?.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </WhatsAppActionButton>
              </div>

              {isAdminOrGestor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full min-h-[44px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir Pedido
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir este pedido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O pedido #{selectedPedido.numero ?? selectedPedido.id.slice(0, 8)} e todos os seus itens, parcelas e comissões serão removidos permanentemente. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          const pid = selectedPedido.id;
                          await supabase.from("pedido_parcelas").delete().eq("pedido_id", pid);
                          await supabase.from("pedido_comissoes").delete().eq("pedido_id", pid);
                          await supabase.from("itens_pedido").delete().eq("pedido_id", pid);
                          const { error } = await supabase.from("pedidos").delete().eq("id", pid);
                          if (error) { toast.error("Erro ao excluir pedido."); return; }
                          toast.success("Pedido excluído.");
                          setDrawerOpen(false);
                          fetchPedidos();
                          fetchRascunhos();
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            );
          })()}
        </SheetContent>
      </Sheet>

    </div>
  );
}
