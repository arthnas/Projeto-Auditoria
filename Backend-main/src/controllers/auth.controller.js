const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { hashSenha, compararSenha } = require("../services/hash.service");
const { parseDevice } = require("../utils/device");
const sseHub = require("../sse/hub");

exports.registrar = async (req, res) => {
  try {
    const { nome, usuario, senha, tipo } = req.body;

    const senhaHash = await hashSenha(senha);

    const result = await pool.query(
      "INSERT INTO usuarios (nome, usuario, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, usuario, senhaHash, tipo || "PADRAO"]
    );

    res.json({ id: result.rows[0].id });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const usuario = typeof req.body?.usuario === "string" ? req.body.usuario.trim() : "";
    const senha = typeof req.body?.senha === "string" ? req.body.senha : String(req.body?.senha ?? "");

    if (!usuario || !senha) {
      return res.status(400).json({ erro: "Usuario e senha sao obrigatorios" });
    }

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      [usuario]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ erro: "Usuário não encontrado" });

    const usuarioData = result.rows[0];

    const senhaValida = await compararSenha(
      senha,
      usuarioData.senha_hash
    );

    if (!senhaValida)
      return res.status(400).json({ erro: "Senha incorreta" });

    const { ip, dispositivo, userAgent, plataforma } = parseDevice(req);
    let sid = null;
    try {
      const sessao = await pool.query(
        `INSERT INTO sessoes (usuario_id, online, status, ip, dispositivo, user_agent, plataforma)
         VALUES ($1, TRUE, 'online', $2, $3, $4, $5)
         RETURNING id`,
        [usuarioData.id, ip, dispositivo, userAgent, plataforma]
      );
      sid = sessao.rows[0].id;
    } catch (err) {
      // Compatibilidade com banco que ainda tenha UNIQUE em usuario_id.
      if (err?.code === "23505") {
        try {
          const sessao = await pool.query(
            `UPDATE sessoes
                SET online = TRUE,
                    status = 'online',
                    ip = $2,
                    dispositivo = $3,
                    user_agent = $4,
                    plataforma = $5,
                    ultimo_heartbeat = now(),
                    encerrado_em = NULL
              WHERE usuario_id = $1
              RETURNING id`,
            [usuarioData.id, ip, dispositivo, userAgent, plataforma]
          );
          sid = sessao.rows[0]?.id ?? null;
        } catch (updateErr) {
          console.error("[auth.login][sessao.update]", updateErr.message);
        }
      } else {
        console.error("[auth.login][sessao.insert]", err.message);
      }
    }

    const token = jwt.sign(
      {
        id: usuarioData.id,
        sub: usuarioData.id,
        usuario: usuarioData.usuario,
        tipo: usuarioData.tipo,
        sid
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    sseHub.publish("login", {
      sid,
      userId: usuarioData.id,
      nome: usuarioData.nome,
      tipo: usuarioData.tipo,
      online: true,
      status: "online",
      dispositivo
    });

    res.json({ token });

  } catch (err) {
    console.error("[auth.login]", err.message);
    res.status(500).json({ erro: err.message });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const sid = req.usuario?.sid;
    if (!sid) return res.status(400).json({ erro: "Sessao invalida" });

    const result = await pool.query(
      `UPDATE sessoes
          SET online = TRUE,
              status = 'online',
              ultimo_heartbeat = now()
        WHERE id = $1
        RETURNING id, usuario_id`,
      [sid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: "Sessao nao encontrada" });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const sid = req.usuario?.sid;
    const userId = req.usuario?.id;
    if (!sid || !userId) return res.status(400).json({ erro: "Sessao invalida" });

    const result = await pool.query(
      `UPDATE sessoes
          SET online = FALSE,
              status = 'offline',
              encerrado_em = now()
        WHERE id = $1
          AND usuario_id = $2
          AND online = TRUE
        RETURNING id`,
      [sid, userId]
    );

    for (const row of result.rows) {
      sseHub.publish("logout", { sid: row.id, userId, online: false, status: "offline" });
    }

    res.json({ mensagem: "Logout realizado com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.streamPresenca = (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const token = bearerToken || req.query?.token;

    if (!token) {
      return res.status(401).json({ erro: "Nao autorizado" });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write("event: connected\ndata: {\"ok\":true}\n\n");
    const cleanup = sseHub.addClient(res);

    req.on("close", () => {
      cleanup();
      res.end();
    });
  } catch {
    return res.status(401).json({ erro: "Token invalido" });
  }
};
