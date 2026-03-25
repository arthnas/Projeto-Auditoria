const pool = require("../config/db");

// LISTAR
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ss.id, ss.nome,
             ss.setor_id,
             s.nome AS setor_nome,
             c.id AS coordenador_id,
             c.nome AS coordenador_nome
      FROM subsetores ss
      JOIN setores s ON ss.setor_id = s.id
      JOIN coordenadores c ON s.coordenador_id = c.id
      ORDER BY ss.nome ASC
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// CRIAR
exports.criar = async (req, res) => {
  const { nome, setor_id } = req.body;

  if (!nome || !setor_id) {
    return res.status(400).json({
      erro: "Nome e setor são obrigatórios"
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO subsetores (nome, setor_id) VALUES ($1,$2) RETURNING *",
      [nome, setor_id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ATUALIZAR
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, setor_id } = req.body;

  try {
    const result = await pool.query(
      "UPDATE subsetores SET nome = $1, setor_id = $2 WHERE id = $3 RETURNING *",
      [nome, setor_id, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// DELETAR
exports.deletar = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM subsetores WHERE id = $1",
      [id]
    );

    res.json({ mensagem: "Subsetor deletado com sucesso" });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
