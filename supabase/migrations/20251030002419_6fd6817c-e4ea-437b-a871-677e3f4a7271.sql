-- Adicionar campos para manter histórico do prospect quando convertido para cliente
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS prospect_origem_id uuid REFERENCES public.prospects(id),
ADD COLUMN IF NOT EXISTS prospect_data_criacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS prospect_observacoes_iniciais text,
ADD COLUMN IF NOT EXISTS prospect_status_origem text;

-- Comentários para documentação
COMMENT ON COLUMN public.clientes.prospect_origem_id IS 'Referência ao prospect original quando convertido';
COMMENT ON COLUMN public.clientes.prospect_data_criacao IS 'Data de criação do prospect original';
COMMENT ON COLUMN public.clientes.prospect_observacoes_iniciais IS 'Observações iniciais do prospect';
COMMENT ON COLUMN public.clientes.prospect_status_origem IS 'Status do prospect quando foi convertido';

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_clientes_prospect_origem ON public.clientes(prospect_origem_id) WHERE prospect_origem_id IS NOT NULL;