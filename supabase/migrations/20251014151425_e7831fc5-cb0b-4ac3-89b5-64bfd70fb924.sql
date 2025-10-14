-- Criar função para marcar clientes inativos e criar tarefas
CREATE OR REPLACE FUNCTION public.processar_clientes_inativos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cliente_record RECORD;
  tarefa_existente UUID;
BEGIN
  -- Buscar clientes que não compram há mais de 70 dias e estão ativos
  FOR cliente_record IN 
    SELECT 
      c.id,
      c.nome_fantasia,
      c.responsavel_id,
      c.ultima_compra_data
    FROM clientes c
    WHERE c.ativo = true
      AND c.ultima_compra_data IS NOT NULL
      AND c.ultima_compra_data < (CURRENT_DATE - INTERVAL '70 days')
      AND c.responsavel_id IS NOT NULL
  LOOP
    -- Marcar cliente como inativo
    UPDATE clientes 
    SET ativo = false 
    WHERE id = cliente_record.id;

    -- Verificar se já existe uma tarefa para reativar este cliente
    SELECT id INTO tarefa_existente
    FROM tarefas
    WHERE cliente_id = cliente_record.id
      AND tipo = 'ligacao'
      AND titulo LIKE '%Reativar cliente inativo%'
      AND status IN ('pendente', 'em_andamento');

    -- Se não existir tarefa, criar uma nova
    IF tarefa_existente IS NULL THEN
      INSERT INTO tarefas (
        cliente_id,
        responsavel_id,
        titulo,
        descricao,
        tipo,
        prioridade,
        status,
        origem,
        data_prevista
      ) VALUES (
        cliente_record.id,
        cliente_record.responsavel_id,
        'Reativar cliente inativo: ' || cliente_record.nome_fantasia,
        'Cliente sem compras há mais de 70 dias (última compra: ' || 
          TO_CHAR(cliente_record.ultima_compra_data, 'DD/MM/YYYY') || '). ' ||
          'Entre em contato para reativar o relacionamento.',
        'ligacao',
        'alta',
        'pendente',
        'automacao',
        CURRENT_DATE + INTERVAL '3 days'
      );
    END IF;
  END LOOP;
END;
$$;

-- Comentário sobre execução manual
COMMENT ON FUNCTION public.processar_clientes_inativos() IS 
'Processa clientes inativos (sem compra há mais de 70 dias), marca-os como inativos e cria tarefas para os responsáveis. Execute manualmente ou agende via cron job.';
