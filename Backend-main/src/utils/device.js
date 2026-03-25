/**
 * Extrai informações de dispositivo, IP, userAgent e plataforma da requisição.
 * @param {import('express').Request} req
 * @returns {{ ip: string, dispositivo: string, userAgent: string, plataforma: string }}
 */
function parseDevice(req) {
  const userAgent = req.headers["user-agent"] || "";

  // x-forwarded-for pode ser falsificado por clientes sem proxy confiável;
  // configure um proxy reverso (nginx/load balancer) e use app.set('trust proxy', 1)
  // no Express para garantir que apenas IPs de proxies confiáveis sejam aceitos.
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "";

  const plataforma =
    req.headers["x-platform"] || detectPlataforma(userAgent);

  const dispositivo =
    req.headers["x-device"] || detectDispositivo(userAgent);

  return { ip, dispositivo, userAgent, plataforma };
}

function detectPlataforma(ua) {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Desconhecido";
}

function detectDispositivo(ua) {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
  return "Desktop";
}

module.exports = { parseDevice };
