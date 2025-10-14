-- Criar tipo para categoria de transação financeira
CREATE TYPE transaction_type AS ENUM ('receita', 'despesa');

-- Criar tabela de transações financeiras
CREATE TABLE public.financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo transaction_type NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar se usuário pode ver financeiro
CREATE OR REPLACE FUNCTION public.pode_ver_financeiro(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  RETURN (
    user_email = 'felipervas@gmail.com' OR
    user_email = 'oldvasconcellos@gmail.com'
  );
END;
$$;

-- Políticas RLS para financeiro
CREATE POLICY "Usuários autorizados podem ver financeiro"
ON public.financeiro
FOR SELECT
USING (pode_ver_financeiro(auth.uid()));

CREATE POLICY "Usuários autorizados podem inserir financeiro"
ON public.financeiro
FOR INSERT
WITH CHECK (pode_ver_financeiro(auth.uid()) AND usuario_id = auth.uid());

CREATE POLICY "Usuários autorizados podem atualizar financeiro"
ON public.financeiro
FOR UPDATE
USING (pode_ver_financeiro(auth.uid()) AND usuario_id = auth.uid());

CREATE POLICY "Usuários autorizados podem deletar financeiro"
ON public.financeiro
FOR DELETE
USING (pode_ver_financeiro(auth.uid()) AND usuario_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financeiro_updated_at
BEFORE UPDATE ON public.financeiro
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();