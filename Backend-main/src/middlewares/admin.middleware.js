const { isAdminLike } = require("../utils/roles");

module.exports = (req, res, next) => {
  if (!req.usuario || !isAdminLike(req.usuario.tipo)) {
    return res.status(403).json({ erro: "Acesso restrito a administradores" });
  }
  next();
};
