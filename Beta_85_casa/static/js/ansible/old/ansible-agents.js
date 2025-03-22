/**
 * special-agents-integration.js
 * Integração aprimorada para agentes Site24x7 e Antivírus
 * 
 * Este módulo adiciona funcionalidade para detectar quando playbooks de agentes especiais
 * são selecionadas e mostrar os banners de configuração apropriados.
 */

const SpecialAgentsIntegration = (function() {
    // Configuração
    const config = {
        site24x7Keywords: ['site24x7', '24x7'],
        antivirusKeywords: ['antivirus', 'trendmicro'],
        hostsContainer: '#hosts-list',
        playbooksContainer: '#playbooks'
    };

    // Estado
    let state = {
        bannersAdded: {
            site24x7: new Set(),
            antivirus: new Set()
        },
        badgeCounter: 0
    };

    // Utilitários
    const utils = {
        /**
         * Verifica se uma playbook é de um tipo específico
         * @param {string} name - Nome da playbook
         * @param {Array} keywords - Palavras-chave para verificar
         * @returns {boolean} - Verdadeiro se a playbook for do tipo especificado
         */
        isPlaybookOfType: function(name, keywords) {
            if (!name) return false;
            const nameLower = name.toLowerCase();
            return keywords.some(keyword => nameLower.includes(keyword));
        },

        /**
         * Verifica se a playbook é do tipo Site24x7
         * @param {string} name - Nome da playbook
         * @returns {boolean} - Verdadeiro se for uma playbook Site24x7
         */
        isSite24x7Playbook: function(name) {
            return this.isPlaybookOfType(name, config.site24x7Keywords);
        },

        /**
         * Verifica se a playbook é do tipo Antivírus
         * @param {string} name - Nome da playbook
         * @returns {boolean} - Verdadeiro se for uma playbook Antivírus
         */
        isAntivirusPlaybook: function(name) {
            return this.isPlaybookOfType(name, config.antivirusKeywords);
        },

        /**
         * Gera uma chave de dispositivo aleatória
         * @returns {string} - Chave gerada
         */
        generateDeviceKey: function() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let key = 'us_';
            for (let i = 0; i < 32; i++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return key;
        }
    };

    /**
     * Injeta os estilos CSS necessários
     */
    function injectStyles() {
        if (document.getElementById('special-agents-styles')) return;

        const style = document.createElement('style');
        style.id = 'special-agents-styles';
        style.textContent = `
            .special-agent-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }
            
            .special-agent-content {
                background: var(--black-pearl, #121212);
                border-radius: 6px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease;
            }
            
            .special-agent-header {
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--gray-dark, #2A2A2A);
                background: var(--black-elegant, #0A0A0A);
            }
            
            .special-agent-header h3 {
                margin: 0;
                color: var(--accent-gold, #FFD600);
                font-size: 18px;
            }
            
            .special-agent-close {
                background: none;
                border: none;
                color: var(--text-tertiary, #808080);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                transition: color 0.2s;
            }
            
            .special-agent-close:hover {
                color: var(--text-primary, #FFFFFF);
            }
            
            .special-agent-body {
                padding: 20px;
            }
            
            .special-agent-footer {
                padding: 15px;
                border-top: 1px solid var(--gray-dark, #2A2A2A);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--black-elegant, #0A0A0A);
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 6px;
                color: var(--text-primary, #FFFFFF);
                font-weight: 500;
            }
            
            .form-checkbox {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .input-group {
                display: flex;
                align-items: center;
                width: 100%;
            }
            
            .input-group input {
                flex: 1;
            }
            
            .input-group .btn-icon {
                background: var(--gray-dark, #2A2A2A);
                border: none;
                color: var(--text-tertiary, #808080);
                padding: 8px 10px;
                border-radius: 0 4px 4px 0;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .input-group .btn-icon:hover {
                background: var(--gray-dark, #3A3A3A);
                color: var(--text-primary, #FFFFFF);
            }
            
            .input-multi {
                padding: 10px;
                min-height: 100px;
                background: var(--black-smoke, #1A1A1A);
                border: 1px solid var(--gray-dark, #2A2A2A);
                border-radius: 4px;
                color: var(--text-primary, #FFFFFF);
                font-family: monospace;
                width: 100%;
                resize: vertical;
            }
            
            .note {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                padding: 10px 15px;
                margin-top: 20px;
                border-left: 3px solid var(--accent-gold, #FFD600);
            }
            
            .note p {
                margin: 0;
                color: var(--text-secondary, #B0B0B0);
                font-size: 13px;
            }
            
            .option-group {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .option-item {
                background: var(--black-smoke, #1A1A1A);
                border: 1px solid var(--gray-dark, #2A2A2A);
                border-radius: 4px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            
            .option-item:hover {
                background: rgba(255, 214, 0, 0.1);
                border-color: var(--accent-gold, #FFD600);
            }
            
            .option-item.selected {
                background: rgba(255, 214, 0, 0.15);
                border-color: var(--accent-gold, #FFD600);
            }
            
            .option-item i {
                display: block;
                font-size: 24px;
                margin-bottom: 8px;
                color: var(--accent-gold, #FFD600);
            }
            
            .console-output {
                background: #0a0a0a;
                color: #d4d4d4;
                font-family: monospace;
                padding: 10px;
                border-radius: 4px;
                margin-top: 15px;
                max-height: 150px;
                overflow-y: auto;
                white-space: pre-wrap;
                font-size: 12px;
            }
            
            input[type="text"],
            input[type="password"],
            select,
            textarea {
                background: var(--black-smoke, #1A1A1A);
                border: 1px solid var(--gray-dark, #2A2A2A);
                border-radius: 4px;
                padding: 10px 12px;
                color: var(--text-primary, #FFFFFF);
                width: 100%;
                transition: border-color 0.2s;
            }
            
            input[type="text"]:focus,
            input[type="password"]:focus,
            select:focus,
            textarea:focus {
                border-color: var(--accent-gold, #FFD600);
                outline: none;
            }
            
            .special-agent-btn {
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .special-agent-btn.primary {
                background: var(--accent-gold, #FFD600);
                color: var(--black-rich, #030303);
            }
            
            .special-agent-btn.primary:hover {
                background: var(--accent-gold-hover, #FFE033);
            }
            
            .special-agent-btn.secondary {
                background: var(--gray-dark, #2A2A2A);
                color: var(--text-primary, #FFFFFF);
            }
            
            .special-agent-btn.secondary:hover {
                background: var(--gray-dark, #3A3A3A);
            }
            
            .config-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: var(--accent-gold, #FFD600);
                color: black;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                animation: pulse 1.5s infinite;
                z-index: 10;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        console.log('Estilos para plugins especiais injetados');
    }

    /**
     * Cria o HTML para o modal do Site24x7
     * @returns {string} HTML do modal
     */
    function createSite24x7ModalHTML() {
        return `
        <div class="special-agent-modal" id="site24x7-modal">
            <div class="special-agent-content">
                <div class="special-agent-header">
                    <h3>Configuração do Site24x7 Agent</h3>
                    <button class="special-agent-close" id="site24x7-close">&times;</button>
                </div>
                <div class="special-agent-body">
                    <div class="form-group">
                        <label for="site24x7-key">Chave do dispositivo (Device Key)</label>
                        <div class="input-group">
                            <input type="text" id="site24x7-key" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                            <button class="btn-icon" id="site24x7-generate">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 16l-4 4-4-4"></path>
                                    <path d="M4 8l4-4 4 4"></path>
                                    <path d="M16 4h4v4"></path>
                                    <path d="M8 20H4v-4"></path>
                                    <path d="M16 12V4h4"></path>
                                    <path d="M8 12v8H4"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="option-group">
                        <div class="option-item selected" data-key="us_dbbaa0d164ea2cf1caddc8ba13a4dd43">
                            <i class="ri-server-line"></i>
                            <div>Servidor Oracle</div>
                        </div>
                        <div class="option-item" data-key="us_c38c2b49e4b7a9ec1e9c54dd7e7f5d0b">
                            <i class="ri-database-2-line"></i>
                            <div>Servidor de BD</div>
                        </div>
                        <div class="option-item" data-key="us_7d3a8f5c2b6e9d0f4c1a7e2b8d3c9f0a">
                            <i class="ri-cloud-line"></i>
                            <div>Servidor Cloud</div>
                        </div>
                        <div class="option-item" data-key="us_1f2e3d4c5b6a7890abcdef0123456789">
                            <i class="ri-code-box-line"></i>
                            <div>Servidor App</div>
                        </div>
                    </div>
                    <div class="note">
                        <p>A chave do dispositivo é necessária para autenticar o agente Site24x7 com a conta correta. Você pode copiar a chave do portal Site24x7 ou usar uma das pré-configuradas acima.</p>
                    </div>
                </div>
                <div class="special-agent-footer">
                    <button class="special-agent-btn secondary" id="site24x7-cancel">Cancelar</button>
                    <button class="special-agent-btn primary" id="site24x7-confirm">Confirmar</button>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Cria o HTML para o modal do Antivírus
     * @returns {string} HTML do modal
     */
    function createAntivirusModalHTML() {
        return `
        <div class="special-agent-modal" id="antivirus-modal">
            <div class="special-agent-content">
                <div class="special-agent-header">
                    <h3>Configuração do Agente Antivírus</h3>
                    <button class="special-agent-close" id="antivirus-close">&times;</button>
                </div>
                <div class="special-agent-body">
                    <div class="form-checkbox">
                        <input type="checkbox" id="antivirus-custom-script" />
                        <label for="antivirus-custom-script">Usar script personalizado</label>
                    </div>
                    
                    <div id="antivirus-predefined" class="form-group">
                        <label for="antivirus-script">Selecione o script de instalação</label>
                        <select id="antivirus-script">
                            <option value="trend_micro_linux_server.sh">Trend Micro - Servidor Linux</option>
                            <option value="trend_micro_linux_workstation.sh">Trend Micro - Workstation Linux</option>
                            <option value="trend_micro_oracle_linux.sh">Trend Micro - Oracle Linux</option>
                            <option value="trend_micro_ubuntu.sh">Trend Micro - Ubuntu</option>
                        </select>
                    </div>
                    
                    <div id="antivirus-custom" class="form-group" style="display: none;">
                        <label for="antivirus-filename">Nome do arquivo</label>
                        <input type="text" id="antivirus-filename" placeholder="script_instalacao.sh" />
                        
                        <label for="antivirus-content" style="margin-top: 10px;">Conteúdo do script</label>
                        <textarea id="antivirus-content" class="input-multi" placeholder="#!/bin/bash
# Cole aqui o conteúdo do seu script de instalação"></textarea>
                    </div>
                    
                    <div class="note">
                        <p>Escolha um script pré-definido ou forneça seu próprio script personalizado para instalação do antivírus.</p>
                    </div>
                </div>
                <div class="special-agent-footer">
                    <button class="special-agent-btn secondary" id="antivirus-cancel">Cancelar</button>
                    <button class="special-agent-btn primary" id="antivirus-confirm">Confirmar</button>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Configura os eventos para o modal do Site24x7
     */
    function setupSite24x7ModalEvents() {
        // Fechar modal
        document.getElementById('site24x7-close').addEventListener('click', () => {
            document.getElementById('site24x7-modal').remove();
        });
        
        document.getElementById('site24x7-cancel').addEventListener('click', () => {
            document.getElementById('site24x7-modal').remove();
        });
        
        // Gerar chave aleatória
        document.getElementById('site24x7-generate').addEventListener('click', () => {
            document.getElementById('site24x7-key').value = utils.generateDeviceKey();
        });
        
        // Opções pré-configuradas
        document.querySelectorAll('#site24x7-modal .option-item').forEach(item => {
            item.addEventListener('click', () => {
                // Desmarcar todos
                document.querySelectorAll('#site24x7-modal .option-item').forEach(i => {
                    i.classList.remove('selected');
                });
                
                // Marcar o selecionado
                item.classList.add('selected');
                
                // Definir o valor da chave
                document.getElementById('site24x7-key').value = item.dataset.key;
            });
        });
        
        // Confirmar configuração
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
            document.getElementById('site24x7-modal').remove();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
            
            // Remover badges dos items selecionados
            document.querySelectorAll('.playbook-item.selected').forEach(item => {
                const badge = item.querySelector('.config-badge');
                if (badge) badge.remove();
            });
        });
    }

    /**
     * Configura os eventos para o modal do Antivírus
     */
    function setupAntivirusModalEvents() {
        // Fechar modal
        document.getElementById('antivirus-close').addEventListener('click', () => {
            document.getElementById('antivirus-modal').remove();
        });
        
        document.getElementById('antivirus-cancel').addEventListener('click', () => {
            document.getElementById('antivirus-modal').remove();
        });
        
        // Alternar entre script pré-definido e personalizado
        document.getElementById('antivirus-custom-script').addEventListener('change', function() {
            document.getElementById('antivirus-predefined').style.display = this.checked ? 'none' : 'block';
            document.getElementById('antivirus-custom').style.display = this.checked ? 'block' : 'none';
        });
        
        // Confirmar configuração
        document.getElementById('antivirus-confirm').addEventListener('click', () => {
            const useCustom = document.getElementById('antivirus-custom-script').checked;
            
            if (useCustom) {
                const filename = document.getElementById('antivirus-filename').value.trim();
                const content = document.getElementById('antivirus-content').value.trim();
                
                if (!filename || !content) {
                    alert('Por favor, preencha o nome do arquivo e o conteúdo do script.');
                    return;
                }
                
                // Salvar configuração para usar na execução
                window.antivirusConfig = {
                    customScript: true,
                    filename: filename,
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
            document.getElementById('antivirus-modal').remove();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Antivírus salva com sucesso!', 'success');
            
            // Remover badges dos items selecionados
            document.querySelectorAll('.playbook-item.selected').forEach(item => {
                const badge = item.querySelector('.config-badge');
                if (badge) badge.remove();
            });
        });
    }

    /**
     * Mostra o modal de configuração do Site24x7
     */
    function showSite24x7Modal() {
        // Remover modal existente, se houver
        const existingModal = document.getElementById('site24x7-modal');
        if (existingModal) existingModal.remove();
        
        // Adicionar novo modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = createSite24x7ModalHTML();
        document.body.appendChild(modalContainer.firstChild);
        
        // Configurar eventos
        setupSite24x7ModalEvents();
    }

    /**
     * Mostra o modal de configuração do Antivírus
     */
    function showAntivirusModal() {
        // Remover modal existente, se houver
        const existingModal = document.getElementById('antivirus-modal');
        if (existingModal) existingModal.remove();
        
        // Adicionar novo modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = createAntivirusModalHTML();
        document.body.appendChild(modalContainer.firstChild);
        
        // Configurar eventos
        setupAntivirusModalEvents();
    }

    /**
     * Adiciona uma badge de configuração a um item de playbook
     * @param {HTMLElement} item - Item da playbook
     */
    function addConfigBadge(item) {
        // Verificar se já tem uma badge
        if (item.querySelector('.config-badge')) return;
        
        const badge = document.createElement('div');
        badge.className = 'config-badge';
        badge.textContent = '!';
        badge.title = 'Configuração necessária';
        item.style.position = 'relative';
        item.appendChild(badge);
        
        state.badgeCounter++;
    }

    /**
     * Mostra uma mensagem de notificação
     * @param {string} text - Texto da mensagem
     * @param {string} type - Tipo da mensagem (success, warning, error)
     * @param {number} duration - Duração em ms
     */
    function showMessage(text, type = 'warning', duration = 3000) {
        // Se a função global showMessage existir, usá-la
        if (typeof window.showMessage === 'function') {
            window.showMessage(text, type, duration);
            return;
        }
        
        // Implementação local simplificada
        const container = document.getElementById('running-playbooks');
        if (!container) return;
        
        // Determinando cores com base no tipo
        let bgColor, borderColor, textColor;
        
        switch(type) {
            case 'success':
                bgColor = 'rgba(76, 175, 80, 0.1)';
                borderColor = '#4CAF50';
                textColor = '#4CAF50';
                break;
            case 'error':
                bgColor = 'rgba(244, 67, 54, 0.1)';
                borderColor = '#F44336';
                textColor = '#F44336';
                break;
            default: // warning
                bgColor = 'rgba(255, 152, 0, 0.1)';
                borderColor = '#FF9800';
                textColor = '#FF9800';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 6px;
            border-left: 4px solid ${borderColor};
            background: ${bgColor};
            color: ${textColor};
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: fadeIn 0.3s ease;
        `;
        
        messageDiv.innerHTML = `
            <span>${text}</span>
            <button style="background: none; border: none; color: ${textColor}; cursor: pointer;" 
                    onclick="this.parentNode.remove()">✕</button>
        `;
        
        container.insertBefore(messageDiv, container.firstChild);
        
        if (duration > 0) {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.style.opacity = '0';
                    messageDiv.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => messageDiv.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Instala os ganchos necessários para interceptar a execução de playbooks
     */
    function installPlaybookHooks() {
        const originalExecute = window.executeSelectedPlaybooks;
        
        window.executeSelectedPlaybooks = function() {
            console.log('Interceptando execução de playbooks');
            
            // Obter playbooks selecionadas
            const playbooks = Array.from(document.querySelectorAll('.playbook-item.selected')).map(item => {
                return {
                    name: item.getAttribute('data-playbook-name'),
                    element: item
                };
            });
            
            // Verificar se há playbooks especiais selecionadas
            const site24x7Playbooks = playbooks.filter(p => utils.isSite24x7Playbook(p.name));
            const antivirusPlaybooks = playbooks.filter(p => utils.isAntivirusPlaybook(p.name));
            
            // Se houver playbooks especiais sem configuração, mostrar modais
            if (site24x7Playbooks.length > 0 && !window.site24x7Config) {
                showSite24x7Modal();
                site24x7Playbooks.forEach(p => addConfigBadge(p.element));
                return; // Interrompe a execução até que seja configurado
            }
            
            if (antivirusPlaybooks.length > 0 && !window.antivirusConfig) {
                showAntivirusModal();
                antivirusPlaybooks.forEach(p => addConfigBadge(p.element));
                return; // Interrompe a execução até que seja configurado
            }
            
            // Interceptar a chamada de API para adicionar variáveis extras
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url === '/api/run' && options?.method === 'POST') {
                    const data = JSON.parse(options.body);
                    
                    // Verificar se é uma playbook especial e adicionar configurações
                    const playbookPath = data.playbook;
                    const playbookName = playbookPath.split('/').pop();
                    
                    if (utils.isSite24x7Playbook(playbookName) && window.site24x7Config) {
                        if (!data.extra_vars) data.extra_vars = {};
                        data.extra_vars.device_key = window.site24x7Config.deviceKey;
                        console.log('Adicionando configuração do Site24x7:', window.site24x7Config);
                    }
                    
                    if (utils.isAntivirusPlaybook(playbookName) && window.antivirusConfig) {
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
                }
                
                return originalFetch.apply(this, arguments);
            };
            
            // Continuar com a execução original
            originalExecute();
            
            // Restaurar fetch original após um momento
            setTimeout(() => {
                window.fetch = originalFetch;
            }, 1000);
        };
        
        // Exportar as funções de verificação para uso global
        window.isSite24x7Playbook = utils.isSite24x7Playbook.bind(utils);
        window.isAntivirusPlaybook = utils.isAntivirusPlaybook.bind(utils);
        
        console.log('Hooks para playbooks especiais instalados');
    }

    /**
     * Monitora a seleção de playbooks para adicionar badges quando necessário
     */
    function monitorPlaybookSelection() {
        const playbooksContainer = document.querySelector(config.playbooksContainer);
        if (!playbooksContainer) return;
        
        // Usar MutationObserver para detectar mudanças na lista de playbooks
        const observer = new MutationObserver(() => {
            // Verificar playbooks carregadas
            setTimeout(() => {
                const playbooks = document.querySelectorAll('.playbook-item');
                
                playbooks.forEach(item => {
                    const playbookName = item.getAttribute('data-playbook-name');
                    
                    // Se for uma playbook especial, adicionar event listener para mostrar o modal
                    if (utils.isSite24x7Playbook(playbookName)) {
                        item.addEventListener('click', (e) => {
                            // Se a playbook for selecionada
                            if (item.classList.contains('selected')) {
                                if (!window.site24x7Config) {
                                    addConfigBadge(item);
                                }
                            }
                        });
                    }
                    
                    if (utils.isAntivirusPlaybook(playbookName)) {
                        item.addEventListener('click', (e) => {
                            // Se a playbook for selecionada
                            if (item.classList.contains('selected')) {
                                if (!window.antivirusConfig) {
                                    addConfigBadge(item);
                                }
                            }
                        });
                    }
                });
            }, 500);
        });
        
        observer.observe(playbooksContainer, { childList: true, subtree: true });
        console.log('Monitoramento de seleção de playbooks iniciado');
    }

    /**
     * Adiciona botões de configuração rápida no painel de execução
     */
    function addQuickConfigButtons() {
        const executionHeader = document.querySelector('.ansible-execution-header');
        if (!executionHeader) return;

        // Criar container para botões
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'quick-config-buttons';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';

        // Botão para Site24x7
        const site24x7Button = document.createElement('button');
        site24x7Button.className = 'ansible-orbital-btn';
        site24x7Button.innerHTML = `
            <i class="ri-radar-line"></i>
            <span class="orbital-label">Config Site24x7</span>
        `;
        site24x7Button.title = 'Configurar Site24x7';
        site24x7Button.addEventListener('click', showSite24x7Modal);

        // Botão para Antivírus
        const antivirusButton = document.createElement('button');
        antivirusButton.className = 'ansible-orbital-btn';
        antivirusButton.innerHTML = `
            <i class="ri-shield-check-line"></i>
            <span class="orbital-label">Config Antivírus</span>
        `;
        antivirusButton.title = 'Configurar Antivírus';
        antivirusButton.addEventListener('click', showAntivirusModal);

        // Adicionar botões ao container
        buttonContainer.appendChild(site24x7Button);
        buttonContainer.appendChild(antivirusButton);

        // Adicionar container após o título
        const headerTitle = executionHeader.querySelector('.ansible-heading');
        if (headerTitle) {
            headerTitle.parentNode.insertBefore(buttonContainer, headerTitle.nextSibling);
        } else {
            executionHeader.appendChild(buttonContainer);
        }
        
        console.log('Botões de configuração rápida adicionados');
    }

    /**
     * Verifica playbooks selecionadas e adiciona badges se necessário
     */
    function checkSelectedPlaybooks() {
        const selectedPlaybooks = document.querySelectorAll('.playbook-item.selected');
        
        selectedPlaybooks.forEach(item => {
            const playbookName = item.getAttribute('data-playbook-name');
            
            if (utils.isSite24x7Playbook(playbookName) && !window.site24x7Config) {
                addConfigBadge(item);
            }
            
            if (utils.isAntivirusPlaybook(playbookName) && !window.antivirusConfig) {
                addConfigBadge(item);
            }
        });
    }

    /**
     * Inicializa o módulo de integração
     */
    function init() {
        console.log('Inicializando módulo de integração para agentes especiais');
        
        try {
            // Injetar estilos
            injectStyles();
            
            // Instalar hooks
            installPlaybookHooks();
            
            // Monitorar seleção de playbooks
            monitorPlaybookSelection();
            
            // Adicionar botões de configuração rápida
            setTimeout(addQuickConfigButtons, 1000);
            
            // Verificar playbooks a cada 2 segundos
            setInterval(checkSelectedPlaybooks, 2000);
            
            console.log('Integração para agentes especiais inicializada com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar a integração para agentes especiais:', error);
        }
    }

    // Inicializar após o carregamento do DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    return {
        showSite24x7Modal,
        showAntivirusModal,
        isSite24x7Playbook: utils.isSite24x7Playbook.bind(utils),
        isAntivirusPlaybook: utils.isAntivirusPlaybook.bind(utils)
    };
})();

// Exportar funções para uso global
window.showSite24x7Modal = SpecialAgentsIntegration.showSite24x7Modal;
window.showAntivirusModal = SpecialAgentsIntegration.showAntivirusModal;