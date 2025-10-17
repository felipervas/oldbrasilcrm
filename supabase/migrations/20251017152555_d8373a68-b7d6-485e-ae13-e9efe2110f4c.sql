-- Adicionar novos campos para sistema de loja
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS categoria TEXT,
ADD COLUMN IF NOT EXISTS subcategoria TEXT,
ADD COLUMN IF NOT EXISTS rendimento_dose_gramas INTEGER,
ADD COLUMN IF NOT EXISTS preco_atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- Atualizar campo peso_unidade_kg se não existir
-- (já existe peso_embalagem_kg, mas vamos manter compatibilidade)

-- Índices para performance de filtros
CREATE INDEX IF NOT EXISTS idx_produtos_categoria 
  ON public.produtos(categoria) 
  WHERE categoria IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_preco 
  ON public.produtos(preco_por_kg) 
  WHERE preco_por_kg IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_loja_completo
  ON public.produtos(visivel_loja, ativo, marca_id, categoria);

-- Trigger para atualizar data de preço automaticamente
CREATE OR REPLACE FUNCTION atualizar_data_preco()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco_por_kg IS DISTINCT FROM NEW.preco_por_kg THEN
    NEW.preco_atualizado_em = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_data_preco ON public.produtos;
CREATE TRIGGER trigger_atualizar_data_preco
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_data_preco();

-- Adicionar slug às marcas para URLs amigáveis
ALTER TABLE public.marcas 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Criar slugs únicos para marcas existentes
UPDATE public.marcas 
SET slug = LOWER(REGEXP_REPLACE(nome, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Índice para slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_marcas_slug 
  ON public.marcas(slug);