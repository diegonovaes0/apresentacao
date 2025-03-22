/**
 * ansible-execution.js
 * Gerencia a execução e monitoramento de playbooks Ansible.
 * 
 * Este arquivo contém:
 * - Funções para executar playbooks
 * - Funções para monitorar execuções
 * - Funções para cancelar execuções
 * - Gerenciamento de cards de execução
 */


/**
 * Executa as playbooks selecionadas e garante persistência dos cards
 */
function executeSelectedPlaybooks() {
    debugLog('Iniciando execução das playbooks selecionadas');

    const executionContainer = document.getElementById('running-playbooks');
    if (!executionContainer) {
        debugLog('Container de execução não encontrado', 'error');
        return;
    }

    // Verifica seleções de hosts e playbooks
    const hostsSelected = selectedHosts.size > 0;
    const playbooksSelected = selectedPlaybooks.size > 0;

    if (!hostsSelected) {
        showMessage('Selecione pelo menos um host para executar');
        return;
    }
    if (!playbooksSelected) {
        showMessage('Selecione pelo menos uma playbook para executar');
        return;
    }

    // Busca os dados de playbooks para obter os caminhos
    fetch('/api/playbooks')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao buscar playbooks');
            return response.json();
        })
        .then(allPlaybooks => {
            const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
            
            // Executa as playbooks selecionadas
            const playbooksList = Array.from(selectedPlaybooks);
            playbooksList.forEach(playbookName => {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    showMessage(`Caminho da playbook ${playbookName} não encontrado`, 'error');
                    return;
                }

                const jobId = `${playbookName}_${Date.now()}`;
                const card = createExecutionCard(playbookName, selectedHosts, jobId);
                executionContainer.insertBefore(card, executionContainer.firstChild);

                fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playbook: playbookPath,
                        hosts: Array.from(selectedHosts)
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    debugLog(`Playbook ${playbookName} iniciada com Job ID: ${data.job_id}`);
                    runningJobs.set(data.job_id, card);
                    card.dataset.jobId = data.job_id;
                    monitorPlaybookExecution(data.job_id, card);
                    
                    // Salva o estado para persistência
                    if (typeof saveRunningJobsState === 'function') {
                        saveRunningJobsState();
                    }
                })
                .catch(error => {
                    debugLog(`Erro ao iniciar playbook ${playbookName}: ${error.message}`, 'error');
                    card.classList.add('failed');
                    handlePlaybookCompletion('failed', card);
                    const outputDiv = card.querySelector('.ansible-output');
                    if (outputDiv) {
                        outputDiv.innerHTML = `<div style="color: var(--error-red);">${error.message}</div>`;
                        outputDiv.style.display = 'block';
                    }
                    
                    // Salva o estado mesmo em caso de erro
                    if (typeof saveRunningJobsState === 'function') {
                        saveRunningJobsState();
                    }
                });
            });
        })
        .catch(error => {
            debugLog(`Erro ao buscar playbooks: ${error.message}`, 'error');
            showMessage(`Erro ao buscar playbooks: ${error.message}`, 'error');
        });

    updateExecuteButton();
}

/**
 * Cria um card de execução para uma playbook com melhor formatação dos dados do host
 * @param {string} playbookName - Nome da playbook
 * @param {Set} hosts - Conjunto de hosts selecionados
 * @param {string} jobId - ID do job
 * @returns {HTMLElement} Card de execução
 */
function createExecutionCard(playbookName, hosts, jobId) {
    const card = document.createElement('div');
    card.className = `execution-card ${selectedPlaybooks.has(playbookName) ? 'selected' : ''}`;
    card.dataset.jobId = jobId; // Definindo o jobId como um atributo data-
    card.setAttribute('data-job-id', jobId); // Definindo também como um atributo para garantir compatibilidade
    card.id = `job-${jobId}`; // Definindo também como um ID para máxima compatibilidade
    card.dataset.playbookName = playbookName;
    
    // Cria o conteúdo do card com os detalhes do host em layout horizontal
    let hostDetailsHtml = '';
    Array.from(hosts).forEach(host => {
        const facts = hostData[host]?.facts || {};
        
        // Determinar ícones apropriados baseados no sistema
        const systemIcon = determineSystemIcon(facts.system || '');
        
        // Garantir valores padrão para evitar undefined
        const hostname = facts.hostname || host;
        const publicIp = facts.public_ip || host;
        const privateIp = facts.private_ip || host;
        const system = facts.system || 'Sistema não identificado';
        
        hostDetailsHtml += `
            <div class="host-details" data-host="${host}">
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                    </svg>
                    <strong>Hostname:</strong> 
                    <span class="host-info-item-value" title="${hostname}">${hostname}</span>
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <strong>IP Público:</strong>
                    <span class="host-info-item-value" title="${publicIp}">${publicIp}</span>
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <strong>IP Privado:</strong>
                    <span class="host-info-item-value" title="${privateIp}">${privateIp}</span>
                </p>
                <p>
                    ${systemIcon}
                    <strong>Sistema:</strong>
                    <span class="host-info-item-value" title="${system}">${system}</span>
                </p>
            </div>
        `;
    });
    
    card.innerHTML = `
        <div class="card-header">
            <div class="playbook-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                    <path d="M12 2a10 10 0 0 0-7.35 16.83l7.35-12.66 7.35 12.66A10 10 0 0 0 12 2z"/>
                </svg>
                <strong>${playbookName}</strong>
                <svg class="selected-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-green)" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span class="spinner"></span>
            </div>
            <div class="task-status">Em execução...</div>
        </div>
        <div class="host-info">
            ${hostDetailsHtml}
        </div>
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
        <div class="ansible-output"></div>
        <div class="button-group">
            <button class="cancel-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Cancelar
            </button>
            <button class="toggle-output-btn">
                Ver Mais
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
        </div>
    `;
    
    // Adiciona event listeners corretamente usando addEventListener em vez de onclick inline
    const cancelBtn = card.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', function() {
        cancelExecution(this);
    });
    
    const toggleBtn = card.querySelector('.toggle-output-btn');
    toggleBtn.addEventListener('click', function() {
        toggleOutput(this);
    });
    
    // Salva o estado para persistência entre navegações
    setTimeout(() => {
        if (typeof saveRunningJobsState === 'function') {
            saveRunningJobsState();
        }
    }, 100);
    
    // Agenda uma atualização assíncrona dos dados do host
    setTimeout(async () => {
        if (typeof updateAllHostsInCards === 'function') {
            await updateAllHostsInCards();
        }
    }, 2000);
    
    debugLog(`Card de execução criado para ${playbookName} com ID ${jobId}`);
    return card;
}
/**
 * Determina o ícone SVG apropriado com base no sistema operacional
 * @param {string} system - Nome do sistema operacional
 * @returns {string} HTML do ícone SVG
 */
function determineSystemIcon(system) {
    const systemLower = system.toLowerCase();
    
    if (systemLower.includes('linux') || systemLower.includes('ubuntu') || 
        systemLower.includes('debian') || systemLower.includes('centos') || 
        systemLower.includes('fedora')) {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path>
                <path d="M12 20L12 16"></path>
                <path d="M17 20L12 16L7 20"></path>
            </svg>
        `;
    } else if (systemLower.includes('windows')) {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>
        `;
    } else {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        `;
    }
}

/**
 * Monitora a execução de uma playbook
 * @param {string} jobId - ID do job
 * @param {HTMLElement} card - Card de execução
 */
function monitorPlaybookExecution(jobId, card) {
    const progressBar = card.querySelector('.progress-bar');
    const outputDiv = card.querySelector('.ansible-output');
    const statusDiv = card.querySelector('.task-status');
    
    // Inicia com 1 segundo e vai aumentando
    let pollInterval = 1000;
    const maxInterval = 10000; // Máximo de 10 segundos entre consultas

    function updateProgress() {
        try {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Atualiza o progresso e saída como antes
                    // ...
                    
                    // Continua monitorando com intervalo adaptativo
                    if (data.status === 'running') {
                        // Aumenta gradualmente o intervalo (backoff exponencial)
                        pollInterval = Math.min(pollInterval * 1.5, maxInterval);
                        setTimeout(updateProgress, pollInterval);
                    } else {
                        handlePlaybookCompletion(data.status, card);
                    }
                })
                .catch(error => {
                    console.error(error);
                    debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                    handlePlaybookCompletion('failed', card);
                });
        } catch (error) {
            console.error(error);
            debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
            handlePlaybookCompletion('failed', card);
        }
    }

    // Inicia o monitoramento
    updateProgress();
}



/**
 * Cancela a execução de um job específico
 * @param {HTMLElement} button - Botão de cancelamento clicado
 */
async function cancelExecution(button) {
    try {
        const card = button.closest('.execution-card');
        if (!card) {
            throw new Error('Card de execução não encontrado');
        }
        
        // Verifica várias possibilidades de onde o ID do job pode estar armazenado
        const jobId = card.dataset.jobId || 
                      card.getAttribute('data-job-id') || 
                      card.id.replace('job-', '');
                      
        if (!jobId) {
            debugLog('Card sem ID de job:', card);
            throw new Error('ID do job não encontrado no card');
        }
        
        debugLog(`Tentando cancelar job: ${jobId}`);
        
        // Desabilita o botão e mostra indicador de carregamento
        button.disabled = true;
        button.innerHTML = `
            <div class="spinner" style="display: inline-block; margin-right: 5px;"></div>
            Cancelando...
        `;
        
        // CORREÇÃO: Envie o ID como corpo da requisição, não na URL
        const response = await fetch(`/api/cancel`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
        }
        
        // Atualiza o status do card
        handlePlaybookCompletion('cancelled', card);
        if (runningJobs.has(jobId)) {
            runningJobs.delete(jobId);
        }
        
        debugLog(`Job ${jobId} cancelado com sucesso`);
        
        // Restaura o botão
        button.disabled = false;
        button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Cancelar
        `;
        
        showMessage(`Execução cancelada com sucesso`, 'success');
        
    } catch (error) {
        debugLog(`Erro ao cancelar job: ${error.message}`, 'error');
        
        // Restaura o botão
        if (button) {
            button.disabled = false;
            button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Cancelar
            `;
        }
        
        showMessage(`Erro ao cancelar execução: ${error.message}`, 'error');
    }
}


/**
 * Cancela todas as execuções de playbooks em andamento
 */
async function cancelAllExecutions() {
    try {
        debugLog('Iniciando cancelamento de todas as execuções');
        
        // Encontra todos os cards de execução que estão em andamento
        const executionCards = Array.from(document.querySelectorAll('.execution-card:not(.cancelled):not(.failed):not(.success)'));
        
        if (executionCards.length === 0) {
            showMessage('Não há execuções em andamento para cancelar', 'warning');
            return;
        }
        
        // Mostrar indicador de progresso
        const executionSection = document.getElementById('running-playbooks');
        if (executionSection) {
            const progressMessage = document.createElement('div');
            progressMessage.className = 'cancel-progress-message';
            progressMessage.innerHTML = `
                <div class="spinner" style="display: inline-block; margin-right: 8px;"></div>
                Cancelando ${executionCards.length} execuções...
            `;
            executionSection.insertBefore(progressMessage, executionSection.firstChild);
        }
        
        // Array para armazenar promessas de cancelamento
        const cancelPromises = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Itera sobre todos os cards de execução
        for (const card of executionCards) {
            try {
                // Obtém o ID do job de várias possíveis fontes
                const jobId = card.dataset.jobId || 
                            card.getAttribute('data-job-id') || 
                            card.id.replace('job-', '');
                
                if (!jobId) {
                    debugLog('Card sem ID de job:', card);
                    errorCount++;
                    continue;
                }
                
                // CORREÇÃO: Envie o ID como corpo da requisição, não na URL
                cancelPromises.push(
                    fetch(`/api/cancel`, { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job_id: jobId })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Erro na resposta da API: ${response.status}`);
                        }
                        try {
                            return response.json();
                        } catch (e) {
                            return {}; // Retorna objeto vazio se não conseguir fazer parse do JSON
                        }
                    })
                    .then(() => {
                        // Atualiza o card para status cancelado
                        handlePlaybookCompletion('cancelled', card);
                        if (runningJobs.has(jobId)) {
                            runningJobs.delete(jobId);
                        }
                        successCount++;
                        debugLog(`Job ${jobId} cancelado com sucesso`);
                    })
                    .catch(err => {
                        debugLog(`Erro ao cancelar job ${jobId}: ${err.message}`, 'error');
                        errorCount++;
                    })
                );
            } catch (cardError) {
                debugLog(`Erro ao processar card para cancelamento: ${cardError.message}`, 'error');
                errorCount++;
            }
        }
        
        // Aguarda todas as promessas serem concluídas
        await Promise.allSettled(cancelPromises);
        
        // Remove o indicador de progresso
        document.querySelector('.cancel-progress-message')?.remove();
        
        // Exibe mensagem de resultado
        if (successCount > 0) {
            showMessage(`${successCount} execuções canceladas com sucesso${errorCount > 0 ? ` (${errorCount} falhas)` : ''}`, 
                      errorCount > 0 ? 'warning' : 'success');
        } else if (errorCount > 0) {
            showMessage(`Falha ao cancelar execuções. Tente novamente ou atualize a página.`, 'error');
        }
        
        debugLog(`Cancelamento concluído: ${successCount} sucessos, ${errorCount} falhas`);
        
    } catch (error) {
        // Remove o indicador de progresso em caso de erro
        document.querySelector('.cancel-progress-message')?.remove();
        
        debugLog(`Erro ao cancelar execuções: ${error.message}`, 'error');
        showMessage(`Erro ao cancelar execuções: ${error.message}`, 'error');
    }
}

/**
 * Formata a saída do Ansible em HTML
 * @param {string} output - Output bruto do Ansible
 * @returns {string} HTML formatado
 */
function formatAnsibleOutput(output) {
    if (!output) return '<em>Aguardando saída...</em>';
    
    const lines = output.split('\n');
    let formattedOutput = '<div class="ansible-output-container">';
    
    // Adiciona badge de cópia
    formattedOutput += `
        <div class="copy-badge" onclick="copyAnsibleOutput(this)">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar
        </div>`;
    
    // Array para armazenar informações do host encontradas na saída
    let hostInfo = [];
    
    // Processa as linhas
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/\u001b\[\d+m/g, '').trimEnd();
        
        if (!cleanLine) {
            formattedOutput += '<br>';
            continue;
        }
        
        // Verifica padrões de informações do host
        if (cleanLine.startsWith('**Hostname:**')) {
            const hostname = cleanLine.replace('**Hostname:**', '').trim();
            hostInfo.push({
                type: 'hostname',
                value: hostname,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M8 21h8"></path>
                    <path d="M12 17v4"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**IP Público:**')) {
            const publicIp = cleanLine.replace('**IP Público:**', '').trim();
            hostInfo.push({
                type: 'public_ip',
                value: publicIp,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**IP Privado:**')) {
            const privateIp = cleanLine.replace('**IP Privado:**', '').trim();
            hostInfo.push({
                type: 'private_ip',
                value: privateIp,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**Sistema:**')) {
            const system = cleanLine.replace('**Sistema:**', '').trim();
            let systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`;
            
            // Detecta o tipo de sistema operacional
            if (system.toLowerCase().includes('linux') || 
                system.toLowerCase().includes('ubuntu') || 
                system.toLowerCase().includes('debian') || 
                system.toLowerCase().includes('centos') || 
                system.toLowerCase().includes('fedora')) {
                systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path>
                    <path d="M12 20L12 16"></path>
                    <path d="M17 20L12 16L7 20"></path>
                </svg>`;
            } else if (system.toLowerCase().includes('windows')) {
                systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>`;
            }
            
            hostInfo.push({
                type: 'system',
                value: system,
                icon: systemIcon
            });
            continue;
        }
        
        // Se coletamos informações do host, exibimos em formato horizontal
        if (hostInfo.length > 0 && (cleanLine.startsWith('**PLAY') || cleanLine.startsWith('**TASK'))) {
            // Renderiza as informações do host antes de continuar com a saída normal
            formattedOutput += '<div class="ansible-host-info">';
            hostInfo.forEach(info => {
                formattedOutput += `
                    <div class="ansible-host-info-item">
                        ${info.icon}
                        <strong>${info.type === 'hostname' ? 'Hostname' : 
                                 info.type === 'public_ip' ? 'IP Público' : 
                                 info.type === 'private_ip' ? 'IP Privado' : 'Sistema'}:</strong>
                        ${info.value}
                    </div>`;
            });
            formattedOutput += '</div>';
            
            // Limpa o array de informações do host
            hostInfo = [];
        }
        
        // Formatação padrão para outras linhas
        if (cleanLine.startsWith('**PLAY') || cleanLine.startsWith('PLAY')) {
            // Remove os ** para evitar duplicação
            const cleanPlayLine = cleanLine.replace(/\*\*/g, '');
            formattedOutput += `
                <div class="ansible-play">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    ${cleanPlayLine}
                </div>`;
        } else if (cleanLine.startsWith('**TASK') || cleanLine.startsWith('TASK')) {
            // Remove os ** para evitar duplicação
            const cleanTaskLine = cleanLine.replace(/\*\*/g, '');
            formattedOutput += `
                <div class="ansible-task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9cdcfe" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16 L12 8"></path>
                        <path d="M8 12 L16 12"></path>
                    </svg>
                    ${cleanTaskLine}
                </div>`;
        } else if (cleanLine.match(/^ok:/) || cleanLine.match(/^ok /)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('ok:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
        } else if (cleanLine.match(/^ok:/) || cleanLine.match(/^ok /)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('ok:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-ok">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        <span style="color: #4ec9b0; font-weight: bold;">ok</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^changed:/) || cleanLine.match(/^changed /)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('changed:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-changed">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dcdcaa" stroke-width="2">
                            <path d="M12 4v4m0 0a4 4 0 1 0 4 4"></path>
                            <path d="M12 12h8"></path>
                            <path d="M18 8l-4 4 4 4"></path>
                        </svg>
                        <span style="color: #dcdcaa; font-weight: bold;">changed</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^failed:/) || cleanLine.match(/^failed /)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('failed:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-failed">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M15 9l-6 6"></path>
                            <path d="M9 9l6 6"></path>
                        </svg>
                        <span style="color: #f14c4c; font-weight: bold;">failed</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #f14c4c; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^fatal:/) || cleanLine.match(/^fatal /)) {
            formattedOutput += `
                <div class="ansible-fatal">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    ${cleanLine}
                </div>`;
        } else if (cleanLine.match(/^skipping:/) || cleanLine.match(/^skipping /) || cleanLine.includes('...skipping')) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('skipping:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-skipping">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="2">
                            <path d="M6 18L18 6"></path>
                            <path d="M6 6l12 12"></path>
                        </svg>
                        <span style="color: #808080; font-weight: bold;">skipping</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^unreachable:/) || cleanLine.match(/^unreachable /)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('unreachable:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-unreachable">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span style="color: #f14c4c; font-weight: bold;">unreachable</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #f14c4c; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.startsWith('PLAY RECAP') || cleanLine.includes('PLAY RECAP')) {
            formattedOutput += `
                <div class="ansible-recap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    ${cleanLine}
                </div>`;
        } else if (cleanLine.includes('ok=') || cleanLine.includes('changed=')) {
            // Colorir estatísticas no PLAY RECAP
            let coloredLine = cleanLine;
            
            // Realce para ok=X
            coloredLine = coloredLine.replace(/ok=(\d+)/, '<span style="color: #4ec9b0;">ok=$1</span>');
            
            // Realce para changed=X
            coloredLine = coloredLine.replace(/changed=(\d+)/, '<span style="color: #dcdcaa;">changed=$1</span>');
            
            // Realce para unreachable=X e failed=X
            coloredLine = coloredLine.replace(/unreachable=(\d+)/, '<span style="color: #f14c4c;">unreachable=$1</span>');
            coloredLine = coloredLine.replace(/failed=(\d+)/, '<span style="color: #f14c4c;">failed=$1</span>');
            
            formattedOutput += `<div class="ansible-stats">${coloredLine}</div>`;
        } else if (cleanLine.startsWith('**')) {
            // Linhas formatadas com ** são tratadas como informações do host mas não encaixaram nos padrões específicos
            formattedOutput += `<div class="ansible-console-line">${cleanLine}</div>`;
        } else {
            // Texto padrão
            formattedOutput += `<div class="ansible-console-line">${cleanLine}</div>`;
        }
    }
    
    // Se tiver informações de host coletadas mas que não foram renderizadas ainda
    if (hostInfo.length > 0) {
        formattedOutput += '<div class="ansible-host-info">';
        hostInfo.forEach(info => {
            formattedOutput += `
                <div class="ansible-host-info-item">
                    ${info.icon}
                    <strong>${info.type === 'hostname' ? 'Hostname' : 
                             info.type === 'public_ip' ? 'IP Público' : 
                             info.type === 'private_ip' ? 'IP Privado' : 'Sistema'}:</strong>
                    ${info.value}
                </div>`;
        });
        formattedOutput += '</div>';
    }
    
    formattedOutput += '</div>';
    return formattedOutput;
}

/**
 * Copia o conteúdo do output do Ansible para a área de transferência
 * @param {HTMLElement} element - Elemento de cópia clicado
 */
function copyAnsibleOutput(element) {
    const outputEl = element.closest('.ansible-output');
    const plainText = outputEl.innerText.replace(/Copiar/, '').trim();
    
    navigator.clipboard.writeText(plainText).then(() => {
        element.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Copiado!
        `;
        
        setTimeout(() => {
            element.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copiar
            `;
        }, 2000);
    });
}

/**
 * Controla o posicionamento dos grupos de botões nos cards de execução
 * @param {HTMLElement} card - Card de execução
 */
function positionButtonGroup(card) {
    const buttonGroup = card.querySelector('.button-group');
    if (!buttonGroup) return;
    
    const rect = card.getBoundingClientRect();
    
    // Remove qualquer posicionamento anterior
    buttonGroup.classList.remove('button-group-positioned');
    
    // Define a posição exata para o button-group ficar no fundo do card
    buttonGroup.style.position = 'absolute';
    buttonGroup.style.bottom = '0';
    buttonGroup.style.left = '0';
    buttonGroup.style.width = '100%';
    
    // Adiciona classe para controle de estilo
    buttonGroup.classList.add('button-group-positioned');
}

/**
 * Redefine a posição do grupo de botões para o padrão
 * @param {HTMLElement} card - Card de execução
 */
function resetButtonGroupPosition(card) {
    const buttonGroup = card.querySelector('.button-group');
    if (!buttonGroup) return;
    
    // Remove estilos inline e classe de posicionamento
    buttonGroup.style.position = '';
    buttonGroup.style.bottom = '';
    buttonGroup.style.left = '';
    buttonGroup.style.width = '';
    buttonGroup.classList.remove('button-group-positioned');
}

/**
 * Inicializa a posição de todos os botões nos cards de execução
 */
function initializeButtonPositions() {
    document.querySelectorAll('.execution-card').forEach(card => {
        const output = card.querySelector('.ansible-output');
        if (output && output.style.display === 'block') {
            positionButtonGroup(card);
        } else {
            resetButtonGroupPosition(card);
        }
    });
}


/**
 * Alterna a visibilidade da saída da playbook
 * @param {HTMLElement} button - Botão de alternar clicado
 */
function toggleOutput(button) {
    try {
        const card = button.closest('.execution-card');
        if (!card) {
            console.log("Card não encontrado para o botão");
            return;
        }
        
        const output = card.querySelector('.ansible-output');
        if (!output) {
            console.log("Elemento de saída não encontrado no card");
            return;
        }
        
        const isVisible = output.style.display === 'block';
        
        console.log("Alterando visibilidade da saída: " + (isVisible ? "ocultar" : "mostrar"));
        
        // Troca a visibilidade
        output.style.display = isVisible ? 'none' : 'block';
        
        // Atualiza o botão
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
        
        // Se estamos mostrando a saída, garantir que seu conteúdo seja atualizado
        if (!isVisible) {
            const jobId = card.getAttribute('data-job-id');
            if (jobId) {
                fetchAndUpdateOutput(jobId, output);
            } else {
                console.log("ID do job não encontrado no card");
            }
        }
    } catch (error) {
        console.error("Erro ao alternar visibilidade da saída:", error);
    }
}

/**
 * Busca e atualiza a saída de um job
 * @param {string} jobId - ID do job
 * @param {HTMLElement} outputElement - Elemento onde a saída será exibida
 */
function fetchAndUpdateOutput(jobId, outputElement) {
    console.log("Buscando saída para o job:", jobId);
    
    // Mostrar indicador de carregamento
    outputElement.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Carregando saída...</div>';
    
    fetch(`/api/status/${jobId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao buscar status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Formatar e exibir a saída
            outputElement.innerHTML = formatAnsibleOutput(data.output || "Nenhuma saída disponível");
        })
        .catch(error => {
            console.error("Erro ao buscar saída:", error);
            outputElement.innerHTML = `<div style="color: var(--error-red); padding: 16px;">Erro ao buscar saída: ${error.message}</div>`;
        });
}

/**
 * Formata a saída do Ansible em HTML
 * @param {string} output - Output bruto do Ansible
 * @returns {string} HTML formatado
 */
function formatAnsibleOutput(output) {
    if (!output) return '<em>Aguardando saída...</em>';
    
    // Versão simplificada da formatação
    const lines = output.split('\n');
    let formattedOutput = '<div class="ansible-output-container" style="font-family: monospace; white-space: pre-wrap; font-size: 12px; line-height: 1.5;">';
    
    // Adiciona badge de cópia
    formattedOutput += `
        <div class="copy-badge" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span style="color: white; font-size: 11px; margin-left: 4px;">Copiar</span>
        </div>`;
    
    // Processa as linhas com formatação básica
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!line.trim()) {
            formattedOutput += '<br>';
            continue;
        }
        
        // Formatação de acordo com o tipo de linha
        if (line.startsWith('PLAY ') || line.includes('PLAY RECAP')) {
            formattedOutput += `<div style="color: #569cd6; font-weight: bold; margin-top: 8px;">${line}</div>`;
        } else if (line.startsWith('TASK ')) {
            formattedOutput += `<div style="color: #9cdcfe; font-weight: bold; margin-top: 6px;">${line}</div>`;
        } else if (line.match(/^ok:/)) {
            formattedOutput += `<div style="color: #4ec9b0;">${line}</div>`;
        } else if (line.match(/^changed:/)) {
            formattedOutput += `<div style="color: #dcdcaa;">${line}</div>`;
        } else if (line.match(/^failed:/)) {
            formattedOutput += `<div style="color: #f14c4c;">${line}</div>`;
        } else if (line.match(/^skipping:/)) {
            formattedOutput += `<div style="color: #808080;">${line}</div>`;
        } else {
            formattedOutput += `<div>${line}</div>`;
        }
    }
    
    formattedOutput += '</div>';
    
    // Adicionar script para funcionalidade de cópia
    formattedOutput += `
    <script>
    document.querySelector('.copy-badge').addEventListener('click', function() {
        const text = document.querySelector('.ansible-output-container').innerText;
        navigator.clipboard.writeText(text)
            .then(() => {
                this.innerHTML = '<span style="color: white;">Copiado!</span>';
                setTimeout(() => {
                    this.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span style="color: white; font-size: 11px; margin-left: 4px;">Copiar</span>';
                }, 2000);
            })
            .catch(err => console.error('Erro ao copiar:', err));
    });
    </script>`;
    
    return formattedOutput;
}

// Substituir as funções globais
window.toggleOutput = toggleOutput;
window.formatAnsibleOutput = formatAnsibleOutput;
window.fetchAndUpdateOutput = fetchAndUpdateOutput;


/**
 * Restaura os cards de execução a partir da sessionStorage
 */
function restoreRunningJobsState() {
    try {
        if (!window.sessionStorage) return;
        
        const savedCardsData = sessionStorage.getItem('runningAnsibleCards');
        if (!savedCardsData) return;
        
        const cardsData = JSON.parse(savedCardsData);
        if (!cardsData || !cardsData.length) return;
        
        const executionContainer = document.getElementById('running-playbooks');
        if (!executionContainer) {
            console.error('Container de execução não encontrado');
            return;
        }
        
        // Restaura cada card
        cardsData.forEach(cardData => {
            // Verifica se o card já existe
            if (document.getElementById(cardData.id)) {
                console.log(`Card ${cardData.id} já existe na página`);
                return;
            }
            
            const card = document.createElement('div');
            card.id = cardData.id;
            card.className = cardData.className;
            
            // Definir os atributos de dados
            if (cardData.jobId) {
                card.dataset.jobId = cardData.jobId;
                card.setAttribute('data-job-id', cardData.jobId);
            }
            
            if (cardData.playbookName) {
                card.dataset.playbookName = cardData.playbookName;
            }
            
            card.innerHTML = cardData.innerHTML;
            
            // Adiciona o card restaurado no início da lista
            executionContainer.insertBefore(card, executionContainer.firstChild);
            
            // Re-anexa os event listeners
            const cancelBtn = card.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    cancelExecution(this);
                });
            }
            
            const toggleBtn = card.querySelector('.toggle-output-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                    toggleOutput(this);
                });
            }
            
            // Atualiza o estado do botão de execução
            if (typeof updateExecuteButton === 'function') {
                updateExecuteButton();
            }
            
            // Reinicia o monitoramento se o card estiver em execução
            // Só retoma o monitoramento se o card não estiver em estado final
            if (cardData.jobId && 
                !card.classList.contains('success') && 
                !card.classList.contains('failed') && 
                !card.classList.contains('cancelled')) {
                
                // Registra o job como em execução
                if (window.runningJobs && typeof window.runningJobs.set === 'function') {
                    window.runningJobs.set(cardData.jobId, card);
                    
                    // Reinicia o monitoramento
                    if (typeof window.monitorPlaybookExecution === 'function') {
                        window.monitorPlaybookExecution(cardData.jobId, card);
                    }
                }
            }
            
            console.log(`Card restaurado: ${cardData.playbookName}`);
        });
        
        console.log(`${cardsData.length} cards restaurados da sessão`);
    } catch (error) {
        console.error(`Erro ao restaurar estado dos cards: ${error.message}`);
    }
}


/**
 * Modifica a função handlePlaybookCompletion para salvar o estado antes de finalizar
 * @param {string} status - Status final (completed, failed, cancelled)
 * @param {HTMLElement} card - Card de execução
 */
function handlePlaybookCompletion(status, card) {
    const statusDiv = card.querySelector('.task-status');
    const spinner = card.querySelector('.spinner');
    const progressBar = card.querySelector('.progress-bar');

    // Esconde o spinner
    if (spinner) spinner.style.display = 'none';
    
    // Ajusta a barra de progresso
    if (progressBar) {
        progressBar.style.width = '100%';
        
        switch (status) {
            case 'completed':
                progressBar.style.backgroundColor = '#4CAF50'; // Verde
                break;
            case 'failed':
                progressBar.style.backgroundColor = '#f44336'; // Vermelho
                break;
            case 'cancelled':
                progressBar.style.backgroundColor = '#ff9800'; // Laranja
                break;
        }
    }

    // Ajusta o texto de status
    if (statusDiv) {
        switch (status) {
            case 'completed':
                statusDiv.textContent = 'Concluído com sucesso';
                statusDiv.className = 'task-status success';
                break;
            case 'failed':
                statusDiv.textContent = 'Falhou';
                statusDiv.className = 'task-status failed';
                
                // Mostra automaticamente a saída em caso de falha
                const outputDiv = card.querySelector('.ansible-output');
                if (outputDiv) {
                    outputDiv.style.display = 'block';
                }
                
                // Atualiza o botão de "Ver Mais" para "Ver Menos"
                const toggleBtn = card.querySelector('.toggle-output-btn');
                if (toggleBtn) {
                    toggleBtn.innerHTML = `
                        Ver Menos
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    `;
                }
                break;
            case 'cancelled':
                statusDiv.textContent = 'Cancelado';
                statusDiv.className = 'task-status cancelled';
                break;
        }
    }
    
    // Salva o estado dos cards após a conclusão
    saveRunningJobsState();
    
    debugLog(`Playbook finalizado com status: ${status}`);
}
/**
 * Funções para garantir que os cards de execução persistam entre navegações
 */

/**
 * Salva o estado dos cards de execução na sessionStorage
 */
function saveRunningJobsState() {
    try {
        if (!window.sessionStorage) return;
        
        const runningCards = Array.from(document.querySelectorAll('.execution-card'));
        if (runningCards.length === 0) return;
        
        // Armazenar apenas os dados necessários para recriar os cards
        const cardsData = runningCards.map(card => {
            return {
                id: card.id,
                jobId: card.dataset.jobId || card.getAttribute('data-job-id'),
                playbookName: card.dataset.playbookName,
                innerHTML: card.innerHTML,
                className: card.className,
                hosts: Array.from(card.querySelectorAll('.host-details')).map(hostDetail => hostDetail.getAttribute('data-host'))
            };
        });
        
        // Salva o estado dos cards na sessionStorage
        sessionStorage.setItem('runningAnsibleCards', JSON.stringify(cardsData));
        console.log(`Estado de ${cardsData.length} cards salvos na sessão`);
    } catch (error) {
        console.error(`Erro ao salvar estado dos cards: ${error.message}`);
    }
}


/**
 * Função para inicializar o comportamento de persistência dos cards
 * Deve ser chamada quando o documento for carregado
 */
function initializeCardPersistence() {
    // Restaura os cards da sessão anterior
    restoreRunningJobsState();
    
    // Adiciona event listeners para detectar quando a página será recarregada ou fechada
    window.addEventListener('beforeunload', saveRunningJobsState);
    
    // Salva periodicamente o estado dos cards
    setInterval(saveRunningJobsState, 10000);
    
    // Adiciona event listeners para detectar navegação interna
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href.includes(window.location.origin)) {
            saveRunningJobsState();
        }
    });
    
    debugLog('Persistência de cards inicializada');
}

// Função a ser executada quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa a persistência dos cards
    initializeCardPersistence();
    
    // Ajuste no monitoramento de execução para atualizar o estado
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
    window.monitorPlaybookExecution = function(jobId, card) {
        originalMonitorPlaybookExecution(jobId, card);
        // Salva o estado após iniciar o monitoramento
        saveRunningJobsState();
    };
    
    debugLog('Configuração de persistência concluída');
});

// Exportação global das funções
window.createExecutionCard = createExecutionCard;
window.saveRunningJobsState = saveRunningJobsState;
window.restoreRunningJobsState = restoreRunningJobsState;
window.handlePlaybookCompletion = handlePlaybookCompletion;
window.initializeCardPersistence = initializeCardPersistence;


// Função para melhorar o feedback visual ao mudar seletores
// Modificação na função enhanceSelectorFeedback para evitar criar spinners duplicados
function enhanceSelectorFeedback() {
    // Adiciona estilos para feedback visual nos seletores
    const style = document.createElement('style');
    style.textContent = `
      .ansible-select {
        transition: box-shadow 0.3s ease, border-color 0.3s ease;
      }
      
      .ansible-select:focus {
        box-shadow: 0 0 0 2px rgba(255, 214, 0, 0.3);
        border-color: var(--accent-gold);
      }
      
      .ansible-select.changed {
        animation: selectChanged 1s ease;
      }
      
      @keyframes selectChanged {
        0% { background-color: rgba(255, 214, 0, 0.2); }
        100% { background-color: var(--black-smoke); }
      }
    `;
    document.head.appendChild(style);
    
    // Adiciona event listeners para feedback visual
    const osFilter = document.getElementById('os-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    [osFilter, categoryFilter].forEach(select => {
      if (!select) return;
      
      select.addEventListener('change', function() {
        this.classList.remove('changed');
        void this.offsetWidth; // Força reflow para reiniciar a animação
        this.classList.add('changed');
        
        // REMOVER ESTA PARTE para evitar spinners duplicados
        // O carregamento será mostrado pela função loadPlaybooks
        // Não precisamos adicionar outro spinner aqui
      });
    });
  }

  /**
 * Mostra ou oculta o indicador de carregamento das playbooks
 * @param {boolean} show - Se true, mostra o indicador; se false, oculta
 * @param {string} osValue - O valor do sistema operacional selecionado (opcional)
 */
function togglePlaybooksLoading(show, osValue = '') {
    const playbooksContainer = document.getElementById('playbooks');
    if (!playbooksContainer) return;
    
    if (show) {
      const displaySystem = osValue ? (OS_MAPPING[osValue]?.display || osValue) : '';
      const message = displaySystem ? `Carregando playbooks para ${displaySystem}...` : 'Carregando playbooks...';
      
      playbooksContainer.innerHTML = `
        <div class="loading-playbooks">
          <span class="spinner"></span>
          ${message}
        </div>`;
    }
    // Se show for false, não limpa o container, pois isso será feito ao renderizar os resultados
  }
  
  // Função para inicializar as melhorias
  function initializeSelectorEnhancements() {
    debugLog('Inicializando melhorias para seletores');
    
    // Adiciona feedback visual aos seletores
    enhanceSelectorFeedback();
    
    // Sobrescreve as funções necessárias
    window.loadPlaybooks = loadPlaybooks;
    window.renderPlaybooksFromCache = renderPlaybooksFromCache;
    window.updateOSInfoPanel = updateOSInfoPanel;
    window.refreshAll = refreshAll;
    
    // Sobrescreve o setup de event listeners
    const originalSetupEventListeners = window.setupEventListeners;
    window.setupEventListeners = function() {
      // Chama a implementação original primeiro
      if (typeof originalSetupEventListeners === 'function') {
        originalSetupEventListeners();
      }
      
      // Reaplica nossos listeners melhorados
      const osFilter = document.getElementById('os-filter');
      if (osFilter) {
        // Remove listeners existentes
        const newOsFilter = osFilter.cloneNode(true);
        osFilter.parentNode.replaceChild(newOsFilter, osFilter);
        
        // Adiciona nosso listener melhorado
        newOsFilter.addEventListener('change', function() {
          debugLog(`Filtro de SO alterado para: ${this.value}`);
          // Sempre força refresh ao mudar SO
          loadPlaybooks(true);
          updateOSInfoPanel();
        });
      }
    };
    
    debugLog('Melhorias para seletores inicializadas com sucesso');
  }
  
  // Inicializa as melhorias ao carregar o documento
  document.addEventListener('DOMContentLoaded', function() {
    // Aguarda um pequeno tempo para garantir que o resto da aplicação já foi inicializado
    setTimeout(initializeSelectorEnhancements, 500);
  });

// Atualiza a função refreshAll para garantir limpeza completa do cache
function refreshAll() {
    debugLog('Iniciando atualização completa dos dados');
    
    // Limpa seleções
    selectedHosts.clear();
    selectedPlaybooks.clear();
    runningJobs.clear();
    hostData = {}; // Limpa hostData explicitamente
    
    // Limpa completamente os dados em sessionStorage
    sessionStorage.removeItem('hostsLoaded');
    sessionStorage.removeItem('hostData');
    sessionStorage.removeItem('playbooksLoaded');
    sessionStorage.removeItem('playbooksData');
    sessionStorage.removeItem('lastOsFilter');
    sessionStorage.removeItem('lastCategoryFilter');
    
    // Limpa as listas na interface
    document.getElementById('hosts-list').innerHTML = '<div class="loading-banner">Carregando hosts...</div>';
    document.getElementById('running-playbooks').innerHTML = '';
    document.getElementById('playbooks').innerHTML = '<div class="loading-playbooks">Carregando playbooks...</div>';
    
    // Remove mensagens de status
    document.getElementById('execution-status')?.remove();
    
    // Mostra feedback visual de atualização
    showMessage('Atualizando dados...', 'warning', 1500);
    
    // Carrega hosts e playbooks com a flag forceRefresh
    setTimeout(() => {
      loadHosts(true);
      loadPlaybooks(true);
      showMessage('Dados atualizados com sucesso!', 'success');
    }, 500);
  }

/**
 * Corrige o problema de duplicação de Sistema em resumos do Baseline
 */
function fixSystemDuplication() {
    // Corrige textos duplicados de sistema no resumo
    setInterval(() => {
        document.querySelectorAll('.log-system, .log-hostname').forEach(element => {
            const text = element.textContent;
            
            // Corrige apenas se houver texto duplicado
            if (text && text.includes('Sistema:') && text.indexOf('Sistema:') !== text.lastIndexOf('Sistema:')) {
                const cleanText = text.split('Sistema:')[0].trim();
                element.textContent = cleanText;
            }
        });
    }, 2000);
    
    debugLog('Correção de duplicação de sistema aplicada');
}
/**
 * Atualiza o estado dos cards de execução na sessionStorage e faz monitoramento contínuo
 */
function setupCardPersistence() {
    // Restaura os cards da sessão anterior
    restoreRunningJobsState();
    
    // Salva o estado antes de navegar para outra página
    window.addEventListener('beforeunload', saveRunningJobsState);
    
    // Salva o estado periodicamente
    setInterval(saveRunningJobsState, 5000);
    
    // Intercepta cliques em links para salvar o estado antes de navegar
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href.includes(window.location.origin)) {
            saveRunningJobsState();
        }
    });
    
    // Intercepta a conclusão de execuções para garantir que o estado seja salvo
    if (typeof window.handlePlaybookCompletion === 'function') {
        const originalHandlePlaybookCompletion = window.handlePlaybookCompletion;
        window.handlePlaybookCompletion = function(status, card) {
            // Chama a função original
            originalHandlePlaybookCompletion(status, card);
            
            // Salva o estado após a conclusão
            setTimeout(saveRunningJobsState, 200);
        };
    }
}

// Adicionar estas funções ao objeto window
window.saveRunningJobsState = saveRunningJobsState;
window.restoreRunningJobsState = restoreRunningJobsState;
window.setupCardPersistence = setupCardPersistence;

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', setupCardPersistence);
// Exporta funções para uso global
window.executeSelectedPlaybooks = executeSelectedPlaybooks;
window.toggleOutput = toggleOutput;
window.cancelExecution = cancelExecution;
window.cancelAllExecutions = cancelAllExecutions;
window.copyAnsibleOutput = copyAnsibleOutput;
window.initializeButtonPositions = initializeButtonPositions;
window.refreshAll = refreshAll;
window.fixSystemDuplication = fixSystemDuplication;