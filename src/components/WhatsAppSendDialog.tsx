import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppTemplates, ResolvedTemplate } from "@/hooks/useWhatsAppTemplates";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, renderTemplate, registerWhatsAppInteraction, normalizePhoneBR } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteCelular?: string | null;
  opportunityId?: string | null;
  /** Variáveis adicionais para preencher o template (pedido_numero, pedido_total, entrega_data, etapa_funil, etc.) */
  extraVars?: Record<string, string | number | null | undefined>;
  /** Filtra a lista de templates para um subconjunto (por chave). Se vazio mostra todos. */
  templateKeys?: string[];
  /** Pré-seleciona um template específico ao abrir. */
  defaultTemplateKey?: string;
  title?: string;
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  clienteTelefone,
  clienteCelular,
  opportunityId = null,
  extraVars,
  templateKeys,
  defaultTemplateKey,
  title = "Enviar WhatsApp",
}: Props) {
  const { user } = useAuth();
  const { templates, loading } = useWhatsAppTemplates();
  const [selectedKey, setSelectedKey] = useState<string>(defaultTemplateKey ?? "");
  const [customMessage, setCustomMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [sending, setSending] = useState(false);

  const visibleTemplates = useMemo<ResolvedTemplate[]>(() => {
    const list = templates.filter(t => t.ativo);
    if (templateKeys && templateKeys.length > 0) {
      return list.filter(t => templateKeys.includes(t.chave));
    }
    return list;
  }, [templates, templateKeys]);

  // Carrega nome do vendedor (perfil) e telefone inicial
  useEffect(() => {
    if (!open) return;
    const initialPhone = clienteCelular?.trim() || clienteTelefone?.trim() || "";
    setPhone(initialPhone);

    if (user) {
      supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        setVendedor(data?.nome?.split(/\s+/)[0] ?? "");
      });
    }
  }, [open, user?.id, clienteCelular, clienteTelefone]);

  // Pré-seleciona template ao abrir/quando carrega
  useEffect(() => {
    if (!open) return;
    if (defaultTemplateKey) {
      setSelectedKey(defaultTemplateKey);
    } else if (!selectedKey && visibleTemplates.length > 0) {
      setSelectedKey(visibleTemplates[0].chave);
    }
  }, [open, defaultTemplateKey, visibleTemplates]);

  // Renderiza mensagem ao trocar template
  useEffect(() => {
    if (!selectedKey) return;
    const tpl = visibleTemplates.find(t => t.chave === selectedKey);
    if (!tpl) return;
    const vars = {
      cliente: clienteNome.split(/\s+/)[0] ?? clienteNome,
      vendedor,
      ...extraVars,
    };
    setCustomMessage(renderTemplate(tpl.conteudo, vars));
  }, [selectedKey, vendedor, clienteNome, extraVars, visibleTemplates]);

  const phoneValid = !!normalizePhoneBR(phone);

  const handleSend = async () => {
    if (!user) return;
    if (!phoneValid) {
      toast.error("Número inválido. Use formato com DDD.");
      return;
    }
    if (!customMessage.trim()) {
      toast.error("Mensagem vazia.");
      return;
    }
    setSending(true);
    const opened = openWhatsApp(phone, customMessage);
    if (!opened) {
      toast.error("Não foi possível abrir o WhatsApp.");
      setSending(false);
      return;
    }
    // Helper já mostra toast de "Mensagem copiada — cole no WhatsApp"
    try {
      await registerWhatsAppInteraction({
        clientId: clienteId,
        userId: user.id,
        message: customMessage,
        subject: visibleTemplates.find(t => t.chave === selectedKey)?.titulo ?? "WhatsApp enviado",
        opportunityId,
      });
    } catch {
      toast.warning("WhatsApp aberto, mas falha ao registrar histórico.");
    }
    setSending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Para <span className="font-medium text-foreground">{clienteNome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone" className="text-xs">Número (com DDD)</Label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className={!phoneValid && phone ? "border-destructive" : ""}
            />
            {phone && !phoneValid && (
              <p className="text-[11px] text-destructive">Número inválido. Inclua DDD.</p>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-32" />
          ) : visibleTemplates.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nenhum template disponível.
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Modelo</Label>
              <ScrollArea className="max-h-[140px] -mr-3 pr-3">
                <div className="space-y-1.5">
                  {visibleTemplates.map(t => (
                    <button
                      key={t.chave}
                      type="button"
                      onClick={() => setSelectedKey(t.chave)}
                      className={`w-full text-left p-2.5 rounded-md border text-sm transition-colors ${
                        selectedKey === t.chave
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-foreground">{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{t.descricao}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wa-msg" className="text-xs">Mensagem</Label>
            <Textarea
              id="wa-msg"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={5}
              className="text-sm resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Você pode editar antes de enviar. Abre o WhatsApp Web/App em nova aba.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !phoneValid || !customMessage.trim()}
            className="bg-[#25D366] hover:bg-[#20bc5a] text-white"
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
