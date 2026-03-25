const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// USUARIO LOGADO
exports.me = async (req, res) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return res.status(401).json({ erro: "Nao autorizado" });

    const result = await pool.query(
      `SELECT id, nome, usuario, tipo, criado_em
       FROM usuarios
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Usuario nao encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

// LISTAR
exports.listar = async (req, res) => {
  const result = await pool.query(`
    SELECT id, nome, usuario, tipo, criado_em
    FROM usuarios
    ORDER BY criado_em DESC
  `);

  res.json(result.rows);
};

exports.listarOnline = async (req, res) => {
  const result = await pool.query(`
    SELECT DISTINCT ON (u.id)
      u.id,
      u.nome,
      u.tipo,
      s.online,
      s.status,
      s.dispositivo,
      s.ultimo_heartbeat AS "ultimoHeartbeat"
    FROM usuarios u
    JOIN sessoes s ON s.usuario_id = u.id
    WHERE s.online = TRUE
    ORDER BY u.id, s.ultimo_heartbeat DESC
  `);

  res.json({ usuarios: result.rows });
};



// CRIAR
exports.criar = async (req, res) => {
  const { nome, usuario, senha, tipo } = req.body;

  const senha_hash = await bcrypt.hash(senha, 10);

  const result = await pool.query(
    `INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
     VALUES ($1,$2,$3,$4)
     RETURNING id, nome, usuario, tipo, criado_em`,
    [nome, usuario, senha_hash, tipo]
  );

  res.status(201).json(result.rows[0]);
};

// EDITAR
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, tipo } = req.body;

  const atual = await pool.query(
    `SELECT id, nome, usuario, tipo, criado_em
     FROM usuarios
     WHERE id = $1`,
    [id]
  );

  if (atual.rows.length === 0) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const usuarioAtual = atual.rows[0];
  const nomeFinal = nome ?? usuarioAtual.nome;
  const tipoFinal = (tipo ?? usuarioAtual.tipo);

  const result = await pool.query(
    `UPDATE usuarios
     SET nome = $1, tipo = $2
     WHERE id = $3
     RETURNING id, nome, usuario, tipo, criado_em`,
    [nomeFinal, tipoFinal, id]
  );

  res.json(result.rows[0]);
};

// DELETAR
exports.deletar = async (req, res) => {
  const { id } = req.params;

  await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);

  res.json({ mensagem: "Usuário deletado com sucesso" });
};
