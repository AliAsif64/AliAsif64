import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
}

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { organizationName: string; name: string; email: string; password: string; plan?: string }) => Promise<void>;
  loginWithToken: (token: string, user: User, organization: Organization) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dsr_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        setOrganization(res.data.organization);
      })
      .catch(() => localStorage.removeItem("dsr_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("dsr_token", res.data.token);
    setUser(res.data.user);
    setOrganization(res.data.organization);
  }

  async function register(data: { organizationName: string; name: string; email: string; password: string; plan?: string }) {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("dsr_token", res.data.token);
    setUser(res.data.user);
    setOrganization(res.data.organization);
  }

  function loginWithToken(token: string, nextUser: User, nextOrganization: Organization) {
    localStorage.setItem("dsr_token", token);
    setUser(nextUser);
    setOrganization(nextOrganization);
  }

  function logout() {
    localStorage.removeItem("dsr_token");
    setUser(null);
    setOrganization(null);
  }

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
