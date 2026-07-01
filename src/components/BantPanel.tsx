import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBant, BantData, bantCompleteness, emptyBant } from "@/hooks/useBant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, UserCheck2, AlertCircle, CalendarClock, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  opportunityId: string;
}

const TIMING_OPTIONS = [
  { value: "imediato", label: "Imediato" },
  { value: "30d", label: "Em até 30 dias" },
  { value: "60d", label: "Em até 60 dias" },
  { value: "90d_mais", label: "90 dias ou mais" },
  { value: "data", label: "Data específica" },
];

export function BantPanel({ opportunityId }: Props) {
  const { user } = useAuth();
  const { bant, loading, save } = useBant(opportunityId);
  const [form, setForm] = useState<BantData>(emptyBant(opportunityId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bant) setForm(bant);
  }, [bant]);

  const { completed, total, isComplete } = bantCompleteness(form);
  const percent = Math.round((completed / total) * 100);

  const set = <K extends keyof BantData>(k: K, v: BantData[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await save(form, user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar BANT");
      return;
    }
    toast.success("Qualificação BANT salva");
  };

  if (loading) {
    return (
      <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-32 w-full" /></CardContent></Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Qualificação BANT</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Budget · Authority · Need · Timing — necessário para avançar para Proposta
              </p>
            </div>
          </div>
          <Badge variant={isComplete ? "default" : "outline"} className={cn("gap-1", isComplete && "bg-green-600 hover:bg-green-700 text-white")}>
            {completed}/{total} preenchidos
          </Badge>
        </div>
        <div className="mt-3">
          <Progress value={percent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Budget */}
        <section className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-secondary" /><h4 className="text-sm font-semibold">Budget (orçamento)</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Compra mensal estimada (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 2500"
                value={form.budget_valor_estimado ?? ""}
                onChange={(e) => set("budget_valor_estimado", e.target.value === "" ? null : Number(e.target.value.replace(",", ".")))}
              />
            </div>
            <div>
              <Label className="text-xs">Observações sobre orçamento</Label>
              <Input
                placeholder="Ex: trabalha com R$2k–3k/mês"
                value={form.budget_texto ?? ""}
                onChange={(e) => set("budget_texto", e.target.value || null)}
              />
            </div>
          </div>
        </section>

        {/* Authority */}
        <section className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2"><UserCheck2 className="h-4 w-4 text-secondary" /><h4 className="text-sm font-semibold">Authority (decisor)</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nome do decisor *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={form.authority_nome ?? ""}
                onChange={(e) => set("authority_nome", e.target.value || null)}
              />
            </div>
            <div>
              <Label className="text-xs">Cargo *</Label>
              <Input
                placeholder="Ex: Proprietário, Sócio, Comprador"
                value={form.authority_cargo ?? ""}
                onChange={(e) => set("authority_cargo", e.target.value || null)}
              />
            </div>
          </div>
        </section>

        {/* Need */}
        <section className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-secondary" /><h4 className="text-sm font-semibold">Need (necessidade / dor)</h4></div>
          <Textarea
            placeholder="Descreva a dor do cliente — ex: precisa de fornecedor de bases mais consistentes, busca opções premium, etc."
            value={form.need_descricao ?? ""}
            onChange={(e) => set("need_descricao", e.target.value || null)}
            rows={3}
          />
        </section>

        {/* Timing */}
        <section className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-secondary" /><h4 className="text-sm font-semibold">Timing (prazo de decisão)</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quando decide *</Label>
              <Select value={form.timing_tipo ?? ""} onValueChange={(v) => set("timing_tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {TIMING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.timing_tipo === "data" && (
              <div>
                <Label className="text-xs">Data prevista *</Label>
                <Input
                  type="date"
                  value={form.timing_data ?? ""}
                  onChange={(e) => set("timing_data", e.target.value || null)}
                />
              </div>
            )}
          </div>
        </section>

        <div>
          <Label className="text-xs">Observações gerais</Label>
          <Textarea
            placeholder="Notas adicionais sobre a qualificação"
            value={form.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value || null)}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {isComplete ? "Pronto para avançar à etapa Proposta." : `Faltam ${total - completed} campo(s) para liberar avanço.`}
          </p>
          <Button onClick={handleSave} disabled={saving} type="button">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar BANT"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
