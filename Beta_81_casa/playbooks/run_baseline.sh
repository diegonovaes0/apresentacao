#!/bin/bash
#
# Script interativo para execução da playbook de baseline
# Solicita hostname e credenciais ao usuário
#

# Configuração de cores para terminal
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # Sem cor

# Caminhos dos arquivos
INVENTORY_FILE="../inventory/inventory.ini"
PLAYBOOK_FILE="baseline_universal.yml"

# Cabeçalho
clear
echo -e "${BLUE}${BOLD}================================================${NC}"
echo -e "${BLUE}${BOLD}     CONFIGURAÇÃO BASELINE INTERATIVA           ${NC}"
echo -e "${BLUE}${BOLD}================================================${NC}"

# Validação dos arquivos necessários
if [ ! -f "$PLAYBOOK_FILE" ]; then
    echo -e "${RED}ERRO: Playbook não encontrada: '$PLAYBOOK_FILE'${NC}"
    exit 1
fi

if [ ! -f "$INVENTORY_FILE" ]; then
    echo -e "${RED}ERRO: Inventário não encontrado: '$INVENTORY_FILE'${NC}"
    exit 1
fi

# Solicitar informações ao usuário
echo -e "${YELLOW}Por favor, forneça as seguintes informações:${NC}"
echo

# Hostname
read -p "$(echo -e ${BOLD}"Digite o hostname do servidor: "${NC})" HOSTNAME
# Valor padrão se vazio
if [ -z "$HOSTNAME" ]; then
    HOSTNAME="servidor-$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Usando hostname padrão: ${HOSTNAME}${NC}"
fi

# Senha do parceiro
read -sp "$(echo -e ${BOLD}"Digite a senha para o usuário parceiro: "${NC})" PARCEIRO_PASSWORD
echo
# Valor padrão se vazio
if [ -z "$PARCEIRO_PASSWORD" ]; then
    PARCEIRO_PASSWORD="P@rc31r0!2025"
    echo -e "${YELLOW}Usando senha padrão para parceiro${NC}"
fi

# Senha do root
read -sp "$(echo -e ${BOLD}"Digite a senha para o usuário root: "${NC})" ROOT_PASSWORD
echo
# Valor padrão se vazio
if [ -z "$ROOT_PASSWORD" ]; then
    ROOT_PASSWORD="R00t@Skyone!2025"
    echo -e "${YELLOW}Usando senha padrão para root${NC}"
fi

echo
echo -e "${YELLOW}--------------------------------------------${NC}"
echo -e "${YELLOW}Resumo:${NC}"
echo -e "  Hostname: ${GREEN}$HOSTNAME${NC}"
echo -e "  Inventário: ${GREEN}$INVENTORY_FILE${NC}"
echo -e "  Playbook: ${GREEN}$PLAYBOOK_FILE${NC}"
echo -e "${YELLOW}--------------------------------------------${NC}"

# Confirmar execução
read -p "$(echo -e ${BOLD}"Deseja continuar com a configuração? (s/n): "${NC})" CONFIRM
if [[ ! $CONFIRM =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
    exit 0
fi

# Execução da playbook
echo
echo -e "${YELLOW}Iniciando execução da playbook...${NC}"
ansible-playbook -i "$INVENTORY_FILE" "$PLAYBOOK_FILE" \
  --extra-vars "new_hostname=$HOSTNAME root_password=$ROOT_PASSWORD parceiro_password=$PARCEIRO_PASSWORD"

# Verificação do resultado
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Configuração concluída com sucesso!${NC}"
    echo
    echo -e "${YELLOW}RESUMO DA CONFIGURAÇÃO:${NC}"
    echo -e "  ▸ Hostname: ${GREEN}$HOSTNAME${NC}"
    echo -e "  ▸ Usuário: ${GREEN}parceiro${NC}"
    echo -e "    Senha: ${GREEN}$PARCEIRO_PASSWORD${NC}"
    echo -e "  ▸ Usuário: ${GREEN}root${NC}"
    echo -e "    Senha: ${GREEN}$ROOT_PASSWORD${NC}"
    echo -e "${YELLOW}================================================${NC}"
else
    echo -e "${RED}✗ Falha na configuração de baseline!${NC}"
    echo -e "${RED}Verifique os logs acima para identificar o problema.${NC}"
    exit 1
fi