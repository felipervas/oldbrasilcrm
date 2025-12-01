import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuickProdutoDialogProps {
  onProdutoCreated: (produtoId: string) => void;
}

export const QuickProdutoDialog = ({ onProdutoCreated }: QuickProdutoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marcas, setMarcas] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    const { data } = await supabase
      .from("marcas")
      .select("id, nome")
      .eq("ativa", true)
      .order("nome");
    setMarcas(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const tipoVenda = formData.get("tipo_venda") as string;
      
      const { data, error } = await supabase
        .from("produtos")
        .insert({
          nome: formData.get("nome") as string,
          marca_id: formData.get("marca_id") as string || null,
          preco_por_kg: parseFloat(formData.get("preco_por_kg") as string) || null,
          peso_embalagem_kg: parseFloat(formData.get("peso_embalagem_kg") as string) || null,
          tipo_venda: tipoVenda || 'kg',
          ativo: true,
          visivel_loja: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Produto criado!",
        description: `${data.nome} foi adicionado com sucesso`,
      });

      onProdutoCreated(data.id);
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="ml-2">
          <Plus className="h-4 w-4 mr-1" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Produto</DialogTitle>
          <DialogDescription>
            Adicione apenas as informações essenciais. Você pode completar depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              name="nome"
              required
              placeholder="Ex: Pistache Premium"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="marca_id">Marca</Label>
            <Select name="marca_id">
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma marca..." />
              </SelectTrigger>
              <SelectContent>
                {marcas.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tipo_venda">Tipo de Venda *</Label>
            <Select name="tipo_venda" defaultValue="kg">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Por Kg</SelectItem>
                <SelectItem value="unidade">Por Unidade/Caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="preco_por_kg">
              Preço (R$/kg ou R$/unidade)
            </Label>
            <Input
              id="preco_por_kg"
              name="preco_por_kg"
              type="number"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="peso_embalagem_kg">Peso da Embalagem (kg)</Label>
            <Input
              id="peso_embalagem_kg"
              name="peso_embalagem_kg"
              type="number"
              step="0.001"
              placeholder="Ex: 1.5"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Produto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
