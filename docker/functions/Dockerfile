# ═══════════════════════════════════════════════════════════════════════════════
#  DASH ORIGEM VIVA - EDGE FUNCTIONS DOCKERFILE
#  Imagem customizada com functions embutidas para Docker Swarm
# ═══════════════════════════════════════════════════════════════════════════════

FROM supabase/edge-runtime:v1.45.2

# Copia todas as functions para dentro da imagem
COPY supabase/functions /home/deno/functions

# Define o comando padrão
CMD ["start", "--main-service", "main"]
