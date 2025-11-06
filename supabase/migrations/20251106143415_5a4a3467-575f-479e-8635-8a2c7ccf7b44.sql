-- Habilitar RLS na view de prospects
ALTER VIEW prospects_with_last_interaction SET (security_invoker = true);

-- Garantir que a view use as permissões do usuário que a consulta
COMMENT ON VIEW prospects_with_last_interaction IS 'View otimizada de prospects com última interação - usa security invoker';