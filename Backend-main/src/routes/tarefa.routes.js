const router = require("express").Router();
const controller = require("../controllers/tarefa.controller");
const auth = require("../middlewares/auth.middleware");
const pool = require("../config/db");

router.post("/", auth, controller.criar);
router.get("/", auth, controller.listar);
router.post("/check", auth, controller.check);
router.get("/historico-concluidas", auth, controller.historicoConcluidas);

router.get("/agenda", auth, async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT linha, coluna, texto FROM agenda"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar agenda" });
  }
});

router.post("/agenda", auth, async (req, res) => {

  const { agenda } = req.body;
  if (!Array.isArray(agenda)) {
    return res.status(400).json({ erro: "Payload invalido: 'agenda' deve ser um array bidimensional" });
  }

  try {
    await pool.query("BEGIN");

    await pool.query("DELETE FROM agenda");

    for (let i = 0; i < agenda.length; i++) {
      if (!Array.isArray(agenda[i])) {
        throw new Error("Payload invalido: cada linha da agenda deve ser um array");
      }
      for (let j = 0; j < agenda[i].length; j++) {

        const texto = agenda[i][j] == null ? "" : String(agenda[i][j]);

        if (texto) {
          await pool.query(
            "INSERT INTO agenda (linha, coluna, texto) VALUES ($1,$2,$3)",
            [i, j, texto]
          );
        }

      }
    }

    await pool.query("COMMIT");
    res.json({ ok: true });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar agenda", detalhe: err.message });
  }
});

router.put("/:id/status", auth, controller.alterarStatus);
router.put("/:id", auth, controller.atualizar);
router.delete("/:id", auth, controller.deletar);
router.put("/reset-multiple", auth, controller.resetMultiple);

module.exports = router;
