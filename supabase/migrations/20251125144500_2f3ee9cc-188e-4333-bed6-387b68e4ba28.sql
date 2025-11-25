-- Adicionar política para admins poderem deletar leads
CREATE POLICY "Admins podem deletar leads"
ON loja_leads
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Adicionar política para admins poderem atualizar leads (para marcar como processados)
CREATE POLICY "Admins podem atualizar leads"
ON loja_leads
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));