import { useState, useEffect } from "react";
import { Transaction } from "@/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppExtension } from "@/hooks/useWhatsAppExtension";
import { getGreeting } from "@/lib/greeting";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PixCardQuickRecoveryProps {
  transaction: Transaction;
}

export function PixCardQuickRecovery({ transaction }: PixCardQuickRecoveryProps) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { openChat, extensionStatus, fallbackOpenWhatsApp } = useWhatsAppExtension();

  useEffect(() => {
    const fetchMessage = async () => {
      const { data } = await supabase
        .from("pix_card_recovery_settings")
        .select("message")
        .maybeSingle();
      
      if (data?.message) {
        const firstName = transaction.customer_name?.split(" ")[0] || "";
        const formatted = data.message
          .replace(/{saudação}/g, getGreeting())
          .replace(/{saudacao}/g, getGreeting())
          .replace(/{nome}/g, transaction.customer_name || "")
          .replace(/{primeiro_nome}/g, firstName)
          .replace(/{valor}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(transaction.amount)));
        setMessage(formatted);
      }
    };

    if (isOpen) {
      fetchMessage();
    }
  }, [isOpen, transaction]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChat = async () => {
    if (!transaction.customer_phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }

    const phone = transaction.customer_phone.replace(/\D/g, "");
    
    if (extensionStatus === "connected") {
      const success = await openChat(phone);
      if (success) {
        toast.success("Conversa aberta no WhatsApp");
        setIsOpen(false);
      } else {
        fallbackOpenWhatsApp(phone);
      }
    } else {
      fallbackOpenWhatsApp(phone);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-3" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recuperação Rápida</h4>
            <span className="text-xs text-muted-foreground capitalize">{transaction.type}</span>
          </div>
          
          <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/30">
            <p className="text-sm whitespace-pre-wrap">{message || "Carregando..."}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              Copiar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs bg-success hover:bg-success/90"
              onClick={handleOpenChat}
              disabled={!transaction.customer_phone}
            >
              <Phone className="h-3.5 w-3.5 mr-1" />
              WhatsApp
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
