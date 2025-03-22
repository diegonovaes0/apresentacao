/**
 * baseline-output-fix.js
 * Melhora a exibição da saída de playbooks baseline e corrige problemas com multi-host
 */

(function() {
    console.log("Inicializando correção para saída de baseline multi-host...");
    
    // Armazena funções originais
    const originalFunctions = {
        toggleOutput: window.toggleOutput,
        _updateExecutionStatus: window._updateExecutionStatus,
        executeSelectedPlaybooks: window.executeSelectedPlaybooks
    };
    
    // Estado global para rastrear saídas por job ID
    const baselineOutputs = {};
    
    /**
     * Verifica se uma playbook é do tipo baseline
     * @param {string} playbookName - Nome da playbook
     * @returns {boolean} - Verdadeiro se for baseline
     */
    function isBaselinePlaybook(playbookName) {
        return playbookName && playbookName.toLowerCase().includes('baseline');
    }
    
    /**
     * Extrai informações importantes da saída do Ansible
     * @param {string} output - Saída do Ansible
     * @returns {Object} - Informações extraídas
     */
    function extractBaselineInfo(output) {
        const info = {
            hostname: "",
            publicIp: "",
            privateIp: "",
            system: "",
            parceiroUser: "",
            parceiroPassword: "",
            rootPassword: ""
        };
        
        // Padrões para extrair informações
        const patterns = {
            hostname: /(?:Hostname|HOSTNAME):\s*([^\s,\n]+)/i,
            publicIp: /(?:IP Público|PUBLIC_IP):\s*([^\s,\n]+)/i,
            privateIp: /(?:IP Privado|PRIVATE_IP):\s*([^\s,\n]+)/i,
            system: /(?:Sistema|SYSTEM):\s*([^\n]+?)(?:\n|$)/i,
            parceiroUser: /(?:Usuario parceiro|Usuário parceiro|PARCEIRO_USER):\s*([^\s,\n]+)/i,
            parceiroPassword: /(?:Senha parceiro|PARCEIRO_PASSWORD):\s*([^\s,\n]+)/i,
            rootPassword: /(?:Senha root|ROOT_PASSWORD):\s*([^\s,\n]+)/i
        };
        
        // Extrair cada tipo de informação
        Object.entries(patterns).forEach(([key, pattern]) => {
            const match = output.match(pattern);
            if (match && match[1]) {
                info[key] = match[1].trim();
            }
        });
        
        // Buscar informações de hosts na saída
        if (!info.hostname) {
            const hostMatch = output.match(/Host:\s*([^\s,\n]+)/);
            if (hostMatch && hostMatch[1]) {
                info.hostname = hostMatch[1].trim();
            }
        }
        
        // Buscar informações de sistema não capturadas pelo padrão principal
        if (!info.system) {
            const systemLines = output.match(/Sistema:.*?([^\n]+)/);
            if (systemLines && systemLines[1]) {
                info.system = systemLines[1].trim();
            }
        }
        
        return info;
    }
    
    /**
     * Cria ou atualiza o painel de resumo para informações do baseline
     * @param {HTMLElement} card - Card de execução
     * @param {Object} info - Informações extraídas
     * @param {string} hostId - ID do host (opcional)
     */
    function updateBaselineSummary(card, info, hostId) {
        // Se não temos informações suficientes, não exibir o resumo
        if (!info.hostname && !info.publicIp && !info.system) {
            return;
        }
        
        // Verificar se o card já possui um resumo
        let summaryPanel = card.querySelector('.baseline-info-summary');
        if (!summaryPanel) {
            summaryPanel = document.createElement('div');
            summaryPanel.className = 'baseline-info-summary';
            
            // Inserir após o cabeçalho do card
            const insertAfter = card.querySelector('.card-header') || card.querySelector('.host-info');
            if (insertAfter && insertAfter.nextSibling) {
                card.insertBefore(summaryPanel, insertAfter.nextSibling);
            } else {
                card.prepend(summaryPanel);
            }
        }
        
        // Definir um ID específico para o resumo, se houver um hostId
        if (hostId) {
            summaryPanel.id = `baseline-summary-${hostId}`;
        }
        
        // Atualizar o conteúdo do resumo
        summaryPanel.innerHTML = `
            <div class="summary-header">
                <h3>Informações do Baseline - ${info.hostname || "Host"}</h3>
                <button class="copy-summary-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                    Copiar
                </button>
            </div>
            <div class="summary-content">
                <div class="summary-row">
                    <div class="summary-item">
                        <div class="summary-label">Hostname:</div>
                        <div class="summary-value">${info.hostname || "N/A"}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">IP Público:</div>
                        <div class="summary-value">${info.publicIp || "N/A"}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">IP Privado:</div>
                        <div class="summary-value">${info.privateIp || "N/A"}</div>
                    </div>
                </div>
                <div class="summary-row">
                    <div class="summary-item">
                        <div class="summary-label">Sistema:</div>
                        <div class="summary-value">${info.system || "N/A"}</div>
                    </div>
                </div>
                <div class="summary-row credentials">
                    <div class="summary-item">
                        <div class="summary-label">Usuário Parceiro:</div>
                        <div class="summary-value">${info.parceiroUser || "N/A"}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Senha Parceiro:</div>
                        <div class="summary-value password">${info.parceiroPassword || "N/A"}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Senha Root:</div>
                        <div class="summary-value password">${info.rootPassword || "N/A"}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Aplicar estilo de destaque (piscar) ao painel para chamar a atenção
        summaryPanel.classList.add('highlight-panel');
        setTimeout(() => {
            summaryPanel.classList.remove('highlight-panel');
        }, 3000);
        
        // Adicionar evento ao botão de cópia
        const copyBtn = summaryPanel.querySelector('.copy-summary-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const textToCopy = `
Hostname: ${info.hostname || "N/A"}
IP Público: ${info.publicIp || "N/A"}
IP Privado: ${info.privateIp || "N/A"}
Sistema: ${info.system || "N/A"}
Usuário Parceiro: ${info.parceiroUser || "N/A"}
Senha Parceiro: ${info.parceiroPassword || "N/A"}
Senha Root: ${info.rootPassword || "N/A"}
                `.trim();
                
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        copyBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                                <path d="M20 6L9 17l-5-5"></path>
                            </svg>
                            Copiado!
                        `;
                        setTimeout(() => {
                            copyBtn.innerHTML = `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                                Copiar
                            `;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Erro ao copiar texto:', err);
                    });
            });
        }
    }
    
    /**
     * Função aprimorada para alternar a visibilidade da saída
     * @param {HTMLElement} button - Botão clicado
     */
    window.toggleOutput = function(button) {
        try {
            // Encontrar o card pai
            const card = button.closest('.execution-card');
            if (!card) {
                console.log("Card não encontrado para o botão");
                if (originalFunctions.toggleOutput) {
                    return originalFunctions.toggleOutput(button);
                }
                return;
            }
            
            // Verificar se é um card de baseline
            const playbookName = card.getAttribute('data-playbook-name') || '';
            const isBaseline = isBaselinePlaybook(playbookName);
            
            // Se não for baseline, usar a função original
            if (!isBaseline) {
                if (originalFunctions.toggleOutput) {
                    return originalFunctions.toggleOutput(button);
                }
            }
            
            // Encontrar o elemento de saída
            const output = card.querySelector('.ansible-output');
            if (!output) {
                console.log("Elemento de saída não encontrado no card");
                return;
            }
            
            // Verificar se a saída está visível
            const isVisible = output.classList.contains('visible') || 
                               output.style.display === 'block';
            
            console.log(`Alterando visibilidade da saída: ${isVisible ? "ocultar" : "mostrar"}`);
            
            // Alternar a visibilidade da saída
            if (isVisible) {
                output.classList.remove('visible');
                output.style.display = 'none';
            } else {
                output.classList.add('visible');
                output.style.display = 'block';
            }
            
            // Atualizar o botão
            button.innerHTML = isVisible ? `
                Ver Mais
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            ` : `
                Ver Menos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M18 15l-6-6-6 6"/>
                </svg>
            `;
            
            // Se a saída estiver sendo mostrada e for baseline, atualizar seu conteúdo
            if (!isVisible && isBaseline) {
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId) {
                    // Buscar e atualizar a saída em tempo real
                    fetchBaselineOutput(jobId, output, card);
                } else {
                    console.log("ID do job não encontrado no card");
                }
            }
        } catch (error) {
            console.error("Erro ao alternar visibilidade da saída:", error);
            // Em caso de erro, tenta usar a função original
            if (originalFunctions.toggleOutput) {
                originalFunctions.toggleOutput(button);
            }
        }
    };
    
    /**
     * Busca e atualiza a saída para playbooks baseline
     * @param {string} jobId - ID do job
     * @param {HTMLElement} outputElement - Elemento de saída
     * @param {HTMLElement} card - Card de execução
     */
    function fetchBaselineOutput(jobId, outputElement, card) {
        console.log(`Buscando saída para o job de baseline: ${jobId}`);
        
        // Mostrar indicador de carregamento
        outputElement.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Carregando saída do baseline...</div>';
        
        // Buscar a saída do servidor
        fetch(`/api/status/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Armazenar a saída para referência
                baselineOutputs[jobId] = data.output || '';
                
                // Se houver saída, processar e exibir
                if (data.output) {
                    // Extrair informações do baseline
                    const info = extractBaselineInfo(data.output);
                    
                    // Atualizar o resumo no topo do card
                    updateBaselineSummary(card, info);
                    
                    // Formatar e mostrar a saída completa
                    outputElement.innerHTML = formatBaselineOutput(data.output);
                    
                    // Se a saída está em progresso, configurar atualização automática
                    if (data.status === 'running') {
                        setTimeout(() => {
                            fetchBaselineOutput(jobId, outputElement, card);
                        }, 2000); // Atualizar a cada 2 segundos
                    }
                } else {
                    outputElement.innerHTML = '<div style="padding: 15px; text-align: center;">Ainda não há saída disponível para este baseline.</div>';
                }
            })
            .catch(error => {
                console.error("Erro ao buscar saída:", error);
                outputElement.innerHTML = `<div style="color: var(--error-red); padding: 16px;">Erro ao buscar saída: ${error.message}</div>`;
            });
    }
    
    /**
     * Formata a saída do baseline com destaque para informações importantes
     * @param {string} output - Saída bruta do Ansible
     * @returns {string} - HTML formatado
     */
    function formatBaselineOutput(output) {
        if (!output) {
            return '<div style="padding: 15px; text-align: center;">Nenhuma saída disponível</div>';
        }
        
        // Substituir quebras de linha por elementos HTML
        let formattedOutput = output.replace(/\n/g, '<br>');
        
        // Destacar diferentes tipos de linhas
        formattedOutput = formattedOutput
            // Plays (cabeçalhos)
            .replace(/PLAY\s*\[(.*?)\]/g, '<div class="ansible-play">PLAY [$1]</div>')
            // Tasks (tarefas)
            .replace(/TASK\s*\[(.*?)\]/g, '<div class="ansible-task">TASK [$1]</div>')
            // Status de tarefas
            .replace(/ok:/g, '<span class="ansible-ok">ok:</span>')
            .replace(/changed:/g, '<span class="ansible-changed">changed:</span>')
            .replace(/failed:/g, '<span class="ansible-failed">failed:</span>')
            .replace(/skipped:/g, '<span class="ansible-skipped">skipped:</span>')
            .replace(/unreachable:/g, '<span class="ansible-unreachable">unreachable:</span>')
            // Resumo
            .replace(/PLAY RECAP/g, '<div class="ansible-recap">PLAY RECAP</div>');
        
        // Destacar informações cruciais do baseline (nomes de usuários e senhas)
        formattedOutput = formattedOutput
            .replace(/(Usuario|Usuário|User):\s*([^\s<]+)/gi, 
                     '<strong style="color: #4CAF50;">$1: <span style="color: #FFD700;">$2</span></strong>')
            .replace(/(Senha|Password):\s*([^\s<]+)/gi, 
                     '<strong style="color: #4CAF50;">$1: <span style="color: #FFD700;">$2</span></strong>')
            .replace(/(Hostname):\s*([^\s<]+)/gi, 
                     '<strong style="color: #2196F3;">$1: <span style="color: white;">$2</span></strong>')
            .replace(/(IP\s+[^:]+):\s*([^\s<]+)/gi, 
                     '<strong style="color: #2196F3;">$1: <span style="color: white;">$2</span></strong>');
                     
        // Envolva tudo em uma div com estilos adequados
        return `<div class="ansible-output-formatted">${formattedOutput}</div>`;
    }
    
    /**
     * Sobrescreve a função executeSelectedPlaybooks para mostrar banners de baseline
     * ao lado dos hosts quando uma playbook de baseline é executada
     */
    window.executeSelectedPlaybooks = function() {
        // Verificar se alguma playbook de baseline está selecionada
        let baselineSelected = false;
        document.querySelectorAll('.playbook-item.selected').forEach(playbook => {
            const playbookName = playbook.getAttribute('data-playbook-name') || '';
            if (isBaselinePlaybook(playbookName)) {
                baselineSelected = true;
            }
        });
        
        // Se um baseline foi selecionado, destacar os hosts e seus banners
        if (baselineSelected) {
            highlightHostBaselines();
        }
        
        // Chamar a função original
        if (originalFunctions.executeSelectedPlaybooks) {
            return originalFunctions.executeSelectedPlaybooks();
        }
    };
    
    /**
     * Destaca os hosts selecionados e seus banners de baseline
     */
    function highlightHostBaselines() {
        // Identificar hosts selecionados
        document.querySelectorAll('.host-banner.selected').forEach(hostBanner => {
            // Extrair hostname do checkbox ou do banner
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            const hostname = checkbox?.dataset?.hostname;
            
            if (hostname) {
                // Garantir que o banner de baseline esteja visível
                ensureBaselineBannerVisible(hostname);
                
                // Destacar o host com animação
                hostBanner.classList.add('highlight-host');
                setTimeout(() => {
                    hostBanner.classList.remove('highlight-host');
                }, 3000);
            }
        });
    }
    
    /**
     * Garante que o banner de baseline para um host esteja visível
     * @param {string} hostname - Nome do host
     */
    function ensureBaselineBannerVisible(hostname) {
        // Normalizar o hostname para uso seguro em IDs
        const safeHostname = hostname.replace(/[^a-zA-Z0-9]/g, '-');
        
        // Verificar se o banner já existe
        const bannerId = `baseline-banner-${safeHostname}`;
        let baselineBanner = document.getElementById(bannerId);
        
        // Se o banner não existe e temos a função para criar, chamá-la
        if (!baselineBanner && typeof window.toggleBaselineBanner === 'function') {
            try {
                window.toggleBaselineBanner(hostname);
                baselineBanner = document.getElementById(bannerId);
                
                // Se o banner foi criado, destacá-lo
                if (baselineBanner) {
                    baselineBanner.classList.add('highlight-banner');
                    setTimeout(() => {
                        baselineBanner.classList.remove('highlight-banner');
                    }, 3000);
                }
            } catch (e) {
                console.error(`Erro ao criar banner de baseline para ${hostname}:`, e);
            }
        } else if (baselineBanner) {
            // Se o banner já existe, destacá-lo
            baselineBanner.classList.add('highlight-banner');
            setTimeout(() => {
                baselineBanner.classList.remove('highlight-banner');
            }, 3000);
        }
    }
    
    // Adicionar estilos necessários para os efeitos visuais
    function addStyles() {
        if (document.getElementById('baseline-output-fix-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'baseline-output-fix-styles';
        style.textContent = `
            /* Estilos para o resumo do baseline */
            .baseline-info-summary {
                background: linear-gradient(145deg, #1a1a1a, #222222);
                border-radius: 8px;
                margin: 12px;
                padding: 12px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 214, 0, 0.1);
                transition: all 0.3s ease;
            }
            
            /* Efeito de destaque piscando */
            @keyframes highlight-pulse {
                0%, 100% { box-shadow: 0 0 8px rgba(255, 214, 0, 0.3); border-color: rgba(255, 214, 0, 0.3); }
                50% { box-shadow: 0 0 16px rgba(255, 214, 0, 0.8); border-color: rgba(255, 214, 0, 0.8); }
            }
            
            .highlight-panel {
                animation: highlight-pulse 1.5s ease-in-out 3;
                border-color: rgba(255, 214, 0, 0.5);
            }
            
            /* Efeito de destaque para hosts */
            @keyframes highlight-host {
                0%, 100% { background-color: transparent; }
                50% { background-color: rgba(255, 214, 0, 0.2); }
            }
            
            .highlight-host {
                animation: highlight-host 1s ease-in-out 3;
            }
            
            /* Efeito de destaque para banners de baseline */
            @keyframes highlight-banner {
                0%, 100% { border-color: rgba(255, 214, 0, 0.3); }
                50% { border-color: var(--accent-gold); background-color: rgba(255, 214, 0, 0.1); }
            }
            
            .highlight-banner {
                animation: highlight-banner 1s ease-in-out 3;
            }
            
            .summary-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 8px;
            }
            
            .summary-header h3 {
                margin: 0;
                font-size: 16px;
                color: var(--accent-gold);
            }
            
            .copy-summary-btn {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                color: #ccc;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
            }
            
            .copy-summary-btn:hover {
                background: rgba(0, 0, 0, 0.5);
                border-color: var(--accent-gold);
                color: var(--accent-gold);
            }
            
            .summary-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .summary-row {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }
            
            .summary-row.credentials {
                margin-top: 4px;
                background: rgba(0, 0, 0, 0.2);
                padding: 8px;
                border-radius: 6px;
                border-left: 3px solid var(--accent-gold);
            }
            
            .summary-item {
                flex: 1;
                min-width: 180px;
            }
            
            .summary-label {
                font-size: 12px;
                color: var(--text-tertiary);
                margin-bottom: 2px;
            }
            
            .summary-value {
                font-size: 14px;
                color: var(--text-primary);
                background: rgba(0, 0, 0, 0.2);
                padding: 4px 8px;
                border-radius: 4px;
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .summary-value.password {
                color: var(--accent-gold);
                letter-spacing: 1px;
            }
            
            /* Estilos para saída formatada */
            .ansible-output {
                height: auto !important;
                max-height: 500px !important;
                overflow-y: auto !important;
                display: none;
                padding: 12px 16px !important;
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                line-height: 1.6;
                background: linear-gradient(to bottom, #1a1a1a, #121212);
                color: #d4d4d4;
                border-radius: 0 0 8px 8px;
                border-top: 1px solid #333;
            }
            
            .ansible-output.visible {
                display: block !important;
            }
            
            .ansible-output-formatted {
                white-space: pre-wrap;
            }
            
            .ansible-play {
                color: #569cd6;
                font-weight: bold;
                margin: 12px 0 8px 0;
                padding: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                border-left: 3px solid #569cd6;
            }
            
            .ansible-task {
                color: #9cdcfe;
                font-weight: 600;
                margin: 10px 0 6px 0;
                padding: 5px 8px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
                border-left: 2px solid #9cdcfe;
            }
            
            .ansible-ok {
                color: #4ec9b0;
                padding: 3px 0;
                display: inline-block;
            }
            
            .ansible-changed {
                color: #dcdcaa;
                padding: 3px 0;
                display: inline-block;
            }
            
            .ansible-failed {
                color: #f14c4c;
                padding: 3px 0;
                display: inline-block;
            }
            
            .ansible-skipped {
                color: #808080;
                padding: 3px 0;
                display: inline-block;
            }
            
            .ansible-unreachable {
                color: #f14c4c;
                padding: 3px 0;
                display: inline-block;
            }
            
            .ansible-recap {
                color: #569cd6;
                font-weight: bold;
                margin: 10px 0;
                padding: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                border: 1px solid rgba(86, 156, 214, 0.3);
            }
            
            /* Correção para logs multi-host */
            [id^="log-container"] {
                padding: 10px;
                margin: 8px 0;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 5px;
                border-left: 3px solid #4CAF50;
            }
            
            /* Garante que a saída não ultrapasse o card */
            .execution-card {
                display: flex;
                flex-direction: column;
                overflow: hidden;
                max-width: 100%;
                position: relative;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Inicializa os aprimoramentos para saída de baseline
     */
    function init() {
        // Adicionar estilos
        addStyles();
        
        // Atualizar cards existentes
        document.querySelectorAll('.execution-card').forEach(card => {
            const playbookName = card.getAttribute('data-playbook-name') || '';
            if (isBaselinePlaybook(playbookName)) {
                // Obter o job ID
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId) {
                    // Se a saída já estiver sendo exibida, atualizá-la
                    const output = card.querySelector('.ansible-output');
                    if (output && (output.classList.contains('visible') || output.style.display === 'block')) {
                        fetchBaselineOutput(jobId, output, card);
                    }
                }
            }
        });
        
        // Configurar um observador para monitorar novos cards
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Elemento
                            // Verificar se o nó é um card ou contém cards
                            if (node.classList && node.classList.contains('execution-card')) {
                                const playbookName = node.getAttribute('data-playbook-name') || '';
                                if (isBaselinePlaybook(playbookName)) {
                                    // Esperar um momento para que o card esteja totalmente carregado
                                    setTimeout(() => {
                                        const jobId = node.getAttribute('data-job-id') || node.dataset.jobId;
                                        if (jobId) {
                                            // Abrir automaticamente a saída para o card baseline
                                            const toggleBtn = node.querySelector('.toggle-output-btn');
                                            if (toggleBtn) {
                                                toggleBtn.click();
                                            }
                                        }
                                    }, 1000);
                                }
                            } else if (node.querySelectorAll) {
                                // Verificar se o nó contém cards
                                node.querySelectorAll('.execution-card').forEach(card => {
                                    const playbookName = card.getAttribute('data-playbook-name') || '';
                                    if (isBaselinePlaybook(playbookName)) {
                                        setTimeout(() => {
                                            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                                            if (jobId) {
                                                const toggleBtn = card.querySelector('.toggle-output-btn');
                                                if (toggleBtn) {
                                                    toggleBtn.click();
                                                }
                                            }
                                        }, 1000);
                                    }
                                });
                            }
                        }
                    }
                }
            });
        });
        
        // Iniciar a observação
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Corrige o erro com seletores inválidos em multi-host
     */
    function fixMultiHostSelectors() {
        // Sobrescrever a função injectLog se existir
        if (typeof window.injectLog === 'function') {
            const originalInjectLog = window.injectLog;
            window.injectLog = function(ip, logContent) {
                try {
                    // Sanitizar o IP para uso seguro em seletores CSS
                    const safeIp = ip.replace(/\./g, '-');
                    const containerSelector = `#log-container-${safeIp}`;
                    
                    // Verificar se o contêiner existe
                    let container = document.querySelector(containerSelector);
                    
                    // Se não existe, criar um novo
                    if (!container) {
                        container = document.createElement('div');
                        container.id = `log-container-${safeIp}`;
                        container.className = 'host-log-container';
                        
                        // Adicionar cabeçalho com o IP do host
                        const header = document.createElement('div');
                        header.className = 'host-log-header';
                        header.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M8 21h8"></path>
                                <path d="M12 17v4"></path>
                            </svg>
                            <span>Host: ${ip}</span>
                        `;
                        container.appendChild(header);
                        
                        // Procurar um lugar adequado para inserir o container
                        const outputElement = document.querySelector('.ansible-output.visible') || 
                                             document.querySelector('.ansible-output');
                        if (outputElement) {
                            outputElement.appendChild(container);
                        }
                    }
                    
                    // Atualizar o conteúdo
                    if (logContent) {
                        // Criar um elemento para o conteúdo do log
                        const logDiv = document.createElement('div');
                        logDiv.className = 'host-log-content';
                        logDiv.innerHTML = logContent;
                        container.appendChild(logDiv);
                    }
                } catch (error) {
                    console.error(`Erro ao injetar log para ${ip}:`, error);
                    // Tentar usar a função original em caso de erro
                    try {
                        return originalInjectLog(ip, logContent);
                    } catch (e) {
                        // Se ambos falharem, pelo menos registra o erro
                        console.error("Erro na função original injectLog:", e);
                    }
                }
            };
        }
    }
    
    /**
     * Sobrescreve a função de atualização de status para melhorar a exibição em tempo real
     */
    function enhanceStatusUpdates() {
        // Sobrescrever a função _updateExecutionStatus se existir
        if (typeof window._updateExecutionStatus === 'function') {
            const originalUpdateStatus = window._updateExecutionStatus;
            window._updateExecutionStatus = function(job_id, line, formatted_line) {
                try {
                    // Chamar a função original primeiro
                    originalUpdateStatus(job_id, line, formatted_line);
                    
                    // Verificar se está relacionado a um baseline
                    const card = document.querySelector(`.execution-card[data-job-id="${job_id}"]`) || 
                                document.querySelector(`.execution-card[data-jobid="${job_id}"]`);
                    
                    if (card) {
                        const playbookName = card.getAttribute('data-playbook-name') || '';
                        if (isBaselinePlaybook(playbookName)) {
                            // Armazenar a saída
                            if (!baselineOutputs[job_id]) {
                                baselineOutputs[job_id] = '';
                            }
                            
                            baselineOutputs[job_id] += line + '\n';
                            
                            // Extrai informações e atualiza o resumo
                            const info = extractBaselineInfo(baselineOutputs[job_id]);
                            updateBaselineSummary(card, info);
                            
                            // Atualiza a saída se estiver visível
                            const outputElement = card.querySelector('.ansible-output');
                            if (outputElement && 
                                (outputElement.classList.contains('visible') || 
                                 outputElement.style.display === 'block')) {
                                outputElement.innerHTML = formatBaselineOutput(baselineOutputs[job_id]);
                                
                                // Rolar para o final para ver as atualizações mais recentes
                                outputElement.scrollTop = outputElement.scrollHeight;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Erro ao processar atualização de status:", error);
                }
            };
        }
    }
    
    // Inicializar o módulo de correção
    function runInitialization() {
        console.log("Inicializando correções para baseline multi-host");
        
        // Adicionar estilos
        addStyles();
        
        // Corrigir problemas com multi-host
        fixMultiHostSelectors();
        
        // Melhorar atualizações em tempo real
        enhanceStatusUpdates();
        
        // Inicializar processamento de cards
        init();
        
        // Adicionar evento para garantir que banners de baseline sejam mostrados quando necessário
        document.addEventListener('click', function(event) {
            // Se um checkbox de host foi clicado
            if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') {
                const hostBanner = event.target.closest('.host-banner');
                if (hostBanner) {
                    const hostname = event.target.dataset.hostname;
                    if (hostname) {
                        // Verificar se alguma playbook de baseline está selecionada
                        let baselineSelected = false;
                        document.querySelectorAll('.playbook-item.selected').forEach(playbook => {
                            const playbookName = playbook.getAttribute('data-playbook-name') || '';
                            if (isBaselinePlaybook(playbookName)) {
                                baselineSelected = true;
                            }
                        });
                        
                        // Se um baseline está selecionado e o host está sendo selecionado
                        if (baselineSelected && event.target.checked) {
                            // Mostrar o banner de baseline após um curto atraso
                            setTimeout(() => {
                                ensureBaselineBannerVisible(hostname);
                            }, 300);
                        }
                    }
                }
            }
        });
        
        console.log("✅ Inicialização concluída para correções de baseline multi-host");
    }
    
    // Executar a inicialização quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInitialization);
    } else {
        runInitialization();
    }
})();