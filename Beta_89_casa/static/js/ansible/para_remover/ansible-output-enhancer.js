/**
 * ansible-card-view.js
 * Script para melhorar a exibição da saída do Ansible organizando em cards de tarefas
 */

(function() {
    console.log("Inicializando visualização em cards para Ansible...");
    
    // Estado global para rastrear jobs monitorados
    const monitoredJobs = new Map();
    
    // Cache de tarefas para cada job
    const jobTasksCache = new Map();
    
    // Armazenar função original
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
    
    /**
     * Sobrescreve a função de monitoramento de playbooks
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Card de execução
     */
    window.monitorPlaybookExecution = function(jobId, card) {
        console.log(`Iniciando monitoramento em cards para job: ${jobId}`);
        
        // Configurar elementos de saída
        const progressBar = card.querySelector('.progress-bar');
        const outputDiv = card.querySelector('.ansible-output');
        const statusDiv = card.querySelector('.task-status');
        
        // Se já estamos monitorando este job, encerrar o monitoramento anterior
        if (monitoredJobs.has(jobId)) {
            clearInterval(monitoredJobs.get(jobId));
        }
        
        // Inicializar estrutura de cards
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div class="ansible-cards-container">
                    <div class="ansible-current-task">
                        <div class="ansible-spinner"></div>
                        <div class="current-task-message">Iniciando execução...</div>
                    </div>
                    <div class="ansible-plays-container"></div>
                </div>
            `;
            
            // Forçar visibilidade do output
            outputDiv.style.display = 'block';
        }
        
        // Inicializar cache para este job
        if (!jobTasksCache.has(jobId)) {
            jobTasksCache.set(jobId, {
                plays: [],
                tasks: [],
                currentPlay: null,
                currentTask: null,
                lastOutput: ""
            });
        }
        
        // Função para atualizar o progresso
        function updateProgress() {
            try {
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        // Atualizar progresso
                        if (progressBar) {
                            progressBar.style.width = `${data.progress || 0}%`;
                        }
                        
                        // Atualizar status
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
                        
                        // Se temos saída nova, processar e exibir
                        if (outputDiv && data.output) {
                            const cache = jobTasksCache.get(jobId);
                            
                            // Verificar se a saída mudou
                            if (data.output !== cache.lastOutput) {
                                cache.lastOutput = data.output;
                                processAnsibleOutput(data.output, outputDiv, jobId);
                            }
                        }
                        
                        // Continuar monitorando ou finalizar
                        if (data.status === 'running') {
                            // Continuar monitoramento
                        } else {
                            // Playbook concluído - finalizar monitoramento
                            if (monitoredJobs.has(jobId)) {
                                clearInterval(monitoredJobs.get(jobId));
                                monitoredJobs.delete(jobId);
                            }
                            
                            // Remover indicador de tarefa atual
                            const currentTaskDiv = outputDiv?.querySelector('.ansible-current-task');
                            if (currentTaskDiv) {
                                currentTaskDiv.innerHTML = `
                                    <div class="task-completion-message ${data.status}">
                                        <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                            ${data.status === 'completed' 
                                                ? '<path d="M20 6L9 17l-5-5"></path>' 
                                                : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                        </svg>
                                        <span>${data.status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                                    </div>
                                `;
                            }
                            
                            // Atualizar o status do card
                            handlePlaybookCompletion(data.status, card);
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao monitorar job ${jobId}:`, error);
                        
                        // Em caso de erro, tentar continuar
                    });
            } catch (error) {
                console.error(`Erro ao processar atualização para job ${jobId}:`, error);
            }
        }
        
        // Executar atualização inicial imediatamente
        updateProgress();
        
        // Configurar atualizações periódicas a cada 2 segundos
        const intervalId = setInterval(updateProgress, 2000);
        monitoredJobs.set(jobId, intervalId);
        
        // Chamar a função original também para compatibilidade
        if (typeof originalMonitorPlaybookExecution === 'function') {
            try {
                originalMonitorPlaybookExecution(jobId, card);
            } catch (error) {
                console.error("Erro ao chamar monitor original:", error);
            }
        }
    };
    
    /**
     * Processa a saída do Ansible e cria a visualização em cards
     * @param {string} output - Saída do Ansible
     * @param {HTMLElement} outputDiv - Container para a saída
     * @param {string} jobId - ID do job
     */
    function processAnsibleOutput(output, outputDiv, jobId) {
        if (!output) return;
        
        const cache = jobTasksCache.get(jobId);
        if (!cache) return;
        
        // Container para os plays
        const playsContainer = outputDiv.querySelector('.ansible-plays-container');
        if (!playsContainer) return;
        
        // Container para a tarefa atual
        const currentTaskDiv = outputDiv.querySelector('.ansible-current-task');
        if (!currentTaskDiv) return;

        // Dividir saída em linhas
        const lines = output.split('\n');
        
        // Variáveis para processamento
        let currentPlayId = null;
        let currentPlayElement = null;
        let currentTaskId = null;
        let currentTaskElement = null;
        let currentHost = null;
        let taskBuffer = "";
        
        // Analisar cada linha
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Detectar Play
            if (line.startsWith('PLAY [')) {
                const playName = line.match(/PLAY \[(.*?)\]/)[1];
                currentPlayId = `play-${playName.replace(/\s+/g, '-')}-${jobId}`;
                
                // Verificar se o play já existe
                currentPlayElement = document.getElementById(currentPlayId);
                
                if (!currentPlayElement) {
                    // Criar novo elemento para o play
                    currentPlayElement = document.createElement('div');
                    currentPlayElement.id = currentPlayId;
                    currentPlayElement.className = 'ansible-play-card';
                    currentPlayElement.innerHTML = `
                        <div class="play-header">
                            <svg class="play-icon" viewBox="0 0 24 24" width="16" height="16">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <h3>${escapeHtml(playName)}</h3>
                        </div>
                        <div class="play-tasks"></div>
                    `;
                    playsContainer.appendChild(currentPlayElement);
                    
                    // Atualizar cache
                    cache.plays.push({
                        id: currentPlayId,
                        name: playName
                    });
                    
                    // Rolar para o final para mostrar o novo play
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                }
                
                // Atualizar referência do elemento atual
                currentPlayElement = document.getElementById(currentPlayId);
                currentTaskId = null;
                currentTaskElement = null;
                currentHost = null;
                taskBuffer = "";
                
                // Atualizar mensagem de tarefa atual
                currentTaskDiv.querySelector('.current-task-message').textContent = `Executando Play: ${playName}`;
                
                continue;
            }
            
            // Detectar Task
            if (line.startsWith('TASK [')) {
                // Se temos um buffer de tarefa pendente, salvá-lo
                if (currentTaskElement && taskBuffer) {
                    const taskOutput = currentTaskElement.querySelector('.task-output');
                    if (taskOutput) {
                        taskOutput.innerHTML = formatTaskOutput(taskBuffer);
                        taskBuffer = "";
                    }
                }
                
                const taskName = line.match(/TASK \[(.*?)\]/)[1];
                currentTaskId = `task-${taskName.replace(/\s+/g, '-')}-${jobId}`;
                
                // Verificar se a tarefa já existe
                currentTaskElement = document.getElementById(currentTaskId);
                
                if (!currentTaskElement && currentPlayElement) {
                    // Criar novo elemento para a tarefa
                    currentTaskElement = document.createElement('div');
                    currentTaskElement.id = currentTaskId;
                    currentTaskElement.className = 'ansible-task-card';
                    currentTaskElement.innerHTML = `
                        <div class="task-header">
                            <svg class="task-icon" viewBox="0 0 24 24" width="14" height="14">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <h4>${escapeHtml(taskName)}</h4>
                            <span class="task-status pending">Pendente</span>
                        </div>
                        <div class="task-output"></div>
                    `;
                    
                    const tasksContainer = currentPlayElement.querySelector('.play-tasks');
                    if (tasksContainer) {
                        tasksContainer.appendChild(currentTaskElement);
                    }
                    
                    // Atualizar cache
                    cache.tasks.push({
                        id: currentTaskId,
                        name: taskName,
                        playId: currentPlayId,
                        status: 'pending'
                    });
                    
                    // Rolar para o final para mostrar a nova tarefa
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                }
                
                // Atualizar referência do elemento atual
                currentTaskElement = document.getElementById(currentTaskId);
                currentHost = null;
                taskBuffer = "";
                
                // Atualizar mensagem de tarefa atual
                currentTaskDiv.querySelector('.current-task-message').textContent = `Executando: ${taskName}`;
                
                continue;
            }
            
            // Detectar resultados (ok, changed, failed, skipped)
            const resultMatch = line.match(/^(ok|changed|failed|skipped|unreachable):/);
            if (resultMatch && currentTaskElement) {
                const status = resultMatch[1];
                const hostMatch = line.match(/:\s*\[(.*?)\]/);
                
                if (hostMatch) {
                    currentHost = hostMatch[1];
                    
                    // Atualizar status da tarefa
                    const taskStatus = currentTaskElement.querySelector('.task-status');
                    if (taskStatus) {
                        // Determinar o status mais significativo (failed > changed > ok > skipped)
                        const currentStatus = taskStatus.className.replace('task-status ', '');
                        
                        if (status === 'failed' || status === 'unreachable' || 
                            (status === 'changed' && currentStatus !== 'failed') || 
                            (status === 'ok' && !['failed', 'changed'].includes(currentStatus))) {
                            
                            taskStatus.className = `task-status ${status}`;
                            taskStatus.textContent = statusToDisplay(status);
                        }
                    }
                    
                    // Adicionar esta linha ao buffer da tarefa
                    taskBuffer += `<div class="task-result ${status}">
                        <span class="result-type">${status}</span>
                        <span class="result-host">${escapeHtml(currentHost)}</span>
                        ${line.includes(' => ') ? 
                            `<span class="result-detail">${escapeHtml(line.split(' => ')[1])}</span>` : 
                            ''}
                    </div>`;
                }
                
                continue;
            }
            
            // Linhas de saída genéricas (adicionar ao buffer atual)
            if (currentTaskElement) {
                taskBuffer += `<div class="output-line">${escapeHtml(line)}</div>`;
            }
        }
        
        // Processar qualquer buffer pendente
        if (currentTaskElement && taskBuffer) {
            const taskOutput = currentTaskElement.querySelector('.task-output');
            if (taskOutput) {
                taskOutput.innerHTML = formatTaskOutput(taskBuffer);
            }
        }
    }
    
    /**
     * Formata o conteúdo do buffer de uma tarefa
     * @param {string} buffer - Buffer com conteúdo da tarefa
     * @returns {string} - HTML formatado
     */
    function formatTaskOutput(buffer) {
        if (!buffer) return '';
        
        // Adicionar classe de container
        return `<div class="output-content">${buffer}</div>`;
    }
    
    /**
     * Converte status para texto de exibição
     * @param {string} status - Status da tarefa
     * @returns {string} - Texto de exibição
     */
    function statusToDisplay(status) {
        const statusMap = {
            'ok': 'Sucesso',
            'changed': 'Alterado',
            'failed': 'Falhou',
            'skipped': 'Ignorado',
            'unreachable': 'Inacessível',
            'pending': 'Pendente'
        };
        
        return statusMap[status] || status;
    }
    
    /**
     * Escapa HTML para evitar injeção de código
     * @param {string} text - Texto a ser escapado
     * @returns {string} - Texto escapado
     */
    function escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Adiciona estilos CSS necessários
     */
    function addStyles() {
        if (document.getElementById('ansible-cards-styles')) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'ansible-cards-styles';
        styleEl.textContent = `
            /* Container principal */
            .ansible-cards-container {
                font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding-bottom: 10px;
            }
            
            /* Tarefa atual */
            .ansible-current-task {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: rgba(33, 150, 243, 0.1);
                border-left: 3px solid #2196F3;
                border-radius: 4px;
                margin-bottom: 10px;
            }
            
            /* Mensagem de conclusão de tarefas */
            .task-completion-message {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                font-weight: 500;
            }
            
            .task-completion-message.completed {
                color: #4CAF50;
            }
            
            .task-completion-message.failed {
                color: #F44336;
            }
            
            .task-completion-message .status-icon {
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
            }
            
            /* Container de plays */
            .ansible-plays-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            /* Card de play */
            .ansible-play-card {
                background: #1e1e1e;
                border-radius: 6px;
                border: 1px solid #333;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            /* Cabeçalho do play */
            .play-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 12px;
                background: #252526;
                border-bottom: 1px solid #333;
            }
            
            .play-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #569cd6;
            }
            
            .play-icon {
                fill: none;
                stroke: #569cd6;
                stroke-width: 2;
            }
            
            /* Container de tarefas */
            .play-tasks {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 10px;
            }
            
            /* Card de tarefa */
            .ansible-task-card {
                background: #2d2d2d;
                border-radius: 4px;
                border: 1px solid #333;
                overflow: hidden;
            }
            
            /* Cabeçalho da tarefa */
            .task-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 10px;
                background: #252526;
                border-bottom: 1px solid #333;
            }
            
            .task-header h4 {
                margin: 0;
                font-size: 13px;
                font-weight: 500;
                color: #9cdcfe;
                flex: 1;
            }
            
            .task-icon {
                fill: none;
                stroke: #9cdcfe;
                stroke-width: 2;
            }
            
            /* Status da tarefa */
            .task-status {
                font-size: 11px;
                font-weight: 500;
                padding: 3px 8px;
                border-radius: 10px;
            }
            
            .task-status.pending {
                background: rgba(158, 158, 158, 0.2);
                color: #9e9e9e;
            }
            
            .task-status.ok {
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }
            
            .task-status.changed {
                background: rgba(255, 152, 0, 0.2);
                color: #FF9800;
            }
            
            .task-status.failed, .task-status.unreachable {
                background: rgba(244, 67, 54, 0.2);
                color: #F44336;
            }
            
            .task-status.skipped {
                background: rgba(158, 158, 158, 0.2);
                color: #9e9e9e;
            }
            
            /* Área de saída da tarefa */
            .task-output {
                padding: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #d4d4d4;
                max-height: 300px;
                overflow-y: auto;
            }
            
            /* Conteúdo da saída */
            .output-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            /* Linhas de resultado */
            .task-result {
                display: flex;
                align-items: flex-start;
                padding: 4px;
                border-radius: 3px;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .task-result.ok {
                background: rgba(76, 175, 80, 0.05);
                border-left: 2px solid #4CAF50;
            }
            
            .task-result.changed {
                background: rgba(255, 152, 0, 0.05);
                border-left: 2px solid #FF9800;
            }
            
            .task-result.failed, .task-result.unreachable {
                background: rgba(244, 67, 54, 0.05);
                border-left: 2px solid #F44336;
            }
            
            .task-result.skipped {
                background: rgba(158, 158, 158, 0.05);
                border-left: 2px solid #9e9e9e;
            }
            
            /* Componentes do resultado */
            .result-type {
                font-weight: bold;
                min-width: 70px;
            }
            
            .task-result.ok .result-type { color: #4CAF50; }
            .task-result.changed .result-type { color: #FF9800; }
            .task-result.failed .result-type, .task-result.unreachable .result-type { color: #F44336; }
            .task-result.skipped .result-type { color: #9e9e9e; }
            
            .result-host {
                font-weight: 500;
                color: #9cdcfe;
                min-width: 120px;
            }
            
            .result-detail {
                flex: 1;
                font-style: italic;
                color: #bbb;
                word-break: break-word;
            }
            
            /* Linhas de saída genéricas */
            .output-line {
                padding: 2px 4px;
                margin-left: 4px;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            /* Spinner animado */
            .ansible-spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid rgba(33, 150, 243, 0.3);
                border-radius: 50%;
                border-top-color: #2196F3;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Mensagem de tarefa atual */
            .current-task-message {
                font-size: 13px;
                color: #2196F3;
                font-weight: 500;
            }
            
            /* Tornar a saída do Ansible visível por padrão */
            .ansible-output {
                display: block !important;
                max-height: 600px !important;
                overflow-y: auto !important;
                background: #1e1e1e !important;
                font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
                font-size: 13px !important;
                padding: 12px !important;
                border-radius: 6px !important;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Sobrescreve a função toggleOutput para manter a visualização em cards
     */
    function overrideToggleOutput() {
        // Armazenar a função original
        const originalToggleOutput = window.toggleOutput;
        
        // Sobrescrever a função
        window.toggleOutput = function(button) {
            try {
                // Buscar o card
                const card = button.closest('.execution-card');
                if (!card) {
                    console.error("Card não encontrado");
                    if (originalToggleOutput) return originalToggleOutput(button);
                    return;
                }
                
                // Buscar o output
                const output = card.querySelector('.ansible-output');
                if (!output) {
                    console.error("Output não encontrado");
                    if (originalToggleOutput) return originalToggleOutput(button);
                    return;
                }
                
                // Detectar se está visível
                const isVisible = output.style.display === 'block';
                
                // Alternar visibilidade
                output.style.display = isVisible ? 'none' : 'block';
                
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
                
                // Se estamos mostrando a saída, verificar se precisamos carregar dados
                if (!isVisible) {
                    const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                    if (jobId && (!output.querySelector('.ansible-cards-container') || 
                                  !output.querySelector('.ansible-play-card'))) {
                        // Verificar se temos o job no cache
                        if (!jobTasksCache.has(jobId)) {
                            jobTasksCache.set(jobId, {
                                plays: [],
                                tasks: [],
                                currentPlay: null,
                                currentTask: null,
                                lastOutput: ""
                            });
                        }
                        
                        // Inicializar a visualização
                        output.innerHTML = `
                            <div class="ansible-cards-container">
                                <div class="ansible-current-task">
                                    <div class="ansible-spinner"></div>
                                    <div class="current-task-message">Carregando saída...</div>
                                </div>
                                <div class="ansible-plays-container"></div>
                            </div>
                        `;
                        
                        // Carregar a saída
                        fetch(`/api/status/${jobId}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.output) {
                                    const cache = jobTasksCache.get(jobId);
                                    cache.lastOutput = data.output;
                                    processAnsibleOutput(data.output, output, jobId);
                                    
                                    // Verificar status
                                    if (data.status !== 'running') {
                                        // Atualizar mensagem
                                        const currentTaskDiv = output.querySelector('.ansible-current-task');
                                        if (currentTaskDiv) {
                                            currentTaskDiv.innerHTML = `
                                                <div class="task-completion-message ${data.status}">
                                                    <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                                        ${data.status === 'completed' 
                                                            ? '<path d="M20 6L9 17l-5-5"></path>' 
                                                            : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                                    </svg>
                                                    <span>${data.status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                                                </div>
                                            `;
                                        }
                                    } else {
                                       // Configurar atualizações periódicas
                                       if (!monitoredJobs.has(jobId)) {
                                        const intervalId = setInterval(() => {
                                            fetch(`/api/status/${jobId}`)
                                                .then(response => response.json())
                                                .then(data => {
                                                    if (data.output !== cache.lastOutput) {
                                                        cache.lastOutput = data.output;
                                                        processAnsibleOutput(data.output, output, jobId);
                                                    }
                                                    
                                                    if (data.status !== 'running') {
                                                        clearInterval(monitoredJobs.get(jobId));
                                                        monitoredJobs.delete(jobId);
                                                        
                                                        // Atualizar mensagem
                                                        const currentTaskDiv = output.querySelector('.ansible-current-task');
                                                        if (currentTaskDiv) {
                                                            currentTaskDiv.innerHTML = `
                                                                <div class="task-completion-message ${data.status}">
                                                                    <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                                                        ${data.status === 'completed' 
                                                                            ? '<path d="M20 6L9 17l-5-5"></path>' 
                                                                            : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                                                    </svg>
                                                                    <span>${data.status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                                                                </div>
                                                            `;
                                                        }
                                                    }
                                                })
                                                .catch(err => console.error("Erro ao atualizar saída:", err));
                                        }, 2000);
                                        
                                        monitoredJobs.set(jobId, intervalId);
                                    }
                                }
                            }
                        })
                        .catch(err => console.error("Erro ao carregar saída inicial:", err));
                }
            }
        } catch (error) {
            console.error("Erro em toggleOutput:", error);
            // Em caso de erro, tenta usar a função original
            if (originalToggleOutput) {
                return originalToggleOutput(button);
            }
        }
    };
}

/**
 * Inicializa melhorias para a função handlePlaybookCompletion
 */
function enhanceCompletionHandler() {
    // Armazenar a função original
    const originalHandler = window.handlePlaybookCompletion;
    
    // Substituir pela versão melhorada
    window.handlePlaybookCompletion = function(status, card) {
        // Chamar a função original para manter compatibilidade
        if (typeof originalHandler === 'function') {
            originalHandler(status, card);
        }
        
        // Adicionar melhorias
        try {
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            if (!jobId) return;
            
            // Buscar o elemento de saída
            const outputDiv = card.querySelector('.ansible-output');
            if (!outputDiv) return;
            
            // Verificar se usamos nosso formato de cards
            const currentTaskDiv = outputDiv.querySelector('.ansible-current-task');
            if (currentTaskDiv) {
                // Atualizar mensagem de conclusão
                currentTaskDiv.innerHTML = `
                    <div class="task-completion-message ${status}">
                        <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                            ${status === 'completed' 
                                ? '<path d="M20 6L9 17l-5-5"></path>' 
                                : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                        </svg>
                        <span>${status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                    </div>
                `;
            }
            
            // Parar monitoramento se estiver rodando
            if (monitoredJobs.has(jobId)) {
                clearInterval(monitoredJobs.get(jobId));
                monitoredJobs.delete(jobId);
            }
        } catch (error) {
            console.error("Erro ao processar conclusão do playbook:", error);
        }
    };
}

/**
 * Inicializa todas as melhorias
 */
function init() {
    console.log("Inicializando melhorias de visualização em cards para Ansible");
    
    // Adicionar estilos CSS
    addStyles();
    
    // Sobrescrever a função toggleOutput
    overrideToggleOutput();
    
    // Melhorar o manipulador de conclusão
    enhanceCompletionHandler();
    
    // Aplicar as melhorias aos cards existentes
    document.querySelectorAll('.execution-card').forEach(card => {
        const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
        if (!jobId) return;
        
        // Verificar se o card tem saída e se está visível
        const outputDiv = card.querySelector('.ansible-output');
        if (!outputDiv) return;
        
        // Se a saída está visível e não tem nosso formato de cards, transformá-la
        if (outputDiv.style.display === 'block' && !outputDiv.querySelector('.ansible-cards-container')) {
            // Buscar dados do job
            fetch(`/api/status/${jobId}`)
                .then(response => response.json())
                .then(data => {
                    if (!data || !data.output) return;
                    
                    // Inicializar cache para este job
                    if (!jobTasksCache.has(jobId)) {
                        jobTasksCache.set(jobId, {
                            plays: [],
                            tasks: [],
                            currentPlay: null,
                            currentTask: null,
                            lastOutput: data.output
                        });
                    }
                    
                    // Inicializar visualização em cards
                    outputDiv.innerHTML = `
                        <div class="ansible-cards-container">
                            <div class="ansible-current-task">
                                ${data.status === 'running' ? 
                                    `<div class="ansible-spinner"></div>
                                    <div class="current-task-message">Atualizando saída...</div>` :
                                    `<div class="task-completion-message ${data.status}">
                                        <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                            ${data.status === 'completed' 
                                                ? '<path d="M20 6L9 17l-5-5"></path>' 
                                                : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                        </svg>
                                        <span>${data.status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                                    </div>`
                                }
                            </div>
                            <div class="ansible-plays-container"></div>
                        </div>
                    `;
                    
                    // Processar saída
                    processAnsibleOutput(data.output, outputDiv, jobId);
                    
                    // Se a execução ainda estiver em andamento, iniciar monitoramento
                    if (data.status === 'running' && !monitoredJobs.has(jobId)) {
                        const intervalId = setInterval(() => {
                            fetch(`/api/status/${jobId}`)
                                .then(response => response.json())
                                .then(data => {
                                    const cache = jobTasksCache.get(jobId);
                                    if (data.output !== cache.lastOutput) {
                                        cache.lastOutput = data.output;
                                        processAnsibleOutput(data.output, outputDiv, jobId);
                                    }
                                    
                                    // Verificar se a execução terminou
                                    if (data.status !== 'running') {
                                        clearInterval(monitoredJobs.get(jobId));
                                        monitoredJobs.delete(jobId);
                                        
                                        // Atualizar mensagem
                                        const currentTaskDiv = outputDiv.querySelector('.ansible-current-task');
                                        if (currentTaskDiv) {
                                            currentTaskDiv.innerHTML = `
                                                <div class="task-completion-message ${data.status}">
                                                    <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                                        ${data.status === 'completed' 
                                                            ? '<path d="M20 6L9 17l-5-5"></path>' 
                                                            : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                                    </svg>
                                                    <span>${data.status === 'completed' ? 'Execução concluída com sucesso' : 'Execução falhou'}</span>
                                                </div>
                                            `;
                                        }
                                    }
                                })
                                .catch(err => console.error("Erro ao atualizar saída:", err));
                        }, 2000);
                        
                        monitoredJobs.set(jobId, intervalId);
                    }
                })
                .catch(err => console.error("Erro ao processar card existente:", err));
        }
    });
    
    // Configurar observador para aplicar as melhorias a novos cards
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                        // Encontrar botão de toggle
                        const toggleBtn = node.querySelector('.toggle-output-btn');
                        if (toggleBtn) {
                            // Modificar para mostrar saída automaticamente
                            setTimeout(() => {
                                toggleBtn.click();
                            }, 500);
                        }
                    }
                });
            }
        });
    });
    
    // Iniciar observação em qualquer container onde cards possam ser adicionados
    const container = document.getElementById('running-playbooks');
    if (container) {
        observer.observe(container, { childList: true });
    }
    
    console.log("Melhorias de visualização em cards para Ansible inicializadas com sucesso");
}

// Carregar as melhorias quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
})();