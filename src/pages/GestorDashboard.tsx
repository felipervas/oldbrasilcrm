import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Users, Package, DollarSign, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface PedidoRecente {
  id: string;
  numero_pedido: string;
  cliente: string;
  valor_total: number;
  data_pedido: string;
  status: string;
  vendedor: string;
}

const GestorDashboard = () => {
  const { isGestor, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [faturamentoClientes, setFaturamentoClientes] = useState<FaturamentoPorCliente[]>([]);
  const [faturamentoMarcas, setFaturamentoMarcas] = useState<FaturamentoPorMarca[]>([]);
  const [vendedoresStats, setVendedoresStats] = useState<VendedorStats[]>([]);
  const [pedidosRecentes, setPedidosRecentes] = useState<PedidoRecente[]>([]);
  const [totalFaturamento, setTotalFaturamento] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [transacoesFinanceiras, setTransacoesFinanceiras] = useState<any[]>([]);
  const [balancoMensal, setBalancoMensal] = useState<any[]>([]);

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
        .select('cliente_id, valor_total, numero_pedido, data_pedido, status, responsavel_venda_id, clientes(nome_fantasia), profiles!pedidos_responsavel_venda_id_fkey(nome)')
        .neq('status', 'cancelado')
        .order('data_pedido', { ascending: false });

      const clientesMap = new Map<string, { total: number; pedidos: number }>();
      const pedidosRecentesData: PedidoRecente[] = [];

      pedidos?.forEach((p, idx) => {
        const nome = (p.clientes as any)?.nome_fantasia || 'Sem nome';
        const current = clientesMap.get(nome) || { total: 0, pedidos: 0 };
        clientesMap.set(nome, {
          total: current.total + (parseFloat(p.valor_total as any) || 0),
          pedidos: current.pedidos + 1
        });

        // Adicionar aos pedidos recentes (primeiros 10)
        if (idx < 10) {
          pedidosRecentesData.push({
            id: p.cliente_id,
            numero_pedido: p.numero_pedido || 'S/N',
            cliente: nome,
            valor_total: parseFloat(p.valor_total as any) || 0,
            data_pedido: p.data_pedido || '',
            status: p.status || '',
            vendedor: (p.profiles as any)?.nome || 'N/A'
          });
        }
      });

      const faturamentoClientesArray = Array.from(clientesMap.entries())
        .map(([cliente, data]) => ({ cliente, ...data }))
        .sort((a, b) => b.total - a.total);

      setFaturamentoClientes(faturamentoClientesArray);
      setPedidosRecentes(pedidosRecentesData);
      setTotalFaturamento(faturamentoClientesArray.reduce((sum, c) => sum + c.total, 0));
      setTotalPedidos(faturamentoClientesArray.reduce((sum, c) => sum + c.pedidos, 0));

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

      // Transações financeiras (calendário)
      const { data: financeiro } = await supabase
        .from('financeiro')
        .select('*')
        .order('data', { ascending: true });

      setTransacoesFinanceiras(financeiro || []);

      // Balanço mensal (entrada vs saída)
      const balancoMap = new Map<string, { mes: string; receitas: number; despesas: number }>();
      financeiro?.forEach(t => {
        const mes = format(new Date(t.data), 'MMM/yy', { locale: ptBR });
        const current = balancoMap.get(mes) || { mes, receitas: 0, despesas: 0 };
        
        if (t.tipo === 'receita') {
          current.receitas += parseFloat(t.valor as any) || 0;
        } else {
          current.despesas += parseFloat(t.valor as any) || 0;
        }
        
        balancoMap.set(mes, current);
      });

      setBalancoMensal(Array.from(balancoMap.values()));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados do dashboard",
        variant: "destructive",
      });
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

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const totalReceitas = transacoesFinanceiras
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

  const totalDespesas = transacoesFinanceiras
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

  const saldoTotal = totalReceitas - totalDespesas;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 bg-gradient-subtle min-h-screen">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dashboard do Gestor
          </h1>
          <p className="text-muted-foreground">
            Visão completa de vendas, faturamento e finanças
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalFaturamento)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em pedidos não cancelados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Pedidos realizados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Financeiro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(saldoTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPedidos > 0 ? totalFaturamento / totalPedidos : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por pedido</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="vendedores">Equipe</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/20 shadow-elegant">
              <CardHeader>
                <CardTitle>Faturamento por Cliente (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={faturamentoClientes.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cliente" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-elegant">
              <CardTitle>Balanço Mensal</CardTitle>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={balancoMensal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="receitas" stroke="hsl(var(--chart-1))" name="Receitas" strokeWidth={2} />
                    <Line type="monotone" dataKey="despesas" stroke="hsl(var(--chart-2))" name="Despesas" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Faturamento por Marca</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={faturamentoMarcas.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.marca}: ${formatCurrency(entry.total)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {faturamentoMarcas.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pedidos Recentes */}
        <TabsContent value="pedidos" className="space-y-4">
          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Últimos 10 pedidos realizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pedidosRecentes.map((pedido) => (
                  <div key={pedido.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <p className="font-medium">{pedido.cliente}</p>
                      <p className="text-sm text-muted-foreground">
                        Pedido #{pedido.numero_pedido} • {pedido.vendedor}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pedido.data_pedido ? format(new Date(pedido.data_pedido), "dd/MM/yyyy", { locale: ptBR }) : 'Data não definida'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-success">{formatCurrency(pedido.valor_total)}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        pedido.status === 'concluido' ? 'bg-success/20 text-success' :
                        pedido.status === 'pendente' ? 'bg-warning/20 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {pedido.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance da Equipe */}
        <TabsContent value="vendedores" className="space-y-4">
          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Performance da Equipe de Vendas</CardTitle>
              <CardDescription>Faturamento e pedidos por vendedor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendedoresStats.map((vendedor, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white`}
                           style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                        {vendedor.vendedor.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{vendedor.vendedor}</p>
                        <p className="text-sm text-muted-foreground">{vendedor.pedidos} pedidos</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-success">{formatCurrency(vendedor.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Comparativo de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendedoresStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendedor" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Faturamento por Empresa */}
        <TabsContent value="empresas" className="space-y-4">
          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Faturamento por Cliente</CardTitle>
              <CardDescription>Ranking completo de clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faturamentoClientes.map((cliente, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                      <div>
                        <p className="font-medium">{cliente.cliente}</p>
                        <p className="text-sm text-muted-foreground">{cliente.pedidos} pedidos</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-success">{formatCurrency(cliente.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balanço Financeiro */}
        <TabsContent value="financeiro" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/20 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-sm">Total Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(totalReceitas)}</div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-sm">Total Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesas)}</div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-sm">Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(saldoTotal)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle>Evolução Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={balancoMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="receitas" fill="hsl(var(--chart-1))" name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--chart-2))" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendário Financeiro */}
        <TabsContent value="calendario" className="space-y-4">
          <Card className="border-primary/20 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendário de Entradas e Saídas
              </CardTitle>
              <CardDescription>Todas as transações financeiras programadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transacoesFinanceiras.map((transacao) => (
                  <div 
                    key={transacao.id} 
                    className={`flex items-center justify-between p-3 border-l-4 rounded ${
                      transacao.tipo === 'receita' 
                        ? 'border-success bg-success/5' 
                        : 'border-destructive bg-destructive/5'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{transacao.descricao}</p>
                      {transacao.categoria && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">{transacao.categoria}</span>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        📅 {format(new Date(transacao.data), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {transacao.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1">{transacao.observacoes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transacao.tipo === 'receita' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(parseFloat(transacao.valor))}
                      </p>
                    </div>
                  </div>
                ))}
                {transacoesFinanceiras.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma transação registrada. Acesse a área Financeira para adicionar.
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
