-- Optimizes online users listing (latest active session per user)
CREATE INDEX IF NOT EXISTS idx_sessoes_online_usuario_heartbeat_desc
  ON sessoes (usuario_id, ultimo_heartbeat DESC)
  WHERE online = TRUE;
