-- Adicionar política RLS para DELETE na tabela tarefas
-- Permite que usuários autenticados possam deletar tarefas

CREATE POLICY "Usuários autenticados podem deletar tarefas"
ON tarefas
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);