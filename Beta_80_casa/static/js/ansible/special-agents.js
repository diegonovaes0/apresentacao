/**
 * Sistema de Botões de Configuração Aprimorado
 * 
 * Este script implementa um sistema robusto para adicionar botões de configuração
 * em cards de playbooks específicas (Site24x7 e Antivírus), permitindo a configuração
 * personalizada antes da execução.
 * 
 * @version 1.2.0
 * @author Claude
 */

(function() {
    console.log("Inicializando solução otimizada para botões de configuração de playbooks");
    
    // Impedir múltiplas inicializações
    if (window.configButtonsInitialized) {
        console.log("Sistema de botões já inicializado. Abortando.");
        return;
    }
    
    // Definições de configuração
    const CONFIG = {
        // Configurações gerais
        updateInterval: 1000,                    // Intervalo de verificação para novos cards (ms)
        zIndex: 1000000,                         // z-index para elementos flutuantes
        
        // Chaves e arquivos padrão
        defaultSite24x7Key: 'us_df8c061ef70463b255e8b575406addfc', // Operação - AutoSky
        defaultAntivirusScript: 'antivirus.ps1', // Script padrão de antivírus
        
        // Palavras-chave para identificação de playbooks
        keywords: {
            site24x7: ['site24x7', '24x7', 'site 24x7'],
            antivirus: ['antivirus', 'antivírus', 'trend', 'trendmicro', 'trend micro']
        },
        
        // Estilos
        styles: {
            buttonColor: '#FFD600',
            buttonHoverColor: '#FFE033',
            buttonTextColor: '#000000',
            modalBackgroundColor: '#121212',
            modalTextColor: '#FFFFFF',
            modalHeaderColor: '#0A0A0A',
            modalBorderColor: '#2A2A2A',
            modalAccentColor: '#FFD600'
        },
        
        // Caminhos de arquivos
        paths: {
            windowsAntivirus: '/arquivos/windows/antivirus/',
            linuxAntivirus: '/arquivos/linux/antivirus/'
        }
    };
    
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
        { name: 'SKYDB (J&V) - Guanabara RS', key: 'us_62eaf9386fb2061201d249141ad93712' },
        { name: 'SKYDB (J&V) - EXTRABOM', key: 'us_83c835510672d2fa0e1f0ccd7b20a66f' }
    ];
    
    // Scripts de antivírus disponíveis
    const ANTIVIRUS_SCRIPTS = [
        { name: 'Antivírus Padrão (Windows)', file: 'antivirus.ps1', os: 'windows' },
        { name: 'Antivírus CTA (Windows)', file: 'cta_antivirus.ps1', os: 'windows' },
        { name: 'Antivírus Praxio (Windows)', file: 'praxio_antivirus.ps1', os: 'windows' },
        { name: 'Trend Micro - Servidor Linux', file: 'trend_micro_linux_server.sh', os: 'linux' },
        { name: 'Trend Micro - Workstation Linux', file: 'trend_micro_linux_workstation.sh', os: 'linux' },
        { name: 'Trend Micro - Oracle Linux', file: 'trend_micro_oracle_linux.sh', os: 'linux' },
        { name: 'Trend Micro - Ubuntu', file: 'trend_micro_ubuntu.sh', os: 'linux' },
        { name: 'CTA Antivírus (Linux)', file: 'cta_antivirus.sh', os: 'linux' }
    ];
    
    // Rastreamento de botões criados
    const createdButtons = new Map();
    
    // Estado de configuração (armazenamento em memória)
    window.configState = {
        site24x7: {
            deviceKey: CONFIG.defaultSite24x7Key
        },
        antivirus: {
            customScript: false,
            scriptFile: CONFIG.defaultAntivirusScript,
            scriptContent: '',
            os: 'windows' // Padrão, será detectado dinamicamente
        }
    };
    
    // ==============================
    // FUNÇÕES UTILITÁRIAS
    // ==============================
    
    /**
     * Detecta se uma playbook é de um tipo específico com base em palavras-chave
     * @param {string} name - Nome da playbook
     * @param {Array<string>} keywords - Array de palavras-chave
     * @return {boolean} Verdadeiro se a playbook é do tipo especificado
     */
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
    }
    
    /**
     * Verifica se uma playbook é do tipo Site24x7
     * @param {string} name - Nome da playbook
     * @return {boolean} Verdadeiro se for uma playbook Site24x7
     */
    function isSite24x7Playbook(name) {
        return isPlaybookOfType(name, CONFIG.keywords.site24x7);
    }
    
    /**
     * Verifica se uma playbook é do tipo Antivírus
     * @param {string} name - Nome da playbook
     * @return {boolean} Verdadeiro se for uma playbook de Antivírus
     */
    function isAntivirusPlaybook(name) {
        return isPlaybookOfType(name, CONFIG.keywords.antivirus);
    }
    
    /**
     * Detecta o sistema operacional com base no nome da playbook ou elemento DOM
     * @param {string|Element} source - Nome da playbook ou elemento DOM
     * @return {string} 'windows' ou 'linux'
     */
    function detectOS(source) {
        let text = '';
        
        if (typeof source === 'string') {
            text = source.toLowerCase();
        } else if (source instanceof Element) {
            text = (source.getAttribute('data-playbook-os') || 
                   source.getAttribute('data-playbook-name') || 
                   source.innerText || '').toLowerCase();
        }
        
        if (text.includes('windows') || text.includes('.ps1')) {
            return 'windows';
        } else if (text.includes('linux') || text.includes('.sh')) {
            return 'linux';
        }
        
        // Tenta obter pelo filtro de SO atual
        const osFilter = document.getElementById('os-filter');
        if (osFilter) {
            const osValue = osFilter.value.toLowerCase();
            if (osValue.includes('windows')) return 'windows';
            if (osValue.includes('linux')) return 'linux';
        }
        
        // Default para windows se não conseguir detectar
        return 'windows';
    }
    
    /**
     * Gera um script de instalação do Site24x7
     * @param {string} deviceKey - Chave do dispositivo Site24x7
     * @return {string} Conteúdo do script
     */
    function generateSite24x7Script(deviceKey) {
        return `#!/bin/bash
# Script de instalação personalizado Site24x7
INSTALL_KEY="${deviceKey}"

echo "Instalando Site24x7 com chave: $INSTALL_KEY"
mkdir -p /opt/site24x7
echo "$INSTALL_KEY" > /opt/site24x7/devicekey.txt
`;
    }
    
    /**
     * Gera um playbook personalizado para o Site24x7
     * @param {string} deviceKey - Chave do dispositivo Site24x7
     * @return {string} Conteúdo do playbook
     */
    function generateSite24x7Playbook(deviceKey) {
        return `---
- name: 🚀 Instalação Site24x7 Personalizado
  hosts: all
  become: yes
  vars:
    device_key: "${deviceKey}"

  tasks:
    - name: Criar diretório Site24x7
      file:
        path: /opt/site24x7
        state: directory

    - name: Salvar chave do dispositivo
      copy:
        content: "{{ device_key }}"
        dest: /opt/site24x7/devicekey.txt
`;
    }
    
    /**
     * Gera um script personalizado para o Antivírus
     * @param {string} scriptContent - Conteúdo do script personalizado
     * @return {string} Conteúdo do script final
     */
    function generateAntivirusScript(scriptContent) {
        return `#!/bin/bash
# Script de instalação personalizado de Antivírus

${scriptContent || '# Script de instalação padrão'}

echo "Instalando antivírus com script personalizado"
`;
    }
    
    /**
     * Gera um playbook personalizado para o Antivírus
     * @param {string} scriptContent - Conteúdo do script personalizado
     * @return {string} Conteúdo do playbook
     */
    function generateAntivirusPlaybook(scriptContent) {
        return `---
- name: 🛡️ Instalação Antivírus Personalizado
  hosts: all
  become: yes
  tasks:
    - name: Copiar script de instalação
      copy:
        content: |
          ${scriptContent || '# Script de instalação padrão'}
        dest: /tmp/antivirus_install.sh
        mode: '0755'

    - name: Executar script de instalação
      command: /tmp/antivirus_install.sh
`;
    }
    
    /**
     * Exibe uma mensagem de notificação na interface
     * @param {string} text - Texto da mensagem
     * @param {string} type - Tipo da mensagem ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duração em ms (0 para não fechar automaticamente)
     */
    function showMessage(text, type = 'info', duration = 3000) {
        // Verifica se a função global showMessage existe
        if (typeof window.showMessage === 'function') {
            window.showMessage(text, type, duration);
            return;
        }
        
        // Implementação própria
        const container = document.getElementById('running-playbooks') || document.body;
        
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
            z-index: ${CONFIG.zIndex + 100};
            position: relative;
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
    
    // ==============================
    // FUNÇÕES DE INTERFACE
    // ==============================
    
    /**
     * Adiciona estilos globais necessários ao sistema
     */
    function addGlobalStyles() {
        // Verificar se os estilos já foram adicionados
        if (document.getElementById('config-buttons-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'config-buttons-styles';
        style.textContent = `
            /* Estilos base para modais */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: ${CONFIG.zIndex + 500};
                animation: fadeIn 0.2s ease-out;
            }
            
            .modal-container {
                background-color: ${CONFIG.styles.modalBackgroundColor};
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                color: ${CONFIG.styles.modalTextColor};
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            }
            
            .modal-header {
                padding: 16px;
                background-color: ${CONFIG.styles.modalHeaderColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid ${CONFIG.styles.modalBorderColor};
            }
            
            .modal-header h3 {
                margin: 0;
                color: ${CONFIG.styles.modalAccentColor};
                font-size: 18px;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: #808080;
                font-size: 24px;
                cursor: pointer;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .modal-footer {
                padding: 15px;
                border-top: 1px solid ${CONFIG.styles.modalBorderColor};
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: ${CONFIG.styles.modalHeaderColor};
            }
            
            /* Estilos para campos de formulário nos modais */
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: ${CONFIG.styles.modalTextColor};
            }
            
            .form-control {
                width: 100%;
                padding: 10px;
                background: #1A1A1A;
                border: 1px solid ${CONFIG.styles.modalBorderColor};
                border-radius: 4px;
                color: ${CONFIG.styles.modalTextColor};
            }
            
            .form-check {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .info-box {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                padding: 10px;
                border-left: 3px solid ${CONFIG.styles.modalAccentColor};
                margin-top: 20px;
            }
            
            .info-box p {
                margin: 0;
                color: #B0B0B0;
                font-size: 13px;
            }
            
            /* Botões */
            .btn {
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
            }
            
            .btn-secondary {
                background: #2A2A2A;
                color: white;
            }
            
            .btn-primary {
                background: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
                font-weight: bold;
            }
            
            /* Botão de configuração em cards */
            .configure-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: ${CONFIG.styles.buttonColor};
                color: ${CONFIG.styles.buttonTextColor};
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                z-index: ${CONFIG.zIndex};
                user-select: none;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                transition: background-color 0.2s, transform 0.2s;
            }
            
            .configure-btn:hover {
                background-color: ${CONFIG.styles.buttonHoverColor};
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            /* Animações */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Utilitários */
            .mb-2 {
                margin-bottom: 0.5rem;
            }
            
            .mb-3 {
                margin-bottom: 1rem;
            }
            
            .text-small {
                font-size: 0.85rem;
            }
            
            .d-none {
                display: none;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Cria um modal personalizado
     * @param {string} title - Título do modal
     * @param {string} content - HTML do conteúdo do modal
     * @return {HTMLElement} Elemento do modal
     */
    function createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button id="cancel-btn" class="btn btn-secondary">Cancelar</button>
                    <button id="confirm-btn" class="btn btn-primary">Confirmar</button>
                </div>
            </div>
        `;
        
        // Adicionar eventos de fechamento
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-btn').addEventListener('click', () => modal.remove());
        
        // Impedir propagação de cliques
        modal.querySelector('.modal-container').addEventListener('click', e => e.stopPropagation());
        
        document.body.appendChild(modal);
        return modal;
    }
    
    /**
     * Cria o conteúdo do modal do Site24x7
     * @return {string} HTML do conteúdo
     */
    function getSite24x7ModalContent() {
        // Criar opções para o select de grupos
        let groupOptionsHTML = '';
        SITE24X7_GROUPS.forEach(group => {
            const selected = (group.key === CONFIG.defaultSite24x7Key) ? 'selected' : '';
            groupOptionsHTML += `<option value="${group.key}" ${selected}>${group.name}</option>`;
        });
        
        return `
            <div class="form-group">
                <label for="site24x7-group">Selecione o Grupo</label>
                <select id="site24x7-group" class="form-control">
                    ${groupOptionsHTML}
                </select>
            </div>
            
            <div class="form-check">
                <input type="checkbox" id="site24x7-custom-key" class="form-check-input">
                <label for="site24x7-custom-key">Usar chave personalizada</label>
            </div>
            
            <div id="site24x7-key-container" class="form-group d-none">
                <label for="site24x7-key">Chave do dispositivo</label>
                <input type="text" id="site24x7-key" class="form-control" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
            </div>
            
            <div class="info-box">
                <p>A chave do dispositivo é necessária para autenticar o agente Site24x7 com o grupo correto. Se não for configurado, será utilizado o grupo padrão "Operação - AutoSky".</p>
            </div>
        `;
    }
    
    /**
     * Cria o conteúdo do modal do Antivírus
     * @param {string} detectedOS - Sistema operacional detectado ('windows' ou 'linux')
     * @return {string} HTML do conteúdo
     */
    function getAntivirusModalContent(detectedOS = 'windows') {
        // Filtrar scripts por SO
        const filteredScripts = ANTIVIRUS_SCRIPTS.filter(script => script.os === detectedOS);
        
        // Criar opções para o select de scripts
        let scriptOptionsHTML = '';
        filteredScripts.forEach(script => {
            const selected = (script.file === CONFIG.defaultAntivirusScript) ? 'selected' : '';
            scriptOptionsHTML += `<option value="${script.file}" ${selected}>${script.name}</option>`;
        });
        
        const osDisplay = detectedOS === 'windows' ? 'Windows' : 'Linux';
        
        return `
            <div class="info-box mb-3">
                <p>Sistema operacional detectado: <strong>${osDisplay}</strong></p>
            </div>
            
            <div class="form-group">
                <label for="antivirus-script">Selecione o script de instalação</label>
                <select id="antivirus-script" class="form-control">
                    ${scriptOptionsHTML}
                </select>
            </div>
            
            <div class="form-check">
                <input type="checkbox" id="antivirus-custom-script" class="form-check-input">
                <label for="antivirus-custom-script">Usar script personalizado</label>
            </div>
            
            <div id="antivirus-custom" class="d-none">
                <div class="form-group">
                    <label for="antivirus-filename">Nome do arquivo</label>
                    <input type="text" id="antivirus-filename" class="form-control" placeholder="${detectedOS === 'windows' ? 'script_instalacao.ps1' : 'script_instalacao.sh'}">
                </div>
                
                <div class="form-group">
                    <label for="antivirus-content">Conteúdo do script</label>
                    <textarea id="antivirus-content" class="form-control" rows="5" placeholder="${detectedOS === 'windows' ? '# PowerShell script' : '#!/bin/bash'}"></textarea>
                </div>
            </div>
            
            <div class="info-box">
                <p>Escolha um script pré-definido ou forneça seu próprio script personalizado para instalação do antivírus. O script será salvo no caminho apropriado para o sistema operacional detectado.</p>
            </div>
        `;
    }
    
    /**
     * Abre o modal de configuração do Site24x7
     */
    function openSite24x7Modal() {
        const modal = createModal('Configuração do Site24x7 Agent', getSite24x7ModalContent());
        
        // Configurar eventos
        const customKeyCheckbox = modal.querySelector('#site24x7-custom-key');
        const keyContainer = modal.querySelector('#site24x7-key-container');
        
        customKeyCheckbox.addEventListener('change', function() {
            keyContainer.classList.toggle('d-none', !this.checked);
        });
        
        // Pré-preencher com valores existentes
        if (window.configState.site24x7 && window.configState.site24x7.deviceKey) {
            const deviceKey = window.configState.site24x7.deviceKey;
            
            // Verificar se é uma chave de grupo conhecida
            let isGroupKey = false;
            for (const group of SITE24X7_GROUPS) {
                if (group.key === deviceKey) {
                    modal.querySelector('#site24x7-group').value = deviceKey;
                    isGroupKey = true;
                    break;
                }
            }
            
            // Se não for uma chave de grupo, assumir que é personalizada
            if (!isGroupKey) {
                customKeyCheckbox.checked = true;
                keyContainer.classList.remove('d-none');
                modal.querySelector('#site24x7-key').value = deviceKey;
            }
        }
        
        // Evento de confirmação
        modal.querySelector('#confirm-btn').addEventListener('click', function() {
            const useCustomKey = customKeyCheckbox.checked;
            let deviceKey;
            
            if (useCustomKey) {
                deviceKey = modal.querySelector('#site24x7-key').value.trim();
                if (!deviceKey) {
                    showMessage('Por favor, insira uma chave de dispositivo válida.', 'error');
                    return;
                }
            } else {
                deviceKey = modal.querySelector('#site24x7-group').value;
            }
            
            // Atualizar estado
            window.configState.site24x7 = {
                deviceKey: deviceKey,
                script: generateSite24x7Script(deviceKey),
                playbook: generateSite24x7Playbook(deviceKey)
            };
            
            console.log('Configuração Site24x7 salva:', window.configState.site24x7);
            
            // Atualizar botões
            updateButtonLabels();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Site24x7 salva com sucesso!', 'success');
            
            modal.remove();
        });
    }
    
    /**
     * Abre o modal de configuração do Antivírus
     * @param {string} detectedOS - Sistema operacional detectado
     */
    function openAntivirusModal(detectedOS = 'windows') {
        const modal = createModal('Configuração do Agente Antivírus', getAntivirusModalContent(detectedOS));
        
        // Configurar eventos
        const customScriptCheckbox = modal.querySelector('#antivirus-custom-script');
        const customScriptContainer = modal.querySelector('#antivirus-custom');
        
        customScriptCheckbox.addEventListener('change', function() {
            customScriptContainer.classList.toggle('d-none', !this.checked);
        });
        
        // Pré-preencher com valores existentes
        if (window.configState.antivirus) {
            // Atualizar para o SO atual
            window.configState.antivirus.os = detectedOS;
            
            if (window.configState.antivirus.customScript) {
                customScriptCheckbox.checked = true;
                customScriptContainer.classList.remove('d-none');
                modal.querySelector('#antivirus-filename').value = window.configState.antivirus.scriptFile || '';
                modal.querySelector('#antivirus-content').value = window.configState.antivirus.scriptContent || '';
            } else if (window.configState.antivirus.scriptFile) {
                // Tentar encontrar o script predefinido
                const scriptSelect = modal.querySelector('#antivirus-script');
                if (scriptSelect) {
                    const options = Array.from(scriptSelect.options);
                    const option = options.find(opt => opt.value === window.configState.antivirus.scriptFile);
                    if (option) {
                        scriptSelect.value = window.configState.antivirus.scriptFile;
                    }
                }
            }
        }
        
        // Evento de confirmação
        modal.querySelector('#confirm-btn').addEventListener('click', function() {
            const useCustomScript = customScriptCheckbox.checked;
            
            if (useCustomScript) {
                const filename = modal.querySelector('#antivirus-filename').value.trim();
                const content = modal.querySelector('#antivirus-content').value.trim();
                
                if (!filename || !content) {
                    showMessage('Por favor, preencha o nome do arquivo e o conteúdo do script.', 'error');
                    return;
                }
                
                //




































                // Atualizar estado
                window.configState.antivirus = {
                    customScript: true,
                    scriptFile: filename,
                    scriptContent: content,
                    os: detectedOS
                };
            } else {
                const scriptFile = modal.querySelector('#antivirus-script').value;
                
                // Atualizar estado
                window.configState.antivirus = {
                    customScript: false,
                    scriptFile: scriptFile,
                    scriptContent: '',
                    os: detectedOS
                };
            }
            
            console.log('Configuração Antivírus salva:', window.configState.antivirus);
            
            // Salvar script personalizado no caminho adequado (simulação)
            if (useCustomScript) {
                console.log(`Nota: Em produção, o script personalizado seria salvo em: ${getAntivirusScriptPath(detectedOS)}`);
            }
            
            // Atualizar botões
            updateButtonLabels();
            
            // Mostrar mensagem de sucesso
            showMessage('Configuração do Antivírus salva com sucesso!', 'success');
            
            modal.remove();
        });
    }
    
    /**
     * Obtém o caminho do arquivo de script de antivírus com base no SO
     * @param {string} os - Sistema operacional ('windows' ou 'linux')
     * @return {string} Caminho do arquivo
     */
    function getAntivirusScriptPath(os) {
        return os === 'windows' ? 
            CONFIG.paths.windowsAntivirus : 
            CONFIG.paths.linuxAntivirus;
    }
    
    /**
     * Atualiza os rótulos de todos os botões de configuração
     */
    function updateButtonLabels() {
        createdButtons.forEach((btn, playbookName) => {
            // Verificar tipo de playbook
            const isSite24x7 = isSite24x7Playbook(playbookName);
            const isAntivirus = isAntivirusPlaybook(playbookName);
            
            // Verificar se está configurado
            const isConfigured = (isSite24x7 && window.configState.site24x7 && window.configState.site24x7.deviceKey) || 
                                (isAntivirus && window.configState.antivirus && window.configState.antivirus.scriptFile);
            
            // Atualizar o texto do botão
            btn.innerText = isConfigured ? '✓ CONFIGURAR' : 'CONFIGURAR';
        });
    }
    
    /**
     * Cria e posiciona botões de configuração nos cards de playbook
     */
    function createAndPositionButtons() {
        // Evitar criar botões duplicados
        document.querySelectorAll('.configure-btn').forEach(btn => {
            if (!btn.hasAttribute('data-fixed') || btn.getAttribute('data-fixed') !== 'true') {
                btn.remove();
            }
        });
        
        // Buscar todas as playbooks
        document.querySelectorAll('.playbook-item').forEach(item => {
            const playbookName = item.getAttribute('data-playbook-name');
            if (!playbookName) return;
            
            // Verificar se é uma playbook especial
            const isSite24x7 = isSite24x7Playbook(playbookName);
            const isAntivirus = isAntivirusPlaybook(playbookName);
            
            if (!isSite24x7 && !isAntivirus) return;
            
            // Verificar se já existe um botão para esta playbook e remover
            if (createdButtons.has(playbookName)) {
                const oldBtn = createdButtons.get(playbookName);
                if (document.body.contains(oldBtn)) {
                    oldBtn.remove();
                }
                createdButtons.delete(playbookName);
            }
            
            // Detectar sistema operacional da playbook
            const os = detectOS(item);
            
            // Criar novo botão
            const btn = document.createElement('button');
            
            // Determinar status de configuração
            const isConfigured = (isSite24x7 && window.configState.site24x7 && window.configState.site24x7.deviceKey) || 
                               (isAntivirus && window.configState.antivirus && window.configState.antivirus.scriptFile);
            
            const checkmark = isConfigured ? '✓ ' : '';
            
            btn.innerText = `${checkmark}CONFIGURAR`;
            btn.setAttribute('data-fixed', 'true');
            btn.setAttribute('data-playbook', playbookName);
            btn.setAttribute('data-os', os);
            btn.className = 'configure-btn';
            
            // Garantir posicionamento correto
            if (window.getComputedStyle(item).position === 'static') {
                item.style.position = 'relative';
            }
            
            // Adicionar eventos
            if (isSite24x7) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openSite24x7Modal();
                    return false;
                });
            } else {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openAntivirusModal(os);
                    return false;
                });
            }
            
            // Prevenir propagação de eventos
            ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
                btn.addEventListener(eventType, e => e.stopPropagation());
            });
            
            // Adicionar ao item e registrar
            item.appendChild(btn);
            createdButtons.set(playbookName, btn);
        });
    }
    
    /**
     * Intercepta a execução de playbooks para adicionar configurações
     */
    function interceptPlaybookExecution() {
        // Guardar referência à função original
        if (typeof window.originalExecuteFunc !== 'function' && typeof window.executeSelectedPlaybooks === 'function') {
            window.originalExecuteFunc = window.executeSelectedPlaybooks;
            
            // Sobrescrever a função de execução
            window.executeSelectedPlaybooks = function() {
                console.log('Interceptando execução de playbooks para adicionar configurações personalizadas');
                
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
                            
                            if (isSite24x7Playbook(playbookName) && window.configState.site24x7 && window.configState.site24x7.deviceKey) {
                                if (!data.extra_vars) data.extra_vars = {};
                                data.extra_vars.device_key = window.configState.site24x7.deviceKey;
                                console.log('Adicionando configuração do Site24x7:', window.configState.site24x7.deviceKey);
                                
                                // Notificar o usuário
                                showMessage(`Aplicando configuração do Site24x7: Grupo personalizado com chave ${window.configState.site24x7.deviceKey.substring(0, 8)}...`, 'info');
                            }
                            
                            if (isAntivirusPlaybook(playbookName) && window.configState.antivirus) {
                                if (!data.extra_vars) data.extra_vars = {};
                                
                                if (window.configState.antivirus.customScript) {
                                    data.extra_vars.custom_script = true;
                                    data.extra_vars.script_filename = window.configState.antivirus.scriptFile;
                                    data.extra_vars.script_content = window.configState.antivirus.scriptContent;
                                    console.log('Adicionando configuração de script personalizado de Antivírus');
                                    
                                    // Notificar o usuário
                                    showMessage(`Aplicando configuração de Antivírus: Script personalizado "${window.configState.antivirus.scriptFile}"`, 'info');
                                } else {
                                    data.extra_vars.custom_script = false;
                                    data.extra_vars.script_filename = window.configState.antivirus.scriptFile;
                                    console.log('Adicionando configuração de script predefinido de Antivírus:', window.configState.antivirus.scriptFile);
                                    
                                    // Notificar o usuário
                                    showMessage(`Aplicando configuração de Antivírus: Script "${window.configState.antivirus.scriptFile}"`, 'info');
                                }
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
                window.originalExecuteFunc();
                
                // Restaurar fetch original após um momento
                setTimeout(() => {
                    window.fetch = originalFetch;
                }, 1000);
            };
        }
    }
    
    /**
     * Configura monitoramento de mudanças no DOM para adicionar botões a novos cards
     */
    function setupPlaybookMonitoring() {
        // Função para observar mudanças no DOM
        const observer = new MutationObserver(mutations => {
            let needsUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verificar se novos elementos foram adicionados
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.classList && (node.classList.contains('playbook-item') || node.querySelectorAll('.playbook-item').length > 0)) {
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
            // Tentar novamente mais tarde
            setTimeout(setupPlaybookMonitoring, 1000);
        }
    }
    
    /**
     * Configura os escutadores de eventos para filtros de SO e categoria
     */
    function setupFilterListeners() {
        const osFilter = document.getElementById('os-filter');
        const categoryFilter = document.getElementById('category-filter');
        
        if (osFilter) {
            osFilter.addEventListener('change', () => {
                // Recriar botões após mudança de SO
                setTimeout(createAndPositionButtons, 500);
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                // Recriar botões após mudança de categoria
                setTimeout(createAndPositionButtons, 500);
            });
        }
    }
    
    /**
     * Inicializa valores padrão para as configurações
     */
    function initializeDefaultConfigs() {
        // Inicializar configuração do Site24x7 se não estiver definida
        if (!window.configState.site24x7 || !window.configState.site24x7.deviceKey) {
            window.configState.site24x7 = {
                deviceKey: CONFIG.defaultSite24x7Key
            };
        }
        
        // Inicializar configuração do Antivírus se não estiver definida
        if (!window.configState.antivirus || !window.configState.antivirus.scriptFile) {
            window.configState.antivirus = {
                customScript: false,
                scriptFile: CONFIG.defaultAntivirusScript,
                scriptContent: '',
                os: 'windows'
            };
        }
    }
    
    
    /**
     * Inicializa o sistema
     */
    function initialize() {
        try {
            console.log("Inicializando sistema de botões de configuração otimizado");
            
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
            
            // Configurar escutadores de eventos para filtros
            setupFilterListeners();
            
            // Configurar atualização periódica
            setInterval(createAndPositionButtons, CONFIG.updateInterval);
            
            // Marcar como inicializado
            window.configButtonsInitialized = true;
            
            console.log("✅ Sistema de botões de configuração inicializado com sucesso!");
        } catch (error) {
            console.error("❌ Erro ao inicializar sistema de botões:", error);
        }
    }
    
    // Iniciar o sistema
    initialize();
})();