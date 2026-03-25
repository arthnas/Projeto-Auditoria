const pool = require("../config/db");
const { normalizeTipo } = require("../utils/roles");

let anexoColumnsCache = null;

function isAllowedAttachmentType(tipo) {
  if (!tipo || typeof tipo !== "string") return false;
  const t = tipo.toLowerCase().trim();
  return t === "application/pdf" || t === "link" || t === "url";
}

function isValidHttpUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function parseArrayField(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch (_) {
      return undefined;
    }
  }
  return undefined;
}

function normalizeLinkItem(item) {
  const nome = item?.nome_arquivo
    ? String(item.nome_arquivo).trim()
    : item?.arquivo_nome
      ? String(item.arquivo_nome).trim()
      : item?.nome
        ? String(item.nome).trim()
        : item?.titulo
          ? String(item.titulo).trim()
          : "Link";
  const caminho = item?.caminho_arquivo
    ? String(item.caminho_arquivo).trim()
    : item?.arquivo_caminho
      ? String(item.arquivo_caminho).trim()
      : item?.url
        ? String(item.url).trim()
        : item?.link
          ? String(item.link).trim()
          : "";

  return {
    nome_arquivo: nome || "Link",
    tipo_arquivo: "link",
    caminho_arquivo: caminho
  };
}

async function resolveAnexoColumns(client) {
  if (anexoColumnsCache) return anexoColumnsCache;

  const result = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'requerimento_anexos'`
  );

  const cols = new Set(result.rows.map((row) => row.column_name));
  const hasNew = cols.has("nome_arquivo") && cols.has("tipo_arquivo") && cols.has("caminho_arquivo");
  const hasOld = cols.has("arquivo_nome") && cols.has("arquivo_tipo") && cols.has("arquivo_caminho");

  if (hasNew) {
    anexoColumnsCache = {
      nome: "nome_arquivo",
      tipo: "tipo_arquivo",
      caminho: "caminho_arquivo"
    };
    return anexoColumnsCache;
  }

  if (hasOld) {
    anexoColumnsCache = {
      nome: "arquivo_nome",
      tipo: "arquivo_tipo",
      caminho: "arquivo_caminho"
    };
    return anexoColumnsCache;
  }

  throw new Error("Tabela requerimento_anexos sem colunas de arquivo reconhecidas");
}

async function resolveSetorUsuario(client, userId) {
  try {
    const atividade = await client.query(
      `SELECT setor
         FROM atividades
        WHERE usuario_id = $1
          AND setor IS NOT NULL
          AND trim(setor) <> ''
        LIMIT 1`,
      [userId]
    );
    return atividade.rows[0]?.setor || null;
  } catch (err) {
    if (err?.code === "42P01") {
      return null;
    }
    throw err;
  }
}

exports.criar = async (req, res) => {
  const tipo = normalizeTipo(req.usuario?.tipo);
  if (tipo === "DEVELOPER") {
    return res.status(403).json({ erro: "DEVELOPER nao pode abrir requerimento" });
  }

  const { descricao, setor } = req.body || {};
  const anexosPayload = parseArrayField(req.body?.anexos) ?? parseArrayField(req.body?.documentos);
  const linksPayload = parseArrayField(req.body?.links);
  if (!descricao || typeof descricao !== "string" || !descricao.trim()) {
    return res.status(400).json({ erro: "Descricao obrigatoria" });
  }

  if (anexosPayload !== undefined && !Array.isArray(anexosPayload)) {
    return res.status(400).json({ erro: "Campo anexos deve ser um array" });
  }
  if (linksPayload !== undefined && !Array.isArray(linksPayload)) {
    return res.status(400).json({ erro: "Campo links deve ser um array" });
  }

  const client = await pool.connect();
  try {
    const anexoCols = await resolveAnexoColumns(client);
    const setorAutomatico = await resolveSetorUsuario(client, req.usuario.id);
    const setorFinal = (setor && String(setor).trim()) || setorAutomatico || "GERAL";

    await client.query("BEGIN");

    const requerimento = await client.query(
      `INSERT INTO requerimentos (id, usuario_id, setor, descricao)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, usuario_id, setor, descricao, protocolo, data_pedido, status, motivo_recusa`,
      [req.usuario.id, setorFinal, descricao.trim()]
    );

    const requerimentoId = requerimento.rows[0].id;
    const anexosInseridos = [];

    if (Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const nomeArquivo = String(file.originalname || "").trim();
        const tipoArquivo = String(file.mimetype || "").trim();
        const caminhoArquivo = `/uploads/requerimentos/${file.filename}`;

        if (!nomeArquivo || !tipoArquivo || !caminhoArquivo) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Falha ao processar anexo enviado" });
        }
        if (!isAllowedAttachmentType(tipoArquivo)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Tipo de anexo invalido. Use PDF ou link" });
        }

        const anexoResult = await client.query(
          `INSERT INTO requerimento_anexos (id, requerimento_id, ${anexoCols.nome}, ${anexoCols.tipo}, ${anexoCols.caminho})
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id, ${anexoCols.nome} AS nome_arquivo, ${anexoCols.tipo} AS tipo_arquivo, ${anexoCols.caminho} AS caminho_arquivo, enviado_em`,
          [requerimentoId, nomeArquivo, tipoArquivo, caminhoArquivo]
        );
        anexosInseridos.push({
          ...anexoResult.rows[0],
          arquivo_nome: anexoResult.rows[0].nome_arquivo,
          arquivo_tipo: anexoResult.rows[0].tipo_arquivo,
          arquivo_caminho: anexoResult.rows[0].caminho_arquivo
        });
      }
    }

    if (Array.isArray(anexosPayload) && anexosPayload.length > 0) {
      for (const anexo of anexosPayload) {
        const nomeArquivo = anexo?.nome_arquivo
          ? String(anexo.nome_arquivo).trim()
          : anexo?.arquivo_nome
            ? String(anexo.arquivo_nome).trim()
          : anexo?.nome
            ? String(anexo.nome).trim()
            : null;
        const tipoArquivo = anexo?.tipo_arquivo
          ? String(anexo.tipo_arquivo).trim()
          : anexo?.arquivo_tipo
            ? String(anexo.arquivo_tipo).trim()
          : anexo?.tipo
            ? String(anexo.tipo).trim()
            : null;
        const caminhoArquivo = anexo?.caminho_arquivo
          ? String(anexo.caminho_arquivo).trim()
          : anexo?.arquivo_caminho
            ? String(anexo.arquivo_caminho).trim()
          : anexo?.caminho
            ? String(anexo.caminho).trim()
            : null;
        const isLink = isValidHttpUrl(caminhoArquivo || "");
        const tipoNormalizado = isLink ? "link" : tipoArquivo;

        if (!nomeArquivo || !tipoArquivo || !caminhoArquivo) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Cada anexo precisa de nome_arquivo, tipo_arquivo e caminho_arquivo" });
        }
        if (!isAllowedAttachmentType(tipoNormalizado)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Tipo de anexo invalido. Use PDF ou link" });
        }
        if (tipoNormalizado === "link" && !isLink) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Link invalido. Use URL http(s)" });
        }

        const anexoResult = await client.query(
          `INSERT INTO requerimento_anexos (id, requerimento_id, ${anexoCols.nome}, ${anexoCols.tipo}, ${anexoCols.caminho})
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id, ${anexoCols.nome} AS nome_arquivo, ${anexoCols.tipo} AS tipo_arquivo, ${anexoCols.caminho} AS caminho_arquivo, enviado_em`,
          [requerimentoId, nomeArquivo, tipoNormalizado, caminhoArquivo]
        );
        anexosInseridos.push({
          ...anexoResult.rows[0],
          arquivo_nome: anexoResult.rows[0].nome_arquivo,
          arquivo_tipo: anexoResult.rows[0].tipo_arquivo,
          arquivo_caminho: anexoResult.rows[0].caminho_arquivo
        });
      }
    }

    if (Array.isArray(linksPayload) && linksPayload.length > 0) {
      for (const linkItem of linksPayload) {
        const normalized = normalizeLinkItem(linkItem);
        if (!isValidHttpUrl(normalized.caminho_arquivo)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ erro: "Link invalido. Use URL http(s)" });
        }

        const anexoResult = await client.query(
          `INSERT INTO requerimento_anexos (id, requerimento_id, ${anexoCols.nome}, ${anexoCols.tipo}, ${anexoCols.caminho})
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id, ${anexoCols.nome} AS nome_arquivo, ${anexoCols.tipo} AS tipo_arquivo, ${anexoCols.caminho} AS caminho_arquivo, enviado_em`,
          [requerimentoId, normalized.nome_arquivo, normalized.tipo_arquivo, normalized.caminho_arquivo]
        );
        anexosInseridos.push({
          ...anexoResult.rows[0],
          arquivo_nome: anexoResult.rows[0].nome_arquivo,
          arquivo_tipo: anexoResult.rows[0].tipo_arquivo,
          arquivo_caminho: anexoResult.rows[0].caminho_arquivo
        });
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({
      ...requerimento.rows[0],
      anexos: anexosInseridos
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // noop
    }
    return res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};

exports.listarMinhas = async (req, res) => {
  const client = await pool.connect();
  try {
    const anexoCols = await resolveAnexoColumns(client);
    const result = await client.query(
      `SELECT
         r.id,
         r.protocolo,
         u.nome AS usuario,
         r.setor,
         r.descricao,
         r.data_pedido,
         r.status,
         r.motivo_recusa,
         COALESCE(
           json_agg(
             json_build_object(
               'id', a.id,
               'nome_arquivo', a.${anexoCols.nome},
               'tipo_arquivo', a.${anexoCols.tipo},
               'caminho_arquivo', a.${anexoCols.caminho},
               'arquivo_nome', a.${anexoCols.nome},
               'arquivo_tipo', a.${anexoCols.tipo},
               'arquivo_caminho', a.${anexoCols.caminho},
               'enviado_em', a.enviado_em
             )
           ) FILTER (WHERE a.id IS NOT NULL),
           '[]'::json
         ) AS anexos
       FROM requerimentos r
       JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN requerimento_anexos a ON a.requerimento_id = r.id
       WHERE r.usuario_id = $1
       GROUP BY r.id, u.nome
       ORDER BY r.data_pedido DESC`,
      [req.usuario.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};

exports.listar = async (_req, res) => {
  const client = await pool.connect();
  try {
    const anexoCols = await resolveAnexoColumns(client);
    const result = await client.query(
      `SELECT
         r.id,
         r.protocolo,
         u.nome AS usuario,
         r.setor,
         r.descricao,
         r.data_pedido,
         r.status,
         r.motivo_recusa,
         COALESCE(
           json_agg(
             json_build_object(
               'id', a.id,
               'nome_arquivo', a.${anexoCols.nome},
               'tipo_arquivo', a.${anexoCols.tipo},
               'caminho_arquivo', a.${anexoCols.caminho},
               'arquivo_nome', a.${anexoCols.nome},
               'arquivo_tipo', a.${anexoCols.tipo},
               'arquivo_caminho', a.${anexoCols.caminho},
               'enviado_em', a.enviado_em
             )
           ) FILTER (WHERE a.id IS NOT NULL),
           '[]'::json
         ) AS anexos
       FROM requerimentos r
       JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN requerimento_anexos a ON a.requerimento_id = r.id
       GROUP BY r.id, u.nome
       ORDER BY r.data_pedido DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};

exports.alterarStatus = async (req, res) => {
  const { id } = req.params;
  const { status, motivo_recusa } = req.body || {};

  const statusNormalizado = String(status || "").trim().toUpperCase();
  if (!["PENDENTE", "CONCLUIDO", "RECUSADO"].includes(statusNormalizado)) {
    return res.status(400).json({ erro: "Status invalido. Use PENDENTE, CONCLUIDO ou RECUSADO" });
  }

  const motivoRecusaFinal = statusNormalizado === "RECUSADO"
    ? String(motivo_recusa || "").trim()
    : null;

  if (statusNormalizado === "RECUSADO" && !motivoRecusaFinal) {
    return res.status(400).json({ erro: "Motivo da recusa e obrigatorio" });
  }

  try {
    let result;
    if (statusNormalizado === "RECUSADO") {
      result = await pool.query(
        `WITH atualizados AS (
           UPDATE requerimentos
              SET status = 'RECUSADO',
                  motivo_recusa = $1::text
            WHERE id = $2::uuid
            RETURNING id, usuario_id, protocolo, setor, descricao, data_pedido, status, motivo_recusa
         )
         SELECT
           a.id,
           a.protocolo,
           u.nome AS usuario,
           a.setor,
           a.descricao,
           a.data_pedido,
           a.status,
           a.motivo_recusa
         FROM atualizados a
         JOIN usuarios u ON u.id = a.usuario_id`,
        [motivoRecusaFinal, id]
      );
    } else {
      result = await pool.query(
        `WITH atualizados AS (
           UPDATE requerimentos
              SET status = $1::text,
                  motivo_recusa = NULL
            WHERE id = $2::uuid
            RETURNING id, usuario_id, protocolo, setor, descricao, data_pedido, status, motivo_recusa
         )
         SELECT
           a.id,
           a.protocolo,
           u.nome AS usuario,
           a.setor,
           a.descricao,
           a.data_pedido,
           a.status,
           a.motivo_recusa
         FROM atualizados a
         JOIN usuarios u ON u.id = a.usuario_id`,
        [statusNormalizado, id]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: "Requerimento nao encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
