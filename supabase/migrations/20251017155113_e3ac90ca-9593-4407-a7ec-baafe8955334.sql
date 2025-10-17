-- Adicionar role admin para Felipe
INSERT INTO user_roles (user_id, role)
SELECT '742b82aa-9f86-4a6c-a686-3cec5f99612c', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = '742b82aa-9f86-4a6c-a686-3cec5f99612c' 
  AND role = 'admin'
);