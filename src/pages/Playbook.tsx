import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { usePlaybookScripts, upsertPlaybookScript, PlaybookScript, PlaybookObjection } from "@/hooks/usePlaybook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Plus, Trash2, Save, ListChecks, MessageSquareQuote, HelpCircle, ShieldAlert, Target, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  objetivo: string;
  checklist: string[];
  script_abordagem: string[];
  perguntas_chave: string[];
  objecoes: PlaybookObjection[];
  criterio_avanco: string;
}

const empty: FormState = {
  objetivo: "",
  checklist: [],
  script_abordagem: [],
  perguntas_chave: [],
  objecoes: [],
  criterio_avanco: "",
};

function fromScript(s: PlaybookScript | undefined): FormState {
  if (!s) return { ...empty };
  return {
    objetivo: s.objetivo,
    checklist: [...s.checklist],
    script_abordagem: [...s.script_abordagem],
    perguntas_chave: [...s.perguntas_chave],
    objecoes: s.objecoes.map(o => ({ ...o })),
    criterio_avanco: s.criterio_avanco,
  };
}

export default function Playbook() {
  const navigate = useNavigate();
  const { isAdminOrGestor, loading: roleLoading } = useUserRole();
  const { stages, loading: stagesLoading } = usePipelineStages();
  const { scripts, loading: scriptsLoading, refetch } = usePlaybookScripts();

  const editableStages = useMemo(
    () => stages.filter(s => s.name !== "Fechado perdido"),
    [stages]
  );

  const [activeStageId, setActiveStageId] = useState<string>("");
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeStageId && editableStages.length > 0) {
      setActiveStageId(editableStages[0].id);
    }
  }, [editableStages, activeStageId]);

  useEffect(() => {
    if (!activeStageId) return;
    const current = scripts.find(s => s.stage_id === activeStageId);
    setForm(fromScript(current));
  }, [activeStageId, scripts]);

  const loading = roleLoading || stagesLoading || scriptsLoading;

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdminOrGestor) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">
          Apenas administradores e gestores podem editar o playbook de vendas.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const updateList = (key: keyof FormState, idx: number, value: string) => {
    setForm(prev => {
      const arr = [...(prev[key] as string[])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };
  const addItem = (key: keyof FormState) => {
    setForm(prev => ({ ...prev, [key]: [...(prev[key] as string[]), ""] }));
  };
  const removeItem = (key: keyof FormState, idx: number) => {
    setForm(prev => {
      const arr = [...(prev[key] as string[])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  };

  const updateObj = (idx: number, field: "q" | "r", value: string) => {
    setForm(prev => {
      const arr = prev.objecoes.map((o, i) => i === idx ? { ...o, [field]: value } : o);
      return { ...prev, objecoes: arr };
    });
  };
  const addObj = () => {
    setForm(prev => ({ ...prev, objecoes: [...prev.objecoes, { q: "", r: "" }] }));
  };
  const removeObj = (idx: number) => {
    setForm(prev => {
      const arr = [...prev.objecoes];
      arr.splice(idx, 1);
      return { ...prev, objecoes: arr };
    });
  };

  const handleSave = async () => {
    if (!activeStageId) return;
    setSaving(true);
    const cleanForm: FormState = {
      ...form,
      checklist: form.checklist.map(s => s.trim()).filter(Boolean),
      script_abordagem: form.script_abordagem.map(s => s.trim()).filter(Boolean),
      perguntas_chave: form.perguntas_chave.map(s => s.trim()).filter(Boolean),
      objecoes: form.objecoes.filter(o => o.q.trim() || o.r.trim()),
      objetivo: form.objetivo.trim(),
      criterio_avanco: form.criterio_avanco.trim(),
    };
    const { error } = await upsertPlaybookScript(activeStageId, cleanForm);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar script.");
      return;
    }
    toast.success("Script salvo!");
    refetch();
  };

  const activeStage = stages.find(s => s.id === activeStageId);
  const hasScript = scripts.some(s => s.stage_id === activeStageId);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-secondary" /> Playbook de Vendas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Edite os scripts que orientam o vendedor em cada etapa do funil.
          </p>
        </div>
      </div>

      <Tabs value={activeStageId} onValueChange={setActiveStageId}>
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-1">
          {editableStages.map(s => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs gap-1.5 data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {editableStages.map(s => (
          <TabsContent key={s.id} value={s.id} className="mt-4 space-y-4">
            <Card className="border-secondary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeStage?.color }} />
                    {activeStage?.name}
                  </CardTitle>
                  <Badge variant={hasScript ? "default" : "outline"} className={hasScript ? "bg-secondary text-secondary-foreground" : ""}>
                    {hasScript ? "Configurado" : "Sem script"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Objetivo */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold uppercase tracking-wide text-secondary">
                    <Target className="h-3.5 w-3.5" /> Objetivo da etapa
                  </Label>
                  <Input
                    value={form.objetivo}
                    onChange={(e) => setForm(f => ({ ...f, objetivo: e.target.value }))}
                    placeholder="Ex: Confirmar interesse e agendar contato inicial"
                  />
                </div>

                <Separator />

                {/* Checklist */}
                <ListEditor
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  label="Checklist (ações para concluir antes de avançar)"
                  items={form.checklist}
                  onChange={(idx, v) => updateList("checklist", idx, v)}
                  onAdd={() => addItem("checklist")}
                  onRemove={(idx) => removeItem("checklist", idx)}
                  placeholder="Ex: Validar telefone do cliente"
                />

                <Separator />

                {/* Script abordagem */}
                <ListEditor
                  icon={<MessageSquareQuote className="h-3.5 w-3.5" />}
                  label="Script de abordagem (mensagens sugeridas)"
                  items={form.script_abordagem}
                  onChange={(idx, v) => updateList("script_abordagem", idx, v)}
                  onAdd={() => addItem("script_abordagem")}
                  onRemove={(idx) => removeItem("script_abordagem", idx)}
                  placeholder="Ex: Olá {{cliente}}, aqui é {{vendedor}}..."
                  textarea
                  helper="Use variáveis como {{cliente}}, {{vendedor}}, {{etapa_funil}}."
                />

                <Separator />

                {/* Perguntas-chave */}
                <ListEditor
                  icon={<HelpCircle className="h-3.5 w-3.5" />}
                  label="Perguntas-chave para descobrir a dor"
                  items={form.perguntas_chave}
                  onChange={(idx, v) => updateList("perguntas_chave", idx, v)}
                  onAdd={() => addItem("perguntas_chave")}
                  onRemove={(idx) => removeItem("perguntas_chave", idx)}
                  placeholder="Ex: Qual sua maior dificuldade hoje?"
                />

                <Separator />

                {/* Objeções */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold uppercase tracking-wide text-secondary">
                    <ShieldAlert className="h-3.5 w-3.5" /> Objeções comuns e respostas
                  </Label>
                  {form.objecoes.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma objeção cadastrada.</p>
                  )}
                  {form.objecoes.map((o, idx) => (
                    <div key={idx} className="grid gap-2 p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Objeção</Label>
                          <Input
                            value={o.q}
                            onChange={(e) => updateObj(idx, "q", e.target.value)}
                            placeholder="Ex: Não tenho tempo"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0 mt-6"
                          onClick={() => removeObj(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Resposta sugerida</Label>
                        <Textarea
                          value={o.r}
                          onChange={(e) => updateObj(idx, "r", e.target.value)}
                          rows={2}
                          placeholder="Ex: Entendo, me dê só 3 minutos..."
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addObj} className="w-full">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar objeção
                  </Button>
                </div>

                <Separator />

                {/* Critério avanço */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold uppercase tracking-wide text-secondary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Critério de avanço
                  </Label>
                  <Textarea
                    value={form.criterio_avanco}
                    onChange={(e) => setForm(f => ({ ...f, criterio_avanco: e.target.value }))}
                    rows={2}
                    placeholder="O que precisa estar verdadeiro para mover para a próxima etapa"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Salvando..." : "Salvar script desta etapa"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ListEditor({
  icon, label, items, onChange, onAdd, onRemove, placeholder, textarea = false, helper,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  onChange: (idx: number, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
  textarea?: boolean;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5 font-semibold uppercase tracking-wide text-secondary">
        {icon} {label}
      </Label>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum item cadastrado.</p>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          {textarea ? (
            <Textarea
              value={item}
              onChange={(e) => onChange(idx, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="flex-1"
            />
          ) : (
            <Input
              value={item}
              onChange={(e) => onChange(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive shrink-0"
            onClick={() => onRemove(idx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
      </Button>
    </div>
  );
}
