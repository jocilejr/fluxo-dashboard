# 🚀 Instalação - Dash Origem Viva

## Requisitos da VPS

- **Sistema Operacional**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Mínimo 4GB (recomendado 8GB)
- **Disco**: 50GB SSD
- **CPU**: 2+ vCPUs
- **Portas**: 80, 443, 3000 (Studio), 5432 (PostgreSQL) abertas

## Instalação Rápida

### 1. Clone o repositório

```bash
git clone <url-do-repositorio> dash-origem-viva
cd dash-origem-viva
```

### 2. Execute o instalador

```bash
chmod +x install.sh
sudo ./install.sh
```

### 3. Responda as perguntas

O script vai solicitar:

1. **Domínio**: URL onde a aplicação ficará acessível (ex: `dashboard.seusite.com.br`)
2. **Email admin**: Para login no painel
3. **Senha admin**: Mínimo 8 caracteres
4. **Telefone** (opcional): Para o perfil do admin

### 4. Aguarde a instalação

O script irá automaticamente:

- ✅ Instalar Docker e Docker Compose (se necessário)
- ✅ Gerar todas as credenciais de segurança
- ✅ Criar arquivo de configuração (.env)
- ✅ Baixar e iniciar todos os containers
- ✅ Executar migrações do banco de dados
- ✅ Criar usuário administrador
- ✅ Configurar Edge Functions

## Após a Instalação

### Acessos

| Serviço | URL |
|---------|-----|
| **Aplicação** | `https://seu-dominio.com.br` |
| **Supabase Studio** | `https://seu-dominio.com.br:3000` |
| **API** | `https://seu-dominio.com.br/api` |

### Configurar SSL (Let's Encrypt)

⚠️ **Importante**: Execute após configurar DNS

```bash
sudo ./scripts/setup-ssl.sh
```

### Configurar DNS

Antes de configurar SSL, aponte seu domínio para o IP da VPS:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | IP-DA-VPS |
| A | www | IP-DA-VPS |

### Configurar Integrações

Edite o arquivo `.env` para adicionar tokens de integração:

```bash
nano .env
```

Variáveis opcionais:
- `TYPEBOT_API_TOKEN` - Para analytics de Typebots
- `RESEND_API_KEY` - Para envio de emails

Após editar, reinicie:

```bash
docker compose restart
```

## Comandos Úteis

### Gerenciamento

```bash
# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f app
docker compose logs -f db
docker compose logs -f auth

# Reiniciar todos os serviços
docker compose restart

# Reiniciar um serviço específico
docker compose restart app

# Parar todos os serviços
docker compose stop

# Iniciar todos os serviços
docker compose up -d
```

### Backup e Restore

```bash
# Fazer backup
./scripts/backup.sh

# Restaurar backup
./scripts/restore.sh
```

### Atualização

```bash
# Atualizar para versão mais recente
./scripts/update.sh
```

### Acesso ao Banco de Dados

```bash
# Conectar ao PostgreSQL
docker compose exec db psql -U postgres

# Executar query
docker compose exec db psql -U postgres -c "SELECT * FROM transactions LIMIT 10;"
```

## Estrutura de Arquivos

```
dash-origem-viva/
├── install.sh              # Script de instalação
├── docker-compose.yml      # Configuração dos containers
├── Dockerfile              # Build da aplicação
├── .env                    # Configurações (gerado)
├── .env.example            # Template de configurações
├── CREDENCIAIS.txt         # Credenciais (gerado, DELETAR!)
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf      # Configuração do Nginx
│   │   └── ssl/            # Certificados SSL
│   └── supabase/
│       ├── kong.yml        # Configuração do API Gateway
│       └── volumes/        # Dados persistentes
├── scripts/
│   ├── setup-ssl.sh        # Configurar SSL
│   ├── backup.sh           # Fazer backup
│   ├── restore.sh          # Restaurar backup
│   └── update.sh           # Atualizar aplicação
├── supabase/
│   ├── migrations/         # Migrações do banco
│   └── functions/          # Edge Functions
└── src/                    # Código da aplicação
```

## Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs [nome-do-servico]

# Verificar uso de recursos
docker stats
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
docker compose exec db pg_isready

# Reiniciar banco
docker compose restart db
```

### Certificado SSL inválido

```bash
# Renovar certificado
sudo certbot renew
sudo cp /etc/letsencrypt/live/SEU-DOMINIO/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/SEU-DOMINIO/privkey.pem docker/nginx/ssl/key.pem
docker compose restart app
```

### Aplicação lenta

```bash
# Verificar uso de memória
free -h

# Verificar disco
df -h

# Limpar imagens Docker antigas
docker system prune -a
```

### Edge Functions não funcionam

```bash
# Ver logs das functions
docker compose logs functions

# Reiniciar serviço de functions
docker compose restart functions
```

## Segurança

### Recomendações

1. **Altere a senha do admin** após primeira instalação
2. **Delete o arquivo CREDENCIAIS.txt** após anotar as senhas
3. **Configure firewall** para permitir apenas portas necessárias
4. **Mantenha o sistema atualizado** com `./scripts/update.sh`
5. **Faça backups regulares** com `./scripts/backup.sh`

### Firewall (UFW)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Suporte

Em caso de problemas:

1. Verifique os logs: `docker compose logs -f`
2. Consulte este README
3. Verifique se todos os requisitos estão atendidos

---

**Dash Origem Viva** - Sistema de Gestão de Transações
