-- Adicionar campos aos produtos para suportar cálculos de preço por peso
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS peso_unidade_kg NUMERIC,
ADD COLUMN IF NOT EXISTS rendimento_dose_gramas INTEGER;

COMMENT ON COLUMN produtos.peso_unidade_kg IS 'Peso da unidade do produto em kg (ex: balde 3.5kg)';
COMMENT ON COLUMN produtos.rendimento_dose_gramas IS 'Quantidade de gramas para fazer 1kg do produto final (ex: 30g de pistache para 1kg de gelato)';