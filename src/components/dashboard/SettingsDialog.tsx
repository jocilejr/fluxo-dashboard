import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Users, Webhook, Plus, Trash2, Loader2, KeyRound, DollarSign, Percent, MessageSquare, FileText } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { WebhookInfo } from "./WebhookInfo";
import { GroupWebhookInfo } from "./GroupWebhookInfo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

interface SettingsDialogProps {
  trigger?: React.ReactNode;
  asMobileItem?: boolean;
}

export const SettingsDialog = ({ trigger, asMobileItem }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [boletoWebhookUrl, setBoletoWebhookUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with roles
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch financial settings
  const { data: financialSettings } = useQuery({
    queryKey: ["financial-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_settings")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      if (data) setTaxRate(data.tax_rate.toString());
      return data;
    },
    enabled: open,
  });

  // Fetch manual revenues
  const { data: manualRevenues, isLoading: loadingRevenues } = useQuery({
    queryKey: ["manual-revenues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_revenues")
        .select("*")
        .order("received_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch PIX/Card recovery message
  const { data: recoverySettings } = useQuery({
    queryKey: ["pix-card-recovery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_card_recovery_settings")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      if (data) setRecoveryMessage(data.message);
      return data;
    },
    enabled: open,
  });

  // Fetch manual boleto settings
  const { data: manualBoletoSettings } = useQuery({
    queryKey: ["manual-boleto-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_boleto_settings")
        .select("*")
        .single();
      
      if (error) throw error;
      if (data) setBoletoWebhookUrl(data.webhook_url);
      return data;
    },
    enabled: open,
  });

  // Update manual boleto webhook mutation
  const updateBoletoWebhook = useMutation({
    mutationFn: async (webhookUrl: string) => {
      if (manualBoletoSettings?.id) {
        const { error } = await supabase
          .from("manual_boleto_settings")
          .update({ webhook_url: webhookUrl })
          .eq("id", manualBoletoSettings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Webhook atualizado" });
      queryClient.invalidateQueries({ queryKey: ["manual-boleto-settings"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
    },
  });

  // Update recovery message mutation
  const updateRecoveryMessage = useMutation({
    mutationFn: async (message: string) => {
      if (recoverySettings?.id) {
        const { error } = await supabase
          .from("pix_card_recovery_settings")
          .update({ message })
          .eq("id", recoverySettings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Mensagem de recuperação atualizada" });
      queryClient.invalidateQueries({ queryKey: ["pix-card-recovery-settings"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
    },
  });

  // Update tax rate mutation
  const updateTaxRate = useMutation({
    mutationFn: async (rate: number) => {
      const { error } = await supabase
        .from("financial_settings")
        .update({ tax_rate: rate })
        .eq("id", financialSettings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Alíquota atualizada" });
      queryClient.invalidateQueries({ queryKey: ["financial-settings"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
    },
  });

  // Add manual revenue mutation
  const addManualRevenue = useMutation({
    mutationFn: async ({ description, amount }: { description: string; amount: number }) => {
      const { error } = await supabase
        .from("manual_revenues")
        .insert({ description, amount });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Faturamento adicionado" });
      setManualDescription("");
      setManualAmount("");
      queryClient.invalidateQueries({ queryKey: ["manual-revenues"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar", variant: "destructive" });
    },
  });

  // Delete manual revenue mutation
  const deleteManualRevenue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manual_revenues")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Faturamento removido" });
      queryClient.invalidateQueries({ queryKey: ["manual-revenues"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover", variant: "destructive" });
    },
  });

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newUserEmail, password: newUserPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });
      setNewUserEmail("");
      setNewUserPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      const errorMessage = error.message || "Não foi possível criar o usuário";
      const friendlyMessage = errorMessage.includes("already been registered") 
        ? "Este email já está cadastrado no sistema"
        : errorMessage;
      
      toast({
        title: "Erro ao criar usuário",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Não foi possível remover o usuário",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) {
      toast({
        title: "Erro",
        description: "Digite a nova senha",
        variant: "destructive",
      });
      return;
    }

    if (resetPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId: resetUserId, newPassword: resetPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Senha redefinida com sucesso",
      });
      setResetUserId(null);
      setResetPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Não foi possível redefinir a senha",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const dialogTrigger = asMobileItem ? (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setOpen(true)}>
      <Settings className="h-4 w-4 mr-2" />
      Configurações
    </DropdownMenuItem>
  ) : trigger || (
    <Button variant="ghost" size="icon" className="h-9 w-9">
      <Settings className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="recuperacao" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Recuperação</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhook</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Grupos</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Adicionar Novo Usuário</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={createUser} disabled={isCreating} className="w-full md:w-auto">
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Usuário
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Usuários Cadastrados</h3>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : users && users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{user.user_id}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {user.role}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setResetUserId(resetUserId === user.user_id ? null : user.user_id)}
                            title="Redefinir senha"
                          >
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {user.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteUser(user.user_id)}
                              title="Remover usuário"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {resetUserId === user.user_id && (
                        <div className="flex gap-2 p-3 border rounded-lg bg-muted/50">
                          <Input
                            type="password"
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={handleResetPassword} disabled={isResetting} size="sm">
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setResetUserId(null); setResetPassword(""); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nenhum usuário cadastrado
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {/* Tax Rate Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Alíquota de Imposto
              </h3>
              <p className="text-sm text-muted-foreground">
                Defina a porcentagem a ser descontada do faturamento total
              </p>
              <div className="flex gap-2 items-end">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="taxRate">Porcentagem (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Ex: 15.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => {
                    const rate = parseFloat(taxRate);
                    if (isNaN(rate) || rate < 0 || rate > 100) {
                      toast({ title: "Erro", description: "Digite um valor válido entre 0 e 100", variant: "destructive" });
                      return;
                    }
                    updateTaxRate.mutate(rate);
                  }}
                  disabled={updateTaxRate.isPending}
                >
                  {updateTaxRate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>

            {/* Manual Revenue Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Faturamento Manual
              </h3>
              <p className="text-sm text-muted-foreground">
                Adicione faturamentos recebidos diretamente na conta bancária
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manualDesc">Descrição</Label>
                  <Input
                    id="manualDesc"
                    placeholder="Ex: Depósito cliente X"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualAmount">Valor (R$)</Label>
                  <Input
                    id="manualAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 1500.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={() => {
                  if (!manualDescription.trim() || !manualAmount) {
                    toast({ title: "Erro", description: "Preencha descrição e valor", variant: "destructive" });
                    return;
                  }
                  const amount = parseFloat(manualAmount);
                  if (isNaN(amount) || amount <= 0) {
                    toast({ title: "Erro", description: "Digite um valor válido", variant: "destructive" });
                    return;
                  }
                  addManualRevenue.mutate({ description: manualDescription.trim(), amount });
                }}
                disabled={addManualRevenue.isPending}
                className="w-full md:w-auto"
              >
                {addManualRevenue.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar Faturamento
              </Button>
            </div>

            {/* Manual Revenues List */}
            <div className="space-y-2">
              <h3 className="font-semibold">Faturamentos Manuais Cadastrados</h3>
              {loadingRevenues ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : manualRevenues && manualRevenues.length > 0 ? (
                <div className="space-y-2">
                  {manualRevenues.map((revenue) => (
                    <div key={revenue.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{revenue.description}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {revenue.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • {format(new Date(revenue.received_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteManualRevenue.mutate(revenue.id)}
                        disabled={deleteManualRevenue.isPending}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nenhum faturamento manual cadastrado
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recuperacao" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem de Recuperação PIX/Cartão
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure a mensagem que será enviada para recuperar pagamentos pendentes de PIX e Cartão.
                Use as variáveis: {"{saudação}"}, {"{nome}"}, {"{primeiro_nome}"}, {"{valor}"}
              </p>
              <div className="space-y-2">
                <Label htmlFor="recoveryMsg">Mensagem</Label>
                <Textarea
                  id="recoveryMsg"
                  placeholder="Ex: Olá {nome}! Seu pagamento de {valor} está pendente..."
                  value={recoveryMessage}
                  onChange={(e) => setRecoveryMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <Button 
                onClick={() => {
                  if (!recoveryMessage.trim()) {
                    toast({ title: "Erro", description: "Digite uma mensagem", variant: "destructive" });
                    return;
                  }
                  updateRecoveryMessage.mutate(recoveryMessage.trim());
                }}
                disabled={updateRecoveryMessage.isPending}
              >
                {updateRecoveryMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Mensagem
              </Button>
            </div>

            {/* Manual Boleto Webhook */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Webhook para Geração Manual de Boleto
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure a URL do webhook que receberá os dados para gerar boletos manualmente.
                O webhook receberá: nome, telefone, valor e cpf (opcional).
              </p>
              <div className="space-y-2">
                <Label htmlFor="boletoWebhook">URL do Webhook</Label>
                <Input
                  id="boletoWebhook"
                  type="url"
                  placeholder="https://n8n.seudominio.com/webhook/..."
                  value={boletoWebhookUrl}
                  onChange={(e) => setBoletoWebhookUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => {
                  updateBoletoWebhook.mutate(boletoWebhookUrl.trim());
                }}
                disabled={updateBoletoWebhook.isPending}
              >
                {updateBoletoWebhook.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Webhook
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="mt-4">
            <WebhookInfo />
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <GroupWebhookInfo />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
