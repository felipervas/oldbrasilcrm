import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, AlertTriangle, Clock, Wallet, ArrowRight, MessageCircle, CircleCheck,
} from "lucide-react";
import { startOfToday } from "date-fns";
import { listarEsfriando, waLinkCliente } from "@/lib/guardiao";

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function GuardiaoFunil() {
  const { opportunities, loading, error: errOpp, refetch } = useOpportunities();
  const { stages } = usePipelineStages();
  const navigate = useNavigate();

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const { alertas, totalValor, altos } = useMemo(() => {
    const list = listarEsfriando(opportunities, startOfToday());
    return {
      alertas: list,
      totalValor: list.reduce((s, a) => s + (a.opp.estimated_value || 0), 0),
      altos: list.filter((a) => a.risco === "alto").length,
    };
  }, [opportunities]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-neu-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guardião do Funil</h1>
          <p className="text-sm text-muted-foreground">Negócios que estão esfriando e o próximo passo de cada um.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Esfriando</span></div>
          <p className="text-xl font-bold text-foreground">{alertas.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs">Risco alto</span></div>
          <p className="text-xl font-bold text-destructive">{altos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Wallet className="h-4 w-4" /><span className="text-xs">Valor em risco</span></div>
          <p className="text-xl font-bold text-foreground">{fmtBRL(totalValor)}</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Carregando…</p>
      ) : errOpp ? (
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-9 w-9 mx-auto mb-3 text-warning" />
          <p className="font-medium text-foreground">Não consegui carregar o funil agora.</p>
          <p className="text-sm text-muted-foreground mb-4">Pode ser a conexão. Tente atualizar.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar de novo</Button>
        </CardContent></Card>
      ) : alertas.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <CircleCheck className="h-10 w-10 mx-auto mb-3 text-success" />
          <p className="font-medium text-foreground">Tudo em dia!</p>
          <p className="text-sm text-muted-foreground">Nenhum negócio esfriando agora. Continue assim. 👏</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => {
            const stage = stageById.get(a.opp.stage_id);
            const wa = waLinkCliente(a.opp.clientes);
            return (
              <Card key={a.opp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">
                        {a.opp.clientes?.nome_loja || a.opp.title || "Negócio"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {stage && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ background: stage.color || "hsl(var(--primary))" }} />
                            {stage.name}
                          </span>
                        )}
                        <span>· {fmtBRL(a.opp.estimated_value || 0)}</span>
                        {a.opp.clientes?.cidade && <span>· {a.opp.clientes.cidade}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${a.risco === "alto" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"}`}>
                      {a.risco === "alto" ? "Risco alto" : "Atenção"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {a.motivos.map((m, i) => (
                      <span key={i} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{m}</span>
                    ))}
                  </div>

                  <p className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">Sugestão: </span>{a.sugestao}
                  </p>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/oportunidades/${a.opp.id}`)}>
                      Abrir negócio <ArrowRight className="h-4 w-4 ml-1.5" />
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
