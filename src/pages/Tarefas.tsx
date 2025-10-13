import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Tarefas = () => {
  const [open, setOpen] = useState(false);
  const [conclusaoOpen, setConclusaoOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<any>(null);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("");
  const [tipoTarefa, setTipoTarefa] = useState("");
  const { toast } = useToast();

  const loadTarefas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("tarefas")
      .select("*, clientes(nome_fantasia), profiles(nome)")
      .eq("responsavel_id", user.id)
      .order("data_prevista", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar tarefas", variant: "destructive" });
    } else {
      setTarefas(data || []);
    }
  };

  const loadClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").eq("ativo", true);
    setClientes(data || []);
  };

  const loadColaboradores = async () => {
    const { data } = await supabase.from("profiles").select("id, nome");
    setColaboradores(data || []);
  };

  useEffect(() => {
    loadTarefas();
    loadClientes();
    loadColaboradores();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const formData = new FormData(e.currentTarget);
    
    // Usa o colaborador selecionado ou o próprio usuário
    const responsavelId = colaboradorSelecionado || user?.id as string;
    
    const { data: tarefaData, error } = await supabase.from("tarefas").insert({
      titulo: formData.get("titulo") as string,
      descricao: formData.get("descricao") as string || null,
      cliente_id: clienteSelecionado,
      tipo: tipoTarefa as "visitar" | "ligar",
      data_prevista: (formData.get("data_prevista") as string) || null,
      prioridade: (formData.get("prioridade") as "baixa" | "media" | "alta") || "media",
      responsavel_id: responsavelId,
    }).select().single();

    const tarefa = tarefaData as any;

    if (error) {
      setLoading(false);
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
      console.error(error);
      return;
    }

    // Enviar notificação
    if (tarefa) {
      try {
        const { data: funcData } = await supabase.functions.invoke('send-task-notification', {
          body: {
            tarefa_id: tarefa.id,
            responsavel_id: responsavelId,
            titulo: formData.get("titulo") as string,
            cliente_id: clienteSelecionado,
            data_prevista: formData.get("data_prevista") as string,
            tipo: tipoTarefa,
          }
        });

        if (funcData?.whatsappUrl) {
          window.open(funcData.whatsappUrl, '_blank');
        }
      } catch (notifError) {
        console.error("Erro ao enviar notificação:", notifError);
      }
    }

    setLoading(false);
    toast({ title: "Tarefa criada e notificação enviada!" });
    setOpen(false);
    setClienteSelecionado("");
    setColaboradorSelecionado("");
    setTipoTarefa("");
    loadTarefas();
  };

  const handleConclusao = async (resultado: "concluida" | "nao_concluida" | "reagendar", motivo?: string, novaData?: string) => {
    if (!tarefaSelecionada) return;
    setLoading(true);

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

    // Registrar interação
    const { data: { user } } = await supabase.auth.getUser();
    const interacaoData: any = {
      cliente_id: tarefaSelecionada.cliente_id,
      usuario_id: user?.id,
      tipo: tarefaSelecionada.tipo,
      resultado: resultado === "concluida" ? "concluida" : resultado === "nao_concluida" ? "nao_concluida" : "remarcada",
    };

    if (motivo) {
      interacaoData.motivo = motivo;
    }

    const { error: interacaoError } = await supabase.from("interacoes").insert(interacaoData);

    setLoading(false);

    if (tarefaError || interacaoError) {
      toast({ title: "Erro ao finalizar tarefa", variant: "destructive" });
    } else {
      toast({ 
        title: resultado === "concluida" ? "Tarefa concluída!" : resultado === "nao_concluida" ? "Tarefa não concluída" : "Tarefa reagendada" 
      });
      setConclusaoOpen(false);
      setTarefaSelecionada(null);
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
                <Input id="titulo" name="titulo" required placeholder="Ex: Contatar Alex" />
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
                <Input id="data_prevista" name="data_prevista" type="date" />
              </div>
              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select name="prioridade" defaultValue="media">
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
                <Textarea id="descricao" name="descricao" placeholder="Ex: Apresentar novo produto Invento Cacau" />
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
                      <div className="flex gap-2 mt-2 text-xs">
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
                          </span>
                        )}
                      </div>
                      {tarefa.descricao && <p className="text-sm mt-2">{tarefa.descricao}</p>}
                    </div>
                    {tarefa.status === 'pendente' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setTarefaSelecionada(tarefa);
                          setConclusaoOpen(true);
                        }}
                      >
                        Executar
                      </Button>
                    )}
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
    </div>
  );
};

export default Tarefas;
