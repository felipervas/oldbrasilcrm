import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Users, CheckSquare, MessageSquare, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalClientes: number;
  tarefasPendentes: number;
  interacoesHoje: number;
  tarefasAtrasadas: number;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    tarefasPendentes: 0,
    interacoesHoje: 0,
    tarefasAtrasadas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Super otimizado: apenas contagens sem carregar dados
      const [clientesRes, tarefasRes, interacoesRes, tarefasAtrasadasRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('interacoes').select('id', { count: 'exact', head: true }).gte('data_hora', `${hoje}T00:00:00`),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').lt('data_prevista', hoje),
      ]);

      setStats({
        totalClientes: clientesRes.count || 0,
        tarefasPendentes: tarefasRes.count || 0,
        interacoesHoje: interacoesRes.count || 0,
        tarefasAtrasadas: tarefasAtrasadasRes.count || 0,
      });
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
    },
    {
      title: "Tarefas Pendentes",
      value: stats.tarefasPendentes,
      icon: CheckSquare,
      description: "Aguardando execução",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Interações Hoje",
      value: stats.interacoesHoje,
      icon: MessageSquare,
      description: "Visitas e ligações",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Tarefas Atrasadas",
      value: stats.tarefasAtrasadas,
      icon: AlertCircle,
      description: "Requerem atenção",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="shadow-card hover:shadow-elevated transition-shadow">
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
              <TrendingUp className="h-5 w-5 text-primary" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas interações e tarefas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              Sistema pronto para registrar suas atividades
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
};

export default Dashboard;
