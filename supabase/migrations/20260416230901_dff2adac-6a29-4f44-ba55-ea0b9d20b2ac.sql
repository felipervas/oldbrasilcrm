ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS foi_remarcado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_original date,
  ADD COLUMN IF NOT EXISTS hora_original time;