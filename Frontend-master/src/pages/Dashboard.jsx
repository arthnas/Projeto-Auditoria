


// ...existing code...




import { useEffect, useState, useContext, useMemo } from "react";
import Select from "react-select";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, LabelList, Brush,
  AreaChart, Area
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { DateRangePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";





export default function Dashboard() {
  const { token } = useContext(AuthContext);
  const usuarioLogado = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tipoUsuario = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isCoordenador = tipoUsuario === "COORDENADOR";
  const isSupervisor = tipoUsuario === "SUPERVISOR";
  const isPadrao = tipoUsuario === "PADRAO";
  const podeVerGraficoConcluidasPorDia = !isPadrao && !isSupervisor && !isCoordenador;
  const loginUsuarioLogado = String(usuarioLogado?.usuario || "").trim();
  const nomeUsuarioLogadoExibicao = String(
    usuarioLogado?.nome || usuarioLogado?.name || ""
  ).trim();
  const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
  const [nomeUsuarioPerfilExibicao, setNomeUsuarioPerfilExibicao] = useState(
    nomeUsuarioLogadoExibicao
  );
  const [nomeCoordenadorLogado, setNomeCoordenadorLogado] = useState("");
    // Estado para seleção de gráficos no relatório
    const [graficosSelecionados, setGraficosSelecionados] = useState([
      "grafico-impactos",
      "grafico-setor",
      "grafico-funcionario",
      "grafico-periodo"
    ]);
  // Drilldown de gráficos (deve estar dentro do componente)
  const [drilldownDia, setDrilldownDia] = useState(null);
  const [drilldownCoord, setDrilldownCoord] = useState(null);
  const [drilldownSetor, setDrilldownSetor] = useState(null);
    // Listas para filtros
    const [coordenadores, setCoordenadores] = useState([]);
    const [setores, setSetores] = useState([]);
    const [subsetores, setSubsetores] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const portalTarget = typeof document !== "undefined" ? document.body : null;
    const [isMobileView, setIsMobileView] = useState(
      typeof window !== "undefined" ? window.innerWidth <= 768 : false
    );

    useEffect(() => {
      function atualizarViewport() {
        setIsMobileView(window.innerWidth <= 768);
      }

      atualizarViewport();
      window.addEventListener("resize", atualizarViewport);
      return () => window.removeEventListener("resize", atualizarViewport);
    }, []);

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
          if (nome) {
            if (ativo) setNomeUsuarioPerfilExibicao(nome);
            return;
          }
        } catch {
        }

        if (ativo) {
          setNomeUsuarioPerfilExibicao(nomeToken);
        }
      }

      resolverNomePerfil();

      return () => {
        ativo = false;
      };
    }, [idUsuarioLogado, loginUsuarioLogado, usuarioLogado?.nome, usuarioLogado?.name]);

    // Filtros multi-select
    const [filtroCoord, setFiltroCoord] = useState([]);
        useEffect(() => {
          if (!isCoordenador) return;
          if (!nomeCoordenadorLogado) return;

          if (
            filtroCoord.length !== 1 ||
            String(filtroCoord[0]?.value || "").trim() !== nomeCoordenadorLogado
          ) {
            setFiltroCoord([
              {
                value: nomeCoordenadorLogado,
                label: nomeCoordenadorLogado
              }
            ]);
          }
        }, [isCoordenador, nomeCoordenadorLogado, filtroCoord]);
  const [filtroSetorMulti, setFiltroSetorMulti] = useState([]);
  const [filtroSubsetor, setFiltroSubsetor] = useState([]);
  const [filtroSupervisor, setFiltroSupervisor] = useState([]);
  const [filtroFuncionario, setFiltroFuncionario] = useState([]);
  const [filtrosRestaurados, setFiltrosRestaurados] = useState(false);
    // Drilldown coordenador > setor > subsetor
    const [coordenadorSelecionado] = useState(null);
    const [setorSelecionado] = useState(null);
    const [registros, setRegistros] = useState([]);
  const [graficoAtivo, setGraficoAtivo] = useState(1);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
    const chavePersistencia = useMemo(
      () => `dashboard:estado:${String(usuarioLogado?.tipo || "anon").trim().toLowerCase()}:${idUsuarioLogado || "sem-id"}`,
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
      try {
        const bruto = localStorage.getItem(chavePersistencia);
        if (!bruto) {
          setFiltrosRestaurados(true);
          return;
        }
        const salvo = JSON.parse(bruto);
        setFiltroCoord(normalizarSelecaoPersistida(salvo?.filtroCoord));
        setFiltroSetorMulti(normalizarSelecaoPersistida(salvo?.filtroSetorMulti));
        setFiltroSubsetor(normalizarSelecaoPersistida(salvo?.filtroSubsetor));
        setFiltroSupervisor(normalizarSelecaoPersistida(salvo?.filtroSupervisor));
        setFiltroFuncionario(normalizarSelecaoPersistida(salvo?.filtroFuncionario));
        setFiltroDataInicio(String(salvo?.filtroDataInicio || ""));
        setFiltroDataFim(String(salvo?.filtroDataFim || ""));
        if (Number.isInteger(salvo?.graficoAtivo) && salvo.graficoAtivo >= 1 && salvo.graficoAtivo <= 5) {
          const graficoSalvo = salvo.graficoAtivo;
          if (graficoSalvo === 5 && !podeVerGraficoConcluidasPorDia) {
            setGraficoAtivo(1);
          } else {
            setGraficoAtivo(graficoSalvo);
          }
        }
      } catch {
      } finally {
        setFiltrosRestaurados(true);
      }
    }, [chavePersistencia, podeVerGraficoConcluidasPorDia]);

    useEffect(() => {
      if (!podeVerGraficoConcluidasPorDia && graficoAtivo === 5) {
        setGraficoAtivo(1);
      }
    }, [podeVerGraficoConcluidasPorDia, graficoAtivo]);

    useEffect(() => {
      if (!filtrosRestaurados) return;
      const estado = {
        filtroCoord,
        filtroSetorMulti,
        filtroSubsetor,
        filtroSupervisor,
        filtroFuncionario,
        filtroDataInicio,
        filtroDataFim,
        graficoAtivo
      };
      try {
        localStorage.setItem(chavePersistencia, JSON.stringify(estado));
      } catch {
      }
    }, [
      filtrosRestaurados,
      chavePersistencia,
      filtroCoord,
      filtroSetorMulti,
      filtroSubsetor,
      filtroSupervisor,
      filtroFuncionario,
      filtroDataInicio,
      filtroDataFim,
      graficoAtivo
    ]);
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
    // Estados para histórico de concluídas
    const [historicoConcluidas, setHistoricoConcluidas] = useState([]);



    // ================= HISTÓRICO CONCLUÍDAS E AGRUPAMENTOS =================
    // Filtrar histórico de concluídas pelo período selecionado
    const historicoFiltrado = historicoConcluidas.filter(item => {
      if (!item.data) return true;
      const data = item.data.split("T")[0];
      if (filtroDataInicio && data < filtroDataInicio) return false;
      if (filtroDataFim && data > filtroDataFim) return false;
      return true;
    });

    // Agrupar histórico filtrado por data para gráfico de área e calcular média por hora acumulada
    const concluidasPorDia = {};
    const horasPorDia = {};
    historicoFiltrado.forEach(item => {
      if (!item.data) return;
      const [data, hora] = item.data.split("T");
      concluidasPorDia[data] = (concluidasPorDia[data] || 0) + (Number(item.total_concluidas) || Number(item.total) || 1);
      if (hora) {
        if (!horasPorDia[data]) horasPorDia[data] = new Set();
        horasPorDia[data].add(hora.slice(0,2)); // considera hora cheia
      }
    });
    // Monta array de dados para o gráfico, incluindo média por hora acumulada
    const sortedEntries = Object.entries(concluidasPorDia).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    let somaAcumulada = 0;
    let horasAcumuladas = 0;
    const dadosAreaConcluidas = sortedEntries.map(([data, total]) => {
      somaAcumulada += total;
      const horasDia = horasPorDia[data] ? horasPorDia[data].size : 0;
      horasAcumuladas += horasDia;
      const mediaPorHora = horasAcumuladas > 0 ? somaAcumulada / horasAcumuladas : 0;
      return { data, total, mediaPorHora };
    });

    // Drilldown: dados para gráficos
    // 1. Coordenações do dia
    let dadosCoordPorDia = [];
    if (drilldownDia) {
      const porCoord = {};
      historicoFiltrado.forEach(item => {
        if (!item.data) return;
        const data = item.data.split("T")[0];
        if (data !== drilldownDia) return;
        const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
        porCoord[coord] = (porCoord[coord] || 0) + (Number(item.total_concluidas) || Number(item.total) || 1);
    });
      dadosCoordPorDia = Object.entries(porCoord).map(([nome, total]) => ({ nome, total }));
    }
    // 2. Setores da coordenação
    let dadosSetorPorCoord = [];
    if (drilldownDia && drilldownCoord) {
      const porSetor = {};
      historicoFiltrado.forEach(item => {
        if (!item.data) return;
        const data = item.data.split("T")[0];
        if (data !== drilldownDia) return;
        const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
        if (coord !== drilldownCoord) return;
        const setor = item.setor_nome || item.setor_id || 'Sem Setor';
        porSetor[setor] = (porSetor[setor] || 0) + (Number(item.total_concluidas) || Number(item.total) || 1);
    });
      dadosSetorPorCoord = Object.entries(porSetor).map(([nome, total]) => ({ nome, total }));
    }
    // 3. Subsetores do setor
    let dadosSubsetorPorSetor = [];
    if (drilldownDia && drilldownCoord && drilldownSetor) {
      const porSubsetor = {};
      historicoFiltrado.forEach(item => {
        if (!item.data) return;
        const data = item.data.split("T")[0];
        if (data !== drilldownDia) return;
        const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
        if (coord !== drilldownCoord) return;
        const setor = item.setor_nome || item.setor_id || 'Sem Setor';
        if (setor !== drilldownSetor) return;
        const subsetor = item.subsetor_nome || item.subsetor_id || 'Sem Subsetor';
        porSubsetor[subsetor] = (porSubsetor[subsetor] || 0) + (Number(item.total_concluidas) || Number(item.total) || 1);
    });
      dadosSubsetorPorSetor = Object.entries(porSubsetor).map(([nome, total]) => ({ nome, total }));
    }

  // Agrupamentos dependentes do estado
  // Agrupa histórico por coordenador
  const historicoPorCoordenador = {};
  historicoFiltrado.forEach(item => {
    const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
    if (!historicoPorCoordenador[coord]) historicoPorCoordenador[coord] = 0;
    historicoPorCoordenador[coord] += Number(item.total_concluidas) || Number(item.total) || 0;
    });
  // eslint-disable-next-line no-unused-vars
  const dadosCoordenador = Object.entries(historicoPorCoordenador).map(([nome, total]) => ({ nome, total }));

  // Agrupa histórico por setor do coordenador selecionado
  let dadosSetorCoord = [];
  if (coordenadorSelecionado) {
    const setores = {};
    historicoFiltrado.forEach(item => {
      const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
      if (coord !== coordenadorSelecionado) return;
      const setor = item.setor_nome || item.setor_id || 'Sem Setor';
      setores[setor] = (setores[setor] || 0) + (Number(item.total_concluidas) || Number(item.total) || 0);
    });
    // eslint-disable-next-line no-unused-vars
    dadosSetorCoord = Object.entries(setores).map(([nome, total]) => ({ nome, total }));
  }

  // Agrupa histórico por subsetor do setor selecionado
  let dadosSubsetorSetor = [];
  if (setorSelecionado && coordenadorSelecionado) {
    const subsetores = {};
    historicoFiltrado.forEach(item => {
      const coord = item.coordenador_nome || item.coordenador_id || 'Sem Coordenação';
      const setor = item.setor_nome || item.setor_id || 'Sem Setor';
      if (coord !== coordenadorSelecionado || setor !== setorSelecionado) return;
      const subsetor = item.subsetor_nome || item.subsetor_id || 'Sem Subsetor';
      subsetores[subsetor] = (subsetores[subsetor] || 0) + (Number(item.total_concluidas) || Number(item.total) || 0);
    });
    // eslint-disable-next-line no-unused-vars
    dadosSubsetorSetor = Object.entries(subsetores).map(([nome, total]) => ({ nome, total }));
  }

  // const [tarefas, setTarefas] = useState([]); // Removido: não utilizado
  // const [historicoConcluidas, setHistoricoConcluidas] = useState([]); // Removido pois não é utilizado
  // const [diaSelecionado, setDiaSelecionado] = useState(null); // Removido: não utilizado


  

  async function carregar() {
    const [r, c, s, ss, f] = await Promise.all([
      api.get("/registros"),
      api.get("/coordenadores"),
      api.get("/setores"),
      api.get("/subsetores"),
      api.get("/funcionarios")
    ]);
    setRegistros(r.data);
    setCoordenadores(c.data);
    setSetores(s.data);
    setSubsetores(ss.data);
    setFuncionarios(f.data);
    // Busca histórico de concluídas
    try {
      const hist = await api.get("/tarefas/historico-concluidas");
      setHistoricoConcluidas(hist.data);
    } catch {
      setHistoricoConcluidas([]);
    }
  }



  useEffect(() => {
    (async () => {
      await carregar();
    })();
  }, []);

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
      return true;
    });
  }, [registros, filtroDataInicio, filtroDataFim, isCoordenador, nomeCoordenadorLogado, isSupervisor, setorSupervisorLogado]);

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

  function filtrarParaOpcoes(campoIgnorado) {
    return registrosBaseParaOpcoes.filter((registro) => {
      if (campoIgnorado !== "coord" && !correspondeSelecao(filtroCoord, registro.coordenador_nome)) return false;
      if (campoIgnorado !== "setor" && !correspondeSelecao(filtroSetorMulti, registro.setor_nome)) return false;
      if (campoIgnorado !== "subsetor" && !correspondeSelecao(filtroSubsetor, registro.subsetor_nome)) return false;
      if (campoIgnorado !== "supervisor" && !correspondeSelecao(filtroSupervisor, registro.supervisor_nome)) return false;
      if (campoIgnorado !== "funcionario" && !correspondeSelecao(filtroFuncionario, registro.funcionario_nome)) return false;
      return true;
    });
  }

  const opcoesCoordFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("coord"), "coordenador_nome"),
    [registrosBaseParaOpcoes, filtroSetorMulti, filtroSubsetor, filtroSupervisor, filtroFuncionario]
  );

  const opcoesSetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("setor"), "setor_nome"),
    [registrosBaseParaOpcoes, filtroCoord, filtroSubsetor, filtroSupervisor, filtroFuncionario]
  );

  const opcoesSubsetorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("subsetor"), "subsetor_nome"),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetorMulti, filtroSupervisor, filtroFuncionario]
  );

  const opcoesSupervisorFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("supervisor"), "supervisor_nome"),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetorMulti, filtroSubsetor, filtroFuncionario]
  );

  const opcoesFuncionarioFiltradas = useMemo(
    () => criarOpcoesUnicas(filtrarParaOpcoes("funcionario"), "funcionario_nome"),
    [registrosBaseParaOpcoes, filtroCoord, filtroSetorMulti, filtroSubsetor, filtroSupervisor]
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
    if ((registros || []).length === 0) return;

    setFiltroCoord((atual) => sincronizarSelecaoValida(atual, opcoesCoordFiltradas));
    setFiltroSetorMulti((atual) => sincronizarSelecaoValida(atual, opcoesSetorFiltradas));
    setFiltroSubsetor((atual) => sincronizarSelecaoValida(atual, opcoesSubsetorFiltradas));
    setFiltroSupervisor((atual) => sincronizarSelecaoValida(atual, opcoesSupervisorFiltradas));
    if (!isPadrao) {
      setFiltroFuncionario((atual) => sincronizarSelecaoValida(atual, opcoesFuncionarioFiltradas));
    }
  }, [
    opcoesCoordFiltradas,
    opcoesSetorFiltradas,
    opcoesSubsetorFiltradas,
    opcoesSupervisorFiltradas,
    opcoesFuncionarioFiltradas,
    filtrosRestaurados,
    isSupervisor,
    isPadrao,
    registros
  ]);

  useEffect(() => {
    if (!isSupervisor) return;
    if (!setorSupervisorLogado) return;

    if (
      filtroSetorMulti.length !== 1 ||
      normalizarNome(filtroSetorMulti[0]?.value || "") !== normalizarNome(setorSupervisorLogado)
    ) {
      setFiltroSetorMulti([
        {
          value: setorSupervisorLogado,
          label: setorSupervisorLogado
        }
      ]);
    }
  }, [isSupervisor, setorSupervisorLogado, filtroSetorMulti]);

  useEffect(() => {
    if (!isSupervisor) return;
    if ((filtroSupervisor || []).length === 0) return;
    setFiltroSupervisor([]);
  }, [isSupervisor, filtroSupervisor]);

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

  // ================= FILTROS =================

  const registrosFiltrados = registros.filter(r => {
    const dataRegistro = r.data_registro.split("T")[0];
    if (filtroDataInicio && dataRegistro < filtroDataInicio) return false;
    if (filtroDataFim && dataRegistro > filtroDataFim) return false;
    if (isCoordenador) {
      if (!nomeCoordenadorLogado) return false;
      if (r.coordenador_nome !== nomeCoordenadorLogado) return false;
    }
    if (isSupervisor) {
      if (!setorSupervisorLogado) return false;
      if (normalizarNome(r.setor_nome) !== normalizarNome(setorSupervisorLogado)) return false;
    }
    if (isPadrao) {
      if (normalizarNome(r.funcionario_nome) !== nomeUsuarioLogado) return false;
    }
    if (filtroCoord.length > 0 && !filtroCoord.some(f => f.value === r.coordenador_nome)) return false;
    if (filtroSetorMulti.length > 0 && !filtroSetorMulti.some(f => f.value === r.setor_nome)) return false;
    if (filtroSubsetor.length > 0 && !filtroSubsetor.some(f => f.value === r.subsetor_nome)) return false;
    if (
      filtroSupervisor.length > 0 &&
      !filtroSupervisor.some(f => normalizarNome(f.value) === normalizarNome(r.supervisor_nome))
    ) return false;
    if (
      filtroFuncionario.length > 0 &&
      !filtroFuncionario.some(f => normalizarNome(f.value) === normalizarNome(r.funcionario_nome))
    ) return false;
    return true;
    });
  
// const historicoFiltrado = ... (removido pois não é utilizado)
  // ================= AGRUPAMENTOS =================

  function agruparPor(campo) {
    const agrupado = {};
    registrosFiltrados.forEach(r => {
      const chave = r[campo] || "Sem Informação";
      agrupado[chave] = (agrupado[chave] || 0) + 1;
    });
    return Object.keys(agrupado).map(k => ({ nome: k, total: agrupado[k] }));
  }

  function agruparSetorComPorcentagem() {
    const agrupado = {};
    registrosFiltrados.forEach(r => {
      const nome = r.setor_nome || "Sem Informação";
      if (!agrupado[nome]) {
        agrupado[nome] = { nome, total: 0, somaPorcentagem: 0 };
      }
      agrupado[nome].total += 1;
      agrupado[nome].somaPorcentagem += Number(r.porcentagem || 0);
    });
    return Object.values(agrupado);
  }

  function agruparFuncionarioComPorcentagem() {
    const agrupado = {};
    registrosFiltrados.forEach(r => {
      const nome = r.funcionario_nome || "Sem Informação";
      if (!agrupado[nome]) {
        agrupado[nome] = { nome, total: 0, somaPorcentagem: 0 };
      }
      agrupado[nome].total += 1;
      agrupado[nome].somaPorcentagem += Number(r.porcentagem || 0);
    });
    return Object.values(agrupado);
  }

  function agruparPorPeriodo() {
    const agrupado = {};
    registrosFiltrados.forEach(r => {
      const dataObj = new Date(r.data_registro);
      const dataFormatada = dataObj.toLocaleDateString();
      if (!agrupado[dataFormatada]) {
        agrupado[dataFormatada] = { data: dataFormatada, dataOriginal: dataObj, total: 0 };
      }
      agrupado[dataFormatada].total += 1;
    });

    return Object.values(agrupado)
      .sort((a, b) => a.dataOriginal - b.dataOriginal)
      .map(({ data, total }) => ({ data, total }));
  }

  // const cores = [...] // Removido pois não é utilizado
    

  // Gera dados dos subsetores com soma das porcentagens
  const dadosSubsetorRaw = agruparPor("subsetor_nome");
  // Calcula soma das porcentagens para cada subsetor
  const porcentagensPorSubsetor = {};
  registrosFiltrados.forEach(r => {
    const nome = r["subsetor_nome"] || "Sem Informação";
    porcentagensPorSubsetor[nome] = (porcentagensPorSubsetor[nome] || 0) + Number(r.porcentagem || 0);
    });
  // Junta os dados para o gráfico
  const dadosSubsetor = dadosSubsetorRaw.map(item => ({
    ...item,
    somaPorcentagem: porcentagensPorSubsetor[item.nome] || 0
  }));

  const dadosSetor = agruparSetorComPorcentagem();   // FALTAVA ISSO
  const dadosSubsetorOrdenado = [...dadosSubsetor].sort((a, b) => {
    const diferencaPorcentagem = (Number(b.somaPorcentagem) || 0) - (Number(a.somaPorcentagem) || 0);
    if (diferencaPorcentagem !== 0) return diferencaPorcentagem;
    return (Number(b.total) || 0) - (Number(a.total) || 0);
  });
  const dadosSetorOrdenado = [...dadosSetor].sort((a, b) => b.total - a.total);
  const dadosFuncionario = agruparFuncionarioComPorcentagem();
  const dadosFuncionarioOrdenado = [...dadosFuncionario].sort((a, b) => b.total - a.total);
  const larguraGraficoFuncionario = Math.max(820, dadosFuncionarioOrdenado.length * 70 + 80);
  const dadosPeriodo = agruparPorPeriodo();
  const yMaxPeriodo = Math.max(1, ...dadosPeriodo.map((p) => Number(p?.total) || 0));
  const yMaxConcluidas = Math.max(
    1,
    ...dadosAreaConcluidas.map((p) => Math.max(Number(p?.total) || 0, Number(p?.mediaPorHora) || 0))
  );
  // const dadosGraficoConcluidas = formatarDadosGrafico(); // Removido pois não é utilizado

  // const totalSubsetor = dadosSubsetor.reduce((acc, item) => acc + item.total, 0); // Removido pois não é utilizado

  // ================= GERAR PDF =================

  async function gerarRelatorio() {
    // 1. Montar cabeçalho de filtros e data
    const dataGeracao = new Date();
    const dataFormatada = dataGeracao.toLocaleString();
    let filtros = [];
    if (filtroDataInicio || filtroDataFim) filtros.push(`Período: ${filtroDataInicio || '...'} até ${filtroDataFim || '...'}`);
    if (filtroCoord.length > 0) filtros.push(`Coordenação: ${filtroCoord.map(f => f.label).join(', ')}`);
    if (filtroSetorMulti.length > 0) filtros.push(`Setor: ${filtroSetorMulti.map(f => f.label).join(', ')}`);
    if (filtroSubsetor.length > 0) filtros.push(`Subsetor: ${filtroSubsetor.map(f => f.label).join(', ')}`);
    if (filtroSupervisor.length > 0) filtros.push(`Supervisor: ${filtroSupervisor.map(f => f.label).join(', ')}`);
    if (filtroFuncionario.length > 0) filtros.push(`Funcionário: ${filtroFuncionario.map(f => f.label).join(', ')}`);

    // 2. Renderizar todos os gráficos selecionados em container oculto
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1200px';
    container.style.background = '#fff';
    document.body.appendChild(container);

    // 3. Clonar e renderizar os gráficos selecionados
    for (const graficoId of graficosSelecionados) {
      const graficoOriginal = document.getElementById(graficoId);
      if (!graficoOriginal) continue;
      const clone = graficoOriginal.cloneNode(true);
      clone.style.marginBottom = '32px';
      container.appendChild(clone);
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Gerar PDF
    const pdf = new jsPDF("p", "mm", "a4");
    let y = 10;
    // Cabeçalho
    pdf.setFontSize(16);
    pdf.text("Relatório de Gráficos", 10, y);
    y += 10;
    pdf.setFontSize(10);
    pdf.text(`Gerado em: ${dataFormatada}`, 10, y);
    y += 7;
    if (filtros.length > 0) {
      pdf.text("Filtros aplicados:", 10, y);
      y += 6;
      filtros.forEach(f => {
        pdf.text(f, 10, y);
        y += 6;
    });
    }
    y += 4;

    // 5. Adicionar gráficos
    for (const graficoId of graficosSelecionados) {
      const el = container.querySelector(`#${graficoId}`);
      if (!el) continue;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (y + imgHeight > 280) {
        pdf.addPage();
        y = 10;
      }
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    }
    document.body.removeChild(container);
    pdf.save("relatorio-graficos.pdf");
  }

  // ================= RENDER =================

  // Container invisível para PDF
  const renderGraficosParaPDF = () => (
    <div id="pdf-container" style={{ position: 'absolute', left: '-9999px', top: 0, width: 1200, background: '#fff', zIndex: -1 }}>
      {graficosSelecionados.includes("grafico-impactos") && (
        <div id="grafico-impactos" style={{ marginBottom: 32 }}>
          {/* Maiores Impactos */}
          {dadosSubsetorOrdenado.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, dadosSubsetorOrdenado.length * 52)}>
              <BarChart
                data={dadosSubsetorOrdenado}
                layout="vertical"
                margin={{ top: 20, right: 90, left: 40, bottom: 0 }}
                barCategoryGap={40}
                barGap={0}
              >
                <XAxis type="number" />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={160}
                  tick={{ fontSize: 14, fill: '#222', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
                <Bar dataKey="total" fill="#1e3a8a" barSize={18} radius={[6, 6, 6, 6]}>
                  <LabelList
                    position="right"
                    content={({ x, y, width, height, index }) => {
                      const item = dadosSubsetorOrdenado[index];
                      if (!item) return null;
                      return (
                        <text
                          x={x + width + 5}
                          y={y + height / 2}
                          fill="#1e3a8a"
                          dominantBaseline="middle"
                          fontSize={15}
                          fontWeight="bold"
                        >
                          {item.total}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar
                  dataKey="somaPorcentagem"
                  fill="#bcd2fa"
                  barSize={18}
                  radius={[6, 6, 6, 6]}
                  style={{ opacity: 1 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    position="right"
                    content={({ x, y, width, height, value }) => (
                      <text
                        x={x + width + 8}
                        y={y + height / 2}
                        fill="#111"
                        fontSize={15}
                        fontWeight="bold"
                        alignmentBaseline="middle"
                      >
                        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
                      </text>
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
          )}
        </div>
      )}
      {graficosSelecionados.includes("grafico-setor") && (
        <div id="grafico-setor" style={{ marginBottom: 32 }}>
          {/* Registros por Setor */}
          {dadosSetorOrdenado.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, dadosSetorOrdenado.length * 52)}>
              <BarChart
                data={dadosSetorOrdenado}
                layout="vertical"
                margin={{ top: 20, right: 90, left: 40, bottom: 0 }}
                barCategoryGap={40}
                barGap={0}
              >
                <XAxis type="number" />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={200}
                  tick={{ fontSize: 14, fill: '#222', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
                <Bar dataKey="total" fill="#8e13be" barSize={18} radius={[6, 6, 6, 6]}>
                  <LabelList
                    position="right"
                    content={({ x, y, width, index }) => {
                      const item = dadosSetorOrdenado[index];
                      if (!item) return null;
                      return (
                        <text
                          x={x + width + 5}
                          y={y}
                          fill="#8e13be"
                          dominantBaseline="middle"
                          fontSize={15}
                          fontWeight="bold"
                        >
                          {item.total}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar
                  dataKey="somaPorcentagem"
                  fill="#f47678"
                  barSize={18}
                  radius={[6, 6, 6, 6]}
                  style={{ opacity: 1 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    position="right"
                    content={({ x, y, width, value }) => (
                      <text
                        x={x + width + 8}
                        y={y}
                        fill="#111"
                        fontSize={15}
                        fontWeight="bold"
                        alignmentBaseline="middle"
                      >
                        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
                      </text>
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
          )}
        </div>
      )}
      {graficosSelecionados.includes("grafico-funcionario") && (
        <div id="grafico-funcionario" style={{ marginBottom: 32 }}>
          {/* Registros por Funcionário */}
          {dadosFuncionarioOrdenado.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, 340, dadosFuncionarioOrdenado.length * 46)}>
              <BarChart
                data={dadosFuncionarioOrdenado}
                margin={{ top: 30, right: 60, left: 130, bottom: 80 }}
                barCategoryGap={54}
                barGap={8}
              >
                <XAxis
                  dataKey="nome"
                  type="category"
                  tick={{ fontSize: 13, angle: -60, textAnchor: 'end', fill: '#222', fontWeight: 600 }}
                  interval={0}
                  padding={{ left: 70, right: 30 }}
                />
                <YAxis type="number" />
                <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
                <Bar dataKey="total" fill="#1E8E3E" barSize={18} radius={[6, 6, 6, 6]}>
                  <LabelList
                    position="top"
                    content={({ x, y, width, index }) => {
                      const item = dadosFuncionarioOrdenado[index];
                      if (!item) return null;
                      return (
                        <text
                          x={x + width / 2}
                          y={y - 8}
                          fill="#1E8E3E"
                          fontSize={15}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {item.total}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar
                  dataKey="somaPorcentagem"
                  fill="#64f49b"
                  barSize={18}
                  radius={[6, 6, 6, 6]}
                  style={{ opacity: 1 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    position="top"
                    content={({ x, y, width, value }) => (
                      <text
                        x={x + width / 2}
                        y={y - 8}
                        fill="#1E8E3E"
                        fontSize={15}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
                      </text>
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
          )}
        </div>
      )}
      {graficosSelecionados.includes("grafico-periodo") && (
        <div id="grafico-periodo" style={{ marginBottom: 32 }}>
          {/* Registros por Período */}
          {dadosPeriodo.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosPeriodo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#C62828" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
          )}
        </div>
      )}
    </div>
  );


return (
  <>
    {renderGraficosParaPDF()}
    {mostrarModal && (
      <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
        <div
          className="modal-relatorio modal-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h2>📄 Gerar Relatório</h2>
          <div className="modal-group">
            <label>Quais gráficos incluir?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {[{ id: "grafico-impactos", label: "Maiores Impactos" }, { id: "grafico-setor", label: "Registros por Setor" }, { id: "grafico-funcionario", label: "Registros por Funcionário" }, { id: "grafico-periodo", label: "Registros por Período" }].map(g => (
                <label key={g.id} style={{ fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={graficosSelecionados && graficosSelecionados.includes(g.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setGraficosSelecionados(prev => [...(prev || []), g.id]);
                      } else {
                        setGraficosSelecionados(prev => (prev || []).filter(id => id !== g.id));
                      }
                    }}
                  />
                  {" "}{g.label}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="btn-confirmar"
              onClick={() => {
                gerarRelatorio();
                setMostrarModal(false);
              }}
            >
              Gerar PDF
            </button>
            <button
              className="btn-cancelar"
              onClick={() => setMostrarModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    <Layout>
      <div id="area-relatorio">
        {/* ================= BANNER ================= */}
        <div className="dashboard-banner"></div>

        {/* ================= CONTROLES ================= */}
        <div className="dashboard-unificado">
          <div className="top-dashboard-controls" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, marginBottom: 0}}>
            <div className="botoes-graficos" style={{display: 'flex', gap: 12, marginBottom: 6, flexWrap: isMobileView ? "nowrap" : "wrap", overflowX: isMobileView ? "auto" : "visible", width: "100%", paddingBottom: isMobileView ? 6 : 0}}>
              <button className={`btn-grafico ${graficoAtivo === 1 ? "ativo" : ""}`} onClick={() => setGraficoAtivo(1)}>Maiores Impactos</button>
              <button className={`btn-grafico ${graficoAtivo === 2 ? "ativo" : ""}`} onClick={() => setGraficoAtivo(2)}>Registros por Setor</button>
              <button className={`btn-grafico ${graficoAtivo === 3 ? "ativo" : ""}`} onClick={() => setGraficoAtivo(3)}>Registros por Funcionário</button>
              <button className={`btn-grafico ${graficoAtivo === 4 ? "ativo" : ""}`} onClick={() => setGraficoAtivo(4)}>Registros por Período</button>
              <button
                className={`btn-grafico ${graficoAtivo === 5 ? "ativo" : ""}`}
                onClick={() => {
                  if (!podeVerGraficoConcluidasPorDia) {
                    alert("Você não tem permissão para acessar este gráfico.");
                    return;
                  }
                  setGraficoAtivo(5);
                }}
              >
                Concluídas por Dia (Setor)
              </button>
              <button className="btn-grafico" onClick={() => setMostrarModal(true)}>
                Gerar Relatório PDF
              </button>
            </div>
            <div className="filtros-data" style={{ display: 'flex', flexDirection: isMobileView ? 'column' : 'row', alignItems: isMobileView ? 'stretch' : 'center', gap: 12, marginTop: 23, marginBottom: 38, marginLeft: isMobileView ? 0 : 2, width: '100%' }}>
              <DateRangePicker
                className="dash-date-range"
                style={{ width: isMobileView ? "100%" : 180 }}
                format="dd/MM/yyyy"
                placeholder="Selecionar período"
                cleanable
                ranges={atalhosPeriodo}
                onChange={(value) => {
                  if (value) {
                    setFiltroDataInicio(formatarDataLocalISO(value[0]));
                    setFiltroDataFim(formatarDataLocalISO(value[1]));
                  } else {
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
                  }
                }}
              />
              <div style={{ minWidth: isMobileView ? "100%" : 160, width: isMobileView ? "100%" : 180 }}>
                <Select
                  className="dash-select"
                  classNamePrefix="dash-select"
                  isMulti
                  placeholder="Coordenação"
                  value={filtroCoord}
                  onChange={setFiltroCoord}
                  options={opcoesCoordFiltradas}
                  noOptionsMessage={() => "Sem opções disponíveis"}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={portalTarget}
                  isDisabled={isCoordenador}
                />
              </div>
              <div style={{ minWidth: isMobileView ? "100%" : 160, width: isMobileView ? "100%" : 180 }}>
                <Select
                  className="dash-select"
                  classNamePrefix="dash-select"
                  isMulti
                  placeholder="Setor"
                  value={filtroSetorMulti}
                  onChange={setFiltroSetorMulti}
                  options={opcoesSetorFiltradas}
                  noOptionsMessage={() => "Sem opções disponíveis"}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={portalTarget}
                  isDisabled={isSupervisor && !!setorSupervisorLogado}
                />
              </div>
              <div style={{ minWidth: isMobileView ? "100%" : 160, width: isMobileView ? "100%" : 180 }}>
                <Select
                  className="dash-select"
                  classNamePrefix="dash-select"
                  isMulti
                  placeholder="Subsetor"
                  value={filtroSubsetor}
                  onChange={setFiltroSubsetor}
                  options={opcoesSubsetorFiltradas}
                  noOptionsMessage={() => "Sem opções disponíveis"}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={portalTarget}
                />
              </div>
              <div style={{ minWidth: isMobileView ? "100%" : 160, width: isMobileView ? "100%" : 180 }}>
                <Select
                  className="dash-select"
                  classNamePrefix="dash-select"
                  isMulti
                  placeholder="Supervisor"
                  value={filtroSupervisor}
                  onChange={setFiltroSupervisor}
                  options={opcoesSupervisorFiltradas}
                  noOptionsMessage={() => "Sem opções disponíveis"}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={portalTarget}
                />
              </div>
              <div style={{ minWidth: isMobileView ? "100%" : 160, width: isMobileView ? "100%" : 180 }}>
                <Select
                  className="dash-select"
                  classNamePrefix="dash-select"
                  isMulti
                  placeholder="Funcionário"
                  value={filtroFuncionario}
                  onChange={setFiltroFuncionario}
                  options={opcoesFuncionarioFiltradas}
                  noOptionsMessage={() => "Sem opções disponíveis"}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={portalTarget}
                  isDisabled={isPadrao}
                />
              </div>
            </div>
          </div>
          <div className="graficos-area">
            {/* Aqui continuam TODOS seus gráficos exatamente como estavam */}

       
        {/* ================= Barra coordenadores e drilldown ================= */}
        {podeVerGraficoConcluidasPorDia && graficoAtivo === 5 && (
          <div className="grafico-centralizado">
            {/* Drilldown: Subsetores do setor */}
            {drilldownDia && drilldownCoord && drilldownSetor && (
              <div style={{ width: "100%" }}>
                <button className="btn-voltar-drilldown" onClick={() => setDrilldownSetor(null)} style={{marginBottom: 8}}>← Voltar para setores</button>
                <h4 style={{marginBottom: 8}}>Subsetores de <b>{drilldownSetor}</b></h4>
                <ResponsiveContainer width="100%" height={isMobileView ? 430 : 390}>
                  <BarChart data={dadosSubsetorPorSetor} margin={{ top: 20, right: isMobileView ? 12 : 40, left: isMobileView ? 8 : 40, bottom: isMobileView ? 118 : 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ angle: -35, textAnchor: 'end', fontSize: isMobileView ? 12 : 13, fontWeight: 600, fill: '#222' }} interval={0} height={isMobileView ? 118 : 90} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={v => `${v} concluídas`} />
                    <Bar dataKey="total" fill="#0f50db">
                      <LabelList dataKey="total" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Drilldown: Setores da coordenação */}
            {drilldownDia && drilldownCoord && !drilldownSetor && (
              <div style={{ width: "100%" }}>
                <button className="btn-voltar-drilldown" onClick={() => setDrilldownCoord(null)} style={{marginBottom: 8}}>← Voltar para coordenações</button>
                <h4 style={{marginBottom: 8}}>Setores de <b>{drilldownCoord}</b></h4>
                <ResponsiveContainer width="100%" height={isMobileView ? 430 : 390}>
                  <BarChart data={dadosSetorPorCoord} margin={{ top: 20, right: isMobileView ? 12 : 40, left: isMobileView ? 8 : 40, bottom: isMobileView ? 118 : 90 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ angle: -35, textAnchor: "end", fontSize: isMobileView ? 12 : 13, fontWeight: 600, fill: "#222" }} interval={0} height={isMobileView ? 118 : 90} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={v => `${v} concluídas`} />
                    <Bar dataKey="total" fill="#0f50db" onClick={d => setDrilldownSetor(d.nome)} style={{cursor:'pointer'}}>
                      <LabelList dataKey="total" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Drilldown: Coordenações do dia */}
            {drilldownDia && !drilldownCoord && (
              <div style={{ width: "100%" }}>
                <button className="btn-voltar-drilldown" onClick={() => setDrilldownDia(null)} style={{marginBottom: 8}}>← Voltar para dias</button>
                <h4 style={{marginBottom: 8}}>Coordenações em <b>{drilldownDia}</b></h4>
                <ResponsiveContainer width="100%" height={isMobileView ? 430 : 390}>
                  <BarChart data={dadosCoordPorDia} margin={{ top: 20, right: isMobileView ? 12 : 40, left: isMobileView ? 8 : 40, bottom: isMobileView ? 118 : 90 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ angle: -35, textAnchor: "end", fontSize: isMobileView ? 12 : 13, fontWeight: 600, fill: "#222" }} interval={0} height={isMobileView ? 118 : 90} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={v => `${v} concluídas`} />
                    <Bar dataKey="total" fill="#0f50db" onClick={d => setDrilldownCoord(d.nome)} style={{cursor:'pointer'}}>
                      <LabelList dataKey="total" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Gráfico principal de área */}
            {!drilldownDia && dadosAreaConcluidas.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart
                  data={dadosAreaConcluidas}
                  margin={{ top: 20, right: isMobileView ? 62 : 52, left: isMobileView ? 72 : 58, bottom: isMobileView ? 164 : 148 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: isMobileView ? 12 : 13, fill: '#222', fontWeight: 600 }}
                    interval={0}
                    angle={isMobileView ? -28 : -30}
                    textAnchor="end"
                    tickMargin={18}
                    minTickGap={16}
                    padding={{ left: 16, right: 16 }}
                    height={110}
                  />
                  <YAxis allowDecimals={false} domain={[0, yMaxConcluidas]} />
                  <Tooltip formatter={(v, name, item) => {
                    if (item?.dataKey === 'mediaPorHora') {
                      return `${Number(v || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} média/hora`;
                    }
                    return `${v} concluídas`;
                  }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0f50db"
                    fill="#bcd2fa"
                    strokeWidth={3}
                    activeDot={props => (
                      <circle
                        {...props}
                        r={7}
                        fill="#0f50db"
                        stroke="#fff"
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDrilldownDia(props.payload.data)}
                      />
                    )}
                  />
                  {/* Linha da média por hora acumulada */}
                  <Line type="linear" dataKey="mediaPorHora" stroke="#C62828" strokeDasharray="5 5" dot={false} name="Média acumulada por hora" />
                  <Legend verticalAlign="top" align="center" height={30} />
                  <Brush
                    dataKey="data"
                    height={24}
                    stroke="#60a5fa"
                    travellerWidth={8}
                    fill="rgba(15, 23, 42, 0.68)"
                    y={454}
                    tickFormatter={() => ""}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
            {!drilldownDia && dadosAreaConcluidas.length === 0 && (
              <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
            )}
          </div>
        )}

        {/* ================= MAIORES IMPACTOS ================= */}
        {graficoAtivo === 1 && (
          <div className="grafico-centralizado">
            {dadosSubsetorOrdenado.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(220, dadosSubsetorOrdenado.length * 52)}>
                <BarChart
                  data={dadosSubsetorOrdenado}
                  layout="vertical"
                  margin={{ top: 20, right: 90, left: 40, bottom: 0 }}
                  barCategoryGap={40}
                  barGap={0}
                >
                  <XAxis type="number" />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={160}
                    tick={{ fontSize: 16, fill: '#222', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
                  {/* Barra principal: número de registros */}
                  <Bar dataKey="total" fill="#1e3a8a" barSize={18} radius={[6, 6, 6, 6]}>
                    <LabelList
                      position="right"
                      content={({ x, y, width, height, index }) => {
                        const item = dadosSubsetorOrdenado[index];
                        if (!item) return null;
                        return (
                          <text
                            x={x + width + 5}
                            y={y + height / 2}
                            fill="#1e3a8a"
                            dominantBaseline="middle"
                            fontSize={16}
                            fontWeight="bold"
                          >
                            {item.total}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                  {/* Barra de porcentagem: agrupada ao lado da principal */}
                  <Bar
                    dataKey="somaPorcentagem"
                    fill="#bcd2fa"
                    barSize={18}
                    radius={[6, 6, 6, 6]}
                    style={{ opacity: 1 }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      position="right"
                      content={({ x, y, width, height, value }) => (
                        <text
                          x={x + width + 8}
                          y={y + height / 2}
                          fill="#111"
                          fontSize={15}
                          fontWeight="bold"
                          alignmentBaseline="middle"
                        >
                          {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
                        </text>
                      )}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
            )}
          </div>
        )}

  
        
       {/* ================= BARRA SETOR ================= */}
        {graficoAtivo === 2 && (
  <div className="grafico-centralizado">
    {dadosSetorOrdenado.length > 0 ? (
      <ResponsiveContainer width="100%" height={Math.max(220, dadosSetorOrdenado.length * 52)}>
      <BarChart
        data={dadosSetorOrdenado}
        layout="vertical"
        margin={{ top: 20, right: 90, left: 40, bottom: 0 }}
        barCategoryGap={40}
        barGap={0}
      >
        <XAxis type="number" />
        <YAxis
          dataKey="nome"
          type="category"
          width={200}
          tick={{ fontSize: 18, fill: '#222', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
        {/* Barra principal: número de registros */}
        <Bar dataKey="total" fill="#8e13be" barSize={18} radius={[6, 6, 6, 6]}>
          <LabelList
            position="right"
            content={({ x, y, width, index }) => {
              const item = dadosSetorOrdenado[index];
              if (!item) return null;
              return (
                <text
                  x={x + width + 5}
                  y={y}
                  fill="#8e13be"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight="bold"
                >
                  {item.total}
                </text>
              );
            }}
          />
        </Bar>
        {/* Barra secundária: soma das porcentagens */}
        <Bar
          dataKey="somaPorcentagem"
          fill="#f47678"
          barSize={18}
          radius={[6, 6, 6, 6]}
          style={{ opacity: 1 }}
          isAnimationActive={false}
        >
          <LabelList
            position="right"
            content={({ x, y, width, value }) => (
              <text
                x={x + width + 8}
                y={y}
                fill="#111"
                fontSize={15}
                fontWeight="bold"
                alignmentBaseline="middle"
              >
                {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
              </text>
            )}
          />
        </Bar>
      </BarChart>
      </ResponsiveContainer>
    ) : (
      <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
    )}
  </div>
)}
        {/* ================= BARRA FUNCIONÁRIO ================= */}
         {graficoAtivo === 3 && (
  <div className="grafico-centralizado" style={{ width: '100%', overflowX: isMobileView ? 'hidden' : 'auto', paddingBottom: 10, display: 'block', textAlign: 'left' }}>
    {dadosFuncionarioOrdenado.length > 0 ? (
      <div style={{ minWidth: isMobileView ? "100%" : `${dadosFuncionarioOrdenado.length * 72 + 180}px`, maxWidth: 'none', display: 'inline-block', paddingLeft: isMobileView ? 0 : 20 }}>
        <ResponsiveContainer width={isMobileView ? "100%" : dadosFuncionarioOrdenado.length * 72 + 180} height={isMobileView ? 300 : Math.max(170, 340, dadosFuncionarioOrdenado.length * 46)}>
          <BarChart
            data={dadosFuncionarioOrdenado}
            margin={isMobileView ? { top: 20, right: 14, left: 14, bottom: 92 } : { top: 30, right: 50, left: 50, bottom: 120 }}
            barCategoryGap={24}
            barGap={10}
          >
            <XAxis
              dataKey="nome"
              type="category"
              tick={{ fontSize: isMobileView ? 11 : 15, angle: isMobileView ? -55 : -30, textAnchor: 'end', fill: '#222', fontWeight: 600 }}
              interval={0}
              height={isMobileView ? 86 : 110}
              padding={{ left: isMobileView ? 8 : 20, right: isMobileView ? 8 : 20 }}
            />
            <YAxis type="number" />
            <Tooltip formatter={(value, name) => name === 'total' ? `${value} registros` : `${value}%`} />
            {/* Barra principal: número de registros */}
            <Bar dataKey="total" fill="#1E8E3E" barSize={18} radius={[6, 6, 6, 6]}>
              <LabelList
                position="top"
                content={({ x, y, width, index }) => {
                  const item = dadosFuncionarioOrdenado[index];
                  if (!item) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill="#1E8E3E"
                      fontSize={15}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {item.total}
                    </text>
                  );
                }}
              />
            </Bar>
            {/* Barra de porcentagem: agrupada ao lado da principal */}
            <Bar
              dataKey="somaPorcentagem"
              fill="#64f49b"
              barSize={18}
              radius={[6, 6, 6, 6]}
              style={{ opacity: 1 }}
              isAnimationActive={false}
            >
              <LabelList
                position="top"
                content={({ x, y, width, value }) => (
                  <text
                    x={x + width / 2}
                    y={y - 8}
                    fill="#1E8E3E"
                    fontSize={15}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%
                  </text>
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
    )}
  </div>
)}
        {/* ================= LINHA PERÍODO ================= */}
        {graficoAtivo === 4 && (
          dadosPeriodo.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={dadosPeriodo}
                margin={{ top: 20, right: isMobileView ? 62 : 52, left: isMobileView ? 72 : 58, bottom: isMobileView ? 164 : 148 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="data"
                  tick={{
                    angle: isMobileView ? -28 : -35,
                    textAnchor: 'end',
                    fontSize: isMobileView ? 14 : 18,
                    fontWeight: 600,
                    fill: '#222'
                  }}
                  interval={0}
                  height={isMobileView ? 116 : 104}
                  tickMargin={18}
                  minTickGap={16}
                  padding={{ left: 16, right: 16 }}
                />
                <YAxis domain={[0, yMaxPeriodo]} />
                <Tooltip />
                <Legend verticalAlign="top" align="center" height={30} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#C62828"
                  activeDot={{ r: 7, fill: "#C62828", stroke: "#fff", strokeWidth: 2 }}
                />
                <Brush
                  dataKey="data"
                  height={24}
                  stroke="#60a5fa"
                  travellerWidth={8}
                  fill="rgba(15, 23, 42, 0.68)"
                  y={454}
                  tickFormatter={() => ""}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40}}>Sem dados para exibir</div>
          )
        )}
    </div>
        </div>

      </div>
    </Layout>
  </>
);
}






