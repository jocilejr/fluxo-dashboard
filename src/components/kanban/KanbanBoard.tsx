import { useState, useMemo } from "react";
import { useMindMapNodes } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  GripVertical,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

interface KanbanBoardProps {
  boardId: string;
  boardName: string;
}

const DEFAULT_COLUMNS = ["A Fazer", "Em Progresso", "Concluído"];
const COLUMN_COLORS: Record<string, string> = {
  "A Fazer": "#f97316",
  "Em Progresso": "#3b82f6",
  "Concluído": "#22c55e",
};

export function KanbanBoard({ boardId, boardName }: KanbanBoardProps) {
  const {
    nodes: cards,
    createNode: createCard,
    updateNode: updateCard,
    deleteNode: deleteCard,
  } = useMindMapNodes(boardId);

  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState("");
  const [draggingCard, setDraggingCard] = useState<string | null>(null);

  // Group cards by column (using shape field to store column name)
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, typeof cards> = {};
    columns.forEach(col => {
      grouped[col] = cards.filter(card => (card.shape || "A Fazer") === col);
    });
    return grouped;
  }, [cards, columns]);

  const handleAddColumn = () => {
    if (newColumnName.trim() && !columns.includes(newColumnName.trim())) {
      setColumns([...columns, newColumnName.trim()]);
      setNewColumnName("");
      setAddingColumn(false);
    }
  };

  const handleDeleteColumn = (columnName: string) => {
    // Move all cards from this column to "A Fazer"
    cards.filter(c => c.shape === columnName).forEach(card => {
      updateCard.mutate({ id: card.id, shape: "A Fazer" });
    });
    setColumns(columns.filter(c => c !== columnName));
  };

  const handleAddCard = (column: string) => {
    if (newCardTitle.trim()) {
      createCard.mutate({
        project_id: boardId,
        label: newCardTitle.trim(),
        shape: column,
        position_x: 0,
        position_y: cardsByColumn[column]?.length || 0,
        color: COLUMN_COLORS[column] || "#6366f1",
      });
      setNewCardTitle("");
      setAddingCardToColumn(null);
    }
  };

  const handleEditCard = () => {
    if (editingCard && editingCardTitle.trim()) {
      updateCard.mutate({ id: editingCard, label: editingCardTitle.trim() });
      setEditingCard(null);
      setEditingCardTitle("");
    }
  };

  const handleDragStart = (cardId: string) => {
    setDraggingCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (column: string) => {
    if (draggingCard) {
      updateCard.mutate({ 
        id: draggingCard, 
        shape: column,
        color: COLUMN_COLORS[column] || "#6366f1",
      });
      setDraggingCard(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30 bg-card/30">
        <h1 className="text-lg font-semibold">{boardName}</h1>
        <p className="text-sm text-muted-foreground">
          {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
        </p>
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-4 p-6 min-h-full">
          {columns.map(column => (
            <div
              key={column}
              className="w-72 shrink-0 flex flex-col bg-muted/30 rounded-xl"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column)}
            >
              {/* Column header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-2.5 w-2.5 rounded-full" 
                    style={{ backgroundColor: COLUMN_COLORS[column] || "#6366f1" }}
                  />
                  <span className="font-medium text-sm">{column}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {cardsByColumn[column]?.length || 0}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setAddingCardToColumn(column)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar cartão
                    </DropdownMenuItem>
                    {!DEFAULT_COLUMNS.includes(column) && (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteColumn(column)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir coluna
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 pt-0 space-y-2 min-h-[100px]">
                {cardsByColumn[column]?.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    className={cn(
                      "group bg-card rounded-lg p-3 cursor-grab active:cursor-grabbing border border-border/50 hover:border-border transition-all shadow-sm hover:shadow",
                      draggingCard === card.id && "opacity-50"
                    )}
                  >
                    {editingCard === card.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingCardTitle}
                          onChange={(e) => setEditingCardTitle(e.target.value)}
                          className="min-h-[60px] text-sm resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditCard} className="h-7 text-xs">
                            Salvar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setEditingCard(null)}
                            className="h-7 text-xs"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-sm flex-1">{card.label}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingCard(card.id);
                              setEditingCardTitle(card.label);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteCard.mutate(card.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add card form */}
                {addingCardToColumn === column && (
                  <div className="bg-card rounded-lg p-3 border border-border/50 space-y-2">
                    <Textarea
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Digite o título do cartão..."
                      className="min-h-[60px] text-sm resize-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCard(column);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleAddCard(column)} className="h-7 text-xs">
                        Adicionar
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={() => {
                          setAddingCardToColumn(null);
                          setNewCardTitle("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add card button */}
              {addingCardToColumn !== column && (
                <div className="p-2 pt-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground h-9 text-sm"
                    onClick={() => setAddingCardToColumn(column)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar cartão
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add column */}
          <div className="w-72 shrink-0">
            {addingColumn ? (
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nome da coluna"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAddColumn} className="h-8">
                    Adicionar
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8" 
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start bg-muted/20 hover:bg-muted/40 border border-dashed border-border/50 h-11"
                onClick={() => setAddingColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar coluna
              </Button>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
