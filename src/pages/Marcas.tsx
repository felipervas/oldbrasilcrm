import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Edit, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Marcas = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState<any>(null);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleEdit = (marca: any) => {
    setMarcaSelecionada(marca);
    setEditFormData({
      nome: marca.nome,
      descricao: marca.descricao || "",
      site: marca.site || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaSelecionada) return;

    setLoading(true);
    const { error } = await supabase
      .from("marcas")
      .update(editFormData)
      .eq("id", marcaSelecionada.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar marca", variant: "destructive" });
    } else {
      toast({ title: "Marca atualizada com sucesso!" });
      setEditOpen(false);
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
                <div 
                  key={marca.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/marcas/${marca.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        {marca.nome}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </h3>
                      {marca.descricao && <p className="text-sm text-muted-foreground mt-1">{marca.descricao}</p>}
                      {marca.site && (
                        <a 
                          href={marca.site} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-primary mt-2 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {marca.site}
                        </a>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(marca);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_nome">Nome *</Label>
              <Input 
                id="edit_nome" 
                required
                value={editFormData.nome || ""}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea 
                id="edit_descricao"
                value={editFormData.descricao || ""}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_site">Site</Label>
              <Input 
                id="edit_site" 
                type="url"
                value={editFormData.site || ""}
                onChange={(e) => setEditFormData({ ...editFormData, site: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marcas;
