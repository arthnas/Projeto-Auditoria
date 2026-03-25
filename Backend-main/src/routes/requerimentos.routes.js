const router = require("express").Router();
const multer = require("multer");
const controller = require("../controllers/requerimentos.controller");
const developerOnly = require("../middlewares/developer.middleware");
const upload = require("../middlewares/upload.requerimentos.middleware");

router.post("/", (req, res, next) => {
  upload.array("anexos", 10)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ erro: err.message });
    }
    return res.status(400).json({ erro: err.message || "Falha no upload dos anexos" });
  });
}, controller.criar);
router.get("/minhas", controller.listarMinhas);
router.get("/", developerOnly, controller.listar);
router.patch("/:id/status", developerOnly, controller.alterarStatus);

module.exports = router;
