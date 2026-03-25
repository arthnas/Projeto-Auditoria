const pool = require("../config/db");

function normalizeSupervisorIds(body) {
  if (
    !Object.prototype.hasOwnProperty.call(body, "supervisor_ids") &&
    !Object.prototype.hasOwnProperty.call(body, "supervisor_id")
  ) {
    return { provided: false, ids: [] };
  }

  const raw = Array.isArray(body.supervisor_ids)
    ? body.supervisor_ids
    : body.supervisor_id != null && body.supervisor_id !== ""
      ? [body.supervisor_id]
      : [];

  const ids = [...new Set(
    raw
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];

  return { provided: true, ids };
}

async function validateSupervisorIds(client, supervisorIds) {
  if (supervisorIds.length > 3) {
    throw new Error("Cada setor pode ter no maximo 3 supervisores");
  }

  if (supervisorIds.length === 0) {
    return;
  }

  const result = await client.query(
    "SELECT id::text FROM supervisores WHERE id::text = ANY($1)",
    [supervisorIds]
  );

  if (result.rows.length !== supervisorIds.length) {
    throw new Error("Um ou mais supervisores informados nao existem");
  }
}

async function replaceSetorSupervisores(client, setorId, supervisorIds) {
  await client.query(
    "DELETE FROM setor_supervisores WHERE setor_id = $1",
    [setorId]
  );

  for (const [index, supervisorId] of supervisorIds.entries()) {
    await client.query(
      `INSERT INTO setor_supervisores (setor_id, supervisor_id, posicao)
       VALUES ($1, $2, $3)`,
      [setorId, supervisorId, index + 1]
    );
  }
}

async function fetchSetorById(client, setorId) {
  const result = await client.query(
    `
    SELECT
      s.id,
      s.nome,
      s.coordenador_id,
      c.nome AS coordenador_nome,
      sup_info.supervisor_id,
      sup_info.supervisor_nome,
      COALESCE(sup_info.supervisor_ids, ARRAY[]::text[]) AS supervisor_ids,
      COALESCE(sup_info.supervisores, '[]'::json) AS supervisores,
      COALESCE(sup_info.supervisores_nomes, '') AS supervisores_nomes
    FROM setores s
    JOIN coordenadores c ON c.id = s.coordenador_id
    LEFT JOIN LATERAL (
      SELECT
        (ARRAY_AGG(ss.supervisor_id::text ORDER BY ss.posicao))[1] AS supervisor_id,
        (ARRAY_AGG(sup.nome ORDER BY ss.posicao))[1] AS supervisor_nome,
        ARRAY_AGG(ss.supervisor_id::text ORDER BY ss.posicao) AS supervisor_ids,
        JSON_AGG(
          JSON_BUILD_OBJECT('id', ss.supervisor_id, 'nome', sup.nome)
          ORDER BY ss.posicao
        ) AS supervisores,
        STRING_AGG(sup.nome, ', ' ORDER BY ss.posicao) AS supervisores_nomes
      FROM setor_supervisores ss
      JOIN supervisores sup ON sup.id = ss.supervisor_id
      WHERE ss.setor_id = s.id
    ) sup_info ON TRUE
    WHERE s.id = $1
    `,
    [setorId]
  );

  return result.rows[0] || null;
}

// ================= LISTAR =================
exports.listar = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.nome,
        s.coordenador_id,
        c.nome AS coordenador_nome,
        sup_info.supervisor_id,
        sup_info.supervisor_nome,
        COALESCE(sup_info.supervisor_ids, ARRAY[]::text[]) AS supervisor_ids,
        COALESCE(sup_info.supervisores, '[]'::json) AS supervisores,
        COALESCE(sup_info.supervisores_nomes, '') AS supervisores_nomes
      FROM setores s
      JOIN coordenadores c ON c.id = s.coordenador_id
      LEFT JOIN LATERAL (
        SELECT
          (ARRAY_AGG(ss.supervisor_id::text ORDER BY ss.posicao))[1] AS supervisor_id,
          (ARRAY_AGG(sup.nome ORDER BY ss.posicao))[1] AS supervisor_nome,
          ARRAY_AGG(ss.supervisor_id::text ORDER BY ss.posicao) AS supervisor_ids,
          JSON_AGG(
            JSON_BUILD_OBJECT('id', ss.supervisor_id, 'nome', sup.nome)
            ORDER BY ss.posicao
          ) AS supervisores,
          STRING_AGG(sup.nome, ', ' ORDER BY ss.posicao) AS supervisores_nomes
        FROM setor_supervisores ss
        JOIN supervisores sup ON sup.id = ss.supervisor_id
        WHERE ss.setor_id = s.id
      ) sup_info ON TRUE
      ORDER BY s.nome ASC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ================= CRIAR =================
exports.criar = async (req, res) => {
  const { nome, coordenador_id } = req.body;
  const normalized = normalizeSupervisorIds(req.body);
  const client = await pool.connect();

  if (!nome || !coordenador_id) {
    client.release();
    return res.status(400).json({ erro: "Nome e coordenador sao obrigatorios" });
  }

  try {
    await client.query("BEGIN");
    await validateSupervisorIds(client, normalized.ids);

    const result = await client.query(
      `INSERT INTO setores (nome, coordenador_id, supervisor_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nome.trim(), coordenador_id, normalized.ids[0] || null]
    );

    const setorId = result.rows[0].id;
    await replaceSetorSupervisores(client, setorId, normalized.ids);

    await client.query("COMMIT");
    res.status(201).json(await fetchSetorById(client, setorId));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    const status = /supervisores|maximo/.test(err.message) ? 400 : 500;
    res.status(status).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// ================= ATUALIZAR =================
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, coordenador_id } = req.body;
  const normalized = normalizeSupervisorIds(req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const setorAtual = await client.query(
      "SELECT * FROM setores WHERE id = $1",
      [id]
    );

    if (setorAtual.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ erro: "Setor nao encontrado" });
    }

    let supervisorIds = normalized.ids;
    if (!normalized.provided) {
      const currentLinks = await client.query(
        `SELECT supervisor_id::text
         FROM setor_supervisores
         WHERE setor_id = $1
         ORDER BY posicao`,
        [id]
      );
      supervisorIds = currentLinks.rows.map((row) => row.supervisor_id);
    }

    await validateSupervisorIds(client, supervisorIds);

    await client.query(
      `UPDATE setores
       SET nome = $1,
           coordenador_id = $2,
           supervisor_id = $3
       WHERE id = $4`,
      [
        nome ? nome.trim() : setorAtual.rows[0].nome,
        coordenador_id || setorAtual.rows[0].coordenador_id,
        supervisorIds[0] || null,
        id
      ]
    );

    if (normalized.provided) {
      await replaceSetorSupervisores(client, id, supervisorIds);
    }

    await client.query("COMMIT");
    res.json(await fetchSetorById(client, id));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    const status = /supervisores|maximo/.test(err.message) ? 400 : 500;
    res.status(status).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// ================= DELETAR =================
exports.deletar = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM setores WHERE id = $1", [id]);
    res.json({ mensagem: "Setor deletado com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
