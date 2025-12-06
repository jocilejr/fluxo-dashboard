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

# Copia arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração do Nginx inline (simples, sem template)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript; \
    \
    # Cache para assets estáticos \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Health check \
    location /health { \
        return 200 "OK"; \
        add_header Content-Type text/plain; \
    } \
    \
    # SPA fallback \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy para API Supabase (Kong) \
    location /api/ { \
        proxy_pass http://kong:8000/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Remove config default que conflita
RUN rm -f /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

# Expõe porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
