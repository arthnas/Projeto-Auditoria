const pool = require("../config/db");
const sseHub = require("../sse/hub");

const TIMEOUT_SEGUNDOS = 90;
const INTERVALO_MS = 30_000; // verifica a cada 30 segundos

let _jobInterval = null;

/**
 * Inicia o job periódico que marca sessões como offline
 * quando o último heartbeat é mais antigo que TIMEOUT_SEGUNDOS.
 * Garante que apenas um job esteja ativo por vez.
 */
function startPresencaJob() {
  if (_jobInterval) return;

  _jobInterval = setInterval(async () => {
    try {
      const result = await pool.query(
        `UPDATE sessoes
            SET online = FALSE,
                status = 'offline',
                encerrado_em = now()
          WHERE online = TRUE
            AND ultimo_heartbeat < now() - ($1 || ' seconds')::INTERVAL
          RETURNING id, usuario_id`,
        [TIMEOUT_SEGUNDOS]
      );
      for (const row of result.rows) {
        sseHub.publish("timeout", { sid: row.id, userId: row.usuario_id });
      }
    } catch (err) {
      console.error("[presença job]", err.message);
    }
  }, INTERVALO_MS);
}

function stopPresencaJob() {
  if (_jobInterval) {
    clearInterval(_jobInterval);
    _jobInterval = null;
  }
}

module.exports = { startPresencaJob, stopPresencaJob };
