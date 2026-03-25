import { useMemo } from "react";
import { useEffect, useState, useContext } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import Select from "react-select";

export default function Subsetores() {
  const [subsetores, setSubsetores] = useState([]);
  const [setores, setSetores] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);

  const [filtroCoord, setFiltroCoord] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const [form, setForm] = useState({
    nome: "",
    setor_id: ""
  });

  const { token } = useContext(AuthContext);
  const usuarioLogado = useMemo(() => {
    return token ? JSON.parse(atob(token.split(".")[1])) : null;
  }, [token]);

  const tipoUsuario = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isAdmin = tipoUsuario === "ADMIN" || tipoUsuario === "DEVELOPER";
  const isCoordenador = tipoUsuario === "COORDENADOR";
  const isSupervisor = tipoUsuario === "SUPERVISOR";
  const loginUsuarioLogado = String(usuarioLogado?.usuario || "").trim();
  const nomeUsuarioLogadoExibicao = String(
    usuarioLogado?.nome || usuarioLogado?.name || ""
  ).trim();
  const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
  const [nomeUsuarioPerfilExibicao, setNomeUsuarioPerfilExibicao] = useState(
    nomeUsuarioLogadoExibicao
  );
  const [nomeCoordenadorLogado, setNomeCoordenadorLogado] = useState("");
  const chavePersistencia = useMemo(
    () => `subsetores:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`,
    [usuarioLogado?.tipo, idUsuarioLogado]
  );

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  const nomeUsuarioLogado = normalizarNome(nomeUsuarioPerfilExibicao);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chavePersistencia);
      if (!bruto) return;
      const salvo = JSON.parse(bruto);
      setFiltroCoord(String(salvo?.filtroCoord || ""));
      setFiltroSetor(String(salvo?.filtroSetor || ""));
      if (salvo?.linhaSelecionada != null) {
        setLinhaSelecionada(salvo.linhaSelecionada);
      }
    } catch {
    }
  }, [chavePersistencia]);

  useEffect(() => {
    const estado = { filtroCoord, filtroSetor, linhaSelecionada };
    try {
      localStorage.setItem(chavePersistencia, JSON.stringify(estado));
    } catch {
    }
  }, [chavePersistencia, filtroCoord, filtroSetor, linhaSelecionada]);

  useEffect(() => {
    let ativo = true;

    async function resolverNomePerfil() {
      const nomeToken = String(usuarioLogado?.nome || usuarioLogado?.name || "").trim();
      if (nomeToken && normalizarNome(nomeToken) !== normalizarNome(loginUsuarioLogado)) {
        if (ativo) setNomeUsuarioPerfilExibicao(nomeToken);
        return;
      }

      if (!idUsuarioLogado) {
        if (ativo) setNomeUsuarioPerfilExibicao(nomeToken);
        return;
      }

      try {
        const me = await api.get("/usuarios/me");
        const nome = String(me?.data?.nome || "").trim();
        if (nome) {
          if (ativo) setNomeUsuarioPerfilExibicao(nome);
          return;
        }
      } catch {
      }

      try {
        const usuario = await api.get(`/usuarios/${idUsuarioLogado}`);
        const nome = String(usuario?.data?.nome || "").trim();
        if (nome) {
          if (ativo) setNomeUsuarioPerfilExibicao(nome);
          return;
        }
      } catch {
      }

      try {
        const usuarios = await api.get("/usuarios");
        const encontrado = (usuarios?.data || []).find(
          (u) =>
            String(u?.id || "").trim() === idUsuarioLogado ||
            normalizarNome(u?.usuario) === normalizarNome(loginUsuarioLogado)
        );
        const nome = String(encontrado?.nome || "").trim();
        if (ativo) setNomeUsuarioPerfilExibicao(nome || nomeToken);
      } catch {
        if (ativo) setNomeUsuarioPerfilExibicao(nomeToken);
      }
    }

    resolverNomePerfil();

    return () => {
      ativo = false;
    };
  }, [idUsuarioLogado, loginUsuarioLogado, usuarioLogado?.nome, usuarioLogado?.name]);

  useEffect(() => {
    let ativo = true;

    async function resolverNomeCoordenador() {
      if (!isCoordenador) {
        if (ativo) setNomeCoordenadorLogado("");
        return;
      }

      const nomeToken = String(usuarioLogado?.nome || usuarioLogado?.name || "").trim();
      if (nomeToken) {
        if (ativo) setNomeCoordenadorLogado(nomeToken);
        return;
      }

      if (!idUsuarioLogado) return;

      try {
        const me = await api.get("/usuarios/me");
        const nome = String(me?.data?.nome || "").trim();
        if (nome) {
          if (ativo) setNomeCoordenadorLogado(nome);
          return;
        }
      } catch {
      }

      try {
        const usuario = await api.get(`/usuarios/${idUsuarioLogado}`);
        const nome = String(usuario?.data?.nome || "").trim();
        if (nome && ativo) {
          setNomeCoordenadorLogado(nome);
          return;
        }
      } catch {
      }

      try {
        const usuarios = await api.get("/usuarios");
        const encontrado = (usuarios?.data || []).find(
          (u) => String(u?.id || "").trim() === idUsuarioLogado
        );
        const nome = String(encontrado?.nome || "").trim();
        if (ativo) setNomeCoordenadorLogado(nome);
      } catch {
      }
    }

    resolverNomeCoordenador();

    return () => {
      ativo = false;
    };
  }, [isCoordenador, idUsuarioLogado, usuarioLogado?.nome, usuarioLogado?.name]);

  useEffect(() => {
    if (!isCoordenador) return;
    if (!nomeCoordenadorLogado) return;

    const coordenadorEncontrado = coordenadores.find(
      (c) => String(c?.nome || "").trim() === nomeCoordenadorLogado
    );

    if (!coordenadorEncontrado?.id) return;

    const coordenadorId = String(coordenadorEncontrado.id);
    if (String(filtroCoord) !== coordenadorId) {
      setFiltroCoord(coordenadorId);
      setFiltroSetor("");
    }
  }, [isCoordenador, nomeCoordenadorLogado, coordenadores, filtroCoord]);

  function obterNomesSupervisoresDoSetor(setor) {
    if (Array.isArray(setor?.supervisor_nomes)) {
      return setor.supervisor_nomes
        .map((nome) => String(nome || "").trim())
        .filter(Boolean);
    }

    if (Array.isArray(setor?.supervisores)) {
      return setor.supervisores
        .map((supervisor) => String(supervisor?.nome || "").trim())
        .filter(Boolean);
    }

    if (setor?.supervisor_nome) {
      return [String(setor.supervisor_nome).trim()].filter(Boolean);
    }

    return [];
  }

  const setorSupervisorLogado = useMemo(() => {
    if (!isSupervisor) return "";

    const setorVinculado = (setores || []).find(
      (setor) =>
        obterNomesSupervisoresDoSetor(setor).some(
          (nome) => normalizarNome(nome) === nomeUsuarioLogado
        ) &&
        String(setor?.id || "").trim()
    );

    return String(setorVinculado?.id || "").trim();
  }, [isSupervisor, setores, nomeUsuarioLogado]);

  useEffect(() => {
    if (!isSupervisor) return;
    if (!setorSupervisorLogado) return;

    if (String(filtroSetor) !== setorSupervisorLogado) {
      setFiltroSetor(setorSupervisorLogado);
    }
  }, [isSupervisor, setorSupervisorLogado, filtroSetor]);

  async function iniciar() {
    try {
      const cache = sessionStorage.getItem("subsetoresData");

      if (cache) {
        const { subsetores, setores, coordenadores } = JSON.parse(cache);
        setSubsetores(subsetores);
        setSetores(setores);
        setCoordenadores(coordenadores);
      }

      const [ss, s, c] = await Promise.all([
        api.get("/subsetores"),
        api.get("/setores"),
        api.get("/coordenadores")
      ]);

      setSubsetores(ss.data);
      setSetores(s.data);
      setCoordenadores(c.data);

      sessionStorage.setItem(
        "subsetoresData",
        JSON.stringify({
          subsetores: ss.data,
          setores: s.data,
          coordenadores: c.data
        })
      );

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    iniciar();
  }, []);


  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", setor_id: "" });
    setModalOpen(true);
  }

  function abrirEditar(item) {
    setEditando(item);
    setForm({
      nome: item.nome,
      setor_id: item.setor_id
    });
    setModalOpen(true);
  }

 async function salvar() {
  if (!form.nome.trim()) return;

  try {
    if (editando) {
      const response = await api.put(`/subsetores/${editando.id}`, form);

      setSubsetores(prev =>
        prev.map(ss =>
          ss.id === editando.id ? response.data : ss
        )
      );

    } else {
      const response = await api.post("/subsetores", form);

      setSubsetores(prev => [...prev, response.data]);
    }

    setModalOpen(false);
    setEditando(null);
    setForm({ nome: "", setor_id: "" });

  } catch (err) {
    console.error(err);
  }
}

  async function deletar(id) {
  if (!window.confirm("Deseja deletar este subsetor?")) return;

  try {
    await api.delete(`/subsetores/${id}`);

    setSubsetores(prev =>
      prev.filter(ss => ss.id !== id)
    );

  } catch (err) {
    console.error(err);
  }
}

  const subsetoresFiltrados = useMemo(() => {
  return subsetores
    .filter((ss) => {
      if (
        isCoordenador &&
        nomeCoordenadorLogado &&
        String(ss.coordenador_nome || "").trim() !== nomeCoordenadorLogado
      ) {
        return false;
      }
      if (filtroCoord && String(ss.coordenador_id) !== String(filtroCoord)) return false;
      if (filtroSetor && String(ss.setor_id) !== String(filtroSetor)) return false;
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}, [subsetores, filtroCoord, filtroSetor, isCoordenador, nomeCoordenadorLogado]);


  return (
    <Layout>
      <h1 style={{ color: "#0047AB", marginBottom: "20px" }}>
        Gestão de Subsetores{usuarioLogado?.nome ? ` - ${usuarioLogado.nome}` : ""}
      </h1>

      {/* FILTROS */}
      <div className="app-filter-bar" style={cardFiltro}>
        <Select
          className="app-filter-select"
          classNamePrefix="app-filter-select"
          placeholder="Filtrar por Coordenador"
          isClearable
          value={
            coordenadores
              .map((c) => ({ value: String(c.id), label: c.nome }))
              .find((option) => option.value === String(filtroCoord)) || null
          }
          onChange={(selected) => {
            setFiltroCoord(selected?.value || "");
            setFiltroSetor("");
          }}
          options={coordenadores.map((c) => ({
            value: String(c.id),
            label: c.nome
          }))}
          isDisabled={isCoordenador}
          menuPortalTarget={portalTarget}
          menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 })
          }}
        />

        <Select
          className="app-filter-select"
          classNamePrefix="app-filter-select"
          placeholder="Filtrar por Setor"
          isClearable
          value={
            setores
              .filter((s) => !filtroCoord || String(s.coordenador_id) === String(filtroCoord))
              .map((s) => ({ value: String(s.id), label: s.nome }))
              .find((option) => option.value === String(filtroSetor)) || null
          }
          onChange={(selected) => setFiltroSetor(selected?.value || "")}
          options={setores
            .filter((s) => !filtroCoord || String(s.coordenador_id) === String(filtroCoord))
            .map((s) => ({
              value: String(s.id),
              label: s.nome
            }))}
          menuPortalTarget={portalTarget}
          menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 })
          }}
          isDisabled={isSupervisor && !!setorSupervisorLogado}
        />

        <button
          style={btnExcluir}
          onClick={() => {
            setFiltroCoord("");
            setFiltroSetor("");
          }}
        >
          Limpar Filtros
        </button>

        {isAdmin && (
          <button style={btnNovo} onClick={abrirNovo}>
            + Novo Subsetor
          </button>
        )}
      </div>

      {/* TABELA */}
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
                <th style={{ ...th, width: "200px" }}>Subsetor</th>
                <th style={{ ...th, width: "200px" }}>Setor</th>
                <th style={{ ...th, width: "200px" }}>Coordenador</th>
                {isAdmin && (
                  <th style={{ ...th, width: "120px" }}>Ações</th>
                )}
              </tr>
            </thead>

            <tbody>
  {subsetoresFiltrados.map((ss) => (
    <tr
      key={ss.id}
      onDoubleClick={() =>
        setLinhaSelecionada(
          linhaSelecionada === ss.id ? null : ss.id
        )
      }
      style={{
        backgroundColor:
          linhaSelecionada === ss.id ? "#e0f2fe" : "white",
        cursor: "pointer"
      }}
    >
                  <td style={td}>{ss.nome}</td>
                  <td style={td}>{ss.setor_nome}</td>
                  <td style={td}>{ss.coordenador_nome}</td>

                  {isAdmin && (
                    <><td style={acoesTd}>
                      <button
                        style={btnEditar}
                        onClick={() => abrirEditar(ss)}
                      >
                        Editar
                      </button>

                      <button
                        style={btnExcluir}
                        onClick={() => deletar(ss.id)}
                      >
                        Deletar
                      </button>
                    </td></>
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
            {editando ? "Editar Subsetor" : "Novo Subsetor"}
          </h2>

          <input
            placeholder="Nome do subsetor"
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value })
            }
            style={input}
          />

          <select
            value={form.setor_id}
            onChange={(e) =>
              setForm({ ...form, setor_id: e.target.value })
            }
            style={{ ...input, marginTop: "10px" }}
          >
            <option value="">Selecione o setor</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <button style={btnSalvar} onClick={salvar}>
            Salvar
          </button>
        </Modal>
      )}
    </Layout>
  );
}

/* ================= ESTILOS ================= */
const cardFiltro = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "16px",
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  marginBottom: "20px"
};

const cardTabela = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  padding: "12px",
  overflow: "hidden",
};
const scrollContainer = {
  maxHeight: "750px",
  overflowY: "auto",
  overflowX: "auto", // ðŸ”¥ ESSENCIAL PARA CELULAR
};

const tabela = {
  minWidth: "1300px",
  width: "100%",
  maxWidth: "100%", // ðŸ”¥ evita quebrar no mobile
  borderCollapse: "collapse"
};

const th = {
  padding: "14px",
  borderBottom: "2px solid #e5e7eb",
  borderRight: "1px solid #e5e7eb",
  fontWeight: "800",
  textAlign: "left",
  fontSize: "18px"
};

const td = {
  padding: "16px",
  borderBottom: "1px solid #f1f1f1",
  borderRight: "1px solid #f1f1f1",
  whiteSpace: "normal",
  wordBreak: "break-word",
  fontSize: "14px"
};

const acoesTd = {
  ...td,
  display: "flex",
  justifyContent: "center",
  gap: "10px"
};


const btnNovo = {
  padding: "10px 18px",
  background: "#0047AB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer"
};

const btnEditar = {
  background: "#1E8E3E",
  color: "white",
  border: "none",
  marginTop: "3px",
  padding: "8px 14px",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const btnExcluir = {
  background: "#C62828",
  color: "white",
  border: "none",
  marginTop: "3px",
  padding: "8px 14px",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const btnSalvar = {
  marginTop: "15px",
  padding: "10px",
  background: "#0047AB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  width: "100%",
  fontSize: "18px",
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

