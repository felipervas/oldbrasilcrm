-- Tabela de scripts por etapa do funil
CREATE TABLE public.playbook_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL UNIQUE REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  objetivo TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_abordagem JSONB NOT NULL DEFAULT '[]'::jsonb,
  perguntas_chave JSONB NOT NULL DEFAULT '[]'::jsonb,
  objecoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  criterio_avanco TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view playbook scripts"
  ON public.playbook_scripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert playbook scripts"
  ON public.playbook_scripts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can update playbook scripts"
  ON public.playbook_scripts FOR UPDATE
  TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can delete playbook scripts"
  ON public.playbook_scripts FOR DELETE
  TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_playbook_scripts_updated_at
  BEFORE UPDATE ON public.playbook_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de progresso do checklist por oportunidade
CREATE TABLE public.opportunity_playbook_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, stage_id)
);

ALTER TABLE public.opportunity_playbook_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related progress"
  ON public.opportunity_playbook_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_playbook_progress.opportunity_id
        AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
    )
  );

CREATE POLICY "Users can insert related progress"
  ON public.opportunity_playbook_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_playbook_progress.opportunity_id
        AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
    )
  );

CREATE POLICY "Users can update related progress"
  ON public.opportunity_playbook_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_playbook_progress.opportunity_id
        AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
    )
  );

CREATE POLICY "Users can delete related progress"
  ON public.opportunity_playbook_progress FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_playbook_progress.opportunity_id
        AND (o.owner_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
    )
  );

CREATE TRIGGER update_opportunity_playbook_progress_updated_at
  BEFORE UPDATE ON public.opportunity_playbook_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_opportunity_playbook_progress_opp ON public.opportunity_playbook_progress(opportunity_id);
CREATE INDEX idx_playbook_scripts_stage ON public.playbook_scripts(stage_id);