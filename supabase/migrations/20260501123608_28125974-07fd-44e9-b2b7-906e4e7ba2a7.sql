
CREATE TABLE public.amostras_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  produto_nome text NOT NULL,
  produto_marca text,
  quantidade numeric NOT NULL DEFAULT 1,
  data_envio date NOT NULL DEFAULT CURRENT_DATE,
  forma_envio text,
  codigo_rastreio text,
  observacoes text,
  status text NOT NULL DEFAULT 'enviada',
  feedback_cliente text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.amostras_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own amostras"
  ON public.amostras_enviadas FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Owners can insert own amostras"
  ON public.amostras_enviadas FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Owners can update own amostras"
  ON public.amostras_enviadas FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Owners can delete own amostras"
  ON public.amostras_enviadas FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_amostras_enviadas_updated_at
  BEFORE UPDATE ON public.amostras_enviadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_amostras_opportunity ON public.amostras_enviadas(opportunity_id);
CREATE INDEX idx_amostras_cliente ON public.amostras_enviadas(cliente_id);
CREATE INDEX idx_amostras_created_by ON public.amostras_enviadas(created_by);
