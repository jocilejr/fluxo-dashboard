import { useState, useEffect, useCallback } from "react";

interface WhatsAppExtensionMessage {
  type: string;
  action?: string;
  phone?: string;
  text?: string;
  imageDataUrl?: string;
  success?: boolean;
  error?: string;
  requestId?: string;
}

interface UseWhatsAppExtensionReturn {
  extensionAvailable: boolean;
  openChat: (phone: string) => Promise<boolean>;
  sendText: (phone: string, text: string) => Promise<boolean>;
  sendImage: (phone: string, imageDataUrl: string) => Promise<boolean>;
  fallbackOpenWhatsApp: (phone: string, text?: string) => void;
}

const EXTENSION_TIMEOUT = 5000;

export function useWhatsAppExtension(): UseWhatsAppExtensionReturn {
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "WHATSAPP_EXTENSION_READY") {
        setExtensionAvailable(true);
      }
    };

    window.addEventListener("message", handleMessage);

    // Check if extension is already loaded
    window.postMessage({ type: "WHATSAPP_EXTENSION_PING" }, "*");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const sendCommand = useCallback((action: string, data: Partial<WhatsAppExtensionMessage>): Promise<boolean> => {
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const handleResponse = (event: MessageEvent) => {
        if (
          event.data?.type === "WHATSAPP_EXTENSION_RESPONSE" &&
          event.data?.requestId === requestId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.success === true);
        }
      };

      window.addEventListener("message", handleResponse);

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(false);
      }, EXTENSION_TIMEOUT);

      window.postMessage(
        {
          type: "WHATSAPP_EXTENSION_COMMAND",
          action,
          requestId,
          ...data,
        },
        "*"
      );
    });
  }, []);

  const openChat = useCallback(async (phone: string): Promise<boolean> => {
    if (!extensionAvailable) return false;
    return sendCommand("OPEN_CHAT", { phone: normalizePhone(phone) });
  }, [extensionAvailable, sendCommand]);

  const sendText = useCallback(async (phone: string, text: string): Promise<boolean> => {
    if (!extensionAvailable) return false;
    return sendCommand("SEND_TEXT", { phone: normalizePhone(phone), text });
  }, [extensionAvailable, sendCommand]);

  const sendImage = useCallback(async (phone: string, imageDataUrl: string): Promise<boolean> => {
    if (!extensionAvailable) return false;
    return sendCommand("SEND_IMAGE", { phone: normalizePhone(phone), imageDataUrl });
  }, [extensionAvailable, sendCommand]);

  const fallbackOpenWhatsApp = useCallback((phone: string, text?: string) => {
    const normalizedPhone = normalizePhone(phone);
    const url = text
      ? `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?phone=${normalizedPhone}`;
    window.open(url, "_blank");
  }, []);

  return {
    extensionAvailable,
    openChat,
    sendText,
    sendImage,
    fallbackOpenWhatsApp,
  };
}

function normalizePhone(phone: string): string {
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, "");
  
  // If doesn't start with +, assume it's Brazilian and add +55
  if (!normalized.startsWith("+")) {
    // If starts with 55, add +
    if (normalized.startsWith("55")) {
      normalized = "+" + normalized;
    } else {
      normalized = "+55" + normalized;
    }
  }
  
  return normalized;
}
