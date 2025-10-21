import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle2, Clock, AlertCircle, Calendar, Phone, Mail, MapPin } from "lucide-react";

const MeuPerfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Não autenticado",
          description: "Faça login para acessar seu perfil",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Carregar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Carregar clientes onde o usuário é responsável
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("*")
        .eq("responsavel_id", user.id)
        .order("nome_fantasia");

      setClientes(clientesData || []);

      // Carregar tarefas do usuário
      const { data: tarefasData } = await supabase
        .from("tarefas")
        .select("*, clientes(nome_fantasia)")
        .eq("responsavel_id", user.id)
        .order("data_prevista", { ascending: false });

      setTarefas(tarefasData || []);

    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string }> = {
      pendente: { variant: "outline", icon: Clock, label: "Pendente" },
      em_andamento: { variant: "default", icon: AlertCircle, label: "Em Andamento" },
      concluida: { variant: "default", icon: CheckCircle2, label: "Concluída" },
    };
    const config = badges[status] || badges.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const colors: Record<string, string> = {
      alta: "bg-red-100 text-red-800 border-red-300",
      media: "bg-yellow-100 text-yellow-800 border-yellow-300",
      baixa: "bg-green-100 text-green-800 border-green-300",
    };
    return (
      <Badge variant="outline" className={colors[prioridade] || ""}>
        {prioridade?.toUpperCase()}
      </Badge>
    );
  };

  const tarefasPendentes = tarefas.filter(t => t.status === "pendente" || t.status === "em_andamento");
  const tarefasConcluidas = tarefas.filter(t => t.status === "concluida");

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p className="text-muted-foreground">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">
            {profile?.nome || "Usuário"}
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
            <p className="text-xs text-muted-foreground">
              Clientes sob sua responsabilidade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasPendentes.length}</div>
            <p className="text-xs text-muted-foreground">
              Tarefas aguardando conclusão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasConcluidas.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de tarefas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clientes">Meus Clientes</TabsTrigger>
          <TabsTrigger value="tarefas">Minhas Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Sob Minha Responsabilidade</CardTitle>
              <CardDescription>
                {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não tem clientes atribuídos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate("/clientes")}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{cliente.nome_fantasia}</h3>
                          {cliente.razao_social && (
                            <p className="text-sm text-muted-foreground">{cliente.razao_social}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                            {cliente.telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {cliente.telefone}
                              </div>
                            )}
                            {cliente.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {cliente.email}
                              </div>
                            )}
                            {cliente.cidade && cliente.uf && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {cliente.cidade}/{cliente.uf}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={cliente.ativo ? "default" : "secondary"}>
                          {cliente.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Pendentes</CardTitle>
              <CardDescription>
                {tarefasPendentes.length} {tarefasPendentes.length === 1 ? 'tarefa' : 'tarefas'} em aberto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tarefasPendentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa pendente!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tarefasPendentes.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate("/tarefas")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{tarefa.titulo}</h3>
                        <div className="flex gap-2">
                          {getPrioridadeBadge(tarefa.prioridade)}
                          {getStatusBadge(tarefa.status)}
                        </div>
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {tarefa.data_prevista && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {tarefa.clientes && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tarefa.clientes.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas Concluídas</CardTitle>
              <CardDescription>
                {tarefasConcluidas.length} {tarefasConcluidas.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tarefasConcluidas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa concluída ainda</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tarefasConcluidas.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer opacity-75"
                      onClick={() => navigate("/tarefas")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{tarefa.titulo}</h3>
                        {getStatusBadge(tarefa.status)}
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {tarefa.data_conclusao && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Concluída em {new Date(tarefa.data_conclusao).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {tarefa.clientes && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tarefa.clientes.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeuPerfil;
