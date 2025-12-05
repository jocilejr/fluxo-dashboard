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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plus,
  LayoutGrid,
  MoreHorizontal,
  Trash2,
  Edit2,
  Folder,
} from "lucide-react";

interface BoardsSidebarProps {
  selectedBoard: string | null;
  onSelectBoard: (id: string) => void;
}

export function BoardsSidebar({
  selectedBoard,
  onSelectBoard,
}: BoardsSidebarProps) {
  const { projects, createProject, deleteProject, updateProject, loadingProjects } = useMindMaps();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingProject, setEditingProject] = useState<MindMapProject | null>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      createProject.mutate({ name: newName.trim(), section: "Quadros" });
      setNewName("");
      setCreateOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(id);
    if (selectedBoard === id) {
      onSelectBoard("");
    }
  };

  const handleRename = () => {
    if (editingProject && newName.trim()) {
      updateProject.mutate({ id: editingProject.id, name: newName.trim() });
      setEditingProject(null);
      setNewName("");
    }
  };

  return (
    <div className="w-64 border-r flex flex-col bg-card/50 border-border/30 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Quadros</h2>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Quadro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do quadro</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Projeto Marketing"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!newName.trim()}>
                Criar Quadro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Boards list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loadingProjects ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum quadro</p>
              <Button variant="link" size="sm" onClick={() => setCreateOpen(true)}>
                Criar primeiro quadro
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map(board => (
                <div
                  key={board.id}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                    selectedBoard === board.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectBoard(board.id)}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate flex-1">{board.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0",
                          selectedBoard === board.id && "opacity-100 hover:bg-primary-foreground/10"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingProject(board);
                        setNewName(board.name);
                      }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(board.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Rename dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Quadro</DialogTitle>
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
