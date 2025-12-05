import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, DollarSign, MessageSquare, Link as LinkIcon, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WebhookInfo } from "@/components/dashboard/WebhookInfo";
import { GroupWebhookInfo } from "@/components/dashboard/GroupWebhookInfo";
import { Trash2, Plus, Loader2, Key } from "lucide-react";

interface UserWithPermissions {
  user_id: string;
  email: string;
  role: string;
  permissions: { permission_key: string; is_allowed: boolean }[];
}

const AVAILABLE_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "transacoes", label: "Transações" },
  { key: "recuperacao", label: "Recuperação" },
  { key: "gerar_boleto", label: "Gerar Boleto" },
];

const Configuracoes = () => {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [boletoWebhook, setBoletoWebhook] = useState("");
  const [newRevenueDescription, setNewRevenueDescription] = useState("");
  const [newRevenueAmount, setNewRevenueAmount] = useState("");

  // Fetch users with their permissions
  const { data: usersWithPermissions, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-with-permissions"],
    queryFn: async () => {
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      // Get all permissions
      const { data: permissions, error: permError } = await supabase
        .from("user_permissions")
        .select("*");
      if (permError) throw permError;

      // Get user emails from auth admin function or profiles
      const users: UserWithPermissions[] = [];
      
      for (const role of roles || []) {
        const userPerms = permissions?.filter(p => p.user_id === role.user_id) || [];
        users.push({
          user_id: role.user_id,
          email: role.user_id.substring(0, 8) + "...", // Placeholder - will need to fetch from profiles
          role: role.role,
          permissions: userPerms.map(p => ({ permission_key: p.permission_key, is_allowed: p.is_allowed })),
        });
      }
      
      return users;
    },
  });

  // Fetch financial settings
  const { data: financialSettings } = useQuery({
    queryKey: ["financial-settings-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch manual revenues
  const { data: manualRevenues } = useQuery({
    queryKey: ["manual-revenues-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_revenues")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recovery message
  const { data: recoverySettings } = useQuery({
    queryKey: ["pix-card-recovery-settings-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_card_recovery_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch boleto webhook
  const { data: boletoSettings } = useQuery({
    queryKey: ["manual-boleto-settings-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_boleto_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (financialSettings) setTaxRate(String(financialSettings.tax_rate || ""));
    if (recoverySettings) setRecoveryMessage(recoverySettings.message || "");
    if (boletoSettings) setBoletoWebhook(boletoSettings.webhook_url || "");
  }, [financialSettings, recoverySettings, boletoSettings]);

  // Update permission mutation
  const updatePermission = useMutation({
    mutationFn: async ({ userId, permissionKey, isAllowed }: { userId: string; permissionKey: string; isAllowed: boolean }) => {
      const { data: existing } = await supabase
        .from("user_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("permission_key", permissionKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_permissions")
          .update({ is_allowed: isAllowed })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission_key: permissionKey, is_allowed: isAllowed });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-permissions"] });
      toast.success("Permissão atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissão");
    },
  });

  // Update tax rate mutation
  const updateTaxRate = useMutation({
    mutationFn: async (rate: number) => {
      const { data: existing } = await supabase
        .from("financial_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("financial_settings")
          .update({ tax_rate: rate })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_settings")
          .insert({ tax_rate: rate });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-settings-config"] });
      toast.success("Taxa atualizada");
    },
  });

  // Update recovery message mutation
  const updateRecoveryMessage = useMutation({
    mutationFn: async (message: string) => {
      const { data: existing } = await supabase
        .from("pix_card_recovery_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("pix_card_recovery_settings")
          .update({ message })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pix_card_recovery_settings")
          .insert({ message });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pix-card-recovery-settings-config"] });
      toast.success("Mensagem atualizada");
    },
  });

  // Update boleto webhook mutation
  const updateBoletoWebhook = useMutation({
    mutationFn: async (webhookUrl: string) => {
      const { data: existing } = await supabase
        .from("manual_boleto_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("manual_boleto_settings")
          .update({ webhook_url: webhookUrl })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manual_boleto_settings")
          .insert({ webhook_url: webhookUrl });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-boleto-settings-config"] });
      toast.success("Webhook atualizado");
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
      queryClient.invalidateQueries({ queryKey: ["manual-revenues-config"] });
      setNewRevenueDescription("");
      setNewRevenueAmount("");
      toast.success("Receita adicionada");
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
      queryClient.invalidateQueries({ queryKey: ["manual-revenues-config"] });
      toast.success("Receita removida");
    },
  });

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Preencha email e senha");
      return;
    }
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newUserEmail, password: newUserPassword },
      });
      if (error) throw error;
      toast.success("Usuário criado com sucesso");
      setNewUserEmail("");
      setNewUserPassword("");
      queryClient.invalidateQueries({ queryKey: ["users-with-permissions"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });
      if (error) throw error;
      toast.success("Usuário removido");
      queryClient.invalidateQueries({ queryKey: ["users-with-permissions"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  const resetPassword = async (userId: string) => {
    const newPassword = prompt("Digite a nova senha:");
    if (!newPassword) return;
    try {
      const { error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId, newPassword },
      });
      if (error) throw error;
      toast.success("Senha resetada com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao resetar senha");
    }
  };

  const getUserPermission = (user: UserWithPermissions, permKey: string) => {
    const perm = user.permissions.find(p => p.permission_key === permKey);
    return perm ? perm.is_allowed : true; // Default to allowed if no record
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="recovery" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Recuperação
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>Adicione ou remova usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
                <Button onClick={createUser} disabled={isCreatingUser}>
                  {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Usuário
                </Button>
              </div>

              <div className="space-y-2">
                {usersWithPermissions?.filter(u => u.role !== "admin").map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">{user.email}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => resetPassword(user.user_id)}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteUser(user.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissões por Usuário</CardTitle>
              <CardDescription>Configure quais abas cada usuário pode acessar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {usersWithPermissions?.filter(u => u.role !== "admin").map((user) => (
                  <div key={user.user_id} className="p-4 rounded-lg border border-border">
                    <h4 className="font-medium mb-3">{user.email}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <div key={perm.key} className="flex items-center justify-between">
                          <Label htmlFor={`${user.user_id}-${perm.key}`} className="text-sm">
                            {perm.label}
                          </Label>
                          <Switch
                            id={`${user.user_id}-${perm.key}`}
                            checked={getUserPermission(user, perm.key)}
                            onCheckedChange={(checked) => 
                              updatePermission.mutate({ userId: user.user_id, permissionKey: perm.key, isAllowed: checked })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(!usersWithPermissions || usersWithPermissions.filter(u => u.role !== "admin").length === 0) && (
                  <p className="text-muted-foreground text-center py-8">Nenhum usuário (não-admin) cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Imposto</CardTitle>
                <CardDescription>Defina a alíquota de imposto para cálculo do valor líquido</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Input
                  type="number"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="self-center">%</span>
                <Button onClick={() => updateTaxRate.mutate(parseFloat(taxRate) || 0)}>
                  Salvar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receitas Manuais</CardTitle>
                <CardDescription>Adicione receitas recebidas fora do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Descrição"
                    value={newRevenueDescription}
                    onChange={(e) => setNewRevenueDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={newRevenueAmount}
                    onChange={(e) => setNewRevenueAmount(e.target.value)}
                    className="w-32"
                  />
                  <Button onClick={() => addManualRevenue.mutate({ description: newRevenueDescription, amount: parseFloat(newRevenueAmount) || 0 })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {manualRevenues?.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                      <span className="text-sm">{r.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">R$ {Number(r.amount).toFixed(2)}</span>
                        <Button variant="ghost" size="sm" onClick={() => deleteManualRevenue.mutate(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recovery">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mensagem PIX/Cartão</CardTitle>
                <CardDescription>Mensagem padrão para recuperação de PIX e cartão pendentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full min-h-[100px] p-3 rounded-md bg-secondary/50 border border-border/50 text-sm resize-none"
                  value={recoveryMessage}
                  onChange={(e) => setRecoveryMessage(e.target.value)}
                  placeholder="Use {nome}, {primeiro_nome}, {valor}, {saudação}"
                />
                <Button onClick={() => updateRecoveryMessage.mutate(recoveryMessage)}>
                  Salvar Mensagem
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Boleto Manual</CardTitle>
                <CardDescription>URL para geração de boletos manuais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://..."
                  value={boletoWebhook}
                  onChange={(e) => setBoletoWebhook(e.target.value)}
                />
                <Button onClick={() => updateBoletoWebhook.mutate(boletoWebhook)}>
                  Salvar Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="space-y-6">
            <WebhookInfo />
            <GroupWebhookInfo />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
