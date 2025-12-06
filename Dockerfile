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

# Instala curl para health check
RUN apk add --no-cache curl

# Copia arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração do Nginx
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Expõe porta
EXPOSE 80

# Health check usando curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
