/**
 * Validates that a caminho value is either a UNC network path or a well-formed web URL.
 * @param {string} caminho
 * @returns {boolean}
 */
function isValidCaminho(caminho) {
  if (caminho.startsWith("\\\\")) {
    return true;
  }
  if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
    try {
      new URL(caminho);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

module.exports = { isValidCaminho };
