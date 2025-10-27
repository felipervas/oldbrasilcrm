import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useColaboradorEventos } from "@/hooks/useColaboradorEventos";
import { useHistoricoEquipe } from "@/hooks/useHistoricoEquipe";
import { AgendasEquipe } from "@/components/AgendasEquipe";
import { useDebounce } from "@/hooks/useDebounce";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, CheckCircle2, Clock, AlertCircle, Calendar, Phone, Mail, MapPin, Plus, Edit, Trash, History, Trophy, List } from "lucide-react";
import { format } from "date-fns";

const MeuPerfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogMultiplosOpen, setDialogMultiplosOpen] = useState(false);
  const [eventosTexto, setEventosTexto] = useState('');
  const [comentarioEvento, setComentarioEvento] = useState<{[key: string]: string}>({});
  const [formEvento, setFormEvento] = useState({
    titulo: '',
    descricao: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '',
    tipo: 'evento'
  });

  const { eventos, createEvento, updateEvento, deleteEvento, toggleConcluido, createMultipleEventos } = useColaboradorEventos();
  const { data: historico } = useHistoricoEquipe();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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

  // Filtrar clientes por busca com debounce para melhor performance
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => 
      cliente.nome_fantasia?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      cliente.cnpj_cpf?.includes(debouncedSearchTerm) ||
      cliente.cidade?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [clientes, debouncedSearchTerm]);

  const handleSaveEvento = async () => {
    try {
      if (eventoEditando) {
        await updateEvento.mutateAsync({ id: eventoEditando.id, ...formEvento });
      } else {
        await createEvento.mutateAsync(formEvento);
      }
      setDialogOpen(false);
      setEventoEditando(null);
      setFormEvento({
        titulo: '',
        descricao: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        horario: '',
        tipo: 'evento'
      });
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleEditEvento = (evento: any) => {
    setEventoEditando(evento);
    setFormEvento({
      titulo: evento.titulo,
      descricao: evento.descricao || '',
      data: evento.data,
      horario: evento.horario || '',
      tipo: evento.tipo
    });
    setDialogOpen(true);
  };

  const handleDeleteEvento = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este evento?')) {
      await deleteEvento.mutateAsync(id);
    }
  };

  const eventosDoMes = useMemo(() => {
    return eventos?.filter(e => {
      if (!selectedDate) return false;
      const eventoDate = new Date(e.data);
      return eventoDate.getMonth() === selectedDate.getMonth() &&
             eventoDate.getFullYear() === selectedDate.getFullYear();
    }) || [];
  }, [eventos, selectedDate]);

  const eventosPendentes = useMemo(() => {
    return eventosDoMes.filter(e => !e.concluido);
  }, [eventosDoMes]);

  const eventosConcluidos = useMemo(() => {
    return eventosDoMes.filter(e => e.concluido);
  }, [eventosDoMes]);

  const handleCriarMultiplosEventos = async () => {
    const linhas = eventosTexto.split('\n').filter(l => l.trim());
    if (linhas.length === 0) {
      toast({ title: 'Digite ao menos um evento', variant: 'destructive' });
      return;
    }

    await createMultipleEventos.mutateAsync({
      titulos: linhas,
      data: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      tipo: 'evento'
    });

    setEventosTexto('');
    setDialogMultiplosOpen(false);
  };

  const handleToggleConcluido = async (evento: any) => {
    await toggleConcluido.mutateAsync({
      id: evento.id,
      concluido: !evento.concluido,
      comentario: comentarioEvento[evento.id] || evento.comentario
    });
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      criar_tarefa: 'Criou tarefa',
      atualizar_tarefa: 'Atualizou tarefa',
      concluir_tarefa: 'Concluiu tarefa',
      criar_pedido: 'Criou pedido',
      editar_pedido: 'Editou pedido',
      criar_cliente: 'Criou cliente',
      editar_cliente: 'Editou cliente',
    };
    return labels[acao] || acao;
  };

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
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('clientes-tab');
            element?.click();
          }}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('tarefas-tab');
            element?.click();
          }}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('tarefas-tab');
            element?.click();
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="clientes" id="clientes-tab">Meus Clientes</TabsTrigger>
              <TabsTrigger value="tarefas" id="tarefas-tab">Minhas Tarefas</TabsTrigger>
              <TabsTrigger value="calendario" id="calendario-tab">Calendário</TabsTrigger>
              <TabsTrigger value="agendas" id="agendas-tab">Agendas da Equipe</TabsTrigger>
              <TabsTrigger value="historico" id="historico-tab">Histórico</TabsTrigger>
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
              <div className="mb-4">
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{searchTerm ? 'Nenhum cliente encontrado com esse termo' : 'Você ainda não tem clientes atribuídos'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientesFiltrados.map((cliente) => (
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

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meus Compromissos</CardTitle>
                  <CardDescription>Gerencie seus eventos e compromissos</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={dialogMultiplosOpen} onOpenChange={setDialogMultiplosOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <List className="mr-2 h-4 w-4" />
                        Criar Vários
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Múltiplos Eventos</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Lista de Eventos (um por linha)</Label>
                          <Textarea
                            value={eventosTexto}
                            onChange={(e) => setEventosTexto(e.target.value)}
                            placeholder="Calabria&#10;City Pops&#10;Tony"
                            rows={8}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Digite cada evento em uma linha. Data: {format(selectedDate || new Date(), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <Button onClick={handleCriarMultiplosEventos} className="w-full" disabled={createMultipleEventos.isPending}>
                          {createMultipleEventos.isPending ? 'Criando...' : 'Criar Eventos'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEventoEditando(null);
                        setFormEvento({
                          titulo: '',
                          descricao: '',
                          data: format(selectedDate || new Date(), 'yyyy-MM-dd'),
                          horario: '',
                          tipo: 'evento'
                        });
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Evento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{eventoEditando ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={formEvento.titulo}
                            onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })}
                            placeholder="Ex: Visita em Botuvera"
                          />
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={formEvento.data}
                            onChange={(e) => setFormEvento({ ...formEvento, data: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Horário (opcional)</Label>
                          <Input
                            type="time"
                            value={formEvento.horario}
                            onChange={(e) => setFormEvento({ ...formEvento, horario: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Descrição / Observações</Label>
                          <Textarea
                            value={formEvento.descricao}
                            onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })}
                            placeholder="O que você vai fazer..."
                          />
                        </div>
                        <Button onClick={handleSaveEvento} className="w-full">
                          {eventoEditando ? 'Atualizar' : 'Criar'} Evento
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-4">
                  {/* Eventos Pendentes */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pendentes ({eventosPendentes.length})
                    </h3>
                    {eventosPendentes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum evento pendente</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eventosPendentes.map((evento) => (
                          <div key={evento.id} className="border rounded-lg p-3 space-y-2 bg-background">
                            <div className="flex items-start gap-2">
                              <Checkbox 
                                checked={false}
                                onCheckedChange={() => handleToggleConcluido(evento)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{evento.titulo}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(evento.data), "dd/MM/yyyy")}
                                  {evento.horario && ` às ${evento.horario}`}
                                </p>
                                {evento.descricao && (
                                  <p className="text-sm text-muted-foreground mt-1">{evento.descricao}</p>
                                )}
                                <div className="mt-2">
                                  <Input
                                    placeholder="Adicionar comentário..."
                                    value={comentarioEvento[evento.id] || evento.comentario || ''}
                                    onChange={(e) => setComentarioEvento({
                                      ...comentarioEvento,
                                      [evento.id]: e.target.value
                                    })}
                                    className="text-sm h-8"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditEvento(evento)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEvento(evento.id)}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Eventos Concluídos */}
                  {eventosConcluidos.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Concluídos ({eventosConcluidos.length})
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eventosConcluidos.map((evento) => (
                          <div key={evento.id} className="border rounded-lg p-3 space-y-2 bg-muted/30 opacity-75">
                            <div className="flex items-start gap-2">
                              <Checkbox 
                                checked={true}
                                onCheckedChange={() => handleToggleConcluido(evento)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium line-through">{evento.titulo}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(evento.data), "dd/MM/yyyy")}
                                  {evento.horario && ` às ${evento.horario}`}
                                </p>
                                {evento.comentario && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">
                                    💬 {evento.comentario}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEvento(evento.id)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendas da Equipe</CardTitle>
              <CardDescription>Visualize os compromissos dos colaboradores</CardDescription>
            </CardHeader>
            <CardContent>
              <AgendasEquipe />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
              <CardDescription>Acompanhe todas as ações da equipe</CardDescription>
            </CardHeader>
            <CardContent>
              {!historico || historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {historico.map((item: any) => (
                    <div key={item.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {item.profiles?.nome || 'Usuário'} - {getAcaoLabel(item.acao)}
                          </p>
                          {item.detalhes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {JSON.stringify(item.detalhes)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
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
