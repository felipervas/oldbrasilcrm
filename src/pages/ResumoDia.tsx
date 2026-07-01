import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFollowups } from "@/hooks/useFollowups";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useClientesRetencao } from "@/hooks/useClientesRetencao";
import { listarEsfriando } from "@/lib/guardiao";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sun, Clock, ShieldCheck, RefreshCw, ArrowRight, CircleCheck, CalendarCheck,
} from "lucide-react";
import { startOfToday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALVOS_RET = ["inativo", "em_risco", "atencao"];

export default function ResumoDia() {
  const navigate = useNavigate();
  const { followups, fetch, loading: loadingFu } = useFollowups();
  const { opportunities, loading: loadingOpp } = useOpportunities();
  const { retencaoMap, loading: loadingRet } = useClientesRetencao();
  const carregando = loadingFu || loadingOpp || loadingRet;

  useEffect(() => { fetch(); }, [fetch]);

  const hojeStr = format(new Date(), "yyyy-MM-dd");
  const saudacao = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  })();

  const tarefasHoje = useMemo(
    () => followups.filter((f) => f.due_date === hojeStr && !["concluido", "cancelado"].includes(f.status)),
    [followups, hojeStr]
  );
  const atrasadas = useMemo(
    () => followups.filter((f) => f.due_date < hojeStr && !["concluido", "cancelado"].includes(f.status)),
    [followups, hojeStr]
  );
  const esfriando = useMemo(() => listarEsfriando(opportunities, startOfToday()), [opportunities]);
  const reativarCount = useMemo(
    () => [...retencaoMap.values()].filter((r) => ALVOS_RET.includes(r.status_retencao)).length,
    [retencaoMap]
  );

  const cards = [
    { label: "Tarefas de hoje", n: tarefasHoje.length, icon: CalendarCheck, to: "/agenda" },
    { label: "Funil esfriando", n: esfriando.length, icon: ShieldCheck, to: "/guardiao" },
    { label: "Pra recomprar", n: reativarCount, icon: RefreshCw, to: "/recompra" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-neu-sm">
          <Sun className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{saudacao}! Resumo do dia</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => navigate(c.to)} className="text-left">
            <Card className="hover:shadow-neu-inset transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <c.icon className="h-4 w-4" /><span className="text-xs">{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{carregando ? "…" : c.n}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Tarefas de hoje */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Tarefas de hoje</h2>
          {atrasadas.length > 0 && (
            <span className="text-xs font-medium text-destructive">{atrasadas.length} atrasada{atrasadas.length === 1 ? "" : "s"}</span>
          )}
        </div>
        {carregando ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : tarefasHoje.length === 0 && atrasadas.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            <CircleCheck className="h-7 w-7 mx-auto mb-2 text-success" /> Nada agendado pra hoje.
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {[...atrasadas, ...tarefasHoje].slice(0, 8).map((f) => {
              const venceu = f.due_date < hojeStr;
              return (
                <Card key={f.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${venceu ? "bg-destructive" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.clientes?.nome_loja || "Cliente"}{f.due_time ? ` · ${f.due_time.slice(0, 5)}` : ""}{venceu ? " · atrasada" : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(f.client_id ? `/clientes/${f.client_id}` : "/agenda")}>
                      Abrir
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Funil esfriando — topo */}
      {esfriando.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Funil esfriando</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/guardiao")}>Ver todos <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
          </div>
          <div className="space-y-2">
            {esfriando.slice(0, 3).map((a) => (
              <Card key={a.opp.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${a.risco === "alto" ? "bg-destructive" : "bg-warning"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.opp.clientes?.nome_loja || a.opp.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.motivos[0]} · {a.sugestao}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/oportunidades/${a.opp.id}`)}>Abrir</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
