/**
 * baseline-integration.js
 * Adiciona banner e log com filtros para tarefas concluídas, skipped e falhadas
 * Coloque este arquivo em /static/js/ansible/baseline-integration.js
 */

const BaselineIntegration = (() => {
    const config = {
        baselineKeywords: ['baseline', 'configuracao-base'],
        playbooksContainer: '#playbooks',
    };

    let state = {
        bannerAdded: false,
        activeExecutions: new Map()
    };

    // Banner minimalista com botões de ver e copiar
    const baselineBannerHTML = `
    <div id="baseline-banner" class="baseline-banner">
        <div class="banner-header">
            <h3>Baseline</h3>
            <button class="banner-close">✕</button>
        </div>
        <div class="banner-content">
            <label>Hostname<input id="baseline-hostname" placeholder="SKY-SDL-IMP-01"></label>
            <div class="password-group">
                <label>Senha Parceiro<input id="baseline-parceiro-password" type="password" placeholder="***************"></label>
                <button class="toggle-password" data-target="baseline-parceiro-password">👁</button>
                <button class="copy-password" data-target="baseline-parceiro-password">📋</button>
            </div>
            <div class="password-group">
                <label>Senha Root<input id="baseline-root-password" type="password" placeholder="***************"></label>
                <button class="toggle-password" data-target="baseline-root-password">👁</button>
                <button class="copy-password" data-target="baseline-root-password">📋</button>
            </div>
            <button id="baseline-generate-passwords">Gerar</button>
        </div>
    </div>
    `;

    // Log simplificado com foco nas tarefas e sem output do Ansible
    const detailedLogHTML = `
    <div class="baseline-log-container">
        <div class="baseline-log" style="display: none;">
            <div class="log-header">
                <span>baseline_universal.yml</span>
                <button class="log-copy">Copiar</button>
            </div>
            
            <div class="log-content">
                <div class="log-summary-box">
                    <div class="summary-header">Resumo da Configuração</div>
                    <div class="summary-rows">
                        <div class="summary-row"><span>Hostname:</span> <span class="log-hostname">-</span></div>
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
                display: none;
                position: sticky;
                top: 10px;
                z-index: 10;
                border: 1px solid var(--gray-dark);
                box-shadow: 0 4px 12px var(--shadow-dark);
            }
            .baseline-banner.visible { display: block; }
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
            .banner-content button#baseline-generate-passwords {
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
            .banner-content button#baseline-generate-passwords:hover {
                background: var(--accent-gold-hover);
            }
            .baseline-log-container {
                position: relative;
                width: 100%;
                margin-top: 10px;
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

    

    // Utilitários com estrutura corrigida
    const utils = {
        generatePassword: () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
            let password = '';
            for (let i = 0; i < 15; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        },
        
        isBaselinePlaybook: (name, content) => {
            // Verifica se a playbook declara explicitamente que é um baseline
            if (content && content.vars && content.vars.is_baseline === true) {
                return true;
            }
            
            // Caso contrário, verifica apenas playbooks que têm 'baseline' no nome
            return name && name.toLowerCase().includes('baseline');
        },        
        // Extrai partes individuais de strings com informações misturadas
        extractCleanValue: (text) => {
            if (!text) return '';
            
            // Remove caracteres de escape
            let cleanText = text.replace(/\\n/g, '')
                           .replace(/\*\*/g, '')
                           .trim();
            
            // Se contiver múltiplas informações, pegar apenas a primeira parte relevante
            if (cleanText.includes('Sistema:') && cleanText.indexOf('Sistema:') !== cleanText.lastIndexOf('Sistema:')) {
                // Caso específico de duplicação de "Sistema:"
                cleanText = cleanText.split('Sistema:')[1].trim();
            } else if (cleanText.includes('IP:') && !cleanText.startsWith('IP:')) {
                cleanText = cleanText.split('IP:')[0].trim();
            } else if (cleanText.includes('IP Público:') && !cleanText.startsWith('IP Público:')) {
                cleanText = cleanText.split('IP Público:')[0].trim();
            } else if (cleanText.includes('Usuário') && !cleanText.startsWith('Usuário')) {
                cleanText = cleanText.split('Usuário')[0].trim();
            } else if (cleanText.includes('Senha') && !cleanText.startsWith('Senha')) {
                cleanText = cleanText.split('Senha')[0].trim();
            }
            
            return cleanText;
        },
        
        // Função corrigida para extrair informações do resumo
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
        
        // Função para extrair tarefas do log
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

    // Injetar banner
    function injectBanner() {
        if (state.bannerAdded) return;
        const container = document.querySelector(config.playbooksContainer);
        if (!container) return;

        const banner = document.createElement('div');
        banner.innerHTML = baselineBannerHTML;
        const bannerElement = banner.firstElementChild;
        container.parentNode.insertBefore(bannerElement, container);
        bannerElement.classList.add('visible');

        document.getElementById('baseline-hostname').value = '';
        setupBannerEvents(bannerElement);
        state.bannerAdded = true;
    }

    // Configurar eventos do banner
    function setupBannerEvents(banner) {
        banner.querySelector('.banner-close').addEventListener('click', () => {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
                state.bannerAdded = false;
            }, 300);
        });
        
        banner.querySelector('#baseline-generate-passwords').addEventListener('click', () => {
            document.getElementById('baseline-parceiro-password').value = utils.generatePassword();
            document.getElementById('baseline-root-password').value = utils.generatePassword();
        });
        
        banner.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                target.type = target.type === 'password' ? 'text' : 'password';
                btn.textContent = target.type === 'password' ? '👁' : '👁‍🗨';
            });
        });
        
        banner.querySelectorAll('.copy-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                navigator.clipboard.writeText(target.value);
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = '📋', 1500);
            });
        });
    }

    // Injetar log 
    function injectLog(card, jobId) {
        if (!card || card.querySelector('.baseline-log-container')) return;
        
        // Adicionar botão Log ao lado do Ver Mais
        const toggleOutputBtn = card.querySelector('.toggle-output-btn');
        if (toggleOutputBtn) {
            const logToggle = document.createElement('button');
            logToggle.className = 'log-toggle';
            logToggle.textContent = 'Log';
            toggleOutputBtn.parentNode.insertBefore(logToggle, toggleOutputBtn.nextSibling);
            
            const logContainer = document.createElement('div');
            logContainer.innerHTML = detailedLogHTML;
            card.appendChild(logContainer);
            
            const log = logContainer.querySelector('.baseline-log');
            
            state.activeExecutions.set(jobId, {
                card,
                log,
                tasksCompleted: [],
                tasksSkipped: [],
                tasksFailed: [],
                hostname: document.getElementById('baseline-hostname').value || 'SKY-SDL-IMP-01',
                system: '',
                parceiroPassword: document.getElementById('baseline-parceiro-password').value || 'N/A',
                rootPassword: document.getElementById('baseline-root-password').value || 'N/A',
                ipPublic: 'N/A',
                ipPrivate: 'N/A',
                rawOutput: ''
            });
            
            logToggle.addEventListener('click', () => {
                const isVisible = log.style.display === 'flex';
                log.style.display = isVisible ? 'none' : 'flex';
                logToggle.textContent = isVisible ? 'Log' : 'Esconder Log';
            });
            
            setupLogEvents(log, jobId);
        }
    }

    // Configurar eventos do log
    function setupLogEvents(log, jobId) {
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
        
        // Extrair informações de resumo usando a função corrigida
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
        
        // Se as senhas não foram encontradas, usar as do formulário
        if (!execution.parceiroPassword || execution.parceiroPassword === 'N/A') {
            execution.parceiroPassword = document.getElementById('baseline-parceiro-password').value || 'N/A';
            execution.log.querySelector('.log-parceiro-password').textContent = execution.parceiroPassword;
        }
        
        if (!execution.rootPassword || execution.rootPassword === 'N/A') {
            execution.rootPassword = document.getElementById('baseline-root-password').value || 'N/A';
            execution.log.querySelector('.log-root-password').textContent = execution.rootPassword;
        }
        
        // Limpeza final para garantir sem quebras de linha
        document.querySelectorAll('.log-hostname, .log-system, .log-ip-private, .log-ip-public, .log-parceiro-password, .log-root-password')
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

    // Monitorar seleção de playbooks
    function monitorPlaybookSelection() {
        document.addEventListener('click', event => {
            const playbookItem = event.target.closest('.playbook-item');
            if (!playbookItem) return;

            const playbookName = playbookItem.getAttribute('data-playbook-name');
            if (!playbookName || !utils.isBaselinePlaybook(playbookName)) return;

            const checkbox = playbookItem.querySelector('input[type="checkbox"]');
            if (checkbox?.checked) {
                injectBanner();
            } else {
                const banner = document.getElementById('baseline-banner');
                if (banner) {
                    banner.classList.remove('visible');
                    setTimeout(() => {
                        banner.remove();
                        state.bannerAdded = false;
                    }, 300);
                }
            }
        });
    }

    // Interceptar a execução de playbooks
    function interceptPlaybookExecution() {
        const originalExecute = window.executeSelectedPlaybooks;
        window.executeSelectedPlaybooks = function() {
            const playbooks = Array.from(document.querySelectorAll('.playbook-item input[type="checkbox"]:checked'))
                .map(cb => cb.closest('.playbook-item').getAttribute('data-playbook-name'));
            const hasBaseline = playbooks.some(utils.isBaselinePlaybook);
            if (hasBaseline && state.bannerAdded) {
                const hostname = document.getElementById('baseline-hostname').value || 'SKY-SDL-IMP-01';
                const parceiroPassword = document.getElementById('baseline-parceiro-password').value;
                const rootPassword = document.getElementById('baseline-root-password').value;

                if (!parceiroPassword || parceiroPassword.length < 15 || !rootPassword || rootPassword.length < 15) {
                    alert('As senhas devem ter 15 caracteres ou mais.');
                    return;
                }

                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    if (url === '/api/run' && options?.method === 'POST') {
                        const data = JSON.parse(options.body);
                        data.extra_vars = {
                            new_hostname: hostname,
                            parceiro_password: parceiroPassword,
                            root_password: rootPassword
                        };
                        options.body = JSON.stringify(data);
                    }
                    return originalFetch.apply(this, arguments);
                };

                originalExecute();
                setTimeout(() => window.fetch = originalFetch, 1000);
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
            if (utils.isBaselinePlaybook(playbookName)) {
                setTimeout(() => injectLog(card, jobId), 500);
            }
            return card;
        };
    }

    // Interceptar monitoramento de execuções
    function interceptExecutionMonitoring() {
        const originalMonitor = window.monitorPlaybookExecution;
        window.monitorPlaybookExecution = function(jobId, card) {
            originalMonitor.apply(this, arguments);
            if (!utils.isBaselinePlaybook(card.getAttribute('data-playbook-name'))) return;

            const interval = setInterval(() => {
                fetch(`/api/status/${jobId}`)
                    .then(res => res.json())
                    .then(data => {
                        updateTasks(jobId, data.output || '');
                        updateStatus(jobId, data.status);
                        
                        if (data.status === 'completed' || data.status === 'failed') {
                            // Mostrar o log quando a tarefa for concluída ou falhar
                            const log = card.querySelector('.baseline-log');
                            if (log && log.style.display === 'none') {
                                log.style.display = 'flex';
                                card.querySelector('.log-toggle').textContent = 'Esconder Log';
                            }
                            clearInterval(interval);
                        }
                    })
                    .catch(err => console.error('Erro ao atualizar log:', err));
            }, 1000); // Intervalo de 1 segundo para atualizações mais frequentes
        };
    }

    // Inicializar
    function init() {
        injectStyles();
        fixSystemDuplication(); // Chama a função de correção
        monitorPlaybookSelection();
        interceptPlaybookExecution();
        interceptExecutionCards();
        interceptExecutionMonitoring();
        console.log('Baseline Integration inicializado com sucesso!');
    }

    // Adicionar evento para inicializar após o carregamento do DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        version: '2.0.0',
        refresh: function() {
            console.log('Atualizando Baseline Integration...');
            injectStyles();
            fixSystemDuplication(); // Garante que a correção está ativa
        }
    };
})();