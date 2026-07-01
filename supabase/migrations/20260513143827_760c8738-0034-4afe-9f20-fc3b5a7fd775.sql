
-- Tipos de tabela de preço
CREATE TYPE public.tipo_tabela_preco AS ENUM ('tabela_1','tabela_2','tabela_3','tabela_4','distribuidor');

-- Tabela produto_precos (vinculada à tabela produtos usada nos pedidos)
CREATE TABLE public.produto_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo_tabela public.tipo_tabela_preco NOT NULL,
  preco numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, tipo_tabela)
);

CREATE INDEX idx_produto_precos_produto ON public.produto_precos(produto_id);

ALTER TABLE public.produto_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view produto_precos"
  ON public.produto_precos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert produto_precos"
  ON public.produto_precos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can update produto_precos"
  ON public.produto_precos FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can delete produto_precos"
  ON public.produto_precos FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER trg_produto_precos_updated
BEFORE UPDATE ON public.produto_precos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna tabela_preco em itens_pedido
ALTER TABLE public.itens_pedido ADD COLUMN tabela_preco text;

-- Popular 5 preços (zerados) para todos os produtos Gencau existentes
INSERT INTO public.produto_precos (produto_id, tipo_tabela, preco)
SELECT p.id, t.tipo, 0
FROM public.produtos p
CROSS JOIN (VALUES ('tabela_1'::public.tipo_tabela_preco),('tabela_2'),('tabela_3'),('tabela_4'),('distribuidor')) AS t(tipo)
WHERE p.marca ILIKE 'gencau'
ON CONFLICT (produto_id, tipo_tabela) DO NOTHING;
