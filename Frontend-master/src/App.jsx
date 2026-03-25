


import Registros from "./pages/Registros";
import Tarefas from "./pages/Tarefas";
import Subsetores from "./pages/Subsetores";
import Setores from "./pages/Setores";
import Coordenadores from "./pages/Coordenadores";
import Usuarios from "./pages/Usuarios";
import Dashboard from "./pages/Dashboard";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <PrivateRoute>
              <Configuracoes />
            </PrivateRoute>
          }
        />
        <Route
  path="/usuarios"
  element={
    <PrivateRoute>
      <Usuarios />
    </PrivateRoute>
  }
/>
<Route
  path="/coordenadores"
  element={
    <PrivateRoute>
      <Coordenadores />
    </PrivateRoute>
  }
/>
<Route
  path="/setores"
  element={
    <PrivateRoute>
      <Setores />
    </PrivateRoute>
  }
/>
<Route
  path="/subsetores"
  element={
    <PrivateRoute>
      <Subsetores />
    </PrivateRoute>
  }
/>
<Route
  path="/tarefas"
  element={
    <PrivateRoute>
      <Tarefas />
    </PrivateRoute>
  }
/>
<Route
  path="/registros"
  element={
    <PrivateRoute>
      <Registros />
    </PrivateRoute>
  }
/>
<Route path="*" element={<Navigate to="/" replace />} />


      </Routes>
    </BrowserRouter>
  );
}
