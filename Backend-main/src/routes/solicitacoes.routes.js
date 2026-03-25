const router = require("express").Router();
const controller = require("../controllers/solicitacoes.controller");
const admin = require("../middlewares/admin.middleware");

// GET /api/solicitacoes/minhas  — deve vir ANTES de /:id
router.get("/minhas", controller.minhas);

// POST /api/solicitacoes
router.post("/", controller.criar);

// GET /api/solicitacoes  (admin)
router.get("/", admin, controller.listar);

// PUT /api/solicitacoes/:id  (admin)
router.put("/:id", admin, controller.responder);

module.exports = router;
