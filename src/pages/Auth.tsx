import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Lock, Smartphone, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import QRCode from "react-qr-code";

type AuthStep = "credentials" | "totp-setup" | "totp-verify";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let message = "Erro ao fazer login";
        if (error.message.includes("Invalid login credentials")) {
          message = "Email ou senha incorretos";
        } else if (error.message.includes("Email not confirmed")) {
          message = "Confirme seu email antes de fazer login";
        }
        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
        return;
      }

      // Store user ID BEFORE signOut
      const userId = data.user.id;
      setPendingUserId(userId);

      // Call setup-totp BEFORE signOut to avoid state reset
      const response = await supabase.functions.invoke("setup-totp", {
        body: { userId, email },
      });

      console.log("setup-totp response:", response);

      if (response.error) {
        console.error("setup-totp error:", response.error);
        toast({
          title: "Erro",
          description: "Erro ao configurar autenticação",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      // Extract data before signOut
      const totpData = response.data;
      const isAlreadySetup = totpData?.alreadySetup;
      const secret = totpData?.secret || "";
      const url = totpData?.otpauthUrl || "";

      // Now sign out
      await supabase.auth.signOut();

      // Update state after signOut completes
      if (isAlreadySetup) {
        console.log("TOTP already setup, going to verify");
        setStep("totp-verify");
      } else {
        console.log("Setting up TOTP with secret:", secret);
        setTotpSecret(secret);
        setOtpauthUrl(url);
        setStep("totp-setup");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSetupContinue = () => {
    setStep("totp-verify");
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length !== 6) {
      toast({
        title: "Erro",
        description: "Digite o código completo de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("verify-totp", {
        body: { userId: pendingUserId, code: totpCode },
      });

      if (response.error || !response.data?.valid) {
        toast({
          title: "Erro",
          description: response.data?.error || "Código inválido",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao finalizar login",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setTotpCode("");
    setTotpSecret("");
    setOtpauthUrl("");
    setPendingUserId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {step === "credentials" ? (
              <Lock className="h-6 w-6 text-primary" />
            ) : (
              <Smartphone className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {step === "credentials" && "Acesso Restrito"}
            {step === "totp-setup" && "Configurar Autenticador"}
            {step === "totp-verify" && "Verificação"}
          </CardTitle>
          <CardDescription>
            {step === "credentials" && "Sistema interno - apenas usuários autorizados"}
            {step === "totp-setup" && "Escaneie o QR code com o Google Authenticator"}
            {step === "totp-verify" && "Digite o código do seu autenticador"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </form>
          )}

          {step === "totp-setup" && (
            <div className="space-y-6">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                {otpauthUrl ? (
                  <QRCode value={otpauthUrl} size={200} />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Código manual (se precisar):
                </p>
                <code className="block p-2 bg-muted rounded text-xs break-all">
                  {totpSecret}
                </code>
              </div>

              <Button onClick={handleTotpSetupContinue} className="w-full">
                Já escaneei, continuar
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}

          {step === "totp-verify" && (
            <form onSubmit={handleTotpVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading || totpCode.length !== 6}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
