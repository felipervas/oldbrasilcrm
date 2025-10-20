-- Função SQL otimizada para buscar dados da loja home com apenas 1 query
-- Retorna marcas ativas com seus primeiros 5 produtos mais relevantes

CREATE OR REPLACE FUNCTION get_loja_home_otimizada(limite_produtos_por_marca INT DEFAULT 5)
RETURNS TABLE (
  -- Campos da marca
  marca_id uuid,
  marca_nome text,
  marca_slug text,
  marca_descricao text,
  marca_site text,
  marca_imagem_banner text,
  marca_mostrar_texto_banner boolean,
  marca_ativa boolean,
  marca_created_at timestamptz,
  marca_updated_at timestamptz,
  -- Campos do produto
  produto_id uuid,
  produto_nome text,
  produto_nome_loja text,
  produto_sku text,
  produto_descricao text,
  produto_categoria text,
  produto_subcategoria text,
  produto_preco_por_kg numeric,
  produto_peso_embalagem_kg numeric,
  produto_rendimento_dose_gramas integer,
  produto_tipo_calculo text,
  produto_destaque_loja boolean,
  produto_ordem_exibicao integer,
  produto_ativo boolean,
  produto_visivel_loja boolean,
  -- Imagem principal do produto
  imagem_url text,
  imagem_ordem integer,
  -- Ranking do produto dentro da marca
  produto_rank bigint
) 
LANGUAGE sql
STABLE
AS $$
  WITH produtos_ranqueados AS (
    SELECT 
      p.id as produto_id,
      p.nome as produto_nome,
      p.nome_loja as produto_nome_loja,
      p.sku as produto_sku,
      p.descricao as produto_descricao,
      p.categoria as produto_categoria,
      p.subcategoria as produto_subcategoria,
      p.preco_por_kg as produto_preco_por_kg,
      p.peso_embalagem_kg as produto_peso_embalagem_kg,
      p.rendimento_dose_gramas as produto_rendimento_dose_gramas,
      p.tipo_calculo as produto_tipo_calculo,
      p.destaque_loja as produto_destaque_loja,
      p.ordem_exibicao as produto_ordem_exibicao,
      p.ativo as produto_ativo,
      p.visivel_loja as produto_visivel_loja,
      p.marca_id,
      m.nome as marca_nome,
      m.slug as marca_slug,
      m.descricao as marca_descricao,
      m.site as marca_site,
      m.imagem_banner as marca_imagem_banner,
      m.mostrar_texto_banner as marca_mostrar_texto_banner,
      m.ativa as marca_ativa,
      m.created_at as marca_created_at,
      m.updated_at as marca_updated_at,
      ROW_NUMBER() OVER (
        PARTITION BY p.marca_id 
        ORDER BY 
          p.destaque_loja DESC NULLS LAST,
          p.ordem_exibicao ASC NULLS LAST,
          p.nome ASC
      ) as produto_rank
    FROM produtos p
    INNER JOIN marcas m ON p.marca_id = m.id
    WHERE p.ativo = true 
      AND p.visivel_loja = true
      AND m.ativa = true
  ),
  produtos_limitados AS (
    SELECT * 
    FROM produtos_ranqueados 
    WHERE produto_rank <= limite_produtos_por_marca
  ),
  imagens_principais AS (
    SELECT DISTINCT ON (pi.produto_id)
      pi.produto_id,
      pi.url as imagem_url,
      pi.ordem as imagem_ordem
    FROM produto_imagens pi
    INNER JOIN produtos_limitados pl ON pi.produto_id = pl.produto_id
    ORDER BY pi.produto_id, pi.ordem ASC
  )
  SELECT 
    pl.marca_id,
    pl.marca_nome,
    pl.marca_slug,
    pl.marca_descricao,
    pl.marca_site,
    pl.marca_imagem_banner,
    pl.marca_mostrar_texto_banner,
    pl.marca_ativa,
    pl.marca_created_at,
    pl.marca_updated_at,
    pl.produto_id,
    pl.produto_nome,
    pl.produto_nome_loja,
    pl.produto_sku,
    pl.produto_descricao,
    pl.produto_categoria,
    pl.produto_subcategoria,
    pl.produto_preco_por_kg,
    pl.produto_peso_embalagem_kg,
    pl.produto_rendimento_dose_gramas,
    pl.produto_tipo_calculo,
    pl.produto_destaque_loja,
    pl.produto_ordem_exibicao,
    pl.produto_ativo,
    pl.produto_visivel_loja,
    COALESCE(imp.imagem_url, '/placeholder.svg') as imagem_url,
    COALESCE(imp.imagem_ordem, 0) as imagem_ordem,
    pl.produto_rank
  FROM produtos_limitados pl
  LEFT JOIN imagens_principais imp ON pl.produto_id = imp.produto_id
  ORDER BY 
    pl.marca_nome ASC,
    pl.produto_rank ASC;
$$;