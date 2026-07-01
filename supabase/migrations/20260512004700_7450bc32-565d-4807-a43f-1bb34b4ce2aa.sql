BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public._backfill_products_log_20260511 (
  stage text PRIMARY KEY,
  rows_updated int NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now()
);
TRUNCATE public._backfill_products_log_20260511;

-- ETAPA A: match estrito
WITH src AS (
  SELECT lower(btrim(nome)) AS key, max(preco) AS preco
  FROM public.produtos
  WHERE preco > 0
  GROUP BY 1
),
upd AS (
  UPDATE public.products p
     SET price = src.preco,
         updated_at = now()
    FROM src
   WHERE (p.price IS NULL OR p.price = 0)
     AND lower(btrim(p.name)) = src.key
  RETURNING p.id
)
INSERT INTO public._backfill_products_log_20260511 (stage, rows_updated)
SELECT 'A_estrito', count(*) FROM upd;

-- ETAPA B: match normalizado (unaccent + espaços colapsados)
WITH src AS (
  SELECT lower(unaccent(regexp_replace(btrim(nome), ' +', ' ', 'g'))) AS key,
         max(preco) AS preco
  FROM public.produtos
  WHERE preco > 0
  GROUP BY 1
),
upd AS (
  UPDATE public.products p
     SET price = src.preco,
         updated_at = now()
    FROM src
   WHERE (p.price IS NULL OR p.price = 0)
     AND lower(unaccent(regexp_replace(btrim(p.name), ' +', ' ', 'g'))) = src.key
  RETURNING p.id
)
INSERT INTO public._backfill_products_log_20260511 (stage, rows_updated)
SELECT 'B_normalizado', count(*) FROM upd;

-- Marca a tabela legada como deprecada
COMMENT ON TABLE public.produtos IS
'DEPRECATED - usar tabela products. Backfill de preços executado em 2026-05-11. Manter como backup até validação em produção.';

COMMIT;