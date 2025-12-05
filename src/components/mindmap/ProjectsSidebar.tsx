import { useState } from "react";
import { MindMapProject, useMindMaps } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plus,
  FolderOpen,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit2,
  Brain,
  Sun,
  Moon,
} from "lucide-react";

interface ProjectsSidebarProps {
  selectedProject: string | null;
  onSelectProject: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function ProjectsSidebar({
  selectedProject,
  onSelectProject,
  theme,
  onToggleTheme,
}: ProjectsSidebarProps) {
  const { projects, sections, createProject, deleteProject, updateProject, loadingProjects } = useMindMaps();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSection, setNewSection] = useState("Geral");
  const [openSections, setOpenSections] = useState<string[]>(["Geral"]);
  const [editingProject, setEditingProject] = useState<MindMapProject | null>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      createProject.mutate({ name: newName.trim(), section: newSection || "Geral" });
      setNewName("");
      setNewSection("Geral");
      setCreateOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(id);
    if (selectedProject === id) {
      onSelectProject("");
    }
  };

  const handleRename = () => {
    if (editingProject && newName.trim()) {
      updateProject.mutate({ id: editingProject.id, name: newName.trim() });
      setEditingProject(null);
      setNewName("");
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const projectsBySection = sections.reduce((acc, section) => {
    acc[section] = projects.filter(p => p.section === section);
    return acc;
  }, {} as Record<string, MindMapProject[]>);

  return (
    <div className={cn(
      "w-72 border-r flex flex-col",
      theme === "dark" ? "bg-card border-border/30" : "bg-white border-gray-200"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        theme === "dark" ? "border-border/30" : "border-gray-200"
      )}>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Projetos</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Mapa Mental</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do projeto</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Meu mapa mental"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seção</Label>
                  <Input
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    placeholder="Geral"
                  />
                  {sections.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sections.map(s => (
                        <button
                          key={s}
                          className={cn(
                            "px-2 py-1 text-xs rounded-full border transition-colors",
                            newSection === s
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted hover:bg-muted/80 border-border"
                          )}
                          onClick={() => setNewSection(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={!newName.trim()}>
                  Criar Projeto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loadingProjects ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum projeto</p>
              <Button variant="link" size="sm" onClick={() => setCreateOpen(true)}>
                Criar primeiro projeto
              </Button>
            </div>
          ) : (
            sections.map(section => (
              <Collapsible
                key={section}
                open={openSections.includes(section)}
                onOpenChange={() => toggleSection(section)}
              >
                <CollapsibleTrigger className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  theme === "dark" 
                    ? "hover:bg-muted/50 text-muted-foreground" 
                    : "hover:bg-gray-100 text-gray-600"
                )}>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    openSections.includes(section) && "rotate-90"
                  )} />
                  {section}
                  <span className="ml-auto text-xs opacity-50">
                    {projectsBySection[section]?.length || 0}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {projectsBySection[section]?.map(project => (
                    <div
                      key={project.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                        selectedProject === project.id
                          ? "bg-primary text-primary-foreground"
                          : theme === "dark"
                            ? "hover:bg-muted/50"
                            : "hover:bg-gray-100"
                      )}
                      onClick={() => onSelectProject(project.id)}
                    >
                      <Brain className="h-4 w-4 shrink-0" />
                      <span className="text-sm truncate flex-1">{project.name}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0",
                              selectedProject === project.id && "opacity-100"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => {
                            setEditingProject(project);
                            setNewName(project.name);
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Rename dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Novo nome"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
            <Button className="w-full" onClick={handleRename}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
