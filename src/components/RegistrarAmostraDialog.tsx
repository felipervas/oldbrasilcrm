import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProdutoCombobox, ProdutoOption } from "@/components/ProdutoCombobox";
import { Package, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId?: string | null;
  clienteId: string;
  clienteNome: string;
  onCreated?: () => void;
}

interface CartItem {
  produto_id: string;
  nome: string;
  marca: string | null;
  quantidade: number;
}

export function RegistrarAmostraDialog({ open, onOpenChange, opportunityId, clienteId, clienteNome, onCreated }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().slice(0, 10));
  const [formaEnvio, setFormaEnvio] = useState<string>("transportadora");
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setItems([]);
    setDataEnvio(new Date().toISOString().slice(0, 10));
    setFormaEnvio("transportadora");
    setCodigoRastreio("");
    setObservacoes("");
  };

  const addProduto = (p: ProdutoOption) => {
    if (items.some(i => i.produto_id === p.id)) {
      toast.info("Produto já adicionado.");
      return;
    }
    setItems(prev => [...prev, {
      produto_id: p.id,
      nome: p.nome,
      marca: p.marca,
      quantidade: 1,
    }]);
  };

  const updateQty = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.produto_id === id ? { ...i, quantidade: Math.max(0.01, qty) } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.produto_id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    if (items.length === 0) {
      toast.error("Adicione ao menos um produto.");
      return;
    }
    setSaving(true);
    try {
      const rows = items.map(i => ({
        opportunity_id: opportunityId ?? null,
        cliente_id: clienteId,
        produto_id: i.produto_id,
        produto_nome: i.nome,
        produto_marca: i.marca,
        quantidade: i.quantidade,
        data_envio: dataEnvio,
        forma_envio: formaEnvio,
        codigo_rastreio: codigoRastreio || null,
        observacoes: observacoes || null,
        status: "enviada",
        created_by: user.id,
      }));
      const { error } = await supabase.from("amostras_enviadas").insert(rows);
      if (error) throw error;

      // Timeline event (somente se houver oportunidade)
      if (opportunityId) {
        const desc = `Amostras enviadas: ${items.map(i => `${i.quantidade}× ${i.nome}`).join(", ")}` +
          (codigoRastreio ? ` · Rastreio: ${codigoRastreio}` : "");
        await supabase.from("timeline_events").insert({
          opportunity_id: opportunityId,
          company_id: clienteId,
          user_id: user.id,
          event_type: "sample_sent",
          description: desc,
        });
      }

      toast.success(`${items.length} amostra(s) registrada(s)!`);
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao registrar amostras.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-secondary" /> Registrar amostras enviadas
          </DialogTitle>
          <DialogDescription>
            Para <span className="font-medium text-foreground">{clienteNome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Adicionar produto</Label>
            <ProdutoCombobox onPick={addProduto} placeholder="Buscar produto..." />
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Produtos ({items.length})</Label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map(i => (
                  <div key={i.produto_id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.nome}</p>
                      {i.marca && <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{i.marca}</Badge>}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={i.quantidade}
                      onChange={(e) => updateQty(i.produto_id, Number(e.target.value))}
                      className="w-20 h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(i.produto_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data de envio</Label>
              <Input type="date" value={dataEnvio} onChange={(e) => setDataEnvio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de envio</Label>
              <Select value={formaEnvio} onValueChange={setFormaEnvio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="correios">Correios</SelectItem>
                  <SelectItem value="transportadora">Transportadora</SelectItem>
                  <SelectItem value="pessoal">Entrega pessoal</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Código de rastreio (opcional)</Label>
            <Input
              value={codigoRastreio}
              onChange={(e) => setCodigoRastreio(e.target.value)}
              placeholder="Ex.: BR123456789BR"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Detalhes adicionais sobre o envio..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || items.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
