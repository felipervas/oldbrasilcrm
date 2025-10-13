-- Ajustar políticas de marcas para permitir colaboradores adicionarem marcas
DROP POLICY IF EXISTS "Admin e gestor podem inserir marcas" ON marcas;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar marcas" ON marcas;

CREATE POLICY "Colaboradores autenticados podem inserir marcas" 
ON marcas 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Colaboradores autenticados podem atualizar marcas" 
ON marcas 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Ajustar políticas de produtos para permitir colaboradores adicionarem produtos
DROP POLICY IF EXISTS "Admin e gestor podem inserir produtos" ON produtos;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar produtos" ON produtos;

CREATE POLICY "Colaboradores autenticados podem inserir produtos" 
ON produtos 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Colaboradores autenticados podem atualizar produtos" 
ON produtos 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);