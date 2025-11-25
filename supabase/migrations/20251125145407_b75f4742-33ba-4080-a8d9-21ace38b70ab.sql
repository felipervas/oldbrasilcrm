-- Tabela de templates de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('primeiro_contato', 'follow_up', 'proposta', 'cobranca', 'agradecimento', 'reativacao')),
  mensagem TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de interações do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  template_usado TEXT,
  mensagem_enviada TEXT,
  resumo TEXT,
  proximos_passos TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para whatsapp_templates
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver templates"
  ON public.whatsapp_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar templates"
  ON public.whatsapp_templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- RLS para whatsapp_interacoes
ALTER TABLE public.whatsapp_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas interações"
  ON public.whatsapp_interacoes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar interações"
  ON public.whatsapp_interacoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Inserir templates padrão
INSERT INTO public.whatsapp_templates (nome, categoria, mensagem, variaveis) VALUES
('Primeiro Contato - Lead Loja', 'primeiro_contato', 
'Olá {{nome}}! 👋

Vi que você demonstrou interesse em nossos produtos através da loja online. 

Como posso ajudá-lo a encontrar a melhor solução para seu negócio?

Estou à disposição para esclarecer qualquer dúvida!', 
'["nome"]'::jsonb),

('Follow-up Pós-Pedido', 'follow_up',
'Olá {{nome}}! 

Seu pedido #{{numero_pedido}} foi entregue em {{data_entrega}}.

Tudo chegou conforme esperado? Gostaria de feedback sobre os produtos!

Conte comigo para qualquer necessidade. 😊',
'["nome", "numero_pedido", "data_entrega"]'::jsonb),

('Proposta Comercial', 'proposta',
'Olá {{nome}}!

Preparei uma proposta especial para {{empresa}}:

{{detalhes_proposta}}

Válida até {{validade}}.

Posso agendar uma conversa para detalhar?',
'["nome", "empresa", "detalhes_proposta", "validade"]'::jsonb),

('Reativação de Cliente', 'reativacao',
'Olá {{nome}}!

Sentimos sua falta! 🙁

Notamos que não faz pedidos há {{dias}} dias.

Preparei condições especiais para seu retorno. Podemos conversar?',
'["nome", "dias"]'::jsonb),

('Agradecimento', 'agradecimento',
'{{nome}}, muito obrigado pela confiança! 🙏

É sempre um prazer atender {{empresa}}.

Conte sempre conosco!',
'["nome", "empresa"]'::jsonb);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_templates_updated_at();