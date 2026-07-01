import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users, ShieldCheck, Shield, AlertTriangle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface TeamMember {
  user_id: string;
  nome: string;
  email: string;
  role: string;          // admin/gestor da user_roles
  profile_role: string;  // vendedor/gerente/secretaria
  created_at: string;
  clientes_count: number;
  pedidos_count: number;
  pedidos_valor: number;
}

const profileRoleLabel: Record<string, string> = {
  vendedor: "Vendedor",
  gerente: "Gerente",
  secretaria: "Secretária",
};

export default function Equipe() {
  const { user } = useAuth();
  const { isAdminOrGestor, isSecretaria, loading: roleLoading } = useUserRole();
  const canManageTeam = isAdminOrGestor || isSecretaria;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteProfileRole, setInviteProfileRole] = useState<"vendedor" | "gerente" | "secretaria">("vendedor");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user || !canManageTeam) return;
    fetchTeam();
  }, [user?.id, canManageTeam]);

  const fetchTeam = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nome, email, created_at, role");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const { data: clientes } = await supabase
      .from("clientes")
      .select("representante_id");

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("representante_id, valor_total");

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    const clienteCount = new Map<string, number>();
    (clientes ?? []).forEach((c: any) => {
      clienteCount.set(c.representante_id, (clienteCount.get(c.representante_id) ?? 0) + 1);
    });

    const pedidoStats = new Map<string, { count: number; valor: number }>();
    (pedidos ?? []).forEach((p: any) => {
      const cur = pedidoStats.get(p.representante_id) ?? { count: 0, valor: 0 };
      pedidoStats.set(p.representante_id, { count: cur.count + 1, valor: cur.valor + (Number(p.valor_total) || 0) });
    });

    const team: TeamMember[] = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      nome: p.nome || p.email,
      email: p.email,
      role: roleMap.get(p.user_id) ?? "vendedor",
      profile_role: p.role ?? "vendedor",
      created_at: p.created_at,
      clientes_count: clienteCount.get(p.user_id) ?? 0,
      pedidos_count: pedidoStats.get(p.user_id)?.count ?? 0,
      pedidos_valor: pedidoStats.get(p.user_id)?.valor ?? 0,
    }));

    setMembers(team.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword || invitePassword.length < 6) {
      toast.error("Preencha e-mail e senha (mín. 6 caracteres)");
      return;
    }
    setInviting(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: inviteEmail,
      password: invitePassword,
      options: {
        data: { nome: inviteNome },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(`Erro: ${error.message}`);
      setInviting(false);
      return;
    }

    if (signUpData.user) {
      // Atualiza role no profile (vendedor/gerente/secretaria)
      await supabase.from("profiles").update({ role: inviteProfileRole }).eq("user_id", signUpData.user.id);

      // Se gerente, também adiciona em user_roles como gestor
      if (inviteProfileRole === "gerente") {
        await supabase.from("user_roles").insert({ user_id: signUpData.user.id, role: "gestor" as any });
      }
    }

    toast.success(`Convite enviado para ${inviteEmail}!`);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteNome("");
    setInvitePassword("");
    setInviteProfileRole("vendedor");
    setInviting(false);
    fetchTeam();
  };

  const changeProfileRole = async (m: TeamMember, newRole: "vendedor" | "gerente" | "secretaria") => {
    await supabase.from("profiles").update({ role: newRole }).eq("user_id", m.user_id);

    // Sincroniza user_roles: gerente → gestor; demais → remove gestor/admin
    if (newRole === "gerente") {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", m.user_id)
        .eq("role", "gestor")
        .maybeSingle();
      if (!existing) {
        await supabase.from("user_roles").insert({ user_id: m.user_id, role: "gestor" as any });
      }
    } else {
      await supabase.from("user_roles").delete().eq("user_id", m.user_id).in("role", ["admin", "gestor"] as any);
    }

    toast.success(`Papel alterado para ${profileRoleLabel[newRole]}`);
    fetchTeam();
  };

  if (roleLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!canManageTeam) return <Navigate to="/" replace />;

  const secretariasCount = members.filter(m => m.profile_role === "secretaria").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Equipe</h1>
          <p className="text-sm text-muted-foreground">{members.length} membros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setInviteProfileRole("secretaria"); setInviteOpen(true); }} variant="outline" className="min-h-[44px]">
            <ClipboardList className="h-4 w-4 mr-1" /> Adicionar Secretária
          </Button>
          <Button onClick={() => { setInviteProfileRole("vendedor"); setInviteOpen(true); }} className="min-h-[44px]">
            <UserPlus className="h-4 w-4 mr-1" /> Convidar Vendedor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total membros</span>
            </div>
            <p className="text-2xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Gerentes</span>
            </div>
            <p className="text-2xl font-bold">{members.filter(m => m.profile_role === "gerente").length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-secondary" />
              <span className="text-xs text-muted-foreground">Secretárias</span>
            </div>
            <p className="text-2xl font-bold">{secretariasCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Faturamento total</span>
            </div>
            <p className="text-xl font-bold">R$ {members.reduce((s, m) => s + m.pedidos_valor, 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-center">Alterar papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : members.map(m => (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge className={
                      m.profile_role === "gerente" ? "bg-primary/10 text-primary border-primary/20" :
                      m.profile_role === "secretaria" ? "bg-secondary/15 text-secondary-foreground border-secondary/30" :
                      "bg-muted text-muted-foreground"
                    }>
                      {m.profile_role === "gerente" ? <ShieldCheck className="h-3 w-3 mr-1" /> :
                       m.profile_role === "secretaria" ? <ClipboardList className="h-3 w-3 mr-1" /> :
                       <Shield className="h-3 w-3 mr-1" />}
                      {profileRoleLabel[m.profile_role] ?? "Vendedor"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{m.clientes_count}</TableCell>
                  <TableCell className="text-center">{m.pedidos_count}</TableCell>
                  <TableCell className="text-right font-medium">R$ {m.pedidos_valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-center">
                    {m.user_id !== user?.id && (
                      <Select value={m.profile_role} onValueChange={(v: any) => changeProfileRole(m, v)}>
                        <SelectTrigger className="h-9 w-[140px] mx-auto text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="secretaria">Secretária</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {members.map(m => (
          <Card key={m.user_id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{m.nome}</span>
                <Badge className={
                  m.profile_role === "gerente" ? "bg-primary/10 text-primary" :
                  m.profile_role === "secretaria" ? "bg-secondary/15 text-secondary-foreground" :
                  "bg-muted text-muted-foreground"
                }>
                  {profileRoleLabel[m.profile_role]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{m.email}</p>
              <div className="flex items-center justify-between text-sm">
                <span>{m.clientes_count} clientes · {m.pedidos_count} pedidos</span>
                <span className="font-medium">R$ {m.pedidos_valor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
              </div>
              {m.user_id !== user?.id && (
                <Select value={m.profile_role} onValueChange={(v: any) => changeProfileRole(m, v)}>
                  <SelectTrigger className="mt-2 min-h-[44px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="secretaria">Secretária</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteProfileRole === "secretaria" ? "Adicionar Secretária" : "Convidar Membro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={inviteNome} onChange={e => setInviteNome(e.target.value)} placeholder="Nome completo" className="mt-1 min-h-[44px]" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1 min-h-[44px]" required />
            </div>
            <div>
              <Label>Senha inicial *</Label>
              <Input type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="mt-1 min-h-[44px]" minLength={6} />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={inviteProfileRole} onValueChange={(v: any) => setInviteProfileRole(v)}>
                <SelectTrigger className="mt-1 min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="secretaria">Secretária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>O membro receberá um e-mail de confirmação e deverá verificar antes de acessar o sistema.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="min-h-[44px]">Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting} className="min-h-[44px]">
              {inviting ? "Convidando..." : "Convidar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
