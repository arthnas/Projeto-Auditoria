const pool = require("../config/db");

// 🔹 LISTAR
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome FROM funcionarios ORDER BY nome ASC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

// 🔹 CRIAR
exports.criar = async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome obrigatório" });
  }

  try {
    const existe = await pool.query(
      "SELECT * FROM funcionarios WHERE LOWER(nome) = LOWER($1)",
      [nome]
    );

    if (existe.rows.length > 0) {
      return res.json(existe.rows[0]);
    }

    const result = await pool.query(
      "INSERT INTO funcionarios (nome) VALUES ($1) RETURNING *",
      [nome]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// DELETAR
exports.deletar = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const funcionario = await client.query(
      "SELECT id, nome FROM funcionarios WHERE id = $1",
      [id]
    );

    if (funcionario.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ erro: "Funcionario nao encontrado" });
    }

    const tarefasResult = await client.query(
      `UPDATE tarefas
       SET funcionario_id = NULL
       WHERE funcionario_id = $1`,
      [id]
    );

    const registrosResult = await client.query(
      `UPDATE registros
       SET funcionario_id = NULL
       WHERE funcionario_id = $1`,
      [id]
    );

    await client.query("DELETE FROM funcionarios WHERE id = $1", [id]);
    await client.query("COMMIT");

    return res.json({
      mensagem: "Funcionario deletado com sucesso",
      tarefasDesvinculadas: tarefasResult.rowCount,
      registrosDesvinculados: registrosResult.rowCount
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};
