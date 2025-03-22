/**
 * unified-ansible-manager.js
 * Gerenciador unificado para Ansible que padroniza os banners de Antivírus e Site24x7
 * com interface consistente e seletor para chaves principais/secundárias
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
        archivesPath: '/static/arquivos/',
        // Seletor para o container de playbooks
        playbooksContainer: '#playbooks',
        // Display names para as playbooks (nome customizado para exibição)
        displayNames: {
            'site24x7_agent.yml': 'Site24x7 Agent',
            'trendmicro_agent.yml': 'Trend Micro Antivírus'
        }
    };

    // Estado do gerenciador
    let state = {
        bannerAdded: false,
        activeExecutions: new Map()
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
            { name: "SKYDB (J&V) - Guanabara RJ", key: "us_e142d2777ac2278170fa0b9408f22533" },
            { name: "SKYDB (J&V) - Guanabara RS", key: "us_62eaf9386fb2061201d249141ad93712" },
            { name: "SKYDB (J&V) - EXTRABOM", key: "us_83c835510672d2fa0e1f0ccd7b20a66f" },
            { name: "SKYDB (J&V) - Cobasi", key: "us_59439b1a04893d0169290b41664294b7" },
            { name: "SKYDB (J&V) - DPC", key: "us_0a8a8f3a77310a53ff93869b0373adc4" },
            { name: "SKYDB (J&V) - Dislub", key: "us_00d79ee1723ab6390bda904f1a326d51" },
            { name: "SKYDB (J&V) - Atakadão Atakarejo", key: "us_6499e42d6685af5f41ae1d82a68b4cc6" },
            { name: "SKYDB (J&V) - Hippo Supermercados", key: "us_7142907ff790b3c6b52d0242a7b17784" },
            { name: "SKYDB (J&V) - GMAP", key: "us_d39a0582ca0c6ae4525b8637952e2ae7" },
            { name: "SKYDB (J&V) - Grupo Rede Mix", key: "us_87949127833520805b5c141bfbac1baa" },
            { name: "SKYDB (J&V) - MartMinas", key: "us_48e7f080584ae454dd8a4418acb2e2a6" },
            { name: "SKYDB (J&V) - Nagumo", key: "us_df22db611e062f3a583b774af95d39c4" },
            { name: "SKYDB (J&V) - Novo Atacarejo", key: "us_110c4671ec21c05e238a07fbbb42b621" },
            { name: "SKYDB (J&V) - BigBox", key: "us_3f451997ca08bbdd70992c64f9461349" },
            { name: "SAVEGNAGO [OPER]", key: "us_463eba76da53c5b86b9f91f94bfaaaa0" },
            { name: "VilleFort [OPER]", key: "us_0911a2b9e57a6900da0eabdc124fc99a" },
            { name: "GIGA", key: "us_915e84bb6c33049be558be2dffc15231" },
            { name: "Control Informática", key: "us_48f3b890ce6f2d4afb8455bd365c6c96" },
            { name: "MAMBO", key: "us_69b15effcd49ea71f8974de97378871e" },
            { name: "Mastermaq", key: "us_47ebc8e6d3ebacdd054871d662a27926" },
            { name: "AlterData", key: "us_dbbaa0d164ea2cf1caddc8ba13a4dd43" },
            { name: "VR Software", key: "us_2a600d4a68c4430b57c519e62df04db5" },
            { name: "Hirota", key: "us_ce7a163c7adffcd14a6454106a271d48" },
            { name: "Holding Terra Verde Lavoro", key: "us_fa40610609a8c6d611239da080ceb5a3" },
            { name: "Tron", key: "us_bf25187ddcbc2597b9a25d3e966c23fb" },
            { name: "Fortes", key: "us_999c1335f7883ea4ba262f48fcb08aad" },
            { name: "WBA Software", key: "us_cb399d8d0ec2c805aa62335b9c35a8e6" },
            { name: "ValorUp", key: "us_ee5ba84f65e703ab19e6ddc9b24de8f5" },
            { name: "Nasajon", key: "us_dd8beaea38602bd6b3bdd422ed146ea1" },
            { name: "Totvs Cloud (CMNET)", key: "us_c8771912679a10934967435108181d9a" },
            { name: "Ibyte", key: "us_d498077494b344faf001a267d02a3c23" },
            { name: "Bristol", key: "us_937f796aa5195b9cfdadb9abc0a3f938" },
            { name: "Inside Sistemas", key: "us_3481a28d36c6a3cefb7058bf582cad48" },
            { name: "GZ Sistemas", key: "us_924fc6801453ac7df8c3d00c7a29a2be" },
            { name: "Faitec-HCC", key: "us_0ee14d0b17c20810844ccf450bc793aa" },
            { name: "Faitec-Plaza Brasilia", key: "us_84e2cea5169a0290b785fb019830da57" },
            { name: "Faitec-Grupo-Wish", key: "us_cfaa17b4db0b8ba4a44dcc34f839d45f" },
            { name: "Faitec-HMAX", key: "us_1a76e2c5cb1153a432665aa29cf254ff" },
            { name: "Aliare - Siagri", key: "us_3ea86efdded6fbca0e46ab07c6883c8a" },
            { name: "Atacadão Dia a Dia [OPER]", key: "us_deaacd43807b50fd1568ddcb35d675be" },
            { name: "Faitec [OPER]", key: "us_c6d2ecd94cb1ae4031664061028046da" },
            { name: "Yeti Tecnologia - Iniciativa Aplicativos", key: "us_5fd15fd56f3c21627dd1e32379e1a5ee" },
            { name: "Paramount [OPER]", key: "us_c3947c92773b69b6c1c65b3543f2d70c" },
            { name: "CCAB [OPER]", key: "us_05cd772e246e2536903f65df2669eddd" },
            { name: "Fairfax [OPER]", key: "us_3d5d1fc214ce1ccf80bb836d832f264c" },
            { name: "BBM Logística [OPER]", key: "us_876a4157da76fe45d5ed1e16f1aeaa5e" },
            { name: "Faitec-Desbravador [OPER]", key: "us_cf58fd59eacfca04f8f6c80377d6983e" },
            { name: "Akki Atacadista [OPER]", key: "us_fdb9dc2dbf02180017b4f0516e2635ac" },
            { name: "Siimed", key: "us_2928b4cab8cb5b0b462db94a63f4d979" },
            { name: "Imperatriz (Mundial Mix) [OPER]", key: "us_67aca2b409635b8a8809e5bd7ecefd2a" }
        ]
    };

    // Configurações de antivírus
    const antivirusConfigs = {
        principais: [
            { name: "TrendMicro Deep Security", type: "trendmicro", tenant: "CFDEC234-D723-31B2-A5EE-91855A2696E4", token: "D66CA5DF-3FEF-BF5E-1CEC-CCDCEB69D093", policy: "39", group: "2248" },
            { name: "Antivírus Implantação", type: "implantacao", key: "ImplantacaoSky2025!" }
        ],
        secundarias: [
            { name: "Antivírus CTA", type: "cta", key: "CtaSystems2025!" },
            { name: "Antivírus Praxio", type: "praxio", key: "PraxioSky2025!" },
            { name: "Antivírus Personalizado", type: "custom", file: "custom_antivirus.ps1", key: "CustomAV2025!" }
        ]
    };

    // HTML dos banners unificados
    const bannersHTML = {
        // Banner unificado para Site24x7
        site24x7: `
        <div id="site24x7-banner" class="unified-banner">
            <div class="banner-header">
                <h3 id="banner-title" class="site24x7">Configuração do Site24x7</h3>
                <button class="banner-close">✕</button>
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
                    <div class="info-box">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-text">
                            A chave será buscada no arquivo Site24x7 da pasta <code>/arquivos/windows/</code> 
                            ou <code>/arquivos/linux/</code> dependendo do sistema operacional.
                        </div>
                    </div>
                    
                    <!-- Botão de confirmação unificado -->
                    <button id="site24x7-confirm-button" class="banner-confirm site24x7">Continuar Instalação</button>
                </div>
            </div>
        </div>
        `,
        
        // Banner unificado para Antivírus
        antivirus: `
        <div id="antivirus-banner" class="unified-banner">
            <div class="banner-header">
                <h3 id="banner-title" class="antivirus">Configuração de Antivírus</h3>
                <button class="banner-close">✕</button>
            </div>
            <div class="banner-content">
                <div class="banner-section active">
                    <label>
                        Selecione o Tipo de Antivírus
                        <select id="antivirus-type-select" class="ansible-select">
                            <optgroup label="Principais">
                                <!-- Opções principais serão adicionadas via JS -->
                            </optgroup>
                            <optgroup label="Outros">
                                <!-- Outras opções serão adicionadas via JS -->
                            </optgroup>
                        </select>
                    </label>
                    
                    <!-- Campos específicos para TrendMicro -->
                    <div id="trendmicro-fields" class="av-fields">
                        <div class="field-grid">
                            <div class="field-row">
                                <label>Tenant ID<input type="text" id="av-tenant-id"></label>
                                <label>Token<input type="text" id="av-token"></label>
                            </div>
                            <div class="field-row">
                                <label>Policy ID<input type="text" id="av-policy-id"></label>
                                <label>Group ID<input type="text" id="av-group-id"></label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Campos para antivírus padrão -->
                    <div id="standard-av-fields" class="av-fields">
                        <label>Chave de Ativação<input type="text" id="av-key"></label>
                    </div>
                    
                    <!-- Campos para antivírus personalizado -->
                    <div id="custom-av-fields" class="av-fields">
                        <label>Arquivo Personalizado<input type="text" id="av-custom-file"></label>
                        <label>Chave de Ativação (Opcional)<input type="text" id="av-custom-key"></label>
                    </div>
                    
                    <div class="info-box">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-text">
                            Os arquivos de antivírus serão buscados na pasta <code>/arquivos/windows/</code> 
                            ou <code>/arquivos/linux/</code> dependendo do sistema operacional.
                        </div>
                    </div>
                    
                    <!-- Botão de confirmação unificado -->
                    <button id="antivirus-confirm-button" class="banner-confirm antivirus">Continuar Instalação</button>
                </div>
            </div>
        </div>
        `,
        
        // Log detalhado (mesmo para todos os tipos)
        log: `
        <div class="log-container">
            <div class="execution-log" style="display: none;">
                <div class="log-header">
                    <span class="log-title">Execução</span>
                    <button class="log-copy">Copiar</button>
                </div>
                
                <div class="log-content">
                    <div class="log-summary-box">
                        <div class="summary-header">Resumo da Configuração</div>
                        <div class="summary-rows" id="log-summary-rows">
                            <!-- Será preenchido dinamicamente com base no tipo de playbook -->
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
        `
    };

    // Estilos CSS para os banners e logs
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
            --text-primary: #FFFFFF;
            --text-secondary: #B0B0B0;
            --submenu-level-1: #2A2A2A;
            --submenu-level-2: #242424;
            --submenu-level-3: #1E1E1E;
            --shadow-dark: rgba(0, 0, 0, 0.3);
            --transition-duration: 0.3s;
            --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Estilos dos Banners Unificados */
        .unified-banner {
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
        
        .unified-banner.visible { 
            display: block; 
        }
        
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
            font-size: 14px;
            display: flex;
            align-items: center;
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
            width: 16px;
            height: 16px;
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
        }
        
        .banner-close:hover {
            transform: scale(1.2);
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
            border-radius: 4px;
            padding: 10px;
            background: var(--black-smoke);
            border: 1px solid var(--gray-dark);
        }
        
        .banner-section.active {
            display: flex;
        }
        
        .banner-section label {
            color: var(--text-primary);
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .banner-section input, .banner-section select {
            background: var(--black-elegant);
            border: 1px solid var(--gray-dark);
            border-radius: 4px;
            padding: 8px;
            color: var(--text-primary);
            font-size: 12px;
            font-family: monospace;
        }
        
        .banner-section input::placeholder {
            color: var(--text-secondary);
            opacity: 0.5;
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
            display: flex;
            flex-direction: row !important;
            align-items: center;
            gap: 8px;
        }
        
        .custom-key input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
        }
        
        .field-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .field-row {
            display: flex;
            gap: 10px;
        }
        
        .field-row label {
            flex: 1;
        }
        
        .av-fields {
            display: none;
            flex-direction: column;
            gap: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }
        
        .av-fields.active {
            display: flex;
        }
        
        .copy-button {
            background: var(--gray-dark);
            border: none;
            border-radius: 3px;
            padding: 5px;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 12px;
            transition: var(--transition-duration) var(--transition-timing);
        }
        
        .copy-button:hover {
            background: var(--submenu-level-1);
            color: var(--text-primary);
        }
        
        .info-box {
            background: rgba(33, 150, 243, 0.1);
            border: 1px solid rgba(33, 150, 243, 0.3);
            border-radius: 4px;
            padding: 8px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 11px;
            color: var(--text-secondary);
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
        .banner-confirm {
            margin-top: 10px;
            padding: 10px;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            font-size: 13px;
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
        
        /* Estilos de Log */
        .log-container {
            position: relative;
            width: 100%;
            margin-top: 10px;
        }
        
        .log-toggle {
            border: none;
            border-radius: 3px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
            transition: var(--transition-duration) var(--transition-timing);
            margin-left: 8px;
            display: inline-block;
        }
        
        .log-toggle.site24x7 {
            background: var(--accent-blue);
            color: var(--text-primary);
        }
        
        .log-toggle.site24x7:hover {
            background: var(--accent-blue-hover);
        }
        
        .log-toggle.antivirus {
            background: var(--accent-green);
            color: var(--text-primary);
        }
        
        .log-toggle.antivirus:hover {
            background: var(--accent-green-hover);
        }
        
        .execution-log {
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
        
        .log-title { 
            font-weight: bold;
        }
        
        .log-title.site24x7 {
            color: var(--accent-blue);
        }
        
        .log-title.antivirus {
            color: var(--accent-green);
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
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--gray-dark);
            padding-bottom: 5px;
        }
        
        .summary-header.site24x7, .tasks-header.site24x7 {
            color: var(--accent-blue);
        }
        
        .summary-header.antivirus, .tasks-header.antivirus {
            color: var(--accent-green);
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
            font-size: 12px;
            border-bottom: 1px dashed var(--gray-dark);
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        
        .tasks-title.site24x7 {
            color: var(--accent-blue);
        }
        
        .tasks-title.antivirus {
            color: var(--accent-green);
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
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
            transition: var(--transition-duration) var(--transition-timing);
        }
        
        .log-copy-all.site24x7 {
            background: var(--accent-blue);
            color: var(--text-primary);
        }
        
        .log-copy-all.site24x7:hover {
            background: var(--accent-blue-hover);
        }
        
        .log-copy-all.antivirus {
            background: var(--accent-green);
            color: var(--text-primary);
        }
        
        .log-copy-all.antivirus:hover {
            background: var(--accent-green-hover);
        }
        
        @media (max-width: 768px) {
            .log-content {
                flex-direction: column;
            }
            .log-summary-box, .log-tasks-box {
                flex: 1;
                width: 100%;
            }
            .field-row {
                flex-direction: column;
            }
        }
    `;

    // Utilidades
    const utils = {
        // Verifica o tipo de playbook com base no nome
        getPlaybookType: (playbookName) => {
            if (!playbookName) return null;
            
            playbookName = playbookName.toLowerCase();
            
            // Verificar por tipo
            if (config.keywords.site24x7.some(kw => playbookName.includes(kw))) {
                return 'site24x7';
            }
            
            if (config.keywords.antivirus.some(kw => playbookName.includes(kw))) {
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
        
        // Limpa valores de campos para exibição
        cleanFieldValue: (text, fieldType) => {
            if (!text) return '';
            
            // Remove caracteres de escape e espaços extras
            let cleanText = text.replace(/\\n/g, ' ')
                              .replace(/\*\*/g, '')
                              .replace(/\n/g, ' ')
                              .trim();
            
            return cleanText;
        },
        
        // Extrai tarefas do log de saída do Ansible
        extractTasks: (output) => {
            const tasks = {
                completed: [],
                skipped: [],
                failed: []
            };
            
            if (!output) return tasks;
            
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

    // Injetar estilos CSS
    const injectStyles = () => {
        if (document.getElementById('unified-ansible-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'unified-ansible-styles';
        style.textContent = styles;
        document.head.appendChild(style);
    };

    // Injetar o banner para o tipo específico (site24x7 ou antivirus)
    const injectBanner = (type) => {
        if (state.bannerAdded) {
            // Se já existe um banner, removê-lo e criar o correto
            document.querySelector('.unified-banner')?.remove();
            state.bannerAdded = false;
        }
        
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
            const antivirusSelect = document.getElementById('antivirus-type-select');
            if (antivirusSelect) {
                // Limpar opções existentes
                antivirusSelect.innerHTML = '';
                
                // Grupo de opções principais
                const principaisGroup = document.createElement('optgroup');
                principaisGroup.label = 'Principais';
                
                antivirusConfigs.principais.forEach(av => {
                    const option = document.createElement('option');
                    option.value = av.type;
                    option.textContent = av.name;
                    principaisGroup.appendChild(option);
                });
                
                antivirusSelect.appendChild(principaisGroup);
                
                // Grupo de opções secundárias
                const secundariasGroup = document.createElement('optgroup');
                secundariasGroup.label = 'Outros';
                
                antivirusConfigs.secundarias.forEach(av => {
                    const option = document.createElement('option');
                    option.value = av.type;
                    option.textContent = av.name;
                    secundariasGroup.appendChild(option);
                });
                
                antivirusSelect.appendChild(secundariasGroup);
                
                // Atualizar campos ao mudar a seleção
                antivirusSelect.addEventListener('change', updateAntivirusFields);
                
                // Inicializar campos com o primeiro valor
                updateAntivirusFields();
            }
        }
    };

    // Atualizar os campos de antivírus com base no tipo selecionado
    const updateAntivirusFields = () => {
        const antivirusSelect = document.getElementById('antivirus-type-select');
        if (!antivirusSelect) return;
        
        const selectedType = antivirusSelect.value;
        
        // Esconder todos os campos
        document.querySelectorAll('.av-fields').forEach(field => {
            field.classList.remove('active');
        });
        
        // Mostrar os campos apropriados
        switch (selectedType) {
            case 'trendmicro':
                document.getElementById('trendmicro-fields').classList.add('active');
                
                // Preencher com valores padrão
                const config = antivirusConfigs.principais.find(av => av.type === 'trendmicro') || 
                              antivirusConfigs.secundarias.find(av => av.type === 'trendmicro');
                
                if (config) {
                    document.getElementById('av-tenant-id').value = config.tenant || '';
                    document.getElementById('av-token').value = config.token || '';
                    document.getElementById('av-policy-id').value = config.policy || '';
                    document.getElementById('av-group-id').value = config.group || '';
                }
                break;
            
            case 'custom':
                document.getElementById('custom-av-fields').classList.add('active');
                
                // Preencher com valores padrão
                const customConfig = antivirusConfigs.principais.find(av => av.type === 'custom') || 
                                    antivirusConfigs.secundarias.find(av => av.type === 'custom');
                
                if (customConfig) {
                    document.getElementById('av-custom-file').value = customConfig.file || '';
                    document.getElementById('av-custom-key').value = customConfig.key || '';
                }
                break;
            
            default:
                document.getElementById('standard-av-fields').classList.add('active');
                
                // Preencher com valores padrão
                const stdConfig = antivirusConfigs.principais.find(av => av.type === selectedType) || 
                                antivirusConfigs.secundarias.find(av => av.type === selectedType);
                
                if (stdConfig) {
                    document.getElementById('av-key').value = stdConfig.key || '';
                }
                break;
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
                    navigator.clipboard.writeText(target.value);
                    btn.textContent = '✓';
                    setTimeout(() => btn.textContent = '📋', 1500);
                });
            });
            
            // Botão de confirmar Site24x7
            const confirmButton = document.getElementById('site24x7-confirm-button');
            if (confirmButton) {
                confirmButton.addEventListener('click', executeSite24x7Playbook);
            }
        } else if (type === 'antivirus') {
            // Botão de confirmar Antivírus
            const confirmButton = document.getElementById('antivirus-confirm-button');
            if (confirmButton) {
                confirmButton.addEventListener('click', executeAntivirusPlaybook);
            }
        }
    };

    // Executar playbook do Site24x7
    const executeSite24x7Playbook = () => {
        let deviceKey;
        
        if (document.getElementById('site24x7-custom-key-toggle').checked) {
            // Usar chave personalizada
            deviceKey = document.getElementById('site24x7-custom-key').value;
        } else {
            // Usar chave selecionada
            deviceKey = document.getElementById('site24x7-key-input').value;
        }
        
        if (!deviceKey) {
            alert('Selecione ou digite uma chave do Site24x7 válida.');
            return;
        }
        
        // Preparar para interceptar a chamada fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (url === '/api/run' && options?.method === 'POST') {
                const data = JSON.parse(options.body);
                data.extra_vars = {
                    device_key_input: deviceKey
                };
                options.body = JSON.stringify(data);
                console.log('Executando Site24x7 com parâmetros:', data.extra_vars);
            }
            return originalFetch.apply(this, arguments);
        };
        
        // Executar a playbook
        window.executeSelectedPlaybooks();
        
        // Restaurar fetch original após um tempo
        setTimeout(() => window.fetch = originalFetch, 1000);
        
        // Fechar o banner
        const banner = document.getElementById('site24x7-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
                state.bannerAdded = false;
            }, 300);
        }
    };

    // Executar playbook do Antivírus
    const executeAntivirusPlaybook = () => {
        const antivirusType = document.getElementById('antivirus-type-select').value;
        const extraVars = { antivirus_type: antivirusType };
        
        // Montar as variáveis extras com base no tipo
        switch (antivirusType) {
            case 'trendmicro':
                extraVars.tenant_id = document.getElementById('av-tenant-id').value;
                extraVars.token = document.getElementById('av-token').value;
                extraVars.policy_id = document.getElementById('av-policy-id').value;
                extraVars.group_id = document.getElementById('av-group-id').value;
                
                // Validações
                if (!extraVars.tenant_id || !extraVars.token || !extraVars.policy_id || !extraVars.group_id) {
                    alert('Todos os campos do TrendMicro são obrigatórios.');
                    return;
                }
                break;
            
            case 'custom':
                extraVars.custom_antivirus_file = document.getElementById('av-custom-file').value;
                extraVars.agent_key = document.getElementById('av-custom-key').value;
                
                // Validações
                if (!extraVars.custom_antivirus_file) {
                    alert('O arquivo personalizado é obrigatório.');
                    return;
                }
                break;
            
            default:
                extraVars.agent_key = document.getElementById('av-key').value;
                
                // Validações
                if (!extraVars.agent_key) {
                    alert('A chave de ativação é obrigatória.');
                    return;
                }
                break;
        }
        
        // Preparar para interceptar a chamada fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (url === '/api/run' && options?.method === 'POST') {
                const data = JSON.parse(options.body);
                data.extra_vars = extraVars;
                options.body = JSON.stringify(data);
                console.log('Executando Antivírus com parâmetros:', data.extra_vars);
            }
            return originalFetch.apply(this, arguments);
        };
        
        // Executar a playbook
        window.executeSelectedPlaybooks();
        
        // Restaurar fetch original após um tempo
        setTimeout(() => window.fetch = originalFetch, 1000);
        
        // Fechar o banner
        const banner = document.getElementById('antivirus-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
                state.bannerAdded = false;
            }, 300);
        }
    };

    // Injetar o log detalhado
    const injectLog = (card, jobId, type) => {
        if (!card || card.querySelector('.log-container')) return;
        
        // Adicionar botão Log ao lado do Ver Mais
        const toggleOutputBtn = card.querySelector('.toggle-output-btn');
        if (toggleOutputBtn) {
            const logToggle = document.createElement('button');
            logToggle.className = `log-toggle ${type || ''}`;
            logToggle.textContent = 'Log';
            toggleOutputBtn.parentNode.insertBefore(logToggle, toggleOutputBtn.nextSibling);
            
            const logContainer = document.createElement('div');
            logContainer.innerHTML = bannersHTML.log;
            card.appendChild(logContainer);
            
            const log = logContainer.querySelector('.execution-log');
            
            // Configurar elementos de log para o tipo específico
            if (type) {
                log.querySelector('.log-title').classList.add(type);
                log.querySelector('.log-copy-all').classList.add(type);
                log.querySelector('.summary-header').classList.add(type);
                log.querySelector('.tasks-header').classList.add(type);
                log.querySelectorAll('.tasks-title').forEach(el => el.classList.add(type));
            }
            
            // Criar os campos de resumo baseados no tipo
            createSummaryFields(log, type);
            
            // Armazenar referência para atualização posterior
            state.activeExecutions.set(jobId, {
                card,
                log,
                type,
                tasksCompleted: [],
                tasksSkipped: [],
                tasksFailed: [],
                rawOutput: ''
            });
            
            logToggle.addEventListener('click', () => {
                const isVisible = log.style.display === 'flex';
                log.style.display = isVisible ? 'none' : 'flex';
                logToggle.textContent = isVisible ? 'Log' : 'Esconder Log';
            });
            
            setupLogEvents(log, jobId, type);
        }
    };

    // Criar campos de resumo específicos para cada tipo
    const createSummaryFields = (log, type) => {
        const summaryRows = log.querySelector('#log-summary-rows');
        if (!summaryRows) return;
        
        summaryRows.innerHTML = '';
        
        // Campos comuns para todos os tipos
        summaryRows.innerHTML += `
            <div class="summary-row status-row"><span>Status:</span> <span class="log-status">Iniciando...</span></div>
        `;
        
        // Campos específicos por tipo
        if (type === 'site24x7') {
            summaryRows.innerHTML += `
                <div class="summary-row"><span>Chave:</span> <span class="log-device-key">-</span></div>
                <div class="summary-row"><span>Sistema:</span> <span class="log-system">-</span></div>
                <div class="summary-row"><span>Hostname:</span> <span class="log-hostname">-</span></div>
            `;
        } else if (type === 'antivirus') {
            summaryRows.innerHTML += `
                <div class="summary-row"><span>Tipo:</span> <span class="log-av-type">-</span></div>
                <div class="summary-row"><span>Sistema:</span> <span class="log-system">-</span></div>
                <div class="summary-row"><span>Hostname:</span> <span class="log-hostname">-</span></div>
            `;
            
            // Campos específicos para TrendMicro
            const avType = document.getElementById('antivirus-type-select')?.value;
            if (avType === 'trendmicro') {
                summaryRows.innerHTML += `
                    <div class="summary-row"><span>Tenant ID:</span> <span class="log-tenant-id">-</span></div>
                    <div class="summary-row"><span>Policy ID:</span> <span class="log-policy-id">-</span></div>
                    <div class="summary-row"><span>Group ID:</span> <span class="log-group-id">-</span></div>
                `;
            } else {
                summaryRows.innerHTML += `
                    <div class="summary-row"><span>Chave:</span> <span class="log-av-key">-</span></div>
                `;
                
                if (avType === 'custom') {
                    summaryRows.innerHTML += `
                        <div class="summary-row"><span>Arquivo:</span> <span class="log-av-file">-</span></div>
                    `;
                }
            }
        }
    };

    // Configurar eventos do log
    const setupLogEvents = (log, jobId, type) => {
        const execution = state.activeExecutions.get(jobId);
        if (!execution) return;
        
        // Botão de copiar
        log.querySelector('.log-copy').addEventListener('click', () => {
            // Construir texto de resumo com base no tipo
            let text = '';
            
            // Campos comuns
            text += `Status: ${log.querySelector('.log-status').textContent}\n`;
            
            // Campos específicos
            if (type === 'site24x7') {
                text += `Chave: ${log.querySelector('.log-device-key')?.textContent || '-'}\n`;
                text += `Sistema: ${log.querySelector('.log-system')?.textContent || '-'}\n`;
                text += `Hostname: ${log.querySelector('.log-hostname')?.textContent || '-'}\n`;
            } else if (type === 'antivirus') {
                text += `Tipo: ${log.querySelector('.log-av-type')?.textContent || '-'}\n`;
                text += `Sistema: ${log.querySelector('.log-system')?.textContent || '-'}\n`;
                text += `Hostname: ${log.querySelector('.log-hostname')?.textContent || '-'}\n`;
                
                // Campos específicos para o tipo de antivírus
                const avType = document.getElementById('antivirus-type-select')?.value;
                if (avType === 'trendmicro') {
                    text += `Tenant ID: ${log.querySelector('.log-tenant-id')?.textContent || '-'}\n`;
                    text += `Policy ID: ${log.querySelector('.log-policy-id')?.textContent || '-'}\n`;
                    text += `Group ID: ${log.querySelector('.log-group-id')?.textContent || '-'}\n`;
                } else {
                    text += `Chave: ${log.querySelector('.log-av-key')?.textContent || '-'}\n`;
                    
                    if (avType === 'custom') {
                        text += `Arquivo: ${log.querySelector('.log-av-file')?.textContent || '-'}\n`;
                    }
                }
            }
            
            navigator.clipboard.writeText(text);
            const btn = log.querySelector('.log-copy');
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = 'Copiar', 1500);
        });
        
        // Botão de copiar tudo
        log.querySelector('.log-copy-all').addEventListener('click', () => {
            // Construir texto de resumo completo
            let text = `=========== RESUMO DA CONFIGURAÇÃO ===========\n`;
            
            // Adicionar todos os campos de resumo
            const summaryRows = log.querySelectorAll('.summary-row');
            summaryRows.forEach(row => {
                const label = row.querySelector('span:first-child').textContent;
                const value = row.querySelector('span:last-child').textContent;
                text += `${label} ${value}\n`;
            });
            
            text += `===============================================\n\n`;
            
            // Adicionar tarefas
            text += `Tarefas Concluídas:\n`;
            execution.tasksCompleted.forEach(task => {
                text += `✓ ${task}\n`;
            });
            
            text += `\nTarefas Skipped:\n`;
            execution.tasksSkipped.forEach(task => {
                text += `↷ ${task}\n`;
            });
            
            text += `\nTarefas Falhadas:\n`;
            execution.tasksFailed.forEach(task => {
                text += `✗ ${task}\n`;
            });
            
            navigator.clipboard.writeText(text);
            const btn = log.querySelector('.log-copy-all');
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = 'Copiar Toda Configuração', 1500);
        });
    };

    // Atualizar sumário e tarefas no log
   // Atualizar sumário e tarefas no log
   const updateLog = (jobId, output, status) => {
    const execution = state.activeExecutions.get(jobId);
    if (!execution) return;

    const log = execution.log;
    
    // Atualizar status
    const statusElement = log.querySelector('.log-status');
    if (statusElement) {
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
    
    // Extrair e atualizar tarefas
    const tasks = utils.extractTasks(output);
    execution.tasksCompleted = tasks.completed;
    execution.tasksSkipped = tasks.skipped;
    execution.tasksFailed = tasks.failed;
    
    // Atualizar containers de tarefas
    const completedContainer = log.querySelector('.log-tasks-completed');
    const skippedContainer = log.querySelector('.log-tasks-skipped');
    const failedContainer = log.querySelector('.log-tasks-failed');
    
    if (completedContainer) {
        completedContainer.innerHTML = '';
        tasks.completed.forEach(task => {
            completedContainer.innerHTML += `
                <div class="task-item">
                    <span class="task-status-icon">✓</span>
                    <span class="task-name">${task}</span>
                </div>
            `;
        });
    }
    
    if (skippedContainer) {
        skippedContainer.innerHTML = '';
        tasks.skipped.forEach(task => {
            skippedContainer.innerHTML += `
                <div class="task-item">
                    <span class="task-status-icon">↷</span>
                    <span class="task-name">${task}</span>
                </div>
            `;
        });
    }
    
    if (failedContainer) {
        failedContainer.innerHTML = '';
        tasks.failed.forEach(task => {
            failedContainer.innerHTML += `
                <div class="task-item">
                    <span class="task-status-icon">✗</span>
                    <span class="task-name">${task}</span>
                </div>
            `;
        });
    }
    
    // Atualizar campos de sumário específicos conforme o tipo
    if (execution.type === 'site24x7') {
        // Atualizar campos específicos do Site24x7
        const deviceKeyEl = log.querySelector('.log-device-key');
        const systemEl = log.querySelector('.log-system');
        const hostnameEl = log.querySelector('.log-hostname');
        
        if (deviceKeyEl) {
            // Extrair a chave do Site24x7 do output ou usar a informada no form
            let deviceKey = document.getElementById('site24x7-custom-key-toggle')?.checked 
                ? document.getElementById('site24x7-custom-key')?.value
                : document.getElementById('site24x7-key-input')?.value;
            
            deviceKeyEl.textContent = deviceKey || '-';
        }
        
        if (systemEl || hostnameEl) {
            // Tentar extrair sistema e hostname do output
            const systemMatch = output.match(/Sistema:\s*([^\n]+)/);
            const hostnameMatch = output.match(/Hostname:\s*([^\n]+)/);
            
            if (systemEl && systemMatch) {
                systemEl.textContent = utils.cleanFieldValue(systemMatch[1], 'system');
            }
            
            if (hostnameEl && hostnameMatch) {
                hostnameEl.textContent = utils.cleanFieldValue(hostnameMatch[1], 'hostname');
            }
        }
    } else if (execution.type === 'antivirus') {
        // Atualizar campos específicos do Antivírus
        const avTypeEl = log.querySelector('.log-av-type');
        const systemEl = log.querySelector('.log-system');
        const hostnameEl = log.querySelector('.log-hostname');
        
        if (avTypeEl) {
            // Obter o tipo de antivírus selecionado
            const avTypeSelect = document.getElementById('antivirus-type-select');
            const selectedOption = avTypeSelect?.options[avTypeSelect.selectedIndex];
            avTypeEl.textContent = selectedOption?.textContent || '-';
        }
        
        if (systemEl || hostnameEl) {
            // Tentar extrair sistema e hostname do output
            const systemMatch = output.match(/Sistema:\s*([^\n]+)/);
            const hostnameMatch = output.match(/Hostname:\s*([^\n]+)/);
            
            if (systemEl && systemMatch) {
                systemEl.textContent = utils.cleanFieldValue(systemMatch[1], 'system');
            }
            
            if (hostnameEl && hostnameMatch) {
                hostnameEl.textContent = utils.cleanFieldValue(hostnameMatch[1], 'hostname');
            }
        }
        
        // Atualizar campos específicos para o tipo de antivírus
        const avType = document.getElementById('antivirus-type-select')?.value;
        if (avType === 'trendmicro') {
            const tenantIdEl = log.querySelector('.log-tenant-id');
            const policyIdEl = log.querySelector('.log-policy-id');
            const groupIdEl = log.querySelector('.log-group-id');
            
            if (tenantIdEl) tenantIdEl.textContent = document.getElementById('av-tenant-id')?.value || '-';
            if (policyIdEl) policyIdEl.textContent = document.getElementById('av-policy-id')?.value || '-';
            if (groupIdEl) groupIdEl.textContent = document.getElementById('av-group-id')?.value || '-';
        } else {
            const avKeyEl = log.querySelector('.log-av-key');
            
            if (avKeyEl) {
                if (avType === 'custom') {
                    avKeyEl.textContent = document.getElementById('av-custom-key')?.value || '-';
                } else {
                    avKeyEl.textContent = document.getElementById('av-key')?.value || '-';
                }
            }
            
            if (avType === 'custom') {
                const avFileEl = log.querySelector('.log-av-file');
                if (avFileEl) avFileEl.textContent = document.getElementById('av-custom-file')?.value || '-';
            }
        }
    }
    
    // Atualizar saída bruta
    execution.rawOutput = output;
};

// Monitorar seleção de playbooks
const monitorPlaybookSelection = () => {
    document.addEventListener('click', event => {
        const playbookItem = event.target.closest('.playbook-item');
        if (!playbookItem) return;

        const playbookName = playbookItem.getAttribute('data-playbook-name');
        if (!playbookName) return;
        
        const playbookType = utils.getPlaybookType(playbookName);
        if (!playbookType) return;

        const checkbox = playbookItem.querySelector('input[type="checkbox"]');
        if (checkbox?.checked) {
            injectBanner(playbookType);
        } else {
            const banner = document.querySelector('.unified-banner');
            if (banner) {
                banner.classList.remove('visible');
                setTimeout(() => {
                    banner.remove();
                    state.bannerAdded = false;
                }, 300);
            }
        }
    });
};

// Interceptar a criação de cards de execução
const interceptExecutionCards = () => {
    const originalCreate = window.createExecutionCard;
    window.createExecutionCard = function(playbookName, hosts, jobId) {
        const card = originalCreate.apply(this, arguments);
        const playbookType = utils.getPlaybookType(playbookName);
        
        if (playbookType) {
            setTimeout(() => injectLog(card, jobId, playbookType), 500);
        }
        
        return card;
    };
};

// Interceptar monitoramento de execuções
const interceptExecutionMonitoring = () => {
    const originalMonitor = window.monitorPlaybookExecution;
    window.monitorPlaybookExecution = function(jobId, card) {
        originalMonitor.apply(this, arguments);
        
        const playbookName = card.getAttribute('data-playbook-name');
        const playbookType = utils.getPlaybookType(playbookName);
        if (!playbookType) return;

        const interval = setInterval(() => {
            fetch(`/api/status/${jobId}`)
                .then(res => res.json())
                .then(data => {
                    updateLog(jobId, data.output || '', data.status);
                    
                    if (data.status === 'completed' || data.status === 'failed') {
                        // Mostrar o log quando a tarefa for concluída ou falhar
                        const log = card.querySelector('.execution-log');
                        if (log && log.style.display === 'none') {
                            log.style.display = 'flex';
                            card.querySelector('.log-toggle').textContent = 'Esconder Log';
                        }
                        clearInterval(interval);
                    }
                })
                .catch(err => console.error('Erro ao atualizar log:', err));
        }, 2000); // Intervalo de 2 segundos
    };
};

// Inicializar
const init = () => {
    injectStyles();
    monitorPlaybookSelection();
    interceptExecutionCards();
    interceptExecutionMonitoring();
    console.log('Gerenciador Unificado de Ansible inicializado com sucesso!');
};

// Adicionar evento para inicializar após o carregamento do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// API pública
return {
    version: '1.0.0',
    injectBannerFor: injectBanner,
    refresh: function() {
        console.log('Atualizando Gerenciador Unificado de Ansible...');
        injectStyles();
    }
};
})();