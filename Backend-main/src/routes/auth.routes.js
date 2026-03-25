const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/registrar_usuario", controller.registrar);
router.post("/login", controller.login);
router.post("/heartbeat", auth, controller.heartbeat);
router.post("/logout", auth, controller.logout);
router.get("/presenca/stream", controller.streamPresenca);

module.exports = router;
