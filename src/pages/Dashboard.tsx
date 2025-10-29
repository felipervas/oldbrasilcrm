import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, CheckSquare, MessageSquare, TrendingUp, Clock, AlertCircle, Package, Boxes, Truck, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { EntregaStatusBadge } from "@/components/EntregaStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalClientes: number;
  tarefasPendentes: number;
  interacoesHoje: number;
  tarefasAtrasadas: number;
  amostrasEnviadas: number;
  totalProdutos: number;
  entregasPendentes: number;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    tarefasPendentes: 0,
    interacoesHoje: 0,
    tarefasAtrasadas: 0,
    amostrasEnviadas: 0,
    totalProdutos: 0,
    entregasPendentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [entregas, setEntregas] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Super otimizado: apenas contagens sem carregar dados
      const [clientesRes, tarefasRes, interacoesRes, tarefasAtrasadasRes, amostrasRes, produtosRes, entregasRes, entregasListRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('interacoes').select('id', { count: 'exact', head: true }).gte('data_hora', `${hoje}T00:00:00`),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').lt('data_prevista', hoje),
        supabase.from('amostras').select('id', { count: 'exact', head: true }),
        supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }).not('data_previsao_entrega', 'is', null).not('status', 'in', '(cancelado,entregue)'),
        supabase.from('pedidos').select('id, numero_pedido, data_previsao_entrega, status, clientes(nome_fantasia)').not('data_previsao_entrega', 'is', null).not('status', 'in', '(cancelado,entregue)').order('data_previsao_entrega', { ascending: true }).limit(5),
      ]);

      setStats({
        totalClientes: clientesRes.count || 0,
        tarefasPendentes: tarefasRes.count || 0,
        interacoesHoje: interacoesRes.count || 0,
        tarefasAtrasadas: tarefasAtrasadasRes.count || 0,
        amostrasEnviadas: amostrasRes.count || 0,
        totalProdutos: produtosRes.count || 0,
        entregasPendentes: entregasRes.count || 0,
      });

      setEntregas(entregasListRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Tente recarregar a página",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats.totalClientes,
      icon: Users,
      description: "Clientes cadastrados",
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/clientes",
    },
    {
      title: "Tarefas Pendentes",
      value: stats.tarefasPendentes,
      icon: CheckSquare,
      description: "Aguardando execução",
      color: "text-warning",
      bgColor: "bg-warning/10",
      link: "/tarefas",
    },
    {
      title: "Amostras Enviadas",
      value: stats.amostrasEnviadas,
      icon: Package,
      description: "Total de amostras",
      color: "text-info",
      bgColor: "bg-info/10",
      link: "/estoque-amostras",
    },
    {
      title: "Produtos Ativos",
      value: stats.totalProdutos,
      icon: Boxes,
      description: "Produtos cadastrados",
      color: "text-success",
      bgColor: "bg-success/10",
      link: "/produtos",
    },
    {
      title: "Interações Hoje",
      value: stats.interacoesHoje,
      icon: MessageSquare,
      description: "Visitas e ligações",
      color: "text-accent",
      bgColor: "bg-accent/10",
      link: "/interacoes",
    },
    {
      title: "Tarefas Atrasadas",
      value: stats.tarefasAtrasadas,
      icon: AlertCircle,
      description: "Requerem atenção",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      link: "/tarefas",
    },
    {
      title: "Entregas Pendentes",
      value: stats.entregasPendentes,
      icon: Truck,
      description: "Pedidos p/ entregar",
      color: "text-info",
      bgColor: "bg-info/10",
      link: "/pedidos",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Visão geral das atividades de representação
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
            onClick={() => navigate(stat.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Entregas Pendentes
            </CardTitle>
            <CardDescription>
              Próximas entregas previstas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entregas.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega pendente
              </div>
            ) : (
              <div className="space-y-3">
                {entregas.map((entrega) => (
                  <div 
                    key={entrega.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/pedidos/${entrega.id}/editar`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entrega.clientes?.nome_fantasia}</p>
                      <p className="text-xs text-muted-foreground">Pedido {entrega.numero_pedido}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entrega.data_previsao_entrega + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <EntregaStatusBadge 
                      dataPrevisao={entrega.data_previsao_entrega}
                      status={entrega.status}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Meu Dia Hoje
            </CardTitle>
            <CardDescription>
              Próximas atividades do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade agendada para hoje
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/meu-dia')}
            >
              Ver Relatório Completo
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Próximas Tarefas
          </CardTitle>
          <CardDescription>
            Agenda dos próximos dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa agendada
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
