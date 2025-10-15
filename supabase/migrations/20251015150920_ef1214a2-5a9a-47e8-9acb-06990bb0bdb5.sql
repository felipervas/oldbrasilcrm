-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Adicionar coluna para controlar se notificação foi enviada
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS notificacao_enviada boolean DEFAULT false;