import { useState } from "react";
import { ProjectsSidebar } from "@/components/mindmap/ProjectsSidebar";
import { MindMapCanvas } from "@/components/mindmap/MindMapCanvas";
import { useMindMaps } from "@/hooks/useMindMaps";
import { Brain } from "lucide-react";

const Projetos = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { projects } = useMindMaps();

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-4 sm:-m-6">
      <ProjectsSidebar
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
      />
      
      <div className="flex-1 flex flex-col p-4">
        {selectedProject && currentProject ? (
          <>
            <div className="mb-4">
              <h1 className="text-xl font-bold">{currentProject.name}</h1>
              {currentProject.description && (
                <p className="text-sm text-muted-foreground">{currentProject.description}</p>
              )}
            </div>
            <MindMapCanvas projectId={selectedProject} theme={theme} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Mapas Mentais</h2>
              <p className="text-muted-foreground max-w-sm">
                Selecione um projeto na barra lateral ou crie um novo para começar a organizar suas ideias.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projetos;
