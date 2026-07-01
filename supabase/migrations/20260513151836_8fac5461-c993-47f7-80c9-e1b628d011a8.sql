
-- opportunities
DROP POLICY IF EXISTS "Managers can view all opportunities" ON public.opportunities;
CREATE POLICY "Authenticated can view all opportunities" ON public.opportunities FOR SELECT TO authenticated USING (true);

-- interactions
DROP POLICY IF EXISTS "Managers can view all interactions" ON public.interactions;
CREATE POLICY "Authenticated can view all interactions" ON public.interactions FOR SELECT TO authenticated USING (true);

-- visitas
DROP POLICY IF EXISTS "Managers can view all visitas" ON public.visitas;
CREATE POLICY "Authenticated can view all visitas" ON public.visitas FOR SELECT TO authenticated USING (true);

-- rotas
DROP POLICY IF EXISTS "Managers can view all routes" ON public.rotas;
DROP POLICY IF EXISTS "Users can view own routes" ON public.rotas;
CREATE POLICY "Authenticated can view all rotas" ON public.rotas FOR SELECT TO authenticated USING (true);

-- amostras_enviadas
DROP POLICY IF EXISTS "Owners can view own amostras" ON public.amostras_enviadas;
CREATE POLICY "Authenticated can view all amostras" ON public.amostras_enviadas FOR SELECT TO authenticated USING (true);

-- timeline_events
DROP POLICY IF EXISTS "Users can view related timeline events" ON public.timeline_events;
CREATE POLICY "Authenticated can view all timeline_events" ON public.timeline_events FOR SELECT TO authenticated USING (true);

-- qualificacao_bant
DROP POLICY IF EXISTS "View bant via opportunity" ON public.qualificacao_bant;
CREATE POLICY "Authenticated can view all qualificacao_bant" ON public.qualificacao_bant FOR SELECT TO authenticated USING (true);

-- playbook_respostas
DROP POLICY IF EXISTS "View playbook respostas via opportunity" ON public.playbook_respostas;
CREATE POLICY "Authenticated can view all playbook_respostas" ON public.playbook_respostas FOR SELECT TO authenticated USING (true);

-- opportunity_playbook_progress
DROP POLICY IF EXISTS "Users can view related progress" ON public.opportunity_playbook_progress;
CREATE POLICY "Authenticated can view all opportunity_playbook_progress" ON public.opportunity_playbook_progress FOR SELECT TO authenticated USING (true);

-- opportunity_brands
DROP POLICY IF EXISTS "Users can view opportunity brands" ON public.opportunity_brands;
CREATE POLICY "Authenticated can view all opportunity_brands" ON public.opportunity_brands FOR SELECT TO authenticated USING (true);

-- pedido_parcelas
DROP POLICY IF EXISTS "View parcelas via pedido" ON public.pedido_parcelas;
CREATE POLICY "Authenticated can view all pedido_parcelas" ON public.pedido_parcelas FOR SELECT TO authenticated USING (true);

-- profiles (mostrar nomes dos colegas)
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
