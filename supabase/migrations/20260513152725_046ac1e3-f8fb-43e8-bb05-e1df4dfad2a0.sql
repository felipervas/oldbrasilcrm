
DROP POLICY IF EXISTS "Authenticated can view all followups" ON public.followups;
DROP POLICY IF EXISTS "Managers can manage all followups" ON public.followups;
DROP POLICY IF EXISTS "Managers can view all followups" ON public.followups;
DROP POLICY IF EXISTS "Owners can manage own followups" ON public.followups;

CREATE POLICY "Authenticated can view all followups" ON public.followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert followups" ON public.followups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update followups" ON public.followups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete followups" ON public.followups FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can delete own routes" ON public.rotas;
DROP POLICY IF EXISTS "Users can insert own routes" ON public.rotas;
DROP POLICY IF EXISTS "Users can update own routes" ON public.rotas;

CREATE POLICY "Authenticated can insert rotas" ON public.rotas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rotas" ON public.rotas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete rotas" ON public.rotas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can update all visitas" ON public.visitas;
DROP POLICY IF EXISTS "Owners can manage own visitas" ON public.visitas;

CREATE POLICY "Authenticated can insert visitas" ON public.visitas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update visitas" ON public.visitas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete visitas" ON public.visitas FOR DELETE TO authenticated USING (true);
