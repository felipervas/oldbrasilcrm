
-- ETAPA 1: fix mojibake em products
CREATE TEMP TABLE _report (etapa text, info text, n bigint);

WITH upd AS (
  UPDATE public.products SET
    name = public.fix_mojibake_mac(name),
    description = public.fix_mojibake_mac(description),
    notes = public.fix_mojibake_mac(notes),
    descricao_detalhada = public.fix_mojibake_mac(descricao_detalhada),
    unit = public.fix_mojibake_mac(unit),
    unidade_medida = public.fix_mojibake_mac(unidade_medida),
    codigo_referencia = public.fix_mojibake_mac(codigo_referencia)
  WHERE
    name LIKE '%√%' OR description LIKE '%√%' OR notes LIKE '%√%'
    OR descricao_detalhada LIKE '%√%' OR unit LIKE '%√%'
    OR unidade_medida LIKE '%√%' OR codigo_referencia LIKE '%√%'
  RETURNING 1
)
INSERT INTO _report SELECT 'etapa1_products_mojibake', 'rows_fixed', count(*) FROM upd;

-- ETAPA 2: backfill estrito, pulando os 2 suspeitos
WITH upd AS (
  UPDATE public.products p SET price = pr.preco
  FROM public.produtos pr
  WHERE (p.price IS NULL OR p.price = 0)
    AND lower(btrim(p.name)) = lower(btrim(pr.nome))
    AND pr.preco > 0
    AND NOT (
      (lower(public.unaccent(pr.nome)) = 'cacau em po brasil - tabela 4' AND pr.preco = 0.10)
      OR (lower(public.unaccent(pr.nome)) = 'cacau em po natural jequitiba' AND pr.preco = 1.10)
    )
  RETURNING 1
)
INSERT INTO _report SELECT 'etapa2_backfill', 'rows_updated', count(*) FROM upd;

-- ETAPA 3: drop log table
DROP TABLE IF EXISTS public._backfill_products_log_20260511;

-- ETAPA 4: fix mojibake em todas outras tabelas/colunas texto
DO $$
DECLARE
  rec record;
  total bigint := 0;
  cnt bigint;
  cols text[];
  col text;
  set_clause text;
  where_clause text;
  sql text;
BEGIN
  FOR rec IN
    SELECT table_name, array_agg(column_name) AS columns
    FROM information_schema.columns
    WHERE table_schema='public'
      AND data_type IN ('text','character varying')
      AND table_name IN (
        'brands','clientes','pedidos','itens_pedido','produtos','amostras_enviadas',
        'followups','interactions','metas_mensais','notifications','opportunities',
        'pedido_parcelas','playbook_respostas','playbook_scripts','catalogo_arquivos'
      )
    GROUP BY table_name
  LOOP
    cols := rec.columns;
    set_clause := '';
    where_clause := '';
    FOREACH col IN ARRAY cols LOOP
      IF set_clause <> '' THEN set_clause := set_clause || ', '; END IF;
      set_clause := set_clause || format('%I = public.fix_mojibake_mac(%I)', col, col);
      IF where_clause <> '' THEN where_clause := where_clause || ' OR '; END IF;
      where_clause := where_clause || format('%I LIKE ''%%√%%''', col);
    END LOOP;
    sql := format('WITH u AS (UPDATE public.%I SET %s WHERE %s RETURNING 1) SELECT count(*) FROM u',
                  rec.table_name, set_clause, where_clause);
    EXECUTE sql INTO cnt;
    total := total + cnt;
    INSERT INTO _report VALUES ('etapa4_mojibake', rec.table_name, cnt);
  END LOOP;
  INSERT INTO _report VALUES ('etapa4_total', 'total_rows_fixed', total);
END $$;

-- ETAPA 5: relatório final
SELECT * FROM _report ORDER BY etapa, info;
