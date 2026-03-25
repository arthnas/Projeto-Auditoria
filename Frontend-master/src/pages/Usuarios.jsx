import { useMemo } from "react";
import { useEffect, useState, useContext } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import CreatableSelect from "react-select/creatable";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  

  const opcoesNomes = useMemo(() => {

  const lista = [
    ...funcionarios,
    ...coordenadores,
    ...supervisores
  ];

  const nomesUnicos = [...new Set(lista.map(p => p.nome))];

  return nomesUnicos;

}, [funcionarios, coordenadores, supervisores]);


  const opcoesNomesSelect = opcoesNomes.map(nome => ({
    value: nome,
    label: nome
  }));
  
  const [form, setForm] = useState({
    nome: "",
    usuario: "",
    senha: "",
    tipo: "PADRAO"
  });

  const { token } = useContext(AuthContext);
  const usuarioLogado = useMemo(() => {
    return token ? JSON.parse(atob(token.split(".")[1])) : null;
  }, [token]);
  
  const tipoUsuarioLogado = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isDeveloper = tipoUsuarioLogado === "DEVELOPER";
  const isAdmin = tipoUsuarioLogado === "ADMIN";
  const podeGerenciarUsuarios = isAdmin || isDeveloper;
  const isEstrafiLogado =
    String(usuarioLogado?.usuario || "").trim().toLowerCase() === "estrafi";
  const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
  const chavePersistencia = `usuarios:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`;

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

  const usuariosOrdenados = useMemo(() => {
    return [...usuarios].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [usuarios]);

  async function carregarUsuarios() {
    try {

      const [usuariosRes, funcRes, coordRes, supRes] = await Promise.all([
        api.get("/usuarios"),
        api.get("/funcionarios"),
        api.get("/coordenadores"),
        api.get("/supervisores")
      ]);

      setUsuarios(usuariosRes.data);
      setFuncionarios(funcRes.data);
      setCoordenadores(coordRes.data);
      setSupervisores(supRes.data);

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  async function garantirCadastroSupervisor(nome) {
    const nomeNormalizado = normalizarNome(nome);
    if (!nomeNormalizado) return;

    const supervisorExistente = supervisores.some(
      (supervisor) => normalizarNome(supervisor?.nome) === nomeNormalizado
    );

    if (supervisorExistente) return;

    const response = await api.post("/supervisores", { nome: String(nome).trim() });
    setSupervisores((prev) => [...prev, response.data]);
  }

  async function garantirCadastroCoordenador(nome) {
    const nomeNormalizado = normalizarNome(nome);
    if (!nomeNormalizado) return;

    const coordenadorExistente = coordenadores.some(
      (coordenador) => normalizarNome(coordenador?.nome) === nomeNormalizado
    );

    if (coordenadorExistente) return;

    const response = await api.post("/coordenadores", { nome: String(nome).trim() });
    setCoordenadores((prev) => [...prev, response.data]);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", usuario: "", senha: "", tipo: "PADRAO" });
    setModalOpen(true);
  }

  function abrirEditar(user) {
    const tipoAlvo = String(user?.tipo || "").trim().toUpperCase();
    if (tipoAlvo === "DEVELOPER" && !isDeveloper) {
      alert("Apenas DEVELOPER pode editar usuarios DEVELOPER.");
      return;
    }
    setEditando(user);
    setForm({ ...user, senha: "" });
    setModalOpen(true);
  }

async function salvar() {
  try {

    if (!form.nome.trim()) {
      alert("Preencha o nome");
      return;
    }

    const funcionarioExiste = funcionarios.some(
      (f) => normalizarNome(f?.nome) === normalizarNome(form.nome)
    );

    if (!funcionarioExiste) {
      await api.post("/funcionarios", {
        nome: form.nome
      });
    }

    const tipoDestino = String(form.tipo || "").trim().toUpperCase();
    const editandoEhProprioUsuario =
      editando &&
      String(editando?.id || "").trim() === String(usuarioLogado?.id || "").trim();
    const podePromoverParaDeveloper = isDeveloper || (isEstrafiLogado && editandoEhProprioUsuario);

    if (tipoDestino === "DEVELOPER" && !podePromoverParaDeveloper) {
      alert("Apenas DEVELOPER pode criar ou editar usuarios DEVELOPER.");
      return;
    }

    if (editando) {
      const tipoEditando = String(editando?.tipo || "").trim().toUpperCase();
      if (tipoEditando === "DEVELOPER" && !isDeveloper) {
        alert("Apenas DEVELOPER pode editar usuarios DEVELOPER.");
        return;
      }
    }

    if (editando) {
      const response = await api.put(
        `/usuarios/${editando.id}`,
        {
          nome: form.nome,
          tipo: form.tipo
        }
      );

      setUsuarios(prev =>
        prev.map(u =>
          u.id === editando.id ? response.data : u
        )
      );

      if (tipoDestino === "SUPERVISOR") {
        await garantirCadastroSupervisor(form.nome);
      } else if (tipoDestino === "COORDENADOR") {
        await garantirCadastroCoordenador(form.nome);
      }

    } else {

      const response = await api.post("/usuarios", form);

      setUsuarios(prev => [...prev, response.data]);

      if (tipoDestino === "SUPERVISOR") {
        await garantirCadastroSupervisor(form.nome);
      } else if (tipoDestino === "COORDENADOR") {
        await garantirCadastroCoordenador(form.nome);
      }

    }

    await carregarUsuarios();

    setModalOpen(false);
    setEditando(null);
    setForm({ nome: "", usuario: "", senha: "", tipo: "PADRAO" });

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar usuário");
  }
}

  async function deletar(id) {
  const usuarioAlvo = usuarios.find((u) => String(u.id) === String(id));
  const tipoAlvo = String(usuarioAlvo?.tipo || "").trim().toUpperCase();
  if (tipoAlvo === "DEVELOPER" && !isDeveloper) {
    alert("Apenas DEVELOPER pode excluir usuarios DEVELOPER.");
    return;
  }

  if (!window.confirm("Deseja deletar este usuário?")) return;

  try {
    await api.delete(`/usuarios/${id}`);

    setUsuarios(prev =>
      prev.filter(u => u.id !== id)
    );

  } catch (err) {
    console.error(err);
  }
}

  return (
    <Layout>
      <h1 style={{ color: "#0047AB", marginBottom: "20px" }}>
        Gestão de Usuários{usuarioLogado?.nome ? ` - ${usuarioLogado.nome}` : ""}
      </h1>

      {podeGerenciarUsuarios && (
        <div style={acoesTopo}>
          <button style={btnNovo} onClick={abrirNovo}>
            + Novo Usuário
          </button>
        </div>
      )}

      <div style={cardTabela}>
        <div className="table-responsive" style={scrollContainer}>
          <table style={tabela}>
            <thead style={thead}>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Usuário</th>
                <th style={th}>Tipo</th>
                {podeGerenciarUsuarios && (
                  <th style={{ ...th, textAlign: "center" }}>Ações</th>
                )}
              </tr>
            </thead>

            <tbody>
                {usuariosOrdenados.map((user) => (
  <tr
    key={user.id}
    onDoubleClick={() =>
      setLinhaSelecionada(
        linhaSelecionada === user.id ? null : user.id
      )
    }
    style={{
      backgroundColor:
        linhaSelecionada === user.id
          ? "#e0f2fe"
          : "white",
      cursor: "pointer"
    }}
  >
                  <td style={td}>{user.nome}</td>
                  <td style={td}>{user.usuario}</td>

                  <td style={td}>
                    <span
                      className={`user-type-badge user-type-${String(user.tipo || "").trim().toLowerCase()}`}
                      style={
                        String(user.tipo || "").trim().toUpperCase() === "DEVELOPER"
                          ? badgeDeveloper
                          : String(user.tipo || "").trim().toUpperCase() === "ADMIN"
                          ? badgeAdmin
                          : badgePadrao
                      }
                    >
                      {user.tipo}
                    </span>
                  </td>

                  {podeGerenciarUsuarios && (
                    <td style={acoesTd}>
                      <button
                        style={btnEditar}
                        onClick={() => abrirEditar(user)}
                      >
                        Editar
                      </button>

                      <button
                        style={btnExcluir}
                        onClick={() => deletar(user.id)}
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
          <div style={{ marginBottom: "18px" }}>
  <CreatableSelect
    className="user-modal-select"
    classNamePrefix="user-modal-select"
    placeholder="Selecione ou digite o nome"
    value={
      form.nome
        ? { value: form.nome, label: form.nome }
        : null
    }
    options={opcoesNomesSelect}
    onChange={(option) =>
      setForm({
        ...form,
        nome: option?.value || ""
      })
    }
    onCreateOption={(inputValue) => {
      setForm({
        ...form,
        nome: inputValue
      });
    }}
  />
</div>

          {!editando && (
            <>
              <input
                style={input}
                placeholder="Usuário"
                value={form.usuario}
                onChange={(e) =>
                  setForm({ ...form, usuario: e.target.value })
                }
              />

              <input
                style={input}
                placeholder="Senha"
                type="password"
                value={form.senha}
                onChange={(e) =>
                  setForm({ ...form, senha: e.target.value })
                }
              />
            </>
          )}

          <select
            style={input}
            value={form.tipo}
            onChange={(e) =>
              setForm({ ...form, tipo: e.target.value })
            }
          >
            <option value="ADMIN">ADMIN</option>
            {(isDeveloper || isEstrafiLogado) && <option value="DEVELOPER">DEVELOPER</option>}
            <option value="PADRAO">PADRÃO</option>
            <option value="COORDENADOR">COORDENADOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
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

const cardTabela = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  padding: "12px",
  overflow: "hidden"
};

const scrollContainer = {
  maxHeight: "650px",
  overflowY: "auto",
  overflowX: "auto", // ðŸ”¥ ESSENCIAL PARA CELULAR
};

const tabela = {
  minWidth: "1180px",
  width: "100%",
  maxWidth: "100%", // ðŸ”¥ evita quebrar no mobile
  borderCollapse: "collapse"
};

const thead = {
  position: "sticky",
  top: 0,
  background: "rgb(255, 255, 250)",
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
  gap: "10px",
  justifyContent: "center"
};

const acoesTopo = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "16px"
};

const btnNovo = {
  padding: "10px 30px",
  background: "#0047AB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
  width: "160px"
};

const btnEditar = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const btnExcluir = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
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
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "18px"
};

const badgeAdmin = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "18px",
  fontWeight: "600"
};

const badgeDeveloper = {
  background: "#ede9fe",
  color: "#7321f7",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "18px",
  fontWeight: "600"
};

const badgePadrao = {
  background: "#e0f2fe",
  color: "#075985",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "18px",
  fontWeight: "600"
};

