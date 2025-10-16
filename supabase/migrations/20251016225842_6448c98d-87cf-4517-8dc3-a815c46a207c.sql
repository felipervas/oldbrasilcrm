-- Adicionar colunas para sistema de preços voláteis (Genial/Cacau)
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS preco_por_kg NUMERIC,
ADD COLUMN IF NOT EXISTS peso_embalagem_kg NUMERIC DEFAULT 25,
ADD COLUMN IF NOT EXISTS tipo_calculo TEXT;

-- Criar tabela de receitas
CREATE TABLE IF NOT EXISTS public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS policies para receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver receitas"
  ON public.receitas FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir receitas"
  ON public.receitas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar suas receitas"
  ON public.receitas FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas receitas"
  ON public.receitas FOR DELETE
  USING (usuario_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER handle_updated_at_receitas BEFORE UPDATE ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Criar bucket de storage para receitas
INSERT INTO storage.buckets (id, name, public)
VALUES ('receitas', 'receitas', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket receitas
CREATE POLICY "Todos podem ver receitas storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receitas');

CREATE POLICY "Usuários autenticados podem fazer upload receitas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receitas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem deletar seus uploads receitas"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receitas' AND auth.uid() IS NOT NULL);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON public.produtos(sku);
CREATE INDEX IF NOT EXISTS idx_produtos_marca ON public.produtos(marca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_fantasia ON public.clientes(nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON public.pedidos(data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_receitas_categoria ON public.receitas(categoria);
CREATE INDEX IF NOT EXISTS idx_receitas_usuario ON public.receitas(usuario_id);