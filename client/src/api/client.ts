import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dsr_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("dsr_token");
      if (!location.pathname.startsWith("/login")) location.assign("/login");
    }
    if (error.response?.status === 402 && !location.pathname.startsWith("/pricing") && !location.pathname.startsWith("/billing")) {
      location.assign("/pricing?upgrade=1");
    }
    return Promise.reject(error);
  }
);
