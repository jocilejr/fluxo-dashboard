#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  SCRIPT DE ATUALIZAÇÃO
#  Atualiza a aplicação mantendo dados e configurações
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ATUALIZAÇÃO - DASH ORIGEM VIVA${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

# Faz backup antes de atualizar
echo -e "\n${GREEN}[1/5]${NC} Fazendo backup de segurança..."
./scripts/backup.sh

# Puxa atualizações do git
echo -e "\n${GREEN}[2/5]${NC} Baixando atualizações..."
git fetch origin
git pull origin main

# Verifica se há novas migrações
echo -e "\n${GREEN}[3/5]${NC} Verificando migrações..."
NEW_MIGRATIONS=$(git diff --name-only HEAD@{1} HEAD -- supabase/migrations/ 2>/dev/null | wc -l)

if [[ $NEW_MIGRATIONS -gt 0 ]]; then
    echo -e "${YELLOW}  Novas migrações detectadas. Executando...${NC}"
    for file in $(git diff --name-only HEAD@{1} HEAD -- supabase/migrations/ 2>/dev/null); do
        echo "    - $(basename $file)"
        docker compose exec -T db psql -U postgres -d postgres < "$file"
    done
else
    echo "  Nenhuma nova migração"
fi

# Rebuild da aplicação
echo -e "\n${GREEN}[4/5]${NC} Reconstruindo aplicação..."
docker compose build app --no-cache

# Reinicia apenas a aplicação (mantém banco rodando)
echo -e "\n${GREEN}[5/5]${NC} Reiniciando aplicação..."
docker compose up -d app

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ATUALIZAÇÃO CONCLUÍDA!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Versão atual:"
git log -1 --format="  Commit: %h%n  Data: %ci%n  Mensagem: %s"
echo ""
