const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.resolve(process.cwd(), "uploads", "requerimentos");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const original = String(file.originalname || "arquivo");
    const ext = path.extname(original);
    const base = path.basename(original, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  const tipo = String(file.mimetype || "").toLowerCase();
  if (tipo === "application/pdf") {
    return cb(null, true);
  }
  return cb(new Error("Tipo de anexo invalido. Use apenas PDF"));
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});
