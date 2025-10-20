-- Criar tabela audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  user_nome text,
  acao text NOT NULL,
  entidade_tipo text NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON public.audit_log(entidade_tipo, entidade_id);

-- Habilitar RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar múltiplas roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Políticas RLS
CREATE POLICY "Gestores e admins podem ver audit log"
ON public.audit_log FOR SELECT
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role])
);

CREATE POLICY "Sistema pode inserir no audit log"
ON public.audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Função de log com search_path correto
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_user_nome text;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = auth.uid();
  
  INSERT INTO public.audit_log (
    user_id, 
    user_email,
    user_nome,
    acao, 
    entidade_tipo, 
    entidade_id, 
    detalhes
  )
  VALUES (
    auth.uid(),
    v_user_email,
    v_user_nome,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar triggers
DROP TRIGGER IF EXISTS pedidos_audit ON public.pedidos;
CREATE TRIGGER pedidos_audit
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS produtos_audit ON public.produtos;
CREATE TRIGGER produtos_audit
AFTER INSERT OR UPDATE OR DELETE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS clientes_audit ON public.clientes;
CREATE TRIGGER clientes_audit
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS amostras_audit ON public.amostras;
CREATE TRIGGER amostras_audit
AFTER INSERT OR UPDATE OR DELETE ON public.amostras
FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS tarefas_audit ON public.tarefas;
CREATE TRIGGER tarefas_audit
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION log_changes();