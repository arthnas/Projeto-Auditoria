DO $$
DECLARE
  fk_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tarefas'
      AND column_name = 'funcionario_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.tarefas ALTER COLUMN funcionario_id DROP NOT NULL';

    SELECT con.conname
    INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname = 'tarefas'
      AND att.attname = 'funcionario_id'
      AND att.attnum = ANY (con.conkey)
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.tarefas DROP CONSTRAINT %I',
        fk_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.contype = 'f'
        AND nsp.nspname = 'public'
        AND rel.relname = 'tarefas'
        AND con.conname = 'tarefas_funcionario_id_fkey'
    ) THEN
      ALTER TABLE public.tarefas
        ADD CONSTRAINT tarefas_funcionario_id_fkey
        FOREIGN KEY (funcionario_id)
        REFERENCES public.funcionarios(id)
        ON DELETE SET NULL;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registros'
      AND column_name = 'funcionario_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.registros ALTER COLUMN funcionario_id DROP NOT NULL';

    SELECT con.conname
    INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname = 'registros'
      AND att.attname = 'funcionario_id'
      AND att.attnum = ANY (con.conkey)
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.registros DROP CONSTRAINT %I',
        fk_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.contype = 'f'
        AND nsp.nspname = 'public'
        AND rel.relname = 'registros'
        AND con.conname = 'registros_funcionario_id_fkey'
    ) THEN
      ALTER TABLE public.registros
        ADD CONSTRAINT registros_funcionario_id_fkey
        FOREIGN KEY (funcionario_id)
        REFERENCES public.funcionarios(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
