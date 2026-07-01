
-- Adiciona coluna role em profiles para diferenciar vendedor/gerente/secretaria na UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role text NOT NULL DEFAULT 'vendedor'
      CHECK (role IN ('vendedor','gerente','secretaria'));
  END IF;
END $$;

-- Backfill: usuários com role 'admin' ou 'gestor' em user_roles viram 'gerente' no profile
UPDATE public.profiles p
SET role = 'gerente'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role IN ('admin','gestor')
)
AND p.role = 'vendedor';
