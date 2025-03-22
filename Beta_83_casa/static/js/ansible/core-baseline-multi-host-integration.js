/**
 * baseline-multi-host-integration.js
 * Integração com suporte a múltiplos hosts, cada um com seu próprio banner
 * Coloque este arquivo em /static/js/ansible/baseline-multi-host-integration.js
 */

const BaselineIntegration = (() => {
    const config = {
        baselineKeywords: ['baseline', 'configuracao-base'],
        hostsContainer: '#hosts-list',
        playbooksContainer: '#playbooks',
    };

    let state = {
        bannersAdded: new Set(),
        activeExecutions: new Map(),
        hostBanners: new Map()
    };

    // Verifica se a playbook é do tipo baseline
    const isBaselinePlaybook = (name) => {
        return name && name.toLowerCase().includes('baseline');
    };

    // Gera um ID único para o banner baseado no hostname
    const generateBannerId = (hostname) => {
        return `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
    };

    // Banner personalizado por host com o hostname já preenchido
    const createBaselineBannerHTML = (hostname) => `
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

    // Log simplificado com foco nas tarefas
    const detailedLogHTML = (hostname) => `
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

    // Estilos CSS atualizados
    const injectStyles = () => {
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
            
            @media (max-width: 768px) {
                .log-content {
                    flex-direction: column;
                }
                .log-summary-box, .log-tasks-box {
                    flex: 1;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    };

    // Função de correção para textos duplicados
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

    // Função auxiliar para limpeza de valor de campo
    const getCleanFieldValue = (text, fieldType) => {
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
    };

    // Utilitários
    const utils = {
        generatePassword: () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
            let password = '';
            for (let i = 0; i < 15; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        },
        
        // Extrair informações do resumo
        extractSummaryInfo: (output) => {
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
        },
        
        // Extrair tarefas do log
        extractTasks: (output) => {
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
    };

    // Adicionar botão de baseline em cada host
    function addBaselineButtonsToHosts() {
        const hostsContainer = document.querySelector(config.hostsContainer);
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

    // Alternar visibilidade do banner de baseline
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
            console.error(`Host banner não encontrado para ${hostname}`);
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

    // Encontrar o banner do host pelo hostname
    function findHostBanner(hostname) {
        const hostsContainer = document.querySelector(config.hostsContainer);
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

// Configurar eventos do banner
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
        document.getElementById(`baseline-parceiro-password-${hostId}`).value = utils.generatePassword();
        document.getElementById(`baseline-root-password-${hostId}`).value = utils.generatePassword();
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

// Injetar log para um job específico
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
        
        state.activeExecutions.set(jobId, {
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
            log.style.display = isVisible ? 'none' : 'flex';
            logToggle.textContent = isVisible ? `Log (${hostname})` : `Esconder Log (${hostname})`;
        });
        
        setupLogEvents(log, jobId, hostname);
    }
}

// Configurar eventos do log
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

// Atualizar tarefas no log
function updateTasks(jobId, output) {
    const execution = state.activeExecutions.get(jobId);
    if (!execution) return;

    const completedContainer = execution.log.querySelector('.log-tasks-completed');
    const skippedContainer = execution.log.querySelector('.log-tasks-skipped');
    const failedContainer = execution.log.querySelector('.log-tasks-failed');
    
    // Extrair informações de resumo
    const summaryInfo = utils.extractSummaryInfo(output);
    
    // Atualizar as informações de resumo com os valores limpos
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
    
    // Se as senhas não foram encontradas, usar as do formulário específico para o hostname
    if (!execution.parceiroPassword || execution.parceiroPassword === 'N/A') {
        execution.parceiroPassword = document.getElementById(`baseline-parceiro-password-${execution.hostname}`)?.value || 'N/A';
        execution.log.querySelector('.log-parceiro-password').textContent = execution.parceiroPassword;
    }
    
    if (!execution.rootPassword || execution.rootPassword === 'N/A') {
        execution.rootPassword = document.getElementById(`baseline-root-password-${execution.hostname}`)?.value || 'N/A';
        execution.log.querySelector('.log-root-password').textContent = execution.rootPassword;
    }
    
    // Limpeza final para garantir sem quebras de linha
    execution.log.querySelectorAll('.log-hostname, .log-system, .log-ip-private, .log-ip-public, .log-parceiro-password, .log-root-password')
        .forEach(element => {
            if (element.textContent.includes('\n')) {
                element.textContent = element.textContent.replace(/\n.*/g, '');
            }
        });
    
    // Extrair tarefas
    const tasks = utils.extractTasks(output);
    
    // Limpar containers
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
    
    // Guardar a saída bruta
    execution.rawOutput = output;
}

// Atualizar status
function updateStatus(jobId, status) {
    const execution = state.activeExecutions.get(jobId);
    if (!execution) return;

    const statusElement = execution.log.querySelector('.log-status');

    if (status === 'completed') {
        statusElement.textContent = 'Concluído';
        statusElement.style.color = '#98c379';
    } else if (status === 'failed') {
        statusElement.textContent = 'Falhou';
        statusElement.style.color = '#e06c75';
    } else {
        statusElement.textContent = 'Executando...';
        statusElement.style.color = '#e5c07b';
    }
}

// Monitora a seleção de hosts
function monitorHostSelection() {
    // Adiciona botões de baseline a hosts já carregados
    addBaselineButtonsToHosts();
    
    // Configura MutationObserver para detectar quando novos hosts são carregados
    const hostsContainer = document.querySelector(config.hostsContainer);
    if (!hostsContainer) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Espera um pouco para garantir que todos os hosts foram processados
                setTimeout(() => {
                    addBaselineButtonsToHosts();
                }, 500);
            }
        });
    });
    
    observer.observe(hostsContainer, { childList: true, subtree: true });
}

// Monitora a seleção de playbooks
function monitorPlaybookSelection() {
    const playbooksContainer = document.querySelector(config.playbooksContainer);
    if (!playbooksContainer) return;
    
    // Evento para cliques em playbooks
    playbooksContainer.addEventListener('click', event => {
        const playbookItem = event.target.closest('.playbook-item');
        if (!playbookItem) return;
        
        const playbookName = playbookItem.getAttribute('data-playbook-name');
        if (!playbookName || !isBaselinePlaybook(playbookName)) return;
        
        // Verificar se há hosts selecionados
        const selectedHosts = Array.from(document.querySelectorAll('.host-banner.valid.selected'));
        
        // Se nenhum host selecionado, não fazer nada
        if (selectedHosts.length === 0) return;
        
        // Para cada host selecionado, verificar se já tem banner
        selectedHosts.forEach(hostBanner => {
            const hostCheckbox = hostBanner.querySelector('input[type="checkbox"]');
            if (!hostCheckbox) return;
            
            const hostname = hostCheckbox.dataset.hostname;
            if (!hostname) return;
            
            // Se o host não tem banner, criar banner
            if (!state.bannersAdded.has(hostname)) {
                // Sinalizar visualmente para o usuário que este host precisa de configuração de baseline
                if (!hostBanner.querySelector('.baseline-available-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'baseline-available-badge';
                    badge.textContent = 'B';
                    badge.title = 'Configure o Baseline para este host';
                    hostBanner.appendChild(badge);
                    
                    // Piscar o badge para chamar a atenção
                    badge.style.animation = 'pulse 1s infinite';
                    
                    // Ao clicar no badge, abrir o banner
                    badge.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleBaselineBanner(hostname);
                        badge.remove();
                    });
                }
            }
        });
    });
}

// Interceptar a execução de playbooks
function interceptPlaybookExecution() {
    const originalExecute = window.executeSelectedPlaybooks;
    window.executeSelectedPlaybooks = function() {
        // Obter playbooks selecionadas
        const playbooks = Array.from(document.querySelectorAll('.playbook-item input[type="checkbox"]:checked'))
            .map(cb => cb.closest('.playbook-item').getAttribute('data-playbook-name'));
            
        // Verificar se alguma playbook é de baseline
        const hasBaseline = playbooks.some(isBaselinePlaybook);
        
        if (hasBaseline) {
            // Obter hosts selecionados
            const selectedHosts = Array.from(document.querySelectorAll('.host-banner.valid.selected'));
            const hostsList = selectedHosts.map(hostBanner => {
                const checkbox = hostBanner.querySelector('input[type="checkbox"]');
                return checkbox?.dataset.hostname;
            }).filter(Boolean);
            
            // Verificar se todos os hosts selecionados têm banner de baseline
            let allHostsConfigured = true;
            let missingHosts = [];
            
            for (const hostname of hostsList) {
                // Verificar se o host tem um banner gerado
                if (!state.bannersAdded.has(hostname)) {
                    allHostsConfigured = false;
                    missingHosts.push(hostname);
                }
            }
            
            if (!allHostsConfigured) {
                // Mostrar alerta para configurar os hosts faltantes
                alert(`Configure o Baseline para os seguintes hosts:\n${missingHosts.join('\n')}`);
                
                // Gerar banners para os hosts faltantes
                missingHosts.forEach(hostname => {
                    toggleBaselineBanner(hostname);
                });
                
                return;
            }
            
            // Intercepção para definir variáveis extras por host
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url === '/api/run' && options?.method === 'POST') {
                    const data = JSON.parse(options.body);
                    
                    // Verificar se é uma playbook de baseline
                    const isBaseline = isBaselinePlaybook(data.playbook);
                    
                    if (isBaseline && data.hosts && data.hosts.length === 1) {
                        const hostname = data.hosts[0];
                        
                        // Obter valores do banner para este host
                        const newHostname = document.getElementById(`baseline-hostname-${hostname}`)?.value || hostname;
                        const parceiroPassword = document.getElementById(`baseline-parceiro-password-${hostname}`)?.value;
                        const rootPassword = document.getElementById(`baseline-root-password-${hostname}`)?.value;
                        
                        // Validar senhas
                        if (!parceiroPassword || parceiroPassword.length < 8 || !rootPassword || rootPassword.length < 8) {
                            alert(`As senhas para o host ${hostname} devem ter pelo menos 8 caracteres.`);
                            return new Promise(() => {}); // Rejeita a promise silenciosamente
                        }
                        
                        // Definir as variáveis extras
                        data.extra_vars = {
                            new_hostname: newHostname,
                            parceiro_password: parceiroPassword,
                            root_password: rootPassword,
                            user_password: parceiroPassword,     // Para Windows
                            admin_password: rootPassword         // Para Windows
                        };
                        
                        // Substituir o corpo da requisição
                        options.body = JSON.stringify(data);
                    }
                }
                return originalFetch.apply(this, arguments);
            };
            
            originalExecute();
            
            // Restaurar fetch original após um momento
            setTimeout(() => {
                window.fetch = originalFetch;
            }, 1000);
        } else {
            originalExecute();
        }
    };
}

// Interceptar a criação de cards de execução
function interceptExecutionCards() {
    const originalCreate = window.createExecutionCard;
    window.createExecutionCard = function(playbookName, hosts, jobId) {
        const card = originalCreate.apply(this, arguments);
        
        if (isBaselinePlaybook(playbookName) && hosts.size === 1) {
            // Obtém o único hostname do Set
            const hostname = Array.from(hosts)[0];
            
            // Injetar log específico para este host
            setTimeout(() => injectLog(card, jobId, hostname), 500);
        }
        
        return card;
    };
}

// Interceptar monitoramento de execuções
function interceptExecutionMonitoring() {
    const originalMonitor = window.monitorPlaybookExecution;
    window.monitorPlaybookExecution = function(jobId, card) {
        originalMonitor.apply(this, arguments);
        
        const playbookName = card.getAttribute('data-playbook-name');
        if (!isBaselinePlaybook(playbookName)) return;
        
        // Extrair o hostname do card
        const hostDetails = card.querySelector('.host-details');
        if (!hostDetails) return;
        
        const hostname = hostDetails.getAttribute('data-host');
        if (!hostname) return;
        
        // Configurar intervalo para monitorar a execução e atualizar o log
        const interval = setInterval(() => {
            fetch(`/api/status/${jobId}`)
                .then(res => res.json())
                .then(data => {
                    updateTasks(jobId, data.output || '');
                    updateStatus(jobId, data.status);
                    
                    if (data.status === 'completed' || data.status === 'failed') {
                        clearInterval(interval);
                    }
                })
                .catch(err => {
                    console.error('Erro ao atualizar log:', err);
                    clearInterval(interval);
                });
        }, 1000);
    };
}

// Inicializar
function init() {
    injectStyles();
    fixSystemDuplication();
    monitorHostSelection();
    monitorPlaybookSelection();
    interceptPlaybookExecution();
    interceptExecutionCards();
    interceptExecutionMonitoring();
    console.log('Baseline Multi-Host Integration inicializado com sucesso!');
}

// Adicionar evento para inicializar após o carregamento do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

return {
    version: '3.0.0',
    refresh: function() {
        console.log('Atualizando Baseline Multi-Host Integration...');
        injectStyles();
        fixSystemDuplication();
        addBaselineButtonsToHosts();
    }
};
})();