import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2, Edit2, CheckSquare, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const ColaboradorPerfil = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [colaborador, setColaborador] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    tarefasConcluidas: 0,
    tarefasPendentes: 0,
    pedidosFeitos: 0,
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
      // Carregar dados do colaborador
      const { data: colabData, error: colabError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (colabError) throw colabError;
      setColaborador(colabData);

      // Carregar eventos
      const { data: eventosData, error: eventosError } = await supabase
        .from("colaborador_eventos")
        .select("*")
        .eq("colaborador_id", id)
        .order("data", { ascending: false });

      if (eventosError) throw eventosError;
      setEventos(eventosData || []);

      // Carregar tarefas
      const { data: tarefasData, error: tarefasError } = await supabase
        .from("tarefas")
        .select("*, clientes(nome_fantasia)")
        .eq("responsavel_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tarefasError) throw tarefasError;
      setTarefas(tarefasData || []);

      // Calcular estatísticas
      const concluidas = tarefasData?.filter(t => t.status === "concluida").length || 0;
      const pendentes = tarefasData?.filter(t => t.status === "pendente" || t.status === "em_andamento").length || 0;

      const { count: pedidosCount } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("responsavel_venda_id", id);

      setStats({
        tarefasConcluidas: concluidas,
        tarefasPendentes: pendentes,
        pedidosFeitos: pedidosCount || 0,
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
      if (!user || user.id !== id) {
        toast({ title: "Sem permissão", variant: "destructive" });
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

  const getEventosDoMes = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eventos.filter(e => {
      const eventDate = new Date(e.data);
      return eventDate >= start && eventDate <= end;
    });
  };

  const getTarefasDoMes = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return tarefas.filter(t => {
      if (!t.data_prevista) return false;
      const tarefaDate = new Date(t.data_prevista);
      return tarefaDate >= start && tarefaDate <= end;
    });
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const eventosDoMes = getEventosDoMes();
    const tarefasDoMes = getTarefasDoMes();

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
          <div key={day} className="text-center font-semibold text-sm p-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const eventosNoDia = eventosDoMes.filter(e => isSameDay(new Date(e.data), day));
          const tarefasNoDia = tarefasDoMes.filter(t => t.data_prevista && isSameDay(new Date(t.data_prevista), day));
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              className={`min-h-24 p-2 border rounded-lg ${
                isCurrentMonth ? "bg-card" : "bg-muted/30"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div className="font-medium text-sm mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {eventosNoDia.map(evento => (
                  <div
                    key={evento.id}
                    className="text-xs p-1 bg-primary/10 text-primary rounded cursor-pointer hover:bg-primary/20"
                    onClick={() => handleEditEvento(evento)}
                  >
                    {evento.titulo}
                  </div>
                ))}
                {tarefasNoDia.map(tarefa => (
                  <div
                    key={tarefa.id}
                    className="text-xs p-1 bg-accent rounded"
                  >
                    📋 {tarefa.titulo}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {colaborador.nome}
          </h1>
          <p className="text-muted-foreground">
            Área pessoal e organização
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{stats.tarefasConcluidas}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats.tarefasPendentes}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.pedidosFeitos}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meu Calendário
              </CardTitle>
              <CardDescription>
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              >
                Próximo
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Evento
                  </Button>
                </DialogTrigger>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderCalendar()}
        </CardContent>
      </Card>

      {/* Lista de tarefas recentes */}
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
                    {tarefa.clientes && (
                      <p className="text-sm text-muted-foreground">
                        Cliente: {tarefa.clientes.nome_fantasia}
                      </p>
                    )}
                  </div>
                  <Badge variant={tarefa.status === "concluida" ? "default" : "secondary"}>
                    {tarefa.status}
                  </Badge>
                </div>
              </div>
            ))}
            {tarefas.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Nenhuma tarefa encontrada</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorPerfil;
