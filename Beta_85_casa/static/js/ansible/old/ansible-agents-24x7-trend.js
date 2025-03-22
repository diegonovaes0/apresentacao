/**
 * comente o que esse js faz
 */


(function() {
    console.log("Inicializando solução robusta para botões de configuração e banner");
    
    // Configurações globais
    const config = {
        updateInterval: 2000,
        defaultSite24x7Key: 'us_df8c061ef70463b255e8b575406addfc',
        defaultAntivirusScript: 'antivirus.ps1',
        site24x7Keywords: ['site24x7', '24x7'],
        antivirusKeywords: ['antivirus', 'trendmicro'],
        buttonColor: '#FFD600',
        buttonHoverColor: '#FFE033'
    };
    
    // Dados de grupos Site24x7 e scripts de antivírus (mantidos do código original)
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


      // Funções de geração de scripts e playbooks
      function generateSite24x7Script(deviceKey) {
        return `#!/bin/bash
# Script de instalação personalizado Site24x7
INSTALL_KEY="${deviceKey}"

echo "Instalando Site24x7 com chave: $INSTALL_KEY"
mkdir -p /opt/site24x7
echo "$INSTALL_KEY" > /opt/site24x7/devicekey.txt
`;
    }

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

    function generateAntivirusScript(scriptContent) {
        return `#!/bin/bash
# Script de instalação personalizado de Antivírus

${scriptContent || '# Script de instalação padrão'}

echo "Instalando antivírus com script personalizado"
`;
    }

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

    // Função para criar o banner persistente
    function createPersistentBanner() {
        const existingBanner = document.querySelector('#persistent-config-banner');
        if (existingBanner) existingBanner.remove();

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

        banner.querySelector('.banner-container').style.cssText = containerStyles;
        banner.querySelector('.banner-header').style.cssText = headerStyles;
        banner.querySelector('.banner-body').style.cssText = bodyStyles;
        banner.querySelector('.banner-close').style.cssText = closeButtonStyles;
        banner.querySelector('h3').style.cssText = 'margin: 0 !important; color: #FFD600 !important;';
        
        banner.querySelectorAll('.banner-site24x7, .banner-antivirus').forEach(btn => {
            btn.style.cssText = buttonStyles;
        });

        document.body.appendChild(banner);

        setupBannerEvents(banner);
        ensureBannerPersistence(banner);

        return banner;
    }

    // Configurar eventos do banner
    function setupBannerEvents(banner) {
        const closeButton = banner.querySelector('.banner-close');
        const site24x7Button = banner.querySelector('.banner-site24x7');
        const antivirusButton = banner.querySelector('.banner-antivirus');

        closeButton.addEventListener('click', () => {
            clearInterval(banner.dataset.persistenceInterval);
            banner.remove();
        });

        site24x7Button.addEventListener('click', openSite24x7Modal);
        antivirusButton.addEventListener('click', openAntivirusModal);
    }

    // Garantir persistência do banner
    function ensureBannerPersistence(banner) {
        const persistenceInterval = setInterval(() => {
            if (!document.body.contains(banner)) {
                document.body.appendChild(banner);
                setupBannerEvents(banner);
            }
        }, 200);

        banner.dataset.persistenceInterval = persistenceInterval;
    }

    // Funções de utilitário
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
    }

    function isSite24x7Playbook(name) {
        return isPlaybookOfType(name, config.site24x7Keywords);
    }

    function isAntivirusPlaybook(name) {
        return isPlaybookOfType(name, config.antivirusKeywords);
    }

    // Banner persistente
    function createPersistentBanner() {
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
                        <button class="banner-site24x7">Configurar Site24x7</button>
                        <button class="banner-antivirus">Configurar Antivírus</button>
                    </div>
                </div>
            </div>
        `;

        // Estilos inline
        banner.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            background-color: #121212;
            border-radius: 8px;
            width: 400px;
            max-height: 80vh;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            font-family: Arial, sans-serif;
        `;

        document.body.appendChild(banner);

        // Eventos do banner
        banner.querySelector('.banner-close').addEventListener('click', () => banner.remove());
        banner.querySelector('.banner-site24x7').addEventListener('click', openSite24x7Modal);
        banner.querySelector('.banner-antivirus').addEventListener('click', openAntivirusModal);

        return banner;
    }

    // Modais de configuração
    function openSite24x7Modal() {
        const modal = createModal('Site24x7', getSite24x7ModalContent());
        
        const confirmButton = modal.querySelector('#confirm-btn');
        confirmButton.addEventListener('click', () => {
            const deviceKey = getSelectedSite24x7DeviceKey();
            if (!deviceKey) return;

            window.site24x7Config = { 
                deviceKey,
                script: generateSite24x7Script(deviceKey),
                playbook: generateSite24x7Playbook(deviceKey)
            };

            updateButtonStates();
            modal.remove();
        });
    }

    function openAntivirusModal() {
        const modal = createModal('Antivírus', getAntivirusModalContent());
        
        const confirmButton = modal.querySelector('#confirm-btn');
        confirmButton.addEventListener('click', () => {
            const antivirusConfig = getSelectedAntivirusConfig();
            if (!antivirusConfig) return;

            window.antivirusConfig = antivirusConfig;

            updateButtonStates();
            modal.remove();
        });
    }

    function createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">✕</button>
                </div>
                ${content}
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
        return modal;
    }

    function getSite24x7ModalContent() {
        // Implementação detalhada do conteúdo do modal Site24x7
    }

    function getAntivirusModalContent() {
        // Implementação detalhada do conteúdo do modal Antivírus
    }

    function getSelectedSite24x7DeviceKey() {
        // Lógica para obter a chave do dispositivo
    }

    function getSelectedAntivirusConfig() {
        // Lógica para obter a configuração do antivírus
    }

    function updateButtonStates() {
        // Atualizar estados dos botões
    }

    // Inicialização
    function initialize() {
        createPersistentBanner();
        setupPlaybookMonitoring();
        interceptPlaybookExecution();
    }

    // Executar inicialização
    initialize();
})();