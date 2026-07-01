-- 1) Novos campos em clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS pessoa_compras TEXT;

-- 2) Nova etapa do pipeline "Envio de Amostras"
INSERT INTO public.pipeline_stages (name, sort_order, default_probability, color)
SELECT 'Envio de Amostras', 3, 30, '#F97316'
WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE name = 'Envio de Amostras');

-- 3) Corrigir RLS clientes (bug: is_admin_or_gestor recebia representante_id em vez de auth.uid())
DROP POLICY IF EXISTS "Users can view own or unassigned clients" ON public.clientes;
CREATE POLICY "Users can view own or unassigned clients"
  ON public.clientes FOR SELECT TO authenticated
  USING (
    auth.uid() = representante_id
    OR representante_id IS NULL
    OR is_admin_or_gestor(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own or unassigned clients" ON public.clientes;
CREATE POLICY "Users can update own or unassigned clients"
  ON public.clientes FOR UPDATE TO authenticated
  USING (
    auth.uid() = representante_id
    OR representante_id IS NULL
    OR is_admin_or_gestor(auth.uid())
  );

-- 4) Agenda compartilhada: vendedores leem todos os followups (edição segue restrita)
DROP POLICY IF EXISTS "Authenticated can view all followups" ON public.followups;
CREATE POLICY "Authenticated can view all followups"
  ON public.followups FOR SELECT TO authenticated
  USING (true);