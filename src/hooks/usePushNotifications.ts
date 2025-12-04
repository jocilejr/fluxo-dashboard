import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    console.log('[Push] Notification API supported:', supported);
    setIsSupported(supported);
    
    if (supported) {
      console.log('[Push] Current permission:', Notification.permission);
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[Push] Service Worker ready:', registration);
        setSwReady(true);
      }).catch((err) => {
        console.error('[Push] Service Worker not ready:', err);
      });

      // Also log current registrations
      navigator.serviceWorker.getRegistrations().then((regs) => {
        console.log('[Push] Service Worker registrations:', regs.length);
        regs.forEach((r, i) => console.log(`[Push] SW ${i}:`, r.scope, r.active?.state));
      });
    } else {
      console.log('[Push] Service Worker not supported');
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    console.log('[Push] subscribe() called, user:', !!user, 'supported:', isSupported);
    
    if (!user) return { success: false, reason: 'not_logged_in' };
    if (!isSupported) return { success: false, reason: 'not_supported' };
    
    // Check if running as installed PWA on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    console.log('[Push] Device check - iOS:', isIOS, 'Standalone:', isStandalone);
    
    if (isIOS && !isStandalone) {
      return { success: false, reason: 'ios_not_pwa' };
    }
    
    setIsLoading(true);
    try {
      console.log('[Push] Requesting permission...');
      const perm = await Notification.requestPermission();
      console.log('[Push] Permission result:', perm);
      setPermission(perm);
      
      if (perm === 'granted') {
        setIsSubscribed(true);
        console.log('[Push] Notification permission granted!');
        return { success: true };
      }
      
      console.log('[Push] Notification permission not granted:', perm);
      return { success: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
    } catch (error) {
      console.error('[Push] Error requesting notification permission:', error);
      return { success: false, reason: 'error' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    // Can't revoke permission programmatically, just update state
    setIsSubscribed(false);
    return true;
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    console.log('[Push] showNotification called:', title, 'subscribed:', isSubscribed, 'permission:', Notification.permission);
    
    if (!isSubscribed || Notification.permission !== 'granted') {
      console.log('[Push] Cannot show notification - not subscribed or no permission');
      return;
    }
    
    try {
      // Try Service Worker first (required for some mobile browsers)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Using Service Worker to show notification');
        await registration.showNotification(title, {
          icon: '/logo-ov.png',
          badge: '/favicon.png',
          requireInteraction: true,
          ...options,
        });
        console.log('[Push] Notification shown via SW!');
      } else {
        // Fallback for browsers without SW
        console.log('[Push] Using native Notification API');
        new Notification(title, {
          icon: '/logo-ov.png',
          badge: '/favicon.png',
          ...options,
        });
        console.log('[Push] Notification shown via native API!');
      }
    } catch (error) {
      console.error('[Push] Error showing notification:', error);
    }
  }, [isSubscribed]);

  const testNotification = useCallback(async () => {
    console.log('[Push] testNotification called, subscribed:', isSubscribed);
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
