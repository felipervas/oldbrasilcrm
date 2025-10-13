import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DollarSign, TrendingUp, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PedidoStats {
  totalFaturamento: number;
  pedidosMes: number;
  ticketMedio: number;
  pedidosAbertos: number;
}

const Pedidos = () => {
  const [stats, setStats] = useState<PedidoStats>({
    totalFaturamento: 0,
    pedidosMes: 0,
    ticketMedio: 0,
    pedidosAbertos: 0,
  });
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [podeverFaturamento, setPodeVerFaturamento] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    verificarPermissao();
    loadPedidos();
  }, []);

  const verificarPermissao = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const email = user.email?.toLowerCase() || '';
    const temPermissao = email === 'felipervas@gmail.com' || email.endsWith('@oldvasconcellos.com');
    setPodeVerFaturamento(temPermissao);
  };

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia, responsavel_id, profiles(nome))")
        .order("data_pedido", { ascending: false })
        .limit(10);

      if (error) throw error;

      setPedidosRecentes(pedidos || []);

      // Calcular estatísticas
      const todosPedidos = pedidos || [];
      const pedidosMes = todosPedidos.filter(p => 
        p.data_pedido && p.data_pedido >= inicioMesStr
      );

      const totalFaturamento = todosPedidos
        .reduce((acc, p) => acc + (parseFloat(String(p.valor_total || 0))), 0);

      const faturamentoMes = pedidosMes
        .reduce((acc, p) => acc + (parseFloat(String(p.valor_total || 0))), 0);

      const ticketMedio = pedidosMes.length > 0 
        ? faturamentoMes / pedidosMes.length 
        : 0;

      const pedidosAbertos = todosPedidos.filter(p => 
        p.status === 'pendente' || p.status === 'em_producao'
      ).length;

      setStats({
        totalFaturamento,
        pedidosMes: pedidosMes.length,
        ticketMedio,
        pedidosAbertos,
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pendente: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", text: "Pendente" },
      em_producao: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", text: "Em Produção" },
      enviado: { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", text: "Enviado" },
      entregue: { color: "bg-green-500/10 text-green-600 border-green-500/20", text: "Entregue" },
      cancelado: { color: "bg-red-500/10 text-red-600 border-red-500/20", text: "Cancelado" },
    };
    return badges[status] || { color: "bg-muted", text: status };
  };

  if (!podeverFaturamento) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para visualizar o faturamento.
              Apenas gestores autorizados podem acessar esta área.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Pedidos & Faturamento
            </h1>
            <p className="text-muted-foreground">
              Análise de vendas e performance
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento Total
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatCurrency(stats.totalFaturamento)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os pedidos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos no Mês
            </CardTitle>
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.pedidosMes}
            </div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ticket Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-warning/10">
              <DollarSign className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatCurrency(stats.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por pedido este mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Abertos
            </CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10">
              <Package className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.pedidosAbertos}
            </div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pedidos Recentes */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Pedidos Recentes
          </CardTitle>
          <CardDescription>
            Últimos 10 pedidos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pedidosRecentes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum pedido registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosRecentes.map((pedido) => (
                <div key={pedido.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                      {pedido.observacoes && (
                        <p className="text-sm mt-2">{pedido.observacoes}</p>
                      )}
                    </div>
                    <div className="text-right">
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