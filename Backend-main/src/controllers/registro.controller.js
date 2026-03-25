const pool = require("../config/db");
const { isAdminLike } = require("../utils/roles");

/* ==========================================
   LISTAR REGISTROS
========================================== */
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.tarefa_id,
        r.data_registro,
        r.funcionario_id,
        r.descricao,
        r.periodicidade,
        r.porcentagem,

        f.nome AS funcionario_nome,

        t.nome AS tarefa_nome,
        t.caminho AS tarefa_caminho,
        ss.nome AS subsetor_nome,
        s.nome AS setor_nome,
        c.nome AS coordenador_nome,
        sup.nome AS supervisor_nome,
        
        u1.nome AS admin_nome,
        u2.nome AS usuario_nome

      FROM registros r

      LEFT JOIN tarefas t ON r.tarefa_id = t.id
      LEFT JOIN subsetores ss ON r.subsetor_id = ss.id
      LEFT JOIN setores s ON r.setor_id = s.id
      LEFT JOIN coordenadores c ON r.coordenador_id = c.id
      LEFT JOIN funcionarios f ON r.funcionario_id = f.id
      LEFT JOIN supervisores sup ON r.supervisor_id = sup.id
      LEFT JOIN usuarios u1 ON r.criado_por_admin = u1.id
      LEFT JOIN usuarios u2 ON r.realizado_por_usuario = u2.id

      ORDER BY r.data_registro DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};


/* ==========================================
   CRIAR REGISTRO
========================================== */
exports.criar = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { tarefa_id, funcionario_id, descricao, quantidade } = req.body;
    const usuario = req.usuario;

    if (!tarefa_id) {
      throw new Error("Tarefa não informada");
    }

    const tarefaResult = await client.query(
      "SELECT * FROM tarefas WHERE id = $1",
      [tarefa_id]
    );

    const tarefa = tarefaResult.rows[0];
    if (!tarefa) throw new Error("Tarefa não encontrada");

    const funcionarioFinal = funcionario_id || tarefa.funcionario_id || null;
    const supervisorFinal = tarefa.supervisor_id || null;

    const dadosRelacionados = await client.query(
      `
      SELECT s.id as setor_id, s.coordenador_id
      FROM subsetores ss
      JOIN setores s ON ss.setor_id = s.id
      WHERE ss.id = $1
      `,
      [tarefa.subsetor_id]
    );

    const { setor_id, coordenador_id } = dadosRelacionados.rows[0];

    // 🔥 AQUI É O CÁLCULO REAL
  const quantidadeNumero = Number(quantidade);

if (quantidade !== undefined && quantidade !== null && !Number.isInteger(quantidadeNumero)) {
  throw new Error("Quantidade deve ser um número inteiro");
}

const quantidadeFinal =
  quantidade === undefined || quantidade === null
    ? 0
    : quantidadeNumero;

const porcentagemFinal = tarefa.porcentagem * quantidadeFinal;

    await client.query(
      `
      INSERT INTO registros (
        tarefa_id,
        funcionario_id,
        descricao,
        coordenador_id,
        setor_id,
        subsetor_id,
        periodicidade,
        porcentagem,
        supervisor_id,
        criado_por_admin,
        realizado_por_usuario
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        tarefa.id,
        funcionarioFinal,
        descricao,
        coordenador_id,
        setor_id,
        tarefa.subsetor_id,
        tarefa.periodicidade,
        porcentagemFinal,
        supervisorFinal,
        isAdminLike(usuario.tipo) ? usuario.id : null,
        usuario.tipo === "USUARIO" ? usuario.id : null
      ]
    );

    await client.query(
  `UPDATE tarefas
   SET status = 'CONCLUIDO',
       data_conclusao = NOW()
    WHERE id = $1`,
  [tarefa.id]
);

    await client.query(
      `
      INSERT INTO tarefas_concluidas_historico
        (tarefa_id, coordenador_id, setor_id, subsetor_id, data_conclusao, origem)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, 'REGISTRO')
      `,
      [tarefa.id, coordenador_id, setor_id, tarefa.subsetor_id]
    );

    await client.query("COMMIT");

    res.status(201).json({ mensagem: "Registro criado com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};


/* ==========================================
   ATUALIZAR REGISTRO
========================================== */
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { funcionario_id, descricao, porcentagem } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE registros
      SET funcionario_id = $1,
          descricao = $2,
          porcentagem = $3
      WHERE id = $4
      RETURNING *
      `,
      [funcionario_id || null, descricao, porcentagem, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};


/* ==========================================
   DELETAR REGISTRO
========================================== */
exports.deletar = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM registros WHERE id = $1", [id]);
    res.json({ mensagem: "Registro deletado com sucesso" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};
