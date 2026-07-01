import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Award, ShoppingCart, DollarSign, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendedorId: string | null;
  vendedorNome: string;
  meta: number;
  vendido: number;
  comissaoTotal: number;
}

export function VendedorDetalheSheet({ open, onOpenChange, vendedorId, vendedorNome, meta, vendido, comissaoTotal }: Props) {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !vendedorId) return;
    const load = async () => {
      setLoading(true);
      const inicio = startOfMonth(new Date()).toISOString();
      const fim = endOfMonth(new Date()).toISOString();

      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("id, numero, cliente_id, cliente_nome, valor_total, created_at, status")
        .eq("representante_id", vendedorId)
        .in("status", ["Confirmado", "Enviado"])
        .gte("created_at", inicio)
        .lte("created_at", fim)
        .order("created_at", { ascending: false });

      const ids = (pedidosData ?? []).map((p) => p.id);
      let itensData: any[] = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from("itens_pedido")
          .select("produto_nome, produto_marca, quantidade, subtotal, pedido_id")
          .in("pedido_id", ids);
        itensData = data ?? [];
      }

      setPedidos(pedidosData ?? []);
      setItens(itensData);
      setLoading(false);
    };
    load();
  }, [open, vendedorId]);

  const pctMeta = meta > 0 ? Math.round((vendido / meta) * 100) : 0;

  // Vendas por dia
  const dias = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const vendasPorDia = dias.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const total = pedidos
      .filter((p) => p.created_at.startsWith(key))
      .reduce((acc, p) => acc + Number(p.valor_total ?? 0), 0);
    return { dia: format(d, "dd/MM"), valor: total };
  });

  // Top clientes
  const clienteMap: Record<string, { nome: string; valor: number }> = {};
  pedidos.forEach((p) => {
    const k = p.cliente_id;
    if (!clienteMap[k]) clienteMap[k] = { nome: p.cliente_nome ?? "—", valor: 0 };
    clienteMap[k].valor += Number(p.valor_total ?? 0);
  });
  const topClientes = Object.values(clienteMap).sort((a, b) => b.valor - a.valor).slice(0, 5);

  // Top produtos
  const produtoMap: Record<string, { nome: string; valor: number; qtd: number }> = {};
  itens.forEach((i) => {
    const k = i.produto_nome ?? "—";
    if (!produtoMap[k]) produtoMap[k] = { nome: k, valor: 0, qtd: 0 };
    produtoMap[k].valor += Number(i.subtotal ?? 0);
    produtoMap[k].qtd += Number(i.quantidade ?? 0);
  });
  const topProdutos = Object.values(produtoMap).sort((a, b) => b.valor - a.valor).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-secondary" /> {vendedorNome}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Target className="h-3 w-3" />Meta</div>
              <p className="text-lg font-bold mt-1">{BRL(meta)}</p>
              <p className="text-xs text-muted-foreground">{pctMeta}% atingido</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><DollarSign className="h-3 w-3" />Vendido</div>
              <p className="text-lg font-bold mt-1">{BRL(vendido)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><ShoppingCart className="h-3 w-3" />Pedidos</div>
              <p className="text-lg font-bold mt-1">{pedidos.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Award className="h-3 w-3" />Comissão</div>
              <p className="text-lg font-bold text-secondary mt-1">{BRL(comissaoTotal)}</p>
            </CardContent></Card>
          </div>

          {/* Gráfico de vendas por dia */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-2">Vendas por dia</p>
              {loading ? <Skeleton className="h-40" /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={vendasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => [BRL(v), "Vendas"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="valor" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top clientes */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-2">Top 5 clientes</p>
              {loading ? <Skeleton className="h-32" /> : topClientes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem pedidos no mês</p>
              ) : (
                <div className="space-y-1.5">
                  {topClientes.map((c, i) => (
                    <div key={c.nome + i} className="flex justify-between text-sm">
                      <span className="truncate">{i + 1}. {c.nome}</span>
                      <span className="font-semibold shrink-0 ml-2">{BRL(c.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top produtos */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-2">Top 5 produtos</p>
              {loading ? <Skeleton className="h-32" /> : topProdutos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem itens no mês</p>
              ) : (
                <div className="space-y-1.5">
                  {topProdutos.map((p, i) => (
                    <div key={p.nome + i} className="flex justify-between text-sm">
                      <span className="truncate">{i + 1}. {p.nome}</span>
                      <span className="font-semibold shrink-0 ml-2">{BRL(p.valor)} <span className="text-xs text-muted-foreground">({p.qtd})</span></span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pedidos do mês */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-2">Pedidos do mês ({pedidos.length})</p>
              {loading ? <Skeleton className="h-32" /> : pedidos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem pedidos no mês</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {pedidos.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.cliente_nome ?? "—"}</p>
                        <p className="text-muted-foreground">{format(new Date(p.created_at), "dd/MM HH:mm")}</p>
                      </div>
                      <span className="font-semibold shrink-0 ml-2">{BRL(Number(p.valor_total))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
