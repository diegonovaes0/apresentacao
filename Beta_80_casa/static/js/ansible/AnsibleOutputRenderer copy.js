/**
 * AnsibleOutputRenderer.js
 * 
 * Classe para renderizar a saída do Ansible em uma interface amigável ao usuário
 * Compatível com o sistema Ansible existente e pode ser facilmente integrado
 */

class AnsibleOutputRenderer {
    /**
     * Inicializa o renderizador
     * @param {Object} options - Opções de configuração
     */
    constructor(options = {}) {a
        this.options = Object.assign({
            selector: '#ansible-output',
            autoRefresh: true,
            refreshInterval: 3000,
            darkMode: true,
            collapsibleTasks: true,
            showTimestamps: true,
            animateChanges: true
        }, options);
        
        this.container = document.querySelector(this.options.selector);
        this.currentJobId = null;
        this.intervalId = null;
        this.tasks = new Map();
        this.plays = new Map();
        this.stats = {
            ok: 0,
            changed: 0,
            failed: 0,
            skipped: 0,
            unreachable: 0
        };
        
        this.init();
    }
    
    /**
     * Inicializa o renderizador
     */
    init() {
        if (!this.container) {
            console.error('Container não encontrado:', this.options.selector);
            return;
        }
        
        // Adicionar estilos
        this.addStyles();
        
        // Criar estrutura básica
        this.container.innerHTML = this.createBaseStructure();
        
        // Inicializar eventos
        this.initEvents();
    }
    
    /**
     * Adiciona os estilos necessários
     */
    addStyles() {
        if (document.getElementById('ansible-renderer-styles')) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'ansible-renderer-styles';
        styleSheet.textContent = `
        .ansible-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            color: ${this.options.darkMode ? '#d4d4d4' : '#333'};
            background-color: ${this.options.darkMode ? '#1e1e1e' : '#fff'};
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .ansible-header {
            background: ${this.options.darkMode ? '#252526' : '#f5f5f5'};
            padding: 15px 20px;
            border-bottom: 1px solid ${this.options.darkMode ? '#333' : '#e0e0e0'};
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .ansible-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .ansible-actions {
            display: flex;
            gap: 10px;
        }
        
        .ansible-btn {
            background: ${this.options.darkMode ? '#333' : '#e0e0e0'};
            color: ${this.options.darkMode ? '#d4d4d4' : '#333'};
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
            outline: none;
        }
        
        .ansible-btn:hover {
            background: ${this.options.darkMode ? '#444' : '#d0d0d0'};
        }
        
        .ansible-btn.primary {
            background: #0e639c;
            color: white;
        }
        
        .ansible-btn.primary:hover {
            background: #1177bb;
        }
        
        .ansible-progress {
            height: 4px;
            background: ${this.options.darkMode ? '#333' : '#e0e0e0'};
            width: 100%;
            overflow: hidden;
        }
        
        .ansible-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #0e639c, #73c991);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .ansible-tabs {
            display: flex;
            background: ${this.options.darkMode ? '#252526' : '#f5f5f5'};
            border-bottom: 1px solid ${this.options.darkMode ? '#333' : '#e0e0e0'};
        }
        
        .ansible-tab {
            padding: 10px 15px;
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
        }
        
        .ansible-tab.active {
            border-bottom-color: #0e639c;
            background: ${this.options.darkMode ? '#1e1e1e' : '#fff'};
        }
        
        .ansible-tab:hover:not(.active) {
            background: ${this.options.darkMode ? '#2a2a2a' : '#eee'};
        }
        
        .ansible-content {
            padding: 0;
        }
        
        .ansible-tab-content {
            display: none;
            padding: 15px;
            max-height: 500px;
            overflow: auto;
        }
        
        .ansible-tab-content.active {
            display: block;
        }
        
        .ansible-task-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .ansible-play {
            margin: 10px 0;
            padding: 10px 15px;
            background: ${this.options.darkMode ? '#252526' : '#f5f5f5'};
            border-radius: 6px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: ${this.options.darkMode ? '#569cd6' : '#0e639c'};
        }
        
        .ansible-task-item {
            padding: 12px 15px;
            background: ${this.options.darkMode ? '#252526' : '#f5f5f5'};
            border-radius: 6px;
            display: flex;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
            ${this.options.collapsibleTasks ? 'cursor: pointer;' : ''}
        }
        
        .ansible-task-item:hover {
            background: ${this.options.darkMode ? '#2d2d2d' : '#eee'};
        }
        
        .ansible-task-item.expanded {
            background: ${this.options.darkMode ? '#2d2d2d' : '#eee'};
        }
        
        .ansible-task-item.task-ok {
            border-left-color: #4CAF50;
        }
        
        .ansible-task-item.task-changed {
            border-left-color: #FF9800;
        }
        
        .ansible-task-item.task-failed {
            border-left-color: #F44336;
        }
        
        .ansible-task-item.task-skipped {
            border-left-color: #9E9E9E;
        }
        
        .ansible-task-item.task-unreachable {
            border-left-color: #F44336;
        }
        
        .task-icon {
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .task-content {
            flex: 1;
        }
        
        .task-name {
            font-weight: 500;
            margin-bottom: 5px;
        }
        
        .task-time {
            font-size: 11px;
            color: ${this.options.darkMode ? '#777' : '#888'};
            margin-bottom: 5px;
        }
        
        .task-host {
            font-size: 12px;
            color: ${this.options.darkMode ? '#999' : '#888'};
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .task-detail {
            display: none;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid ${this.options.darkMode ? '#333' : '#e0e0e0'};
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 12px;
            white-space: pre-wrap;
            overflow: auto;
            max-height: 200px;
        }
        
        .ansible-task-item.expanded .task-detail {
            display: block;
        }
        
        .task-toggle {
            margin-left: 10px;
            color: ${this.options.darkMode ? '#999' : '#888'};
            transition: transform 0.2s ease;
        }
        
        .ansible-task-item.expanded .task-toggle {
            transform: rotate(90deg);
        }
        
        .task-ok .task-icon {
            color: #4CAF50;
        }
        
        .task-changed .task-icon {
            color: #FF9800;
        }
        
        .task-failed .task-icon {
            color: #F44336;
        }
        
        .task-skipped .task-icon {
            color: #9E9E9E;
        }
        
        .task-unreachable .task-icon {
            color: #F44336;
        }
        
        .ansible-summary {
            padding: 15px 0;
        }
        
        .ansible-summary-item {
            padding: 10px 15px;
            background: ${this.options.darkMode ? '#252526' : '#f5f5f5'};
            border-radius: 6px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .ansible-summary-label {
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .ansible-summary-value {
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .status-success {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
        }
        
        .status-warning {
            background: rgba(255, 152, 0, 0.2);
            color: #FF9800;
        }
        
        .status-danger {
            background: rgba(244, 67, 54, 0.2);
            color: #F44336;
        }
        
        .ansible-raw-output {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 13px;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        
        .raw-play {
            color: ${this.options.darkMode ? '#569cd6' : '#0e639c'};
            font-weight: bold;
            padding: 5px 0;
            margin: 10px 0;
            border-bottom: 1px solid ${this.options.darkMode ? '#333' : '#e0e0e0'};
        }
        
        .raw-task {
            color: ${this.options.darkMode ? '#9cdcfe' : '#1177bb'};
            font-weight: bold;
            margin: 10px 0 5px 0;
        }
        
        .raw-ok {
            color: #4ec9b0;
        }
        
        .raw-changed {
            color: #dcdcaa;
        }
        
        .raw-failed {
            color: #f14c4c;
        }
        
        .raw-skipped {
            color: #808080;
        }
        
        .raw-unreachable {
            color: #f14c4c;
        }
        
        .raw-recap {
            color: ${this.options.darkMode ? '#569cd6' : '#0e639c'};
            font-weight: bold;
            margin: 10px 0;
            padding-top: 10px;
            border-top: 1px solid ${this.options.darkMode ? '#333' : '#e0e0e0'};
        }
        
        /* Animação para novas tarefas */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .ansible-task-item.new-task {
            animation: fadeIn 0.3s ease;
        }
        
        /* Spinner para tarefas em execução */
        .task-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
            .ansible-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .ansible-actions {
                width: 100%;
            }
            
            .ansible-btn {
                flex: 1;
                justify-content: center;
            }
        }
        `;
        
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Cria a estrutura básica HTML
     */
    createBaseStructure() {
        return `
        <div class="ansible-container">
            <div class="ansible-header">
                <h3 class="ansible-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span class="playbook-name">Execução do Ansible</span>
                </h3>
                <div class="ansible-actions">
                    <button class="ansible-btn copy-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        Copiar Saída
                    </button>
                    <button class="ansible-btn primary reload-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                            <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Recarregar
                    </button>
                </div>
            </div>
            
            <div class="ansible-progress">
                <div class="ansible-progress-bar" style="width: 0%"></div>
            </div>
            
            <div class="ansible-tabs">
                <div class="ansible-tab active" data-tab="tasks">Tarefas</div>
                <div class="ansible-tab" data-tab="summary">Resumo</div>
                <div class="ansible-tab" data-tab="output">Saída Completa</div>
            </div>
            
            <div class="ansible-content">
                <div class="ansible-tab-content active" id="tab-tasks">
                    <div class="ansible-task-list"></div>
                </div>
                
                <div class="ansible-tab-content" id="tab-summary">
                    <div class="ansible-summary"></div>
                </div>
                
                <div class="ansible-tab-content" id="tab-output">
                    <div class="ansible-raw-output"></div>
                </div>
            </div>
        </div>`;
    }
    
    /**
     * Inicializa os eventos dos elementos
     */
    initEvents() {
        // Tabs
        const tabs = this.container.querySelectorAll('.ansible-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                const contents = this.container.querySelectorAll('.ansible-tab-content');
                contents.forEach(c => c.classList.remove('active'));
                this.container.querySelector(`#tab-${tabName}`).classList.add('active');
            });
        });
        
        // Botão de Copiar
        const copyBtn = this.container.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const rawOutput = this.container.querySelector('.ansible-raw-output');
            navigator.clipboard.writeText(rawOutput.textContent)
                .then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        Copiado!
                    `;
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                    }, 2000);
                })
                .catch(err => console.error('Erro ao copiar:', err));
        });
        
        // Botão de Recarregar
        const reloadBtn = this.container.querySelector('.reload-btn');
        reloadBtn.addEventListener('click', () => {
            if (this.currentJobId) {
                this.refreshOutput(this.currentJobId);
            }
        });
    }
    
    /**
     * Inicializa a exibição da saída
     * @param {string} jobId - ID do trabalho Ansible
     * @param {string} playbookName - Nome do playbook
     */
    initOutput(jobId, playbookName = 'Execução do Ansible') {
        this.currentJobId = jobId;
        
        // Atualizar nome do playbook
        this.container.querySelector('.playbook-name').textContent = playbookName;
        
        // Limpar dados anteriores
        this.tasks.clear();
        this.plays.clear();
        this.stats = {
            ok: 0,
            changed: 0,
            failed: 0,
            skipped: 0,
            unreachable: 0
        };
        
        // Limpar áreas de conteúdo
        this.container.querySelector('.ansible-task-list').innerHTML = '';
        this.container.querySelector('.ansible-summary').innerHTML = '';
        this.container.querySelector('.ansible-raw-output').innerHTML = '';
        this.container.querySelector('.ansible-progress-bar').style.width = '0%';
        
        // Iniciar auto-refresh se configurado
        if (this.options.autoRefresh) {
            this.startAutoRefresh(jobId);
        }
        
        // Carregar a saída inicial
        this.refreshOutput(jobId);
    }
    
    /**
     * Inicia atualização automática da saída
     * @param {string} jobId - ID do trabalho Ansible
     */
    startAutoRefresh(jobId) {
        // Limpar intervalo anterior se existir
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Criar novo intervalo
        this.intervalId = setInterval(() => {
            this.refreshOutput(jobId);
        }, this.options.refreshInterval);
    }
    
    /**
     * Para a atualização automática
     */
    stopAutoRefresh() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    /**
     * Atualiza a saída do Ansible
     * @param {string} jobId - ID do trabalho Ansible
     */
    // Modificar a função refreshOutput na classe AnsibleOutputRenderer
function refreshOutput(jobId) {
    // Requisição para a API
    fetch(`/api/status/${jobId}`)
        .then(response => response.json())
        .then(data => {
            // Verificar se é uma resposta válida
            if (!data) {
                console.error('Dados inválidos recebidos');
                return;
            }
            
            // Atualizar a barra de progresso
            this.updateProgress(data.progress || 0);
            
            // Processar a saída - Mostrando sempre a saída em vez de "Carregando..."
            if (data.output) {
                this.processOutput(data.output);
            }
            
            // Verificar se o job terminou
            if (data.status !== 'running') {
                this.stopAutoRefresh();
            } else {
                // Se ainda está em execução, continue atualizando em tempo real
                // para manter a interface atualizada
                setTimeout(() => {
                    this.refreshOutput(jobId);
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar saída:', error);
            this.stopAutoRefresh();
        });
}
    /**
     * Atualiza a barra de progresso
     * @param {number} progress - Valor do progresso (0-100)
     */
    updateProgress(progress) {
        const progressBar = this.container.querySelector('.ansible-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    /**
 * Processa a saída bruta do Ansible
 * @param {string} output - Saída bruta do Ansible
 */
// Modificar a função processOutput para mostrar sempre a saída em tempo real
function processOutput(output) {
    // Atualizar a saída bruta
    const rawOutput = this.container.querySelector('.ansible-raw-output');
    rawOutput.innerHTML = this.formatRawOutput(output);
    
    // Processar tarefas e plays
    this.parseAnsibleOutput(output);
    
    // Atualizar a visualização de tarefas
    this.updateTaskView();
    
    // Atualizar o resumo
    this.updateSummary();
    
    // Rolar para o final da saída para mostrar o conteúdo mais recente
    rawOutput.scrollTop = rawOutput.scrollHeight;
}
    
    /**
     * Formata a saída bruta com cores
     * @param {string} output - Saída bruta do Ansible
     * @returns {string} - HTML formatado
     */
    formatRawOutput(output) {
        if (!output) return '';
        
        // Substituições para colorização
        let formatted = output
            .replace(/PLAY\s*\[(.*?)\]/g, '<div class="raw-play">PLAY [$1]</div>')
            .replace(/TASK\s*\[(.*?)\]/g, '<div class="raw-task">TASK [$1]</div>')
            .replace(/ok:/g, '<span class="raw-ok">ok:</span>')
            .replace(/changed:/g, '<span class="raw-changed">changed:</span>')
            .replace(/failed:/g, '<span class="raw-failed">failed:</span>')
            .replace(/skipped:/g, '<span class="raw-skipped">skipped:</span>')
            .replace(/unreachable:/g, '<span class="raw-unreachable">unreachable:</span>')
            .replace(/PLAY RECAP/g, '<div class="raw-recap">PLAY RECAP</div>');
        
        return formatted;
    }
    
    /**
 * Analisa a saída do Ansible para extrair plays, tarefas e status
 * @param {string} output - Saída bruta do Ansible
 */
parseAnsibleOutput(output) {
    if (!output) return;
    
    const lines = output.split('\n');
    let currentPlay = null;
    let currentTask = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Detectar Play
        const playMatch = trimmedLine.match(/PLAY\s*\[(.*?)\]/);
        if (playMatch) {
            const playName = playMatch[1].trim();
            const playId = `play_${this.plays.size}`;
            
            // Criar novo play se não existir
            if (!this.plays.has(playId)) {
                currentPlay = {
                    id: playId,
                    name: playName,
                    tasks: []
                };
                this.plays.set(playId, currentPlay);
            } else {
                currentPlay = this.plays.get(playId);
            }
            
            continue;
        }
        
        // Detectar Task
        const taskMatch = trimmedLine.match(/TASK\s*\[(.*?)\]/);
        if (taskMatch) {
            const taskName = taskMatch[1].trim();
            const taskId = `task_${this.tasks.size}`;
            
            // Garantir que temos um play
            if (!currentPlay) {
                const playId = `play_${this.plays.size}`;
                currentPlay = {
                    id: playId,
                    name: "Unnamed Play",
                    tasks: []
                };
                this.plays.set(playId, currentPlay);
            }
            
            // Criar nova task
            currentTask = {
                id: taskId,
                name: taskName,
                playId: currentPlay.id,
                status: null,
                host: "localhost",
                detail: "",
                time: new Date().toLocaleTimeString()
            };
            
            this.tasks.set(taskId, currentTask);
            currentPlay.tasks.push(taskId);
            
            continue;
        }
        
        // Detectar status de tarefa
        for (const status of ['ok', 'changed', 'failed', 'unreachable']) { // Removido 'skipped' da lista
            if (trimmedLine.startsWith(`${status}:`)) {
                const parts = trimmedLine.split(' => ', 1);
                const hostPart = parts[0].replace(`${status}:`, '').trim();
                const detailPart = trimmedLine.includes(' => ') ? 
                                  trimmedLine.split(' => ')[1].trim() : '';
                
                // Se não temos uma tarefa, criar uma genérica
                if (!currentTask && currentPlay) {
                    const taskId = `task_${this.tasks.size}`;
                    currentTask = {
                        id: taskId,
                        name: "Unnamed Task",
                        playId: currentPlay.id,
                        status: null,
                        host: hostPart,
                        detail: "",
                        time: new Date().toLocaleTimeString()
                    };
                    
                    this.tasks.set(taskId, currentTask);
                    currentPlay.tasks.push(taskId);
                }
                
                // Atualizar a tarefa atual
                if (currentTask) {
                    currentTask.status = status;
                    currentTask.host = hostPart || currentTask.host;
                    
                    if (detailPart) {
                        currentTask.detail += detailPart + '\n';
                    }
                    
                    // Atualizar estatísticas
                    if (this.stats.hasOwnProperty(status)) {
                        this.stats[status]++;
                    }
                }
                
                break;
            }
        }
        
        // Adicionar linha ao detalhe da tarefa atual se existir
        if (currentTask && !trimmedLine.startsWith('PLAY ') && 
            !trimmedLine.startsWith('TASK ') && 
            !trimmedLine.match(/^(ok|changed|failed|skipped|unreachable):/)) {
            currentTask.detail += trimmedLine + '\n';
        }
    }
}
    
    /**
 * Atualiza a visualização de tarefas mostrando spinner para tarefas em andamento
 */
updateTaskView() {
    const taskList = this.container.querySelector('.ansible-task-list');
    
    // Não limpar o conteúdo existente para preservar tarefas já renderizadas
    // Em vez disso, atualizar ou adicionar tarefas conforme necessário
    
    // Mapear tarefas existentes por ID para referência rápida
    const existingTasks = {};
    taskList.querySelectorAll('.ansible-task-item').forEach(task => {
        existingTasks[task.id] = task;
    });
    
    // Adicionar plays e tarefas
    this.plays.forEach(play => {
        // Verificar se o play já existe
        let playElement = taskList.querySelector(`[data-play-id="${play.id}"]`);
        
        // Se o play não existe, criá-lo
        if (!playElement) {
            playElement = document.createElement('div');
            playElement.className = 'ansible-play';
            playElement.setAttribute('data-play-id', play.id);
            playElement.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                ${play.name}
            `;
            taskList.appendChild(playElement);
        }
        
        // Adicionar ou atualizar tarefas do play
        play.tasks.forEach(taskId => {
            const task = this.tasks.get(taskId);
            if (!task) return;
            
            // Verificar se a tarefa já existe
            let taskElement = existingTasks[task.id];
            const isNew = !taskElement;
            
            // Se a tarefa não existe, criá-la
            if (isNew) {
                taskElement = document.createElement('div');
                taskElement.id = task.id;
                taskElement.className = `ansible-task-item`;
                
                // Se a tarefa é interativa, adicionar evento de click
                if (this.options.collapsibleTasks) {
                    taskElement.addEventListener('click', (e) => {
                        taskElement.classList.toggle('expanded');
                    });
                }
            }
            
            // Atualizar o status da tarefa
            if (task.status) {
                // Remover todas as classes de status anteriores
                taskElement.classList.remove('task-ok', 'task-changed', 'task-failed', 'task-skipped', 'task-unreachable');
                // Adicionar a classe de status atual
                taskElement.classList.add(`task-${task.status}`);
            }
            
            // Determinar o ícone com base no status
            let icon = '<div class="task-spinner"></div>'; // Spinner para tarefas em andamento
            
            if (task.status) {
                switch (task.status) {
                    case 'ok':
                        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>`;
                        break;
                    case 'changed':
                        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>`;
                        break;
                    case 'failed':
                        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>`;
                        break;
                    case 'skipped':
                        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 4 15 12 5 20 5 4"></polygon>
                            <line x1="19" y1="5" x2="19" y2="19"></line>
                        </svg>`;
                        break;
                    case 'unreachable':
                        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                            <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>`;
                        break;
                }
            }
            
            const timeHtml = this.options.showTimestamps ? 
                `<div class="task-time">${task.time}</div>` : '';
            
            // Atualizar o conteúdo HTML da tarefa
            taskElement.innerHTML = `
                <div class="task-icon">
                    ${icon}
                </div>
                <div class="task-content">
                    <div class="task-name">${task.name}</div>
                    ${timeHtml}
                    <div class="task-host">
                        <span>Host: ${task.host}</span>
                        <span class="task-toggle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </span>
                    </div>
                    <div class="task-detail">${task.detail || "Sem detalhes disponíveis."}</div>
                </div>
            `;
            
            // Se for uma nova tarefa, adicionar ao DOM e aplicar efeito de animação
            if (isNew) {
                // Adicionar com efeito se configurado
                if (this.options.animateChanges) {
                    taskElement.classList.add('new-task');
                    setTimeout(() => {
                        taskElement.classList.remove('new-task');
                    }, 500);
                }
                
                taskList.appendChild(taskElement);
            }
            // Se a tarefa já existia mas recebeu um novo status, aplicar efeito de transição
            else if (task.status && !taskElement.getAttribute('data-status') !== task.status) {
                taskElement.setAttribute('data-status', task.status);
                
                if (this.options.animateChanges) {
                    taskElement.classList.add('status-changed');
                    setTimeout(() => {
                        taskElement.classList.remove('status-changed');
                    }, 500);
                }
            }
        });
    });
}
    
    /**
     * Atualiza o resumo da execução
     */
    updateSummary() {
        const summaryElement = this.container.querySelector('.ansible-summary');
        
        // Determinar status geral
        let status = 'running';
        let statusText = 'Em andamento';
        let statusClass = 'status-warning';
        
        if (this.tasks.size > 0) {
            if (this.stats.failed > 0 || this.stats.unreachable > 0) {
                status = 'failed';
                statusText = 'Falhou';
                statusClass = 'status-danger';
            } else if (this.stats.ok + this.stats.changed + this.stats.skipped > 0) {
                status = 'completed';
                statusText = 'Concluído com sucesso';
                statusClass = 'status-success';
            }
        }
        
        // Progresso calculado
        const totalTasks = this.tasks.size;
        const completedTasks = this.stats.ok + this.stats.changed + this.stats.failed + this.stats.skipped + this.stats.unreachable;
        const progress = totalTasks ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;
        
        // Atualizar a barra de progresso
        this.updateProgress(progress);
        
        // Construir HTML do resumo
        let html = `
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                Status Geral
            </div>
            <div class="ansible-summary-value ${statusClass}">
                ${statusText}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                <div class="task-icon" style="color: #4CAF50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                Tarefas OK
            </div>
            <div class="ansible-summary-value status-success">
                ${this.stats.ok}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                <div class="task-icon" style="color: #FF9800">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </div>
                Tarefas Alteradas
            </div>
            <div class="ansible-summary-value status-warning">
                ${this.stats.changed}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                <div class="task-icon" style="color: #F44336">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                Tarefas Falhas
            </div>
            <div class="ansible-summary-value status-danger">
                ${this.stats.failed}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                <div class="task-icon" style="color: #9E9E9E">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                        <line x1="19" y1="5" x2="19" y2="19"></line>
                    </svg>
                </div>
                Tarefas Ignoradas
            </div>
            <div class="ansible-summary-value">
                ${this.stats.skipped}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                <div class="task-icon" style="color: #F44336">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                </div>
                Hosts Inacessíveis
            </div>
            <div class="ansible-summary-value status-danger">
                ${this.stats.unreachable}
            </div>
        </div>
        
        <div class="ansible-summary-item">
            <div class="ansible-summary-label">
                Progresso
            </div>
            <div class="ansible-summary-value ${statusClass}">
                ${progress}%
            </div>
        </div>
        `;
        
        summaryElement.innerHTML = html;
    }
}

// Função para inicializar o renderizador em uma página
function initAnsibleRenderer(selector = '#ansible-output', options = {}) {
    const renderer = new AnsibleOutputRenderer({
        selector: selector,
        ...options
    });
    
    // Expor globalmente para uso em eventos da página
    window.ansibleRenderer = renderer;
    
    return renderer;
}

// Integração com sistema existente
function integrateWithAnsibleSystem() {
    // Substituir a função de monitoramento existente
    if (typeof window.monitorPlaybookExecution === 'function') {
        const originalMonitor = window.monitorPlaybookExecution;
        
        window.monitorPlaybookExecution = function(jobId, card) {
            // Verificar se o card tem um container de saída ansible
            let outputContainer = card.querySelector('.ansible-output-container');
            if (!outputContainer) {
                // Criar container
                outputContainer = document.createElement('div');
                outputContainer.id = `ansible-output-${jobId}`;
                outputContainer.className = 'ansible-output-container';
                
                // Encontrar o local para inserir
                const insertAfter = card.querySelector('.card-header') || card.firstChild;
                if (insertAfter && insertAfter.nextSibling) {
                    card.insertBefore(outputContainer, insertAfter.nextSibling);
                } else {
                    card.appendChild(outputContainer);
                }
                
                // Inicializar renderizador
                const renderer = new AnsibleOutputRenderer({
                    selector: `#ansible-output-${jobId}`,
                    autoRefresh: true,
                    refreshInterval: 3000
                });
                
                // Obter nome do playbook
                const playbookName = card.getAttribute('data-playbook-name') || 'Execução do Ansible';
                renderer.initOutput(jobId, playbookName);
            }
            
            // Ainda chama a função original para compatibilidade
            originalMonitor(jobId, card);
        };
    }
    
    // Adicionar melhorias à interface existente
    document.addEventListener('DOMContentLoaded', function() {
        // Adicionar estilos globais
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .execution-card {
                margin-bottom: 20px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                background: #1e1e1e;
                color: #d4d4d4;
            }
            
            .card-header {
                background: #252526;
                padding: 15px 20px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .card-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .card-actions {
                display: flex;
                gap: 10px;
            }
            
            .btn {
                background: #333;
                color: #d4d4d4;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .btn:hover {
                background: #444;
            }
            
            .btn-primary {
                background: #0e639c;
                color: white;
            }
            
            .btn-primary:hover {
                background: #1177bb;
            }
            
            .btn-danger {
                background: #d32f2f;
                color: white;
            }
            
            .btn-danger:hover {
                background: #e33e3e;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Aprimorar cards existentes
        document.querySelectorAll('.execution-card').forEach(card => {
            enhanceCard(card);
        });
        
        // Observar novos cards
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                            enhanceCard(node);
                        }
                    });
                }
            });
        });
        
        // Iniciar observação
        const container = document.querySelector('#running-playbooks') || document.body;
        observer.observe(container, { childList: true, subtree: true });
    });
    
    // Função para aprimorar cards existentes
    function enhanceCard(card) {
        // Verificar se já foi aprimorado
        if (card.dataset.enhanced === 'true') return;
        card.dataset.enhanced = 'true';
        
        // Extrair job_id do card
        const jobId = card.dataset.jobId;
        if (!jobId) return;
        
        // Adicionar botão de visualização detalhada
        const cardActions = card.querySelector('.card-actions');
        if (cardActions) {
            const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-primary view-details-btn';
            viewButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Visualização Detalhada
            `;
            viewButton.addEventListener('click', () => {
                // Abrir visualização detalhada
                window.open(`/ansible/output/${jobId}`, '_blank');
            });
            
            cardActions.appendChild(viewButton);
        }
        
        // Encontrar ou criar container para o renderizador
        let outputContainer = card.querySelector('.ansible-output-container');
        if (!outputContainer) {
            outputContainer = document.createElement('div');
            outputContainer.id = `ansible-output-${jobId}`;
            outputContainer.className = 'ansible-output-container';
            
            // Encontrar o local para inserir
            const insertAfter = card.querySelector('.card-header') || card.firstChild;
            if (insertAfter && insertAfter.nextSibling) {
                card.insertBefore(outputContainer, insertAfter.nextSibling);
            } else {
                card.appendChild(outputContainer);
            }
            
            // Inicializar renderizador
            const renderer = new AnsibleOutputRenderer({
                selector: `#ansible-output-${jobId}`,
                autoRefresh: true,
                refreshInterval: 3000
            });
            
            // Obter nome do playbook
            const playbookName = card.getAttribute('data-playbook-name') || 'Execução do Ansible';
            renderer.initOutput(jobId, playbookName);
        }
    }
}