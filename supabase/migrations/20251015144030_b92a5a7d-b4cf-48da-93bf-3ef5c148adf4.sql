-- Garantir que clientes podem ser deletados por usuários autenticados
DROP POLICY IF EXISTS "Todos podem deletar clientes" ON public.clientes;

CREATE POLICY "Usuários autenticados podem deletar clientes"
ON public.clientes
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Otimizar a política de tarefas para melhor performance
DROP POLICY IF EXISTS "Todos podem inserir tarefas" ON public.tarefas;

CREATE POLICY "Usuários autenticados podem inserir tarefas"
ON public.tarefas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);