
-- Products table (catalog per brand)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  unit text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Interactions table
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'outro',
  subject text,
  description text,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own interactions" ON public.interactions
  FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can view all interactions" ON public.interactions
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can insert interactions" ON public.interactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- Followups table
CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  assigned_to uuid NOT NULL,
  due_date date NOT NULL,
  due_time time,
  type text DEFAULT 'outro',
  subject text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own followups" ON public.followups
  FOR ALL TO authenticated
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Managers can view all followups" ON public.followups
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can manage all followups" ON public.followups
  FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_followups_updated_at
  BEFORE UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
