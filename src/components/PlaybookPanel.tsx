import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { usePlaybookForOpportunity } from "@/hooks/usePlaybook";
import { usePlaybookRespostas, getFieldConfig, isRespostaCompleta } from "@/hooks/usePlaybookRespostas";
import { useBant, bantCompleteness } from "@/hooks/useBant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { WhatsAppSendDialog } from "@/components/WhatsAppSendDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFollowups } from "@/hooks/useFollowups";
import {
  BookOpen, Target, ListChecks, MessageSquareQuote, HelpCircle, ShieldAlert,
  ArrowRight, MessageCircle, CheckCircle2, Lock, Save, CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  opportunityId: string;
  stageId: string;
  companyId: string;
  ownerId: string;
  clientId?: string | null;
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteCelular?: string | null;
  onStageChanged?: () => void;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && "-" + c].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

function ChecklistItemForm({
  itemKey,
  initial,
  onSave,
}: {
  itemKey: string;
  initial: Record<string, any> | undefined;
  onSave: (resposta: Record<string, any>) => Promise<void>;
}) {
  const cfg = getFieldConfig(itemKey)!;
  const [local, setLocal] = useState<Record<string, any>>(initial ?? {});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setLocal(initial ?? {}); }, [initial]);

  const handle = async () => {
    setBusy(true);
    await onSave(local);
    setBusy(false);
  };

  return (
    <div className="mt-2 ml-7 space-y-2 p-3 rounded-md border border-border/60 bg-card">
      {cfg.field.kind === "select_text" && (
        <>
          <div>
            <Label className="text-xs">{cfg.label} *</Label>
            <Select value={local.opcao ?? ""} onValueChange={(v) => setLocal(p => ({ ...p, opcao: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {cfg.field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {cfg.field.placeholder && (
            <div>
              <Label className="text-xs text-muted-foreground">Detalhes (opcional)</Label>
              <Input
                placeholder={cfg.field.placeholder}
                value={local.texto ?? ""}
                onChange={(e) => setLocal(p => ({ ...p, texto: e.target.value }))}
              />
            </div>
          )}
        </>
      )}
      {cfg.field.kind === "phone_validate" && (
        <div>
          <Label className="text-xs">{cfg.label} *</Label>
          <Input
            inputMode="tel"
            placeholder={cfg.field.placeholder}
            value={local.telefone ?? ""}
            onChange={(e) => setLocal(p => ({ ...p, telefone: maskPhone(e.target.value) }))}
          />
          <p className="text-[10px] text-muted-foreground mt-1">Mínimo 10 dígitos. WhatsApp validado quando preenchido.</p>
        </div>
      )}
      {cfg.field.kind === "url_text" && (
        <>
          <div>
            <Label className="text-xs">{cfg.label} *</Label>
            <Input
              placeholder={cfg.field.placeholder}
              value={local.url ?? ""}
              onChange={(e) => setLocal(p => ({ ...p, url: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea
              rows={2}
              placeholder="Anotações da pesquisa"
              value={local.observacoes ?? ""}
              onChange={(e) => setLocal(p => ({ ...p, observacoes: e.target.value }))}
            />
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handle} disabled={busy}>
          <Save className="h-3.5 w-3.5 mr-1" /> {busy ? "Salvando..." : "Salvar e marcar"}
        </Button>
      </div>
    </div>
  );
}

function isFollowupItem(item: string): boolean {
  return /agendar.*follow|follow[\s-]?up/i.test(item);
}

function defaultFollowupDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function PlaybookPanel({
  opportunityId,
  stageId,
  companyId,
  ownerId,
  clientId,
  clienteNome,
  clienteTelefone,
  clienteCelular,
  onStageChanged,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stages } = usePipelineStages();
  const { script, progress, loading, toggleItem } = usePlaybookForOpportunity(opportunityId, stageId);
  const { respostas, upsertResposta } = usePlaybookRespostas(opportunityId, stageId);
  const { bant } = useBant(opportunityId);
  const { create: createFollowup } = useFollowups();
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState<string>("");
  const [advancing, setAdvancing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [followupDialog, setFollowupDialog] = useState<{ open: boolean; item: string | null; date: string; time: string; subject: string; notes: string }>({
    open: false, item: null, date: defaultFollowupDate(), time: "09:00", subject: "", notes: "",
  });
  const [savingFollowup, setSavingFollowup] = useState(false);

  const currentStage = useMemo(() => stages.find(s => s.id === stageId), [stages, stageId]);
  const currentIndex = useMemo(() => stages.findIndex(s => s.id === stageId), [stages, stageId]);
  const nextStage = useMemo(() => {
    for (let i = currentIndex + 1; i < stages.length; i++) {
      if (stages[i].name !== "Fechado perdido") return stages[i];
    }
    return null;
  }, [stages, currentIndex]);

  const checklistKeys = script?.checklist ?? [];

  // Item considerado "feito" se: tem campo e resposta válida; OU não tem campo e checkbox de progresso marcado.
  const isItemDone = (item: string) => {
    const cfg = getFieldConfig(item);
    if (cfg) return isRespostaCompleta(item, respostas[item]?.resposta);
    return !!progress[item];
  };

  const completedCount = checklistKeys.filter(isItemDone).length;
  const totalCount = checklistKeys.length;
  const allChecklistDone = totalCount > 0 && completedCount === totalCount;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Bloqueio adicional por etapa:
  // Para sair da "Qualificação BANT" → BANT precisa estar completo.
  const isBantStage = currentStage?.name === "Qualificação BANT";
  const bantStatus = bantCompleteness(bant);
  const allRequirementsDone = allChecklistDone && (!isBantStage || bantStatus.isComplete);

  const handleSendScript = (text: string) => {
    setWaMessage(text);
    setWaOpen(true);
  };

  const handleToggleSimple = (item: string) => {
    if (!user) return;
    const cfg = getFieldConfig(item);
    if (cfg) {
      // Item com campo: alterna formulário expandido
      setExpandedItem(prev => prev === item ? null : item);
      return;
    }
    toggleItem(item, user.id);
  };

  const handleSaveResposta = async (item: string, resposta: Record<string, any>) => {
    if (!user) return;
    const { error } = await upsertResposta(item, resposta, user.id);
    if (error) { toast.error("Erro ao salvar resposta"); return; }
    toast.success("Resposta salva");
    setExpandedItem(null);
  };

  const openFollowupDialog = (item: string) => {
    if (!clientId) {
      toast.error("Cliente não vinculado à oportunidade");
      return;
    }
    setFollowupDialog({
      open: true,
      item,
      date: defaultFollowupDate(),
      time: "09:00",
      subject: `Follow-up — ${clienteNome}`,
      notes: "",
    });
  };

  const handleSaveFollowup = async () => {
    if (!user || !clientId || !followupDialog.item) return;
    if (!followupDialog.subject.trim()) { toast.error("Informe o assunto"); return; }
    setSavingFollowup(true);
    const { error } = await createFollowup({
      client_id: clientId,
      opportunity_id: opportunityId,
      due_date: followupDialog.date,
      due_time: followupDialog.time || null,
      type: "followup",
      subject: followupDialog.subject.trim(),
      notes: followupDialog.notes.trim() || null,
    });
    setSavingFollowup(false);
    if (error) { toast.error("Erro ao agendar follow-up"); return; }
    // marca o item do checklist como concluído
    if (!progress[followupDialog.item]) {
      await toggleItem(followupDialog.item, user.id);
    }
    toast.success("Follow-up agendado na agenda");
    setFollowupDialog(p => ({ ...p, open: false, item: null }));
  };

  const handleAdvance = async () => {
    if (!nextStage || !user) return;
    setAdvancing(true);
    try {
      const updates: { stage_id: string; probability: number; status?: string } = {
        stage_id: nextStage.id,
        probability: nextStage.default_probability,
      };
      if (nextStage.name === "Fechado ganho") updates.status = "won";

      const { error } = await supabase
        .from("opportunities")
        .update(updates)
        .eq("id", opportunityId);

      if (error) throw error;

      await supabase.from("timeline_events").insert({
        opportunity_id: opportunityId,
        company_id: companyId,
        user_id: ownerId,
        event_type: "stage_change",
        description: `Avançou para: ${nextStage.name} (via Playbook)`,
      });

      toast.success(`Avançado para "${nextStage.name}"`);
      onStageChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao avançar etapa.");
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-secondary/30 shadow-sm">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!script) {
    return (
      <Card className="border-dashed border-secondary/40">
        <CardContent className="p-6 text-center space-y-2">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum script configurado para a etapa <strong>{currentStage?.name}</strong>.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/playbook")}>Configurar playbook</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-secondary/30 shadow-md bg-gradient-to-br from-secondary/5 via-card to-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-secondary/15 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-base">Playbook de Vendas</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Etapa atual: <strong style={{ color: currentStage?.color }}>{currentStage?.name}</strong>
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount}/{totalCount}
            </Badge>
          </div>

          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
            <Target className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Objetivo</p>
              <p className="text-sm text-foreground mt-0.5">{script.objetivo || "—"}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {totalCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Progresso do checklist</span>
                <span className="text-xs font-medium">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          )}

          <Accordion type="multiple" defaultValue={["checklist", "script"]} className="space-y-2">
            {checklistKeys.length > 0 && (
              <AccordionItem value="checklist" className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-secondary" /> Checklist ({totalCount})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {checklistKeys.map((item, idx) => {
                      const cfg = getFieldConfig(item);
                      const done = isItemDone(item);
                      const expanded = expandedItem === item;
                      const resposta = respostas[item]?.resposta;
                      return (
                        <div key={`${item}-${idx}`}>
                          <div
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-md border transition-colors min-h-[44px]",
                              done
                                ? "bg-green-50 border-green-300/60 dark:bg-green-950/30 dark:border-green-800"
                                : "bg-muted/30 border-border hover:bg-muted/60",
                              cfg && "cursor-pointer"
                            )}
                            onClick={cfg ? () => setExpandedItem(prev => prev === item ? null : item) : undefined}
                          >
                            <Checkbox
                              checked={done}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={() => handleToggleSimple(item)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-sm block", done && "line-through text-muted-foreground")}>{item}</span>
                              {cfg && resposta && done && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                  {cfg.field.kind === "select_text" && `${resposta.opcao ?? ""}${resposta.texto ? " · " + resposta.texto : ""}`}
                                  {cfg.field.kind === "phone_validate" && resposta.telefone}
                                  {cfg.field.kind === "url_text" && resposta.url}
                                </p>
                              )}
                              {cfg && !done && (
                                <span className="text-[11px] text-secondary font-medium">Toque para preencher →</span>
                              )}
                            </div>
                            {isFollowupItem(item) && !cfg && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 shrink-0 text-[11px] border-secondary/40 text-secondary hover:bg-secondary/10"
                                onClick={(e) => { e.stopPropagation(); openFollowupDialog(item); }}
                              >
                                <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Marcar na agenda
                              </Button>
                            )}
                          </div>
                          {cfg && expanded && (
                            <ChecklistItemForm
                              itemKey={item}
                              initial={resposta}
                              onSave={(r) => handleSaveResposta(item, r)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {script.script_abordagem.length > 0 && (
              <AccordionItem value="script" className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                  <span className="flex items-center gap-2"><MessageSquareQuote className="h-4 w-4 text-secondary" /> Script de abordagem</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {script.script_abordagem.map((msg, idx) => (
                      <div key={idx} className="p-3 rounded-md bg-muted/40 border border-border space-y-2">
                        <p className="text-sm text-foreground italic leading-relaxed">"{msg}"</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendScript(msg)} className="h-8 text-[11px] text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950">
                          <MessageCircle className="h-3 w-3 mr-1" /> Enviar via WhatsApp
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {script.perguntas_chave.length > 0 && (
              <AccordionItem value="perguntas" className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                  <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-secondary" /> Perguntas-chave</span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5 pb-2">
                    {script.perguntas_chave.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-secondary font-bold mt-0.5">›</span>
                        <span className="text-foreground">{p}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {script.objecoes.length > 0 && (
              <AccordionItem value="objecoes" className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                  <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-secondary" /> Objeções comuns ({script.objecoes.length})</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {script.objecoes.map((o, idx) => (
                      <div key={idx} className="p-2.5 rounded-md bg-muted/30 border border-border">
                        <p className="text-sm font-semibold text-destructive">"{o.q}"</p>
                        <p className="text-sm text-foreground mt-1">→ {o.r}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {script.criterio_avanco && (
              <AccordionItem value="criterio" className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-secondary" /> Critério de avanço</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-foreground pb-2">{script.criterio_avanco}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <div className="pt-2 border-t border-border/50 space-y-2">
            {isBantStage && !bantStatus.isComplete && (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-2">
                <Lock className="h-3.5 w-3.5" />
                Preencha a aba <strong>Qualificação BANT</strong> ({bantStatus.completed}/{bantStatus.total}) para avançar.
              </div>
            )}
            {nextStage ? (
              <Button
                type="button"
                onClick={handleAdvance}
                disabled={!allRequirementsDone || advancing}
                className={cn(
                  "w-full h-11",
                  allRequirementsDone
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {!allRequirementsDone && <Lock className="h-4 w-4 mr-2" />}
                {allRequirementsDone ? <ArrowRight className="h-4 w-4 mr-2" /> : null}
                {allRequirementsDone
                  ? `Avançar para "${nextStage.name}"`
                  : `Conclua os requisitos para avançar (${completedCount}/${totalCount})`}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Última etapa do funil.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {waOpen && (
        <WhatsAppSendDialog
          open={waOpen}
          onOpenChange={setWaOpen}
          clienteId={companyId}
          clienteNome={clienteNome}
          clienteTelefone={clienteTelefone}
          clienteCelular={clienteCelular}
          opportunityId={opportunityId}
          extraVars={{ etapa_funil: currentStage?.name ?? "", mensagem_script: waMessage }}
          defaultTemplateKey="followup_pipeline"
          templateKeys={["followup_pipeline", "saudacao_inicial", "followup_quente"]}
          title="Enviar script via WhatsApp"
        />
      )}

      <Dialog open={followupDialog.open} onOpenChange={(o) => setFollowupDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-secondary" /> Marcar follow-up na agenda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Assunto *</Label>
              <Input
                value={followupDialog.subject}
                onChange={(e) => setFollowupDialog(p => ({ ...p, subject: e.target.value }))}
                placeholder="Ex.: Retornar contato com proposta"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data *</Label>
                <Input
                  type="date"
                  value={followupDialog.date}
                  onChange={(e) => setFollowupDialog(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  value={followupDialog.time}
                  onChange={(e) => setFollowupDialog(p => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                rows={2}
                value={followupDialog.notes}
                onChange={(e) => setFollowupDialog(p => ({ ...p, notes: e.target.value }))}
                placeholder="Detalhes opcionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialog(p => ({ ...p, open: false }))}>Cancelar</Button>
            <Button onClick={handleSaveFollowup} disabled={savingFollowup}>
              <CalendarPlus className="h-4 w-4 mr-1" /> {savingFollowup ? "Agendando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
