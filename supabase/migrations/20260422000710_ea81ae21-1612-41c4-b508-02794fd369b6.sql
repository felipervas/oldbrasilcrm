
-- Adicionar coordenadas em clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- Tabela de visitas (check-in / check-out)
CREATE TABLE IF NOT EXISTS public.visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  rota_id uuid,
  pedido_id uuid,
  data_visita date NOT NULL DEFAULT CURRENT_DATE,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  latitude numeric,
  longitude numeric,
  endereco_aprox text,
  motivo text,
  resultado text NOT NULL DEFAULT 'em_andamento',
  valor_gerado numeric NOT NULL DEFAULT 0,
  observacoes text,
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitas_vendedor_data ON public.visitas (vendedor_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente ON public.visitas (cliente_id);

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own visitas" ON public.visitas;
CREATE POLICY "Owners can manage own visitas"
  ON public.visitas
  FOR ALL
  TO authenticated
  USING (auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = vendedor_id);

DROP POLICY IF EXISTS "Managers can view all visitas" ON public.visitas;
CREATE POLICY "Managers can view all visitas"
  ON public.visitas
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

DROP POLICY IF EXISTS "Managers can update all visitas" ON public.visitas;
CREATE POLICY "Managers can update all visitas"
  ON public.visitas
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

DROP TRIGGER IF EXISTS trg_visitas_updated_at ON public.visitas;
CREATE TRIGGER trg_visitas_updated_at
  BEFORE UPDATE ON public.visitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
