-- Adicionar coluna de score aos prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 50;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS score_atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Função para calcular score de prospect
CREATE OR REPLACE FUNCTION calcular_score_prospect(prospect_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  score_final INTEGER := 50;
  dias_sem_contato INTEGER;
  num_interacoes INTEGER;
  ultimo_contato DATE;
BEGIN
  -- Buscar dados do prospect
  SELECT 
    data_ultimo_contato,
    CURRENT_DATE - COALESCE(data_ultimo_contato, created_at::DATE) as dias,
    (SELECT COUNT(*) FROM prospect_interacoes WHERE prospect_interacoes.prospect_id = prospects.id) as interacoes
  INTO ultimo_contato, dias_sem_contato, num_interacoes
  FROM prospects
  WHERE id = prospect_id;

  -- Pontuação base por prioridade
  SELECT CASE prioridade
    WHEN 'alta' THEN 70
    WHEN 'media' THEN 50
    WHEN 'baixa' THEN 30
    ELSE 50
  END INTO score_final
  FROM prospects
  WHERE id = prospect_id;

  -- Ajustar por porte da empresa
  SELECT score_final + CASE porte
    WHEN 'grande' THEN 20
    WHEN 'medio' THEN 10
    WHEN 'pequeno' THEN 5
    ELSE 0
  END INTO score_final
  FROM prospects
  WHERE id = prospect_id;

  -- Penalizar por tempo sem contato
  IF dias_sem_contato > 60 THEN
    score_final := score_final - 30;
  ELSIF dias_sem_contato > 30 THEN
    score_final := score_final - 20;
  ELSIF dias_sem_contato > 14 THEN
    score_final := score_final - 10;
  ELSIF dias_sem_contato <= 7 THEN
    score_final := score_final + 10;
  END IF;

  -- Bonificar por número de interações
  IF num_interacoes > 10 THEN
    score_final := score_final + 15;
  ELSIF num_interacoes > 5 THEN
    score_final := score_final + 10;
  ELSIF num_interacoes > 2 THEN
    score_final := score_final + 5;
  END IF;

  -- Ajustar por status
  SELECT score_final + CASE status
    WHEN 'qualificado' THEN 20
    WHEN 'em_negociacao' THEN 25
    WHEN 'proposta_enviada' THEN 30
    WHEN 'novo' THEN 0
    WHEN 'perdido' THEN -100
    WHEN 'convertido' THEN 100
    ELSE 0
  END INTO score_final
  FROM prospects
  WHERE id = prospect_id;

  -- Garantir que o score está entre 0 e 100
  score_final := GREATEST(0, LEAST(100, score_final));

  RETURN score_final;
END;
$$;

-- Trigger para atualizar score automaticamente
CREATE OR REPLACE FUNCTION atualizar_score_prospect_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.score := calcular_score_prospect(NEW.id);
  NEW.score_atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_score_prospect ON prospects;
CREATE TRIGGER trigger_atualizar_score_prospect
BEFORE INSERT OR UPDATE OF prioridade, status, porte, data_ultimo_contato ON prospects
FOR EACH ROW
EXECUTE FUNCTION atualizar_score_prospect_trigger();

-- Trigger para atualizar score quando há nova interação
CREATE OR REPLACE FUNCTION atualizar_score_apos_interacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE prospects
  SET 
    score = calcular_score_prospect(NEW.prospect_id),
    score_atualizado_em = NOW()
  WHERE id = NEW.prospect_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_score_apos_interacao ON prospect_interacoes;
CREATE TRIGGER trigger_score_apos_interacao
AFTER INSERT OR UPDATE ON prospect_interacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_score_apos_interacao();

-- View para análise de motivos de perda
CREATE OR REPLACE VIEW v_analise_perda AS
SELECT 
  motivo_perda,
  COUNT(*) as total_perdas,
  COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM prospects WHERE status = 'perdido'), 0) as percentual,
  AVG(EXTRACT(DAY FROM (updated_at - created_at))) as dias_medio_ate_perda
FROM prospects
WHERE status = 'perdido' AND motivo_perda IS NOT NULL
GROUP BY motivo_perda
ORDER BY total_perdas DESC;

-- View para análise de perda por vendedor
CREATE OR REPLACE VIEW v_perda_por_vendedor AS
SELECT 
  p.responsavel_id,
  pr.nome as vendedor_nome,
  COUNT(*) FILTER (WHERE p.status = 'perdido') as total_perdas,
  COUNT(*) FILTER (WHERE p.status = 'convertido') as total_ganhos,
  COUNT(*) as total_prospects,
  ROUND(COUNT(*) FILTER (WHERE p.status = 'convertido') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_conversao,
  ROUND(COUNT(*) FILTER (WHERE p.status = 'perdido') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_perda
FROM prospects p
LEFT JOIN profiles pr ON p.responsavel_id = pr.id
WHERE p.responsavel_id IS NOT NULL
GROUP BY p.responsavel_id, pr.nome
ORDER BY taxa_conversao DESC;

-- View para performance de vendedores
CREATE OR REPLACE VIEW v_performance_vendedores AS
SELECT 
  pr.id as vendedor_id,
  pr.nome as vendedor_nome,
  -- Prospects
  COUNT(DISTINCT p.id) as total_prospects,
  COUNT(DISTINCT CASE WHEN p.status = 'convertido' THEN p.id END) as prospects_convertidos,
  COUNT(DISTINCT CASE WHEN p.status = 'perdido' THEN p.id END) as prospects_perdidos,
  ROUND(COUNT(DISTINCT CASE WHEN p.status = 'convertido' THEN p.id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN p.status IN ('convertido', 'perdido') THEN p.id END), 0), 2) as taxa_conversao,
  -- Pedidos
  COUNT(DISTINCT ped.id) as total_pedidos,
  COALESCE(SUM(ped.valor_total), 0) as faturamento_total,
  COALESCE(AVG(ped.valor_total), 0) as ticket_medio,
  -- Tarefas
  COUNT(DISTINCT t.id) as total_tarefas,
  COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) as tarefas_concluidas,
  ROUND(COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT t.id), 0), 2) as taxa_conclusao_tarefas,
  -- Tempo médio de resposta (em horas)
  ROUND(AVG(EXTRACT(EPOCH FROM (pi.data_interacao - p.created_at)) / 3600), 2) as tempo_primeira_resposta_horas
FROM profiles pr
LEFT JOIN prospects p ON p.responsavel_id = pr.id
LEFT JOIN pedidos ped ON ped.responsavel_venda_id = pr.id AND ped.status != 'cancelado'
LEFT JOIN tarefas t ON t.responsavel_id = pr.id
LEFT JOIN LATERAL (
  SELECT MIN(data_interacao) as data_interacao
  FROM prospect_interacoes
  WHERE prospect_id = p.id
) pi ON true
WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = pr.id AND role = 'colaborador')
GROUP BY pr.id, pr.nome
ORDER BY faturamento_total DESC;

-- Atualizar scores de todos os prospects existentes
UPDATE prospects 
SET score = calcular_score_prospect(id), 
    score_atualizado_em = NOW()
WHERE score IS NULL OR score = 50;