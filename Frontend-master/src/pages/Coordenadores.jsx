/* eslint-disable no-unused-vars */
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import { useEffect, useState, useContext, useMemo } from "react";


export default function Coordenadores() {
  const [coordenadores, setCoordenadores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);

  const { token } = useContext(AuthContext);

const usuarioLogado = useMemo(() => {
  return token ? JSON.parse(atob(token.split(".")[1])) : null;
}, [token]);

const tipoUsuario = String(usuarioLogado?.tipo || "").trim().toUpperCase();
const isAdmin = tipoUsuario === "ADMIN" || tipoUsuario === "DEVELOPER";
const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
const chavePersistencia = `coordenadores:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`;

useEffect(() => {
  try {
    const bruto = localStorage.getItem(chavePersistencia);
    if (!bruto) return;
    const salvo = JSON.parse(bruto);
    if (salvo?.linhaSelecionada != null) {
      setLinhaSelecionada(salvo.linhaSelecionada);
    }
  } catch {
  }
}, [chavePersistencia]);

useEffect(() => {
  try {
    localStorage.setItem(chavePersistencia, JSON.stringify({ linhaSelecionada }));
  } catch {
  }
}, [chavePersistencia, linhaSelecionada]);


  async function carregar() {
    try {
      const response = await api.get("/coordenadores");
      setCoordenadores(response.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
  async function iniciar() {
    try {
      const cache = sessionStorage.getItem("coordenadores");

      if (cache) {
        setCoordenadores(JSON.parse(cache));
      }

      const response = await api.get("/coordenadores");

      setCoordenadores(response.data);
      sessionStorage.setItem("coordenadores", JSON.stringify(response.data));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  iniciar();
}, []);
   
  function abrirNovo() {
    setEditando(null);
    setNome("");
    setModalOpen(true);
  }

  function abrirEditar(coord) {
    setEditando(coord);
    setNome(coord.nome);
    setModalOpen(true);
  }

  async function salvar() {
  try {
    if (!nome.trim()) return;

    if (editando) {
      const response = await api.put(
        `/coordenadores/${editando.id}`,
        { nome }
      );

      setCoordenadores(prev =>
        prev.map(c =>
          c.id === editando.id ? response.data : c
        )
      );

    } else {
      const response = await api.post(
        "/coordenadores",
        { nome }
      );

      setCoordenadores(prev => [...prev, response.data]);
    }

    setModalOpen(false);
    setEditando(null);
    setNome("");

  } catch (err) {
    console.error(err);
  }
}

  
  async function deletar(id) {
  if (!window.confirm("Deseja deletar este coordenador?")) return;

  try {
    await api.delete(`/coordenadores/${id}`);

    setCoordenadores(prev =>
      prev.filter(c => c.id !== id)
    );
  } catch (err) {
    console.error(err);
  }
}

  return (
    <Layout>
      <h1 style={{ color: "#0047AB", marginBottom: "20px" }}>
        Gestão de Coordenadores
      </h1>

      {isAdmin && (
        <button style={btnNovo} onClick={abrirNovo}>
          + Novo Coordenador
        </button>
      )}

      <div style={cardTabela}>
  <div style={scrollContainer}>
    <table style={tabela}>
      <thead
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 1
        }}
      >
        <tr>
          <th style={th}>Nome</th>
          {isAdmin && (
            <th style={{ ...th, textAlign: "center" }}>
              Ações
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {coordenadores.map((coord) => (
         <tr
  key={coord.id}
  onDoubleClick={() =>
    setLinhaSelecionada(
      linhaSelecionada === coord.id ? null : coord.id
    )
  }
  style={{
    backgroundColor:
      linhaSelecionada === coord.id
        ? "#e0f2fe"
        : "white",
    cursor: "pointer",
    transition: "0.2s"
  }}
>
            <td style={td}>{coord.nome}</td>

            {isAdmin && (
              <td
                style={{
                  ...td,
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px"
                }}
              >
                <button
                  style={btnEditar}
                  onClick={() => abrirEditar(coord)}
                >
                  Editar
                </button>

                <button
                  style={btnExcluir}
                  onClick={() => deletar(coord.id)}
                >
                  Deletar
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} size="sm">
          <h2 style={{ marginBottom: "15px" }}>
            {editando ? "Editar Coordenador" : "Novo Coordenador"}
          </h2>

          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={input}
          />

          <button style={btnSalvar} onClick={salvar}>
            Salvar
          </button>
        </Modal>
      )}
    </Layout>
  );
}

/* ================= ESTILOS ================= */

const cardTabela = {
  background: "white",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  height: "auto",
  maxHeight: "calc(100vh - 220px)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};

const tabela = {
  minWidth: "1300px",
  width: "100%",
  maxWidth: "100%", // ðŸ”¥ evita quebrar no mobile
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "2px solid #aa9d9dfb",
  fontWeight: "800"
};

const td = {
  padding: "16px",
  borderBottom: "1px solid #e4e0e0",
  borderRight: "1px solid #f0eded",
  whiteSpace: "normal",
  wordBreak: "break-word",
  fontSize: "18px",
};

const linha = {
  transition: "0.2s"
};

const scrollContainer = {
  maxHeight: "450px",
  overflowY: "auto",
  overflowX: "auto", // ðŸ”¥ ESSENCIAL PARA CELULAR
};

const btnNovo = {
  marginBottom: "20px",
  width: "fit-content",
  marginLeft: "auto",
  padding: "10px 20px",
  background: "#0047AB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "18px"
};

const btnEditar = {
  background: "#1E8E3E",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  fontSize: "18px",
  fontWeight: "500",
  cursor: "pointer"
};

const btnExcluir = {
  background: "#C62828",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  fontSize: "18px",
  fontWeight: "500",
  cursor: "pointer"
};

const btnSalvar = {
  marginTop: "15px",
  padding: "10px",
  background: "#0047AB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  width: "100%",
  fontWeight: "600",
  cursor: "pointer"
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "18px"
};



