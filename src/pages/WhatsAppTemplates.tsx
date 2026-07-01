import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageCircle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const VAR_LIST = [
  { key: "{{cliente}}", desc: "Nome do cliente" },
  { key: "{{vendedor}}", desc: "Seu primeiro nome" },
  { key: "{{pedido_numero}}", desc: "Número do pedido" },
  { key: "{{pedido_total}}", desc: "Valor total do pedido" },
  { key: "{{pedido_itens}}", desc: "Lista de itens" },
  { key: "{{entrega_data}}", desc: "Data prevista de entrega" },
  { key: "{{etapa_funil}}", desc: "Etapa atual no pipeline" },
];

export default function WhatsAppTemplates() {
  const navigate = useNavigate();
  const { templates, loading, save, reset } = useWhatsAppTemplates();
  const [editing, setEditing] = useState<Record<string, { titulo: string; conteudo: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const getValue = (chave: string, field: "titulo" | "conteudo") => {
    if (editing[chave]?.[field] !== undefined) return editing[chave][field];
    const t = templates.find(x => x.chave === chave);
    return t?.[field] ?? "";
  };

  const setValue = (chave: string, field: "titulo" | "conteudo", value: string) => {
    setEditing(prev => ({
      ...prev,
      [chave]: {
        titulo: prev[chave]?.titulo ?? templates.find(t => t.chave === chave)?.titulo ?? "",
        conteudo: prev[chave]?.conteudo ?? templates.find(t => t.chave === chave)?.conteudo ?? "",
        [field]: value,
      },
    }));
  };

  const handleSave = async (chave: string) => {
    const titulo = getValue(chave, "titulo");
    const conteudo = getValue(chave, "conteudo");
    if (!titulo.trim() || !conteudo.trim()) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }
    setSavingKey(chave);
    const tpl = templates.find(t => t.chave === chave);
    const { error } = await save(chave, titulo, conteudo, tpl?.descricao);
    setSavingKey(null);
    if (error) {
      toast.error("Erro ao salvar template.");
      return;
    }
    setEditing(prev => {
      const next = { ...prev };
      delete next[chave];
      return next;
    });
    toast.success("Template salvo!");
  };

  const handleReset = async (chave: string) => {
    setSavingKey(chave);
    const { error } = await reset(chave);
    setSavingKey(null);
    if (error) {
      toast.error("Erro ao restaurar.");
      return;
    }
    setEditing(prev => {
      const next = { ...prev };
      delete next[chave];
      return next;
    });
    toast.success("Template restaurado ao padrão.");
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-60" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[#25D366]" />
            Templates de WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">Personalize as mensagens enviadas em cada situação.</p>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-secondary/5">
        <CardContent className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">VARIÁVEIS DISPONÍVEIS</div>
          <div className="flex flex-wrap gap-1.5">
            {VAR_LIST.map(v => (
              <Badge key={v.key} variant="outline" className="font-mono text-[11px] cursor-help" title={v.desc}>
                {v.key}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Use essas variáveis no conteúdo. Elas serão substituídas automaticamente no envio.
          </p>
        </CardContent>
      </Card>

      {templates.map(tpl => {
        const isEditing = !!editing[tpl.chave];
        return (
          <Card key={tpl.chave} className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {tpl.titulo}
                  {tpl.isCustom && <Badge variant="secondary" className="text-[10px]">Personalizado</Badge>}
                </CardTitle>
                {tpl.isCustom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReset(tpl.chave)}
                    disabled={savingKey === tpl.chave}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{tpl.descricao}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Título</Label>
                <Input
                  value={getValue(tpl.chave, "titulo")}
                  onChange={(e) => setValue(tpl.chave, "titulo", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={getValue(tpl.chave, "conteudo")}
                  onChange={(e) => setValue(tpl.chave, "conteudo", e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              {isEditing && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(prev => {
                      const next = { ...prev };
                      delete next[tpl.chave];
                      return next;
                    })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(tpl.chave)}
                    disabled={savingKey === tpl.chave}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {savingKey === tpl.chave ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
