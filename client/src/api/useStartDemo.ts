import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "./client";
import { useAuth } from "../context/AuthContext";

interface DemoResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  organization: { id: string; name: string; plan: string };
  expiresAt: string;
}

export function useStartDemo(landingPath = "/dashboard") {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => (await api.post<DemoResponse>("/demo/session")).data,
    onSuccess: (data) => {
      loginWithToken(data.token, data.user, data.organization);
      navigate(landingPath);
    },
  });
}
