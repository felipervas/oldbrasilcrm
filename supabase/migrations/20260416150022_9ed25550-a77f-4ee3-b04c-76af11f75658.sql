
-- Tabela de arquivos de catálogo
CREATE TABLE public.catalogo_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  nome text NOT NULL,
  arquivo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogo_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view catalogo_arquivos" ON public.catalogo_arquivos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert catalogo_arquivos" ON public.catalogo_arquivos
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admins can update catalogo_arquivos" ON public.catalogo_arquivos
  FOR UPDATE TO authenticated USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admins can delete catalogo_arquivos" ON public.catalogo_arquivos
  FOR DELETE TO authenticated USING (is_admin_or_gestor(auth.uid()));

-- Storage bucket for catalog PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('catalogos', 'catalogos', true);

CREATE POLICY "Public can view catalog files" ON storage.objects
  FOR SELECT USING (bucket_id = 'catalogos');

CREATE POLICY "Authenticated can upload catalog files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogos');

CREATE POLICY "Authenticated can delete catalog files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'catalogos');
