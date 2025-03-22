/**
 * ansible-baseline-multihost-integrado.js
 * 
 * Solução integrada que combina:
 * - Banner de bloqueio obrigatório para configuração de baseline (do primeiro script)
 * - Suporte a múltiplos hosts com execução sequencial (do segundo script)
 * - Interface visual otimizada e compacta
 * 
 * @version 1.0.0
 */

(function() {
    console.log("[Ansible Multi-Host] Inicializando solução integrada com banner obrigatório");

    // Configurações
    const CONFIG = {
        // Palavras-chave para identificar playbooks de baseline
        baselineKeywords: ['baseline', 'configuracao-base', 'configuração-base'],
        
        // Configurações de senha
        minPasswordLength: 8,
        defaultPasswordLength: 15,
        
        // Prefixo padrão para hostname
        defaultHostnamePrefix: 'SKY-INT-SDL-',
        
        // Seletores para localizar elementos na página
        selectors: {
            hostsContainer: '#hosts-list',
            playbooksContainer: '#playbooks',
            runningPlaybooks: '#running-playbooks'
        },
        
        // Estilo para os elementos
        styles: {
            bannerBg: '#121212',
            bannerBorderColor: '#FFD600',
            bannerTextColor: '#FFFFFF',
            bannerHeaderBg: '#1A1A1A',
            buttonColor: '#FFD600',
            buttonTextColor: '#000000',
            warningColor: '#FF9800',
            errorColor: '#F44336',
            successColor: '#4CAF50'
        }
    };

    // Estado do sistema
    const STATE = {
        // Mapeia hosts para seus banners
        hostBanners: new Map(),
        
        // Rastreamento de hosts configurados
        configuredHosts: new Set(),
        
        // Mapeamento de IDs de trabalho para hosts específicos
        jobHostMap: new Map(),
        
        // Cache de saídas de execução
        outputCache: new Map(),
        
        // Pilha de jobs criados recentemente
        jobCreationStack: [],
        
        // Mapa de jobId master -> array de jobs individuais
        individualJobs: new Map(),
        
        // Mapa de jobId master -> array de hosts
        masterHostsMap: new Map(),
        
        // Rastrear solicitações de saída
        outputRequests: new Map(),
        
        // Estado de progresso para cards
        progressState: new Map(),
        
        // Timers para atualização automática
        autoRefreshTimers: new Map(),
        
        // Contador para hostnames sequenciais
        hostCounter: 1,
        
        // Armazenar funções originais
        originalFunctions: {
            executeSelectedPlaybooks: window.executeSelectedPlaybooks,
            createExecutionCard: window.createExecutionCard,
            monitorPlaybookExecution: window.monitorPlaybookExecution,
            toggleOutput: window.toggleOutput,
            fetch: window.fetch
        },
        
        // Estado de modal de bloqueio
        modalActive: false
    };

    /**
     * Verifica se uma string contém alguma das palavras-chave de baseline
     * @param {string} text - Texto a ser verificado
     * @return {boolean} Verdadeiro se for um baseline
     */
    function isBaselinePlaybook(text) {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return CONFIG.baselineKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Gera uma senha aleatória segura
     * @param {number} length - Comprimento da senha
     * @return {string} Senha gerada
     */
    function generatePassword(length = CONFIG.defaultPasswordLength) {
        const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowerChars = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const specialChars = "!@#$%^&*()_-+=";
        const allChars = upperChars + lowerChars + numbers + specialChars;
        
        // Garantir que tenha pelo menos um caractere de cada tipo
        let password = 
            upperChars.charAt(Math.floor(Math.random() * upperChars.length)) +
            lowerChars.charAt(Math.floor(Math.random() * lowerChars.length)) +
            numbers.charAt(Math.floor(Math.random() * numbers.length)) +
            specialChars.charAt(Math.floor(Math.random() * specialChars.length));
        
        // Preencher o resto da senha
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Embaralhar a senha para garantir aleatoriedade
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    /**
     * Gera hostname padrão
     * @param {string} hostname - Hostname atual
     * @return {string} Hostname padronizado
     */
    function generateDefaultHostname(hostname) {
        // Se o hostname atual já começa com o prefixo, use-o
        if (hostname.startsWith(CONFIG.defaultHostnamePrefix)) {
            return hostname;
        }
        
        // Caso contrário, gere um novo com contador sequencial
        return `${CONFIG.defaultHostnamePrefix}0${STATE.hostCounter++}`;
    }

    /**
     * Gera um ID de banner único para um host
     * @param {string} hostname - Nome do host
     * @return {string} ID único
     */
    function generateBannerId(hostname) {
        return `baseline-config-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }

    /**
     * Gera um ID de log seguro para seletor CSS
     * @param {string} hostname - Nome do host 
     * @return {string} ID seguro para CSS
     */
    function generateSafeLogId(hostname) {
        // Remover pontos e outros caracteres problemáticos para seletores CSS
        return `baseline-log-${hostname.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '-')}`;
    }

    /**
     * Adiciona estilos CSS necessários para o sistema
     */
    function addStyles() {
        if (document.getElementById('baseline-validation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'baseline-validation-styles';
        style.textContent = `
            /* Estilos para banner de configuração */
            .baseline-config-banner {
                background: ${CONFIG.styles.bannerBg};
                border: 1px solid ${CONFIG.styles.bannerBorderColor};
                border-radius: 6px;
                margin: 10px 0;
                width: 100%;
                color: ${CONFIG.styles.bannerTextColor};
                overflow: hidden;
                animation: slideDown 0.3s ease;
            }
            
            /* Modal de bloqueio */
            .baseline-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.85);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(3px);
            }
            
            .baseline-modal {
                background: ${CONFIG.styles.bannerBg};
                border: 2px solid ${CONFIG.styles.bannerBorderColor};
                border-radius: 6px;
                width: 90%;
                max-width: 550px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                padding: 0;
                animation: modalFadeIn 0.3s ease;
            }
            
            .baseline-modal-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                padding: 20px;
            }
            
            .baseline-modal-grid .full-width {
                grid-column: 1 / -1;
            }
            
            @keyframes modalFadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .banner-header, .modal-header {
                background: ${CONFIG.styles.bannerHeaderBg};
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
            }
            
            .banner-header h3, .modal-header h3 {
                margin: 0;
                font-size: 16px;
                color: ${CONFIG.styles.bannerBorderColor};
            }
            
            .banner-content, .modal-content {
                padding: 15px;
            }
            
            .form-group {
                margin-bottom: 12px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-size: 13px;
                color: #CCC;
            }
            
            .form-control {
                width: 100%;
                padding: 8px;
                background: #2A2A2A;
                border: 1px solid #333;
                border-radius: 4px;
                color: white;
                font-size: 13px;
            }
            
            .password-group {
                display: flex;
                gap: 5px;
            }
            
            .password-group .form-control {
                flex: 1;
            }
            
            .toggle-password {
                background: #2A2A2A;
                border: 1px solid #333;
                border-radius: 4px;
                color: #CCC;
                cursor: pointer;
                padding: 0 8px;
            }
            
            .banner-actions, .modal-actions {
                display: flex;
                gap: 8px;
                margin-top: 15px;
            }
            
            .banner-actions button, .modal-actions button {
                flex: 1;
                padding: 8px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                font-size: 12px;
            }
            
            .generate-passwords, .secondary-btn {
                background: #2A2A2A;
                color: white;
            }
            
            .save-config, .primary-btn {
                background: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
            }
            
            .banner-close, .modal-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 16px;
            }
            
            .banner-status, .modal-status {
                margin-top: 10px;
                font-size: 12px;
                min-height: 20px;
            }
            
            /* Estilo para hostes */
            .host-banner {
                position: relative;
            }
            
            .host-config-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: ${CONFIG.styles.successColor};
                color: white;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                z-index: 10;
            }
            
            .baseline-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                background: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
                padding: 3px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
                z-index: 10;
                opacity: 0.8;
                transition: opacity 0.2s, transform 0.2s;
            }
            
            .baseline-badge:hover {
                opacity: 1;
                transform: translateY(-2px);
            }
            
            .baseline-badge.required {
                animation: pulse 1s infinite;
                background: ${CONFIG.styles.warningColor};
                color: white;
            }
            
            /* Logs */
            .baseline-log-container {
                margin-top: 12px;
                border: 1px solid #333;
                border-radius: 6px;
                overflow: hidden;
            }
            
            .baseline-log-header {
                background: #1A1A1A;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #333;
            }
            
            .baseline-log-header h4 {
                margin: 0;
                font-size: 13px;
                color: ${CONFIG.styles.bannerBorderColor};
            }
            
            .baseline-log-content {
                padding: 10px;
                max-height: 300px;
                overflow-y: auto;
                background: #121212;
            }
            
            .log-line {
                font-family: monospace;
                font-size: 12px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-break: break-all;
            }
            
            .log-task {
                color: #9cdcfe;
                margin-top: 8px;
            }
            
            .log-ok {
                color: ${CONFIG.styles.successColor};
            }
            
            .log-changed {
                color: ${CONFIG.styles.warningColor};
            }
            
            .log-failed {
                color: ${CONFIG.styles.errorColor};
            }
            
            .log-summary {
                margin-top: 10px;
                padding: 8px;
                background: #1A1A1A;
                border-radius: 4px;
            }
            
            .log-summary-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }
            
            .log-summary-label {
                color: #CCC;
                font-size: 12px;
            }
            
            .log-summary-value {
                font-weight: bold;
                font-size: 12px;
            }
            
            .host-baseline-container {
                margin-top: 8px;
                margin-bottom: 15px;
                border-left: 3px solid ${CONFIG.styles.bannerBorderColor};
                padding-left: 8px;
            }
            
            .log-toggle {
                margin-left: 10px;
                background: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 12px;
                cursor: pointer;
                font-weight: bold;
            }
            
            /* Estilos para barra de progresso */
            .progress-container {
                width: 100%;
                height: 4px;
                background-color: #2A2A2A;
                border-radius: 2px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .progress-bar {
                height: 100%;
                background-color: var(--accent-gold, #FFD600);
                border-radius: 2px;
                width: 0%;
                transition: width 0.3s ease, background-color 0.3s ease;
            }
            
            /* Estilos para saída do ansible */
            .ansible-output {
                max-height: 500px;
                overflow-y: auto;
                padding: 10px;
                background-color: #1e1e1e;
                color: #d4d4d4;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .ansible-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #B0B0B0;
            }
            
            .ansible-error {
                color: #F44336;
                padding: 10px;
                border-left: 3px solid #F44336;
                background-color: rgba(244, 67, 54, 0.1);
            }
            
            .ansible-warning {
                color: #FFC107;
                padding: 10px;
                border-left: 3px solid #FFC107;
                background-color: rgba(255, 193, 7, 0.1);
            }
            
            /* Status específicos para tarefas */
            .task-status {
                margin-top: 10px;
                font-weight: 500;
            }
            
            .task-status.success {
                color: #4CAF50;
            }
            
            .task-status.failed {
                color: #F44336;
            }
            
            .task-status.cancelled {
                color: #FF9800;
            }
            
            /* Melhorias para host section divider */
            .host-section-divider {
                border-top: 1px solid #2A2A2A;
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
                color: #FFD600;
                padding-top: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .host-label {
                display: inline-block;
                background: #0A0A0A;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .host-job {
                display: inline-block;
                background: #252525;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                color: #999;
                margin-left: auto;
            }
            
            /* Formatação de saída do Ansible */
            .ansible-formatted-output {
                font-family: monospace;
                white-space: pre-wrap;
                line-height: 1.4;
            }
            
            .ansible-play-header {
                color: #569cd6;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
            }
            
            .ansible-task-header {
                color: #9cdcfe;
                font-weight: bold;
                margin-top: 8px;
                margin-bottom: 4px;
                margin-left: 10px;
            }
            
            .ansible-ok { color: #4EC9B0; font-weight: bold; }
            .ansible-changed { color: #CE9178; font-weight: bold; }
            .ansible-failed { color: #F14C4C; font-weight: bold; }
            .ansible-skipped { color: #808080; font-weight: bold; }
            .ansible-unreachable { color: #F14C4C; font-weight: bold; }
            
            .ansible-recap-header {
                color: #569cd6;
                font-weight: bold;
                margin-top: 15px;
                margin-bottom: 5px;
                border-top: 1px solid #333;
                padding-top: 5px;
            }
            
            /* Host Badge para multi-host display */
            .host-multi-badge {
                display: inline-block;
                padding: 2px 5px;
                margin: 2px;
                border-radius: 3px;
                font-size: 10px;
                background: #333;
                color: white;
            }
            
            .host-multi-badge.configured {
                background: ${CONFIG.styles.successColor};
            }
            
            .host-multi-badge.pending {
                background: ${CONFIG.styles.warningColor};
                color: black;
            }
        `;
        
        document.head.appendChild(style);
        console.log("[Ansible Multi-Host] Estilos adicionados com sucesso");
    }

    /**
     * Exibe uma mensagem na interface
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo da mensagem (success, error, warning)
     * @param {number} duration - Duração em ms (0 para não fechar)
     */
    function showMessage(message, type = 'info', duration = 3000) {
        // Verificar se existe uma função global de mensagem
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type, duration);
            return;
        }
        
        // Implementação alternativa
        const container = document.querySelector(CONFIG.selectors.runningPlaybooks) || document.body;
        
        const bgColors = {
            success: 'rgba(76, 175, 80, 0.1)',
            error: 'rgba(244, 67, 54, 0.1)',
            warning: 'rgba(255, 152, 0, 0.1)',
            info: 'rgba(33, 150, 243, 0.1)'
        };
        
        const borderColors = {
            success: CONFIG.styles.successColor,
            error: CONFIG.styles.errorColor,
            warning: CONFIG.styles.warningColor,
            info: '#2196F3'
        };
        
        const msgElement = document.createElement('div');
        msgElement.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 6px;
            border-left: 4px solid ${borderColors[type] || borderColors.info};
            background: ${bgColors[type] || bgColors.info};
            color: ${borderColors[type] || borderColors.info};
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: fadeIn 0.3s ease;
            z-index: 100000;
        `;
        
        msgElement.innerHTML = `
            <span>${message}</span>
            <button style="background: none; border: none; color: ${borderColors[type] || borderColors.info}; cursor: pointer;">✕</button>
        `;
        
        // Adicionar evento ao botão de fechar
        msgElement.querySelector('button').addEventListener('click', () => msgElement.remove());
        
        // Adicionar ao início do container
        container.insertBefore(msgElement, container.firstChild);
        
        // Auto-remover após duração especificada
        if (duration > 0) {
            setTimeout(() => {
                if (msgElement.parentNode) {
                    msgElement.style.opacity = '0';
                    msgElement.style.transition = 'opacity 0.3s';
                    
                    setTimeout(() => msgElement.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Carrega configurações existentes do localStorage
     */
    function loadSavedConfigurations() {
        try {
            const storedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            
            // Adicionar à lista de hosts configurados
            Object.keys(storedConfigs).forEach(hostname => {
                STATE.configuredHosts.add(hostname);
                console.log(`[Ansible Multi-Host] Configuração carregada para ${hostname}`);
            });
            
            console.log(`[Ansible Multi-Host] ${STATE.configuredHosts.size} configuração(ões) carregada(s)`);
        } catch (e) {
            console.error(`[Ansible Multi-Host] Erro ao carregar configurações: ${e.message}`);
        }
    }

    /**
     * Encontra o elemento DOM de um host pelo nome
     * @param {string} hostname - Nome do host
     * @return {HTMLElement} Elemento do host
     */
    function findHostElement(hostname) {
        const hostsContainer = document.querySelector(CONFIG.selectors.hostsContainer);
        if (!hostsContainer) return null;
        
        // Método 1: tentar encontrar pelo input com data-hostname
        const input = hostsContainer.querySelector(`input[data-hostname="${hostname}"]`);
        if (input) {
            return input.closest('.host-banner');
        }
        
        // Método 2: tentar encontrar pelo conteúdo de texto
        const allHostElements = hostsContainer.querySelectorAll('.host-banner');
        for (const el of allHostElements) {
            const header = el.querySelector('h4');
            if (header && header.textContent.trim() === hostname) {
                return el;
            }
        }
        
        console.error(`[Ansible Multi-Host] Host não encontrado: ${hostname}`);
        return null;
    }

    /**
     * Recupera a configuração de um host
     * @param {string} hostname - Nome do host
     * @return {Object|null} Configuração do host ou null se não encontrada
     */
    function getHostConfig(hostname) {
        try {
            const storedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            return storedConfigs[hostname] || null;
        } catch (e) {
            console.error(`[Ansible Multi-Host] Erro ao recuperar configuração: ${e.message}`);
            return null;
        }
    }

    /**
     * Salva a configuração de hosts no localStorage
     * @param {string} hostname - Nome do host
     * @param {Object} config - Configuração do host
     */
    function saveHostConfig(hostname, config) {
        try {
            const storedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            storedConfigs[hostname] = config;
            localStorage.setItem('baseline_configs', JSON.stringify(storedConfigs));
            STATE.configuredHosts.add(hostname);
            console.log(`[Ansible Multi-Host] Configuração salva para ${hostname}`, config);
        } catch (e) {
            console.error(`[Ansible Multi-Host] Erro ao salvar configuração: ${e.message}`);
        }
    }

    /**
     * Verifica se alguma playbook de baseline está selecionada
     * @return {boolean} Verdadeiro se alguma playbook de baseline estiver selecionada
     */
    function isAnyBaselineSelected() {
        const selectedPlaybooks = document.querySelectorAll('.playbook-item.selected');
        
        for (const playbook of selectedPlaybooks) {
            const playbookName = playbook.getAttribute('data-playbook-name');
            if (playbookName && isBaselinePlaybook(playbookName)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Adiciona emblemas de baseline aos hosts quando a playbook de baseline estiver selecionada
     */
    function refreshBaselineBadges() {
        // Verificar se alguma playbook de baseline está selecionada
        const selectedBaseline = isAnyBaselineSelected();
        if (!selectedBaseline) {
            // Remover emblemas existentes
            document.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
            return;
        }
        
        console.log("[Ansible Multi-Host] Adicionando emblemas de baseline a hosts selecionados");
        
        // Encontrar hosts selecionados
        const selectedHosts = document.querySelectorAll('.host-banner.selected');
        
        selectedHosts.forEach(hostElement => {
            // Obter hostname
            const input = hostElement.querySelector('input[type="checkbox"]');
            if (!input) return;
            
            const hostname = input.getAttribute('data-hostname');
            if (!hostname) return;
            
            // Verificar se já tem emblema
            if (hostElement.querySelector('.baseline-badge')) return;
            
            // Verificar estado da configuração
            const config = getHostConfig(hostname);
            let badgeClass = 'baseline-badge';
            let badgeText = '';
            
            // Determinar classe e texto com base no estado
            if (!config) {
                // Não configurado - vermelho
                badgeClass += ' required';
                badgeText = 'Baseline Required';
            } else if (!config.parceiroPassword || config.parceiroPassword.length < CONFIG.minPasswordLength || 
                       !config.rootPassword || config.rootPassword.length < CONFIG.minPasswordLength) {
                // Configuração incompleta - amarelo
                badgeClass += ' configuring';
                badgeText = 'Baseline Incompleto';
            } else {
                // Configuração completa - verde
                badgeClass += ' configured';
                badgeText = 'Baseline Ready';
            }
            
            // Criar emblema
            const badge = document.createElement('div');
            badge.className = badgeClass;
            badge.textContent = badgeText;
            badge.setAttribute('data-hostname', hostname);
            
            // Adicionar estilo inline para garantir as cores corretas
            if (badgeClass.includes('required')) {
                badge.style.backgroundColor = CONFIG.styles.errorColor;
                badge.style.color = 'white';
                badge.style.animation = 'pulse 1s infinite';
            } else if (badgeClass.includes('configuring')) {
                badge.style.backgroundColor = CONFIG.styles.warningColor;
                badge.style.color = 'black';
            } else if (badgeClass.includes('configured')) {
                badge.style.backgroundColor = CONFIG.styles.successColor;
                badge.style.color = 'white';
            }
            
          // Adicionar evento de clique para abrir o modal de configuração
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfigModal(hostname);
        });
        
        hostElement.appendChild(badge);
    });
}

/**
 * Valida se todos os hosts selecionados estão configurados para baseline
 * @return {boolean} Verdadeiro se todos os hosts estão configurados
 */
function validateHostsConfiguration() {
    // Verificar se alguma playbook de baseline está selecionada
    if (!isAnyBaselineSelected()) return true;
    
    console.log("[Ansible Multi-Host] Validando configuração de hosts para baseline");
    
    // Listar hosts selecionados
    const selectedHosts = [];
    document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
        const input = hostElement.querySelector('input[type="checkbox"]');
        if (input) {
            const hostname = input.getAttribute('data-hostname');
            if (hostname) selectedHosts.push(hostname);
        }
    });
    
    console.log(`[Ansible Multi-Host] Hosts selecionados: ${selectedHosts.join(', ')}`);
    
    // Verificar se todos os hosts selecionados estão configurados
    const unconfiguredHosts = [];
    
    for (const hostname of selectedHosts) {
        const config = getHostConfig(hostname);
        // Verificar se tem configuração e se as senhas são válidas
        if (!config || 
            !config.parceiroPassword || 
            config.parceiroPassword.length < CONFIG.minPasswordLength || 
            !config.rootPassword || 
            config.rootPassword.length < CONFIG.minPasswordLength) {
            
            unconfiguredHosts.push(hostname);
        }
    }
    
    if (unconfiguredHosts.length > 0) {
        console.warn(`[Ansible Multi-Host] Hosts não configurados: ${unconfiguredHosts.join(', ')}`);
        
        // Exibir mensagem
        showMessage(
            `É necessário configurar ${unconfiguredHosts.length > 1 ? 'os hosts' : 'o host'} ${unconfiguredHosts.join(', ')} antes de executar o baseline`,
            'warning'
        );
        
        // Se for apenas um host, exibir modal para esse host
        if (unconfiguredHosts.length === 1) {
            showConfigModal(unconfiguredHosts[0]);
        } else {
            // Se forem múltiplos hosts, exibir modal multi-host
            showMultiHostModal(unconfiguredHosts);
        }
        
        return false;
    }
    
    console.log("[Ansible Multi-Host] Todos os hosts estão configurados corretamente");
    return true;
}

/**
 * Cria e exibe um modal para configuração de um único host
 * @param {string} hostname - Nome do host
 */
function showConfigModal(hostname) {
    console.log(`[Ansible Multi-Host] Exibindo modal de configuração para ${hostname}`);
    
    // Verificar se já existe um modal ativo
    if (STATE.modalActive) {
        console.log("[Ansible Multi-Host] Modal já está ativo, ignorando solicitação");
        return;
    }
    
    STATE.modalActive = true;
    
    // Carregar configuração existente
    const config = getHostConfig(hostname) || {};
    
    // Gerar senhas padrão e hostname se necessário
    const defaultHostname = config.hostname || generateDefaultHostname(hostname);
    const defaultParceiroPassword = config.parceiroPassword || generatePassword();
    const defaultRootPassword = config.rootPassword || generatePassword();
    
    // Criar estrutura do modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'baseline-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'baseline-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Configuração de Baseline para ${hostname}</h3>
            <button class="modal-close" data-action="cancel">✕</button>
        </div>
        <div class="modal-content">
            <div class="baseline-modal-grid">
                <div class="form-group full-width">
                    <label for="modal-hostname-${hostname}">Hostname</label>
                    <input type="text" id="modal-hostname-${hostname}" value="${defaultHostname}" class="form-control">
                </div>
                <div class="form-group">
                    <label for="modal-parceiro-${hostname}">Senha do Parceiro</label>
                    <div class="password-group">
                        <input type="password" id="modal-parceiro-${hostname}" value="${defaultParceiroPassword}" class="form-control">
                        <button class="toggle-password" data-target="modal-parceiro-${hostname}">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="modal-root-${hostname}">Senha do Root</label>
                    <div class="password-group">
                        <input type="password" id="modal-root-${hostname}" value="${defaultRootPassword}" class="form-control">
                        <button class="toggle-password" data-target="modal-root-${hostname}">👁</button>
                    </div>
                </div>
            </div>
            <div class="modal-status"></div>
            <div class="modal-actions">
                <button class="generate-passwords" data-action="generate">Gerar Senhas</button>
                <button class="primary-btn" data-action="save">Salvar Configuração</button>
            </div>
        </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Configurar eventos para o modal
    const statusEl = modal.querySelector('.modal-status');
    
    // Botão de fechar
    modal.querySelector('.modal-close').addEventListener('click', () => {
        // Exibir confirmação se for uma configuração não salva
        if (isUnconfiguredHost(hostname)) {
            if (!confirm('Você não salvou a configuração deste host. Tem certeza que deseja fechar?')) {
                return;
            }
        }
        closeModal();
    });
    
    // Botão de gerar senhas
    modal.querySelector('.generate-passwords').addEventListener('click', () => {
        const parceiroInput = modal.querySelector(`#modal-parceiro-${hostname}`);
        const rootInput = modal.querySelector(`#modal-root-${hostname}`);
        
        parceiroInput.value = generatePassword();
        rootInput.value = generatePassword();
        
        // Mostrar brevemente uma mensagem
        statusEl.textContent = 'Senhas geradas automaticamente';
        statusEl.style.color = CONFIG.styles.successColor;
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
    });
    
    // Botão de salvar configuração
    modal.querySelector('.primary-btn').addEventListener('click', () => {
        const newHostname = modal.querySelector(`#modal-hostname-${hostname}`).value.trim();
        const parceiroPassword = modal.querySelector(`#modal-parceiro-${hostname}`).value.trim();
        const rootPassword = modal.querySelector(`#modal-root-${hostname}`).value.trim();
        
        // Validar entradas
        if (!newHostname) {
            statusEl.textContent = 'Erro: O hostname é obrigatório';
            statusEl.style.color = CONFIG.styles.errorColor;
            return;
        }
        
        if (!parceiroPassword || parceiroPassword.length < CONFIG.minPasswordLength) {
            statusEl.textContent = `Erro: A senha do parceiro deve ter pelo menos ${CONFIG.minPasswordLength} caracteres`;
            statusEl.style.color = CONFIG.styles.errorColor;
            return;
        }
        
        if (!rootPassword || rootPassword.length < CONFIG.minPasswordLength) {
            statusEl.textContent = `Erro: A senha do root deve ter pelo menos ${CONFIG.minPasswordLength} caracteres`;
            statusEl.style.color = CONFIG.styles.errorColor;
            return;
        }
        
        // Salvar configuração
        const configObject = {
            hostname: newHostname,
            parceiroPassword,
            rootPassword,
            timestamp: Date.now()
        };
        
        saveHostConfig(hostname, configObject);
        
        // Atualizar interface
        refreshBaselineBadges();
        
        // Adicionar emblema ao host
        const hostElement = findHostElement(hostname);
        if (hostElement) {
            if (!hostElement.querySelector('.host-config-badge')) {
                const badge = document.createElement('div');
                badge.className = 'host-config-badge';
                badge.textContent = '✓';
                badge.title = 'Host configurado para baseline';
                hostElement.appendChild(badge);
            }
            
            // Remover ícone de baseline requerido se existir
            const baselineBadge = hostElement.querySelector('.baseline-badge.required');
            if (baselineBadge) {
                baselineBadge.remove();
            }
        }
        
        // Fechar modal com mensagem de sucesso
        showMessage(`Configuração de baseline salva com sucesso para ${hostname}`, 'success');
        closeModal();
    });
    
    // Botões de toggle de senha
    modal.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🔒';
            } else {
                input.type = 'password';
                btn.textContent = '👁';
            }
        });
    });
    
    // Bloquear fechamento com ESC e clicks fora do modal
    const handleEsc = (e) => {
        if (e.key === 'Escape' && isUnconfiguredHost(hostname)) {
            e.preventDefault();
            showMessage('Você precisa salvar a configuração do host antes de prosseguir', 'warning');
        } else if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    document.addEventListener('keydown', handleEsc);
    
    // Adicionar evento para click no overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay && isUnconfiguredHost(hostname)) {
            showMessage('Você precisa salvar a configuração do host antes de prosseguir', 'warning');
        } else if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Focar no primeiro campo para melhor UX
    setTimeout(() => {
        modal.querySelector(`#modal-hostname-${hostname}`).focus();
    }, 100);
    
    // Função para verificar se o host não está configurado
    function isUnconfiguredHost(hostname) {
        // Verificar se o modal foi aberto para configuração obrigatória
        const config = getHostConfig(hostname);
        return !config || 
               !config.parceiroPassword || 
               config.parceiroPassword.length < CONFIG.minPasswordLength || 
               !config.rootPassword || 
               config.rootPassword.length < CONFIG.minPasswordLength;
    }
    
    // Função para fechar o modal
    function closeModal() {
        document.removeEventListener('keydown', handleEsc);
        modalOverlay.remove();
        STATE.modalActive = false;
    }
}

/**
 * Cria e exibe um modal para configuração de múltiplos hosts
 * @param {Array<string>} hostnames - Lista de hostnames
 */
function showMultiHostModal(hostnames) {
    console.log(`[Ansible Multi-Host] Exibindo modal para múltiplos hosts: ${hostnames.join(', ')}`);
    
    // Verificar se já existe um modal ativo
    if (STATE.modalActive) {
        console.log("[Ansible Multi-Host] Modal já está ativo, ignorando solicitação");
        return;
    }
    
    STATE.modalActive = true;
    
    // Criar estrutura do modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'baseline-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'baseline-modal';
    
    // Construir HTML para a lista de hosts
    let hostsHtml = '';
    hostnames.forEach((hostname, index) => {
        const config = getHostConfig(hostname) || {};
        
        // Definir status do host
        let statusClass = config && config.parceiroPassword && config.rootPassword ? 'configured' : 'pending';
        
        hostsHtml += `
            <div class="host-multi-badge ${statusClass}" data-hostname="${hostname}">
                ${hostname}
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Configuração de Baseline para Múltiplos Hosts</h3>
            <button class="modal-close" data-action="cancel">✕</button>
        </div>
        <div class="modal-content">
            <div class="baseline-modal-grid">
                <div class="form-group full-width">
                    <label>Hosts selecionados</label>
                    <div style="padding: 8px; background: #222; border-radius: 4px; min-height: 30px;">
                        ${hostsHtml}
                    </div>
                </div>
                <div class="form-group">
                    <label for="modal-parceiro-multi">Senha do Parceiro (para todos)</label>
                    <div class="password-group">
                        <input type="password" id="modal-parceiro-multi" class="form-control">
                        <button class="toggle-password" data-target="modal-parceiro-multi">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="modal-root-multi">Senha do Root (para todos)</label>
                    <div class="password-group">
                        <input type="password" id="modal-root-multi" class="form-control">
                        <button class="toggle-password" data-target="modal-root-multi">👁</button>
                    </div>
                </div>
            </div>
            <div class="modal-status"></div>
            <div class="modal-actions">
                <button class="generate-passwords" data-action="generate">Gerar Senhas</button>
                <button class="primary-btn" data-action="save">Configurar Todos os Hosts</button>
            </div>
        </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Configurar eventos para o modal
    const statusEl = modal.querySelector('.modal-status');
    
    // Botão de fechar
    modal.querySelector('.modal-close').addEventListener('click', () => {
        // Verificar se existem hosts não configurados
        const unconfiguredHosts = hostnames.filter(isUnconfiguredHost);
        if (unconfiguredHosts.length > 0) {
            if (!confirm(`Você não completou a configuração de ${unconfiguredHosts.length} hosts. Tem certeza que deseja fechar?`)) {
                return;
            }
        }
        closeModal();
    });
    
    // Botão de gerar senhas
    modal.querySelector('.generate-passwords').addEventListener('click', () => {
        const parceiroInput = modal.querySelector('#modal-parceiro-multi');
        const rootInput = modal.querySelector('#modal-root-multi');
        
        parceiroInput.value = generatePassword();
        rootInput.value = generatePassword();
        
        // Mostrar brevemente uma mensagem
        statusEl.textContent = 'Senhas geradas automaticamente';
        statusEl.style.color = CONFIG.styles.successColor;
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
    });
    
    // Botão de salvar configuração
    modal.querySelector('.primary-btn').addEventListener('click', () => {
        const parceiroPassword = modal.querySelector('#modal-parceiro-multi').value.trim();
        const rootPassword = modal.querySelector('#modal-root-multi').value.trim();
        
        // Validar entradas
        if (!parceiroPassword || parceiroPassword.length < CONFIG.minPasswordLength) {
            statusEl.textContent = `Erro: A senha do parceiro deve ter pelo menos ${CONFIG.minPasswordLength} caracteres`;
            statusEl.style.color = CONFIG.styles.errorColor;
            return;
        }
        
        if (!rootPassword || rootPassword.length < CONFIG.minPasswordLength) {
            statusEl.textContent = `Erro: A senha do root deve ter pelo menos ${CONFIG.minPasswordLength} caracteres`;
            statusEl.style.color = CONFIG.styles.errorColor;
            return;
        }
        
        // Configurar todos os hosts
        let configuredCount = 0;
        
        hostnames.forEach(hostname => {
            // Verificar se o host já tem configuração para preservar seu hostname
            const existingConfig = getHostConfig(hostname) || {};
            const newHostname = existingConfig.hostname || generateDefaultHostname(hostname);
            
            // Salvar configuração
            const configObject = {
                hostname: newHostname,
                parceiroPassword,
                rootPassword,
                timestamp: Date.now()
            };
            
            saveHostConfig(hostname, configObject);
            configuredCount++;
            
            // Adicionar emblema ao host
            const hostElement = findHostElement(hostname);
            if (hostElement) {
                if (!hostElement.querySelector('.host-config-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'host-config-badge';
                    badge.textContent = '✓';
                    badge.title = 'Host configurado para baseline';
                    hostElement.appendChild(badge);
                }
                
                // Remover ícone de baseline requerido se existir
                const baselineBadge = hostElement.querySelector('.baseline-badge.required');
                if (baselineBadge) {
                    baselineBadge.remove();
                }
            }
        });
        
        // Atualizar interface
        refreshBaselineBadges();
        
        // Fechar modal com mensagem de sucesso
        showMessage(`Configuração de baseline aplicada para ${configuredCount} hosts`, 'success');
        closeModal();
    });
    
    // Adicionar evento para configurar um host individualmente
    const hostBadges = modal.querySelectorAll('.host-multi-badge');
    hostBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            const hostname = badge.getAttribute('data-hostname');
            closeModal();
            setTimeout(() => {
                showConfigModal(hostname);
            }, 100);
        });
    });
    
    // Botões de toggle de senha
    modal.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🔒';
            } else {
                input.type = 'password';
                btn.textContent = '👁';
            }
        });
    });
    
    // Bloquear fechamento com ESC e clicks fora do modal se houver hosts não configurados
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            // Verificar se existem hosts não configurados
            const unconfiguredHosts = hostnames.filter(isUnconfiguredHost);
            if (unconfiguredHosts.length > 0) {
                e.preventDefault();
                showMessage('Você precisa configurar os hosts antes de prosseguir', 'warning');
            } else {
                closeModal();
            }
        }
    };
    
    document.addEventListener('keydown', handleEsc);
    
    // Adicionar evento para click no overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            // Verificar se existem hosts não configurados
            const unconfiguredHosts = hostnames.filter(isUnconfiguredHost);
            if (unconfiguredHosts.length > 0) {
                showMessage('Você precisa configurar os hosts antes de prosseguir', 'warning');
            } else {
                closeModal();
            }
        }
    });
    
    // Preencher automaticamente com senhas aleatórias
    setTimeout(() => {
        modal.querySelector('#modal-parceiro-multi').value = generatePassword();
        modal.querySelector('#modal-root-multi').value = generatePassword();
    }, 100);
    
    // Função para verificar se o host não está configurado
    function isUnconfiguredHost(hostname) {
        const config = getHostConfig(hostname);
        return !config || 
               !config.parceiroPassword || 
               config.parceiroPassword.length < CONFIG.minPasswordLength || 
               !config.rootPassword || 
               config.rootPassword.length < CONFIG.minPasswordLength;
    }
    
    // Função para fechar o modal
    function closeModal() {
        document.removeEventListener('keydown', handleEsc);
        modalOverlay.remove();
        STATE.modalActive = false;
    }
}

/**
 * Verifica se card é de execução multi-host
 * @param {HTMLElement} card - Elemento do card
 * @return {boolean} Verdadeiro se for multi-host
 */
function isMultiHostCard(card) {
    // Verificar os hosts no card
    const hostDetails = card.querySelectorAll('.host-details');
    return hostDetails.length > 1;
}

/**
 * Cria ou encontra a barra de progresso em um card
 * @param {HTMLElement} card - Elemento do card
 * @return {HTMLElement} Elemento da barra de progresso
 */
function ensureProgressBar(card) {
    // Verificar se já existe uma barra de progresso
    let progressBar = card.querySelector('.progress-bar');
    if (progressBar) return progressBar;
    
    // Criar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    // Criar barra
    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    progressContainer.appendChild(progressBar);
    
    // Inserir antes do output
    const outputDiv = card.querySelector('.ansible-output');
    if (outputDiv) {
        card.insertBefore(progressContainer, outputDiv);
    } else {
        // Ou após o host-info
        const hostInfo = card.querySelector('.host-info');
        if (hostInfo) {
            card.insertBefore(progressContainer, hostInfo.nextSibling);
        } else {
            // Último recurso: adicionar ao fim
            card.appendChild(progressContainer);
        }
    }
    
    return progressBar;
}

/**
 * Atualiza o progresso visual de um card
 * @param {string} jobId - ID do job
 * @param {number} progress - Valor do progresso (0-100)
 * @param {string} status - Status do job
 */
function updateCardProgress(jobId, progress, status) {
    // Encontrar o card com este job ID
    const card = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
    if (!card) return;
    
    // Encontrar ou criar a barra de progresso
    const progressBar = ensureProgressBar(card);
    if (!progressBar) return;
    
    // Nunca retroceder o progresso
    let currentProgress = STATE.progressState.get(jobId) || 0;
    progress = Math.max(currentProgress, progress);
    
    // Atualizar estado
    STATE.progressState.set(jobId, progress);
    
    // Atualizar a barra de progresso
    progressBar.style.width = `${progress}%`;
    
    // Atualizar cor com base no status
    if (status === 'completed' || status === 'success') {
        progressBar.style.backgroundColor = CONFIG.styles.successColor;
    } else if (status === 'failed') {
        progressBar.style.backgroundColor = CONFIG.styles.errorColor;
    } else if (status === 'cancelled') {
        progressBar.style.backgroundColor = CONFIG.styles.warningColor;
    } else {
        progressBar.style.backgroundColor = CONFIG.styles.buttonColor;
    }
    
    // Atualizar status do card se necessário
    const statusElement = card.querySelector('.task-status');
    if (statusElement) {
        if (status === 'completed' || status === 'success') {
            statusElement.textContent = 'Concluído com sucesso';
            statusElement.className = 'task-status success';
        } else if (status === 'failed') {
            statusElement.textContent = 'Falhou';
            statusElement.className = 'task-status failed';
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelado';
            statusElement.className = 'task-status cancelled';
        }
    }
}

/**
 * Atualiza o progresso de um job master com base nos jobs individuais
 * @param {string} masterJobId - ID do job master
 */
function updateMasterJobProgress(masterJobId) {
    const individualJobs = STATE.individualJobs.get(masterJobId) || [];
    if (individualJobs.length === 0) return;
    
    let totalProgress = 0;
    let completed = 0;
    let failed = 0;
    
    // Calcular progresso total e status
    for (const job of individualJobs) {
        const cachedData = STATE.outputCache.get(job.jobId);
        if (cachedData) {
            totalProgress += cachedData.status === 'running' ? 
                Math.min(90, cachedData.progress || 0) : 100;
            
            if (cachedData.status === 'completed' || cachedData.status === 'success') {
                completed++;
            } else if (cachedData.status === 'failed') {
                failed++;
            }
        } else {
            // Se não temos dados, assumir um progresso mínimo
            totalProgress += 10;
        }
    }
    
    // Calcular progresso médio
    const avgProgress = totalProgress / individualJobs.length;
    
    // Determinar status geral
    let overallStatus = 'running';
    if (completed === individualJobs.length) {
        overallStatus = 'completed';
    } else if (failed > 0) {
        overallStatus = 'failed';
    }
    
    // Atualizar o progresso do card master
    updateCardProgress(masterJobId, avgProgress, overallStatus);
}

/**
 * Intercepta a execução de playbooks para validar configurações
 */
function interceptPlaybookExecution() {
    console.log("[Ansible Multi-Host] Interceptando função de execução de playbooks");
    
    if (typeof window.executeSelectedPlaybooks === 'function' && 
        typeof STATE.originalFunctions.executeSelectedPlaybooks === 'function') {
        
        window.executeSelectedPlaybooks = function() {
            console.log("[Ansible Multi-Host] Função de execução interceptada");
            
            // Verificar se estamos tentando executar uma playbook de baseline
            if (isAnyBaselineSelected()) {
                console.log("[Ansible Multi-Host] Baseline detectado, validando configurações");
                
                // Validar que todos os hosts estão configurados
                if (!validateHostsConfiguration()) {
                    console.warn("[Ansible Multi-Host] Execução bloqueada: hosts não configurados");
                    return; // Bloquear execução completamente
                }
            }
            
            // Interceptar o fetch para verificar novamente antes da execução
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url === '/api/run' && options?.method === 'POST') {
                    try {
                        const data = JSON.parse(options.body);
                        const playbookPath = data.playbook;
                        
                        // Segunda verificação para baseline
                        if (playbookPath && isBaselinePlaybook(playbookPath) && data.hosts) {
                            console.log(`[Ansible Multi-Host] Verificando configurações para execução de baseline: ${data.hosts.join(', ')}`);
                            
                            // Verificar cada host novamente
                            const unconfiguredHosts = [];
                            for (const hostname of data.hosts) {
                                const config = getHostConfig(hostname);
                                if (!config || 
                                    !config.parceiroPassword || 
                                    config.parceiroPassword.length < CONFIG.minPasswordLength || 
                                    !config.rootPassword || 
                                    config.rootPassword.length < CONFIG.minPasswordLength) {
                                    unconfiguredHosts.push(hostname);
                                }
                            }
                            
                            // Se algum host não estiver configurado, bloquear execução
                            if (unconfiguredHosts.length > 0) {
                                console.warn(`[Ansible Multi-Host] Hosts não configurados em verificação final: ${unconfiguredHosts.join(', ')}`);
                                
                                // Mostrar modal para configurar
                                if (unconfiguredHosts.length === 1) {
                                    showConfigModal(unconfiguredHosts[0]);
                                } else {
                                    showMultiHostModal(unconfiguredHosts);
                                }
                                
                                return new Promise(() => {}); // Bloquear fetch
                            }
                            
                            // Para múltiplos hosts, usar abordagem sequencial
                            if (data.hosts.length > 1) {
                                console.log(`[Ansible Multi-Host] Múltiplos hosts (${data.hosts.length}), executando sequencialmente`);
                                executeHostsSequentially(data.hosts, playbookPath);
                                return new Promise(() => {}); // Bloquear fetch original
                            } 
                            // Para um único host, adicionar variáveis extras
                            else if (data.hosts.length === 1) {
                                const hostname = data.hosts[0];
                                const config = getHostConfig(hostname);
                                
                               // Adicionar variáveis extras
                               if (!data.extra_vars) data.extra_vars = {};
                               data.extra_vars.new_hostname = config.hostname;
                               data.extra_vars.parceiro_password = config.parceiroPassword;
                               data.extra_vars.root_password = config.rootPassword;
                               data.extra_vars.user_password = config.parceiroPassword;
                               data.extra_vars.admin_password = config.rootPassword;
                               
                               // Atualizar corpo da requisição
                               options.body = JSON.stringify(data);
                           }
                       }
                   } catch (error) {
                       console.error(`[Ansible Multi-Host] Erro ao manipular requisição: ${error.message}`);
                   }
               }
               
               // Executar fetch original se chegou até aqui
               return originalFetch.apply(this, arguments);
           };
           
           // Chamar função original
           STATE.originalFunctions.executeSelectedPlaybooks.apply(this, arguments);
           
           // Restaurar fetch original após um tempo
           setTimeout(() => {
               window.fetch = originalFetch;
           }, 2000);
       };
       
       console.log("[Ansible Multi-Host] Função de execução substituída com sucesso");
   }
   
   // Substituir a função createExecutionCard
   if (typeof window.createExecutionCard === 'function' && 
       typeof STATE.originalFunctions.createExecutionCard === 'function') {
       
       window.createExecutionCard = function(playbookName, hosts, jobId) {
           // Verificar se é um playbook de baseline e bloquear criação do card se necessário
           if (isBaselinePlaybook(playbookName)) {
               const unconfiguredHosts = [];
               Array.from(hosts).forEach(hostname => {
                   const config = getHostConfig(hostname);
                   if (!config || 
                       !config.parceiroPassword || 
                       config.parceiroPassword.length < CONFIG.minPasswordLength || 
                       !config.rootPassword || 
                       config.rootPassword.length < CONFIG.minPasswordLength) {
                       unconfiguredHosts.push(hostname);
                   }
               });
               
               if (unconfiguredHosts.length > 0) {
                   console.warn(`[Ansible Multi-Host] Bloqueando criação do card para ${playbookName}: hosts não configurados`);
                   
                   // Mostrar modal para configurar
                   if (unconfiguredHosts.length === 1) {
                       showConfigModal(unconfiguredHosts[0]);
                   } else {
                       showMultiHostModal(unconfiguredHosts);
                   }
                   
                   // Retornar um card invisível para não quebrar o fluxo
                   const dummyCard = document.createElement('div');
                   dummyCard.style.display = 'none';
                   return dummyCard;
               }
           }
           
           // Se chegou aqui, cria o card normalmente
           const card = STATE.originalFunctions.createExecutionCard.apply(this, arguments);
           
           // Adicionar barra de progresso
           initializeProgress(card, jobId);
           
           return card;
       };
       
       console.log("[Ansible Multi-Host] Função de criação de cards substituída com sucesso");
   }
}

/**
* Inicializa o progresso para um card
* @param {HTMLElement} card - Elemento do card
* @param {string} jobId - ID do job
*/
function initializeProgress(card, jobId) {
   // Garantir que tem uma barra de progresso
   const progressBar = ensureProgressBar(card);
   if (!progressBar) return;
   
   // Iniciar com um progresso mínimo para mostrar atividade
   progressBar.style.width = '5%';
   STATE.progressState.set(jobId, 5);
   
   // Verificar se é um card multi-host
   if (isMultiHostCard(card)) {
       // Capturar hosts deste card
       const hosts = Array.from(card.querySelectorAll('.host-details'))
           .map(hostDetail => hostDetail.getAttribute('data-host'))
           .filter(Boolean);
       
       console.log(`[Ansible Multi-Host] Hosts no card ${jobId}: ${hosts.join(', ')}`);
       
       // Registrar no mapa de hosts
       STATE.masterHostsMap.set(jobId, hosts);
   }
}

/**
* Executa hosts sequencialmente para baseline
* @param {Array<string>} hosts - Lista de hostnames
* @param {string} playbookPath - Caminho da playbook
*/
function executeHostsSequentially(hosts, playbookPath) {
   if (!hosts || hosts.length === 0) {
       console.log("[Ansible Multi-Host] Todos os hosts foram processados");
       return;
   }
   
   const hostname = hosts.shift(); // Remove e retorna o primeiro host
   console.log(`[Ansible Multi-Host] Processando host: ${hostname}`);
   
   // Recuperar configuração do host
   const config = getHostConfig(hostname);
   if (!config) {
       console.error(`[Ansible Multi-Host] Configuração não encontrada para ${hostname}`);
       showMessage(`Erro: Configuração não encontrada para ${hostname}`, 'error');
       
       // Continuar com o próximo host
       setTimeout(() => executeHostsSequentially(hosts, playbookPath), 500);
       return;
   }
   
   // Preparar payload para execução
   const payload = {
       playbook: playbookPath,
       hosts: [hostname],
       extra_vars: {
           new_hostname: config.hostname,
           parceiro_password: config.parceiroPassword,
           root_password: config.rootPassword,
           user_password: config.parceiroPassword, // Para Windows
           admin_password: config.rootPassword, // Para Windows
           single_host_execution: true, // Marcador para rastreamento
           host_specific: hostname // Identificar para qual host é este job
       }
   };
   
   console.log(`[Ansible Multi-Host] Executando baseline para ${hostname} com configuração:`);
   console.log(`   - Hostname: ${config.hostname}`);
   console.log(`   - Senhas definidas: ${config.parceiroPassword.length} e ${config.rootPassword.length} caracteres`);
   
   fetch('/api/run', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
   })
   .then(response => response.json())
   .then(result => {
       console.log(`[Ansible Multi-Host] Baseline iniciado para ${hostname}, Job ID: ${result.job_id}`);
       showMessage(`Baseline iniciado para ${hostname}`, 'success');
       
       // Mapear o job para este hostname específico
       STATE.jobHostMap.set(result.job_id, hostname);
       
       // Rastrear para relatório consolidado
       STATE.jobCreationStack.push({
           jobId: result.job_id,
           playbookName: playbookPath.split('/').pop(),
           hosts: [hostname],
           timestamp: Date.now(),
           isSingleHost: true,
           extras: payload.extra_vars
       });
       
       // Adicionar pequeno atraso antes de continuar com o próximo host
       setTimeout(() => executeHostsSequentially(hosts, playbookPath), 1000);
   })
   .catch(error => {
       console.error(`[Ansible Multi-Host] Erro ao executar baseline para ${hostname}: ${error.message}`);
       showMessage(`Erro ao executar baseline para ${hostname}: ${error.message}`, 'error');
       
       // Continuar com o próximo host
       setTimeout(() => executeHostsSequentially(hosts, playbookPath), 1000);
   });
}

/**
* Formata a saída para exibição
* @param {string} output - Saída do Ansible
* @param {boolean} isBaseline - Indica se é uma saída de baseline
* @return {string} HTML formatado
*/
function formatOutput(output, isBaseline = false) {
   if (!output) return '<em>Aguardando saída...</em>';
   
   // Formatar saída com cores e estrutura
   let formatted = output
       .replace(/PLAY\s*\[(.*?)\]/g, '<div class="ansible-play-header">PLAY [$1]</div>')
       .replace(/TASK\s*\[(.*?)\]/g, '<div class="ansible-task-header">TASK [$1]</div>')
       .replace(/ok:/g, '<span class="ansible-ok">ok:</span>')
       .replace(/changed:/g, '<span class="ansible-changed">changed:</span>')
       .replace(/failed:/g, '<span class="ansible-failed">failed:</span>')
       .replace(/skipping:/g, '<span class="ansible-skipped">skipping:</span>')
       .replace(/unreachable:/g, '<span class="ansible-unreachable">unreachable:</span>')
       .replace(/PLAY RECAP/g, '<div class="ansible-recap-header">PLAY RECAP</div>');
   
   // Substituir seções de host por divs formatados
   formatted = formatted.replace(/==== HOST[^:]*: ([^=]+)( \(Job: ([^)]+)\))? ====/g, 
       '<div class="host-section-divider"><span class="host-label">$1</span><span class="host-job">$3</span></div>');
   
   // Adicionar classe para formatação
   formatted = `<div class="ansible-formatted-output">${formatted}</div>`;
   
   return formatted;
}

/**
* Observa o DOM para detectar novos cards
*/
function observeNewCards() {
   console.log("[Ansible Multi-Host] Configurando observador para novos cards");
   
   // Observar o DOM para detectar novos cards
   const observer = new MutationObserver((mutations) => {
       mutations.forEach((mutation) => {
           if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
               mutation.addedNodes.forEach((node) => {
                   if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                       const jobId = node.getAttribute('data-job-id');
                       const playbookName = node.getAttribute('data-playbook-name') || '';
                       
                       console.log(`[Ansible Multi-Host] Novo card detectado: ${jobId} (${playbookName})`);
                       
                       // Iniciar progresso para este card
                       initializeProgress(node, jobId);
                   }
               });
           }
       });
   });
   
   // Iniciar observação
   observer.observe(document.body, {
       childList: true,
       subtree: true
   });
   
   console.log("[Ansible Multi-Host] Observador de novos cards configurado");
}

/**
* Obtém os hosts selecionados
* @return {Array<string>} Lista de hostnames selecionados
*/
function getSelectedHosts() {
   const selectedHosts = [];
   document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
       const input = hostElement.querySelector('input[type="checkbox"]');
       if (input) {
           const hostname = input.getAttribute('data-hostname');
           if (hostname) selectedHosts.push(hostname);
       }
   });
   return selectedHosts;
}

/**
* Configura observadores para detectar mudanças relevantes no DOM
*/
function setupObservers() {
   console.log("[Ansible Multi-Host] Configurando observadores de DOM");
   
   // Observar seleção de playbooks
   const playbooksContainer = document.querySelector(CONFIG.selectors.playbooksContainer);
   if (playbooksContainer) {
       const playbookObserver = new MutationObserver(mutations => {
           // Verificar se houve mudança em classes (seleção/desseleção)
           let selectionChanged = false;
           
           mutations.forEach(mutation => {
               if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                   if (mutation.target.classList.contains('playbook-item')) {
                       selectionChanged = true;
                   }
               }
           });
           
           if (selectionChanged) {
               console.log("[Ansible Multi-Host] Seleção de playbooks alterada");
               refreshBaselineBadges();
           }
       });
       
       playbookObserver.observe(playbooksContainer, { 
           subtree: true, 
           attributes: true, 
           attributeFilter: ['class'] 
       });
       
       console.log("[Ansible Multi-Host] Observador de seleção de playbooks configurado");
   }
   
   // Observar seleção de hosts
   const hostsContainer = document.querySelector(CONFIG.selectors.hostsContainer);
   if (hostsContainer) {
       const hostObserver = new MutationObserver(mutations => {
           let selectionChanged = false;
           
           mutations.forEach(mutation => {
               if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                   if (mutation.target.classList.contains('host-banner')) {
                       selectionChanged = true;
                   }
               }
           });
           
           if (selectionChanged) {
               console.log("[Ansible Multi-Host] Seleção de hosts alterada");
               refreshBaselineBadges();
           }
       });
       
       hostObserver.observe(hostsContainer, { 
           subtree: true, 
           attributes: true, 
           attributeFilter: ['class'] 
       });
       
       console.log("[Ansible Multi-Host] Observador de seleção de hosts configurado");
   }
}

/**
* Inicializa o sistema integrado
*/
function initialize() {
   try {
       console.log("[Ansible Multi-Host] Iniciando sistema integrado");
       
       // Adicionar estilos CSS
       addStyles();
       
       // Carregar configurações salvas
       loadSavedConfigurations();
       
       // Interceptar execução de playbooks
       interceptPlaybookExecution();
       
       // Configurar observadores do DOM
       setupObservers();
       
       // Observar novos cards
       observeNewCards();
       
       // Primeira verificação de emblemas
       setTimeout(refreshBaselineBadges, 1000);
       
       // Definir intervalo para verificar badges periodicamente
       setInterval(refreshBaselineBadges, 5000);
       
       console.log("[Ansible Multi-Host] Sistema integrado inicializado com sucesso");
       
       // Expor API para uso externo
       window.baselineMultiHost = {
           showConfigModal,
           showMultiHostModal,
           validateHostsConfiguration,
           getSelectedHosts,
           refreshBaselineBadges,
           CONFIG,
           STATE
       };
   } catch (error) {
       console.error(`[Ansible Multi-Host] Erro ao inicializar: ${error.message}`, error);
   }
}

// Inicializar quando o documento estiver pronto
if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initialize);
} else {
   // Se o DOM já estiver carregado, inicializar imediatamente
   initialize();
}
})();