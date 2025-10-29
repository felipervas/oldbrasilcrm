import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Prospect } from "@/hooks/useProspects";
import { Loader2 } from "lucide-react";

interface CriarTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: Prospect[];
  onSuccess: () => void;
}

export const CriarTarefaModal = ({ open, onOpenChange, prospects, onSuccess }: CriarTarefaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_prevista: "",
    horario: "",
    prioridade: "media" as "baixa" | "media" | "alta",
    tipo: "visitar" as "visitar" | "ligar",
    responsavel_id: "",
  });

  // Carregar colaboradores quando o modal abre
  useState(() => {
    if (open) {
      loadColaboradores();
      // Auto-preencher com dados dos prospects
      if (prospects.length > 0) {
        const nomesProspects = prospects.map(p => p.nome_empresa).join(", ");
        setFormData(prev => ({
          ...prev,
          titulo: `Visita: ${nomesProspects}`,
          descricao: `Prospects selecionados:\n${prospects.map(p => `- ${p.nome_empresa} (${p.cidade || 'Sem cidade'})`).join('\n')}`,
        }));
      }
    }
  });

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");
    setColaboradores(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Erro de autenticação", variant: "destructive" });
        return;
      }

      // Criar uma tarefa para cada prospect selecionado
      const tarefasParaCriar = prospects.map(prospect => ({
        titulo: formData.titulo.includes(prospect.nome_empresa) 
          ? formData.titulo 
          : `${formData.titulo} - ${prospect.nome_empresa}`,
        descricao: formData.descricao,
        data_prevista: formData.data_prevista,
        horario: formData.horario || null,
        prioridade: formData.prioridade,
        tipo: formData.tipo,
        responsavel_id: formData.responsavel_id || user.id,
        status: "pendente" as const,
        origem: "prospect",
        endereco_completo: prospect.endereco_completo || null,
        latitude: prospect.latitude || null,
        longitude: prospect.longitude || null,
      }));

      const { error } = await supabase.from("tarefas").insert(tarefasParaCriar);

      if (error) throw error;

      // Criar eventos no calendário para cada tarefa
      if (formData.data_prevista && formData.horario) {
        const eventosParaCriar = prospects.map(prospect => ({
          colaborador_id: formData.responsavel_id || user.id,
          titulo: `${formData.tipo === 'visitar' ? '🚗' : '📞'} ${prospect.nome_empresa}`,
          descricao: formData.descricao,
          data: formData.data_prevista,
          horario: formData.horario,
          tipo: formData.tipo === 'visitar' ? 'visita' : 'ligacao',
        }));

        await supabase.from("colaborador_eventos").insert(eventosParaCriar);
      }

      toast({ 
        title: "✅ Tarefas criadas com sucesso!",
        description: `${prospects.length} tarefa(s) adicionada(s) ao "Meu Dia"` 
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        titulo: "",
        descricao: "",
        data_prevista: "",
        horario: "",
        prioridade: "media",
        tipo: "visitar",
        responsavel_id: "",
      });
    } catch (error: any) {
      toast({ 
        title: "Erro ao criar tarefas", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Criar Tarefas para {prospects.length} Prospect(s)</DialogTitle>
          <DialogDescription>
            As tarefas serão adicionadas ao "Meu Dia" e aparecerão no calendário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="titulo">Título da Tarefa *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Visita técnica, Apresentação comercial..."
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes da tarefa..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitar">🚗 Visita</SelectItem>
                  <SelectItem value="ligar">📞 Ligação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prioridade">Prioridade *</Label>
              <Select value={formData.prioridade} onValueChange={(v: any) => setFormData({ ...formData, prioridade: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data_prevista">Data Prevista *</Label>
              <Input
                id="data_prevista"
                type="date"
                value={formData.data_prevista}
                onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Eu mesmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Eu mesmo</SelectItem>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-2">Prospects selecionados:</p>
            <ul className="space-y-1">
              {prospects.map(p => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  <span>{p.nome_empresa}</span>
                  {p.cidade && <span className="text-muted-foreground">({p.cidade})</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar {prospects.length} Tarefa(s)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
