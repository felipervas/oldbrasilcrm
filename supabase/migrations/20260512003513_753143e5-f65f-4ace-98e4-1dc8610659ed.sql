BEGIN;

CREATE OR REPLACE FUNCTION public.fix_mojibake_mac(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r text := COALESCE(t, '');
  pairs text[][] := ARRAY[
    -- minúsculas
    ['√°','á'], ['√¢','â'], ['√£','ã'], ['√§','ä'], ['√•','å'],
    ['√ß','ç'],
    ['√®','è'], ['√©','é'], ['√™','ê'], ['√´','ë'],
    ['√¨','ì'], ['√≠','í'], ['√Æ','î'], ['√Ø','ï'],
    ['√±','ñ'],
    ['√≤','ò'], ['√≥','ó'], ['√¥','ô'], ['√µ','õ'], ['√∂','ö'],
    ['√∏','ø'], ['√π','ù'], ['√∫','ú'], ['√ª','û'], ['√º','ü'],
    -- maiúsculas
    ['√Å','Á'], ['√Ç','Â'], ['√É','Ã'], ['√Ñ','Ä'], ['√Ö','Å'],
    ['√á','Ç'],
    ['√à','È'], ['√â','É'], ['√ä','Ê'], ['√ã','Ë'],
    ['√å','Ì'], ['√ç','Í'], ['√é','Î'], ['√è','Ï'],
    ['√ë','Ñ'],
    ['√í','Ò'], ['√ì','Ó'], ['√î','Ô'], ['√ï','Õ'], ['√ñ','Ö'],
    ['√ô','Ù'], ['√ö','Ú'], ['√õ','Û'], ['√ú','Ü']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(pairs, 1) LOOP
    r := replace(r, pairs[i][1], pairs[i][2]);
  END LOOP;
  RETURN r;
END;
$$;

-- Clientes
UPDATE public.clientes SET
  nome_loja           = public.fix_mojibake_mac(nome_loja),
  nome_contato        = public.fix_mojibake_mac(nome_contato),
  cidade              = public.fix_mojibake_mac(cidade),
  bairro              = public.fix_mojibake_mac(bairro),
  endereco            = public.fix_mojibake_mac(endereco),
  logradouro          = public.fix_mojibake_mac(logradouro),
  municipio           = public.fix_mojibake_mac(municipio),
  observacoes         = public.fix_mojibake_mac(observacoes),
  tags                = public.fix_mojibake_mac(tags),
  marcas_concorrentes = public.fix_mojibake_mac(marcas_concorrentes)
WHERE
  nome_loja LIKE '%√%' OR nome_contato LIKE '%√%' OR cidade LIKE '%√%'
  OR bairro LIKE '%√%' OR endereco LIKE '%√%' OR logradouro LIKE '%√%'
  OR municipio LIKE '%√%' OR observacoes LIKE '%√%' OR tags LIKE '%√%'
  OR marcas_concorrentes LIKE '%√%';

-- Produtos
UPDATE public.produtos SET
  nome                = public.fix_mojibake_mac(nome),
  descricao           = public.fix_mojibake_mac(descricao),
  descricao_detalhada = public.fix_mojibake_mac(descricao_detalhada),
  marca               = public.fix_mojibake_mac(marca),
  subcategoria        = public.fix_mojibake_mac(subcategoria),
  observacoes         = public.fix_mojibake_mac(observacoes)
WHERE
  nome LIKE '%√%' OR descricao LIKE '%√%' OR descricao_detalhada LIKE '%√%'
  OR marca LIKE '%√%' OR subcategoria LIKE '%√%' OR observacoes LIKE '%√%';

-- Brands
UPDATE public.brands SET
  name              = public.fix_mojibake_mac(name),
  short_description = public.fix_mojibake_mac(short_description),
  category          = public.fix_mojibake_mac(category)
WHERE name LIKE '%√%' OR short_description LIKE '%√%' OR category LIKE '%√%';

-- Pedidos
UPDATE public.pedidos SET
  cliente_nome = public.fix_mojibake_mac(cliente_nome),
  observacoes  = public.fix_mojibake_mac(observacoes)
WHERE cliente_nome LIKE '%√%' OR observacoes LIKE '%√%';

-- Itens de pedido
UPDATE public.itens_pedido SET
  produto_nome  = public.fix_mojibake_mac(produto_nome),
  produto_marca = public.fix_mojibake_mac(produto_marca)
WHERE produto_nome LIKE '%√%' OR produto_marca LIKE '%√%';

-- TAREFA 2: normaliza travessões em CNPJ/CPF
UPDATE public.clientes SET
  cnpj     = translate(cnpj,     E'\u2013\u2014\u2212', '---'),
  cnpj_cpf = translate(cnpj_cpf, E'\u2013\u2014\u2212', '---')
WHERE cnpj     ~ '[\u2013\u2014\u2212]'
   OR cnpj_cpf ~ '[\u2013\u2014\u2212]';

COMMIT;