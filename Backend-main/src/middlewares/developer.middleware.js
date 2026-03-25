const { isDeveloper } = require("../utils/roles");

module.exports = (req, res, next) => {
  if (!req.usuario || !isDeveloper(req.usuario.tipo)) {
    return res.status(403).json({ erro: "Acesso restrito a developers" });
  }
  next();
};
