import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Mail, Shield, Trash2, UserCheck, UserX, Edit, Phone, Eye } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";

type UserRole = 'admin' | 'gestor' | 'colaborador';

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  emails?: Array<{email: string; tipo: string; verificado: boolean}>;
  telefones?: Array<{numero: string; tipo: string; verificado: boolean}>;
  roles: UserRole[];
  ativo: boolean;
}

const GerenciarEquipe = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [canEditRoles, setCanEditRoles] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
    telefone: "",
    role: "colaborador" as UserRole,
  });
  const [editFormData, setEditFormData] = useState({
    nome: "",
    telefone: "",
    role: "colaborador" as UserRole,
    emails: [] as Array<{email: string; tipo: string; verificado: boolean}>,
    telefones: [] as Array<{numero: string; tipo: string; verificado: boolean}>,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'gestor']);
    
    setCanEditRoles((data?.some(r => r.role === 'admin')) || false);
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar equipe');
      }
      
      setMembers(result.members);
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao carregar equipe", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.senha,
            nome: formData.nome,
            telefone: formData.telefone,
            role: formData.role,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar membro');
      }

      toast({ title: "✅ Membro adicionado com sucesso!" });
      setIsDialogOpen(false);
      setFormData({ email: "", senha: "", nome: "", telefone: "", role: "colaborador" });
      loadMembers();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: memberId }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover membro');
      }

      toast({ title: `✅ ${memberName} removido da equipe` });
      loadMembers();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'gestor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return '👑 Admin';
      case 'gestor': return '📊 Gestor';
      default: return '👤 Colaborador';
    }
  };

  const handleEditMember = async (member: TeamMember) => {
    setMemberToEdit(member);
    setEditFormData({
      nome: member.nome,
      telefone: member.telefone || "",
      role: member.roles[0] || "colaborador",
      emails: member.emails || [],
      telefones: member.telefones || [],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToEdit) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: memberToEdit.id,
            nome: editFormData.nome,
            telefone: editFormData.telefone,
            emails: editFormData.emails,
            telefones: editFormData.telefones,
            role: canEditRoles ? editFormData.role : undefined,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar membro');
      }

      toast({ title: "✅ Membro atualizado com sucesso!" });
      setEditDialogOpen(false);
      setMemberToEdit(null);
      loadMembers();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao atualizar membro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Gerenciar Equipe
              </h1>
              <p className="text-muted-foreground">
                Controle de acesso e permissões
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="senha">Senha Inicial *</Label>
                  <Input
                    id="senha"
                    type="password"
                    required
                    minLength={6}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Permissão *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">👤 Colaborador</SelectItem>
                      <SelectItem value="gestor">📊 Gestor</SelectItem>
                      <SelectItem value="admin">👑 Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Criando..." : "Criar Membro"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              {members.length} membro(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">Carregando...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum membro ainda</p>
                <p className="text-sm">Adicione membros para começar</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{member.nome}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        {member.telefone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {member.telefone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {member.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 gap-2"
                        onClick={() => navigate(`/colaborador/${member.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Perfil
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditMember(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover <strong>{member.nome}</strong> da equipe?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteMember(member.id, member.nome)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Membro da Equipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  required
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Telefone Principal</Label>
                <Input
                  value={editFormData.telefone}
                  onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Múltiplos Emails */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Emails</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditFormData({
                      ...editFormData,
                      emails: [...editFormData.emails, { email: "", tipo: "secundario", verificado: false }]
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Email
                  </Button>
                </div>
                {editFormData.emails.map((emailObj, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={emailObj.email}
                          onChange={(e) => {
                            const novos = [...editFormData.emails];
                            novos[idx].email = e.target.value;
                            setEditFormData({ ...editFormData, emails: novos });
                          }}
                        />
                      </div>
                      <Select
                        value={emailObj.tipo}
                        onValueChange={(val) => {
                          const novos = [...editFormData.emails];
                          novos[idx].tipo = val;
                          setEditFormData({ ...editFormData, emails: novos });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="secundario">Secundário</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditFormData({
                          ...editFormData,
                          emails: editFormData.emails.filter((_, i) => i !== idx)
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Múltiplos Telefones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Telefones</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditFormData({
                      ...editFormData,
                      telefones: [...editFormData.telefones, { numero: "", tipo: "secundario", verificado: false }]
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Telefone
                  </Button>
                </div>
                {editFormData.telefones.map((telObj, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={telObj.numero}
                          onChange={(e) => {
                            const novos = [...editFormData.telefones];
                            novos[idx].numero = e.target.value;
                            setEditFormData({ ...editFormData, telefones: novos });
                          }}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <Select
                        value={telObj.tipo}
                        onValueChange={(val) => {
                          const novos = [...editFormData.telefones];
                          novos[idx].tipo = val;
                          setEditFormData({ ...editFormData, telefones: novos });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="secundario">Secundário</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditFormData({
                          ...editFormData,
                          telefones: editFormData.telefones.filter((_, i) => i !== idx)
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div>
                <Label>Permissão *</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(v) => setEditFormData({ ...editFormData, role: v as UserRole })}
                  disabled={!canEditRoles}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">👤 Colaborador</SelectItem>
                    <SelectItem value="gestor">📊 Gestor</SelectItem>
                    <SelectItem value="admin">👑 Admin</SelectItem>
                  </SelectContent>
                </Select>
                {!canEditRoles && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas administradores podem alterar cargos
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
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
    </AppLayout>
  );
};

export default GerenciarEquipe;