import { useState, memo, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Package, Calendar, Trash2, Edit, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProdutoTooltip } from "@/components/ProdutoTooltip";
import { ImprimirPedido } from "@/components/ImprimirPedido";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Pedidos = () => {
  const [produtosPorPedido, setProdutosPorPedido] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const podeverFaturamento = roles.includes('gestor') || roles.includes('admin');

  // React Query para pedidos
  const { data: pedidosRecentes = [], isLoading: loading } = useQuery({
    queryKey: ['pedidos-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, numero_pedido, data_pedido, valor_total, status, 
          observacoes, observacoes_internas, forma_pagamento,
          parcelas, dias_pagamento, tipo_frete, transportadora,
          clientes(
            nome_fantasia, razao_social, cnpj_cpf, logradouro, 
            numero, cidade, uf, cep, telefone, email, responsavel_id,
            profiles(nome)
          )
        `)
        .order("data_pedido", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Stats calculadas via useMemo
  const stats = useMemo(() => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    const pedidosAtivos = pedidosRecentes.filter((p: any) => p.status !== 'cancelado');
    const pedidosMes = pedidosAtivos.filter((p: any) => p.data_pedido && p.data_pedido >= inicioMesStr);
    const faturamentoMes = pedidosMes.reduce((acc: number, p: any) => acc + (parseFloat(String(p.valor_total || 0))), 0);

    return {
      totalFaturamento: pedidosAtivos.reduce((acc: number, p: any) => acc + (parseFloat(String(p.valor_total || 0))), 0),
      pedidosMes: pedidosMes.length,
      ticketMedio: pedidosMes.length > 0 ? faturamentoMes / pedidosMes.length : 0,
      pedidosAbertos: pedidosRecentes.filter((p: any) => p.status === 'pendente' || p.status === 'em_producao').length,
      pedidosCancelados: pedidosRecentes.filter((p: any) => p.status === 'cancelado').length,
      totalCancelado: pedidosRecentes.filter((p: any) => p.status === 'cancelado').reduce((acc: number, p: any) => acc + (parseFloat(String(p.valor_total || 0))), 0),
    };
  }, [pedidosRecentes]);

  const pedidosFiltrados = useMemo(() => 
    pedidosRecentes.filter((pedido: any) =>
      pedido.clientes?.nome_fantasia?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      pedido.numero_pedido?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      pedido.clientes?.profiles?.nome?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ),
    [pedidosRecentes, debouncedSearchTerm]
  );

  const loadProdutosPedido = async (pedidoId: string) => {
    if (produtosPorPedido[pedidoId]) return;
    const { data, error } = await supabase
      .from('pedidos_produtos')
      .select('quantidade, preco_unitario, produtos(id, nome)')
      .eq('pedido_id', pedidoId);

    if (!error && data) {
      setProdutosPorPedido(prev => ({
        ...prev,
        [pedidoId]: data.map((item: any) => ({
          nome: item.produtos?.nome || 'Produto sem nome',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        }))
      }));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDeletePedido = async (pedidoId: string, status: string) => {
    if (status === 'cancelado') {
      if (!confirm("ATENÇÃO: Excluir permanentemente este pedido cancelado?")) return;
      try {
        const { error } = await supabase.from("pedidos").delete().eq("id", pedidoId);
        if (error) { toast({ title: "Erro ao excluir pedido", description: error.message, variant: "destructive" }); }
        else { toast({ title: "Pedido excluído permanentemente!" }); queryClient.invalidateQueries({ queryKey: ['pedidos-lista'] }); }
      } catch { toast({ title: "Erro ao excluir pedido", variant: "destructive" }); }
    } else {
      if (!confirm("Cancelar este pedido?")) return;
      try {
        const { error } = await supabase.from("pedidos").update({ status: "cancelado" }).eq("id", pedidoId);
        if (error) { toast({ title: "Erro ao cancelar pedido", description: error.message, variant: "destructive" }); }
        else { toast({ title: "Pedido cancelado com sucesso!" }); queryClient.invalidateQueries({ queryKey: ['pedidos-lista'] }); }
      } catch { toast({ title: "Erro ao cancelar pedido", variant: "destructive" }); }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      cotacao: { color: "bg-gray-500/10 text-gray-600 border-gray-500/20", text: "Cotação" },
      pedido: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", text: "Pedido" },
      pendente: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", text: "Pendente" },
      em_producao: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", text: "Em Produção" },
      enviado: { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", text: "Enviado" },
      entregue: { color: "bg-green-500/10 text-green-600 border-green-500/20", text: "Entregue" },
      cancelado: { color: "bg-red-500/10 text-red-600 border-red-500/20", text: "Cancelado" },
    };
    return badges[status] || { color: "bg-muted", text: status };
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Pedidos</h1>
            <p className="text-muted-foreground">Gestão de pedidos</p>
          </div>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Pedidos Recentes
              </CardTitle>
              <CardDescription>Últimos 20 pedidos registrados</CardDescription>
            </div>
            <Button onClick={() => navigate("/lancar-pedido")} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Buscar por cliente, número do pedido ou vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando pedidos...</p>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum pedido registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map((pedido: any) => (
                <div 
                  key={pedido.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  onMouseEnter={() => loadProdutosPedido(pedido.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{pedido.clientes?.nome_fantasia}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(pedido.status).color}`}>
                          {getStatusBadge(pedido.status).text}
                        </span>
                      </div>
                      {pedido.numero_pedido && (
                        <p className="text-sm text-muted-foreground">Pedido: {pedido.numero_pedido}</p>
                      )}
                      {pedido.clientes?.profiles && (
                        <p className="text-xs text-muted-foreground mt-1">Vendedor: {pedido.clientes.profiles.nome}</p>
                      )}
                      {produtosPorPedido[pedido.id] && (
                        <div className="mt-2"><ProdutoTooltip produtos={produtosPorPedido[pedido.id]} /></div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {pedido.forma_pagamento && <span className="px-2 py-1 bg-muted rounded">💳 {pedido.forma_pagamento}</span>}
                        {pedido.parcelas && <span className="px-2 py-1 bg-muted rounded">📊 {pedido.parcelas}x</span>}
                        {pedido.dias_pagamento && <span className="px-2 py-1 bg-muted rounded">📅 {pedido.dias_pagamento} dias</span>}
                        {pedido.tipo_frete && <span className="px-2 py-1 bg-muted rounded">🚚 {pedido.tipo_frete}</span>}
                      </div>
                      {pedido.observacoes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
                          <p className="text-sm">{pedido.observacoes}</p>
                        </div>
                      )}
                      {pedido.observacoes_internas && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Observações Internas (CRM):</p>
                          <p className="text-sm text-orange-800 dark:text-orange-200">{pedido.observacoes_internas}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3">
                      <div className="text-right">
                        {pedido.valor_total && (
                          <p className="text-lg font-bold text-primary">{formatCurrency(parseFloat(pedido.valor_total))}</p>
                        )}
                        {pedido.data_pedido && (
                          <p className="text-xs text-muted-foreground mt-1">{new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ImprimirPedido pedido={pedido} produtos={produtosPorPedido[pedido.id] || []} />
                        <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => navigate(`/pedidos/${pedido.id}/editar`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`min-h-[44px] min-w-[44px] ${pedido.status === 'cancelado' ? 'border-destructive' : ''}`}
                          onClick={() => handleDeletePedido(pedido.id, pedido.status)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          {pedido.status === 'cancelado' && <span className="ml-1 text-xs">Excluir</span>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Pedidos;
