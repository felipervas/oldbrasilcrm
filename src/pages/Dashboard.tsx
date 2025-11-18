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
    { title: "Total de Clientes", value: stats?.totalClientes || 0, icon: Users, description: "Clientes cadastrados", color: "text-blue-600", bgColor: "bg-blue-50", link: "/clientes" },
    { title: "Tarefas Pendentes", value: stats?.tarefasPendentes || 0, icon: CheckSquare, description: "Aguardando execução", color: "text-orange-600", bgColor: "bg-orange-50", link: "/tarefas" },
    { title: "Amostras Enviadas", value: stats?.amostrasEnviadas || 0, icon: Package, description: "Total de amostras", color: "text-purple-600", bgColor: "bg-purple-50", link: "/estoque-amostras" },
    { title: "Produtos Ativos", value: stats?.totalProdutos || 0, icon: Boxes, description: "Produtos cadastrados", color: "text-green-600", bgColor: "bg-green-50", link: "/produtos" },
    { title: "Interações Hoje", value: stats?.interacoesHoje || 0, icon: MessageSquare, description: "Visitas e ligações", color: "text-cyan-600", bgColor: "bg-cyan-50", link: "/interacoes" },
    { title: "Tarefas Atrasadas", value: stats?.tarefasAtrasadas || 0, icon: AlertCircle, description: "Requerem atenção", color: "text-red-600", bgColor: "bg-red-50", link: "/tarefas" },
    { title: "Entregas Pendentes", value: stats?.entregasPendentes || 0, icon: Truck, description: "Pedidos p/ entregar", color: "text-indigo-600", bgColor: "bg-indigo-50", link: "/pedidos" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Visão geral das atividades</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border border-slate-200 bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(stat.link)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-2">{stat.title}</p>
                    {loadingStats ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-slate-900">{stat.value}</p>}
                    <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50"><Truck className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <CardTitle className="text-base font-semibold">Entregas Pendentes</CardTitle>
                  <CardDescription className="text-xs">Próximas entregas previstas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEntregas ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : entregas.length === 0 ? (
                <div className="text-center py-8"><p className="text-sm text-slate-500">Nenhuma entrega pendente</p></div>
              ) : (
                <div className="space-y-2">
                  {entregas.map((e: any) => (
                    <div key={e.id} onClick={() => navigate(`/editar-pedido/${e.id}`)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{e.clientes?.nome_fantasia || "Cliente"}</p>
                        <p className="text-xs text-slate-500">Pedido #{e.numero_pedido}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-900">{format(new Date(e.data_previsao_entrega), "dd/MM", { locale: ptBR })}</p>
                        <EntregaStatusBadge status={e.status} dataPrevisao={e.data_previsao_entrega} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50"><CalendarDays className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <CardTitle className="text-base font-semibold">Meu Dia Hoje</CardTitle>
                  <CardDescription className="text-xs">Próximas atividades do dia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-4">Nenhuma atividade agendada</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/meu-dia")}>Ver Relatório Completo</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50"><Clock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <CardTitle className="text-base font-semibold">Próximas Tarefas</CardTitle>
                <CardDescription className="text-xs">Agenda dos próximos dias</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-4">Nenhuma tarefa agendada</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/tarefas")}>Ver Todas as Tarefas</Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Dashboard;
