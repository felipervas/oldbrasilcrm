import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para notificação de tarefas
 * Verifica tarefas criadas recentemente (últimos 5 minutos) e mostra notificação ÚNICA
 */
export const useTestNotification = () => {
  const { toast } = useToast();
  const tarefasNotificadas = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkRecentTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar apenas tarefas criadas nos últimos 10 minutos (reduzido de 5)
      const dezMinutosAtras = new Date();
      dezMinutosAtras.setMinutes(dezMinutosAtras.getMinutes() - 10);

      const { data: tarefas, error } = await supabase
        .from('tarefas')
        .select('id, titulo, data_prevista, horario, clientes(nome_fantasia)')
        .eq('responsavel_id', user.id)
        .eq('status', 'pendente')
        .gte('created_at', dezMinutosAtras.toISOString())
        .order('created_at', { ascending: false })
        .limit(3); // Reduzido de 5 para 3

      if (error) {
        console.error('Erro ao verificar tarefas:', error);
        return;
      }

      if (tarefas && tarefas.length > 0) {
        const novasTarefas = tarefas.filter(t => !tarefasNotificadas.current.has(t.id));
        
        novasTarefas.forEach(tarefa => {
          tarefasNotificadas.current.add(tarefa.id);
          
          const dataHora = tarefa.data_prevista && tarefa.horario 
            ? `${new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')} às ${tarefa.horario.slice(0, 5)}`
            : tarefa.data_prevista 
              ? new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')
              : 'sem data definida';

          toast({
            title: "🔔 Nova Tarefa Criada!",
            description: `${tarefa.titulo} - Cliente: ${(tarefa as any).clientes?.nome_fantasia || 'N/A'} - ${dataHora}`,
            duration: 15000,
          });
        });
      }
    };

    checkRecentTasks();
    // Verificar a cada 5 minutos (reduzido de 1 minuto) para reduzir carga
    const interval = setInterval(checkRecentTasks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [toast]);
};
