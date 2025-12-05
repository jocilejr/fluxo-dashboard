import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardsSidebar } from "@/components/kanban/BoardsSidebar";
import { useMindMaps } from "@/hooks/useMindMaps";
import { LayoutGrid } from "lucide-react";

const Projetos = () => {
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const { projects } = useMindMaps();

  const currentBoard = projects.find(p => p.id === selectedBoard);

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-64px)] overflow-hidden">
      <BoardsSidebar
        selectedBoard={selectedBoard}
        onSelectBoard={setSelectedBoard}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedBoard && currentBoard ? (
          <KanbanBoard boardId={selectedBoard} boardName={currentBoard.name} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Quadros</h2>
              <p className="text-muted-foreground max-w-sm">
                Selecione um quadro na barra lateral ou crie um novo para organizar suas tarefas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projetos;
