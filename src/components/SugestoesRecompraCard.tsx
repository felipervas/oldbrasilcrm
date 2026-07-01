import { useNavigate } from "react-router-dom";
import { useRecompraSugestoes } from "@/hooks/useRecompraSugestoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Image as ImageIcon, Plus, Clock, TrendingUp, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clienteId: string;
}

export function SugestoesRecompraCard({ clienteId }: Props) {
  const data = useRecompraSugestoes(clienteId);
  const navigate = useNavigate();

  if (data.loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data.hasHistory) {
    return (
      <Card className="border-0 shadow-sm border-l-4 border-l-muted">
        <CardContent className="p-4 flex items-center gap-3">
          <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">Ainda sem histórico para sugestões.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "border-0 shadow-md",
        data.naJanela
          ? "border-l-4 border-l-secondary bg-gradient-to-br from-secondary/5 to-transparent"
          : "border-l-4 border-l-primary/40"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            Sugestões de Recompra
            {data.naJanela && (
              <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-[10px] ml-auto">
                Na hora de oferecer
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pedidos</p>
              <p className="text-lg font-bold text-foreground">{data.totalPedidos}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Intervalo médio</p>
              <p className="text-lg font-bold text-foreground">
                {data.intervaloMedio !== null ? `${data.intervaloMedio}d` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Última compra</p>
              <p className="text-lg font-bold text-foreground">
                {data.diasDesdeUltima !== null ? `${data.diasDesdeUltima}d` : "—"}
              </p>
            </div>
          </div>

          {/* Status da janela */}
          {data.naJanela ? (
            <div className="flex items-center gap-2 text-xs text-secondary font-medium px-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Cliente entrou na janela esperada de recompra. Hora de agir!</span>
            </div>
          ) : data.diasParaProxima !== null && data.diasParaProxima > 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Próxima recompra esperada em <strong className="text-foreground">{data.diasParaProxima} dias</strong></span>
            </div>
          ) : null}

          {/* Lista de produtos */}
          {data.produtosSugeridos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Sem produtos recorrentes identificados nos últimos pedidos.
            </p>
          ) : (
            <div className="space-y-2">
              {data.produtosSugeridos.map(p => (
                <div
                  key={p.produto_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{p.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.marca && <span className="text-[11px] text-muted-foreground">{p.marca}</span>}
                      <span className="text-xs font-bold text-secondary">
                        R$ {p.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 ml-auto">
                        {p.vezes_comprado}× comprado
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/pedidos/novo?cliente=${clienteId}`)}
                    className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/90 h-9 px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Pedido
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
