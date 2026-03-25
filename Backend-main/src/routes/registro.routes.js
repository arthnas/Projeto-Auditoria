const router = require("express").Router();
const controller = require("../controllers/registro.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/", auth, controller.listar);
router.post("/", auth, controller.criar); 
router.put("/:id", auth, controller.atualizar);
router.delete("/:id", auth, controller.deletar);

module.exports = router;
