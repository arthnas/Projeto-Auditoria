import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import "./layout.css";
import logoEmpresas from "../assets/logo-empresas.png";

export default function Layout({ children }) {
  const { logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth > 1024 : true
  );
  const [modoNoturno, setModoNoturno] = useState(() => {
    try {
      return localStorage.getItem("tema_modo") === "dark";
    } catch {
      return false;
    }
  });
  const [quantidadeNotificacoes, setQuantidadeNotificacoes] = useState(0);
  const [chavesNotificacoesAtuais, setChavesNotificacoesAtuais] = useState([]);
  const [chavesNotificacoesVistas, setChavesNotificacoesVistas] = useState([]);

  const usuarioLogado = useMemo(() => {
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }, [token]);

  const nomeUsuarioLogado = String(
    usuarioLogado?.nome ||
      usuarioLogado?.name ||
      usuarioLogado?.usuario ||
      usuarioLogado?.preferred_username ||
      usuarioLogado?.email ||
      usuarioLogado?.sub ||
      ""
  ).trim();

  const tipoUsuarioLogado = String(usuarioLogado?.tipo || "").trim().toUpperCase();
  const isAdmin = tipoUsuarioLogado === "ADMIN" || tipoUsuarioLogado === "DEVELOPER";
  const isCoordenador = tipoUsuarioLogado === "COORDENADOR";

  const nomeExibicao = nomeUsuarioLogado || "Usuário online";
  const identificadorNotificacoes = String(
    usuarioLogado?.id || usuarioLogado?.usuario || usuarioLogado?.sub || "anon"
  ).trim();
  const chaveStorageNotificacoesVistas = `notificacoes_vistas_${identificadorNotificacoes}`;

  useEffect(() => {
    if (!identificadorNotificacoes || identificadorNotificacoes === "anon") {
      setChavesNotificacoesVistas([]);
      return;
    }

    try {
      const bruto = localStorage.getItem(chaveStorageNotificacoesVistas);
      const lista = bruto ? JSON.parse(bruto) : [];
      setChavesNotificacoesVistas(Array.isArray(lista) ? lista.map((item) => String(item)) : []);
    } catch {
      setChavesNotificacoesVistas([]);
    }
  }, [chaveStorageNotificacoesVistas, identificadorNotificacoes]);

  useEffect(() => {
    function handleShortcut(e) {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setMenuAberto((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarNotificacoes = async () => {
      if (!token) {
        if (ativo) setQuantidadeNotificacoes(0);
        return;
      }

      const chavesAtuais = [];

      try {
        if (tipoUsuarioLogado === "DEVELOPER") {
          const respostaSolicitacoes = await api.get("/solicitacoes");
          const listaSolicitacoes = Array.isArray(respostaSolicitacoes?.data)
            ? respostaSolicitacoes.data
            : [];
          listaSolicitacoes
            .filter((item) => String(item?.status || "").trim().toLowerCase() === "pendente")
            .forEach((item) => chavesAtuais.push(`solicitacao:${item?.id}`));
        } else {
          // ADMIN, COORDENADOR, PADRAO e SUPERVISOR:
          // só contam quando RECEBEM resposta, nunca quando enviam.
          const respostaSolicitacoes = await api.get("/solicitacoes/minhas");
          const listaSolicitacoes = Array.isArray(respostaSolicitacoes?.data)
            ? respostaSolicitacoes.data
            : [];
          listaSolicitacoes
            .filter((item) => {
              const status = String(item?.status || "").trim().toLowerCase();
              return status === "aceita" || status === "recusada";
            })
            .forEach((item) => chavesAtuais.push(`solicitacao:${item?.id}`));
        }
      } catch {
      }

      try {
        const endpointRequerimentos =
          tipoUsuarioLogado === "DEVELOPER" ? "/requerimentos" : "/requerimentos/minhas";
        const respostaRequerimentos = await api.get(endpointRequerimentos);
        const listaRequerimentos = Array.isArray(respostaRequerimentos?.data)
          ? respostaRequerimentos.data
          : [];

        if (tipoUsuarioLogado === "DEVELOPER") {
          // Developer "recebe" novos requerimentos pendentes para tratar.
          listaRequerimentos
            .filter((item) => String(item?.status || "").trim().toUpperCase() === "PENDENTE")
            .forEach((item) => chavesAtuais.push(`requerimento:${item?.id}`));
        } else {
          // Todos os demais perfis contam somente retorno recebido.
          listaRequerimentos
            .filter((item) => String(item?.status || "").trim().toUpperCase() !== "PENDENTE")
            .forEach((item) => chavesAtuais.push(`requerimento:${item?.id}`));
        }
      } catch {
      }

      if (ativo) {
        const vistasSet = new Set(chavesNotificacoesVistas.map((item) => String(item)));
        const unicasAtuais = [...new Set(chavesAtuais.map((item) => String(item)))];
        const naoLidas = unicasAtuais.filter((chave) => !vistasSet.has(chave)).length;
        setChavesNotificacoesAtuais(unicasAtuais);
        setQuantidadeNotificacoes(naoLidas);
      }
    };

    carregarNotificacoes();
    const intervalId = setInterval(carregarNotificacoes, 10000);

    return () => {
      ativo = false;
      clearInterval(intervalId);
    };
  }, [token, isAdmin, isCoordenador, tipoUsuarioLogado, chavesNotificacoesVistas]);

  function marcarNotificacoesComoVistas() {
    const unicas = [...new Set([...chavesNotificacoesVistas, ...chavesNotificacoesAtuais])];
    setChavesNotificacoesVistas(unicas);
    setQuantidadeNotificacoes(0);
    try {
      localStorage.setItem(chaveStorageNotificacoesVistas, JSON.stringify(unicas));
    } catch {
    }
  }

  useEffect(() => {
    if (location.pathname === "/configuracoes") {
      marcarNotificacoesComoVistas();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 1024) {
      setMenuAberto(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const body = document.body;
    if (!body) return;

    if (modoNoturno) {
      body.classList.add("theme-dark");
    } else {
      body.classList.remove("theme-dark");
    }

    try {
      localStorage.setItem("tema_modo", modoNoturno ? "dark" : "light");
    } catch {
    }
  }, [modoNoturno]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <div className="layout">
      <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)}>
        ☰
      </button>

      <aside className={`sidebar ${menuAberto ? "active" : "collapsed"}`}>
        <div className="logo-container">
          <img src={logoEmpresas} alt="Empresas" className="logo-img" />
        </div>

        <nav>
          <NavLink to="/dashboard" onClick={fecharMenu} data-label="Dashboard">
            <span>📊</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/coordenadores" onClick={fecharMenu} data-label="Coordenadores">
            <span>🧑‍💼</span>
            <span>Coordenadores</span>
          </NavLink>

          <NavLink to="/setores" onClick={fecharMenu} data-label="Setores">
            <span>📁</span>
            <span>Setores</span>
          </NavLink>

          <NavLink to="/subsetores" onClick={fecharMenu} data-label="Subsetores">
            <span>📂</span>
            <span>Subsetores</span>
          </NavLink>

          <NavLink to="/tarefas" onClick={fecharMenu} data-label="Atividades">
            <span>📋</span>
            <span>Atividades</span>
          </NavLink>

          <NavLink to="/registros" onClick={fecharMenu} data-label="Registros">
            <span>🗂️</span>
            <span>Registros</span>
          </NavLink>

          <NavLink
            to="/configuracoes"
            onClick={() => {
              fecharMenu();
              marcarNotificacoesComoVistas();
            }}
            data-label="Configurações"
          >
            <span className="nav-icon-wrapper">
              <span>🌐</span>
              {quantidadeNotificacoes > 0 && (
                <span
                  className="nav-notification-badge is-pulsing"
                  aria-label={`${quantidadeNotificacoes} notificações pendentes`}
                >
                  {quantidadeNotificacoes > 99 ? "99+" : quantidadeNotificacoes}
                </span>
              )}
            </span>
            <span>Notificações</span>
          </NavLink>

          <NavLink to="/usuarios" onClick={fecharMenu} data-label="Usuários">
            <span>🪪</span>
            <span>Usuários</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="theme-toggle-container">
            <button
              type="button"
              className={`theme-toggle ${modoNoturno ? "on" : "off"}`}
              onClick={() => setModoNoturno((atual) => !atual)}
              aria-label={modoNoturno ? "Desativar modo noturno" : "Ativar modo noturno"}
              title={modoNoturno ? "Modo noturno ligado" : "Modo noturno desligado"}
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-knob" />
              </span>
            </button>
          </div>

          <div className="online-wrapper">
            <button type="button" className="user-online" title={`Usuário logado: ${nomeExibicao}`}>
              <span className="online-dot" aria-hidden="true" />
              <span className="online-name">{nomeExibicao}</span>
            </button>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <span style={{ fontSize: 20, marginRight: 6 }}>⏻</span> Sair
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
