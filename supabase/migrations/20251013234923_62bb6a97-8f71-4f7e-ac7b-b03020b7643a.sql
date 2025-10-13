-- Recriar função pode_ver_faturamento com search_path seguro
CREATE OR REPLACE FUNCTION pode_ver_faturamento(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  RETURN (
    user_email = 'felipervas@gmail.com' OR
    user_email LIKE '%@oldvasconcellos.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;