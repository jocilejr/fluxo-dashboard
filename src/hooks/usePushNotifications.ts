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

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        setIsSubscribed(true);
        console.log('Notification permission granted');
        return true;
      }
      
      console.log('Notification permission denied');
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    // Can't revoke permission programmatically, just update state
    setIsSubscribed(false);
    return true;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSubscribed || Notification.permission !== 'granted') return;
    
    try {
      new Notification(title, {
        icon: '/logo-ov.png',
        badge: '/favicon.png',
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSubscribed]);

  const testNotification = useCallback(() => {
    if (!isSubscribed) return false;
    
    showNotification('Teste de Notificação', {
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
