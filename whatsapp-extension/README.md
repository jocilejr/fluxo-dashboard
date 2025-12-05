# Extensão WhatsApp - Dash Origem Viva

Esta extensão permite integração direta entre o Dashboard Origem Viva e o WhatsApp Web para recuperação de boletos e transações.

## Instalação

### Chrome / Edge / Brave

1. Baixe ou clone esta pasta `whatsapp-extension`

2. Abra o navegador e acesse:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`

3. Ative o **Modo do desenvolvedor** (canto superior direito)

4. Clique em **Carregar sem compactação** (ou "Load unpacked")

5. Selecione a pasta `whatsapp-extension`

6. A extensão será instalada e aparecerá na lista

## Uso

1. Abra o Dashboard Origem Viva em uma aba

2. Abra o WhatsApp Web (web.whatsapp.com) em outra aba e faça login

3. No Dashboard, ao clicar em "Enviar WhatsApp" em uma transação:
   - A extensão abrirá automaticamente a conversa com o cliente
   - A mensagem será preparada no campo de texto
   - **Revise a mensagem e clique em Enviar manualmente**

## Funcionalidades

- ✅ Abre conversa automaticamente pelo número do cliente
- ✅ Prepara mensagem de recuperação no campo de texto
- ✅ Funciona com números brasileiros (adiciona +55 automaticamente)
- ✅ Indicador de conexão no Dashboard

## Limitações

- ⚠️ Não envia mensagens automaticamente (por segurança)
- ⚠️ Imagens precisam ser arrastadas manualmente para o WhatsApp
- ⚠️ Requer WhatsApp Web logado e aberto em uma aba

## Ícones

Para personalizar os ícones da extensão, substitua os arquivos:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Troubleshooting

### "Extensão WhatsApp não detectada"
- Verifique se a extensão está instalada e ativada
- Recarregue a página do Dashboard
- Verifique se o domínio está na lista de permissões

### "Não foi possível abrir WhatsApp Web"
- Verifique se o WhatsApp Web está aberto e logado
- Tente abrir manualmente o WhatsApp Web primeiro
- Recarregue a extensão em `chrome://extensions`

### Conversa não abre
- Verifique se o número está correto
- O número precisa estar cadastrado no WhatsApp
- Tente adicionar o código do país manualmente (ex: 5511999999999)

## Suporte

Em caso de problemas, entre em contato com o suporte técnico.
