import { useState, useRef, useCallback, useEffect } from "react";
import { MindMapNode, MindMapConnection, useMindMapNodes } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Move,
  Type,
  Palette,
  Circle,
  Square,
  Hexagon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MindMapCanvasProps {
  projectId: string;
  theme: "light" | "dark";
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

export function MindMapCanvas({ projectId, theme }: MindMapCanvasProps) {
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
      createConnection.mutate({
        project_id: projectId,
        source_node_id: connectingFrom,
        target_node_id: targetId,
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

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className={cn(
      "flex-1 flex flex-col rounded-xl overflow-hidden border",
      theme === "dark" 
        ? "bg-[#0a0a0f] border-border/30" 
        : "bg-gray-50 border-gray-200"
    )}>
      {/* Toolbar */}
      <div className={cn(
        "flex items-center gap-2 p-3 border-b",
        theme === "dark" ? "bg-card/50 border-border/30" : "bg-white border-gray-200"
      )}>
        <Button size="sm" onClick={handleAddNode} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Nó
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </Button>

        {selectedNode && (
          <>
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Color picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <div 
                    className="h-4 w-4 rounded-full border" 
                    style={{ backgroundColor: selectedNodeData?.color || "#6366f1" }} 
                  />
                  Cor
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {NODE_COLORS.map(c => (
                    <button
                      key={c}
                      className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
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
                <Button size="sm" variant="outline" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Fundo
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {bgColors.map(c => (
                    <button
                      key={c}
                      className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
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
                <Button size="sm" variant="outline" className="gap-2">
                  <Square className="h-4 w-4" />
                  Forma
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="flex gap-2">
                  <button 
                    className="p-2 rounded hover:bg-muted"
                    onClick={() => handleShapeChange("rounded")}
                  >
                    <Square className="h-5 w-5" />
                  </button>
                  <button 
                    className="p-2 rounded hover:bg-muted"
                    onClick={() => handleShapeChange("circle")}
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <button 
                    className="p-2 rounded hover:bg-muted"
                    onClick={() => handleShapeChange("hexagon")}
                  >
                    <Hexagon className="h-5 w-5" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Connect */}
            <Button 
              size="sm" 
              variant={connectingFrom === selectedNode ? "default" : "outline"}
              onClick={() => setConnectingFrom(connectingFrom === selectedNode ? null : selectedNode)}
            >
              <Move className="h-4 w-4" />
            </Button>

            {/* Delete */}
            <Button size="sm" variant="destructive" onClick={handleDeleteNode}>
              <Trash2 className="h-4 w-4" />
            </Button>
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
          backgroundImage: theme === "dark" 
            ? "radial-gradient(circle, #333 1px, transparent 1px)"
            : "radial-gradient(circle, #ccc 1px, transparent 1px)",
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
              <p className="text-muted-foreground mb-2">Nenhum nó ainda</p>
              <Button onClick={handleAddNode} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro nó
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
