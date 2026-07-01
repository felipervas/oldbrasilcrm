-- =========================================================
-- 1) NOTIFICAÇÕES INTERNAS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  cliente_id UUID,
  opportunity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_lida ON public.notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notifications_cliente ON public.notifications(cliente_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

-- =========================================================
-- 2) QUALIFICAÇÃO BANT
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qualificacao_bant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL UNIQUE,
  budget_texto TEXT,
  budget_valor_estimado NUMERIC,
  authority_nome TEXT,
  authority_cargo TEXT,
  need_descricao TEXT,
  timing_tipo TEXT, -- 'imediato' | '30d' | '60d' | '90d_mais' | 'data'
  timing_data DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.qualificacao_bant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View bant via opportunity" ON public.qualificacao_bant;
CREATE POLICY "View bant via opportunity"
ON public.qualificacao_bant FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = qualificacao_bant.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

DROP POLICY IF EXISTS "Manage bant via opportunity" ON public.qualificacao_bant;
CREATE POLICY "Manage bant via opportunity"
ON public.qualificacao_bant FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = qualificacao_bant.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = qualificacao_bant.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

CREATE TRIGGER trg_bant_updated_at
BEFORE UPDATE ON public.qualificacao_bant
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3) RESPOSTAS DO PLAYBOOK
-- =========================================================
CREATE TABLE IF NOT EXISTS public.playbook_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  item_checklist TEXT NOT NULL,
  resposta JSONB NOT NULL DEFAULT '{}'::jsonb,
  respondido_por UUID,
  respondido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, stage_id, item_checklist)
);

CREATE INDEX IF NOT EXISTS idx_playbook_resp_opp ON public.playbook_respostas(opportunity_id);

ALTER TABLE public.playbook_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View playbook respostas via opportunity" ON public.playbook_respostas;
CREATE POLICY "View playbook respostas via opportunity"
ON public.playbook_respostas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = playbook_respostas.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

DROP POLICY IF EXISTS "Manage playbook respostas via opportunity" ON public.playbook_respostas;
CREATE POLICY "Manage playbook respostas via opportunity"
ON public.playbook_respostas FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = playbook_respostas.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id = playbook_respostas.opportunity_id
    AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

CREATE TRIGGER trg_playbook_resp_updated_at
BEFORE UPDATE ON public.playbook_respostas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4) SOFT DELETE EM OPORTUNIDADES
-- =========================================================
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at ON public.opportunities(deleted_at);

-- =========================================================
-- 6) PARCELAS DE PEDIDO (boleto)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pedido_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL,
  numero_parcela INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago | atrasado | cancelado
  pago_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, numero_parcela)
);

CREATE INDEX IF NOT EXISTS idx_parcelas_pedido ON public.pedido_parcelas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_venc ON public.pedido_parcelas(vencimento, status);

ALTER TABLE public.pedido_parcelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View parcelas via pedido" ON public.pedido_parcelas;
CREATE POLICY "View parcelas via pedido"
ON public.pedido_parcelas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_parcelas.pedido_id
    AND (p.representante_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

DROP POLICY IF EXISTS "Manage parcelas via pedido" ON public.pedido_parcelas;
CREATE POLICY "Manage parcelas via pedido"
ON public.pedido_parcelas FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_parcelas.pedido_id
    AND (p.representante_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_parcelas.pedido_id
    AND (p.representante_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
));

CREATE TRIGGER trg_parcelas_updated_at
BEFORE UPDATE ON public.pedido_parcelas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 8) PRODUTOS — campos extras
-- =========================================================
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT,
  ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC,
  ADD COLUMN IF NOT EXISTS volume NUMERIC,
  ADD COLUMN IF NOT EXISTS descricao_detalhada TEXT,
  ADD COLUMN IF NOT EXISTS codigo_referencia TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- =========================================================
-- 2-bis) ETAPAS DO FUNIL — reseed para fluxo BANT
-- (Mantém UUIDs existentes quando o nome bater; adiciona novas)
-- =========================================================
DO $$
DECLARE
  v_perdido_id UUID;
BEGIN
  -- Garantir que estágios existem com nomes corretos e ordem
  -- 1 Lead Captado
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Lead Captado', 1, 10, '#64748B'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name IN ('Lead Captado','Lead captado'));

  UPDATE public.pipeline_stages SET name='Lead Captado', sort_order=1, default_probability=10, color='#64748B'
   WHERE name IN ('Lead captado');

  -- 2 Qualificação BANT
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Qualificação BANT', 2, 25, '#0EA5E9'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name IN ('Qualificação BANT','Qualificação','Qualificacao'));

  UPDATE public.pipeline_stages SET name='Qualificação BANT', sort_order=2, default_probability=25, color='#0EA5E9'
   WHERE name IN ('Qualificação','Qualificacao');

  -- 3 Proposta
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Proposta', 3, 50, '#F59E0B'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name='Proposta');
  UPDATE public.pipeline_stages SET sort_order=3, default_probability=50, color='#F59E0B' WHERE name='Proposta';

  -- 4 Negociação
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Negociação', 4, 70, '#D4A843'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name IN ('Negociação','Negociacao'));
  UPDATE public.pipeline_stages SET name='Negociação', sort_order=4, default_probability=70, color='#D4A843' WHERE name='Negociacao';
  UPDATE public.pipeline_stages SET sort_order=4, default_probability=70, color='#D4A843' WHERE name='Negociação';

  -- 5 Fechamento
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Fechamento', 5, 90, '#22C55E'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name IN ('Fechamento','Fechado ganho'));
  UPDATE public.pipeline_stages SET name='Fechamento', sort_order=5, default_probability=90, color='#22C55E'
   WHERE name='Fechado ganho';

  -- 6 Pós-venda
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Pós-venda', 6, 100, '#16A34A'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name IN ('Pós-venda','Pos-venda'));

  -- 7 Fechado perdido (terminal — mantém)
  INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
  SELECT 'Fechado perdido', 99, 0, '#EF4444'
  WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name='Fechado perdido');
  UPDATE public.pipeline_stages SET sort_order=99, default_probability=0, color='#EF4444' WHERE name='Fechado perdido';
END $$;
