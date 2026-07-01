import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, Trophy, Package,
  Activity, ListChecks, ShoppingCart, MapPin, MessageCircle, ChevronRight
} from "lucide-react";
import { format, startOfMonth, subMonths, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TopCliente { id: string; nome: string; valor: number }
interface TopProduto { nome: string; marca: string | null; quantidade: number; imagem: string | null }
interface Atividade { id: string; tipo: string; titulo: string; data: string; icon: string }
interface ProximaAcao { id: string; subject: string; due_date: string; due_time: string | null; client_name: string }

const COLORS = ["bg-amber-500", "bg-orange-500", "bg-yellow-600", "bg-rose-500", "bg-emerald-500"];

export function DashboardBlocks() {
  const [loading, setLoading] = useState(true);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [faturamentoAnterior, setFaturamentoAnterior] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [ticketMedioAnt, setTicketMedioAnt] = useState(0);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente[]>([]);
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [proximasAcoes, setProximasAcoes] = useState<ProximaAcao[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const inicioMes = startOfMonth(now);
      const inicioMesAnt = startOfMonth(subMonths(now, 1));
      const inicio30d = subDays(now, 30);

      const [pedidosMes, pedidosMesAnt, pedidos30d, itensMes, fupRes] = await Promise.all([
        supabase.from("pedidos").select("id, cliente_id, cliente_nome, valor_total, created_at")
          .gte("created_at", inicioMes.toISOString()).neq("status", "Rascunho"),
        supabase.from("pedidos").select("valor_total")
          .gte("created_at", inicioMesAnt.toISOString()).lt("created_at", inicioMes.toISOString())
          .neq("status", "Rascunho"),
        supabase.from("pedidos").select("valor_total, created_at")
          .gte("created_at", inicio30d.toISOString()).neq("status", "Rascunho"),
        supabase.from("itens_pedido").select("produto_nome, produto_marca, quantidade, pedido_id, pedidos!inner(created_at, status)")
          .gte("pedidos.created_at", inicioMes.toISOString()),
        supabase.from("followups").select("id, subject, due_date, due_time, client_id, clientes(nome_loja)")
          .eq("status", "pendente").gte("due_date", format(now, "yyyy-MM-dd"))
          .order("due_date", { ascending: true }).order("due_time", { ascending: true }).limit(5),
      ]);

      const ped = pedidosMes.data ?? [];
      const total = ped.reduce((a, p) => a + (Number(p.valor_total) || 0), 0);
      if (!active) return;
      setFaturamentoMes(total);
      setTicketMedio(ped.length > 0 ? total / ped.length : 0);

      const pedAnt = pedidosMesAnt.data ?? [];
      const totalAnt = pedAnt.reduce((a, p) => a + (Number(p.valor_total) || 0), 0);
      if (!active) return;
      setFaturamentoAnterior(totalAnt);
      setTicketMedioAnt(pedAnt.length > 0 ? totalAnt / pedAnt.length : 0);

      // Sparkline 30 days
      const buckets: number[] = Array(30).fill(0);
      (pedidos30d.data ?? []).forEach(p => {
        const d = differenceInDays(now, new Date(p.created_at));
        const idx = 29 - d;
        if (idx >= 0 && idx < 30) buckets[idx] += (Number(p.valor_total) || 0);
      });
      if (!active) return;
      setSparkline(buckets);

      // Top 5 clientes
      const mapCli = new Map<string, { nome: string; valor: number }>();
      ped.forEach(p => {
        const cur = mapCli.get(p.cliente_id) ?? { nome: p.cliente_nome ?? "—", valor: 0 };
        cur.valor += (Number(p.valor_total) || 0);
        mapCli.set(p.cliente_id, cur);
      });
      const topC = Array.from(mapCli.entries())
        .map(([id, v]) => ({ id, nome: v.nome, valor: v.valor }))
        .sort((a, b) => b.valor - a.valor).slice(0, 5);
      if (!active) return;
      setTopClientes(topC);

      // Top 5 produtos
      const mapProd = new Map<string, { nome: string; marca: string | null; quantidade: number }>();
      (itensMes.data as any[] ?? []).forEach((i: any) => {
        if (!i.produto_nome) return;
        const key = i.produto_nome;
        const cur = mapProd.get(key) ?? { nome: i.produto_nome, marca: i.produto_marca, quantidade: 0 };
        cur.quantidade += (Number(i.quantidade) || 0);
        mapProd.set(key, cur);
      });
      const topP = Array.from(mapProd.values())
        .sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
      // Try fetch images
      if (topP.length > 0) {
        const { data: prodImgs } = await supabase.from("produtos")
          .select("nome, imagem_url").in("nome", topP.map(p => p.nome));
        const imgMap = new Map((prodImgs ?? []).map(p => [p.nome, p.imagem_url]));
        if (!active) return;
        setTopProdutos(topP.map(p => ({ ...p, imagem: imgMap.get(p.nome) ?? null })));
      } else {
        if (!active) return;
        setTopProdutos([]);
      }

      // Atividades recentes — pedidos + visitas + interações (10 mais recentes)
      const [pedRec, visRec, intRec] = await Promise.all([
        supabase.from("pedidos").select("id, cliente_nome, created_at, valor_total")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("visitas").select("id, cliente_id, check_in_at, clientes(nome_loja)")
          .order("check_in_at", { ascending: false }).limit(10),
        supabase.from("interactions").select("id, type, subject, interaction_date, client_id, clientes(nome_loja)")
          .order("interaction_date", { ascending: false }).limit(10),
      ]);
      const ativ: Atividade[] = [
        ...(pedRec.data ?? []).map((p: any) => ({
          id: `p-${p.id}`, tipo: "pedido",
          titulo: `Pedido ${p.cliente_nome ?? "—"} · R$ ${(Number(p.valor_total) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
          data: p.created_at, icon: "cart",
        })),
        ...(visRec.data as any[] ?? []).map((v: any) => {
          const vc = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
          return {
            id: `v-${v.id}`, tipo: "visita",
            titulo: `Visita em ${vc?.nome_loja ?? "cliente"}`,
            data: v.check_in_at, icon: "map",
          };
        }),
        ...(intRec.data as any[] ?? []).map((i: any) => {
          const ic = Array.isArray(i.clientes) ? i.clientes[0] : i.clientes;
          return {
            id: `i-${i.id}`, tipo: i.type ?? "interacao",
            titulo: `${i.subject ?? i.type} · ${ic?.nome_loja ?? "cliente"}`,
            data: i.interaction_date,
            icon: i.type === "whatsapp_enviado" ? "wa" : "activity",
          };
        }),
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10);
      if (!active) return;
      setAtividades(ativ);

      // Próximas ações
      if (!active) return;
      setProximasAcoes((fupRes.data ?? []).map((f: any) => {
        const fc = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
        return {
          id: f.id, subject: f.subject, due_date: f.due_date, due_time: f.due_time,
          client_name: fc?.nome_loja ?? "—",
        };
      }));

      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const variacaoFat = faturamentoAnterior > 0
    ? ((faturamentoMes - faturamentoAnterior) / faturamentoAnterior) * 100 : 0;
  const variacaoTicket = ticketMedioAnt > 0
    ? ((ticketMedio - ticketMedioAnt) / ticketMedioAnt) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Sparkline SVG
  const max = Math.max(...sparkline, 1);
  const points = sparkline.map((v, i) => `${(i / 29) * 100},${30 - (v / max) * 28}`).join(" ");

  const iconMap: Record<string, JSX.Element> = {
    cart: <ShoppingCart className="h-4 w-4" />,
    map: <MapPin className="h-4 w-4" />,
    wa: <MessageCircle className="h-4 w-4" />,
    activity: <Activity className="h-4 w-4" />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Faturamento + Ticket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-secondary/15 to-amber-50 dark:from-secondary/10 dark:to-secondary/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-secondary/25 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-secondary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faturamento do Mês</span>
              </div>
              {faturamentoAnterior > 0 && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${variacaoFat >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {variacaoFat >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(variacaoFat).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">
              R$ {faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </p>
            <svg viewBox="0 0 100 32" className="w-full h-10 mt-2" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="1.5"
                points={points}
              />
              <polygon
                fill="hsl(var(--secondary) / 0.15)"
                points={`0,30 ${points} 100,30`}
              />
            </svg>
            <p className="text-[10px] text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-secondary/15 to-amber-50 dark:from-secondary/10 dark:to-secondary/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-secondary/25 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-secondary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</span>
              </div>
              {ticketMedioAnt > 0 && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${variacaoTicket >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {variacaoTicket >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(variacaoTicket).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">
              R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Por pedido neste mês</p>
            <p className="text-[10px] text-muted-foreground mt-3">
              Mês anterior: R$ {ticketMedioAnt.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes + Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-secondary" /> Top 5 Clientes do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum pedido este mês ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {topClientes.map((c, i) => (
                  <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                    <div className={`h-9 w-9 rounded-full ${COLORS[i]} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                    </div>
                    <p className="text-sm font-semibold text-secondary shrink-0">
                      R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-secondary" /> Top 5 Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProdutos.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Sem vendas registradas este mês.
              </div>
            ) : (
              <div className="space-y-2">
                {topProdutos.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                    <Avatar className="h-9 w-9 rounded-md">
                      {p.imagem && <AvatarImage src={p.imagem} alt={p.nome} className="object-cover" />}
                      <AvatarFallback className="bg-secondary/20 text-secondary rounded-md text-xs">
                        {p.nome.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      {p.marca && <p className="text-[11px] text-muted-foreground">{p.marca}</p>}
                    </div>
                    <p className="text-sm font-semibold text-secondary shrink-0">
                      {p.quantidade.toLocaleString("pt-BR")} un
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividades + Próximas Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-secondary" /> Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atividades.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma atividade ainda.
              </div>
            ) : (
              <ul className="space-y-2">
                {atividades.map(a => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="h-7 w-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                      {iconMap[a.icon] ?? <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{a.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(a.data), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-secondary" /> Próximas Ações
            </CardTitle>
            <Link to="/agenda" className="text-xs text-primary hover:underline flex items-center">
              Ver agenda <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {proximasAcoes.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma ação agendada.
                <Link to="/agenda" className="block text-xs text-primary hover:underline mt-1">Agendar agora</Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {proximasAcoes.map(p => (
                  <li key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="h-9 w-9 rounded-full bg-secondary/20 text-secondary flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] leading-none">{format(new Date(p.due_date + "T00:00:00"), "MMM", { locale: ptBR }).toUpperCase()}</span>
                      <span className="text-sm font-bold leading-none">{format(new Date(p.due_date + "T00:00:00"), "dd")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.client_name}{p.due_time ? ` · ${p.due_time.slice(0, 5)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
