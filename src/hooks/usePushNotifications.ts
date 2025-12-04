import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    if (!user) return { success: false, reason: 'not_logged_in' };
    if (!isSupported) return { success: false, reason: 'not_supported' };
    
    // Check if running as installed PWA on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isIOS && !isStandalone) {
      return { success: false, reason: 'ios_not_pwa' };
    }
    
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        setIsSubscribed(true);
        console.log('Notification permission granted');
        return { success: true };
      }
      
      console.log('Notification permission denied:', perm);
      return { success: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
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
    if (!isSubscribed || Notification.permission !== 'granted') return;
    
    try {
      // Use Service Worker for iOS PWA compatibility
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, {
          icon: '/logo-ov.png',
          badge: '/favicon.png',
          ...options,
        });
      } else {
        // Fallback for browsers without SW
        new Notification(title, {
          icon: '/logo-ov.png',
          badge: '/favicon.png',
          ...options,
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSubscribed]);

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
    subscribe,
    unsubscribe,
    showNotification,
    testNotification,
  };
}
