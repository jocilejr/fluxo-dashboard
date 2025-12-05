// Content Script - Dashboard (Lovable App)
// Comunicação entre a página web e a extensão

console.log('[Dashboard Extension] Content script carregado');

let isConnected = false;

// Registra no background
chrome.runtime.sendMessage({ type: 'DASHBOARD_READY' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('[Dashboard Extension] Erro ao registrar:', chrome.runtime.lastError);
  } else {
    console.log('[Dashboard Extension] Registrado no background');
  }
});

// Escuta mensagens da página web (via postMessage)
window.addEventListener('message', async (event) => {
  // Ignora mensagens que não são da própria página
  if (event.source !== window) return;
  
  const { type, payload, requestId } = event.data || {};
  
  if (!type || !type.startsWith('WHATSAPP_')) return;
  
  console.log('[Dashboard Extension] Recebeu da página:', type, payload);

  // Ping para verificar se extensão está ativa
  if (type === 'WHATSAPP_EXTENSION_PING') {
    window.postMessage({
      type: 'WHATSAPP_EXTENSION_READY',
      requestId
    }, '*');
    return;
  }

  // Verifica conexão com WhatsApp
  if (type === 'WHATSAPP_CHECK_CONNECTION') {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      window.postMessage({
        type: 'WHATSAPP_CONNECTION_STATUS',
        requestId,
        payload: { connected: response?.connected || false }
      }, '*');
    });
    return;
  }

  // Comandos para WhatsApp
  if (type === 'WHATSAPP_OPEN_CHAT') {
    chrome.runtime.sendMessage({
      type: 'OPEN_CHAT',
      phone: payload.phone
    }, (response) => {
      window.postMessage({
        type: 'WHATSAPP_RESPONSE',
        requestId,
        payload: response
      }, '*');
    });
    return;
  }

  if (type === 'WHATSAPP_SEND_TEXT') {
    chrome.runtime.sendMessage({
      type: 'SEND_TEXT',
      phone: payload.phone,
      text: payload.text
    }, (response) => {
      window.postMessage({
        type: 'WHATSAPP_RESPONSE',
        requestId,
        payload: response
      }, '*');
    });
    return;
  }

  if (type === 'WHATSAPP_SEND_IMAGE') {
    chrome.runtime.sendMessage({
      type: 'SEND_IMAGE',
      phone: payload.phone,
      imageUrl: payload.imageUrl
    }, (response) => {
      window.postMessage({
        type: 'WHATSAPP_RESPONSE',
        requestId,
        payload: response
      }, '*');
    });
    return;
  }
});

// Escuta mensagens do background (status do WhatsApp)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WHATSAPP_CONNECTED') {
    isConnected = true;
    window.postMessage({ type: 'WHATSAPP_STATUS_CHANGED', payload: { connected: true } }, '*');
  }
  
  if (message.type === 'WHATSAPP_DISCONNECTED') {
    isConnected = false;
    window.postMessage({ type: 'WHATSAPP_STATUS_CHANGED', payload: { connected: false } }, '*');
  }
  
  sendResponse({ received: true });
  return true;
});

// Notifica a página que a extensão está pronta
setTimeout(() => {
  window.postMessage({ type: 'WHATSAPP_EXTENSION_LOADED' }, '*');
}, 500);
