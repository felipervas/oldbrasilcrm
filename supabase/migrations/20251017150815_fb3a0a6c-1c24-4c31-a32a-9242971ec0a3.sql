-- Tabela de imagens de produtos
CREATE TABLE IF NOT EXISTS public.produto_imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS policies para produto_imagens
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver imagens de produtos"
  ON public.produto_imagens FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir imagens"
  ON public.produto_imagens FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar imagens"
  ON public.produto_imagens FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar imagens"
  ON public.produto_imagens FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Novos campos na tabela produtos para controle da loja
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS visivel_loja BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS destaque_loja BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER DEFAULT 0;

-- Criar índice para performance nas consultas da loja
CREATE INDEX IF NOT EXISTS idx_produtos_loja 
  ON public.produtos(visivel_loja, destaque_loja, ordem_exibicao);

-- Criar bucket de storage para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produto-imagens', 'produto-imagens', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket de imagens
CREATE POLICY "Todos podem ver imagens de produtos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produto-imagens');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produto-imagens' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar imagens"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'produto-imagens' AND auth.uid() IS NOT NULL);