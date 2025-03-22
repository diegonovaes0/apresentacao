/**
 * banner-trigger.js
 * Solução simplificada para os banners de configuração de Site24x7 e Antivírus
 */

(function() {
    // Configurações
    const site24x7Keywords = ['site24x7', '24x7'];
    const antivirusKeywords = ['antivirus', 'trendmicro'];
    
    // Injetar CSS necessário
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .agent-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .agent-modal-content {
                background: #121212;
                border-radius: 6px;
                width: 500px;
                max-width: 90%;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            }
            
            .agent-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #2A2A2A;
                background: #0A0A0A;
            }
            
            .agent-modal-header h3 {
                margin: 0;
                color: #FFD600;
                font-size: 18px;
            }
            
            .agent-modal-close {
                background: none;
                border: none;
                color: #808080;
                font-size: 24px;
                cursor: pointer;
            }
            
            .agent-modal-body {
                padding: 20px;
            }
            
            .agent-modal-footer {
                padding: 15px;
                border-top: 1px solid #2A2A2A;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #0A0A0A;
            }
            
            .agent-form-group {
                margin-bottom: 15px;
            }
            
            .agent-form-group label {
                display: block;
                margin-bottom: 6px;
                color: #FFFFFF;
                font-weight: 500;
            }
            
            .agent-input {
                width: 100%;
                padding: 10px;
                background: #1A1A1A;
                border: 1px solid #2A2A2A;
                border-radius: 4px;
                color: #FFFFFF;
            }
            
            .agent-button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            }
            
            .agent-button-primary {
                background: #FFD600;
                color: #030303;
            }
            
            .agent-button-secondary {
                background: #2A2A2A;
                color: #FFFFFF;
            }
            
            .agent-checkbox-group {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .agent-option-group {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .agent-option-item {
                background: #1A1A1A;
                border: 1px solid #2A2A2A;
                border-radius: 4px;
                padding: 12px;
                cursor: pointer;
                text-align: center;
            }
            
            .agent-option-item:hover,
            .agent-option-item.selected {
                background: rgba(255, 214, 0, 0.1);
                border-color: #FFD600;
            }
            
            .agent-textarea {
                width: 100%;
                min-height: 100px;
                padding: 10px;
                background: #1A1A1A;
                border: 1px solid #2A2A2A;
                border-radius: 4px;
                color: #FFFFFF;
                font-family: monospace;
                resize: vertical;
            }
            
            .config-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: #FFD600;
                color: black;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
            }
            
            .config-buttons {
                display: flex;
                gap: 10px;
                margin-left: 10px;
            }
            
            .config-button {
                background: #FFD600;
                color: #000;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 14px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Criar HTML do modal do Site24x7
    function createSite24x7Modal() {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'agent-modal';
        modalContainer.id = 'site24x7-modal';
        
        modalContainer.innerHTML = `
            <div class="agent-modal-content">
                <div class="agent-modal-header">
                    <h3>Configuração do Site24x7 Agent</h3>
                    <button class="agent-modal-close" id="site24x7-close">&times;</button>
                </div>
                <div class="agent-modal-body">
                    <div class="agent-form-group">
                        <label for="site24x7-key">Chave do dispositivo (Device Key)</label>
                        <input type="text" id="site24x7-key" class="agent-input" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxx" value="us_dbbaa0d164ea2cf1caddc8ba13a4dd43">
                    </div>
                    
                    <div class="agent-option-group">
                        <div class="agent-option-item selected" data-key="us_dbbaa0d164ea2cf1caddc8ba13a4dd43">
                            <div>Servidor Oracle</div>
                        </div>
                        <div class="agent-option-item" data-key="us_c38c2b49e4b7a9ec1e9c54dd7e7f5d0b">
                            <div>Servidor de BD</div>
                        </div>
                        <div class="agent-option-item" data-key="us_7d3a8f5c2b6e9d0f4c1a7e2b8d3c9f0a">
                            <div>Servidor Cloud</div>
                        </div>
                        <div class="agent-option-item" data-key="us_1f2e3d4c5b6a7890abcdef0123456789">
                            <div>Servidor App</div>
                        </div>
                    </div>
                </div>
                <div class="agent-modal-footer">
                    <button class="agent-button agent-button-secondary" id="site24x7-cancel">Cancelar</button>
                    <button class="agent-button agent-button-primary" id="site24x7-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        return modalContainer;
    }
    
    // Criar HTML do modal do Antivírus
    function createAntivirusModal() {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'agent-modal';
        modalContainer.id = 'antivirus-modal';
        
        modalContainer.innerHTML = `
            <div class="agent-modal-content">
                <div class="agent-modal-header">
                    <h3>Configuração do Agente Antivírus</h3>
                    <button class="agent-modal-close" id="antivirus-close">&times;</button>
                </div>
                <div class="agent-modal-body">
                    <div class="agent-checkbox-group">
                        <input type="checkbox" id="antivirus-custom-script">
                        <label for="antivirus-custom-script">Usar script personalizado</label>
                    </div>
                    
                    <div id="antivirus-predefined" class="agent-form-group">
                        <label for="antivirus-script">Selecione o script de instalação</label>
                        <select id="antivirus-script" class="agent-input">
                            <option value="trend_micro_linux_server.sh">Trend Micro - Servidor Linux</option>
                            <option value="trend_micro_linux_workstation.sh">Trend Micro - Workstation Linux</option>
                            <option value="trend_micro_oracle_linux.sh">Trend Micro - Oracle Linux</option>
                            <option value="trend_micro_ubuntu.sh">Trend Micro - Ubuntu</option>
                        </select>
                    </div>
                    
                    <div id="antivirus-custom" style="display:none;">
                        <div class="agent-form-group">
                            <label for="antivirus-content">Conteúdo do script</label>
                            <textarea id="antivirus-content" class="agent-textarea" placeholder="#!/bin/bash
# Cole aqui o conteúdo do seu script de instalação"></textarea>
                        </div>
                    </div>
                </div>
                <div class="agent-modal-footer">
                    <button class="agent-button agent-button-secondary" id="antivirus-cancel">Cancelar</button>
                    <button class="agent-button agent-button-primary" id="antivirus-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        return modalContainer;
    }
    
    // Verificar se uma playbook é de um determinado tipo
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        name = name.toLowerCase();
        return keywords.some(keyword => name.includes(keyword));
    }
    
    // Verificar se é playbook Site24x7
    function isSite24x7Playbook(name) {
        return isPlaybookOfType(name, site24x7Keywords);
    }
    
    // Verificar se é playbook Antivírus
    function isAntivirusPlaybook(name) {
        return isPlaybookOfType(name, antivirusKeywords);
    }
    
    // Abrir modal do Site24x7
    function openSite24x7Modal() {
        const existingModal = document.getElementById('site24x7-modal');
        if (existingModal) existingModal.remove();
        
        const modal = createSite24x7Modal();
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('site24x7-close').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('site24x7-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        // Opções pré-configuradas
        document.querySelectorAll('#site24x7-modal .agent-option-item').forEach(item => {
            item.addEventListener('click', () => {
                // Desmarcar todos
                document.querySelectorAll('#site24x7-modal .agent-option-item').forEach(i => {
                    i.classList.remove('selected');
                });
                
                // Marcar o selecionado
                item.classList.add('selected');
                
                // Definir o valor da chave
                document.getElementById('site24x7-key').value = item.dataset.key;
            });
        });
        
        document.getElementById('site24x7-confirm').addEventListener('click', () => {
            const deviceKey = document.getElementById('site24x7-key').value.trim();
            
            if (!deviceKey) {
                alert('Por favor, insira uma chave de dispositivo válida.');
                return;
            }
            
            // Salvar configuração para usar na execução
            window.site24x7Config = {
                deviceKey: deviceKey
            };
            
            console.log('Configuração do Site24x7 salva:', window.site24x7Config);
            
            // Se tiver a função showMessage
            if (typeof window.showMessage === 'function') {
                window.showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
            } else {
                alert('Configuração do Site24x7 salva com sucesso!');
            }
            
            modal.remove();
            
            // Atualizar badges nos cards
            updateConfigBadges();
        });
    }
    
    // Abrir modal do Antivírus
    function openAntivirusModal() {
        const existingModal = document.getElementById('antivirus-modal');
        if (existingModal) existingModal.remove();
        
        const modal = createAntivirusModal();
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('antivirus-close').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('antivirus-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        // Alternar entre script pré-definido e personalizado
        document.getElementById('antivirus-custom-script').addEventListener('change', function() {
            document.getElementById('antivirus-predefined').style.display = this.checked ? 'none' : 'block';
            document.getElementById('antivirus-custom').style.display = this.checked ? 'block' : 'none';
        });
        
        document.getElementById('antivirus-confirm').addEventListener('click', () => {
            const useCustom = document.getElementById('antivirus-custom-script').checked;
            
            if (useCustom) {
                const content = document.getElementById('antivirus-content').value.trim();
                
                if (!content) {
                    alert('Por favor, insira o conteúdo do script.');
                    return;
                }
                
                // Salvar configuração para usar na execução
                window.antivirusConfig = {
                    customScript: true,
                    filename: 'personalizado.sh',
                    content: content
                };
            } else {
                const script = document.getElementById('antivirus-script').value;
                
                // Salvar configuração para usar na execução
                window.antivirusConfig = {
                    customScript: false,
                    script: script
                };
            }
            
            console.log('Configuração do Antivírus salva:', window.antivirusConfig);
            
            // Se tiver a função showMessage
            if (typeof window.showMessage === 'function') {
                window.showMessage('Configuração do Antivírus salva com sucesso!', 'success');
            } else {
                alert('Configuração do Antivírus salva com sucesso!');
            }
            
            modal.remove();
            
            // Atualizar badges nos cards
            updateConfigBadges();
        });
    }
    
    // Adicionar ou remover badges de configuração nos cards
    function updateConfigBadges() {
        // Remover todos os badges existentes
        document.querySelectorAll('.config-badge').forEach(badge => badge.remove());
        
        // Obter todas as playbooks carregadas
        const playbookItems = document.querySelectorAll('.playbook-item');
        
        playbookItems.forEach(item => {
            const playbookName = item.getAttribute('data-playbook-name');
            if (!playbookName) return;
            
            // Verificar se precisa de badge
            if (isSite24x7Playbook(playbookName) && !window.site24x7Config) {
                addConfigBadge(item, "Configuração necessária para Site24x7");
            }
            
            if (isAntivirusPlaybook(playbookName) && !window.antivirusConfig) {
                addConfigBadge(item, "Configuração necessária para Antivírus");
            }
        });
    }
    
    // Adicionar badge de configuração a um item
    function addConfigBadge(item, tooltip) {
        // Só adiciona se não existir
        if (item.querySelector('.config-badge')) return;
        
        const badge = document.createElement('div');
        badge.className = 'config-badge';
        badge.textContent = '!';
        badge.title = tooltip || "Configuração necessária";
        
        // Garantir que o item tenha position: relative
        item.style.position = 'relative';
        item.appendChild(badge);
    }
    
    // Interceptar a execução de playbooks
    function setupPlaybookInterception() {
        // Guardar a função original
        window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
        
        // Substituir com nossa função
        window.executeSelectedPlaybooks = function() {
            console.log('Interceptando execução de playbooks');
            
            // Interceptar a chamada de API para adicionar variáveis extras
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url === '/api/run' && options?.method === 'POST') {
                    try {
                        const data = JSON.parse(options.body);
                        const playbookPath = data.playbook;
                        const playbookName = playbookPath.split('/').pop();
                        
                        // Adicionar configurações específicas
                        if (!data.extra_vars) data.extra_vars = {};
                        
                        if (isSite24x7Playbook(playbookName) && window.site24x7Config) {
                            data.extra_vars.device_key = window.site24x7Config.deviceKey;
                            console.log('Adicionando configuração do Site24x7:', window.site24x7Config);
                        }
                        
                        if (isAntivirusPlaybook(playbookName) && window.antivirusConfig) {
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
                        
                        // Substituir corpo da requisição
                        options.body = JSON.stringify(data);
                    } catch (e) {
                        console.error('Erro ao processar requisição:', e);
                    }
                }
                
                return originalFetch.apply(this, arguments);
            };
            
            // Executar a função original
            window.originalExecuteSelectedPlaybooks();
            
            // Restaurar fetch original após um momento
            setTimeout(() => {
                window.fetch = originalFetch;
            }, 1000);
        };
    }
    
    // Adicionar botões de configuração
    function addConfigButtons() {
        const executionHeader = document.querySelector('.ansible-execution-header');
        if (!executionHeader) return;
        
        // Verificar se os botões já existem
        if (executionHeader.querySelector('.config-buttons')) return;
        
        // Criar container para botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'config-buttons';
        
        const site24x7Button = document.createElement('button');
        site24x7Button.className = 'config-button site24x7-config-btn';
        site24x7Button.textContent = 'Configurar Site24x7';
        site24x7Button.addEventListener('click', openSite24x7Modal);
        
        const antivirusButton = document.createElement('button');
        antivirusButton.className = 'config-button antivirus-config-btn';
        antivirusButton.textContent = 'Configurar Antivírus';
        antivirusButton.addEventListener('click', openAntivirusModal);
        
        buttonsContainer.appendChild(site24x7Button);
        buttonsContainer.appendChild(antivirusButton);
        
        executionHeader.appendChild(buttonsContainer);
    }
    
    // Monitorar alterações na DOM para adicionar badges às playbooks carregadas dinamicamente
    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verificar se alguma playbook foi adicionada
                    setTimeout(updateConfigBadges, 500);
                }
            });
        });
        
        // Observar o container de playbooks
        const playbooks = document.getElementById('playbooks');
        if (playbooks) {
            observer.observe(playbooks, { childList: true, subtree: true });
        }
    }
    
    // Inicializar
    function init() {
        console.log('Inicializando módulo de banners para agentes especiais');
        injectStyles();
        setupPlaybookInterception();
        addConfigButtons();
        setupMutationObserver();
        
        // Inicializar badges após um momento para garantir que as playbooks foram carregadas
        setTimeout(updateConfigBadges, 1000);
        
        // Exportar funções para o escopo global
        window.openSite24x7Modal = openSite24x7Modal;
        window.openAntivirusModal = openAntivirusModal;
        window.isSite24x7Playbook = isSite24x7Playbook;
        window.isAntivirusPlaybook = isAntivirusPlaybook;
    }
    
    // Inicializar após o carregamento completo do DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();