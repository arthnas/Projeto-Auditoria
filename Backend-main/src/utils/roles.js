const ADMIN_EQUIVALENT_TYPES = new Set(["ADMIN", "DEVELOPER"]);

function normalizeTipo(tipo) {
  return String(tipo || "").trim().toUpperCase();
}

function isAdminLike(tipo) {
  return ADMIN_EQUIVALENT_TYPES.has(normalizeTipo(tipo));
}

function isDeveloper(tipo) {
  return normalizeTipo(tipo) === "DEVELOPER";
}

module.exports = {
  isAdminLike,
  isDeveloper,
  normalizeTipo
};
