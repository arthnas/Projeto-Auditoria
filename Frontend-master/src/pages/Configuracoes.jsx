import { useEffect, useState, useContext, useMemo } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import Modal from "../components/Modal";

import { AuthContext } from "../context/AuthContext";

export default function Configuracoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [requerimentos, setRequerimentos] = useState([]);
  const [descricaoRequerimento, setDescricaoRequerimento] = useState("");
  const [setorRequerimento, setSetorRequerimento] = useState("");
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  const [anexosRequerimento, setAnexosRequerimento] = useState([]);
  const [enviandoRequerimento, setEnviandoRequerimento] = useState(false);
  const [solicitacoesCarregadasEm, setSolicitacoesCarregadasEm] = useState(Date.now());
  const [agora, setAgora] = useState(Date.now());
  const [selecionada, setSelecionada] = useState(null);
  const [modalMinutosAberto, setModalMinutosAberto] = useState(false);
  const [minutosAceite, setMinutosAceite] = useState("0");
  const [idSolicitacaoAceite, setIdSolicitacaoAceite] = useState(null);
  const [requerimentoSelecionado, setRequerimentoSelecionado] = useState(null);
  const [requerimentoHover, setRequerimentoHover] = useState(null);
  const [modalRecusaAberto, setModalRecusaAberto] = useState(false);
  const [idRequerimentoRecusa, setIdRequerimentoRecusa] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const { token } = useContext(AuthContext);
  const usuarioLogado = useMemo(() => {
    return token ? JSON.parse(atob(token.split(".")[1])) : null;
  }, [token]);
  const tipoUsuarioLogado = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isAdmin = tipoUsuarioLogado === "ADMIN" || tipoUsuarioLogado === "DEVELOPER";
  const isDeveloper = tipoUsuarioLogado === "DEVELOPER";
  const isCoordenador = tipoUsuarioLogado === "COORDENADOR";
  const isSupervisor = tipoUsuarioLogado === "SUPERVISOR";
  const isPadrao = tipoUsuarioLogado === "PADRAO";
  const loginUsuarioLogado = String(usuarioLogado?.usuario || "").trim();
  const idUsuarioLogado = String(usuarioLogado?.id || "").trim();
  const [nomeUsuarioPerfilExibicao, setNomeUsuarioPerfilExibicao] = useState(
    String(usuarioLogado?.nome || usuarioLogado?.name || "").trim()
  );
  const [setorRequerimentoBloqueado, setSetorRequerimentoBloqueado] = useState(false);
  const [modoMobileRequerimentos, setModoMobileRequerimentos] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );
  const [nomesUsuariosPorId, setNomesUsuariosPorId] = useState({});

  const solicitacoesPendentes = useMemo(() => {
    return (solicitacoes || []).filter(
      (s) => String(s?.status || "").trim().toLowerCase() === "pendente"
    );
  }, [solicitacoes]);

  const mensagens = useMemo(() => {
    return (solicitacoes || [])
      .filter((s) => {
        const status = String(s?.status || "").trim().toLowerCase();
        return status === "aceita" || status === "recusada";
      })
      .sort((a, b) => {
        const dataA = new Date(
          a?.aprovado_em || a?.respondido_em || a?.atualizado_em || a?.updated_at || a?.updatedAt || a?.criado_em
        ).getTime();
        const dataB = new Date(
          b?.aprovado_em || b?.respondido_em || b?.atualizado_em || b?.updated_at || b?.updatedAt || b?.criado_em
        ).getTime();
        return dataB - dataA;
      });
  }, [solicitacoes]);

  function parseDataSegura(valor) {
    if (!valor) return null;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  }

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
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

  function extrairMinutosPermitidos(solicitacao) {
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

    const aprovadoEm = parseDataSegura(
      solicitacao?.aprovado_em ||
        solicitacao?.respondido_em ||
        solicitacao?.data_aprovacao ||
        solicitacao?.data_resposta ||
        solicitacao?.atualizado_em ||
        solicitacao?.updated_at ||
        solicitacao?.updatedAt ||
        solicitacao?.criado_em
    );

    const expiraEm = parseDataSegura(
      solicitacao?.tempo_liberado_ate ||
      solicitacao?.expira_em ||
        solicitacao?.expiracao_em ||
        solicitacao?.data_expiracao ||
        solicitacao?.limite_em ||
        solicitacao?.finaliza_em
    );

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

  async function carregar() {
    if (!usuarioLogado) return;
    if (isAdmin) {
      const r = await api.get("/solicitacoes");
      setSolicitacoes(r.data);
      setSolicitacoesCarregadasEm(Date.now());
    } else if (isCoordenador) {
      const r = await api.get("/solicitacoes/minhas");
      setSolicitacoes(r.data);
      setSolicitacoesCarregadasEm(Date.now());
    }
  }

  async function carregarRequerimentos() {
    if (!usuarioLogado) return;
    try {
      const endpoint = isDeveloper ? "/requerimentos" : "/requerimentos/minhas";
      const r = await api.get(endpoint);
      setRequerimentos(Array.isArray(r?.data) ? r.data : []);
    } catch {
      setRequerimentos([]);
    }
  }

  async function carregarSetores() {
    try {
      const r = await api.get("/setores");
      const lista = Array.isArray(r?.data) ? r.data : [];
      setSetoresDisponiveis(
        lista
          .map((s) => String(s?.nome || "").trim())
          .filter((nome, idx, arr) => nome && arr.indexOf(nome) === idx)
          .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
      );
    } catch {
      setSetoresDisponiveis([]);
    }
  }

  useEffect(() => {
    carregar();
    carregarRequerimentos();
    carregarSetores();
    carregarNomesUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function atualizarModo() {
      setModoMobileRequerimentos(window.innerWidth < 960);
    }

    atualizarModo();
    window.addEventListener("resize", atualizarModo);
    return () => window.removeEventListener("resize", atualizarModo);
  }, []);

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
        if (nome && ativo) {
          setNomeUsuarioPerfilExibicao(nome);
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
    let ativo = true;

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

    async function preencherSetorSupervisor() {
      try {
        const resposta = await api.get("/setores");
        const lista = Array.isArray(resposta?.data) ? resposta.data : [];
        const setorVinculado = lista.find(
          (s) =>
            obterNomesSupervisoresDoSetor(s).some(
              (nome) => normalizarNome(nome) === normalizarNome(nomeUsuarioPerfilExibicao)
            )
        );
        if (setorVinculado?.nome && ativo) {
          setSetorRequerimento(String(setorVinculado.nome).trim());
          setSetorRequerimentoBloqueado(true);
        } else if (ativo) {
          setSetorRequerimentoBloqueado(false);
        }
      } catch {
        if (ativo) {
          setSetorRequerimentoBloqueado(false);
        }
      }
    }

    preencherSetorSupervisor();
    return () => {
      ativo = false;
    };
  }, [isSupervisor, nomeUsuarioPerfilExibicao]);

  useEffect(() => {
    if (!isPadrao) {
      if (!isSupervisor) setSetorRequerimentoBloqueado(false);
      return;
    }
    if (!nomeUsuarioPerfilExibicao) return;
    let ativo = true;

    async function preencherSetorPadrao() {
      try {
        const resposta = await api.get("/tarefas");
        const lista = Array.isArray(resposta?.data) ? resposta.data : [];
        const atividade = lista.find(
          (t) =>
            normalizarNome(t?.funcionario_nome) === normalizarNome(nomeUsuarioPerfilExibicao) &&
            String(t?.setor_nome || "").trim()
        );

        if (!ativo) return;

        if (atividade?.setor_nome) {
          setSetorRequerimento(String(atividade.setor_nome).trim());
          setSetorRequerimentoBloqueado(true);
        } else {
          setSetorRequerimento("");
          setSetorRequerimentoBloqueado(false);
        }
      } catch {
        if (ativo) setSetorRequerimentoBloqueado(false);
      }
    }

    preencherSetorPadrao();
    return () => {
      ativo = false;
    };
  }, [isPadrao, isSupervisor, nomeUsuarioPerfilExibicao]);

  async function responder(solicitacaoOuId, status, minutos = undefined) {
    try {
      const solicitacao =
        typeof solicitacaoOuId === "object" && solicitacaoOuId !== null
          ? solicitacaoOuId
          : solicitacoes.find((s) => String(s?.id) === String(solicitacaoOuId));

      const tipoSolicitacao = String(solicitacao?.tipo || "").trim().toLowerCase();
      const tarefaId = String(solicitacao?.tarefa_id || "").trim();

      const id = String(solicitacao?.id || solicitacaoOuId || "").trim();
      if (!id) {
        alert("Solicitação inválida para resposta.");
        return;
      }

      if (status === "aceita" && tipoSolicitacao === "deletar" && tarefaId) {
        const confirmouExclusao = window.confirm(
          "Ao aceitar, a tarefa será removida do banco de dados. Deseja continuar?"
        );

        if (!confirmouExclusao) {
          return;
        }
      }

      const payload = { status };

      if (status === "aceita") {
        payload.minutos = minutos;
      }

      await api.put(`/solicitacoes/${id}`, payload);

      if (status === "aceita" && tipoSolicitacao === "deletar" && tarefaId) {
        await api.delete(`/tarefas/${tarefaId}`);
      }

      await carregar();
      setSelecionada(null);
    } catch (err) {
      alert(
        "Erro ao responder solicitação: " +
          (err.response?.data?.erro || err.response?.data?.message || err.message)
      );
    }
  }

  function abrirModalAceite(id) {
    setIdSolicitacaoAceite(id);
    setMinutosAceite("0");
    setModalMinutosAberto(true);
  }

  function fecharModalAceite() {
    setModalMinutosAberto(false);
    setIdSolicitacaoAceite(null);
  }

  async function confirmarAceite() {
    const minutos = Number(minutosAceite);

    if (!Number.isInteger(minutos) || minutos < 0) {
      alert("Informe um valor inteiro de minutos maior ou igual a 0.");
      return;
    }

    if (!idSolicitacaoAceite) {
      return;
    }

    await responder(idSolicitacaoAceite, "aceita", minutos);
    fecharModalAceite();
  }

  function adicionarArquivosRequerimento(evento) {
    const arquivos = Array.from(evento?.target?.files || []);
    if (arquivos.length === 0) return;

    const somentePdf = arquivos.filter(
      (arquivo) => String(arquivo?.type || "").toLowerCase() === "application/pdf"
    );

    if (somentePdf.length !== arquivos.length) {
      alert("Somente arquivos PDF são permitidos no requerimento.");
    }

    if (somentePdf.length === 0) {
      evento.target.value = "";
      return;
    }

    setAnexosRequerimento((atual) => [...atual, ...somentePdf]);
    evento.target.value = "";
  }

  async function carregarNomesUsuarios() {
    try {
      const resposta = await api.get("/usuarios");
      const lista = Array.isArray(resposta?.data) ? resposta.data : [];
      const mapa = {};
      lista.forEach((u) => {
        const id = String(u?.id || "").trim();
        const nome =
          String(u?.nome || "").trim() ||
          String(u?.name || "").trim() ||
          String(u?.usuario || "").trim();
        if (id && nome) mapa[id] = nome;
      });
      setNomesUsuariosPorId(mapa);
    } catch {
      setNomesUsuariosPorId({});
    }
  }

  function removerAnexoRequerimento(indice) {
    setAnexosRequerimento((atual) => atual.filter((_, i) => i !== indice));
  }

  async function criarRequerimento() {
    if (!descricaoRequerimento.trim()) {
      alert("Descrição obrigatória.");
      return;
    }

    setEnviandoRequerimento(true);
    try {
      const payload = new FormData();
      payload.append("descricao", descricaoRequerimento.trim());
      if (setorRequerimento.trim()) {
        payload.append("setor", setorRequerimento.trim());
      }
      anexosRequerimento.forEach((arquivo) => {
        payload.append("anexos", arquivo);
      });

      await api.post("/requerimentos", payload, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setDescricaoRequerimento("");
      setSetorRequerimento("");
      setAnexosRequerimento([]);
      await carregarRequerimentos();
      alert("Requerimento enviado com sucesso.");
    } catch (err) {
      alert(
        "Erro ao criar requerimento: " +
          (err.response?.data?.erro || err.response?.data?.message || err.message)
      );
    } finally {
      setEnviandoRequerimento(false);
    }
  }

  async function concluirRequerimento(id) {
    try {
      await api.patch(`/requerimentos/${id}/status`, { status: "CONCLUIDO" });
      await carregarRequerimentos();
    } catch (err) {
      alert(
        "Erro ao concluir requerimento: " +
          (err.response?.data?.erro || err.response?.data?.message || err.message)
      );
    }
  }

  function abrirModalRecusa(id) {
    setIdRequerimentoRecusa(id);
    setMotivoRecusa("");
    setModalRecusaAberto(true);
  }

  function fecharModalRecusa() {
    setModalRecusaAberto(false);
    setIdRequerimentoRecusa(null);
    setMotivoRecusa("");
  }

  async function confirmarRecusaRequerimento() {
    const motivoFinal = String(motivoRecusa || "").trim();
    if (!motivoFinal) {
      alert("Informe o motivo da recusa.");
      return;
    }
    if (!idRequerimentoRecusa) return;

    try {
      await api.patch(`/requerimentos/${idRequerimentoRecusa}/status`, {
        status: "RECUSADO",
        motivo_recusa: motivoFinal
      });
      await carregarRequerimentos();
      fecharModalRecusa();
    } catch (err) {
      alert(
        "Erro ao recusar requerimento: " +
          (err.response?.data?.erro || err.response?.data?.message || err.message)
      );
    }
  }

  function montarUrlArquivo(caminho) {
    const caminhoFinal = String(caminho || "").trim();
    if (!caminhoFinal) return "";
    const caminhoCodificado = encodeURI(caminhoFinal);
    if (/^https?:\/\//i.test(caminhoCodificado)) return caminhoCodificado;

    const baseApi = String(api?.defaults?.baseURL || "").trim();
    const origemBackend = baseApi.replace(/\/api\/?$/i, "");
    if (!origemBackend) return caminhoCodificado;

    if (caminhoCodificado.startsWith("/")) return `${origemBackend}${caminhoCodificado}`;
    return `${origemBackend}/${caminhoCodificado}`;
  }

  function getNomeExibicaoRequerimento(r) {
    const nomeDireto =
      r?.usuario_nome ||
      r?.nome_usuario ||
      r?.nome ||
      r?.solicitante_nome ||
      r?.usuario;

    if (String(nomeDireto || "").trim()) return String(nomeDireto).trim();

    const donoMesmoId = String(r?.usuario_id || "").trim() === idUsuarioLogado;
    if (donoMesmoId && String(nomeUsuarioPerfilExibicao || "").trim()) {
      return String(nomeUsuarioPerfilExibicao).trim();
    }

    return "-";
  }

  function getNomeAprovadorSolicitacao(s) {
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
      s?.aprovado_por_tipo,
      s?.aprovadoPorTipo,
      s?.respondido_por_tipo,
      s?.respondidoPorTipo,
      s?.admin_tipo,
      s?.adminTipo,
      s?.usuario_aprovador_tipo,
      s?.usuarioAprovadorTipo
    ]
      .map((v) => String(v || "").trim().toUpperCase())
      .filter(Boolean);

    const candidatos = [
      s?.aprovado_por_nome,
      s?.aprovadoPorNome,
      s?.respondido_por_nome,
      s?.respondidoPorNome,
      s?.admin_nome,
      s?.adminName,
      s?.aprovador_nome,
      s?.aprovador,
      s?.usuario_aprovador_nome,
      s?.usuarioAprovadorNome,
      s?.aprovado_por_usuario,
      s?.respondido_por_usuario,
      s?.aprovado_por_login,
      s?.respondido_por_login,
      s?.approver_name,
      s?.approved_by_name,
      s?.answered_by_name,
      s?.responded_by_name,
      s?.usuario_aprovador?.nome,
      s?.usuario_aprovador?.name,
      s?.aprovador?.nome,
      s?.aprovador?.name,
      s?.respondido_por_usuario?.nome,
      s?.respondido_por_usuario?.name,
      s?.aprovado_por,
      s?.respondido_por
    ];

    for (const valor of candidatos) {
      const texto = String(valor || "").trim();
      if (!texto) continue;
      if (/^\d+$/.test(texto)) continue;
      if (ehMarcadorGenerico(texto)) continue;
      return texto;
    }

    const idsPossiveis = [
      s?.aprovado_por_id,
      s?.aprovadoPorId,
      s?.respondido_por_id,
      s?.respondidoPorId,
      s?.admin_id,
      s?.adminId,
      s?.usuario_aprovador_id,
      s?.usuarioAprovadorId,
      s?.approver_id,
      s?.approved_by_id,
      s?.answered_by_id,
      s?.responded_by_id,
      s?.usuario_aprovador?.id,
      s?.aprovador?.id,
      s?.respondido_por_usuario?.id,
      s?.aprovado_por,
      s?.respondido_por
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

  function getNomeSolicitanteSolicitacao(s) {
    const candidatos = [
      s?.solicitante_nome,
      s?.solicitanteNome,
      s?.usuario_nome,
      s?.usuarioNome,
      s?.nome_usuario,
      s?.nomeUsuario,
      s?.usuario
    ];

    for (const valor of candidatos) {
      const texto = String(valor || "").trim();
      if (!texto) continue;
      if (/^\d+$/.test(texto)) continue;
      return texto;
    }

    return "-";
  }

  function getStatusVisual(status) {
    const statusNormalizado = String(status || "").toUpperCase();
    if (statusNormalizado === "CONCLUIDO") {
      return {
        texto: "CONCLUIDO",
        border: "#8dc9a0",
        color: "#1f7a3f",
        background: "#ebfff2"
      };
    }
    if (statusNormalizado === "RECUSADO") {
      return {
        texto: "RECUSADO",
        border: "#f3a3a3",
        color: "#b91c1c",
        background: "#fff1f2"
      };
    }
    return {
      texto: "PENDENTE",
      border: "#f5c089",
      color: "#b45309",
      background: "#fff8ef"
    };
  }

  return (
    <Layout>
      <div className="config-page">
      <h1 style={{ color: "#0047AB" }}>Configurações</h1>

      <div
        className="cfg-card cfg-main-card"
        style={{
          marginTop: 20,
          background: "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
          padding: 20,
          borderRadius: 14,
          border: "1px solid #fbfafa",
          boxShadow: "0 10px 24px rgba(15,80,219,0.08)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="cfg-title" style={{ margin: 0, color: "#0f3f9a" }}>Caixa de Requerimentos</h3>
          <span
            className="cfg-badge"
            style={{
              fontSize: 16,
              color: "#0f50db",
              background: "#cac8ec",
              border: "1px solid #c7dafd",
              borderRadius: 999,
              padding: "6px 12px",
              fontWeight: 700
            }}
          >
            {requerimentos.length} registros
          </span>
        </div>

        {!isDeveloper && (
          <div
            className="cfg-form-card"
            style={{
              display: "grid",
              gap: 10,
              marginBottom: 16,
              background: "#fff",
              border: "1px solid #e4ecfb",
              borderRadius: 12,
              padding: 18,
              fontSize: 14
            }}
          >
            <textarea
              value={descricaoRequerimento}
              onChange={(e) => setDescricaoRequerimento(e.target.value)}
              placeholder="Descreva seu requerimento com objetivo e contexto"
              rows={3}
              style={{ width: "100%", borderRadius: 8, border: "1px solid #d4ddf0", padding: 10 }}
            />

            <select
              value={setorRequerimento}
              onChange={(e) => setSetorRequerimento(e.target.value)}
              disabled={(isSupervisor && !!setorRequerimentoBloqueado) || (isPadrao && setorRequerimentoBloqueado)}
              style={{ borderRadius: 8, border: "1px solid #d4ddf0", padding: 10, background: "#fff" }}
            >
              <option value="">
                {isSupervisor ? "Selecione o setor (automático se encontrado)" : "Selecione o setor"}
              </option>
              {setoresDisponiveis.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>

            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={adicionarArquivosRequerimento}
              style={{ border: "1px dashed #b8c9ee", borderRadius: 8, padding: 10, background: "#fbfdff" }}
            />

            {anexosRequerimento.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                {anexosRequerimento.map((anexo, indice) => (
                  <div
                    key={`${anexo?.name || "arquivo"}-${indice}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #e6ebf7",
                      borderRadius: 8,
                      padding: "7px 10px",
                      background: "#fff"
                    }}
                  >
                    <span style={{ fontSize: 13 }}>
                      {anexo?.name || "arquivo"} ({anexo?.type || "arquivo"})
                    </span>
                    <button
                      onClick={() => removerAnexoRequerimento(indice)}
                      style={{ border: "none", background: "transparent", color: "#c62828", fontWeight: 700, cursor: "pointer" }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={criarRequerimento}
              disabled={enviandoRequerimento}
              style={{
                background: enviandoRequerimento ? "#7aa2ee" : "#0f50db",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "10px 14px",
                width: 220,
                fontWeight: 700,
                cursor: enviandoRequerimento ? "not-allowed" : "pointer"
              }}
            >
              {enviandoRequerimento ? "Enviando..." : "Nova Solicitação"}
            </button>
          </div>
        )}

        <div
          className="cfg-table-shell"
          style={{
            overflowX: "auto",
            overflowY: "auto",
            minHeight: 280,
            maxHeight: 520,
            border: "1px solid #e4ecfb",
            borderRadius: 12,
            background: "#fff"
          }}
        >
          {!modoMobileRequerimentos && (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: "#f4f8ff", borderBottom: "1px solid #dde8fc", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Protocolo</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Usuário</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Setor</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Descrição</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Documentos</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Data</th>
                <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Status</th>
                {isDeveloper && <th style={{ padding: "10px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {requerimentos.length === 0 && (
                <tr>
                  <td colSpan={isDeveloper ? 8 : 7} style={{ padding: "14px 8px", color: "#6b7280" }}>
                    Sem requerimentos para exibir.
                  </td>
                </tr>
              )}

              {requerimentos.map((r) => {
                const statusNormalizado = String(r.status || "").toUpperCase();
                const concluido = statusNormalizado === "CONCLUIDO";
                const recusado = statusNormalizado === "RECUSADO";
                const statusVisual = getStatusVisual(statusNormalizado);
                return (
                  <tr
                    key={r.id}
                    onDoubleClick={() =>
                      setRequerimentoSelecionado((atual) =>
                        atual === r.id ? null : r.id
                      )
                    }
                    onMouseEnter={() => {
                      if (
                        requerimentoSelecionado === r.id &&
                        recusado &&
                        String(r.motivo_recusa || "").trim()
                      ) {
                        setRequerimentoHover(r.id);
                      }
                    }}
                    onMouseLeave={() => setRequerimentoHover(null)}
                    style={{
                      borderBottom: "1px solid #edf2fc",
                      cursor: "pointer",
                      background:
                        requerimentoSelecionado === r.id ? "#e8f1ff" : "transparent"
                    }}
                  >
                    <td style={{ padding: "9px 8px", fontWeight: 700, color: "#123d92", whiteSpace: "normal", wordBreak: "break-word" }}>{r.protocolo || "-"}</td>
                    <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>{getNomeExibicaoRequerimento(r)}</td>
                    <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>{r.setor || "-"}</td>
                    <td style={{ padding: "9px 8px", maxWidth: 260, whiteSpace: "normal", wordBreak: "break-word" }}>{r.descricao || "-"}</td>
                    <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>
                      {Array.isArray(r.anexos) && r.anexos.length > 0 ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          {r.anexos.map((a, idx) => {
                            const href = montarUrlArquivo(a?.arquivo_caminho);
                            const nome = a?.arquivo_nome || `anexo-${idx + 1}`;
                            if (!href) return <span key={`${r.id}-a-${idx}`}>-</span>;
                            return (
                              <a
                                key={`${r.id}-a-${idx}`}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                download={nome}
                                style={{ color: "#0f50db", textDecoration: "underline", fontSize: 12 }}
                              >
                                Baixar: {nome}
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>
                      {r.data_pedido ? new Date(r.data_pedido).toLocaleString() : "-"}
                    </td>
                    <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>
                      <span
                        className={`cfg-status-badge status-${statusNormalizado.toLowerCase()}`}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: `1px solid ${statusVisual.border}`,
                          color: statusVisual.color,
                          background: statusVisual.background
                        }}
                      >
                        {statusVisual.texto}
                      </span>
                    </td>
                    {isDeveloper && (
                      <td style={{ padding: "9px 8px", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {!concluido && !recusado && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => concluirRequerimento(r.id)}
                              style={{
                                background: "#16a34a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "7px 12px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => abrirModalRecusa(r.id)}
                              style={{
                                background: "#dc2626",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "7px 12px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              Recusar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            </table>
          )}

          {modoMobileRequerimentos && (
            <div style={{ display: "grid", gap: 10, padding: 10 }}>
              {requerimentos.length === 0 && (
                <div style={{ padding: 10, color: "#6b7280" }}>Sem requerimentos para exibir.</div>
              )}

              {requerimentos.map((r) => {
                const statusNormalizado = String(r.status || "").toUpperCase();
                const concluido = statusNormalizado === "CONCLUIDO";
                const recusado = statusNormalizado === "RECUSADO";
                const statusVisual = getStatusVisual(statusNormalizado);
                const selecionado = requerimentoSelecionado === r.id;
                return (
                  <div
                    key={`card-${r.id}`}
                    className={`cfg-mobile-req-card ${selecionado ? "is-selected" : ""}`}
                    onDoubleClick={() =>
                      setRequerimentoSelecionado((atual) =>
                        atual === r.id ? null : r.id
                      )
                    }
                    onMouseEnter={() => {
                      if (
                        requerimentoSelecionado === r.id &&
                        recusado &&
                        String(r.motivo_recusa || "").trim()
                      ) {
                        setRequerimentoHover(r.id);
                      }
                    }}
                    onMouseLeave={() => setRequerimentoHover(null)}
                    style={{
                      border: "1px solid #e8eefb",
                      borderRadius: 10,
                      padding: 10,
                      background: selecionado ? "#e8f1ff" : "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <div className="cfg-mobile-req-protocolo" style={{ fontWeight: 700, color: "#123d92", marginBottom: 6 }}>
                      Protocolo: {r.protocolo || "-"}
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Usuário:</strong> {getNomeExibicaoRequerimento(r)}</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Setor:</strong> {r.setor || "-"}</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Descrição:</strong> {r.descricao || "-"}</div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Documentos:</strong>{" "}
                      {Array.isArray(r.anexos) && r.anexos.length > 0 ? (
                        <span style={{ display: "inline-grid", gap: 4, marginTop: 4 }}>
                          {r.anexos.map((a, idx) => {
                            const href = montarUrlArquivo(a?.arquivo_caminho);
                            const nome = a?.arquivo_nome || `anexo-${idx + 1}`;
                            if (!href) return <span key={`${r.id}-mobile-a-${idx}`}>-</span>;
                            return (
                              <a
                                key={`${r.id}-mobile-a-${idx}`}
                                className="cfg-mobile-req-link"
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                download={nome}
                                style={{ color: "#0f50db", textDecoration: "underline" }}
                              >
                                Baixar: {nome}
                              </a>
                            );
                          })}
                        </span>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      <strong>Data:</strong> {r.data_pedido ? new Date(r.data_pedido).toLocaleString() : "-"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        className={`cfg-status-badge status-${statusNormalizado.toLowerCase()}`}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: `1px solid ${statusVisual.border}`,
                          color: statusVisual.color,
                          background: statusVisual.background
                        }}
                      >
                        {statusVisual.texto}
                      </span>

                      {isDeveloper && !concluido && !recusado && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => concluirRequerimento(r.id)}
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontWeight: 700
                            }}
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => abrirModalRecusa(r.id)}
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontWeight: 700
                            }}
                          >
                            Recusar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {requerimentoHover &&
          requerimentoSelecionado &&
          requerimentoHover === requerimentoSelecionado && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#7f1d1d"
              }}
            >
              <strong>Motivo da recusa:</strong>{" "}
              {requerimentos.find((req) => req.id === requerimentoHover)?.motivo_recusa || "-"}
            </div>
          )}
      </div>

      {(isAdmin || isCoordenador) && (
        <div
          className="cfg-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginTop: 20
          }}
        >
          <div
            className="cfg-card cfg-side-card"
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Caixa de Solicitações</h3>

            <div className="cfg-list-scroll" style={{ minHeight: 220, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {solicitacoesPendentes.length === 0 && (
                <div className="cfg-empty" style={{ color: "#888", fontSize: 15 }}>
                  Nenhuma solicitação pendente.
                </div>
              )}

              {solicitacoesPendentes.map((s) => (
                <div
                  className="cfg-list-item"
                  key={s.id}
                  onDoubleClick={() => setSelecionada(s)}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #ddd",
                    cursor: "pointer",
                    background: "#fff"
                  }}
                >
                  <strong>{s.tarefa_nome}</strong> - {s.tipo}
                  <br />
                  Solicitado por: {s.solicitante_nome}
                  <br />
                  Status: {s.status}
                </div>
              ))}
            </div>
          </div>

          <div
            className="cfg-card cfg-side-card"
            style={{
              background: "#fefefe",
              padding: 20,
              borderRadius: 10,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Caixa de Mensagens</h3>

            <div className="cfg-list-scroll" style={{ minHeight: 220, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {mensagens.length === 0 && (
                <div className="cfg-empty" style={{ color: "#888", fontSize: 15 }}>
                  Nenhuma mensagem no momento.
                </div>
              )}

              {mensagens.map((s) => {
                const dataMensagem =
                  s.aprovado_em || s.respondido_em || s.atualizado_em || s.updated_at || s.updatedAt || s.criado_em;
                const minutosPermitidos = extrairMinutosPermitidos(s);
                const segundosRestantesBase = extrairNumeroFlexivel(
                  s?.tempo_restante_segundos ?? s?.segundos_restantes ?? s?.tempoRestanteSegundos
                );
                const expiraEm = parseDataSegura(
                  s?.tempo_liberado_ate || s?.expira_em || s?.expiracao_em || s?.data_expiracao
                );

                const segundosRestantes = expiraEm
                  ? Math.floor((expiraEm.getTime() - agora) / 1000)
                  : Number.isFinite(segundosRestantesBase)
                  ? segundosRestantesBase - Math.floor((agora - solicitacoesCarregadasEm) / 1000)
                  : null;

                return (
                  <div
                    className={`cfg-list-item cfg-msg-item ${s.status === "aceita" ? "is-accepted" : "is-rejected"}`}
                    key={`msg-${s.id}`}
                    onDoubleClick={() => setSelecionada(s)}
                    style={{
                      padding: 10,
                      borderBottom: "1px solid #ddd",
                      cursor: "pointer",
                      background: s.status === "aceita" ? "#f0fdf4" : "#fef2f2"
                    }}
                  >
                    <strong>{s.tarefa_nome}</strong>
                    <br />
                    {s.status === "aceita" ? "Aprovada" : "Recusada"} por {getNomeAprovadorSolicitacao(s)}
                    <br />
                    Solicitado por: {getNomeSolicitanteSolicitacao(s)}
                    <br />
                    {s.status === "aceita" && (
                      <>
                        Minutos permitidos: {minutosPermitidos ?? "-"}
                        <br />
                        {Number.isFinite(segundosRestantes) && segundosRestantes > 0 && (
                          <>
                            Tempo restante: {Math.max(0, Math.ceil(segundosRestantes / 60))} min
                            <br />
                          </>
                        )}
                      </>
                    )}
                    Data/Hora: {dataMensagem ? new Date(dataMensagem).toLocaleString() : "-"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selecionada && (
        <Modal onClose={() => setSelecionada(null)} size="md">
          <div
            className="cfg-modal-content"
            style={{
              padding: 20,
              borderRadius: 12,
              maxWidth: 560
            }}
          >
            <h2>Solicitação</h2>

            <p>
              <strong>Tarefa:</strong> {selecionada.tarefa_nome}
            </p>

            <p>
              <strong>Motivo:</strong> {selecionada.motivo}
            </p>

            <p>
              <strong>Data:</strong>{" "}
              {new Date(selecionada.criado_em).toLocaleString()}
            </p>

            {isAdmin &&
              selecionada.status === "pendente" && (
                <div className="cfg-modal-actions" style={{ marginTop: 20, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      const tipoSolicitacao = String(selecionada?.tipo || "").trim().toLowerCase();
                      if (tipoSolicitacao === "deletar") {
                        responder(selecionada, "aceita");
                        return;
                      }

                      abrirModalAceite(selecionada.id);
                    }}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6
                    }}
                  >
                    Aceitar
                  </button>

                  <button
                    onClick={() => responder(selecionada, "recusada")}
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6
                    }}
                  >
                    Recusar
                  </button>
                </div>
              )}

            <button
              onClick={() => setSelecionada(null)}
              style={{ marginTop: 20 }}
            >
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {modalMinutosAberto && (
        <Modal onClose={fecharModalAceite} size="sm">
          <div
            className="cfg-modal-content"
            style={{
              padding: 20,
              borderRadius: 12,
              maxWidth: 320,
              margin: "0 auto"
            }}
          >
            <h2>Definir tempo</h2>

            <div className="cronometro-animado" aria-hidden="true">
              <div className="cronometro-ponteiro" />
              <div className="cronometro-centro" />
            </div>

            <label style={{ display: "block", marginTop: 12, marginBottom: 8 }}>
              Minutos
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={minutosAceite}
              onChange={(e) => setMinutosAceite(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 16
              }}
            />

            <div className="cfg-modal-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={confirmarAceite}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6
                }}
              >
                Confirmar
              </button>

              <button
                onClick={fecharModalAceite}
                style={{
                  background: "#e5e7eb",
                  color: "#111827",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalRecusaAberto && (
        <Modal onClose={fecharModalRecusa} size="md">
          <div
            className="cfg-modal-content"
            style={{
              padding: 20,
              borderRadius: 12,
              maxWidth: 460,
              margin: "0 auto"
            }}
          >
            <h2>Recusar requerimento</h2>
            <p className="cfg-modal-muted" style={{ marginTop: 0, color: "#4b5563" }}>
              Informe o motivo da recusa para o usuário visualizar.
            </p>

            <textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              rows={5}
              placeholder="Descreva o motivo da recusa"
              style={{
                width: "100%",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                padding: 10,
                resize: "vertical"
              }}
            />

            <div className="cfg-modal-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={confirmarRecusaRequerimento}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontWeight: 700
                }}
              >
                Confirmar Recusa
              </button>

              <button
                onClick={fecharModalRecusa}
                style={{
                  background: "#e5e7eb",
                  color: "#111827",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </Layout>
  );
}

