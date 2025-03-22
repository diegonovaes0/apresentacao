/**
 * baseline-multi-host-output-fix.js
 * Solução para o problema de saída de execução com múltiplos hosts
 */

(function() {
    console.log("Inicializando correção para saída de baseline com múltiplos hosts");
    
    // Armazenar funções originais
    const originalFunctions = {
        monitorPlaybookExecution: window.monitorPlaybookExecution,
        toggleOutput: window.toggleOutput,
        fetch: window.fetch,
        executeSelectedPlaybooks: window.executeSelectedPlaybooks
    };
    
    // Configurações
    const config = {
        baselineKeywords: ['baseline', 'configuracao-base'],
        debug: true
    };
    
    // Estado global
    const state = {
        jobs: new Map(),
        hostOutputs: new Map(),
        currentView: new Map()
    };
    
    /**
     * Função para logs de depuração
     */
    function debug(message) {
        if (config.debug) {
            console.log(`[BASELINE-FIX] ${message}`);
        }
    }
    
    /**
     * Verifica se uma playbook é do tipo baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const lowerName = name.toLowerCase();
        return config.baselineKeywords.some(keyword => lowerName.includes(keyword));
    }
    
    /**
     * Escapa caracteres HTML para evitar injeção de código
     */
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    /**
     * Extrai hosts de um card de execução
     */
    function extractHostsFromCard(card) {
        const hosts = [];
        
        // Método 1: Obter dos elementos de host-details
        const hostDetails = card.querySelectorAll('.host-details');
        hostDetails.forEach(detail => {
            const host = detail.getAttribute('data-host');
            if (host) hosts.push(host);
        });
        
        // Método 2: Obter do texto do card se método 1 falhar
        if (hosts.length === 0) {
            const hostLine = Array.from(card.querySelectorAll('p')).find(p => 
                p.textContent.includes('Hosts:'));
                
            if (hostLine) {
                const hostText = hostLine.textContent.split('Hosts:')[1].trim();
                const hostList = hostText.split(',').map(h => h.trim());
                hosts.push(...hostList);
            }
        }
        
        // Método 3: Tentar extrair do texto completo do card
        if (hosts.length === 0) {
            const cardText = card.textContent;
            const hostsMatch = cardText.match(/Hosts:\s*(.*?)(?:\n|$)/);
            if (hostsMatch && hostsMatch[1]) {
                const hostList = hostsMatch[1].split(',').map(h => h.trim());
                hosts.push(...hostList);
            }
        }
        
        return hosts;
    }
    
    /**
     * Sobrescreve a função de monitoramento de playbooks
     */
    window.monitorPlaybookExecution = function(jobId, card) {
        debug(`Iniciando monitoramento para job: ${jobId}`);
        
        // Extrair informações do card
        const playbookName = card.getAttribute('data-playbook-name') || '';
        const isBaseline = isBaselinePlaybook(playbookName);
        const hosts = extractHostsFromCard(card);
        const isMultiHost = hosts.length > 1;
        
        debug(`Job ${jobId}: ${playbookName}, baseline=${isBaseline}, hosts=${hosts.join(',')}`);
        
        // Registrar job no estado
        state.jobs.set(jobId, {
            id: jobId,
            playbookName,
            isBaseline, 
            isMultiHost,
            hosts,
            card,
            startTime: new Date()
        });
        
        // Para playbooks baseline com múltiplos hosts, usamos nossa implementação
        if (isBaseline && isMultiHost) {
            // Inicializar interface para multi-host
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv) {
                // Mostrar o output automaticamente
                outputDiv.style.display = 'block';
                
                // Atualizar o botão "Ver Mais"
                const toggleBtn = card.querySelector('.toggle-output-btn');
                if (toggleBtn) {
                    toggleBtn.innerHTML = `
                        Ver Menos
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    `;
                }
                
                // Inicializar o conteúdo do output com selector de hosts
                outputDiv.innerHTML = createMultiHostInterface(jobId, hosts);
                
                // Inicializar monitoramento
                monitorMultiHostJob(jobId);
            }
            
            return;
        }
        
        // Para outros casos, usar a função original
        return originalFunctions.monitorPlaybookExecution(jobId, card);
    };
    
    /**
     * Cria a interface de multi-host para selecionar qual host visualizar
     */
    function createMultiHostInterface(jobId, hosts) {
        let html = `
            <div class="multi-host-container" data-job-id="${jobId}">
                <div class="host-selector">
                    <span class="host-label">Selecionar host:</span>
                    <div class="host-buttons">
                        <button class="host-button active" data-host="combined">Todos os Hosts</button>
        `;
        
        // Adicionar botão para cada host
        for (const host of hosts) {
            html += `<button class="host-button" data-host="${host}">${host}</button>`;
        }
        
        html += `
                    </div>
                </div>
                <div class="host-outputs">
                    <div class="host-output active" data-host="combined">
                        <div class="loading-output">
                            <div class="spinner"></div>
                            <span>Carregando saída combinada...</span>
                        </div>
                    </div>
        `;
        
        // Criar container para cada host
        for (const host of hosts) {
            html += `
                <div class="host-output" data-host="${host}">
                    <div class="loading-output">
                        <div class="spinner"></div>
                        <span>Carregando saída para ${host}...</span>
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
            <style>
                .multi-host-container {
                    font-family: monospace;
                    margin-bottom: 10px;
                }
                
                .host-selector {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    background: #1e1e1e;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    border: 1px solid #333;
                }
                
                .host-label {
                    font-weight: 500;
                    color: #e5c07b;
                    margin-right: 8px;
                }
                
                .host-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }
                
                .host-button {
                    padding: 4px 10px;
                    background: #252526;
                    color: #ccc;
                    border: 1px solid #444;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .host-button:hover {
                    background: #2c2c2c;
                }
                
                .host-button.active {
                    background: #0e639c;
                    color: white;
                    border-color: #1177bb;
                }
                
                .host-outputs {
                    position: relative;
                }
                
                .host-output {
                    display: none;
                    padding: 12px;
                    background: #1e1e1e;
                    border-radius: 4px;
                    border: 1px solid #333;
                    white-space: pre-wrap;
                    font-size: 12px;
                    max-height: 600px;
                    overflow-y: auto;
                }
                
                .host-output.active {
                    display: block;
                }
                
                .loading-output {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 30px 0;
                    color: #888;
                }
                
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    border-top-color: #0e639c;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Estilos para saída formatada */
                .output-line {
                    line-height: 1.4;
                    color: #d4d4d4;
                }
                
                .play-line {
                    color: #569cd6;
                    font-weight: bold;
                    margin-top: 10px;
                    margin-bottom: 5px;
                }
                
                .task-line {
                    color: #9cdcfe;
                    font-weight: bold;
                    margin-top: 8px;
                }
                
                .ok-line {
                    color: #4ec9b0;
                }
                
                .changed-line {
                    color: #dcdcaa;
                }
                
                .failed-line {
                    color: #f14c4c;
                }
                
                .skipped-line {
                    color: #808080;
                }
                
                .recap-line {
                    color: #569cd6;
                    font-weight: bold;
                    margin-top: 10px;
                }
            </style>
        `;
        
        return html;
    }
    
    /**
     * Monitora um job com múltiplos hosts
     */
    function monitorMultiHostJob(jobId) {
        const job = state.jobs.get(jobId);
        if (!job) return;
        
        // Define qual host está sendo visualizado atualmente
        state.currentView.set(jobId, 'combined');
        
        // Inicializar o cache de saídas
        state.hostOutputs.set(jobId, {
            combined: '',
            byHost: {}
        });
        
        for (const host of job.hosts) {
            state.hostOutputs.get(jobId).byHost[host] = '';
        }
        
        // Buscar atualizações a cada intervalo
        const updateInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/status/${jobId}`);
                const data = await response.json();
                
                // Atualizar o progresso
                const card = job.card;
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${data.progress || 0}%`;
                }
                
                // Atualizar status
                const statusDiv = card.querySelector('.task-status');
                if (statusDiv) {
                    if (data.status === 'running') {
                        statusDiv.textContent = 'Em execução...';
                    } else if (data.status === 'completed') {
                        statusDiv.textContent = 'Concluído com sucesso';
                        statusDiv.className = 'task-status success';
                    } else if (data.status === 'failed') {
                        statusDiv.textContent = 'Falhou';
                        statusDiv.className = 'task-status failed';
                    } else if (data.status === 'cancelled') {
                        statusDiv.textContent = 'Cancelado';
                        statusDiv.className = 'task-status cancelled';
                    }
                }
                
                // Processar a saída
                if (data.output) {
                    processMultiHostOutput(jobId, data.output);
                }
                
                // Se o job terminou, parar o monitoramento
                if (data.status !== 'running') {
                    clearInterval(updateInterval);
                    
                    // Chamar a função de conclusão original
                    if (typeof window.handlePlaybookCompletion === 'function') {
                        window.handlePlaybookCompletion(data.status, card);
                    }
                }
            } catch (error) {
                console.error(`Erro ao atualizar job ${jobId}:`, error);
            }
        }, 3000);
        
        // Adicionar eventos de clique para os botões de host
        const container = job.card.querySelector('.multi-host-container');
        if (container) {
            container.querySelectorAll('.host-button').forEach(button => {
                button.addEventListener('click', () => {
                    const host = button.getAttribute('data-host');
                    switchHostView(jobId, host);
                });
            });
        }
    }
    
    /**
     * Processa a saída do Ansible para múltiplos hosts
     */
    function processMultiHostOutput(jobId, output) {
        const job = state.jobs.get(jobId);
        if (!job) return;
        
        // Atualizar a saída combinada
        const jobOutputs = state.hostOutputs.get(jobId);
        if (!jobOutputs) return;
        
        jobOutputs.combined = output;
        
        // Separar a saída por host
        const hostsOutput = separateOutputByHost(output, job.hosts);
        Object.assign(jobOutputs.byHost, hostsOutput);
        
        // Atualizar a interface
        updateOutputInterface(jobId);
    }
    
    /**
     * Separa a saída do Ansible por host
     */
    function separateOutputByHost(output, hosts) {
        const lines = output.split('\n');
        const hostOutputs = {};
        
        // Inicializar saídas por host
        for (const host of hosts) {
            hostOutputs[host] = [];
        }
        
        // Linhas compartilhadas que vão para todos os hosts
        const sharedLines = [];
        
        // Estado do parser
        let currentPlay = null;
        let currentTask = null;
        let currentHost = null;
        let isRecap = false;
        
        // Processar linha a linha
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Detectar PLAY
            if (line.match(/^PLAY\s*\[/)) {
                currentPlay = line;
                sharedLines.push(line);
                continue;
            }
            
            // Detectar TASK
            if (line.match(/^TASK\s*\[/)) {
                currentTask = line;
                sharedLines.push(line);
                currentHost = null;
                continue;
            }
            
            // Detectar PLAY RECAP
            if (line.includes('PLAY RECAP')) {
                isRecap = true;
                sharedLines.push(line);
                continue;
            }
            
            // Linhas de RECAP vão para shared
            if (isRecap) {
                sharedLines.push(line);
                continue;
            }
            
            // Detectar linhas específicas de host
            const hostLineMatch = line.match(/^(ok|changed|failed|skipping|skipped|unreachable):\s*\[(.*?)\]/);
            if (hostLineMatch) {
                const detectedHost = hostLineMatch[2];
                
                // Se o host está na nossa lista
                if (hosts.includes(detectedHost)) {
                    currentHost = detectedHost;
                    
                    // Garantir que a tarefa esteja incluída
                    if (currentTask && !hostOutputs[currentHost].includes(currentTask)) {
                        hostOutputs[currentHost].push(currentTask);
                    }
                    
                    // Adicionar a linha para o host específico
                    hostOutputs[currentHost].push(line);
                } else {
                    // Host não reconhecido, vai para shared
                    sharedLines.push(line);
                }
                
                continue;
            }
            
            // Linhas de detalhes após resultado específico de host
            if (currentHost && hosts.includes(currentHost)) {
                // Linhas indentadas ou detalhes
                if (line.startsWith('    ') || line.includes('=>') || line.match(/^\.\.\.$/)) {
                    hostOutputs[currentHost].push(line);
                    continue;
                }
            }
            
            // Outras linhas vão para shared
            sharedLines.push(line);
        }
        
        // Construir saída final por host
        const result = {};
        
        for (const host of hosts) {
            // Combinar shared + específico do host
            const hostLines = [...sharedLines];
            
            // Adicionar apenas as linhas específicas que ainda não estão incluídas
            hostOutputs[host].forEach(line => {
                if (!hostLines.includes(line)) {
                    hostLines.push(line);
                }
            });
            
            // Organizar as linhas na ordem correta
            hostLines.sort((a, b) => {
                // PLAY sempre primeiro
                if (a.match(/^PLAY\s*\[/) && !b.match(/^PLAY\s*\[/)) return -1;
                if (!a.match(/^PLAY\s*\[/) && b.match(/^PLAY\s*\[/)) return 1;
                
                // TASK depois
                if (a.match(/^TASK\s*\[/) && !b.match(/^TASK\s*\[/)) return -1;
                if (!a.match(/^TASK\s*\[/) && b.match(/^TASK\s*\[/)) return 1;
                
                // RECAP sempre no final
                if (a.includes('PLAY RECAP')) return 1;
                if (b.includes('PLAY RECAP')) return -1;
                
                // Manter outras linhas como estão
                return 0;
            });
            
            // Montar a saída final
            result[host] = hostLines.join('\n');
        }
        
        return result;
    }
    
    /**
     * Atualiza a interface com as saídas por host
     */
    function updateOutputInterface(jobId) {
        const job = state.jobs.get(jobId);
        if (!job) return;
        
        const jobOutputs = state.hostOutputs.get(jobId);
        if (!jobOutputs) return;
        
        const container = job.card.querySelector('.multi-host-container');
        if (!container) return;
        
        // Atualizar saída combinada
        const combinedOutput = container.querySelector(`.host-output[data-host="combined"]`);
        if (combinedOutput) {
            combinedOutput.innerHTML = formatOutput(jobOutputs.combined);
        }
        
        // Atualizar saídas por host
        for (const host of job.hosts) {
            const hostOutput = container.querySelector(`.host-output[data-host="${host}"]`);
            if (hostOutput && jobOutputs.byHost[host]) {
                hostOutput.innerHTML = formatOutput(jobOutputs.byHost[host]);
            }
        }
        
        // Verificar se precisamos rolar para o final
        const currentHostView = state.currentView.get(jobId) || 'combined';
        const activeOutput = container.querySelector(`.host-output[data-host="${currentHostView}"].active`);
        if (activeOutput) {
            activeOutput.scrollTop = activeOutput.scrollHeight;
        }
    }
    
    /**
     * Formata a saída do Ansible para HTML
     */
    function formatOutput(output) {
        if (!output) return '<div class="empty-output">Sem saída disponível</div>';
        
        const lines = output.split('\n');
        let formattedOutput = '';
        
        for (const line of lines) {
            if (!line.trim()) {
                formattedOutput += '<br>';
                continue;
            }
            
            // Formatar linha com base no conteúdo
            if (line.match(/^PLAY\s*\[/)) {
                formattedOutput += `<div class="play-line">${escapeHtml(line)}</div>`;
            } else if (line.match(/^TASK\s*\[/)) {
                formattedOutput += `<div class="task-line">${escapeHtml(line)}</div>`;
            } else if (line.match(/^ok:/)) {
                formattedOutput += `<div class="ok-line">${escapeHtml(line)}</div>`;
            } else if (line.match(/^changed:/)) {
                formattedOutput += `<div class="changed-line">${escapeHtml(line)}</div>`;
            } else if (line.match(/^failed:|^fatal:/)) {
                formattedOutput += `<div class="failed-line">${escapeHtml(line)}</div>`;
            } else if (line.match(/^skipping:|^skipped:/)) {
                formattedOutput += `<div class="skipped-line">${escapeHtml(line)}</div>`;
            } else if (line.includes('PLAY RECAP')) {
                formattedOutput += `<div class="recap-line">${escapeHtml(line)}</div>`;
            } else {
                formattedOutput += `<div class="output-line">${escapeHtml(line)}</div>`;
            }
        }
        
        return formattedOutput;
    }
    
    /**
     * Alterna a visualização entre hosts
     */
    function switchHostView(jobId, host) {
        const job = state.jobs.get(jobId);
        if (!job) return;
        
        // Atualizar o estado
        state.currentView.set(jobId, host);
        
        // Atualizar botões
        const container = job.card.querySelector('.multi-host-container');
        if (!container) return;
        
        // Atualizar botões
        container.querySelectorAll('.host-button').forEach(button => {
            const isActive = button.getAttribute('data-host') === host;
            button.classList.toggle('active', isActive);
        });
        
        // Atualizar saídas
        container.querySelectorAll('.host-output').forEach(output => {
            const isActive = output.getAttribute('data-host') === host;
            output.classList.toggle('active', isActive);
        });
    }
    
    /**
     * Sobrescreve a função toggleOutput para compatibilidade com múltiplos hosts
     */
    window.toggleOutput = function(button) {
        // Buscar o card de execução
        const card = button.closest('.execution-card');
        if (!card) return;
        
        // Buscar o jobId
        const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
        if (!jobId) return;
        
        // Verificar se é um job multi-host gerenciado por nós
        const job = state.jobs.get(jobId);
        
        // Buscar o elemento de saída
        const outputDiv = card.querySelector('.ansible-output');
        if (!outputDiv) return;
        
        // Alternar visibilidade
        const isVisible = outputDiv.style.display === 'block';
        outputDiv.style.display = isVisible ? 'none' : 'block';
        
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
        
        // Se estamos mostrando a saída e é um job multi-host gerenciado por nós
        if (!isVisible && job && job.isBaseline && job.isMultiHost) {
            // Verificar se já temos a interface multi-host
            if (!outputDiv.querySelector('.multi-host-container')) {
                // Criar a interface
                outputDiv.innerHTML = createMultiHostInterface(jobId, job.hosts);
                
                // Adicionar eventos
                const container = outputDiv.querySelector('.multi-host-container');
                if (container) {
                    container.querySelectorAll('.host-button').forEach(hostButton => {
                        hostButton.addEventListener('click', () => {
                            const host = hostButton.getAttribute('data-host');
                            switchHostView(jobId, host);
                        });
                    });
                }
                
                // Buscar a saída atual
                fetch(`/api/status/${jobId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.output) {
                            processMultiHostOutput(jobId, data.output);
                            
                            // Verificar se o job ainda está em execução
                            if (data.status === 'running') {
                                monitorMultiHostJob(jobId);
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao buscar saída para job ${jobId}:`, error);
                    });
            }
            
            return;
        }
        
        // Para outros casos, usar comportamento original
        if (!isVisible && !job) {
            // Buscar a saída atual pelo método original
            const originalToggle = originalFunctions.toggleOutput;
            if (originalToggle && originalToggle !== window.toggleOutput) {
                // Chamar a função original após atualizar a visibilidade
                originalToggle.call(window, button);
            }
        }
    };
    
    /**
     * Sobrescreve a função de execução para garantir o funcionamento com múltiplos hosts
     */
    window.executeSelectedPlaybooks = function() {
        debug('Interceptando execução de playbooks');
        
        // Verificar se alguma playbook selecionada é baseline
        let hasBaselinePlaybook = false;
        let selectedPlaybookNames = [];
        document.querySelectorAll('.playbook-item.selected').forEach(item => {
            const name = item.getAttribute('data-playbook-name');
            if (name) {
                selectedPlaybookNames.push(name);
                if (isBaselinePlaybook(name)) {
                    hasBaselinePlaybook = true;
                }
            }
        });
        
        // Verificar se temos múltiplos hosts selecionados e baseline
        if (hasBaselinePlaybook) {
            const selectedHosts = [];
            document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
                const checkBox = hostBanner.querySelector('input[type="checkbox"]');
                if (checkBox && checkBox.dataset.hostname) {
                    selectedHosts.push(checkBox.dataset.hostname);
                }
            });
            
            debug(`Executando baseline para ${selectedHosts.length} hosts: ${selectedHosts.join(', ')}`);
            
            // Se temos múltiplos hosts, precisamos interceptar o fetch
            if (selectedHosts.length > 1) {
                // Interceptar temporariamente a API de execução
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    // Verificar se é uma chamada para executar playbook
                    if (url === '/api/run' && options?.method === 'POST') {
                        try {
                            const data = JSON.parse(options.body);
                            
                            // Verificar se é baseline
                            if (isBaselinePlaybook(data.playbook)) {
                                debug(`Interceptando execução de baseline: ${data.playbook}`);
                                
                                // Garantir que temos extra_vars
                                if (!data.extra_vars) {
                                    data.extra_vars = {};
                                }
                                
                                // Adicionar variáveis para garantir funcionamento multi-host
                                data.extra_vars.multi_host = "true";
                                data.extra_vars.multi_host_execution = "enabled";
                                
                                // Atualizar o corpo da requisição
                                options.body = JSON.stringify(data);
                            }
                        } catch (error) {
                            console.error('Erro ao processar requisição:', error);
                        }
                    }
                    
                    // Prosseguir com a requisição original
                    return originalFetch.apply(this, arguments);
                };
                
                // Chamar a função original
                originalFunctions.executeSelectedPlaybooks();
                
                // Restaurar a função fetch original após um tempo
                setTimeout(() => {
                    window.fetch = originalFetch;
                }, 1000);
                
                return;
            }
        }
        
        // Para outros casos, usar a função original
        return originalFunctions.executeSelectedPlaybooks();
    };
    
    /**
     * Inicializa o script
     */
    function init() {
        debug('Inicializando correção para baseline multi-host');
        
        // Adicionar estilos globais
        const style = document.createElement('style');
        style.textContent = `
            .ansible-output {
                max-height: 700px !important;
                overflow-y: auto !important;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                border-top-color: #0e639c;
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
   
        // Observar cards de execução existentes
        document.querySelectorAll('.execution-card').forEach(card => {
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            if (!jobId) return;
            
            const playbookName = card.getAttribute('data-playbook-name') || '';
            if (!isBaselinePlaybook(playbookName)) return;
            
            const hosts = extractHostsFromCard(card);
            if (hosts.length <= 1) return;
            
            debug(`Encontrado card existente com job ${jobId}, playbook ${playbookName}, hosts: ${hosts.join(',')}`);
            
            // Registrar no estado
            state.jobs.set(jobId, {
                id: jobId,
                playbookName,
                isBaseline: true,
                isMultiHost: hosts.length > 1,
                hosts,
                card,
                startTime: new Date()
            });
            
            // Verificar se o output está visível
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv && outputDiv.style.display === 'block') {
                // Substituir a interface
                outputDiv.innerHTML = createMultiHostInterface(jobId, hosts);
                
                // Adicionar eventos
                const container = outputDiv.querySelector('.multi-host-container');
                if (container) {
                    container.querySelectorAll('.host-button').forEach(button => {
                        button.addEventListener('click', () => {
                            const host = button.getAttribute('data-host');
                            switchHostView(jobId, host);
                        });
                    });
                }
                
                // Buscar a saída atual
                fetch(`/api/status/${jobId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.output) {
                            processMultiHostOutput(jobId, data.output);
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao buscar saída para job ${jobId}:`, error);
                    });
            }
        });
        
        // Observar novos cards de execução
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                            const jobId = node.getAttribute('data-job-id') || node.dataset.jobId;
                            if (!jobId) return;
                            
                            const playbookName = node.getAttribute('data-playbook-name') || '';
                            if (!isBaselinePlaybook(playbookName)) return;
                            
                            const hosts = extractHostsFromCard(node);
                            if (hosts.length <= 1) return;
                            
                            debug(`Observado novo card com job ${jobId}, playbook ${playbookName}`);
                            
                            // Registrar no estado
                            state.jobs.set(jobId, {
                                id: jobId,
                                playbookName,
                                isBaseline: true,
                                isMultiHost: hosts.length > 1,
                                hosts,
                                card: node,
                                startTime: new Date()
                            });
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log('Correção para saída de baseline com múltiplos hosts inicializada com sucesso');
     }
     
     
     // Inicializar quando o DOM estiver carregado
     if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
     } else {
        init();
     }
     })();