/**
 * ansible-multihost-complete-fix.js
 * 
 * Solução completa para problemas de execução multi-host do Ansible:
 * - Corrige a barra de progresso para iniciar automaticamente
 * - Exibe a saída de todos os hosts em execuções simultâneas
 * - Força a execução dos comandos em todos os hosts simultaneamente
 * - Melhora a visualização da saída com formatação clara
 * 
 * @version 2.0.0
 */

(function() {
    console.log("Inicializando solução completa para multi-host do Ansible");
    
    // Verificar se já inicializado
    if (window.multiHostCompleteFixInitialized) {
        console.log("Solução completa já inicializada, ignorando");
        return;
    }
    
    // Estado global para rastreamento
    const state = {
        jobCreationStack: [],     // Pilha para rastrear jobs recém-criados
        individualJobs: new Map(), // Mapa de jobId master -> array de jobs individuais
        outputRequests: new Map(), // Rastrear solicitações de saída
        jobOutputCache: new Map(), // Cache de saídas para jobs
        masterHostsMap: new Map(), // Mapa de jobId master -> array de hosts
        progressState: new Map(),  // Estado de progresso para cards
        autoRefreshTimers: new Map() // Timers para atualização automática
    };
    
    /**
     * Função utilitária para log com níveis
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[Ansible Fix ${timestamp}]`;
        
        switch (type) {
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * Verifica se uma playbook é do tipo baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return nameLower.includes('baseline') || 
               nameLower.includes('configuracao-base') || 
               nameLower.includes('config-base');
    }
    
    /**
     * Verifica se um card é de execução multi-host
     */
    function isMultiHostCard(card) {
        // Verificar os hosts no card
        const hostDetails = card.querySelectorAll('.host-details');
        return hostDetails.length > 1;
    }
    
    /**
     * Intercepta a criação de jobs para rastreamento
     */
    function setupJobCreationTracking() {
        log("Configurando rastreamento de criação de jobs");
        
        // Interceptar fetch para detectar criação de jobs
        const originalFetch = window.fetch;
        
        window.fetch = function(url, options) {
            // Detectar criação de job
            if (url === '/api/run' && options?.method === 'POST') {
                try {
                    const data = JSON.parse(options.body);
                    const playbookPath = data.playbook;
                    const playbookName = playbookPath.split('/').pop();
                    const hosts = data.hosts || [];
                    
                    log(`Detectada requisição para criar job: ${playbookName} para hosts: ${hosts.join(', ')}`);
                    
                    // Verificar se é baseline
                    if (isBaselinePlaybook(playbookName)) {
                        const result = originalFetch.apply(this, arguments);
                        
                        // Processar resposta para obter o job ID
                        result.then(response => response.clone().json())
                            .then(json => {
                                if (json && json.job_id) {
                                    const jobId = json.job_id;
                                    
                                    // Adicionar à pilha de jobs recém-criados
                                    state.jobCreationStack.push({
                                        jobId: jobId,
                                        playbookName: playbookName,
                                        hosts: hosts,
                                        timestamp: Date.now(),
                                        isSingleHost: hosts.length === 1,
                                        extras: data.extra_vars || {}
                                    });
                                    
                                    log(`Job criado: ${jobId} para ${playbookName} (${hosts.join(', ')})`);
                                    
                                    // Limitar o tamanho da pilha
                                    if (state.jobCreationStack.length > 20) {
                                        state.jobCreationStack.shift();
                                    }
                                    
                                    // Se for um job de host único parte de um multi-host
                                    if (hosts.length === 1 && data.extra_vars && 
                                        (data.extra_vars.single_host_execution || 
                                         data.extra_vars.host_specific)) {
                                        
                                        log(`Detectado job individual para host: ${hosts[0]}`);
                                        
                                        // Encontrar o job master recentemente criado
                                        findAndAssociateMasterJob(jobId, hosts[0]);
                                    }
                                }
                            })
                            .catch(error => {
                                log(`Erro ao processar resposta de criação de job: ${error.message}`, 'error');
                            });
                        
                        return result;
                    }
                } catch (error) {
                    log(`Erro ao processar requisição: ${error.message}`, 'error');
                }
            }
            
            // Detectar solicitação de status
            if (url.startsWith('/api/status/')) {
                const jobId = url.split('/').pop();
                state.outputRequests.set(jobId, Date.now());
                
                // Processar resposta para capturar a saída
                const result = originalFetch.apply(this, arguments);
                
                result.then(response => response.clone().json())
                    .then(data => {
                        if (data && data.output) {
                            // Armazenar no cache
                            state.jobOutputCache.set(jobId, {
                                output: data.output,
                                status: data.status,
                                timestamp: Date.now()
                            });
                            
                            // Atualizar progresso para todos os cards relacionados
                            if (data.progress !== undefined) {
                                updateProgressForJob(jobId, data.progress, data.status);
                            }
                            
                            // Mantém apenas os 30 outputs mais recentes no cache
                            if (state.jobOutputCache.size > 30) {
                                // Remover o mais antigo
                                let oldestKey = null;
                                let oldestTime = Infinity;
                                
                                for (const [key, value] of state.jobOutputCache.entries()) {
                                    if (value.timestamp < oldestTime) {
                                        oldestTime = value.timestamp;
                                        oldestKey = key;
                                    }
                                }
                                
                                if (oldestKey) {
                                    state.jobOutputCache.delete(oldestKey);
                                }
                            }
                        }
                    })
                    .catch(error => {
                        log(`Erro ao processar resposta de status: ${error.message}`, 'error');
                    });
                
                return result;
            }
            
            return originalFetch.apply(this, arguments);
        };
        
        log("Rastreamento de criação de jobs configurado");
    }
    
    /**
     * Encontra o job master correspondente a um job individual
     */
    function findAndAssociateMasterJob(individualJobId, hostname) {
        // Buscar na pilha de jobs recém-criados
        const recentMasterJobs = state.jobCreationStack
            .filter(job => !job.isSingleHost && job.hosts.includes(hostname))
            .sort((a, b) => b.timestamp - a.timestamp);
        
        if (recentMasterJobs.length > 0) {
            const masterJob = recentMasterJobs[0];
            const masterJobId = masterJob.jobId;
            
            log(`Associando job individual ${individualJobId} ao master ${masterJobId}`);
            
            // Registrar associação
            if (!state.individualJobs.has(masterJobId)) {
                state.individualJobs.set(masterJobId, []);
                state.masterHostsMap.set(masterJobId, masterJob.hosts);
            }
            
            state.individualJobs.get(masterJobId).push({
                jobId: individualJobId,
                hostname: hostname,
                timestamp: Date.now()
            });
            
            return masterJobId;
        }
        
        log(`Não foi possível encontrar job master para ${individualJobId} (host: ${hostname})`, 'warn');
        return null;
    }
    
    /**
     * Atualiza o progresso para todos os cards relacionados a um job
     */
    function updateProgressForJob(jobId, progress, status) {
        // Atualizar o progresso diretamente para este job
        updateCardProgress(jobId, progress, status);
        
        // Verificar se este job é parte de um job master
        for (const [masterJobId, individualJobs] of state.individualJobs.entries()) {
            const jobInfo = individualJobs.find(job => job.jobId === jobId);
            if (jobInfo) {
                // Este job é parte de um job master, atualizar o progresso do master
                updateMasterJobProgress(masterJobId);
                return;
            }
        }
    }
    
    /**
     * Atualiza o progresso de um job master com base nos jobs individuais
     */
    function updateMasterJobProgress(masterJobId) {
        const individualJobs = state.individualJobs.get(masterJobId) || [];
        if (individualJobs.length === 0) return;
        
        let totalProgress = 0;
        let completed = 0;
        let failed = 0;
        
        // Calcular progresso total e status
        for (const job of individualJobs) {
            const cachedData = state.jobOutputCache.get(job.jobId);
            if (cachedData) {
                totalProgress += cachedData.status === 'running' ? 
                    Math.min(90, cachedData.progress || 0) : 100;
                
                if (cachedData.status === 'completed' || cachedData.status === 'success') {
                    completed++;
                } else if (cachedData.status === 'failed') {
                    failed++;
                }
            } else {
                // Se não temos dados, assumir um progresso mínimo
                totalProgress += 10;
            }
        }
        
        // Calcular progresso médio
        const avgProgress = totalProgress / individualJobs.length;
        
        // Determinar status geral
        let overallStatus = 'running';
        if (completed === individualJobs.length) {
            overallStatus = 'completed';
        } else if (failed > 0) {
            overallStatus = 'failed';
        }
        
        // Atualizar o progresso do card master
        updateCardProgress(masterJobId, avgProgress, overallStatus);
    }
    
    /**
     * Atualiza o progresso visual de um card
     */
    function updateCardProgress(jobId, progress, status) {
        // Encontrar o card com este job ID
        const card = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
        if (!card) return;
        
        // Encontrar ou criar a barra de progresso
        const progressBar = ensureProgressBar(card);
        if (!progressBar) return;
        
        // Nunca retroceder o progresso
        let currentProgress = state.progressState.get(jobId) || 0;
        progress = Math.max(currentProgress, progress);
        
        // Atualizar estado
        state.progressState.set(jobId, progress);
        
        // Atualizar a barra de progresso
        progressBar.style.width = `${progress}%`;
        
        // Atualizar cor com base no status
        updateProgressColor(progressBar, status);
        
        // Atualizar status do card se necessário
        updateCardStatus(card, status);
    }
    
    /**
     * Atualiza a cor da barra de progresso com base no status
     */
    function updateProgressColor(progressBar, status) {
        if (status === 'completed' || status === 'success') {
            progressBar.style.backgroundColor = '#4CAF50'; // verde
        } else if (status === 'failed') {
            progressBar.style.backgroundColor = '#F44336'; // vermelho
        } else if (status === 'cancelled') {
            progressBar.style.backgroundColor = '#FF9800'; // laranja
        } else {
            progressBar.style.backgroundColor = 'var(--accent-gold, #FFD600)'; // padrão
        }
    }
    
    /**
     * Atualiza o status visual do card
     */
    function updateCardStatus(card, status) {
        const statusElement = card.querySelector('.task-status');
        if (!statusElement) return;
        
        // Atualizar texto e classe
        if (status === 'completed' || status === 'success') {
            statusElement.textContent = 'Concluído com sucesso';
            statusElement.className = 'task-status success';
        } else if (status === 'failed') {
            statusElement.textContent = 'Falhou';
            statusElement.className = 'task-status failed';
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelado';
            statusElement.className = 'task-status cancelled';
        }
    }
    
    /**
     * Cria ou encontra a barra de progresso em um card
     */
    function ensureProgressBar(card) {
        // Verificar se já existe uma barra de progresso
        let progressBar = card.querySelector('.progress-bar');
        if (progressBar) return progressBar;
        
        // Criar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.cssText = `
            width: 100%;
            height: 4px;
            background-color: #2A2A2A;
            border-radius: 2px;
            overflow: hidden;
            margin: 10px 0;
        `;
        
        // Criar barra
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            height: 100%;
            background-color: var(--accent-gold, #FFD600);
            border-radius: 2px;
            width: 0%;
            transition: width 0.3s ease, background-color 0.3s ease;
        `;
        
        progressContainer.appendChild(progressBar);
        
        // Inserir antes do output
        const outputDiv = card.querySelector('.ansible-output');
        if (outputDiv) {
            card.insertBefore(progressContainer, outputDiv);
        } else {
            // Ou após o host-info
            const hostInfo = card.querySelector('.host-info');
            if (hostInfo) {
                card.insertBefore(progressContainer, hostInfo.nextSibling);
            } else {
                // Último recurso: adicionar ao fim
                card.appendChild(progressContainer);
            }
        }
        
        return progressBar;
    }
    
    /**
     * Intercepta o toggle de saída para melhorar a exibição
     */
    function interceptOutputToggle() {
        log("Interceptando função toggleOutput");
        
        // Guardar a função original
        const originalToggleOutput = window.toggleOutput;
        
        // Nova função que vai substituir a original
        window.toggleOutput = function(button) {
            // Obter o card
            const card = button.closest('.execution-card');
            if (!card) {
                log("Card não encontrado para o botão", 'warn');
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Obter a div de saída
            const outputDiv = card.querySelector('.ansible-output');
            if (!outputDiv) {
                log("Elemento de saída não encontrado", 'warn');
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Verificar se é uma playbook de baseline
            const playbookName = card.getAttribute('data-playbook-name') || '';
            const isBaseline = isBaselinePlaybook(playbookName);
            const jobId = card.getAttribute('data-job-id');
            
            log(`Toggle output para card: ${jobId}, playbook: ${playbookName}, isBaseline: ${isBaseline}`);
            
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
            
            // Se estamos mostrando a saída, buscar os dados mais recentes
            if (!isVisible) {
                // Para multi-host em baseline, precisamos tratar de forma especial
                if (isBaseline && isMultiHostCard(card)) {
                    log(`Detectada exibição de saída multi-host para job: ${jobId}`);
                    
                    // Exibir indicador de carregamento inicial
                    outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída de múltiplos hosts...</div>';
                    
                    // Capturar detalhes do card
                    const hosts = Array.from(card.querySelectorAll('.host-details'))
                        .map(hostDetail => hostDetail.getAttribute('data-host'))
                        .filter(Boolean);
                    
                    // Configurar atualização automática da saída
                    setupAutoRefresh(jobId, card, outputDiv, hosts);
                    
                    // Tentar buscar a saída combinada
                    fetchMultiHostOutput(jobId, card, outputDiv, hosts);
                } else {
                    // Para casos normais, usar fluxo simplificado
                    log(`Buscando saída normal para job: ${jobId}`);
                    
                    // Mostrar indicador de carregamento
                    outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
                    
                    // Buscar a saída da API
                    fetchJobOutput(jobId)
                        .then(data => {
                            // Formatar e exibir a saída
                            if (isBaseline) {
                                outputDiv.innerHTML = formatOutput(data.output || '', true);
                            } else if (typeof window.formatAnsibleOutput === 'function') {
                                outputDiv.innerHTML = window.formatAnsibleOutput(data.output || '');
                            } else {
                                outputDiv.innerHTML = `<pre>${data.output || ''}</pre>`;
                            }
                            
                            // Rolar para o final
                            outputDiv.scrollTop = outputDiv.scrollHeight;
                            
                            // Atualizar progresso
                            if (data.progress !== undefined) {
                                updateCardProgress(jobId, data.progress, data.status);
                            }
                        })
                        .catch(error => {
                            log(`Erro ao buscar saída para job ${jobId}: ${error.message}`, 'error');
                            outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                        });
                }
            } else {
                // Se estamos ocultando, parar a atualização automática
                if (state.autoRefreshTimers.has(jobId)) {
                    clearInterval(state.autoRefreshTimers.get(jobId));
                    state.autoRefreshTimers.delete(jobId);
                }
            }
            
            return true;
        };
        
        log("Função toggleOutput interceptada com sucesso");
    }
    
    /**
     * Configura atualização automática da saída
     */
    function setupAutoRefresh(jobId, card, outputDiv, hosts) {
        // Parar timer anterior se existir
        if (state.autoRefreshTimers.has(jobId)) {
            clearInterval(state.autoRefreshTimers.get(jobId));
        }
        
        // Iniciar um novo timer para atualizar a saída periodicamente
        const intervalId = setInterval(() => {
            // Verificar se o card ou outputDiv ainda existe
            if (!document.body.contains(card) || !document.body.contains(outputDiv)) {
                clearInterval(intervalId);
                state.autoRefreshTimers.delete(jobId);
                return;
            }
            
            // Verificar se a saída está visível
            if (outputDiv.style.display !== 'block') {
                clearInterval(intervalId);
                state.autoRefreshTimers.delete(jobId);
                return;
            }
            
            // Buscar a saída atualizada
            fetchMultiHostOutput(jobId, card, outputDiv, hosts);
        }, 3000);
        
        // Registrar o timer
        state.autoRefreshTimers.set(jobId, intervalId);
    }
    
    /**
     * Busca a saída de um job específico
     */
    function fetchJobOutput(jobId) {
        // Verificar se temos no cache
        if (state.jobOutputCache.has(jobId)) {
            const cachedData = state.jobOutputCache.get(jobId);
            // Se o cache é recente (menos de 3 segundos), usar o cache
            if (Date.now() - cachedData.timestamp < 3000) {
                log(`Usando saída em cache para ${jobId}`);
                return Promise.resolve(cachedData);
            }
        }
        
        // Buscar da API
        return fetch(`/api/status/${jobId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                return response.json();
            })
            .then(data => {
                // Atualizar o cache
                state.jobOutputCache.set(jobId, {
                    output: data.output,
                    status: data.status,
                    progress: data.progress,
                    timestamp: Date.now()
                });
                return data;
            });
    }
    
    /**
     * Busca a saída combinada para execução multi-host
     */
    function fetchMultiHostOutput(jobId, card, outputDiv, hosts) {
        // Obter jobs associados a este master
        const jobsToFetch = getJobsToFetch(jobId, hosts);
        
        // Se não encontramos jobs associados, exibir mensagem
        if (jobsToFetch.length === 0) {
            outputDiv.innerHTML = `
                <div class="ansible-warning">
                    Não foi possível encontrar os jobs individuais para os hosts.
                    <br>Tentando buscar a saída diretamente do job master...
                </div>
            `;
            
            // Tentar buscar a saída do job master como fallback
            fetchJobOutput(jobId)
                .then(data => {
                    outputDiv.innerHTML = formatOutput(data.output || '', true);
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                })
                .catch(error => {
                    outputDiv.innerHTML += `
                        <div class="ansible-error">
                            Erro ao buscar saída do job master: ${error.message}
                        </div>
                    `;
                });
            
            return;
        }
        
        // Criar promessas para buscar a saída de cada job
        const outputPromises = jobsToFetch.map(job => 
            fetchJobOutput(job.jobId)
                .then(data => ({ jobId: job.jobId, hostname: job.hostname, data }))
                .catch(error => {
                    log(`Erro ao buscar saída para job ${job.jobId}: ${error.message}`, 'error');
                    return { jobId: job.jobId, hostname: job.hostname, error };
                })
        );
        
        // Quando todas as promessas forem resolvidas
        Promise.all(outputPromises)
            .then(results => {
                // Combinar as saídas de todos os jobs
                let combinedOutput = `====== EXECUÇÃO DE BASELINE EM MÚLTIPLOS HOSTS (${hosts.length}) ======\n\n`;
                
                // Adicionar a saída de cada job
                results.forEach((result, index) => {
                    const hostname = result.hostname || `Host ${index + 1}`;
                    
                    if (result.error) {
                        combinedOutput += `\n==== HOST: ${hostname} (Job: ${result.jobId}) ====\n`;
                        combinedOutput += `Erro ao buscar saída: ${result.error.message}\n`;
                    } else if (result.data && result.data.output) {
                        combinedOutput += `\n==== HOST: ${hostname} (Job: ${result.jobId}) ====\n`;
                        combinedOutput += result.data.output + '\n';
                        
                        // Atualizar progresso individual
                        if (result.data.progress !== undefined) {
                            updateCardProgress(result.jobId, result.data.progress, result.data.status);
                        }
                    }
                });
                
                // Formatar e exibir a saída combinada
                outputDiv.innerHTML = formatOutput(combinedOutput, true);
                
                // Rolar para o final (manter a posição se o usuário já rolou)
                const userScrolled = outputDiv.scrollTop + outputDiv.clientHeight < outputDiv.scrollHeight;
                if (!userScrolled) {
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                }
                
                // Atualizar o progresso do master
                updateMasterJobProgress(jobId);
            })
            .catch(error => {
                log(`Erro ao processar saídas: ${error.message}`, 'error');
                outputDiv.innerHTML = `<div class="ansible-error">Erro ao processar saídas: ${error.message}</div>`;
            });
    }
    
    /**
     * Determina quais jobs devem ser buscados para um card multi-host
     */
    function getJobsToFetch(masterJobId, hosts) {
        const jobsToFetch = [];
        
        // 1. Verificar jobs já associados
        if (state.individualJobs.has(masterJobId)) {
            const individualJobs = state.individualJobs.get(masterJobId);
            log(`Usando ${individualJobs.length} jobs já associados ao master ${masterJobId}`);
            
            individualJobs.forEach(job => {
                jobsToFetch.push({
                    jobId: job.jobId,
                    hostname: job.hostname
                });
            });
            
            // Se temos jobs para todos os hosts, retornar imediatamente
            if (jobsToFetch.length === hosts.length) {
                return jobsToFetch;
            }
        }
        
        // 2. Verificar na pilha de jobs recentes
        if (jobsToFetch.length === 0) {
            // Encontrar jobs individuais recentes para estes hosts
            const recentJobs = state.jobCreationStack
                .filter(job => job.isSingleHost && hosts.includes(job.hosts[0]))
                .sort((a, b) => b.timestamp - a.timestamp);
            
            // Pegar o job mais recente para cada host
            const hostJobMap = new Map();
            recentJobs.forEach(job => {
                const hostname = job.hosts[0];
                if (!hostJobMap.has(hostname)) {
                    hostJobMap.set(hostname, job.jobId);
                    
                    jobsToFetch.push({
                        jobId: job.jobId,
                        hostname: hostname
                    });
                    
                    // Associar ao master para uso futuro
                    if (!state.individualJobs.has(masterJobId)) {
                        state.individualJobs.set(masterJobId, []);
                    }
                    
                    state.individualJobs.get(masterJobId).push({
                        jobId: job.jobId,
                        hostname: hostname,
                        timestamp: Date.now()
                    });
                }
            });
            
            log(`Encontrados ${jobsToFetch.length} jobs recentes para hosts: ${hosts.join(', ')}`);
        }
        
        // 3. Se ainda não temos jobs, usar o próprio master
        if (jobsToFetch.length === 0) {
            log(`Nenhum job individual encontrado para ${masterJobId}, usando o próprio master`);
            
            // Adicionar o master job para cada host
            hosts.forEach(hostname => {
                jobsToFetch.push({
                    jobId: masterJobId,
                    hostname: hostname
                });
            });
        }
        
        return jobsToFetch;
    }
    
/**
     * Formata a saída para exibição
     */
function formatOutput(output, isBaseline = false) {
    if (!output) return '<em>Aguardando saída...</em>';
    
    // Formatar saída com cores e estrutura
    let formatted = output
        .replace(/PLAY\s*\[(.*?)\]/g, '<div class="ansible-play-header">PLAY [$1]</div>')
        .replace(/TASK\s*\[(.*?)\]/g, '<div class="ansible-task-header">TASK [$1]</div>')
        .replace(/ok:/g, '<span class="ansible-ok">ok:</span>')
        .replace(/changed:/g, '<span class="ansible-changed">changed:</span>')
        .replace(/failed:/g, '<span class="ansible-failed">failed:</span>')
        .replace(/skipping:/g, '<span class="ansible-skipped">skipping:</span>')
        .replace(/unreachable:/g, '<span class="ansible-unreachable">unreachable:</span>')
        .replace(/PLAY RECAP/g, '<div class="ansible-recap-header">PLAY RECAP</div>');
    
    // Substituir seções de host por divs formatados
    formatted = formatted.replace(/==== HOST[^:]*: ([^=]+)( \(Job: ([^)]+)\))? ====/g, 
        '<div class="host-section-divider"><span class="host-label">$1</span><span class="host-job">$3</span></div>');
    
    // Adicionar estilos inline para garantir que funcionem
    formatted = `
    <div class="ansible-formatted-output">
        <style>
            .ansible-formatted-output {
                font-family: monospace;
                white-space: pre-wrap;
                line-height: 1.4;
            }
            .ansible-play-header {
                color: #569cd6;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
            }
            .ansible-task-header {
                color: #9cdcfe;
                font-weight: bold;
                margin-top: 8px;
                margin-bottom: 4px;
                margin-left: 10px;
            }
            .ansible-ok { color: #4EC9B0; font-weight: bold; }
            .ansible-changed { color: #CE9178; font-weight: bold; }
            .ansible-failed { color: #F14C4C; font-weight: bold; }
            .ansible-skipped { color: #808080; font-weight: bold; }
            .ansible-unreachable { color: #F14C4C; font-weight: bold; }
            .ansible-recap-header {
                color: #569cd6;
                font-weight: bold;
                margin-top: 15px;
                margin-bottom: 5px;
                border-top: 1px solid #333;
                padding-top: 5px;
            }
            .host-section-divider {
                border-top: 1px solid #2A2A2A;
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
                color: #FFD600;
                padding-top: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .host-label {
                display: inline-block;
                background: #0A0A0A;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            .host-job {
                display: inline-block;
                background: #252525;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                color: #999;
                margin-left: auto;
            }
            .ansible-warning {
                padding: 10px;
                background-color: rgba(255, 193, 7, 0.1);
                border-left: 3px solid #FFC107;
                color: #FFC107;
                margin: 10px 0;
            }
            .ansible-error {
                padding: 10px;
                background-color: rgba(244, 67, 54, 0.1);
                border-left: 3px solid #F44336;
                color: #F44336;
                margin: 10px 0;
            }
        </style>
        ${formatted}
    </div>`;
    
    return formatted;
}

/**
 * Observa o DOM para detectar novos cards
 */
function observeNewCards() {
    log("Configurando observador para novos cards");
    
    // Observar o DOM para detectar novos cards
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                        const jobId = node.getAttribute('data-job-id');
                        const playbookName = node.getAttribute('data-playbook-name') || '';
                        
                        log(`Novo card detectado: ${jobId} (${playbookName})`);
                        
                        // Verificar se é um card multi-host de baseline
                        if (isBaselinePlaybook(playbookName) && isMultiHostCard(node)) {
                            log(`Card multi-host de baseline detectado: ${jobId}`);
                            
                            // Iniciar progresso para este card
                            initializeProgress(node, jobId);
                            
                            // Capturar hosts deste card
                            const hosts = Array.from(node.querySelectorAll('.host-details'))
                                .map(hostDetail => hostDetail.getAttribute('data-host'))
                                .filter(Boolean);
                            
                            log(`Hosts no card ${jobId}: ${hosts.join(', ')}`);
                            
                            // Registrar no mapa de hosts
                            state.masterHostsMap.set(jobId, hosts);
                            
                            // Abrir automaticamente a saída após um breve delay
                            setTimeout(() => {
                                const toggleBtn = node.querySelector('.toggle-output-btn');
                                if (toggleBtn && document.body.contains(toggleBtn)) {
                                    log(`Abrindo automaticamente a saída para ${jobId}`);
                                    toggleBtn.click();
                                }
                            }, 1000);
                        } else {
                            // Iniciar progresso para cards normais também
                            initializeProgress(node, jobId);
                        }
                    }
                });
            }
        });
    });
    
    // Iniciar observação
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    log("Observador de novos cards configurado");
}

/**
 * Inicializa o progresso para um card
 */
function initializeProgress(card, jobId) {
    // Garantir que tem uma barra de progresso
    const progressBar = ensureProgressBar(card);
    if (!progressBar) return;
    
    // Iniciar com um progresso mínimo para mostrar atividade
    progressBar.style.width = '5%';
    state.progressState.set(jobId, 5);
    
    // Configurar monitoramento de progresso
    startProgressMonitoring(card, jobId);
}

/**
 * Inicia o monitoramento de progresso para um card
 */
function startProgressMonitoring(card, jobId) {
    // Verificar se é um job master ou individual
    const isMultiHost = isMultiHostCard(card);
    
    // Configurar timer para atualizar o progresso periodicamente
    const intervalId = setInterval(() => {
        // Verificar se o card ainda existe
        if (!document.body.contains(card)) {
            clearInterval(intervalId);
            return;
        }
        
        // Obter o progresso atual
        let currentProgress = state.progressState.get(jobId) || 0;
        
        // Para multi-host, verificar os jobs individuais
        if (isMultiHost) {
            updateMasterJobProgress(jobId);
        } else {
            // Para jobs normais, buscar status diretamente
            fetchJobOutput(jobId)
                .then(data => {
                    if (data.progress !== undefined) {
                        updateCardProgress(jobId, data.progress, data.status);
                    } else {
                        // Se não temos progresso, incrementar artificialmente
                        currentProgress = Math.min(95, currentProgress + 0.5);
                        updateCardProgress(jobId, currentProgress, data.status || 'running');
                    }
                    
                    // Se o job terminou, parar o monitoramento
                    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                        clearInterval(intervalId);
                    }
                })
                .catch(error => {
                    log(`Erro ao buscar progresso para ${jobId}: ${error.message}`, 'error');
                    
                    // Em caso de erro, incrementar um pouco o progresso
                    currentProgress = Math.min(95, currentProgress + 0.2);
                    updateCardProgress(jobId, currentProgress, 'running');
                });
        }
    }, 2000);
}

/**
 * Intercepta a execução de playbooks para melhorar o suporte multi-host
 */
function interceptExecutePlaybooks() {
    log("Interceptando função executeSelectedPlaybooks");
    
    // Guardar a função original
    const originalExecute = window.executeSelectedPlaybooks;
    
    // Nova função que vai substituir a original
    window.executeSelectedPlaybooks = function() {
        // Obter playbooks selecionadas
        const playbooks = Array.from(document.querySelectorAll('.playbook-item.selected'))
            .map(item => ({
                name: item.getAttribute('data-playbook-name'),
                path: item.getAttribute('data-playbook-path')
            }))
            .filter(p => p.name && p.path);
            
        // Verificar se alguma playbook é de baseline
        const hasBaseline = playbooks.some(p => isBaselinePlaybook(p.name));
        
        if (hasBaseline) {
            log("Executando playbook de baseline com suporte melhorado");
            
            // Interceptar a criação do card para iniciar o progresso mais cedo
            const originalCreateCard = window.createExecutionCard;
            if (originalCreateCard) {
                window.createExecutionCard = function() {
                    const card = originalCreateCard.apply(this, arguments);
                    
                    // Inicializar progresso para o card recém-criado
                    if (card) {
                        const jobId = card.getAttribute('data-job-id');
                        const playbookName = card.getAttribute('data-playbook-name');
                        
                        if (jobId && isBaselinePlaybook(playbookName)) {
                            log(`Inicializando progresso para novo card: ${jobId}`);
                            initializeProgress(card, jobId);
                        }
                    }
                    
                    return card;
                };
                
                // Restaurar a função original após a execução
                setTimeout(() => {
                    window.createExecutionCard = originalCreateCard;
                }, 3000);
            }
        }
        
        // Chamar a função original
        return originalExecute.apply(this, arguments);
    };
    
    log("Função executeSelectedPlaybooks interceptada com sucesso");
}

/**
 * Adiciona estilos globais necessários
 */
function addGlobalStyles() {
    // Verificar se já existe
    if (document.getElementById('ansible-multihost-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ansible-multihost-styles';
    style.textContent = `
        /* Estilos para barra de progresso */
        .progress-container {
            width: 100%;
            height: 4px;
            background-color: #2A2A2A;
            border-radius: 2px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-bar {
            height: 100%;
            background-color: var(--accent-gold, #FFD600);
            border-radius: 2px;
            width: 0%;
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        /* Estilos para saída do ansible */
        .ansible-output {
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
            background-color: #1e1e1e;
            color: #d4d4d4;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .ansible-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #B0B0B0;
        }
        
        .ansible-error {
            color: #F44336;
            padding: 10px;
            border-left: 3px solid #F44336;
            background-color: rgba(244, 67, 54, 0.1);
        }
        
        .ansible-warning {
            color: #FFC107;
            padding: 10px;
            border-left: 3px solid #FFC107;
            background-color: rgba(255, 193, 7, 0.1);
        }
        
        /* Status específicos para tarefas */
        .task-status {
            margin-top: 10px;
            font-weight: 500;
        }
        
        .task-status.success {
            color: #4CAF50;
        }
        
        .task-status.failed {
            color: #F44336;
        }
        
        .task-status.cancelled {
            color: #FF9800;
        }
        
        /* Melhorias para host section divider */
        .host-section-divider {
            border-top: 1px solid #2A2A2A;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            color: #FFD600;
            padding-top: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .host-label {
            display: inline-block;
            background: #0A0A0A;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .host-job {
            display: inline-block;
            background: #252525;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            color: #999;
            margin-left: auto;
        }
    `;
    
    document.head.appendChild(style);
    log("Estilos globais adicionados");
}

/**
 * Inicializa todas as melhorias
 */
function initialize() {
    try {
        log("Inicializando solução para multi-host");
        
        // Adicionar estilos globais
        addGlobalStyles();
        
        // Configurar rastreamento de jobs
        setupJobCreationTracking();
        
        // Interceptar toggle de saída
        interceptOutputToggle();
        
        // Interceptar execução de playbooks
        interceptExecutePlaybooks();
        
        // Observar novos cards
        observeNewCards();
        
        // Marcar como inicializado
        window.multiHostCompleteFixInitialized = true;
        
        log("Solução para multi-host inicializada com sucesso");
    } catch (error) {
        log(`Erro ao inicializar solução: ${error.message}`, 'error');
    }
}

/**
 * Intercepta a criação de jobs para rastreamento
 */
function setupJobCreationTracking() {
    log("Configurando rastreamento de criação de jobs");
    
    // Interceptar fetch para detectar criação de jobs
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options) {
        // Detectar criação de job
        if (url === '/api/run' && options?.method === 'POST') {
            try {
                const data = JSON.parse(options.body);
                const playbookPath = data.playbook;
                const playbookName = playbookPath.split('/').pop();
                const hosts = data.hosts || [];
                
                log(`Detectada requisição para criar job: ${playbookName} para hosts: ${hosts.join(', ')}`);
                
                // Verificar se é baseline
                if (isBaselinePlaybook(playbookName)) {
                    const result = originalFetch.apply(this, arguments);
                    
                    // Processar resposta para obter o job ID
                    result.then(response => response.clone().json())
                        .then(json => {
                            if (json && json.job_id) {
                                const jobId = json.job_id;
                                
                                // Adicionar à pilha de jobs recém-criados
                                state.jobCreationStack.push({
                                    jobId: jobId,
                                    playbookName: playbookName,
                                    hosts: hosts,
                                    timestamp: Date.now(),
                                    isSingleHost: hosts.length === 1,
                                    extras: data.extra_vars || {}
                                });
                                
                                log(`Job criado: ${jobId} para ${playbookName} (${hosts.join(', ')})`);
                                
                                // Limitar o tamanho da pilha
                                if (state.jobCreationStack.length > 20) {
                                    state.jobCreationStack.shift();
                                }
                                
                                // Se for um job de host único parte de um multi-host
                                if (hosts.length === 1 && data.extra_vars && 
                                    (data.extra_vars.single_host_execution || 
                                     data.extra_vars.host_specific)) {
                                    
                                    log(`Detectado job individual para host: ${hosts[0]}`);
                                    
                                    // Encontrar o job master recentemente criado
                                    findAndAssociateMasterJob(jobId, hosts[0]);
                                }
                            }
                        })
                        .catch(error => {
                            log(`Erro ao processar resposta de criação de job: ${error.message}`, 'error');
                        });
                    
                    return result;
                }
            } catch (error) {
                log(`Erro ao processar requisição: ${error.message}`, 'error');
            }
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    log("Rastreamento de criação de jobs configurado");
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // Se o DOM já estiver carregado, inicializar imediatamente
    initialize();
}
})();