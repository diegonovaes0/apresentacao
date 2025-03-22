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

    let activeModal = null;
    
    
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

    // Função para criar e abrir o modal do Site24x7
    function openSite24x7Modal() {
        if (activeModal) return; // Evitar múltiplos modais
        
        closeAllModals();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'site24x7-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">Configuração do Site24x7 Agent</h3>
                    <button type="button" class="modal-close" id="site24x7-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label" for="site24x7-group">Selecione o Grupo</label>
                        <select class="form-select" id="site24x7-group">
                            ${SITE24X7_GROUPS.map(group => 
                                `<option value="${group.key}" ${group.key === DEFAULT_SITE24X7_KEY ? 'selected' : ''}>${group.name}</option>`
                            ).join('')}
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
                        <p>A chave do dispositivo é necessária para autenticar o agente Site24x7 com o grupo correto.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="site24x7-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="site24x7-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        activeModal = { type: 'site24x7', element: modal };
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });

        // Configurar eventos
        const closeBtn = modal.querySelector('#site24x7-close');
        const cancelBtn = modal.querySelector('#site24x7-cancel');
        const confirmBtn = modal.querySelector('#site24x7-confirm');
        const customKeyCheckbox = modal.querySelector('#site24x7-custom-key');

        closeBtn.addEventListener('click', closeAllModals);
        cancelBtn.addEventListener('click', closeAllModals);

        customKeyCheckbox.addEventListener('change', function() {
            modal.querySelector('#site24x7-key-container').style.display = this.checked ? 'block' : 'none';
        });

        confirmBtn.addEventListener('click', function() {
            const useCustomKey = customKeyCheckbox.checked;
            let deviceKey = useCustomKey ? 
                modal.querySelector('#site24x7-key').value.trim() : 
                modal.querySelector('#site24x7-group').value;

            if (useCustomKey && !deviceKey) {
                alert('Por favor, insira uma chave de dispositivo válida.');
                return;
            }

            window.site24x7Config = { deviceKey };
            console.log('Configuração Site24x7 salva:', window.site24x7Config);
            closeAllModals();
            addConfigButtonsToPlaybooks();
            setupExecutionInterception();
            showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
        });

        // Monitorar e restaurar o modal
        keepModalAlive();
    }

    // Função para criar e abrir o modal do Antivírus
    function openAntivirusModal() {
        if (activeModal) return; // Evitar múltiplos modais
        
        closeAllModals();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'antivirus-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">Configuração do Agente Antivírus</h3>
                    <button type="button" class="modal-close" id="antivirus-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label" for="antivirus-script">Selecione o script de instalação</label>
                        <select class="form-select" id="antivirus-script">
                            ${ANTIVIRUS_SCRIPTS.map(script => 
                                `<option value="${script.file}" ${script.file === DEFAULT_ANTIVIRUS_SCRIPT ? 'selected' : ''}>${script.name}</option>`
                            ).join('')}
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
                            <textarea class="form-textarea" id="antivirus-content" placeholder="#!/bin/bash\n# Cole aqui o conteúdo do seu script de instalação"></textarea>
                        </div>
                    </div>
                    <div class="info-note">
                        <p>Escolha um script pré-definido ou forneça seu próprio script personalizado.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="antivirus-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="antivirus-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        activeModal = { type: 'antivirus', element: modal };
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });

        const closeBtn = modal.querySelector('#antivirus-close');
        const cancelBtn = modal.querySelector('#antivirus-cancel');
        const confirmBtn = modal.querySelector('#antivirus-confirm');
        const customScriptCheckbox = modal.querySelector('#antivirus-custom-script');

        closeBtn.addEventListener('click', closeAllModals);
        cancelBtn.addEventListener('click', closeAllModals);

        customScriptCheckbox.addEventListener('change', function() {
            modal.querySelector('#antivirus-custom').style.display = this.checked ? 'block' : 'none';
        });

        confirmBtn.addEventListener('click', function() {
            const useCustomScript = customScriptCheckbox.checked;
            if (useCustomScript) {
                const filename = modal.querySelector('#antivirus-filename').value.trim();
                const content = modal.querySelector('#antivirus-content').value.trim();
                if (!filename || !content) {
                    alert('Por favor, preencha o nome do arquivo e o conteúdo do script.');
                    return;
                }
                window.antivirusConfig = { customScript: true, filename, content };
            } else {
                const script = modal.querySelector('#antivirus-script').value;
                window.antivirusConfig = { customScript: false, script };
            }

            console.log('Configuração Antivírus salva:', window.antivirusConfig);
            closeAllModals();
            addConfigButtonsToPlaybooks();
            setupExecutionInterception();
            showMessage('Configuração do Antivírus salva com sucesso!', 'success');
        });

        // Monitorar e restaurar o modal
        keepModalAlive();
    }

// Fechar todos os modais
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.remove();
    });
    activeModal = null;
    clearInterval(modalKeepAliveInterval); // Parar monitoramento
}


// Função para manter o modal vivo
let modalKeepAliveInterval = null;
function keepModalAlive() {
    if (!activeModal) return;

    modalKeepAliveInterval = setInterval(() => {
        if (!document.body.contains(activeModal.element)) {
            console.log('Modal removido detectado, restaurando...');
            document.body.appendChild(activeModal.element);
        }
    }, 100); // Verifica a cada 100ms
}
// Mostrar mensagem de sucesso/erro
function showMessage(text, type = 'info') {
    const messageId = 'msg_' + Math.random().toString(36).substr(2, 9);
    const container = document.getElementById('running-playbooks') || document.body;
    const color = {
        success: { bg: 'rgba(76, 175, 80, 0.1)', border: '#4CAF50', text: '#4CAF50' },
        info: { bg: 'rgba(33, 150, 243, 0.1)', border: '#2196F3', text: '#2196F3' }
    }[type] || { bg: 'rgba(33, 150, 243, 0.1)', border: '#2196F3', text: '#2196F3' };

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
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100000;
    `;
    messageEl.innerHTML = `
        <span>${text}</span>
        <button style="background: none; border: none; color: ${color.text}; cursor: pointer;" 
                onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(messageEl);
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

// Ajustar o monitoramento de playbooks para não interferir no modal
function setupPlaybookMonitoring() {
    addConfigButtonsToPlaybooks();
    const playbooksContainer = document.querySelector('#playbooks');
    if (playbooksContainer) {
        const observer = new MutationObserver(mutations => {
            let needsUpdate = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                console.log('Detectadas novas playbooks, atualizando botões...');
                setTimeout(() => {
                    addConfigButtonsToPlaybooks();
                    if (activeModal) {
                        document.body.appendChild(activeModal.element); // Restaurar modal se necessário
                    }
                }, 100);
            }
        });
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