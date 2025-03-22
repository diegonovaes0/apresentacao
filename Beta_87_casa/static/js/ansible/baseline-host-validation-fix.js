/**
 * baseline-output-fix-v2.js
 * 
 * Correção para problemas de exibição da saída e barra de progresso
 * para execuções do Ansible Baseline
 * 
 * Esta versão corrige problemas específicos com a exibição da saída e
 * força a renderização adequada do conteúdo nos logs.
 */

(function() {
    console.log("[Baseline Fix V2] Iniciando correções para exibição de saída do Ansible");

    // Configurações
    const CONFIG = {
        // Intervalo para verificação de saída (ms)
        refreshInterval: 1500,
        
        // Tempo para verificação inicial (ms)
        initialDelay: 500,
        
        // Intervalo para verificação se está executando uma baseline
        checkInterval: 5000
    };

    /**
     * Melhora a exibição da saída do Ansible
     */
    function fixAnsibleOutput() {
        console.log("[Baseline Fix V2] Aplicando correções para exibição da saída");
        
        // 1. Substituir a função toggleOutput para garantir que a saída seja exibida
        replaceToggleOutputFunction();
        
        // 2. Adicionar evento para cliques no botão "Ver Mais"
        setupToggleOutputButtonEvents();
        
        // 3. Corrigir a função de formatação da saída
        enhanceOutputFormatting();
        
        // 4. Adicionar evento para cliques nos botões de log
        setupLogToggleEvents();
        
        // 5. Corrigir a função de monitoramento
        enhanceMonitoringFunction();
        
        // 6. Corrigir a barra de progresso
        fixProgressBars();
        
        // 7. Verificar periodicamente se há novos cards de baseline
        startBaselineWatcher();
    }

    /**
     * Substitui a função toggleOutput para garantir exibição correta da saída
     */
    function replaceToggleOutputFunction() {
        if (typeof window.toggleOutput === 'function' && 
            typeof window.originalToggleOutput === 'undefined') {
            
            window.originalToggleOutput = window.toggleOutput;
            
            window.toggleOutput = function(button) {
                console.log("[Baseline Fix V2] Função toggleOutput interceptada");
                
                try {
                    // Obter elementos relevantes
                    const card = button.closest('.execution-card');
                    if (!card) {
                        console.error("[Baseline Fix V2] Card não encontrado");
                        return window.originalToggleOutput.apply(this, arguments);
                    }
                    
                    const jobId = card.getAttribute('data-job-id');
                    if (!jobId) {
                        console.error("[Baseline Fix V2] Job ID não encontrado");
                        return window.originalToggleOutput.apply(this, arguments);
                    }
                    
                    const output = card.querySelector('.ansible-output');
                    if (!output) {
                        console.error("[Baseline Fix V2] Output não encontrado");
                        return window.originalToggleOutput.apply(this, arguments);
                    }
                    
                    // Verificar o estado atual
                    const isVisible = output.style.display === 'block';
                    const newState = !isVisible;
                    
                    console.log(`[Baseline Fix V2] Alterando visibilidade da saída: ${newState ? 'mostrar' : 'ocultar'}`);
                    
                    // Atualizar visibilidade
                    output.style.display = newState ? 'block' : 'none';
                    
                    // Atualizar texto do botão
                    button.innerHTML = newState ? 
                        `Ver Menos<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>` : 
                        `Ver Mais<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
                    
                    // Se estamos exibindo a saída, busque a saída atualizada
                    if (newState) {
                        console.log(`[Baseline Fix V2] Buscando saída atualizada para ${jobId}`);
                        
                        // Definir estado intermediário
                        output.innerHTML = '<div style="padding: 15px; text-align: center;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(255, 214, 0, 0.3); border-radius: 50%; border-top-color: var(--accent-gold); animation: ansible-spin 1s linear infinite;"></div> Carregando saída...</div>';
                        
                        // Buscar dados atualizados
                        fetch(`/api/status/${jobId}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Erro ao buscar status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                // Verificar se a saída ainda deve ser exibida
                                if (output.style.display !== 'block') {
                                    console.log("[Baseline Fix V2] Saída não está mais visível, ignorando atualização");
                                    return;
                                }
                                
                                if (data.output) {
                                    // Formatar e exibir a saída
                                    if (typeof window.formatAnsibleOutput === 'function') {
                                        output.innerHTML = window.formatAnsibleOutput(data.output);
                                    } else {
                                        output.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace;">${data.output}</pre>`;
                                    }
                                    
                                    // Rolar para o final para ver conteúdo mais recente
                                    output.scrollTop = output.scrollHeight;
                                    
                                    console.log("[Baseline Fix V2] Saída atualizada com sucesso");
                                } else {
                                    output.innerHTML = '<div style="padding: 15px;">Aguardando dados da execução...</div>';
                                }
                                
                                // Agendar nova verificação se estiver em execução
                                if (data.status === 'running') {
                                    setTimeout(() => {
                                        if (output.style.display === 'block') {
                                            fetchAndUpdateOutput(jobId, output);
                                        }
                                    }, CONFIG.refreshInterval);
                                }
                            })
                            .catch(error => {
                                console.error(`[Baseline Fix V2] Erro ao buscar saída: ${error.message}`);
                                output.innerHTML = `<div style="color: red; padding: 15px;">Erro ao carregar saída: ${error.message}</div>`;
                            });
                    }
                    
                    return;
                } catch (error) {
                    console.error(`[Baseline Fix V2] Erro ao processar toggle: ${error.message}`);
                    // Em caso de erro, usar função original
                    return window.originalToggleOutput.apply(this, arguments);
                }
            };
            
            console.log("[Baseline Fix V2] Função toggleOutput substituída com sucesso");
        } else {
            console.warn("[Baseline Fix V2] Função toggleOutput não encontrada ou já substituída");
        }
    }

    /**
     * Configura eventos para o botão "Ver Mais"
     */
    function setupToggleOutputButtonEvents() {
        // Adicionar evento global para cliques no botão "Ver Mais"
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('toggle-output-btn') || 
                e.target.closest('.toggle-output-btn')) {
                
                const button = e.target.classList.contains('toggle-output-btn') ? 
                               e.target : e.target.closest('.toggle-output-btn');
                               
                const card = button.closest('.execution-card');
                if (!card) return;
                
                const jobId = card.getAttribute('data-job-id');
                if (!jobId) return;
                
                // Verificar se o botão indica que a saída deve ser mostrada
                if (button.textContent.includes('Ver Mais')) {
                    console.log(`[Baseline Fix V2] Clique no botão Ver Mais detectado para ${jobId}`);
                    
                    // Marcar card para monitoramento contínuo
                    card.setAttribute('data-continuous-update', 'true');
                    
                    // Forçar uma atualização imediata após o toggle padrão
                    setTimeout(() => {
                        const output = card.querySelector('.ansible-output');
                        if (output && output.style.display === 'block') {
                            fetchAndUpdateOutput(jobId, output);
                        }
                    }, 100);
                }
            }
        }, true);
        
        console.log("[Baseline Fix V2] Eventos de botão 'Ver Mais' configurados");
    }

    /**
     * Melhora a formatação da saída do Ansible
     */
    function enhanceOutputFormatting() {
        if (typeof window.formatAnsibleOutput === 'function' && 
            typeof window.originalFormatAnsibleOutput === 'undefined') {
            
            window.originalFormatAnsibleOutput = window.formatAnsibleOutput;
            
            window.formatAnsibleOutput = function(output) {
                if (!output) {
                    return '<div style="padding: 15px; color: #777;">Aguardando saída...</div>';
                }
                
                try {
                    // Tentar usar a função original
                    return window.originalFormatAnsibleOutput.apply(this, arguments);
                } catch (error) {
                    console.error(`[Baseline Fix V2] Erro ao formatar saída: ${error.message}`);
                    
                    // Formatação de fallback simples
                    let html = '<div style="font-family: monospace; white-space: pre-wrap; padding: 10px;">';
                    
                    // Dividir por linhas
                    const lines = output.split('\n');
                    
                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            html += '<br>';
                            return;
                        }
                        
                        // Colorir diferentes tipos de linhas
                        if (line.startsWith('PLAY') || line.includes('PLAY RECAP')) {
                            html += `<div style="color: #569cd6; font-weight: bold; margin-top: 8px;">${line}</div>`;
                        } else if (line.startsWith('TASK')) {
                            html += `<div style="color: #9cdcfe; font-weight: bold; margin-top: 6px;">${line}</div>`;
                        } else if (line.match(/^ok:/)) {
                            html += `<div style="color: #4ec9b0;">${line}</div>`;
                        } else if (line.match(/^changed:/)) {
                            html += `<div style="color: #dcdcaa;">${line}</div>`;
                        } else if (line.match(/^failed:/)) {
                            html += `<div style="color: #f14c4c;">${line}</div>`;
                        } else {
                            html += `<div>${line}</div>`;
                        }
                    });
                    
                    html += '</div>';
                    return html;
                }
            };
            
            console.log("[Baseline Fix V2] Função formatAnsibleOutput melhorada");
        }
    }

    /**
     * Configura eventos para os botões de log
     */
    function setupLogToggleEvents() {
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('log-toggle') || 
                e.target.closest('.log-toggle')) {
                
                const button = e.target.classList.contains('log-toggle') ? 
                               e.target : e.target.closest('.log-toggle');
                               
                const hostname = button.getAttribute('data-hostname');
                if (!hostname) return;
                
                const card = button.closest('.execution-card');
                if (!card) return;
                
                const jobId = card.getAttribute('data-job-id');
                if (!jobId) return;
                
                // Verificar se estamos mostrando ou ocultando o log
                const isShowing = button.textContent.includes('Ocultar');
                
                if (isShowing) {
                    console.log(`[Baseline Fix V2] Mostrando log para ${hostname} no job ${jobId}`);
                    
                    // Forçar atualização do log
                    const safeLogId = generateSafeLogId(hostname);
                    const logContent = document.getElementById(`baseline-log-content-${safeLogId}`);
                    
                    if (logContent) {
                        // Mostrar carregamento
                        logContent.innerHTML = '<div class="log-line">Carregando dados...</div>';
                        
                        // Forçar atualização
                        forceUpdateHostLog(jobId, hostname);
                    }
                }
            }
        }, true);
        
        console.log("[Baseline Fix V2] Eventos de botão de log configurados");
    }

    /**
     * Melhora a função de monitoramento do Ansible
     */
    function enhanceMonitoringFunction() {
        if (typeof window.monitorPlaybookExecution === 'function' && 
            typeof window.originalMonitoringExecution === 'undefined') {
            
            window.originalMonitoringExecution = window.monitorPlaybookExecution;
            
            window.monitorPlaybookExecution = function(jobId, card) {
                console.log(`[Baseline Fix V2] Monitorando execução de ${jobId}`);
                
                // Chamar a função original
                window.originalMonitoringExecution.apply(this, arguments);
                
                // Verificar se é um baseline
                const playbookName = card.getAttribute('data-playbook-name');
                if (playbookName && isBaselinePlaybook(playbookName)) {
                    console.log(`[Baseline Fix V2] Monitoramento especial para baseline: ${playbookName}`);
                    
                    // Configurar monitoramento contínuo para todos os hosts
                    const hostDetails = card.querySelectorAll('.host-details');
                    
                    if (hostDetails.length > 0) {
                        hostDetails.forEach(hostDetail => {
                            const hostname = hostDetail.getAttribute('data-host');
                            if (hostname) {
                                setupContinuousMonitoring(jobId, hostname, card);
                            }
                        });
                    }
                    
                    // Monitorar a saída geral
                    setupContinuousOutputUpdate(jobId, card);
                }
            };
            
            console.log("[Baseline Fix V2] Função monitorPlaybookExecution melhorada");
        }
    }

    /**
     * Configura monitoramento contínuo para um host específico
     * @param {string} jobId - ID do job
     * @param {string} hostname - Nome do host
     * @param {HTMLElement} card - Card de execução
     */
    function setupContinuousMonitoring(jobId, hostname, card) {
        console.log(`[Baseline Fix V2] Configurando monitoramento contínuo para ${hostname} no job ${jobId}`);
        
        // Verificar periodicamente a saída do host
        const monitoringId = setInterval(() => {
            if (!document.body.contains(card)) {
                console.log(`[Baseline Fix V2] Card removido, parando monitoramento para ${hostname}`);
                clearInterval(monitoringId);
                return;
            }
            
            // Verificar se o log está visível
            const safeLogId = generateSafeLogId(hostname);
            const logElement = card.querySelector(`#${safeLogId}`);
            
            if (logElement && logElement.style.display === 'block') {
                console.log(`[Baseline Fix V2] Atualizando log para ${hostname}`);
                forceUpdateHostLog(jobId, hostname);
            }
            
            // Verificar se o job ainda está em execução
            fetch(`/api/status/${jobId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status !== 'running') {
                        console.log(`[Baseline Fix V2] Job ${jobId} concluído, parando monitoramento para ${hostname}`);
                        clearInterval(monitoringId);
                        
                        // Forçar uma última atualização
                        forceUpdateHostLog(jobId, hostname);
                    }
                })
                .catch(error => {
                    console.error(`[Baseline Fix V2] Erro ao verificar status para ${hostname}: ${error.message}`);
                });
        }, CONFIG.refreshInterval);
        
        // Armazenar ID do intervalo para referência
        card.setAttribute(`data-monitor-${hostname}`, monitoringId);
    }

    /**
     * Configura atualização contínua da saída geral
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Card de execução
     */
    function setupContinuousOutputUpdate(jobId, card) {
        console.log(`[Baseline Fix V2] Configurando atualização contínua da saída para ${jobId}`);
        
        // Verificar periodicamente a saída geral
        const updateId = setInterval(() => {
            if (!document.body.contains(card)) {
                console.log(`[Baseline Fix V2] Card removido, parando atualização para ${jobId}`);
                clearInterval(updateId);
                return;
            }
            
            // Verificar se a saída está visível
            const output = card.querySelector('.ansible-output');
            if (output && output.style.display === 'block') {
                console.log(`[Baseline Fix V2] Atualizando saída para ${jobId}`);
                fetchAndUpdateOutput(jobId, output);
            }
            
            // Verificar status do job
            fetch(`/api/status/${jobId}`)
                .then(response => response.json())
                .then(data => {
                    // Atualizar barra de progresso
                    updateProgressBar(card, data.progress || 0);
                    
                    // Parar se o job foi concluído
                    if (data.status !== 'running') {
                        console.log(`[Baseline Fix V2] Job ${jobId} concluído, parando atualização`);
                        clearInterval(updateId);
                        
                        // Definir progresso para 100%
                        updateProgressBar(card, 100, data.status);
                        
                        // Forçar uma última atualização da saída se estiver visível
                        if (output && output.style.display === 'block') {
                            fetchAndUpdateOutput(jobId, output);
                        }
                    }
                })
                .catch(error => {
                    console.error(`[Baseline Fix V2] Erro ao verificar status para ${jobId}: ${error.message}`);
                });
        }, CONFIG.refreshInterval);
        
        // Armazenar ID do intervalo para referência
        card.setAttribute('data-output-update', updateId);
    }

    /**
     * Busca e atualiza a saída de um job
     * @param {string} jobId - ID do job
     * @param {HTMLElement} outputElement - Elemento da saída
     */
    function fetchAndUpdateOutput(jobId, outputElement) {
        console.log(`[Baseline Fix V2] Buscando saída para ${jobId}`);
        
        fetch(`/api/status/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output) {
                    // Formatar e exibir a saída
                    if (typeof window.formatAnsibleOutput === 'function') {
                        outputElement.innerHTML = window.formatAnsibleOutput(data.output);
                    } else {
                        outputElement.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace;">${data.output}</pre>`;
                    }
                    
                    // Rolar para o final para ver conteúdo mais recente
                    outputElement.scrollTop = outputElement.scrollHeight;
                    
                    console.log(`[Baseline Fix V2] Saída atualizada para ${jobId}`);
                } else {
                    outputElement.innerHTML = '<div style="padding: 15px;">Aguardando dados da execução...</div>';
                }
            })
            .catch(error => {
                console.error(`[Baseline Fix V2] Erro ao buscar saída: ${error.message}`);
                outputElement.innerHTML = `<div style="color: red; padding: 15px;">Erro ao carregar saída: ${error.message}</div>`;
            });
    }

    /**
     * Força a atualização do log de um host específico
     * @param {string} jobId - ID do job
     * @param {string} hostname - Nome do host
     */
    function forceUpdateHostLog(jobId, hostname) {
        console.log(`[Baseline Fix V2] Forçando atualização do log para ${hostname} no job ${jobId}`);
        
        // Obter o ID do job real (sem o prefixo do hostname)
        const realJobId = jobId.includes('-') ? jobId.split('-')[0] : jobId;
        
        // ID seguro para seletor CSS
        const safeLogId = generateSafeLogId(hostname);
        
        // Buscar elemento do log
        const logContent = document.getElementById(`baseline-log-content-${safeLogId}`);
        if (!logContent) {
            console.warn(`[Baseline Fix V2] Container de log não encontrado para ${hostname}`);
            return;
        }
        
        // Buscar status do job
        fetch(`/api/status/${realJobId}`)
            .then(response => response.json())
            .then(data => {
                if (!data) {
                    logContent.innerHTML = `<div class="log-line">Aguardando dados...</div>`;
                    return;
                }
                
                // Filtrar a saída para este host
                const output = data.output ? filterOutputForHost(data.output, hostname) : '';
                
                // Renderizar o output
                if (typeof window.renderHostLog === 'function') {
                    // Armazenar no cache
                    if (window.baselineValidation && window.baselineValidation.STATE) {
                        window.baselineValidation.STATE.outputCache.set(hostname, output);
                    }
                    
                    // Renderizar
                    window.renderHostLog(hostname, output, logContent);
                } else {
                    // Fallback para exibição simples
                    if (output) {
                        logContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace;">${output}</pre>`;
                    } else {
                        logContent.innerHTML = '<div class="log-line">Aguardando dados...</div>';
                    }
                }
            })
            .catch(error => {
                console.error(`[Baseline Fix V2] Erro ao atualizar log: ${error.message}`);
                logContent.innerHTML = `<div class="log-line" style="color: red">Erro ao buscar dados: ${error.message}</div>`;
            });
    }

    /**
     * Filtra a saída do Ansible para um host específico
     * @param {string} output - Saída do Ansible
     * @param {string} hostname - Nome do host
     * @return {string} Saída filtrada
     */
    function filterOutputForHost(output, hostname) {
        if (!output) return '';
        
        // Dividir por linhas
        const lines = output.split('\n');
        
        // Filtrar apenas linhas relevantes para este host
        const relevantLines = lines.filter(line => {
            // Incluir linhas gerais
            if (line.includes('PLAY') || line.includes('TASK')) return true;
            
            // Incluir linhas específicas para este host
            return line.includes(`[${hostname}]`) || 
                   line.toLowerCase().includes(hostname.toLowerCase());
        });
        
        return relevantLines.join('\n');
    }

    /**
     * Gera um ID seguro para seletor CSS
     * @param {string} hostname - Nome do host
     * @return {string} ID seguro
     */
    function generateSafeLogId(hostname) {
        return `baseline-log-${hostname.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '-')}`;
    }

    /**
     * Verifica se uma playbook é do tipo baseline
     * @param {string} name - Nome da playbook
     * @return {boolean} Verdadeiro se for baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const lowerName = name.toLowerCase();
        return lowerName.includes('baseline') || lowerName.includes('configuracao-base');
    }

    /**
     * Corrige as barras de progresso
     */
    function fixProgressBars() {
        console.log("[Baseline Fix V2] Corrigindo barras de progresso");
        
        // Encontrar todas as barras de progresso em cards de baseline
        document.querySelectorAll('.execution-card').forEach(card => {
            const playbookName = card.getAttribute('data-playbook-name');
            if (playbookName && isBaselinePlaybook(playbookName)) {
                const progressBar = card.querySelector('.progress-bar');
                const progressContainer = card.querySelector('.progress-container');
                
                if (progressBar && progressContainer) {
                    // Forçar visibilidade
                    progressContainer.style.display = 'block';
                    progressBar.style.transition = 'width 0.3s ease';
                    progressBar.style.backgroundColor = '#0e639c';
                    
                    // Verificar status atual
                    const jobId = card.getAttribute('data-job-id');
                    if (jobId) {
                        fetch(`/api/status/${jobId}`)
                            .then(response => response.json())
                            .then(data => {
                                // Atualizar o progresso
                                updateProgressBar(card, data.progress || 0, data.status);
                            })
                            .catch(error => {
                                console.error(`[Baseline Fix V2] Erro ao buscar status para barra de progresso: ${error.message}`);
                            });
                    }
                }
            }
        });
    }

    /**
     * Atualiza a barra de progresso
     * @param {HTMLElement} card - Card de execução
     * @param {number} progress - Valor do progresso (0-100)
     * @param {string} status - Status da execução
     */
    function updateProgressBar(card, progress, status) {
        const progressBar = card.querySelector('.progress-bar');
        if (!progressBar) return;
        
        // Atualizar valor
        progressBar.style.width = `${progress}%`;
        
        // Atualizar cor baseada no status
        if (status) {
            switch (status) {
                case 'completed':
                    progressBar.style.backgroundColor = '#4CAF50'; // Verde
                    break;
                    
                case 'failed':
                    progressBar.style.backgroundColor = '#F44336'; // Vermelho
                    break;
                    
                case 'cancelled':
                    progressBar.style.backgroundColor = '#FF9800'; // Laranja
                    break;
                    
                default:
                    progressBar.style.backgroundColor = '#0e639c'; // Azul
            }
        }
    }

    /**
     * Inicia um observador para cards de baseline
     */
    function startBaselineWatcher() {
        console.log("[Baseline Fix V2] Iniciando monitoramento de cards de baseline");
        
        // Verificar periodicamente por novos cards de baseline
        setInterval(() => {
            console.log("[Baseline Fix V2] Verificando cards de baseline");
            
            document.querySelectorAll('.execution-card').forEach(card => {
                const playbookName = card.getAttribute('data-playbook-name');
                if (playbookName && isBaselinePlaybook(playbookName)) {
                    // Verificar se já está sendo monitorado
                    if (!card.hasAttribute('data-baseline-monitored')) {
                        console.log(`[Baseline Fix V2] Novo card de baseline detectado: ${playbookName}`);
                        
                        // Marcar como monitorado
                        card.setAttribute('data-baseline-monitored', 'true');
                        
                        // Verificar host details
                        const hostDetails = card.querySelectorAll('.host-details');
                        if (hostDetails.length > 0) {
                            // Configurar monitoramento para cada host
                            hostDetails.forEach(hostDetail => {
                                const hostname = hostDetail.getAttribute('data-host');
                                if (hostname) {
                                    // Obter o jobId
                                    const jobId = card.getAttribute('data-job-id');
                                    if (jobId) {
                                        // Configurar monitoramento
                                        setupContinuousMonitoring(jobId, hostname, card);
                                    }
                                }
                            });
                        }
                        
                        // Configurar atualização de saída geral
                        const jobId = card.getAttribute('data-job-id');
                        if (jobId) {
                            setupContinuousOutputUpdate(jobId, card);
                        }
                        
                        // Corrigir barra de progresso
                        const progressBar = card.querySelector('.progress-bar');
                        const progressContainer = card.querySelector('.progress-container');
                        
                        if (progressBar && progressContainer) {
                            progressContainer.style.display = 'block';
                            progressBar.style.transition = 'width 0.3s ease';
                        }
                    }
                }
            });
        }, CONFIG.checkInterval);
    }

   /**
     * Força a atualização de todas as saídas e logs
     */
   function forceUpdateAllOutputs() {
    console.log("[Baseline Fix V2] Forçando atualização de todas as saídas e logs");
    
    // Atualizar saídas gerais
    document.querySelectorAll('.execution-card').forEach(card => {
        const jobId = card.getAttribute('data-job-id');
        if (!jobId) return;
        
        const output = card.querySelector('.ansible-output');
        if (output && output.style.display === 'block') {
            fetchAndUpdateOutput(jobId, output);
        }
        
        // Atualizar logs de hosts
        card.querySelectorAll('.log-toggle').forEach(button => {
            const hostname = button.getAttribute('data-hostname');
            if (!hostname) return;
            
            // Verificar se o log está visível
            const safeLogId = generateSafeLogId(hostname);
            const logElement = card.querySelector(`#${safeLogId}`);
            
            if (logElement && logElement.style.display === 'block') {
                forceUpdateHostLog(`${jobId}-${hostname}`, hostname);
            }
        });
        
        // Atualizar barra de progresso
        fetch(`/api/status/${jobId}`)
            .then(response => response.json())
            .then(data => {
                updateProgressBar(card, data.progress || 0, data.status);
            })
            .catch(error => {
                console.error(`[Baseline Fix V2] Erro ao buscar status: ${error.message}`);
            });
    });
}

/**
 * Corrige imediatamente o problema dos logs vazios
 */
function fixEmptyLogs() {
    console.log("[Baseline Fix V2] Corrigindo logs vazios");
    
    // Verificar todos os logs de host exibidos
    document.querySelectorAll('.baseline-log').forEach(log => {
        if (log.style.display === 'block') {
            // Obter hostname do ID
            const idParts = log.id.split('-');
            if (idParts.length < 3) return;
            
            // Tentar reconstruir o hostname a partir do ID
            const hostname = idParts.slice(2).join('.').replace(/-/g, '.');
            
            // Buscar o card pai
            const card = log.closest('.execution-card');
            if (!card) return;
            
            // Obter o jobId
            const jobId = card.getAttribute('data-job-id');
            if (!jobId) return;
            
            // Buscar conteúdo do log
            const logContent = log.querySelector('.baseline-log-content');
            if (!logContent) return;
            
            const contentText = logContent.textContent.trim();
            if (contentText === 'Aguardando dados...' || contentText === '') {
                console.log(`[Baseline Fix V2] Atualizando log vazio para ${hostname}`);
                forceUpdateHostLog(`${jobId}-${hostname}`, hostname);
            }
        }
    });
}

/**
 * Força a exibição das saídas visíveis
 */
function forceShowOutputs() {
    console.log("[Baseline Fix V2] Forçando exibição das saídas");
    
    // Verificar todos os botões "Ver Mais" que mostram que a saída está visível
    document.querySelectorAll('.toggle-output-btn').forEach(button => {
        if (button.textContent.includes('Ver Menos')) {
            const card = button.closest('.execution-card');
            if (!card) return;
            
            const output = card.querySelector('.ansible-output');
            if (!output) return;
            
            // Forçar visibilidade
            output.style.display = 'block';
            
            // Obter o jobId
            const jobId = card.getAttribute('data-job-id');
            if (!jobId) return;
            
            // Atualizar a saída
            fetchAndUpdateOutput(jobId, output);
        }
    });
    
    // Verificar todos os botões de log que mostram que o log está visível
    document.querySelectorAll('.log-toggle').forEach(button => {
        if (button.textContent.includes('Ocultar')) {
            const hostname = button.getAttribute('data-hostname');
            if (!hostname) return;
            
            const card = button.closest('.execution-card');
            if (!card) return;
            
            // Obter o jobId
            const jobId = card.getAttribute('data-job-id');
            if (!jobId) return;
            
            // Verificar elemento de log
            const safeLogId = generateSafeLogId(hostname);
            const logElement = document.getElementById(`${safeLogId}`);
            
            if (logElement) {
                // Forçar visibilidade
                logElement.style.display = 'block';
                
                // Atualizar o log
                forceUpdateHostLog(`${jobId}-${hostname}`, hostname);
            }
        }
    });
}

// ----- Inicialização -----

// Verificar se já está inicializado
if (window.baselineFixV2Initialized) {
    console.log("[Baseline Fix V2] Já inicializado, executando apenas correções imediatas");
    fixEmptyLogs();
    forceShowOutputs();
    forceUpdateAllOutputs();
    return;
}

// Aplicar correções
fixAnsibleOutput();

// Corrigir logs vazios e forçar exibição após um curto atraso
setTimeout(() => {
    fixEmptyLogs();
    forceShowOutputs();
    forceUpdateAllOutputs();
}, CONFIG.initialDelay);

// Expor funções úteis globalmente
window.baselineFixV2 = {
    forceUpdateAllOutputs,
    fixEmptyLogs,
    forceShowOutputs
};

// Marcar como inicializado
window.baselineFixV2Initialized = true;

console.log("[Baseline Fix V2] Correções aplicadas com sucesso");
})();