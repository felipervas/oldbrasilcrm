-- Adicionar campo tipo_embalagem aos produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS tipo_embalagem TEXT DEFAULT 'caixa';

COMMENT ON COLUMN public.produtos.tipo_embalagem IS 
  'Tipo de embalagem do produto: saco, caixa, balde';

-- Adicionar campo para controlar exibição do texto no banner da marca
ALTER TABLE public.marcas 
ADD COLUMN IF NOT EXISTS mostrar_texto_banner BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.marcas.mostrar_texto_banner IS 
  'Define se deve mostrar o texto do nome sobre o banner da marca';

-- Criar bucket de storage para banners de marca se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('marca-banners', 'marca-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para banners de marca
CREATE POLICY "Banners de marca são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'marca-banners');

CREATE POLICY "Admins podem fazer upload de banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marca-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins podem atualizar banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marca-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins podem deletar banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marca-banners' 
  AND auth.uid() IS NOT NULL
);