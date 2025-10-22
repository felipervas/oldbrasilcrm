-- Verificar e ajustar políticas de storage para upload de imagens de produtos
-- Permitir que usuários autenticados possam fazer upload de imagens

-- Criar política para upload de imagens de produtos
CREATE POLICY "Usuários autenticados podem fazer upload de imagens de produtos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produto-imagens'
);

-- Criar política para atualizar imagens de produtos
CREATE POLICY "Usuários autenticados podem atualizar imagens de produtos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'produto-imagens')
WITH CHECK (bucket_id = 'produto-imagens');

-- Criar política para deletar imagens de produtos
CREATE POLICY "Usuários autenticados podem deletar imagens de produtos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'produto-imagens');