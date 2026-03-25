import { useMemo } from "react";
import { useEffect, useState, useContext } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

export default function Setores() {
  const [setores, setSetores] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  
  const [filtroCoord, setFiltroCoord] = useState("");
  const [filtroSupervisor, setFiltroSupervisor] = useState(""); // ðŸ”¥ NOVO

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const [form, setForm] = useState({
    nome: "",
    coordenador_id: "",
    supervisor_ids: []
  });

  const { token } = useContext(AuthContext);
  const usuarioLogado = useMemo(() => {
    return token ? JSON.parse(atob(token.split(".")[1])) : null;
  }, [token]);

  const tipoUsuario = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isAdmin = tipoUsuario === "ADMIN" || tipoUsuario === "DEVELOPER";
  const isCoordenador = tipoUsuario === "COORDENADOR";
  const isSupervisor = tipoUsuario === "SUPERVISOR";
  const isPadrao = tipoUsuario === "PADRAO";
  const loginUsuarioLogado = String(usuarioLogado?.usuario || "").trim();
  const nomeUsuarioLogadoExibicao = String(
    usuarioLogado?.nome || usuarioLogado?.name || ""
  ).trim();
  const [nomeUsuarioPerfilExibicao, setNomeUsuarioPerfilExibicao] = useState(
    nomeUsuarioLogadoExibicao
  );
  const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
  const [nomeCoordenadorLogado, setNomeCoordenadorLogado] = useState("");
  const chavePersistencia = useMemo(
    () => `setores:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`,
    [usuarioLogado?.tipo, idUsuarioLogado]
  );

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chavePersistencia);
      if (!bruto) return;
      const salvo = JSON.parse(bruto);
      setFiltroCoord(String(salvo?.filtroCoord || ""));
      setFiltroSupervisor(String(salvo?.filtroSupervisor || ""));
      if (salvo?.linhaSelecionada != null) {
        setLinhaSelecionada(salvo.linhaSelecionada);
      }
    } catch {
    }
  }, [chavePersistencia]);

  useEffect(() => {
    const estado = { filtroCoord, filtroSupervisor, linhaSelecionada };
    try {
      localStorage.setItem(chavePersistencia, JSON.stringify(estado));
    } catch {
    }
  }, [chavePersistencia, filtroCoord, filtroSupervisor, linhaSelecionada]);

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
      setFiltroSupervisor("");
    }
  }, [isCoordenador, nomeCoordenadorLogado, coordenadores, filtroCoord]);

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function obterSupervisorIdsDoSetor(setor) {
    if (Array.isArray(setor?.supervisor_ids)) {
      return setor.supervisor_ids
        .map((id) => String(id || "").trim())
        .filter(Boolean);
    }

    if (setor?.supervisor_id != null && String(setor.supervisor_id).trim()) {
      return [String(setor.supervisor_id).trim()];
    }

    return [];
  }

  function obterSupervisorNomesDoSetor(setor) {
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

  async function criarSupervisorPorNome(nome) {
    const nomeLimpo = String(nome || "").trim();
    if (!nomeLimpo) return null;

    const supervisorExistente = supervisores.find(
      (supervisor) => normalizarNome(supervisor?.nome) === normalizarNome(nomeLimpo)
    );

    if (supervisorExistente) {
      return supervisorExistente;
    }

    try {
      const response = await api.post("/supervisores", { nome: nomeLimpo });
      const novoSupervisor = response?.data;

      if (novoSupervisor?.id) {
        setSupervisores((prev) => [...prev, novoSupervisor]);
      }

      return novoSupervisor;
    } catch (err) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }

    const baseUsuario = normalizarNome(nomeLimpo)
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24) || "supervisor";
    const sufixo = Date.now().toString().slice(-6);
    const usuarioTemporario = `${baseUsuario}.${sufixo}`.slice(0, 30);
    const senhaTemporaria = `Sup@${sufixo}`;

    await api.post("/usuarios", {
      nome: nomeLimpo,
      usuario: usuarioTemporario,
      senha: senhaTemporaria,
      tipo: "SUPERVISOR"
    });

    const supervisoresAtualizados = await api.get("/supervisores");
    const listaAtualizada = Array.isArray(supervisoresAtualizados?.data)
      ? supervisoresAtualizados.data
      : [];
    setSupervisores(listaAtualizada);

    return (
      listaAtualizada.find(
        (supervisor) => normalizarNome(supervisor?.nome) === normalizarNome(nomeLimpo)
      ) || null
    );
  }

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
    if (!isSupervisor) return;
    if (!nomeUsuarioPerfilExibicao) return;

    const supervisorLogado = (supervisores || []).find(
      (s) => normalizarNome(s?.nome) === normalizarNome(nomeUsuarioPerfilExibicao)
    );

    const novoValor = supervisorLogado?.id ? String(supervisorLogado.id) : "";
    if (String(filtroSupervisor || "") !== novoValor) {
      setFiltroSupervisor(novoValor);
    }
  }, [isSupervisor, nomeUsuarioPerfilExibicao, supervisores, filtroSupervisor]);

  useEffect(() => {
    // Use setTimeout para evitar renderizaÃ§Ã£o em cascata
    setTimeout(() => carregar(), 0);
  }, []);

  async function carregar() {
    try {
      const [setoresResp, coordenadoresResp, supervisoresResp] = await Promise.allSettled([
        api.get("/setores"),
        api.get("/coordenadores"),
        api.get("/supervisores")
      ]);

      if (setoresResp.status === "fulfilled") {
        setSetores(setoresResp.value.data || []);
      } else {
        console.error("Erro ao carregar setores:", setoresResp.reason);
        setSetores([]);
      }

      if (coordenadoresResp.status === "fulfilled") {
        setCoordenadores(coordenadoresResp.value.data || []);
      } else {
        console.error("Erro ao carregar coordenadores:", coordenadoresResp.reason);
        setCoordenadores([]);
      }

      if (supervisoresResp.status === "fulfilled") {
        setSupervisores(supervisoresResp.value.data || []);
      } else {
        console.error("Erro ao carregar supervisores:", supervisoresResp.reason);
        setSupervisores([]);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar dados de setores:", err);
      setSetores([]);
      setCoordenadores([]);
      setSupervisores([]);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", coordenador_id: "", supervisor_ids: [] });
    setModalOpen(true);
  }

  function abrirEditar(setor) {
    setEditando(setor);
    setForm({
      nome: setor.nome,
      coordenador_id: setor.coordenador_id,
      supervisor_ids: obterSupervisorIdsDoSetor(setor)
    });
    setModalOpen(true);
  }

  async function salvar() {
    try {
      if (!form.nome || !form.coordenador_id) {
        alert("Preencha todos os campos obrigatórios");
        return;
      }

      const payload = {
        ...form,
        supervisor_ids: (form.supervisor_ids || []).slice(0, 3),
        supervisor_id: (form.supervisor_ids || [])[0] || null
      };

      if (editando) {
        const response = await api.put(`/setores/${editando.id}`, payload);

        setSetores(prev =>
          prev.map(s =>
            s.id === editando.id ? response.data : s
          )
        );

      } else {
        const response = await api.post("/setores", payload);
        setSetores(prev => [...prev, response.data]);
      }

      setModalOpen(false);
      setEditando(null);
      setForm({ nome: "", coordenador_id: "", supervisor_ids: [] });

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    }
  }

  async function deletar(id) {
    if (!window.confirm("Deseja deletar este setor?")) return;

    try {
      await api.delete(`/setores/${id}`);
      setSetores(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const setoresFiltrados = setores
    .filter((s) => {
      if (
        isCoordenador &&
        nomeCoordenadorLogado &&
        String(s.coordenador_nome || "").trim() !== nomeCoordenadorLogado
      ) {
        return false;
      }
      if (isSupervisor) {
        if (!filtroSupervisor) return false;
        if (!obterSupervisorIdsDoSetor(s).includes(String(filtroSupervisor))) return false;
      }
      if (filtroCoord && String(s.coordenador_id) !== String(filtroCoord)) return false;
      if (filtroSupervisor && !obterSupervisorIdsDoSetor(s).includes(String(filtroSupervisor))) return false;
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <Layout>
      <h1 style={{ color: "#0047AB", marginBottom: "20px" }}>
        Gestão de Setores{usuarioLogado?.nome ? ` - ${usuarioLogado.nome}` : ""}
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
          onChange={(selected) => setFiltroCoord(selected?.value || "")}
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
          placeholder="Filtrar por Supervisor"
          isClearable
          value={
            supervisores
              .map((s) => ({ value: String(s.id), label: s.nome }))
              .find((option) => option.value === String(filtroSupervisor)) || null
          }
          onChange={(selected) => setFiltroSupervisor(selected?.value || "")}
          options={supervisores.map((s) => ({
            value: String(s.id),
            label: s.nome
          }))}
          isDisabled={isSupervisor}
          menuPortalTarget={portalTarget}
          menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 })
          }}
        />

        <button
          style={btnExcluir}
          onClick={() => {
            setFiltroCoord("");
            setFiltroSupervisor("");
          }}
        >
          Limpar Filtros
        </button>

        {isAdmin && (
          <button style={btnNovo} onClick={abrirNovo}>
            + Novo Setor
          </button>
        )}
      </div>

      {/* TABELA */}
      <div style={cardTabela}>
        <div style={scrollContainer}>
          <table style={tabela}>
            <thead style={thead}>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Coordenador</th>
                <th style={th}>Líderes</th>
                {isAdmin && (
                  <th style={{ ...th, textAlign: "center" }}>Ações</th>
                )}
              </tr>
            </thead>

           <tbody>
  {setoresFiltrados.length === 0 ? (
    <tr>
      <td style={{ ...td, textAlign: "center", color: "#888" }} colSpan={isAdmin ? 4 : 3}>
        Sem dados para exibir
      </td>
    </tr>
  ) : setoresFiltrados.map((setor) => (
    <tr
      key={setor.id}
      onDoubleClick={() =>
        setLinhaSelecionada(
          linhaSelecionada === setor.id ? null : setor.id
        )
      }
      style={{
        backgroundColor:
          linhaSelecionada === setor.id ? "#e0f2fe" : "white",
        cursor: "pointer"
      }}
    >
                  <td style={td}>{setor.nome}</td>
                  <td style={td}>{setor.coordenador_nome}</td>
                  <td style={td}>
                    {obterSupervisorNomesDoSetor(setor).join(", ") || "-"}
                  </td>

                  {isAdmin && (
                    <td style={acoesTd}>
                      <button
                        style={btnEditar}
                        onClick={() => abrirEditar(setor)}
                      >
                        Editar
                      </button>

                      <button
                        style={btnExcluir}
                        onClick={() => deletar(setor.id)}
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

      {/* MODAL */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} size="sm">
          <h2 style={{ marginBottom: "15px" }}>
            {editando ? "Editar Setor" : "Novo Setor"}
          </h2>

          <input
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value })
            }
            style={input}
          />

          <select
            value={form.coordenador_id}
            onChange={(e) =>
              setForm({ ...form, coordenador_id: e.target.value })
            }
            style={{ ...input, marginTop: "10px" }}
          >
            <option value="">Selecione o coordenador</option>
            {coordenadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <CreatableSelect
            classNamePrefix="app-filter-select"
            isMulti
            isClearable
            closeMenuOnSelect={false}
            placeholder="Selecione até 3 supervisores"
            value={supervisores
              .map((s) => ({ value: String(s.id), label: s.nome }))
              .filter((option) => (form.supervisor_ids || []).includes(option.value))}
            onChange={(selected) =>
              setForm({
                ...form,
                supervisor_ids: (selected || []).map((option) => option.value).slice(0, 3)
              })
            }
            onCreateOption={async (inputValue) => {
              try {
                if ((form.supervisor_ids || []).length >= 3) {
                  alert("Você pode selecionar no máximo 3 supervisores.");
                  return;
                }

                const novoSupervisor = await criarSupervisorPorNome(inputValue);
                if (!novoSupervisor?.id) return;

                const novoId = String(novoSupervisor.id);
                setForm((prev) => ({
                  ...prev,
                  supervisor_ids: [...new Set([...(prev.supervisor_ids || []), novoId])].slice(0, 3)
                }));
              } catch (err) {
                console.error(err);
                alert("Erro ao cadastrar supervisor.");
              }
            }}
            options={supervisores.map((s) => ({
              value: String(s.id),
              label: s.nome
            }))}
            isOptionDisabled={(_, selected) => (selected?.length || 0) >= 3}
            menuPortalTarget={portalTarget}
            menuPosition="fixed"
            noOptionsMessage={() => "Sem supervisores"}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              control: (base) => ({
                ...base,
                minHeight: 46,
                marginTop: 10,
                borderRadius: 8,
                borderColor: "#ddd",
                boxShadow: "none"
              })
            }}
          />

          <button style={btnSalvar} onClick={salvar}>
            Salvar
          </button>
        </Modal>
      )}
    </Layout>
  );
}

/* ===== ESTILOS ===== */

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
  padding: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
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

const thead = {
  position: "sticky",
  top: 0,
  background: "white",
  zIndex: 1
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

const acoesTd = {
  ...td,
  display: "flex",
  justifyContent: "center",
  gap: "10px"
};

const btnNovo = {
  padding: "10px 20px",
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
  padding: "8px 14px",
  borderRadius: "6px",
  fontSize: "18px",
  cursor: "pointer"
};

const btnExcluir = {
  background: "#C62828",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  fontSize: "18px",
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
  border: "1px solid #dddddd",
  fontSize: "18px"
};

