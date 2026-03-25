const express = require("express");
const router = express.Router();
const funcionarioController = require("../controllers/funcionario.controller");
const admin = require("../middlewares/admin.middleware");

router.get("/", funcionarioController.listar);
router.post("/", funcionarioController.criar);
router.delete("/:id", admin, funcionarioController.deletar);

module.exports = router;
