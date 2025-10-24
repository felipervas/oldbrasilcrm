-- Adicionar campos de dimensionamento para imagens de produtos
ALTER TABLE public.produto_imagens
ADD COLUMN IF NOT EXISTS largura integer,
ADD COLUMN IF NOT EXISTS altura integer,
ADD COLUMN IF NOT EXISTS object_fit text DEFAULT 'cover' CHECK (object_fit IN ('cover', 'contain', 'fill'));

-- Adicionar campos de dimensionamento para banner de marcas  
ALTER TABLE public.marcas
ADD COLUMN IF NOT EXISTS banner_largura integer,
ADD COLUMN IF NOT EXISTS banner_altura integer,
ADD COLUMN IF NOT EXISTS banner_object_fit text DEFAULT 'cover' CHECK (banner_object_fit IN ('cover', 'contain', 'fill'));

COMMENT ON COLUMN public.produto_imagens.largura IS 'Largura preferencial da imagem em pixels';
COMMENT ON COLUMN public.produto_imagens.altura IS 'Altura preferencial da imagem em pixels';
COMMENT ON COLUMN public.produto_imagens.object_fit IS 'Como a imagem deve se ajustar ao container: cover (preenche), contain (cabe inteira), fill (estica)';
COMMENT ON COLUMN public.marcas.banner_largura IS 'Largura preferencial do banner em pixels';
COMMENT ON COLUMN public.marcas.banner_altura IS 'Altura preferencial do banner em pixels';
COMMENT ON COLUMN public.marcas.banner_object_fit IS 'Como o banner deve se ajustar ao container';