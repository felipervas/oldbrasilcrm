-- Permitir que usuários não autenticados vejam produtos ativos e visíveis na loja
CREATE POLICY "Público pode ver produtos da loja"
ON public.produtos
FOR SELECT
TO anon
USING (ativo = true AND visivel_loja = true);

-- Permitir que usuários não autenticados vejam marcas ativas (corrigido: ativa não ativo)
CREATE POLICY "Público pode ver marcas ativas"
ON public.marcas
FOR SELECT
TO anon
USING (ativa = true);