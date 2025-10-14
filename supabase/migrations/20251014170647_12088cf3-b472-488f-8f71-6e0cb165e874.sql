-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de amostras
CREATE TABLE IF NOT EXISTS public.amostras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_id UUID NOT NULL,
  retorno TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.amostras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Colaboradores podem ver amostras"
  ON public.amostras FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role])
  );

CREATE POLICY "Colaboradores podem inserir amostras"
  ON public.amostras FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role])
    AND responsavel_id = auth.uid()
  );

CREATE POLICY "Colaboradores podem atualizar amostras"
  ON public.amostras FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role])
  );

CREATE POLICY "Admin e gestor podem deletar amostras"
  ON public.amostras FOR DELETE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role])
  );

-- Trigger para updated_at
CREATE TRIGGER update_amostras_updated_at
  BEFORE UPDATE ON public.amostras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();