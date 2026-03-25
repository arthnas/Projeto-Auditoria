ALTER TABLE public.requerimentos
  ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;

ALTER TABLE public.requerimentos
  DROP CONSTRAINT IF EXISTS requerimento_status_check;

ALTER TABLE public.requerimentos
  ADD CONSTRAINT requerimento_status_check
  CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'RECUSADO'));
