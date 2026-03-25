const express = require('express');
const router = express.Router();
const pool = require("../config/db");

// Endpoint para buscar o histórico de tarefas concluídas
router.get('/tarefas/historico-concluidas', async (req, res) => {
  try {
    const result = await pool.query(`
    SELECT  
  h.data_conclusao as data,  
  s.nome as setor_nome,  
  ss.nome as subsetor_nome,
  COUNT(*) as total_concluidas
FROM tarefas_concluidas_historico h  
JOIN setores s ON h.setor_id = s.id  
LEFT JOIN subsetores ss ON h.subsetor_id = ss.id
GROUP BY h.data_conclusao, s.nome, ss.nome
ORDER BY h.data_conclusao, s.nome, ss.nome;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de concluídas' });
  }
});

module.exports = router;
