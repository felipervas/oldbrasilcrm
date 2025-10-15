import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, CheckSquare, Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<any>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    telefone: string;
    equipe: string;
    perfil: "admin" | "colaborador" | "gestor" | "leitura";
  }>({
    nome: "",
    telefone: "",
    equipe: "",
    perfil: "colaborador",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Todos os usuários autenticados podem ver colaboradores
      // Apenas admins específicos podem editar
      const email = user.email;
      setCanEdit(email === 'felipervas@gmail.com' || email === 'oldvasconcellos@gmail.com');
      
      loadColaboradores();
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
    }
  };

  const loadColaboradores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        tarefas:tarefas(count)
      `)
      .order("nome");

    if (error) {
      toast({ title: "Erro ao carregar colaboradores", variant: "destructive" });
    } else {
      setColaboradores(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const getTarefasCount = (colaborador: any) => {
    return colaborador.tarefas?.[0]?.count || 0;
  };

  const handleOpenDialog = (colaborador?: any) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setFormData({
        nome: colaborador.nome || "",
        telefone: colaborador.telefone || "",
        equipe: colaborador.equipe || "",
        perfil: colaborador.perfil || "colaborador",
      });
    } else {
      setEditingColaborador(null);
      setFormData({
        nome: "",
        telefone: "",
        equipe: "",
        perfil: "colaborador",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do responsável",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingColaborador) {
        const { error } = await supabase
          .from("profiles")
          .update({
            nome: formData.nome,
            telefone: formData.telefone || null,
            equipe: formData.equipe || null,
            perfil: formData.perfil,
          })
          .eq("id", editingColaborador.id);

        if (error) throw error;

        toast({
          title: "Responsável atualizado",
          description: "As informações foram atualizadas com sucesso",
        });
      } else {
        // Para criar novo, precisamos de um user_id válido
        toast({
          title: "Função não disponível",
          description: "Novos responsáveis devem ser criados através do sistema de autenticação",
          variant: "destructive",
        });
        setIsDialogOpen(false);
        return;
      }

      setIsDialogOpen(false);
      loadColaboradores();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Responsável removido",
        description: "O responsável foi removido com sucesso",
      });

      loadColaboradores();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Responsáveis
            </h1>
            <p className="text-muted-foreground">
              Gerencie os responsáveis e suas tarefas
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <>
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Equipe
                  </CardTitle>
                  <CardDescription>
                    {canEdit && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Acesso de administrador</span>}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {colaboradores.map((colab) => (
                  <div key={colab.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{colab.nome}</h3>
                        {colab.perfil && (
                          <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded mt-1 inline-block">
                            {colab.perfil}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(colab)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {colab.nome}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(colab.id)}>
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    
                    {colab.telefone && (
                      <p className="text-sm text-muted-foreground mb-2">
                        📱 {colab.telefone}
                      </p>
                    )}
                    
                    {colab.equipe && (
                      <p className="text-sm text-muted-foreground mb-2">
                        👥 {colab.equipe}
                      </p>
                    )}

                    <div className="flex gap-4 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span>{getTarefasCount(colab)} tarefas</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingColaborador ? "Editar Responsável" : "Novo Responsável"}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do responsável
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="equipe">Equipe</Label>
                  <Input
                    id="equipe"
                    value={formData.equipe}
                    onChange={(e) => setFormData({ ...formData, equipe: e.target.value })}
                    placeholder="Nome da equipe"
                  />
                </div>
                <div>
                  <Label htmlFor="perfil">Perfil</Label>
                  <Select
                    value={formData.perfil}
                    onValueChange={(value: "admin" | "colaborador" | "gestor" | "leitura") => setFormData({ ...formData, perfil: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="leitura">Leitura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Colaboradores;