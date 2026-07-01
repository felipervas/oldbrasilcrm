import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, ShoppingCart, DollarSign, Coins, Award, Target, Trophy, Medal } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from "date-fns";
import { VendedorDetalheSheet } from "@/components/VendedorDetalheSheet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BRL2 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PIE_COLORS = [
  "hsl(var(--secondary))",
  "hsl(var(--primary))",
  "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444",
];

interface RankingRow {
  vendedor_id: string;
  nome: string;
  meta: number;
  vendido: number;
  pctMeta: number;
  pedidos: number;
  comissao: number;
}

export default function Vendas() {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const [loading, setLoading] = useState(true);

  const [pedidosMes, setPedidosMes] = useState<any[]>([]);
  const [itensMes, setItensMes] = useState<any[]>([]);
  const [pedidos30d, setPedidos30d] = useState<any[]>([]);
  const [vendedoresMap, setVendedoresMap] = useState<Record<string, string>>({});
  const [metas, setMetas] = useState<Record<string, number>>({});
  const [comissoes, setComissoes] = useState<Record<string, number>>({});
  const [selVendedor, setSelVendedor] = useState<RankingRow | null>(null);

  const now = useMemo(() => new Date(), []);
  const mesInicio = useMemo(() => startOfMonth(now), [now]);
  const mesFim = useMemo(() => endOfMonth(now), [now]);
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let pedQuery = supabase
      .from("pedidos")
      .select("id, numero, cliente_id, cliente_nome, valor_total, representante_id, status, created_at")
      .in("status", ["Confirmado", "Enviado"])
      .gte("created_at", mesInicio.toISOString())
      .lte("created_at", mesFim.toISOString())
      .order("created_at", { ascending: false });
    // Todos veem todos os pedidos

    const { data: pedidosData } = await pedQuery;
    const pedidosList = pedidosData ?? [];
    setPedidosMes(pedidosList);

    if (pedidosList.length > 0) {
      const ids = pedidosList.map((p) => p.id);
      const { data: itensData } = await supabase
        .from("itens_pedido")
        .select("produto_marca, subtotal, pedido_id")
        .in("pedido_id", ids);
      setItensMes(itensData ?? []);
    } else {
      setItensMes([]);
    }

    // últimos 30 dias para gráfico
    const inicio30 = subDays(now, 29);
    let p30Query = supabase
      .from("pedidos")
      .select("valor_total, created_at, representante_id")
      .in("status", ["Confirmado", "Enviado"])
      .gte("created_at", inicio30.toISOString());
    // Todos veem todos os pedidos dos últimos 30 dias
    const { data: pedidos30Data } = await p30Query;
    setPedidos30d(pedidos30Data ?? []);

    const [profilesRes, metasRes, comissoesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, nome"),
      supabase.from("metas_mensais" as any).select("vendedor_id, meta_valor").eq("ano", ano).eq("mes", mes),
      supabase
        .from("pedido_comissoes" as any)
        .select("vendedor_id, comissao_total")
        .gte("calculado_em", mesInicio.toISOString())
        .lte("calculado_em", mesFim.toISOString()),
    ]);

    const vMap: Record<string, string> = {};
    (profilesRes.data ?? []).forEach((p: any) => { vMap[p.user_id] = p.nome; });
    setVendedoresMap(vMap);

    const metaMap: Record<string, number> = {};
    ((metasRes.data ?? []) as any[]).forEach((m: any) => { metaMap[m.vendedor_id] = Number(m.meta_valor ?? 0); });
    setMetas(metaMap);

    const comMap: Record<string, number> = {};
    ((comissoesRes.data ?? []) as any[]).forEach((c: any) => {
      comMap[c.vendedor_id] = (comMap[c.vendedor_id] ?? 0) + (Number(c.comissao_total) || 0);
    });
    setComissoes(comMap);

    setLoading(false);
  }, [user?.id, isAdminOrGestor, mesInicio, mesFim, now, ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs
  const faturamento = pedidosMes.reduce((acc, p) => acc + Number(p.valor_total ?? 0), 0);
  const qtdPedidos = pedidosMes.length;
  const ticketMedio = qtdPedidos > 0 ? faturamento / qtdPedidos : 0;
  const totalComissoes = Object.values(comissoes).reduce((a, b) => a + b, 0);

  // Ranking
  const ranking: RankingRow[] = useMemo(() => {
    // Ranking visível para todos
    const map: Record<string, RankingRow> = {};
    pedidosMes.forEach((p) => {
      const id = p.representante_id;
      if (!map[id]) {
        map[id] = {
          vendedor_id: id,
          nome: vendedoresMap[id] ?? "Sem vendedor",
          meta: metas[id] ?? 0,
          vendido: 0,
          pctMeta: 0,
          pedidos: 0,
          comissao: comissoes[id] ?? 0,
        };
      }
      map[id].vendido += Number(p.valor_total ?? 0);
      map[id].pedidos++;
    });
    // garante linhas para vendedores com meta mas sem vendas
    Object.entries(metas).forEach(([id, meta]) => {
      if (!map[id]) {
        map[id] = {
          vendedor_id: id,
          nome: vendedoresMap[id] ?? "—",
          meta,
          vendido: 0,
          pctMeta: 0,
          pedidos: 0,
          comissao: comissoes[id] ?? 0,
        };
      }
    });
    return Object.values(map)
      .map((r) => ({ ...r, pctMeta: r.meta > 0 ? (r.vendido / r.meta) * 100 : 0 }))
      .sort((a, b) => b.pctMeta - a.pctMeta || b.vendido - a.vendido);
  }, [pedidosMes, vendedoresMap, metas, comissoes, isAdminOrGestor]);

  // Meu desempenho (vendedor)
  const meuRanking = ranking.find((r) => r.vendedor_id === user?.id);
  const meuVendido = !isAdminOrGestor
    ? pedidosMes.reduce((acc, p) => acc + Number(p.valor_total ?? 0), 0)
    : meuRanking?.vendido ?? 0;
  const minhaMeta = metas[user?.id ?? ""] ?? 0;
  const meuPct = minhaMeta > 0 ? (meuVendido / minhaMeta) * 100 : 0;
  const minhaComissao = comissoes[user?.id ?? ""] ?? 0;
  const faltaParaMeta = Math.max(0, minhaMeta - meuVendido);

  // Gráfico vendas 30d
  const vendas30 = useMemo(() => {
    const dias = eachDayOfInterval({ start: subDays(now, 29), end: now });
    return dias.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const total = pedidos30d
        .filter((p: any) => p.created_at.startsWith(key))
        .reduce((acc: number, p: any) => acc + Number(p.valor_total ?? 0), 0);
      return { dia: format(d, "dd/MM"), valor: total };
    });
  }, [pedidos30d, now]);

  // Gráfico participação por marca
  const marcaChart = useMemo(() => {
    const map: Record<string, number> = {};
    itensMes.forEach((i) => {
      const m = i.produto_marca || "Sem marca";
      map[m] = (map[m] ?? 0) + Number(i.subtotal ?? 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [itensMes]);

  const pctColor = (p: number) =>
    p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-amber-500" : "bg-rose-500";

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;

  return (
    <div className="p-2 md:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-secondary" />
            Painel de Vendas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdminOrGestor ? "Desempenho da equipe — mês atual" : "Seu desempenho — mês atual"}
          </p>
        </div>
        {isAdminOrGestor && (
          <Button asChild variant="outline" size="sm">
            <Link to="/comissoes"><Coins className="h-4 w-4 mr-1" /> Configurar comissões</Link>
          </Button>
        )}
      </div>

      {/* MEU DESEMPENHO – destaque para vendedores */}
      {!isAdminOrGestor && (
        <Card className="border-2 border-secondary/40 bg-gradient-to-br from-secondary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary" /> Meu Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Meta do mês</p>
                <p className="text-lg font-bold">{BRL(minhaMeta)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="text-lg font-bold">{BRL(meuVendido)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">% atingido</p>
                <p className={`text-lg font-bold ${meuPct >= 100 ? "text-emerald-600" : meuPct >= 70 ? "text-amber-600" : "text-rose-600"}`}>
                  {meuPct.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comissão</p>
                <p className="text-lg font-bold text-secondary">{BRL2(minhaComissao)}</p>
              </div>
            </div>
            <Progress value={Math.min(100, meuPct)} className="h-3" indicatorClassName={pctColor(meuPct)} />
            {minhaMeta > 0 ? (
              meuPct >= 100 ? (
                <Badge className="bg-emerald-500 text-white"><Trophy className="h-3 w-3 mr-1" /> Meta batida! 🎉</Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Faltam <strong className="text-foreground">{BRL2(faltaParaMeta)}</strong> para bater a meta deste mês.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada para você este mês.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} label="Faturamento" value={BRL(faturamento)} hint="Total do mês" />
          <KpiCard icon={ShoppingCart} label="Pedidos" value={String(qtdPedidos)} hint="Confirmados" />
          <KpiCard icon={TrendingUp} label="Ticket Médio" value={BRL(ticketMedio)} hint="Por pedido" />
          <KpiCard icon={Coins} label="Comissões" value={BRL(totalComissoes)} hint="A pagar" highlight />
        </div>
      )}

      {/* RANKING (admin/gestor) */}
      {isAdminOrGestor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-secondary" /> Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60" />
            ) : ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum pedido no mês. Defina metas em <Link to="/comissoes" className="underline">/comissoes</Link>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 px-2 font-medium w-12">#</th>
                      <th className="py-2 px-2 font-medium">Vendedor</th>
                      <th className="py-2 px-2 font-medium text-right">Meta</th>
                      <th className="py-2 px-2 font-medium text-right">Vendido</th>
                      <th className="py-2 px-2 font-medium min-w-[180px]">% Meta</th>
                      <th className="py-2 px-2 font-medium text-right">Comissão</th>
                      <th className="py-2 px-2 font-medium text-center">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr
                        key={r.vendedor_id}
                        className="border-b border-border last:border-0 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => setSelVendedor(r)}
                      >
                        <td className="py-3 px-2 text-lg">{medal(i)}</td>
                        <td className="py-3 px-2 font-medium">{r.nome}</td>
                        <td className="py-3 px-2 text-right">{BRL(r.meta)}</td>
                        <td className="py-3 px-2 text-right font-semibold">{BRL(r.vendido)}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, r.pctMeta)} className="h-2 flex-1" indicatorClassName={pctColor(r.pctMeta)} />
                            <span className={`text-xs font-bold w-12 text-right ${r.pctMeta >= 100 ? "text-emerald-600" : r.pctMeta >= 70 ? "text-amber-600" : "text-rose-600"}`}>
                              {r.pctMeta.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-secondary">{BRL2(r.comissao)}</td>
                        <td className="py-3 px-2 text-center">{r.pedidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas — últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-60" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={vendas30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={3} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [BRL2(v), "Vendas"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--secondary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participação por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-60" /> : marcaChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados de marcas no mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={marcaChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.name}`}
                    labelLine={false}
                  >
                    {marcaChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => BRL2(v)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <VendedorDetalheSheet
        open={!!selVendedor}
        onOpenChange={(v) => !v && setSelVendedor(null)}
        vendedorId={selVendedor?.vendedor_id ?? null}
        vendedorNome={selVendedor?.nome ?? ""}
        meta={selVendedor?.meta ?? 0}
        vendido={selVendedor?.vendido ?? 0}
        comissaoTotal={selVendedor?.comissao ?? 0}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, hint, highlight,
}: { icon: any; label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-secondary/40 bg-secondary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className={`text-xl md:text-2xl font-bold mt-1 ${highlight ? "text-secondary" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
