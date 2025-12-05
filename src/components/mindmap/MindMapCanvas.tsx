import { useState, useRef, useCallback } from "react";
import { MindMapNode, MindMapConnection, useMindMapNodes } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Link2,
  Palette,
  Circle,
  Square,
  Hexagon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  Copy,
  Download,
  Maximize2,
  Grid3X3,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MindMapCanvasProps {
  projectId: string;
}

const NODE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#64748b"
];

const BG_COLORS_DARK = [
  "#1e1e2e", "#1a1a2e", "#16213e", "#1f2937", "#18181b",
  "#0f172a", "#1e293b", "#262626", "#171717", "#0a0a0a"
];

const BG_COLORS_LIGHT = [
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0", "#fef3c7",
  "#fce7f3", "#ede9fe", "#dbeafe", "#d1fae5", "#f3f4f6"
];

export function MindMapCanvas({ projectId }: MindMapCanvasProps) {
  const {
    nodes,
    connections,
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    deleteConnection,
  } = useMindMapNodes(projectId);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const bgColors = theme === "dark" ? BG_COLORS_DARK : BG_COLORS_LIGHT;

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (draggingNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
        const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
        updateNode.mutate({ id: draggingNode, position_x: x, position_y: y });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  const handleAddNode = () => {
    const centerX = 400 / zoom - pan.x / zoom;
    const centerY = 300 / zoom - pan.y / zoom;
    createNode.mutate({
      project_id: projectId,
      label: "Novo nó",
      position_x: centerX + Math.random() * 100 - 50,
      position_y: centerY + Math.random() * 100 - 50,
      color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
      bg_color: bgColors[0],
    });
  };

  const handleAddChildNode = () => {
    if (!selectedNode) return;
    const parent = nodes.find(n => n.id === selectedNode);
    if (!parent) return;
    
    createNode.mutate({
      project_id: projectId,
      label: "Novo nó",
      position_x: parent.position_x + 200,
      position_y: parent.position_y + Math.random() * 100 - 50,
      color: parent.color,
      bg_color: parent.bg_color,
      parent_id: parent.id,
    }, {
      onSuccess: (newNode) => {
        if (newNode) {
          createConnection.mutate({
            project_id: projectId,
            source_node_id: selectedNode,
            target_node_id: newNode.id,
            color: parent.color,
          });
        }
      }
    });
  };

  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const node = nodes.find(n => n.id === selectedNode);
    if (!node) return;
    
    createNode.mutate({
      project_id: projectId,
      label: `${node.label} (cópia)`,
      position_x: node.position_x + 50,
      position_y: node.position_y + 50,
      color: node.color,
      bg_color: node.bg_color,
      shape: node.shape,
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = (e.clientX - rect.left - pan.x) / zoom - node.position_x;
      const offsetY = (e.clientY - rect.top - pan.y) / zoom - node.position_y;
      setDragOffset({ x: offsetX, y: offsetY });
      setDraggingNode(node.id);
    }
    setSelectedNode(node.id);
  };

  const handleNodeDoubleClick = (node: MindMapNode) => {
    setEditingNode(node.id);
    setEditLabel(node.label);
  };

  const handleEditSubmit = () => {
    if (editingNode && editLabel.trim()) {
      updateNode.mutate({ id: editingNode, label: editLabel.trim() });
    }
    setEditingNode(null);
    setEditLabel("");
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      deleteNode.mutate(selectedNode);
      setSelectedNode(null);
    }
  };

  const handleConnect = (targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      const sourceNode = nodes.find(n => n.id === connectingFrom);
      createConnection.mutate({
        project_id: projectId,
        source_node_id: connectingFrom,
        target_node_id: targetId,
        color: sourceNode?.color,
      });
      setConnectingFrom(null);
    }
  };

  const handleColorChange = (color: string) => {
    if (selectedNode) {
      updateNode.mutate({ id: selectedNode, color });
    }
  };

  const handleBgColorChange = (bgColor: string) => {
    if (selectedNode) {
      updateNode.mutate({ id: selectedNode, bg_color: bgColor });
    }
  };

  const handleShapeChange = (shape: string) => {
    if (selectedNode) {
      updateNode.mutate({ id: selectedNode, shape });
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const fitToScreen = () => {
    if (nodes.length === 0) return;
    
    const minX = Math.min(...nodes.map(n => n.position_x));
    const maxX = Math.max(...nodes.map(n => n.position_x + 150));
    const minY = Math.min(...nodes.map(n => n.position_y));
    const maxY = Math.max(...nodes.map(n => n.position_y + 50));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    
    setZoom(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - minX * newZoom + 50,
      y: (canvasHeight - contentHeight * newZoom) / 2 - minY * newZoom + 50,
    });
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <TooltipProvider>
      <div className={cn(
        "flex-1 flex flex-col rounded-xl overflow-hidden border",
        theme === "dark" 
          ? "bg-[#0a0a0f] border-border/30" 
          : "bg-gray-50 border-gray-200"
      )}>
        {/* Toolbar */}
        <div className={cn(
          "flex items-center gap-1 p-2 border-b flex-wrap",
          theme === "dark" ? "bg-card/50 border-border/30" : "bg-white border-gray-200"
        )}>
          {/* Add nodes */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={handleAddNode} className="gap-1.5 h-8">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nó</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar nó (Ctrl+N)</TooltipContent>
          </Tooltip>

          {selectedNode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleAddChildNode} className="gap-1.5 h-8">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Filho</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar nó filho</TooltipContent>
            </Tooltip>
          )}

          <div className="h-6 w-px bg-border mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aumentar zoom</TooltipContent>
            </Tooltip>
            
            <span className={cn(
              "text-xs w-12 text-center",
              theme === "dark" ? "text-muted-foreground" : "text-gray-500"
            )}>
              {Math.round(zoom * 100)}%
            </span>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Diminuir zoom</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetar visualização</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={fitToScreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajustar à tela</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border mx-1" />

          {/* View controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant={showGrid ? "secondary" : "ghost"} 
                className="h-8 w-8 p-0" 
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mostrar grade</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === "dark" ? "Modo claro" : "Modo escuro"}</TooltipContent>
          </Tooltip>

          {/* Node editing tools */}
          {selectedNode && (
            <>
              <div className="h-6 w-px bg-border mx-1" />
              
              {/* Color picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8 px-2">
                    <div 
                      className="h-4 w-4 rounded-full border border-border" 
                      style={{ backgroundColor: selectedNodeData?.color || "#6366f1" }} 
                    />
                    <span className="hidden sm:inline text-xs">Cor</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {NODE_COLORS.map(c => (
                      <button
                        key={c}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 hover:scale-110 transition-transform",
                          selectedNodeData?.color === c ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => handleColorChange(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Background color */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8 px-2">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Fundo</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {bgColors.map(c => (
                      <button
                        key={c}
                        className={cn(
                          "h-6 w-6 rounded border-2 hover:scale-110 transition-transform",
                          selectedNodeData?.bg_color === c ? "border-foreground" : "border-border"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => handleBgColorChange(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Shape */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8 px-2">
                    <Square className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Forma</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className={cn(
                            "p-2 rounded hover:bg-muted",
                            selectedNodeData?.shape === "rounded" && "bg-muted"
                          )}
                          onClick={() => handleShapeChange("rounded")}
                        >
                          <Square className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Retângulo</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className={cn(
                            "p-2 rounded hover:bg-muted",
                            selectedNodeData?.shape === "circle" && "bg-muted"
                          )}
                          onClick={() => handleShapeChange("circle")}
                        >
                          <Circle className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Círculo</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className={cn(
                            "p-2 rounded hover:bg-muted",
                            selectedNodeData?.shape === "hexagon" && "bg-muted"
                          )}
                          onClick={() => handleShapeChange("hexagon")}
                        >
                          <Hexagon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Hexágono</TooltipContent>
                    </Tooltip>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Actions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant={connectingFrom === selectedNode ? "default" : "ghost"}
                    className="h-8 w-8 p-0"
                    onClick={() => setConnectingFrom(connectingFrom === selectedNode ? null : selectedNode)}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Conectar a outro nó</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleDuplicateNode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicar nó</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={handleDeleteNode}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir nó</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            backgroundImage: showGrid 
              ? theme === "dark" 
                ? "radial-gradient(circle, #333 1px, transparent 1px)"
                : "radial-gradient(circle, #ccc 1px, transparent 1px)"
              : "none",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
            {connections.map(conn => {
              const source = nodes.find(n => n.id === conn.source_node_id);
              const target = nodes.find(n => n.id === conn.target_node_id);
              if (!source || !target) return null;

              const sx = source.position_x + 75;
              const sy = source.position_y + 25;
              const tx = target.position_x + 75;
              const ty = target.position_y + 25;

              const midX = (sx + tx) / 2;
              const midY = (sy + ty) / 2;

              return (
                <g key={conn.id}>
                  <path
                    d={`M ${sx} ${sy} Q ${midX} ${sy}, ${midX} ${midY} T ${tx} ${ty}`}
                    fill="none"
                    stroke={conn.color || "#6366f1"}
                    strokeWidth={2}
                    strokeDasharray={conn.style === "dashed" ? "5,5" : undefined}
                    className="transition-all"
                  />
                  <circle cx={tx} cy={ty} r={4} fill={conn.color || "#6366f1"} />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          <div
            className="absolute"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
            {nodes.map(node => {
              const isSelected = selectedNode === node.id;
              const isConnecting = connectingFrom && connectingFrom !== node.id;

              let shapeClass = "rounded-xl";
              if (node.shape === "circle") shapeClass = "rounded-full";
              if (node.shape === "hexagon") shapeClass = "rounded-xl";

              return (
                <div
                  key={node.id}
                  className={cn(
                    "absolute cursor-move transition-shadow select-none",
                    shapeClass,
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    isConnecting && "ring-2 ring-emerald-500 cursor-pointer"
                  )}
                  style={{
                    left: node.position_x,
                    top: node.position_y,
                    minWidth: node.width || 150,
                    backgroundColor: node.bg_color || "#1e1e2e",
                    borderLeft: `4px solid ${node.color || "#6366f1"}`,
                    boxShadow: isSelected ? `0 0 20px ${node.color}40` : undefined,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  onClick={() => isConnecting && handleConnect(node.id)}
                >
                  <div className="p-3">
                    {editingNode === node.id ? (
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={handleEditSubmit}
                        onKeyDown={(e) => e.key === "Enter" && handleEditSubmit()}
                        autoFocus
                        className="h-7 text-sm bg-transparent border-none p-0 focus-visible:ring-0"
                      />
                    ) : (
                      <span 
                        className={cn(
                          "text-sm font-medium",
                          theme === "dark" ? "text-white" : "text-gray-900"
                        )}
                        style={{ fontSize: node.font_size || 14 }}
                      >
                        {node.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className={cn(
                  "mb-2",
                  theme === "dark" ? "text-muted-foreground" : "text-gray-500"
                )}>
                  Nenhum nó ainda
                </p>
                <Button onClick={handleAddNode} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro nó
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
