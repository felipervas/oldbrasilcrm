import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Users, Package, DollarSign, BarChart3, PieChart as PieChartIcon, FileText, AlertCircle, Clock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGestorDashboard } from "@/hooks/useGestorDashboard";
import { useBoletosGestor } from "@/hooks/useBoletosGestor";
import { BoletosGestorSection } from "@/components/BoletosGestorSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Lazy load Recharts para reduzir bundle inicial
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import("recharts").then(m => ({ default: m.Legend })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import("recharts").then(m => ({ default: m.Pie })));
const Cell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const Line = lazy(() => import("recharts").then(m => ({ default: m.Line })));

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
  
  // Usar hook otimizado com views materializadas
  const { data: dashboardData, isLoading: loading } = useGestorDashboard();

  useEffect(() => {
    if (!roleLoading && !isGestor) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isGestor, roleLoading, navigate, toast]);
  
  const faturamentoClientes: FaturamentoPorCliente[] = dashboardData?.faturamentoClientes.map((c: any) => ({
    cliente: c.nome_fantasia,
    total: Number(c.faturamento_total) || 0,
    pedidos: Number(c.total_pedidos) || 0,
  })) || [];
  
  const faturamentoMarcas: FaturamentoPorMarca[] = dashboardData?.faturamentoMarcas.map((m: any) => ({
    marca: m.marca,
    total: Number(m.faturamento_total) || 0,
    quantidade: Number(m.quantidade_total) || 0,
  })) || [];
  
  const vendedoresStats: VendedorStats[] = dashboardData?.vendedores.map((v: any) => ({
    vendedor: v.nome,
    total: Number(v.faturamento_total) || 0,
    pedidos: Number(v.total_pedidos) || 0,
  })) || [];
  
  const pedidosRecentes: PedidoRecente[] = dashboardData?.pedidosRecentes.map((p: any) => ({
    id: p.id,
    numero_pedido: p.numero_pedido || 'S/N',
    cliente: (p.clientes as any)?.nome_fantasia || 'Sem nome',
    valor_total: Number(p.valor_total) || 0,
    data_pedido: p.data_pedido || '',
    status: p.status || '',
    vendedor: (p.profiles as any)?.nome || 'N/A',
  })) || [];
  
  const transacoesFinanceiras = dashboardData?.financeiro || [];
  
  const totalFaturamento = faturamentoClientes.reduce((sum, c) => sum + c.total, 0);
  const totalPedidos = faturamentoClientes.reduce((sum, c) => sum + c.pedidos, 0);
  
  // Balanço mensal
  const balancoMap = new Map<string, { mes: string; receitas: number; despesas: number }>();
  transacoesFinanceiras.forEach(t => {
    const mes = format(new Date(t.data), 'MMM/yy', { locale: ptBR });
    const current = balancoMap.get(mes) || { mes, receitas: 0, despesas: 0 };
    
    if (t.tipo === 'receita') {
      current.receitas += Number(t.valor) || 0;
    } else {
      current.despesas += Number(t.valor) || 0;
    }
    
    balancoMap.set(mes, current);
  });
  
  const balancoMensal = Array.from(balancoMap.values());

  if (roleLoading || !isGestor) {
    return (
      <div className="flex-1 p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const totalReceitas = transacoesFinanceiras
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

  const totalDespesas = transacoesFinanceiras
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-300">
        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-1 to-chart-1/70 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-success">{formatCurrency(totalFaturamento)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em pedidos não cancelados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-2 to-chart-2/70 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Pedidos realizados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Financeiro</CardTitle>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${saldoTotal >= 0 ? 'bg-gradient-to-br from-chart-3 to-chart-3/70' : 'bg-gradient-to-br from-destructive to-destructive/70'}`}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-3xl font-bold ${saldoTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(saldoTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-4/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-4 to-chart-4/70 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">
              {formatCurrency(totalPedidos > 0 ? totalFaturamento / totalPedidos : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por pedido</p>
          </CardContent>
        </Card>
      </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex overflow-x-auto w-full -webkit-overflow-scrolling-touch snap-x snap-mandatory">
              <TabsTrigger value="overview" className="whitespace-nowrap snap-start flex-1 min-w-fit">Visão Geral</TabsTrigger>
              <TabsTrigger value="marcas" className="whitespace-nowrap snap-start flex-1 min-w-fit">Marcas</TabsTrigger>
              <TabsTrigger value="pedidos" className="whitespace-nowrap snap-start flex-1 min-w-fit">Pedidos</TabsTrigger>
              <TabsTrigger value="vendedores" className="whitespace-nowrap snap-start flex-1 min-w-fit">Equipe</TabsTrigger>
              <TabsTrigger value="empresas" className="whitespace-nowrap snap-start flex-1 min-w-fit">Empresas</TabsTrigger>
              <TabsTrigger value="financeiro" className="whitespace-nowrap snap-start flex-1 min-w-fit">Financeiro</TabsTrigger>
              <TabsTrigger value="calendario" className="whitespace-nowrap snap-start flex-1 min-w-fit">Calendário</TabsTrigger>
          </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-shadow">
              <CardHeader className="bg-gradient-to-r from-chart-1/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Faturamento por Cliente (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Suspense fallback={<Skeleton className="h-[300px]" />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={faturamentoClientes.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="cliente" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-shadow">
              <CardHeader className="bg-gradient-to-r from-chart-2/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Balanço Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={balancoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="receitas" stroke="hsl(var(--chart-1))" name="Receitas" strokeWidth={3} />
                    <Line type="monotone" dataKey="despesas" stroke="hsl(var(--chart-2))" name="Despesas" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Faturamento por Marcas */}
        <TabsContent value="marcas" className="space-y-4 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-shadow">
              <CardHeader className="bg-gradient-to-r from-chart-3/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Distribuição de Faturamento por Marca
                </CardTitle>
                <CardDescription>Visualização das marcas mais vendidas</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={faturamentoMarcas.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.marca}`}
                      outerRadius={120}
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

            <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-shadow">
              <CardHeader className="bg-gradient-to-r from-chart-4/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Ranking de Marcas
                </CardTitle>
                <CardDescription>Faturamento total por marca</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={faturamentoMarcas.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" />
                    <YAxis dataKey="marca" type="category" width={120} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-elegant">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Detalhamento por Marca
              </CardTitle>
              <CardDescription>Performance detalhada de cada marca</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {faturamentoMarcas.map((marca, idx) => {
                  const percentual = (marca.total / totalFaturamento) * 100;
                  return (
                    <div key={idx} className="group p-4 border rounded-lg hover:shadow-md hover:border-primary/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-semibold text-lg">{marca.marca}</span>
                        </div>
                        <span className="text-2xl font-bold text-success">{formatCurrency(marca.total)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{percentual.toFixed(1)}% do faturamento total</span>
                        <span>•</span>
                        <span>{marca.quantidade.toFixed(0)} unidades vendidas</span>
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500" 
                          style={{ 
                            width: `${percentual}%`,
                            backgroundColor: COLORS[idx % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
          {/* Seção de Boletos a Receber */}
          <Card className="border-primary/20 shadow-elegant">
            <CardHeader className="bg-gradient-to-r from-chart-3/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Boletos a Receber
              </CardTitle>
              <CardDescription>Controle de boletos pendentes e vencimentos</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <BoletosGestorSection />
            </CardContent>
          </Card>

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
                        {transacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(transacao.valor))}
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
