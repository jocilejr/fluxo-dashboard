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

const EXTENSION_TIMEOUT = 15000; // Increased for async operations

export function useWhatsAppExtension(): UseWhatsAppExtensionReturn {
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("[WhatsApp Extension] Message received:", event.data);
      if (event.data?.type === "WHATSAPP_EXTENSION_READY") {
        console.log("[WhatsApp Extension] Extension detected!");
        setExtensionAvailable(true);
      }
    };

    window.addEventListener("message", handleMessage);

    // Send PING immediately and retry a few times
    const sendPing = () => {
      console.log("[WhatsApp Extension] Sending PING...");
      window.postMessage({ type: "WHATSAPP_EXTENSION_PING" }, "*");
    };
    
    // Try immediately
    sendPing();
    
    // Retry after short delays in case content script loads late
    const retries = [500, 1000, 2000];
    const timeouts = retries.map((delay) => 
      setTimeout(sendPing, delay)
    );

    return () => {
      window.removeEventListener("message", handleMessage);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const sendCommand = useCallback((action: string, data: Partial<WhatsAppExtensionMessage>): Promise<boolean> => {
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log("[WhatsApp Extension] Sending command:", action, data, "requestId:", requestId);
      
      const handleResponse = (event: MessageEvent) => {
        console.log("[WhatsApp Extension] Response received:", event.data);
        if (
          event.data?.type === "WHATSAPP_EXTENSION_RESPONSE" &&
          event.data?.requestId === requestId
        ) {
          window.removeEventListener("message", handleResponse);
          console.log("[WhatsApp Extension] Command success:", event.data.success);
          resolve(event.data.success === true);
        }
      };

      window.addEventListener("message", handleResponse);

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        console.log("[WhatsApp Extension] Command timeout");
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
  // Remove all non-numeric characters
  let normalized = phone.replace(/[^\d]/g, "");
  
  // If doesn't start with 55, assume it's Brazilian and add 55
  if (!normalized.startsWith("55")) {
    normalized = "55" + normalized;
  }
  
  return normalized;
}
