import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalisePerda, usePerdaPorVendedor, usePerformanceVendedores } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Trophy, TrendingUp, Target, Clock, AlertCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

export default function PerformanceVendas() {
  const { data: analisePerda, isLoading: loadingPerda } = useAnalisePerda();
  const { data: perdaPorVendedor, isLoading: loadingPerdaVendedor } = usePerdaPorVendedor();
  const { data: performanceVendedores, isLoading: loadingPerformance } = usePerformanceVendedores();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance de Vendas</h1>
            <p className="text-muted-foreground">Análise completa de resultados e métricas</p>
          </div>
        </div>

        <Tabs defaultValue="vendedores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="vendedores" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking Vendedores
            </TabsTrigger>
            <TabsTrigger value="perdas" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Análise de Perdas
            </TabsTrigger>
            <TabsTrigger value="conversao" className="gap-2">
              <Target className="h-4 w-4" />
              Taxa de Conversão
            </TabsTrigger>
          </TabsList>

          {/* Ranking de Vendedores */}
          <TabsContent value="vendedores" className="space-y-6">
            {loadingPerformance ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-32" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : performanceVendedores && performanceVendedores.length > 0 ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(performanceVendedores.reduce((acc, v) => acc + Number(v.faturamento_total), 0))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {performanceVendedores.reduce((acc, v) => acc + Number(v.total_pedidos), 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          performanceVendedores.reduce((acc, v) => acc + Number(v.ticket_medio), 0) / 
                          performanceVendedores.length
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa Conversão Média</CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(performanceVendedores.reduce((acc, v) => acc + Number(v.taxa_conversao || 0), 0) / 
                          performanceVendedores.length).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela de Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Ranking de Vendedores
                    </CardTitle>
                    <CardDescription>Métricas detalhadas de performance individual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">#</th>
                            <th className="text-left p-3 font-semibold">Vendedor</th>
                            <th className="text-right p-3 font-semibold">Faturamento</th>
                            <th className="text-right p-3 font-semibold">Pedidos</th>
                            <th className="text-right p-3 font-semibold">Ticket Médio</th>
                            <th className="text-right p-3 font-semibold">Conversão</th>
                            <th className="text-right p-3 font-semibold">Prospects</th>
                            <th className="text-right p-3 font-semibold">Tarefas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceVendedores.map((vendedor, index) => (
                            <tr key={vendedor.vendedor_id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                {index < 3 ? (
                                  <Badge variant={index === 0 ? "default" : "secondary"}>
                                    {index + 1}º
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">{index + 1}º</span>
                                )}
                              </td>
                              <td className="p-3 font-medium">{vendedor.vendedor_nome}</td>
                              <td className="p-3 text-right font-semibold">
                                {formatCurrency(Number(vendedor.faturamento_total))}
                              </td>
                              <td className="p-3 text-right">{vendedor.total_pedidos}</td>
                              <td className="p-3 text-right">
                                {formatCurrency(Number(vendedor.ticket_medio))}
                              </td>
                              <td className="p-3 text-right">
                                <Badge variant={Number(vendedor.taxa_conversao) >= 50 ? "default" : "secondary"}>
                                  {Number(vendedor.taxa_conversao || 0).toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <span className="text-sm">
                                  {vendedor.prospects_convertidos}/{vendedor.total_prospects}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className="text-sm">
                                  {vendedor.tarefas_concluidas}/{vendedor.total_tarefas}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Faturamento */}
                <Card>
                  <CardHeader>
                    <CardTitle>Faturamento por Vendedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performanceVendedores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendedor_nome" angle={-45} textAnchor="end" height={100} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="faturamento_total" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum dado de performance disponível
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Análise de Perdas */}
          <TabsContent value="perdas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Motivos de Perda */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Principais Motivos de Perda
                  </CardTitle>
                  <CardDescription>Distribuição de prospects perdidos</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPerda ? (
                    <Skeleton className="h-64" />
                  ) : analisePerda && analisePerda.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analisePerda}
                          dataKey="total_perdas"
                          nameKey="motivo_perda"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.motivo_perda}: ${Number(entry.percentual).toFixed(0)}%`}
                        >
                          {analisePerda.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      Nenhum dado de perda disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Perda por Vendedor */}
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Perda por Vendedor</CardTitle>
                  <CardDescription>Comparativo de perdas vs conversões</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPerdaVendedor ? (
                    <Skeleton className="h-64" />
                  ) : perdaPorVendedor && perdaPorVendedor.length > 0 ? (
                    <div className="space-y-4">
                      {perdaPorVendedor.map((vendedor) => {
                        const taxaPerda = vendedor.total_prospects > 0 
                          ? ((vendedor.total_perdidos / vendedor.total_prospects) * 100).toFixed(1)
                          : '0.0';
                        
                        return (
                          <div key={vendedor.vendedor_id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{vendedor.vendedor_nome}</span>
                              <div className="flex gap-2">
                                <Badge variant="default">
                                  {Number(vendedor.taxa_conversao).toFixed(1)}% ganho
                                </Badge>
                                <Badge variant="destructive">
                                  {taxaPerda}% perda
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div 
                                className="bg-green-500 h-2 rounded"
                                style={{ width: `${vendedor.taxa_conversao}%` }}
                              />
                              <div 
                                className="bg-red-500 h-2 rounded"
                                style={{ width: `${taxaPerda}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {vendedor.total_ganhos} ganhos / {vendedor.total_perdidos} perdas / {vendedor.total_prospects} total
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Taxa de Conversão */}
          <TabsContent value="conversao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão por Vendedor</CardTitle>
                <CardDescription>Performance de conversão de prospects em clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPerformance ? (
                  <Skeleton className="h-96" />
                ) : performanceVendedores && performanceVendedores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceVendedores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="vendedor_nome" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="taxa_conversao" name="Taxa de Conversão (%)" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
