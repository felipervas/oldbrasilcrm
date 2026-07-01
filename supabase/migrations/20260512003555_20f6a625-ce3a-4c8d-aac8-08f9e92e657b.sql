BEGIN;

CREATE OR REPLACE FUNCTION public.fix_mojibake_mac(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r text := COALESCE(t, '');
  pairs text[][] := ARRAY[
    ['√°','á'], ['√¢','â'], ['√£','ã'], ['√§','ä'], ['√•','å'],
    ['√ß','ç'],
    ['√®','è'], ['√©','é'], ['√™','ê'], ['√´','ë'],
    ['√¨','ì'], ['√≠','í'], ['√Æ','î'], ['√Ø','ï'],
    ['√±','ñ'],
    ['√≤','ò'], ['√≥','ó'], ['√¥','ô'], ['√µ','õ'], ['√∂','ö'],
    ['√∏','ø'], ['√π','ù'], ['√∫','ú'], ['√ª','û'], ['√º','ü'],
    ['√Ä','À'],
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

COMMIT;