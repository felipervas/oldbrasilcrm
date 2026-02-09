-- Drop the existing FK constraint and recreate with ON DELETE SET NULL
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;

ALTER TABLE public.audit_log 
  ADD CONSTRAINT audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE SET NULL;