import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAdmin() {
  return useQuery({
    queryKey: [api.admin.verify.path],
    queryFn: async () => {
      const res = await fetch(api.admin.verify.path, { credentials: "include" });
      if (res.status === 401) return { isAuthenticated: false };
      if (!res.ok) throw new Error("Failed to verify admin status");
      return api.admin.verify.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch(api.admin.login.path, {
        method: api.admin.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.status === 401) throw new Error("Invalid password");
      if (!res.ok) throw new Error("Login failed");
      return api.admin.login.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.verify.path] });
    },
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.admin.logout.path, {
        method: api.admin.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      return api.admin.logout.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.setQueryData([api.admin.verify.path], { isAuthenticated: false });
      queryClient.invalidateQueries({ queryKey: [api.admin.verify.path] });
    },
  });
}
