-- Tabela de regras de comissão
CREATE TABLE public.regras_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('base', 'marca', 'produto', 'bonus_meta')),
  alvo_id UUID NULL,
  alvo_nome TEXT NULL,
  percentual NUMERIC(6,2) NOT NULL DEFAULT 0,
  meta_percentual_min NUMERIC(6,2) NULL,
  vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim DATE NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regras_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regras_comissao"
  ON public.regras_comissao FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert regras_comissao"
  ON public.regras_comissao FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can update regras_comissao"
  ON public.regras_comissao FOR UPDATE TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can delete regras_comissao"
  ON public.regras_comissao FOR DELETE TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_regras_comissao_updated_at
  BEFORE UPDATE ON public.regras_comissao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de metas mensais
CREATE TABLE public.metas_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendedor_id, ano, mes)
);

ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metas"
  ON public.metas_mensais FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can insert metas"
  ON public.metas_mensais FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can update metas"
  ON public.metas_mensais FOR UPDATE TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can delete metas"
  ON public.metas_mensais FOR DELETE TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_metas_mensais_updated_at
  BEFORE UPDATE ON public.metas_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de comissões por pedido
CREATE TABLE public.pedido_comissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL UNIQUE,
  vendedor_id UUID NOT NULL,
  valor_bruto NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_base NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pedido_comissoes"
  ON public.pedido_comissoes FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

CREATE POLICY "Users can insert own pedido_comissoes"
  ON public.pedido_comissoes FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

CREATE POLICY "Users can update own pedido_comissoes"
  ON public.pedido_comissoes FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can delete pedido_comissoes"
  ON public.pedido_comissoes FOR DELETE TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_pedido_comissoes_updated_at
  BEFORE UPDATE ON public.pedido_comissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pedido_comissoes_vendedor ON public.pedido_comissoes(vendedor_id);
CREATE INDEX idx_pedido_comissoes_calculado_em ON public.pedido_comissoes(calculado_em);
CREATE INDEX idx_metas_mensais_vendedor_periodo ON public.metas_mensais(vendedor_id, ano, mes);

-- Seed inicial de regras
INSERT INTO public.regras_comissao (nome, tipo, percentual, ativo) VALUES
  ('Comissão Base', 'base', 5, true),
  ('BUONO', 'marca', 6, true),
  ('GENCAU', 'marca', 8, true),
  ('IMPEL', 'marca', 5, true),
  ('ISOTERM', 'marca', 7, true),
  ('La Serenissima', 'marca', 6, true);

INSERT INTO public.regras_comissao (nome, tipo, percentual, meta_percentual_min, ativo) VALUES
  ('Bônus 100% da meta', 'bonus_meta', 1, 100, true),
  ('Bônus 120% da meta', 'bonus_meta', 2, 120, true);

-- Atualiza alvo_nome para regras de marca usando o nome da marca quando existir em brands
UPDATE public.regras_comissao rc
SET alvo_id = b.id, alvo_nome = b.name
FROM public.brands b
WHERE rc.tipo = 'marca' AND lower(rc.nome) = lower(b.name);