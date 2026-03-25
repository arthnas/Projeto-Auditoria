const pool = require("../config/db");
const { isValidCaminho } = require("../helpers/caminho");
const { isAdminLike } = require("../utils/roles");

// Verifica se o usuário possui solicitação aceita e dentro do prazo
async function temPermissao(tarefa_id, usuario_id, tipo) {
  const result = await pool.query(
    `SELECT 1 FROM solicitacoes_alteracao
     WHERE tarefa_id = $1
       AND solicitante_id = $2
       AND tipo = $3
       AND status = 'aceita'
       AND tempo_liberado_ate > NOW()
     LIMIT 1`,
    [tarefa_id, usuario_id, tipo]
  );
  return result.rows.length > 0;
}


// ============================
// ✅ CRIAR TAREFA
// =============================
exports.criar = async (req, res) => {
  const {
    nome,
    subsetor_id,
    periodicidade,
    porcentagem,
    supervisor_id,
    funcionario_id,
    tipo_id,
    caminho
  } = req.body;

  if (!nome || !subsetor_id || !periodicidade || porcentagem == null) {
    return res.status(400).json({
      erro: "Todos os campos são obrigatórios"
    });
  }

  if (caminho !== undefined && caminho !== null) {
    if (typeof caminho !== "string" || caminho.trim() === "") {
      return res.status(400).json({ erro: "Caminho não pode ser vazio" });
    }
    if (!isValidCaminho(caminho)) {
      return res.status(400).json({ erro: "Caminho deve ser um caminho UNC (\\\\\\\\...) ou um link web (http(s)://...)" });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO tarefas
       (nome, tipo_id, subsetor_id, periodicidade, porcentagem, supervisor_id, funcionario_id, criado_por, caminho)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        nome,
        tipo_id || null,
        subsetor_id,
        periodicidade,
        porcentagem,
        supervisor_id || null,
        funcionario_id || null,
        req.usuario.id,
        caminho || null
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};


// =============================
// ✅ LISTAR TAREFAS
// =============================
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.nome,
        t.descricao,
        t.tipo_id,
        t.periodicidade,
        t.porcentagem,
        t.status,
        t.subsetor_id,
        t.funcionario_id,
        t.caminho,

        tp.nome AS tipo_nome,
        ss.nome AS subsetor_nome,
        s.nome AS setor_nome,
        c.nome AS coordenador_nome,
        sup_setor.supervisor_nome AS supervisor_nome,
        sup_setor.supervisores_nomes,
        f.nome AS funcionario_nome,
        COUNT(r.id) AS total_registros
      FROM tarefas t
      LEFT JOIN subsetores ss ON t.subsetor_id = ss.id
      LEFT JOIN setores s ON ss.setor_id = s.id
      LEFT JOIN coordenadores c ON s.coordenador_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          (ARRAY_AGG(sup.nome ORDER BY ssr.posicao))[1] AS supervisor_nome,
          STRING_AGG(sup.nome, ', ' ORDER BY ssr.posicao) AS supervisores_nomes
        FROM setor_supervisores ssr
        JOIN supervisores sup ON sup.id = ssr.supervisor_id
        WHERE ssr.setor_id = s.id
      ) sup_setor ON TRUE
      LEFT JOIN funcionarios f ON t.funcionario_id = f.id
      LEFT JOIN registros r ON r.tarefa_id = t.id
      LEFT JOIN tipos tp ON t.tipo_id = tp.id

      
      GROUP BY 
      t.id,
      t.nome,
      t.tipo_id,
      t.periodicidade,
      t.porcentagem,
      t.status,
      t.subsetor_id,
      t.supervisor_id,
      t.funcionario_id,
      t.caminho,
      ss.nome,
      s.nome,
      c.nome,
      sup_setor.supervisor_nome,
      sup_setor.supervisores_nomes,
      f.nome,
      tp.nome
      ORDER BY s.nome, ss.nome, t.nome
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};


// =============================
// ✅ CHECK (CRIAR REGISTRO)
// =============================
exports.check = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { tarefa_id, funcionario_id, descricao } = req.body;

if (!tarefa_id) {
  throw new Error("Tarefa não informada");
}

const tarefaResult = await client.query(
  "SELECT * FROM tarefas WHERE id = $1",
  [tarefa_id]
);

const tarefa = tarefaResult.rows[0];
if (!tarefa) throw new Error("Tarefa não encontrada");

// 🔥 DECIDE QUAL FUNCIONÁRIO USAR
const funcionarioFinal = funcionario_id || tarefa.funcionario_id;

if (!funcionarioFinal) {
  throw new Error("Nenhum funcionário informado");
}
    await client.query(
      "UPDATE tarefas SET status = 'CONCLUIDO' WHERE id = $1",
      [tarefa_id]
    );

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

    await client.query(
      `INSERT INTO registros 
      (tarefa_id, funcionario_id, descricao,
       coordenador_id, setor_id, subsetor_id,
       periodicidade, porcentagem,
       criado_por_admin, realizado_por_usuario,
       supervisor_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        tarefa.id,
        funcionarioFinal,
        descricao,
        coordenador_id,
        setor_id,
        tarefa.subsetor_id,
        tarefa.periodicidade,
        tarefa.porcentagem,
        tarefa.criado_por,
        req.usuario.id,
        tarefa.supervisor_id
      ]
    );
    
    await client.query(
      `INSERT INTO tarefas_concluidas_historico
         (tarefa_id, coordenador_id, setor_id, subsetor_id, data_conclusao, origem)
       SELECT
         t.id,
         s.coordenador_id,
         ss.setor_id,
         t.subsetor_id,
         CURRENT_DATE,
         'REGISTRO'
       FROM tarefas t
       JOIN subsetores ss ON t.subsetor_id = ss.id
       JOIN setores s ON ss.setor_id = s.id
       WHERE t.id = $1`,
      [tarefa.id]
    );

    await client.query("COMMIT");

    res.json({ mensagem: "Registro criado com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// =============================
// ✅ ALTERAR STATUS
// =============================
exports.alterarStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verifica se a tarefa existe
    const tarefaResult = await client.query(
      `SELECT 1 FROM tarefas WHERE id = $1`,
      [id]
    );

    if (tarefaResult.rows.length === 0) {
      throw new Error("Tarefa não encontrada");
    }

    if (status === "CONCLUIDO") {

      // Atualiza status
      await client.query(
        `UPDATE tarefas
         SET status = 'CONCLUIDO',
             data_conclusao = NOW()
         WHERE id = $1`,
        [id]
      );

      // Insere no histórico (evita duplicação no mesmo dia)
      await client.query(
        `
        INSERT INTO tarefas_concluidas_historico
          (tarefa_id, coordenador_id, setor_id, subsetor_id, data_conclusao, origem)
        SELECT
          t.id,
          s.coordenador_id,
          ss.setor_id,
          t.subsetor_id,
          CURRENT_DATE,
          'MANUAL'
        FROM tarefas t
        JOIN subsetores ss ON t.subsetor_id = ss.id
        JOIN setores s ON ss.setor_id = s.id
        WHERE t.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM tarefas_concluidas_historico h
            WHERE h.tarefa_id = t.id
            AND h.origem = 'MANUAL'
            AND h.data_conclusao = CURRENT_DATE
          )
        `,
        [id]
      );

    } else {

      // Atualiza status
      await client.query(
        `UPDATE tarefas
         SET status = 'PENDENTE',
             data_conclusao = NULL
         WHERE id = $1`,
        [id]
      );

      // 🔥 Remove apenas se for do dia atual
      await client.query(
        `
        DELETE FROM tarefas_concluidas_historico
        WHERE tarefa_id = $1
        AND origem = 'MANUAL'
        AND data_conclusao = CURRENT_DATE
        `,
        [id]
      );
    }

    await client.query("COMMIT");
    res.json({ mensagem: "Status atualizado" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};
// =============================
// ✅ ATUALIZAR TAREFA
// =============================
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { descricao } = req.body;
  const {
    nome,
    tipo_id,
    subsetor_id,
    periodicidade,
    porcentagem,
    supervisor_id,
    funcionario_id,
    caminho
  } = req.body;

  // Validações de caminho
  if (caminho !== undefined && caminho !== null) {
    if (!isAdminLike(req.usuario.tipo)) {
      return res.status(403).json({ erro: "Apenas ADMIN pode alterar o caminho" });
    }
    if (typeof caminho !== "string" || caminho.trim() === "") {
      return res.status(400).json({ erro: "Caminho não pode ser vazio" });
    }
    if (!isValidCaminho(caminho)) {
      return res.status(400).json({ erro: "Caminho deve ser um caminho UNC (\\\\\\\\...) ou um link web (http(s)://...)" });
    }
  }

  try {
    // Verifica permissão para não-admin
    if (!isAdminLike(req.usuario.tipo)) {
      if (!(await temPermissao(id, req.usuario.id, "editar"))) {
        return res.status(403).json({ erro: "Sem permissão" });
      }
    }

    const tarefaAtual = await pool.query(
      "SELECT * FROM tarefas WHERE id = $1",
      [id]
    );

    if (tarefaAtual.rows.length === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada" });
    }

    const atual = tarefaAtual.rows[0];

    const result = await pool.query(
      `UPDATE tarefas
       SET nome = $1,
           tipo_id = $2,
           subsetor_id = $3,
           periodicidade = $4,
           porcentagem = $5,
           supervisor_id = $6,
           funcionario_id = $7,
           descricao = $8,
           caminho = $9
       WHERE id = $10
       RETURNING *`,
      [
        nome ?? atual.nome,
        tipo_id ? tipo_id : null,
        subsetor_id ?? atual.subsetor_id,
        periodicidade ?? atual.periodicidade,
        porcentagem ?? atual.porcentagem,
        supervisor_id ?? null,   // 🔥 FORÇA NULL
        funcionario_id ?? null,  // 🔥 FORÇA NULL
        descricao ?? atual.descricao,
        caminho !== undefined ? caminho : atual.caminho,
        id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

// =============================
// ✅ DELETAR TAREFA
// =============================
exports.deletar = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // Verifica permissão para não-admin
    if (!isAdminLike(req.usuario.tipo)) {
      if (!(await temPermissao(id, req.usuario.id, "deletar"))) {
        client.release();
        return res.status(403).json({ erro: "Sem permissão" });
      }
    }

    await client.query("BEGIN");

    await client.query(
      "DELETE FROM registros WHERE tarefa_id = $1",
      [id]
    );

    await client.query(
      "DELETE FROM tarefas WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");

    res.json({ mensagem: "Tarefa deletada com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};


// =============================
// ✅ RESETAR VÁRIAS
// =============================
exports.resetMultiple = async (req, res) => {
  const { ids } = req.body;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ erro: "Nenhuma tarefa informada" });
  }

  try {
    await pool.query(
      `UPDATE tarefas 
       SET status = 'PENDENTE',
           data_conclusao = NULL
       WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    res.json({ mensagem: "Tarefas resetadas com sucesso" });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ✅ HISTÓRICO DE CONCLUÍDAS POR DIA E SETOR
exports.historicoConcluidas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        h.data_conclusao AS data,
        s.nome AS setor_nome,
        ss.nome AS subsetor_nome,
        c.nome AS coordenador_nome,
        COUNT(*) AS total_concluidas
      FROM tarefas_concluidas_historico h
      LEFT JOIN setores s ON h.setor_id = s.id
      LEFT JOIN subsetores ss ON h.subsetor_id = ss.id
      LEFT JOIN coordenadores c ON h.coordenador_id = c.id
      GROUP BY h.data_conclusao, s.nome, ss.nome, c.nome
      ORDER BY h.data_conclusao DESC;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};
