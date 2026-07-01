import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import { Download, Users, Phone, Target, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function Relatorios() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("3");
  const [interactions, setInteractions] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [allFollowups, setAllFollowups] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?.id, period]);

  const fetchData = async () => {
    setLoading(true);
    const months = parseInt(period);
    const start = startOfMonth(subMonths(new Date(), months - 1)).toISOString();
    const startDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString().slice(0, 10);

    const [intRes, fuRes, cliRes, oppRes, stgRes, overdueRes, pedRes, profRes] = await Promise.all([
      supabase.from("interactions").select("*").gte("interaction_date", start),
      supabase.from("followups").select("*").gte("created_at", start),
      supabase.from("clientes").select("id, nome_loja, created_at"),
      supabase.from("opportunities").select("*, clientes(nome_loja)"),
      supabase.from("pipeline_stages").select("*").order("sort_order"),
      supabase.from("followups").select("*, clientes(nome_loja)")
        .eq("status", "pendente")
        .lt("due_date", format(new Date(), "yyyy-MM-dd")),
      supabase.from("pedidos")
        .select("id, representante_id, vendedor_id, cliente_id, cliente_nome, valor_total, status, created_at")
        .gte("created_at", start)
        .in("status", ["Confirmado", "Enviado"] as any)
        .limit(5000),
      supabase.from("profiles").select("user_id, nome"),
    ]);

    setInteractions(intRes.data ?? []);
    setFollowups(fuRes.data ?? []);
    setClients(cliRes.data ?? []);
    setOpportunities(oppRes.data ?? []);
    setStages(stgRes.data ?? []);
    setAllFollowups(overdueRes.data ?? []);
    setPedidos(pedRes.data ?? []);
    const pmap: Record<string, string> = {};
    (profRes.data ?? []).forEach((p: any) => { pmap[p.user_id] = p.nome; });
    setProfilesMap(pmap);
    setLoading(false);
  };

  const months = parseInt(period);
  const chartMonths = Array.from({ length: months }, (_, i) => {
    const d = subMonths(new Date(), months - 1 - i);
    return { label: format(d, "MMM/yy", { locale: ptBR }), start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString() };
  });

  const interactionChart = chartMonths.map(m => {
    const monthInts = interactions.filter(i => i.interaction_date >= m.start && i.interaction_date <= m.end);
    return {
      mes: m.label,
      Visitas: monthInts.filter(i => i.type === "visita").length,
      Ligações: monthInts.filter(i => i.type === "ligacao").length,
      WhatsApp: monthInts.filter(i => i.type === "whatsapp").length,
      Email: monthInts.filter(i => i.type === "email").length,
    };
  });

  const newClientsChart = chartMonths.map(m => ({
    mes: m.label,
    clientes: clients.filter(c => c.created_at >= m.start && c.created_at <= m.end).length,
  }));

  // Pipeline stage chart
  const pipelineChart = stages.map(s => ({
    name: s.name,
    count: opportunities.filter(o => o.stage_id === s.id && o.status === "open").length,
    value: opportunities.filter(o => o.stage_id === s.id && o.status === "open").reduce((a: number, o: any) => a + (Number(o.estimated_value) || 0), 0),
    fill: s.color,
  }));

  // Weekly interactions (last 8 weeks)
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 });
    const count = interactions.filter(int => {
      const d = new Date(int.interaction_date);
      return d >= weekStart && d <= weekEnd;
    }).length;
    return { semana: format(weekStart, "dd/MM", { locale: ptBR }), interações: count };
  });

  // KPIs
  const totalInteractions = interactions.length;
  const totalVisitas = interactions.filter(i => i.type === "visita").length;
  const startDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString();
  const newClients = clients.filter(c => c.created_at >= startDate).length;
  const dealsWon = opportunities.filter(o => o.status === "won").length;

  // Top 5 clients by interactions
  const clientInteractionCount: Record<string, { name: string; count: number; id: string }> = {};
  interactions.forEach(i => {
    if (!clientInteractionCount[i.client_id]) {
      const cl = clients.find(c => c.id === i.client_id);
      clientInteractionCount[i.client_id] = { name: cl?.nome_loja ?? "—", count: 0, id: i.client_id };
    }
    clientInteractionCount[i.client_id].count++;
  });
  const topClients = Object.values(clientInteractionCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // Overdue follow-ups
  const overdueFollowups = allFollowups.map((f: any) => {
    const cli = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
    return {
      ...f,
      clientName: cli?.nome_loja ?? "—",
      daysOverdue: differenceInDays(new Date(), new Date(f.due_date + "T00:00:00")),
    };
  }).sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);

  // Vendas por Vendedor × Cliente (agregado)
  const vendasVendCli = (() => {
    const map = new Map<string, { vendedor: string; cliente: string; qtd: number; valor: number }>();
    pedidos.forEach((p: any) => {
      const vid = p.vendedor_id || p.representante_id;
      const key = `${vid}::${p.cliente_id}`;
      const cur = map.get(key) ?? {
        vendedor: profilesMap[vid] || "—",
        cliente: p.cliente_nome || clients.find(c => c.id === p.cliente_id)?.nome_loja || "—",
        qtd: 0, valor: 0,
      };
      cur.qtd += 1;
      cur.valor += Number(p.valor_total || 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  })();

  const exportVendasVendCliCSV = () => {
    if (vendasVendCli.length === 0) { toast.info("Sem vendas no período."); return; }
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Vendedor", "Cliente", "Pedidos", "Faturamento (R$)"].map(esc).join(";");
    const rows = vendasVendCli.map(r => [r.vendedor, r.cliente, r.qtd, r.valor.toFixed(2).replace(".", ",")].map(esc).join(";"));
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_vendedor_cliente_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const exportCSV = () => {
    const header = "Data,Tipo,Assunto,Cliente";
    const rows = interactions.map(i => {
      const cl = clients.find(c => c.id === i.client_id);
      return `${new Date(i.interaction_date).toLocaleDateString("pt-BR")},${i.type},${(i.subject ?? "").replace(/,/g, ";")},${(cl?.nome_loja ?? "").replace(/,/g, ";")}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_interacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Inteligência comercial</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {/* Vendas por Vendedor × Cliente */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Vendas por Vendedor × Cliente</CardTitle>
          <Button variant="outline" size="sm" onClick={exportVendasVendCliCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {vendasVendCli.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma venda confirmada no período.</p>
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-xs uppercase text-muted-foreground">Vendedor</th>
                    <th className="text-left py-2 px-3 font-medium text-xs uppercase text-muted-foreground">Cliente</th>
                    <th className="text-center py-2 px-3 font-medium text-xs uppercase text-muted-foreground">Pedidos</th>
                    <th className="text-right py-2 px-3 font-medium text-xs uppercase text-muted-foreground">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasVendCli.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2 px-3">{r.vendedor}</td>
                      <td className="py-2 px-3">{r.cliente}</td>
                      <td className="py-2 px-3 text-center">{r.qtd}</td>
                      <td className="py-2 px-3 text-right font-semibold">R$ {r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vendasVendCli.length > 200 && (
                <p className="text-xs text-muted-foreground py-2 px-3 text-center">Mostrando 200 de {vendasVendCli.length} linhas — exporte CSV para ver tudo.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Interações", value: totalInteractions, icon: Phone },
          { title: "Visitas", value: totalVisitas, icon: Target },
          { title: "Novos Clientes", value: newClients, icon: Users },
          { title: "Negócios Ganhos", value: dealsWon, icon: TrendingUp },
        ].map(k => (
          <Card key={k.title} className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.title}</CardTitle>
              <k.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{k.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Stage Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="text-base">Negócios por Estágio do Pipeline</CardTitle></CardHeader>
        <CardContent>
          {pipelineChart.every(p => p.count === 0) ? (
            <p className="text-center text-muted-foreground py-8">Nenhum negócio no pipeline</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name === "count" ? "Negócios" : "Valor"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Negócios" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Weekly Interactions Line Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="text-base">Interações por Semana (últimas 8 semanas)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="interações" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: "hsl(var(--secondary))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Interaction chart by type */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="text-base">Interações por tipo/mês</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={interactionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="Visitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ligações" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="WhatsApp" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Email" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* New clients chart */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="text-base">Novos clientes por mês</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={newClientsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="clientes" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom: Top Clients + Overdue Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Clients */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Top 5 Clientes por Interações</CardTitle></CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Sem dados de interações</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <Link key={c.id} to={`/clientes/${c.id}`}>
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{c.count} interações</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Follow-ups */}
        <Card className="border-0 shadow-md border-destructive/20">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Follow-ups Vencidos</CardTitle></CardHeader>
          <CardContent>
            {overdueFollowups.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Nenhum follow-up vencido! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueFollowups.slice(0, 10).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.subject}</p>
                      <p className="text-xs text-muted-foreground">{f.clientName}</p>
                    </div>
                    <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">
                      {f.daysOverdue} {f.daysOverdue === 1 ? "dia" : "dias"} atrás
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
