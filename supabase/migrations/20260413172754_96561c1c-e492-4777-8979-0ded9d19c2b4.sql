
-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'vendedor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is admin or gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gestor')
  )
$$;

-- user_roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Outros',
  short_description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view brands" ON public.brands
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brands" ON public.brands
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brands" ON public.brands
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Pipeline stages
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  default_probability INT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stages" ON public.pipeline_stages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stages" ON public.pipeline_stages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Opportunities
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contact_name TEXT,
  owner_id UUID NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 0,
  temperature TEXT NOT NULL DEFAULT 'morno',
  expected_close_date DATE,
  last_interaction_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  next_action_description TEXT,
  loss_reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Vendedor vê só os seus; gestor/admin vê todos
CREATE POLICY "Owners can manage own opportunities" ON public.opportunities
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Managers can view all opportunities" ON public.opportunities
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can update all opportunities" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage_id);
CREATE INDEX idx_opportunities_company ON public.opportunities(company_id);

-- 5. Opportunity brands (many-to-many)
CREATE TABLE public.opportunity_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  UNIQUE (opportunity_id, brand_id)
);
ALTER TABLE public.opportunity_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunity brands" ON public.opportunity_brands
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())))
  );
CREATE POLICY "Users can manage own opportunity brands" ON public.opportunity_brands
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())))
  );

-- 6. Timeline events
CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related timeline events" ON public.timeline_events
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())
  );
CREATE POLICY "Users can insert timeline events" ON public.timeline_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_timeline_opportunity ON public.timeline_events(opportunity_id);
CREATE INDEX idx_timeline_company ON public.timeline_events(company_id);

-- Update profiles RLS so managers/admins can see all profiles
CREATE POLICY "Managers can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin_or_gestor(auth.uid()));

-- Update clientes RLS so managers/admins can see all clients
CREATE POLICY "Managers can view all clients" ON public.clientes
  FOR SELECT TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
