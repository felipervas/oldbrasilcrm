import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para teste de notificação de tarefas
 * Verifica tarefas criadas recentemente (últimos 5 minutos) e mostra notificação
 */
export const useTestNotification = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkRecentTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Data de 5 minutos atrás
      const cincMinutosAtras = new Date();
      cincMinutosAtras.setMinutes(cincMinutosAtras.getMinutes() - 5);

      const { data: tarefas, error } = await supabase
        .from('tarefas')
        .select('id, titulo, data_prevista, horario, clientes(nome_fantasia)')
        .eq('responsavel_id', user.id)
        .eq('status', 'pendente')
        .gte('created_at', cincMinutosAtras.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao verificar tarefas:', error);
        return;
      }

      if (tarefas && tarefas.length > 0) {
        const tarefa = tarefas[0];
        const dataHora = tarefa.data_prevista && tarefa.horario 
          ? `${new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')} às ${tarefa.horario.slice(0, 5)}`
          : tarefa.data_prevista 
            ? new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')
            : 'sem data definida';

        toast({
          title: "🔔 Nova Tarefa Criada!",
          description: `${tarefa.titulo} - Cliente: ${(tarefa as any).clientes?.nome_fantasia || 'N/A'} - ${dataHora}`,
          duration: 10000,
        });
      }
    };

    // Verificar ao montar o componente
    checkRecentTasks();

    // Verificar a cada 1 minuto
    const interval = setInterval(checkRecentTasks, 60000);

    return () => clearInterval(interval);
  }, [toast]);
};
