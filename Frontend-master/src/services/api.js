import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-an54.onrender.com/api"
});
let avisoConexaoMostrado = false;

// Interceptor de resposta para redirecionar ao receber 401 (token invalido/expirado)
api.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) {
      if (!avisoConexaoMostrado) {
        avisoConexaoMostrado = true;
        alert("Sem conexao com o servidor. As tabelas podem aparecer vazias.");
        setTimeout(() => {
          avisoConexaoMostrado = false;
        }, 5000);
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
