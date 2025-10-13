import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Marcas = () => {
  const [open, setOpen] = useState(false);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadMarcas = async () => {
    const { data, error } = await supabase
      .from("marcas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar marcas", variant: "destructive" });
    } else {
      setMarcas(data || []);
    }
  };

  useEffect(() => {
    loadMarcas();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from("marcas").insert({
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string,
      site: formData.get("site") as string,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao adicionar marca", variant: "destructive" });
    } else {
      toast({ title: "Marca adicionada com sucesso!" });
      setOpen(false);
      loadMarcas();
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Marcas
            </h1>
            <p className="text-muted-foreground">
              Marcas que você representa
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Marca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Marca</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" name="descricao" />
              </div>
              <div>
                <Label htmlFor="site">Site</Label>
                <Input id="site" name="site" type="url" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Marca"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Lista de Marcas
          </CardTitle>
          <CardDescription>
            Todas as marcas representadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {marcas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma marca cadastrada</p>
              <p className="text-sm">Adicione as marcas que você representa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {marcas.map((marca) => (
                <div key={marca.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{marca.nome}</h3>
                  {marca.descricao && <p className="text-sm text-muted-foreground mt-1">{marca.descricao}</p>}
                  {marca.site && (
                    <a href={marca.site} target="_blank" rel="noopener noreferrer" className="text-sm text-primary mt-2 inline-block">
                      {marca.site}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Marcas;
