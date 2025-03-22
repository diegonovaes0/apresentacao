/**
 * ansible-progress-multihost-fix.js
 * 
 * Correção para o problema da barra de progresso em execuções multi-host
 * Este script corrige o problema em que a barra de progresso não inicia 
 * quando múltiplos hosts são selecionados em playbooks do tipo baseline
 * 
 * @version 1.0.0
 */

(function() {
    console.log("Inicializando correção para barra de progresso em execuções multi-host");
    
    // Verificar se já inicializado
    if (window.progressMultiHostFixInitialized) {
        console.log("Correção para progresso multi-host já inicializada, ignorando");
        return;
    }
    
    // Referência para funções originais que precisaremos
    let originalCreateExecutionCard = null;
    let originalMonitorPlaybookExecution = null;
    
    // Estado para rastrear execuções multi-host
    const multiHostState = {
        jobs: new Map(),     // Mapa de jobId -> informações do job
        hostJobs: new Map(),  // Mapa de jobId-hostname -> jobId principal
        progressTimers: new Map() // Armazenar timers de atualização de progresso
    };
    
    /**
     * Função utilitária para log
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[Progress Fix ${timestamp}]`;
        
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
     * Corrige a criação do card de execução para garantir que a barra de progresso seja adicionada
     */
    function fixExecutionCardCreation() {
        // Guardar a função original se ainda não foi interceptada
        if (!originalCreateExecutionCard && typeof window.createExecutionCard === 'function') {
            originalCreateExecutionCard = window.createExecutionCard;
            
            // Substituir pela versão melhorada
            window.createExecutionCard = function(playbookName, hosts, jobId) {
                const card = originalCreateExecutionCard.apply(this, arguments);
                
                // Verificar se é um card para baseline e múltiplos hosts
                const isBaseline = isBaselinePlaybook(playbookName);
                const isMultiHost = hosts && (hosts.length > 1 || hosts.size > 1);
                
                if (isBaseline && isMultiHost) {
                    log(`Configurando card para baseline multi-host: ${jobId}`);
                    
                    // Registrar o job como multi-host
                    const hostsList = Array.isArray(hosts) ? hosts : Array.from(hosts);
                    multiHostState.jobs.set(jobId, {
                        playbookName,
                        hosts: hostsList,
                        status: 'running',
                        progress: 0,
                        individualJobs: []
                    });
                    
                    // Garantir que existe uma barra de progresso
                    ensureProgressBar(card);
                    
                    // Iniciar o monitoramento imediatamente
                    startProgressMonitoring(jobId, card);
                }
                
                return card;
            };
            
            log("Criação de card de execução corrigida");
        }
    }
    
    /**
     * Corrige o monitoramento da execução da playbook
     */
    function fixPlaybookMonitoring() {
        // Guardar a função original se ainda não foi interceptada
        if (!originalMonitorPlaybookExecution && typeof window.monitorPlaybookExecution === 'function') {
            originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
            
            // Substituir pela versão melhorada
            window.monitorPlaybookExecution = function(jobId, card) {
                // Verificar se é um job multi-host que já está sendo monitorado
                if (multiHostState.jobs.has(jobId)) {
                    log(`Job multi-host ${jobId} já está sendo monitorado`);
                    return;
                }
                
                // Para outros casos, chamar a função original
                return originalMonitorPlaybookExecution.apply(this, arguments);
            };
            
            log("Monitoramento de execução corrigido");
        }
    }
    
    /**
     * Interceptar a função executeSelectedPlaybooks para monitorar a criação de jobs multi-host
     */
    function fixExecuteSelectedPlaybooks() {
        // Verificar se a função existe e ainda não foi interceptada
        const originalFnName = 'executeSelectedPlaybooks';
        const originalFnPropName = `${originalFnName}Original_progressFix`;
        
        if (typeof window[originalFnPropName] === 'undefined' && 
            typeof window[originalFnName] === 'function') {
            
            // Guardar a função original
            window[originalFnPropName] = window[originalFnName];
            
            // Substituir pela versão melhorada
            window[originalFnName] = function() {
                log("Interceptando execução para monitorar criação de jobs multi-host");
                
                // Identificar se estamos lidando com baseline multi-host
                const selectedPlaybooks = getSelectedPlaybooks();
                const selectedHosts = getSelectedHosts();
                
                // Se temos baseline e múltiplos hosts, registrar o monitoramento especial
                if (selectedPlaybooks.some(pb => isBaselinePlaybook(pb.name)) && selectedHosts.length > 1) {
                    log(`Detectado baseline com ${selectedHosts.length} hosts`);
                    
                    // Monitorar a criação de jobs relacionados
                    setupJobCreationMonitoring();
                }
                
                // Chamar a função original
                const result = window[originalFnPropName].apply(this, arguments);
                
                return result;
            };
            
            log(`Função ${originalFnName} corrigida para monitorar criação de jobs multi-host`);
        }
    }
    
    /**
     * Monitorar a criação de jobs para baseline multi-host
     */
    function setupJobCreationMonitoring() {
        // Interceptar temporariamente o fetch para capturar as criações de jobs
        const originalFetch = window.fetch;
        
        window.fetch = function(url, options) {
            // Detectar criação de job
            if (url === '/api/run' && options?.method === 'POST') {
                try {
                    const data = JSON.parse(options.body);
                    const playbookPath = data.playbook;
                    const playbookName = playbookPath.split('/').pop();
                    
                    // Verificar se é baseline para um único host (parte de multi-host)
                    if (isBaselinePlaybook(playbookName) && 
                        data.hosts && data.hosts.length === 1 &&
                        data.extra_vars?.single_host_execution) {
                        
                        const hostname = data.hosts[0];
                        log(`Detectado job de host individual: ${hostname} (parte de execução multi-host)`);
                        
                        // Após a chamada, capturar o ID do job criado
                        const fetchPromise = originalFetch.apply(this, arguments);
                        
                        fetchPromise.then(response => response.json())
                            .then(result => {
                                const individualJobId = result.job_id;
                                log(`Job individual criado para host ${hostname}: ${individualJobId}`);
                                
                                // Encontrar o job multi-host pai mais recente
                                const masterJobs = Array.from(multiHostState.jobs.entries())
                                    .filter(([_, job]) => job.status === 'running')
                                    .sort((a, b) => b[1].createdAt - a[1].createdAt);
                                
                                if (masterJobs.length > 0) {
                                    const [masterJobId, masterJob] = masterJobs[0];
                                    
                                    // Adicionar este job individual ao master
                                    masterJob.individualJobs.push({
                                        jobId: individualJobId,
                                        hostname,
                                        status: 'running',
                                        progress: 0
                                    });
                                    
                                    // Mapear para facilitar consultas futuras
                                    multiHostState.hostJobs.set(`${individualJobId}-${hostname}`, masterJobId);
                                    
                                    log(`Job individual ${individualJobId} associado ao master ${masterJobId}`);
                                    
                                    // Iniciar monitoramento para este job individual
                                    startIndividualJobMonitoring(individualJobId, hostname, masterJobId);
                                }
                            })
                            .catch(error => {
                                log(`Erro ao processar resposta de criação de job: ${error.message}`, 'error');
                            });
                        
                        return fetchPromise;
                    }
                } catch (error) {
                    log(`Erro ao processar requisição: ${error.message}`, 'error');
                }
            }
            
            // Para qualquer outro caso, prosseguir com a requisição original
            return originalFetch.apply(this, arguments);
        };
        
        // Restaurar o fetch original após um tempo
        setTimeout(() => {
            if (window.fetch !== originalFetch) {
                window.fetch = originalFetch;
                log("Fetch original restaurado após monitoramento de criação de jobs");
            }
        }, 10000);
    }
    
    /**
     * Monitorar um job individual que faz parte de uma execução multi-host
     */
    function startIndividualJobMonitoring(jobId, hostname, masterJobId) {
        // Verificar se o job master existe
        const masterJob = multiHostState.jobs.get(masterJobId);
        if (!masterJob) {
            log(`Job master ${masterJobId} não encontrado`, 'warn');
            return;
        }
        
        // Configurar intervalo para monitorar este job individual
        const intervalId = setInterval(() => {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Encontrar o job individual no array do master
                    const individualJob = masterJob.individualJobs.find(job => job.jobId === jobId);
                    if (!individualJob) return;
                    
                    // Atualizar progresso e status
                    individualJob.progress = data.progress || 0;
                    individualJob.status = data.status;
                    
                    // Atualizar progresso do master baseado nos jobs individuais
                    updateMasterProgress(masterJobId);
                    
                    // Se o job individual terminou, verificar se todos terminaram
                    if (data.status !== 'running') {
                        // Limpar o intervalo para este job
                        clearInterval(intervalId);
                        
                        // Verificar se todos os jobs individuais terminaram
                        checkAllJobsCompleted(masterJobId);
                    }
                })
                .catch(error => {
                    log(`Erro ao monitorar job individual ${jobId}: ${error.message}`, 'error');
                    
                    // Em caso de erros repetidos, parar o monitoramento
                    clearInterval(intervalId);
                });
        }, 2000);
    }
    
    /**
     * Atualizar o progresso do job master com base nos jobs individuais
     */
    function updateMasterProgress(masterJobId) {
        const masterJob = multiHostState.jobs.get(masterJobId);
        if (!masterJob || masterJob.individualJobs.length === 0) return;
        
        // Calcular progresso médio dos jobs individuais
        const totalProgress = masterJob.individualJobs.reduce((sum, job) => sum + job.progress, 0);
        const avgProgress = totalProgress / masterJob.individualJobs.length;
        
        // Atualizar progresso do job master
        masterJob.progress = Math.max(masterJob.progress, avgProgress);
        
        // Atualizar a barra de progresso visual
        const card = document.querySelector(`.execution-card[data-job-id="${masterJobId}"]`);
        if (card) {
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${masterJob.progress}%`;
                
                // Atualizar cor com base no status
                if (masterJob.status === 'completed' || masterJob.status === 'success') {
                    progressBar.style.backgroundColor = '#4CAF50'; // verde
                } else if (masterJob.status === 'failed') {
                    progressBar.style.backgroundColor = '#F44336'; // vermelho
                } else if (masterJob.status === 'cancelled') {
                    progressBar.style.backgroundColor = '#FF9800'; // laranja
                }
            }
        }
    }
    
    /**
     * Verificar se todos os jobs individuais foram concluídos
     */
    function checkAllJobsCompleted(masterJobId) {
        const masterJob = multiHostState.jobs.get(masterJobId);
        if (!masterJob) return;
        
        // Verificar se todos os jobs individuais terminaram
        const allCompleted = masterJob.individualJobs.every(job => 
            job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled');
        
        if (allCompleted) {
            log(`Todos os jobs individuais para ${masterJobId} foram concluídos`);
            
            // Determinar o status final com base nos jobs individuais
            const hasFailure = masterJob.individualJobs.some(job => job.status === 'failed');
            const hasCancelled = masterJob.individualJobs.some(job => job.status === 'cancelled');
            
            if (hasFailure) {
                masterJob.status = 'failed';
            } else if (hasCancelled) {
                masterJob.status = 'cancelled';
            } else {
                masterJob.status = 'completed';
            }
            
            // Atualizar o card para o status final
            const card = document.querySelector(`.execution-card[data-job-id="${masterJobId}"]`);
            if (card) {
                // Atualizar status visual
                const statusElement = card.querySelector('.task-status');
                if (statusElement) {
                    if (masterJob.status === 'completed') {
                        statusElement.textContent = 'Concluído com sucesso';
                        statusElement.className = 'task-status success';
                    } else if (masterJob.status === 'failed') {
                        statusElement.textContent = 'Falhou';
                        statusElement.className = 'task-status failed';
                    } else if (masterJob.status === 'cancelled') {
                        statusElement.textContent = 'Cancelado';
                        statusElement.className = 'task-status cancelled';
                    }
                }
                
                // Completar a barra de progresso
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    
                    if (masterJob.status === 'completed') {
                        progressBar.style.backgroundColor = '#4CAF50'; // verde
                    } else if (masterJob.status === 'failed') {
                        progressBar.style.backgroundColor = '#F44336'; // vermelho
                    } else if (masterJob.status === 'cancelled') {
                        progressBar.style.backgroundColor = '#FF9800'; // laranja
                    }
                }
            }
            
            // Parar o monitoramento para este master job
            if (multiHostState.progressTimers.has(masterJobId)) {
                clearInterval(multiHostState.progressTimers.get(masterJobId));
                multiHostState.progressTimers.delete(masterJobId);
            }
        }
    }
    
    /**
     * Garantir que a barra de progresso existe no card
     */
    function ensureProgressBar(card) {
        // Verificar se já existe uma barra de progresso
        let progressBar = card.querySelector('.progress-bar');
        if (progressBar) return progressBar;
        
        // Criar container para a barra de progresso
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
        
        // Criar a barra de progresso
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
        
        // Inserir no local apropriado
        const hostInfo = card.querySelector('.host-info');
        if (hostInfo) {
            card.insertBefore(progressContainer, hostInfo.nextSibling);
        } else {
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv) {
                card.insertBefore(progressContainer, outputDiv);
            } else {
                // Último recurso: adicionar ao final do card
                card.appendChild(progressContainer);
            }
        }
        
        return progressBar;
    }
    
    /**
     * Iniciar monitoramento do progresso para um job master
     */
    function startProgressMonitoring(jobId, card) {
        // Se já existe um timer para este job, não criar outro
        if (multiHostState.progressTimers.has(jobId)) return;
        
        // Criar timer para atualizar o progresso regularmente
        const intervalId = setInterval(() => {
            const masterJob = multiHostState.jobs.get(jobId);
            if (!masterJob) {
                clearInterval(intervalId);
                return;
            }
            
            // Se não tem jobs individuais ainda, avançar progressivamente
            if (masterJob.individualJobs.length === 0) {
                // Progresso artificial até os jobs individuais serem criados
                masterJob.progress = Math.min(30, masterJob.progress + 1);
                
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${masterJob.progress}%`;
                }
            } else {
                // Atualizar com base nos jobs individuais
                updateMasterProgress(jobId);
            }
            
            // Se o job master já foi concluído, parar o monitoramento
            if (masterJob.status !== 'running') {
                clearInterval(intervalId);
                multiHostState.progressTimers.delete(jobId);
            }
        }, 500);
        
        // Registrar o timer
        multiHostState.progressTimers.set(jobId, intervalId);
    }
    
    /**
     * Obter todas as playbooks selecionadas
     */
    function getSelectedPlaybooks() {
        const playbooks = [];
        document.querySelectorAll('.playbook-item.selected').forEach(item => {
            const name = item.getAttribute('data-playbook-name');
            if (name) {
                playbooks.push({
                    name: name,
                    element: item
                });
            }
        });
        return playbooks;
    }
    
    /**
     * Obter todos os hosts selecionados
     */
    function getSelectedHosts() {
        const hosts = [];
        document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.dataset.hostname) {
                hosts.push(checkbox.dataset.hostname);
            }
        });
        return hosts;
    }
    
    /**
     * Inicializar todas as correções
     */
    function initialize() {
        try {
            log("Inicializando correção para barra de progresso em execuções multi-host");
            
            // Aplicar correções
            fixExecutionCardCreation();
            fixPlaybookMonitoring();
            fixExecuteSelectedPlaybooks();
            
            // Marcar como inicializado
            window.progressMultiHostFixInitialized = true;
            
            log("✅ Correção para barra de progresso em execuções multi-host aplicada com sucesso");
        } catch (error) {
            log(`❌ Erro ao inicializar correção: ${error.message}`, 'error');
        }
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Se o DOM já estiver carregado, inicializar imediatamente
        initialize();
    }
})();