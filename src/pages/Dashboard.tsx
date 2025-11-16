import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, CheckSquare, MessageSquare, Clock, AlertCircle, Package, Boxes, Truck, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EntregaStatusBadge } from "@/components/EntregaStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardStats, useDashboardEntregas } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: entregas = [], isLoading: loadingEntregas } = useDashboardEntregas();

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats?.totalClientes || 0,
      icon: Users,
      description: "Clientes cadastrados",
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/clientes",
    },
    {
      title: "Tarefas Pendentes",
      value: stats?.tarefasPendentes || 0,
      icon: CheckSquare,
      description: "Aguardando execução",
      color: "text-warning",
      bgColor: "bg-warning/10",
      link: "/tarefas",
    },
    {
      title: "Amostras Enviadas",
      value: stats?.amostrasEnviadas || 0,
      icon: Package,
      description: "Total de amostras",
      color: "text-info",
      bgColor: "bg-info/10",
      link: "/estoque-amostras",
    },
    {
      title: "Produtos Ativos",
      value: stats?.totalProdutos || 0,
      icon: Boxes,
      description: "Produtos cadastrados",
      color: "text-success",
      bgColor: "bg-success/10",
      link: "/produtos",
    },
    {
      title: "Interações Hoje",
      value: stats?.interacoesHoje || 0,
      icon: MessageSquare,
      description: "Visitas e ligações",
      color: "text-accent",
      bgColor: "bg-accent/10",
      link: "/interacoes",
    },
    {
      title: "Tarefas Atrasadas",
      value: stats?.tarefasAtrasadas || 0,
      icon: AlertCircle,
      description: "Requerem atenção",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      link: "/tarefas",
    },
    {
      title: "Entregas Pendentes",
      value: stats?.entregasPendentes || 0,
      icon: Truck,
      description: "Pedidos p/ entregar",
      color: "text-info",
      bgColor: "bg-info/10",
      link: "/pedidos",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 bg-gradient-to-br from-[hsl(262_90%_98%)] via-white to-[hsl(217_91%_98%)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] bg-clip-text text-transparent">
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
            className="group relative overflow-hidden border-0 bg-white/70 backdrop-blur-md shadow-crm-card hover:shadow-crm-hover transition-all duration-500 hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(stat.link)}
          >
            {/* Gradiente de Fundo Sutil */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[hsl(262_83%_58%)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">
                {stat.title}
              </CardTitle>
              
              {/* Ícone com Glassmorphism */}
              <div className="relative">
                <div className={`p-3 rounded-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                {/* Glow Effect */}
                <div className={`absolute -inset-2 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity ${stat.bgColor}`} />
              </div>
            </CardHeader>
            
            <CardContent className="relative">
              {/* Número com Gradiente */}
              <div className="text-4xl font-black bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] bg-clip-text text-transparent mb-1">
                {loadingStats ? <Skeleton className="h-10 w-20" /> : stat.value}
              </div>
              
              <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                {stat.description}
                <svg className="h-3 w-3 text-[hsl(142_76%_45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </p>
            </CardContent>
            
            {/* Borda Animada no Hover */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
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
            {loadingEntregas ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : entregas.length === 0 ? (
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
