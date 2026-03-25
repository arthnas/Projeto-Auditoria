const router = require("express").Router();
const controller = require("../controllers/subsetor.controller");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

router.get("/", auth, controller.listar);
router.post("/", auth, admin, controller.criar);
router.put("/:id", auth, admin, controller.atualizar);
router.delete("/:id", auth, admin, controller.deletar);

module.exports = router;
