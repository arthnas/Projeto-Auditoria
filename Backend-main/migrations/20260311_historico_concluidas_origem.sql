ALTER TABLE public.tarefas_concluidas_historico
  ADD COLUMN IF NOT EXISTS origem TEXT;

UPDATE public.tarefas_concluidas_historico
SET origem = 'MANUAL'
WHERE origem IS NULL;

ALTER TABLE public.tarefas_concluidas_historico
  ALTER COLUMN origem SET DEFAULT 'MANUAL';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tarefas_concluidas_historico_origem_check'
  ) THEN
    ALTER TABLE public.tarefas_concluidas_historico
      ADD CONSTRAINT tarefas_concluidas_historico_origem_check
      CHECK (origem IN ('MANUAL', 'REGISTRO'));
  END IF;
END $$;
