import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

const DataImportExport = () => {
  const [isExportingTransactions, setIsExportingTransactions] = useState(false);
  const [isExportingAbandoned, setIsExportingAbandoned] = useState(false);
  const [isImportingTransactions, setIsImportingTransactions] = useState(false);
  const [isImportingAbandoned, setIsImportingAbandoned] = useState(false);
  const [transactionPreview, setTransactionPreview] = useState<ParsedData | null>(null);
  const [abandonedPreview, setAbandonedPreview] = useState<ParsedData | null>(null);
  
  const transactionFileRef = useRef<HTMLInputElement>(null);
  const abandonedFileRef = useRef<HTMLInputElement>(null);

  // Fetch counts
  const { data: transactionCount } = useQuery({
    queryKey: ["transactions-count"],
    queryFn: async () => {
      const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: abandonedCount } = useQuery({
    queryKey: ["abandoned-count"],
    queryFn: async () => {
      const { count } = await supabase.from("abandoned_events").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // CSV export helper
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          const strValue = String(value);
          if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export transactions
  const handleExportTransactions = async () => {
    setIsExportingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(t => ({
        ...t,
        metadata: t.metadata ? JSON.stringify(t.metadata) : ""
      }));

      const date = new Date().toISOString().split("T")[0];
      exportToCSV(formattedData || [], `transacoes_${date}.csv`);
      toast.success(`${data?.length || 0} transações exportadas`);
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setIsExportingTransactions(false);
    }
  };

  // Export abandoned events
  const handleExportAbandoned = async () => {
    setIsExportingAbandoned(true);
    try {
      const { data, error } = await supabase
        .from("abandoned_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(e => ({
        ...e,
        metadata: e.metadata ? JSON.stringify(e.metadata) : ""
      }));

      const date = new Date().toISOString().split("T")[0];
      exportToCSV(formattedData || [], `abandonos_${date}.csv`);
      toast.success(`${data?.length || 0} eventos exportados`);
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setIsExportingAbandoned(false);
    }
  };

  // Parse CSV file
  const parseCSV = (content: string): ParsedData => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    
    // Parse rows
    const rows = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

    return { headers, rows };
  };

  // Parse single CSV line (handles quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  // Handle file selection for transactions
  const handleTransactionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setTransactionPreview(parsed);
    };
    reader.readAsText(file);
  };

  // Handle file selection for abandoned
  const handleAbandonedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setAbandonedPreview(parsed);
    };
    reader.readAsText(file);
  };

  // Import transactions
  const handleImportTransactions = async () => {
    if (!transactionPreview || transactionPreview.rows.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setIsImportingTransactions(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-transactions", {
        body: { rows: transactionPreview.rows }
      });

      if (error) throw error;
      
      toast.success(`${data?.imported || 0} transações importadas`);
      setTransactionPreview(null);
      if (transactionFileRef.current) transactionFileRef.current.value = "";
    } catch (error: any) {
      toast.error("Erro ao importar: " + error.message);
    } finally {
      setIsImportingTransactions(false);
    }
  };

  // Import abandoned events
  const handleImportAbandoned = async () => {
    if (!abandonedPreview || abandonedPreview.rows.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setIsImportingAbandoned(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-abandoned-events", {
        body: { rows: abandonedPreview.rows }
      });

      if (error) throw error;
      
      toast.success(`${data?.imported || 0} eventos importados`);
      setAbandonedPreview(null);
      if (abandonedFileRef.current) abandonedFileRef.current.value = "";
    } catch (error: any) {
      toast.error("Erro ao importar: " + error.message);
    } finally {
      setIsImportingAbandoned(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card className="bg-card/60 border-border/30 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Exportar Dados</h3>
            <p className="text-xs text-muted-foreground">Baixe seus dados em formato CSV</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-secondary/20 border border-border/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Transações</p>
                <p className="text-xs text-muted-foreground">{transactionCount?.toLocaleString() || 0} registros</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Button 
              onClick={handleExportTransactions} 
              disabled={isExportingTransactions}
              size="sm"
              className="w-full"
            >
              {isExportingTransactions ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar CSV
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-secondary/20 border border-border/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Eventos Abandonados</p>
                <p className="text-xs text-muted-foreground">{abandonedCount?.toLocaleString() || 0} registros</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Button 
              onClick={handleExportAbandoned} 
              disabled={isExportingAbandoned}
              size="sm"
              className="w-full"
            >
              {isExportingAbandoned ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="bg-card/60 border-border/30 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Importar Dados</h3>
            <p className="text-xs text-muted-foreground">Importe dados de outras plataformas via CSV</p>
          </div>
        </div>

        <Alert className="mb-4 bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-200">
            O CSV deve conter as colunas correspondentes aos campos do banco. Campos obrigatórios: 
            <strong> type, amount</strong> (transações) ou <strong>event_type</strong> (abandonos).
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Import Transactions */}
          <div className="p-4 rounded-lg bg-secondary/20 border border-border/20">
            <p className="text-sm font-medium mb-3">Importar Transações</p>
            <input
              ref={transactionFileRef}
              type="file"
              accept=".csv"
              onChange={handleTransactionFileChange}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => transactionFileRef.current?.click()}
              className="mb-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar arquivo CSV
            </Button>

            {transactionPreview && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Preview: {transactionPreview.rows.length} registros encontrados
                </p>
                <div className="max-h-40 overflow-auto rounded border border-border/30">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 sticky top-0">
                      <tr>
                        {transactionPreview.headers.slice(0, 5).map(h => (
                          <th key={h} className="p-2 text-left font-medium">{h}</th>
                        ))}
                        {transactionPreview.headers.length > 5 && <th className="p-2">...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {transactionPreview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border/20">
                          {transactionPreview.headers.slice(0, 5).map(h => (
                            <td key={h} className="p-2 truncate max-w-[150px]">{row[h]}</td>
                          ))}
                          {transactionPreview.headers.length > 5 && <td className="p-2">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleImportTransactions}
                    disabled={isImportingTransactions}
                    size="sm"
                  >
                    {isImportingTransactions ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Importar {transactionPreview.rows.length} transações
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setTransactionPreview(null);
                      if (transactionFileRef.current) transactionFileRef.current.value = "";
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Import Abandoned Events */}
          <div className="p-4 rounded-lg bg-secondary/20 border border-border/20">
            <p className="text-sm font-medium mb-3">Importar Eventos Abandonados</p>
            <input
              ref={abandonedFileRef}
              type="file"
              accept=".csv"
              onChange={handleAbandonedFileChange}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => abandonedFileRef.current?.click()}
              className="mb-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar arquivo CSV
            </Button>

            {abandonedPreview && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Preview: {abandonedPreview.rows.length} registros encontrados
                </p>
                <div className="max-h-40 overflow-auto rounded border border-border/30">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 sticky top-0">
                      <tr>
                        {abandonedPreview.headers.slice(0, 5).map(h => (
                          <th key={h} className="p-2 text-left font-medium">{h}</th>
                        ))}
                        {abandonedPreview.headers.length > 5 && <th className="p-2">...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {abandonedPreview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border/20">
                          {abandonedPreview.headers.slice(0, 5).map(h => (
                            <td key={h} className="p-2 truncate max-w-[150px]">{row[h]}</td>
                          ))}
                          {abandonedPreview.headers.length > 5 && <td className="p-2">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleImportAbandoned}
                    disabled={isImportingAbandoned}
                    size="sm"
                  >
                    {isImportingAbandoned ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Importar {abandonedPreview.rows.length} eventos
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setAbandonedPreview(null);
                      if (abandonedFileRef.current) abandonedFileRef.current.value = "";
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataImportExport;
