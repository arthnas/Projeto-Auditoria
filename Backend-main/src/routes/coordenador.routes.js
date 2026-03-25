const router = require("express").Router();
const controller = require("../controllers/coordenador.controller");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

/*
  ROTAS DE COORDENADORES
  - Listar: usuário logado
  - Criar: ADMIN
  - Atualizar: ADMIN
  - Deletar: ADMIN
*/

// 🔎 Rota teste (opcional)
router.get("/teste", (req, res) => {
  res.send("Rota coordenador funcionando");
});

// 📋 Listar todos
router.get("/", auth, controller.listar);

// 🔍 Buscar por ID
router.get("/:id", auth, controller.buscarPorId);

// ➕ Criar (somente ADMIN)
router.post("/", auth, admin, controller.criar);

// ✏ Atualizar (somente ADMIN)
router.put("/:id", auth, admin, controller.atualizar);

// ❌ Deletar (somente ADMIN)
router.delete("/:id", auth, admin, controller.deletar);

module.exports = router;
