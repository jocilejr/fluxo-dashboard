import { useState } from "react";
import { MindMapNode } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Trash2,
  Edit2,
  GripVertical,
  Calendar,
  Tag,
  AlignLeft,
  Palette,
  Type,
  Check,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  card: MindMapNode;
  onUpdate: (id: string, data: Partial<MindMapNode>) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  onDragStart: () => void;
}

const CARD_COLORS = [
  { name: "Padrão", value: "#1e1e2e" },
  { name: "Azul", value: "#1e3a5f" },
  { name: "Verde", value: "#1a3d2e" },
  { name: "Roxo", value: "#2d1f47" },
  { name: "Vermelho", value: "#3d1f1f" },
  { name: "Laranja", value: "#3d2a1f" },
  { name: "Amarelo", value: "#3d3a1f" },
];

const LABEL_COLORS = [
  { name: "Verde", value: "#22c55e" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Laranja", value: "#f97316" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ciano", value: "#06b6d4" },
];

const FONT_SIZES = [
  { name: "Pequeno", value: 12 },
  { name: "Normal", value: 14 },
  { name: "Médio", value: 16 },
  { name: "Grande", value: 18 },
  { name: "Extra Grande", value: 20 },
];

export function KanbanCard({ card, onUpdate, onDelete, isDragging, onDragStart }: KanbanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.label);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [description, setDescription] = useState(card.bg_color?.startsWith("#") ? "" : (card.bg_color || ""));
  
  // Parse metadata from position_x (hacky but works with existing schema)
  const metadata = {
    labels: [] as string[],
    dueDate: "",
    description: "",
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(card.id, { label: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleColorChange = (color: string) => {
    onUpdate(card.id, { bg_color: color });
  };

  const handleFontSizeChange = (size: number) => {
    onUpdate(card.id, { font_size: size });
  };

  const handleLabelToggle = (labelColor: string) => {
    const currentColor = card.color || "";
    if (currentColor === labelColor) {
      onUpdate(card.id, { color: "" });
    } else {
      onUpdate(card.id, { color: labelColor });
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        className={cn(
          "group rounded-lg border border-border/50 hover:border-border transition-all shadow-sm hover:shadow cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 rotate-2"
        )}
        style={{ backgroundColor: card.bg_color?.startsWith("#") ? card.bg_color : "#1e1e2e" }}
      >
        {/* Label stripe */}
        {card.color && (
          <div 
            className="h-1.5 rounded-t-lg" 
            style={{ backgroundColor: card.color }}
          />
        )}

        <div className="p-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="min-h-[60px] text-sm resize-none bg-background/50"
                style={{ fontSize: card.font_size || 14 }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs gap-1">
                  <Check className="h-3 w-3" />
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => setDetailsOpen(true)}
              >
                <p 
                  className="text-foreground leading-relaxed"
                  style={{ fontSize: card.font_size || 14 }}
                >
                  {card.label}
                </p>
                {card.width && card.width > 150 && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {String(card.width)}
                  </p>
                )}
              </div>
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    setEditTitle(card.label);
                    setIsEditing(true);
                  }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar título
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                    <AlignLeft className="h-4 w-4 mr-2" />
                    Abrir detalhes
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Tag className="h-4 w-4 mr-2" />
                      Etiqueta
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {LABEL_COLORS.map(label => (
                        <DropdownMenuItem 
                          key={label.value}
                          onClick={() => handleLabelToggle(label.value)}
                        >
                          <div 
                            className="h-4 w-4 rounded mr-2" 
                            style={{ backgroundColor: label.value }}
                          />
                          {label.name}
                          {card.color === label.value && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      {card.color && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleLabelToggle(card.color!)}>
                            <X className="h-4 w-4 mr-2" />
                            Remover etiqueta
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="h-4 w-4 mr-2" />
                      Cor do cartão
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {CARD_COLORS.map(color => (
                        <DropdownMenuItem 
                          key={color.value}
                          onClick={() => handleColorChange(color.value)}
                        >
                          <div 
                            className="h-4 w-4 rounded border border-border mr-2" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                          {card.bg_color === color.value && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Type className="h-4 w-4 mr-2" />
                      Tamanho da fonte
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {FONT_SIZES.map(size => (
                        <DropdownMenuItem 
                          key={size.value}
                          onClick={() => handleFontSizeChange(size.value)}
                        >
                          <span style={{ fontSize: size.value }}>{size.name}</span>
                          {(card.font_size || 14) === size.value && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onDelete(card.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Card Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {card.color && (
                <div 
                  className="h-4 w-4 rounded" 
                  style={{ backgroundColor: card.color }}
                />
              )}
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => {
                  if (editTitle.trim() && editTitle !== card.label) {
                    onUpdate(card.id, { label: editTitle.trim() });
                  }
                }}
                className="border-none text-lg font-semibold p-0 h-auto focus-visible:ring-0"
                style={{ fontSize: card.font_size || 14 }}
              />
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Labels */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Etiquetas</Label>
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.map(label => (
                  <button
                    key={label.value}
                    onClick={() => handleLabelToggle(label.value)}
                    className={cn(
                      "h-6 px-2 rounded text-xs font-medium transition-all text-white",
                      card.color === label.value 
                        ? "ring-2 ring-offset-2 ring-offset-background ring-current" 
                        : "opacity-50 hover:opacity-100"
                    )}
                    style={{ backgroundColor: label.value }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Color */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Cor do Cartão</Label>
              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    className={cn(
                      "h-8 w-8 rounded border-2 transition-all",
                      card.bg_color === color.value 
                        ? "border-primary scale-110" 
                        : "border-transparent hover:border-border"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Tamanho da Fonte</Label>
              <div className="flex gap-1">
                {FONT_SIZES.map(size => (
                  <Button
                    key={size.value}
                    variant={card.font_size === size.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFontSizeChange(size.value)}
                    className="h-8 text-xs"
                  >
                    {size.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  onDelete(card.id);
                  setDetailsOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Cartão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
