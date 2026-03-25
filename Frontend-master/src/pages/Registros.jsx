
import { useContext, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import autoTable from "jspdf-autotable";
import { DateRangePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import Select from "react-select";
import logoEmpresas from "../assets/logo-empresas.png";

export default function Registros() {
    const [registros, setRegistros] = useState([]);
    const [coordenadores, setCoordenadores] = useState([]);
    const [setores, setSetores] = useState([]);
    const [subsetores, setSubsetores] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [periodo, setPeriodo] = useState([null, null]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  
  
  const [filtroCoord, setFiltroCoord] = useState([]);
  const [filtroSetor, setFiltroSetor] = useState([]);
  const [filtroSubsetor, setFiltroSubsetor] = useState([]);
  const [filtroSupervisor, setFiltroSupervisor] = useState([]);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");              
  const [filtroFuncionario, setFiltroFuncionario] = useState([]);
  const [filtroPeriodicidade, setFiltroPeriodicidade] = useState([]);
  const [filtroAtividade, setFiltroAtividade] = useState([]);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [inputCoord, setInputCoord] = useState("");
  const [inputSetor, setInputSetor] = useState("");
  const [inputSubsetor, setInputSubsetor] = useState("");
  const [inputSupervisor, setInputSupervisor] = useState("");
  const [inputAtividade, setInputAtividade] = useState("");
  const [inputPeriodicidade, setInputPeriodicidade] = useState("");
  const [inputFuncionario, setInputFuncionario] = useState("");
  const atalhosPeriodo = useMemo(() => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
    const inicioOntem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    const fimOntem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 23, 59, 59, 999);
    const inicioUltimos7 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999);

    return [
      { label: "Hoje", value: [inicioHoje, fimHoje] },
      { label: "Ontem", value: [inicioOntem, fimOntem] },
      { label: "Últimos 7 dias", value: [inicioUltimos7, fimHoje] },
      { label: "Mês atual", value: [inicioMesAtual, fimMesAtual] },
      { label: "Mês anterior", value: [inicioMesAnterior, fimMesAnterior] }
    ];
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [registroDocumento, setRegistroDocumento] = useState(null);
  const [caminhoInput, setCaminhoInput] = useState("");
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const { token } = useContext(AuthContext);
  const usuarioLogado = token ? JSON.parse(atob(token.split(".")[1])) : null;
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
    () => `registros:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`,
    [usuarioLogado?.tipo, idUsuarioLogado]
  );

  function normalizarSelecaoPersistida(lista) {
    if (!Array.isArray(lista)) return [];
    return lista
      .map((item) => {
        const value = String(item?.value || "").trim();
        const label = String(item?.label || item?.value || "").trim();
        if (!value) return null;
        return { value, label: label || value };
      })
      .filter(Boolean);
  }

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function formatarDataLocalISO(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  const nomeUsuarioLogado = normalizarNome(nomeUsuarioPerfilExibicao);

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
    try {
      const bruto = localStorage.getItem(chavePersistencia);
      if (!bruto) {
        setEstadoRestaurado(true);
        return;
      }
      const salvo = JSON.parse(bruto);
      setFiltroCoord(normalizarSelecaoPersistida(salvo?.filtroCoord));
      setFiltroSetor(normalizarSelecaoPersistida(salvo?.filtroSetor));
      setFiltroSubsetor(normalizarSelecaoPersistida(salvo?.filtroSubsetor));
      setFiltroSupervisor(normalizarSelecaoPersistida(salvo?.filtroSupervisor));
      setFiltroFuncionario(normalizarSelecaoPersistida(salvo?.filtroFuncionario));
      setFiltroPeriodicidade(normalizarSelecaoPersistida(salvo?.filtroPeriodicidade));
      setFiltroAtividade(normalizarSelecaoPersistida(salvo?.filtroAtividade));
      setFiltroDataInicio(String(salvo?.filtroDataInicio || ""));
      setFiltroDataFim(String(salvo?.filtroDataFim || ""));
      if (salvo?.filtroDataInicio && salvo?.filtroDataFim) {
        setPeriodo([new Date(salvo.filtroDataInicio), new Date(salvo.filtroDataFim)]);
      }
      if (salvo?.linhaSelecionada != null) {
        setLinhaSelecionada(salvo.linhaSelecionada);
      }
    } catch {
    } finally {
      setEstadoRestaurado(true);
    }
  }, [chavePersistencia]);

  useEffect(() => {
    if (!estadoRestaurado) return;
    const estado = {
      filtroCoord,
      filtroSetor,
      filtroSubsetor,
      filtroSupervisor,
      filtroFuncionario,
      filtroPeriodicidade,
      filtroAtividade,
      filtroDataInicio,
      filtroDataFim,
      linhaSelecionada
    };
    try {
      localStorage.setItem(chavePersistencia, JSON.stringify(estado));
    } catch {
    }
  }, [
    estadoRestaurado,
    chavePersistencia,
    filtroCoord,
    filtroSetor,
    filtroSubsetor,
    filtroSupervisor,
    filtroFuncionario,
    filtroPeriodicidade,
    filtroAtividade,
    filtroDataInicio,
    filtroDataFim,
    linhaSelecionada
  ]);

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

    if (
      filtroCoord.length !== 1 ||
      String(filtroCoord[0]?.value || "").trim() !== nomeCoordenadorLogado
    ) {
      setTimeout(
        () =>
          setFiltroCoord([
            {
              value: nomeCoordenadorLogado,
              label: nomeCoordenadorLogado
            }
          ]),
        0
      );
    }
  }, [isCoordenador, nomeCoordenadorLogado, filtroCoord]);

  useEffect(() => {
    if (!isPadrao) return;
    if (!nomeUsuarioPerfilExibicao) return;

    if (
      filtroFuncionario.length !== 1 ||
      normalizarNome(filtroFuncionario[0]?.value || "") !== nomeUsuarioLogado
    ) {
      setTimeout(
        () =>
          setFiltroFuncionario([
            {
              value: nomeUsuarioPerfilExibicao,
              label: nomeUsuarioPerfilExibicao
            }
          ]),
        0
      );
    }
  }, [isPadrao, nomeUsuarioPerfilExibicao, nomeUsuarioLogado, filtroFuncionario]);

  function correspondeSelecao(lista, valor) {
    if (!Array.isArray(lista) || lista.length === 0) return true;
    const valorNormalizado = normalizarNome(valor);
    return lista.some((item) => normalizarNome(item?.value) === valorNormalizado);
  }

  function dataNoIntervalo(registro) {
    const dataRegistro = String(registro?.data_registro || "").split("T")[0];
    if (!dataRegistro) return false;
    if (filtroDataInicio && dataRegistro < filtroDataInicio) return false;
    if (filtroDataFim && dataRegistro > filtroDataFim) return false;
    return true;
  }

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
        String(setor?.nome || "").trim()
    );

    return String(setorVinculado?.nome || "").trim();
  }, [isSupervisor, setores, nomeUsuarioLogado]);

  const registrosBaseParaOpcoes = useMemo(() => {
    return (registros || []).filter((registro) => {
      if (!dataNoIntervalo(registro)) return false;
      if (isCoordenador) {
        if (!nomeCoordenadorLogado) return false;
        if (registro.coordenador_nome !== nomeCoordenadorLogado) return false;
      }
      if (isSupervisor) {
        if (!setorSupervisorLogado) return false;
        if (normalizarNome(registro?.setor_nome) !== normalizarNome(setorSupervisorLogado)) return false;
      }
      if (isPadrao) {
        if (normalizarNome(registro?.funcionario_nome) !== nomeUsuarioLogado) return false;
      }
      return true;
    });
  }, [
    registros,
    isCoordenador,
    nomeCoordenadorLogado,
    isSupervisor,
    isPadrao,
    nomeUsuarioLogado,
    setorSupervisorLogado,
    filtroDataInicio,
    filtroDataFim
  ]);

  // Função para normalizar texto para busca (remove acentos, caixa baixa)
  function normalizarBusca(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // searchTerm: termo digitado pelo usuário (string)
  function criarOpcoesUnicas(dados, chave, searchTerm = "") {
    const vistos = new Set();
    let opcoes = (dados || [])
      .map((item) => String(item?.[chave] || "").trim())
      .filter((valor) => {
        if (!valor) return false;
        if (vistos.has(valor)) return false;
        vistos.add(valor);
        return true;
      })
      .map((valor) => ({ value: valor, label: valor }));

    if (searchTerm && typeof searchTerm === "string" && searchTerm.length > 0) {
      const busca = normalizarBusca(searchTerm);
      opcoes = opcoes.sort((a, b) => {
        const aNorm = normalizarBusca(a.label);
        const bNorm = normalizarBusca(b.label);
        const aStarts = aNorm.startsWith(busca);
        const bStarts = bNorm.startsWith(busca);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        const aInclui = aNorm.includes(busca);
        const bInclui = bNorm.includes(busca);
        if (aInclui && !bInclui) return -1;
        if (!aInclui && bInclui) return 1;
        return aNorm.localeCompare(bNorm, "pt-BR", { sensitivity: "base" });
      });
    } else {
      opcoes = opcoes.sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
    }
    return opcoes;
  }

  function filtrarParaOpcoes(campoIgnorado) {
    return registrosBaseParaOpcoes.filter((registro) => {
      if (campoIgnorado !== "coord" && !correspondeSelecao(filtroCoord, registro.coordenador_nome)) return false;
      if (campoIgnorado !== "setor" && !correspondeSelecao(filtroSetor, registro.setor_nome)) return false;
      if (campoIgnorado !== "subsetor" && !correspondeSelecao(filtroSubsetor, registro.subsetor_nome)) return false;
      if (campoIgnorado !== "supervisor" && !correspondeSelecao(filtroSupervisor, registro.supervisor_nome)) return false;
      if (campoIgnorado !== "funcionario" && !correspondeSelecao(filtroFuncionario, registro.funcionario_nome)) return false;
      if (campoIgnorado !== "periodicidade" && !correspondeSelecao(filtroPeriodicidade, registro.periodicidade)) return false;
      if (campoIgnorado !== "atividade" && !correspondeSelecao(filtroAtividade, registro.tarefa_nome)) return false;
      return true;
    });
  }
  // Opções de atividades (tarefa_nome) filtradas em cascata
  const opcoesAtividadeFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("atividade"), "tarefa_nome", inputAtividade),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroFuncionario, filtroPeriodicidade, inputAtividade]
  );

  const opcoesCoordFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("coord"), "coordenador_nome", inputCoord),
    [registrosBaseParaOpcoes, filtroSetor, filtroSubsetor, filtroSupervisor, filtroFuncionario, filtroPeriodicidade, inputCoord]
  );

  const opcoesSetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("setor"), "setor_nome", inputSetor),
    [registrosBaseParaOpcoes, filtroCoord, filtroSubsetor, filtroSupervisor, filtroFuncionario, filtroPeriodicidade, inputSetor]
  );

  const opcoesSubsetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("subsetor"), "subsetor_nome", inputSubsetor),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetor, filtroSupervisor, filtroFuncionario, filtroPeriodicidade, inputSubsetor]
  );

  const opcoesSupervisorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("supervisor"), "supervisor_nome", inputSupervisor),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetor, filtroSubsetor, filtroFuncionario, filtroPeriodicidade, inputSupervisor]
  );

  useEffect(() => {
    if (!isSupervisor) return;
    if (!setorSupervisorLogado) return;

    if (
      filtroSetor.length !== 1 ||
      normalizarNome(filtroSetor[0]?.value || "") !== normalizarNome(setorSupervisorLogado)
    ) {
      setTimeout(
        () =>
          setFiltroSetor([
            {
              value: setorSupervisorLogado,
              label: setorSupervisorLogado
            }
          ]),
        0
      );
    }
  }, [isSupervisor, setorSupervisorLogado, filtroSetor]);

  useEffect(() => {
    if (!isSupervisor) return;
    if ((filtroSupervisor || []).length === 0) return;
    setFiltroSupervisor([]);
  }, [isSupervisor, filtroSupervisor]);

  const opcoesFuncionarioFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("funcionario"), "funcionario_nome", inputFuncionario),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroPeriodicidade, inputFuncionario]
  );

  const opcoesPeriodicidadeFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("periodicidade"), "periodicidade", inputPeriodicidade),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroFuncionario, inputPeriodicidade]
  );

  function sincronizarSelecaoValida(atual, opcoes) {
    const validos = new Set((opcoes || []).map((item) => item.value));
    const filtrado = (atual || []).filter((item) => validos.has(item.value));
    const semMudanca =
      filtrado.length === (atual || []).length &&
      filtrado.every((item, indice) => item.value === atual[indice]?.value);
    return semMudanca ? atual : filtrado;
  }

  useEffect(() => {
    if (!estadoRestaurado) return;
    if ((registros || []).length === 0) return;

    setFiltroCoord((atual) => sincronizarSelecaoValida(atual, opcoesCoordFiltradas));
    setFiltroSetor((atual) => sincronizarSelecaoValida(atual, opcoesSetorFiltradas));
    setFiltroSubsetor((atual) => sincronizarSelecaoValida(atual, opcoesSubsetorFiltradas));
    setFiltroSupervisor((atual) => sincronizarSelecaoValida(atual, opcoesSupervisorFiltradas));
    if (!isPadrao) {
      setFiltroFuncionario((atual) => sincronizarSelecaoValida(atual, opcoesFuncionarioFiltradas));
    }
    setFiltroPeriodicidade((atual) => sincronizarSelecaoValida(atual, opcoesPeriodicidadeFiltradas));
    setFiltroAtividade((atual) => sincronizarSelecaoValida(atual, opcoesAtividadeFiltradas));
  }, [
    opcoesCoordFiltradas,
    opcoesSetorFiltradas,
    opcoesSubsetorFiltradas,
    opcoesSupervisorFiltradas,
    opcoesFuncionarioFiltradas,
    opcoesPeriodicidadeFiltradas,
    estadoRestaurado,
    isSupervisor,
    isPadrao,
    registros
  ]);

  useEffect(() => {
    async function carregar() {
      try {
        const [r, c, s, ss, f] = await Promise.all([
          api.get("/registros"),
          api.get("/coordenadores"),
          api.get("/setores"),
          api.get("/subsetores"),
          api.get("/funcionarios")
        ]);
        setRegistros(r.data || []);
        setCoordenadores(c.data || []);
        setSetores(s.data || []);
        setSubsetores(ss.data || []);
        setFuncionarios(f.data || []);
      } catch (err) {
        console.error("Erro ao carregar registros:", err);
      }
    }
    carregar();
  }, []);

  const registrosFiltrados = registros
    .filter((r) => {
      if (isCoordenador) {
        if (!nomeCoordenadorLogado) return false;
        if (r.coordenador_nome !== nomeCoordenadorLogado) return false;
      }
      if (isSupervisor) {
        if (!setorSupervisorLogado) return false;
        if (normalizarNome(r?.setor_nome) !== normalizarNome(setorSupervisorLogado)) return false;
      }
      if (isPadrao) {
        if (normalizarNome(r?.funcionario_nome) !== nomeUsuarioLogado) return false;
      }
      if (
        filtroCoord.length > 0 &&
        !filtroCoord.some(f => f.value === r.coordenador_nome)
      ) return false;
      if (
        filtroSetor.length > 0 &&
        !filtroSetor.some(f => f.value === r.setor_nome)
      ) return false;
      if (
        filtroSubsetor.length > 0 &&
        !filtroSubsetor.some(f => f.value === r.subsetor_nome)
      ) return false;
      if (
        filtroSupervisor.length > 0 &&
        !filtroSupervisor.some(f => f.value === r.supervisor_nome)
      ) return false;
      if (
        filtroFuncionario.length > 0 &&
        !filtroFuncionario.some(f => f.value === r.funcionario_nome)
      ) return false;
      if (
        filtroPeriodicidade.length > 0 &&
        !filtroPeriodicidade.some(f => f.value === r.periodicidade)
      ) return false;
      if (
        filtroAtividade.length > 0 &&
        !filtroAtividade.some(f => f.value === r.tarefa_nome)
      ) return false;
      const dataRegistro = r.data_registro.split("T")[0];
      if (filtroDataInicio && dataRegistro < filtroDataInicio) return false;
      if (filtroDataFim && dataRegistro > filtroDataFim) return false;
      return true;
    })
    .sort((a, b) => {
      const setor = (a.setor_nome || "").localeCompare(b.setor_nome || "");
      if (setor !== 0) return setor;

      const subsetor = (a.subsetor_nome || "").localeCompare(b.subsetor_nome || "");
      if (subsetor !== 0) return subsetor;

      return (a.tarefa_nome || "").localeCompare(b.tarefa_nome || "");
    });

  // (FunÃ§Ã£o registrarTarefa removida: não utilizada neste componente)
  
  async function deletarRegistro(id) {
    if (!window.confirm("Deseja deletar este registro?")) return;
    await api.delete(`/registros/${id}`);
    carregar();
  }

  async function salvarEdicao() {
    await api.put(`/registros/${registroSelecionado.id}`, registroSelecionado);
    setModalOpen(false);
    carregar();
  }

  // Handler para abrir modal de escolha
  function handleGerarRelatorio() {
    setModalEscolha(true);
  }
   // FunÃ§Ãµes de agrupamento iguais ao dashboard
  function agruparPor(campo) {
  const agrupado = {};

  registrosFiltrados.forEach(r => {
    let chave = r[campo];

    if (!chave || chave === "") {
      chave = "Sem Funcionário";
    }

    agrupado[chave] = (agrupado[chave] || 0) + 1;
  });

  return Object.keys(agrupado).map(k => ({
    nome: k,
    total: agrupado[k]
  }));
}
  function agruparPorPeriodo() {
    const agrupado = {};
    registrosFiltrados.forEach(r => {
      const data = new Date(r.data_registro).toLocaleDateString();
      agrupado[data] = (agrupado[data] || 0) + 1;
    });
    return Object.keys(agrupado).map(k => ({ data: k, total: agrupado[k] }));
  }
  const dadosSubsetor = agruparPor("subsetor_nome");
  const dadosSetor = agruparPor("setor_nome");
 const dadosFuncionario = useMemo(() => {
  const agrupado = {};
  (registrosFiltrados || []).forEach((r) => {
    const nome = r.funcionario_nome || "Sem Funcionário";
    const valor = Number(r.porcentagem) || 0;
    agrupado[nome] = (agrupado[nome] || 0) + valor;
  });
  return Object.keys(agrupado).map((nome) => ({
    nome,
    total: agrupado[nome],
  }));
}, [registrosFiltrados]);
  
  const dadosPeriodo = agruparPorPeriodo();
  const totalSubsetor = dadosSubsetor.reduce((acc, item) => acc + item.total, 0);


  // =================================== exportar pdf ============================================= //

async function carregarImagemBase64(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const base64 = canvas.toDataURL("image/png", 1.0);
      resolve(base64);
    };

    img.src = src;
  });
}
// =================================== exportar pdf ============================================= //
async function handleExportarPDF() { // 🔥 virou async
  const doc = new jsPDF("p", "mm", "a4");

  // 🔥 NOVO (carrega imagem com qualidade máxima)
  const logoBase64 = await carregarImagemBase64(logoEmpresas);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerTitleY = 12;
  const headerTitleFontSize = 18;
  const pageNumberFontSize = 10;
  const pageNumberX = pageWidth - 14;
  const pageNumberY = pageHeight - 6;

  const desenharLogoCabecalho = () => {
    try {
      const margemDireita = 10;
      const topoLogo = 8;
      const logoWidthMultipla = 18;
      const logoHeightMultipla = 16;
      const espacamento = 2;

      const larguraBlocoLogos = (logoWidthMultipla * 3) + (espacamento * 2);
      const logoX = pageWidth - margemDireita - larguraBlocoLogos;

      // 🔥 esses já estão OK
      if (window.macroLogo) doc.addImage(window.macroLogo, "PNG", logoX, topoLogo, logoWidthMultipla, logoHeightMultipla, undefined, "NONE");
      if (window.rcLogo) doc.addImage(window.rcLogo, "PNG", logoX + logoWidthMultipla + espacamento, topoLogo, logoWidthMultipla, logoHeightMultipla, undefined, "NONE");
      if (window.dinamicaLogo) doc.addImage(window.dinamicaLogo, "PNG", logoX + ((logoWidthMultipla + espacamento) * 2), topoLogo, logoWidthMultipla, logoHeightMultipla, undefined, "NONE");

      if (!window.macroLogo && !window.rcLogo && !window.dinamicaLogo && logoEmpresas) {
        const maxLogoWidth = 46;
        const maxLogoHeight = 18;

        // 🔥 proporção dinâmica (melhor)
        const img = new Image();
        img.src = logoEmpresas;
        const proporcaoLogo = img.width / img.height || (920 / 565);

        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / proporcaoLogo;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * proporcaoLogo;
        }

        const logoX = pageWidth - margemDireita - logoWidth;
        const logoY = topoLogo + (maxLogoHeight - logoHeight) / 2;

        doc.setFillColor(255, 255, 255);

        // 🔥 AQUI FOI A CORREÇÃO PRINCIPAL
        doc.addImage(logoBase64, "PNG", logoX, logoY, logoWidth, logoHeight, undefined, "NONE");
      }
    } catch (e) {
      console.error("Erro logo:", e);
    }
  };

  const desenharFundoPagina = () => {
    doc.setFillColor(215, 218, 220);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  // Fundo
  desenharFundoPagina();
  desenharLogoCabecalho();

  // Data
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Gerado em:", 14, 18);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`${new Date().toLocaleString()}`, 38, 18);

  // Filtros aplicados
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Filtros Aplicados:", 14, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let filtros = [];
  if (filtroCoord.length > 0) filtros.push(`Coordenação: ${filtroCoord.map(f => f.label).join(", ")}`);
  if (filtroSupervisor.length > 0) filtros.push(`Supervisor: ${filtroSupervisor.map(f => f.label).join(", ")}`);
  if (filtroSetor.length > 0) filtros.push(`Setor: ${filtroSetor.map(f => f.label).join(", ")}`);
  if (filtroDataInicio && filtroDataFim) filtros.push(`Período: ${filtroDataInicio} até ${filtroDataFim}`);
  doc.text(filtros.join("  |  "), 14, 39);

  if (registrosFiltrados.length === 0) {
    alert("Nenhum registro encontrado para os filtros selecionados. O PDF não será gerado.");
    return;
  }

  const gruposPorCoordenacaoSetorSubsetor = new Map();

  registrosFiltrados.forEach((r) => {
    const coordenacao = (r.coordenador_nome || "-").toString();
    const setor = (r.setor_nome || "-").toString();
    const subsetor = (r.subsetor_nome || "-").toString();
    const chave = `${coordenacao}|||${setor}|||${subsetor}`;

    if (!gruposPorCoordenacaoSetorSubsetor.has(chave)) {
      gruposPorCoordenacaoSetorSubsetor.set(chave, {
        coordenacao,
        setor,
        subsetor,
        linhas: []
      });
    }

    const grupo = gruposPorCoordenacaoSetorSubsetor.get(chave);

    grupo.linhas.push([
      (r.tarefa_nome || "-").toString(),
      (r.funcionario_nome || "-").toString(),
      setor,
      subsetor,
      (r.descricao || "-").toString(),
      (r.porcentagem !== undefined && r.porcentagem !== null ? r.porcentagem + "%" : "-").toString(),
      r.data_registro ? new Date(r.data_registro).toLocaleDateString() : "-"
    ]);
  });

  let y = 47;
  Array.from(gruposPorCoordenacaoSetorSubsetor.values()).forEach((grupo, indiceGrupo) => {
    if (indiceGrupo > 0) {
      doc.addPage();
      desenharFundoPagina();
      desenharLogoCabecalho();
      y = 32;
    }

    const partesInfo = [
      { rotulo: "Coordenação:", valor: grupo.coordenacao },
      { rotulo: "Setor:", valor: grupo.setor },
      { rotulo: "Subsetor:", valor: grupo.subsetor }
    ];

    doc.setFontSize(11);
    doc.setTextColor(200, 0, 0);
    let xAtual = 14;

    partesInfo.forEach((parte, indiceParte) => {
      doc.setFont("helvetica", "bold");
      doc.text(parte.rotulo, xAtual, y);
      xAtual += doc.getTextWidth(`${parte.rotulo} `);

      doc.setFont("helvetica", "normal");
      doc.text(String(parte.valor || "-"), xAtual, y);
      xAtual += doc.getTextWidth(String(parte.valor || "-"));

      if (indiceParte < partesInfo.length - 1) {
        const separador = " | ";
        doc.text(separador, xAtual, y);
        xAtual += doc.getTextWidth(separador);
      }
    });

    doc.setTextColor(0, 0, 0);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { top: 32, bottom: 16 },
      willDrawPage: (data) => {
        if (data.pageNumber > 1) {
          desenharFundoPagina();
        }
      },
      head: [[
        "Tarefa",
        "Funcionário",
        "Setor",
        "Subsetor",
        "Descrição",
        "%",
        "Data"
      ]],
      body: grupo.linhas,
      headStyles: {
        fillColor: [158, 204, 93],
        textColor: [0, 0, 0],
        lineColor: [120, 120, 120],
        lineWidth: 0.15,
        halign: "center",
        valign: "middle"
      },
      bodyStyles: {
        fillColor: [233, 241, 222],
        textColor: [0, 0, 0],
        lineColor: [120, 120, 120],
        lineWidth: 0.15,
        halign: "center",
        valign: "middle"
      },
      alternateRowStyles: {
        fillColor: [225, 235, 212]
      },
      styles: {
        overflow: "linebreak",
        cellPadding: 2,
        lineColor: [120, 120, 120],
        lineWidth: 0.15,
        halign: "center",
        valign: "middle"
      }
    });

    y = (doc.lastAutoTable?.finalY || y) + 10;
  });

  const totalPaginas = doc.getNumberOfPages();

  for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual++) {
    doc.setPage(paginaAtual);
    desenharLogoCabecalho();

    doc.setFont("times", "bold");
    doc.setFontSize(headerTitleFontSize);
    doc.setTextColor(0, 0, 0);
    doc.text("RELATÓRIO DE REGISTROS", pageWidth / 2, headerTitleY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(pageNumberFontSize);
    doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pageNumberX, pageNumberY, {
      align: "right"
    });
  }

  window.open(doc.output("bloburl"), "_blank");
}


  return (
    <Layout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h1 style={{ color: "#0047AB", marginBottom: "20px" }}>
          Histórico de Registros{usuarioLogado?.nome ? ` - ${usuarioLogado.nome}` : ""}
        </h1>
        <button
          onClick={handleExportarPDF}
          style={{
            background: "#0047AB",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 2px 8px #0047ab22"
          }}
        >
          Exportar PDF
        </button>
      </div>

      {/* FILTROS */}
     <div className="app-filter-bar" style={cardFiltro}>

  <DateRangePicker
    className="app-filter-date-range"
    style={{ width: 260 }}
    format="dd/MM/yyyy"
    placeholder="Selecionar período"
    cleanable
    ranges={atalhosPeriodo}
    onChange={(value) => {
      setPeriodo(value);

      if (value && value[0] && value[1]) {
        setFiltroDataInicio(formatarDataLocalISO(value[0]));
        setFiltroDataFim(formatarDataLocalISO(value[1]));
      } else {
        setFiltroDataInicio("");
        setFiltroDataFim("");
      }
    }}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Coordenação"
    value={filtroCoord}
    onChange={(selected) => setFiltroCoord(selected || [])}
    options={opcoesCoordFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    isDisabled={isCoordenador}
    inputValue={inputCoord}
    onInputChange={setInputCoord}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Setor"
    value={filtroSetor}
    onChange={(selected) => setFiltroSetor(selected || [])}
    options={opcoesSetorFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    isDisabled={isSupervisor && !!setorSupervisorLogado}
    inputValue={inputSetor}
    onInputChange={setInputSetor}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Subsetor"
    value={filtroSubsetor}
    onChange={(selected) => setFiltroSubsetor(selected || [])}
    options={opcoesSubsetorFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    inputValue={inputSubsetor}
    onInputChange={setInputSubsetor}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Supervisor"
    value={filtroSupervisor}
    onChange={(selected) => setFiltroSupervisor(selected || [])}
    options={opcoesSupervisorFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    inputValue={inputSupervisor}
    onInputChange={setInputSupervisor}
  />


  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Atividade"
    value={filtroAtividade}
    onChange={(selected) => setFiltroAtividade(selected || [])}
    options={opcoesAtividadeFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    inputValue={inputAtividade}
    onInputChange={setInputAtividade}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Periodicidade"
    value={filtroPeriodicidade}
    onChange={(selected) => setFiltroPeriodicidade(selected || [])}
    options={opcoesPeriodicidadeFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    inputValue={inputPeriodicidade}
    onInputChange={setInputPeriodicidade}
  />

  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Funcionário"
    value={filtroFuncionario}
    onChange={(selected) => setFiltroFuncionario(selected || [])}
    options={opcoesFuncionarioFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
    isDisabled={isPadrao}
    inputValue={inputFuncionario}
    onInputChange={setInputFuncionario}
  />

  <button
    style={btnExcluirNovo}
    onClick={() => {
      setFiltroCoord([]);
      setFiltroSetor([]);
      setFiltroSubsetor([]);
      setFiltroSupervisor([]);
      setFiltroFuncionario([]);
      setFiltroAtividade([]);
      setFiltroPeriodicidade([]);
      setFiltroDataInicio("");
      setFiltroDataFim("");
      setPeriodo([null, null]);
    }}
  >
    Limpar Filtros
  </button>

</div>

      {/* TABELA */}
    <div className="wide-table-card" style={cardTabela}>

  {/* CONTADOR */}
  <div style={contadorContainer}>
    Mostrando <strong>{registrosFiltrados.length}</strong> de{" "}
  <strong>{registros.length}</strong> Registros
  </div>
  
  <div style={scrollContainer}>
          <table style={tabela}>
            <thead style={thead}>
              <tr>
                <th style={th}>Atividade</th>
                <th style={th}>Funcionário</th>
                <th style={th}>Coordenação</th>
                <th style={th}>Líder</th>
                <th style={th}>Setor</th>
                <th style={th}>Subsetor</th>
                <th style={th}>Periodicidade</th>
                <th style={th}>%</th>
                <th style={th}>Descrição</th>
                <th style={th}>Data</th>
                <th style={th}>Admin</th>
                {isAdmin && <th style={th}>Ações</th>}
              </tr>
            </thead>

            <tbody>
  {registrosFiltrados.map((r) => (
    <tr
      key={r.id}
      onDoubleClick={() =>
        setLinhaSelecionada(
          linhaSelecionada === r.id ? null : r.id
        )
      }
      style={{
        backgroundColor:
          linhaSelecionada === r.id ? "#e0f2fe" : "white",
        cursor: "pointer"
      }}
    >
                  <td style={td}>{r.tarefa_nome}</td>
                  <td style={td}>{r.funcionario_nome || "-"}</td>
                  <td style={td}>{r.coordenador_nome}</td>
                  <td style={td}>{r.supervisor_nome}</td>
                  <td style={td}>{r.setor_nome}</td>
                  <td style={td}>{r.subsetor_nome}</td>
                  <td style={td}>{r.periodicidade}</td>
                  <td style={td}>{r.porcentagem}%</td>
                  <td style={td}>{r.descricao}</td>
                  <td style={td}>
                  {new Date(r.data_registro).toLocaleString()}</td>
                  <td style={td}>{r.admin_nome}</td>

                  {isAdmin && (
                    <td style={acoesTd}>
  <div style={acoesContainer}>

    <button
      style={btnEditarNovo}
      onClick={() => {
        setRegistroSelecionado(r);
        setModalOpen(true);
      }}
    >
      Editar
    </button>

    <button
      style={btnExcluirNovo}
      onClick={() => deletarRegistro(r.id)}
    >
      Deletar
    </button>
  </div>
</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
{modalOpen && registroSelecionado && (
  <Modal onClose={() => setModalOpen(false)} size="lg">
    <div style={modalContainer}>
      <h2 style={modalTitulo}>Editar Registro</h2>

      <div style={formGroup}>
        <label style={label}>Funcionário</label>
        <select
          style={input}
          value={registroSelecionado.funcionario_id || ""}
          onChange={(e) =>
            setRegistroSelecionado({
              ...registroSelecionado,
              funcionario_id: e.target.value
            })
          }
        >
          <option value="">Selecione um funcionário</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>  {/* âœ… FECHOU AQUI */}

      <div style={formGroup}>
        <label style={label}>Descrição</label>
        <textarea
          style={textarea}
          value={registroSelecionado.descricao || ""}
          onChange={(e) =>
            setRegistroSelecionado({
              ...registroSelecionado,
              descricao: e.target.value
            })
          }
        />
      </div>

      <div style={formGroup}>
        <label style={label}>Porcentagem</label>
        <input
          type="number"
          style={input}
          value={registroSelecionado.porcentagem || ""}
          onChange={(e) =>
            setRegistroSelecionado({
              ...registroSelecionado,
              porcentagem: e.target.value
            })
          }
        />
      </div>

      <div style={botoesContainer}>
        <button style={btnCancelar} onClick={() => setModalOpen(false)}>
          Cancelar
        </button>

        <button style={btnSalvarNovo} onClick={salvarEdicao}>
          Salvar Alterações
        </button>
      </div>
    </div>
  </Modal>
)}
    </Layout>
  );
}

/* ===== ESTILOS ===== */

const cardTabela = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  overflow: "hidden"
};

const scrollContainer = {
  maxHeight: "800px",
  overflowY: "auto",
  overflowX: "auto"
};

const tabela = {
  minWidth: "clamp(1100px, 170vw, 3000px)",
  width: "100%",
  borderCollapse: "collapse"
};

const thead = {
  position: "sticky",
  top: 0,
  background: "#f3f6f8",
  zIndex: 2
};

const th = {
  padding: "14px",
  borderBottom: "2px solid #ccc",
  borderRight: "1px solid #e5e7eb",
  fontWeight: "700"
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #eee",
  borderRight: "1px solid #e5e7eb"
};

const acoesTd = {
  ...td,
  textAlign: "center"
};

const btnEditarNovo = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "0.2s",
};


const btnExcluirNovo = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "0.2s",
};

const modalContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "10px 5px"
};

const modalTitulo = {
  fontSize: "22px",
  fontWeight: "700",
  marginBottom: "10px",
  color: "#1f2937"
};

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "6px"
};

const label = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#374151"
};

const input = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "18px",
  outline: "none"
};

const textarea = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "18px",
  minHeight: "80px",
  resize: "vertical",
  outline: "none"
};

const botoesContainer = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "10px"
};

const btnCancelar = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600"
};

const btnSalvarNovo = {
  background: "#0047AB",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  boxShadow: "0 4px 12px rgba(0,71,171,0.3)"
};
const acoesContainer = {
  display: "flex",
  gap: "8px",
  justifyContent: "center"
};
const contadorContainer = {
  padding: "15px 20px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937"
};
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



