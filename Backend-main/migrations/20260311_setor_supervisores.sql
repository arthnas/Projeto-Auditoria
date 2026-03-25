DO $$
DECLARE
  setor_id_type TEXT;
  supervisor_id_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO setor_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'setores'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO supervisor_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'setores'
    AND a.attname = 'supervisor_id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF setor_id_type IS NULL OR supervisor_id_type IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel inferir os tipos de setores.id ou setores.supervisor_id';
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.setor_supervisores (
       setor_id %1$s NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
       supervisor_id %2$s NOT NULL REFERENCES public.supervisores(id) ON DELETE CASCADE,
       posicao SMALLINT NOT NULL,
       CONSTRAINT setor_supervisores_pk PRIMARY KEY (setor_id, supervisor_id),
       CONSTRAINT setor_supervisores_posicao_un UNIQUE (setor_id, posicao),
       CONSTRAINT setor_supervisores_posicao_ck CHECK (posicao BETWEEN 1 AND 3)
     )',
    setor_id_type,
    supervisor_id_type
  );
END $$;

INSERT INTO public.setor_supervisores (setor_id, supervisor_id, posicao)
SELECT s.id, s.supervisor_id, 1
FROM public.setores s
WHERE s.supervisor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.setor_supervisores ss
    WHERE ss.setor_id = s.id
      AND ss.supervisor_id = s.supervisor_id
  );
