const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Tuned defaults for medium concurrency workloads (e.g. 150 online users)
  max: Number(process.env.PGPOOL_MAX || 30),
  min: Number(process.env.PGPOOL_MIN || 5),
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT_MS || 10000),
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: Number(process.env.PGPOOL_KEEPALIVE_DELAY_MS || 10000)
});

module.exports = pool;
