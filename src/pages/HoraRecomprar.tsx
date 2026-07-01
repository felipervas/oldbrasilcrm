import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientesRetencao } from "@/hooks/useClientesRetencao";
import {
  STATUS_RETENCAO_META, descricaoUltimaCompra, sugestaoAcao,
  type StatusRetencao, type RetencaoResult,
} from "@/lib/retencao";
import { waLinkCliente } from "@/lib/guardiao";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageCircle, ShoppingCart, ArrowRight, CircleCheck, AlertTriangle } from "lucide-react";

interface ClienteRow {
  id: string;
  nome_loja: string;
  cidade: string | null;
  telefone: string | null;
  celular: string | null;
}

// Status que entram em "hora de recomprar / reativar" (do mais urgente ao menos)
const ALVOS: StatusRetencao[] = ["inativo", "em_risco", "atencao"];

export default function HoraRecomprar() {
  const navigate = useNavigate();
  const { retencaoMap, loading: loadingRet, error: errRet, refetch: refetchRet } = useClientesRetencao();
  const [filtro, setFiltro] = useState<StatusRetencao | "todos">("todos");

  const { data: clientes, isLoading: loadingCli } = useQuery({
    queryKey: ["clientes-recompra"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_loja, cidade, telefone, celular")
        .limit(5000);
      return (data ?? []) as ClienteRow[];
    },
  });

  const lista = useMemo(() => {
    const out: { cliente: ClienteRow; ret: RetencaoResult }[] = [];
    (clientes ?? []).forEach((c) => {
      const r = retencaoMap.get(c.id);
      if (!r || !ALVOS.includes(r.status_retencao)) return;
      if (filtro !== "todos" && r.status_retencao !== filtro) return;
      out.push({ cliente: c, ret: r });
    });
    out.sort((a, b) => {
      const oa = STATUS_RETENCAO_META[a.ret.status_retencao].ordem;
      const ob = STATUS_RETENCAO_META[b.ret.status_retencao].ordem;
      if (oa !== ob) return oa - ob;
      return (b.ret.dias_desde_ultima_compra ?? 0) - (a.ret.dias_desde_ultima_compra ?? 0);
    });
    return out;
  }, [clientes, retencaoMap, filtro]);

  const contagem = useMemo(() => {
    const c = { inativo: 0, em_risco: 0, atencao: 0 } as Record<string, number>;
    (clientes ?? []).forEach((cl) => {
      const r = retencaoMap.get(cl.id);
      if (r && c[r.status_retencao] !== undefined) c[r.status_retencao]++;
    });
    return c;
  }, [clientes, retencaoMap]);

  const loading = loadingRet || loadingCli;

  const FILTROS: { key: StatusRetencao | "todos"; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "atencao", label: `Atenção (${contagem.atencao})` },
    { key: "em_risco", label: `Em risco (${contagem.em_risco})` },
    { key: "inativo", label: `Inativos (${contagem.inativo})` },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-neu-sm">
          <RefreshCw className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hora de recomprar</h1>
          <p className="text-sm text-muted-foreground">Clientes que estão na hora de pedir de novo — pra ninguém esfriar na carteira.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button key={f.key} variant={filtro === f.key ? "default" : "outline"} size="sm" onClick={() => setFiltro(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Carregando…</p>
      ) : errRet ? (
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-9 w-9 mx-auto mb-3 text-warning" />
          <p className="font-medium text-foreground">Não consegui carregar os dados de recompra agora.</p>
          <p className="text-sm text-muted-foreground mb-4">Pode ser a conexão. Tente atualizar.</p>
          <Button variant="outline" size="sm" onClick={() => refetchRet()}>Tentar de novo</Button>
        </CardContent></Card>
      ) : lista.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <CircleCheck className="h-10 w-10 mx-auto mb-3 text-success" />
          <p className="font-medium text-foreground">Carteira em dia!</p>
          <p className="text-sm text-muted-foreground">Ninguém atrasado pra recomprar neste filtro.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {lista.map(({ cliente, ret }) => {
            const meta = STATUS_RETENCAO_META[ret.status_retencao];
            const wa = waLinkCliente(cliente);
            const acao = sugestaoAcao(ret.status_retencao).acao;
            return (
              <Card key={cliente.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{cliente.nome_loja}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cliente.cidade ? `${cliente.cidade} · ` : ""}{descricaoUltimaCompra(ret.dias_desde_ultima_compra)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap border ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">Sugestão: </span>{acao}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/pedidos/novo?cliente=${cliente.id}`)}>
                      <ShoppingCart className="h-4 w-4 mr-1.5" /> Novo pedido
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                      Abrir <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    {wa && (
                      <Button variant="outline" size="sm" onClick={() => window.open(wa, "_blank")}>
                        <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
