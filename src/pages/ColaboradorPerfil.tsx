import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2, CheckSquare, Clock, Package, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const ColaboradorPerfil = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [colaborador, setColaborador] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [tarefaDialogOpen, setTarefaDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<any>(null);
  const [stats, setStats] = useState({
    tarefasConcluidas: 0,
    tarefasPendentes: 0,
    pedidosLancados: 0,
  });

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data: new Date().toISOString().split('T')[0],
    horario: "",
    tipo: "evento",
  });

  useEffect(() => {
    loadColaboradorData();
  }, [id]);

  const loadColaboradorData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data: colabData, error: colabError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (colabError) throw colabError;
      setColaborador(colabData);

      const { data: eventosData, error: eventosError } = await supabase
        .from("colaborador_eventos")
        .select("*")
        .eq("colaborador_id", id)
        .order("data", { ascending: false });

      if (eventosError) throw eventosError;
      setEventos(eventosData || []);

      const { data: tarefasData, error: tarefasError } = await supabase
        .from("tarefas")
        .select("*, clientes(nome_fantasia)")
        .eq("responsavel_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tarefasError) throw tarefasError;
      setTarefas(tarefasData || []);

      const concluidas = tarefasData?.filter(t => t.status === "concluida").length || 0;
      const pendentes = tarefasData?.filter(t => t.status === "pendente" || t.status === "em_andamento").length || 0;

      const { count: pedidosCount } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("responsavel_venda_id", id);

      setStats({
        tarefasConcluidas: concluidas,
        tarefasPendentes: pendentes,
        pedidosLancados: pedidosCount || 0,
      });

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Não autenticado", variant: "destructive" });
        return;
      }

      // Só pode adicionar eventos no próprio calendário
      if (user.id !== id) {
        toast({ 
          title: "Sem permissão", 
          description: "Você só pode adicionar eventos no seu próprio calendário",
          variant: "destructive" 
        });
        return;
      }

      if (editingEvento) {
        const { error } = await supabase
          .from("colaborador_eventos")
          .update({
            titulo: formData.titulo,
            descricao: formData.descricao,
            data: formData.data,
            horario: formData.horario || null,
            tipo: formData.tipo,
          })
          .eq("id", editingEvento.id);

        if (error) throw error;
        toast({ title: "Evento atualizado!" });
      } else {
        const { error } = await supabase
          .from("colaborador_eventos")
          .insert({
            colaborador_id: id,
            titulo: formData.titulo,
            descricao: formData.descricao,
            data: formData.data,
            horario: formData.horario || null,
            tipo: formData.tipo,
          });

        if (error) throw error;
        toast({ title: "Evento criado!" });
      }

      setDialogOpen(false);
      setEditingEvento(null);
      setFormData({
        titulo: "",
        descricao: "",
        data: new Date().toISOString().split('T')[0],
        horario: "",
        tipo: "evento",
      });
      loadColaboradorData();
    } catch (error: any) {
      console.error("Erro ao salvar evento:", error);
      toast({ title: "Erro ao salvar evento", variant: "destructive" });
    }
  };

  const handleDeleteEvento = async (eventoId: string) => {
    if (!confirm("Deseja excluir este evento?")) return;

    try {
      const { error } = await supabase
        .from("colaborador_eventos")
        .delete()
        .eq("id", eventoId);

      if (error) throw error;
      toast({ title: "Evento excluído!" });
      loadColaboradorData();
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      toast({ title: "Erro ao excluir evento", variant: "destructive" });
    }
  };

  const handleEditEvento = (evento: any) => {
    setEditingEvento(evento);
    setFormData({
      titulo: evento.titulo,
      descricao: evento.descricao || "",
      data: evento.data,
      horario: evento.horario || "",
      tipo: evento.tipo,
    });
    setDialogOpen(true);
  };

  const loadTarefas = async () => {
    if (!id) return;
    
    const { data: tarefasData, error: tarefasError } = await supabase
      .from("tarefas")
      .select("*, clientes(nome_fantasia)")
      .eq("responsavel_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (tarefasError) {
      console.error("Erro ao carregar tarefas:", tarefasError);
    } else {
      setTarefas(tarefasData || []);
    }
  };

  const handleEditTarefa = (tarefa: any) => {
    setEditingTarefa(tarefa);
    setTarefaDialogOpen(true);
  };

  const handleDeleteTarefa = async (tarefaId: string) => {
    if (!confirm("Deseja excluir esta tarefa?")) return;
    
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', tarefaId);
    
    if (error) {
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
    } else {
      toast({ title: "Tarefa excluída com sucesso!" });
      loadColaboradorData();
    }
  };

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarefa) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const { error } = await supabase
      .from('tarefas')
      .update({
        titulo: formData.get('titulo') as string,
        descricao: formData.get('descricao') as string,
        data_prevista: formData.get('data_prevista') as string,
        horario: formData.get('horario') as string,
        status: formData.get('status') as 'pendente' | 'em_andamento' | 'concluida' | 'cancelada',
        prioridade: formData.get('prioridade') as 'baixa' | 'media' | 'alta',
      })
      .eq('id', editingTarefa.id);
    
    if (error) {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    } else {
      toast({ title: "Tarefa atualizada com sucesso!" });
      setTarefaDialogOpen(false);
      setEditingTarefa(null);
      loadColaboradorData();
    }
  };

  const renderEventos = () => {
    const hoje = new Date();
    const proximosEventos = eventos
      .filter(e => new Date(e.data) >= hoje)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 10);

    const eventosPassados = eventos
      .filter(e => new Date(e.data) < hoje)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-3">Próximos Eventos</h3>
          <div className="space-y-2">
            {proximosEventos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum evento próximo</p>
            ) : (
              proximosEventos.map(evento => (
                <div
                  key={evento.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleEditEvento(evento)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{evento.titulo}</div>
                    {evento.descricao && (
                      <div className="text-sm text-muted-foreground">{evento.descricao}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      📅 {format(new Date(evento.data), 'dd/MM/yyyy')}
                      {evento.horario && ` • ${evento.horario}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvento(evento.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-3">Eventos Passados</h3>
          <div className="space-y-2">
            {eventosPassados.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum evento passado</p>
            ) : (
              eventosPassados.map(evento => (
                <div
                  key={evento.id}
                  className="p-3 border rounded-lg opacity-60"
                >
                  <div className="font-medium">{evento.titulo}</div>
                  {evento.descricao && (
                    <div className="text-sm text-muted-foreground">{evento.descricao}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    📅 {format(new Date(evento.data), 'dd/MM/yyyy')}
                    {evento.horario && ` • ${evento.horario}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p className="text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="flex-1 p-8">
        <p className="text-center text-muted-foreground">Colaborador não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 bg-gradient-subtle min-h-screen">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Perfil - {colaborador?.nome}
          </h1>
          <p className="text-muted-foreground">
            Gerencie eventos e visualize estatísticas
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3 animate-in fade-in duration-300">
        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-1 to-chart-1/70 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-success">{stats.tarefasConcluidas}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-2 to-chart-2/70 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{stats.tarefasPendentes}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant hover:shadow-glow transition-all hover-scale overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Lançados</CardTitle>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-chart-3 to-chart-3/70 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{stats.pedidosLancados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendário de Eventos */}
      <Card className="border-primary/20 shadow-elegant">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Calendário Pessoal
              </CardTitle>
              <CardDescription>
                Gerencie seus compromissos e eventos dos próximos 30 dias
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setEditingEvento(null);
                setFormData({
                  titulo: '',
                  descricao: '',
                  data: new Date().toISOString().split('T')[0],
                  horario: '',
                  tipo: 'evento'
                });
                setDialogOpen(true);
              }}
              className="shadow-sm hover-scale"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderEventos()}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvento ? "Editar Evento" : "Novo Evento"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitEvento} className="space-y-4">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        required
                        value={formData.data}
                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Horário</Label>
                      <Input
                        type="time"
                        value={formData.horario}
                        onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingEvento && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDeleteEvento(editingEvento.id)}
                      >
                        Excluir
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Minhas Tarefas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tarefas.slice(0, 10).map(tarefa => (
              <div key={tarefa.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{tarefa.titulo}</h4>
                    {tarefa.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
                    )}
                    {tarefa.clientes && (
                      <p className="text-sm text-muted-foreground">
                        Cliente: {tarefa.clientes.nome_fantasia}
                      </p>
                    )}
                    {tarefa.data_prevista && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📅 {new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')}
                        {tarefa.horario && ` • ${tarefa.horario}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tarefa.status === "concluida" ? "default" : "secondary"}>
                      {tarefa.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTarefa(tarefa)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTarefa(tarefa.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {tarefas.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Nenhuma tarefa encontrada</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={tarefaDialogOpen} onOpenChange={setTarefaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTarefa} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input name="titulo" defaultValue={editingTarefa?.titulo} required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea name="descricao" defaultValue={editingTarefa?.descricao} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Prevista</Label>
                <Input type="date" name="data_prevista" defaultValue={editingTarefa?.data_prevista} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" name="horario" defaultValue={editingTarefa?.horario} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={editingTarefa?.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select name="prioridade" defaultValue={editingTarefa?.prioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTarefaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColaboradorPerfil;
