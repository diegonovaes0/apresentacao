/**
 * special-agents-fixed-buttons.js
 * Solução permanente para botões de configuração do Site24x7 e Antivírus
 * Versão: 1.1.0
 */

// Auto-inicialização quando o DOM estiver pronto
(function() {
    // Verificar se já foi inicializado para evitar duplicação
    if (window.specialAgentsFixedButtonsInitialized) {
        console.log("Solução de botões já inicializada, ignorando");
        return;
    }
    
    console.log("Inicializando solução robusta para botões de configuração");
    window.specialAgentsFixedButtonsInitialized = true;
    
    // Configurações
    const config = {
        updateInterval: 2000, // Intervalo para atualizar posições dos botões (ms)
        defaultSite24x7Key: 'us_df8c061ef70463b255e8b575406addfc', // Operação - AutoSky (padrão)
        defaultAntivirusScript: 'antivirus.ps1', // Script padrão de antivírus
        site24x7Keywords: ['site24x7', '24x7'],
        antivirusKeywords: ['antivirus', 'trendmicro'],
        buttonColor: '#FFD600', // Cor padrão dos botões
        buttonHoverColor: '#FFE033' // Cor do botão ao passar o mouse
    };
    
    // Dados de grupos Site24x7
    const site24x7Groups = [
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
        { name: 'SKYDB (J&V) - Guanabara RS', key: 'us_62eaf9386fb2061201d249141ad93712' },
        { name: 'SKYDB (J&V) - EXTRABOM', key: 'us_83c835510672d2fa0e1f0ccd7b20a66f' }
    ];
    
    // Scripts de antivírus disponíveis
    const antivirusScripts = [
        { name: 'Antivírus Padrão (Windows)', file: 'antivirus.ps1' },
        { name: 'Trend Micro - Servidor Linux', file: 'trend_micro_linux_server.sh' },
        { name: 'Trend Micro - Workstation Linux', file: 'trend_micro_linux_workstation.sh' },
        { name: 'Trend Micro - Oracle Linux', file: 'trend_micro_oracle_linux.sh' },
        { name: 'Trend Micro - Ubuntu', file: 'trend_micro_ubuntu.sh' },
        { name: 'CTA Antivírus', file: 'cta_antivirus.sh' }
    ];
    
    // Limpar implementações anteriores
    function cleanupPreviousImplementation() {
        // Remover botões antigos
        document.querySelectorAll('.config-button, .configure-btn').forEach(btn => {
            if (!btn.hasAttribute('data-fixed') || btn.getAttribute('data-fixed') !== 'true') {
                btn.remove();
            }
        });
        
        // Remover modais existentes
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
    }
    
    // Adicionar estilos globais
    function addGlobalStyles() {
        // Verificar se os estilos já foram adicionados
        if (document.getElementById('special-agents-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'special-agents-styles';
        style.textContent = `
            /* Modal overlay */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
            }
            
            /* Animate modal appearance */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Prevent default behavior on configure buttons */
            .configure-btn[data-fixed="true"] {
                pointer-events: auto !important;
                cursor: pointer !important;
                user-select: none !important;
                -webkit-user-select: none !important;
            }
            
            /* Prevent any other elements from blocking our buttons */
            .configure-btn[data-fixed="true"] {
                z-index: 1000000 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Rastreamento dos botões criados
    const createdButtons = new Map();
    
    // Verificar se uma playbook é de um tipo específico
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
    }
    
    // Verificar se a playbook é do tipo Site24x7
    function isSite24x7Playbook(name) {
        return isPlaybookOfType(name, config.site24x7Keywords);
    }
    
    // Verificar se a playbook é do tipo Antivírus
    function isAntivirusPlaybook(name) {
        return isPlaybookOfType(name, config.antivirusKeywords);
    }
    
    // Criar e posicionar botões para playbooks especiais
    function createAndPositionButtons() {
        // Limpar implementações anteriores
        cleanupPreviousImplementation();
        
        // Iterar sobre todas as playbooks
        document.querySelectorAll('.playbook-item').forEach(item => {
            const playbookName = item.getAttribute('data-playbook-name');
            if (!playbookName) return;
            
            // Verificar se é uma playbook especial
            const isSite24x7 = isSite24x7Playbook(playbookName);
            const isAntivirus = isAntivirusPlaybook(playbookName);
            
            if (!isSite24x7 && !isAntivirus) return;
            
            // Verificar se já existe um botão para esta playbook e remover se existir
            if (createdButtons.has(playbookName)) {
                const oldBtn = createdButtons.get(playbookName);
                if (document.body.contains(oldBtn)) {
                    oldBtn.remove();
                }
                createdButtons.delete(playbookName);
            }
            
            // Criar novo botão flutuante
            const btn = document.createElement('div');
            
            const checkmark = (isSite24x7 && window.site24x7Config) || 
                             (isAntivirus && window.antivirusConfig) ? 
                             '✓ ' : '';
            
            btn.innerText = `${checkmark}CONFIGURAR`;
            btn.setAttribute('data-fixed', 'true');
            btn.setAttribute('data-playbook', playbookName);
            btn.className = 'configure-btn';
            
            // Posicionar o botão - usamos posicionamento absoluto em relação ao card
            const rect = item.getBoundingClientRect();
            
            // Adicionar estilos
            btn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: ${config.buttonColor};
                color: black;
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                z-index: 1000000;
                user-select: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                transition: background-color 0.2s, transform 0.2s;
            `;
            
            // Adicionar eventos de hover
            btn.addEventListener('mouseenter', function() {
                this.style.backgroundColor = config.buttonHoverColor;
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.backgroundColor = config.buttonColor;
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            });
            
            // Adicionar evento de clique com stopPropagation para evitar que o card seja clicado
            if (isSite24x7) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Abrindo modal Site24x7");
                    openSite24x7Modal();
                    return false;
                });
            } else {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Abrindo modal Antivirus");
                    openAntivirusModal();
                    return false;
                });
            }
            
            // Prevenir propagação de outros eventos de mouse
            ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
                btn.addEventListener(eventType, e => e.stopPropagation());
            });
            
            // Adicionar ao item e registrar
            item.style.position = 'relative'; // Garantir que o posicionamento absoluto funcione
            item.appendChild(btn);
            createdButtons.set(playbookName, btn);
        });
    }
    
    // Criar e abrir o modal do Site24x7
    function openSite24x7Modal() {
        // Remover qualquer modal existente
        document.querySelectorAll('.modal-overlay, .special-agent-modal').forEach(el => el.remove());
        
        // Criar opções para o select de grupos
        let groupOptionsHTML = '';
        site24x7Groups.forEach(group => {
            const selected = (group.key === config.defaultSite24x7Key) ? 'selected' : '';
            groupOptionsHTML += `<option value="${group.key}" ${selected}>${group.name}</option>`;
        });
        
        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.animation = 'fadeIn 0.3s ease-out';
        
        modal.innerHTML = `
            <div style="background-color: #121212; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 16px; background-color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A2A2A;">
                    <h3 style="margin: 0; color: #FFD600; font-size: 18px;">Configuração do Site24x7 Agent</h3>
                    <button id="close-modal" style="background: none; border: none; color: #808080; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Selecione o Grupo</label>
                        <select id="site24x7-group" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                            ${groupOptionsHTML}
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <input type="checkbox" id="site24x7-custom-key">
                        <label for="site24x7-custom-key" style="color: white;">Usar chave personalizada</label>
                    </div>
                    <div id="site24x7-key-container" style="display: none; margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Chave do dispositivo</label>
                        <input type="text" id="site24x7-key" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                    </div>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; border-left: 3px solid #FFD600; margin-top: 20px;">
                        <p style="margin: 0; color: #B0B0B0; font-size: 13px;">A chave do dispositivo é necessária para autenticar o agente Site24x7 com o grupo correto. Se não for configurado, será utilizado o grupo padrão "Operação - AutoSky".</p>
                    </div>
                </div>
                <div style="padding: 15px; border-top: 1px solid #2A2A2A; display: flex; justify-content: flex-end; gap: 10px; background: #0A0A0A;">
                    <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #2A2A2A; color: white; cursor: pointer;">Cancelar</button>
                    <button id="confirm-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #FFD600; color: black; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-btn').addEventListener('click', () => modal.remove());
        
        const customKeyCheckbox = document.getElementById('site24x7-custom-key');
        const keyContainer = document.getElementById('site24x7-key-container');
        
        customKeyCheckbox.addEventListener('change', function() {
            keyContainer.style.display = this.checked ? 'block' : 'none';
        });
        
        // Pré-preencher com valores existentes, se houver
        if (window.site24x7Config && window.site24x7Config.deviceKey) {
            const deviceKey = window.site24x7Config.deviceKey;
            
            // Verificar se é uma chave de grupo conhecida
            let isGroupKey = false;
            for (const group of site24x7Groups) {
                if (group.key === deviceKey) {
                    document.getElementById('site24x7-group').value = deviceKey;
                    isGroupKey = true;
                    break;
                }
            }
            
            // Se não for uma chave de grupo, assumir que é personalizada
            if (!isGroupKey) {
                customKeyCheckbox.checked = true;
                keyContainer.style.display = 'block';
                document.getElementById('site24x7-key').value = deviceKey;
            }
        }
        
        document.getElementById('confirm-btn').addEventListener('click', function() {
            const useCustomKey = customKeyCheckbox.checked;
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
            
            // Atualizar os botões para mostrar o checkmark
            updateButtonLabels();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
            
            modal.remove();
        });
    }
    
    // Criar e abrir o modal do Antivírus
    function openAntivirusModal() {
        // Remover qualquer modal existente
        document.querySelectorAll('.modal-overlay, .special-agent-modal').forEach(el => el.remove());
        
        // Criar opções para o select de scripts
        let scriptOptionsHTML = '';
        antivirusScripts.forEach(script => {
            const selected = (script.file === config.defaultAntivirusScript) ? 'selected' : '';
            scriptOptionsHTML += `<option value="${script.file}" ${selected}>${script.name}</option>`;
        });
        
        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.animation = 'fadeIn 0.3s ease-out';
        
        modal.innerHTML = `
            <div style="background-color: #121212; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 16px; background-color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A2A2A;">
                    <h3 style="margin: 0; color: #FFD600; font-size: 18px;">Configuração do Agente Antivírus</h3>
                    <button id="close-modal" style="background: none; border: none; color: #808080; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Selecione o script de instalação</label>
                        <select id="antivirus-script" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                            ${scriptOptionsHTML}
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <input type="checkbox" id="antivirus-custom-script">
                        <label for="antivirus-custom-script" style="color: white;">Usar script personalizado</label>
                    </div>
                    <div id="antivirus-custom" style="display: none;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: white;">Nome do arquivo</label>
                            <input type="text" id="antivirus-filename" placeholder="script_instalacao.sh" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: white;">Conteúdo do script</label>
                            <textarea id="antivirus-content" placeholder="#!/bin/bash" style="width: 100%; min-height: 100px; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white; font-family: monospace;"></textarea>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; border-left: 3px solid #FFD600; margin-top: 20px;">
                        <p style="margin: 0; color: #B0B0B0; font-size: 13px;">Escolha um script pré-definido ou forneça seu próprio script personalizado para instalação do antivírus. Se não for configurado, será utilizado o script padrão.</p>
                    </div>
                </div>
                <div style="padding: 15px; border-top: 1px solid #2A2A2A; display: flex; justify-content: flex-end; gap: 10px; background: #0A0A0A;">
                    <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #2A2A2A; color: white; cursor: pointer;">Cancelar</button>
                    <button id="confirm-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #FFD600; color: black; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-btn').addEventListener('click', () => modal.remove());
        
        const customScriptCheckbox = document.getElementById('antivirus-custom-script');
        const customScriptContainer = document.getElementById('antivirus-custom');
        
        customScriptCheckbox.addEventListener('change', function() {
            customScriptContainer.style.display = this.checked ? 'block' : 'none';
        });
        
        // Pré-preencher com valores existentes, se houver
        if (window.antivirusConfig) {
            if (window.antivirusConfig.customScript) {
                customScriptCheckbox.checked = true;
                customScriptContainer.style.display = 'block';
                document.getElementById('antivirus-filename').value = window.antivirusConfig.filename || '';
                document.getElementById('antivirus-content').value = window.antivirusConfig.content || '';
            } else if (window.antivirusConfig.script) {
                document.getElementById('antivirus-script').value = window.antivirusConfig.script;
            }
        }
        
        document.getElementById('confirm-btn').addEventListener('click', function() {
            const useCustomScript = customScriptCheckbox.checked;
            
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
            
            // Atualizar os botões para mostrar o checkmark
            updateButtonLabels();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Antivírus salva com sucesso!', 'success');
            
            modal.remove();
        });
    }
    
    // Atualizar os rótulos dos botões (adicionar ou remover checkmark)
    function updateButtonLabels() {
        createdButtons.forEach((btn, playbookName) => {
            // Verificar tipo de playbook
            const isSite24x7 = isSite24x7Playbook(playbookName);
            const isAntivirus = isAntivirusPlaybook(playbookName);
            
            // Verificar se está configurado
            const isConfigured = (isSite24x7 && window.site24x7Config) || 
                                (isAntivirus && window.antivirusConfig);
            
            // Atualizar o texto do botão
            btn.innerText = isConfigured ? '✓ CONFIGURAR' : 'CONFIGURAR';
        });
    }
    
    // Mostrar mensagem temporária na interface
function showMessage(text, type = 'info', duration = 0) { // Alterado para duração 0 (não fecha automaticamente)
    // Verificar se a função global showMessage existe
    if (typeof window.showMessage === 'function') {
        window.showMessage(text, type, 0); // Forçar duração 0 na função global também
        return;
    }
    
    // Implementação própria
    const container = document.getElementById('running-playbooks');
    if (!container) {
        // Se não houver container, criar um alerta simples
        alert(text);
        return;
    }
    
    // Definir cores com base no tipo
    const colors = {
        'success': { bg: 'rgba(76, 175, 80, 0.1)', border: '#4CAF50', text: '#4CAF50' },
        'error': { bg: 'rgba(244, 67, 54, 0.1)', border: '#F44336', text: '#F44336' },
        'warning': { bg: 'rgba(255, 152, 0, 0.1)', border: '#FF9800', text: '#FF9800' },
        'info': { bg: 'rgba(33, 150, 243, 0.1)', border: '#2196F3', text: '#2196F3' }
    };
    
    const color = colors[type] || colors.info;
    
    // Criar elemento de mensagem
    const message = document.createElement('div');
    message.style.cssText = `
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
    
    message.innerHTML = `
        <span>${text}</span>
        <button style="background: none; border: none; color: ${color.text}; cursor: pointer;">✕</button>
    `;
    
    // Adicionar evento ao botão de fechar
    message.querySelector('button').addEventListener('click', () => message.remove());
    
    // Adicionar ao início do container
    container.insertBefore(message, container.firstChild);
    
    // Remover após a duração especificada, apenas se duration for maior que 0
    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(message)) {
                message.style.opacity = '0';
                message.style.transition = 'opacity 0.3s ease';
                setTimeout(() => message.remove(), 300);
            }
        }, duration);
    }
}
    
    // Inicializar valores padrão para as configurações
    function initializeDefaultConfigs() {
        // Inicializar configuração do Site24x7 se ainda não estiver definida
        if (!window.site24x7Config) {
            window.site24x7Config = {
                deviceKey: config.defaultSite24x7Key
            };
            console.log('Configuração padrão do Site24x7 inicializada:', window.site24x7Config);
        }
        
        // Inicializar configuração do Antivírus se ainda não estiver definida
        if (!window.antivirusConfig) {
            window.antivirusConfig = {
                customScript: false,
                script: config.defaultAntivirusScript
            };
            console.log('Configuração padrão do Antivírus inicializada:', window.antivirusConfig);
        }
    }
    
    // Interceptar a execução de playbooks para adicionar configurações
function interceptPlaybookExecution() {
    // Guarda referência à função original se ainda não tiver sido salva
    if (typeof window.originalExecuteFunc !== 'function' && typeof window.executeSelectedPlaybooks === 'function') {
        window.originalExecuteFunc = window.executeSelectedPlaybooks;
    
        // Sobrescrever a função
        window.executeSelectedPlaybooks = function() {
            console.log('Interceptando execução de playbooks');
            
            // Interceptar fetch para adicionar as configurações
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url === '/api/run' && options?.method === 'POST' && options?.body) {
                    try {
                        const data = JSON.parse(options.body);
                        
                        // Verificar se é uma playbook especial e adicionar configurações
                        const playbookPath = data.playbook;
                        if (!playbookPath) return originalFetch.apply(this, arguments);
                        
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
                        
                        // Substituir o corpo da requisição com os novos dados
                        options.body = JSON.stringify(data);
                    } catch (error) {
                        console.error('Erro ao processar requisição:', error);
                    }
                }
                
                return originalFetch.apply(this, arguments);
            };
            
            // Chamar a função original de execução
            window.originalExecuteFunc();
            
            // Restaurar fetch original após um momento
            setTimeout(() => {
                window.fetch = originalFetch;
            }, 1000);
        };
    }
}

// Monitorar mudanças no DOM para atualizar botões quando novas playbooks forem carregadas
function setupPlaybookMonitoring() {
    // Função para observar mudanças no DOM
    const observer = new MutationObserver(mutations => {
        let needsUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Verificar se novos elementos foram adicionados
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.classList && node.classList.contains('playbook-item')) {
                        needsUpdate = true;
                        break;
                    }
                }
            }
        });
        
        if (needsUpdate) {
            console.log("Detectadas novas playbooks, atualizando botões...");
            createAndPositionButtons();
        }
    });
    
    // Iniciar observação
    const playbooksContainer = document.querySelector('#playbooks');
    if (playbooksContainer) {
        observer.observe(playbooksContainer, { childList: true, subtree: true });
        console.log("Monitoramento de playbooks ativado");
    } else {
        // Se o container não existir, tentar novamente mais tarde
        setTimeout(setupPlaybookMonitoring, 1000);
    }
}

// Função para limpar e recriar todos os botões
function refreshAllButtons() {
    console.log("Atualizando todos os botões...");
    // Limpar botões existentes
    document.querySelectorAll('.configure-btn[data-fixed="true"]').forEach(btn => btn.remove());
    createdButtons.clear();
    
    // Recriar botões
    createAndPositionButtons();
}

// Função para verificar saúde da implementação
function checkHealth() {
    const status = {
        initialized: window.specialAgentsFixedButtonsInitialized === true,
        site24x7Config: window.site24x7Config ? "Configurado" : "Não configurado",
        antivirusConfig: window.antivirusConfig ? "Configurado" : "Não configurado",
        executionIntercepted: typeof window.originalExecuteFunc === 'function',
        buttonsCount: document.querySelectorAll('.configure-btn[data-fixed="true"]').length
    };
    
    console.table(status);
    return status;
}

// Exportar funções para o escopo global
function exportGlobalFunctions() {
    window.openSite24x7Modal = openSite24x7Modal;
    window.openAntivirusModal = openAntivirusModal;
    window.refreshSpecialAgentButtons = refreshAllButtons;
    window.checkSpecialAgentHealth = checkHealth;
}

// Inicialização principal
function init() {
    try {
        // Limpar implementação anterior, se existir
        cleanupPreviousImplementation();
        
        // Adicionar estilos globais
        addGlobalStyles();
        
        // Inicializar configurações padrão
        initializeDefaultConfigs();
        
        // Criar botões iniciais
        createAndPositionButtons();
        
        // Configurar interceptação de execução
        interceptPlaybookExecution();
        
        // Configurar monitoramento de mudanças
        setupPlaybookMonitoring();
        
        // Exportar funções para uso global
        exportGlobalFunctions();
        
        // Configurar atualização periódica dos botões
        setInterval(createAndPositionButtons, config.updateInterval);
        
        console.log("✅ Solução de botões de configuração inicializada com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao inicializar solução de botões:", error);
    }
}

// Iniciar solução
init();
})();