import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats, useDashboardEntregas } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckSquare, Package, CalendarDays, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EntregaStatusBadge } from "@/components/EntregaStatusBadge";
import AppLayout from "@/components/layout/AppLayout";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: entregas, isLoading: isLoadingEntregas } = useDashboardEntregas();

  const statCards = [
    {
      title: "Clientes Ativos",
      value: stats?.totalClientes || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/crm/clientes",
    },
    {
      title: "Tarefas Pendentes",
      value: stats?.tarefasPendentes || 0,
      icon: CheckSquare,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      link: "/crm/tarefas",
    },
    {
      title: "Amostras Enviadas",
      value: stats?.amostrasEnviadas || 0,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/crm/estoque-amostras",
    },
    {
      title: "Entregas Pendentes",
      value: stats?.entregasPendentes || 0,
      icon: Truck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/crm/pedidos",
    },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Stats Cards */}
          {isLoadingStats ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, index) => (
                <Card
                  key={index}
                  className="group border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(stat.link)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide mb-1 truncate">
                          {stat.title}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                        <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Entregas Pendentes */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Próximas Entregas
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/crm/pedidos")}
                  className="h-9"
                >
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingEntregas ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : entregas && entregas.length > 0 ? (
                <div className="space-y-3">
                  {entregas.map((entrega: any) => (
                    <div
                      key={entrega.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50 transition-all cursor-pointer"
                      onClick={() => navigate(`/crm/pedidos/${entrega.id}/editar`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {entrega.clientes?.nome_fantasia || "Cliente não identificado"}
                          </p>
                          <p className="text-sm text-slate-500">
                            Pedido #{entrega.numero_pedido}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">
                              {new Date(entrega.data_previsao_entrega).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <EntregaStatusBadge 
                            status={entrega.status} 
                            dataPrevisao={entrega.data_previsao_entrega}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhuma entrega pendente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Meu Dia Hoje */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Meu Dia Hoje
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/crm/colaborador/relatorio-diario")}
                    className="h-9"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Nenhuma atividade programada para hoje</p>
                </div>
              </CardContent>
            </Card>

            {/* Próximas Tarefas */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Próximas Tarefas
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/crm/tarefas")}
                    className="h-9"
                  >
                    Ver Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Nenhuma tarefa agendada</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
