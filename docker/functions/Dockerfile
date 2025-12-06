# ═══════════════════════════════════════════════════════════════════════════════
#  DASH ORIGEM VIVA - EDGE FUNCTIONS DOCKERFILE
#  Imagem customizada com functions embutidas para Docker Swarm
# ═══════════════════════════════════════════════════════════════════════════════

FROM supabase/edge-runtime:v1.45.2

# Define o diretório de trabalho
WORKDIR /home/deno/functions

# Copia todas as functions para dentro da imagem
COPY supabase/functions /home/deno/functions

# Cria import_map.json na raiz das functions
RUN echo '{"imports":{"@supabase/supabase-js":"https://esm.sh/@supabase/supabase-js@2"}}' > /home/deno/functions/import_map.json

# Define o comando padrão com caminho completo
CMD ["start", "--main-service", "/home/deno/functions/main"]
