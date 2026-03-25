const bcrypt = require("bcryptjs");

const hashSenha = async (senha) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(senha, salt);
};

const compararSenha = async (senha, hash) => {
  return await bcrypt.compare(senha, hash);
};

module.exports = { hashSenha, compararSenha };