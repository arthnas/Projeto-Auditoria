const express = require("express");
const router = express.Router();
const supervisoresController = require("../controllers/supervisoresController");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

router.get("/", supervisoresController.listar);
router.post("/", auth, admin, supervisoresController.criar);

module.exports = router;
