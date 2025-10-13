-- Atualizar RLS para permitir todos designarem tarefas
DROP POLICY IF EXISTS "Usuários podem inserir tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas tarefas" ON public.tarefas;

CREATE POLICY "Todos podem inserir tarefas" 
ON public.tarefas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar tarefas" 
ON public.tarefas 
FOR UPDATE 
USING (true);

-- Criar storage bucket para catálogos e tabelas de preço
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogos', 'catalogos', true);

-- Policies para o bucket catalogos
CREATE POLICY "Todos podem visualizar catálogos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'catalogos');

CREATE POLICY "Usuários autenticados podem fazer upload de catálogos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'catalogos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar catálogos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'catalogos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar catálogos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'catalogos' AND auth.uid() IS NOT NULL);

-- Criar tabela para registrar catálogos
CREATE TABLE IF NOT EXISTS public.catalogos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('tabela_precos', 'catalogo')),
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver catálogos"
ON public.catalogos
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem inserir catálogos"
ON public.catalogos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar catálogos"
ON public.catalogos
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar catálogos"
ON public.catalogos
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_catalogos_updated_at
BEFORE UPDATE ON public.catalogos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();