import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, Calendar, CheckCircle2, XCircle, Clock, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Tarefas = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [conclusaoOpen, setConclusaoOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<any>(null);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("");
  const [tipoTarefa, setTipoTarefa] = useState("");
  const [editFormData, setEditFormData] = useState<any>({});
  const { toast } = useToast();

  const loadTarefas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Carregar todas as tarefas (não apenas as do usuário)
    const { data, error } = await supabase
      .from("tarefas")
      .select("*, clientes(nome_fantasia), profiles(nome)")
      .order("data_prevista", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar tarefas", variant: "destructive" });
    } else {
      setTarefas(data || []);
    }
  };

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia")
      .eq("ativo", true)
      .order("nome_fantasia");
    setClientes(data || []);
  };

  const loadColaboradores = async () => {
    // Buscar todos os colaboradores/usuários do sistema
    const { data } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");
    setColaboradores(data || []);
  };

  useEffect(() => {
    loadTarefas();
    loadClientes();
    loadColaboradores();
  }, []);

  const [formTarefa, setFormTarefa] = useState({
    titulo: "",
    descricao: "",
    data_prevista: "",
    horario: "",
    prioridade: "media" as "baixa" | "media" | "alta",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Erro de autenticação", variant: "destructive" });
        return;
      }
      
      const responsavelId = colaboradorSelecionado || user.id;
      
      const { error } = await supabase.from("tarefas").insert({
        titulo: formTarefa.titulo,
        descricao: formTarefa.descricao || null,
        cliente_id: clienteSelecionado || null,
        tipo: tipoTarefa as "visitar" | "ligar",
        data_prevista: formTarefa.data_prevista || null,
        horario: formTarefa.horario || null,
        prioridade: formTarefa.prioridade,
        responsavel_id: responsavelId || null,
      });

      if (error) throw error;

      toast({ title: "Tarefa criada!" });
      setOpen(false);
      setClienteSelecionado("");
      setColaboradorSelecionado("");
      setTipoTarefa("");
      setFormTarefa({
        titulo: "",
        descricao: "",
        data_prevista: "",
        horario: "",
        prioridade: "media",
      });
      loadTarefas();
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      toast({ title: "Erro: " + (error?.message || "Erro desconhecido"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConclusao = async (resultado: "concluida" | "nao_concluida" | "reagendar", motivo?: string, novaData?: string) => {
    if (!tarefaSelecionada) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const updates: any = {
        status: resultado === "concluida" ? "concluida" : resultado === "nao_concluida" ? "cancelada" : "pendente",
      };

      if (resultado === "concluida" || resultado === "nao_concluida") {
        updates.data_conclusao = new Date().toISOString();
      }

      if (resultado === "reagendar" && novaData) {
        updates.data_prevista = novaData;
      }

      const { error: tarefaError } = await supabase
        .from("tarefas")
        .update(updates)
        .eq("id", tarefaSelecionada.id);

      if (tarefaError) throw tarefaError;

      // Registrar interação (não espera completar)
      supabase.from("interacoes").insert({
        cliente_id: tarefaSelecionada.cliente_id,
        usuario_id: user.id,
        tipo: tarefaSelecionada.tipo === "visitar" ? "visita" : "ligacao",
        resultado: "concluida" as const,
        motivo: motivo || null,
      });

      toast({ 
        title: resultado === "concluida" ? "Tarefa concluída!" : resultado === "nao_concluida" ? "Tarefa não concluída" : "Tarefa reagendada" 
      });
      setConclusaoOpen(false);
      setTarefaSelecionada(null);
      loadTarefas();
    } catch (error) {
      console.error("Erro ao finalizar tarefa:", error);
      toast({ title: "Erro ao finalizar tarefa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tarefa: any) => {
    setTarefaSelecionada(tarefa);
    setEditFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || "",
      data_prevista: tarefa.data_prevista || "",
      horario: tarefa.horario || "",
      prioridade: tarefa.prioridade,
    });
    setClienteSelecionado(tarefa.cliente_id);
    setColaboradorSelecionado(tarefa.responsavel_id);
    setTipoTarefa(tarefa.tipo);
    setEditOpen(true);
  };

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarefaSelecionada) return;

    setLoading(true);
    const { error } = await supabase
      .from("tarefas")
      .update({
        titulo: editFormData.titulo,
        descricao: editFormData.descricao,
        data_prevista: editFormData.data_prevista || null,
        horario: editFormData.horario || null,
        prioridade: editFormData.prioridade,
        cliente_id: clienteSelecionado,
        responsavel_id: colaboradorSelecionado,
        tipo: tipoTarefa as "visitar" | "ligar",
      })
      .eq("id", tarefaSelecionada.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    } else {
      toast({ title: "Tarefa atualizada com sucesso!" });
      setEditOpen(false);
      loadTarefas();
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Tarefas
            </h1>
            <p className="text-muted-foreground">
              Organize suas visitas e ligações
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input 
                  id="titulo" 
                  value={formTarefa.titulo}
                  onChange={(e) => setFormTarefa({ ...formTarefa, titulo: e.target.value })}
                  required 
                  placeholder="Ex: Contatar Alex" 
                />
              </div>
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={clienteSelecionado} onValueChange={setClienteSelecionado} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipoTarefa} onValueChange={setTipoTarefa} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitar">Visita</SelectItem>
                    <SelectItem value="ligar">Ligação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="responsavel">Responsável (Opcional)</Label>
                <Select value={colaboradorSelecionado} onValueChange={setColaboradorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Você mesmo(a)" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colab) => (
                      <SelectItem key={colab.id} value={colab.id}>
                        {colab.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data_prevista">Data Prevista</Label>
                <Input 
                  id="data_prevista" 
                  type="date"
                  value={formTarefa.data_prevista}
                  onChange={(e) => setFormTarefa({ ...formTarefa, data_prevista: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="horario">Horário</Label>
                <Input 
                  id="horario" 
                  type="time"
                  value={formTarefa.horario}
                  onChange={(e) => setFormTarefa({ ...formTarefa, horario: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select 
                  value={formTarefa.prioridade} 
                  onValueChange={(value: "baixa" | "media" | "alta") => setFormTarefa({ ...formTarefa, prioridade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea 
                  id="descricao" 
                  value={formTarefa.descricao}
                  onChange={(e) => setFormTarefa({ ...formTarefa, descricao: e.target.value })}
                  placeholder="Ex: Apresentar novo produto Invento Cacau" 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Criar Tarefa"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Agenda de Tarefas
          </CardTitle>
          <CardDescription>
            Suas tarefas pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tarefas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma tarefa pendente</p>
              <p className="text-sm">Crie tarefas para organizar suas atividades</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tarefas.map((tarefa) => (
                <div key={tarefa.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{tarefa.titulo}</h3>
                      <p className="text-sm text-muted-foreground">Cliente: {tarefa.clientes?.nome_fantasia}</p>
                      <div className="flex gap-2 mt-2 text-xs flex-wrap">
                        <span className="px-2 py-1 bg-secondary rounded">{tarefa.tipo}</span>
                        <span className={`px-2 py-1 rounded ${
                          tarefa.prioridade === 'alta' ? 'bg-destructive text-destructive-foreground' :
                          tarefa.prioridade === 'media' ? 'bg-orange-500 text-white' :
                          'bg-muted'
                        }`}>{tarefa.prioridade}</span>
                        {tarefa.data_prevista && (
                          <span className="px-2 py-1 bg-muted rounded flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')}
                            {tarefa.horario && ` às ${tarefa.horario.slice(0, 5)}`}
                          </span>
                        )}
                        {tarefa.created_at && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Criada: {new Date(tarefa.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {tarefa.descricao && <p className="text-sm mt-2">{tarefa.descricao}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(tarefa)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <div className="flex gap-2">
                        {tarefa.status === 'pendente' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setTarefaSelecionada(tarefa);
                                setConclusaoOpen(true);
                              }}
                            >
                              Executar
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from("tarefas")
                                  .update({ 
                                    status: "concluida",
                                    data_conclusao: new Date().toISOString()
                                  })
                                  .eq("id", tarefa.id);
                                if (!error) {
                                  toast({ title: "Tarefa concluída!" });
                                  loadTarefas();
                                }
                              }}
                            >
                              ✓ Concluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={conclusaoOpen} onOpenChange={setConclusaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como foi a tarefa?</DialogTitle>
            <DialogDescription>Registre o resultado da sua interação</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => handleConclusao("concluida")}
              disabled={loading}
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Lead deu prosseguimento
            </Button>
            
            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => {
                  const motivo = prompt("Por que o lead não deu prosseguimento?");
                  if (motivo) handleConclusao("nao_concluida", motivo);
                }}
                disabled={loading}
              >
                <XCircle className="h-5 w-5 text-red-600" />
                Lead não deu prosseguimento
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => {
                  const novaData = prompt("Para quando deseja reagendar? (AAAA-MM-DD)");
                  if (novaData) handleConclusao("reagendar", "Não atendeu", novaData);
                }}
                disabled={loading}
              >
                <Clock className="h-5 w-5 text-orange-600" />
                Lead não atendeu - Reagendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTarefa} className="space-y-4">
            <div>
              <Label htmlFor="edit_titulo">Título *</Label>
              <Input 
                id="edit_titulo" 
                required 
                value={editFormData.titulo || ""}
                onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_cliente">Cliente *</Label>
              <Select value={clienteSelecionado} onValueChange={setClienteSelecionado} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_tipo">Tipo *</Label>
              <Select value={tipoTarefa} onValueChange={setTipoTarefa} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitar">Visita</SelectItem>
                  <SelectItem value="ligar">Ligação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_responsavel">Responsável</Label>
              <Select value={colaboradorSelecionado} onValueChange={setColaboradorSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione responsável" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_data_prevista">Data Prevista</Label>
              <Input 
                id="edit_data_prevista" 
                type="date"
                value={editFormData.data_prevista || ""}
                onChange={(e) => setEditFormData({ ...editFormData, data_prevista: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_horario">Horário</Label>
              <Input 
                id="edit_horario" 
                type="time"
                value={editFormData.horario || ""}
                onChange={(e) => setEditFormData({ ...editFormData, horario: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_prioridade">Prioridade</Label>
              <Select 
                value={editFormData.prioridade || "media"} 
                onValueChange={(value) => setEditFormData({ ...editFormData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea 
                id="edit_descricao"
                value={editFormData.descricao || ""}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
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

export default Tarefas;
