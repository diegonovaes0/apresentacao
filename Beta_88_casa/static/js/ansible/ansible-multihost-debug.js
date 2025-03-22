/**
 * ansible-multihost-debug.js
 * 
 * Versão com diagnóstico avançado para identificar problemas com execução multi-host
 * Inclui logs detalhados e mecanismos alternativos para capturar jobs
 * 
 * @version 1.1.0
 */

(function() {
    console.log("Inicializando versão de diagnóstico para multi-host do Ansible");
    
    // Verificar se já inicializado
    if (window.multiHostDebugInitialized) {
        console.log("Diagnóstico multi-host já inicializado, ignorando");
        return;
    }
    
    // Estado global para rastreamento
    const state = {
        jobCreationStack: [],     // Pilha para rastrear jobs recém-criados
        individualJobs: new Map(), // Mapa de jobId master -> array de jobs individuais
        outputRequests: new Map(), // Rastrear solicitações de saída
        jobOutputCache: new Map(), // Cache de saídas para jobs
        masterHostsMap: new Map()  // Mapa de jobId master -> array de hosts
    };
    
    /**
     * Função utilitária para log com níveis
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[Debug ${timestamp}]`;
        
        switch (type) {
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'debug':
                console.log(`%c${prefix} ${message}`, 'color: #2196F3');
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
        log(`Card possui ${hostDetails.length} hosts`, 'debug');
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
                    
                    log(`Detectada requisição para criar job: ${playbookName} para hosts: ${hosts.join(', ')}`, 'debug');
                    
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
                                    
                                    log(`Job criado: ${jobId} para ${playbookName} (${hosts.join(', ')})`, 'debug');
                                    
                                    // Limitar o tamanho da pilha
                                    if (state.jobCreationStack.length > 20) {
                                        state.jobCreationStack.shift();
                                    }
                                    
                                    // Se for um job de host único parte de um multi-host
                                    if (hosts.length === 1 && data.extra_vars && 
                                        (data.extra_vars.single_host_execution || 
                                         data.extra_vars.host_specific)) {
                                        
                                        log(`Detectado job individual para host: ${hosts[0]}`, 'debug');
                                        
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
            
            log(`Associando job individual ${individualJobId} ao master ${masterJobId}`, 'debug');
            
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
     * Busca a saída combinada para execução multi-host
     */
    function fetchMultiHostOutput(masterJobId, card, outputDiv) {
        // Mostrar indicador de carregamento
        outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída de múltiplos hosts...</div>';
        
        // Obter todos os hosts do card
        const hosts = Array.from(card.querySelectorAll('.host-details'))
            .map(hostDetail => hostDetail.getAttribute('data-host'))
            .filter(Boolean);
        
        log(`Buscando saída para card ${masterJobId} com ${hosts.length} hosts: ${hosts.join(', ')}`, 'debug');
        
        // Registrar o mapa de hosts para este master job se ainda não estiver registrado
        if (!state.masterHostsMap.has(masterJobId)) {
            state.masterHostsMap.set(masterJobId, hosts);
        }
        
        // Buscar jobs associados a este master
        const jobsToFetch = getJobsToFetch(masterJobId, hosts);
        log(`Encontrados ${jobsToFetch.length} jobs para buscar: ${JSON.stringify(jobsToFetch)}`, 'debug');
        
        // Se não encontramos jobs associados, exibir informações de diagnóstico
        if (jobsToFetch.length === 0) {
            // Exibir diagnóstico
            outputDiv.innerHTML = createDiagnosticOutput(masterJobId, hosts);
            return;
        }
        
        // Criar promessas para buscar a saída de cada job
        const outputPromises = jobsToFetch.map(job => 
            fetchJobOutput(job.jobId, job.hostname)
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
                    }
                });
                
                // Formatar e exibir a saída combinada
                outputDiv.innerHTML = formatOutput(combinedOutput, true);
                
                // Rolar para o final
                outputDiv.scrollTop = outputDiv.scrollHeight;
            })
            .catch(error => {
                log(`Erro ao processar saídas: ${error.message}`, 'error');
                outputDiv.innerHTML = `<div class="ansible-error">Erro ao processar saídas: ${error.message}</div>`;
            });
    }
    
    /**
     * Busca a saída de um job específico
     */
    function fetchJobOutput(jobId, hostname) {
        // Verificar se temos no cache
        if (state.jobOutputCache.has(jobId)) {
            const cachedData = state.jobOutputCache.get(jobId);
            // Se o cache é recente (menos de 5 segundos), usar o cache
            if (Date.now() - cachedData.timestamp < 5000) {
                log(`Usando saída em cache para ${jobId}`, 'debug');
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
                    timestamp: Date.now()
                });
                return data;
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
            log(`Usando ${individualJobs.length} jobs já associados ao master ${masterJobId}`, 'debug');
            
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
            
            log(`Encontrados ${jobsToFetch.length} jobs recentes para hosts: ${hosts.join(', ')}`, 'debug');
        }
        
        // 3. Se ainda não temos jobs, usar o próprio master
        if (jobsToFetch.length === 0) {
            log(`Nenhum job individual encontrado para ${masterJobId}, usando o próprio master`, 'debug');
            
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
     * Cria saída de diagnóstico quando não conseguimos encontrar jobs
     */
    function createDiagnosticOutput(masterJobId, hosts) {
        let output = `<div class="ansible-diagnostic">
            <h3>Diagnóstico de Saída Multi-Host</h3>
            <p>Não foi possível encontrar jobs relacionados para exibir a saída.</p>
            
            <h4>Informações do Card:</h4>
            <ul>
                <li><strong>Job Master:</strong> ${masterJobId}</li>
                <li><strong>Hosts (${hosts.length}):</strong> ${hosts.join(', ')}</li>
            </ul>
            
            <h4>Jobs Recentemente Criados:</h4>
            <div class="code-block">`;
        
        // Exibir jobs recentes (mais recentes primeiro)
        const recentJobs = [...state.jobCreationStack].reverse();
        if (recentJobs.length === 0) {
            output += '<p>Nenhum job recente registrado</p>';
        } else {
            output += '<table border="1" style="border-collapse: collapse;">';
            output += '<tr><th>Job ID</th><th>Playbook</th><th>Hosts</th><th>Timestamp</th><th>Single Host</th></tr>';
            
            recentJobs.forEach(job => {
                const date = new Date(job.timestamp);
                const timeStr = date.toISOString().split('T')[1].split('.')[0];
                
                output += `<tr>
                    <td>${job.jobId}</td>
                    <td>${job.playbookName}</td>
                    <td>${job.hosts.join(', ')}</td>
                    <td>${timeStr}</td>
                    <td>${job.isSingleHost ? 'Sim' : 'Não'}</td>
                </tr>`;
            });
            
            output += '</table>';
        }
        
        output += `</div>
            
            <h4>Estado de Associações:</h4>
            <div class="code-block">`;
        
        // Exibir associações entre master e jobs individuais
        if (state.individualJobs.size === 0) {
            output += '<p>Nenhuma associação entre jobs registrada</p>';
        } else {
            output += '<table border="1" style="border-collapse: collapse;">';
            output += '<tr><th>Master Job</th><th>Jobs Individuais</th></tr>';
            
            for (const [masterId, individualJobs] of state.individualJobs.entries()) {
                const jobsList = individualJobs.map(job => 
                    `${job.jobId} (${job.hostname})`
                ).join('<br>');
                
                output += `<tr>
                    <td>${masterId}</td>
                    <td>${jobsList}</td>
                </tr>`;
            }
            
            output += '</table>';
        }
        
        output += `</div>
            
            <h4>Requisições de Output Recentes:</h4>
            <div class="code-block">`;
        
        // Exibir requisições recentes de output
        const recentOutputRequests = Array.from(state.outputRequests.entries())
            .sort((a, b) => b[1] - a[1]) // Mais recentes primeiro
            .slice(0, 10);
        
        if (recentOutputRequests.length === 0) {
            output += '<p>Nenhuma requisição de output registrada</p>';
        } else {
            output += '<table border="1" style="border-collapse: collapse;">';
            output += '<tr><th>Job ID</th><th>Timestamp</th></tr>';
            
            recentOutputRequests.forEach(([jobId, timestamp]) => {
                const date = new Date(timestamp);
                const timeStr = date.toISOString().split('T')[1].split('.')[0];
                
                output += `<tr>
                    <td>${jobId}</td>
                    <td>${timeStr}</td>
                </tr>`;
            });
            
            output += '</table>';
        }
        
        output += `</div>
            
            <h4>Cache de Output:</h4>
            <div class="code-block">`;
        
        // Exibir cache de output
        const cachedOutputs = Array.from(state.jobOutputCache.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp) // Mais recentes primeiro
            .slice(0, 5);
        
        if (cachedOutputs.length === 0) {
            output += '<p>Nenhum output em cache</p>';
        } else {
            output += '<table border="1" style="border-collapse: collapse;">';
            output += '<tr><th>Job ID</th><th>Status</th><th>Timestamp</th><th>Tamanho</th></tr>';
            
            cachedOutputs.forEach(([jobId, data]) => {
                const date = new Date(data.timestamp);
                const timeStr = date.toISOString().split('T')[1].split('.')[0];
                const outputSize = data.output ? data.output.length : 0;
                
                output += `<tr>
                    <td>${jobId}</td>
                    <td>${data.status || 'N/A'}</td>
                    <td>${timeStr}</td>
                    <td>${outputSize} bytes</td>
                </tr>`;
            });
            
            output += '</table>';
        }
        
        output += `</div>
            
            <div class="master-output-section">
                <h4>Tentando buscar saída do master job...</h4>
                <div id="master-output-${masterJobId}" class="master-output">
                    <p>Carregando saída do job master...</p>
                </div>
            </div>
        </div>`;
        
        // Buscar a saída do job master em segundo plano
        setTimeout(() => {
            fetchJobOutput(masterJobId)
                .then(data => {
                    const masterOutputDiv = document.getElementById(`master-output-${masterJobId}`);
                    if (masterOutputDiv) {
                        if (data.output) {
                            masterOutputDiv.innerHTML = `
                                <div style="margin-top: 10px; padding: 10px; background: #1e1e1e; max-height: 300px; overflow: auto;">
                                    <pre style="margin: 0; white-space: pre-wrap; color: #ddd;">${data.output}</pre>
                                </div>`;
                        } else {
                            masterOutputDiv.innerHTML = `<p>Nenhuma saída disponível para o job master</p>`;
                        }
                    }
                })
                .catch(error => {
                    const masterOutputDiv = document.getElementById(`master-output-${masterJobId}`);
                    if (masterOutputDiv) {
                        masterOutputDiv.innerHTML = `<p>Erro ao buscar saída do job master: ${error.message}</p>`;
                    }
                });
        }, 500);
        
        // Adicionar estilos
        output += `
        <style>
            .ansible-diagnostic {
                font-family: system-ui, -apple-system, sans-serif;
                padding: 15px;
                background: #2a2a2a;
                color: #eee;
                border-radius: 5px;
            }
            .ansible-diagnostic h3 {
                color: #ff9800;
                margin-top: 0;
            }
            .ansible-diagnostic h4 {
                color: #2196f3;
                margin-top: 20px;
                margin-bottom: 10px;
                border-bottom: 1px solid #444;
                padding-bottom: 5px;
            }
            .ansible-diagnostic .code-block {
                background: #1e1e1e;
                padding: 10px;
                border-radius: 4px;
                overflow: auto;
                max-height: 200px;
            }
            .ansible-diagnostic table {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
                font-size: 12px;
            }
            .ansible-diagnostic th, .ansible-diagnostic td {
                padding: 6px 8px;
                text-align: left;
                border: 1px solid #444;
            }
            .ansible-diagnostic th {
                background: #333;
            }
            .ansible-diagnostic ul {
                margin-top: 8px;
                margin-bottom: 8px;
            }
            .master-output-section {
                margin-top: 20px;
            }
        </style>
        `;
        
        return output;
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
            </style>
            ${formatted}
        </div>`;
        
        return formatted;
    }
    
    /**
     * Intercepta o toggle de saída
     */
    function interceptOutputToggle() {
        log("Interceptando função toggleOutput", 'debug');
        
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
               log(`Detectada exibição de saída multi-host para job: ${jobId}`, 'debug');
               
               // Exibir indicador de carregamento inicial
               outputDiv.innerHTML = '<div class="ansible-loading">Analisando jobs e preparando saída...</div>';
               
               // Capturar detalhes do card
               const hosts = Array.from(card.querySelectorAll('.host-details'))
                   .map(hostDetail => hostDetail.getAttribute('data-host'))
                   .filter(Boolean);
               
               log(`Card possui ${hosts.length} hosts: ${hosts.join(', ')}`, 'debug');
               log(`Estado atual do rastreamento de jobs:`, 'debug');
               log(`- Job Creation Stack: ${state.jobCreationStack.length} jobs`, 'debug');
               log(`- Individual Jobs Map: ${state.individualJobs.size} master jobs`, 'debug');
               
               // Tentar buscar a saída combinada
               fetchMultiHostOutput(jobId, card, outputDiv);
           } else {
               // Para casos normais, usar fluxo simplificado
               log(`Buscando saída normal para job: ${jobId}`, 'debug');
               
               // Mostrar indicador de carregamento
               outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
               
               // Buscar a saída da API
               fetch(`/api/status/${jobId}`)
                   .then(response => {
                       if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                       return response.json();
                   })
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
                       
                       // Armazenar no cache
                       state.jobOutputCache.set(jobId, {
                           output: data.output,
                           status: data.status,
                           timestamp: Date.now()
                       });
                   })
                   .catch(error => {
                       log(`Erro ao buscar saída para job ${jobId}: ${error.message}`, 'error');
                       outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                   });
           }
       }
       
       return true;
   };
   
   log("Função toggleOutput interceptada com sucesso");
}

/**
* Adiciona observador de mutação para detectar novos cards
*/
function observeNewCards() {
   log("Configurando observador para novos cards", 'debug');
   
   // Observar o DOM para detectar novos cards
   const observer = new MutationObserver((mutations) => {
       mutations.forEach((mutation) => {
           if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
               mutation.addedNodes.forEach((node) => {
                   if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                       const jobId = node.getAttribute('data-job-id');
                       const playbookName = node.getAttribute('data-playbook-name') || '';
                       
                       log(`Novo card detectado: ${jobId} (${playbookName})`, 'debug');
                       
                       // Verificar se é um card multi-host de baseline
                       if (isBaselinePlaybook(playbookName) && isMultiHostCard(node)) {
                           log(`Card multi-host de baseline detectado: ${jobId}`, 'debug');
                           
                           // Capturar hosts deste card
                           const hosts = Array.from(node.querySelectorAll('.host-details'))
                               .map(hostDetail => hostDetail.getAttribute('data-host'))
                               .filter(Boolean);
                           
                           log(`Hosts no card ${jobId}: ${hosts.join(', ')}`, 'debug');
                           
                           // Registrar no mapa de hosts
                           state.masterHostsMap.set(jobId, hosts);
                           
                           // Abrir automaticamente a saída após um breve delay
                           setTimeout(() => {
                               const toggleBtn = node.querySelector('.toggle-output-btn');
                               if (toggleBtn) {
                                   log(`Abrindo automaticamente a saída para ${jobId}`, 'debug');
                                   toggleBtn.click();
                               }
                           }, 1000);
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
* Adiciona um controle de diagnóstico ao DOM
*/
function addDiagnosticControl() {
   // Verificar se já existe
   if (document.getElementById('ansible-debug-control')) return;
   
   // Criar o controle
   const control = document.createElement('div');
   control.id = 'ansible-debug-control';
   control.className = 'ansible-debug-control';
   control.innerHTML = `
       <div class="debug-header">Diagnóstico Ansible</div>
       <div class="debug-content">
           <button id="debug-show-state">Ver Estado Interno</button>
           <button id="debug-fix-barra">Forçar Barra de Progresso</button>
           <button id="debug-reload-fix">Recarregar Fix</button>
       </div>
   `;
   
   // Adicionar estilos
   const style = document.createElement('style');
   style.textContent = `
       .ansible-debug-control {
           position: fixed;
           bottom: 20px;
           right: 20px;
           background: #2a2a2a;
           border: 1px solid #444;
           border-radius: 5px;
           color: #eee;
           font-family: system-ui, -apple-system, sans-serif;
           font-size: 12px;
           z-index: 9999;
           box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
           overflow: hidden;
           transition: all 0.3s ease;
           opacity: 0.7;
       }
       
       .ansible-debug-control:hover {
           opacity: 1;
       }
       
       .debug-header {
           background: #FFD600;
           color: #000;
           padding: 5px 10px;
           font-weight: bold;
           cursor: pointer;
       }
       
       .debug-content {
           padding: 10px;
           display: flex;
           flex-direction: column;
           gap: 5px;
       }
       
       .debug-content button {
           background: #444;
           border: none;
           border-radius: 3px;
           color: #fff;
           padding: 5px 10px;
           cursor: pointer;
           font-size: 11px;
       }
       
       .debug-content button:hover {
           background: #555;
       }
       
       .debug-modal {
           position: fixed;
           top: 0;
           left: 0;
           right: 0;
           bottom: 0;
           background: rgba(0, 0, 0, 0.8);
           z-index: 10000;
           display: flex;
           align-items: center;
           justify-content: center;
       }
       
       .debug-modal-content {
           background: #2a2a2a;
           border-radius: 5px;
           color: #eee;
           width: 80%;
           max-width: 1000px;
           max-height: 80vh;
           overflow: auto;
           padding: 20px;
       }
       
       .debug-modal-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 20px;
       }
       
       .debug-modal-header h2 {
           margin: 0;
           color: #FFD600;
       }
       
       .debug-modal-close {
           background: #444;
           border: none;
           border-radius: 50%;
           color: #fff;
           width: 30px;
           height: 30px;
           display: flex;
           align-items: center;
           justify-content: center;
           cursor: pointer;
           font-size: 16px;
       }
   `;
   
   document.head.appendChild(style);
   document.body.appendChild(control);
   
   // Configurar eventos
   document.getElementById('debug-show-state').addEventListener('click', showDebugState);
   document.getElementById('debug-fix-barra').addEventListener('click', forceProgressBars);
   document.getElementById('debug-reload-fix').addEventListener('click', reloadFix);
   
   log("Controle de diagnóstico adicionado");
}

/**
* Exibe o estado interno em um modal
*/
function showDebugState() {
   // Criar o modal
   const modal = document.createElement('div');
   modal.className = 'debug-modal';
   
   // Criar o conteúdo do modal
   const content = document.createElement('div');
   content.className = 'debug-modal-content';
   
   // Cabeçalho
   content.innerHTML = `
       <div class="debug-modal-header">
           <h2>Estado Interno do Ansible Debug</h2>
           <button class="debug-modal-close">✕</button>
       </div>
       
       <h3>Job Creation Stack (${state.jobCreationStack.length})</h3>
       <div class="debug-section">
           <pre>${JSON.stringify(state.jobCreationStack, null, 2)}</pre>
       </div>
       
       <h3>Individual Jobs (${state.individualJobs.size})</h3>
       <div class="debug-section">
           <pre>${JSON.stringify(Array.from(state.individualJobs.entries()), null, 2)}</pre>
       </div>
       
       <h3>Master Hosts Map (${state.masterHostsMap.size})</h3>
       <div class="debug-section">
           <pre>${JSON.stringify(Array.from(state.masterHostsMap.entries()), null, 2)}</pre>
       </div>
       
       <h3>Output Requests (${state.outputRequests.size})</h3>
       <div class="debug-section">
           <pre>${JSON.stringify(Array.from(state.outputRequests.entries()).slice(0, 20), null, 2)}</pre>
       </div>
       
       <h3>Cards Ativos</h3>
       <div class="debug-section">
           <pre>${JSON.stringify(getActiveCardsInfo(), null, 2)}</pre>
       </div>
   `;
   
   // Adicionar ao modal
   modal.appendChild(content);
   document.body.appendChild(modal);
   
   // Configurar evento de fechamento
   modal.querySelector('.debug-modal-close').addEventListener('click', () => {
       modal.remove();
   });
}

/**
* Força a exibição de barras de progresso em todos os cards
*/
function forceProgressBars() {
   const cards = document.querySelectorAll('.execution-card');
   log(`Forçando barras de progresso em ${cards.length} cards`, 'debug');
   
   cards.forEach(card => {
       const jobId = card.getAttribute('data-job-id');
       const progressContainer = card.querySelector('.progress-container');
       
       if (!progressContainer) {
           // Criar container
           const newProgressContainer = document.createElement('div');
           newProgressContainer.className = 'progress-container';
           newProgressContainer.style.cssText = `
               width: 100%;
               height: 4px;
               background-color: #2A2A2A;
               border-radius: 2px;
               overflow: hidden;
               margin: 10px 0;
           `;
           
           // Criar barra
           const progressBar = document.createElement('div');
           progressBar.className = 'progress-bar';
           progressBar.style.cssText = `
               height: 100%;
               background-color: var(--accent-gold, #FFD600);
               border-radius: 2px;
               width: 50%;
               transition: width 0.3s ease, background-color 0.3s ease;
           `;
           
           newProgressContainer.appendChild(progressBar);
           
           // Inserir antes do output
           const outputDiv = card.querySelector('.ansible-output');
           if (outputDiv) {
               card.insertBefore(newProgressContainer, outputDiv);
           } else {
               // Ou após o host-info
               const hostInfo = card.querySelector('.host-info');
               if (hostInfo) {
                   card.insertBefore(newProgressContainer, hostInfo.nextSibling);
               } else {
                   // Último recurso: adicionar ao fim
                   card.appendChild(newProgressContainer);
               }
           }
           
           log(`Barra de progresso criada para ${jobId}`, 'debug');
       } else {
           // Atualizar barra existente
           const progressBar = progressContainer.querySelector('.progress-bar');
           if (progressBar) {
               progressBar.style.width = '50%';
               log(`Barra de progresso atualizada para ${jobId}`, 'debug');
           }
       }
   });
}

/**
* Recarrega o fix (recarrega a página)
*/
function reloadFix() {
   log("Recarregando fix (recarregando página)...", 'debug');
   
   // Armazenar informações de diagnóstico antes de recarregar
   try {
       sessionStorage.setItem('ansible_debug_data', JSON.stringify({
           jobCreationStack: state.jobCreationStack,
           individualJobs: Array.from(state.individualJobs.entries()),
           masterHostsMap: Array.from(state.masterHostsMap.entries()),
           timestamp: Date.now()
       }));
   } catch (e) {
       log(`Erro ao armazenar dados de diagnóstico: ${e.message}`, 'error');
   }
   
   // Recarregar a página
   window.location.reload();
}

/**
* Obtém informações sobre os cards ativos
*/
function getActiveCardsInfo() {
   const cards = document.querySelectorAll('.execution-card');
   return Array.from(cards).map(card => {
       return {
           jobId: card.getAttribute('data-job-id'),
           playbookName: card.getAttribute('data-playbook-name'),
           hosts: Array.from(card.querySelectorAll('.host-details'))
               .map(hostDetail => hostDetail.getAttribute('data-host'))
               .filter(Boolean),
           hasProgressBar: !!card.querySelector('.progress-bar'),
           progressValue: card.querySelector('.progress-bar')?.style.width || '0%',
           outputVisible: card.querySelector('.ansible-output')?.style.display === 'block'
       };
   });
}

/**
* Inicializa o diagnóstico
*/
function initialize() {
   try {
       log("Inicializando diagnóstico", 'debug');
       
       // Configurar rastreamento de jobs
       setupJobCreationTracking();
       
       // Interceptar toggle de saída
       interceptOutputToggle();
       
       // Observar novos cards
       observeNewCards();
       
       // Adicionar controle de diagnóstico
       addDiagnosticControl();
       
       // Recuperar dados anteriores se existirem
       try {
           const savedData = sessionStorage.getItem('ansible_debug_data');
           if (savedData) {
               const data = JSON.parse(savedData);
               log(`Recuperando dados de diagnóstico anteriores (timestamp: ${new Date(data.timestamp).toISOString()})`, 'debug');
               
               // Restaurar dados se forem recentes (menos de 1 minuto)
               if (Date.now() - data.timestamp < 60000) {
                   state.jobCreationStack = data.jobCreationStack || [];
                   
                   if (data.individualJobs) {
                       state.individualJobs = new Map(data.individualJobs);
                   }
                   
                   if (data.masterHostsMap) {
                       state.masterHostsMap = new Map(data.masterHostsMap);
                   }
                   
                   log("Dados de diagnóstico restaurados", 'debug');
               } else {
                   log("Dados de diagnóstico antigos, ignorando", 'debug');
               }
               
               // Limpar dados salvos
               sessionStorage.removeItem('ansible_debug_data');
           }
       } catch (e) {
           log(`Erro ao recuperar dados de diagnóstico: ${e.message}`, 'error');
       }
       
       // Marcar como inicializado
       window.multiHostDebugInitialized = true;
       
       log("Diagnóstico inicializado com sucesso", 'debug');
   } catch (error) {
       log(`Erro ao inicializar diagnóstico: ${error.message}`, 'error');
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
