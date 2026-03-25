const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome FROM supervisores ORDER BY nome ASC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

exports.criar = async (req, res) => {
  const { nome } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ erro: "Nome e obrigatorio" });
  }

  try {
    const nomeFinal = String(nome).trim();

    const existente = await pool.query(
      "SELECT id FROM supervisores WHERE LOWER(nome) = LOWER($1)",
      [nomeFinal]
    );

    if (existente.rows.length > 0) {
      return res.status(409).json({ erro: "Supervisor ja existe" });
    }

    const result = await pool.query(
      "INSERT INTO supervisores (nome) VALUES ($1) RETURNING id, nome",
      [nomeFinal]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};
