import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageCircle, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp as openWhatsAppHelper } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteCelular?: string | null;
  opportunityId?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface CatalogoArquivo {
  id: string;
  brand_id: string;
  nome: string;
  arquivo_url: string;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const normalizePhoneBR = (raw?: string | null): string | null => {
  if (!raw) return null;
  let d = onlyDigits(raw);
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
};

export function EnviarCatalogosDialog({ open, onOpenChange, clienteId, clienteNome, clienteTelefone, clienteCelular, opportunityId }: Props) {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [arquivos, setArquivos] = useState<CatalogoArquivo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const firstName = clienteNome.split(/\s+/)[0] ?? clienteNome;
  const [message, setMessage] = useState(`Olá ${firstName}, tudo bem? Segue nosso(s) catálogo(s) para você dar uma olhada:`);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setSelected(new Set());
    setMessage(`Olá ${firstName}, tudo bem? Segue nosso(s) catálogo(s) para você dar uma olhada:`);
    Promise.all([
      supabase.from("brands").select("id, name").eq("active", true).order("name"),
      supabase.from("catalogo_arquivos").select("*").order("created_at", { ascending: false }),
    ]).then(([b, a]) => {
      if (!active) return;
      setBrands((b.data as Brand[]) ?? []);
      setArquivos((a.data as CatalogoArquivo[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [open, firstName]);

  const grouped = useMemo(() => {
    return brands.map(brand => ({
      brand,
      files: arquivos.filter(a => a.brand_id === brand.id),
    })).filter(g => g.files.length > 0);
  }, [brands, arquivos]);

  const totalFiles = arquivos.length;

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleBrand = (brandFiles: CatalogoArquivo[]) => {
    const ids = brandFiles.map(f => f.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) ids.forEach(id => n.delete(id));
      else ids.forEach(id => n.add(id));
      return n;
    });
  };

  const selectedFiles = arquivos.filter(a => selected.has(a.id));

  const buildText = () => {
    const links = selectedFiles.map(f => `📎 ${f.nome}\n${f.arquivo_url}`).join("\n\n");
    return `${message}\n\n${links}`;
  };

  const registerInteraction = async () => {
    if (!user) return;
    const desc = `Enviado ${selectedFiles.length} catálogo(s) via WhatsApp: ${selectedFiles.map(f => f.nome).join(", ")}`;
    await supabase.from("interactions").insert({
      client_id: clienteId,
      opportunity_id: opportunityId ?? null,
      created_by: user.id,
      type: "catalogo_enviado",
      subject: "Envio de catálogos",
      description: desc,
    });
    if (opportunityId) {
      await supabase.from("timeline_events").insert({
        opportunity_id: opportunityId,
        company_id: clienteId,
        user_id: user.id,
        event_type: "contact",
        description: desc,
      });
    }
  };

  const handleWhatsApp = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione ao menos um catálogo.");
      return;
    }
    setSending(true);
    const phone = clienteCelular ?? clienteTelefone;
    const text = buildText();
    if (phone && openWhatsAppHelper(phone, text)) {
      await registerInteraction();
      toast.success("WhatsApp aberto e envio registrado no histórico.");
    } else {
      // Sem telefone: copia para clipboard
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Mensagem copiada — cliente sem telefone cadastrado.");
      } catch {
        toast.error("Cliente sem telefone e não foi possível copiar.");
      }
    }
    setSending(false);
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione ao menos um catálogo.");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildText());
      toast.success("Mensagem copiada para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-secondary" />
            Enviar Catálogos
          </DialogTitle>
          <DialogDescription>
            Para <span className="font-medium text-foreground">{clienteNome}</span>
            {(clienteCelular || clienteTelefone) && (
              <span className="text-muted-foreground"> · {clienteCelular ?? clienteTelefone}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum catálogo disponível. Faça upload em /catalogo primeiro.
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-3 -mr-3 max-h-[40vh]">
              <div className="space-y-4">
                {grouped.map(({ brand, files }) => {
                  const allSelected = files.every(f => selected.has(f.id));
                  const someSelected = files.some(f => selected.has(f.id));
                  return (
                    <div key={brand.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleBrand(files)}
                            className={someSelected && !allSelected ? "data-[state=unchecked]:bg-primary/30" : ""}
                          />
                          <span className="text-sm font-semibold text-foreground">{brand.name}</span>
                          <Badge variant="outline" className="text-[10px] h-5">{files.length}</Badge>
                        </div>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        {files.map(f => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selected.has(f.id)}
                              onCheckedChange={() => toggle(f.id)}
                            />
                            <FileText className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="text-sm flex-1 truncate">{f.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {!loading && totalFiles > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                placeholder="Mensagem que acompanhará os links..."
              />
              <p className="text-[11px] text-muted-foreground">
                {selected.size} catálogo(s) selecionado(s) · os links serão adicionados automaticamente abaixo da mensagem.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={selected.size === 0 || sending}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
          <Button
            onClick={handleWhatsApp}
            disabled={selected.size === 0 || sending}
            className="bg-[#25D366] hover:bg-[#20bc5a] text-white"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Enviar pelo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
