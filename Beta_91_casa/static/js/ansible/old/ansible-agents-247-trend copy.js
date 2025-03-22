/**
 * special-agents-robust-fix.js
 * Implementação robusta para garantir que os botões de configuração funcionem corretamente
 */

// Auto-execução imediata para aplicar as correções
(function() {
    console.log("Aplicando solução robusta para botões de configuração...");
    
    // Constantes para identificação de playbooks especiais
    const SITE24X7_KEYWORDS = ['site24x7', '24x7'];
    const ANTIVIRUS_KEYWORDS = ['antivirus', 'trendmicro'];
    
    // Valores padrão
    const DEFAULT_SITE24X7_KEY = 'us_df8c061ef70463b255e8b575406addfc'; // Operação - AutoSky
    const DEFAULT_ANTIVIRUS_SCRIPT = 'antivirus.ps1';
    
    // Dados de grupos Site24x7
    const SITE24X7_GROUPS = [
        { name: 'Operação - AutoSky', key: 'us_df8c061ef70463b255e8b575406addfc' },
        { name: 'BGM - Praxio', key: 'us_8e715d1f97d4f0ec254a90079d2249db' },
        { name: 'CTA Sistemas [OPER]', key: 'us_0216ce8dbb4b1913045cc79ee1370c74' },
        { name: 'Core - AutoSky', key: 'us_966606871b04f2e966f54b1de7b886b6' },
        { name: 'Operação - SAP', key: 'us_379a0e69c7769bbc6a3771569aceb974' },
        { name: 'Operação - Protheus', key: 'us_3426b8f0d4705462da00057e1696c620' },
        { name: 'Contmatic', key: 'us_ded36cf6c477939d6f9f74ceb90b8ea7' },
        { name: 'SKYDB (J&V)', key: 'us_bf0da5d532db330e40b1299ccdd24e23' },
        { name: 'SKYDB (J&V) - ASUN', key: 'us_5dda573a24a261fc019258a7df777aea' },
        { name: 'SKYDB (J&V) - Guanabara RJ', key: 'us_e142d2777ac2278170fa0b9408f22533' },
        { name: 'SKYDB (J&V) - Guanabara RS', key: 'us_62eaf9386fb2061201d249141ad93712' }
        // Outros grupos omitidos por brevidade
    ];
    
    // Scripts de antivírus disponíveis
    const ANTIVIRUS_SCRIPTS = [
        { name: 'Antivírus Padrão (Windows)', file: 'antivirus.ps1' },
        { name: 'Trend Micro - Servidor Linux', file: 'trend_micro_linux_server.sh' },
        { name: 'Trend Micro - Workstation Linux', file: 'trend_micro_linux_workstation.sh' },
        { name: 'Trend Micro - Oracle Linux', file: 'trend_micro_oracle_linux.sh' },
        { name: 'Trend Micro - Ubuntu', file: 'trend_micro_ubuntu.sh' },
        { name: 'CTA Antivírus', file: 'cta_antivirus.sh' }
    ];

    // Limpar configurações anteriores
    function cleanupPreviousImplementation() {
        // Remover estilos anteriores
        document.querySelectorAll('style').forEach(style => {
            if (style.textContent.includes('configure-btn') || 
                style.textContent.includes('special-agent-modal')) {
                style.remove();
            }
        });
        
        // Remover botões existentes
        document.querySelectorAll('.configure-btn, .config-button, .config-badge').forEach(el => {
            el.remove();
        });
        
        // Remover modais existentes
        document.querySelectorAll('.special-agent-modal, #site24x7-modal, #antivirus-modal').forEach(el => {
            el.remove();
        });
    }

// Função para criar o banner persistente
function createPersistentBanner() {
    // Remover qualquer banner existente para evitar duplicatas
    const existingBanner = document.querySelector('#persistent-config-banner');
    if (existingBanner) existingBanner.remove();

    // Criar o banner
    const banner = document.createElement('div');
    banner.id = 'persistent-config-banner';
    banner.innerHTML = `
        <div class="banner-container">
            <div class="banner-header">
                <h3>Configuração Rápida</h3>
                <button type="button" class="banner-close">✕</button>
            </div>
            <div class="banner-body">
                <p>Selecione as configurações para suas playbooks especiais.</p>
                <div class="banner-actions">
                    <button type="button" class="banner-site24x7">Configurar Site24x7</button>
                    <button type="button" class="banner-antivirus">Configurar Antivírus</button>
                </div>
            </div>
        </div>
    `;

    // Estilos embutidos para garantir que o banner seja visível e persistente
    banner.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 999999 !important;
        background: none !important;
        font-family: Arial, sans-serif !important;
    `;

    const containerStyles = `
        background-color: #121212 !important;
        border-radius: 8px !important;
        width: 400px !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5) !important;
        color: #FFFFFF !important;
    `;

    const headerStyles = `
        padding: 10px 15px !important;
        background-color: #0A0A0A !important;
        border-bottom: 1px solid #2A2A2A !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
    `;

    const bodyStyles = `
        padding: 15px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
    `;

    const buttonStyles = `
        background-color: #FFD600 !important;
        color: #000000 !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 10px 15px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        margin: 5px !important;
        transition: background-color 0.2s !important;
    `;

    const closeButtonStyles = `
        background: none !important;
        border: none !important;
        color: #808080 !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 0 !important;
    `;

    // Aplicar estilos aos elementos internos
    banner.querySelector('.banner-container').style.cssText = containerStyles;
    banner.querySelector('.banner-header').style.cssText = headerStyles;
    banner.querySelector('.banner-body').style.cssText = bodyStyles;
    banner.querySelector('.banner-close').style.cssText = closeButtonStyles;
    banner.querySelector('h3').style.cssText = 'margin: 0 !important; color: #FFD600 !important;';
    
    // Estilizar botões de ação
    banner.querySelectorAll('.banner-site24x7, .banner-antivirus').forEach(btn => {
        btn.style.cssText = buttonStyles;
    });

    // Adicionar ao DOM
    document.body.appendChild(banner);

    // Configurar eventos
    setupBannerEvents(banner);

    // Iniciar monitoramento para persistência
    ensureBannerPersistence(banner);

    console.log('Banner persistente criado com sucesso!');

    return banner;
}

    // Configurar eventos do banner
    function setupBannerEvents(banner) {
        const closeButton = banner.querySelector('.banner-close');
        const site24x7Button = banner.querySelector('.banner-site24x7');
        const antivirusButton = banner.querySelector('.banner-antivirus');

        // Fechar o banner
        closeButton.addEventListener('click', () => {
            clearInterval(banner.dataset.persistenceInterval);
            banner.remove();
            console.log('Banner fechado pelo usuário.');
        });

        // Abrir modal do Site24x7
        site24x7Button.addEventListener('click', () => {
            openSite24x7Modal();
        });

        // Abrir modal do Antivírus
        antivirusButton.addEventListener('click', () => {
            openAntivirusModal();
        });
    }

    // Garantir que o banner permaneça no DOM
    function ensureBannerPersistence(banner) {
        const persistenceInterval = setInterval(() => {
            if (!document.body.contains(banner)) {
                console.warn('Banner removido detectado, restaurando...');
                document.body.appendChild(banner);
                setupBannerEvents(banner); // Reconfigurar eventos
            }
        }, 200); // Verifica a cada 200ms para resposta rápida

        // Armazenar o ID do intervalo no elemento para limpeza
        banner.dataset.persistenceInterval = persistenceInterval;
    }

    // Exportar função de criação do banner
    window.createPersistentBanner = createPersistentBanner;

    // Adicionar estilos robustos
    function addRobustStyles() {
        const style = document.createElement('style');
        style.id = 'special-agents-robust-styles';
        style.textContent = `
            /* Estilo para o card de playbook - garantir posicionamento relativo */
            .playbook-item {
                position: relative !important;
                overflow: visible !important;
            }
            
            /* Botão de configuração absolutamente posicionado */
            .config-button {
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                background-color: #FFD600 !important;
                color: #000000 !important;
                border: none !important;
                border-radius: 4px !important;
                padding: 6px 12px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                cursor: pointer !important;
                z-index: 9999 !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
                transition: transform 0.2s, background-color 0.2s !important;
                pointer-events: auto !important;
            }
            
            /* Estado de hover para o botão de configuração */
            .config-button:hover {
                background-color: #FFE033 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
            }
            
            /* Estado ativo (clicando) para o botão de configuração */
            .config-button:active {
                transform: translateY(0) !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
            }
            
            /* Badge de configuração concluída */
            .config-badge {
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                background-color: #4CAF50 !important;
                color: white !important;
                border-radius: 12px !important;
                padding: 2px 8px !important;
                font-size: 10px !important;
                font-weight: bold !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                z-index: 10 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            }
            
            /* Modal de configuração */
            .modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0,0,0,0.7) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 99999 !important;
            }
            
            .modal-container {
                background-color: #121212 !important;
                border-radius: 8px !important;
                width: 90% !important;
                max-width: 500px !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                box-shadow: 0 5px 15px rgba(0,0,0,0.5) !important;
                display: flex !important;
                flex-direction: column !important;
            }
            
            .modal-header {
                padding: 16px !important;
                border-bottom: 1px solid #2A2A2A !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                background-color: #0A0A0A !important;
            }
            
            .modal-title {
                margin: 0 !important;
                color: #FFD600 !important;
                font-size: 18px !important;
                font-weight: bold !important;
            }
            
            .modal-close {
                background: none !important;
                border: none !important;
                color: #808080 !important;
                font-size: 24px !important;
                cursor: pointer !important;
                padding: 0 !important;
                line-height: 1 !important;
            }
            
            .modal-close:hover {
                color: #FFFFFF !important;
            }
            
            .modal-body {
                padding: 16px !important;
                color: #FFFFFF !important;
            }
            
            .modal-footer {
                padding: 16px !important;
                border-top: 1px solid #2A2A2A !important;
                display: flex !important;
                justify-content: flex-end !important;
                gap: 8px !important;
                background-color: #0A0A0A !important;
            }
            
            /* Formulários dentro do modal */
            .form-group {
                margin-bottom: 16px !important;
            }
            
            .form-label {
                display: block !important;
                margin-bottom: 8px !important;
                color: #FFFFFF !important;
                font-weight: 500 !important;
            }
            
            .form-select {
                width: 100% !important;
                padding: 8px 12px !important;
                background-color: #1A1A1A !important;
                border: 1px solid #2A2A2A !important;
                border-radius: 4px !important;
                color: #FFFFFF !important;
                appearance: none !important;
                cursor: pointer !important;
            }
            
            .form-select:focus {
                border-color: #FFD600 !important;
                outline: none !important;
            }
            
            .form-input {
                width: 100% !important;
                padding: 8px 12px !important;
                background-color: #1A1A1A !important;
                border: 1px solid #2A2A2A !important;
                border-radius: 4px !important;
                color: #FFFFFF !important;
            }
            
            .form-input:focus {
                border-color: #FFD600 !important;
                outline: none !important;
            }
            
            .form-textarea {
                width: 100% !important;
                min-height: 100px !important;
                padding: 8px 12px !important;
                background-color: #1A1A1A !important;
                border: 1px solid #2A2A2A !important;
                border-radius: 4px !important;
                color: #FFFFFF !important;
                font-family: monospace !important;
                resize: vertical !important;
            }
            
            .form-textarea:focus {
                border-color: #FFD600 !important;
                outline: none !important;
            }
            
            .form-checkbox {
                display: flex !important;
                align-items: center !important;
                margin-bottom: 16px !important;
                cursor: pointer !important;
            }
            
            .form-checkbox input {
                margin-right: 8px !important;
            }
            
            /* Botões do modal */
            .btn {
                padding: 8px 16px !important;
                border-radius: 4px !important;
                border: none !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background-color 0.2s !important;
            }
            
            .btn-primary {
                background-color: #FFD600 !important;
                color: #000000 !important;
            }
            
            .btn-primary:hover {
                background-color: #FFE033 !important;
            }
            
            .btn-secondary {
                background-color: #2A2A2A !important;
                color: #FFFFFF !important;
            }
            
            .btn-secondary:hover {
                background-color: #3A3A3A !important;
            }
            
            /* Texto de dica */
            .info-note {
                margin-top: 16px !important;
                padding: 12px !important;
                background-color: rgba(0,0,0,0.2) !important;
                border-left: 3px solid #FFD600 !important;
                border-radius: 4px !important;
            }
            
            .info-note p {
                margin: 0 !important;
                color: #B0B0B0 !important;
                font-size: 13px !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Verificar se uma playbook é de um tipo específico
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
    }

    // Verificar se a playbook é do tipo Site24x7
    function isSite24x7Playbook(name) {
        return isPlaybookOfType(name, SITE24X7_KEYWORDS);
    }

    // Verificar se a playbook é do tipo Antivírus
    function isAntivirusPlaybook(name) {
        return isPlaybookOfType(name, ANTIVIRUS_KEYWORDS);
    }

    // Adicionar botões de configuração em todas as playbooks relevantes
    function addConfigButtonsToPlaybooks() {
        // Obter todas as playbooks
        const playbooks = document.querySelectorAll('.playbook-item');
        
        playbooks.forEach(item => {
            // Remover botões existentes para evitar duplicação
            item.querySelectorAll('.config-button, .config-badge').forEach(el => el.remove());
            
            // Obter o nome da playbook
            const playbookName = item.getAttribute('data-playbook-name');
            if (!playbookName) return;
            
            // Determinar o tipo de playbook
            const isSite24x7 = isSite24x7Playbook(playbookName);
            const isAntivirus = isAntivirusPlaybook(playbookName);
            
            // Se não for uma playbook especial, ignorar
            if (!isSite24x7 && !isAntivirus) return;
            
            // Verificar se a playbook já está configurada
            const isConfigured = (isSite24x7 && window.site24x7Config) || 
                                (isAntivirus && window.antivirusConfig);
            
            // Criar o elemento apropriado (badge ou botão)
            if (isConfigured) {
                const badge = document.createElement('div');
                badge.className = 'config-badge';
                badge.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Configurado
                `;
                item.appendChild(badge);
            } else {
                const button = document.createElement('button');
                button.className = 'config-button';
                button.setAttribute('data-playbook', playbookName);
                button.setAttribute('type', 'button');
                button.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Configurar
                `;
                
                // Adicionar evento de clique robusto
                button.addEventListener('click', handleConfigButtonClick);
                
                // Prevenir propagação do evento (para não selecionar a playbook)
                button.addEventListener('mousedown', e => e.stopPropagation());
                button.addEventListener('mouseup', e => e.stopPropagation());
                button.addEventListener('touchstart', e => e.stopPropagation());
                button.addEventListener('touchend', e => e.stopPropagation());
                
                item.appendChild(button);
            }
        });
    }

    // Manipulador do evento de clique no botão de configuração
    function handleConfigButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.currentTarget;
        const playbookName = button.getAttribute('data-playbook');
        
        if (!playbookName) return;
        
        // Determinar o tipo de playbook e abrir o modal apropriado
        if (isSite24x7Playbook(playbookName)) {
            openSite24x7Modal();
        } else if (isAntivirusPlaybook(playbookName)) {
            openAntivirusModal();
        }
    }

    // Criar e abrir o modal do Site24x7
    function openSite24x7Modal() {
        // Remover qualquer modal existente
        closeAllModals();
        
        // Criar as opções do select para grupos
        let groupOptions = '';
        SITE24X7_GROUPS.forEach(group => {
            const selected = (group.key === DEFAULT_SITE24X7_KEY) ? 'selected' : '';
            groupOptions += `<option value="${group.key}" ${selected}>${group.name}</option>`;
        });
        
        // Criar o modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'site24x7-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">Configuração do Site24x7 Agent</h3>
                    <button type="button" class="modal-close" id="site24x7-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label" for="site24x7-group">Selecione o Grupo</label>
                        <select class="form-select" id="site24x7-group">
                            ${groupOptions}
                        </select>
                    </div>
                    
                    <div class="form-checkbox">
                        <input type="checkbox" id="site24x7-custom-key">
                        <label for="site24x7-custom-key">Usar chave personalizada</label>
                    </div>
                    
                    <div id="site24x7-key-container" style="display: none;">
                        <div class="form-group">
                            <label class="form-label" for="site24x7-key">Chave do dispositivo (Device Key)</label>
                            <input type="text" class="form-input" id="site24x7-key" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                        </div>
                    </div>
                    
                    <div class="info-note">
                        <p>A chave do dispositivo é necessária para autenticar o agente Site24x7 com o grupo correto. Se não for configurado, será utilizado o grupo padrão "Operação - AutoSky".</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="site24x7-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="site24x7-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        // Adicionar à página
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('site24x7-close').addEventListener('click', closeAllModals);
        document.getElementById('site24x7-cancel').addEventListener('click', closeAllModals);
        
        // Alternar entre grupo e chave personalizada
        document.getElementById('site24x7-custom-key').addEventListener('change', function() {
            document.getElementById('site24x7-key-container').style.display = this.checked ? 'block' : 'none';
        });
        
        // Pré-preencher com valores existentes, se houver
        if (window.site24x7Config && window.site24x7Config.deviceKey) {
            const deviceKey = window.site24x7Config.deviceKey;
            
            // Verificar se é uma chave de grupo conhecida
            let isGroupKey = false;
            for (const group of SITE24X7_GROUPS) {
                if (group.key === deviceKey) {
                    document.getElementById('site24x7-group').value = deviceKey;
                    isGroupKey = true;
                    break;
                }
            }
            
            // Se não for uma chave de grupo, assumir que é personalizada
            if (!isGroupKey) {
                document.getElementById('site24x7-custom-key').checked = true;
                document.getElementById('site24x7-key-container').style.display = 'block';
                document.getElementById('site24x7-key').value = deviceKey;
            }
        }
        
        // Confirmar configuração
        document.getElementById('site24x7-confirm').addEventListener('click', function() {
            const useCustomKey = document.getElementById('site24x7-custom-key').checked;
            let deviceKey;
            
            if (useCustomKey) {
                deviceKey = document.getElementById('site24x7-key').value.trim();
                if (!deviceKey) {
                    alert('Por favor, insira uma chave de dispositivo válida.');
                    return;
                }
            } else {
                deviceKey = document.getElementById('site24x7-group').value;
            }
            
            // Salvar configuração
            window.site24x7Config = { deviceKey };
            console.log('Configuração Site24x7 salva:', window.site24x7Config);
            
            // Fechar o modal
            closeAllModals();
            
            // Atualizar os botões/badges
            addConfigButtonsToPlaybooks();
            
            // Interceptar execução para incluir variáveis
            setupExecutionInterception();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
        });
    }

    // Criar e abrir o modal do Antivírus
    function openAntivirusModal() {
        // Remover qualquer modal existente
        closeAllModals();
        
        // Criar as opções do select para scripts
        let scriptOptions = '';
        ANTIVIRUS_SCRIPTS.forEach(script => {
            const selected = (script.file === DEFAULT_ANTIVIRUS_SCRIPT) ? 'selected' : '';
            scriptOptions += `<option value="${script.file}" ${selected}>${script.name}</option>`;
        });
        
        // Criar o modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'antivirus-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">Configuração do Agente Antivírus</h3>
                    <button type="button" class="modal-close" id="antivirus-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label" for="antivirus-script">Selecione o script de instalação</label>
                        <select class="form-select" id="antivirus-script">
                            ${scriptOptions}
                        </select>
                    </div>
                    
                    <div class="form-checkbox">
                        <input type="checkbox" id="antivirus-custom-script">
                        <label for="antivirus-custom-script">Usar script personalizado</label>
                    </div>
                    
                    <div id="antivirus-custom" style="display: none;">
                        <div class="form-group">
                            <label class="form-label" for="antivirus-filename">Nome do arquivo</label>
                            <input type="text" class="form-input" id="antivirus-filename" placeholder="script_instalacao.sh">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="antivirus-content">Conteúdo do script</label>
                            <textarea class="form-textarea" id="antivirus-content" placeholder="#!/bin/bash
# Cole aqui o conteúdo do seu script de instalação"></textarea>
                        </div>
                    </div>
                    
                    <div class="info-note">
                        <p>Escolha um script pré-definido ou forneça seu próprio script personalizado para instalação do antivírus. Se não for configurado, será utilizado o script padrão.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="antivirus-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="antivirus-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        // Adicionar à página
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('antivirus-close').addEventListener('click', closeAllModals);
        document.getElementById('antivirus-cancel').addEventListener('click', closeAllModals);
        
        // Alternar entre script pré-definido e personalizado
        document.getElementById('antivirus-custom-script').addEventListener('change', function() {
            document.getElementById('antivirus-custom').style.display = this.checked ? 'block' : 'none';
        });
        
        // Pré-preencher com valores existentes, se houver
        if (window.antivirusConfig) {
            if (window.antivirusConfig.customScript) {
                document.getElementById('antivirus-custom-script').checked = true;
                document.getElementById('antivirus-custom').style.display = 'block';
                document.getElementById('antivirus-filename').value = window.antivirusConfig.filename || '';
                document.getElementById('antivirus-content').value = window.antivirusConfig.content || '';
            } else if (window.antivirusConfig.script) {
                document.getElementById('antivirus-script').value = window.antivirusConfig.script;
            }
        }
        
        // Confirmar configuração
        document.getElementById('antivirus-confirm').addEventListener('click', function() {
            const useCustomScript = document.getElementById('antivirus-custom-script').checked;
            
            if (useCustomScript) {
                const filename = document.getElementById('antivirus-filename').value.trim();
                const content = document.getElementById('antivirus-content').value.trim();
                
                if (!filename || !content) {
                    alert('Por favor, preencha o nome do arquivo e o conteúdo do script.');
                    return;
                }
                
                // Salvar configuração
                window.antivirusConfig = {
                    customScript: true,
                    filename: filename,
                    content: content
                };
            } else {
                const script = document.getElementById('antivirus-script').value;
                
                // Salvar configuração
                window.antivirusConfig = {
                    customScript: false,
                    script: script
                };
            }
            
            console.log('Configuração Antivírus salva:', window.antivirusConfig);
            
            // Fechar o modal
            closeAllModals();
            
            // Atualizar os botões/badges
            addConfigButtonsToPlaybooks();
            
            // Interceptar execução para incluir variáveis
            setupExecutionInterception();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Antivírus salva com sucesso!', 'success');
        });
    }

// Fechar todos os modais
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.remove();
    });
}

// Mostrar mensagem de sucesso/erro com duração infinita
function showMessage(text, type = 'info', duration = null) {
    // Forçar que duration seja sempre null (duração infinita)
    duration = null;
    
    // Se a função global showMessage existir, tentamos usá-la, mas com um truque para garantir duração infinita
    if (typeof window.showMessage === 'function') {
        try {
            // Use um valor negativo ou extremamente grande para tentar forçar "infinito"
            window.showMessage(text, type, -1);
            return;
        } catch (e) {
            console.log('Erro ao usar showMessage global, usando implementação própria');
        }
    }
    
    // Criar um ID único para essa mensagem
    const messageId = 'msg_' + Math.random().toString(36).substr(2, 9);
    
    // Implementação própria
    console.log(`[${type}] ${text}`);
    
    // Criar elemento de mensagem
    const container = document.getElementById('running-playbooks');
    if (!container) return;
    
    // Definir cores com base no tipo de mensagem
    const colors = {
        success: { bg: 'rgba(76, 175, 80, 0.1)', border: '#4CAF50', text: '#4CAF50' },
        error: { bg: 'rgba(244, 67, 54, 0.1)', border: '#F44336', text: '#F44336' },
        warning: { bg: 'rgba(255, 152, 0, 0.1)', border: '#FF9800', text: '#FF9800' },
        info: { bg: 'rgba(33, 150, 243, 0.1)', border: '#2196F3', text: '#2196F3' }
    };
    
    const color = colors[type] || colors.info;
    
    const messageEl = document.createElement('div');
    messageEl.id = messageId;
    messageEl.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 6px;
        border-left: 4px solid ${color.border};
        background: ${color.bg};
        color: ${color.text};
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: fadeIn 0.3s ease;
    `;
    
    messageEl.innerHTML = `
        <span>${text}</span>
        <button style="background: none; border: none; color: ${color.text}; cursor: pointer;" 
                onclick="document.getElementById('${messageId}').remove()">✕</button>
    `;
    
    container.insertBefore(messageEl, container.firstChild);
    
    // Sobrescreva qualquer tentativa de remover automaticamente esta mensagem
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay) {
        // Se o callback for uma tentativa de remover nossa mensagem, não faça nada
        if (callback.toString().includes(messageId)) {
            console.log('Tentativa de remover mensagem interceptada');
            return -1; // Retornar um ID de timeout fictício
        }
        // Caso contrário, deixe o setTimeout normal funcionar
        return originalSetTimeout.apply(this, arguments);
    };
    
    // Restaurar o setTimeout original após um breve período
    originalSetTimeout(() => {
        window.setTimeout = originalSetTimeout;
    }, 500);
    
    // Para garantir ainda mais, vamos verificar periodicamente se a mensagem ainda existe
    const keepAliveInterval = originalSetTimeout(function checkMessageExists() {
        const msgElement = document.getElementById(messageId);
        if (msgElement && !container.contains(msgElement)) {
            // A mensagem foi removida de alguma forma, vamos adicioná-la novamente
            container.insertBefore(messageEl, container.firstChild);
        }
        
        // Verificar novamente em breve (apenas por 30 segundos para não sobrecarregar)
        if (document.contains(container)) {
            originalSetTimeout(checkMessageExists, 1000);
        }
    }, 1000);
    
    // Retornar um objeto que permite fechar a mensagem programaticamente
    return {
        close: function() {
            const msgEl = document.getElementById(messageId);
            if (msgEl) msgEl.remove();
            clearInterval(keepAliveInterval);
        }
    };
}



// Configurar a interceptação da execução de playbooks
function setupExecutionInterception() {
    // Inicializar valores padrão para as configurações, caso não existam
    if (!window.site24x7Config) {
        window.site24x7Config = { deviceKey: DEFAULT_SITE24X7_KEY };
    }
    
    if (!window.antivirusConfig) {
        window.antivirusConfig = { customScript: false, script: DEFAULT_ANTIVIRUS_SCRIPT };
    }
    
    // Sobrescrever a função executeSelectedPlaybooks
    if (typeof window.originalExecFunc !== 'function') {
        window.originalExecFunc = window.executeSelectedPlaybooks;
    }
    
    window.executeSelectedPlaybooks = function() {
        console.log('Interceptando execução de playbooks');
        
        // Interceptar fetch para adicionar as configurações
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (url === '/api/run' && options?.method === 'POST') {
                try {
                    const data = JSON.parse(options.body);
                    
                    // Verificar se é uma playbook especial e adicionar configurações
                    const playbookPath = data.playbook;
                    const playbookName = playbookPath.split('/').pop();
                    
                    if (isSite24x7Playbook(playbookName) && window.site24x7Config) {
                        if (!data.extra_vars) data.extra_vars = {};
                        data.extra_vars.device_key = window.site24x7Config.deviceKey;
                        console.log('Adicionando configuração do Site24x7:', window.site24x7Config);
                    }
                    
                    if (isAntivirusPlaybook(playbookName) && window.antivirusConfig) {
                        if (!data.extra_vars) data.extra_vars = {};
                        
                        if (window.antivirusConfig.customScript) {
                            data.extra_vars.custom_script = true;
                            data.extra_vars.script_filename = window.antivirusConfig.filename;
                            data.extra_vars.script_content = window.antivirusConfig.content;
                        } else {
                            data.extra_vars.custom_script = false;
                            data.extra_vars.script_filename = window.antivirusConfig.script;
                        }
                        
                        console.log('Adicionando configuração do Antivírus:', window.antivirusConfig);
                    }
                    
                    // Substituir o corpo da requisição
                    options.body = JSON.stringify(data);
                } catch (error) {
                    console.error('Erro ao processar requisição:', error);
                }
            }
            
            return originalFetch.apply(this, arguments);
        };
        
        // Chamar a função original
        if (typeof window.originalExecFunc === 'function') {
            window.originalExecFunc();
        }
        
        // Restaurar fetch original após um momento
        setTimeout(() => {
            window.fetch = originalFetch;
        }, 1000);
    };
}

// Configurar monitoramento para atualizar os botões quando novas playbooks são carregadas
function setupPlaybookMonitoring() {
    // Primeiro, adicionar botões nas playbooks existentes
    addConfigButtonsToPlaybooks();
    
    // Monitorar mudanças na lista de playbooks
    const playbooksContainer = document.querySelector('#playbooks');
    if (playbooksContainer) {
        const observer = new MutationObserver(mutations => {
            // Verificar se foram adicionados novos nós
            let needsUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                // Adicionar um pequeno atraso para garantir que tudo foi renderizado
                setTimeout(addConfigButtonsToPlaybooks, 100);
            }
        });
        
        // Iniciar monitoramento
        observer.observe(playbooksContainer, { childList: true, subtree: true });
    }
}

// Configurar eventos de clique globais para os botões dinamicamente adicionados
function setupGlobalClickHandlers() {
    document.addEventListener('click', function(event) {
        // Verificar se o clique foi em um botão de configuração
        if (event.target.closest('.config-button')) {
            const button = event.target.closest('.config-button');
            const playbookName = button.getAttribute('data-playbook');
            
            if (playbookName) {
                event.preventDefault();
                event.stopPropagation();
                
                if (isSite24x7Playbook(playbookName)) {
                    openSite24x7Modal();
                } else if (isAntivirusPlaybook(playbookName)) {
                    openAntivirusModal();
                }
            }
        }
    }, true); // Use capturing para garantir que pegamos o evento antes da propagação
}

// Exportar funções para uso global
function exportGlobalFunctions() {
    window.showSite24x7Modal = openSite24x7Modal;
    window.showAntivirusModal = openAntivirusModal;
    window.updateConfigButtons = addConfigButtonsToPlaybooks;
    
    // Adicionar função para atualizar a execução da playbook
    window.refreshAgentPlaybooks = function() {
        addConfigButtonsToPlaybooks();
        setupExecutionInterception();
    };
    
    // Verificação de saúde da implementação
    window.checkSpecialAgentHealth = function() {
        const status = {
            site24x7Config: !!window.site24x7Config,
            antivirusConfig: !!window.antivirusConfig,
            configButtonsPresent: document.querySelectorAll('.config-button, .config-badge').length > 0,
            executionIntercepted: window.executeSelectedPlaybooks !== window.originalExecFunc
        };
        
        console.table(status);
        return status;
    };
}

// Função principal para inicializar tudo
function initialize() {
    try {
        // Limpar implementações anteriores
        cleanupPreviousImplementation();
        
        // Adicionar novos estilos
        addRobustStyles();
        
        // Configurar interceptação da execução
        setupExecutionInterception();
        
        // Configurar monitoramento de playbooks
        setupPlaybookMonitoring();
        
        // Configurar handlers de clique globais
        setupGlobalClickHandlers();
        
        // Exportar funções para uso global
        exportGlobalFunctions();
        
        console.log('✅ Implementação robusta dos Agentes Especiais ativada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar Agentes Especiais:', error);
    }
}

// Executar inicialização
initialize();
})();