ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS previsao_entrega DATE,
  ADD COLUMN IF NOT EXISTS feedback_followup_id UUID;