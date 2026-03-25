const router = require("express").Router();
const controller = require("../controllers/usuario.controller");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

router.get("/me", auth, controller.me);
router.get("/", auth, controller.listar);
router.get("/online", auth, controller.listarOnline);
router.post("/", auth, admin, controller.criar);
router.put("/:id", auth, admin, controller.atualizar);
router.delete("/:id", auth, admin, controller.deletar);

module.exports = router;
