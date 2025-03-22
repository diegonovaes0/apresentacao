/**
 * baseline-host-validation-fixed.js
 * Script para validação de dados obrigatórios para execução da playbook de baseline
 * 
 * Versão corrigida para resolver problemas de seletor inválido e validação de hosts já configurados
 * 
 * @version 1.1.0
 */

(function() {
    console.log("[Baseline Validation] Inicializando sistema de validação para baseline");

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
        outputCache: new Map()
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
        `;
        
        document.head.appendChild(style);
        console.log("[Baseline Validation] Estilos adicionados com sucesso");
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
        console.log(`[Baseline Validation] Adicionando banner para host: ${hostname}`);
        
        // Verificar se o banner já existe
        const existingBanner = document.getElementById(generateBannerId(hostname));
        if (existingBanner) {
            console.log(`[Baseline Validation] Banner já existe para ${hostname}`);
            return existingBanner;
        }
        
        // Encontrar o elemento do host
        const hostElement = findHostElement(hostname);
        if (!hostElement) {
            console.error(`[Baseline Validation] Elemento do host não encontrado para ${hostname}`);
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
        
        console.log(`[Baseline Validation] Banner adicionado para ${hostname}`);
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
        
        console.error(`[Baseline Validation] Host não encontrado: ${hostname}`);
        return null;
    }

    /**
     * Salva a configuração de um host
     * @param {string} hostname - Nome do host
     * @param {HTMLElement} banner - Elemento do banner
     */
    function saveHostConfiguration(hostname, banner) {
        console.log(`[Baseline Validation] Salvando configuração para: ${hostname}`);
        
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
            console.warn(`[Baseline Validation] Erro ao salvar no localStorage: ${e.message}`);
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
        
        console.log(`[Baseline Validation] Configuração salva para ${hostname}:`, config);
        
        // Remover botão de baseline forçado
        setTimeout(() => {
            refreshBaselineBadges();
        }, 500);
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
                console.log(`[Baseline Validation] Configuração carregada para ${hostname}`);
            });
            
            console.log(`[Baseline Validation] ${STATE.configuredHosts.size} configuração(ões) carregada(s)`);
        } catch (e) {
            console.error(`[Baseline Validation] Erro ao carregar configurações: ${e.message}`);
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
        
        console.log("[Baseline Validation] Adicionando emblemas de baseline a hosts selecionados");
        
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
        console.log(`[Baseline Validation] Alternando banner para ${hostname}`);
        
        // Verificar se o banner já existe
        if (STATE.hostBanners.has(hostname)) {
            // O banner existe, remover
            const banner = STATE.hostBanners.get(hostname);
            banner.closest('.host-baseline-container').remove();
            STATE.hostBanners.delete(hostname);
            console.log(`[Baseline Validation] Banner removido para ${hostname}`);
        } else {
            // Criar novo banner
            addConfigBanner(hostname);
        }
    }

    /**
     * Atualiza os emblemas de baseline em todos os hosts
     */
    function refreshBaselineBadges() {
        // Remover todos os emblemas
        document.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
        
        // Readicionar se necessário
        addBaselineBadgesToHosts();
    }

    /**
     * Valida se todos os hosts selecionados estão configurados para baseline
     * @return {boolean} Verdadeiro se todos os hosts estão configurados
     */
    function validateHostsConfiguration() {
        // Verificar se alguma playbook de baseline está selecionada
        if (!isAnyBaselineSelected()) return true;
        
        console.log("[Baseline Validation] Validando configuração de hosts para baseline");
        
        // Listar hosts selecionados
        const selectedHosts = [];
        document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
            const input = hostElement.querySelector('input[type="checkbox"]');
            if (input) {
                const hostname = input.getAttribute('data-hostname');
                if (hostname) selectedHosts.push(hostname);
            }
        });
        
        console.log(`[Baseline Validation] Hosts selecionados: ${selectedHosts.join(', ')}`);
        
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
         console.warn(`[Baseline Validation] Hosts não configurados: ${unconfiguredHosts.join(', ')}`);
         
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
     
     console.log("[Baseline Validation] Todos os hosts estão configurados corretamente");
     return true;
 }

 /**
  * Intercepta a execução da playbook para adicionar variáveis específicas
  */
 function interceptPlaybookExecution() {
     console.log("[Baseline Validation] Interceptando função de execução de playbooks");
     
     // Guardar referência à função original
     if (typeof window.originalExecuteSelectedPlaybooks === 'undefined' && 
         typeof window.executeSelectedPlaybooks === 'function') {
         window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
         
         // Substituir a função
         window.executeSelectedPlaybooks = function() {
             console.log("[Baseline Validation] Função de execução interceptada");
             
             // Verificar se estamos tentando executar uma playbook de baseline
             if (isAnyBaselineSelected()) {
                 console.log("[Baseline Validation] Baseline detectado, validando configurações");
                 
                 // Validar que todos os hosts estão configurados
                 if (!validateHostsConfiguration()) {
                     console.warn("[Baseline Validation] Execução bloqueada: hosts não configurados");
                     return; // Bloquear execução
                 }
             }
             
             // Se chegou aqui, a validação passou
             
             // Interceptar o fetch para adicionar as configurações
             const originalFetch = window.fetch;
             window.fetch = function(url, options) {
                 if (url === '/api/run' && options?.method === 'POST') {
                     try {
                         const data = JSON.parse(options.body);
                         const playbookPath = data.playbook;
                         
                         if (playbookPath && isBaselinePlaybook(playbookPath) && data.hosts) {
                             console.log(`[Baseline Validation] Adicionando configurações para execução de baseline: ${data.hosts.join(', ')}`);
                             
                             // Para múltiplos hosts, usamos estratégia diferente
                             if (data.hosts.length > 1) {
                                 console.log(`[Baseline Validation] Múltiplos hosts (${data.hosts.length}), executando sequencialmente`);
                                 
                                 // Executar sequencialmente um host por vez
                                 executeHostsSequentially(data.hosts, playbookPath);
                                 
                                 // Impedir execução do fetch original
                                 return new Promise(() => {}); // Retornar promise sem resolver
                             } 
                             // Para um único host
                             else if (data.hosts.length === 1) {
                                 const hostname = data.hosts[0];
                                 console.log(`[Baseline Validation] Adicionando configuração para host: ${hostname}`);
                                 
                                 // Recuperar configuração
                                 const config = getHostConfig(hostname);
                                 if (!config) {
                                     console.error(`[Baseline Validation] Configuração não encontrada para ${hostname}`);
                                     // Continuar mesmo assim
                                 } else {
                                     // Adicionar variáveis extras
                                     if (!data.extra_vars) data.extra_vars = {};
                                     
                                     data.extra_vars.new_hostname = config.hostname;
                                     data.extra_vars.parceiro_password = config.parceiroPassword;
                                     data.extra_vars.root_password = config.rootPassword;
                                     data.extra_vars.user_password = config.parceiroPassword; // Para Windows
                                     data.extra_vars.admin_password = config.rootPassword; // Para Windows
                                     
                                     console.log(`[Baseline Validation] Configuração adicionada para ${hostname}: ${config.hostname}`);
                                     
                                     // Atualizar o corpo da requisição
                                     options.body = JSON.stringify(data);
                                 }
                             }
                         }
                     } catch (error) {
                         console.error(`[Baseline Validation] Erro ao manipular requisição: ${error.message}`);
                     }
                 }
                 
                 // Executar o fetch original
                 return originalFetch.apply(this, arguments);
             };
             
             // Chamar a função original
             window.originalExecuteSelectedPlaybooks();
             
             // Restaurar o fetch original após um tempo
             setTimeout(() => {
                 window.fetch = originalFetch;
             }, 2000);
         };
         
         console.log("[Baseline Validation] Função de execução substituída com sucesso");
     } else {
         console.warn("[Baseline Validation] Função de execução não encontrada ou já substituída");
     }
 }

 /**
  * Executa hosts sequencialmente para baseline
  * @param {Array<string>} hosts - Lista de hostnames
  * @param {string} playbookPath - Caminho da playbook
  */
 function executeHostsSequentially(hosts, playbookPath) {
     if (!hosts || hosts.length === 0) {
         console.log("[Baseline Validation] Todos os hosts foram processados");
         return;
     }
     
     const hostname = hosts.shift(); // Remove e retorna o primeiro host
     console.log(`[Baseline Validation] Processando host: ${hostname}`);
     
     // Recuperar configuração do host
     const config = getHostConfig(hostname);
     if (!config) {
         console.error(`[Baseline Validation] Configuração não encontrada para ${hostname}`);
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
             admin_password: config.rootPassword // Para Windows
         }
     };
     
     console.log(`[Baseline Validation] Executando baseline para ${hostname} com configuração:`);
     console.log(`   - Hostname: ${config.hostname}`);
     console.log(`   - Senhas definidas: ${config.parceiroPassword.length} e ${config.rootPassword.length} caracteres`);
     
     fetch('/api/run', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
     })
     .then(response => response.json())
     .then(result => {
         console.log(`[Baseline Validation] Baseline iniciado para ${hostname}, Job ID: ${result.job_id}`);
         showMessage(`Baseline iniciado para ${hostname}`, 'success');
         
         // Mapear o job para este hostname específico
         STATE.jobHostMap.set(result.job_id, hostname);
         
         // Adicionar pequeno atraso antes de continuar com o próximo host
         setTimeout(() => executeHostsSequentially(hosts, playbookPath), 1000);
     })
     .catch(error => {
         console.error(`[Baseline Validation] Erro ao executar baseline para ${hostname}: ${error.message}`);
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
         console.error(`[Baseline Validation] Erro ao recuperar configuração: ${e.message}`);
         return null;
     }
 }

 /**
  * Intercepta a criação de cards de execução para adicionar logs específicos de hosts
  */
 function interceptExecutionCards() {
     console.log("[Baseline Validation] Interceptando criação de cards de execução");
     
     if (typeof window.createExecutionCard === 'function' && 
         typeof window.originalCreateExecutionCard === 'undefined') {
         
         window.originalCreateExecutionCard = window.createExecutionCard;
         
         // Substituir a função
         window.createExecutionCard = function(playbookName, hosts, jobId) {
             console.log(`[Baseline Validation] Card de execução interceptado: ${playbookName}, ${jobId}`);
             
             // Criar o card normalmente
             const card = window.originalCreateExecutionCard.apply(this, arguments);
             
             // Verificar se é uma playbook de baseline
             if (isBaselinePlaybook(playbookName)) {
                 console.log(`[Baseline Validation] Card de baseline detectado: ${playbookName}`);
                 
                 // Verificar se temos um ou múltiplos hosts
                 if (hosts.size === 1) {
                     const hostname = Array.from(hosts)[0];
                     console.log(`[Baseline Validation] Configurando card para único host: ${hostname}`);
                     
                     // Adicionar log específico para este host
                     injectHostLog(card, jobId, hostname);
                     
                     // Mapear o job para este hostname
                     STATE.jobHostMap.set(jobId, hostname);
                 } else {
                     console.log(`[Baseline Validation] Card para múltiplos hosts: ${Array.from(hosts).join(', ')}`);
                     
                     // Para múltiplos hosts, vamos adicionar um log para cada um
                     Array.from(hosts).forEach(hostname => {
                         // Adicionar log separado para cada host
                         injectHostLog(card, `${jobId}-${hostname}`, hostname);
                     });
                 }
             }
             
             return card;
         };
         
         console.log("[Baseline Validation] Função de criação de cards substituída com sucesso");
     } else {
         console.warn("[Baseline Validation] Função de criação de cards não encontrada ou já substituída");
     }
 }

 /**
  * Adiciona um log específico para um host em um card de execução
  * @param {HTMLElement} card - Card de execução
  * @param {string} jobId - ID do job
  * @param {string} hostname - Nome do host
  */
 function injectHostLog(card, jobId, hostname) {
     console.log(`[Baseline Validation] Injetando log para ${hostname} no job ${jobId}`);
     
     // Criar id seguro para seletor CSS
     const safeLogId = generateSafeLogId(hostname);
     
     // Verificar se o log já existe
     if (card.querySelector(`#${safeLogId}`)) {
         console.log(`[Baseline Validation] Log já existe para ${hostname}`);
         return;
     }
     
     // Encontrar o botão "Ver Mais" para posicionar nosso botão ao lado
     const toggleOutputBtn = card.querySelector('.toggle-output-btn');
     if (!toggleOutputBtn) {
         console.warn(`[Baseline Validation] Botão "Ver Mais" não encontrado no card`);
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
     
     console.log(`[Baseline Validation] Log injetado para ${hostname}`);
 }

 /**
  * Atualiza o log de um host específico
  * @param {string} jobId - ID do job
  * @param {string} hostname - Nome do host
  */
 function updateHostLog(jobId, hostname) {
     console.log(`[Baseline Validation] Atualizando log para ${hostname}, jobId: ${jobId}`);
     
     // Criar id seguro para seletor CSS
     const safeLogId = generateSafeLogId(hostname);
     
     // Buscar elemento do log
     const logContent = document.getElementById(`baseline-log-content-${safeLogId}`);
     if (!logContent) {
         console.warn(`[Baseline Validation] Container de log não encontrado para ${hostname}`);
         return;
     }
     
     // Mostrar indicador de carregamento
     logContent.innerHTML = `<div class="log-line">Carregando dados para ${hostname}...</div>`;
     
     // Obter o ID do job real (pode ser um jobId composto para múltiplos hosts)
     const realJobId = jobId.includes('-') ? jobId.split('-')[0] : jobId;
     
     // Buscar status do job
     fetch(`/api/status/${realJobId}`)
         .then(response => response.json())
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
             console.error(`[Baseline Validation] Erro ao atualizar log: ${error.message}`);
             logContent.innerHTML = `<div class="log-line" style="color: ${CONFIG.styles.errorColor}">Erro ao buscar dados: ${error.message}</div>`;
         });
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
     
     // Dividir por linhas
     const lines = output.split('\n');
     let html = '';
     
     // Extrair informações importantes
     const summary = extractBaselineSummary(output);
     
     // Se tivermos um resumo, mostrar primeiro
     if (summary && Object.keys(summary).length > 0) {
         html += `<div class="log-summary">`;
         
         if (summary.hostname) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">Hostname:</span>
                 <span class="log-summary-value">${summary.hostname}</span>
             </div>`;
         }
         
         if (summary.system) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">Sistema:</span>
                 <span class="log-summary-value">${summary.system}</span>
             </div>`;
         }
         
         if (summary.ipPrivate) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">IP Privado:</span>
                 <span class="log-summary-value">${summary.ipPrivate}</span>
             </div>`;
         }
         
         if (summary.ipPublic) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">IP Público:</span>
                 <span class="log-summary-value">${summary.ipPublic}</span>
             </div>`;
         }
         
         html += `<div class="log-summary-item">
             <span class="log-summary-label">Usuário:</span>
             <span class="log-summary-value">parceiro</span>
         </div>`;
         
         if (summary.parceiroPassword) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">Senha Parceiro:</span>
                 <span class="log-summary-value">${summary.parceiroPassword}</span>
             </div>`;
         }
         
         html += `<div class="log-summary-item">
             <span class="log-summary-label">Usuário:</span>
             <span class="log-summary-value">root</span>
         </div>`;
         
         if (summary.rootPassword) {
             html += `<div class="log-summary-item">
                 <span class="log-summary-label">Senha Root:</span>
                 <span class="log-summary-value">${summary.rootPassword}</span>
             </div>`;
         }
         
         html += `</div>`;
     }
     
     // Processar cada linha
     lines.forEach(line => {
         const trimmedLine = line.trim();
         if (!trimmedLine) return;
         
         // Formatar diferentes tipos de linhas
         if (trimmedLine.includes('TASK [')) {
             html += `<div class="log-line log-task">${trimmedLine}</div>`;
         } else if (trimmedLine.match(/^ok:/)) {
             html += `<div class="log-line log-ok">${trimmedLine}</div>`;
         } else if (trimmedLine.match(/^changed:/)) {
             html += `<div class="log-line log-changed">${trimmedLine}</div>`;
         } else if (trimmedLine.match(/^failed:/) || trimmedLine.includes('FAILED!')) {
             html += `<div class="log-line log-failed">${trimmedLine}</div>`;
         } else {
             html += `<div class="log-line">${trimmedLine}</div>`;
         }
     });
     
     container.innerHTML = html;
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
             console.error(`[Baseline Validation] Erro ao copiar: ${err.message}`);
             showMessage(`Erro ao copiar log: ${err.message}`, 'error');
         });
 }

 /**
  * Intercepta o monitoramento de execução para suportar múltiplos hosts
  */
 function interceptExecutionMonitoring() {
     console.log("[Baseline Validation] Interceptando monitoramento de execução");
     
     if (typeof window.monitorPlaybookExecution === 'function' && 
         typeof window.originalMonitorPlaybookExecution === 'undefined') {
         
         window.originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
         
         // Substituir a função
         window.monitorPlaybookExecution = function(jobId, card) {
             console.log(`[Baseline Validation] Monitoramento interceptado: ${jobId}`);
             
             // Chamar função original para manter compatibilidade
             window.originalMonitorPlaybookExecution.apply(this, arguments);
             
             // Verificar se é um job de baseline
             const playbookName = card.getAttribute('data-playbook-name');
             if (!playbookName || !isBaselinePlaybook(playbookName)) {
                 return;
             }
             
             console.log(`[Baseline Validation] Monitorando baseline: ${playbookName}`);
             
             // Encontrar todos os hosts no card
             const hostDetails = card.querySelectorAll('.host-details');
             if (hostDetails.length > 0) {
                 console.log(`[Baseline Validation] ${hostDetails.length} hosts encontrados no card`);
                 
                 hostDetails.forEach(hostDetail => {
                     const hostname = hostDetail.getAttribute('data-host');
                     if (!hostname) return;
                     
                     console.log(`[Baseline Validation] Configurando monitoramento para host: ${hostname}`);
                     
                     // Configurar monitoramento específico para este host
                     setupHostMonitoring(jobId, hostname, card);
                 });
             }
         };
         
         console.log("[Baseline Validation] Função de monitoramento substituída com sucesso");
     } else {
         console.warn("[Baseline Validation] Função de monitoramento não encontrada ou já substituída");
     }
 }

 /**
  * Configura monitoramento específico para um host
  * @param {string} jobId - ID do job
  * @param {string} hostname - Nome do host
  * @param {HTMLElement} card - Card de execução
  */
 function setupHostMonitoring(jobId, hostname, card) {
     console.log(`[Baseline Validation] Configurando monitoramento para ${hostname} no job ${jobId}`);
     
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
        console.log(`[Baseline Validation] Card removido, parando monitoramento para ${hostname}`);
        clearInterval(interval);
        return;
    }
    
    // Atualizar status
    fetch(`/api/status/${jobId}`)
        .then(response => response.json())
        .then(data => {
            // Verificar se o job ainda está em execução
            if (data.status !== 'running') {
                console.log(`[Baseline Validation] Job concluído para ${hostname}, parando monitoramento`);
                clearInterval(interval);
            }
            
            // Atualizar log independentemente do status
            updateHostLog(jobId, hostname);
        })
        .catch(error => {
            console.error(`[Baseline Validation] Erro ao buscar status para ${hostname}: ${error.message}`);
            // Não parar o intervalo em caso de erro de rede, pode ser temporário
        });
}, 3000);

console.log(`[Baseline Validation] Monitoramento configurado para ${hostname}`);
}

/**
* Configura observadores para detectar mudanças relevantes no DOM
*/
function setupObservers() {
console.log("[Baseline Validation] Configurando observadores de DOM");

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
            console.log("[Baseline Validation] Seleção de playbooks alterada");
            refreshBaselineBadges();
        }
    });
    
    playbookObserver.observe(playbooksContainer, { 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['class'] 
    });
    
    console.log("[Baseline Validation] Observador de seleção de playbooks configurado");
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
            console.log("[Baseline Validation] Seleção de hosts alterada");
            refreshBaselineBadges();
        }
    });
    
    hostObserver.observe(hostsContainer, { 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['class'] 
    });
    
    console.log("[Baseline Validation] Observador de seleção de hosts configurado");
}

// Observar novos elementos de container de execução
const runningPlaybooks = document.querySelector(CONFIG.selectors.runningPlaybooks);
if (runningPlaybooks) {
    const executionObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Verificar se foi adicionado um novo card de execução
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                        console.log("[Baseline Validation] Novo card de execução detectado");
                        
                        // Verificar se é um card de baseline
                        const playbookName = node.getAttribute('data-playbook-name');
                        if (playbookName && isBaselinePlaybook(playbookName)) {
                            console.log(`[Baseline Validation] Card de baseline detectado: ${playbookName}`);
                            
                            // Verificar se o botão de toggle de saída já existe
                            setTimeout(() => {
                                const toggleBtn = node.querySelector('.toggle-output-btn');
                                if (toggleBtn) {
                                    // Encontrar todos os hosts
                                    const hostDetails = node.querySelectorAll('.host-details');
                                    if (hostDetails.length > 0) {
                                        hostDetails.forEach(hostDetail => {
                                            const hostname = hostDetail.getAttribute('data-host');
                                            if (hostname) {
                                                // Obter o jobId do card
                                                const jobId = node.getAttribute('data-job-id');
                                                if (jobId) {
                                                    console.log(`[Baseline Validation] Injetando log para ${hostname} no novo card`);
                                                    injectHostLog(node, jobId, hostname);
                                                }
                                            }
                                        });
                                    }
                                }
                            }, 500);
                        }
                    }
                }
            }
        });
    });
    
    executionObserver.observe(runningPlaybooks, { childList: true });
    console.log("[Baseline Validation] Observador de cards de execução configurado");
}
}

/**
* Preenche automaticamente os banners com senhas para facilitar testes
*/
function autoFillBaselineConfig() {
console.log("[Baseline Validation] Preenchendo automaticamente configurações de baseline");

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

console.log("[Baseline Validation] Configurações preenchidas automaticamente");
}

/**
* Inicializa o sistema de validação
*/
function initialize() {
try {
    console.log("[Baseline Validation] Iniciando sistema de validação de baseline");
    
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
    
    // Configurar observadores do DOM
    setupObservers();
    
    // Primeira verificação de emblemas
    setTimeout(refreshBaselineBadges, 1000);
    
    // Definir intervalo para verificar badges periodicamente
    setInterval(refreshBaselineBadges, 5000);
    
    console.log("[Baseline Validation] Sistema de validação inicializado com sucesso");
} catch (error) {
    console.error(`[Baseline Validation] Erro ao inicializar: ${error.message}`, error);
}
}

// Inicializar quando o documento estiver pronto
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initialize);
} else {
initialize();
}

// Expor algumas funções para debug
window.baselineValidation = {
addConfigBanner,
toggleHostConfigBanner,
getHostConfig,
validateHostsConfiguration,
refreshBaselineBadges,
autoFillBaselineConfig,
STATE,
CONFIG
};
})();