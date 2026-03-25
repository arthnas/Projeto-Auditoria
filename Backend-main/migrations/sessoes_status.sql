-- Migração: adiciona coluna status à tabela sessoes e índice composto
-- status espelha o campo online para compatibilidade com o contrato JSON

ALTER TABLE sessoes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'online'
    CHECK (status IN ('online', 'offline'));

-- Backfill: alinhar status com o campo online existente
UPDATE sessoes SET status = CASE WHEN online THEN 'online' ELSE 'offline' END;

-- Índice composto para consultas de presença com timeout
CREATE INDEX IF NOT EXISTS idx_sessoes_online_heartbeat
  ON sessoes (online, ultimo_heartbeat);
