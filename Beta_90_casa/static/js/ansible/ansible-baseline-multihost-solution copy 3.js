/**
 * ansible-baseline-multihost-solution.js
 * 
 * Solução integrada para playbooks de baseline:
 * - Validação de hosts e configuração para execução de baseline
 * - Execução em múltiplos hosts com controle sequencial
 * - Visualização aprimorada da saída para todos os hosts
 * - Barras de progresso e formatação de saída
 * 
 * @version 3.0.0
 */

(function() {
    console.log("[Ansible Multi-Host] Inicializando solução integrada para execução e visualização");

    // Configurações
    const CONFIG = {
        // Palavras-chave para identificar playbooks de baseline
        baselineKeywords: ['baseline', 'configuracao-base', 'configuração-base'],
        
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
        autoRefreshTimers: new Map()
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
     * Cria o HTML para um banner de configuração de baseline
     * @param {string} hostname - Nome do host
     * @return {string} HTML do banner
     */
    function createBannerHTML(hostname) {
        const bannerId = generateBannerId(hostname);
        
        return `
        <div id="${bannerId}" class="baseline-config-banner">
            <div class="banner-header">
                <h3>Configuração de Baseline para ${hostname}</h3>
                <button class="banner-close" data-host="${hostname}">✕</button>
            </div>
            <div class="banner-content">
                <div class="form-group">
                    <label for="${bannerId}-hostname">Hostname</label>
                    <input type="text" id="${bannerId}-hostname" value="${hostname}" class="form-control">
                </div>
                <div class="form-group">
                    <label for="${bannerId}-parceiro">Senha do Parceiro</label>
                    <div class="password-group">
                        <input type="password" id="${bannerId}-parceiro" class="form-control">
                        <button class="toggle-password" data-target="${bannerId}-parceiro">👁</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="${bannerId}-root">Senha do Root</label>
                    <div class="password-group">
                        <input type="password" id="${bannerId}-root" class="form-control">
                        <button class="toggle-password" data-target="${bannerId}-root">👁</button>
                    </div>
                </div>
                <div class="banner-actions">
                    <button class="generate-passwords" data-host="${hostname}">Gerar Senhas</button>
                    <button class="save-config" data-host="${hostname}">Salvar Configuração</button>
                </div>
                <div class="banner-status"></div>
            </div>
        </div>`;
    }

    /**
     * Adiciona estilos CSS necessários para o sistema
     */
    function addStyles() {
        if (document.getElementById('baseline-validation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'baseline-validation-styles';
        style.textContent = `
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
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .banner-header {
                background: ${CONFIG.styles.bannerHeaderBg};
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
            }
            
            .banner-header h3 {
                margin: 0;
                font-size: 14px;
                color: ${CONFIG.styles.bannerBorderColor};
            }
            
            .banner-content {
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
            
            .banner-actions {
                display: flex;
                gap: 8px;
                margin-top: 15px;
            }
            
            .banner-actions button {
                flex: 1;
                padding: 8px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                font-size: 12px;
            }
            
            .generate-passwords {
                background: #2A2A2A;
                color: white;
            }
            
            .save-config {
                background: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
            }
            
            .banner-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 16px;
            }
            
            .banner-status {
                margin-top: 10px;
                font-size: 12px;
                min-height: 20px;
            }
            
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
        `;
        
        document.head.appendChild(style);
        console.log("[Ansible Multi-Host] Estilos adicionados com sucesso");
    }

    /**
     * Gera uma senha aleatória segura
     * @param {number} length - Comprimento da senha
     * @return {string} Senha gerada
     */
    function generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=<>?';
        let password = '';
        
        // Garantir pelo menos um de cada tipo
        password += chars.substr(Math.floor(Math.random() * 26), 1); // Maiúscula
        password += chars.substr(26 + Math.floor(Math.random() * 26), 1); // Minúscula
        password += chars.substr(52 + Math.floor(Math.random() * 10), 1); // Número
        password += chars.substr(62 + Math.floor(Math.random() * (chars.length - 62)), 1); // Especial
        
        // Completar o resto da senha
        for (let i = 4; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Embaralhar os caracteres
        return password.split('').sort(() => 0.5 - Math.random()).join('');
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
     * Adiciona um banner de configuração para um host
     * @param {string} hostname - Nome do host
     * @return {HTMLElement} Elemento do banner
     */
    function addConfigBanner(hostname) {
        console.log(`[Ansible Multi-Host] Adicionando banner para host: ${hostname}`);
        
        // Verificar se o banner já existe
        const existingBanner = document.getElementById(generateBannerId(hostname));
        if (existingBanner) {
            console.log(`[Ansible Multi-Host] Banner já existe para ${hostname}`);
            return existingBanner;
        }
        
        // Encontrar o elemento do host
        const hostElement = findHostElement(hostname);
        if (!hostElement) {
            console.error(`[Ansible Multi-Host] Elemento do host não encontrado para ${hostname}`);
            return null;
        }
        
        // Criar container para o banner
        const container = document.createElement('div');
        container.className = 'host-baseline-container';
        container.innerHTML = createBannerHTML(hostname);
        
        // Inserir após o elemento do host
        if (hostElement.nextSibling) {
            hostElement.parentNode.insertBefore(container, hostElement.nextSibling);
        } else {
            hostElement.parentNode.appendChild(container);
        }
        
        // Configurar eventos
        const banner = container.querySelector('.baseline-config-banner');
        
        // Botão de fechar
        banner.querySelector('.banner-close').addEventListener('click', () => {
            container.remove();
            STATE.hostBanners.delete(hostname);
        });
        
        // Botão de gerar senhas
        banner.querySelector('.generate-passwords').addEventListener('click', () => {
            const parceiroInput = banner.querySelector(`#${generateBannerId(hostname)}-parceiro`);
            const rootInput = banner.querySelector(`#${generateBannerId(hostname)}-root`);
            
            parceiroInput.value = generatePassword();
            rootInput.value = generatePassword();
            
            // Mostrar brevemente uma mensagem
            const statusEl = banner.querySelector('.banner-status');
            statusEl.textContent = 'Senhas geradas automaticamente';
            statusEl.style.color = CONFIG.styles.successColor;
            
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        });
        
        // Botão de salvar configuração
        banner.querySelector('.save-config').addEventListener('click', () => {
            saveHostConfiguration(hostname, banner);
        });
        
        // Botão de mostrar/ocultar senha
        banner.querySelectorAll('.toggle-password').forEach(btn => {
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
        
        // Pré-popular com valores existentes
        const existingConfig = getHostConfig(hostname);
        if (existingConfig) {
            const hostnameInput = banner.querySelector(`#${generateBannerId(hostname)}-hostname`);
            const parceiroInput = banner.querySelector(`#${generateBannerId(hostname)}-parceiro`);
            const rootInput = banner.querySelector(`#${generateBannerId(hostname)}-root`);
            
            if (hostnameInput && existingConfig.hostname) hostnameInput.value = existingConfig.hostname;
            if (parceiroInput && existingConfig.parceiroPassword) parceiroInput.value = existingConfig.parceiroPassword;
            if (rootInput && existingConfig.rootPassword) rootInput.value = existingConfig.rootPassword;
        }
        
        // Armazenar referência ao banner
        STATE.hostBanners.set(hostname, banner);
        
        console.log(`[Ansible Multi-Host] Banner adicionado para ${hostname}`);
        return banner;
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
 * Modifica a função saveHostConfiguration para atualizar o estado visual após salvar
 * @param {string} hostname - Nome do host
 * @param {HTMLElement} banner - Elemento do banner
 */
function saveHostConfiguration(hostname, banner) {
    console.log(`[Ansible Multi-Host] Salvando configuração para: ${hostname}`);
    
    const bannerId = generateBannerId(hostname);
    const newHostname = banner.querySelector(`#${bannerId}-hostname`).value.trim();
    const parceiroPassword = banner.querySelector(`#${bannerId}-parceiro`).value.trim();
    const rootPassword = banner.querySelector(`#${bannerId}-root`).value.trim();
    
    const statusEl = banner.querySelector('.banner-status');
    
    // Validar entradas
    if (!newHostname) {
        statusEl.textContent = 'Erro: O hostname é obrigatório';
        statusEl.style.color = CONFIG.styles.errorColor;
        return;
    }
    
    if (!parceiroPassword || parceiroPassword.length < 8) {
        statusEl.textContent = 'Erro: A senha do parceiro deve ter pelo menos 8 caracteres';
        statusEl.style.color = CONFIG.styles.errorColor;
        return;
    }
    
    if (!rootPassword || rootPassword.length < 8) {
        statusEl.textContent = 'Erro: A senha do root deve ter pelo menos 8 caracteres';
        statusEl.style.color = CONFIG.styles.errorColor;
        return;
    }
    
    // Armazenar configuração
    const config = {
        hostname: newHostname,
        parceiroPassword,
        rootPassword,
        timestamp: Date.now()
    };
    
    // Salvar em localStorage para persistência entre recargas
    try {
        const storedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
        storedConfigs[hostname] = config;
        localStorage.setItem('baseline_configs', JSON.stringify(storedConfigs));
    } catch (e) {
        console.warn(`[Ansible Multi-Host] Erro ao salvar no localStorage: ${e.message}`);
    }
    
    // Adicionar host à lista de configurados
    STATE.configuredHosts.add(hostname);
    
    // Atualizar a interface
    statusEl.textContent = 'Configuração salva com sucesso!';
    statusEl.style.color = CONFIG.styles.successColor;
    
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
    
    // Remover mensagem de aviso se existir
    const messageContainer = document.getElementById('baseline-config-message');
    if (messageContainer) {
        // Verificar se ainda há hosts não configurados
        const unconfiguredHosts = getUnconfiguredHosts();
        if (unconfiguredHosts.length === 0) {
            messageContainer.remove();
        } else {
            // Atualizar a mensagem para mostrar os hosts restantes
            showConfigRequiredMessage(unconfiguredHosts);
        }
    }
    
    console.log(`[Ansible Multi-Host] Configuração salva para ${hostname}:`, config);
    
    // Atualizar emblemas
    setTimeout(() => {
        refreshBaselineBadges();
    }, 500);
}

/**
 * Melhorar o estilo visual da mensagem de configuração
 */
function addMessageStyles() {
    if (document.getElementById('baseline-message-extended-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'baseline-message-extended-styles';
    style.textContent = `
        #baseline-config-message {
            display: flex;
            align-items: center;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
            background-color: #FFF3CD;
            border-left: 5px solid #FFD600;
            color: #856404;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #baseline-config-message strong {
            font-weight: bold;
            color: #775c04;
        }
        
        .config-action-btn {
            background-color: #FFD600;
            color: #000000;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-left: 15px;
        }
        
        .config-action-btn:hover {
            background-color: #e6c200;
            transform: translateY(-2px);
            box-shadow: 0 3px 5px rgba(0,0,0,0.15);
        }
        
        .message-close-btn {
            background: none;
            border: none;
            color: #856404;
            font-size: 18px;
            cursor: pointer;
            margin-left: 15px;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        
        .message-close-btn:hover {
            opacity: 1;
        }
    `;
    
    document.head.appendChild(style);
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
     * Adiciona emblemas de baseline aos hosts quando a playbook de baseline estiver selecionada
     */
    function addBaselineBadgesToHosts() {
        // Verificar se alguma playbook de baseline está selecionada
        const selectedBaseline = isAnyBaselineSelected();
        if (!selectedBaseline) {
            // Remover emblemas existentes
            document.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
            return;
        }
        
        console.log("[Ansible Multi-Host] Adicionando emblemas de baseline a hosts selecionados");
        
        // Encontrar hosts selecionados que não possuem emblema
        const selectedHosts = document.querySelectorAll('.host-banner.selected');
        
        selectedHosts.forEach(hostElement => {
            // Tentar obter o hostname
            const input = hostElement.querySelector('input[type="checkbox"]');
            if (!input) return;
            
            const hostname = input.getAttribute('data-hostname');
            if (!hostname) return;
            
            // Verificar se já tem um emblema
            if (hostElement.querySelector('.baseline-badge')) return;
            
            // Verificar se o host já está configurado
            const isConfigured = STATE.configuredHosts.has(hostname);
            
            // Criar emblema
            const badge = document.createElement('div');
            badge.className = `baseline-badge ${isConfigured ? '' : 'required'}`;
            badge.textContent = isConfigured ? 'Baseline Ready' : 'Baseline Required';
            badge.setAttribute('data-hostname', hostname);
            
            // Adicionar evento de clique
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleHostConfigBanner(hostname);
            });
            
            hostElement.appendChild(badge);
        });
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
     * Alterna a visibilidade do banner de configuração para um host
     * @param {string} hostname - Nome do host
     */
    function toggleHostConfigBanner(hostname) {
        console.log(`[Ansible Multi-Host] Alternando banner para ${hostname}`);
        
        // Verificar se o banner já existe
        if (STATE.hostBanners.has(hostname)) {
            // O banner existe, remover
            const banner = STATE.hostBanners.get(hostname);
            banner.closest('.host-baseline-container').remove();
            STATE.hostBanners.delete(hostname);
            console.log(`[Ansible Multi-Host] Banner removido para ${hostname}`);
        } else {
            // Criar novo banner
            addConfigBanner(hostname);
        }
    }

   // Modificar a função para garantir cores corretas nos emblemas
function refreshBaselineBadges() {
    // Remover todos os emblemas primeiro
    document.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
    
    // Verificar se alguma playbook de baseline está selecionada
    const selectedBaseline = isAnyBaselineSelected();
    if (!selectedBaseline) return;
    
    console.log("[Ansible Multi-Host] Adicionando emblemas de baseline com cores atualizadas");
    
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
        } else if (!config.parceiroPassword || config.parceiroPassword.length < 8 || 
                   !config.rootPassword || config.rootPassword.length < 8) {
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
        
        // Adicionar evento de clique
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHostConfigBanner(hostname);
        });
        
        hostElement.appendChild(badge);
    });
}

// Injetar CSS corrigido para os emblemas
function injectUpdatedStyles() {
    const style = document.createElement('style');
    style.id = 'baseline-badge-fix-styles';
    style.textContent = `
        /* Cores atualizadas para os emblemas */
        .baseline-badge {
            position: absolute;
            top: 8px;
            right: 8px;
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
        
        /* Vermelho para required */
        .baseline-badge.required {
            background-color: ${CONFIG.styles.errorColor} !important;
            color: white !important;
            animation: pulse 1s infinite !important;
        }
        
        /* Amarelo para configuring */
        .baseline-badge.configuring {
            background-color: ${CONFIG.styles.warningColor} !important;
            color: black !important;
        }
        
        /* Verde para configured */
        .baseline-badge.configured {
            background-color: ${CONFIG.styles.successColor} !important;
            color: white !important;
        }
        
        /* Espaçamento corrigido para Log */
        .log-toggle {
            margin: 15px 0 15px 15px !important;
            display: block !important;
            clear: both !important;
        }
        
        /* Espaçamento para grupo de botões */
        .button-group {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 15px !important;
            padding-top: 10px !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
        }
    `;
    document.head.appendChild(style);
}

// Nova função para inicialização com as correções
function initializeWithFixes() {
    try {
        console.log("[Ansible Multi-Host] Iniciando sistema com correções");
        
        // Injetar estilos atualizados
        injectUpdatedStyles();
        
        // Interceptar funções principais
        interceptPlaybookExecution();
        
        // Corrigir espaçamento dos botões nos cards existentes
        document.querySelectorAll('.execution-card').forEach(card => {
            fixButtonSpacing(card);
        });
        
        // Atualizar emblemas
        refreshBaselineBadges();
        
        // Iniciar observer para novos cards
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                            fixButtonSpacing(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log("[Ansible Multi-Host] Correções aplicadas com sucesso");
    } catch (error) {
        console.error(`[Ansible Multi-Host] Erro ao aplicar correções: ${error.message}`, error);
    }
}

// Executar inicialização com as correções
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWithFixes);
} else {
    // Se o DOM já estiver carregado, inicializar imediatamente
    initializeWithFixes();
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
                config.parceiroPassword.length < 8 || 
                !config.rootPassword || 
                config.rootPassword.length < 8) {
                
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
            
            // Adicionar emblemas "required" aos hosts não configurados
            unconfiguredHosts.forEach(hostname => {
                const hostElement = findHostElement(hostname);
                if (hostElement) {
                    // Remover emblema existente
                    hostElement.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
                    
                    // Adicionar novo emblema
                    const badge = document.createElement('div');
                    badge.className = 'baseline-badge required';
                    badge.textContent = 'Baseline Required';
                    badge.setAttribute('data-hostname', hostname);
                    badge.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleHostConfigBanner(hostname);
                    });
                    
                    hostElement.appendChild(badge);
                    
                    // Adicionar o banner automaticamente se não existir
                    if (!STATE.hostBanners.has(hostname)) {
                        addConfigBanner(hostname);
                    }
                }
            });
            
            return false;
        }
        
        console.log("[Ansible Multi-Host] Todos os hosts estão configurados corretamente");
        return true;
    }

    /**
     * Verifica se um card é de execução multi-host
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
 * Correção final para problemas no Ansible Baseline Multihost
 * 
 * Problemas corrigidos:
 * 1. Bloqueia completamente a criação do card quando o baseline não está configurado
 * 2. Ajusta espaçamento do botão de Log
 * 3. Corrige as cores dos emblemas de baseline
 */

// Função para mostrar uma mensagem simples quando a configuração for necessária
function showSimpleConfigRequiredMessage(hostname) {
    const hostMsg = hostname ? ` para o host ${hostname}` : '';
    const message = `É necessário configurar o baseline${hostMsg} antes de executar esta playbook.`;
    
    // Usar função global de mensagem do sistema
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, 'warning', 5000);
    } else {
        // Implementação alternativa
        const container = document.querySelector(CONFIG.selectors.runningPlaybooks) || document.body;
        const msgElement = document.createElement('div');
        msgElement.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 6px;
            background: #f8f9fa;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        msgElement.innerHTML = `<span>${message}</span>`;
        container.insertBefore(msgElement, container.firstChild);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (msgElement.parentNode) msgElement.remove();
        }, 5000);
    }
    
    // Abrir configuração para os hosts não configurados
    if (!hostname) {
        const unconfiguredHosts = getUnconfiguredHosts();
        if (unconfiguredHosts.length > 0) {
            // Abrir o primeiro host não configurado
            if (!STATE.hostBanners.has(unconfiguredHosts[0])) {
                addConfigBanner(unconfiguredHosts[0]);
            }
        }
    } else {
        // Abrir configuração para o host específico
        if (!STATE.hostBanners.has(hostname)) {
            addConfigBanner(hostname);
        }
    }
}


/**
 * Retorna a lista de hosts selecionados que não estão configurados
 * @return {Array<string>} Lista de hosts não configurados
 */
function getUnconfiguredHosts() {
    const unconfiguredHosts = [];
    document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
        const input = hostElement.querySelector('input[type="checkbox"]');
        if (!input) return;
        
        const hostname = input.getAttribute('data-hostname');
        if (!hostname) return;
        
        const config = getHostConfig(hostname);
        if (!config || 
            !config.parceiroPassword || 
            config.parceiroPassword.length < 8 || 
            !config.rootPassword || 
            config.rootPassword.length < 8) {
            unconfiguredHosts.push(hostname);
        }
    });
    return unconfiguredHosts;
}



/**
 * Função para interceptar completamente a criação do card e execução quando baseline não estiver configurado
 */
function interceptPlaybookExecution() {
    console.log("[Ansible Multi-Host] Interceptando função de execução de playbooks");
    
    // Substituir a função executeSelectedPlaybooks
    if (typeof window.originalExecuteSelectedPlaybooks === 'undefined' && 
        typeof window.executeSelectedPlaybooks === 'function') {
        
        window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
        
        window.executeSelectedPlaybooks = function() {
            console.log("[Ansible Multi-Host] Função de execução interceptada");
            
            // Verificar se estamos tentando executar uma playbook de baseline
            if (isAnyBaselineSelected()) {
                console.log("[Ansible Multi-Host] Baseline detectado, validando configurações");
                
                // Validar que todos os hosts estão configurados
                if (!validateHostsConfiguration()) {
                    console.warn("[Ansible Multi-Host] Execução bloqueada: hosts não configurados");
                    
                    // Mostrar mensagem e bloquear execução
                    showConfigRequiredMessage();
                    
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
                                    config.parceiroPassword.length < 8 || 
                                    !config.rootPassword || 
                                    config.rootPassword.length < 8) {
                                    unconfiguredHosts.push(hostname);
                                }
                            }
                            
                            // Se algum host não estiver configurado, bloquear execução
                            if (unconfiguredHosts.length > 0) {
                                console.warn(`[Ansible Multi-Host] Hosts não configurados em verificação final: ${unconfiguredHosts.join(', ')}`);
                                showConfigRequiredMessage(unconfiguredHosts);
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
            window.originalExecuteSelectedPlaybooks();
            
            // Restaurar fetch original após um tempo
            setTimeout(() => {
                window.fetch = originalFetch;
            }, 2000);
        };
        
        console.log("[Ansible Multi-Host] Função de execução substituída com sucesso");
    }
    
    // Substituir a função createExecutionCard para bloquear completamente a criação do card
    if (typeof window.originalCreateExecutionCard === 'undefined' && 
        typeof window.createExecutionCard === 'function') {
        
        window.originalCreateExecutionCard = window.createExecutionCard;
        
        window.createExecutionCard = function(playbookName, hosts, jobId) {
            // Verificar se é um playbook de baseline e bloquear criação do card se necessário
            if (isBaselinePlaybook(playbookName)) {
                const unconfiguredHosts = [];
                Array.from(hosts).forEach(hostname => {
                    const config = getHostConfig(hostname);
                    if (!config || 
                        !config.parceiroPassword || 
                        config.parceiroPassword.length < 8 || 
                        !config.rootPassword || 
                        config.rootPassword.length < 8) {
                        unconfiguredHosts.push(hostname);
                    }
                });
                
                if (unconfiguredHosts.length > 0) {
                    console.warn(`[Ansible Multi-Host] Bloqueando criação do card para ${playbookName}: hosts não configurados`);
                    showConfigRequiredMessage(unconfiguredHosts);
                    
                    // Retornar um elemento invisível para não quebrar o fluxo, mas impedir a criação do card
                    const dummyCard = document.createElement('div');
                    dummyCard.style.display = 'none';
                    dummyCard.setAttribute('data-job-id', jobId);
                    dummyCard.setAttribute('data-playbook-name', playbookName);
                    dummyCard.classList.add('dummy-execution-card');
                    return dummyCard;
                }
            }
            
            // Se chegou aqui, cria o card normalmente
            return window.originalCreateExecutionCard.apply(this, arguments);
        };
        
        console.log("[Ansible Multi-Host] Função de criação de cards substituída com sucesso");
    }
}



/**
 * Exibe uma mensagem clara quando a configuração do baseline é necessária
 * @param {Array<string>} unconfiguredHosts - Lista de hosts não configurados
 */
function showConfigRequiredMessage(unconfiguredHosts = []) {
    // Criar container para a mensagem se não existir
    let messageContainer = document.getElementById('baseline-config-message');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'baseline-config-message';
        messageContainer.style.cssText = `
            background-color: #FFF3CD;
            color: #856404;
            border: 1px solid #FFEEBA;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: fadeIn 0.3s ease;
            position: relative;
        `;
        
        // Inserir no topo do container de playbooks em execução
        const runningPlaybooksContainer = document.querySelector(CONFIG.selectors.runningPlaybooks);
        if (runningPlaybooksContainer) {
            runningPlaybooksContainer.insertBefore(messageContainer, runningPlaybooksContainer.firstChild);
        } else {
            // Ou encontrar outro local adequado
            const alternativeContainer = document.querySelector('#playbook-execution') || document.body;
            alternativeContainer.insertBefore(messageContainer, alternativeContainer.firstChild);
        }
    }
    
    // Determinar mensagem baseada nos hosts não configurados
    let message = '';
    let actionButtons = '';
    
    if (Array.isArray(unconfiguredHosts) && unconfiguredHosts.length > 0) {
        if (unconfiguredHosts.length === 1) {
            message = `<strong>Atenção:</strong> É necessário configurar o baseline para o host <strong>${unconfiguredHosts[0]}</strong> antes de executar a playbook.`;
            actionButtons = `<button id="configure-baseline-btn" data-host="${unconfiguredHosts[0]}" class="config-action-btn">Configurar Baseline</button>`;
        } else {
            message = `<strong>Atenção:</strong> É necessário configurar o baseline para os seguintes hosts antes de executar a playbook: <strong>${unconfiguredHosts.join(', ')}</strong>`;
            actionButtons = `<button id="configure-baseline-btn" data-host="${unconfiguredHosts[0]}" class="config-action-btn">Configurar Baseline</button>`;
        }
    } else {
        message = `<strong>Atenção:</strong> É necessário configurar o baseline para todos os hosts selecionados antes de executar a playbook.`;
        actionButtons = `<button id="configure-baseline-btn" class="config-action-btn">Configurar Baseline</button>`;
    }
    
    // Adicionar estilos para os botões
    const style = document.createElement('style');
    style.id = 'baseline-message-styles';
    style.textContent = `
        .config-action-btn {
            background-color: ${CONFIG.styles.buttonColor};
            color: ${CONFIG.styles.buttonTextColor};
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            font-weight: bold;
            cursor: pointer;
            margin-left: 10px;
        }
        
        .config-action-btn:hover {
            opacity: 0.9;
        }
        
        .message-close-btn {
            background: none;
            border: none;
            color: #856404;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .message-content {
            flex: 1;
        }
        
        .message-actions {
            display: flex;
            align-items: center;
        }
    `;
    
    if (!document.getElementById('baseline-message-styles')) {
        document.head.appendChild(style);
    }
    
    // Atualizar conteúdo da mensagem
    messageContainer.innerHTML = `
        <div class="message-content">
            ${message}
        </div>
        <div class="message-actions">
            ${actionButtons}
            <button class="message-close-btn">✕</button>
        </div>
    `;
    
    // Adicionar eventos
    const closeBtn = messageContainer.querySelector('.message-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            messageContainer.remove();
        });
    }
    
    const configBtn = messageContainer.querySelector('#configure-baseline-btn');
    if (configBtn) {
        configBtn.addEventListener('click', () => {
            const host = configBtn.getAttribute('data-host');
            if (host) {
                // Abrir configuração para o host específico
                addConfigBanner(host);
            } else {
                // Ou abrir configuração para o primeiro host não configurado
                const unconfiguredHostList = getUnconfiguredHosts();
                if (unconfiguredHostList.length > 0) {
                    addConfigBanner(unconfiguredHostList[0]);
                }
            }
            
            // Fechar a mensagem
            messageContainer.style.display = 'none';
        });
    }
    
    // Destacar a mensagem
    messageContainer.style.display = 'flex';
    messageContainer.style.animation = 'none';
    setTimeout(() => {
        messageContainer.style.animation = 'fadeIn 0.3s ease';
    }, 10);
}








// Função para corrigir espaçamento do botão de Log
function fixButtonSpacing(card) {
    if (!card) return;
    
    // Ajustar botão de Toggle (Ver Mais/Ver Menos)
    const toggleButton = card.querySelector('.toggle-output-btn');
    if (toggleButton) {
        toggleButton.style.margin = '10px';
    }
    
    // Injetar CSS para os botões Log 
    const style = document.createElement('style');
    style.textContent = `
        .log-toggle {
            margin: 15px 0 15px 15px !important;
            display: block !important;
            clear: both !important;
        }
        
        .button-group {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-top: 15px !important;
            padding: 10px 0 !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
        }
        
        .execution-controls {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            margin-top: 10px !important;
        }
    `;
    document.head.appendChild(style);
    
    // Ajustar botões de Log existentes
    const logButtons = card.querySelectorAll('.log-toggle');
    logButtons.forEach(button => {
        button.style.marginLeft = '15px';
        button.style.marginTop = '15px';
        button.style.marginBottom = '15px';
        button.style.display = 'block';
    });
    
    // Reorganizar controles se necessário
    const controlsContainer = card.querySelector('.execution-controls');
    if (controlsContainer) {
        controlsContainer.style.display = 'flex';
        controlsContainer.style.flexWrap = 'wrap';
        controlsContainer.style.gap = '10px';
        controlsContainer.style.marginTop = '10px';
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
     * Encontra o job master correspondente a um job individual
     * @param {string} individualJobId - ID do job individual
     * @param {string} hostname - Nome do host
     * @return {string|null} ID do job master, se encontrado
     */
    function findAndAssociateMasterJob(individualJobId, hostname) {
        // Buscar na pilha de jobs recém-criados
        const recentMasterJobs = STATE.jobCreationStack
            .filter(job => !job.isSingleHost && job.hosts.includes(hostname))
            .sort((a, b) => b.timestamp - a.timestamp);
        
        if (recentMasterJobs.length > 0) {
            const masterJob = recentMasterJobs[0];
            const masterJobId = masterJob.jobId;
            
            console.log(`[Ansible Multi-Host] Associando job individual ${individualJobId} ao master ${masterJobId}`);
            
            // Registrar associação
            if (!STATE.individualJobs.has(masterJobId)) {
                STATE.individualJobs.set(masterJobId, []);
                STATE.masterHostsMap.set(masterJobId, masterJob.hosts);
            }
            
            STATE.individualJobs.get(masterJobId).push({
                jobId: individualJobId,
                hostname: hostname,
                timestamp: Date.now()
            });
            
            return masterJobId;
        }
        
        console.log(`[Ansible Multi-Host] Não foi possível encontrar job master para ${individualJobId} (host: ${hostname})`, 'warn');
        return null;
    }

    /**
     * Intercepta a criação de cards de execução para adicionar logs específicos de hosts
     */
    function interceptExecutionCards() {
        console.log("[Ansible Multi-Host] Interceptando criação de cards de execução");
        
        if (typeof window.createExecutionCard === 'function' && 
            typeof window.originalCreateExecutionCard === 'undefined') {
            
            window.originalCreateExecutionCard = window.createExecutionCard;
            
            // Substituir a função
            window.createExecutionCard = function(playbookName, hosts, jobId) {
                console.log(`[Ansible Multi-Host] Card de execução interceptado: ${playbookName}, ${jobId}`);
                
                // Criar o card normalmente
                const card = window.originalCreateExecutionCard.apply(this, arguments);
                
                // Inicializar barra de progresso
                initializeProgress(card, jobId);
                
                // Verificar se é uma playbook de baseline
                if (isBaselinePlaybook(playbookName)) {
                    console.log(`[Ansible Multi-Host] Card de baseline detectado: ${playbookName}`);
                    
                    // Verificar se temos um ou múltiplos hosts
                    if (hosts.size === 1) {
                        const hostname = Array.from(hosts)[0];
                        console.log(`[Ansible Multi-Host] Configurando card para único host: ${hostname}`);
                        
                        // Adicionar log específico para este host
                        injectHostLog(card, jobId, hostname);
                        
                        // Mapear o job para este hostname
                        STATE.jobHostMap.set(jobId, hostname);
                    } else {
                        console.log(`[Ansible Multi-Host] Card para múltiplos hosts: ${Array.from(hosts).join(', ')}`);
                        
                        // Mapear este job master para a lista de hosts
                        STATE.masterHostsMap.set(jobId, Array.from(hosts));
                        
                        // Para múltiplos hosts, vamos adicionar um log para cada um
                        Array.from(hosts).forEach(hostname => {
                            // Adicionar log separado para cada host
                            injectHostLog(card, `${jobId}-${hostname}`, hostname);
                        });
                        
                        // Abrir automaticamente a saída após um breve delay
                        setTimeout(() => {
                            const toggleBtn = card.querySelector('.toggle-output-btn');
                            if (toggleBtn && document.body.contains(toggleBtn)) {
                                console.log(`[Ansible Multi-Host] Abrindo automaticamente a saída para ${jobId}`);
                                toggleBtn.click();
                            }
                        }, 1000);
                    }
                }
                
                return card;
            };
            
            console.log("[Ansible Multi-Host] Função de criação de cards substituída com sucesso");
        } else {
            console.warn("[Ansible Multi-Host] Função de criação de cards não encontrada ou já substituída");
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
        
        // Configurar monitoramento de progresso
        startProgressMonitoring(card, jobId);
    }

    /**
     * Inicia o monitoramento de progresso para um card
     * @param {HTMLElement} card - Elemento do card
     * @param {string} jobId - ID do job
     */
    function startProgressMonitoring(card, jobId) {
        // Verificar se é um job master ou individual
        const isMultiHost = isMultiHostCard(card);
        
        // Configurar timer para atualizar o progresso periodicamente
        const intervalId = setInterval(() => {
            // Verificar se o card ainda existe
            if (!document.body.contains(card)) {
                clearInterval(intervalId);
                return;
            }
            
            // Para multi-host, verificar os jobs individuais
            if (isMultiHost) {
                updateMasterJobProgress(jobId);
            } else {
                // Para jobs normais, buscar status diretamente
                fetchJobOutput(jobId)
                    .then(data => {
                        if (data.progress !== undefined) {
                            updateCardProgress(jobId, data.progress, data.status);
                        } else {
                            // Se não temos progresso, incrementar artificialmente
                            let currentProgress = STATE.progressState.get(jobId) || 0;
                            currentProgress = Math.min(95, currentProgress + 0.5);
                            updateCardProgress(jobId, currentProgress, data.status || 'running');
                        }
                        
                        // Se o job terminou, parar o monitoramento
                        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                            clearInterval(intervalId);
                        }
                    })
                    .catch(error => {
                        console.error(`[Ansible Multi-Host] Erro ao buscar progresso para ${jobId}: ${error.message}`);
                        
                        // Em caso de erro, incrementar um pouco o progresso
                        let currentProgress = STATE.progressState.get(jobId) || 0;
                        currentProgress = Math.min(95, currentProgress + 0.2);
                        updateCardProgress(jobId, currentProgress, 'running');
                    });
            }
        }, 2000);
    }

    /**
     * Adiciona um log específico para um host em um card de execução
     * @param {HTMLElement} card - Card de execução
     * @param {string} jobId - ID do job
     * @param {string} hostname - Nome do host
     */
    function injectHostLog(card, jobId, hostname) {
        console.log(`[Ansible Multi-Host] Injetando log para ${hostname} no job ${jobId}`);
        
        // Criar id seguro para seletor CSS
        const safeLogId = generateSafeLogId(hostname);
        
        // Verificar se o log já existe
        if (card.querySelector(`#${safeLogId}`)) {
            console.log(`[Ansible Multi-Host] Log já existe para ${hostname}`);
            return;
        }
        
        // Encontrar o botão "Ver Mais" para posicionar nosso botão ao lado
        const toggleOutputBtn = card.querySelector('.toggle-output-btn');
        if (!toggleOutputBtn) {
            console.warn(`[Ansible Multi-Host] Botão "Ver Mais" não encontrado no card`);
            return;
        }
        
        // Criar container para os controles se não existir
        let controlsContainer;
        if (!toggleOutputBtn.parentNode.classList.contains('execution-controls')) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'execution-controls';
            toggleOutputBtn.parentNode.insertBefore(controlsContainer, toggleOutputBtn);
            
            // Mover o botão "Ver Mais" para o container
            controlsContainer.appendChild(toggleOutputBtn);
        } else {
            controlsContainer = toggleOutputBtn.parentNode;
        }
        
        // Criar botão para toggle do log
        const logToggleBtn = document.createElement('button');
        logToggleBtn.className = 'log-toggle';
        logToggleBtn.textContent = `Log (${hostname})`;
        logToggleBtn.setAttribute('data-hostname', hostname);
        controlsContainer.appendChild(logToggleBtn);
        
        // Criar container para o log
        const logContainer = document.createElement('div');
        logContainer.className = 'baseline-log-container';
        logContainer.id = `baseline-log-container-${safeLogId}`;
        
        // HTML do log
        logContainer.innerHTML = `
            <div id="${safeLogId}" class="baseline-log" style="display: none;">
                <div class="baseline-log-header">
                    <h4>Baseline: ${hostname}</h4>
                    <button class="log-copy" data-hostname="${hostname}">Copiar</button>
                </div>
                <div class="baseline-log-content" id="baseline-log-content-${safeLogId}">
                    <div class="log-line">Aguardando execução...</div>
                </div>
            </div>
        `;
        
        // Adicionar ao card
        card.appendChild(logContainer);
        
        // Configurar evento de toggle
        const logElement = logContainer.querySelector('.baseline-log');
        
        logToggleBtn.addEventListener('click', () => {
            const isVisible = logElement.style.display === 'block';
            
            // Ocultar outros logs primeiro
            card.querySelectorAll('.baseline-log').forEach(otherLog => {
                if (otherLog !== logElement) {
                    otherLog.style.display = 'none';
                }
            });
            
            // Agora alternar a visibilidade do log atual
            logElement.style.display = isVisible ? 'none' : 'block';
            logToggleBtn.textContent = isVisible ? `Log (${hostname})` : `Ocultar Log (${hostname})`;
            
            // Se tornando visível e não tem conteúdo atualizado, atualizar
            if (!isVisible) {
                updateHostLog(jobId, hostname);
            }
        });
        
        // Configurar evento de cópia
        const copyBtn = logContainer.querySelector('.log-copy');
        copyBtn.addEventListener('click', () => {
            copyHostLog(hostname);
        });
        
        console.log(`[Ansible Multi-Host] Log injetado para ${hostname}`);
    }

    /**
     * Atualiza o log de um host específico
     * @param {string} jobId - ID do job
     * @param {string} hostname - Nome do host
     */
    function updateHostLog(jobId, hostname) {
        console.log(`[Ansible Multi-Host] Atualizando log para ${hostname}, jobId: ${jobId}`);
        
        // Criar id seguro para seletor CSS
        const safeLogId = generateSafeLogId(hostname);
        
        // Buscar elemento do log
        const logContent = document.getElementById(`baseline-log-content-${safeLogId}`);
        if (!logContent) {
            console.warn(`[Ansible Multi-Host] Container de log não encontrado para ${hostname}`);
            return;
        }
        
        // Mostrar indicador de carregamento
        logContent.innerHTML = `<div class="log-line">Carregando dados para ${hostname}...</div>`;
        
        // Obter o ID do job real (pode ser um jobId composto para múltiplos hosts)
        const realJobId = jobId.includes('-') ? jobId.split('-')[0] : jobId;
        
        // Buscar jobs individuais para múltiplos hosts
        const jobsToFetch = getJobsToFetch(realJobId, [hostname]);
        
        if (jobsToFetch.length === 0) {
            // Se não encontramos jobs individuais, buscar do job master
            fetchJobOutput(realJobId)
                .then(data => {
                    if (!data || !data.output) {
                        logContent.innerHTML = `<div class="log-line">Aguardando dados...</div>`;
                        return;
                    }
                    
                    // Filtrar a saída apenas para este host
                    const output = filterOutputForHost(data.output, hostname);
                    
                    // Armazenar no cache
                    STATE.outputCache.set(hostname, output);
                    
                    // Renderizar o output filtrado
                    renderHostLog(hostname, output, logContent);
                    
                    // Se o job ainda estiver em execução, continuar atualizando
                    if (data.status === 'running') {
                        setTimeout(() => updateHostLog(jobId, hostname), 2000);
                    }
                })
                .catch(error => {
                    console.error(`[Ansible Multi-Host] Erro ao atualizar log: ${error.message}`);
                    logContent.innerHTML = `<div class="log-line" style="color: ${CONFIG.styles.errorColor}">Erro ao buscar dados: ${error.message}</div>`;
                });
        } else {
            // Usar o job individual específico para este host
            const jobInfo = jobsToFetch[0];
            
            fetchJobOutput(jobInfo.jobId)
                .then(data => {
                    if (!data || !data.output) {
                        logContent.innerHTML = `<div class="log-line">Aguardando dados...</div>`;
                        return;
                    }
                    
                    // Armazenar no cache
                    STATE.outputCache.set(hostname, data.output);
                    
                    // Renderizar o output
                    renderHostLog(hostname, data.output, logContent);
                    
                    // Se o job ainda estiver em execução, continuar atualizando
                    if (data.status === 'running') {
                        setTimeout(() => updateHostLog(jobId, hostname), 2000);
                    }
                })
                .catch(error => {
                    console.error(`[Ansible Multi-Host] Erro ao atualizar log individual: ${error.message}`);
                    logContent.innerHTML = `<div class="log-line" style="color: ${CONFIG.styles.errorColor}">Erro ao buscar dados: ${error.message}</div>`;
                });
        }
    }

    /**
     * Filtra a saída do Ansible para um host específico
     * @param {string} output - Saída completa do Ansible
     * @param {string} hostname - Nome do host
     * @return {string} Saída filtrada
     */
    function filterOutputForHost(output, hostname) {
        if (!output) return '';
        
        // Dividir por linhas
        const lines = output.split('\n');
        
        // Filtrar apenas linhas relevantes para este host
        const relevantLines = lines.filter(line => {
            // Incluir linhas gerais
            if (line.includes('PLAY') || line.includes('TASK')) return true;
            
            // Incluir linhas específicas para este host
            return line.includes(`[${hostname}]`) || 
                   line.toLowerCase().includes(hostname.toLowerCase());
        });
        
        return relevantLines.join('\n');
    }

    /**
     * Renderiza o log de um host específico
     * @param {string} hostname - Nome do host
     * @param {string} output - Saída do Ansible
     * @param {HTMLElement} container - Container do log
     */
    function renderHostLog(hostname, output, container) {
        if (!output) {
            container.innerHTML = `<div class="log-line">Aguardando dados...</div>`;
            return;
        }
        
        // Usar a função formatOutput para obter HTML formatado
        container.innerHTML = formatOutput(output, true);
        
        // Extrair informações importantes
        const summary = extractBaselineSummary(output);
        
        // Se tivermos um resumo, adicionar no início do log
        if (summary && Object.keys(summary).length > 0) {
            const summaryHtml = `
            <div class="log-summary">
                ${summary.hostname ? `<div class="log-summary-item">
                    <span class="log-summary-label">Hostname:</span>
                    <span class="log-summary-value">${summary.hostname}</span>
                </div>` : ''}
                
                ${summary.system ? `<div class="log-summary-item">
                    <span class="log-summary-label">Sistema:</span>
                    <span class="log-summary-value">${summary.system}</span>
                </div>` : ''}
                
                ${summary.ipPrivate ? `<div class="log-summary-item">
                    <span class="log-summary-label">IP Privado:</span>
                    <span class="log-summary-value">${summary.ipPrivate}</span>
                </div>` : ''}
                
                ${summary.ipPublic ? `<div class="log-summary-item">
                    <span class="log-summary-label">IP Público:</span>
                    <span class="log-summary-value">${summary.ipPublic}</span>
                </div>` : ''}
                
                <div class="log-summary-item">
                    <span class="log-summary-label">Usuário:</span>
                    <span class="log-summary-value">parceiro</span>
                </div>
                
                ${summary.parceiroPassword ? `<div class="log-summary-item">
                    <span class="log-summary-label">Senha Parceiro:</span>
                    <span class="log-summary-value">${summary.parceiroPassword}</span>
                </div>` : ''}
                
                <div class="log-summary-item">
                    <span class="log-summary-label">Usuário:</span>
                    <span class="log-summary-value">root</span>
                </div>
                
                ${summary.rootPassword ? `<div class="log-summary-item">
                    <span class="log-summary-label">Senha Root:</span>
                    <span class="log-summary-value">${summary.rootPassword}</span>
                </div>` : ''}
            </div>`;
            
            container.insertAdjacentHTML('afterbegin', summaryHtml);
        }
    }

    /**
     * Extrai informações de resumo do baseline
     * @param {string} output - Saída do Ansible
     * @return {Object} Informações extraídas
     */
    function extractBaselineSummary(output) {
        const summary = {};
        
        // Verificar se temos a seção de resumo
        const resumoMatch = output.match(/=========+\s*RESUMO[^=]*=========+\s*([\s\S]*?)(?:=========+|$)/);
        if (!resumoMatch) return summary;
        
        const resumoText = resumoMatch[1];
        
        // Extrair informações comuns
        const hostnameMatch = resumoText.match(/Hostname:\s*([^\n]+)/i);
        if (hostnameMatch) summary.hostname = hostnameMatch[1].trim();
        
        const systemMatch = resumoText.match(/Sistema:\s*([^\n]+)/i);
        if (systemMatch) summary.system = systemMatch[1].trim();
        
        const ipPrivateMatch = resumoText.match(/IP Privado:\s*([^\n]+)/i);
        if (ipPrivateMatch) summary.ipPrivate = ipPrivateMatch[1].trim();
        
        const ipPublicMatch = resumoText.match(/IP P[úu]blico:\s*([^\n]+)/i);
        if (ipPublicMatch) summary.ipPublic = ipPublicMatch[1].trim();
        
        // Extrair senhas
        const parceiroPasswordMatch = resumoText.match(/Senha parceiro:\s*([^\n]+)/i) || 
                                     resumoText.match(/senha do usuário parceiro[^:]*:\s*\[([^\]]+)\]/i);
        if (parceiroPasswordMatch) summary.parceiroPassword = parceiroPasswordMatch[1].trim();
        
        const rootPasswordMatch = resumoText.match(/Senha root:\s*([^\n]+)/i) || 
                                resumoText.match(/senha do usuário root[^:]*:\s*\[([^\]]+)\]/i);
        if (rootPasswordMatch) summary.rootPassword = rootPasswordMatch[1].trim();
        
        return summary;
    }

    /**
     * Copia o conteúdo do log de um host para a área de transferência
     * @param {string} hostname - Nome do host
     */
    function copyHostLog(hostname) {
        const output = STATE.outputCache.get(hostname);
        if (!output) {
            showMessage(`Não há dados disponíveis para copiar para ${hostname}`, 'warning');
            return;
        }
        
        // Extrair resumo
        const summary = extractBaselineSummary(output);
        
        // Criar texto do resumo
        let text = '=========== RESUMO DA CONFIGURAÇÃO ===========\n';
        
        if (summary.hostname) text += `Hostname: ${summary.hostname}\n`;
        if (summary.system) text += `Sistema: ${summary.system}\n`;
        if (summary.ipPrivate) text += `IP Privado: ${summary.ipPrivate}\n`;
        if (summary.ipPublic) text += `IP Público: ${summary.ipPublic}\n`;
        
        text += 'Usuário: parceiro\n';
        if (summary.parceiroPassword) text += `Senha: ${summary.parceiroPassword}\n`;
        
        text += 'Usuário: root\n';
        if (summary.rootPassword) text += `Senha: ${summary.rootPassword}\n`;
        
        text += '==========================================\n\n';
        
        // Adicionar o log completo
        text += output;
        
        // Copiar para a área de transferência
        navigator.clipboard.writeText(text)
            .then(() => {
                showMessage(`Log copiado para a área de transferência`, 'success');
                
                // Atualizar texto do botão
                const copyBtn = document.querySelector(`.log-copy[data-hostname="${hostname}"]`);
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copiado!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            })
            .catch(err => {
                console.error(`[Ansible Multi-Host] Erro ao copiar: ${err.message}`);
                showMessage(`Erro ao copiar log: ${err.message}`, 'error');
            });
    }

    /**
     * Busca a saída de um job específico
     * @param {string} jobId - ID do job
     * @return {Promise<Object>} Promise com dados do job
     */
    function fetchJobOutput(jobId) {
        // Verificar se temos no cache
        if (STATE.outputCache.has(jobId)) {
            const cachedData = STATE.outputCache.get(jobId);
            // Se o cache é recente (menos de 3 segundos), usar o cache
            if (Date.now() - cachedData.timestamp < 3000) {
                console.log(`[Ansible Multi-Host] Usando saída em cache para ${jobId}`);
                return Promise.resolve(cachedData);
            }
        }
        
        // Buscar da API
        return fetch(`/api/status/${jobId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                return response.json();
            })
            .then(data => {
                // Atualizar o cache
                STATE.outputCache.set(jobId, {
                    output: data.output,
                    status: data.status,
                    progress: data.progress,
                    timestamp: Date.now()
                });
                return data;
            });
    }

    /**
     * Determina quais jobs devem ser buscados para um host
     * @param {string} masterJobId - ID do job master
     * @param {Array<string>} hosts - Lista de hosts
     * @return {Array<Object>} Jobs a serem buscados
     */
    function getJobsToFetch(masterJobId, hosts) {
        const jobsToFetch = [];
        
        // 1. Verificar jobs já associados
        if (STATE.individualJobs.has(masterJobId)) {
            const individualJobs = STATE.individualJobs.get(masterJobId);
            console.log(`[Ansible Multi-Host] Usando ${individualJobs.length} jobs já associados ao master ${masterJobId}`);
            
            hosts.forEach(hostname => {
                const job = individualJobs.find(job => job.hostname === hostname);
                if (job) {
                    jobsToFetch.push({
                        jobId: job.jobId,
                        hostname: job.hostname
                    });
                }
            });
            
            // Se temos jobs para todos os hosts, retornar imediatamente
            if (jobsToFetch.length === hosts.length) {
                return jobsToFetch;
            }
        }
        
        // 2. Verificar na pilha de jobs recentes
        if (jobsToFetch.length < hosts.length) {
            const hostsToFind = hosts.filter(hostname => 
                !jobsToFetch.some(job => job.hostname === hostname)
            );
            
            // Encontrar jobs individuais recentes para estes hosts
            const recentJobs = STATE.jobCreationStack
                .filter(job => job.isSingleHost && hostsToFind.includes(job.hosts[0]))
                .sort((a, b) => b.timestamp - a.timestamp);
            
            // Pegar o job mais recente para cada host
            const hostJobMap = new Map();
            recentJobs.forEach(job => {
                const hostname = job.hosts[0];
                if (!hostJobMap.has(hostname)) {
                    hostJobMap.set(hostname, job.jobId);
                    
                    jobsToFetch.push({
                        jobId: job.jobId,
                        hostname: hostname
                    });
                    
                    // Associar ao master para uso futuro
                    if (!STATE.individualJobs.has(masterJobId)) {
                        STATE.individualJobs.set(masterJobId, []);
                    }
                    
                    STATE.individualJobs.get(masterJobId).push({
                        jobId: job.jobId,
                        hostname: hostname,
                        timestamp: Date.now()
                    });
                }
            });
        }
        
        // 3. Para hosts restantes, verificar no mapa de jobs para hosts
        if (jobsToFetch.length < hosts.length) {
            const hostsToFind = hosts.filter(hostname => 
                !jobsToFetch.some(job => job.hostname === hostname)
            );
            
            hostsToFind.forEach(hostname => {
                const jobId = STATE.jobHostMap.get(hostname);
                if (jobId) {
                    jobsToFetch.push({
                        jobId,
                        hostname
                    });
                    
                    // Associar ao master para uso futuro
                    if (!STATE.individualJobs.has(masterJobId)) {
                        STATE.individualJobs.set(masterJobId, []);
                    }
                    
                    STATE.individualJobs.get(masterJobId).push({
                        jobId,
                        hostname,
                        timestamp: Date.now()
                    });
                }
            });
        }
        
        return jobsToFetch;
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
     * Intercepta o toggle de saída para melhorar a exibição
     */
    function interceptOutputToggle() {
        console.log("[Ansible Multi-Host] Interceptando função toggleOutput");
        
        // Guardar a função original
        const originalToggleOutput = window.toggleOutput;
        
        // Nova função que vai substituir a original
        window.toggleOutput = function(button) {
            // Obter o card
            const card = button.closest('.execution-card');
            if (!card) {
                console.warn("[Ansible Multi-Host] Card não encontrado para o botão");
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Obter a div de saída
            const outputDiv = card.querySelector('.ansible-output');
            if (!outputDiv) {
                console.warn("[Ansible Multi-Host] Elemento de saída não encontrado");
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Verificar se é uma playbook de baseline
            const playbookName = card.getAttribute('data-playbook-name') || '';
            const isBaseline = isBaselinePlaybook(playbookName);
            const jobId = card.getAttribute('data-job-id');
            
            console.log(`[Ansible Multi-Host] Toggle output para card: ${jobId}, playbook: ${playbookName}, isBaseline: ${isBaseline}`);
            
            // Alternar visibilidade
            const isVisible = outputDiv.style.display === 'block';
            outputDiv.style.display = isVisible ? 'none' : 'block';
            
            // Atualizar o botão
            button.innerHTML = isVisible ? `
                Ver Mais
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            ` : `
                Ver Menos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M18 15l-6-6-6 6"/>
                </svg>
            `;
            
            // Se estamos mostrando a saída, buscar os dados mais recentes
            if (!isVisible) {
                // Para multi-host em baseline, precisamos tratar de forma especial
                if (isBaseline && isMultiHostCard(card)) {
                    console.log(`[Ansible Multi-Host] Detectada exibição de saída multi-host para job: ${jobId}`);
                    
                    // Exibir indicador de carregamento inicial
                    outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída de múltiplos hosts...</div>';
                    
                    // Capturar detalhes do card
                    const hosts = STATE.masterHostsMap.get(jobId) || Array.from(card.querySelectorAll('.host-details'))
                        .map(hostDetail => hostDetail.getAttribute('data-host'))
                        .filter(Boolean);
                    
                    // Buscar a saída combinada
                    fetchMultiHostOutput(jobId, card, outputDiv, hosts);
                    
                    // Configurar atualização automática
                    setupAutoRefresh(jobId, card, outputDiv, hosts);
                } else {
                    // Para casos normais, usar fluxo simplificado
                    console.log(`[Ansible Multi-Host] Buscando saída normal para job: ${jobId}`);
                    
                    // Mostrar indicador de carregamento
                    outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
                    
                    // Buscar a saída da API
                    fetchJobOutput(jobId)
                        .then(data => {
                            // Formatar e exibir a saída
                            if (isBaseline) {
                                outputDiv.innerHTML = formatOutput(data.output || '', true);
                            } else if (typeof window.formatAnsibleOutput === 'function') {
                                outputDiv.innerHTML = window.formatAnsibleOutput(data.output || '');
                            } else {
                                outputDiv.innerHTML = `<pre>${data.output || ''}</pre>`;
                            }
                            
                            // Rolar para o final
                            outputDiv.scrollTop = outputDiv.scrollHeight;
                            
                            // Atualizar progresso
                            if (data.progress !== undefined) {
                                updateCardProgress(jobId, data.progress, data.status);
                            }
                        })
                        .catch(error => {
                            console.error(`[Ansible Multi-Host] Erro ao buscar saída para job ${jobId}: ${error.message}`);
                            outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                        });
                }
            } else {
                // Se estamos ocultando, parar a atualização automática
                if (STATE.autoRefreshTimers.has(jobId)) {
                    clearInterval(STATE.autoRefreshTimers.get(jobId));
                    STATE.autoRefreshTimers.delete(jobId);
                }
            }
            
            return true;
        };
        
        console.log("[Ansible Multi-Host] Função toggleOutput interceptada com sucesso");
    }

    /**
     * Configura atualização automática da saída
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Card de execução
     * @param {HTMLElement} outputDiv - Elemento de saída
     * @param {Array<string>} hosts - Lista de hosts
     */
    function setupAutoRefresh(jobId, card, outputDiv, hosts) {
        // Parar timer anterior se existir
        if (STATE.autoRefreshTimers.has(jobId)) {
            clearInterval(STATE.autoRefreshTimers.get(jobId));
        }
        
        // Iniciar um novo timer para atualizar a saída periodicamente
        const intervalId = setInterval(() => {
            // Verificar se o card ou outputDiv ainda existe
            if (!document.body.contains(card) || !document.body.contains(outputDiv)) {
                clearInterval(intervalId);
                STATE.autoRefreshTimers.delete(jobId);
                return;
            }
            
            // Verificar se a saída está visível
            if (outputDiv.style.display !== 'block') {
                clearInterval(intervalId);
                STATE.autoRefreshTimers.delete(jobId);
                return;
            }
            
            // Buscar a saída atualizada
            fetchMultiHostOutput(jobId, card, outputDiv, hosts);
        }, 3000);
        
        // Registrar o timer
        STATE.autoRefreshTimers.set(jobId, intervalId);
    }

    /**
     * Busca a saída combinada para execução multi-host
     * @param {string} jobId - ID do job master
     * @param {HTMLElement} card - Card de execução
     * @param {HTMLElement} outputDiv - Elemento de saída
     * @param {Array<string>} hosts - Lista de hosts
     */
    function fetchMultiHostOutput(jobId, card, outputDiv, hosts) {
        // Obter jobs associados a este master
        const jobsToFetch = getJobsToFetch(jobId, hosts);
        
        // Se não encontramos jobs associados, exibir mensagem
        if (jobsToFetch.length === 0) {
            outputDiv.innerHTML = `
                <div class="ansible-warning">
                    Não foi possível encontrar os jobs individuais para os hosts.
                    <br>Tentando buscar a saída diretamente do job master...
                </div>
            `;
            
            // Tentar buscar a saída do job master como fallback
            fetchJobOutput(jobId)
                .then(data => {
                    outputDiv.innerHTML = formatOutput(data.output || '', true);
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                })
                .catch(error => {
                    outputDiv.innerHTML += `
                        <div class="ansible-error">
                            Erro ao buscar saída do job master: ${error.message}
                        </div>
                    `;
                });
            
            return;
        }
        
        // Criar promessas para buscar a saída de cada job
        const outputPromises = jobsToFetch.map(job => 
            fetchJobOutput(job.jobId)
                .then(data => ({ jobId: job.jobId, hostname: job.hostname, data }))
                .catch(error => {
                    console.error(`[Ansible Multi-Host] Erro ao buscar saída para job ${job.jobId}: ${error.message}`);
                    return { jobId: job.jobId, hostname: job.hostname, error };
                })
        );
        
        // Quando todas as promessas forem resolvidas
        Promise.all(outputPromises)
            .then(results => {
                // Combinar as saídas de todos os jobs
                let combinedOutput = `====== EXECUÇÃO DE BASELINE EM MÚLTIPLOS HOSTS (${hosts.length}) ======\n\n`;
                
                // Adicionar a saída de cada job
                results.forEach((result, index) => {
                    const hostname = result.hostname || `Host ${index + 1}`;
                    
                    if (result.error) {
                        combinedOutput += `\n==== HOST: ${hostname} (Job: ${result.jobId}) ====\n`;
                        combinedOutput += `Erro ao buscar saída: ${result.error.message}\n`;
                    } else if (result.data && result.data.output) {
                        combinedOutput += `\n==== HOST: ${hostname} (Job: ${result.jobId}) ====\n`;
                        combinedOutput += result.data.output + '\n';
                        
                        // Atualizar progresso individual
                        if (result.data.progress !== undefined) {
                            updateCardProgress(result.jobId, result.data.progress, result.data.status);
                        }
                    }
                });
                
                // Formatar e exibir a saída combinada
                outputDiv.innerHTML = formatOutput(combinedOutput, true);
                
// Rolar para o final (manter a posição se o usuário já rolou)
const userScrolled = outputDiv.scrollTop + outputDiv.clientHeight < outputDiv.scrollHeight;
if (!userScrolled) {
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Atualizar o progresso do master
updateMasterJobProgress(jobId);
})
.catch(error => {
console.error(`[Ansible Multi-Host] Erro ao processar saídas: ${error.message}`);
outputDiv.innerHTML = `<div class="ansible-error">Erro ao processar saídas: ${error.message}</div>`;
});
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
            
            // Verificar se é um card multi-host de baseline
            if (isBaselinePlaybook(playbookName) && isMultiHostCard(node)) {
                console.log(`[Ansible Multi-Host] Card multi-host de baseline detectado: ${jobId}`);
                
                // Iniciar progresso para este card
                initializeProgress(node, jobId);
                
                // Capturar hosts deste card
                const hosts = Array.from(node.querySelectorAll('.host-details'))
                    .map(hostDetail => hostDetail.getAttribute('data-host'))
                    .filter(Boolean);
                
                console.log(`[Ansible Multi-Host] Hosts no card ${jobId}: ${hosts.join(', ')}`);
                
                // Registrar no mapa de hosts
                STATE.masterHostsMap.set(jobId, hosts);
                
                // Abrir automaticamente a saída após um breve delay
                setTimeout(() => {
                    const toggleBtn = node.querySelector('.toggle-output-btn');
                    if (toggleBtn && document.body.contains(toggleBtn)) {
                        console.log(`[Ansible Multi-Host] Abrindo automaticamente a saída para ${jobId}`);
                        toggleBtn.click();
                    }
                }, 1000);
            } else {
                // Iniciar progresso para cards normais também
                initializeProgress(node, jobId);
            }
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
* Intercepta o monitoramento de execução para suportar múltiplos hosts
*/
function interceptExecutionMonitoring() {
console.log("[Ansible Multi-Host] Interceptando monitoramento de execução");

if (typeof window.monitorPlaybookExecution === 'function' && 
typeof window.originalMonitorPlaybookExecution === 'undefined') {

window.originalMonitorPlaybookExecution = window.monitorPlaybookExecution;

// Substituir a função
window.monitorPlaybookExecution = function(jobId, card) {
console.log(`[Ansible Multi-Host] Monitoramento interceptado: ${jobId}`);

// Chamar função original para manter compatibilidade
window.originalMonitorPlaybookExecution.apply(this, arguments);

// Verificar se é um job de baseline
const playbookName = card.getAttribute('data-playbook-name');
if (!playbookName || !isBaselinePlaybook(playbookName)) {
    return;
}

console.log(`[Ansible Multi-Host] Monitorando baseline: ${playbookName}`);

// Encontrar todos os hosts no card
const hostDetails = card.querySelectorAll('.host-details');
if (hostDetails.length > 0) {
    console.log(`[Ansible Multi-Host] ${hostDetails.length} hosts encontrados no card`);
    
    hostDetails.forEach(hostDetail => {
        const hostname = hostDetail.getAttribute('data-host');
        if (!hostname) return;
        
        console.log(`[Ansible Multi-Host] Configurando monitoramento para host: ${hostname}`);
        
        // Configurar monitoramento específico para este host
        setupHostMonitoring(jobId, hostname, card);
    });
}
};

console.log("[Ansible Multi-Host] Função de monitoramento substituída com sucesso");
} else {
console.warn("[Ansible Multi-Host] Função de monitoramento não encontrada ou já substituída");
}
}

/**
* Configura monitoramento específico para um host
* @param {string} jobId - ID do job
* @param {string} hostname - Nome do host
* @param {HTMLElement} card - Card de execução
*/
function setupHostMonitoring(jobId, hostname, card) {
console.log(`[Ansible Multi-Host] Configurando monitoramento para ${hostname} no job ${jobId}`);

// Verificar se já existe um log para este host
const safeLogId = generateSafeLogId(hostname);
let logContainer = card.querySelector(`#baseline-log-container-${safeLogId}`);

// Se não existir, criar
if (!logContainer) {
injectHostLog(card, jobId, hostname);
}

// Configurar intervalo para atualização periódica
const interval = setInterval(() => {
// Verificar se o card ainda existe no DOM
if (!document.body.contains(card)) {
console.log(`[Ansible Multi-Host] Card removido, parando monitoramento para ${hostname}`);
clearInterval(interval);
return;
}

// Atualizar status
fetch(`/api/status/${jobId}`)
.then(response => response.json())
.then(data => {
    // Verificar se o job ainda está em execução
    if (data.status !== 'running') {
        console.log(`[Ansible Multi-Host] Job concluído para ${hostname}, parando monitoramento`);
        clearInterval(interval);
    }
    
    // Atualizar log independentemente do status
    updateHostLog(jobId, hostname);
})
.catch(error => {
    console.error(`[Ansible Multi-Host] Erro ao buscar status para ${hostname}: ${error.message}`);
    // Não parar o intervalo em caso de erro de rede, pode ser temporário
});
}, 3000);

console.log(`[Ansible Multi-Host] Monitoramento configurado para ${hostname}`);
}

/**
* Configura rastreamento de criação de jobs
*/
function setupJobCreationTracking() {
console.log("[Ansible Multi-Host] Configurando rastreamento de criação de jobs");

// Interceptar fetch para detectar criação de jobs
const originalFetch = window.fetch;

window.fetch = function(url, options) {
// Detectar criação de job
if (url === '/api/run' && options?.method === 'POST') {
try {
    const data = JSON.parse(options.body);
    const playbookPath = data.playbook;
    const playbookName = playbookPath.split('/').pop();
    const hosts = data.hosts || [];
    
    console.log(`[Ansible Multi-Host] Detectada requisição para criar job: ${playbookName} para hosts: ${hosts.join(', ')}`);
    
    // Obter resultado original
    const result = originalFetch.apply(this, arguments);
    
    // Processar resposta para obter o job ID
    result.then(response => response.clone().json())
        .then(json => {
            if (json && json.job_id) {
                const jobId = json.job_id;
                
                // Adicionar à pilha de jobs recém-criados
                STATE.jobCreationStack.push({
                    jobId: jobId,
                    playbookName: playbookName,
                    hosts: hosts,
                    timestamp: Date.now(),
                    isSingleHost: hosts.length === 1,
                    extras: data.extra_vars || {}
                });
                
                console.log(`[Ansible Multi-Host] Job criado: ${jobId} para ${playbookName} (${hosts.join(', ')})`);
                
                // Limitar o tamanho da pilha
                if (STATE.jobCreationStack.length > 20) {
                    STATE.jobCreationStack.shift();
                }
                
                // Se for um job de host único parte de um multi-host
                if (hosts.length === 1 && data.extra_vars && 
                    (data.extra_vars.single_host_execution || 
                     data.extra_vars.host_specific)) {
                    
                    console.log(`[Ansible Multi-Host] Detectado job individual para host: ${hosts[0]}`);
                    
                    // Encontrar o job master recentemente criado
                    findAndAssociateMasterJob(jobId, hosts[0]);
                }
            }
        })
        .catch(error => {
            console.error(`[Ansible Multi-Host] Erro ao processar resposta de criação de job: ${error.message}`);
        });
    
    return result;
} catch (error) {
    console.error(`[Ansible Multi-Host] Erro ao processar requisição: ${error.message}`);
}
}

// Detectar solicitação de status
if (url.startsWith('/api/status/')) {
const jobId = url.split('/').pop();
STATE.outputRequests.set(jobId, Date.now());

// Processar resposta para capturar a saída
const result = originalFetch.apply(this, arguments);

result.then(response => response.clone().json())
    .then(data => {
        if (data) {
            // Armazenar no cache
            STATE.outputCache.set(jobId, {
                output: data.output || '',
                status: data.status || 'running',
                progress: data.progress || 0,
                timestamp: Date.now()
            });
            
            // Atualizar progresso para todos os cards relacionados
            if (data.progress !== undefined) {
                updateCardProgress(jobId, data.progress, data.status);
            }
            
            // Mantém apenas os 30 outputs mais recentes no cache
            if (STATE.outputCache.size > 30) {
                // Remover o mais antigo
                let oldestKey = null;
                let oldestTime = Infinity;
                
                for (const [key, value] of STATE.outputCache.entries()) {
                    if (value.timestamp < oldestTime) {
                        oldestTime = value.timestamp;
                        oldestKey = key;
                    }
                }
                
                if (oldestKey) {
                    STATE.outputCache.delete(oldestKey);
                }
            }
        }
    })
    .catch(error => {
        console.error(`[Ansible Multi-Host] Erro ao processar resposta de status: ${error.message}`);
    });

return result;
}

return originalFetch.apply(this, arguments);
};

console.log("[Ansible Multi-Host] Rastreamento de criação de jobs configurado");
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
* Preenche automaticamente os banners com senhas para facilitar testes
*/
function autoFillBaselineConfig() {
console.log("[Ansible Multi-Host] Preenchendo automaticamente configurações de baseline");

// Preencher banners existentes
STATE.hostBanners.forEach((banner, hostname) => {
const bannerId = generateBannerId(hostname);
const parceiroInput = banner.querySelector(`#${bannerId}-parceiro`);
const rootInput = banner.querySelector(`#${bannerId}-root`);

if (parceiroInput && !parceiroInput.value) {
parceiroInput.value = generatePassword();
}

if (rootInput && !rootInput.value) {
rootInput.value = generatePassword();
}
});

// Salvar todos os hosts que têm banners abertos
STATE.hostBanners.forEach((banner, hostname) => {
saveHostConfiguration(hostname, banner);
});

console.log("[Ansible Multi-Host] Configurações preenchidas automaticamente");
}

/**
* Inicializa o sistema de validação
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

// Interceptar criação de cards
interceptExecutionCards();

// Interceptar monitoramento
interceptExecutionMonitoring();

// Interceptar toggle de saída
interceptOutputToggle();

// Configurar rastreamento de criação de jobs
setupJobCreationTracking();

// Configurar observadores do DOM
setupObservers();

// Observar novos cards
observeNewCards();

// Primeira verificação de emblemas
setTimeout(refreshBaselineBadges, 1000);

// Definir intervalo para verificar badges periodicamente
setInterval(refreshBaselineBadges, 5000);

console.log("[Ansible Multi-Host] Sistema integrado inicializado com sucesso");
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



/**
 * Inicializa o sistema melhorado com as novas funcionalidades
 */
function initialize() {
    try {
        console.log("[Ansible Multi-Host] Iniciando sistema integrado com bloqueio de execução aprimorado");
        
        // Adicionar estilos CSS
        addStyles();
        addMessageStyles();
        
        // Carregar configurações salvas
        loadSavedConfigurations();
        
        // Interceptar execução de playbooks (versão modificada)
        interceptPlaybookExecution();
        
        // Substituir funções originais com nossas implementações melhoradas
        window.saveHostConfiguration = saveHostConfiguration;
        window.showConfigRequiredMessage = showConfigRequiredMessage;
        window.getUnconfiguredHosts = getUnconfiguredHosts;
        
        // Configurar outros componentes
        interceptExecutionCards();
        interceptExecutionMonitoring();
        interceptOutputToggle();
        setupJobCreationTracking();
        setupObservers();
        observeNewCards();
        
        // Primeira verificação de emblemas
        setTimeout(refreshBaselineBadges, 1000);
        
        // Definir intervalo para verificar badges periodicamente
        setInterval(refreshBaselineBadges, 5000);
        
        console.log("[Ansible Multi-Host] Sistema integrado inicializado com sucesso");
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


// Expor algumas funções para debug
window.baselineMultiHostFix = {
addConfigBanner,
toggleHostConfigBanner,
getHostConfig,
validateHostsConfiguration,
refreshBaselineBadges,
autoFillBaselineConfig,
formatOutput,
updateCardProgress,
fetchMultiHostOutput,
STATE,
CONFIG
};
})();
