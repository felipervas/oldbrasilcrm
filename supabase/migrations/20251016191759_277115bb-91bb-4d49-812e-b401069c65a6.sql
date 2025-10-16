-- Atualizar a função pode_ver_financeiro para usar roles ao invés de emails
CREATE OR REPLACE FUNCTION public.pode_ver_financeiro(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = user_id
      AND user_roles.role IN ('gestor', 'admin')
  );
END;
$$;

-- Atualizar a função pode_ver_faturamento para usar roles ao invés de emails
CREATE OR REPLACE FUNCTION public.pode_ver_faturamento(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = user_id
      AND user_roles.role IN ('gestor', 'admin')
  );
END;
$$;