import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuickClienteDialogProps {
  onClienteCreated: (clienteId: string) => void;
}

export const QuickClienteDialog = ({ onClienteCreated }: QuickClienteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome_fantasia: formData.get("nome_fantasia") as string,
          cnpj_cpf: formData.get("cnpj_cpf") as string || null,
          telefone: formData.get("telefone") as string || null,
          email: formData.get("email") as string || null,
          cidade: formData.get("cidade") as string || null,
          uf: formData.get("uf") as string || null,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cliente criado!",
        description: `${data.nome_fantasia} foi adicionado com sucesso`,
      });

      onClienteCreated(data.id);
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Erro ao criar cliente",
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
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
          <DialogDescription>
            Adicione apenas as informações essenciais. Você pode completar depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
            <Input
              id="nome_fantasia"
              name="nome_fantasia"
              required
              placeholder="Nome do estabelecimento"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="cnpj_cpf">CNPJ/CPF</Label>
            <Input
              id="cnpj_cpf"
              name="cnpj_cpf"
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              name="telefone"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="cliente@email.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                name="cidade"
                placeholder="São Paulo"
              />
            </div>
            <div>
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                name="uf"
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
