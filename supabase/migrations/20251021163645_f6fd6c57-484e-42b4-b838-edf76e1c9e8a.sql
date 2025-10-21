-- FASE 1: CORRIGIR RLS POLICIES
-- Remover policies problemáticas e criar uma única policy de UPDATE funcional

-- 1. Remover policy com with_check vazio
DROP POLICY IF EXISTS "Todos podem atualizar produtos" ON produtos;

-- 2. Remover policy antiga de admin
DROP POLICY IF EXISTS "Admins podem editar configurações da loja" ON produtos;

-- 3. Criar UMA policy de UPDATE clara e funcional para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar produtos"
ON produtos
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);