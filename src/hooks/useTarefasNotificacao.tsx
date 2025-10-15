import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useTarefasNotificacao = () => {
  const { toast } = useToast();

  useEffect(() => {
    const verificarTarefas = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const agora = new Date();
        const dataHoje = agora.toISOString().split('T')[0];
        const horaAgora = agora.toTimeString().split(' ')[0].substring(0, 5);

        const { data: tarefas } = await supabase
          .from("tarefas")
          .select("*, clientes(nome_fantasia)")
          .eq("responsavel_id", user.id)
          .eq("status", "pendente")
          .eq("notificacao_enviada", false)
          .lte("data_prevista", dataHoje);

        if (tarefas && tarefas.length > 0) {
          // Filtrar tarefas cujo horário já chegou
          const tarefasAgora = tarefas.filter(tarefa => {
            if (!tarefa.horario) return true;
            
            const [horaT, minT] = tarefa.horario.split(':');
            const [horaA, minA] = horaAgora.split(':');
            
            if (tarefa.data_prevista === dataHoje) {
              return (parseInt(horaT) < parseInt(horaA)) || 
                     (parseInt(horaT) === parseInt(horaA) && parseInt(minT) <= parseInt(minA));
            }
            
            return tarefa.data_prevista < dataHoje;
          });

          if (tarefasAgora.length > 0) {
            tarefasAgora.forEach(tarefa => {
              toast({
                title: "🔔 Tarefa Agendada",
                description: `${tarefa.titulo} - ${tarefa.clientes?.nome_fantasia}`,
                duration: 10000,
              });
            });
          }
        }
      } catch (error) {
        console.error("Erro ao verificar tarefas:", error);
      }
    };

    // Verificar ao carregar
    verificarTarefas();

    // Verificar a cada 5 minutos
    const interval = setInterval(verificarTarefas, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [toast]);
};