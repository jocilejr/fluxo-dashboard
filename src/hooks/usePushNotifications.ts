import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        const subscription = await reg.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error checking push subscription:", error);
      }
    };

    checkSubscription();
  }, []);

  // Get the PWA service worker registration
  const getServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker not supported");
    }

    try {
      // Use the PWA service worker that's already registered
      const reg = await navigator.serviceWorker.ready;
      setRegistration(reg);
      return reg;
    } catch (error) {
      console.error("Service Worker not ready:", error);
      throw error;
    }
  }, []);

  // Get VAPID public key from the server
  const getVapidKey = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("push-subscribe", {
      body: { action: "get-vapid-key" },
    });

    if (error || !data?.vapidPublicKey) {
      throw new Error("Failed to get VAPID key");
    }

    return data.vapidPublicKey;
  }, []);

  // Convert base64 to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = useCallback((base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission denied");
      }

      // Get the PWA service worker
      let reg = registration;
      if (!reg) {
        reg = await getServiceWorker();
      }

      // Check for existing subscription and unsubscribe it first (fixes stale subscription issue)
      const existingSubscription = await reg.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("Found existing subscription, unsubscribing first...");
        try {
          await existingSubscription.unsubscribe();
        } catch (e) {
          console.log("Could not unsubscribe old subscription:", e);
        }
      }

      // Get VAPID key
      const vapidKey = await getVapidKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe to push with fresh subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log("New subscription created:", subscription.endpoint);

      // Send subscription to server
      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      console.log("Push subscription successful");
      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, getServiceWorker, getVapidKey, urlBase64ToUint8Array]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Notify server
        await supabase.functions.invoke("push-subscribe", {
          body: {
            action: "unsubscribe",
            subscription: subscription.toJSON(),
          },
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      console.log("Push unsubscription successful");
      return true;
    } catch (error) {
      console.error("Push unsubscription failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  return {
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  };
}
