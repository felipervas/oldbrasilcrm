-- Alterar foreign key de prospects para referenciar profiles ao invés de auth.users
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_responsavel_id_fkey;

ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_responsavel_id_fkey 
FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id);

-- Alterar foreign key de prospect_interacoes para referenciar profiles ao invés de auth.users
ALTER TABLE public.prospect_interacoes 
DROP CONSTRAINT IF EXISTS prospect_interacoes_usuario_id_fkey;

ALTER TABLE public.prospect_interacoes 
ADD CONSTRAINT prospect_interacoes_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES public.profiles(id);