import { useState, useEffect } from "react";
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

interface PedidoStats {
  totalFaturamento: number;
  pedidosMes: number;
  ticketMedio: number;
  pedidosAbertos: number;
  pedidosCancelados: number;
  totalCancelado: number;
}

const Pedidos = () => {
  const [stats, setStats] = useState<PedidoStats>({
    totalFaturamento: 0,
    pedidosMes: 0,
    ticketMedio: 0,
    pedidosAbertos: 0,
    pedidosCancelados: 0,
    totalCancelado: 0,
  });
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [produtosPorPedido, setProdutosPorPedido] = useState<Record<string, any[]>>({});
  const [podeverFaturamento, setPodeVerFaturamento] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const pedidosFiltrados = pedidosRecentes.filter(pedido =>
    pedido.clientes?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.clientes?.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    verificarPermissao();
    loadPedidos();
  }, []);

  // Carregar produtos de um pedido sob demanda (lazy loading)
  const loadProdutosPedido = async (pedidoId: string) => {
    // Se já carregou, não carrega novamente
    if (produtosPorPedido[pedidoId]) return;

    const { data, error } = await supabase
      .from('pedidos_produtos')
      .select('quantidade, preco_unitario, produtos(nome)')
      .eq('pedido_id', pedidoId);

    if (!error && data) {
      setProdutosPorPedido(prev => ({
        ...prev,
        [pedidoId]: data.map(p => ({
          nome: (p as any).produtos?.nome || 'N/A',
          quantidade: p.quantidade,
          preco_unitario: p.preco_unitario
        }))
      }));
    }
  };

  const verificarPermissao = async () => {
    // Todos podem ver pedidos agora
    setPodeVerFaturamento(true);
  };

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      // Otimizado: carregar apenas campos necessários
      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, data_pedido, valor_total, status, observacoes, clientes(nome_fantasia, profiles(nome))")
        .order("data_pedido", { ascending: false })
        .limit(20);

      if (error) throw error;

      setPedidosRecentes(pedidos || []);

      // Calcular estatísticas (excluindo cancelados)
      const todosPedidos = pedidos || [];
      const pedidosAtivos = todosPedidos.filter(p => p.status !== 'cancelado');
      const pedidosMes = pedidosAtivos.filter(p => 
        p.data_pedido && p.data_pedido >= inicioMesStr
      );

      const totalFaturamento = pedidosAtivos
        .reduce((acc, p) => acc + (parseFloat(String(p.valor_total || 0))), 0);

      const faturamentoMes = pedidosMes
        .reduce((acc, p) => acc + (parseFloat(String(p.valor_total || 0))), 0);

      const ticketMedio = pedidosMes.length > 0 
        ? faturamentoMes / pedidosMes.length 
        : 0;

      const pedidosAbertos = todosPedidos.filter(p => 
        p.status === 'pendente' || p.status === 'em_producao'
      ).length;

      const pedidosCancelados = todosPedidos.filter(p => p.status === 'cancelado').length;
      const totalCancelado = todosPedidos
        .filter(p => p.status === 'cancelado')
        .reduce((acc, p) => acc + (parseFloat(String(p.valor_total || 0))), 0);

      setStats({
        totalFaturamento,
        pedidosMes: pedidosMes.length,
        ticketMedio,
        pedidosAbertos,
        pedidosCancelados,
        totalCancelado,
      });

    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast({ 
        title: "Erro ao carregar pedidos", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDeletePedido = async (pedidoId: string, status: string) => {
    if (status === 'cancelado') {
      if (!confirm("ATENÇÃO: Excluir permanentemente este pedido cancelado? Esta ação não pode ser desfeita.")) {
        return;
      }
      
      try {
        const { error } = await supabase
          .from("pedidos")
          .delete()
          .eq("id", pedidoId);

        if (error) {
          console.error("Erro ao excluir:", error);
          toast({ 
            title: "Erro ao excluir pedido", 
            description: error.message,
            variant: "destructive" 
          });
        } else {
          toast({ title: "Pedido excluído permanentemente!" });
          await loadPedidos();
        }
      } catch (err) {
        console.error("Erro:", err);
        toast({ 
          title: "Erro ao excluir pedido", 
          variant: "destructive" 
        });
      }
    } else {
      if (!confirm("Cancelar este pedido? Ele será movido para pedidos cancelados.")) {
        return;
      }
      
      try {
        const { error } = await supabase
          .from("pedidos")
          .update({ status: "cancelado" })
          .eq("id", pedidoId);

        if (error) {
          console.error("Erro ao cancelar:", error);
          toast({ 
            title: "Erro ao cancelar pedido",
            description: error.message,
            variant: "destructive" 
          });
        } else {
          toast({ title: "Pedido cancelado com sucesso!" });
          await loadPedidos();
        }
      } catch (err) {
        console.error("Erro:", err);
        toast({ 
          title: "Erro ao cancelar pedido", 
          variant: "destructive" 
        });
      }
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
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Pedidos
            </h1>
            <p className="text-muted-foreground">
              Gestão de pedidos
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos Recentes */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Pedidos Recentes
              </CardTitle>
              <CardDescription>
                Últimos 20 pedidos registrados
              </CardDescription>
            </div>
            <Button onClick={() => navigate("/lancar-pedido")}>
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
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum pedido registrado</p>
            </div>
          ) : (
             <div className="space-y-4">
               {pedidosFiltrados.map((pedido) => (
                 <div 
                   key={pedido.id} 
                   className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                   onMouseEnter={() => loadProdutosPedido(pedido.id)}
                 >
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <h3 className="font-semibold">{pedido.clientes?.nome_fantasia}</h3>
                         <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(pedido.status).color}`}>
                           {getStatusBadge(pedido.status).text}
                         </span>
                       </div>
                       {pedido.numero_pedido && (
                         <p className="text-sm text-muted-foreground">Pedido: {pedido.numero_pedido}</p>
                       )}
                       {pedido.clientes?.profiles && (
                         <p className="text-xs text-muted-foreground mt-1">
                           Vendedor: {pedido.clientes.profiles.nome}
                         </p>
                       )}
                       {produtosPorPedido[pedido.id] && (
                         <div className="mt-2">
                           <ProdutoTooltip produtos={produtosPorPedido[pedido.id]} />
                         </div>
                       )}
                       {pedido.observacoes && (
                         <p className="text-sm mt-2">{pedido.observacoes}</p>
                       )}
                     </div>
                     <div className="text-right flex flex-col items-end gap-2">
                       <div>
                         {pedido.valor_total && (
                           <p className="text-lg font-bold text-primary">
                             {formatCurrency(parseFloat(pedido.valor_total))}
                           </p>
                         )}
                         {pedido.data_pedido && (
                           <p className="text-xs text-muted-foreground mt-1">
                             {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                           </p>
                         )}
                        </div>
                         <div className="flex gap-2">
                           <ImprimirPedido pedido={pedido} produtos={produtosPorPedido[pedido.id] || []} />
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => navigate(`/pedidos/${pedido.id}/editar`)}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleDeletePedido(pedido.id, pedido.status)}
                             className={pedido.status === 'cancelado' ? 'border-destructive' : ''}
                           >
                             <Trash2 className="h-4 w-4 text-destructive" />
                             {pedido.status === 'cancelado' && (
                               <span className="ml-1 text-xs">Excluir</span>
                             )}
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