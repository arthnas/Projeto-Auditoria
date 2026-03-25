/* eslint-disable no-unused-vars */
import { useEffect, useState, useContext, useMemo } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { AuthContext } from "../context/AuthContext";
import { Document, Page, Text, PDFViewer } from "@react-pdf/renderer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Select from "react-select";
import logoEmpresas from "../assets/logo-empresas.png";


export default function Tarefas() {
  const [tarefas, setTarefas] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [setores, setSetores] = useState([]);
  const [subsetores, setSubsetores] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [modalEscolha, setModalEscolha] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [modoDescricao, setModoDescricao] = useState(false);
  const [descricaoEditavel, setDescricaoEditavel] = useState("");
  const [descricaoLiberada, setDescricaoLiberada] = useState(false);
  const [modalAgenda, setModalAgenda] = useState(false);
  const [editandoAgenda, setEditandoAgenda] = useState(false);
  const [agenda, setAgenda] = useState([
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["", "", "", "", ""]
]);
  

  const [celulaSelecionada, setCelulaSelecionada] = useState(null);

function limparCelula() {
  if (!celulaSelecionada) {
    alert("Selecione uma célula primeiro");
    return;
  }

  const novaAgenda = agenda.map(linha => [...linha]);
  novaAgenda[celulaSelecionada.linha][celulaSelecionada.coluna] = "";

  setAgenda(novaAgenda);
}

async function salvarAgenda() {

  try {

    await api.post("/tarefas/agenda", {
      agenda: agenda
    });

    setEditandoAgenda(false);

    alert("Agenda salva com sucesso!");

  } catch (err) {
    alert("Erro ao salvar agenda");
  }

}

function acionarRobo() {
  if (!linhaSelecionada) {
    alert("Selecione uma tarefa com duplo clique!");
    return;
  }
  const tarefa = tarefas.find(t => t.id === linhaSelecionada);
  if (!tarefa) {
    alert("Tarefa não encontrada!");
    return;
  }
  localStorage.setItem("tarefa_robo", JSON.stringify({ id: tarefa.id, nome: tarefa.nome, descricao: tarefa.descricao }));
  alert(`Robô pronto para analisar: ${tarefa.nome}\n${tarefa.descricao}`);
}

  const [filtroTarefa, setFiltroTarefa] = useState([]);
  const [filtroPeriodicidade, setFiltroPeriodicidade] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroSupervisor, setFiltroSupervisor] = useState([]);
  const [filtroFuncionario, setFiltroFuncionario] = useState([]);
  const [filtroCoord, setFiltroCoord] = useState([]);
  const [filtroSetor, setFiltroSetor] = useState([]);
  const [filtroSubsetor, setFiltroSubsetor] = useState([]);
  const [filtrosRestaurados, setFiltrosRestaurados] = useState(false);
  const [solicitacoesMinhas, setSolicitacoesMinhas] = useState([]);
  const [solicitacoesCarregadasEm, setSolicitacoesCarregadasEm] = useState(Date.now());
  const [agora, setAgora] = useState(Date.now());
  const [nomesUsuariosPorId, setNomesUsuariosPorId] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [tarefaDocumento, setTarefaDocumento] = useState(null);
  const [caminhosInput, setCaminhosInput] = useState([""]);

  const [editando, setEditando] = useState(null);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    tipo_id: "",
    funcionario_id: "",
    subsetor_id: "",
    periodicidade: "Diário",
    porcentagem: 0,
    supervisor_id: ""
  });
    
  const [registroForm, setRegistroForm] = useState({
    funcionario_id: "",
    descricao: ""
  });

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
  const chavePersistenciaFiltros = useMemo(
    () => `tarefas:filtros:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`,
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
      const bruto = localStorage.getItem(chavePersistenciaFiltros);
      if (!bruto) {
        setFiltrosRestaurados(true);
        return;
      }

      const salvo = JSON.parse(bruto);
      setFiltroTarefa(normalizarSelecaoPersistida(salvo?.filtroTarefa));
      setFiltroPeriodicidade(normalizarSelecaoPersistida(salvo?.filtroPeriodicidade));
      setFiltroSupervisor(normalizarSelecaoPersistida(salvo?.filtroSupervisor));
      setFiltroFuncionario(normalizarSelecaoPersistida(salvo?.filtroFuncionario));
      setFiltroCoord(normalizarSelecaoPersistida(salvo?.filtroCoord));
      setFiltroSetor(normalizarSelecaoPersistida(salvo?.filtroSetor));
      setFiltroSubsetor(normalizarSelecaoPersistida(salvo?.filtroSubsetor));
      setFiltroStatus(String(salvo?.filtroStatus || ""));
    } catch {
    } finally {
      setFiltrosRestaurados(true);
    }
  }, [chavePersistenciaFiltros]);

  useEffect(() => {
    if (!filtrosRestaurados) return;

    const estado = {
      filtroTarefa,
      filtroPeriodicidade,
      filtroStatus,
      filtroSupervisor,
      filtroFuncionario,
      filtroCoord,
      filtroSetor,
      filtroSubsetor
    };

    try {
      localStorage.setItem(chavePersistenciaFiltros, JSON.stringify(estado));
    } catch {
    }
  }, [
    filtrosRestaurados,
    chavePersistenciaFiltros,
    filtroTarefa,
    filtroPeriodicidade,
    filtroStatus,
    filtroSupervisor,
    filtroFuncionario,
    filtroCoord,
    filtroSetor,
    filtroSubsetor
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
      setFiltroCoord([{ value: nomeCoordenadorLogado, label: nomeCoordenadorLogado }]);
    }
  }, [isCoordenador, nomeCoordenadorLogado, filtroCoord]);

  function correspondeSelecao(lista, valor) {
    if (!Array.isArray(lista) || lista.length === 0) return true;
    const valorNormalizado = normalizarNome(valor);
    return lista.some((item) => normalizarNome(item?.value) === valorNormalizado);
  }

  function criarOpcoesUnicas(dados, chave) {
    const vistos = new Set();
    return (dados || [])
      .map((item) => String(item?.[chave] || "").trim())
      .filter((valor) => {
        if (!valor) return false;
        if (vistos.has(valor)) return false;
        vistos.add(valor);
        return true;
      })
      .map((valor) => ({ value: valor, label: valor }));
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

  const tarefasBaseParaOpcoes = useMemo(() => {
    return (tarefas || []).filter((tarefa) => {
      if (!isCoordenador) return true;
      if (!nomeCoordenadorLogado) return false;
      return tarefa.coordenador_nome === nomeCoordenadorLogado;
    });
  }, [tarefas, isCoordenador, nomeCoordenadorLogado]);

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

  const tarefasBaseRestritasPorPerfil = useMemo(() => {
    return (tarefasBaseParaOpcoes || []).filter((tarefa) => {
      if (isPadrao) {
        return normalizarNome(tarefa?.funcionario_nome) === nomeUsuarioLogado;
      }
      if (isSupervisor) {
        if (!setorSupervisorLogado) return false;
        return normalizarNome(tarefa?.setor_nome) === normalizarNome(setorSupervisorLogado);
      }
      return true;
    });
  }, [tarefasBaseParaOpcoes, isPadrao, isSupervisor, nomeUsuarioLogado, setorSupervisorLogado]);

  function filtrarParaOpcoes(campoIgnorado) {
    return tarefasBaseRestritasPorPerfil.filter((tarefa) => {
      if (campoIgnorado !== "tarefa" && !correspondeSelecao(filtroTarefa, tarefa.nome)) return false;
      if (campoIgnorado !== "funcionario" && !correspondeSelecao(filtroFuncionario, tarefa.funcionario_nome)) return false;
      if (campoIgnorado !== "coord" && !correspondeSelecao(filtroCoord, tarefa.coordenador_nome)) return false;
      if (campoIgnorado !== "setor" && !correspondeSelecao(filtroSetor, tarefa.setor_nome)) return false;
      if (campoIgnorado !== "subsetor" && !correspondeSelecao(filtroSubsetor, tarefa.subsetor_nome)) return false;
      if (campoIgnorado !== "supervisor" && !correspondeSelecao(filtroSupervisor, tarefa.supervisor_nome)) return false;
      if (campoIgnorado !== "periodicidade" && !correspondeSelecao(filtroPeriodicidade, tarefa.periodicidade)) return false;
      if (campoIgnorado !== "status" && filtroStatus && tarefa.status !== filtroStatus) return false;
      return true;
    });
  }

  const opcoesTarefaFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("tarefa"), "nome"),
    [tarefasBaseRestritasPorPerfil, filtroFuncionario, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroPeriodicidade, filtroStatus]
  );

  const opcoesFuncionarioFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("funcionario"), "funcionario_nome"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroPeriodicidade, filtroStatus]
  );

  useEffect(() => {
    if (!isPadrao) return;
    if (!nomeUsuarioPerfilExibicao) return;

    if (
      filtroFuncionario.length !== 1 ||
      normalizarNome(filtroFuncionario[0]?.value || "") !== nomeUsuarioLogado
    ) {
      setFiltroFuncionario([
        {
          value: nomeUsuarioPerfilExibicao,
          label: nomeUsuarioPerfilExibicao
        }
      ]);
    }
  }, [isPadrao, nomeUsuarioPerfilExibicao, nomeUsuarioLogado, filtroFuncionario]);

  const opcoesCoordFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("coord"), "coordenador_nome"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroFuncionario, filtroSetor, filtroSubsetor, filtroSupervisor, filtroPeriodicidade, filtroStatus]
  );

  const opcoesSetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("setor"), "setor_nome"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroFuncionario, filtroCoord, filtroSubsetor, filtroSupervisor, filtroPeriodicidade, filtroStatus]
  );

  const opcoesSubsetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("subsetor"), "subsetor_nome"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroFuncionario, filtroCoord, filtroSetor, filtroSupervisor, filtroPeriodicidade, filtroStatus]
  );

  const opcoesSupervisorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("supervisor"), "supervisor_nome"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroFuncionario, filtroCoord, filtroSetor, filtroSubsetor, filtroPeriodicidade, filtroStatus]
  );

  useEffect(() => {
    if (!isSupervisor) return;
    if (!setorSupervisorLogado) return;

    if (
      filtroSetor.length !== 1 ||
      normalizarNome(filtroSetor[0]?.value || "") !== normalizarNome(setorSupervisorLogado)
    ) {
      setFiltroSetor([
        {
          value: setorSupervisorLogado,
          label: setorSupervisorLogado
        }
      ]);
    }
  }, [isSupervisor, setorSupervisorLogado, filtroSetor]);

  useEffect(() => {
    if (!isSupervisor) return;
    if ((filtroSupervisor || []).length === 0) return;
    setFiltroSupervisor([]);
  }, [isSupervisor, filtroSupervisor]);

  const opcoesPeriodicidadeFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("periodicidade"), "periodicidade"),
    [tarefasBaseRestritasPorPerfil, filtroTarefa, filtroFuncionario, filtroCoord, filtroSetor, filtroSubsetor, filtroSupervisor, filtroStatus]
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
    if (!filtrosRestaurados) return;
    if ((tarefas || []).length === 0) return;

    setFiltroTarefa((atual) => sincronizarSelecaoValida(atual, opcoesTarefaFiltradas));
    if (!isPadrao) {
      setFiltroFuncionario((atual) => sincronizarSelecaoValida(atual, opcoesFuncionarioFiltradas));
    }
    setFiltroCoord((atual) => sincronizarSelecaoValida(atual, opcoesCoordFiltradas));
    setFiltroSetor((atual) => sincronizarSelecaoValida(atual, opcoesSetorFiltradas));
    setFiltroSubsetor((atual) => sincronizarSelecaoValida(atual, opcoesSubsetorFiltradas));
    setFiltroSupervisor((atual) => sincronizarSelecaoValida(atual, opcoesSupervisorFiltradas));
    setFiltroPeriodicidade((atual) => sincronizarSelecaoValida(atual, opcoesPeriodicidadeFiltradas));
  }, [
    opcoesTarefaFiltradas,
    opcoesFuncionarioFiltradas,
    opcoesCoordFiltradas,
    opcoesSetorFiltradas,
    opcoesSubsetorFiltradas,
    opcoesSupervisorFiltradas,
    opcoesPeriodicidadeFiltradas,
    filtrosRestaurados,
    isPadrao,
    isSupervisor,
    tarefas
  ]);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  function parseDataAprovacao(solicitacao) {
    const bruto =
      solicitacao?.aprovado_em ||
      solicitacao?.respondido_em ||
      solicitacao?.data_aprovacao ||
      solicitacao?.data_resposta ||
      solicitacao?.atualizado_em ||
      solicitacao?.updated_at ||
      solicitacao?.updatedAt ||
      solicitacao?.criado_em;

    if (!bruto) return null;

    const data = new Date(bruto);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  }

  function parseDataSegura(valor) {
    if (!valor) return null;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  }

  function extrairNumeroFlexivel(valor) {
    if (valor == null) return null;

    if (typeof valor === "number" && Number.isFinite(valor)) {
      return valor;
    }

    if (typeof valor === "string") {
      const texto = valor.trim();
      if (!texto) return null;

      const pareceDataHora =
        /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?/.test(texto) ||
        /^\d{1,2}\/\d{1,2}\/\d{4}(?:\s*,?\s*\d{1,2}:\d{2}(?::\d{2})?)?/.test(texto);
      if (pareceDataHora) return null;

      const direto = Number(texto.replace(",", "."));
      if (Number.isFinite(direto)) return direto;

      const match = texto.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const numero = Number(match[0]);
        if (Number.isFinite(numero)) return numero;
      }
    }

    return null;
  }

  function buscarNumeroPorChave(objeto, regex) {
    let encontrado = null;

    function percorrer(no) {
      if (encontrado != null || no == null || typeof no !== "object") return;

      if (Array.isArray(no)) {
        no.forEach((item) => percorrer(item));
        return;
      }

      Object.entries(no).forEach(([chave, valor]) => {
        if (encontrado != null) return;

        if (regex.test(chave)) {
          const numero = extrairNumeroFlexivel(valor);
          if (numero != null && numero >= 0) {
            encontrado = Math.floor(numero);
            return;
          }
        }

        if (valor && typeof valor === "object") {
          percorrer(valor);
        }
      });
    }

    percorrer(objeto);
    return encontrado;
  }

  function buscarDataPorChave(objeto, regex) {
    let encontrada = null;

    function percorrer(no) {
      if (encontrada || no == null || typeof no !== "object") return;

      if (Array.isArray(no)) {
        no.forEach((item) => percorrer(item));
        return;
      }

      Object.entries(no).forEach(([chave, valor]) => {
        if (encontrada) return;

        if (regex.test(chave)) {
          const data = parseDataSegura(valor);
          if (data) {
            encontrada = data;
            return;
          }
        }

        if (valor && typeof valor === "object") {
          percorrer(valor);
        }
      });
    }

    percorrer(objeto);
    return encontrada;
  }

  function parseDataExpiracao(solicitacao) {
    const bruto =
      solicitacao?.tempo_liberado_ate ||
      solicitacao?.expira_em ||
      solicitacao?.expiracao_em ||
      solicitacao?.data_expiracao ||
      solicitacao?.limite_em ||
      solicitacao?.finaliza_em;

    const dataDireta = parseDataSegura(bruto);
    if (dataDireta) return dataDireta;

    return buscarDataPorChave(solicitacao, /(expir|limite|finaliz|termin|validade)/i);
  }

  function extrairMinutosPermitidos(solicitacao, aprovadoEm, expiraEm) {
    const candidatos = [
      solicitacao?.minutos,
      solicitacao?.minutos_permitidos,
      solicitacao?.tempo_minutos,
      solicitacao?.tempo_permitido_minutos,
      solicitacao?.duracao_minutos,
      solicitacao?.prazo_minutos,
      solicitacao?.tempoLiberadoMinutos,
      solicitacao?.detalhes?.minutos,
      solicitacao?.detalhes?.tempo_minutos
    ];

    for (const valor of candidatos) {
      const numero = extrairNumeroFlexivel(valor);
      if (Number.isFinite(numero) && numero >= 0) {
        return Math.floor(numero);
      }
    }

    const minutosPorBusca = buscarNumeroPorChave(
      solicitacao,
      /(minut|minuto|durac|prazo|permitid)/i
    );
    if (minutosPorBusca != null) {
      return minutosPorBusca;
    }

    const aprovadoEmBusca = aprovadoEm || buscarDataPorChave(solicitacao, /(aprov|respond|respost|atualiz|update|criad)/i);
    const expiraEmBusca = expiraEm || buscarDataPorChave(solicitacao, /(expir|limite|finaliz|termin|validade)/i);

    if (aprovadoEmBusca && expiraEmBusca) {
      const diferencaMin = (expiraEmBusca.getTime() - aprovadoEmBusca.getTime()) / 60000;
      if (Number.isFinite(diferencaMin) && diferencaMin >= 0) {
        return Math.round(diferencaMin);
      }
    }

    const segundosRestantes = extrairNumeroFlexivel(
      solicitacao?.tempo_restante_segundos ??
        solicitacao?.segundos_restantes ??
        solicitacao?.tempoRestanteSegundos
    );
    if (Number.isFinite(segundosRestantes) && segundosRestantes >= 0) {
      return Math.ceil(segundosRestantes / 60);
    }

    return null;
  }

  function formatarTempoRestante(restanteMs) {
    const totalSegundos = Math.max(0, Math.floor(restanteMs / 1000));
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas > 0) {
      return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
    }

    return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  }

  function obterNomeAprovador(solicitacao) {
    function ehMarcadorGenerico(texto) {
      const valor = String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();

      return (
        valor === "ADMIN" ||
        valor === "ADMINISTRADOR" ||
        valor === "DEVELOPER" ||
        valor === "DESENVOLVEDOR" ||
        valor === "USUARIO" ||
        valor === "SYSTEM"
      );
    }

    const tiposPossiveis = [
      solicitacao?.aprovado_por_tipo,
      solicitacao?.aprovadoPorTipo,
      solicitacao?.respondido_por_tipo,
      solicitacao?.respondidoPorTipo,
      solicitacao?.admin_tipo,
      solicitacao?.adminTipo,
      solicitacao?.usuario_aprovador_tipo,
      solicitacao?.usuarioAprovadorTipo
    ]
      .map((v) => String(v || "").trim().toUpperCase())
      .filter(Boolean);

    const candidatos = [
      solicitacao?.aprovado_por_nome,
      solicitacao?.aprovadoPorNome,
      solicitacao?.respondido_por_nome,
      solicitacao?.respondidoPorNome,
      solicitacao?.admin_nome,
      solicitacao?.adminName,
      solicitacao?.aprovador_nome,
      solicitacao?.aprovador,
      solicitacao?.usuario_aprovador_nome,
      solicitacao?.usuarioAprovadorNome,
      solicitacao?.aprovado_por_usuario,
      solicitacao?.respondido_por_usuario,
      solicitacao?.aprovado_por_login,
      solicitacao?.respondido_por_login,
      solicitacao?.approver_name,
      solicitacao?.approved_by_name,
      solicitacao?.answered_by_name,
      solicitacao?.responded_by_name,
      solicitacao?.usuario_aprovador?.nome,
      solicitacao?.usuario_aprovador?.name,
      solicitacao?.aprovador?.nome,
      solicitacao?.aprovador?.name,
      solicitacao?.respondido_por_usuario?.nome,
      solicitacao?.respondido_por_usuario?.name,
      solicitacao?.aprovado_por,
      solicitacao?.respondido_por
    ];

    for (const valor of candidatos) {
      const texto = String(valor || "").trim();
      if (!texto) continue;
      if (/^\d+$/.test(texto)) continue;
      if (ehMarcadorGenerico(texto)) continue;
      return texto;
    }

    const idsPossiveis = [
      solicitacao?.aprovado_por_id,
      solicitacao?.aprovadoPorId,
      solicitacao?.respondido_por_id,
      solicitacao?.respondidoPorId,
      solicitacao?.admin_id,
      solicitacao?.adminId,
      solicitacao?.usuario_aprovador_id,
      solicitacao?.usuarioAprovadorId,
      solicitacao?.approver_id,
      solicitacao?.approved_by_id,
      solicitacao?.answered_by_id,
      solicitacao?.responded_by_id,
      solicitacao?.usuario_aprovador?.id,
      solicitacao?.aprovador?.id,
      solicitacao?.respondido_por_usuario?.id,
      solicitacao?.aprovado_por,
      solicitacao?.respondido_por
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    const nomePorId = idsPossiveis
      .map((id) => nomesUsuariosPorId[id])
      .find((nome) => String(nome || "").trim());
    if (nomePorId) return String(nomePorId).trim();

    if (
      idUsuarioLogado &&
      idsPossiveis.some((id) => id === idUsuarioLogado) &&
      String(nomeUsuarioPerfilExibicao || "").trim()
    ) {
      return String(nomeUsuarioPerfilExibicao).trim();
    }

    if (tiposPossiveis.some((t) => t.includes("DEVELOPER"))) return "DEVELOPER";
    if (tiposPossiveis.some((t) => t.includes("ADMIN"))) return "ADMIN";
    if (tiposPossiveis.length > 0) return tiposPossiveis[0];

    return "ADMIN";
  }

  function obterNomeSolicitante(solicitacao) {
    const candidatos = [
      solicitacao?.solicitante_nome,
      solicitacao?.solicitanteNome,
      solicitacao?.usuario_nome,
      solicitacao?.usuarioNome,
      solicitacao?.nome_usuario,
      solicitacao?.nomeUsuario,
      solicitacao?.usuario,
      solicitacao?.created_by_nome,
      solicitacao?.createdByNome
    ];

    for (const valor of candidatos) {
      const texto = String(valor || "").trim();
      if (!texto) continue;
      if (/^\d+$/.test(texto)) continue;
      return texto;
    }

    return "-";
  }

  const aprovacoesEdicaoAtivas = useMemo(() => {
    const porTarefa = new Map();

    (solicitacoesMinhas || []).forEach((s) => {
      const status = String(s?.status || "").trim().toLowerCase();
      const tipo = String(s?.tipo || "").trim().toLowerCase();
      if (status !== "aceita" || tipo !== "editar") return;

      const tarefaId = String(s?.tarefa_id || s?.tarefaId || s?.tarefa?.id || "").trim();
      if (!tarefaId) return;

      const aprovadoEm = parseDataAprovacao(s);
      if (!aprovadoEm) return;

      const expiraEm = parseDataExpiracao(s);
      const minutosExtraidos = extrairMinutosPermitidos(s, aprovadoEm, expiraEm);
      const minutosNormalizados =
        minutosExtraidos == null ? null : Math.max(0, Math.floor(minutosExtraidos));
      const segundosRestantes = extrairNumeroFlexivel(
        s?.tempo_restante_segundos ?? s?.segundos_restantes ?? s?.tempoRestanteSegundos
      );

      const expiraEmMs = Number.isFinite(segundosRestantes) && segundosRestantes >= 0
        ? solicitacoesCarregadasEm + segundosRestantes * 1000
        : expiraEm
        ? expiraEm.getTime()
        : minutosNormalizados == null
        ? aprovadoEm.getTime()
        : aprovadoEm.getTime() + minutosNormalizados * 60 * 1000;
      const restanteMs = expiraEmMs - agora;
      if (restanteMs <= 0) return;

      const tarefaNome =
        String(s?.tarefa_nome || "").trim() ||
        tarefas.find((tarefa) => String(tarefa.id) === tarefaId)?.nome ||
        "Tarefa";

      const aprovador = obterNomeAprovador(s);
      const solicitante = obterNomeSolicitante(s);

      const registroAtual = {
        solicitacaoId: s.id,
        tarefaId,
        tarefaNome,
        aprovador,
        solicitante,
        minutosPermitidos: minutosNormalizados ?? Math.max(0, Math.ceil(restanteMs / 60000)),
        aprovadoEm,
        expiraEmMs,
        restanteMs
      };

      const existente = porTarefa.get(tarefaId);
      if (!existente || registroAtual.aprovadoEm > existente.aprovadoEm) {
        porTarefa.set(tarefaId, registroAtual);
      }
    });

    const lista = Array.from(porTarefa.values()).sort((a, b) => a.expiraEmMs - b.expiraEmMs);
    const mapa = {};
    lista.forEach((item) => {
      mapa[item.tarefaId] = item;
    });

    return { lista, mapa };
  }, [solicitacoesMinhas, agora, tarefas, solicitacoesCarregadasEm]);

  // Modal de solicitação de alteraÃ§Ã£o
  const [modalSolicitacao, setModalSolicitacao] = useState(false);
  const [tipoSolicitacao, setTipoSolicitacao] = useState(null); // 'editar' ou 'deletar'
  const [tarefaSolicitada, setTarefaSolicitada] = useState(null);
  const [motivoSolicitacao, setMotivoSolicitacao] = useState("");

  async function solicitarAlteracao(tipo, tarefa) {
    setTipoSolicitacao(tipo);
    setTarefaSolicitada(tarefa);
    setMotivoSolicitacao("");
    setModalSolicitacao(true);
  }

  async function enviarSolicitacao() {
    if (!motivoSolicitacao.trim()) {
      alert("Descreva o motivo da solicitação.");
      return;
    }
    try {
      await api.post("/solicitacoes", {
        tarefa_id: tarefaSolicitada.id,
        tipo: tipoSolicitacao,
        motivo: motivoSolicitacao
      });
      await carregar();
      alert("Solicitação enviada com sucesso!");
      setModalSolicitacao(false);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("Já existe uma solicitação pendente para esta tarefa e tipo.");
      } else {
        alert("Erro ao enviar solicitação.");
      }
    }
  }

async function carregar() {

try {

  const agendaRes = await api.get("/tarefas/agenda");

  const matriz = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""]
  ];

  agendaRes.data.forEach(item => {
    matriz[item.linha][item.coluna] = item.texto;
  });

  setAgenda(matriz);

} catch (err) {
  console.log("Agenda não carregou");
}

const endpoints = [
  { chave: "tarefas", path: "/tarefas" },
  { chave: "coordenadores", path: "/coordenadores" },
  { chave: "setores", path: "/setores" },
  { chave: "subsetores", path: "/subsetores" },
  { chave: "supervisores", path: "/supervisores" },
  { chave: "funcionarios", path: "/funcionarios" },
  { chave: "tipos", path: "/tipos" },
  { chave: "usuarios", path: "/usuarios" }
];

const resultados = await Promise.allSettled(
  endpoints.map((item) => api.get(item.path))
);

const dadosPorChave = {};
resultados.forEach((resultado, indice) => {
  const endpoint = endpoints[indice];
  if (resultado.status === "fulfilled") {
    dadosPorChave[endpoint.chave] = resultado.value?.data || [];
  } else {
    dadosPorChave[endpoint.chave] = [];
    console.error(`Falha ao carregar ${endpoint.path}`, resultado.reason);
  }
});

setTarefas(dadosPorChave.tarefas || []);
setCoordenadores(dadosPorChave.coordenadores || []);
setSetores(dadosPorChave.setores || []);
setSubsetores(dadosPorChave.subsetores || []);
setSupervisores(dadosPorChave.supervisores || []);
setFuncionarios(dadosPorChave.funcionarios || []);
setTipos(dadosPorChave.tipos || []);
const mapaUsuarios = {};
(dadosPorChave.usuarios || []).forEach((u) => {
  const id = String(u?.id || "").trim();
  const nome =
    String(u?.nome || "").trim() ||
    String(u?.name || "").trim() ||
    String(u?.usuario || "").trim();
  if (id && nome) mapaUsuarios[id] = nome;
});
setNomesUsuariosPorId(mapaUsuarios);

if (isCoordenador) {
  try {
    const sol = await api.get("/solicitacoes/minhas");
    setSolicitacoesMinhas(sol.data || []);
  } catch (err) {
    console.error("Falha ao carregar /solicitacoes/minhas", err);
    setSolicitacoesMinhas([]);
  }
} else {
  setSolicitacoesMinhas([]);
}
setSolicitacoesCarregadasEm(Date.now());

}

  useEffect(() => {
    carregar();
  }, []);

  
  useEffect(() => {
  function handleKeyDown(e) {
    // Ctrl + M
    if (e.ctrlKey && e.key.toLowerCase() === "m" && isAdmin) {
      e.preventDefault(); // evita comportamento padrão do navegador
      // eslint-disable-next-line react-hooks/immutability
      abrirNovo();        // abre o modal
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [isAdmin]);

  useEffect(() => {
  function handleEsc(e) {
    if (e.key === "Escape") {
      setModoDescricao(false);
      setDescricaoLiberada(false);
      setDescricaoEditavel("");
    }
  }

  window.addEventListener("keydown", handleEsc);

  return () => {
    window.removeEventListener("keydown", handleEsc);
  };
}, []);

  useEffect(() => {
  const textarea = document.querySelector(
    `textarea[data-id="${linhaSelecionada}"]`
  );

  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}, [descricaoEditavel, modoDescricao, linhaSelecionada]);
  
useEffect(() => {
  function handleKeyDown(e) {
    if (
      e.ctrlKey &&
      e.altKey &&
      !e.shiftKey &&
      e.key === "Alt" &&
      isAdmin
    ) {
      if (!linhaSelecionada) return;

      const tarefa = tarefas.find(t => t.id === linhaSelecionada);
      if (!tarefa) return;

      setDescricaoEditavel(tarefa.descricao || "");
      setDescricaoLiberada(false);
      setModoDescricao(true);
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [linhaSelecionada, tarefas, isAdmin]);
  
  
  async function resetarConcluidas() {
    const tarefasParaResetar = tarefasFiltradas.filter(
      (t) => t.status === "CONCLUIDO"
    );

    if (tarefasParaResetar.length === 0) {
      alert("Nenhuma tarefa concluída para resetar.");
      return;
    }

    if (!window.confirm("Deseja resetar as tarefas concluídas exibidas?"))
      return;

    for (let tarefa of tarefasParaResetar) {
      await api.put(`/tarefas/${tarefa.id}/status`, {
        status: "PENDENTE"
      });
    }

    carregar();
  }

function abrirNovo() {
  setEditando(null);
  setForm({
    nome: "",
    tipo_id: "",
    subsetor_id: "",
    periodicidade: "Diário",
    porcentagem: 0,
    supervisor_id: "",
    funcionario_id: ""
  });
  setModalOpen(true);
}

 function abrirEditar(tarefa) {
  if (isCoordenador) {
    const permissao = aprovacoesEdicaoAtivas.mapa[String(tarefa.id)];
    if (!permissao) {
      alert("Esta tarefa não está liberada para edição ou o tempo expirou.");
      return;
    }
  }

  setEditando(tarefa);
  setForm({
    nome: tarefa.nome,
    tipo_id: tarefa.tipo_id || "",
    subsetor_id: tarefa.subsetor_id,
    periodicidade: tarefa.periodicidade,
    porcentagem: tarefa.porcentagem,
    supervisor_id: tarefa.supervisor_id || "",
    funcionario_id: tarefa.funcionario_id || ""
  });
  setModalOpen(true);
}

 async function salvar() {
  if (!form.nome.trim()) {
    alert("Preencha o nome da tarefa");
    return;
  }

  const payload = {
    ...form,
    tipo_id: form.tipo_id || null,
    supervisor_id: form.supervisor_id || null,
    funcionario_id: form.funcionario_id || null
  };

  if (isCoordenador && editando) {
    const permissao = aprovacoesEdicaoAtivas.mapa[String(editando.id)];
    if (!permissao) {
      alert("Tempo de edição expirado para esta tarefa.");
      setModalOpen(false);
      setEditando(null);
      return;
    }
  }

  if (editando) {
    await api.put(`/tarefas/${editando.id}`, payload);
  } else {
    await api.post("/tarefas", payload);
  }

  setModalOpen(false);
  setEditando(null);
  carregar();
}

  async function deletar(id) {
    if (!window.confirm("Deseja deletar esta tarefa?")) return;
    await api.delete(`/tarefas/${id}`);
    carregar();
  }

  async function mudarStatus(tarefa) {
    const novoStatus =
      tarefa.status === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO";

    await api.put(`/tarefas/${tarefa.id}/status`, {
      status: novoStatus
    });

    carregar();
  }

async function registrarTarefa() {
  try {
    const payloadRegistro = {
      tarefa_id: tarefaSelecionada.id,
      funcionario_id: registroForm.funcionario_id,
      descricao: registroForm.descricao,
      quantidade: quantidade
    };

    const { data: registroCriado } = await api.post("/registros", payloadRegistro);

    setModalRegistro(false);
    setRegistroForm({ funcionario_id: "", descricao: "" });
    setQuantidade(1);
    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar tarefa.");
  }
}

const tarefasFiltradas = tarefas
  .filter((t) => {

    if (isCoordenador) {
      if (!nomeCoordenadorLogado) return false;
      if (t.coordenador_nome !== nomeCoordenadorLogado) return false;
    }

    if (isPadrao) {
      if (normalizarNome(t?.funcionario_nome) !== nomeUsuarioLogado) return false;
    }
    if (isSupervisor) {
      if (!setorSupervisorLogado) return false;
      if (normalizarNome(t?.setor_nome) !== normalizarNome(setorSupervisorLogado)) return false;
    }

    if (
      filtroTarefa.length > 0 &&
      !filtroTarefa.some(f => f.value === t.nome)
    ) return false;

    if (
      filtroFuncionario.length > 0 &&
      !filtroFuncionario.some(f => f.value === t.funcionario_nome)
    ) return false;

    if (
      filtroCoord.length > 0 &&
      !filtroCoord.some(f => f.value === t.coordenador_nome)
    ) return false;

    if (
      filtroSetor.length > 0 &&
      !filtroSetor.some(f => f.value === t.setor_nome)
    ) return false;

    if (
      filtroSubsetor.length > 0 &&
      !filtroSubsetor.some(f => f.value === t.subsetor_nome)
    ) return false;

    if (
      filtroSupervisor.length > 0 &&
      !filtroSupervisor.some(f => f.value === t.supervisor_nome)
    ) return false;

    if (
      filtroPeriodicidade.length > 0 &&
      !filtroPeriodicidade.some(f => f.value === t.periodicidade)
    ) return false;

    if (filtroStatus && t.status !== filtroStatus)
      return false;

    return true;
  })
  .sort((a, b) => {
    const setorCompare = (a.setor_nome || "").localeCompare(
      b.setor_nome || "",
      "pt-BR",
      { sensitivity: "base" }
    );
    if (setorCompare !== 0) return setorCompare;

    const subsetorCompare = (a.subsetor_nome || "").localeCompare(
      b.subsetor_nome || "",
      "pt-BR",
      { sensitivity: "base" }
    );
    if (subsetorCompare !== 0) return subsetorCompare;

    return (a.nome || "").localeCompare(
      b.nome || "",
      "pt-BR",
      { sensitivity: "base" }
    );
  });
  
const total = tarefasFiltradas.length;
  
const concluidas = tarefasFiltradas.filter(
  (t) => t.status === "CONCLUIDO"
);

const pendentes = tarefasFiltradas.filter(
  (t) => t.status === "PENDENTE"
);

const naoRegistradas = tarefasFiltradas.filter(
  (t) => Number(t.total_registros) === 0
);

const registradas = tarefasFiltradas.filter(
  (t) => Number(t.total_registros) > 0
);

const portalTarget = typeof document !== "undefined" ? document.body : null;

function montarTextoFiltroSelecionado(filtro) {
  if (!Array.isArray(filtro) || filtro.length === 0) return "Todos";

  const itens = filtro
    .map((item) => String(item?.label || item?.value || "").trim())
    .filter(Boolean);

  return itens.length > 0 ? itens.join(", ") : "Todos";
}

const filtroCoordenacaoRelatorio = montarTextoFiltroSelecionado(filtroCoord);
const filtroSetorRelatorio = montarTextoFiltroSelecionado(filtroSetor);
const dataGeracaoRelatorio = new Date().toLocaleString("pt-BR");

// ðŸ“„ FUNÇÃO PDF (vem depois)
  async function gerarDocumentoRelatorio() {
  const doc = new jsPDF("l", "mm", "a4");
  const dataGeracao = new Date().toLocaleString("pt-BR");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerTitleY = 12;
  const headerTitleFontSize = 18;
  const pageNumberFontSize = 10;
  const pageNumberX = pageWidth - 14;
  const pageNumberY = pageHeight - 6;

const desenharLogoCabecalho = async () => {
  try {
    if (!logoEmpresas) return;

    const getBase64Image = (imgUrl) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        };
        img.onerror = (error) => reject(error);
        img.src = imgUrl;
      });

    const base64 = await getBase64Image(logoEmpresas);

    const maxLogoWidth = 48;
    const maxLogoHeight = 20;
    const proporcaoLogo = 920 / 565;

    let logoWidth = maxLogoWidth;
    let logoHeight = logoWidth / proporcaoLogo;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight * proporcaoLogo;
    }

    const logoX = pageWidth - 10 - logoWidth;
    const logoY = 8 + (maxLogoHeight - logoHeight) / 2;

    doc.addImage(base64, "PNG", logoX, logoY, logoWidth, logoHeight);

  } catch (err) {
    console.warn("Erro ao carregar logo:", err);
  }
};

  const desenharFundoPagina = () => {
    doc.setFillColor(215, 218, 220);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  desenharFundoPagina();
  await desenharLogoCabecalho();

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Gerado em:", 14, 16);
  doc.text(dataGeracao, 35, 16);

  let y = 30;

  const xInfo = 40;
  doc.setFontSize(10);

  const desenharLinhaInfo = (rotulo, valor) => {
    doc.setFont("helvetica", "bold");
    doc.text(rotulo, xInfo, y);
    const larguraRotulo = doc.getTextWidth(`${rotulo} `);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor ?? "-"), xInfo + larguraRotulo, y);
  };

  desenharLinhaInfo("Total de Atividades:", tarefasFiltradas.length);
  y += 6;

  desenharLinhaInfo("Coordenação:", filtroCoordenacaoRelatorio);
  y += 5;
  desenharLinhaInfo("Setor:", filtroSetorRelatorio);
  y += 8;

  const gruposPorCoordenacaoSetorSubsetor = new Map();

  tarefasFiltradas.forEach((t) => {
    const coordenacao = (t.coordenador_nome || "-").toString();
    const setor = (t.setor_nome || "-").toString();
    const subsetor = (t.subsetor_nome || "-").toString();
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
      (t.nome || "-").toString(),
      (t.funcionario_nome || "-").toString(),
      coordenacao,
      (t.supervisor_nome || "-").toString(),
      setor,
      subsetor,
      (t.periodicidade || "-").toString(),
      `${Number(t.porcentagem) || 0}%`
    ]);
  });

  Array.from(gruposPorCoordenacaoSetorSubsetor.values()).forEach((grupo, indiceGrupo) => {
    const partesInfo = [
      { rotulo: "Coordenação:", valor: grupo.coordenacao },
      { rotulo: "Setor:", valor: grupo.setor },
      { rotulo: "Subsetor:", valor: grupo.subsetor }
    ];

    if (indiceGrupo > 0) {
      doc.addPage();
      desenharFundoPagina();
      y = 32;
    }

    doc.setFontSize(11);
    doc.setTextColor(200, 0, 0);
    let xAtual = 40;

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
      margin: { top: 32, left: 40, right: 40, bottom: 16 },
      willDrawPage: (data) => {
        if (data.pageNumber > 1) {
          desenharFundoPagina();
        }
      },
      head: [["Tarefa", "Funcionário", "Coordenação", "Líder", "Setor", "Subsetor", "Periodicidade", "%"]],
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
        fontSize: 10,
        halign: "center",
        valign: "middle"
      },
      alternateRowStyles: {
        fillColor: [225, 235, 212]
      },
      styles: {
        overflow: "linebreak",
        cellPadding: 2,
        halign: "center",
        valign: "middle"
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 26 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 22 },
        7: { cellWidth: 16, halign: "center" }
      }
    });

    y = (doc.lastAutoTable?.finalY || y) + 10;
  });

  const totalPaginas = doc.getNumberOfPages();

  for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual++) {
    doc.setPage(paginaAtual);
    await desenharLogoCabecalho();

    doc.setFont("times", "bold");
    doc.setFontSize(headerTitleFontSize);
    doc.setTextColor(0, 0, 0);
    doc.text("RELATÓRIO DE ATIVIDADES", pageWidth / 2, headerTitleY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(pageNumberFontSize);
    doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pageNumberX, pageNumberY, {
      align: "right"
    });
  }

  return doc;
}

async function handleExportarPDF() {
  const doc = await gerarDocumentoRelatorio();
  doc.save("relatorio_atividades.pdf");
}

async function handleVisualizarPDF() {
  const doc = await gerarDocumentoRelatorio();
  window.open(doc.output("bloburl"), "_blank");
}

function RelatorioPDF() {
  return (
    <Document>
      <Page size="A4" style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Relatório de Atividades
        </Text>

        <Text style={{ fontSize: 11, marginBottom: 6 }}>
          Gerado em: {dataGeracaoRelatorio}
        </Text>

        <Text style={{ fontSize: 12, marginBottom: 4 }}>
          Coordenação: {filtroCoordenacaoRelatorio}
        </Text>

        <Text style={{ fontSize: 12 }}>
          Setor: {filtroSetorRelatorio}
        </Text>

        <Text style={{ marginTop: 15, fontSize: 14 }}>
          Lista:
        </Text>

        {tarefasFiltradas.map((t, i) => (
          <Text key={t.id} style={{ fontSize: 10 }}>
            {i + 1}. {t.nome} | {t.status}
          </Text>
        ))}
      </Page>
    </Document>
  );
}  

function normalizarCaminho(valor) {
  const texto = String(valor || "")
    .trim()
    .replace(/^\"|\"$/g, "");

  if (/^https?:\/\//i.test(texto)) {
    return texto;
  }

  return texto
    .replace(/^file:\/\/\/?/i, "")
    .replace(/\//g, "\\");
}

function ehLinkWeb(caminho) {
  return /^https?:\/\//i.test(String(caminho || "").trim());
}

function extrairCaminhos(valor) {
  const brutoOriginal = String(valor || "").trim();
  if (!brutoOriginal) return [];

  try {
    const possivelArray = JSON.parse(brutoOriginal);
    if (Array.isArray(possivelArray)) {
      return possivelArray
        .map((item) => normalizarCaminho(item))
        .filter(Boolean);
    }
  } catch {
  }

  const bruto = brutoOriginal.replace(/\\r\\n|\\n|\\r/g, "\n");

  return bruto
    .split(/\r?\n|[;|]+/)
    .flatMap((item) =>
      String(item || "").split(
        /,(?=\s*(?:https?:\/\/|file:\/\/|\\\\|[a-zA-Z]:[\\/]))/
      )
    )
    .map((item) => normalizarCaminho(item))
    .filter(Boolean);
}

function serializarCaminhos(lista) {
  return (lista || [])
    .map((item) => normalizarCaminho(item))
    .filter(Boolean)
    .join("\n");
}

function montarFileUriWindows(caminho) {
  const base = normalizarCaminho(caminho);
  if (!base) return "";

  const caminhoUrl = base.replace(/\\/g, "/");
  const isUnc = base.startsWith("\\\\");

  if (isUnc) {
    return `file:${caminhoUrl}`;
  }

  return `file:///${caminhoUrl}`;
}

function possuiDocumentoGravado(valor) {
  return extrairCaminhos(valor).length > 0;
}

return (
    
    <Layout>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px"
    }}
  >
    <h1 style={{ color: "#0047AB" }}>
      Lista de Atividades{usuarioLogado?.nome ? ` - ${usuarioLogado.nome}` : ""}
    </h1>

  <button
  onClick={() => setModalEscolha(true)}
  style={btnRegistrar}
>
  Relatório de Atividades
</button>
  </div>
   <div className="wide-table-card app-filter-bar" style={cardFiltro}>

  {/* TAREFA */}
  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Tarefa"
    value={filtroTarefa}
    onChange={(selected) => setFiltroTarefa(selected || [])}
    options={opcoesTarefaFiltradas}
    noOptionsMessage={() => "Sem opções disponíveis"}
    menuPortalTarget={portalTarget}
    menuPosition="fixed"
    styles={{
    menuPortal: (base) => ({ ...base, zIndex: 9999 })
  }}
    isDisabled={isSupervisor && !!setorSupervisorLogado}
  />

  {/* FUNCIONÁRIO */}
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
  />

  {/* COORDENADOR */}
  <Select
    className="app-filter-select"
    classNamePrefix="app-filter-select"
    isMulti
    placeholder="Coordenador"
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
  />

  {/* SETOR */}
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
  />

  {/* SUBSETOR */}
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
  />

  {/* SUPERVISOR */}
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
  />

  {/* PERIODICIDADE */}
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
  />

  {/* STATUS NORMAL */}
  <select
    className="app-filter-native"
    value={filtroStatus}
    onChange={(e) => setFiltroStatus(e.target.value)}
    style={inputPadrao}
  >
    <option value="">Todos Status</option>
    <option value="PENDENTE">PENDENTE</option>
    <option value="CONCLUIDO">CONCLUIDO</option>
  </select>

  {/* LIMPAR FILTROS */}
  <button
    style={btnExcluirNovo}
    onClick={() => {
      setFiltroTarefa([]);
      setFiltroFuncionario([]);
      setFiltroCoord([]);
      setFiltroSetor([]);
      setFiltroSubsetor([]);
      setFiltroSupervisor([]);
      setFiltroPeriodicidade([]);
      setFiltroStatus("");
    }}
  >
    Limpar Filtros
  </button>


  {isAdmin && (
  <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
    <button
      onClick={() => setModalAgenda(true)}
      style={btnAgendaIcon}
      title="Abrir agenda semanal"
      aria-label="Abrir agenda semanal"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3.5" y="5.5" width="17" height="15" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
        <path d="M3.5 9.5H20.5" stroke="#2563eb" strokeWidth="1.5" />
        <path d="M8 3.8V7.2" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 3.8V7.2" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="7.2" y="11.4" width="3" height="2.6" rx="0.8" fill="#60a5fa" />
        <rect x="11.1" y="11.4" width="3" height="2.6" rx="0.8" fill="#93c5fd" />
        <rect x="15" y="11.4" width="3" height="2.6" rx="0.8" fill="#bfdbfe" />
        <rect x="7.2" y="15.1" width="3" height="2.6" rx="0.8" fill="#93c5fd" />
        <rect x="11.1" y="15.1" width="3" height="2.6" rx="0.8" fill="#bfdbfe" />
      </svg>
    </button>

    <button
      onClick={acionarRobo}
      style={btnRoboIcon}
      title="Automação pelas tarefas filtradas"
      aria-label="Automação pelas tarefas filtradas"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="5" y="7" width="14" height="10" rx="3" fill="#ffffff" stroke="#0f766e" strokeWidth="1.6" />
        <circle cx="10" cy="12" r="1.4" fill="#0f766e" />
        <circle cx="14" cy="12" r="1.4" fill="#0f766e" />
        <path d="M9 15.2H15" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 4V7" stroke="#0f766e" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="3.2" r="1.1" fill="#14b8a6" />
        <path d="M5 12H3.6" stroke="#0f766e" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M20.4 12H19" stroke="#0f766e" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  </div>
)}

</div>

      {isCoordenador && aprovacoesEdicaoAtivas.lista.length > 0 && (
        <div className="edicao-aprovada-card" style={cardNotificacaoLiberacao}>
          <h3 className="edicao-aprovada-title" style={tituloNotificacaoLiberacao}>Edicoes Aprovadas</h3>
          <div className="edicao-aprovada-lista" style={listaNotificacaoLiberacao}>
            {aprovacoesEdicaoAtivas.lista.map((aprovacao) => (
              <div className="edicao-aprovada-item" key={aprovacao.solicitacaoId} style={itemNotificacaoLiberacao}>
                <strong>{aprovacao.tarefaNome}</strong>
                <span>Coordenador: {aprovacao.solicitante}</span>
                <span>Aprovado por: {aprovacao.aprovador}</span>
                <span>Minutos permitidos: {aprovacao.minutosPermitidos}</span>
                <span>Data/Hora aprovação: {aprovacao.aprovadoEm.toLocaleString()}</span>
                <span className="edicao-aprovada-tempo" style={tempoNotificacaoLiberacao}>
                  Tempo restante: {formatarTempoRestante(aprovacao.restanteMs)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

        {isAdmin && (
  <div style={{  textAlign: "right", marginBottom: "15px" }}>
    <button style={btnNovoPequeno} onClick={abrirNovo}>
      + Nova Tarefa
    </button>
  </div>
)}
      

      {isAdmin && (
        <div style={{ textAlign: "right", marginBottom: "15px" }}>
          <button onClick={resetarConcluidas} style={btnNovo}>
            Resetar Concluídas
          </button>
        </div>
      )}

    {/* TABELA */}
  <div className="wide-table-card" style={cardTabela}>

  {/* CONTADOR */}
 <div style={contadorContainer}>
  Mostrando <strong>{tarefasFiltradas.length}</strong> de{" "}
  <strong>{tarefas.length}</strong> atividades
  
  </div>

  <div style={scrollContainer}>
          <table style={tabela}>
            <thead style={thead}>
              <tr>
                <th style={thAtividade}>Atividade</th>
                <th style={thTipo}>Tipo</th>
                <th style={thFuncionario}>Funcionário</th>
                <th style={thSubsetor}>Subsetor</th>
                <th style={thSetor}>Setor</th>
                <th style={thCoordenador}>Coordenador</th>
                <th style={thSupervisor}>Líder</th>
                <th style={thPeriodicidade}>Periodicidade</th>
                <th style={thPercentual}>%</th>
                <th style={thStatus}>Status</th>
                {isCoordenador && (
                  <th style={{ ...th, width: "200px", minWidth: "200px", textAlign: "center" }}>Solicitações</th>
                )}
                {isAdmin && (
                  <th style={{ ...th, width: "260px", minWidth: "260px" }}>Ações</th>
                )}
              </tr>
</thead>
<tbody>
{tarefasFiltradas.map((t) => {
  const permissaoEdicao = aprovacoesEdicaoAtivas.mapa[String(t.id)];
  const linhaLiberada = Boolean(permissaoEdicao);
  const documentosBrutos = String(t.caminho || "").trim();
  const possuiDocumento = possuiDocumentoGravado(documentosBrutos);

  return (
          <tr
                key={t.id}
  onDoubleClick={() => {
    if (modoDescricao) return; // ðŸ”¥ BLOQUEIA SE ESTIVER EM MODO DESCRIÇÃO

    setLinhaSelecionada(
      linhaSelecionada === t.id ? null : t.id
    );
  }}
                 style={{
              backgroundColor:
           linhaSelecionada === t.id
             ? linhaLiberada
               ? "#e9d5ff"
               : "#e0f2fe"
             : linhaLiberada
             ? "#f3e8ff"
             : "white",
               cursor: "pointer"
             }}>
      <td style={tdAtividade}>
  {modoDescricao && linhaSelecionada === t.id ? (
    <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>

  {/* TEXTAREA */}
 <textarea
  className="atividade-descricao-textarea"
  data-id={t.id}
  value={descricaoEditavel}
  disabled={!descricaoLiberada}
  onChange={(e) => setDescricaoEditavel(e.target.value)}
  style={{
    flex: 1,
    resize: "none",
    overflow: "hidden",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "14px"
  }}
  onInput={(e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  }}
/>

  {/* ðŸ”¥ NOVO BOTÃO DE EDIÇÃO */}
  <button
    onClick={async () => {
      if (descricaoLiberada) {
        await api.put(`/tarefas/${linhaSelecionada}`, {
          descricao: descricaoEditavel
        });

        carregar();
      }

      setDescricaoLiberada(!descricaoLiberada);
    }}
    style={{
      background: descricaoLiberada ? "#16a34a" : "#dc2626",
      color: "white",
      border: "none",
      borderRadius: "6px",
      padding: "0 12px",
      cursor: "pointer",
      fontWeight: "600",
      transition: "0.2s"
    }}
  >
    {descricaoLiberada ? "Aberto" : "Fechado"}
  </button>

</div>
) : (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
    <span>{t.nome}</span>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {isCoordenador && permissaoEdicao && (
        <span style={badgeTempoEdicao}>
          Tempo: {formatarTempoRestante(permissaoEdicao.restanteMs)}
        </span>
      )}

      {isAdmin && (
        <button
          style={{
            background: possuiDocumento ? "#16a34a" : "#f59e0b",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "18px",
            cursor: "pointer"
          }}
          title={possuiDocumento ? "Link/caminho salvo" : "Sem link/caminho"}
          onClick={() => {
            setTarefaDocumento(t);
            const listaInicial = extrairCaminhos(documentosBrutos);
            setCaminhosInput(listaInicial.length > 0 ? listaInicial : [""]);
            setModalDocumento(true);
          }}
        >
          📁
        </button>
      )}
    </div>
  </div>
)}
</td>
      <td style={td}>{t.tipo_nome || "-"}</td>
      <td style={td}>{t.funcionario_nome || "-"}</td>
      <td style={td}>{t.subsetor_nome}</td>
      <td style={td}>{t.setor_nome}</td>
      <td style={td}>{t.coordenador_nome}</td>
      <td style={td}>{t.supervisor_nome || "-"}</td>
      <td style={td}>{t.periodicidade}</td>
      <td style={td}>{t.porcentagem}%</td>

      {/* STATUS */}
      <td style={{ ...tdStatus, textAlign: "center" }}>
        {isAdmin ? (
          <button
            onClick={() => mudarStatus(t)}
            style={{
              ...btnStatus,
              backgroundColor:
                t.status === "CONCLUIDO" ? "#1E8E3E" : "#C62828"
            }}
          >
            {t.status}
          </button>
        ) : (
          <span
            style={{
              ...btnStatus,
              backgroundColor: '#bdbdbd',
              color: '#fff',
              display: "inline-block",
              cursor: "not-allowed",
              opacity: 0.7
            }}
          >
            {t.status}
          </span>
        )}
      </td>

      {/* SOLICITAÇÕES - COORDENADOR */}
      {isCoordenador && (
        <td
          style={{
            ...acoesTd,
            width: "200px",
            minWidth: "200px",
            textAlign: "center",
            verticalAlign: "middle",
            padding: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {permissaoEdicao && (
              <button
                style={{ ...btnEditarNovo, width: '170px', margin: 0, borderRadius: '6px' }}
                onClick={() => abrirEditar(t)}
              >
                Editar
              </button>
            )}
            <button
              style={{ ...btnEditarNovo, width: '170px', margin: 0, borderRadius: '6px 6px 0 0', borderBottom: '1px solid #e5e7eb' }}
              onClick={() => solicitarAlteracao("editar", t)}
            >
              Solicitar Edição
            </button>
            <button
              style={{ ...btnExcluirNovo, width: '170px', margin: 0, borderRadius: '0 0 6px 6px' }}
              onClick={() => solicitarAlteracao("deletar", t)}
            >
              Solicitar Exclusão
            </button>
          </div>
        </td>
      )}

      {/* AÃ‡Ã•ES - ADMIN */}
      {isAdmin && (
        <td
          style={{
            ...acoesTd,
            width: "360px",
            minWidth: "360px",
            textAlign: "center",
            verticalAlign: "middle"
          }}
        >
          <div style={acoesContainer}>
            {/* ðŸ”µ REGISTRAR */}
            <button
              style={btnRegistrar}
              onClick={() => {
                setTarefaSelecionada(t);
                setRegistroForm({
                  funcionario_id: t.funcionario_id || "",
                  descricao: ""
                });
                setModalRegistro(true);
              }}
            >
              Registrar
            </button>

            {/* ðŸŸ¢ EDITAR */}
            <button
              style={btnEditarNovo}
              onClick={() => abrirEditar(t)}
            >
              Editar
            </button>

            {/* ðŸ”´ DELETAR */}
            <button
              style={btnExcluirNovo}
              onClick={() => deletar(t.id)}
            >
              Deletar
            </button>
          </div>
        </td>
      )}
    </tr>
  );
})}
</tbody>
          </table>
        </div>
      </div>

      {modalDocumento && (
        <Modal onClose={() => setModalDocumento(false)}>
          <div style={modalDocumentoBox}>
            <div style={modalDocumentoTab} />
            <div style={modalDocumentoHeader}>
              <span style={modalDocumentoIcon}>📁</span>
              <div>
                <h2 style={modalDocumentoTitle}>Pasta de Documentos</h2>
                <p style={modalDocumentoSubtitle}>{tarefaDocumento?.nome || "Tarefa"}</p>
              </div>
            </div>

            <label style={modalDocumentoLabel}>Link da pasta OneDrive/SharePoint (ou caminho de rede)</label>

            {caminhosInput.map((valor, index) => (
              <div key={index} style={linhaDocumentoInput}>
                <input
                  type="text"
                  placeholder="Ex: https://empresa-my.sharepoint.com/sites/Projetos/Documentos/Projeto123"
                  value={valor}
                  onChange={(e) => {
                    const proximos = [...caminhosInput];
                    proximos[index] = e.target.value;
                    setCaminhosInput(proximos);
                  }}
                  style={modalDocumentoInput}
                />

                {caminhosInput.length > 1 && (
                  <button
                    style={btnDocumentoRemover}
                    onClick={() => {
                      const proximos = caminhosInput.filter((_, i) => i !== index);
                      setCaminhosInput(proximos.length > 0 ? proximos : [""]);
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            ))}

            <button
              style={btnDocumentoSecundario}
              onClick={() => setCaminhosInput([...caminhosInput, ""])}
            >
              + Adicionar Caminho
            </button>

            <p style={modalDocumentoHint}>
              Use preferencialmente link de compartilhamento da organização para respeitar permissões da Microsoft.
            </p>

            <div style={modalDocumentoActions}>
              <button
                style={btnDocumentoPrincipal}
                onClick={async () => {
                  const caminhoSerializado = serializarCaminhos(caminhosInput);

                  try {
                    await api.put(`/tarefas/${tarefaDocumento.id}`, {
                      caminho: caminhoSerializado || null
                    });
                    alert(caminhoSerializado ? "Caminho(s) salvo(s) com sucesso!" : "Caminho removido com sucesso!");
                    setModalDocumento(false);
                    carregar();
                  } catch (err) {
                    const msg =
                      err?.response?.data?.erro ||
                      err?.response?.data?.message ||
                      "Não foi possível salvar o caminho.";
                    alert(msg);
                  }
                }}
              >
                Gravar Caminho
              </button>

              <button
                style={btnDocumentoAcao}
                onClick={() => {
                  const listaDigitada = caminhosInput
                    .map((item) => normalizarCaminho(item))
                    .filter(Boolean);

                  const caminhos =
                    listaDigitada.length > 0
                      ? listaDigitada
                      : extrairCaminhos(tarefaDocumento?.caminho || "");

                  if (caminhos.length === 0) {
                    alert("Nenhum link/caminho definido");
                    return;
                  }

                  let abasBloqueadas = 0;

                  caminhos.forEach((caminhoBase) => {
                    if (ehLinkWeb(caminhoBase)) {
                      const aba = window.open(caminhoBase, "_blank", "noopener,noreferrer");
                      if (!aba) abasBloqueadas += 1;
                      return;
                    }

                    const caminhoFormatado = montarFileUriWindows(caminhoBase);
                    const aba = window.open(caminhoFormatado, "_blank", "noopener,noreferrer");
                    if (!aba) abasBloqueadas += 1;
                  });

                  if (abasBloqueadas > 0) {
                    alert(
                      `Foram bloqueadas ${abasBloqueadas} aba(s) pelo navegador. Libere pop-ups para este site.`
                    );
                  }
                }}
              >
                Ver Documentos
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL SOLICITAÇÃO DE ALTERAÇÃO - FORA DA TABELA */}
      {modalSolicitacao && (
        <Modal onClose={() => setModalSolicitacao(false)}>
          <div style={modalBoxPadrao}>
            <h2 style={modalTitlePadrao}>
              Solicitar {tipoSolicitacao === "editar" ? "Edição" : "Exclusão"} de Tarefa
            </h2>
            <div style={modalFormPadrao}>
              <div style={campoPadrao}>
                <label style={labelPadrao}>Motivo</label>
                <textarea
                  style={{ ...inputPadrao, minHeight: 80 }}
                  value={motivoSolicitacao}
                  onChange={e => setMotivoSolicitacao(e.target.value)}
                  placeholder="Descreva o motivo da solicitação..."
                />
              </div>
              <div style={botoesModalPadrao}>
                <button
                  style={btnExcluirNovo}
                  onClick={() => setModalSolicitacao(false)}
                >
                  Cancelar
                </button>
                <button
                  style={btnRegistrar}
                  onClick={enviarSolicitacao}
                >
                  Enviar Solicitação
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
{/* MODAL NOVA / EDITAR TAREFA */}
{modalOpen && (
  <Modal onClose={() => setModalOpen(false)}>
    <div style={modalBoxPadrao}>
      <h2 style={modalTitlePadrao}>
        {editando ? "Editar Tarefa" : "Nova Tarefa"}
      </h2>

      <div style={modalFormPadrao}>
        <div style={campoPadrao}>
          <label style={labelPadrao}>Nome da tarefa</label>
          <input
            style={inputPadrao}
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value })
            }
          />
        </div>

{/* ðŸ”¥ NOVO CAMPO TIPO */}
<div style={campoPadrao}>
  <label style={labelPadrao}>Tipo</label>

  <select
    style={inputPadrao}
    value={form.tipo_id || ""}
    onChange={(e) =>
      setForm({
        ...form,
        tipo_id: e.target.value
      })
    }
  >
    <option value="">Sem Tipo</option>

    {tipos && tipos.length > 0 &&
      tipos.map((t) => (
        <option key={t.id} value={t.id}>
          {t.nome}
        </option>
      ))}
  </select>
</div>

        <div style={campoPadrao}>
          <label style={labelPadrao}>Subsetor</label>
          <select
            style={inputPadrao}
            value={form.subsetor_id}
            onChange={(e) =>
              setForm({ ...form, subsetor_id: e.target.value })
            }
          >
            <option value="">Selecione o subsetor</option>
           {subsetores.map((ss) => (
          <option key={ss.id} value={ss.id}>
                {ss.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={campoPadrao}>
          <label style={labelPadrao}>Líder</label>
          <select
            style={inputPadrao}
            value={form.supervisor_id}
            onChange={(e) =>
              setForm({ ...form, supervisor_id: e.target.value })
            }
          >
            <option value="">Sem Líder</option>
            {supervisores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          
        </div>

        <div style={campoPadrao}>
          <label style={labelPadrao}>Funcionário</label>
          <select
            style={inputPadrao}
            value={form.funcionario_id}
            onChange={(e) =>
              setForm({ ...form, funcionario_id: e.target.value })
            }
          >
            <option value="">Sem Funcionário</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={campoPadrao}>
          <label style={labelPadrao}>Periodicidade</label>
          <select
            style={inputPadrao}
            value={form.periodicidade}
            onChange={(e) =>
              setForm({ ...form, periodicidade: e.target.value })
            }
          >
            <option value="Diário">Diário</option>
            <option value="Semanal">Semanal</option>
            <option value="Mensal">Mensal</option>
            <option value="Demanda">Demanda</option>
          </select>
        </div>

        <div style={campoPadrao}>
          <label style={labelPadrao}>Porcentagem</label>
          <input
            type="number"
            style={inputPadrao}
            value={form.porcentagem}
            onChange={(e) =>
              setForm({ ...form, porcentagem: e.target.value })
            }
          />
        </div>

        <div style={botoesModalPadrao}>
          <button
            style={btnExcluirNovo}
            onClick={() => setModalOpen(false)}
          >
            Cancelar
          </button>

          <button
            style={btnRegistrar}
            onClick={salvar}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  </Modal>
)}

{/* MODAL REGISTRAR */}
{modalRegistro && (
  <Modal
    onClose={() => {
      setModalRegistro(false);
    }}
  >
    <div style={modalBoxPadrao}>
      <h2 style={modalTitlePadrao}>
        Registrar Tarefa
      </h2>

      <div style={modalFormPadrao}>

        {/* FUNCIONÁRIO */}
        <div style={campoPadrao}>
          <label style={labelPadrao}>Funcionário</label>

          <select
            style={inputPadrao}
            value={registroForm.funcionario_id || ""}
            onChange={(e) =>
              setRegistroForm({
                ...registroForm,
                funcionario_id: e.target.value
              })
            }
          >
            <option value="">Selecione o funcionário</option>

            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        {/* DESCRIÇÃO */}
        <div style={campoPadrao}>
          <label style={labelPadrao}>Descrição</label>

          <textarea
            style={{
              ...inputPadrao,
              minHeight: "100px",
              resize: "vertical"
            }}
            placeholder="Descreva o que foi realizado..."
            value={registroForm.descricao}
            onChange={(e) =>
              setRegistroForm({
                ...registroForm,
                descricao: e.target.value
              })
            }
          />
        </div>
        {/* QUANTIDADE */}
<div style={campoPadrao}>
  <label style={labelPadrao}>Quantidade</label>

 <input
  type="number"
  step="1"
  style={inputPadrao}
  value={quantidade}
  onChange={(e) => {
    const valor = parseInt(e.target.value, 10);

    if (!isNaN(valor)) {
      setQuantidade(valor);
    } else {
      setQuantidade(0);
    }
  }}
/>
</div>

        {/* BOTÕES */}
        <div style={botoesModalPadrao}>
          <button
            style={btnExcluirNovo}
            onClick={() => {
              setModalRegistro(false);
            }}
          >
            Cancelar
          </button>

          <button
            style={btnRegistrar}
            onClick={registrarTarefa}
          >
            Confirmar Registro
          </button>
        </div>

      </div>
    </div>
  </Modal>
)}

{modalAgenda && (
  <Modal
    size="lg"
    onClose={() => setModalAgenda(false)}
    contentStyle={{
      maxWidth: "min(98vw, 1180px)",
      width: "min(98vw, 1180px)",
      padding: "16px",
      margin: "0 10px"
    }}
  >
    <div style={agendaModalBox}>

      <div style={agendaHeader}>
        <h2 style={agendaTitulo}>Agenda Semanal</h2>
      </div>

      <div style={agendaTabelaWrapper}>
        <table style={agendaTabela}>
          <thead>
            <tr>
              <th style={agendaTh}>Segunda</th>
              <th style={agendaTh}>Terça</th>
              <th style={agendaTh}>Quarta</th>
              <th style={agendaTh}>Quinta</th>
              <th style={agendaTh}>Sexta</th>
            </tr>
          </thead>

          <tbody>
            {agenda.map((linha, i) => (
              <tr key={i}>
                {linha.map((celula, j) => {

                  const selecionada =
                    celulaSelecionada?.linha === i &&
                    celulaSelecionada?.coluna === j;
                  const celulaComSetor = Boolean(String(celula || "").trim());

                  return (
                  <td
                    key={j}
                    onClick={() =>
                      setCelulaSelecionada({ linha: i, coluna: j })
                    }

                    onDoubleClick={() => {
                      const setor = agenda[i][j];
                      if (!setor) return;

                      setFiltroSetor([{ value: setor, label: setor }]);
                      setModalAgenda(false);
                    }}

                    style={{
                      ...agendaTd,
                      background: selecionada
                        ? "#dbeafe"
                        : celulaComSetor
                        ? "#fdf8c4"
                        : "#fff"
                    }}
                  >
                    {editandoAgenda ? (
                      <select
                        value={celula || ""}
                        onChange={(e) => {
                          const novaAgenda = agenda.map((l) => [...l]);
                          novaAgenda[i][j] = e.target.value;
                          setAgenda(novaAgenda);
                        }}
                        style={{
                          width: "100%",
                          minHeight: "40px",
                          padding: "8px 26px 8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #93c5fd",
                          outline: "none",
                          background: celulaComSetor ? "#fef3c7" : "#eff6ff",
                          textAlign: "left",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1f2937",
                          cursor: "pointer",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          backgroundImage:
                            "linear-gradient(45deg, transparent 50%, #2563eb 50%), linear-gradient(135deg, #2563eb 50%, transparent 50%)",
                          backgroundPosition: "calc(100% - 14px) 50%, calc(100% - 8px) 50%",
                          backgroundSize: "6px 6px, 6px 6px",
                          backgroundRepeat: "no-repeat",
                          boxShadow: "0 1px 2px rgba(37, 99, 235, 0.15)"
                        }}
                      >
                        <option value="">Selecione</option>

                        {setores.map((s) => (
                          <option key={s.id} value={s.nome}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        style={{
                          ...agendaCelulaTexto,
                          background: celulaComSetor ? "#fef3c7" : "#f8fafc"
                        }}
                      >
                        {celula || "Selecione"}
                      </div>
                    )}

                      
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        <button
          style={btnEditarNovo}
          onClick={() => setEditandoAgenda(true)}
        >
          Editar
        </button>

        <button style={btnRegistrar} onClick={salvarAgenda}>
          Salvar Agenda
        </button>
    </div>
  </Modal>
)}
      
      {/* MODAL ESCOLHA RELATÓRIO */}
{modalEscolha && (
  <Modal onClose={() => setModalEscolha(false)}>
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2 style={{ marginBottom: "20px" }}>
        O que deseja fazer?
      </h2>

      <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
        <button
          style={btnRegistrar}
          onClick={() => {
            setModalEscolha(false);
            handleVisualizarPDF();
          }}
        >
          Visualizar PDF
        </button>

        <button
          style={btnEditarNovo}
          onClick={() => {
            setModalEscolha(false);
            handleExportarPDF();
          }}
        >
          Baixar PDF
        </button>
      </div>
    </div>
  </Modal>
)}
    </Layout>
  );
}

/* ================= ESTILOS ================= */

const scrollContainer = {
  maxHeight: "700px",
  overflowY: "auto",
  overflowX: "auto"
};

const tabela = {
  minWidth: "clamp(980px, 145vw, 2400px)",
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed"
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
  fontWeight: "700",
  textAlign: "left"
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #eee",
  borderRight: "1px solid #e5e7eb"
};

/* ðŸ”¹ ATIVIDADE FIXA */
const thAtividade = {
  ...th,
  width: "400px"
};

const tdAtividade = {
  ...td,
  width: "400px",
  whiteSpace: "normal",
  wordBreak: "break-word"
};

/* ðŸ”¹ SUBSETOR */
const thSubsetor = {
  ...th,
  width: "180px"
};

/* ðŸ”¹ SETOR */
const thSetor = {
  ...th,
  width: "180px"
};

/* ðŸ”¹ COORDENADOR */
const thCoordenador = {
  ...th,
  width: "220px"
};

/* ðŸ”¹ SUPERVISOR */
const thSupervisor = {
  ...th,
  width: "180px"
};

/* ðŸ”¹ PERIODICIDADE */
const thPeriodicidade = {
  ...th,
  width: "140px",
  textAlign: "center"
};

/* ðŸ”¹ PORCENTAGEM */
const thPercentual = {
  ...th,
  width: "90px",
  textAlign: "center"
};

/* ðŸ”¹ STATUS */
const thStatus = {
  ...th,
  width: "140px",
  textAlign: "center"
};

/* ðŸ”¹ AÃ‡Ã•ES */
const thAcoes = {
  ...th,
  width: "210px",
  textAlign: "center"
};

const acoesTd = {
  ...td,
  width: "210px",
  textAlign: "center"
};

const acoesContainer = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center"
};

const modalDocumentoBox = {
  background: "#0f172a",
  borderRadius: "16px",
  padding: "22px",
  minWidth: "440px",
  maxWidth: "560px",
  boxShadow: "0 16px 36px rgba(2, 8, 23, 0.55)",
  border: "1px solid #334155",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  position: "relative",
  marginTop: "18px"
};

const modalDocumentoTab = {
  position: "absolute",
  top: "-18px",
  left: "14px",
  width: "150px",
  height: "26px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderBottom: "none",
  borderRadius: "14px 14px 0 0",
  boxShadow: "0 6px 14px rgba(2, 8, 23, 0.4)"
};

const modalDocumentoHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  background: "#111827",
  borderRadius: "10px",
  border: "1px solid #334155",
  padding: "10px 12px"
};

const modalDocumentoIcon = {
  fontSize: "28px",
  lineHeight: 1.2
};

const modalDocumentoTitle = {
  margin: 0,
  color: "#f8fafc",
  fontSize: "30px",
  fontWeight: 800,
  lineHeight: 1.15
};

const modalDocumentoSubtitle = {
  margin: "4px 0 0",
  color: "#93c5fd",
  fontSize: "22px",
  fontWeight: 600,
  lineHeight: 1.35
};

const modalDocumentoLabel = {
  marginTop: "4px",
  color: "#e5e7eb",
  fontSize: "19px",
  fontWeight: 700
};

const modalDocumentoInput = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0b1220",
  fontSize: "16px",
  color: "#f8fafc",
  outline: "none"
};

const linhaDocumentoInput = {
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const modalDocumentoHint = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "16px",
  lineHeight: 1.4
};

const modalDocumentoActions = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "2px"
};

const btnDocumentoPrincipal = {
  background: "#2563eb",
  color: "white",
  border: "none",
  fontWeight: "700",
  cursor: "pointer",
  padding: "8px 14px",
  fontSize: "16px",
  borderRadius: "8px"
};

const btnDocumentoSecundario = {
  background: "#16a34a",
  color: "white",
  border: "none",
  fontWeight: "700",
  cursor: "pointer",
  padding: "8px 14px",
  fontSize: "16px",
  borderRadius: "8px"
};

const btnDocumentoRemover = {
  background: "#dc2626",
  color: "white",
  border: "none",
  fontWeight: "700",
  cursor: "pointer",
  padding: "8px 10px",
  fontSize: "14px",
  borderRadius: "8px",
  minWidth: "36px"
};

const btnDocumentoAcao = {
  background: "#16a34a",
  color: "white",
  border: "none",
  fontWeight: "700",
  cursor: "pointer",
  padding: "8px 14px",
  fontSize: "16px",
  borderRadius: "8px"
};

const cardTabela = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  overflow: "hidden"
};
const cardFiltro = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px",
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  marginBottom: "20px"
};

const cardNotificacaoLiberacao = {
  background: "#faf5ff",
  border: "1px solid #e9d5ff",
  borderRadius: "14px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  padding: "16px 20px",
  marginBottom: "16px"
};

const tituloNotificacaoLiberacao = {
  color: "#6b21a8",
  margin: 0,
  marginBottom: "12px"
};

const listaNotificacaoLiberacao = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "10px"
};

const itemNotificacaoLiberacao = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "#f3e8ff",
  fontSize: "18px",
  color: "#4c1d95"
};

const tempoNotificacaoLiberacao = {
  marginTop: "2px",
  fontWeight: "700"
};

const badgeTempoEdicao = {
  background: "#7e22ce",
  color: "white",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "18px",
  fontWeight: "700",
  whiteSpace: "nowrap"
};

const btnRegistrar = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "0.2s"
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
  transition: "0.2s"
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
  transition: "0.2s"
};

const btnStatus = {
  padding: "6px 12px",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const tdStatus = {
  ...td,
  width: "135px",
  textAlign: "center"
};

const thFuncionario = {
  ...th,
  width: "180px"
};
const modalBoxPadrao = {
  padding: "10px 5px"
};

const modalTitlePadrao = {
  fontSize: "22px",
  fontWeight: "700",
  marginBottom: "20px"
};

const modalFormPadrao = {
  display: "flex",
  flexDirection: "column",
  gap: "18px"
};

const campoPadrao = {
  display: "flex",
  flexDirection: "column",
  gap: "6px"
};

const labelPadrao = {
  fontSize: "18px",
  fontWeight: "600"
};

const inputPadrao = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px"
};

const botoesModalPadrao = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "10px"
};
const thTipo = {
  ...th,
  width: "143px"
};

const contadorContainer = {
  padding: "15px 20px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937"
};

const btnNovo = {
  padding: "8px 20px",
  background: "#f1493d",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "600",
  transition: "0.2s",
  marginLeft: "1460px",
  boxShadow: "0 4px 12px rgba(0,71,171,0.2)",
  cursor: "pointer"
  
};


const btnNovoPequeno = {
  background: "#0047AB",
  color: "white",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,71,171,0.2)",
  transition: "0.2s",
  marginLeft: "1460px"
};

const btnAgendaIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  border: "1px solid #93c5fd",
  background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.2)",
  transition: "all 0.2s ease"
};

const btnRoboIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  border: "1px solid #5eead4",
  background: "linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 20px rgba(13, 148, 136, 0.22)",
  transition: "all 0.2s ease",
  marginLeft: "12px"
};

const agendaTh = {
  border: "1px solid #ccc",
  padding: "12px 10px",
  background: "#f3f4f6",
  fontWeight: "700",
  textAlign: "center",
  minWidth: "160px",
  width: "20%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  lineHeight: 1.25
};

const agendaTd = {
  border: "1px solid #8e6f71",
  padding: "8px",
  cursor: "pointer",
  height: "76px",
  textAlign: "center",
  minWidth: "160px",
  width: "20%",
  verticalAlign: "top"
};

const agendaModalBox = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  width: "100%",
  maxWidth: "100%",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
};

const agendaHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "10px"
};

const agendaTitulo = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "700",
  color: "#1f2937"
};

const agendaTabelaWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  overflowY: "auto",
  maxHeight: "50vh",
  borderRadius: "8px"
};

const agendaTabela = {
  borderCollapse: "collapse",
  tableLayout: "fixed",
  width: "100%",
  minWidth: "900px"
};

const agendaCelulaTexto = {
  width: "100%",
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#1f2937",
  fontSize: "13px",
  fontWeight: "500",
  textAlign: "center",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  lineHeight: 1.25
};
const agendaAcoes = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  borderTop: "1px solid #e5e7eb",
  paddingTop: "15px"
};









