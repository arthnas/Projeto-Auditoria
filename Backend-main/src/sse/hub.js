/**
 * SSE Hub: gerencia clientes conectados ao stream de presença.
 * Expõe métodos para adicionar/remover clientes e publicar eventos.
 */

const clients = new Set();

/**
 * Registra um cliente SSE (res) e retorna uma função de cleanup.
 * @param {import('express').Response} res
 * @returns {() => void} função para remover o cliente
 */
function addClient(res) {
  clients.add(res);
  return () => clients.delete(res);
}

/**
 * Publica um evento SSE para todos os clientes conectados.
 * @param {string} event  - nome do evento (ex: 'login', 'logout', 'timeout')
 * @param {object} data   - payload JSON
 */
function publish(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (err) {
      console.error("[SSE hub] client write failed, removing:", err.message);
      clients.delete(res);
    }
  }
}

module.exports = { addClient, publish };
