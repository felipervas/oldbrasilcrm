import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type UserRole = 'admin' | 'gestor' | 'colaborador';

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  roles: UserRole[];
}

export function GerenciarEquipe() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    nome: "",
    role: "colaborador" as UserRole,
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      // Buscar todos os perfis com seus roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome');

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combinar dados - sem buscar emails do auth
      const membersData: TeamMember[] = (profiles || []).map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.id).map(r => r.role as UserRole) || [];
        
        return {
          id: profile.id,
          nome: profile.nome,
          email: profile.id, // Usar ID como identificador já que não temos acesso aos emails
          roles: userRoles
        };
      });

      setMembers(membersData);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: "Erro ao carregar equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nome: form.nome
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          nome: form.nome,
          perfil: form.role
        });

      if (profileError) throw profileError;

      // Atribuir role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: form.role
        });

      if (roleError) throw roleError;

      toast({
        title: "Membro adicionado com sucesso!",
      });

      setOpen(false);
      setForm({
        email: "",
        password: "",
        nome: "",
        role: "colaborador",
      });
      loadMembers();
    } catch (error: any) {
      console.error('Erro ao criar membro:', error);
      toast({
        title: "Erro ao criar membro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Tem certeza que deseja excluir este membro da equipe?")) return;

    try {
      // Deletar roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);

      if (rolesError) throw rolesError;

      toast({
        title: "Roles do membro removidos com sucesso!",
        description: "O usuário ainda existe mas não tem mais permissões.",
      });

      loadMembers();
    } catch (error: any) {
      console.error('Erro ao deletar membro:', error);
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'gestor':
        return 'default';
      case 'colaborador':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Gerenciar Equipe
            </CardTitle>
            <CardDescription>
              Adicione ou remova membros da equipe e gerencie suas permissões
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Membro da Equipe</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Senha inicial"
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={form.role} onValueChange={(value: UserRole) => setForm({ ...form, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Adicionar à Equipe
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro na equipe
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{member.nome}</div>
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                  <div className="flex gap-2 mt-2">
                    {member.roles.length === 0 ? (
                      <Badge variant="outline">Sem roles</Badge>
                    ) : (
                      member.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {role}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMember(member.id)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
