-- Remove políticas antigas de clientes
DROP POLICY IF EXISTS "Todos podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin e gestor podem inserir clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar clientes" ON public.clientes;

-- Novas políticas para clientes
-- Colaboradores veem apenas seus clientes, admin/gestor veem todos
CREATE POLICY "Usuários veem seus clientes ou todos se admin/gestor"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  responsavel_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND perfil IN ('admin', 'gestor', 'leitura')
  )
);

-- Colaboradores podem inserir clientes com eles como responsável
CREATE POLICY "Usuários podem inserir clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (
  responsavel_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND perfil IN ('admin', 'gestor')
  )
);

-- Colaboradores podem atualizar apenas seus clientes, admin/gestor atualizam todos
CREATE POLICY "Usuários podem atualizar seus clientes ou todos se admin/gestor"
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND perfil IN ('admin', 'gestor')
  )
);

-- Ajustar políticas de interações para segurança
DROP POLICY IF EXISTS "Todos podem ver interações" ON public.interacoes;

CREATE POLICY "Usuários veem interações de seus clientes ou todas se admin/gestor"
ON public.interacoes
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = interacoes.cliente_id
    AND c.responsavel_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND perfil IN ('admin', 'gestor', 'leitura')
  )
);