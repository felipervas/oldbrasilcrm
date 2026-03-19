
-- Allow any authenticated user to update profiles (not just their own)
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
CREATE POLICY "Todos podem atualizar perfis"
  ON profiles FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow insert on profiles for authenticated users
CREATE POLICY "Todos podem inserir perfis"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow delete on profiles
CREATE POLICY "Todos podem deletar perfis"
  ON profiles FOR DELETE TO authenticated
  USING (true);

-- Fix interacoes - allow any authenticated user to insert (not just own)
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias interações" ON interacoes;
CREATE POLICY "Todos podem inserir interações"
  ON interacoes FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow delete on interacoes
CREATE POLICY "Todos podem deletar interações"
  ON interacoes FOR DELETE TO authenticated
  USING (true);

-- Fix colaborador_eventos - allow all authenticated users
DROP POLICY IF EXISTS "Usuários podem ver seus próprios eventos" ON colaborador_eventos;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios eventos" ON colaborador_eventos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios eventos" ON colaborador_eventos;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios eventos" ON colaborador_eventos;

CREATE POLICY "Todos podem ver eventos" ON colaborador_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos podem criar eventos" ON colaborador_eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Todos podem atualizar eventos" ON colaborador_eventos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar eventos" ON colaborador_eventos FOR DELETE TO authenticated USING (true);

-- Fix financeiro - allow all authenticated users
DROP POLICY IF EXISTS "Usuários autorizados podem ver financeiro" ON financeiro;
DROP POLICY IF EXISTS "Usuários autorizados podem inserir financeiro" ON financeiro;
DROP POLICY IF EXISTS "Usuários autorizados podem atualizar financeiro" ON financeiro;
DROP POLICY IF EXISTS "Usuários autorizados podem deletar financeiro" ON financeiro;

CREATE POLICY "Todos podem ver financeiro" ON financeiro FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos podem inserir financeiro" ON financeiro FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Todos podem atualizar financeiro" ON financeiro FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar financeiro" ON financeiro FOR DELETE TO authenticated USING (true);

-- Fix prospect_interacoes - allow all authenticated users
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias interações" ON prospect_interacoes;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias interações" ON prospect_interacoes;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias interações" ON prospect_interacoes;

CREATE POLICY "Todos podem inserir interações prospect" ON prospect_interacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Todos podem atualizar interações prospect" ON prospect_interacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar interações prospect" ON prospect_interacoes FOR DELETE TO authenticated USING (true);

-- Fix historico_equipe - allow all to view
DROP POLICY IF EXISTS "Gestores podem ver histórico" ON historico_equipe;
CREATE POLICY "Todos podem ver histórico equipe" ON historico_equipe FOR SELECT TO authenticated USING (true);

-- Fix audit_log - allow all to view
DROP POLICY IF EXISTS "Gestores e admins podem ver audit log" ON audit_log;
CREATE POLICY "Todos podem ver audit log" ON audit_log FOR SELECT TO authenticated USING (true);

-- Fix loja_audit_log - allow all to view
DROP POLICY IF EXISTS "Admins podem ver logs" ON loja_audit_log;
CREATE POLICY "Todos podem ver loja audit log" ON loja_audit_log FOR SELECT TO authenticated USING (true);

-- Fix loja_leads - allow all
DROP POLICY IF EXISTS "Admins podem ver leads" ON loja_leads;
DROP POLICY IF EXISTS "Admins podem atualizar leads" ON loja_leads;
DROP POLICY IF EXISTS "Admins podem deletar leads" ON loja_leads;

CREATE POLICY "Todos podem ver loja leads" ON loja_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos podem atualizar loja leads" ON loja_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar loja leads" ON loja_leads FOR DELETE TO authenticated USING (true);

-- Fix leads_landing - allow all
DROP POLICY IF EXISTS "Admins podem ver todos os leads" ON leads_landing;
CREATE POLICY "Todos podem ver leads landing" ON leads_landing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos podem atualizar leads landing" ON leads_landing FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar leads landing" ON leads_landing FOR DELETE TO authenticated USING (true);

-- Fix marcas - remove admin-only restrictions (keep existing permissive ones)
DROP POLICY IF EXISTS "Admins podem criar marcas" ON marcas;
DROP POLICY IF EXISTS "Admins podem editar marcas" ON marcas;
DROP POLICY IF EXISTS "Admins podem deletar marcas" ON marcas;

CREATE POLICY "Todos podem deletar marcas" ON marcas FOR DELETE TO authenticated USING (true);

-- Fix produto_imagens - remove admin-only restriction
DROP POLICY IF EXISTS "Admins podem gerenciar imagens da loja" ON produto_imagens;

-- Fix tarefas - ensure full CRUD
-- Check existing policies first, these should already be open

-- Allow comentarios update/delete
CREATE POLICY "Todos podem atualizar comentários" ON comentarios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar comentários" ON comentarios FOR DELETE TO authenticated USING (true);

-- Allow cliente_historico update/delete
CREATE POLICY "Todos podem atualizar histórico" ON cliente_historico FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar histórico" ON cliente_historico FOR DELETE TO authenticated USING (true);

-- Allow movimentacao_estoque update/delete
CREATE POLICY "Todos podem atualizar movimentações" ON movimentacao_estoque FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos podem deletar movimentações" ON movimentacao_estoque FOR DELETE TO authenticated USING (true);

-- Allow cliente_produtos delete
CREATE POLICY "Todos podem deletar relacionamentos" ON cliente_produtos FOR DELETE TO authenticated USING (true);

-- Allow prospect_ia_insights delete
CREATE POLICY "Todos podem deletar insights" ON prospect_ia_insights FOR DELETE TO authenticated USING (true);
