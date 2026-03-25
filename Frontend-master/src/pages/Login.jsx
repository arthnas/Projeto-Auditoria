import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import bg from "../assets/Apresentação - Capa.jpg";

export default function Login() {
  const { setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", { usuario, senha });
      setToken(response.data.token);
      navigate("/dashboard");
    } catch (err) {
      if (!err.response) {
        alert("Falha de conexao com o servidor. Verifique internet/CORS e tente novamente.");
        return;
      }

      if (err.response.status === 401) {
        alert("Usuario ou senha invalidos");
        return;
      }

      alert(`Erro ao fazer login (${err.response.status}).`);
    }
  }

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${bg})`,
      }}
    >
      <div className="login-overlay" />

      <form onSubmit={handleLogin} className="login-card">
        <h2 className="login-title">Sistema de Auditoria</h2>

        <input
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="login-input"
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="login-input"
        />

        <button className="login-button">Entrar</button>
      </form>
    </div>
  );
}
