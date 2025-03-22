/**
 * ansible-unified-multihost-fix.js
 * 
 * Solução unificada para:
 * - Corrigir a execução de baseline em múltiplos hosts
 * - Integrar as melhorias de interface das barras de progresso
 * - Normalizar o comportamento das playbooks baseline e outras
 * - Permitir configuração específica por host para baseline
 * - Corrigir a visualização de saída para múltiplos hosts
 * 
 * @version 3.0.0
 */

(function() {
    console.log("Inicializando solução unificada para Ansible com suporte a multi-host baseline");
    
    // Verificar se já inicializado
    if (window.multiHostFixInitialized) {
        console.log("Solução unificada já inicializada, ignorando");
        return;
    }
    
    // =======================================
    // CONFIGURAÇÕES
    // =======================================
    const CONFIG = {
        // Configurações de baseline
        baselineKeywords: ['baseline', 'configuracao-base', 'config-base'],
        
        // Seletores para elementos DOM importantes
        selectors: {
            runningPlaybooks: '#running-playbooks',
            hostsContainer: '#hosts-list',
            playbooksContainer: '#playbooks'
        },
        
        // Configurações de persistência
        persistenceKey: 'ansible_running_jobs',
        storageType: 'sessionStorage', // 'localStorage' ou 'sessionStorage'
        
        // Intervalos de tempo
        progressUpdateInterval: 2000,  // intervalo para atualizar o progresso (ms)
        persistenceInterval: 5000,     // intervalo para salvar o estado (ms)
        
        // Configurações visuais
        progressColors: {
            running: 'var(--accent-gold, #FFD600)',
            success: '#4CAF50',
            failed: '#F44336',
            cancelled: '#FF9800'
        },
        
        // Flags de depuração
        debug: true
    };
    
    // Estado para rastreamento de banners de baseline
    let state = {
        bannersAdded: new Set(),
        activeExecutions: new Map(),
        hostBanners: new Map(),
        multiHostJobs: new Map(),
        progressMap: new Map()  // Armazena o progresso máximo para cada job
    };
    
    // =======================================
    // UTILITÁRIOS
    // =======================================
    
    /**
     * Registra mensagens de log padronizadas no console
     * @param {string} message - Mensagem de log
     * @param {string} type - Tipo de log (info, warning, error)
     */
    function log(message, type = 'info') {
        if (!CONFIG.debug && type === 'info') return;
        
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[Ansible Fix ${timestamp}]`;
        
        switch (type) {
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * Verifica se uma playbook é do tipo baseline
     * @param {string} name - Nome da playbook
     * @return {boolean} - Verdadeiro se for baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return CONFIG.baselineKeywords.some(keyword => nameLower.includes(keyword));
    }
    
    /**
     * Gera um ID único para o banner baseado no hostname
     */
    function generateBannerId(hostname) {
        return `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
    
    /**
     * Verifica se um seletor é válido
     * @param {string} selector - O seletor a ser verificado
     * @return {boolean} Se o seletor é válido
     */
    function isValidSelector(selector) {
        try {
            document.querySelector(selector);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Espera até que um elemento exista no DOM
     * @param {string} selector - Seletor do elemento
     * @param {number} timeout - Tempo máximo de espera em ms
     * @return {Promise<Element>} Promise com o elemento
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Definir timeout
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout esperando por ${selector}`));
            }, timeout);
        });
    }
    
    /**
     * Gera um ID único que pode ser usado como seletor
     * @param {string} prefix - Prefixo para o ID
     * @return {string} ID único
     */
    function generateUniqueId(prefix = 'ansible-id-') {
        return prefix + Math.random().toString(36).substring(2, 11);
    }
    
    /**
     * Obtém um elemento de armazenamento (localStorage ou sessionStorage)
     * @return {Storage} O objeto de armazenamento
     */
    function getStorage() {
        return CONFIG.storageType === 'localStorage' ? localStorage : sessionStorage;
    }
    
    // =======================================
    // GERENCIADOR DE PROGRESSO
    // =======================================
    
    /**
     * Gerenciador de progresso que impede que a barra retroceda
     */
    const ProgressManager = {
        /**
         * Atualiza o progresso de um job
         * @param {string} jobId - ID do job
         * @param {number} progress - Valor do progresso (0-100)
         * @return {number} O valor de progresso final aplicado
         */
        updateProgress: function(jobId, progress) {
            // Progresso inválido, usar padrão
            if (typeof progress !== 'number' || isNaN(progress)) {
                progress = 0;
            }
            
            // Limitar entre 0 e 100
            progress = Math.max(0, Math.min(100, progress));
            
            // Verificar se já temos um valor máximo registrado
            if (state.progressMap.has(jobId)) {
                const currentMax = state.progressMap.get(jobId);
                
                // Só avançar, nunca retroceder
                if (progress > currentMax) {
                    state.progressMap.set(jobId, progress);
                    return progress;
                } else {
                    return currentMax;
                }
            } else {
                // Primeiro registro deste job
                state.progressMap.set(jobId, progress);
                return progress;
            }
        },
        
        /**
         * Completa o progresso de um job (100%)
         * @param {string} jobId - ID do job
         * @param {string} status - Status final ('success', 'failed', 'cancelled')
         */
        completeProgress: function(jobId, status) {
            state.progressMap.set(jobId, 100);
            
            // Atualizar a visualização
            const card = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
            if (card) {
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    
                    // Definir cor com base no status
                    if (status === 'completed' || status === 'success') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.success;
                    } else if (status === 'failed') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.failed;
                    } else if (status === 'cancelled') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.cancelled;
                    }
                }
            }
        },
        
        /**
         * Limpa o progresso registrado para um job
         * @param {string} jobId - ID do job
         */
        clearProgress: function(jobId) {
            state.progressMap.delete(jobId);
        },
        
        /**
         * Aplica o progresso à barra visual
         * @param {string} jobId - ID do job
         * @param {HTMLElement} progressBar - Elemento da barra de progresso
         * @param {number} rawProgress - Valor bruto do progresso
         */
        applyProgressToBar: function(jobId, progressBar, rawProgress) {
            if (!progressBar) return;
            
            // Obter o valor real a ser aplicado (que nunca retrocede)
            const realProgress = this.updateProgress(jobId, rawProgress);
            
            // Aplicar à barra
            progressBar.style.width = `${realProgress}%`;
            
            // Log apenas se houver diferença significativa
            if (Math.abs(realProgress - rawProgress) > 5) {
                log(`Progresso ajustado para job ${jobId}: ${rawProgress}% → ${realProgress}%`);
            }
        }
    };
    
    // =======================================
    // BASELINE BANNER
    // =======================================
    
    /**
     * Banner personalizado por host com o hostname já preenchido
     */
    function createBaselineBannerHTML(hostname) {
        return `
        <div id="${generateBannerId(hostname)}" class="baseline-banner">
            <div class="banner-header">
                <h3>Baseline para ${hostname}</h3>
                <button class="banner-close">✕</button>
            </div>
            <div class="banner-content">
                <label>Hostname<input id="baseline-hostname-${hostname}" value="${hostname}" placeholder="${hostname}"></label>
                <div class="password-group">
                    <label>Senha Parceiro<input id="baseline-parceiro-password-${hostname}" type="password" placeholder="***************"></label>
                    <button class="toggle-password" data-target="baseline-parceiro-password-${hostname}">👁</button>
                    <button class="copy-password" data-target="baseline-parceiro-password-${hostname}">📋</button>
                </div>
                <div class="password-group">
                    <label>Senha Root<input id="baseline-root-password-${hostname}" type="password" placeholder="***************"></label>
                    <button class="toggle-password" data-target="baseline-root-password-${hostname}">👁</button>
                    <button class="copy-password" data-target="baseline-root-password-${hostname}">📋</button>
                </div>
                <button class="baseline-generate-passwords" data-host="${hostname}">Gerar Senhas</button>
            </div>
        </div>
        `;
    }
    
    /**
     * Log simplificado com foco nas tarefas
     */
    function detailedLogHTML(hostname) {
        return `
        <div class="baseline-log-container" id="log-container-${hostname}">
            <div class="baseline-log" style="display: none;">
                <div class="log-header">
                    <span>baseline_universal.yml - ${hostname}</span>
                    <button class="log-copy">Copiar</button>
                </div>
                
                <div class="log-content">
                    <div class="log-summary-box">
                        <div class="summary-header">Resumo da Configuração</div>
                        <div class="summary-rows">
                            <div class="summary-row"><span>Hostname:</span> <span class="log-hostname">${hostname}</span></div>
                            <div class="summary-row"><span>Sistema:</span> <span class="log-system">-</span></div>
                            <div class="summary-row"><span>IP Privado:</span> <span class="log-ip-private">-</span></div>
                            <div class="summary-row"><span>IP Público:</span> <span class="log-ip-public">-</span></div>
                            <div class="summary-row"><span>Usuário:</span> <span>parceiro</span></div>
                            <div class="summary-row"><span>Senha:</span> <span class="log-parceiro-password">-</span></div>
                            <div class="summary-row"><span>Usuário:</span> <span>root</span></div>
                            <div class="summary-row"><span>Senha:</span> <span class="log-root-password">-</span></div>
                            <div class="summary-row status-row"><span>Status:</span> <span class="log-status">Iniciando...</span></div>
                        </div>
                    </div>
                    
                    <div class="log-tasks-box">
                        <div class="tasks-header">Tarefas</div>
                        <div class="tasks-section">
                            <div class="tasks-title">Tarefas Concluídas</div>
                            <div class="log-tasks-completed"></div>
                        </div>
                        <div class="tasks-section">
                            <div class="tasks-title">Tarefas Skipped</div>
                            <div class="log-tasks-skipped"></div>
                        </div>
                        <div class="tasks-section">
                            <div class="tasks-title">Tarefas Falhadas</div>
                            <div class="log-tasks-failed"></div>
                        </div>
                    </div>
                </div>
                
                <div class="log-footer">
                    <button class="log-copy-all">Copiar Toda Configuração</button>
                </div>
            </div>
        </div>
        `;
    }
    
    /**
     * Adiciona estilos globais necessários para o sistema
     */
    function injectStyles() {
        if (document.getElementById('baseline-styles')) return;
        const style = document.createElement('style');
        style.id = 'baseline-styles';
        style.textContent = `
            :root {
                --black-absolute: #000000;
                --black-rich: #030303;
                --black-elegant: #0A0A0A;
                --black-pearl: #121212;
                --black-smoke: #1A1A1A;
                --gray-dark: #2A2A2A;
                --accent-gold: #FFD600;
                --accent-gold-hover: #FFE033;
                --text-primary: #FFFFFF;
                --text-secondary: #B0B0B0;
                --submenu-hover: rgba(255, 214, 0, 0.05);
                --menu-hover: rgba(255, 214, 0, 0.1);
                --submenu-level-1: #2A2A2A;
                --submenu-level-2: #242424;
                --submenu-level-3: #1E1E1E;
                --shadow-gold: rgba(255, 214, 0, 0.15);
                --shadow-dark: rgba(0, 0, 0, 0.3);
                --transition-duration: 0.3s;
                --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Estilo para progresso */
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
                background-color: ${CONFIG.progressColors.running};
                border-radius: 2px;
                width: 0%;
                transition: width 0.3s ease, background-color 0.3s ease;
            }
            
            /* Estilos para baseline */
            .baseline-banner {
                background: var(--black-pearl);
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 6px;
                margin-bottom: 10px;
                font-family: monospace;
                display: block;
                border: 1px solid var(--gray-dark);
                box-shadow: 0 4px 12px var(--shadow-dark);
                animation: slideDown 0.3s ease;
                margin-top: 10px;
            }

            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .banner-header {
                background: var(--black-elegant);
                padding: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--gray-dark);
            }
            
            .banner-header h3 {
                margin: 0;
                color: var(--accent-gold);
                font-size: 14px;
            }
            
            .banner-close {
                background: none;
                border: none;
                color: #e06c75;
                cursor: pointer;
                font-size: 14px;
            }
            
            .banner-content {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .banner-content label {
                color: var(--text-primary);
                font-size: 12px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .banner-content input {
                background: var(--black-smoke);
                border: 1px solid var(--gray-dark);
                border-radius: 4px;
                padding: 5px;
                color: var(--text-primary);
                font-size: 12px;
            }
            
            .banner-content input::placeholder {
                color: var(--text-secondary);
                opacity: 0.5;
            }
            
            .password-group {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .password-group label { flex: 1; }
            
            .toggle-password, .copy-password {
                background: var(--gray-dark);
                border: none;
                border-radius: 3px;
                padding: 5px;
                color: var(--text-secondary);
                cursor: pointer;
                font-size: 12px;
                transition: var(--transition-duration) var(--transition-timing);
            }
            
            .toggle-password:hover, .copy-password:hover {
                background: var(--submenu-level-1);
                color: var(--text-primary);
            }
            
            .banner-content button.baseline-generate-passwords {
                background: var(--accent-gold);
                border: none;
                border-radius: 4px;
                padding: 5px;
                color: var(--black-elegant);
                font-size: 12px;
                cursor: pointer;
                font-weight: bold;
                transition: var(--transition-duration) var(--transition-timing);
            }
            
            .banner-content button.baseline-generate-passwords:hover {
                background: var(--accent-gold-hover);
            }
            
            .baseline-log-container {
                position: relative;
                width: 100%;
                margin-top: 10px;
            }
            
            /* Posição do banner após host */
            .host-baseline-container {
                margin-top: 10px;
                border-left: 3px solid var(--accent-gold);
                padding-left: 8px;
            }
            
            /* Estilo para o banner de host */
            .host-banner {
                position: relative;
            }
            
            .host-banner .baseline-trigger {
                position: absolute;
                top: 10px;
                right: 10px;
                background: var(--accent-gold);
                color: var(--black-rich);
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 10px;
                cursor: pointer;
                font-weight: bold;
                z-index: 5;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .host-banner:hover .baseline-trigger {
                opacity: 1;
            }
            
            /* Posicionar o botão de log ao lado do Ver Mais */
            .log-toggle {
                background: var(--accent-gold);
                border: none;
                border-radius: 3px;
                padding: 6px 12px;
                color: var(--black-rich);
                font-size: 12px;
                cursor: pointer;
                font-weight: bold;
                transition: var(--transition-duration) var(--transition-timing);
                margin-left: 8px;
                display: inline-block;
            }
            
            .log-toggle:hover {
                background: var(--accent-gold-hover);
            }
            
            /* Posição fixa para o botão de log */
            .execution-controls {
                position: relative;
                display: flex;
                align-items: center;
            }
            
            .baseline-log {
                background: var(--black-pearl);
                border-radius: 6px;
                padding: 0;
                font-family: monospace;
                font-size: 12px;
                width: 100%;
                max-height: 600px;
                overflow-y: auto;
                box-sizing: border-box;
                flex-direction: column;
                border: 1px solid var(--gray-dark);
                box-shadow: 0 4px 12px var(--shadow-dark);
                margin-top: 10px;
                display: none;
            }
            
            .log-header {
                background: var(--black-elegant);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 4px 4px 0 0;
                border-bottom: 1px solid var(--gray-dark);
            }
            
            .log-header span { 
                color: var(--accent-gold);
                font-weight: bold;
            }
            
            .log-copy {
                background: var(--gray-dark);
                border: none;
                border-radius: 3px;
                padding: 4px 8px;
                color: var(--text-primary);
                font-size: 11px;
                cursor: pointer;
                transition: var(--transition-duration) var(--transition-timing);
            }
            
            .log-copy:hover {
                background: var(--submenu-level-1);
            }
            
            .log-content {
                display: flex;
                padding: 10px;
                gap: 15px;
            }
            
            .log-summary-box {
                flex: 0 0 300px;
                background: var(--black-smoke);
                border-radius: 4px;
                padding: 10px;
                border: 1px solid var(--gray-dark);
            }
            
            .log-tasks-box {
                flex: 1;
                background: var(--black-smoke);
                border-radius: 4px;
                padding: 10px;
                border: 1px solid var(--gray-dark);
                max-height: 400px;
                overflow-y: auto;
            }
            
            .summary-header, .tasks-header {
                color: var(--accent-gold);
                font-size: 13px;
                font-weight: bold;
                margin-bottom: 8px;
                border-bottom: 1px solid var(--gray-dark);
                padding-bottom: 5px;
            }
            
            .summary-rows {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .summary-row {
                display: flex;
                align-items: flex-start;
            }
            
            .summary-row span:first-child {
                color: var(--text-secondary);
                font-size: 11px;
                flex: 0 0 90px;
            }
            
            .summary-row span:last-child {
                color: var(--text-primary);
                font-size: 12px;
                font-weight: bold;
                word-break: break-word;
                flex: 1;
            }
            
            .status-row {
                margin-top: 8px;
                border-top: 1px dashed var(--gray-dark);
                padding-top: 8px;
            }
            
            .tasks-section {
                margin-bottom: 15px;
            }
            
            .tasks-title {
                color: var(--accent-gold);
                font-size: 12px;
                border-bottom: 1px dashed var(--gray-dark);
                padding-bottom: 4px;
                margin-bottom: 6px;
            }
            
            .log-tasks-completed .task-item, 
            .log-tasks-skipped .task-item, 
            .log-tasks-failed .task-item {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                padding: 3px 0;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .log-tasks-completed .task-item {
                color: #98c379;
            }
            
            .log-tasks-skipped .task-item {
                color: var(--text-secondary);
            }
            
            .log-tasks-failed .task-item {
                color: #e06c75;
            }
            
            .task-status-icon {
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .task-name {
                flex: 1;
            }
            
            .log-footer {
                padding: 10px;
                background: var(--black-elegant);
                border-top: 1px solid var(--gray-dark);
                display: flex;
                justify-content: center;
            }
            
            .log-copy-all {
                background: var(--accent-gold);
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                color: var(--black-rich);
                font-size: 12px;
                cursor: pointer;
                font-weight: bold;
                transition: var(--transition-duration) var(--transition-timing);
            }
            
            .log-copy-all:hover {
                background: var(--accent-gold-hover);
            }
            
            /* Badge para indicar que há um banner de baseline disponível */
            .baseline-available-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: var(--accent-gold);
                color: var(--black-rich);
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                z-index: 10;
            }
            
            /* Estilo para execução */
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
            
            /* Animações */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* Animação de spinner */
            .task-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            @media (max-width: 768px) {
                .log-content {
                    flex-direction: column;
                }
                .log-summary-box, .log-tasks-box {
                    flex: 1;
                    width: 100%;
                }
            }

            /* Certificar que os cards estão na posição correta */
            #running-playbooks {
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .execution-card {
                background-color: var(--black-elegant, #0A0A0A);
                border-radius: 6px;
                padding: 15px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                position: relative;
                border: 1px solid var(--gray-dark, #2A2A2A);
                margin-bottom: 0;
transition: box-shadow 0.3s ease;
            }
            
            .execution-card:hover {
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
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

            /* Mensagens de execução */
            .execution-message {
                animation: fadeIn 0.3s ease-out forwards;
            }
            
            /* Estilo para saída formatada */
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

            /* Estilo para multi-host */
            .host-section-divider {
                border-top: 1px solid var(--gray-dark);
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
                color: var(--accent-gold);
                padding-top: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .host-label {
                display: inline-block;
                background: var(--black-elegant);
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
            }

            .host-progress {
                margin-left: auto;
                font-size: 11px;
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }

    // =======================================
    // UTILITÁRIOS PARA BASELINE
    // =======================================
    
    /**
     * Função para correção de textos duplicados
     */
    function fixSystemDuplication() {
        // Corrige textos duplicados de sistema no resumo
        setInterval(() => {
            document.querySelectorAll('.log-system, .log-hostname').forEach(element => {
                const text = element.textContent;
                
                // Corrige apenas se houver texto duplicado
                if (text && text.includes('Sistema:') && text.indexOf('Sistema:') !== text.lastIndexOf('Sistema:')) {
                    const cleanText = text.split('Sistema:')[0].trim();
                    element.textContent = cleanText;
                }
            });
        }, 2000);
    }
    
    /**
     * Função auxiliar para limpeza de valor de campo
     */
    function getCleanFieldValue(text, fieldType) {
        if (!text) return '';
        
        // Remove caracteres de escape e espaços extras
        let cleanText = text.replace(/\\n/g, ' ')
                          .replace(/\*\*/g, '')
                          .replace(/\n/g, ' ')
                          .trim();
        
        // Tratamento específico por tipo de campo
        switch (fieldType) {
            case 'hostname':
                // Pega apenas o nome do host, sem outras informações
                if (cleanText.includes('Sistema:')) {
                    cleanText = cleanText.split('Sistema:')[0].trim();
                }
                return cleanText;
                
            case 'system':
                // Pega apenas o sistema operacional
                if (cleanText.includes('IP:') || cleanText.includes('IP Privado:')) {
                    cleanText = cleanText.split(/IP:|IP Privado:/)[0].trim();
                }
                return cleanText;
                
            case 'ipPrivate':
                // Extrai apenas o endereço IP privado
                const privateIpMatch = cleanText.match(/((?:10|172\.(?:1[6-9]|2[0-9]|3[0-1])|192\.168)(?:\.[0-9]{1,3}){3})/);
                return privateIpMatch ? privateIpMatch[1] : cleanText;
                
            case 'ipPublic':
                // Extrai apenas o endereço IP público
                if (cleanText.includes('Usuário')) {
                    cleanText = cleanText.split('Usuário')[0].trim();
                }
                // Tenta encontrar um padrão de IP
                const ipMatch = cleanText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                return ipMatch ? ipMatch[1] : cleanText;
                
            case 'parceiroPassword':
                // Extrai apenas a senha do parceiro
                if (cleanText.includes('Senha root:')) {
                    cleanText = cleanText.split('Senha root:')[0].trim();
                }
                return cleanText;
                
            case 'rootPassword':
                // Extrai apenas a senha do root
                return cleanText.split(/\n|\\n/)[0].trim();
                
            default:
                return cleanText;
        }
    }
    
    // =======================================
    // FUNÇÕES DE BASELINE
    // =======================================
    
    /**
     * Encontra o banner do host pelo hostname
     */
    function findHostBanner(hostname) {
        const hostsContainer = document.querySelector(CONFIG.selectors.hostsContainer);
        if (!hostsContainer) return null;
        
        // Primeiro método: procurar pelo input com data-hostname
        const input = hostsContainer.querySelector(`input[data-hostname="${hostname}"]`);
        if (input) {
            return input.closest('.host-banner');
        }
        
        // Segundo método: procurar pelo h4 com o texto do hostname
        const headers = Array.from(hostsContainer.querySelectorAll('.host-banner h4'));
        for (const header of headers) {
            if (header.textContent.trim() === hostname) {
                return header.closest('.host-banner');
            }
        }
        
        return null;
    }
    
    /**
     * Configura eventos do banner
     */
    function setupBannerEvents(banner, hostname) {
        // Botão de fechar
        banner.querySelector('.banner-close').addEventListener('click', () => {
            banner.closest('.host-baseline-container').remove();
            state.bannersAdded.delete(hostname);
            state.hostBanners.delete(hostname);
        });
        
        // Botão de gerar senhas
        banner.querySelector('.baseline-generate-passwords').addEventListener('click', () => {
            const hostId = hostname;
            document.getElementById(`baseline-parceiro-password-${hostId}`).value = generatePassword();
            document.getElementById(`baseline-root-password-${hostId}`).value = generatePassword();
        });
        
        // Botões de mostrar/ocultar senha
        banner.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                target.type = target.type === 'password' ? 'text' : 'password';
                btn.textContent = target.type === 'password' ? '👁' : '👁‍🗨';
            });
        });
        
        // Botões de copiar senha
        banner.querySelectorAll('.copy-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                navigator.clipboard.writeText(target.value);
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = '📋', 1500);
            });
        });
    }
    
    /**
     * Cria o botões de baseline nos hosts
     */
    function addBaselineButtonsToHosts() {
        const hostsContainer = document.querySelector(CONFIG.selectors.hostsContainer);
        if (!hostsContainer) return;
        
        // Procura todos os hosts válidos
        const hostBanners = hostsContainer.querySelectorAll('.host-banner.valid');
        
        hostBanners.forEach(hostBanner => {
            // Verificar se já tem um botão de baseline
            if (hostBanner.querySelector('.baseline-trigger')) return;
            
            // Obter o hostname
            const hostname = hostBanner.querySelector('input[type="checkbox"]')?.dataset?.hostname;
            if (!hostname) return;
            
            // Criar botão de trigger para o baseline
            const triggerButton = document.createElement('button');
            triggerButton.className = 'baseline-trigger';
            triggerButton.textContent = 'Baseline';
            triggerButton.setAttribute('data-hostname', hostname);
            hostBanner.appendChild(triggerButton);
            
            // Adicionar evento de clique para mostrar o banner de baseline
            triggerButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBaselineBanner(hostname);
            });
        });
    }
    
    /**
     * Alternar visibilidade do banner de baseline
     */
    function toggleBaselineBanner(hostname) {
        const bannerId = generateBannerId(hostname);
        let banner = document.getElementById(bannerId);
        
        // Se o banner já existe, remover
        if (banner) {
            banner.closest('.host-baseline-container')?.remove();
            state.bannersAdded.delete(hostname);
            state.hostBanners.delete(hostname);
            return;
        }
        
        // Criar o container para o banner
        const container = document.createElement('div');
        container.className = 'host-baseline-container';
        container.innerHTML = createBaselineBannerHTML(hostname);
        
        // Encontrar o host para inserir o banner após ele
        const hostBanner = findHostBanner(hostname);
        if (!hostBanner) {
            log(`Host banner não encontrado para ${hostname}`, 'warn');
            return;
        }
        
        // Inserir após o host
        if (hostBanner.nextSibling) {
            hostBanner.parentNode.insertBefore(container, hostBanner.nextSibling);
        } else {
            hostBanner.parentNode.appendChild(container);
        }
        
        // Configurar eventos do banner
        banner = document.getElementById(bannerId);
        setupBannerEvents(banner, hostname);
        
        // Atualizar estado
        state.bannersAdded.add(hostname);
        state.hostBanners.set(hostname, banner);
    }
    
    /**
     * Gera uma senha aleatória para o baseline
     */
    function generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < 15; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    /**
     * Extrai informações do resumo
     */
    function extractSummaryInfo(output) {
        const info = {
            hostname: '',
            system: '',
            ipPublic: '',
            ipPrivate: '',
            parceiroPassword: '',
            rootPassword: ''
        };
    
        // Tenta encontrar o bloco de resumo da configuração
        const summaryMatch = output.match(/=========== RESUMO DA CONFIGURAÇÃO ===========\s*([\s\S]*?)={3,}/);
        let summaryData = '';
        
        if (summaryMatch) {
            summaryData = summaryMatch[1];
        } else {
            summaryData = output; // Usa todo o output se não encontrar o bloco específico
        }
        
        // Extrai o hostname
        const hostnameMatch = summaryData.match(/Hostname:\s*([^\n]+)/);
        if (hostnameMatch) {
            info.hostname = getCleanFieldValue(hostnameMatch[1], 'hostname');
        }
        
        // Extrai o sistema operacional
        const systemMatch = summaryData.match(/Sistema:\s*([^\n]+)/);
        if (systemMatch) {
            info.system = getCleanFieldValue(systemMatch[1], 'system');
        }
        
        // Extrai o IP privado (padrões comuns)
        const ipPrivatePatterns = [
            /IP\s+Privado:\s*([^\n]+)/i,
            /IP:\s*([^\n]+)/i,
            /((?:10|172\.(?:1[6-9]|2[0-9]|3[0-1])|192\.168)(?:\.[0-9]{1,3}){3})/
        ];
        
        for (const pattern of ipPrivatePatterns) {
            const match = summaryData.match(pattern);
            if (match && !match[1].includes('Público')) {
                info.ipPrivate = getCleanFieldValue(match[1], 'ipPrivate');
                break;
            }
        }
        
        // Extrai o IP público
        const ipPublicMatch = summaryData.match(/IP\s+Público:\s*([^\n]+)/i);
        if (ipPublicMatch) {
            info.ipPublic = getCleanFieldValue(ipPublicMatch[1], 'ipPublic');
        }
        
        // Extrai a senha do parceiro
        const parceiroPasswordPatterns = [
            /Senha\s+parceiro:\s*([^\n]+)/i,
            /A senha do usuário parceiro é:\s*\[([^\]]+)\]/i
        ];
        
        for (const pattern of parceiroPasswordPatterns) {
            const match = summaryData.match(pattern);
            if (match) {
                info.parceiroPassword = getCleanFieldValue(match[1], 'parceiroPassword');
                break;
            }
        }
        
        // Extrai a senha do root
        const rootPasswordPatterns = [
            /Senha\s+root:\s*([^\n]+)/i,
            /A senha do usuário root é:\s*\[([^\]]+)\]/i
        ];
        
        for (const pattern of rootPasswordPatterns) {
            const match = summaryData.match(pattern);
            if (match) {
                info.rootPassword = getCleanFieldValue(match[1], 'rootPassword');
                break;
            }
        }
        
        return info;
    }
    
    /**
     * Extrai tarefas do log
     */
    function extractTasks(output) {
        const tasks = {
            completed: [],
            skipped: [],
            failed: []
        };
        
        // Divide por linhas e processa cada uma
        const lines = output.split('\n');
        let currentTask = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Identifica linhas de tarefas
            const taskMatch = line.match(/TASK\s*\[([^\]]+)\]/i);
            if (taskMatch) {
                currentTask = taskMatch[1].trim();
                continue;
            }
            
            // Verifica o status da tarefa atual
            if (currentTask) {
                if (line.match(/^ok:/) || line.match(/^changed:/)) {
                    if (!tasks.completed.includes(currentTask) && 
                        !tasks.skipped.includes(currentTask) && 
                        !tasks.failed.includes(currentTask)) {
                        tasks.completed.push(currentTask);
                    }
                } else if (line.match(/^skipping:/) || line.includes('...skipping')) {
                    if (!tasks.completed.includes(currentTask) && 
                        !tasks.failed.includes(currentTask)) {
                        tasks.skipped.push(currentTask);
                    }
                } else if (line.match(/^failed:/) || line.match(/^fatal:/) || line.includes('FAILED!')) {
                    if (!tasks.completed.includes(currentTask)) {
                        tasks.failed.push(currentTask);
                    }
                }
            }
        }
        
        return tasks;
    }
    
    /**
     * Injetar log detalhado para baseline
     */
    function injectLog(card, jobId, hostname) {
        if (!card || card.querySelector(`#log-container-${hostname}`)) return;
        
        // Adicionar botão Log ao lado do Ver Mais
        const toggleOutputBtn = card.querySelector('.toggle-output-btn');
        if (toggleOutputBtn) {
            // Verificar se o container de controles já existe, ou criar um novo
            let controlsContainer;
            
            if (!toggleOutputBtn.parentNode.classList.contains('execution-controls')) {
                // Criar novo container para os controles
                controlsContainer = document.createElement('div');
                controlsContainer.className = 'execution-controls';
                toggleOutputBtn.parentNode.insertBefore(controlsContainer, toggleOutputBtn);
                
                // Mover o botão Ver Mais para o container
                controlsContainer.appendChild(toggleOutputBtn);
            } else {
                controlsContainer = toggleOutputBtn.parentNode;
            }
            
            // Adicionar o botão de log ao container
            const logToggle = document.createElement('button');
            logToggle.className = 'log-toggle';
            logToggle.textContent = `Log (${hostname})`;
            logToggle.setAttribute('data-hostname', hostname);
            controlsContainer.appendChild(logToggle);
            
            // Adicionar o container de log
            const logContainer = document.createElement('div');
            logContainer.innerHTML = detailedLogHTML(hostname);
            card.appendChild(logContainer);
            
            const log = logContainer.querySelector('.baseline-log');
            
            // Valores iniciais: tentar pegar as senhas do banner se existir
            const parceiroPassword = document.getElementById(`baseline-parceiro-password-${hostname}`)?.value || 'N/A';
            const rootPassword = document.getElementById(`baseline-root-password-${hostname}`)?.value || 'N/A';
            
            state.activeExecutions.set(jobId + '-' + hostname, {
                card,
                log,
                hostname,
                tasksCompleted: [],
                tasksSkipped: [],
                tasksFailed: [],
                system: '',
                parceiroPassword,
                rootPassword,
                ipPublic: 'N/A',
                ipPrivate: 'N/A',
                rawOutput: ''
            });
            
            logToggle.addEventListener('click', () => {
                const isVisible = log.style.display === 'flex';
                
                // Ocultar todos os outros logs primeiro
                card.querySelectorAll('.baseline-log').forEach(otherLog => {
                    if (otherLog !== log) {
                        otherLog.style.display = 'none';
                        const otherBtn = card.querySelector(`.log-toggle[data-hostname="${otherLog.closest('.baseline-log-container').id.replace('log-container-', '')}"]`);
                        if (otherBtn) {
                            const hostname = otherBtn.getAttribute('data-hostname');
                            otherBtn.textContent = `Log (${hostname})`;
                        }
                    }
                });
                
                // Então mostrar/ocultar o log atual
                log.style.display = isVisible ? 'none' : 'flex';
                logToggle.textContent = isVisible ? `Log (${hostname})` : `Esconder Log (${hostname})`;
                
                // Atualizar dados se estiver mostrando o log
                if (!isVisible) {
                    updateLog(jobId + '-' + hostname);
                }
            });
            
            setupLogEvents(log, jobId + '-' + hostname, hostname);
        }
    }
    
    /**
     * Configurar eventos do log
     */
    function setupLogEvents(log, jobId, hostname) {
        // Botão de copiar resumo
        log.querySelector('.log-copy').addEventListener('click', () => {
            const execution = state.activeExecutions.get(jobId);
            if (!execution) return;
            
            const text = `Hostname: ${execution.hostname}
Sistema: ${execution.system}
IP Privado: ${execution.ipPrivate}
IP Público: ${execution.ipPublic}
Usuário: parceiro
Senha: ${execution.parceiroPassword}
Usuário: root
Senha: ${execution.rootPassword}`;
            
            navigator.clipboard.writeText(text);
            const btn = log.querySelector('.log-copy');
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = 'Copiar', 1500);
        });
        
        // Botão de copiar tudo
        log.querySelector('.log-copy-all').addEventListener('click', () => {
            const execution = state.activeExecutions.get(jobId);
            if (!execution) return;
            
            const text = `=========== RESUMO DA CONFIGURAÇÃO ===========
Hostname: ${execution.hostname}
Sistema: ${execution.system}
IP Privado: ${execution.ipPrivate}
IP Público: ${execution.ipPublic}
Usuário: parceiro
Senha: ${execution.parceiroPassword}
Usuário: root
Senha: ${execution.rootPassword}
Status: ${log.querySelector('.log-status').textContent}
===============================================

Tarefas Concluídas:
${execution.tasksCompleted.map(task => `- ${task}`).join('\n')}

Tarefas Skipped:
${execution.tasksSkipped.map(task => `- ${task}`).join('\n')}

Tarefas Falhadas:
${execution.tasksFailed.map(task => `- ${task}`).join('\n')}`;
            
            navigator.clipboard.writeText(text);
            const btn = log.querySelector('.log-copy-all');
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = 'Copiar Toda Configuração', 1500);
        });
    }
    
    /**
     * Atualiza o log com dados mais recentes
     */
    function updateLog(jobId) {
        const execution = state.activeExecutions.get(jobId);
        if (!execution) return;
        
        // Extrair informações do resumo do output bruto
        const summaryInfo = extractSummaryInfo(execution.rawOutput);
        
        // Atualizar as informações de resumo
        if (summaryInfo.hostname) {
            execution.hostname = summaryInfo.hostname;
            execution.log.querySelector('.log-hostname').textContent = summaryInfo.hostname;
        }
        
        if (summaryInfo.system) {
            execution.system = summaryInfo.system;
            execution.log.querySelector('.log-system').textContent = summaryInfo.system;
        }
        
        if (summaryInfo.ipPrivate) {
            execution.ipPrivate = summaryInfo.ipPrivate;
            execution.log.querySelector('.log-ip-private').textContent = summaryInfo.ipPrivate;
        }
        
        if (summaryInfo.ipPublic) {
            execution.ipPublic = summaryInfo.ipPublic;
            execution.log.querySelector('.log-ip-public').textContent = summaryInfo.ipPublic;
        }
        
        if (summaryInfo.parceiroPassword) {
            execution.parceiroPassword = summaryInfo.parceiroPassword;
            execution.log.querySelector('.log-parceiro-password').textContent = summaryInfo.parceiroPassword;
        }
        
        if (summaryInfo.rootPassword) {
            execution.rootPassword = summaryInfo.rootPassword;
            execution.log.querySelector('.log-root-password').textContent = summaryInfo.rootPassword;
        }
        
        // Atualizar tarefas
        const tasks = extractTasks(execution.rawOutput);
        
        // Limpar containers
        const completedContainer = execution.log.querySelector('.log-tasks-completed');
        const skippedContainer = execution.log.querySelector('.log-tasks-skipped');
        const failedContainer = execution.log.querySelector('.log-tasks-failed');
        
        completedContainer.innerHTML = '';
        skippedContainer.innerHTML = '';
        failedContainer.innerHTML = '';
        
        // Atualizar tarefas concluídas
        execution.tasksCompleted = tasks.completed;
        tasks.completed.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <span class="task-status-icon">✓</span>
                <span class="task-name">${task}</span>
            `;
            completedContainer.appendChild(taskElement);
        });
        
        // Atualizar tarefas skipped
        execution.tasksSkipped = tasks.skipped;
        tasks.skipped.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <span class="task-status-icon">↷</span>
                <span class="task-name">${task}</span>
            `;
            skippedContainer.appendChild(taskElement);
        });
        
        // Atualizar tarefas falhadas
        execution.tasksFailed = tasks.failed;
        tasks.failed.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <span class="task-status-icon">✗</span>
                <span class="task-name">${task}</span>
            `;
            failedContainer.appendChild(taskElement);
        });
    }
    
    // =======================================
    // CORREÇÕES PARA PROGRESSO E BARRA
    // =======================================
    
    /**
     * Cria ou encontra a barra de progresso em um card
     * @param {HTMLElement} card - O card de execução
     * @return {HTMLElement} A barra de progresso
     */
    function ensureProgressBar(card) {
        // Verificar se já existe uma barra de progresso
        let progressBar = card.querySelector('.progress-bar');
        if (progressBar) return progressBar;
        
        // Verificar se existe um container, mas sem a barra
        let progressContainer = card.querySelector('.progress-container');
        
        // Se não existe o container, criar
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            
            // Encontrar o local para inserir
            const hostInfo = card.querySelector('.host-info');
            const outputDiv = card.querySelector('.ansible-output');
            
            if (hostInfo && hostInfo.nextSibling) {
                card.insertBefore(progressContainer, hostInfo.nextSibling);
            } else if (outputDiv) {
                card.insertBefore(progressContainer, outputDiv);
            } else {
                // Último recurso: inserir antes dos botões
                const buttonGroup = card.querySelector('.button-group');
                if (buttonGroup) {
                    card.insertBefore(progressContainer, buttonGroup);
                } else {
                    // Não conseguiu encontrar um local adequado, adicionar ao fim
                    card.appendChild(progressContainer);
                }
            }
        }
        
        // Criar a barra de progresso
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        progressContainer.appendChild(progressBar);
        return progressBar;
    }
    
    /**
     * Formata a saída com indicadores de host para execuções multi-host
     * @param {string} output - Saída bruta do Ansible
     * @param {string} hostname - Nome do host para filtrar a saída
     * @return {string} Saída formatada
     */
    function formatBaselineOutput(output, hostname = null) {
        if (!output) return '<em>Aguardando saída...</em>';
        
        // Formatação específica para um host
        if (hostname) {
            let hostOutput = '';
            let inHostSection = false;
            
            // Divide por linhas e filtra apenas as relevantes para este host
            const lines = output.split('\n');
            for (const line of lines) {
                // Marcar início de seção do host
                if (line.includes(`==== HOST`) && line.includes(hostname)) {
                    inHostSection = true;
                    hostOutput += `<div class="host-section-divider"><span class="host-label">${hostname}</span></div>\n`;
                    continue;
                }
                
                // Marcar fim de seção do host
                if (inHostSection && line.includes(`==== HOST`) && !line.includes(hostname)) {
                    inHostSection = false;
                    continue;
                }
                
                // Filtrar linhas para o host específico
                if (inHostSection || 
                    line.includes(`[${hostname}]`) || 
                    (line.match(/^ok:/) && line.includes(hostname)) ||
                    (line.match(/^changed:/) && line.includes(hostname)) ||
                    (line.match(/^failed:/) && line.includes(hostname)) ||
                    (line.match(/^skipping:/) && line.includes(hostname)) ||
                    line.includes(`PLAY [${hostname}]`) ||
                    line.includes(`TASK`) ||
                    line.includes(`PLAY RECAP`) && line.includes(hostname)) {
                    
                    // Formatação de linha específica
                    let formattedLine = line;
                    
                    if (line.includes(`PLAY `)) {
                        formattedLine = `<div class="ansible-play-header">${line}</div>`;
                    } else if (line.includes(`TASK `)) {
                        formattedLine = `<div class="ansible-task-header">${line}</div>`;
                    } else if (line.match(/^ok:/)) {
                        formattedLine = `<div class="ansible-ok">${line}</div>`;
                    } else if (line.match(/^changed:/)) {
                        formattedLine = `<div class="ansible-changed">${line}</div>`;
                    } else if (line.match(/^failed:/)) {
                        formattedLine = `<div class="ansible-failed">${line}</div>`;
                    } else if (line.match(/^skipping:/)) {
                        formattedLine = `<div class="ansible-skipped">${formattedLine = `<div class="ansible-skipped">${line}</div>`;
                        } else if (line.match(/PLAY RECAP/)) {
                            formattedLine = `<div class="ansible-recap-header">${line}</div>`;
                        } else {
                            formattedLine = line;
                        }
                        
                        hostOutput += formattedLine + '\n';
                    }
                }
                
                // Se não encontrou nenhuma saída para o host, exibir mensagem
                if (!hostOutput) {
                    hostOutput = `<div class="ansible-info">Aguardando saída para o host ${hostname}...</div>`;
                }
                
                return hostOutput;
            }
            
            // Formatar saída com cores e estrutura para saída completa
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
            formatted = formatted.replace(/==== HOST (\d+)\/(\d+): ([^=]+) ====/g, 
                '<div class="host-section-divider"><span class="host-label">$3</span><span class="host-progress">Host $1 de $2</span></div>');
            
            // Adicionar estilos inline para garantir que funcionem
            formatted = `
            <div class="ansible-formatted-output">
                <style>
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
                </style>
                ${formatted}
            </div>`;
            
            return formatted;
        }
        
        /**
         * Intercepta a função toggleOutput para melhorar a visualização da saída
         */
        function fixToggleOutputFunction() {
            // Verificar se a função existe e ainda não foi interceptada
            if (typeof window.toggleOutputOriginal === 'undefined' && 
                typeof window.toggleOutput === 'function') {
                
                // Guardar a função original
                window.toggleOutputOriginal = window.toggleOutput;
                
                // Substituir pela versão melhorada
                window.toggleOutput = function(button) {
                    try {
                        // Obter o card
                        const card = button.closest('.execution-card');
                        if (!card) {
                            log("Card não encontrado para o botão", 'warn');
                            return window.toggleOutputOriginal(button);
                        }
                        
                        // Obter a div de saída
                        const outputDiv = card.querySelector('.ansible-output');
                        if (!outputDiv) {
                            log("Elemento de saída não encontrado", 'warn');
                            return window.toggleOutputOriginal(button);
                        }
                        
                        // Verificar se é uma playbook de baseline
                        const playbookName = card.getAttribute('data-playbook-name') || '';
                        const isBaseline = isBaselinePlaybook(playbookName);
                        const jobId = card.getAttribute('data-job-id');
                        
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
                            // Mostrar indicador de carregamento
                            outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
                            
                            // Buscar dados atualizados
                            fetch(`/api/status/${jobId}`)
                                .then(response => {
                                    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                                    return response.json();
                                })
                                .then(data => {
                                    // Formatar e exibir a saída
                                    if (isBaseline) {
                                        // Se tem hosts selecionados e esta é uma execução multi-host
                                        const selectedHosts = Array.from(selectedHosts || []);
                                        if (selectedHosts.length > 1 && state.multiHostJobs.has(jobId)) {
                                            // Obter o hostname específico do log de saída
                                            const hostSpecificOutput = formatBaselineOutput(data.output || '', null);
                                            outputDiv.innerHTML = hostSpecificOutput;
                                        } else {
                                            outputDiv.innerHTML = formatBaselineOutput(data.output || '');
                                        }
                                    } else if (typeof window.formatAnsibleOutput === 'function') {
                                        outputDiv.innerHTML = window.formatAnsibleOutput(data.output || '');
                                    } else {
                                        outputDiv.innerHTML = `<pre>${data.output || ''}</pre>`;
                                    }
                                    
                                    // Rolar para o final
                                    outputDiv.scrollTop = outputDiv.scrollHeight;
                                    
                                    // Salvar o estado para persistência
                                    if (typeof saveRunningJobsState === 'function') {
                                        saveRunningJobsState();
                                    }
                                })
                                .catch(error => {
                                    log(`Erro ao buscar saída para job ${jobId}: ${error.message}`, 'error');
                                    outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                                });
                        } else {
                            // Salvar o estado para persistência se estamos ocultando
                            if (typeof saveRunningJobsState === 'function') {
                                saveRunningJobsState();
                            }
                        }
                        
                        return true;
                    } catch (error) {
                        log(`Erro ao alternar saída: ${error.message}`, 'error');
                        return window.toggleOutputOriginal(button);
                    }
                };
                
                log("Função toggleOutput melhorada para exibição de saída");
            }
        }
        
        /**
         * Corrige a função de execução para tratar corretamente baseline com múltiplos hosts
         */
        function fixExecuteFunction() {
            // Verificar se a função existe e ainda não foi interceptada
            if (typeof window.executeSelectedPlaybooksOriginal === 'undefined' && 
                typeof window.executeSelectedPlaybooks === 'function') {
                
                // Guardar a função original
                window.executeSelectedPlaybooksOriginal = window.executeSelectedPlaybooks;
                
                // Substituir pela versão melhorada
                window.executeSelectedPlaybooks = function() {
                    log("Função executeSelectedPlaybooks interceptada para melhorias");
                    
                    try {
                        // Obter playbooks e hosts selecionados
                        const selectedPlaybooks = getSelectedPlaybooks();
                        const selectedHosts = getSelectedHosts();
                        
                        // Verificar se tem baseline selecionado
                        const baselinePlaybooks = selectedPlaybooks.filter(pb => isBaselinePlaybook(pb.name));
                        const hasBaseline = baselinePlaybooks.length > 0;
                        const multipleHosts = selectedHosts.length > 1;
                        
                        log(`Selecionado: ${selectedPlaybooks.length} playbooks, ${selectedHosts.length} hosts. Baseline: ${hasBaseline}`);
                        
                        // CASO CHAVE: Baseline com múltiplos hosts
                        if (hasBaseline && multipleHosts) {
                            log(`Detectada execução de baseline com múltiplos hosts (${selectedHosts.length})`);
                            return handleMultiHostBaseline(baselinePlaybooks, selectedHosts);
                        }
                        
                        // Para outros casos, usar a função original
                        return window.executeSelectedPlaybooksOriginal();
                    } catch (error) {
                        log(`Erro ao executar playbooks: ${error.message}`, 'error');
                        // Em caso de erro, usar a função original
                        return window.executeSelectedPlaybooksOriginal();
                    }
                };
                
                log("Função executeSelectedPlaybooks melhorada para suporte a baseline multi-host");
            }
        }
        
        /**
         * Trata a execução de baseline em múltiplos hosts
         * @param {Array} playbooks - Array de objetos de playbook
         * @param {Array} hosts - Array de hostnames
         */
        function handleMultiHostBaseline(playbooks, hosts) {
            const playbook = playbooks[0]; // Pegar a primeira playbook baseline
            const playbookPath = playbook.path;
            const playbookName = playbook.name;
            
            log(`Preparando execução multi-host para baseline: ${playbookName}`);
            
            // Criar um card para todos os hosts
            const executionContainer = document.querySelector(CONFIG.selectors.runningPlaybooks);
            if (!executionContainer) {
                log('Container de execução não encontrado', 'error');
                return;
            }
            
            // Gerar um job ID único para todo o conjunto
            const masterJobId = `baseline_multihost_${Date.now()}`;
            
            // Coletar configurações específicas para cada host
            const hostsConfig = {};
            
            // Para cada host, verificar se tem configuração específica
            hosts.forEach(hostname => {
                // Verificar se tem banner para este host
                const bannerId = generateBannerId(hostname);
                const banner = document.getElementById(bannerId);
                
                if (banner) {
                    // Extrair dados do banner
                    const hostConfig = {
                        new_hostname: document.getElementById(`baseline-hostname-${hostname}`)?.value || hostname,
                        parceiro_password: document.getElementById(`baseline-parceiro-password-${hostname}`)?.value || '',
                        root_password: document.getElementById(`baseline-root-password-${hostname}`)?.value || ''
                    };
                    
                    hostsConfig[hostname] = hostConfig;
                    log(`Configuração encontrada para host ${hostname}`);
                } else {
                    // Configuração padrão
                    hostsConfig[hostname] = {
                        new_hostname: hostname
                    };
                }
            });
            
            // Criar um card único para toda a execução
            const card = createMultiHostExecutionCard(playbookName, hosts, masterJobId);
            executionContainer.insertBefore(card, executionContainer.firstChild);
            
            // Injetar logs detalhados para cada host
            hosts.forEach(hostname => {
                injectLog(card, masterJobId, hostname);
            });
            
            // Registrar no mapa de jobs multi-host
            state.multiHostJobs.set(masterJobId, {
                playbook: playbookName,
                playbookPath,
                hosts,
                status: 'running',
                hostsConfig,
                startTime: new Date(),
                progress: 0
            });
            
            // Executar a chamada à API para cada host individualmente
            executeMultiHostBaseline(playbookPath, hosts, hostsConfig, masterJobId, card);
            
            return true;
        }
        
        /**
         * Executa baseline com múltiplos hosts individualmente
         * @param {string} playbookPath - Caminho do playbook
         * @param {Array} hosts - Array de hosts
         * @param {Object} hostsConfig - Configurações específicas por host
         * @param {string} masterJobId - ID do job mestre
         * @param {HTMLElement} masterCard - Card mestre da execução
         */
        function executeMultiHostBaseline(playbookPath, hosts, hostsConfig, masterJobId, masterCard) {
            // Inicializar saída no card
            const outputDiv = masterCard.querySelector('.ansible-output');
            if (outputDiv) {
                outputDiv.innerHTML = `<div>==== EXECUTANDO BASELINE EM MÚLTIPLOS HOSTS (${hosts.length}) ====</div>\n\n`;
            }
            
            // Criar contador para controlar o fluxo e saber quando todos terminaram
            let completedHosts = 0;
            const totalHosts = hosts.length;
            
            // Para cada host, executar o baseline
            hosts.forEach((hostname, index) => {
                const hostConfig = hostsConfig[hostname] || {};
                
                // Preparar extra_vars
                const extra_vars = {
                    ...hostConfig,
                    host_specific: hostname,
                    single_host_execution: true,
                    // Não é mais necessário hosts_config
                };
                
                // Preparar payload para API
                const payload = {
                    playbook: playbookPath,
                    hosts: [hostname],
                    extra_vars
                };
                
                log(`Executando baseline para host ${hostname} (${index + 1}/${totalHosts})`);
                
                // Adicionar marcador à saída
                updateMasterOutput(masterCard, masterJobId, 
                    `\n\n==== HOST ${index + 1}/${totalHosts}: ${hostname} ====\n`);
                
                // Atualizar progresso
                updateMasterProgress(masterCard, masterJobId, (index * 95 / totalHosts));
                
                // Executar requisição para o backend
                fetch('/api/run', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                })
                .then(response => response.json())
                .then(result => {
                    const jobId = result.job_id;
                    log(`Baseline iniciado para host ${hostname}: job ${jobId}`);
                    
                    // Criar um intervalo para monitorar este job específico
                    const intervalId = setInterval(() => {
                        fetch(`/api/status/${jobId}`)
                            .then(response => response.json())
                            .then(statusData => {
                                // Atualizar a saída mestre com a saída deste job
                                if (statusData.output) {
                                    // Adicionar saída ao log de execução deste host
                                    const execution = state.activeExecutions.get(masterJobId + '-' + hostname);
                                    if (execution) {
                                        execution.rawOutput = statusData.output;
                                        updateLog(masterJobId + '-' + hostname);
                                    }
                                    
                                    // Adicionar saída ao output do card mestre
                                    updateMasterOutput(masterCard, masterJobId, 
                                        formatOutputWithHostPrefix(statusData.output, hostname));
                                }
                                
                                // Verificar se o job terminou
                                if (statusData.status !== 'running') {
                                    clearInterval(intervalId);
                                    completedHosts++;
                                    
                                    // Atualizar progresso com base nos hosts concluídos
                                    const progress = Math.min(95, (completedHosts / totalHosts) * 100);
                                    updateMasterProgress(masterCard, masterJobId, progress);
                                    
                                    // Definir status final quando todos os hosts terminarem
                                    if (completedHosts >= totalHosts) {
                                        const multiHostJob = state.multiHostJobs.get(masterJobId);
                                        if (multiHostJob) {
                                            multiHostJob.status = 'completed';
                                            multiHostJob.progress = 100;
                                        }
                                        
                                        // Atualizar o card para o status final
                                        updateMasterProgress(masterCard, masterJobId, 100);
                                        updateMasterStatus(masterCard, 'completed');
                                        
                                        // Adicionar resumo final
                                        updateMasterOutput(masterCard, masterJobId, 
                                            `\n\n==== BASELINE CONCLUÍDO PARA TODOS OS HOSTS (${hosts.length}) ====\n`);
                                    }
                                }
                            })
                            .catch(error => {
                                log(`Erro ao monitorar job ${jobId} para host ${hostname}: ${error.message}`, 'error');
                            });
                    }, CONFIG.progressUpdateInterval);
                })
                .catch(error => {
                    log(`Erro ao iniciar baseline para host ${hostname}: ${error.message}`, 'error');
                    
                    // Atualizar saída para mostrar o erro
                    updateMasterOutput(masterCard, masterJobId, 
                        `\nERRO ao executar baseline para ${hostname}: ${error.message}\n`);
                    
                    // Considerar este host como concluído para o contador
                    completedHosts++;
                    
                    // Atualizar progresso com base nos hosts concluídos
                    const progress = Math.min(95, (completedHosts / totalHosts) * 100);
                    updateMasterProgress(masterCard, masterJobId, progress);
                    
                    // Definir status final se for o último host
                    if (completedHosts >= totalHosts) {
                        updateMasterStatus(masterCard, 'failed');
                    }
                });
            });
        }
        
        /**
         * Atualiza a saída do card mestre
         */
        function updateMasterOutput(card, jobId, newOutput) {
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv) {
                outputDiv.innerHTML += newOutput;
                outputDiv.scrollTop = outputDiv.scrollHeight;
            }
            
            // Atualizar também no estado
            const job = state.multiHostJobs.get(jobId);
            if (job) {
                if (!job.output) job.output = '';
                job.output += newOutput;
            }
            
            // Salvar o estado para persistência
            if (typeof saveRunningJobsState === 'function') {
                saveRunningJobsState();
            }
        }
        
        /**
         * Atualiza o progresso do card mestre
         */
        function updateMasterProgress(card, jobId, progress) {
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                ProgressManager.applyProgressToBar(jobId, progressBar, progress);
            }
            
            // Atualizar também no estado
            const job = state.multiHostJobs.get(jobId);
            if (job) {
                job.progress = progress;
            }
            
            // Salvar o estado para persistência
            if (typeof saveRunningJobsState === 'function') {
                saveRunningJobsState();
            }
        }
        
        /**
         * Atualiza o status do card mestre
         */
        function updateMasterStatus(card, status) {
            const statusDiv = card.querySelector('.task-status');
            if (statusDiv) {
                if (status === 'completed' || status === 'success') {
                    statusDiv.textContent = 'Concluído com sucesso';
                    statusDiv.className = 'task-status success';
                    card.classList.add('success');
                } else if (status === 'failed') {
                    statusDiv.textContent = 'Falhou';
                    statusDiv.className = 'task-status failed';
                    card.classList.add('failed');
                } else if (status === 'cancelled') {
                    statusDiv.textContent = 'Cancelado';
                    statusDiv.className = 'task-status cancelled';
                    card.classList.add('cancelled');
                }
            }
            
            // Salvar o estado para persistência
            if (typeof saveRunningJobsState === 'function') {
                saveRunningJobsState();
            }
        }
        
        /**
         * Formata a saída com prefixo do host
         */
        function formatOutputWithHostPrefix(output, hostname) {
            if (!output) return '';
            
            // Não adicionar prefixo para linhas que já tem o hostname
            let formatted = '';
            const lines = output.split('\n');
            
            for (const line of lines) {
                if (!line.trim()) {
                    formatted += '\n';
                    continue;
                }
                
                if (line.includes(hostname) || 
                    line.includes('PLAY') || 
                    line.includes('TASK') || 
                    line.includes('====')) {
                    formatted += line + '\n';
                } else {
                    formatted += `[${hostname}] ${line}\n`;
                }
            }
            
            return formatted;
        }
        
        /**
         * Cria um card de execução para baseline multi-host
         */
        function createMultiHostExecutionCard(playbookName, hosts, jobId) {
            const card = document.createElement('div');
            card.className = 'execution-card';
            card.setAttribute('data-job-id', jobId);
            card.setAttribute('data-playbook-name', playbookName);
            
            // Construir HTML para os hosts
            let hostsHTML = '';
            hosts.forEach(hostname => {
                hostsHTML += `
                    <div class="host-details" data-host="${hostname}">
                        <p><strong>Hostname:</strong> <span>${hostname}</span></p>
                    </div>
                `;
            });
            
            card.innerHTML = `
                <div class="card-header">
                    <h3>${playbookName} (Múltiplos Hosts: ${hosts.length})</h3>
                    <div class="task-status">Em execução...</div>
                </div>
                
                <div class="host-info">
                    ${hostsHTML}
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar" style="width: 0%;"></div>
                </div>
                
                <div class="ansible-output" style="display: none;"></div>
                
                <div class="button-group">
                    <button class="cancel-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Cancelar
                    </button>
                    <button class="toggle-output-btn">
                        Ver Mais
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Adicionar eventos
            const cancelBtn = card.querySelector('.cancel-btn');
            cancelBtn.addEventListener('click', function() {
                if (typeof window.cancelExecution === 'function') {
                    window.cancelExecution(this);
                }
            });
            
            const toggleBtn = card.querySelector('.toggle-output-btn');
            toggleBtn.addEventListener('click', function() {
                if (typeof window.toggleOutput === 'function') {
                    window.toggleOutput(this);
                }
            });
            
            return card;
        }
        
        /**
         * Obtém todas as playbooks selecionadas
         * @returns {Array} - Array de objetos de playbook {name, element}
         */
        function getSelectedPlaybooks() {
            const playbooks = [];
            document.querySelectorAll('.playbook-item.selected').forEach(item => {
                const name = item.getAttribute('data-playbook-name');
                if (name) {
                    const path = item.getAttribute('data-playbook-path') || '';
                    playbooks.push({
                        name: name,
                        path: path,
                        element: item
                    });
                }
            });
            return playbooks;
        }
        
        /**
         * Obtém todos os hosts selecionados
         * @returns {Array} - Array de hostnames
         */
        function getSelectedHosts() {
            const hosts = [];
            document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
                const checkbox = hostBanner.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.dataset.hostname) {
                    hosts.push(checkbox.dataset.hostname);
                }
            });
            return hosts;
        }
        
        // =======================================
        // INICIALIZAÇÃO
        // =======================================
        
        /**
         * Adiciona estilos globais necessários
         */
        function addGlobalStyles() {
            if (document.getElementById('baseline-multihost-styles')) return;
            const style = document.createElement('style');
            style.id = 'baseline-multihost-styles';
            style.textContent = `
                /* Estilo para progresso */
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
                    background-color: ${CONFIG.progressColors.running};
                    border-radius: 2px;
                    width: 0%;
                    transition: width 0.3s ease, background-color 0.3s ease;
                }
                
                /* Estilo para execução */
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
                
                /* Estilos para saída formatada */
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
                
                /* Garantir que os cards estão na posição correta */
                #running-playbooks {
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .execution-card {
                    background-color: var(--black-elegant, #0A0A0A);
                    border-radius: 6px;
                    padding: 15px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    position: relative;
                    border: 1px solid var(--gray-dark, #2A2A2A);
                    margin-bottom: 0;
                    transition: box-shadow 0.3s ease;
                }
                
                .execution-card:hover {
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
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
    
                /* Estilo para multi-host */
                .host-section-divider {
                    border-top: 1px solid var(--gray-dark, #2A2A2A);
                    margin: 10px 0;
                    text-align: center;
                    font-weight: bold;
                    color: var(--accent-gold, #FFD600);
                    padding-top: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
    
                .host-label {
                    display: inline-block;
                    background: var(--black-elegant, #0A0A0A);
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                }
    
                .host-progress {
                    margin-left: auto;
                    font-size: 11px;
                    color: var(--text-secondary, #B0B0B0);
                }
            `;
            document.head.appendChild(style);
        }
        
        // =======================================
    // INICIALIZAÇÃO E CONFIGURAÇÃO
    // =======================================
    
    /**
     * Função principal de inicialização
     */
    function initialize() {
        // Adicionar estilos globais
        injectStyles();
        addGlobalStyles();
        
        // Configurar verificações periódicas
        setInterval(addBaselineButtonsToHosts, 2000);
        
        // Interceptar funções principais
        fixToggleOutputFunction();
        fixExecuteFunction();
        
        // Corrigir problema de duplicação de texto
        fixSystemDuplication();
        
        // Observar DOM para ajustes em novos elementos
        observeDOM();
        
        // Marcar como inicializado
        window.multiHostFixInitialized = true;
        
        log("Solução unificada para Ansible com suporte a multi-host baseline inicializada com sucesso");
    }
    
    /**
     * Observa mudanças no DOM para aplicar correções em novos elementos
     */
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Adicionar botões de baseline a novos hosts
                    addBaselineButtonsToHosts();
                    
                    // Verificar novos cards de execução
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                            // Obter ID do job e nome da playbook
                            const jobId = node.getAttribute('data-job-id');
                            const playbookName = node.getAttribute('data-playbook-name');
                            
                            // Adicionar barra de progresso
                            if (jobId && !node.querySelector('.progress-bar')) {
                                ensureProgressBar(node);
                            }
                        }
                    });
                }
            });
        });
        
        // Iniciar observação do corpo do documento
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();