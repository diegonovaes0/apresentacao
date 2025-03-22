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
 * Executa as playbooks selecionadas
 */
/**
 * Função para salvar os dados dos hosts na sessionStorage
 * Garante que os dados dos hosts persistam durante a navegação
 */
function saveRunningJobsState() {
    try {
        if (!window.sessionStorage) return;
        
        const runningCards = Array.from(document.querySelectorAll('.execution-card[data-persist-card="true"]'));
        
        if (runningCards.length === 0) return;
        
        // Coletar hosts de todos os cards para garantir que seus dados sejam preservados
        const hostsInCards = new Set();
        runningCards.forEach(card => {
            const hostDetails = card.querySelectorAll('.host-details');
            hostDetails.forEach(detail => {
                const host = detail.dataset.host;
                if (host) hostsInCards.add(host);
            });
        });
        
        // Criar uma cópia dos dados dos hosts que precisamos preservar
        const hostDataToSave = {};
        if (hostData) {
            Array.from(hostsInCards).forEach(host => {
                if (hostData[host]) {
                    hostDataToSave[host] = hostData[host];
                }
            });
        }
        
        // Armazenar apenas os dados necessários para recriar os cards
        const cardsData = runningCards.map(card => {
            const hosts = Array.from(card.querySelectorAll('.host-details')).map(hostDetail => hostDetail.dataset.host);
            
            return {
                id: card.id,
                jobId: card.dataset.jobId,
                playbookName: card.dataset.playbookName,
                innerHTML: card.innerHTML,
                className: card.className,
                hosts: hosts
            };
        });
        
        // Salva o estado dos cards e dados dos hosts na sessionStorage
        sessionStorage.setItem('runningAnsibleCards', JSON.stringify(cardsData));
        sessionStorage.setItem('savedHostData', JSON.stringify(hostDataToSave));
        
        debugLog(`Estado de ${cardsData.length} cards salvos na sessão com dados de ${Object.keys(hostDataToSave).length} hosts`);
    } catch (error) {
        debugLog(`Erro ao salvar estado dos cards: ${error.message}`, 'error');
    }
}

/**
 * Função para restaurar dados dos hosts da sessionStorage
 * Deve ser chamada antes de restaurar os cards
 */
function restoreHostData() {
    try {
        if (!window.sessionStorage) return;
        
        const savedHostData = sessionStorage.getItem('savedHostData');
        if (!savedHostData) return;
        
        const restoredHostData = JSON.parse(savedHostData);
        
        // Mesclar os dados dos hosts salvos com os existentes
        if (restoredHostData && typeof restoredHostData === 'object') {
            Object.keys(restoredHostData).forEach(host => {
                if (!hostData[host]) {
                    hostData[host] = restoredHostData[host];
                } else {
                    // Se já existir, garantir que as propriedades facts estejam presentes
                    if (restoredHostData[host].facts && (!hostData[host].facts || !hostData[host].facts.hostname)) {
                        hostData[host].facts = restoredHostData[host].facts;
                    }
                }
            });
            
            debugLog(`Dados de ${Object.keys(restoredHostData).length} hosts restaurados da sessão`);
        }
    } catch (error) {
        debugLog(`Erro ao restaurar dados dos hosts: ${error.message}`, 'error');
    }
}

/**
 * Restaura os cards de execução da sessionStorage
 */
function restoreRunningJobsState() {
    try {
        if (!window.sessionStorage) return;
        
        // Primeiro restaura os dados dos hosts
        restoreHostData();
        
        const savedCardsData = sessionStorage.getItem('runningAnsibleCards');
        if (!savedCardsData) return;
        
        const cardsData = JSON.parse(savedCardsData);
        if (!cardsData || !cardsData.length) return;
        
        const executionContainer = document.getElementById('running-playbooks');
        if (!executionContainer) {
            debugLog('Container de execução não encontrado', 'error');
            return;
        }
        
        // Restaura cada card
        cardsData.forEach(cardData => {
            // Verifica se o card já existe
            if (document.getElementById(cardData.id)) {
                debugLog(`Card ${cardData.id} já existe na página`);
                return;
            }
            
            // Se não temos dados dos hosts deste card, não podemos restaurar corretamente
            let hasAllHostData = true;
            for (const hostname of cardData.hosts) {
                if (!hostData[hostname] || !hostData[hostname].facts) {
                    hasAllHostData = false;
                    debugLog(`Dados incompletos para o host ${hostname}, criando card do zero`);
                    break;
                }
            }
            
            if (hasAllHostData && cardData.hosts.length > 0) {
                // Cria um novo card do zero para garantir que as informações estejam atualizadas
                const hostSet = new Set(cardData.hosts);
                const newCard = createExecutionCard(cardData.playbookName, hostSet, cardData.jobId);
                
                // Adiciona o card restaurado no início da lista
                executionContainer.insertBefore(newCard, executionContainer.firstChild);
                
                // Restaura classes específicas do card original
                if (cardData.className.includes('failed')) {
                    newCard.classList.add('failed');
                } else if (cardData.className.includes('success')) {
                    newCard.classList.add('success');
                } else if (cardData.className.includes('cancelled')) {
                    newCard.classList.add('cancelled');
                }
                
                // Restaura o status e progresso
                const statusDiv = newCard.querySelector('.task-status');
                if (statusDiv) {
                    if (cardData.className.includes('failed')) {
                        statusDiv.textContent = 'Falhou';
                        statusDiv.className = 'task-status failed';
                    } else if (cardData.className.includes('success')) {
                        statusDiv.textContent = 'Concluído com sucesso';
                        statusDiv.className = 'task-status success';
                    } else if (cardData.className.includes('cancelled')) {
                        statusDiv.textContent = 'Cancelado';
                        statusDiv.className = 'task-status cancelled';
                    }
                }
                
                // Registra o job como em execução
                if (cardData.jobId && !runningJobs.has(cardData.jobId)) {
                    runningJobs.set(cardData.jobId, newCard);
                    
                    // Somente reinicia o monitoramento se o card não estiver em estado final
                    if (!cardData.className.includes('failed') && 
                        !cardData.className.includes('success') && 
                        !cardData.className.includes('cancelled')) {
                        monitorPlaybookExecution(cardData.jobId, newCard);
                    }
                }
            } else {
                // Fallback: restaura o card usando o HTML salvo se não temos dados dos hosts
                const card = document.createElement('div');
                card.id = cardData.id;
                card.className = cardData.className;
                card.dataset.jobId = cardData.jobId;
                card.setAttribute('data-job-id', cardData.jobId);
                card.dataset.playbookName = cardData.playbookName;
                card.dataset.persistCard = "true";
                card.innerHTML = cardData.innerHTML;
                
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
                
                // Registra o job como em execução
                if (cardData.jobId && !runningJobs.has(cardData.jobId)) {
                    runningJobs.set(cardData.jobId, card);
                    
                    // Somente reinicia o monitoramento se o card não estiver em estado final
                    if (!cardData.className.includes('failed') && 
                        !cardData.className.includes('success') && 
                        !cardData.className.includes('cancelled')) {
                        monitorPlaybookExecution(cardData.jobId, card);
                    }
                }
            }
            
            debugLog(`Card restaurado: ${cardData.playbookName} (${cardData.jobId})`);
        });
        
        // Atualiza o estado dos botões
        updateExecuteButton();
        
        debugLog(`${cardsData.length} cards restaurados da sessão`);
    } catch (error) {
        debugLog(`Erro ao restaurar estado dos cards: ${error.message}`, 'error');
    }
}

/**
 * Busca os dados atualizados do host da API antes de criar o card
 * @param {string} hostname - Nome do host
 * @returns {Promise<Object>} - Dados do host
 */
async function fetchUpdatedHostData(hostname) {
    try {
        // Se já temos dados válidos e completos para este host, podemos usá-los
        if (hostData[hostname] && 
            hostData[hostname].facts && 
            hostData[hostname].facts.hostname && 
            hostData[hostname].facts.public_ip && 
            hostData[hostname].facts.private_ip && 
            hostData[hostname].facts.system) {
            return hostData[hostname];
        }
        
        // Buscar dados atualizados da API
        const response = await fetch(`/api/host/${hostname}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados do host: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Atualizar o cache de hostData
        if (data && typeof data === 'object') {
            if (!hostData[hostname]) {
                hostData[hostname] = { valid: true };
            }
            
            hostData[hostname].facts = {
                hostname: data.hostname || hostname,
                public_ip: data.public_ip || hostname,
                private_ip: data.private_ip || hostname,
                system: data.system || 'Sistema não identificado'
            };
            
            // Salvar dados atualizados na sessionStorage
            saveRunningJobsState();
        }
        
        return hostData[hostname];
    } catch (error) {
        debugLog(`Erro ao buscar dados do host ${hostname}: ${error.message}`, 'warning');
        
        // Usar fallback com os dados existentes ou criar dados mínimos
        if (!hostData[hostname]) {
            hostData[hostname] = {
                valid: true,
                facts: {
                    hostname: hostname,
                    public_ip: hostname,
                    private_ip: hostname,
                    system: 'Sistema não identificado'
                }
            };
        } else if (!hostData[hostname].facts) {
            hostData[hostname].facts = {
                hostname: hostname,
                public_ip: hostname,
                private_ip: hostname,
                system: 'Sistema não identificado'
            };
        }
        
        return hostData[hostname];
    }
}

/**
 * Versão assíncrona do createExecutionCard
 * @param {string} playbookName - Nome da playbook
 * @param {Set} hosts - Conjunto de hosts selecionados
 * @param {string} jobId - ID do job
 * @returns {HTMLElement} Card de execução
 */
async function createExecutionCardAsync(playbookName, hosts, jobId) {
    const card = document.createElement('div');
    card.className = `execution-card ${selectedPlaybooks.has(playbookName) ? 'selected' : ''}`;
    card.dataset.jobId = jobId;
    card.setAttribute('data-job-id', jobId);
    card.id = `job-${jobId}`;
    card.dataset.playbookName = playbookName;
    card.dataset.persistCard = "true";
    
    // Inicializa o card com um indicador de carregamento
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
            <div class="task-status">Carregando detalhes...</div>
        </div>
        <div class="host-info">
            <div class="loading-host-info" style="text-align: center; padding: 15px;">
                <div class="spinner" style="display: inline-block;"></div>
                <span>Carregando informações dos hosts...</span>
            </div>
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
    
    // Adiciona event listeners
    const cancelBtn = card.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', function() {
        cancelExecution(this);
    });
    
    const toggleBtn = card.querySelector('.toggle-output-btn');
    toggleBtn.addEventListener('click', function() {
        toggleOutput(this);
    });
    
    // Busca os dados atualizados dos hosts em paralelo
    const hostPromises = Array.from(hosts).map(hostname => fetchUpdatedHostData(hostname));
    const hostsData = await Promise.all(hostPromises);
    
    // Constrói o HTML dos detalhes do host
    let hostDetailsHtml = '';
    hostsData.forEach(hostInfo => {
        const hostname = hostInfo.facts.hostname || '';
        const systemIcon = determineSystemIcon(hostInfo.facts.system || '');
        
        hostDetailsHtml += `
            <div class="host-details" data-host="${hostname}">
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                    </svg>
                    <strong>Hostname:</strong> ${hostInfo.facts.hostname || hostname}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <strong>IP Público:</strong> ${hostInfo.facts.public_ip || hostname}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <strong>IP Privado:</strong> ${hostInfo.facts.private_ip || hostname}
                </p>
                <p>
                    ${systemIcon}
                    <strong>Sistema:</strong> ${hostInfo.facts.system || 'Sistema não identificado'}
                </p>
            </div>
        `;
    });
    
    // Atualiza a área de informações do host
    const hostInfoArea = card.querySelector('.host-info');
    if (hostInfoArea) {
        hostInfoArea.innerHTML = hostDetailsHtml;
    }
    
    // Atualiza o status para "Em execução..."
    const statusDiv = card.querySelector('.task-status');
    if (statusDiv) {
        statusDiv.textContent = "Em execução...";
    }
    
    debugLog(`Card de execução criado para ${playbookName} com ID ${jobId}`);
    
    // Salva o estado atualizado na sessionStorage
    saveRunningJobsState();
    
    return card;
}

/**
 * Versão síncrona do createExecutionCard para compatibilidade
 * Usa os dados disponíveis no momento ou gera placeholders
 * @param {string} playbookName - Nome da playbook
 * @param {Set} hosts - Conjunto de hosts selecionados
 * @param {string} jobId - ID do job
 * @returns {HTMLElement} Card de execução
 */
function createExecutionCard(playbookName, hosts, jobId) {
    const card = document.createElement('div');
    card.className = `execution-card ${selectedPlaybooks.has(playbookName) ? 'selected' : ''}`;
    card.dataset.jobId = jobId;
    card.setAttribute('data-job-id', jobId);
    card.id = `job-${jobId}`;
    card.dataset.playbookName = playbookName;
    card.dataset.persistCard = "true";
    
    // Cria o conteúdo do card com os detalhes do host
    let hostDetailsHtml = '';
    Array.from(hosts).forEach(host => {
        const facts = hostData[host]?.facts || {};
        
        // Garantir que todas as informações do host sejam exibidas, mesmo que não existam
        const hostname = facts.hostname || host;
        const publicIp = facts.public_ip || host;
        const privateIp = facts.private_ip || host;
        const system = facts.system || 'Sistema não identificado';
        
        const systemIcon = determineSystemIcon(system);
        
        hostDetailsHtml += `
            <div class="host-details" data-host="${host}">
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                    </svg>
                    <strong>Hostname:</strong> ${hostname}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <strong>IP Público:</strong> ${publicIp}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <strong>IP Privado:</strong> ${privateIp}
                </p>
                <p>
                    ${systemIcon}
                    <strong>Sistema:</strong> ${system}
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
    
    // Adiciona event listeners
    const cancelBtn = card.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', function() {
        cancelExecution(this);
    });
    
    const toggleBtn = card.querySelector('.toggle-output-btn');
    toggleBtn.addEventListener('click', function() {
        toggleOutput(this);
    });
    
    // Inicia uma atualização assíncrona dos dados do host
    setTimeout(async () => {
        try {
            // Criar o card assíncrono com dados atualizados
            const updatedCard = await createExecutionCardAsync(playbookName, hosts, jobId);
            
            // Atualizar apenas a parte de informações do host
            const hostInfoArea = card.querySelector('.host-info');
            const updatedHostInfoArea = updatedCard.querySelector('.host-info');
            
            if (hostInfoArea && updatedHostInfoArea) {
                hostInfoArea.innerHTML = updatedHostInfoArea.innerHTML;
            }
            
            // Salvar estado atualizado
            saveRunningJobsState();
        } catch (error) {
            debugLog(`Erro ao atualizar card assincronamente: ${error.message}`, 'warning');
        }
    }, 100);
    
    debugLog(`Card de execução criado para ${playbookName} com ID ${jobId}`);
    return card;
}

/**
 * Função modificada para executar playbooks selecionadas
 * Versão que usa a função createExecutionCardAsync
 */
async function executeSelectedPlaybooksAsync() {
    debugLog('Iniciando execução das playbooks selecionadas (versão assíncrona)');

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

    try {
        // Busca os dados de playbooks para obter os caminhos
        const response = await fetch('/api/playbooks');
        if (!response.ok) throw new Error('Erro ao buscar playbooks');
        const allPlaybooks = await response.json();
        
        const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
        
        // Executa as playbooks selecionadas
        const playbooksList = Array.from(selectedPlaybooks);
        
        for (const playbookName of playbooksList) {
            const playbookPath = playbookMap.get(playbookName);
            if (!playbookPath) {
                showMessage(`Caminho da playbook ${playbookName} não encontrado`, 'error');
                continue;
            }

            const jobId = `${playbookName}_${Date.now()}`;
            
            try {
                // Criar card com dados atualizados
                const card = await createExecutionCardAsync(playbookName, selectedHosts, jobId);
                executionContainer.insertBefore(card, executionContainer.firstChild);

                const apiResponse = await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playbook: playbookPath,
                        hosts: Array.from(selectedHosts)
                    })
                });
                
                const data = await apiResponse.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                debugLog(`Playbook ${playbookName} iniciada com Job ID: ${data.job_id}`);
                runningJobs.set(data.job_id, card);
                card.dataset.jobId = data.job_id;
                
                // Iniciar monitoramento
                monitorPlaybookExecution(data.job_id, card);
                
                // Salvar estado atualizado
                saveRunningJobsState();
                
            } catch (error) {
                debugLog(`Erro ao iniciar playbook ${playbookName}: ${error.message}`, 'error');
                
                const card = document.querySelector(`#job-${jobId}`);
                if (card) {
                    card.classList.add('failed');
                    handlePlaybookCompletion('failed', card);
                    const outputDiv = card.querySelector('.ansible-output');
                    if (outputDiv) {
                        outputDiv.innerHTML = `<div style="color: var(--error-red);">${error.message}</div>`;
                        outputDiv.style.display = 'block';
                    }
                } else {
                    showMessage(`Erro ao iniciar playbook ${playbookName}: ${error.message}`, 'error');
                }
            }
        }
    } catch (error) {
        debugLog(`Erro ao buscar playbooks: ${error.message}`, 'error');
        showMessage(`Erro ao buscar playbooks: ${error.message}`, 'error');
    }

    updateExecuteButton();
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
    setInterval(saveRunningJobsState, 5000);
    
    // Adiciona event listeners para detectar navegação interna
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href.includes(window.location.origin)) {
            saveRunningJobsState();
        }
    });
    
    // Sobrescreve a função original com a versão assíncrona
    if (typeof window.executeSelectedPlaybooks === 'function') {
        window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
        window.executeSelectedPlaybooks = executeSelectedPlaybooksAsync;
    }
    
    debugLog('Persistência de cards inicializada e funções aprimoradas instaladas');
}

// Inicializa a persistência dos cards
initializeCardPersistence();
    
// Ajuste no monitoramento de execução para atualizar o estado
const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
if (originalMonitorPlaybookExecution) {
    window.monitorPlaybookExecution = function(jobId, card) {
        // Chamar a função original
        originalMonitorPlaybookExecution(jobId, card);
        
        // Atualizar dados do host periodicamente para garantir que estejam atualizados
        const updateHostInfo = setInterval(async () => {
            if (!document.body.contains(card)) {
                clearInterval(updateHostInfo);
                return;
            }
            
            try {
                // Obter hosts a partir do card
                const hostDetails = card.querySelectorAll('.host-details');
                const hosts = Array.from(hostDetails).map(detail => detail.getAttribute('data-host'));
                
                if (hosts.length === 0) {
                    clearInterval(updateHostInfo);
                    return;
                }
                
                // Verificar se algum host tem dados incompletos
                let needsUpdate = false;
                for (const hostname of hosts) {
                    if (!hostData[hostname] || !hostData[hostname].facts || !hostData[hostname].facts.hostname) {
                        needsUpdate = true;
                        break;
                    }
                }
                
                // Se precisar atualizar, buscar dados atualizados
                if (needsUpdate) {
                    const hostPromises = hosts.map(hostname => fetchUpdatedHostData(hostname));
                    await Promise.all(hostPromises);
                    
                    // Atualizar o HTML dos detalhes do host
                    let hostDetailsHtml = '';
                    hosts.forEach(hostname => {
                        const facts = hostData[hostname]?.facts || {};
                        const systemIcon = determineSystemIcon(facts.system || '');
                        
                        hostDetailsHtml += `
                            <div class="host-details" data-host="${hostname}">
                                <p>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                        <path d="M8 21h8"></path>
                                        <path d="M12 17v4"></path>
                                    </svg>
                                    <strong>Hostname:</strong> ${facts.hostname || hostname}
                                </p>
                                <p>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="2" y1="12" x2="22" y2="12"></line>
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                    </svg>
                                    <strong>IP Público:</strong> ${facts.public_ip || hostname}
                                </p>
                                <p>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <strong>IP Privado:</strong> ${facts.private_ip || hostname}
                                </p>
                                <p>
                                    ${systemIcon}
                                    <strong>Sistema:</strong> ${facts.system || 'Sistema não identificado'}
                                </p>
                            </div>
                        `;
                    });
                    
                    // Atualizar o HTML do card
                    const hostInfoDiv = card.querySelector('.host-info');
                    if (hostInfoDiv) {
                        hostInfoDiv.innerHTML = hostDetailsHtml;
                    }
                    
                    // Salvar o estado atualizado
                    saveRunningJobsState();
                }
            } catch (error) {
                debugLog(`Erro ao atualizar informações do host: ${error.message}`, 'warning');
            }
        }, 10000); // Verifica a cada 10 segundos
        
        // Salva o estado após iniciar o monitoramento
        saveRunningJobsState();
    };
}

// Sobrescrever handlePlaybookCompletion para garantir que o estado seja salvo
const originalHandlePlaybookCompletion = window.handlePlaybookCompletion;
if (originalHandlePlaybookCompletion) {
    window.handlePlaybookCompletion = function(status, card) {
        // Chamar a função original
        originalHandlePlaybookCompletion(status, card);
        
        // Garantir que o estado seja salvo após a conclusão
        setTimeout(saveRunningJobsState, 100);
    };
}

debugLog('Configuração completa de persistência concluída');
});

/**
* Override da função formata o sistema na saída para corrigir o problema de duplicação
*/
function formatSystemOutput(output) {
if (!output) return output;

// Procura por padrões como "Sistema: Linux Sistema: Linux" e corrige
const duplicateSystemPattern = /Sistema:\s+([^:]+)\s+Sistema:\s+/g;
output = output.replace(duplicateSystemPattern, 'Sistema: ');

// Procura por padrões como "Hostname: srv-01 Hostname: srv-01" e corrige
const duplicateHostnamePattern = /Hostname:\s+([^:]+)\s+Hostname:\s+/g;
output = output.replace(duplicateHostnamePattern, 'Hostname: ');

// Procura por padrões como "IP Público: 1.2.3.4 IP Público: 1.2.3.4" e corrige
const duplicateIPPublicPattern = /IP Público:\s+([^:]+)\s+IP Público:\s+/g;
output = output.replace(duplicateIPPublicPattern, 'IP Público: ');

// Procura por padrões como "IP Privado: 10.0.0.1 IP Privado: 10.0.0.1" e corrige
const duplicateIPPrivatePattern = /IP Privado:\s+([^:]+)\s+IP Privado:\s+/g;
output = output.replace(duplicateIPPrivatePattern, 'IP Privado: ');

return output;
}

/**
* Intercepta a função formatAnsibleOutput para aplicar a correção de duplicação
*/
(function() {
// Guarda a referência para a função original
const originalFormatAnsibleOutput = window.formatAnsibleOutput;

// Substitui por uma versão que aplica nossa correção
window.formatAnsibleOutput = function(output) {
    // Aplica a correção para remover duplicações
    const correctedOutput = formatSystemOutput(output);
    
    // Chama a função original com a saída corrigida
    return originalFormatAnsibleOutput(correctedOutput);
};
})();

/**
* Função extra para sincronizar os dados de hostData com a API regularmente
* Isso garante que sempre tenhamos dados atualizados
*/
function setupHostDataSynchronization() {
// Sincroniza os dados a cada 5 minutos
setInterval(async () => {
    try {
        // Obter lista de hosts atualmente em uso
        const activeHosts = new Set();
        
        // Adicionar hosts selecionados
        selectedHosts.forEach(host => activeHosts.add(host));
        
        // Adicionar hosts de jobs em execução
        document.querySelectorAll('.execution-card .host-details').forEach(hostDetail => {
            const hostname = hostDetail.getAttribute('data-host');
            if (hostname) activeHosts.add(hostname);
        });
        
        // Se não temos hosts ativos, não precisa sincronizar
        if (activeHosts.size === 0) return;
        
        // Buscar dados atualizados para cada host ativo
        const hostPromises = Array.from(activeHosts).map(hostname => fetchUpdatedHostData(hostname));
        await Promise.all(hostPromises);
        
        // Atualizar os dados na sessionStorage
        saveRunningJobsState();
        
        debugLog(`Sincronização de dados de host concluída para ${activeHosts.size} hosts`);
    } catch (error) {
        debugLog(`Erro na sincronização de dados de host: ${error.message}`, 'warning');
    }
}, 300000); // 5 minutos = 300000ms

debugLog('Sincronização automática de dados de host configurada');
}

// Adiciona a inicialização da sincronização no carregamento da página
document.addEventListener('DOMContentLoaded', function() {
setTimeout(setupHostDataSynchronization, 5000); // Atraso para garantir que tudo esteja inicializado
});

// Exportação das funções para uso global
window.createExecutionCard = createExecutionCard;
window.createExecutionCardAsync = createExecutionCardAsync;
window.saveRunningJobsState = saveRunningJobsState;
window.restoreRunningJobsState = restoreRunningJobsState;
window.restoreHostData = restoreHostData;
window.executeSelectedPlaybooksAsync = executeSelectedPlaybooksAsync;
window.initializeCardPersistence = initializeCardPersistence;
window.fetchUpdatedHostData = fetchUpdatedHostData;
window.formatSystemOutput = formatSystemOutput;