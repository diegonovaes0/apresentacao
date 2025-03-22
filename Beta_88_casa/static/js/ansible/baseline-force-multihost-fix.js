/**
 * baseline-multi-host-renderer.js
 * 
 * Solução focada exclusivamente na renderização de múltiplos hosts na saída de baseline
 * Versão 1.2.0
 */

(function() {
    console.log("Iniciando renderizador específico para múltiplos hosts no baseline...");
    
    // Verificar se já aplicado
    if (window.baselineMultiHostRendererApplied) {
        console.log("Renderizador para múltiplos hosts já aplicado");
        return;
    }

    // Constantes e configurações
    const POLLING_INTERVAL = 2000; // Intervalo para verificar atualizações
    
    // Armazenamento dos jobs de hosts individuais
    const state = {
        baselineJobs: new Map(),  // Map de jobId do card -> array de jobs de hosts individuais
        jobOutputs: new Map(),    // Cache de saídas dos jobs
        currentRefreshers: new Map() // Gerenciadores de atualização ativos
    };

    // Função auxiliar para log
    function log(message, type = 'info') {
        const timestamp = new Date().toTimeString().split(' ')[0];
        console.log(`[Baseline Renderer ${timestamp}] [${type}] ${message}`);
    }

    // Função para criar diretamente jobs individuais para cada host
    function createHostJobs(masterJobId, hostnames, playbookPath) {
        log(`Criando jobs individuais para ${hostnames.length} hosts`);
        
        const hostJobs = [];
        
        // Para cada hostname, criar um job separado
        hostnames.forEach(hostname => {
            // Preparar payload para este host específico
            const payload = {
                playbook: playbookPath,
                hosts: [hostname],
                extra_vars: {
                    host_specific: true,
                    single_host_execution: true
                }
            };
            
            // Executar para este host (async)
            fetch('/api/run', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(result => {
                log(`Criado job individual para host ${hostname}: ${result.job_id}`);
                
                // Adicionar ao array de jobs
                hostJobs.push({
                    jobId: result.job_id,
                    hostname: hostname,
                    status: 'running'
                });
                
                // Atualizar o estado
                state.baselineJobs.set(masterJobId, hostJobs);
                
                // Iniciar monitoramento para este job específico
                monitorHostJob(result.job_id, hostname, masterJobId);
            })
            .catch(error => {
                log(`Erro ao criar job para host ${hostname}: ${error.message}`, 'error');
            });
        });
    }

    // Monitorar a execução de um job específico de host
    function monitorHostJob(jobId, hostname, masterJobId) {
        log(`Iniciando monitoramento para job ${jobId} (host: ${hostname})`);
        
        // Função para buscar e atualizar o status
        function updateStatus() {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Salvar a saída no cache
                    state.jobOutputs.set(jobId, {
                        output: data.output || '',
                        status: data.status || 'running',
                        timestamp: Date.now()
                    });
                    
                    // Atualizar o status do job no array
                    const hostJobs = state.baselineJobs.get(masterJobId) || [];
                    const jobIndex = hostJobs.findIndex(job => job.jobId === jobId);
                    
                    if (jobIndex >= 0) {
                        hostJobs[jobIndex].status = data.status || 'running';
                        state.baselineJobs.set(masterJobId, hostJobs);
                    }
                    
                    // Se o card estiver exibindo a saída, atualizar
                    const card = document.querySelector(`.execution-card[data-job-id="${masterJobId}"]`);
                    if (card) {
                        const outputDiv = card.querySelector('.ansible-output');
                        if (outputDiv && outputDiv.style.display === 'block') {
                            renderMultiHostOutput(masterJobId, outputDiv);
                        }
                    }
                    
                    // Continuar monitorando se ainda estiver em execução
                    if (data.status === 'running') {
                        setTimeout(updateStatus, POLLING_INTERVAL);
                    } else {
                        log(`Job ${jobId} (host: ${hostname}) finalizado com status: ${data.status}`);
                    }
                })
                .catch(error => {
                    log(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                    // Tentar novamente após um tempo
                    setTimeout(updateStatus, POLLING_INTERVAL * 2);
                });
        }
        
        // Iniciar o ciclo de atualização
        updateStatus();
    }

    // Verificar se uma playbook é do tipo baseline
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return nameLower.includes('baseline') || 
               nameLower.includes('configuracao-base') || 
               nameLower.includes('config-base');
    }

    // Função para substituir o método toggleOutput
    function replaceToggleOutput() {
        if (typeof window.toggleOutput !== 'function') {
            log('Função toggleOutput não encontrada!', 'error');
            return;
        }
        
        // Armazenar a função original
        const originalToggleOutput = window.toggleOutput;
        
        window.toggleOutput = function(button) {
            try {
                // Obter o card
                const card = button.closest('.execution-card');
                if (!card) {
                    throw new Error('Card não encontrado');
                }
                
                // Obter dados do card
                const playbookName = card.getAttribute('data-playbook-name') || '';
                const jobId = card.getAttribute('data-job-id');
                const isBaseline = isBaselinePlaybook(playbookName);
                
                log(`Toggle output para: ${playbookName} (${jobId}), isBaseline: ${isBaseline}`);
                
                // Se não for baseline, usar a função original
                if (!isBaseline) {
                    return originalToggleOutput.apply(this, arguments);
                }
                
                // Obter div de saída
                const outputDiv = card.querySelector('.ansible-output');
                if (!outputDiv) {
                    throw new Error('Elemento de saída não encontrado');
                }
                
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
                
                // Se estiver mostrando a saída, buscar os dados
                if (!isVisible) {
                    // Se já temos um refresher para este card, cancelá-lo
                    if (state.currentRefreshers.has(jobId)) {
                        clearInterval(state.currentRefreshers.get(jobId));
                    }
                    
                    // Mostrar indicador de carregamento
                    outputDiv.innerHTML = `
                        <div style="padding: 20px; text-align: center; font-family: monospace;">
                            <div class="spinner" style="display: inline-block; margin-right: 10px;"></div>
                            <span>Carregando dados de múltiplos hosts...</span>
                        </div>
                    `;
                    
                    // Iniciar fluxo de renderização de múltiplos hosts
                    initializeMultiHostRenderer(jobId, card, outputDiv);
                } else {
                    // Se estiver ocultando, parar as atualizações
                    if (state.currentRefreshers.has(jobId)) {
                        clearInterval(state.currentRefreshers.get(jobId));
                        state.currentRefreshers.delete(jobId);
                    }
                }
                
                return true;
            } catch (error) {
                log(`Erro em toggleOutput: ${error.message}`, 'error');
                return originalToggleOutput.apply(this, arguments);
            }
        };
        
        log('Função toggleOutput substituída com sucesso');
    }

    // Inicializar o renderizador de múltiplos hosts
    function initializeMultiHostRenderer(jobId, card, outputDiv) {
        log(`Inicializando renderizador para job ${jobId}`);
        
        // Função para atualizar a saída
        function updateOutput() {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const rawOutput = data.output || '';
                    
                    // Extrair informações sobre hosts
                    const hosts = extractHostsInfo(rawOutput);
                    log(`Encontrados ${hosts.length} hosts no output do job ${jobId}`);
                    
                    // Verificar se precisamos criar jobs individuais
                    if (hosts.length > 0 && !state.baselineJobs.has(jobId)) {
                        const hostnames = hosts.map(h => h.hostname);
                        const playbookPath = card.getAttribute('data-playbook-path') || 
                                            getPlaybookPathFromOutput(rawOutput);
                        
                        if (playbookPath) {
                            createHostJobs(jobId, hostnames, playbookPath);
                        }
                    }
                    
                    // Renderizar a saída
                    renderMultiHostOutput(jobId, outputDiv);
                    
                    // Se a execução terminou, parar de atualizar
                    if (data.status !== 'running') {
                        if (state.currentRefreshers.has(jobId)) {
                            clearInterval(state.currentRefreshers.get(jobId));
                            state.currentRefreshers.delete(jobId);
                        }
                    }
                })
                .catch(error => {
                    log(`Erro ao buscar dados: ${error.message}`, 'error');
                    outputDiv.innerHTML = `
                        <div style="color: #f44336; padding: 20px; font-family: monospace;">
                            Erro ao carregar saída: ${error.message}
                        </div>
                    `;
                });
        }
        
        // Primeira atualização imediata
        updateOutput();
        
        // Configurar atualizações periódicas
        const refresherId = setInterval(updateOutput, POLLING_INTERVAL);
        state.currentRefreshers.set(jobId, refresherId);
    }

    // Obter o caminho da playbook a partir da saída
    function getPlaybookPathFromOutput(output) {
        const match = output.match(/playbo(?:ok|ok:)\s*([^\n]+)/i);
        return match ? match[1].trim() : null;
    }

    // Extrair informações de hosts a partir da saída
    function extractHostsInfo(output) {
        const hosts = [];
        
        // Método 1: Padrão com asteriscos
        const hostPattern = /\*\*Hostname:\*\*\s*([^\n\*]+)(?:[\s\S]*?)\*\*IP Público:\*\*\s*([^\n\*]+)(?:[\s\S]*?)\*\*IP Privado:\*\*\s*([^\n\*]+)(?:[\s\S]*?)\*\*Sistema:\*\*\s*([^\n\*]+)/g;
        
        let match;
        while ((match = hostPattern.exec(output)) !== null) {
            hosts.push({
                hostname: match[1].trim(),
                publicIp: match[2].trim(),
                privateIp: match[3].trim(),
                system: match[4].trim()
            });
        }
        
        // Método 2: Padrão JSON
        if (hosts.length === 0) {
            const jsonPattern = /"host_details":\s*{\s*"hostname":\s*"([^"]+)",\s*"private_ip":\s*"([^"]+)",\s*"public_ip":\s*"([^"]+)",\s*"system":\s*"([^"]+)"/g;
            
            while ((match = jsonPattern.exec(output)) !== null) {
                hosts.push({
                    hostname: match[1],
                    privateIp: match[2],
                    publicIp: match[3],
                    system: match[4]
                });
            }
        }
        
        // Método 3: Formato de resumo
        if (hosts.length === 0) {
            const hostnameMatches = output.match(/Hostname:\s*([^\n]+)/g) || [];
            const publicIpMatches = output.match(/IP Público:\s*([^\n]+)/g) || [];
            const privateIpMatches = output.match(/IP Privado:\s*([^\n]+)/g) || [];
            const systemMatches = output.match(/Sistema:\s*([^\n]+)/g) || [];
            
            for (let i = 0; i < hostnameMatches.length; i++) {
                const hostname = hostnameMatches[i].replace(/Hostname:\s*/, '').trim();
                const publicIp = i < publicIpMatches.length ? 
                    publicIpMatches[i].replace(/IP Público:\s*/, '').trim() : 'N/A';
                const privateIp = i < privateIpMatches.length ? 
                    privateIpMatches[i].replace(/IP Privado:\s*/, '').trim() : 'N/A';
                const system = i < systemMatches.length ? 
                    systemMatches[i].replace(/Sistema:\s*/, '').trim() : 'N/A';
                
                hosts.push({ hostname, publicIp, privateIp, system });
            }
        }
        
        // Método 4: Pesquisa de hosts por IPs
        if (hosts.length === 0) {
            // Extrair IPs
            const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;
            const ips = [];
            while ((match = ipRegex.exec(output)) !== null) {
                if (!ips.includes(match[0])) {
                    ips.push(match[0]);
                }
            }
            
            // Para cada IP, tentar associar um host
            if (ips.length > 0) {
                for (let i = 0; i < ips.length; i++) {
                    const ip = ips[i];
                    // Tentar encontrar o host nas linhas próximas ao IP
                    const lines = output.split('\n');
                    let hostname = `Host-${i+1}`;
                    let system = 'Sistema desconhecido';
                    
                    for (let j = 0; j < lines.length; j++) {
                        if (lines[j].includes(ip)) {
                            // Procurar hostname nas linhas anteriores
                            for (let k = Math.max(0, j-5); k < j; k++) {
                                if (lines[k].match(/ATAK-|srv-|host-/i)) {
                                    hostname = lines[k].trim();
                                    break;
                                }
                            }
                            // Procurar sistema nas linhas próximas
                            for (let k = Math.max(0, j-10); k < Math.min(lines.length, j+10); k++) {
                                if (lines[k].match(/Linux|Windows|Ubuntu|CentOS|Oracle/i)) {
                                    system = lines[k].trim();
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    
                    hosts.push({
                        hostname: hostname,
                        publicIp: ip,
                        privateIp: 'N/A',
                        system: system
                    });
                }
            }
        }
        
        // Para cada host, adicionar o output específico desse host
        hosts.forEach(host => {
            // Tentar encontrar a parte do output específica para este host
            const hostStartPattern = new RegExp(`Host:\\s*${host.hostname}|==== HOST[^:]*: ${host.hostname}`, 'i');
            const startMatch = hostStartPattern.exec(output);
            
            if (startMatch) {
                const startIndex = startMatch.index;
                const nextHostMatch = output.slice(startIndex + 10).match(/Host:|==== HOST/i);
                const endIndex = nextHostMatch ? 
                    startIndex + 10 + nextHostMatch.index : 
                    output.length;
                
                host.output = output.slice(startIndex, endIndex).trim();
            }
        });
        
        return hosts;
    }

    // Função para renderizar a saída para múltiplos hosts
    function renderMultiHostOutput(jobId, outputDiv) {
        // Verificar se temos jobs individuais para este master job
        const hostJobs = state.baselineJobs.get(jobId) || [];
        
        // Buscar a saída do job master para extrair hosts
        fetch(`/api/status/${jobId}`)
            .then(response => response.json())
            .then(async masterData => {
                const masterOutput = masterData.output || '';
                const hosts = extractHostsInfo(masterOutput);
                
                // Se não temos hosts extraídos nem jobs individuais, usar a saída padrão
                if (hosts.length === 0 && hostJobs.length === 0) {
                    outputDiv.innerHTML = formatDefaultOutput(masterOutput);
                    return;
                }
                
                // Preparar dados para a renderização
                let hostsToRender = hosts.length > 0 ? hosts : [];
                
                // Se temos jobs individuais, adicionar suas saídas
                if (hostJobs.length > 0) {
                    // Buscar saídas atualizadas para os jobs individuais que não temos em cache
                    const outputPromises = hostJobs.map(async job => {
                        if (state.jobOutputs.has(job.jobId)) {
                            const cached = state.jobOutputs.get(job.jobId);
                            // Se o cache é recente (menos de 5 segundos), usar o cache
                            if (Date.now() - cached.timestamp < 5000) {
                                return {
                                    jobId: job.jobId,
                                    hostname: job.hostname,
                                    output: cached.output,
                                    status: cached.status
                                };
                            }
                        }
                        
                        // Caso contrário, buscar dados atualizados
                        try {
                            const response = await fetch(`/api/status/${job.jobId}`);
                            const data = await response.json();
                            
                            // Atualizar o cache
                            state.jobOutputs.set(job.jobId, {
                                output: data.output || '',
                                status: data.status || 'running',
                                timestamp: Date.now()
                            });
                            
                            return {
                                jobId: job.jobId,
                                hostname: job.hostname,
                                output: data.output || '',
                                status: data.status || 'running'
                            };
                        } catch (error) {
                            log(`Erro ao buscar saída para ${job.jobId}: ${error.message}`, 'error');
                            return {
                                jobId: job.jobId,
                                hostname: job.hostname,
                                output: '(Erro ao buscar saída)',
                                status: 'error'
                            };
                        }
                    });
                    
                    // Aguardar todas as saídas
                    const jobOutputs = await Promise.all(outputPromises);
                    
                    // Atualizar hostsToRender com base nos jobs
                    jobOutputs.forEach(jobOutput => {
                        // Procurar o host nos hosts já extraídos
                        const existingHost = hostsToRender.find(h => 
                            h.hostname === jobOutput.hostname || 
                            jobOutput.output.includes(h.hostname)
                        );
                        
                        if (existingHost) {
                            // Atualizar o host existente
                            existingHost.jobId = jobOutput.jobId;
                            existingHost.status = jobOutput.status;
                            existingHost.output = jobOutput.output;
                        } else {
                            // Extrair informações do host a partir da saída do job
                            const extractedHosts = extractHostsInfo(jobOutput.output);
                            
                            if (extractedHosts.length > 0) {
                                // Usar o primeiro host extraído
                                const newHost = extractedHosts[0];
                                newHost.jobId = jobOutput.jobId;
                                newHost.status = jobOutput.status;
                                newHost.output = jobOutput.output;
                                hostsToRender.push(newHost);
                            } else {
                                // Criar um host básico se não conseguiu extrair
                                hostsToRender.push({
                                    hostname: jobOutput.hostname,
                                    publicIp: 'N/A',
                                    privateIp: 'N/A',
                                    system: 'Sistema desconhecido',
                                    jobId: jobOutput.jobId,
                                    status: jobOutput.status,
                                    output: jobOutput.output
                                });
                            }
                        }
                    });
                }
                
                // Renderizar a saída com os hosts
                if (hostsToRender.length > 0) {
                    outputDiv.innerHTML = formatMultiHostOutput(hostsToRender, masterOutput);
                } else {
                    outputDiv.innerHTML = formatDefaultOutput(masterOutput);
                }
            })
            .catch(error => {
                log(`Erro ao renderizar saída multi-host: ${error.message}`, 'error');
                outputDiv.innerHTML = `
                    <div style="color: #f44336; padding: 20px; font-family: monospace;">
                        Erro ao renderizar saída: ${error.message}
                    </div>
                `;
            });
    }

    // Formatação para múltiplos hosts
    function formatMultiHostOutput(hosts, masterOutput) {
        let html = `
        <div class="multi-host-output">
            <style>
                .multi-host-output {
                    font-family: monospace;
                    line-height: 1.5;
                    width: 100%;
                }
                .multi-host-header {
                    background: #121212;
                    color: #FFD600;
                    padding: 10px;
                    margin-bottom: 15px;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 4px;
                }
                .multi-host-container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .host-card {
                    border: 1px solid #2A2A2A;
                    border-radius: 4px;
                    overflow: hidden;
                    background: #0A0A0A;
                }
                .host-header {
                    background: #151515;
                    padding: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #2A2A2A;
                }
                .host-title {
                    font-weight: bold;
                    color: #FFD600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .host-title-icon {
                    color: #FFD600;
                }
                .host-status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                }
                .host-status-running {
                    background: rgba(255, 152, 0, 0.2);
                    color: #FFA000;
                }
                .host-status-completed {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4CAF50;
                }
                .host-status-failed {
                    background: rgba(244, 67, 54, 0.2);
                    color: #F44336;
                }
                .host-info {
                    display: grid;
                    grid-template-columns: 120px 1fr;
                    gap: 8px;
                    padding: 12px;
                    background: #0D0D0D;
                    border-bottom: 1px solid #1A1A1A;
                }
                .host-info-label {
                    color: #9cdcfe;
                    font-weight: bold;
                }
                .host-info-value {
                    color: #d4d4d4;
                }
                .host-output {
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 12px;
                    white-space: pre-wrap;
                    background: #0D0D0D;
                    color: #d4d4d4;
                    font-size: 13px;
                }
                .output-control {
                    padding: 8px 12px;
                    background: #151515;
                    border-top: 1px solid #2A2A2A;
                    display: flex;
                    justify-content: flex-end;
                }
                .toggle-output-btn {
                    background: none;
                    border: none;
                    color: #9E9E9E;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .toggle-output-btn:hover {
                    color: #FFD600;
                }
                .host-summary {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 12px;
                    background: #0D0D0D;
                    border-bottom: 1px solid #1A1A1A;
                }
                .host-summary-item {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #151515;
                }
                .summary-ok {
                    color: #4EC9B0;
                }
                .summary-changed {
                    color: #CE9178;
                }
                .summary-failed {
                    color: #F14C4C;
                }
                .summary-skipped {
                    color: #808080;
                }
            </style>
            
            <div class="multi-host-header">
                ${hosts.length} hosts processados
            </div>
            
            <div class="multi-host-container">
        `;
        
        // Renderizar cada host
        hosts.forEach((host, index) => {
            // Determinar status
            let statusClass = 'host-status-running';
            let statusText = 'Em execução';
            
            if (host.status === 'completed' || host.status === 'success') {
                statusClass = 'host-status-completed';
                statusText = 'Concluído';
            } else if (host.status === 'failed') {
                statusClass = 'host-status-failed';
                statusText = 'Falhou';
            }
            
            // Computar métricas a partir da saída
            let okCount = 0;
            let changedCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            
            if (host.output) {
                // Contar ok
                const okMatches = host.output.match(/ok: \[|ok:/gi);
                okCount = okMatches ? okMatches.length : 0;
                
                // Contar changed
                const changedMatches = host.output.match(/changed: \[|changed:/gi);
                changedCount = changedMatches ? changedMatches.length : 0;
                
                // Contar failed
                const failedMatches = host.output.match(/failed: \[|fatal:|failed:/gi);
                failedCount = failedMatches ? failedMatches.length : 0;
                
                // Contar skipped
                const skippedMatches = host.output.match(/skipping: \[|skipping:|\.\.\.skipping/gi);
                skippedCount = skippedMatches ? skippedMatches.length : 0;
            }
            
            // Formatar a saída para o host
            let formattedOutput = host.output || 'Aguardando saída...';
         // Processar formatação da saída
         if (formattedOutput && formattedOutput.length > 0) {
            formattedOutput = formattedOutput
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/ok: \[|ok:/gi, '<span style="color: #4EC9B0; font-weight: bold;">ok:</span>')
                .replace(/changed: \[|changed:/gi, '<span style="color: #CE9178; font-weight: bold;">changed:</span>')
                .replace(/failed: \[|failed:/gi, '<span style="color: #F14C4C; font-weight: bold;">failed:</span>')
                .replace(/fatal:/gi, '<span style="color: #F14C4C; font-weight: bold;">fatal:</span>')
                .replace(/skipping: \[|skipping:|\.\.\.skipping/gi, '<span style="color: #808080; font-weight: bold;">skipping:</span>')
                .replace(/PLAY RECAP/g, '<span style="color: #569cd6; font-weight: bold;">PLAY RECAP</span>')
                .replace(/PLAY \[([^\]]+)\]/g, '<span style="color: #569cd6; font-weight: bold;">PLAY [$1]</span>')
                .replace(/TASK \[([^\]]+)\]/g, '<span style="color: #9cdcfe; font-weight: bold;">TASK [$1]</span>');
        }
        
        // Adicionar o card para este host
        html += `
            <div class="host-card">
                <div class="host-header">
                    <div class="host-title">
                        <span class="host-title-icon">⚙️</span>
                        Host ${index + 1}: ${host.hostname}
                        ${host.jobId ? `<span style="color:#9E9E9E; font-size:11px; margin-left:8px;">(Job: ${host.jobId})</span>` : ''}
                    </div>
                    <div class="host-status ${statusClass}">${statusText}</div>
                </div>
                
                <div class="host-info">
                    <div class="host-info-label">Hostname:</div>
                    <div class="host-info-value">${host.hostname}</div>
                    
                    <div class="host-info-label">IP Público:</div>
                    <div class="host-info-value">${host.publicIp}</div>
                    
                    <div class="host-info-label">IP Privado:</div>
                    <div class="host-info-value">${host.privateIp}</div>
                    
                    <div class="host-info-label">Sistema:</div>
                    <div class="host-info-value">${host.system}</div>
                </div>
                
                <div class="host-summary">
                    <div class="host-summary-item summary-ok">
                        <span>✓</span> ok: ${okCount}
                    </div>
                    <div class="host-summary-item summary-changed">
                        <span>↻</span> changed: ${changedCount}
                    </div>
                    <div class="host-summary-item summary-failed">
                        <span>✗</span> failed: ${failedCount}
                    </div>
                    <div class="host-summary-item summary-skipped">
                        <span>→</span> skipped: ${skippedCount}
                    </div>
                </div>
                
                <div class="host-output">${formattedOutput}</div>
            </div>
        `;
    });
    
    html += `
        </div>
    </div>
    `;
    
    return html;
}

// Formatação padrão para quando não há hosts ou não conseguimos extrair
function formatDefaultOutput(output) {
    if (!output) {
        return '<em>Aguardando saída...</em>';
    }
    
    // Formatação básica
    const formattedOutput = output
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*([^*:]+):\*\*/g, '<span style="color: #FFD600; font-weight: bold;">$1:</span>')
        .replace(/Hostname:/g, '<span style="color: #9cdcfe; font-weight: bold;">Hostname:</span>')
        .replace(/IP Público:/g, '<span style="color: #9cdcfe; font-weight: bold;">IP Público:</span>')
        .replace(/IP Privado:/g, '<span style="color: #9cdcfe; font-weight: bold;">IP Privado:</span>')
        .replace(/Sistema:/g, '<span style="color: #9cdcfe; font-weight: bold;">Sistema:</span>')
        .replace(/\nPLAY /g, '<br><span style="color: #569cd6; font-weight: bold;">PLAY </span>')
        .replace(/\nTASK /g, '<br><span style="color: #9cdcfe; font-weight: bold;">TASK </span>')
        .replace(/ok:/g, '<span style="color: #4EC9B0; font-weight: bold;">ok:</span>')
        .replace(/changed:/g, '<span style="color: #CE9178; font-weight: bold;">changed:</span>')
        .replace(/failed:/g, '<span style="color: #F14C4C; font-weight: bold;">failed:</span>')
        .replace(/skipping:/g, '<span style="color: #808080; font-weight: bold;">skipping:</span>')
        .replace(/PLAY RECAP/g, '<span style="color: #569cd6; font-weight: bold;">PLAY RECAP</span>');
    
    return `
    <div style="font-family: monospace; white-space: pre-wrap; line-height: 1.5; padding: 10px;">
        ${formattedOutput}
    </div>`;
}

// Interceptar a execução de playbooks para criar jobs individuais
function interceptExecutePlaybooks() {
    if (typeof window.executeSelectedPlaybooks !== 'function') {
        log('Função executeSelectedPlaybooks não encontrada!', 'error');
        return;
    }
    
    const originalExecute = window.executeSelectedPlaybooks;
    
    window.executeSelectedPlaybooks = function() {
        // Obter playbooks selecionadas
        const playbookElements = document.querySelectorAll('.playbook-item.selected');
        const selectedHosts = new Set();
        
        // Obter hosts selecionados
        document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.dataset.hostname) {
                selectedHosts.add(checkbox.dataset.hostname);
            }
        });
        
        // Verificar se alguma playbook é do tipo baseline
        const baselinePlaybooks = Array.from(playbookElements).filter(elem => {
            const playbookName = elem.getAttribute('data-playbook-name') || '';
            return isBaselinePlaybook(playbookName);
        });
        
        // Se não há playbooks de baseline ou menos de 2 hosts, usar comportamento original
        if (baselinePlaybooks.length === 0 || selectedHosts.size < 2) {
            return originalExecute.apply(this, arguments);
        }
        
        log(`Interceptando execução de ${baselinePlaybooks.length} playbooks de baseline para ${selectedHosts.size} hosts`);
        
        // Executar normalmente, deixando o resto da lógica para a função toggleOutput
        return originalExecute.apply(this, arguments);
    };
    
    log('Função executeSelectedPlaybooks interceptada com sucesso');
}

// Aplicar o fix
function applyFix() {
    try {
        // Substituir a função toggleOutput
        replaceToggleOutput();
        
        // Interceptar a execução de playbooks
        interceptExecutePlaybooks();
        
        // Ativar para cards existentes
        setTimeout(setupExistingCards, 2000);
        
        // Marcar como aplicado
        window.baselineMultiHostRendererApplied = true;
        
        log('Fix aplicado com sucesso!', 'success');
    } catch (error) {
        log(`Erro ao aplicar fix: ${error.message}`, 'error');
    }
}

// Configurar cards existentes
function setupExistingCards() {
    // Verificar cards de baseline com saída visível
    document.querySelectorAll('.execution-card').forEach(card => {
        const playbookName = card.getAttribute('data-playbook-name') || '';
        const isBaseline = isBaselinePlaybook(playbookName);
        
        if (isBaseline) {
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv && outputDiv.style.display === 'block') {
                log(`Encontrado card de baseline com saída visível: ${playbookName}`);
                
                const jobId = card.getAttribute('data-job-id');
                if (jobId) {
                    // Iniciar o renderizador para este card
                    initializeMultiHostRenderer(jobId, card, outputDiv);
                }
            }
        }
    });
}

// Iniciar a aplicação do fix
applyFix();
})();

