// Gerenciador unificado para Ansible - Versão 4.0
// Consolida e melhora as funções de antivírus e Site24x7

// Função auxiliar para exibir mensagens na interface com temporizador
function showMessage(text, type = 'warning', containerId = 'running-playbooks', duration = 5000) {
    const container = document.getElementById(containerId);
    if (!container) {
        debugLog(`Container ${containerId} não encontrado`, 'error');
        return;
    }

    // Remove mensagens anteriores
    const existingMessage = container.querySelector('.execution-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'execution-message';
    messageDiv.style.cssText = `
        padding: 16px;
        text-align: center;
        border-radius: 6px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: ${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'};
        background: ${type === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
        opacity: 1;
        transition: opacity 0.5s ease;
    `;
    messageDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'}" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>${text}</span>
    `;
    container.insertBefore(messageDiv, container.firstChild);
    debugLog(text, type === 'warning' ? 'warning' : 'error');

    // Remove a mensagem após o tempo especificado
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 500);
    }, duration);
}

function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        debugOutput.textContent = logMessage + '\n' + debugOutput.textContent;
        if (debugOutput.style.display === 'block') {
            debugOutput.scrollTop = 0;
        }
    }
}

// Identifica se já aplicamos o patch para evitar duplicação
if (typeof window.unifiedPatchApplied === 'undefined') {
    // Marca que o patch foi aplicado
    window.unifiedPatchApplied = true;
    
    // Armazenamos a referência original
    const originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
    
    // Flag para controlar execução em andamento
    let executionInProgress = false;
    
    // Constantes para os tipos de antivírus suportados
    const ANTIVIRUS_TYPES = [
        { id: 'trendmicro', name: 'TrendMicro Deep Security' },
        { id: 'implantacao', name: 'Antivírus Implantação' },
        { id: 'cta', name: 'Antivírus CTA' },
        { id: 'praxio', name: 'Antivírus Praxio' }
    ];
    
    // Constantes para os tipos de sistema operacional
    const OS_TYPES = {
        WINDOWS: 'windows',
        LINUX: 'linux'
    };
    
    // Device Keys predefinidas para o Site24x7
    const DEFAULT_DEVICE_KEYS = [
        { id: "operacao_autosky", name: "Operação - AutoSky", key: "us_df8c061ef70463b255e8b575406addfc" },
        { id: "bgm_praxio", name: "BGM - Praxio", key: "us_8e715d1f97d4f0ec254a90079d2249db" },
        { id: "cta_sistemas", name: "CTA Sistemas [OPER]", key: "us_0216ce8dbb4b1913045cc79ee1370c74" },
        { id: "core_autosky", name: "Core - AutoSky", key: "us_966606871b04f2e966f54b1de7b886b6" },
        { id: "operacao_sap", name: "Operação - SAP", key: "us_379a0e69c7769bbc6a3771569aceb974" },
        { id: "operacao_protheus", name: "Operação - Protheus", key: "us_3426b8f0d4705462da00057e1696c620" },
        { id: "contmatic", name: "Contmatic", key: "us_ded36cf6c477939d6f9f74ceb90b8ea7" },
        { id: "skydb_jv", name: "SKYDB (J&V)", key: "us_bf0da5d532db330e40b1299ccdd24e23" },
        { id: "skydb_jv_asun", name: "SKYDB (J&V) - ASUN", key: "us_5dda573a24a261fc019258a7df777aea" },
        { id: "skydb_jv_guanabara_rj", name: "SKYDB (J&V) - Guanabara RJ", key: "us_e142d2777ac2278170fa0b9408f22533" },
        { id: "skydb_jv_guanabara_rs", name: "SKYDB (J&V) - Guanabara RS", key: "us_62eaf9386fb2061201d249141ad93712" },
        { id: "skydb_jv_extrabom", name: "SKYDB (J&V) - EXTRABOM", key: "us_83c835510672d2fa0e1f0ccd7b20a66f" },
        { id: "skydb_jv_cobasi", name: "SKYDB (J&V) - Cobasi", key: "us_59439b1a04893d0169290b41664294b7" },
        { id: "skydb_jv_dpc", name: "SKYDB (J&V) - DPC", key: "us_0a8a8f3a77310a53ff93869b0373adc4" },
        { id: "skydb_jv_dislub", name: "SKYDB (J&V) - Dislub", key: "us_00d79ee1723ab6390bda904f1a326d51" },
        { id: "skydb_jv_atkarejo", name: "SKYDB (J&V) - Atakadão Atakarejo", key: "us_6499e42d6685af5f41ae1d82a68b4cc6" },
        { id: "skydb_jv_hippo", name: "SKYDB (J&V) - Hippo Supermercados", key: "us_7142907ff790b3c6b52d0242a7b17784" },
        { id: "skydb_jv_gmap", name: "SKYDB (J&V) - GMAP", key: "us_d39a0582ca0c6ae4525b8637952e2ae7" },
        { id: "skydb_jv_rede_mix", name: "SKYDB (J&V) - Grupo Rede Mix", key: "us_87949127833520805b5c141bfbac1baa" },
        { id: "skydb_jv_martminas", name: "SKYDB (J&V) - MartMinas", key: "us_48e7f080584ae454dd8a4418acb2e2a6" },
        { id: "skydb_jv_nagumo", name: "SKYDB (J&V) - Nagumo", key: "us_df22db611e062f3a583b774af95d39c4" },
        { id: "skydb_jv_novo_atacarejo", name: "SKYDB (J&V) - Novo Atacarejo", key: "us_110c4671ec21c05e238a07fbbb42b621" },
        { id: "skydb_jv_bigbox", name: "SKYDB (J&V) - BigBox", key: "us_3f451997ca08bbdd70992c64f9461349" },
        { id: "savegnago", name: "SAVEGNAGO [OPER]", key: "us_463eba76da53c5b86b9f91f94bfaaaa0" },
        { id: "villefort", name: "VilleFort [OPER]", key: "us_0911a2b9e57a6900da0eabdc124fc99a" },
        { id: "giga", name: "GIGA", key: "us_915e84bb6c33049be558be2dffc15231" },
        { id: "control_informatica", name: "Control Informática", key: "us_48f3b890ce6f2d4afb8455bd365c6c96" },
        { id: "mambo", name: "MAMBO", key: "us_69b15effcd49ea71f8974de97378871e" },
        { id: "mastermaq", name: "Mastermaq", key: "us_47ebc8e6d3ebacdd054871d662a27926" },
        { id: "alterdata", name: "AlterData", key: "us_dbbaa0d164ea2cf1caddc8ba13a4dd43" },
        { id: "vr_software", name: "VR Software", key: "us_2a600d4a68c4430b57c519e62df04db5" },
        { id: "hirota", name: "Hirota", key: "us_ce7a163c7adffcd14a6454106a271d48" },
        { id: "terra_verde", name: "Holding Terra Verde Lavoro", key: "us_fa40610609a8c6d611239da080ceb5a3" },
        { id: "tron", name: "Tron", key: "us_bf25187ddcbc2597b9a25d3e966c23fb" },
        { id: "core", name: "Core", key: "us_999c1335f7883ea4ba262f48fcb08aad" },
        { id: "fortes", name: "Fortes", key: "us_cb399d8d0ec2c805aa62335b9c35a8e6" },
        { id: "wba_software", name: "WBA Software", key: "us_ee5ba84f65e703ab19e6ddc9b24de8f5" },
        { id: "valorup", name: "ValorUp", key: "us_dd8beaea38602bd6b3bdd422ed146ea1" },
        { id: "nasajon", name: "Nasajon", key: "us_c8771912679a10934967435108181d9a" },
        { id: "totvs_cloud", name: "Totvs Cloud (CMNET)", key: "us_8e715d1f97d4f0ec254a90079d2249db" },
        { id: "bgm_praxio_2", name: "BGM Praxio", key: "us_22b5febc4225db17efc9fefe2452fc34" },
        { id: "ibyte", name: "Ibyte", key: "us_d498077494b344faf001a267d02a3c23" },
        { id: "bristol", name: "Bristol", key: "us_937f796aa5195b9cfdadb9abc0a3f938" },
        { id: "inside_sistemas", name: "Inside Sistemas", key: "us_3481a28d36c6a3cefb7058bf582cad48" },
        { id: "gz_sistemas", name: "GZ Sistemas", key: "us_924fc6801453ac7df8c3d00c7a29a2be" },
        { id: "faitec_hcc", name: "Faitec-HCC", key: "us_0ee14d0b17c20810844ccf450bc793aa" },
        { id: "faitec_plaza", name: "Faitec-Plaza Brasilia", key: "us_84e2cea5169a0290b785fb019830da57" },
        { id: "faitec_wish", name: "Faitec-Grupo-Wish", key: "us_cfaa17b4db0b8ba4a44dcc34f839d45f" },
        { id: "faitec_hmax", name: "Faitec-HMAX", key: "us_1a76e2c5cb1153a432665aa29cf254ff" },
        { id: "aliare_siagri", name: "Aliare - Siagri", key: "us_3ea86efdded6fbca0e46ab07c6883c8a" },
        { id: "atacadao", name: "Atacadão Dia a Dia [OPER]", key: "us_deaacd43807b50fd1568ddcb35d675be" },
        { id: "faitec_oper", name: "Faitec [OPER]", key: "us_c6d2ecd94cb1ae4031664061028046da" },
        { id: "yeti_tecnologia", name: "Yeti Tecnologia - Iniciativa Aplicativos", key: "us_5fd15fd56f3c21627dd1e32379e1a5ee" },
        { id: "paramount", name: "Paramount [OPER]", key: "us_c3947c92773b69b6c1c65b3543f2d70c" },
        { id: "ccab", name: "CCAB [OPER]", key: "us_05cd772e246e2536903f65df2669eddd" },
        { id: "fairfax", name: "Fairfax [OPER]", key: "us_3d5d1fc214ce1ccf80bb836d832f264c" },
        { id: "bbm_logistica", name: "BBM Logística [OPER]", key: "us_876a4157da76fe45d5ed1e16f1aeaa5e" },
        { id: "faitec_desbravador", name: "Faitec-Desbravador [OPER]", key: "us_cf58fd59eacfca04f8f6c80377d6983e" },
        { id: "akki", name: "Akki Atacadista [OPER]", key: "us_fdb9dc2dbf02180017b4f0516e2635ac" },
        { id: "siimed", name: "Siimed", key: "us_2928b4cab8cb5b0b462db94a63f4d979" },
        { id: "imperatriz", name: "Imperatriz (Mundial Mix) [OPER]", key: "us_67aca2b409635b8a8809e5bd7ecefd2a" }
    ];
    
    // Armazenamento local para configurações
    let antivirusConfig = {};
    let site24x7Config = {};
    
    // Array para controlar as etapas de configuração
    let configurationSteps = [];
    
    /**
     * Verifica se a playbook é relacionada ao Site24x7
     */
    function isSite24x7Playbook(playbookName) {
        if (!playbookName) return false;
        const playbookLower = String(playbookName).toLowerCase();
        return playbookLower.includes('site24x7') || 
               playbookLower.includes('site24') || 
               playbookLower.includes('24x7') ||
               playbookLower.includes('site-24') || 
               playbookLower.includes('zoho');
    }
    
    /**
     * Verifica se a playbook é relacionada a antivírus
     */
    function isAntivirusPlaybook(playbookName) {
        if (!playbookName) return false;
        return String(playbookName).toLowerCase().includes('antivirus') ||
               String(playbookName).toLowerCase().includes('trendmicro') ||
               String(playbookName).toLowerCase().includes('deep security');
    }
    
    /**
     * Determina o tipo de sistema operacional com base na playbook
     */
    function getOSTypeFromPlaybook(playbookPath) {
        if (!playbookPath) return null;
        
        if (playbookPath.toLowerCase().includes('/windows/')) {
            return OS_TYPES.WINDOWS;
        } else if (playbookPath.toLowerCase().includes('/linux/')) {
            return OS_TYPES.LINUX;
        }
        
        return null;
    }
    
    /**
     * Cria um indicador de configuração selecionada na interface
     */
    function addConfigurationIndicator(type, config) {
        const executionSection = document.getElementById('running-playbooks');
        if (!executionSection) return;
        
        // Verifica se já existe um indicador para este tipo
        const existingIndicator = document.querySelector(`.config-indicator.${type}`);
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = `config-indicator ${type}`;
        indicator.style.cssText = `
            padding: 8px 12px;
            margin-bottom: 8px;
            background: #2a2a2a;
            border-radius: 4px;
            border-left: 4px solid ${type === 'antivirus' ? '#4CAF50' : '#FFD600'};
            color: #fff;
            font-size: 12px;
        `;
        
        let content = '';
        if (type === 'antivirus') {
            let avType = config.avType || 'personalizado';
            let avTypeName = ANTIVIRUS_TYPES.find(t => t.id === avType)?.name || 'Personalizado';
            if (config.custom_script) avTypeName = 'Personalizado';
            
            content = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">Antivírus: ${avTypeName}</span>
                    <small>${config.os_type === 'windows' ? 'Windows' : 'Linux'}</small>
                </div>
                <div style="color: #aaa; font-size: 11px; margin-top: 4px;">
                    Arquivo: ${config.filename}
                </div>
            `;
        } else if (type === 'site24x7') {
            // Encontrar o nome do grupo com base na device key
            const deviceGroup = DEFAULT_DEVICE_KEYS.find(d => d.key === config.device_key);
            const groupName = deviceGroup ? deviceGroup.name : 'Personalizado';
            
            content = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">Site24x7: ${groupName}</span>
                    <small>${config.os_type === 'windows' ? 'Windows' : 'Linux'}</small>
                </div>
                <div style="color: #aaa; font-size: 11px; margin-top: 4px;">
                    Device Key: ${deviceGroup ? deviceGroup.id + '_device' : ''} (${config.device_key.substring(0, 6)}...${config.device_key.substring(config.device_key.length - 6)})
                </div>
            `;
        }
        
        indicator.innerHTML = content;
        executionSection.insertBefore(indicator, executionSection.firstChild);
    }
    
    /**
     * Substitui a função original por nossa versão unificada
     * que verifica o tipo de playbook e exibe o modal adequado
     */
    window.executeSelectedPlaybooks = function() {
        // Evita execuções duplicadas
        if (executionInProgress) {
            debugLog('Execução já em andamento, aguarde o término da operação atual', 'warning');
            showMessage('Execução já em andamento, aguarde o término da operação atual', 'warning');
            return;
        }
        
        if (selectedHosts.size === 0) {
            showMessage('Selecione pelo menos um host para executar');
            return;
        }
        if (selectedPlaybooks.size === 0) {
            showMessage('Selecione pelo menos uma playbook para executar');
            return;
        }
        
        // Marca execução como em andamento
        executionInProgress = true;
        
        try {
            // Limpa as configurações anteriores
            antivirusConfig = {};
            site24x7Config = {};
            configurationSteps = [];
            
            // Remove os indicadores de configuração anteriores
            document.querySelectorAll('.config-indicator').forEach(el => el.remove());
            
            const hasSite24x7Playbook = Array.from(selectedPlaybooks).some(playbook => 
                isSite24x7Playbook(playbook)
            );
            
            const hasAntivirusPlaybook = Array.from(selectedPlaybooks).some(playbook => 
                isAntivirusPlaybook(playbook) && !isSite24x7Playbook(playbook)
            );
            
            // Determina as etapas de configuração necessárias
            if (hasAntivirusPlaybook) {
                configurationSteps.push('antivirus');
            }
            
            if (hasSite24x7Playbook) {
                configurationSteps.push('site24x7');
            }
            
            if (configurationSteps.length > 0) {
                // Inicia a primeira etapa de configuração
                processNextConfigurationStep();
            } else {
                // Sem configurações especiais, executa normalmente
                debugLog('Executando playbooks normais');
                executeRegularPlaybooks();
            }
        } catch (error) {
            debugLog(`Erro ao executar playbooks: ${error.message}`, 'error');
            executionInProgress = false;
        }
    };
    
    /**
     * Processa a próxima etapa de configuração
     */
    function processNextConfigurationStep() {
        if (configurationSteps.length === 0) {
            // Todas as etapas concluídas, executa as playbooks
            executeAllConfiguredPlaybooks();
            return;
        }
        
        // Obtém a próxima etapa
        const nextStep = configurationSteps.shift();
        
        if (nextStep === 'antivirus') {
            debugLog('Exibindo modal de antivírus');
            showAntivirusConfigModal();
        } else if (nextStep === 'site24x7') {
            debugLog('Exibindo modal de Site24x7');
            showSite24x7ConfigModal();
        }
    }
    
    /**
     * Libera o bloqueio de execução quando a operação é concluída
     */
    function releaseExecutionLock() {
        executionInProgress = false;
        debugLog('Execução concluída, sistema pronto para nova operação');
    }
    
    /**
     * Executa playbooks regulares com bloqueio de execução
     */
    const originalExecuteRegularPlaybooks = window.executeRegularPlaybooks;
    window.executeRegularPlaybooks = async function() {
        try {
            await originalExecuteRegularPlaybooks();
        } finally {
            // Garante que o bloqueio seja liberado mesmo em caso de erro
            setTimeout(releaseExecutionLock, 1000);
        }
    };
    
    /**
     * Função para criar um modal padronizado
     */
    function createStandardModal(id, title, color, contentHTML, onConfirm, onCancel) {
        // Verifica se já existe um modal e remove
        let existingModal = document.getElementById(id);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar o modal
        const modal = document.createElement('div');
        modal.id = id;
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        // Conteúdo do modal
        modal.innerHTML = `
            <div style="background: #1e1e1e; border-radius: 8px; width: 90%; max-width: 800px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5); border: 1px solid #333; overflow: hidden;">
                <div style="padding: 15px 20px; background: linear-gradient(to bottom, #2a2a2a, #222); border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #fff; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        ${title}
                    </h3>
                    <button onclick="${onCancel}" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 5px; border-radius: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div style="padding: 20px;">
                    ${contentHTML}
                </div>
                
                <div style="padding: 15px 20px; background: #2a2a2a; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="${onCancel}" 
                            style="padding: 8px 15px; background: #444; border: none; border-radius: 4px; color: #ccc; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="${onConfirm}" 
                            style="padding: 8px 15px; background: ${color}; border: none; border-radius: 4px; color: ${color === '#FFD600' ? '#000' : '#fff'}; cursor: pointer; font-weight: 500;">
                        Confirmar Configuração
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar o modal ao documento
        document.body.appendChild(modal);
        
        return modal;
    }
    
    /**
     * Exibe modal de configuração do Site24x7
     */
    function showSite24x7ConfigModal() {
        const contentHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="radio" name="site24x7_os" value="windows" checked>
                        <span style="color: #ccc;">Windows</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="radio" name="site24x7_os" value="linux">
                        <span style="color: #ccc;">Linux</span>
                    </label>
                </div>
                
                <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Selecione o Grupo</h4>
                <div style="margin-bottom: 15px;">
                    <select id="site24x7_device_select" style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 14px;">
                        <option value="" disabled selected>-- Selecione um grupo --</option>
                        ${DEFAULT_DEVICE_KEYS.map(device => `<option value="${device.key}" data-id="${device.id}">${device.name}</option>`).join('')}
                    </select>
                </div>
                
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 15px;">
                        <input type="checkbox" id="custom_site24x7_checkbox" onchange="window.toggleCustomSite24x7Area()">
<span style="color: #ccc;">Usar Device Key personalizada</span>
                    </label>
                    
                    <div id="custom_site24x7_area" style="display: none;">
                        <input type="text" id="site24x7KeyInput" placeholder="Insira a Device Key (ex: us_xxxxxxxxxxxxxxxxxxxxxxxx)" 
                               style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px;">
                    </div>
                </div>
                
                <div id="site24x7_device_info" style="margin-top: 15px; background: #2a2a2a; border-left: 3px solid #FFD600; padding: 10px; display: none;">
                    <div style="color: #ccc; font-size: 13px; display: flex; justify-content: space-between;">
                        <span id="site24x7_group_name">-</span>
                        <span id="site24x7_device_id" style="font-family: monospace; color: #FFD600; font-weight: 500;">-</span>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px; font-family: monospace; word-break: break-all;">
                        <span id="site24x7_key_display">-</span>
                    </div>
                </div>
                
                <div style="background: #2a2a2a; border-radius: 6px; padding: 10px; margin-top: 20px;">
                    <div style="display: flex; align-items: center; gap: 5px; color: #aaa; font-size: 12px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>A Device Key será utilizada para registrar o host no Site24x7.</span>
                    </div>
                </div>
            </div>
        `;
        
        const modal = createStandardModal(
            'site24x7Modal', 
            'Configuração do Site24x7 Agent', 
            '#FFD600', 
            contentHTML, 
            'window.confirmSite24x7Config()', 
            'window.cancelSite24x7Config()'
        );
        
        // Exporta funções necessárias para o escopo global
        window.toggleCustomSite24x7Area = function() {
            const useCustomKey = document.getElementById('custom_site24x7_checkbox').checked;
            document.getElementById('custom_site24x7_area').style.display = useCustomKey ? 'block' : 'none';
            document.getElementById('site24x7_device_select').disabled = useCustomKey;
            
            if (useCustomKey) {
                document.getElementById('site24x7_device_info').style.display = 'none';
            } else {
                const selectedDeviceKey = document.getElementById('site24x7_device_select').value;
                if (selectedDeviceKey) {
                    updateSite24x7DeviceInfo(selectedDeviceKey);
                }
            }
        };
        
        // Função para atualizar as informações do dispositivo
        function updateSite24x7DeviceInfo(deviceKey) {
            const deviceInfo = DEFAULT_DEVICE_KEYS.find(dev => dev.key === deviceKey);
            if (!deviceInfo) return;
            
            document.getElementById('site24x7_device_info').style.display = 'block';
            document.getElementById('site24x7_group_name').textContent = deviceInfo.name;
            document.getElementById('site24x7_device_id').textContent = deviceInfo.id + '_device';
            document.getElementById('site24x7_key_display').textContent = deviceKey;
        }
        
        // Adiciona event listener para o select
        document.getElementById('site24x7_device_select').addEventListener('change', function() {
            updateSite24x7DeviceInfo(this.value);
        });
        
        window.confirmSite24x7Config = function() {
            let deviceKey = '';
            const osType = document.querySelector('input[name="site24x7_os"]:checked').value;
            
            const useCustomKey = document.getElementById('custom_site24x7_checkbox').checked;
            if (useCustomKey) {
                deviceKey = document.getElementById('site24x7KeyInput').value.trim();
                if (!deviceKey) {
                    showMessage('Por favor, insira uma Device Key válida.');
                    return;
                }
            } else {
                const selectElement = document.getElementById('site24x7_device_select');
                deviceKey = selectElement.value;
                if (!deviceKey) {
                    showMessage('Por favor, selecione um grupo.');
                    return;
                }
            }
            
            // Salva a configuração
            site24x7Config = {
                device_key: deviceKey,
                os_type: osType
            };
            
            // Adiciona o indicador de configuração
            addConfigurationIndicator('site24x7', site24x7Config);
            
            // Remove o modal
            document.getElementById('site24x7Modal').remove();
            
            // Processa a próxima etapa
            processNextConfigurationStep();
        };
        
        window.cancelSite24x7Config = function() {
            document.getElementById('site24x7Modal').remove();
            releaseExecutionLock();
        };
        
        debugLog('Modal de configuração do Site24x7 exibido');
    }
    
    /**
     * Exibe modal de configuração de antivírus
     */
    function showAntivirusConfigModal() {
        const contentHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4CAF50; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="radio" name="av_os_type" value="windows" checked onchange="window.toggleAntivirusSelect()">
                        <span style="color: #ccc;">Windows</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="radio" name="av_os_type" value="linux" onchange="window.toggleAntivirusSelect()">
                        <span style="color: #ccc;">Linux</span>
                    </label>
                </div>
                
                <h4 style="color: #4CAF50; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Selecione o Tipo de Antivírus</h4>
                <div style="margin-bottom: 15px;">
                    <select id="antivirus_type_select" style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 14px;">
                        <option value="" disabled selected>-- Selecione um tipo de antivírus --</option>
                        ${ANTIVIRUS_TYPES.map(av => `<option value="${av.id}">${av.name}</option>`).join('')}
                    </select>
                </div>
                
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 15px;">
                        <input type="checkbox" id="custom_av_checkbox" onchange="window.toggleCustomAVArea()">
                        <span style="color: #ccc;">Usar script personalizado</span>
                    </label>
                    
                    <div id="custom_av_area" style="display: none;">
                        <div>
                            <label style="display: block; color: #ccc; margin-bottom: 5px;">Conteúdo do Script</label>
                            <textarea id="custom_av_content" 
                                      placeholder="# Insira o conteúdo do script aqui" 
                                      style="width: 100%; height: 200px; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
                        </div>
                    </div>
                </div>
                
                <div id="antivirus_info" style="margin-top: 15px; background: #2a2a2a; border-left: 3px solid #4CAF50; padding: 10px; display: none;">
                    <div style="color: #ccc; font-size: 13px; display: flex; justify-content: space-between;">
                        <span id="antivirus_name">-</span>
                        <span id="antivirus_os" style="color: #999;">-</span>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px; font-family: monospace;">
                        Arquivo: <span id="antivirus_filename">-</span>
                    </div>
                </div>
                
                <div style="background: #2a2a2a; border-radius: 6px; padding: 10px; margin-top: 20px;">
                    <div style="display: flex; align-items: center; gap: 5px; color: #aaa; font-size: 12px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Os arquivos de antivírus serão buscados na pasta <code>/archives/windows/antivirus/</code> ou <code>/archives/linux/antivirus/</code> dependendo do sistema operacional.</span>
                    </div>
                </div>
            </div>
        `;
        
        const modal = createStandardModal(
            'antivirusModal', 
            'Configuração de Antivírus', 
            '#4CAF50', 
            contentHTML, 
            'window.confirmAntivirusConfig()', 
            'window.cancelAntivirusConfig()'
        );
        
        // Exporta funções necessárias para o escopo global
        window.toggleAntivirusSelect = function() {
            const osType = document.querySelector('input[name="av_os_type"]:checked').value;
            const avSelect = document.getElementById('antivirus_type_select');
            
            // Atualiza o elemento select com as opções disponíveis para o sistema operacional selecionado
            avSelect.innerHTML = '<option value="" disabled selected>-- Selecione um tipo de antivírus --</option>';
            
            // Adiciona as opções de antivírus relevantes para o sistema operacional
            ANTIVIRUS_TYPES.forEach(av => {
                if ((osType === 'windows' && av.id !== 'linux_only') || 
                    (osType === 'linux' && av.id !== 'windows_only')) {
                    const option = document.createElement('option');
                    option.value = av.id;
                    option.textContent = av.name;
                    avSelect.appendChild(option);
                }
            });
            
            updateAntivirusInfo();
        };
        
        window.toggleCustomAVArea = function() {
            const useCustomScript = document.getElementById('custom_av_checkbox').checked;
            document.getElementById('custom_av_area').style.display = useCustomScript ? 'block' : 'none';
            document.getElementById('antivirus_type_select').disabled = useCustomScript;
            
            if (useCustomScript) {
                document.getElementById('antivirus_info').style.display = 'block';
                document.getElementById('antivirus_name').textContent = 'Antivírus Personalizado';
                document.getElementById('antivirus_os').textContent = document.querySelector('input[name="av_os_type"]:checked').value === 'windows' ? 'Windows' : 'Linux';
                document.getElementById('antivirus_filename').textContent = document.querySelector('input[name="av_os_type"]:checked').value === 'windows' ? 'personalizado.ps1' : 'personalizado.sh';
            } else {
                updateAntivirusInfo();
            }
        };
        
        // Função para atualizar as informações do antivírus
        function updateAntivirusInfo() {
            const avType = document.getElementById('antivirus_type_select').value;
            const osType = document.querySelector('input[name="av_os_type"]:checked').value;
            
            if (!avType) {
                document.getElementById('antivirus_info').style.display = 'none';
                return;
            }
            
            const avInfo = ANTIVIRUS_TYPES.find(av => av.id === avType);
            if (!avInfo) return;
            
            document.getElementById('antivirus_info').style.display = 'block';
            document.getElementById('antivirus_name').textContent = avInfo.name;
            document.getElementById('antivirus_os').textContent = osType === 'windows' ? 'Windows' : 'Linux';
            document.getElementById('antivirus_filename').textContent = osType === 'windows' ? `${avType}.ps1` : `${avType}.sh`;
        }
        
        // Adiciona event listener para o select de antivírus
        document.getElementById('antivirus_type_select').addEventListener('change', updateAntivirusInfo);
        
        window.confirmAntivirusConfig = function() {
            const osType = document.querySelector('input[name="av_os_type"]:checked').value;
            const useCustomScript = document.getElementById('custom_av_checkbox').checked;
            
            let scriptConfig = {
                os_type: osType,
                custom_script: useCustomScript,
                avType: null,
                filename: null,
                script_content: null
            };
            
            if (useCustomScript) {
                // Verifica se o conteúdo do script foi preenchido
                const scriptContent = document.getElementById('custom_av_content').value.trim();
                if (!scriptContent) {
                    showMessage('Por favor, insira o conteúdo do script personalizado');
                    return;
                }
                
                // Define o nome do arquivo baseado no sistema operacional
                scriptConfig.filename = osType === 'windows' ? 'personalizado.ps1' : 'personalizado.sh';
                scriptConfig.script_content = scriptContent;
            } else {
                // Verifica se um tipo de antivírus foi selecionado
                const avType = document.getElementById('antivirus_type_select').value;
                if (!avType) {
                    showMessage('Por favor, selecione um tipo de antivírus');
                    return;
                }
                
                scriptConfig.avType = avType;
                
                // Define o nome do arquivo baseado no tipo e sistema operacional
                scriptConfig.filename = osType === 'windows' ? `${avType}.ps1` : `${avType}.sh`;
            }
            
            // Salva a configuração
            antivirusConfig = scriptConfig;
            
            // Adiciona o indicador de configuração
            addConfigurationIndicator('antivirus', antivirusConfig);
            
            // Remove o modal
            document.getElementById('antivirusModal').remove();
            
            // Processa a próxima etapa
            processNextConfigurationStep();
        };
        
        window.cancelAntivirusConfig = function() {
            document.getElementById('antivirusModal').remove();
            releaseExecutionLock();
        };
        
        // Inicializa o select de antivírus
        window.toggleAntivirusSelect();
        
        debugLog('Modal de configuração de antivírus exibido');
    }
    
    /**
     * Executa todas as playbooks com as configurações
     */
    async function executeAllConfiguredPlaybooks() {
        try {
            debugLog('Iniciando execução das playbooks configuradas');
            
            const executionSection = document.getElementById('running-playbooks');
            if (!executionSection) throw new Error('Elemento running-playbooks não encontrado');
            
            // Limpa execuções anteriores
            for (const [jobId, card] of runningJobs.entries()) {
                card.remove();
                runningJobs.delete(jobId);
            }
            
            const playbooksToExecute = Array.from(selectedPlaybooks);
            const hostsToExecute = Array.from(selectedHosts);
            
            // Busca os playbooks disponíveis
            const response = await fetch('/api/playbooks');
            if (!response.ok) throw new Error(`Erro ao buscar playbooks: ${response.status}`);
            const allPlaybooks = await response.json();
            
            const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
            
            // Separa playbooks por tipo
            const antivirusPlaybooks = playbooksToExecute.filter(name => 
                isAntivirusPlaybook(name) && !isSite24x7Playbook(name)
            );
            
            const site24x7Playbooks = playbooksToExecute.filter(name => 
                isSite24x7Playbook(name)
            );
            
            const otherPlaybooks = playbooksToExecute.filter(name => 
                !isAntivirusPlaybook(name) && !isSite24x7Playbook(name)
            );
            
            debugLog(`Playbooks de antivírus: ${antivirusPlaybooks.join(', ')}`);
            debugLog(`Playbooks Site24x7: ${site24x7Playbooks.join(', ')}`);
            debugLog(`Outras playbooks: ${otherPlaybooks.join(', ')}`);
            
            // Função auxiliar para executar playbook
            async function executePlaybook(playbookName, host, extraVars = {}) {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                    return;
                }
                
                const requestData = {
                    playbook: playbookPath,
                    hosts: [host],
                    extra_vars: extraVars
                };
                
                try {
                    debugLog(`Enviando requisição para playbook: ${playbookName} no host: ${host}`);
                    
                    const runResponse = await fetch('/api/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!runResponse.ok) {
                        const errorText = await runResponse.text();
                        throw new Error(`Erro ao executar playbook: ${errorText}`);
                    }
                    
                    const data = await runResponse.json();
                    const job_id = data.job_id;
                    
                    debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
                    const card = createExecutionCard(playbookName, new Set([host]), job_id);
                    executionSection.insertBefore(card, executionSection.firstChild);
                    runningJobs.set(job_id, card);
                    monitorPlaybookExecution(job_id, card);
                    
                    return job_id;
                } catch (error) {
                    debugLog(`Erro ao executar ${playbookName}: ${error.message}`, 'error');
                    showMessage(`Erro ao executar ${playbookName}: ${error.message}`, 'error');
                }
            }
            
            // Executa playbooks de antivírus
            if (Object.keys(antivirusConfig).length > 0 && antivirusPlaybooks.length > 0) {
                debugLog('Executando playbooks de antivírus com a configuração definida');
                
                const extraVars = {
                    os_type: antivirusConfig.os_type,
                    custom_script: antivirusConfig.custom_script,
                    antivirus_type: antivirusConfig.avType,
                    antivirus_path: antivirusConfig.os_type === 'windows' ? '/archives/windows/antivirus/' : '/archives/linux/antivirus/'
                };
                
                if (antivirusConfig.custom_script) {
                    extraVars.script_content = antivirusConfig.script_content;
                    extraVars.custom_filename = antivirusConfig.filename;
                }
                
                for (const playbookName of antivirusPlaybooks) {
                    for (const host of hostsToExecute) {
                        await executePlaybook(playbookName, host, extraVars);
                    }
                }
            }
            
            // Executa playbooks Site24x7
            if (Object.keys(site24x7Config).length > 0 && site24x7Playbooks.length > 0) {
                debugLog('Executando playbooks Site24x7 com a configuração definida');
                
                // Encontra o ID do grupo para o device selecionado
                const deviceGroup = DEFAULT_DEVICE_KEYS.find(d => d.key === site24x7Config.device_key);
                const groupId = deviceGroup ? deviceGroup.id + '_device' : '';
                
                const extraVars = {
                    device_key: site24x7Config.device_key,
                    os_type: site24x7Config.os_type,
                    device_group: groupId
                };
                
                for (const playbookName of site24x7Playbooks) {
                    for (const host of hostsToExecute) {
                        await executePlaybook(playbookName, host, extraVars);
                    }
                }
            }
            
            // Executa outras playbooks
            if (otherPlaybooks.length > 0) {
                debugLog('Executando playbooks regulares');
                
                for (const playbookName of otherPlaybooks) {
                    for (const host of hostsToExecute) {
                        await executePlaybook(playbookName, host);
                    }
                }
            }
            
            debugLog('Todas as playbooks foram executadas');
        } catch (error) {
            debugLog(`Erro na execução: ${error.message}`, 'error');
            showMessage(`Erro na execução: ${error.message}`, 'error');
        } finally {
            // Libera o bloqueio de execução
            setTimeout(releaseExecutionLock, 1000);
        }
    }
    
    // Expõe a função de liberação de bloqueio globalmente
    window.releaseExecutionLock = releaseExecutionLock;
}

// Chamada inicial para aplicar o patch quando o script é carregado
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Inicializando gerenciador unificado para Ansible v4.0', 'info');
});