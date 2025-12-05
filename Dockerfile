# ═══════════════════════════════════════════════════════════════════════════════
#  DASH ORIGEM VIVA - DOCKERFILE
#  Build Multi-stage para produção otimizada
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  STAGE 1: Build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache python3 make g++

# Copia arquivos de dependências
COPY package*.json ./
COPY bun.lockb* ./

# Instala dependências
RUN npm ci --legacy-peer-deps

# Copia código fonte
COPY . .

# Argumentos de build (variáveis de ambiente para Vite)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_VAPID_PUBLIC_KEY

# Define variáveis de ambiente para o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

# Build da aplicação
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
#  STAGE 2: Production
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Instala envsubst para substituição de variáveis
RUN apk add --no-cache gettext

# Copia arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração do nginx como template
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf.template

# Cria diretórios necessários
RUN mkdir -p /etc/nginx/ssl /var/run/nginx /tmp/nginx

# Copia mime.types para /tmp para uso com config customizado
RUN cp /etc/nginx/mime.types /tmp/nginx/mime.types

# Script de inicialização - gera config em /tmp e usa nginx -c
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Substitui variáveis no template' >> /docker-entrypoint.sh && \
    echo 'envsubst "\$DOMAIN \$HTTPS_PORT" < /etc/nginx/nginx.conf.template > /tmp/nginx/nginx.conf' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Ajusta path do mime.types no config' >> /docker-entrypoint.sh && \
    echo 'sed -i "s|include /etc/nginx/mime.types|include /tmp/nginx/mime.types|g" /tmp/nginx/nginx.conf' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Inicia nginx com config de /tmp' >> /docker-entrypoint.sh && \
    echo 'exec nginx -c /tmp/nginx/nginx.conf -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expõe portas
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Comando de inicialização
CMD ["/docker-entrypoint.sh"]
