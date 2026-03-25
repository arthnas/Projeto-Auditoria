require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const coordenadorRoutes = require("./routes/coordenador.routes");
const tarefaRoutes = require("./routes/tarefa.routes");
const authRoutes = require("./routes/auth.routes");
const estruturaRoutes = require("./routes/estrutura.routes");
const setorRoutes = require("./routes/setor.routes");
const subsetorRoutes = require("./routes/subsetor.routes"); 
const registroRoutes = require("./routes/registro.routes");
const usuarioRoutes = require("./routes/usuario.routes");
const supervisoresRoutes = require("./routes/supervisores");
const funcionarioRoutes = require("./routes/funcionarios.routes");
const authMiddleware = require("./middlewares/auth.middleware");
const tipoRoutes = require("./routes/tipo.routes");
const historicoRoutes = require('./routes/historico.routes');
const solicitacoesRoutes = require('./routes/solicitacoes.routes');
const requerimentosRoutes = require("./routes/requerimentos.routes");
const { startPresencaJob } = require("./jobs/presenca");


const app = express();
const uploadsRoot = path.resolve(process.cwd(), "uploads");

function sendUploadAsDownload(req, res) {
  const raw = String(req.params[0] || "").replace(/^\/+/, "");
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch (_) {
      return raw;
    }
  })();

  const normalizeRel = (p) =>
    String(p || "")
      .replace(/^\/+/, "")
      .replace(/^api\/uploads\/+/i, "")
      .replace(/^uploads\/+/i, "");

  const candidates = [
    normalizeRel(raw),
    normalizeRel(decoded),
    path.join("requerimentos", path.basename(decoded || raw))
  ];

  let absPath = null;
  for (const rel of candidates) {
    const candidate = path.resolve(uploadsRoot, rel);
    if (!candidate.startsWith(uploadsRoot + path.sep)) continue;
    if (fs.existsSync(candidate)) {
      absPath = candidate;
      break;
    }
  }

  if (!absPath) {
    return res.status(404).json({ erro: "Arquivo nao encontrado" });
  }

  return res.download(absPath);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/api/uploads/*", sendUploadAsDownload);
app.get("/uploads/*", sendUploadAsDownload);

// 🔓 ROTAS LIVRES (login)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// 🔐 A partir daqui exige token
app.use(authMiddleware);

app.use("/api/coordenadores", coordenadorRoutes);
app.use("/api/setores", setorRoutes);
app.use("/api/supervisores", supervisoresRoutes);
app.use("/api/subsetores", subsetorRoutes);
app.use("/api/tarefas", tarefaRoutes);
app.use("/api/estrutura", estruturaRoutes);
app.use("/api/registros", registroRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/funcionarios", funcionarioRoutes);
app.use("/api/tipos", tipoRoutes);
app.use("/api/historico", historicoRoutes);
app.use("/api/solicitacoes", solicitacoesRoutes);
app.use("/api/requerimentos", requerimentosRoutes);

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORT}`);
  startPresencaJob();
});
