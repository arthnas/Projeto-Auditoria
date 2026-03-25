/**
 * Unit tests for auth controller and listarOnline.
 * Uses manual mocks for pool and sseHub to avoid real DB calls.
 */

jest.mock("../config/db");
jest.mock("../sse/hub", () => ({ publish: jest.fn() }));
jest.mock("../services/hash.service", () => ({
  hashSenha: jest.fn(async (s) => `hashed:${s}`),
  compararSenha: jest.fn(async (plain, hash) => hash === `hashed:${plain}`)
}));
jest.mock("../utils/device", () => ({
  parseDevice: jest.fn(() => ({
    ip: "127.0.0.1",
    dispositivo: "Desktop",
    userAgent: "jest",
    plataforma: "Linux"
  }))
}));

const pool = require("../config/db");
const sseHub = require("../sse/hub");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";

const authController = require("../controllers/auth.controller");
const usuarioController = require("../controllers/usuario.controller");

// Helper: create minimal req/res mocks
function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── login ────────────────────────────────────────────────────────────────────

describe("login", () => {
  test("creates session and returns token with sub and sid", async () => {
    const userId = "user-uuid-1";
    const sessaoId = "sess-uuid-1";

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: userId, usuario: "john", senha_hash: "hashed:pass", nome: "John", tipo: "PADRAO" }] })
      .mockResolvedValueOnce({ rows: [{ id: sessaoId }] });

    const req = { body: { usuario: "john", senha: "pass" }, headers: {} };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const { token } = res.json.mock.calls[0][0];
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, "test-secret");
    expect(decoded.sub).toBe(userId);
    expect(decoded.id).toBe(userId);
    expect(decoded.sid).toBe(sessaoId);

    // SSE login event published
    expect(sseHub.publish).toHaveBeenCalledWith("login", expect.objectContaining({ online: true, status: "online" }));
  });

  test("returns 400 for unknown user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = { body: { usuario: "nobody", senha: "x" }, headers: {} };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 for wrong password", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "u1", usuario: "john", senha_hash: "hashed:correct", nome: "J", tipo: "PADRAO" }] });
    const req = { body: { usuario: "john", senha: "wrong" }, headers: {} };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── heartbeat ────────────────────────────────────────────────────────────────

describe("heartbeat", () => {
  test("updates session and returns ok", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "sess-1" }] });

    const req = { usuario: { sid: "sess-1", id: "user-1" } };
    const res = mockRes();

    await authController.heartbeat(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/status\s*=\s*'online'/);
  });

  test("returns 400 when sid is missing", async () => {
    const req = { usuario: {} };
    const res = mockRes();
    await authController.heartbeat(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when session not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const req = { usuario: { sid: "gone", id: "user-1" } };
    const res = mockRes();
    await authController.heartbeat(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe("logout", () => {
  test("marks session offline and publishes SSE event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "sess-1" }] });

    const req = { usuario: { sid: "sess-1", id: "user-1" } };
    const res = mockRes();

    await authController.logout(req, res);
    expect(res.json).toHaveBeenCalledWith({ mensagem: "Logout realizado com sucesso" });

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/status\s*=\s*'offline'/);
    expect(sql).toMatch(/WHERE id = \$1/i);
    expect(sseHub.publish).toHaveBeenCalledWith("logout", expect.objectContaining({ sid: "sess-1" }));
  });
});

// ─── listarOnline ─────────────────────────────────────────────────────────────

describe("listarOnline", () => {
  test("returns {usuarios: [...]} with correct fields", async () => {
    const rows = [
      { id: "u1", nome: "Ana", tipo: "ADMIN", online: true, status: "online", dispositivo: "Desktop", ultimoHeartbeat: "2024-01-01T00:00:00Z" }
    ];
    pool.query.mockResolvedValueOnce({ rows });

    const req = {};
    const res = mockRes();

    await usuarioController.listarOnline(req, res);

    expect(res.json).toHaveBeenCalledWith({ usuarios: rows });
  });
});
