/**
 * Gerenciador Unificado para Ansible - v3.0
 * Consolida e melhora as funções de gerenciamento de playbooks de Antivírus e Site24x7
 * Possibilita selecionar entre scripts predefinidos ou personalizados
 */

const UnifiedAnsibleManager = (() => {
    // Configurações gerais
    const config = {
        // Palavras-chave para detectar o tipo de playbook
        keywords: {
            site24x7: ['site24x7', 'site24', 'site-24', 'zoho'],
            antivirus: ['antivirus', 'trendmicro', 'deep security']
        },
        // Caminho para a pasta de arquivos
        archivesPath: '/archives/',
        // Seletor para o container de playbooks
        playbooksContainer: '#playbooks',
        // Display names para as playbooks
        displayNames: {
            'site24x7_agent.yml': 'Site24x7 Agent',
            'trendmicro_agent.yml': 'Trend Micro Antivírus'
        },
        // Informações selecionadas
        selectedInfo: {
            site24x7: null,
            antivirus: null
        }
    };

    // Estado do gerenciador
    let state = {
        bannerAdded: false,
        pendingBanners: [],
        activeExecutions: new Map(),
        executionInProgress: false
    };

    // Chaves do Site24x7 - Principais e secundárias
    const site24x7Keys = {
        principais: [
            { name: "Operação - AutoSky", key: "us_df8c061ef70463b255e8b575406addfc" },
            { name: "BGM - Praxio", key: "us_8e715d1f97d4f0ec254a90079d2249db" },
            { name: "CTA Sistemas [OPER]", key: "us_0216ce8dbb4b1913045cc79ee1370c74" },
            { name: "Core - AutoSky", key: "us_966606871b04f2e966f54b1de7b886b6" },
            { name: "Operação - SAP", key: "us_379a0e69c7769bbc6a3771569aceb974" }
        ],
        secundarias: [
            { name: "Operação - Protheus", key: "us_3426b8f0d4705462da00057e1696c620" },
            { name: "Contmatic", key: "us_ded36cf6c477939d6f9f74ceb90b8ea7" },
            { name: "SKYDB (J&V)", key: "us_bf0da5d532db330e40b1299ccdd24e23" },
            { name: "SKYDB (J&V) - ASUN", key: "us_5dda573a24a261fc019258a7df777aea" },
            { name: "VilleFort [OPER]", key: "us_0911a2b9e57a6900da0eabdc124fc99a" },
            { name: "GIGA", key: "us_915e84bb6c33049be558be2dffc15231" }
        ]
    };

    // Configurações de antivírus
    const antivirusConfigs = {
        windows: [
            { name: "Antivírus Padrão", script: "antivirus.ps1" },
            { name: "Antivírus CTA", script: "cta.ps1" },
            { name: "Antivírus Praxio", script: "praxio.ps1" },
            { name: "Antivírus Implantação", script: "implantacao.ps1" }
        ],
        linux: [
            { name: "Antivírus Padrão", script: "antivirus.sh" },
            { name: "Antivírus CTA", script: "cta.sh" },
            { name: "Antivírus Praxio", script: "praxio.sh" },
            { name: "Antivírus Implantação", script: "implantacao.sh" }
        ]
    };

    // HTML dos banners
    const bannersHTML = {
        // Banner para Site24x7
        site24x7: `
        <div id="site24x7-banner" class="unified-banner">
            <div class="banner-header">
                <h3 id="banner-title" class="site24x7">Configuração do Site24x7</h3>
                <button class="banner-close" data-banner="site24x7">✕</button>
            </div>
            <div class="banner-content">
                <div class="banner-section active">
                    <label>
                        Selecione a Chave do Site24x7
                        <select id="site24x7-key-select" class="ansible-select">
                            <optgroup label="Principais">
                                <!-- Opções principais serão adicionadas via JS -->
                            </optgroup>
                            <optgroup label="Todas as Chaves">
                                <!-- Outras opções serão adicionadas via JS -->
                            </optgroup>
                        </select>
                    </label>
                    <div class="key-display">
                        <input id="site24x7-key-input" type="text" readonly placeholder="Selecione uma chave ou digite manualmente">
                        <button class="copy-button" data-target="site24x7-key-input">📋</button>
                    </div>
                    <label class="custom-key">
                        <input type="checkbox" id="site24x7-custom-key-toggle">
                        Usar chave personalizada
                    </label>
                    <div id="site24x7-custom-key-container" style="display: none;">
                        <input type="text" id="site24x7-custom-key" placeholder="Digite a chave personalizada">
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <h4 style="font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                        <div style="display: flex; gap: 15px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="site24x7_os" value="windows" checked>
                                <span>Windows</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="site24x7_os" value="linux">
                                <span>Linux</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-text">
                            A chave será buscada no arquivo Site24x7 da pasta <code>/archives/windows/</code> 
                            ou <code>/archives/linux/</code> dependendo do sistema operacional.
                        </div>
                    </div>
                    
                    <!-- Botão de confirmação unificado -->
                    <div class="button-group">
                        <button id="site24x7-confirm-button" class="banner-confirm site24x7">Continuar Instalação</button>
                        <button id="site24x7-cancel-button" class="banner-cancel">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
        `,
        
        // Banner para Antivírus
        antivirus: `
        <div id="antivirus-banner" class="unified-banner">
            <div class="banner-header">
                <h3 id="banner-title" class="antivirus">Configuração de Antivírus</h3>
                <button class="banner-close" data-banner="antivirus">✕</button>
            </div>
            <div class="banner-content">
                <div class="banner-section active">
                    <div>
                        <h4 style="font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="av_os_type" value="windows" checked onchange="UnifiedAnsibleManager.updateAntivirusOptions()">
                                <span>Windows</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="av_os_type" value="linux" onchange="UnifiedAnsibleManager.updateAntivirusOptions()">
                                <span>Linux</span>
                            </label>
                        </div>
                    </div>
                    
                    <label>
                        Selecione o Script de Antivírus
                        <select id="antivirus-script-select" class="ansible-select">
                            <!-- Opções serão adicionadas via JS -->
                        </select>
                    </label>
                    
                    <label class="custom-key">
                        <input type="checkbox" id="antivirus-custom-toggle">
                        Usar script personalizado
                    </label>
                    
                    <div id="antivirus-custom-container" style="display: none;">
                        <div style="margin-bottom: 10px;">
                            <label>Nome do arquivo
                                <input type="text" id="antivirus-custom-filename" placeholder="personalizado.ps1">
                            </label>
                        </div>
                        <div>
                            <label>Conteúdo do script
                                <textarea id="antivirus-custom-content" placeholder="Insira o conteúdo do script aqui" rows="6"></textarea>
                            </label>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-text">
                            Os arquivos de antivírus serão buscados na pasta <code>/archives/windows/antivirus/</code> 
                            ou <code>/archives/linux/antivirus/</code> dependendo do sistema operacional.
                        </div>
                    </div>
                    
                    <!-- Botão de confirmação unificado -->
                    <div class="button-group">
                        <button id="antivirus-confirm-button" class="banner-confirm antivirus">Continuar Instalação</button>
                        <button id="antivirus-cancel-button" class="banner-cancel">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    // Estilos CSS para os banners
    const styles = `
        :root {
            --black-absolute: #000000;
            --black-rich: #030303;
            --black-elegant: #0A0A0A;
            --black-pearl: #121212;
            --black-smoke: #1A1A1A;
            --gray-dark: #2A2A2A;
            --accent-blue: #2196F3;
            --accent-blue-hover: #42A5F5;
            --accent-green: #4CAF50;
            --accent-green-hover: #66BB6A;
            --accent-gold: #FFD600;
            --accent-gold-hover: #FFE033;
            --text-primary: #FFFFFF;
            --text-secondary: #B0B0B0;
            --text-tertiary: #808080;
            --success-green: #2E7D32;
            --error-red: #C62828;
            --warning-orange: #FF9800;
        }
        
        /* Estilos dos Banners */
        .unified-banner {
            background: var(--black-pearl);
            width: calc(100% - 20px);
            border-radius: 6px;
            margin: 10px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            display: none;
            position: relative;
            border: 1px solid var(--gray-dark);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100;
        }
        
        .unified-banner.visible { 
            display: block; 
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .banner-header {
            background: var(--black-elegant);
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--gray-dark);
            border-radius: 6px 6px 0 0;
        }
        
        .banner-header h3 {
            margin: 0;
            font-size: 16px;
            display: flex;
            align-items: center;
            color: var(--text-primary);
        }
        
        .banner-header h3.site24x7 {
            color: var(--accent-blue);
        }
        
        .banner-header h3.antivirus {
            color: var(--accent-green);
        }
        
        .banner-header h3::before {
            content: "";
            display: inline-block;
            width: 18px;
            height: 18px;
            margin-right: 8px;
            background-size: contain;
            background-repeat: no-repeat;
        }
        
        /* Ícones específicos para cada tipo de banner */
        h3.site24x7::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232196F3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E");
        }
        
        h3.antivirus::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234CAF50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E");
        }
        
        .banner-close {
            background: none;
            border: none;
            color: #e06c75;
            cursor: pointer;
            font-size: 14px;
            transition: transform 0.2s ease;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .banner-close:hover {
            background-color: rgba(224, 108, 117, 0.1);
            transform: scale(1.1);
        }
        
        .banner-content {
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .banner-section {
            display: none;
            flex-direction: column;
            gap: 10px;
        }
        
        .banner-section.active {
            display: flex;
        }
        
        .banner-section label {
            color: var(--text-primary);
            font-size: 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .banner-section input[type="text"], 
        .banner-section textarea, 
        .banner-section select {
            background: var(--black-elegant);
            border: 1px solid var(--gray-dark);
            border-radius: 4px;
            padding: 10px;
            color: var(--text-primary);
            font-size: 14px;
            width: 100%;
        }
        
        .banner-section textarea {
            resize: vertical;
            min-height: 120px;
        }
        
        .banner-section input::placeholder,
        .banner-section textarea::placeholder {
            color: var(--text-tertiary);
            opacity: 0.7;
        }
        
        .banner-section select {
            cursor: pointer;
        }
        
        .banner-section select optgroup {
            background: var(--black-elegant);
        }
        
        .banner-section select option {
            background: var(--black-elegant);
            padding: 8px;
        }
        
        .key-display {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .key-display input {
            flex: 1;
        }
        
        .custom-key {
            display: flex !important;
            flex-direction: row !important;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        }
        
        .custom-key input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
        }
        
        .copy-button {
            background: var(--gray-dark);
            border: none;
            border-radius: 3px;
            padding: 5px 10px;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .copy-button:hover {
            background: var(--gray-dark);
            color: var(--text-primary);
        }
        
        .info-box {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--gray-dark);
            border-radius: 4px;
            padding: 10px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 15px;
        }
        
        .info-icon {
            flex-shrink: 0;
            font-size: 14px;
        }
        
        .info-text {
            flex: 1;
            line-height: 1.4;
        }
        
        .info-text code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            color: var(--accent-blue);
        }
        
        /* Botões de ações */
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            justify-content: flex-end;
        }
        
        .banner-confirm,
        .banner-cancel {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .banner-confirm.site24x7 {
            background: var(--accent-blue);
            color: var(--text-primary);
        }
        
        .banner-confirm.antivirus {
            background: var(--accent-green);
            color: var(--text-primary);
        }
        
        .banner-confirm.site24x7:hover {
            background: var(--accent-blue-hover);
        }
        
        .banner-confirm.antivirus:hover {
            background: var(--accent-green-hover);
        }
        
        .banner-cancel {
            background: var(--gray-dark);
            color: var(--text-secondary);
        }
        
        .banner-cancel:hover {
            background: #3a3a3a;
            color: var(--text-primary);
        }
        
        /* Seleção atual */
        .selected-config-indicator {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--gray-dark);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 13px;
            display: flex;
            align-items: center;
            margin: 10px;
            transition: all 0.3s ease;
            color: var(--text-secondary);
            gap: 10px;
        }
        
        .selected-config-indicator .reset-button {
            background: transparent;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            padding: 2px 5px;
            border-radius: 4px;
            margin-left: auto;
            transition: all 0.2s ease;
        }
        
        .selected-config-indicator .reset-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }
        
        .selected-config-indicator strong {
            color: var(--text-primary);
        }
        
        .selected-config-indicator.site24x7 {
            border-left: 3px solid var(--accent-blue);
        }
        
        .selected-config-indicator.antivirus {
            border-left: 3px solid var(--accent-green);
        }
        
        .selected-config-indicator.site24x7::before {
            content: "";
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232196F3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }
        
        .selected-config-indicator.antivirus::before {
            content: "";
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234CAF50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
            .unified-banner {
                width: calc(100% - 10px);
                margin: 5px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .banner-confirm, .banner-cancel {
                width: 100%;
            }
        }
    `;

    // Utilidades
    const utils = {
        // Verifica o tipo de playbook com base no nome
        getPlaybookType: (playbookName) => {
            if (!playbookName) return null;
            
            const playbookLower = playbookName.toLowerCase();
            
            // Verificar por tipo
            if (config.keywords.site24x7.some(kw => playbookLower.includes(kw))) {
                return 'site24x7';
            }
            
            if (config.keywords.antivirus.some(kw => playbookLower.includes(kw))) {
                return 'antivirus';
            }
            
            return null;
        },
        
        // Obtém o nome de exibição customizado para uma playbook
        getDisplayName: (playbookName) => {
            // Extrai apenas o nome do arquivo sem o caminho
            const filename = playbookName.split('/').pop();
            // Retorna o nome personalizado ou o nome do arquivo sem extensão
            return config.displayNames[filename] || filename.replace('.yml', '');
        },
        
        // Adiciona notificação na interface
        showNotification: (message, type = 'info') => {
            const container = document.querySelector('.ansible-execution');
            if (!container) return;
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-icon">${type === 'info' ? 'ℹ️' : type === 'success' ? '✅' : '⚠️'}</span>
                    <span class="notification-message">${message}</span>
                </div>
                <button class="notification-close">✕</button>
            `;
            
            notification.style.cssText = `
                background: ${type === 'info' ? 'rgba(33, 150, 243, 0.1)' : 
                            type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
                            'rgba(255, 152, 0, 0.1)'};
                border-left: 3px solid ${type === 'info' ? 'var(--accent-blue)' : 
                                        type === 'success' ? 'var(--accent-green)' : 
                                        'var(--warning-orange)'};
                padding: 12px;
                margin-bottom: 15px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                animation: fadeIn 0.3s ease-out;
            `;
            
            container.insertBefore(notification, container.firstChild);
            
            // Botão para fechar a notificação
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            });
            
            // Auto-fechar após 10 segundos
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 10000);
        },
        
        // Criar indicador de configuração selecionada
        createConfigIndicator: (type, config) => {
            // Remover indicador anterior do mesmo tipo se existir
            const existingIndicator = document.querySelector(`.selected-config-indicator.${type}`);
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Criar novo indicador
            const indicator = document.createElement('div');
            indicator.className = `selected-config-indicator ${type}`;
            
            let configText = '';
            if (type === 'site24x7') {
                const keyName = config.customKey ? 'Personalizada' : 
                    [...site24x7Keys.principais, ...site24x7Keys.secundarias]
                        .find(k => k.key === config.deviceKey)?.name || 'Desconhecida';
                
                configText = `Site24x7: <strong>${keyName}</strong> | Sistema: <strong>${config.osType === 'windows' ? 'Windows' : 'Linux'}</strong>`;
            } else if (type === 'antivirus') {
                if (config.customScript) {
                    configText = `Antivírus: <strong>Script Personalizado (${config.filename})</strong> | Sistema: <strong>${config.osType === 'windows' ? 'Windows' : 'Linux'}</strong>`;
                } else {
                    configText = `Antivírus: <strong>${config.name}</strong> | Sistema: <strong>${config.osType === 'windows' ? 'Windows' : 'Linux'}</strong>`;
                }
            }
            
            indicator.innerHTML = `
                ${configText}
                <button class="reset-button" data-type="${type}">Limpar</button>
            `;
            
            // Adicionar ao container de playbooks
            const container = document.querySelector('.ansible-automation-panel');
            if (container) {
                container.parentNode.insertBefore(indicator, container);
                
                // Adicionar evento ao botão de reset
                indicator.querySelector('.reset-button').addEventListener('click', (e) => {
                    const configType = e.target.getAttribute('data-type');
                    config.selectedInfo[configType] = null;
                    indicator.remove();
                    utils.showNotification(`Configuração de ${configType === 'site24x7' ? 'Site24x7' : 'Antivírus'} removida`, 'info');
                });
            }
            
            return indicator;
        },
        
        // Verificar se uma playbook é de site24x7 ou antivírus
        checkSelectedPlaybooks: () => {
            const selectedPlaybooks = window.selectedPlaybooks || new Set();
            
            const hasSite24x7 = Array.from(selectedPlaybooks).some(playbook => 
                utils.getPlaybookType(playbook) === 'site24x7'
            );
            
            const hasAntivirus = Array.from(selectedPlaybooks).some(playbook => 
                utils.getPlaybookType(playbook) === 'antivirus'
            );
            
            return { hasSite24x7, hasAntivirus };
        },
        
     //Registra no console para debug
     debug: (message, type = 'info') => {
        const prefix = `[UnifiedAnsibleManager] [${type.toUpperCase()}]`;
        if (type === 'error') {
            console.error(`${prefix} ${message}`);
        } else if (type === 'warning') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
};

// Injetar estilos CSS
const injectStyles = () => {
    if (document.getElementById('unified-ansible-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'unified-ansible-styles';
    style.textContent = styles;
    document.head.appendChild(style);
    
    utils.debug('Estilos CSS injetados');
};

// Injetar o banner para o tipo específico (site24x7 ou antivirus)
const injectBanner = (type) => {
    // Se já existe um banner do mesmo tipo, não criar outro
    if (document.getElementById(`${type}-banner`)) {
        return;
    }
    
    // Se já temos outro banner visível, colocar este na fila
    const existingBanner = document.querySelector('.unified-banner.visible');
    if (existingBanner) {
        utils.debug(`Banner de ${type} colocado na fila`);
        state.pendingBanners.push(type);
        return;
    }
    
    utils.debug(`Injetando banner de ${type}`);
    
    const container = document.querySelector(config.playbooksContainer);
    if (!container) return;

    const banner = document.createElement('div');
    
    if (type === 'site24x7') {
        banner.innerHTML = bannersHTML.site24x7;
    } else if (type === 'antivirus') {
        banner.innerHTML = bannersHTML.antivirus;
    } else {
        return; // Tipo desconhecido
    }
    
    const bannerElement = banner.firstElementChild;
    container.parentNode.insertBefore(bannerElement, container);
    
    // Mostrar o banner
    bannerElement.classList.add('visible');
    
    setupBannerEvents(bannerElement, type);
    populateSelectOptions(type);
    
    state.bannerAdded = true;
};

// Mostrar próximo banner da fila (se houver)
const showNextBanner = () => {
    if (state.pendingBanners.length > 0) {
        const nextType = state.pendingBanners.shift();
        utils.debug(`Mostrando próximo banner da fila: ${nextType}`);
        injectBanner(nextType);
    }
};

// Preencher as opções nos selects
const populateSelectOptions = (type) => {
    if (type === 'site24x7') {
        // Preencher o select de chaves do Site24x7
        const site24x7Select = document.getElementById('site24x7-key-select');
        if (site24x7Select) {
            // Limpar opções existentes
            site24x7Select.innerHTML = '';
            
            // Grupo de opções principais
            const principaisGroup = document.createElement('optgroup');
            principaisGroup.label = 'Principais';
            
            site24x7Keys.principais.forEach(key => {
                const option = document.createElement('option');
                option.value = key.key;
                option.textContent = key.name;
                principaisGroup.appendChild(option);
            });
            
            site24x7Select.appendChild(principaisGroup);
            
            // Grupo de todas as opções
            const todasGroup = document.createElement('optgroup');
            todasGroup.label = 'Todas as Chaves';
            
            site24x7Keys.secundarias.forEach(key => {
                const option = document.createElement('option');
                option.value = key.key;
                option.textContent = key.name;
                todasGroup.appendChild(option);
            });
            
            site24x7Select.appendChild(todasGroup);
            
            // Atualizar o campo de input ao mudar a seleção
            site24x7Select.addEventListener('change', function() {
                document.getElementById('site24x7-key-input').value = this.value;
            });
            
            // Inicializar com o primeiro valor
            if (site24x7Keys.principais.length > 0) {
                document.getElementById('site24x7-key-input').value = site24x7Keys.principais[0].key;
            }
        }
    } else if (type === 'antivirus') {
        // Preencher o select de tipos de antivírus
        const antivirusSelect = document.getElementById('antivirus-script-select');
        if (antivirusSelect) {
            updateAntivirusOptions();
        }
    }
};

// Atualizar opções de antivírus com base no sistema operacional selecionado
const updateAntivirusOptions = () => {
    const antivirusSelect = document.getElementById('antivirus-script-select');
    if (!antivirusSelect) return;
    
    const osType = document.querySelector('input[name="av_os_type"]:checked').value;
    
    // Limpar opções existentes
    antivirusSelect.innerHTML = '';
    
    // Adicionar as opções para o sistema selecionado
    const options = antivirusConfigs[osType] || [];
    options.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.script;
        optElement.textContent = option.name;
        antivirusSelect.appendChild(optElement);
    });
    
    // Atualizar o placeholder do campo de script personalizado
    const filenameInput = document.getElementById('antivirus-custom-filename');
    if (filenameInput) {
        filenameInput.placeholder = osType === 'windows' ? 'personalizado.ps1' : 'personalizado.sh';
    }
};

// Configurar eventos do banner
const setupBannerEvents = (banner, type) => {
    // Botão de fechar
    banner.querySelector('.banner-close').addEventListener('click', () => {
        banner.classList.remove('visible');
        setTimeout(() => {
            banner.remove();
            state.bannerAdded = false;
            showNextBanner();
        }, 300);
    });
    
    if (type === 'site24x7') {
        // Checkbox para chave personalizada do Site24x7
        const customKeyToggle = document.getElementById('site24x7-custom-key-toggle');
        const customKeyContainer = document.getElementById('site24x7-custom-key-container');
        
        if (customKeyToggle && customKeyContainer) {
            customKeyToggle.addEventListener('change', () => {
                customKeyContainer.style.display = customKeyToggle.checked ? 'block' : 'none';
            });
        }
        
        // Botões de copiar
        banner.querySelectorAll('.copy-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    navigator.clipboard.writeText(target.value);
                    btn.textContent = '✓';
                    setTimeout(() => btn.textContent = '📋', 1500);
                }
            });
        });
        
        // Botão de confirmar Site24x7
        const confirmButton = document.getElementById('site24x7-confirm-button');
        if (confirmButton) {
            confirmButton.addEventListener('click', confirmSite24x7Config);
        }
        
        // Botão de cancelar
        const cancelButton = document.getElementById('site24x7-cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                banner.classList.remove('visible');
                setTimeout(() => {
                    banner.remove();
                    state.bannerAdded = false;
                    showNextBanner();
                }, 300);
            });
        }
    } else if (type === 'antivirus') {
        // Checkbox para script personalizado
        const customToggle = document.getElementById('antivirus-custom-toggle');
        const customContainer = document.getElementById('antivirus-custom-container');
        
        if (customToggle && customContainer) {
            customToggle.addEventListener('change', () => {
                customContainer.style.display = customToggle.checked ? 'block' : 'none';
            });
        }
        
        // Botão de confirmar Antivírus
        const confirmButton = document.getElementById('antivirus-confirm-button');
        if (confirmButton) {
            confirmButton.addEventListener('click', confirmAntivirusConfig);
        }
        
        // Botão de cancelar
        const cancelButton = document.getElementById('antivirus-cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                banner.classList.remove('visible');
                setTimeout(() => {
                    banner.remove();
                    state.bannerAdded = false;
                    showNextBanner();
                }, 300);
            });
        }
    }
};

// Confirmar configuração do Site24x7
const confirmSite24x7Config = () => {
    try {
        const customKeyToggle = document.getElementById('site24x7-custom-key-toggle');
        const isCustomKey = customKeyToggle && customKeyToggle.checked;
        
        let deviceKey;
        if (isCustomKey) {
            deviceKey = document.getElementById('site24x7-custom-key').value.trim();
            if (!deviceKey) {
                utils.showNotification('Por favor, insira uma chave personalizada válida', 'warning');
                return;
            }
        } else {
            deviceKey = document.getElementById('site24x7-key-input').value.trim();
            if (!deviceKey) {
                utils.showNotification('Por favor, selecione uma chave válida', 'warning');
                return;
            }
        }
        
        const osType = document.querySelector('input[name="site24x7_os"]:checked').value;
        
        // Salvar configuração
        config.selectedInfo.site24x7 = {
            deviceKey,
            customKey: isCustomKey,
            osType
        };
        
        // Criar indicador visual da configuração selecionada
        utils.createConfigIndicator('site24x7', config.selectedInfo.site24x7);
        
        // Fechar o banner
        const banner = document.getElementById('site24x7-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
                state.bannerAdded = false;
                showNextBanner();
            }, 300);
        }
        
        utils.showNotification('Configuração de Site24x7 salva com sucesso!', 'success');
        utils.debug('Configuração Site24x7 confirmada', 'info');
    } catch (error) {
        utils.debug(`Erro ao confirmar configuração Site24x7: ${error.message}`, 'error');
        utils.showNotification('Erro ao salvar configuração de Site24x7', 'warning');
    }
};

// Confirmar configuração de Antivírus
const confirmAntivirusConfig = () => {
    try {
        const customToggle = document.getElementById('antivirus-custom-toggle');
        const isCustomScript = customToggle && customToggle.checked;
        
        const osType = document.querySelector('input[name="av_os_type"]:checked').value;
        
        let scriptConfig;
        if (isCustomScript) {
            const filename = document.getElementById('antivirus-custom-filename').value.trim();
            const scriptContent = document.getElementById('antivirus-custom-content').value.trim();
            
            if (!filename) {
                utils.showNotification('Por favor, informe um nome para o arquivo do script personalizado', 'warning');
                return;
            }
            
            if (!scriptContent) {
                utils.showNotification('Por favor, informe o conteúdo do script personalizado', 'warning');
                return;
            }
            
            scriptConfig = {
                customScript: true,
                filename,
                scriptContent,
                osType,
                name: 'Script Personalizado'
            };
        } else {
            const scriptSelect = document.getElementById('antivirus-script-select');
            const selectedScript = scriptSelect.value;
            const selectedName = scriptSelect.options[scriptSelect.selectedIndex].text;
            
            if (!selectedScript) {
                utils.showNotification('Por favor, selecione um script de antivírus', 'warning');
                return;
            }
            
            scriptConfig = {
                customScript: false,
                script: selectedScript,
                osType,
                name: selectedName
            };
        }
        
        // Salvar configuração
        config.selectedInfo.antivirus = scriptConfig;
        
        // Criar indicador visual da configuração selecionada
        utils.createConfigIndicator('antivirus', config.selectedInfo.antivirus);
        
        // Fechar o banner
        const banner = document.getElementById('antivirus-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
                state.bannerAdded = false;
                showNextBanner();
            }, 300);
        }
        
        utils.showNotification('Configuração de Antivírus salva com sucesso!', 'success');
        utils.debug('Configuração Antivírus confirmada', 'info');
    } catch (error) {
        utils.debug(`Erro ao confirmar configuração Antivírus: ${error.message}`, 'error');
        utils.showNotification('Erro ao salvar configuração de Antivírus', 'warning');
    }
};

// Sobrescrever a função original de execução de playbooks
const overridePlaybookExecution = () => {
    // Armazenar referência da função original
    const originalExecutePlaybooks = window.executePlaybooks || window.executeSelectedPlaybooks;
    
    // Sobrescrever com nossa versão
    window.executePlaybooks = window.executeSelectedPlaybooks = function() {
        if (state.executionInProgress) {
            utils.showNotification('Execução já em andamento, aguarde o término da operação atual', 'warning');
            return;
        }
        
        // Verificar se existe ao menos um host e uma playbook selecionados
        const selectedHosts = window.selectedHosts || new Set();
        const selectedPlaybooks = window.selectedPlaybooks || new Set();
        
        if (selectedHosts.size === 0) {
            utils.showNotification('Selecione pelo menos um host para executar', 'warning');
            return;
        }
        
        if (selectedPlaybooks.size === 0) {
            utils.showNotification('Selecione pelo menos uma playbook para executar', 'warning');
            return;
        }
        
        try {
            state.executionInProgress = true;
            
            // Verificar tipos de playbook selecionadas
            const { hasSite24x7, hasAntivirus } = utils.checkSelectedPlaybooks();
            
            if (hasSite24x7 && !config.selectedInfo.site24x7) {
                // Precisa configurar Site24x7
                state.pendingBanners = [];
                if (hasAntivirus && !config.selectedInfo.antivirus) {
                    state.pendingBanners.push('antivirus');
                }
                injectBanner('site24x7');
                return;
            }
            
            if (hasAntivirus && !config.selectedInfo.antivirus) {
                // Precisa configurar Antivírus
                injectBanner('antivirus');
                return;
            }
            
            // Se chegou aqui, ou não precisa de configuração ou já temos as configurações
            executePlaybooks();
            
        } catch (error) {
            utils.debug(`Erro ao executar playbooks: ${error.message}`, 'error');
            state.executionInProgress = false;
            utils.showNotification(`Erro ao executar playbooks: ${error.message}`, 'warning');
        }
    };
    
    utils.debug('Função de execução de playbooks sobrescrita');
};

// Executar playbooks com as configurações definidas
const executePlaybooks = async () => {
    try {
        utils.debug('Iniciando execução das playbooks');
        
        // Referências para funções originais
        const originalFetch = window.fetch;
        
        // Sobrescrever fetch para interceptar chamadas à API
        window.fetch = function(url, options) {
            if (url === '/api/run' && options?.method === 'POST') {
                const data = JSON.parse(options.body);
                
                // Verificar tipo de playbook
                const playbookPath = data.playbook;
                const playbookType = utils.getPlaybookType(playbookPath);
                
                // Adicionar variáveis extras conforme o tipo
                if (playbookType === 'site24x7' && config.selectedInfo.site24x7) {
                    data.extra_vars = data.extra_vars || {};
                    data.extra_vars.device_key = config.selectedInfo.site24x7.deviceKey;
                    data.extra_vars.os_type = config.selectedInfo.site24x7.osType;
                    
                    utils.debug(`Adicionando configuração Site24x7 à requisição: ${JSON.stringify(data.extra_vars)}`);
                } else if (playbookType === 'antivirus' && config.selectedInfo.antivirus) {
                    data.extra_vars = data.extra_vars || {};
                    
                    if (config.selectedInfo.antivirus.customScript) {
                        data.extra_vars.custom_script = true;
                        data.extra_vars.script_filename = config.selectedInfo.antivirus.filename;
                        data.extra_vars.script_content = config.selectedInfo.antivirus.scriptContent;
                    } else {
                        data.extra_vars.custom_script = false;
                        data.extra_vars.script_filename = config.selectedInfo.antivirus.script;
                    }
                    
                    data.extra_vars.os_type = config.selectedInfo.antivirus.osType;
                    
                    utils.debug(`Adicionando configuração Antivírus à requisição: ${JSON.stringify(data.extra_vars)}`);
                }
                
                options.body = JSON.stringify(data);
            }
            return originalFetch.apply(this, arguments);
        };
        
        // Chamar a função original para executar
        if (typeof window.executeRegularPlaybooks === 'function') {
            await window.executeRegularPlaybooks();
        } else {
            // Fallback se não encontrar a função nomeada
            const selectedPlaybooks = window.selectedPlaybooks || new Set();
            const selectedHosts = window.selectedHosts || new Set();
            
            utils.debug(`Executando ${selectedPlaybooks.size} playbooks em ${selectedHosts.size} hosts`);
            
            // Restaurar fetch original após o timeout para evitar vazamento
            setTimeout(() => { window.fetch = originalFetch; }, 1000);
        }
    } catch (error) {
        utils.debug(`Erro na execução das playbooks: ${error.message}`, 'error');
        utils.showNotification(`Erro na execução: ${error.message}`, 'warning');
    } finally {
        state.executionInProgress = false;
    }
};

// Monitorar seleção de playbooks
const monitorPlaybookSelection = () => {
    document.addEventListener('click', event => {
        const checkbox = event.target.closest('input[type="checkbox"]');
        if (!checkbox) return;
        
        // Quando uma seleção é alterada, verificar tipos de playbook
        setTimeout(() => {
            const { hasSite24x7, hasAntivirus } = utils.checkSelectedPlaybooks();
            
            // Se não há nenhum dos tipos especiais selecionados, remover os indicadores
            if (!hasSite24x7 && document.querySelector('.selected-config-indicator.site24x7')) {
                document.querySelector('.selected-config-indicator.site24x7').remove();
            }
            
            if (!hasAntivirus && document.querySelector('.selected-config-indicator.antivirus')) {
                document.querySelector('.selected-config-indicator.antivirus').remove();
            }
            
            utils.debug(`Seleção atualizada: Site24x7=${hasSite24x7}, Antivírus=${hasAntivirus}`);
        }, 100);
    });
};

// Inicializar
const init = () => {
    injectStyles();
    monitorPlaybookSelection();
    overridePlaybookExecution();
    
    // Expor função de atualização para escopo global
    window.UnifiedAnsibleManager = {
        updateAntivirusOptions
    };
    
    utils.debug('Gerenciador unificado inicializado');
};

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Retornar API pública
return {
    updateAntivirusOptions,
    injectBanner,
    debug: utils.debug
};
})();