const pool = require("../config/db");

// =============================
// POST /api/solicitacoes
// Apenas COORDENADOR
// =============================
exports.criar = async (req, res) => {
  if (req.usuario.tipo !== "COORDENADOR") {
    return res.status(403).json({ erro: "Apenas coordenadores podem criar solicitações" });
  }

  const { tarefa_id, tipo, motivo } = req.body;

  if (!tarefa_id || !tipo || !motivo) {
    return res.status(400).json({ erro: "Campos obrigatórios: tarefa_id, tipo, motivo" });
  }

  if (!["editar", "deletar"].includes(tipo)) {
    return res.status(400).json({ erro: "Tipo inválido. Use 'editar' ou 'deletar'" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO solicitacoes_alteracao (tarefa_id, solicitante_id, tipo, motivo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tarefa_id, req.usuario.id, tipo, motivo]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    // Violação do índice único parcial (solicitação pendente já existe)
    if (err.code === "23505") {
      return res.status(409).json({ erro: "Já existe uma solicitação pendente para esta tarefa e tipo" });
    }
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

// =============================
// GET /api/solicitacoes
// Apenas ADMIN
// =============================
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         sa.*,
         t.nome  AS tarefa_nome,
         u.nome  AS solicitante_nome
       FROM solicitacoes_alteracao sa
       LEFT JOIN tarefas   t ON t.id = sa.tarefa_id
       LEFT JOIN usuarios  u ON u.id = sa.solicitante_id
       ORDER BY sa.criado_em DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

// =============================
// PUT /api/solicitacoes/:id
// Apenas ADMIN
// =============================
exports.responder = async (req, res) => {
  const { id } = req.params;
  const { status, minutos } = req.body;

  if (!["aceita", "recusada"].includes(status)) {
    return res.status(400).json({ erro: "Status inválido. Use 'aceita' ou 'recusada'" });
  }

  try {
    const existing = await pool.query(
      "SELECT status, tipo, tarefa_id FROM solicitacoes_alteracao WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    const solicitacao = existing.rows[0];

    if (solicitacao.status !== "pendente") {
      return res.status(409).json({ erro: "Solicitação já foi respondida" });
    }

    if (status === "aceita" && solicitacao.tipo === "deletar") {
      if (!solicitacao.tarefa_id) {
        return res.status(422).json({ erro: "Solicitação não possui tarefa associada" });
      }
      // Deleção imediata da tarefa e seus registros dentro de uma transação
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Registros são deletados primeiro pois possuem FK para tarefas
        await client.query("DELETE FROM registros WHERE tarefa_id = $1", [solicitacao.tarefa_id]);
        await client.query("DELETE FROM tarefas WHERE id = $1", [solicitacao.tarefa_id]);

        const result = await client.query(
          `UPDATE solicitacoes_alteracao
           SET status             = 'aceita',
               respondido_em      = NOW(),
               admin_id           = $1,
               tempo_liberado_ate = NULL
           WHERE id = $2
           RETURNING *`,
          [req.usuario.id, id]
        );

        await client.query("COMMIT");
        return res.json(result.rows[0]);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    if (status === "aceita" && solicitacao.tipo === "editar") {
      if (minutos === undefined || minutos === null) {
        return res.status(400).json({ erro: "Campo 'minutos' é obrigatório ao aceitar" });
      }
      const mins = parseInt(minutos, 10);
      if (!Number.isInteger(mins) || mins < 0) {
        return res.status(400).json({ erro: "Campo 'minutos' deve ser um inteiro >= 0" });
      }

      const result = await pool.query(
        `UPDATE solicitacoes_alteracao
         SET status            = 'aceita',
             respondido_em     = NOW(),
             admin_id          = $1,
             tempo_liberado_ate = NOW() + ($2::int * interval '1 minute')
         WHERE id = $3
         RETURNING *`,
        [req.usuario.id, mins, id]
      );

      return res.json(result.rows[0]);
    }

    if (status === "aceita") {
      // Tipo desconhecido — não deve ocorrer dado as constraints do schema
      return res.status(422).json({ erro: "Tipo de solicitação inválido para aceite" });
    }

    // status === "recusada" (qualquer tipo)
    const result = await pool.query(
      `UPDATE solicitacoes_alteracao
       SET status             = 'recusada',
           respondido_em      = NOW(),
           admin_id           = $1,
           tempo_liberado_ate = NULL
       WHERE id = $2
       RETURNING *`,
      [req.usuario.id, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

// =============================
// GET /api/solicitacoes/minhas
// Apenas COORDENADOR
// =============================
exports.minhas = async (req, res) => {
  if (req.usuario.tipo !== "COORDENADOR") {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT
         sa.*,
         t.nome AS tarefa_nome,
         CASE
           WHEN sa.tempo_liberado_ate IS NOT NULL
           THEN EXTRACT(EPOCH FROM (sa.tempo_liberado_ate - NOW()))::int
           ELSE NULL
         END AS tempo_restante_segundos
       FROM solicitacoes_alteracao sa
       LEFT JOIN tarefas t ON t.id = sa.tarefa_id
       WHERE sa.solicitante_id = $1
       ORDER BY sa.criado_em DESC`,
      [req.usuario.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

