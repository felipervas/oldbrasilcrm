-- Criar tabela para múltiplas tabelas de preço por produto
CREATE TABLE IF NOT EXISTS public.produto_tabelas_preco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome_tabela TEXT NOT NULL,
  preco_por_kg NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índice para busca rápida por produto
CREATE INDEX idx_produto_tabelas_preco_produto_id ON public.produto_tabelas_preco(produto_id);

-- Enable RLS
ALTER TABLE public.produto_tabelas_preco ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver tabelas de preço"
  ON public.produto_tabelas_preco
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir tabelas de preço"
  ON public.produto_tabelas_preco
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar tabelas de preço"
  ON public.produto_tabelas_preco
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar tabelas de preço"
  ON public.produto_tabelas_preco
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_produto_tabelas_preco_updated_at
  BEFORE UPDATE ON public.produto_tabelas_preco
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();