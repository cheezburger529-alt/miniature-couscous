import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type StageResponse } from "@shared/routes";

export function useStages() {
  return useQuery({
    queryKey: [api.stages.list.path],
    queryFn: async () => {
      const res = await fetch(api.stages.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stages");
      return api.stages.list.responses[200].parse(await res.json());
    },
  });
}

export function useStage(slug: string) {
  return useQuery({
    queryKey: [api.stages.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.stages.get.path, { slug });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch stage");
      return api.stages.get.responses[200].parse(await res.json());
    },
    enabled: !!slug,
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const res = await fetch(api.stages.create.path, {
        method: api.stages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create stage");
      return api.stages.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stages.list.path] });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const url = buildUrl(api.stages.update.path, { id });
      const res = await fetch(url, {
        method: api.stages.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update stage");
      return api.stages.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.stages.list.path] });
    },
  });
}
