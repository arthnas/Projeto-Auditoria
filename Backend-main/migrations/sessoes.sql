-- Migração: tabela de sessões de usuários para controle de presença online/offline
-- Suporta heartbeat periódico e timeout automático de 90 segundos

CREATE TABLE IF NOT EXISTS sessoes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  online           BOOLEAN     NOT NULL DEFAULT TRUE,
  ip               TEXT,
  dispositivo      TEXT,
  user_agent       TEXT,
  plataforma       TEXT,
  ultimo_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerrado_em     TIMESTAMPTZ
);

-- Índices para consultas de presença
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_id       ON sessoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_online           ON sessoes (online);
CREATE INDEX IF NOT EXISTS idx_sessoes_ultimo_heartbeat ON sessoes (ultimo_heartbeat);
