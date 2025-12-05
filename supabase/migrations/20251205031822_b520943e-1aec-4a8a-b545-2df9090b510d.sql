-- Create mind_map_projects table
CREATE TABLE public.mind_map_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  section TEXT DEFAULT 'Geral',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mind_map_nodes table
CREATE TABLE public.mind_map_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.mind_map_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.mind_map_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  bg_color TEXT DEFAULT '#1e1e2e',
  shape TEXT DEFAULT 'rounded',
  font_size INTEGER DEFAULT 14,
  width NUMERIC DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mind_map_connections table
CREATE TABLE public.mind_map_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.mind_map_projects(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.mind_map_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.mind_map_nodes(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6366f1',
  style TEXT DEFAULT 'solid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mind_map_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_map_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for mind_map_projects
CREATE POLICY "Users can view their own projects" ON public.mind_map_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.mind_map_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.mind_map_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.mind_map_projects FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for mind_map_nodes
CREATE POLICY "Users can view nodes of their projects" ON public.mind_map_nodes FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create nodes in their projects" ON public.mind_map_nodes FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can update nodes in their projects" ON public.mind_map_nodes FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete nodes in their projects" ON public.mind_map_nodes FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));

-- RLS policies for mind_map_connections
CREATE POLICY "Users can view connections of their projects" ON public.mind_map_connections FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create connections in their projects" ON public.mind_map_connections FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can update connections in their projects" ON public.mind_map_connections FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete connections in their projects" ON public.mind_map_connections FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.mind_map_projects WHERE id = project_id AND user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_mind_map_projects_updated_at BEFORE UPDATE ON public.mind_map_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mind_map_nodes_updated_at BEFORE UPDATE ON public.mind_map_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();