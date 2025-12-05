import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MindMapProject {
  id: string;
  name: string;
  description: string | null;
  section: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface MindMapNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  label: string;
  position_x: number;
  position_y: number;
  color: string;
  bg_color: string;
  shape: string;
  font_size: number;
  width: number;
  created_at: string;
  updated_at: string;
}

export interface MindMapConnection {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  color: string;
  style: string;
  created_at: string;
}

export function useMindMaps() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["mind-map-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mind_map_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MindMapProject[];
    },
    enabled: !!userId,
  });

  const createProject = useMutation({
    mutationFn: async ({ name, section, description }: { name: string; section: string; description?: string }) => {
      const { data, error } = await supabase
        .from("mind_map_projects")
        .insert({ name, section, description, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-projects"] });
      toast.success("Projeto criado!");
    },
    onError: () => toast.error("Erro ao criar projeto"),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MindMapProject> & { id: string }) => {
      const { error } = await supabase
        .from("mind_map_projects")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-projects"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mind_map_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-projects"] });
      toast.success("Projeto excluído");
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  // Sections grouping
  const sections = [...new Set(projects.map(p => p.section))];

  return {
    projects,
    sections,
    loadingProjects,
    createProject,
    updateProject,
    deleteProject,
    userId,
  };
}

export function useMindMapNodes(projectId: string | null) {
  const queryClient = useQueryClient();

  const { data: nodes = [], isLoading: loadingNodes } = useQuery({
    queryKey: ["mind-map-nodes", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("mind_map_nodes")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as MindMapNode[];
    },
    enabled: !!projectId,
  });

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: ["mind-map-connections", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("mind_map_connections")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as MindMapConnection[];
    },
    enabled: !!projectId,
  });

  const createNode = useMutation({
    mutationFn: async (node: Partial<MindMapNode> & { project_id: string; label: string }) => {
      const { data, error } = await supabase
        .from("mind_map_nodes")
        .insert(node)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-nodes", projectId] });
    },
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MindMapNode> & { id: string }) => {
      const { error } = await supabase
        .from("mind_map_nodes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-nodes", projectId] });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mind_map_nodes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-nodes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["mind-map-connections", projectId] });
    },
  });

  const createConnection = useMutation({
    mutationFn: async (conn: { project_id: string; source_node_id: string; target_node_id: string; color?: string }) => {
      const { data, error } = await supabase
        .from("mind_map_connections")
        .insert(conn)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-connections", projectId] });
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mind_map_connections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mind-map-connections", projectId] });
    },
  });

  return {
    nodes,
    connections,
    loadingNodes,
    loadingConnections,
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    deleteConnection,
  };
}
