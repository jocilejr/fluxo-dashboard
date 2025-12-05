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
  X,
  Settings2,
  Palette,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { KanbanCard } from "./KanbanCard";

interface KanbanBoardProps {
  boardId: string;
  boardName: string;
}

const DEFAULT_COLUMNS = ["A Fazer", "Em Progresso", "Concluído"];

const COLUMN_COLORS: Record<string, string> = {
  "A Fazer": "#f97316",
  "Em Progresso": "#3b82f6",
  "Concluído": "#22c55e",
  "Backlog": "#6b7280",
  "Revisão": "#8b5cf6",
  "Bloqueado": "#ef4444",
};

const ALL_COLUMN_COLORS = [
  { name: "Laranja", value: "#f97316" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Cinza", value: "#6b7280" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ciano", value: "#06b6d4" },
];

export function KanbanBoard({ boardId, boardName }: KanbanBoardProps) {
  const {
    nodes: cards,
    createNode: createCard,
    updateNode: updateCard,
    deleteNode: deleteCard,
  } = useMindMapNodes(boardId);

  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [columnColors, setColumnColors] = useState<Record<string, string>>(COLUMN_COLORS);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [editedColumnName, setEditedColumnName] = useState("");

  // Group cards by column (using shape field to store column name)
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, typeof cards> = {};
    columns.forEach(col => {
      grouped[col] = cards
        .filter(card => (card.shape || "A Fazer") === col)
        .sort((a, b) => a.position_y - b.position_y);
    });
    return grouped;
  }, [cards, columns]);

  const totalCards = cards.length;
  const completedCards = cardsByColumn["Concluído"]?.length || 0;

  const handleAddColumn = () => {
    if (newColumnName.trim() && !columns.includes(newColumnName.trim())) {
      const name = newColumnName.trim();
      setColumns([...columns, name]);
      setColumnColors({ ...columnColors, [name]: "#6b7280" });
      setNewColumnName("");
      setAddingColumn(false);
    }
  };

  const handleDeleteColumn = (columnName: string) => {
    cards.filter(c => c.shape === columnName).forEach(card => {
      updateCard.mutate({ id: card.id, shape: "A Fazer" });
    });
    setColumns(columns.filter(c => c !== columnName));
  };

  const handleRenameColumn = (oldName: string) => {
    if (editedColumnName.trim() && editedColumnName !== oldName) {
      const newName = editedColumnName.trim();
      // Update column list
      setColumns(columns.map(c => c === oldName ? newName : c));
      // Update color mapping
      const newColors = { ...columnColors };
      newColors[newName] = newColors[oldName] || "#6b7280";
      delete newColors[oldName];
      setColumnColors(newColors);
      // Update all cards in this column
      cards.filter(c => c.shape === oldName).forEach(card => {
        updateCard.mutate({ id: card.id, shape: newName });
      });
    }
    setEditingColumnName(null);
    setEditedColumnName("");
  };

  const handleColumnColorChange = (columnName: string, color: string) => {
    setColumnColors({ ...columnColors, [columnName]: color });
  };

  const handleAddCard = (column: string) => {
    if (newCardTitle.trim()) {
      createCard.mutate({
        project_id: boardId,
        label: newCardTitle.trim(),
        shape: column,
        position_x: 0,
        position_y: (cardsByColumn[column]?.length || 0) * 10,
        color: "",
        bg_color: "#1e1e2e",
        font_size: 14,
      });
      setNewCardTitle("");
      setAddingCardToColumn(null);
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
        position_y: (cardsByColumn[column]?.length || 0) * 10,
      });
      setDraggingCard(null);
    }
  };

  const handleUpdateCard = (id: string, data: any) => {
    updateCard.mutate({ id, ...data });
  };

  const handleDeleteCard = (id: string) => {
    deleteCard.mutate(id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30 bg-card/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{boardName}</h1>
            <p className="text-sm text-muted-foreground">
              {totalCards} {totalCards === 1 ? "cartão" : "cartões"}
              {completedCards > 0 && (
                <span className="text-green-500 ml-2">
                  • {completedCards} concluído{completedCards > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totalCards > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(completedCards / totalCards) * 100}%` }}
                  />
                </div>
                <span>{Math.round((completedCards / totalCards) * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-4 p-6 min-h-full">
          {columns.map(column => (
            <div
              key={column}
              className="w-80 shrink-0 flex flex-col bg-muted/30 rounded-xl max-h-[calc(100vh-200px)]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column)}
            >
              {/* Column header */}
              <div className="p-3 flex items-center justify-between border-b border-border/20">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div 
                    className="h-3 w-3 rounded-full shrink-0" 
                    style={{ backgroundColor: columnColors[column] || "#6b7280" }}
                  />
                  {editingColumnName === column ? (
                    <Input
                      value={editedColumnName}
                      onChange={(e) => setEditedColumnName(e.target.value)}
                      onBlur={() => handleRenameColumn(column)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameColumn(column)}
                      className="h-7 text-sm font-medium"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-sm truncate">{column}</span>
                  )}
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {cardsByColumn[column]?.length || 0}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setAddingCardToColumn(column)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar cartão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setEditingColumnName(column);
                      setEditedColumnName(column);
                    }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Renomear coluna
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Palette className="h-4 w-4 mr-2" />
                        Cor da coluna
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {ALL_COLUMN_COLORS.map(color => (
                          <DropdownMenuItem 
                            key={color.value}
                            onClick={() => handleColumnColorChange(column, color.value)}
                          >
                            <div 
                              className="h-4 w-4 rounded-full mr-2" 
                              style={{ backgroundColor: color.value }}
                            />
                            {color.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {!DEFAULT_COLUMNS.includes(column) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteColumn(column)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir coluna
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cards */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {cardsByColumn[column]?.map(card => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      onUpdate={handleUpdateCard}
                      onDelete={handleDeleteCard}
                      isDragging={draggingCard === card.id}
                      onDragStart={() => handleDragStart(card.id)}
                    />
                  ))}

                  {/* Add card form */}
                  {addingCardToColumn === column && (
                    <div className="bg-card rounded-lg p-3 border border-border/50 space-y-2">
                      <Textarea
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        placeholder="Digite o título do cartão..."
                        className="min-h-[70px] text-sm resize-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCard(column);
                          }
                          if (e.key === "Escape") {
                            setAddingCardToColumn(null);
                            setNewCardTitle("");
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleAddCard(column)} className="h-8">
                          Adicionar
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
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
              </ScrollArea>

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
          <div className="w-80 shrink-0">
            {addingColumn ? (
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nome da coluna"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }
                  }}
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
                className="w-full justify-start bg-muted/20 hover:bg-muted/40 border border-dashed border-border/50 h-12"
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
