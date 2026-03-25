const pool = require("../config/db");

// ✅ CRIAR
exports.criar = async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório" });
  }

  try {
    // Impedir duplicado
    const existe = await pool.query(
      "SELECT * FROM coordenadores WHERE LOWER(nome) = LOWER($1)",
      [nome]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ erro: "Coordenador já existe" });
    }

    const result = await pool.query(
      "INSERT INTO coordenadores (nome) VALUES ($1) RETURNING *",
      [nome]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ✅ LISTAR
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM coordenadores ORDER BY nome ASC"
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ✅ BUSCAR POR ID
exports.buscarPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM coordenadores WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Coordenador não encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ✅ ATUALIZAR
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório" });
  }

  try {
    const result = await pool.query(
      "UPDATE coordenadores SET nome = $1 WHERE id = $2 RETURNING *",
      [nome, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Coordenador não encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ✅ DELETAR
exports.deletar = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM coordenadores WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Coordenador não encontrado" });
    }

    res.json({ mensagem: "Coordenador deletado com sucesso" });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
