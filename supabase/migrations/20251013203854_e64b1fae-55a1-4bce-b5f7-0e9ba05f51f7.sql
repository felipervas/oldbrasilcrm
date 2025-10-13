-- Adicionar campo para histórico de pedidos no cliente
ALTER TABLE public.clientes 
ADD COLUMN historico_pedidos TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.clientes.historico_pedidos IS 'Histórico de pedidos e observações importantes do cliente';