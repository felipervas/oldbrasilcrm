-- ============================================================================
-- MOTOR DE E-COMMERCE (estilo NuvemShop)
-- Carrinho, cupons, frete, checkout, pedidos, pagamentos e rastreio.
-- Tabelas prefixadas com ecom_ para não conflitar com o CRM (pedidos B2B).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Campos de e-commerce nos produtos existentes
-- ----------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS preco_promocional numeric,
  ADD COLUMN IF NOT EXISTS controlar_estoque boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS altura_cm numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS largura_cm numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS comprimento_cm numeric NOT NULL DEFAULT 20;

COMMENT ON COLUMN public.produtos.controlar_estoque IS
  'Quando true, o checkout bloqueia compra acima do saldo_estoque e baixa estoque ao pagar';

-- ----------------------------------------------------------------------------
-- 2) Enums
-- ----------------------------------------------------------------------------
CREATE TYPE public.ecom_pedido_status AS ENUM (
  'aguardando_pagamento', 'pago', 'em_separacao', 'enviado',
  'entregue', 'cancelado', 'reembolsado'
);

CREATE TYPE public.ecom_pagamento_status AS ENUM (
  'pendente', 'aprovado', 'recusado', 'estornado', 'cancelado'
);

CREATE TYPE public.ecom_cupom_tipo AS ENUM ('percentual', 'valor_fixo', 'frete_gratis');

-- ----------------------------------------------------------------------------
-- 3) Configuração da loja (linha única)
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_loja text NOT NULL DEFAULT 'Projeto Vida Serena',
  email_contato text,
  cep_origem text NOT NULL DEFAULT '01310-100',
  frete_gratis_acima numeric,
  prazo_postagem_dias integer NOT NULL DEFAULT 2,
  checkout_ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ecom_config (id) VALUES (1);

-- ----------------------------------------------------------------------------
-- 4) Clientes da loja e endereços
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text,
  cpf_cnpj text,
  aceita_marketing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ecom_enderecos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.ecom_clientes(id) ON DELETE CASCADE,
  apelido text,
  destinatario text,
  cep text NOT NULL,
  logradouro text NOT NULL,
  numero text NOT NULL,
  complemento text,
  bairro text,
  cidade text NOT NULL,
  uf text NOT NULL,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_enderecos_cliente ON public.ecom_enderecos (cliente_id);

-- ----------------------------------------------------------------------------
-- 5) Cupons de desconto
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  tipo public.ecom_cupom_tipo NOT NULL,
  valor numeric NOT NULL DEFAULT 0, -- % para percentual, R$ para valor_fixo
  pedido_minimo numeric,
  validade_inicio timestamptz,
  validade_fim timestamptz,
  limite_usos integer,
  usos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6) Carrinho (suporta visitante anônimo via session_token)
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_carrinhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.ecom_clientes(id) ON DELETE SET NULL,
  cupom_id uuid REFERENCES public.ecom_cupons(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'aberto', -- aberto | convertido | abandonado
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_carrinhos_token ON public.ecom_carrinhos (session_token);
CREATE INDEX idx_ecom_carrinhos_status ON public.ecom_carrinhos (status, updated_at);

CREATE TABLE public.ecom_carrinho_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrinho_id uuid NOT NULL REFERENCES public.ecom_carrinhos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrinho_id, produto_id)
);

CREATE INDEX idx_ecom_carrinho_itens_carrinho ON public.ecom_carrinho_itens (carrinho_id);

-- ----------------------------------------------------------------------------
-- 7) Tabela de frete de contingência (usada quando não há credenciais de
--    Correios/Melhor Envio configuradas). Faixas de CEP em prefixo numérico.
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_frete_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cep_inicio text NOT NULL, -- 8 dígitos, sem hífen
  cep_fim text NOT NULL,
  peso_max_kg numeric,      -- null = qualquer peso
  valor numeric NOT NULL,
  prazo_dias integer NOT NULL DEFAULT 7,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Faixas iniciais (ajuste os valores no painel administrativo)
INSERT INTO public.ecom_frete_regras (nome, cep_inicio, cep_fim, peso_max_kg, valor, prazo_dias) VALUES
  ('Grande São Paulo', '01000000', '09999999', NULL, 19.90, 3),
  ('Interior SP',      '10000000', '19999999', NULL, 24.90, 4),
  ('Sudeste',          '20000000', '39999999', NULL, 29.90, 5),
  ('Sul',              '80000000', '99999999', NULL, 32.90, 6),
  ('Centro-Oeste/DF',  '70000000', '79999999', NULL, 36.90, 7),
  ('Nordeste',         '40000000', '65999999', NULL, 42.90, 9),
  ('Norte',            '66000000', '69999999', NULL, 49.90, 12);

-- ----------------------------------------------------------------------------
-- 8) Pedidos da loja
-- ----------------------------------------------------------------------------
CREATE SEQUENCE public.ecom_pedido_numero_seq START WITH 1001;

CREATE TABLE public.ecom_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint NOT NULL UNIQUE DEFAULT nextval('public.ecom_pedido_numero_seq'),
  carrinho_id uuid REFERENCES public.ecom_carrinhos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.ecom_clientes(id) ON DELETE SET NULL,
  -- snapshot do comprador (guest checkout também é suportado)
  cliente_nome text NOT NULL,
  cliente_email text NOT NULL,
  cliente_telefone text,
  cliente_cpf_cnpj text,
  endereco_entrega jsonb NOT NULL,
  subtotal numeric NOT NULL,
  desconto numeric NOT NULL DEFAULT 0,
  cupom_codigo text,
  frete_valor numeric NOT NULL DEFAULT 0,
  frete_servico text,
  frete_prazo_dias integer,
  total numeric NOT NULL,
  status public.ecom_pedido_status NOT NULL DEFAULT 'aguardando_pagamento',
  codigo_rastreio text,
  observacoes text,
  mp_preference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_pedidos_cliente ON public.ecom_pedidos (cliente_id);
CREATE INDEX idx_ecom_pedidos_status ON public.ecom_pedidos (status, created_at);
CREATE INDEX idx_ecom_pedidos_email ON public.ecom_pedidos (cliente_email);

CREATE TABLE public.ecom_pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.ecom_pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome_produto text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric NOT NULL,
  total numeric NOT NULL
);

CREATE INDEX idx_ecom_pedido_itens_pedido ON public.ecom_pedido_itens (pedido_id);

CREATE TABLE public.ecom_pedido_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.ecom_pedidos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  dados jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_pedido_eventos_pedido ON public.ecom_pedido_eventos (pedido_id, created_at);

-- ----------------------------------------------------------------------------
-- 9) Pagamentos (Mercado Pago)
-- ----------------------------------------------------------------------------
CREATE TABLE public.ecom_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.ecom_pedidos(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'mercadopago',
  metodo text,
  mp_payment_id text UNIQUE,
  status public.ecom_pagamento_status NOT NULL DEFAULT 'pendente',
  valor numeric NOT NULL DEFAULT 0,
  parcelas integer,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_pagamentos_pedido ON public.ecom_pagamentos (pedido_id);

-- ----------------------------------------------------------------------------
-- 10) Trigger de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecom_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ecom_config_updated BEFORE UPDATE ON public.ecom_config
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();
CREATE TRIGGER trg_ecom_clientes_updated BEFORE UPDATE ON public.ecom_clientes
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();
CREATE TRIGGER trg_ecom_carrinhos_updated BEFORE UPDATE ON public.ecom_carrinhos
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();
CREATE TRIGGER trg_ecom_carrinho_itens_updated BEFORE UPDATE ON public.ecom_carrinho_itens
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();
CREATE TRIGGER trg_ecom_pedidos_updated BEFORE UPDATE ON public.ecom_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();
CREATE TRIGGER trg_ecom_pagamentos_updated BEFORE UPDATE ON public.ecom_pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.ecom_touch_updated_at();

-- ----------------------------------------------------------------------------
-- 11) Funções de estoque (chamadas pelo webhook de pagamento)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecom_baixar_estoque(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos p
  SET saldo_estoque = GREATEST(COALESCE(p.saldo_estoque, 0) - i.quantidade, 0)
  FROM public.ecom_pedido_itens i
  WHERE i.pedido_id = p_pedido_id
    AND i.produto_id = p.id
    AND p.controlar_estoque = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ecom_devolver_estoque(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos p
  SET saldo_estoque = COALESCE(p.saldo_estoque, 0) + i.quantidade
  FROM public.ecom_pedido_itens i
  WHERE i.pedido_id = p_pedido_id
    AND i.produto_id = p.id
    AND p.controlar_estoque = true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12) Validação de cupom (usada pelas edge functions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecom_validar_cupom(p_codigo text, p_subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.ecom_cupons%ROWTYPE;
  v_desconto numeric := 0;
BEGIN
  SELECT * INTO c FROM public.ecom_cupons
  WHERE upper(codigo) = upper(trim(p_codigo)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom não encontrado');
  END IF;
  IF NOT c.ativo THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom inativo');
  END IF;
  IF c.validade_inicio IS NOT NULL AND now() < c.validade_inicio THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom ainda não está válido');
  END IF;
  IF c.validade_fim IS NOT NULL AND now() > c.validade_fim THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom expirado');
  END IF;
  IF c.limite_usos IS NOT NULL AND c.usos >= c.limite_usos THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom esgotado');
  END IF;
  IF c.pedido_minimo IS NOT NULL AND p_subtotal < c.pedido_minimo THEN
    RETURN jsonb_build_object('valido', false, 'motivo',
      'Pedido mínimo de R$ ' || to_char(c.pedido_minimo, 'FM999G999D00') || ' para este cupom');
  END IF;

  IF c.tipo = 'percentual' THEN
    v_desconto := round(p_subtotal * (c.valor / 100.0), 2);
  ELSIF c.tipo = 'valor_fixo' THEN
    v_desconto := LEAST(c.valor, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valido', true,
    'cupom_id', c.id,
    'codigo', c.codigo,
    'tipo', c.tipo,
    'valor', c.valor,
    'desconto', v_desconto,
    'frete_gratis', c.tipo = 'frete_gratis'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 13) RLS
--     Carrinho e checkout são operados pelas edge functions (service role).
--     Clientes autenticados enxergam apenas os próprios dados.
-- ----------------------------------------------------------------------------
ALTER TABLE public.ecom_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_enderecos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_cupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_carrinhos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_carrinho_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_frete_regras  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_pedido_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_pedido_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecom_pagamentos    ENABLE ROW LEVEL SECURITY;

-- Config: leitura pública (não guarda segredos), escrita de admin
CREATE POLICY "Config da loja é pública" ON public.ecom_config
  FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam config da loja" ON public.ecom_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clientes
CREATE POLICY "Cliente vê os próprios dados" ON public.ecom_clientes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Cliente atualiza os próprios dados" ON public.ecom_clientes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Equipe vê clientes da loja" ON public.ecom_clientes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admins gerenciam clientes da loja" ON public.ecom_clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Endereços
CREATE POLICY "Cliente gerencia os próprios endereços" ON public.ecom_enderecos
  FOR ALL TO authenticated
  USING (cliente_id IN (SELECT id FROM public.ecom_clientes WHERE user_id = auth.uid()))
  WITH CHECK (cliente_id IN (SELECT id FROM public.ecom_clientes WHERE user_id = auth.uid()));
CREATE POLICY "Admins gerenciam endereços" ON public.ecom_enderecos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cupons e regras de frete: somente admins (validação ocorre via edge function)
CREATE POLICY "Admins gerenciam cupons" ON public.ecom_cupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins gerenciam regras de frete" ON public.ecom_frete_regras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Carrinhos: acessados apenas via edge function (service role); equipe pode ver
CREATE POLICY "Equipe vê carrinhos" ON public.ecom_carrinhos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Equipe vê itens de carrinho" ON public.ecom_carrinho_itens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Pedidos
CREATE POLICY "Cliente vê os próprios pedidos" ON public.ecom_pedidos
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT id FROM public.ecom_clientes WHERE user_id = auth.uid()));
CREATE POLICY "Equipe vê pedidos da loja" ON public.ecom_pedidos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Equipe atualiza pedidos da loja" ON public.ecom_pedidos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Cliente vê itens dos próprios pedidos" ON public.ecom_pedido_itens
  FOR SELECT TO authenticated
  USING (pedido_id IN (
    SELECT p.id FROM public.ecom_pedidos p
    JOIN public.ecom_clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()));
CREATE POLICY "Equipe vê itens de pedidos" ON public.ecom_pedido_itens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Cliente vê eventos dos próprios pedidos" ON public.ecom_pedido_eventos
  FOR SELECT TO authenticated
  USING (pedido_id IN (
    SELECT p.id FROM public.ecom_pedidos p
    JOIN public.ecom_clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()));
CREATE POLICY "Equipe vê eventos de pedidos" ON public.ecom_pedido_eventos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Equipe vê pagamentos" ON public.ecom_pagamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
