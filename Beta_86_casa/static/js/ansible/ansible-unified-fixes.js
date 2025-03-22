/**
 * ansible-unified-fixes.js
 * 
 * Solução completa para problemas do Ansible:
 * - Corrige a saída do baseline para múltiplos hosts
 * - Normaliza o comportamento do baseline como outras playbooks
 * - Corrige problema da barra de progresso que "vai e volta"
 * - Implementa persistência de cards entre navegações
 * - Remove a necessidade de múltiplos scripts conflitantes
 * 
 * @version 2.0.0
 */

(function() {
    console.log("Inicializando solução unificada para Ansible");
    
    // Verificar se já inicializado
    if (window.unifiedFixesInitialized) {
        console.log("Solução unificada já inicializada, ignorando");
        return;
    }
    
    // =======================================
    // CONFIGURAÇÕES
    // =======================================
    const CONFIG = {
        // Configurações de baseline
        baselineKeywords: ['baseline', 'configuracao-base', 'config-base'],
        
        // Seletores para elementos DOM importantes
        selectors: {
            runningPlaybooks: '#running-playbooks',
            hostsContainer: '#hosts-list',
            playbooksContainer: '#playbooks'
        },
        
        // Configurações de persistência
        persistenceKey: 'ansible_running_jobs',
        storageType: 'sessionStorage', // 'localStorage' ou 'sessionStorage'
        
        // Intervalos de tempo
        progressUpdateInterval: 2000,  // intervalo para atualizar o progresso (ms)
        persistenceInterval: 5000,     // intervalo para salvar o estado (ms)
        
        // Configurações visuais
        progressColors: {
            running: 'var(--accent-gold, #FFD600)',
            success: '#4CAF50',
            failed: '#F44336',
            cancelled: '#FF9800'
        },
        
        // Flags de depuração
        debug: true
    };
    
    // =======================================
    // UTILITÁRIOS
    // =======================================
    
    /**
     * Função para logs
     * @param {string} message - Mensagem a ser registrada
     * @param {string} level - Nível do log (info, warn, error)
     */
    function log(message, level = 'info') {
        if (!CONFIG.debug && level === 'info') return;
        
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[Ansible Fix ${timestamp}]`;
        
        switch (level) {
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
     * @param {string} name - Nome da playbook
     * @return {boolean} - Verdadeiro se for baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return CONFIG.baselineKeywords.some(keyword => nameLower.includes(keyword));
    }
    
    /**
     * Verifica se uma string é um seletor válido
     * @param {string} selector - O seletor a ser verificado
     * @return {boolean} Se o seletor é válido
     */
    function isValidSelector(selector) {
        try {
            document.querySelector(selector);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Espera até que um elemento exista no DOM
     * @param {string} selector - Seletor do elemento
     * @param {number} timeout - Tempo máximo de espera em ms
     * @return {Promise<Element>} Promise com o elemento
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Definir timeout
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout esperando por ${selector}`));
            }, timeout);
        });
    }
    
    /**
     * Gera um ID único que pode ser usado como seletor
     * @param {string} prefix - Prefixo para o ID
     * @return {string} ID único
     */
    function generateUniqueId(prefix = 'ansible-id-') {
        return prefix + Math.random().toString(36).substring(2, 11);
    }
    
    /**
     * Obtém um elemento de armazenamento (localStorage ou sessionStorage)
     * @return {Storage} O objeto de armazenamento
     */
    function getStorage() {
        return CONFIG.storageType === 'localStorage' ? localStorage : sessionStorage;
    }
    
    // =======================================
    // CORREÇÕES PARA BARRA DE PROGRESSO
    // =======================================
    
    /**
     * Gerenciador de progresso que impede que a barra retroceda
     */
    const ProgressManager = {
        // Armazena o valor máximo de progresso para cada job
        maxProgress: new Map(),
        
        /**
         * Atualiza o progresso de um job
         * @param {string} jobId - ID do job
         * @param {number} progress - Valor do progresso (0-100)
         * @return {number} O valor de progresso final aplicado
         */
        updateProgress: function(jobId, progress) {
            // Progresso inválido, usar padrão
            if (typeof progress !== 'number' || isNaN(progress)) {
                progress = 0;
            }
            
            // Limitar entre 0 e 100
            progress = Math.max(0, Math.min(100, progress));
            
            // Verificar se já temos um valor máximo registrado
            if (this.maxProgress.has(jobId)) {
                const currentMax = this.maxProgress.get(jobId);
                
                // Só avançar, nunca retroceder
                if (progress > currentMax) {
                    this.maxProgress.set(jobId, progress);
                    return progress;
                } else {
                    return currentMax;
                }
            } else {
                // Primeiro registro deste job
                this.maxProgress.set(jobId, progress);
                return progress;
            }
        },
        
        /**
         * Completa o progresso de um job (100%)
         * @param {string} jobId - ID do job
         * @param {string} status - Status final ('success', 'failed', 'cancelled')
         */
        completeProgress: function(jobId, status) {
            this.maxProgress.set(jobId, 100);
            
            // Atualizar a visualização
            const card = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
            if (card) {
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    
                    // Definir cor com base no status
                    if (status === 'completed' || status === 'success') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.success;
                    } else if (status === 'failed') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.failed;
                    } else if (status === 'cancelled') {
                        progressBar.style.backgroundColor = CONFIG.progressColors.cancelled;
                    }
                }
            }
        },
        
        /**
         * Limpa o progresso registrado para um job
         * @param {string} jobId - ID do job
         */
        clearProgress: function(jobId) {
            this.maxProgress.delete(jobId);
        },
        
        /**
         * Aplica o progresso à barra visual
         * @param {string} jobId - ID do job
         * @param {HTMLElement} progressBar - Elemento da barra de progresso
         * @param {number} rawProgress - Valor bruto do progresso
         */
        applyProgressToBar: function(jobId, progressBar, rawProgress) {
            if (!progressBar) return;
            
            // Obter o valor real a ser aplicado (que nunca retrocede)
            const realProgress = this.updateProgress(jobId, rawProgress);
            
            // Aplicar à barra
            progressBar.style.width = `${realProgress}%`;
            
            // Log apenas se houver diferença significativa
            if (Math.abs(realProgress - rawProgress) > 5) {
                log(`Progresso ajustado para job ${jobId}: ${rawProgress}% → ${realProgress}%`);
            }
        }
    };
    
    /**
     * Cria ou encontra a barra de progresso em um card
     * @param {HTMLElement} card - O card de execução
     * @return {HTMLElement} A barra de progresso
     */
    function ensureProgressBar(card) {
        // Verificar se já existe uma barra de progresso
        let progressBar = card.querySelector('.progress-bar');
        if (progressBar) return progressBar;
        
        // Verificar se existe um container, mas sem a barra
        let progressContainer = card.querySelector('.progress-container');
        
        // Se não existe o container, criar
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.style.cssText = `
                width: 100%;
                height: 4px;
                background-color: #2A2A2A;
                border-radius: 2px;
                overflow: hidden;
                margin: 10px 0;
            `;
            
            // Encontrar o local para inserir
            const hostInfo = card.querySelector('.host-info');
            const outputDiv = card.querySelector('.ansible-output');
            
            if (hostInfo && hostInfo.nextSibling) {
                card.insertBefore(progressContainer, hostInfo.nextSibling);
            } else if (outputDiv) {
                card.insertBefore(progressContainer, outputDiv);
            } else {
                // Último recurso: inserir antes dos botões
                const buttonGroup = card.querySelector('.button-group');
                if (buttonGroup) {
                    card.insertBefore(progressContainer, buttonGroup);
                } else {
                    // Não conseguiu encontrar um local adequado, adicionar ao fim
                    card.appendChild(progressContainer);
                }
            }
        }
        
        // Criar a barra de progresso
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            height: 100%;
            background-color: ${CONFIG.progressColors.running};
            border-radius: 2px;
            width: 0%;
            transition: width 0.3s ease, background-color 0.3s ease;
        `;
        
        progressContainer.appendChild(progressBar);
        return progressBar;
    }
    
    /**
     * Intercepta a função monitorPlaybookExecution para melhorar a barra de progresso
     */
    function fixProgressBar() {
        // Verificar se a função existe e ainda não foi interceptada
        if (typeof window.monitorPlaybookExecutionOriginal === 'undefined' && 
            typeof window.monitorPlaybookExecution === 'function') {
            
            // Guardar a função original
            window.monitorPlaybookExecutionOriginal = window.monitorPlaybookExecution;
            
            // Substituir pela versão melhorada
            window.monitorPlaybookExecution = function(jobId, card) {
                log(`Monitorando job ${jobId} com barra de progresso aprimorada`);
                
                // Garantir que temos uma barra de progresso
                const progressBar = ensureProgressBar(card);
                
                // Se já estamos monitorando, evitar duplicação
                if (card.dataset.monitoring === 'true') {
                    log(`Job ${jobId} já está sendo monitorado, ignorando`);
                    return;
                }
                
                // Marcar como em monitoramento
                card.dataset.monitoring = 'true';
                
                // Verifica se é uma playbook de baseline
                const playbookName = card.getAttribute('data-playbook-name') || '';
                const isBaseline = isBaselinePlaybook(playbookName);
                const outputDiv = card.querySelector('.ansible-output');
                
                // Para baseline, queremos formatação específica
                if (isBaseline) {
                    log(`Detectada playbook de baseline: ${playbookName}`);
                }
                
                // Função para verificar status e atualizar barras
                function checkStatus() {
                    // Verificar se o card ainda existe no DOM
                    if (!document.body.contains(card)) {
                        log(`Card para job ${jobId} não existe mais, parando monitoramento`, 'warn');
                        return;
                    }
                    
                    // Fazer a requisição para a API
                    fetch(`/api/status/${jobId}`)
                        .then(response => {
                            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            // Aplicar o progresso com proteção contra retrocesso
                            ProgressManager.applyProgressToBar(jobId, progressBar, data.progress || 0);
                            
                            // Atualizar a saída com as melhorias necessárias
                            if (outputDiv && data.output) {
                                if (isBaseline) {
                                    // Usar a formatação para baseline que mostra mais detalhes
                                    outputDiv.innerHTML = formatBaselineOutput(data.output);
                                } else if (typeof window.formatAnsibleOutput === 'function') {
                                    // Chamar a função existente se disponível
                                    outputDiv.innerHTML = window.formatAnsibleOutput(data.output);
                                } else {
                                    // Formatação básica caso não exista função específica
                                    outputDiv.innerHTML = `<pre>${data.output}</pre>`;
                                }
                                
                                // Rolar para o final para mostrar o progresso mais recente
                                if (outputDiv.style.display === 'block') {
                                    outputDiv.scrollTop = outputDiv.scrollHeight;
                                }
                            }
                            
                            // Atualizar status do card
                            updateCardStatus(card, data.status);
                            
                            // Se a execução terminou, completar a barra e parar o monitoramento
                            if (data.status !== 'running') {
                                log(`Job ${jobId} finalizou com status: ${data.status}`);
                                ProgressManager.completeProgress(jobId, data.status);
                                card.dataset.monitoring = 'false';
                                
                                // Atualizar o card para o status final
                                if (typeof window.handlePlaybookCompletion === 'function') {
                                    window.handlePlaybookCompletion(data.status, card);
                                }
                                
                                // Salvar o estado para persistência
                                saveRunningJobsState();
                            } else {
                                // Continuar monitorando
                                setTimeout(checkStatus, CONFIG.progressUpdateInterval);
                                
                                // Salvar periodicamente o estado
                                saveRunningJobsState();
                            }
                        })
                        .catch(error => {
                            log(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                            
                            // Tenta novamente em caso de erro, com um intervalo maior
                            setTimeout(checkStatus, CONFIG.progressUpdateInterval * 2);
                        });
                }
                
                // Iniciar o monitoramento
                checkStatus();
                
                // Também chamar a função original para compatibilidade,
                // mas com try/catch para evitar que falhas dela afetem nossa implementação
                try {
                    window.monitorPlaybookExecutionOriginal(jobId, card);
                } catch (error) {
                    log(`Erro ao chamar função original de monitoramento: ${error.message}`, 'error');
                }
            };
            
            log("Função monitorPlaybookExecution melhorada para corrigir barra de progresso");
        }
    }
    
    /**
     * Atualiza o status visual do card com base no status do job
     * @param {HTMLElement} card - O card de execução
     * @param {string} status - Status do job ('running', 'completed', 'failed', 'cancelled')
     */
    function updateCardStatus(card, status) {
        const statusElement = card.querySelector('.task-status');
        if (!statusElement) return;
        
        // Remove classes antigas
        statusElement.classList.remove('success', 'failed', 'cancelled');
        
        // Atualiza texto e classe
        if (status === 'completed' || status === 'success') {
            statusElement.textContent = 'Concluído com sucesso';
            statusElement.classList.add('success');
        } else if (status === 'failed') {
            statusElement.textContent = 'Falhou';
            statusElement.classList.add('failed');
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelado';
            statusElement.classList.add('cancelled');
        } else {
            statusElement.textContent = 'Em execução...';
        }
    }
    
    /**
     * Formata a saída do baseline para exibição
     * @param {string} output - Saída bruta
     * @return {string} HTML formatado
     */
    function formatBaselineOutput(output) {
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
            </style>
            ${formatted}
        </div>`;
        
        return formatted;
    }
    
    // =======================================
    // CORREÇÕES PARA PERSISTÊNCIA DE CARDS
    // =======================================
    
    /**
     * Salva o estado de todos os cards de execução para persistência
     */
    function saveRunningJobsState() {
        try {
            const storage = getStorage();
            const runningCards = document.querySelectorAll('.execution-card');
            if (runningCards.length === 0) {
                storage.removeItem(CONFIG.persistenceKey);
                return;
            }
            
            const cardsData = Array.from(runningCards).map(card => {
                // Obter dados básicos do card
                const jobId = card.getAttribute('data-job-id');
                const playbookName = card.getAttribute('data-playbook-name');
                
                // Obter hosts
                const hosts = [];
                card.querySelectorAll('.host-details').forEach(hostDetail => {
                    const hostname = hostDetail.getAttribute('data-host');
                    if (hostname) hosts.push(hostname);
                });
                
                // Verificar status
                const statusElement = card.querySelector('.task-status');
                const status = statusElement ? statusElement.textContent.trim() : 'Em execução...';
                
                // Verificar progresso
                const progressBar = card.querySelector('.progress-bar');
                const progress = progressBar ? 
                    parseFloat(progressBar.style.width) || 0 : 
                    (ProgressManager.maxProgress.get(jobId) || 0);
                
                // Verificar se a saída está visível
                const outputDiv = card.querySelector('.ansible-output');
                const outputVisible = outputDiv ? 
                    outputDiv.style.display === 'block' : false;
                
                return {
                    jobId,
                    playbookName,
                    hosts,
                    status,
                    progress,
                    outputVisible,
                    isBaseline: isBaselinePlaybook(playbookName)
                };
            });
            
            // Salvar no armazenamento
            storage.setItem(CONFIG.persistenceKey, JSON.stringify(cardsData));
            log(`Salvo estado de ${cardsData.length} cards em execução`);
        } catch (error) {
            log(`Erro ao salvar estado: ${error.message}`, 'error');
        }
    }
    
    /**
     * Restaura os cards de execução do armazenamento
     */
    function restoreRunningJobsState() {
        try {
            const storage = getStorage();
            const savedData = storage.getItem(CONFIG.persistenceKey);
            if (!savedData) return;
            
            const cardsData = JSON.parse(savedData);
            log(`Restaurando ${cardsData.length} cards de execução`);
            
            // Obter o container
            const container = document.querySelector(CONFIG.selectors.runningPlaybooks);
            if (!container) {
                log('Container de playbooks em execução não encontrado', 'warn');
                return;
            }
            
            // Limpar o container se necessário
            // Não limpe o container aqui, apenas adicione os cards
            
            // Restaurar cada card
            cardsData.forEach(cardData => {
                // Verificar se o card já existe (para evitar duplicação)
                if (document.querySelector(`.execution-card[data-job-id="${cardData.jobId}"]`)) {
                    log(`Card com job ID ${cardData.jobId} já existe, ignorando`);
                    return;
                }
                
                // Criar um novo card
                const card = createExecutionCard(
                    cardData.playbookName,
                    cardData.hosts,
                    cardData.jobId,
                    cardData.status,
                    cardData.progress,
                    cardData.outputVisible
                );
                
                // Adicionar ao container
                container.appendChild(card);
                
                // Configurar barra de progresso
                if (cardData.progress > 0) {
                    const progressBar = card.querySelector('.progress-bar');
                    if (progressBar) {
                        progressBar.style.width = `${cardData.progress}%`;
                        
                        // Definir cor com base no status
                        if (cardData.status.includes('sucesso')) {
                            progressBar.style.backgroundColor = CONFIG.progressColors.success;
                        } else if (cardData.status.includes('Falhou')) {
                            progressBar.style.backgroundColor = CONFIG.progressColors.failed;
                        } else if (cardData.status.includes('Cancelado')) {
                            progressBar.style.backgroundColor = CONFIG.progressColors.cancelled;
                        }
                    }
                    
                    // Registrar o progresso no gerenciador
                    ProgressManager.updateProgress(cardData.jobId, cardData.progress);
                }
                
                // Se o job não estiver concluído, reiniciar monitoramento
                if (cardData.status.includes('execução') && typeof window.monitorPlaybookExecution === 'function') {
                    log(`Reiniciando monitoramento para job ${cardData.jobId}`);
                    window.monitorPlaybookExecution(cardData.jobId, card);
                }
            });
            
            log("Cards restaurados com sucesso");
        } catch (error) {
            log(`Erro ao restaurar estado: ${error.message}`, 'error');
        }
    }
    
    /**
     * Cria um novo card de execução
     * @param {string} playbookName - Nome da playbook
     * @param {Array} hosts - Array de hostnames
     * @param {string} jobId - ID do job
     * @param {string} status - Status da execução
     * @param {number} progress - Valor do progresso (0-100)
     * @param {boolean} outputVisible - Se a saída está visível
     * @return {HTMLElement} O elemento do card
     */
    function createExecutionCard(playbookName, hosts, jobId, status = 'Em execução...', progress = 0, outputVisible = false) {
        // Criar o card base
        const card = document.createElement('div');
        card.className = 'execution-card';
        card.setAttribute('data-job-id', jobId);
        card.setAttribute('data-playbook-name', playbookName);
        
        // Informações dos hosts
        let hostsHTML = '';
        hosts.forEach(hostname => {
            hostsHTML += `
                <div class="host-details" data-host="${hostname}">
                    <p><strong>Hostname:</strong> <span>${hostname}</span></p>
                </div>
            `;
        });
        
        // Estrutura básica do card
        card.innerHTML = `
            <div class="card-header">
                <h3>${playbookName}</h3>
                <div class="button-group">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="toggle-output-btn">
                        ${outputVisible ? 'Ver Menos' : 'Ver Mais'}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="${outputVisible ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="host-info">
                ${hostsHTML}
            </div>
            
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%;"></div>
            </div>
            
            <div class="ansible-output" style="display: ${outputVisible ? 'block' : 'none'};"></div>
            
            <div class="task-status ${getStatusClass(status)}">${status}</div>
        `;
        
        // Adicionar eventos
        const cancelBtn = card.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (typeof window.cancelExecution === 'function') {
                    window.cancelExecution(this);
                }
            });
        }
        
        const toggleBtn = card.querySelector('.toggle-output-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (typeof window.toggleOutput === 'function') {
                    window.toggleOutput(this);
                }
            });
        }
        
        return card;
    }
    
    /**
     * Obtém a classe CSS para o status
     * @param {string} status - Texto do status
     * @return {string} Classe CSS
     */
    function getStatusClass(status) {
        if (status.includes('sucesso')) return 'success';
        if (status.includes('Falhou')) return 'failed';
        if (status.includes('Cancelado')) return 'cancelled';
        return '';
    }
    
    /**
     * Configura persistência automática
     */
    function setupAutoPersistence() {
        // Salvar estado periodicamente
        setInterval(saveRunningJobsState, CONFIG.persistenceInterval);
        
        // Salvar ao sair da página
        window.addEventListener('beforeunload', saveRunningJobsState);
        
        // Salvar ao clicar em links internos
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href.includes(window.location.origin)) {
                saveRunningJobsState();
            }
        });
        
        log("Persistência automática configurada");
    }
    
    // =======================================
    // CORREÇÕES PARA MULTIHOST EM BASELINE
    // =======================================
    
    /**
     * Intercepta a função toggleOutput para melhorar a visualização da saída
     */
    function fixToggleOutputFunction() {
        // Verificar se a função existe e ainda não foi interceptada
        if (typeof window.toggleOutputOriginal === 'undefined' && 
            typeof window.toggleOutput === 'function') {
            
            // Guardar a função original
            window.toggleOutputOriginal = window.toggleOutput;
            
            // Substituir pela versão melhorada
            window.toggleOutput = function(button) {
                try {
                    // Obter o card
                    const card = button.closest('.execution-card');
                    if (!card) {
                        log("Card não encontrado para o botão", 'warn');
                        return window.toggleOutputOriginal(button);
                    }
                    
                    // Obter a div de saída
                    const outputDiv = card.querySelector('.ansible-output');
                    if (!outputDiv) {
                        log("Elemento de saída não encontrado", 'warn');
                        return window.toggleOutputOriginal(button);
                    }
                    
                    // Verificar se é uma playbook de baseline
                    const playbookName = card.getAttribute('data-playbook-name') || '';
                    const isBaseline = isBaselinePlaybook(playbookName);
                    const jobId = card.getAttribute('data-job-id');
                    
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
                        // Mostrar indicador de carregamento
                        outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
                        
                        // Buscar dados atualizados
                        fetch(`/api/status/${jobId}`)
                            .then(response => {
                                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                                return response.json();
                            })
                            .then(data => {
                                // Formatar e exibir a saída
                                if (isBaseline) {
                                    outputDiv.innerHTML = formatBaselineOutput(data.output || '');
                                } else if (typeof window.formatAnsibleOutput === 'function') {
                                    outputDiv.innerHTML = window.formatAnsibleOutput(data.output || '');
                                } else {
                                    outputDiv.innerHTML = `<pre>${data.output || ''}</pre>`;
                                }
                                
                                // Rolar para o final
                                outputDiv.scrollTop = outputDiv.scrollHeight;
                                
                                // Salvar o estado para persistência
                                saveRunningJobsState();
                            })
                            .catch(error => {
                                log(`Erro ao buscar saída para job ${jobId}: ${error.message}`, 'error');
                                outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                            });
                    } else {
                        // Salvar o estado para persistência se estamos ocultando
                        saveRunningJobsState();
                    }
                    
                    return true;
                } catch (error) {
                    log(`Erro ao alternar saída: ${error.message}`, 'error');
                    return window.toggleOutputOriginal(button);
                }
            };
            
            log("Função toggleOutput melhorada para exibição de saída");
        }
    }
    
    /**
     * Corrige a função de execução para tratar corretamente baseline com múltiplos hosts
     */
    function fixExecuteFunction() {
        // Verificar se a função existe e ainda não foi interceptada
        if (typeof window.executeSelectedPlaybooksOriginal === 'undefined' && 
            typeof window.executeSelectedPlaybooks === 'function') {
            
            // Guardar a função original
            window.executeSelectedPlaybooksOriginal = window.executeSelectedPlaybooks;
            
            // Substituir pela versão melhorada
            window.executeSelectedPlaybooks = function() {
                log("Função executeSelectedPlaybooks interceptada para melhorias");
                
                // Obter playbooks e hosts selecionados
                const selectedPlaybooks = getSelectedPlaybooks();
                const selectedHosts = getSelectedHosts();
                
                // Verificar se tem baseline selecionado
                const hasBaseline = selectedPlaybooks.some(pb => isBaselinePlaybook(pb.name));
                
                // Se não for baseline ou tiver apenas um host, usar função original
                if (!hasBaseline || selectedHosts.length <= 1) {
                    return window.executeSelectedPlaybooksOriginal();
                }
                
                log(`Detectado baseline com múltiplos hosts: ${selectedHosts.length} hosts`);
                
                // Interceptar a API fetch para corrigir comportamento do baseline
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    if (url === '/api/run' && options?.method === 'POST') {
                        try {
                            const data = JSON.parse(options.body);
                            const playbookPath = data.playbook;
                            
                            // Verificar se é baseline e tem múltiplos hosts
                            if (isBaselinePlaybook(playbookPath) && 
                                data.hosts && data.hosts.length > 1) {
                                
                                log(`Detectada execução de baseline com ${data.hosts.length} hosts, normalizando comportamento`);
                                
                                // Processar cada host separadamente para baseline
                                executeMultiHostBaseline(data);
                                
                                // Restaurar fetch original
                                window.fetch = originalFetch;
                                
                                // Apenas para este caso, não prosseguir com a execução original
                                return new Promise(() => {}); // Promise vazia que nunca resolve
                            }
                        } catch (error) {
                            log(`Erro ao processar requisição: ${error.message}`, 'error');
                        }
                    }
                    
                    // Para qualquer outro caso, prosseguir com a requisição original
                    return originalFetch.apply(this, arguments);
                };
                
                // Chamar a função original
                const result = window.executeSelectedPlaybooksOriginal();
                
                // Restaurar fetch original após um momento
                setTimeout(() => {
                    if (window.fetch !== originalFetch) {
                        window.fetch = originalFetch;
                        log("Fetch original restaurado após execução");
                    }
                }, 2000);
                
                return result;
            };
            
            log("Função executeSelectedPlaybooks melhorada para suporte a baseline multihost");
        }
    }
    
    /**
     * Executa baseline com múltiplos hosts individualmente
     * @param {Object} data - Dados da requisição original
     */
    function executeMultiHostBaseline(data) {
        const playbookPath = data.playbook;
        const hosts = data.hosts || [];
        const originalExtraVars = data.extra_vars || {};
        
        log(`Executando baseline ${playbookPath} para ${hosts.length} hosts individualmente`);
        
        // Processar cada host separadamente
        hosts.forEach((host, index) => {
            // Adicionar pequeno atraso escalonado para evitar problemas de concorrência
            setTimeout(() => {
                // Preparar payload para este host específico
                const payload = {
                    playbook: playbookPath,
                    hosts: [host],
                    extra_vars: {
                        ...originalExtraVars,
                        host_specific: host,
                        single_host_execution: true
                    }
                };
                
                // Adicionar variáveis específicas de baseline
                addBaselineVariables(payload, host);
                
                log(`Executando baseline para host ${host}`);
                
                // Função para novas requisições - usar o fetch original
                fetch('/api/run', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                })
                .then(response => response.json())
                .then(result => {
                    log(`Baseline iniciado para host ${host}: job ${result.job_id}`);
                })
                .catch(error => {
                    log(`Erro ao executar baseline para host ${host}: ${error.message}`, 'error');
                });
            }, index * 500); // Atraso escalonado
        });
    }
    
    /**
     * Adiciona variáveis específicas para baseline
     * @param {Object} payload - Payload da requisição
     * @param {string} hostname - Nome do host
     */
    function addBaselineVariables(payload, hostname) {
        if (!payload.extra_vars) {
            payload.extra_vars = {};
        }
        
        // Tentar buscar informações do formulário de baseline, se existir
        const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
        const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
        const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
        
        // Adicionar variáveis se os campos existirem
        if (hostnameField && hostnameField.value) {
            payload.extra_vars.new_hostname = hostnameField.value;
        }
        
        if (parceiroPasswordField && parceiroPasswordField.value) {
            payload.extra_vars.parceiro_password = parceiroPasswordField.value;
            payload.extra_vars.user_password = parceiroPasswordField.value;
        }
        
        if (rootPasswordField && rootPasswordField.value) {
            payload.extra_vars.root_password = rootPasswordField.value;
            payload.extra_vars.admin_password = rootPasswordField.value;
        }
    }
    
    /**
     * Obtém todas as playbooks selecionadas
     * @returns {Array} - Array de objetos de playbook {name, element}
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
     * Obtém todos os hosts selecionados
     * @returns {Array} - Array de hostnames
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
    
    // =======================================
    // FUNÇÕES DE INICIALIZAÇÃO
    // =======================================
    
    /**
     * Adiciona estilos globais necessários
     */
    function addGlobalStyles() {
        // Verificar se os estilos já foram adicionados
        if (document.getElementById('ansible-unified-fixes-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ansible-unified-fixes-styles';
        style.textContent = `
            /* Estilo para progresso */
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
                background-color: ${CONFIG.progressColors.running};
                border-radius: 2px;
                width: 0%;
                transition: width 0.3s ease, background-color 0.3s ease;
            }
            
            /* Estilo para execução */
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
            
            /* Estilos para saída formatada */
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
            
            /* Garantir que as saídas sejam visíveis */
            .ansible-output {
                max-height: 500px !important;
                overflow-y: auto !important;
                padding: 10px !important;
                background-color: #1e1e1e !important;
                color: #d4d4d4 !important;
                border-radius: 4px !important;
                font-family: monospace !important;
            }
            
            /* Certificar que os cards estão na posição correta */
            #running-playbooks {
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .execution-card {
                background-color: var(--black-elegant, #0A0A0A);
                border-radius: 6px;
                padding: 15px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                position: relative;
                border: 1px solid var(--gray-dark, #2A2A2A);
                margin-bottom: 0;
                transition: box-shadow 0.3s ease;
            }
            
            .execution-card:hover {
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
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
        `;
        
        document.head.appendChild(style);
        log("Estilos globais adicionados");
    }
    
    /**
     * Inicializa todas as correções
     */
    function initialize() {
        try {
            log("Inicializando solução unificada para Ansible");
            
            // Adicionar estilos globais
            addGlobalStyles();
            
            // Corrigir problemas de barra de progresso
            fixProgressBar();
            
            // Corrigir função de toggle de saída
            fixToggleOutputFunction();
            
            // Corrigir função de execução para multihost
            fixExecuteFunction();
            
            // Configurar persistência automática
            setupAutoPersistence();
            
            // Restaurar estado salvo, se houver
            restoreRunningJobsState();
            
            window.unifiedFixesInitialized = true;
            log("✅ Solução unificada aplicada com sucesso");
        } catch (error) {
            log(`❌ Erro ao inicializar solução unificada: ${error.message}`, 'error');
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