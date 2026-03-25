const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ROTA: Cadastro completo da estrutura
router.post("/cadastrar-completo", async (req, res) => {
  const client = await pool.connect();

  const {
    coordenador,
    setor,
    subsetor,
    tarefa,
    periodicidade,
    porcentagem,
    descricao
  } = req.body;

  try {
    await client.query("BEGIN");

    // 1️⃣ Coordenador
    const coordenadorResult = await client.query(
      "INSERT INTO coordenadores (nome) VALUES ($1) RETURNING id",
      [coordenador]
    );
    const coordenadorId = coordenadorResult.rows[0].id;

    // 2️⃣ Setor
    const setorResult = await client.query(
      "INSERT INTO setores (nome, coordenador_id) VALUES ($1, $2) RETURNING id",
      [setor, coordenadorId]
    );
    const setorId = setorResult.rows[0].id;

    // 3️⃣ Subsetor
    const subsetorResult = await client.query(
      "INSERT INTO subsetores (nome, setor_id) VALUES ($1, $2) RETURNING id",
      [subsetor, setorId]
    );
    const subsetorId = subsetorResult.rows[0].id;

    // 4️⃣ Tarefa
    const tarefaResult = await client.query(
      `INSERT INTO tarefas 
       (nome, subsetor_id, periodicidade, porcentagem)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tarefa, subsetorId, periodicidade, porcentagem]
    );
    const tarefaId = tarefaResult.rows[0].id;

    // 5️⃣ Registro
    await client.query(
      `INSERT INTO registros 
       (tarefa_id, descricao, coordenador_id, setor_id, subsetor_id, periodicidade, porcentagem)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tarefaId, descricao, coordenadorId, setorId, subsetorId, periodicidade, porcentagem]
    );

    await client.query("COMMIT");

    res.status(201).json({
      mensagem: "Estrutura cadastrada com sucesso!"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
