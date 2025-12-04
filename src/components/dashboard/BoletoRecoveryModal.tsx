import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Type, 
  GripVertical,
  Plus,
  Trash2,
  Save,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoletoRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

interface RecoveryBlock {
  id: string;
  type: "text" | "pdf" | "image";
  content: string;
  order: number;
}

interface RecoveryTemplate {
  id: string;
  name: string;
  blocks: RecoveryBlock[];
  is_default: boolean;
}

const VARIABLE_PLACEHOLDERS: Record<string, { label: string; description: string }> = {
  "{nome}": { label: "Nome", description: "Nome do cliente" },
  "{valor}": { label: "Valor", description: "Valor do boleto formatado" },
  "{vencimento}": { label: "Vencimento", description: "Data de vencimento" },
  "{codigo_barras}": { label: "Código", description: "Código de barras" },
};

export function BoletoRecoveryModal({ open, onOpenChange, transaction }: BoletoRecoveryModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "recovery">("info");
  const [templates, setTemplates] = useState<RecoveryTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<RecoveryTemplate | null>(null);
  const [blocks, setBlocks] = useState<RecoveryBlock[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("boleto_recovery_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsedTemplates = (data || []).map((t) => ({
        id: t.id,
        name: t.name,
        is_default: t.is_default,
        blocks: Array.isArray(t.blocks) ? (t.blocks as unknown as RecoveryBlock[]) : [],
      }));

      setTemplates(parsedTemplates);

      // Select default template if exists
      const defaultTemplate = parsedTemplates.find((t) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
        setBlocks(defaultTemplate.blocks);
        setTemplateName(defaultTemplate.name);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const replaceVariables = (text: string): string => {
    if (!transaction) return text;

    const metadata = transaction.metadata as Record<string, unknown> | null;
    const dueDate = metadata?.due_date
      ? formatDate(String(metadata.due_date))
      : "-";

    return text
      .replace(/{nome}/g, transaction.customer_name || "Cliente")
      .replace(/{valor}/g, formatCurrency(Number(transaction.amount)))
      .replace(/{vencimento}/g, dueDate)
      .replace(/{codigo_barras}/g, transaction.external_id || "-");
  };

  const handleCopy = async (text: string, blockId: string) => {
    const processedText = replaceVariables(text);
    await navigator.clipboard.writeText(processedText);
    setCopiedId(blockId);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addBlock = (type: "text" | "pdf" | "image") => {
    const newBlock: RecoveryBlock = {
      id: crypto.randomUUID(),
      type,
      content:
        type === "text"
          ? "Olá {nome}! Seu boleto no valor de {valor} está disponível."
          : type === "pdf"
          ? "pdf"
          : "image",
      order: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlockContent = (blockId: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, content } : b)));
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId);
  };

  const handleDragOver = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);

    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    setIsLoading(true);
    try {
      const blocksJson = blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        order: b.order,
      }));

      if (selectedTemplate) {
        const { error } = await supabase
          .from("boleto_recovery_templates")
          .update({ name: templateName, blocks: blocksJson })
          .eq("id", selectedTemplate.id);

        if (error) throw error;
        toast.success("Template atualizado!");
      } else {
        const { error } = await supabase.from("boleto_recovery_templates").insert({
          name: templateName,
          blocks: blocksJson,
          is_default: templates.length === 0,
        });

        if (error) throw error;
        toast.success("Template salvo!");
      }

      fetchTemplates();
    } catch (error: unknown) {
      toast.error("Erro ao salvar template");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (template: RecoveryTemplate) => {
    setSelectedTemplate(template);
    setBlocks(template.blocks);
    setTemplateName(template.name);
  };

  const createNewTemplate = () => {
    setSelectedTemplate(null);
    setBlocks([]);
    setTemplateName("");
  };

  const renderBlockContent = (block: RecoveryBlock) => {
    if (block.type === "text") {
      return (
        <div className="flex-1 space-y-2">
          <textarea
            value={block.content}
            onChange={(e) => updateBlockContent(block.id, e.target.value)}
            className="w-full min-h-[80px] p-3 rounded-md bg-secondary/50 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Digite sua mensagem..."
          />
          <div className="flex flex-wrap gap-1">
            {Object.entries(VARIABLE_PLACEHOLDERS).map(([variable, { label }]) => (
              <Button
                key={variable}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => updateBlockContent(block.id, block.content + " " + variable)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <div className="flex-1 p-4 rounded-md bg-secondary/30 border border-dashed border-border/50 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arraste o PDF do boleto para o WhatsApp
          </p>
          {transaction?.metadata?.boleto_url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.open(transaction.metadata!.boleto_url, "_blank")}
            >
              Abrir PDF
            </Button>
          )}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div className="flex-1 p-4 rounded-md bg-secondary/30 border border-dashed border-border/50 text-center">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Imagem do boleto para arrastar ao WhatsApp
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Screenshot ou print do boleto)
          </p>
        </div>
      );
    }

    return null;
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boleto
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "info" | "recovery")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações do Boleto</TabsTrigger>
            <TabsTrigger value="recovery">Mensagens de Recuperação</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="font-medium">{transaction.customer_name || "-"}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{transaction.customer_phone || "-"}</p>
                    {transaction.customer_phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(transaction.customer_phone!, "phone")}
                      >
                        {copiedId === "phone" ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-sm truncate">{transaction.customer_email || "-"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Valor</p>
                  <p className="font-bold text-lg">{formatCurrency(Number(transaction.amount))}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Código de Barras</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs truncate max-w-[200px]">
                      {transaction.external_id || "-"}
                    </p>
                    {transaction.external_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(transaction.external_id!, "barcode")}
                      >
                        {copiedId === "barcode" ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Data de Criação</p>
                  <p className="font-medium">{formatDate(transaction.created_at)}</p>
                </div>
              </div>
            </div>

            {transaction.metadata?.boleto_url && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-2">Arquivo do Boleto</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(transaction.metadata!.boleto_url, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Abrir PDF do Boleto
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recovery" className="mt-4">
            <div className="flex gap-4 h-[500px]">
              {/* Templates sidebar */}
              <div className="w-48 border-r border-border/30 pr-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Templates</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewTemplate}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-40px)]">
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template)}
                        className={cn(
                          "w-full p-2 rounded-md text-left text-sm transition-colors",
                          selectedTemplate?.id === template.id
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "hover:bg-secondary/50"
                        )}
                      >
                        <p className="font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.blocks.length} blocos
                        </p>
                        {template.is_default && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            Padrão
                          </Badge>
                        )}
                      </button>
                    ))}
                    {templates.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhum template
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Block editor */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Input
                    placeholder="Nome do template"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock("text")}
                      className="gap-1"
                    >
                      <Type className="h-3.5 w-3.5" />
                      Texto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock("pdf")}
                      className="gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock("image")}
                      className="gap-1"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Imagem
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={saveTemplate}
                    disabled={isLoading}
                    className="ml-auto gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar
                  </Button>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-start gap-2 p-3 rounded-lg border border-border/30 bg-card transition-all",
                          draggedBlockId === block.id && "opacity-50 border-primary"
                        )}
                      >
                        <div className="cursor-grab active:cursor-grabbing pt-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {renderBlockContent(block)}

                        <div className="flex flex-col gap-1">
                          {block.type === "text" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopy(block.content, block.id)}
                            >
                              {copiedId === block.id ? (
                                <Check className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeBlock(block.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {blocks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Settings2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium">Nenhum bloco adicionado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione blocos de texto, PDF ou imagem para criar seu template
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Preview section */}
                {blocks.some((b) => b.type === "text") && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
                    <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                      {blocks
                        .filter((b) => b.type === "text")
                        .map((block) => (
                          <p key={block.id} className="text-sm whitespace-pre-wrap mb-2 last:mb-0">
                            {replaceVariables(block.content)}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
