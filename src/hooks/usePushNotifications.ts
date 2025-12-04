import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BLBz0n8JZ8Hl3VwzGMXsXxqRNqR7aSxU1I7E7oj0C5KTx7MJfXqjQ1K9P8x0Y2L3A4B5C6D7E8F9G0H1I2J3K4L5';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'PushManager' in window;
    console.log('[Push] Supported:', supported);
    setIsSupported(supported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[Push] Service Worker ready');
        setSwReady(true);
        
        // Check existing subscription
        registration.pushManager.getSubscription().then((sub) => {
          console.log('[Push] Existing subscription:', !!sub);
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    console.log('[Push] subscribe() called');
    
    if (!user) return { success: false, reason: 'not_logged_in' };
    if (!isSupported) return { success: false, reason: 'not_supported' };
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isIOS && !isStandalone) {
      return { success: false, reason: 'ios_not_pwa' };
    }
    
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      console.log('[Push] Permission:', perm);
      setPermission(perm);
      
      if (perm !== 'granted') {
        return { success: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      console.log('[Push] Subscription created:', subscription.endpoint);
      
      // Save to database
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dhArray = new Uint8Array(p256dhKey);
      const authArray = new Uint8Array(authKey);

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(p256dhArray))),
        auth: btoa(String.fromCharCode.apply(null, Array.from(authArray))),
      }, {
        onConflict: 'user_id',
      });

      if (error) {
        console.error('[Push] Error saving subscription:', error);
        throw error;
      }

      console.log('[Push] Subscription saved to database');
      setIsSubscribed(true);
      return { success: true };
    } catch (error) {
      console.error('[Push] Error:', error);
      return { success: false, reason: 'error' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
      
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      return false;
    }
  }, [user]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (Notification.permission !== 'granted') return;
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/logo-ov.png',
          badge: '/favicon.png',
          requireInteraction: true,
          ...options,
        });
      }
    } catch (error) {
      console.error('[Push] Error showing notification:', error);
    }
  }, []);

  const testNotification = useCallback(async () => {
    if (!isSubscribed) return false;
    await showNotification('Teste de Notificação', {
      body: 'As notificações estão funcionando!',
      tag: 'test',
    });
    return true;
  }, [isSubscribed, showNotification]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    swReady,
    subscribe,
    unsubscribe,
    showNotification,
    testNotification,
  };
}
