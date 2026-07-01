import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Download, FileText, TrendingUp, TrendingDown,
  Minus, Users, ShoppingCart, Wallet, BarChart3,
} from "lucide-react";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { gerarRelatorioSemanalPdf } from "@/lib/relatorioSemanalPdf";

const WK = { weekStartsOn: 1 } as const; // semana começa na segunda
const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Pedido {
  representante_id: string | null;
  vendedor_id: string | null;
  valor_total: number | null;
  created_at: string;
}
interface Linha {
  id: string;
  representante: string;
  pedidos: number;
  faturamento: number;
  ticketMedio: number;
  variacao: number | null;
}

export default function RelatorioSemanal() {
  const [offset, setOffset] = useState(0);

  const baseStart = startOfWeek(new Date(), WK);
  const weekStart = subWeeks(baseStart, offset);
  const weekEnd = endOfWeek(weekStart, WK);
  const rangeStart = subWeeks(weekStart, 7); // 8 semanas para o gráfico
  const prevStart = subWeeks(weekStart, 1);
  const periodoLabel = `${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-semanal", weekStart.toISOString()],
    queryFn: async () => {
      const [pedidosRes, profilesRes] = await Promise.all([
        supabase
          .from("pedidos")
          .select("representante_id, vendedor_id, valor_total, created_at")
          .in("status", ["Confirmado", "Enviado"])
          .gte("created_at", rangeStart.toISOString())
          .lte("created_at", weekEnd.toISOString()),
        supabase.from("profiles").select("user_id, nome"),
      ]);
      return {
        pedidos: (pedidosRes.data ?? []) as Pedido[],
        profiles: (profilesRes.data ?? []) as { user_id: string; nome: string }[],
      };
    },
  });

  const { rows, totals, chart } = useMemo(() => {
    const profileMap = new Map((data?.profiles ?? []).map((p) => [p.user_id, p.nome]));
    const ws = weekStart.getTime();
    const we = weekEnd.getTime();
    const ps = prevStart.getTime();

    const cur = new Map<string, { fat: number; ped: number }>();
    const prev = new Map<string, number>();
    const weekTotals = new Map<string, number>();

    for (const p of data?.pedidos ?? []) {
      const id = p.vendedor_id || p.representante_id || "—";
      const d = new Date(p.created_at);
      const wkStart = startOfWeek(d, WK);
      const wkKey = wkStart.toISOString().slice(0, 10);
      const valor = Number(p.valor_total || 0);
      weekTotals.set(wkKey, (weekTotals.get(wkKey) ?? 0) + valor);

      const t = d.getTime();
      if (t >= ws && t <= we) {
        const e = cur.get(id) ?? { fat: 0, ped: 0 };
        e.fat += valor;
        e.ped += 1;
        cur.set(id, e);
      } else if (wkStart.getTime() === ps) {
        prev.set(id, (prev.get(id) ?? 0) + valor);
      }
    }

    const rows: Linha[] = Array.from(cur.entries())
      .map(([id, e]) => {
        const prevFat = prev.get(id) ?? 0;
        const variacao = prevFat > 0 ? ((e.fat - prevFat) / prevFat) * 100 : null;
        return {
          id,
          representante: profileMap.get(id) || "Sem representante",
          pedidos: e.ped,
          faturamento: e.fat,
          ticketMedio: e.ped ? e.fat / e.ped : 0,
          variacao,
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);

    const totalFat = rows.reduce((s, r) => s + r.faturamento, 0);
    const totalPed = rows.reduce((s, r) => s + r.pedidos, 0);

    const chart: { semana: string; total: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const s = subWeeks(weekStart, i);
      const key = startOfWeek(s, WK).toISOString().slice(0, 10);
      chart.push({ semana: format(s, "dd/MM"), total: Math.round(weekTotals.get(key) ?? 0) });
    }

    return {
      rows,
      totals: {
        faturamento: totalFat,
        pedidos: totalPed,
        ticket: totalPed ? totalFat / totalPed : 0,
        reps: rows.length,
      },
      chart,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, offset]);

  const weekOptions = Array.from({ length: 12 }, (_, i) => {
    const s = subWeeks(baseStart, i);
    const e = endOfWeek(s, WK);
    return { i, label: `${format(s, "dd/MM")} – ${format(e, "dd/MM/yy")}${i === 0 ? " (atual)" : ""}` };
  });

  const exportCSV = () => {
    if (!rows.length) return toast.error("Nada para exportar nesta semana.");
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Representante", "Pedidos", "Faturamento", "Ticket medio", "vs semana anterior"]
      .map(esc).join(";");
    const lines = rows.map((r) =>
      [
        r.representante,
        r.pedidos,
        r.faturamento.toFixed(2).replace(".", ","),
        r.ticketMedio.toFixed(2).replace(".", ","),
        r.variacao == null ? "" : `${r.variacao.toFixed(0)}%`,
      ].map(esc).join(";")
    );
    const total = ["TOTAL", totals.pedidos, totals.faturamento.toFixed(2).replace(".", ","), "", ""]
      .map(esc).join(";");
    const csv = "﻿" + [header, ...lines, total].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-semanal-${format(weekStart, "dd-MM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  };

  const exportPDF = async () => {
    if (!rows.length) return toast.error("Nada para exportar nesta semana.");
    try {
      await gerarRelatorioSemanalPdf({
        periodoLabel,
        rows: rows.map((r) => ({
          representante: r.representante,
          pedidos: r.pedidos,
          faturamento: r.faturamento,
          ticketMedio: r.ticketMedio,
          variacao: r.variacao,
        })),
        totalFaturamento: totals.faturamento,
        totalPedidos: totals.pedidos,
      });
      toast.success("PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  const kpis = [
    { label: "Faturamento da semana", valor: fmtBRL(totals.faturamento), icon: Wallet },
    { label: "Pedidos", valor: String(totals.pedidos), icon: ShoppingCart },
    { label: "Ticket médio", valor: fmtBRL(totals.ticket), icon: BarChart3 },
    { label: "Representantes ativos", valor: String(totals.reps), icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório Semanal de Vendas</h1>
          <p className="text-sm text-muted-foreground">Por representante · semana de {periodoLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 1)} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={String(offset)} onValueChange={(v) => setOffset(Number(v))}>
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((w) => (
                <SelectItem key={w.i} value={String(w.i)}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <k.icon className="h-4 w-4" />
                <span className="text-xs">{k.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico últimas 8 semanas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturamento — últimas 8 semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `R$ ${(Number(v) / 1000).toFixed(0)}k`}
                  width={56}
                />
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  labelFormatter={(l) => `Semana de ${l}`}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela por representante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas por representante</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma venda confirmada nesta semana.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-medium">Representante</th>
                    <th className="py-2 px-3 font-medium text-center">Pedidos</th>
                    <th className="py-2 px-3 font-medium text-right">Faturamento</th>
                    <th className="py-2 px-3 font-medium text-right">Ticket médio</th>
                    <th className="py-2 pl-3 font-medium text-right">vs. anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{r.representante}</td>
                      <td className="py-2.5 px-3 text-center">{r.pedidos}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">{fmtBRL(r.faturamento)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtBRL(r.ticketMedio)}</td>
                      <td className="py-2.5 pl-3 text-right">
                        {r.variacao == null ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Minus className="h-3.5 w-3.5" /> —
                          </span>
                        ) : r.variacao >= 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <TrendingUp className="h-3.5 w-3.5" /> +{r.variacao.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <TrendingDown className="h-3.5 w-3.5" /> {r.variacao.toFixed(0)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-foreground">
                    <td className="py-3 pr-3">TOTAL</td>
                    <td className="py-3 px-3 text-center">{totals.pedidos}</td>
                    <td className="py-3 px-3 text-right">{fmtBRL(totals.faturamento)}</td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 pl-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
