CREATE TABLE IF NOT EXISTS public.requerimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    setor varchar(150) NOT NULL,
    descricao text NOT NULL,
    protocolo bigint UNIQUE,
    data_pedido timestamp DEFAULT CURRENT_TIMESTAMP,
    status varchar(20) NOT NULL DEFAULT 'PENDENTE',
    CONSTRAINT fk_requerimentos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id),
    CONSTRAINT requerimento_status_check
        CHECK (status IN ('PENDENTE','CONCLUIDO'))
);

CREATE TABLE IF NOT EXISTS public.requerimento_anexos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requerimento_id uuid NOT NULL,
    nome_arquivo varchar(255),
    tipo_arquivo varchar(50),
    caminho_arquivo text,
    enviado_em timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_requerimento
        FOREIGN KEY (requerimento_id)
        REFERENCES public.requerimentos(id)
        ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS public.requerimento_sequencia START 1;

CREATE OR REPLACE FUNCTION public.gerar_protocolo()
RETURNS trigger AS $$
DECLARE
    ano text;
    seq bigint;
BEGIN
    ano := EXTRACT(YEAR FROM CURRENT_DATE)::text;
    seq := nextval('public.requerimento_sequencia');
    NEW.protocolo := (ano || seq)::bigint;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgname = 'trigger_protocolo_requerimento'
       AND tgrelid = 'public.requerimentos'::regclass
  ) THEN
    CREATE TRIGGER trigger_protocolo_requerimento
    BEFORE INSERT ON public.requerimentos
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_protocolo();
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_requerimentos_usuario_data
  ON public.requerimentos (usuario_id, data_pedido DESC);

CREATE INDEX IF NOT EXISTS idx_requerimentos_status_data
  ON public.requerimentos (status, data_pedido DESC);

CREATE INDEX IF NOT EXISTS idx_requerimento_anexos_req
  ON public.requerimento_anexos (requerimento_id);
