
-- Create enums
CREATE TYPE public.pedido_status AS ENUM ('Rascunho', 'Enviado', 'Confirmado');
CREATE TYPE public.categoria_produto AS ENUM ('Cacau', 'Base Gelato', 'Confeitaria', 'Embalagens', 'Outros');
CREATE TYPE public.unidade_produto AS ENUM ('kg', 'un', 'cx', 'lt');
CREATE TYPE public.visita_status AS ENUM ('pendente', 'visitado', 'cancelado');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  meta_mensal NUMERIC DEFAULT 0,
  empresa TEXT,
  cnpj_empresa TEXT,
  endereco_empresa TEXT,
  telefone_empresa TEXT,
  site_empresa TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_loja TEXT NOT NULL,
  nome_contato TEXT,
  cnpj TEXT,
  ie TEXT,
  telefone TEXT,
  celular TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON public.clientes FOR SELECT USING (auth.uid() = representante_id);
CREATE POLICY "Users can insert own clients" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = representante_id);
CREATE POLICY "Users can update own clients" ON public.clientes FOR UPDATE USING (auth.uid() = representante_id);
CREATE POLICY "Users can delete own clients" ON public.clientes FOR DELETE USING (auth.uid() = representante_id);

-- Produtos table (shared catalog, readable by all authenticated)
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL DEFAULT 0,
  categoria categoria_produto NOT NULL DEFAULT 'Outros',
  unidade unidade_produto NOT NULL DEFAULT 'un',
  codigo_sku TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  imagem_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.produtos FOR SELECT TO authenticated USING (true);

-- Pedidos table
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status pedido_status NOT NULL DEFAULT 'Rascunho',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  frete NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  prazo_pagamento TEXT,
  transporte TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_at TIMESTAMPTZ
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.pedidos FOR SELECT USING (auth.uid() = representante_id);
CREATE POLICY "Users can insert own orders" ON public.pedidos FOR INSERT WITH CHECK (auth.uid() = representante_id);
CREATE POLICY "Users can update own orders" ON public.pedidos FOR UPDATE USING (auth.uid() = representante_id);
CREATE POLICY "Users can delete own orders" ON public.pedidos FOR DELETE USING (auth.uid() = representante_id);

-- Itens pedido table
CREATE TABLE public.itens_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.itens_pedido FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.representante_id = auth.uid())
);
CREATE POLICY "Users can insert own order items" ON public.itens_pedido FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.representante_id = auth.uid())
);
CREATE POLICY "Users can update own order items" ON public.itens_pedido FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.representante_id = auth.uid())
);
CREATE POLICY "Users can delete own order items" ON public.itens_pedido FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.representante_id = auth.uid())
);

-- Rotas table
CREATE TABLE public.rotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_visita DATE NOT NULL,
  horario TIME,
  status visita_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routes" ON public.rotas FOR SELECT USING (auth.uid() = representante_id);
CREATE POLICY "Users can insert own routes" ON public.rotas FOR INSERT WITH CHECK (auth.uid() = representante_id);
CREATE POLICY "Users can update own routes" ON public.rotas FOR UPDATE USING (auth.uid() = representante_id);
CREATE POLICY "Users can delete own routes" ON public.rotas FOR DELETE USING (auth.uid() = representante_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rotas_updated_at BEFORE UPDATE ON public.rotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
