import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FaturamentoPorCliente {
  cliente: string;
  total: number;
  pedidos: number;
}

interface FaturamentoPorMarca {
  marca: string;
  total: number;
  quantidade: number;
}

interface VendedorStats {
  vendedor: string;
  total: number;
  pedidos: number;
}

const GestorDashboard = () => {
  const { isGestor, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [faturamentoClientes, setFaturamentoClientes] = useState<FaturamentoPorCliente[]>([]);
  const [faturamentoMarcas, setFaturamentoMarcas] = useState<FaturamentoPorMarca[]>([]);
  const [vendedoresStats, setVendedoresStats] = useState<VendedorStats[]>([]);
  const [totalFaturamento, setTotalFaturamento] = useState(0);
  const [transacoesAgendadas, setTransacoesAgendadas] = useState<any[]>([]);

  useEffect(() => {
    if (!roleLoading && !isGestor) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área",
        variant: "destructive",
      });
      navigate("/");
    } else if (!roleLoading && isGestor) {
      loadDashboardData();
    }
  }, [isGestor, roleLoading, navigate, toast]);

  const loadDashboardData = async () => {
    try {
      // Faturamento por cliente
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('cliente_id, valor_total, clientes(nome_fantasia)')
        .neq('status', 'cancelado');

      const clientesMap = new Map<string, { total: number; pedidos: number }>();
      pedidos?.forEach(p => {
        const nome = (p.clientes as any)?.nome_fantasia || 'Sem nome';
        const current = clientesMap.get(nome) || { total: 0, pedidos: 0 };
        clientesMap.set(nome, {
          total: current.total + (parseFloat(p.valor_total as any) || 0),
          pedidos: current.pedidos + 1
        });
      });

      const faturamentoClientesArray = Array.from(clientesMap.entries())
        .map(([cliente, data]) => ({ cliente, ...data }))
        .sort((a, b) => b.total - a.total);

      setFaturamentoClientes(faturamentoClientesArray);
      setTotalFaturamento(faturamentoClientesArray.reduce((sum, c) => sum + c.total, 0));

      // Faturamento por marca
      const { data: produtosPedidos } = await supabase
        .from('pedidos_produtos')
        .select('quantidade, preco_unitario, produto_id, produtos(marca_id, marcas(nome))');

      const marcasMap = new Map<string, { total: number; quantidade: number }>();
      produtosPedidos?.forEach(pp => {
        const marca = (pp.produtos as any)?.marcas?.nome || 'Sem marca';
        const current = marcasMap.get(marca) || { total: 0, quantidade: 0 };
        const subtotal = (parseFloat(pp.quantidade as any) || 0) * (parseFloat(pp.preco_unitario as any) || 0);
        marcasMap.set(marca, {
          total: current.total + subtotal,
          quantidade: current.quantidade + (parseFloat(pp.quantidade as any) || 0)
        });
      });

      setFaturamentoMarcas(
        Array.from(marcasMap.entries())
          .map(([marca, data]) => ({ marca, ...data }))
          .sort((a, b) => b.total - a.total)
      );

      // Vendedores stats
      const { data: pedidosVendedores } = await supabase
        .from('pedidos')
        .select('responsavel_venda_id, valor_total, profiles(nome)')
        .not('responsavel_venda_id', 'is', null)
        .neq('status', 'cancelado');

      const vendedoresMap = new Map<string, { total: number; pedidos: number }>();
      pedidosVendedores?.forEach(pv => {
        const vendedor = (pv.profiles as any)?.nome || 'Desconhecido';
        const current = vendedoresMap.get(vendedor) || { total: 0, pedidos: 0 };
        vendedoresMap.set(vendedor, {
          total: current.total + (parseFloat(pv.valor_total as any) || 0),
          pedidos: current.pedidos + 1
        });
      });

      setVendedoresStats(
        Array.from(vendedoresMap.entries())
          .map(([vendedor, data]) => ({ vendedor, ...data }))
          .sort((a, b) => b.total - a.total)
      );

      // Transações agendadas
      const { data: financeiro } = await supabase
        .from('financeiro')
        .select('*')
        .gte('data', new Date().toISOString().split('T')[0])
        .order('data', { ascending: true })
        .limit(10);

      setTransacoesAgendadas(financeiro || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || !isGestor) {
    return <div className="flex-1 p-8">Carregando...</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Área do Gestor
          </h1>
          <p className="text-muted-foreground">
            Dashboard completo de gestão e análises
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFaturamento)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faturamentoClientes.reduce((sum, c) => sum + c.pedidos, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faturamentoClientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalFaturamento / (faturamentoClientes.reduce((sum, c) => sum + c.pedidos, 0) || 1))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clientes" className="w-full">
        <TabsList>
          <TabsTrigger value="clientes">Faturamento por Cliente</TabsTrigger>
          <TabsTrigger value="marcas">Faturamento por Marca</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="calendario">Calendário Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Clientes por Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faturamentoClientes.map((cliente, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{cliente.cliente}</p>
                      <p className="text-sm text-muted-foreground">{cliente.pedidos} pedidos</p>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(cliente.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marcas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Marca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faturamentoMarcas.map((marca, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{marca.marca}</p>
                      <p className="text-sm text-muted-foreground">{marca.quantidade.toFixed(0)} unidades</p>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(marca.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendedoresStats.map((vendedor, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{vendedor.vendedor}</p>
                      <p className="text-sm text-muted-foreground">{vendedor.pedidos} pedidos</p>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(vendedor.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Transações Agendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transacoesAgendadas.map((transacao) => (
                  <div key={transacao.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{transacao.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transacao.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className={`font-bold ${transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {transacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(parseFloat(transacao.valor))}
                    </p>
                  </div>
                ))}
                {transacoesAgendadas.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma transação agendada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestorDashboard;
