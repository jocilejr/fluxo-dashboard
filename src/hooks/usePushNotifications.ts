import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BEBa4kB7csiotrHNWLKW4x1MClWgWKBV683XGvV42NSUV0YlhjrFCFeozsYFbpZ0P4vEwHW_lJ7CiMKPyBThvEc';

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
    const hasNotification = 'Notification' in window;
    const hasPushManager = 'PushManager' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    console.log('[Push] Notification:', hasNotification, 'PushManager:', hasPushManager, 'SW:', hasServiceWorker);
    
    // Support basic notifications even without PushManager
    setIsSupported(hasNotification);
    
    if (hasNotification) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }

    if (hasServiceWorker) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[Push] Service Worker ready');
        setSwReady(true);
        
        // Check existing push subscription if PushManager available
        if (hasPushManager && registration.pushManager) {
          registration.pushManager.getSubscription().then((sub) => {
            console.log('[Push] Push subscription:', !!sub);
            // If we have push subscription, we're fully subscribed
            if (sub) setIsSubscribed(true);
          }).catch(err => console.error('[Push] Error checking subscription:', err));
        }
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

      // Try to create push subscription if PushManager is available
      const hasPushManager = 'PushManager' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;
      console.log('[Push] Creating subscription... PushManager:', hasPushManager, 'SW:', hasServiceWorker);
      
      if (hasPushManager && hasServiceWorker) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log('[Push] SW registration:', !!registration, 'pushManager:', !!registration.pushManager);
          
          if (registration.pushManager) {
            // First, unsubscribe any existing subscription
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
              console.log('[Push] Unsubscribing existing subscription');
              await existingSub.unsubscribe();
            }
            
            console.log('[Push] Subscribing with VAPID key...');
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            
            console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 50) + '...');
            
            const p256dhKey = subscription.getKey('p256dh');
            const authKey = subscription.getKey('auth');
            console.log('[Push] Keys obtained:', !!p256dhKey, !!authKey);
            
            if (p256dhKey && authKey) {
              const p256dhArray = new Uint8Array(p256dhKey);
              const authArray = new Uint8Array(authKey);
              
              // Delete existing subscriptions for this user first
              await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

              const { data, error } = await supabase.from('push_subscriptions').insert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, Array.from(p256dhArray))),
                auth: btoa(String.fromCharCode.apply(null, Array.from(authArray))),
              }).select();

              if (error) {
                console.error('[Push] Error saving subscription:', error);
              } else {
                console.log('[Push] Subscription saved to database:', data);
              }
            }
          }
        } catch (pushError) {
          console.error('[Push] PushManager error:', pushError);
        }
      } else {
        console.log('[Push] PushManager not available - notifications will only work with page open');
      }

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
