/**
 * ansible-output-enhancer.js
 * Melhora a usabilidade da interface do Ansible com foco na saída de execução.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando melhorias de usabilidade para saída do Ansible");
    
    // Injetar os estilos necessários
    injectStyles();
    
    // Sobrescrever a função toggleOutput
    setupToggleFunction();
    
    // Configurar observer para detectar novos cards
    setupCardObserver();
    
    // Adicionar botão de limpar execuções
    addClearExecutionsButton();
});

/**
 * Injeta os estilos necessários para os cards de saída
 */
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos dos cards de execução */
        .execution-card {
            position: relative;
            margin-bottom: 16px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            background: var(--black-pearl, #121212);
            border: 1px solid var(--gray-dark, #2A2A2A);
        }
        
        /* Garantir que a saída esteja oculta inicialmente */
        .ansible-output {
            display: none;
            max-height: 500px;
            overflow-y: auto;
            padding: 15px;
            border-top: 1px solid var(--gray-dark, #2A2A2A);
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #d4d4d4;
            position: relative;
            padding-bottom: 50px; /* Espaço para o botão recolher */
        }
        
        /* Estilo específico quando a saída está visível */
        .ansible-output.output-visible {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        /* Container para o botão recolher */
        .recolher-container {
            position: sticky;
            bottom: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(to bottom, transparent, rgba(18, 18, 18, 0.9) 30%);
            padding: 10px 0;
            display: flex;
            justify-content: center;
            z-index: 10;
        }
        
        /* Botão para recolher a saída */
        .recolher-btn {
            background: var(--accent-gold, #FFD600);
            color: var(--black-rich, #030303);
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .recolher-btn:hover {
            background: #ffde33;
        }
        
        /* Resumo de baseline */
        .baseline-summary {
            background: rgba(255, 214, 0, 0.1);
            border: 1px solid var(--accent-gold, #FFD600);
            border-radius: 6px;
            margin: 10px 15px;
            padding: 12px;
            display: none;
        }
        
        .baseline-summary.visible {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .baseline-summary h4 {
            margin: 0 0 10px 0;
            color: var(--accent-gold, #FFD600);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .baseline-summary-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .baseline-summary-item {
            display: flex;
            flex-direction: column;
        }
        
        .baseline-summary-item span:first-child {
            color: var(--text-secondary, #808080);
            font-size: 11px;
        }
        
        .baseline-summary-item span:last-child {
            color: var(--text-primary, #FFFFFF);
            font-weight: bold;
            word-break: break-word;
        }
        
        .baseline-summary-actions {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        
        .baseline-summary-btn {
            background: var(--gray-dark, #2A2A2A);
            color: var(--text-primary, #FFFFFF);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .baseline-summary-btn:hover {
            background: var(--gray-light, #3A3A3A);
        }
        
        .baseline-summary-btn.primary {
            background: var(--accent-gold, #FFD600);
            color: var(--black-rich, #030303);
        }
        
        .baseline-summary-btn.primary:hover {
            background: #ffde33;
        }
        
        /* Task list styling */
        .ansible-task-list {
            margin: 15px 0;
            display: none;
        }
        
        .ansible-task-list.visible {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .ansible-task-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 10px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.2);
            margin-bottom: 6px;
        }
        
        .task-status {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        
        .task-name {
            flex: 1;
            font-size: 12px;
        }
        
        .task-spinner {
            border: 2px solid rgba(86, 156, 214, 0.2);
            border-top-color: var(--accent-gold, #FFD600);
            border-radius: 50%;
            width: 12px;
            height: 12px;
            animation: spin 1s linear infinite;
        }
        
        .task-success {
            color: #4ec9b0;
        }
        
        .task-skipped {
            color: #808080;
        }
        
        .task-failed {
            color: #e06c75;
        }
        
        .task-changed {
            color: #dcdcaa;
        }
        
        /* Controles de visualização */
        .view-controls {
            display: flex;
            gap: 8px;
            margin: 5px 15px 10px;
        }
        
        .view-controls button {
            flex: 1;
            background: var(--gray-dark, #2A2A2A);
            color: var(--text-primary, #FFFFFF);
            border: none;
            border-radius: 4px;
            padding: 6px 0;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        
        .view-controls button:hover {
            background: var(--gray-light, #3A3A3A);
        }
        
        .view-controls button.active {
            background: var(--accent-gold, #FFD600);
            color: var(--black-rich, #030303);
        }
        
        /* Limpeza de execuções */
        .clear-executions-btn {
            background: var(--gray-dark, #2A2A2A);
            color: var(--text-primary, #FFFFFF);
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 15px;
        }
        
        .clear-executions-btn:hover {
            background: var(--gray-light, #3A3A3A);
        }
        
        /* Animações */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Substitui a função toggleOutput para implementar o comportamento correto
 */
function setupToggleFunction() {
    // Preservar a função original se existir
    window.originalToggleOutput = window.toggleOutput;
    
    // Implementar nova versão da função
    window.toggleOutput = function(button) {
        try {
            const card = button.closest('.execution-card');
            if (!card) return;
            
            const output = card.querySelector('.ansible-output');
            if (!output) return;
            
            const isVisible = output.classList.contains('output-visible');
            
            if (isVisible) {
                // Ocultar a saída
                output.classList.remove('output-visible');
                
                // Atualizar o botão
                button.innerHTML = 'Ver Mais <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
                
                // Remover o botão de recolher se existir
                const recolherContainer = output.querySelector('.recolher-container');
                if (recolherContainer) recolherContainer.remove();
            } else {
                // Mostrar a saída
                output.classList.add('output-visible');
                
                // Atualizar o botão
                button.innerHTML = 'Ver Menos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
                
                // Adicionar o botão de recolher
                if (!output.querySelector('.recolher-container')) {
                    const recolherContainer = document.createElement('div');
                    recolherContainer.className = 'recolher-container';
                    recolherContainer.innerHTML = `
                        <button class="recolher-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 15l-6-6-6 6"/>
                            </svg>
                            Recolher
                        </button>
                    `;
                    output.appendChild(recolherContainer);
                    
                    // Adicionar evento ao botão de recolher
                    recolherContainer.querySelector('.recolher-btn').addEventListener('click', function() {
                        button.click(); // Simula o clique no botão Ver Mais/Menos
                    });
                }
                
                // Verificar se é um baseline para mostrar resumo
                processBaselineOutput(card, output);
                
                // Processar tarefas
                processTaskList(card, output);
            }
        } catch (error) {
            console.error('Erro ao alternar saída:', error);
        }
    };
}

/**
 * Processa a saída do baseline para extrair informações importantes
 */
function processBaselineOutput(card, output) {
    const playbookName = card.getAttribute('data-playbook-name') || '';
    
    // Verificar se é um baseline
    if (playbookName.toLowerCase().includes('baseline')) {
        // Extrair informações do baseline da saída
        const outputText = output.textContent || '';
        const baselineInfo = {
            hostname: extractInfo(outputText, ['Hostname:', 'hostname'], ''),
            system: extractInfo(outputText, ['Sistema:', 'system'], ''),
            ipPrivate: extractInfo(outputText, ['IP Privado:', 'private_ip', 'IP:'], ''),
            ipPublic: extractInfo(outputText, ['IP Público:', 'public_ip'], ''),
            userParceiro: 'parceiro',
            userRoot: 'root',
            passwordParceiro: extractInfo(outputText, ['Senha parceiro:', 'parceiro_password'], ''),
            passwordRoot: extractInfo(outputText, ['Senha root:', 'root_password'], '')
        };
        
        // Remover qualquer resumo existente
        const existingSummary = card.querySelector('.baseline-summary');
        if (existingSummary) existingSummary.remove();
        
        // Adicionar resumo de baseline
        const summary = document.createElement('div');
        summary.className = 'baseline-summary visible';
        summary.innerHTML = `
            <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Resumo do Baseline
            </h4>
            <div class="baseline-summary-content">
                <div class="baseline-summary-item">
                    <span>Hostname</span>
                    <span>${baselineInfo.hostname || 'N/A'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>Sistema</span>
                    <span>${baselineInfo.system || 'N/A'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>IP Privado</span>
                    <span>${baselineInfo.ipPrivate || 'N/A'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>IP Público</span>
                    <span>${baselineInfo.ipPublic || 'N/A'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>Usuário</span>
                    <span>${baselineInfo.userParceiro || 'parceiro'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>Senha</span>
                    <span>${baselineInfo.passwordParceiro || 'N/A'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>Usuário</span>
                    <span>${baselineInfo.userRoot || 'root'}</span>
                </div>
                <div class="baseline-summary-item">
                    <span>Senha</span>
                    <span>${baselineInfo.passwordRoot || 'N/A'}</span>
                </div>
            </div>
            <div class="baseline-summary-actions">
                <button class="baseline-summary-btn" onclick="copyBaselineUserPass('${baselineInfo.userParceiro}', '${baselineInfo.passwordParceiro}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar Usuário/Senha
                </button>
                <button class="baseline-summary-btn primary" onclick="copyBaselineSummary(this)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                    Copiar Resumo
                </button>
            </div>
        `;
        
        // Adicionar o resumo logo após o header do card
        const cardHeader = card.querySelector('.card-header');
        if (cardHeader && cardHeader.nextSibling) {
            card.insertBefore(summary, cardHeader.nextSibling);
        } else {
            output.parentNode.insertBefore(summary, output);
        }
    }
}

/**
 * Processa a lista de tarefas a partir da saída
 */
function processTaskList(card, output) {
    const outputText = output.textContent || '';
    const tasks = extractTasks(outputText);
    
    // Remover a lista de tarefas existente
    const existingTaskList = card.querySelector('.ansible-task-list');
    if (existingTaskList) existingTaskList.remove();
    
    // Adicionar controles de visualização
    if (!card.querySelector('.view-controls') && tasks.length > 0) {
        const viewControls = document.createElement('div');
        viewControls.className = 'view-controls';
        viewControls.innerHTML = `
            <button class="view-tasks-btn active">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Tarefas
            </button>
            <button class="view-output-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Saída Completa
            </button>
        `;
        
        // Adicionar antes do output
        output.parentNode.insertBefore(viewControls, output);
        
        // Adicionar eventos para os botões
        viewControls.querySelector('.view-tasks-btn').addEventListener('click', function() {
            // Ativar botão de tarefas
            this.classList.add('active');
            viewControls.querySelector('.view-output-btn').classList.remove('active');
            
            // Mostrar tarefas e esconder saída
            const taskList = card.querySelector('.ansible-task-list');
            if (taskList) taskList.classList.add('visible');
            output.style.display = 'none';
        });
        
        viewControls.querySelector('.view-output-btn').addEventListener('click', function() {
            // Ativar botão de saída
            this.classList.add('active');
            viewControls.querySelector('.view-tasks-btn').classList.remove('active');
            
            // Mostrar saída e esconder tarefas
            const taskList = card.querySelector('.ansible-task-list');
            if (taskList) taskList.classList.remove('visible');
            output.style.display = 'block';
        });
    }
    
    // Criar a lista de tarefas se houver tarefas
    if (tasks.length > 0) {
        const taskList = document.createElement('div');
        taskList.className = 'ansible-task-list visible';
        
        let taskListHtml = '';
        tasks.forEach(task => {
            const statusIcon = getTaskStatusIcon(task.status);
            taskListHtml += `
                <div class="ansible-task-item">
                    <div class="task-status ${task.status ? 'task-' + task.status : ''}">
                        ${statusIcon}
                    </div>
                    <div class="task-name">${task.name}</div>
                </div>
            `;
        });
        
        taskList.innerHTML = taskListHtml;
        
        // Adicionar após os controles de visualização
        const viewControls = card.querySelector('.view-controls');
        if (viewControls) {
            viewControls.after(taskList);
        } else {
            output.parentNode.insertBefore(taskList, output);
        }
        
        // Esconder o output se a lista de tarefas estiver visível
        output.style.display = 'none';
    }
}

/**
 * Retorna o ícone HTML correspondente ao status da tarefa
 */
function getTaskStatusIcon(status) {
    switch (status) {
        case 'success':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
            </svg>`;
        case 'changed':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 7v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                <path d="M17 21v-5.5a3.5 3.5 0 0 0-7 0V21"/>
            </svg>`;
        case 'failed':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`;
        case 'skipped':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 3l14 9-14 9V3z"/>
                <path d="M19 3v18"/>
            </svg>`;
        default:
            return `<div class="task-spinner"></div>`;
    }
}

/**
 * Extrai informações específicas da saída
 */
function extractInfo(text, prefixes, defaultValue) {
    for (const prefix of prefixes) {
        const regex = new RegExp(`${prefix}\\s*([^\\n]+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return defaultValue;
}

/**
 * Extrai tarefas da saída do Ansible
 */
function extractTasks(text) {
    const tasks = [];
    const lines = text.split('\n');
    let currentTask = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detectar início de tarefa
        if (line.startsWith('TASK [')) {
            const taskName = line.match(/TASK \[(.*)\]/)[1];
            currentTask = { name: taskName, status: null };
            tasks.push(currentTask);
            continue;
        }
        
        // Detectar status da tarefa
        if (currentTask) {
            if (line.startsWith('ok:') || line.includes('SUCCESS')) {
                currentTask.status = 'success';
            } else if (line.startsWith('changed:')) {
                currentTask.status = 'changed';
            } else if (line.startsWith('failed:') || line.includes('FAILED')) {
                currentTask.status = 'failed';
            } else if (line.startsWith('skipping:') || line.includes('...skipping')) {
                currentTask.status = 'skipped';
            }
        }
    }
    
    return tasks;
}

/**
 * Configurar observer para monitorar a adição de novos cards
 */
function setupCardObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Verificar se o nó adicionado é um element e tem a classe execution-card
                    if (node.nodeType === 1 && node.classList && node.classList.contains('execution-card')) {
                        enhanceExecutionCard(node);
                    }
                    
                    // Verificar elementos filhos
                    if (node.nodeType === 1) {
                        const cards = node.querySelectorAll('.execution-card');
                        cards.forEach(card => enhanceExecutionCard(card));
                    }
                });
            }
        });
    });
    
    const container = document.getElementById('running-playbooks');
    if (container) {
        observer.observe(container, { childList: true, subtree: true });
        
        // Melhorar cards existentes
        const existingCards = container.querySelectorAll('.execution-card');
        existingCards.forEach(card => enhanceExecutionCard(card));
    }
}

/**
 * Melhora a usabilidade de um card de execução
 */
function enhanceExecutionCard(card) {
    // Garantir que a saída esteja oculta inicialmente
    const output = card.querySelector('.ansible-output');
    if (output) {
        output.classList.remove('output-visible');
        output.style.display = 'none';
    }
    
    // Modificar o botão "Ver Mais" para usar a nova implementação
    const toggleButton = card.querySelector('.toggle-output-btn');
    if (toggleButton) {
        // Clone o botão para remover event listeners existentes
        const newToggleButton = toggleButton.cloneNode(true);
        toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
        
        // Adicionar o novo event listener
        newToggleButton.addEventListener('click', function() {
            toggleOutput(this);
        });
    }
}

/**
 * Adiciona botão para limpar execuções
 */
function addClearExecutionsButton() {
    const executionHeader = document.querySelector('.ansible-execution h3.ansible-heading');
    if (executionHeader && !document.querySelector('.clear-executions-btn')) {
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-executions-btn';
        clearButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Limpar Execuções
        `;
        
        // Adicionar após o header
        executionHeader.after(clearButton);
        
        // Adicionar evento de clique
        clearButton.addEventListener('click', function() {
            const executionCards = document.querySelectorAll('.execution-card');
            
            // Verificar se há cards para remover
            if (executionCards.length === 0) {
                showMessage('Não há execuções para limpar');
                return;
            }
            
            // Verificar se há execuções em andamento
            const runningCards = Array.from(executionCards).filter(card => {
                const statusText = card.querySelector('.task-status')?.textContent;
                return statusText && statusText.includes('execução');
            });
            
            if (runningCards.length > 0) {
                showMessage('Cancele as execuções em andamento antes de limpar', 'warning');
                return;
            }
            
            // Remover todos os cards
            executionCards.forEach(card => card.remove());
            showMessage('Execuções limpas com sucesso', 'success');
        });
    }
}

/**
 * Função para mostrar mensagem na interface (se não existir globalmente)
 */
function showMessage(text, type = 'info', duration = 3000) {
    // Se a função global showMessage existir, usá-la
    if (typeof window.showMessage === 'function') {
        window.showMessage(text, type, duration);
        return;
    }
    
    // Implementação básica
    const container = document.getElementById('running-playbooks');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 6px;
        background: ${type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
                      type === 'error' ? 'rgba(244, 67, 54, 0.1)' :
                      'rgba(255, 152, 0, 0.1)'};
        border-left: 4px solid ${type === 'success' ? '#4CAF50' : 
                               type === 'error' ? '#F44336' : 
                               '#FF9800'};
        color: ${type === 'success' ? '#4CAF50' : 
               type === 'error' ? '#F44336' : 
               '#FF9800'};
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: fadeIn 0.3s ease;
    `;
    
    messageDiv.innerHTML = `
        <span>${text}</span>
        <button style="background: none; border: none; color: currentColor; cursor: pointer;" 
                onclick="this.parentNode.remove()">✕</button>
    `;
    
    container.insertBefore(messageDiv, container.firstChild);
    
    if (duration > 0) {
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, duration);
    }
}

/**
 * Copia o resumo do baseline para área de transferência
 */
window.copyBaselineSummary = function(button) {
    const summaryDiv = button.closest('.baseline-summary');
    if (!summaryDiv) return;
    
    // Coletar os dados
    const items = summaryDiv.querySelectorAll('.baseline-summary-item');
    let summaryText = "===== RESUMO DO BASELINE =====\n";
    
    items.forEach(item => {
        const label = item.querySelector('span:first-child').textContent;
        const value = item.querySelector('span:last-child').textContent;
        summaryText += `${label}: ${value}\n`;
    });
    
    summaryText += "=============================";
    
    // Copiar para a área de transferência
    navigator.clipboard.writeText(summaryText)
        .then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Copiado!
            `;
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Erro ao copiar resumo:', err);
            showMessage('Erro ao copiar resumo', 'error');
        });
};

/**
 * Copia usuário e senha para área de transferência
 */
window.copyBaselineUserPass = function(user, password) {
    const text = `Usuário: ${user}\nSenha: ${password}`;
    
    navigator.clipboard.writeText(text)
        .then(() => {
            showMessage('Usuário e senha copiados', 'success');
        })
        .catch(err => {
            console.error('Erro ao copiar usuário/senha:', err);
            showMessage('Erro ao copiar', 'error');
        });
};

/**
 * Função para atualizar o card dinamicamente de acordo com o progresso
 */
const updateCardProgress = function() {
    const cards = document.querySelectorAll('.execution-card');
    
    cards.forEach(card => {
        // Obter o ID do job
        const jobId = card.getAttribute('data-job-id');
        if (!jobId) return;
        
        // Obter o status atual via API
        fetch(`/api/status/${jobId}`)
            .then(res => res.json())
            .then(data => {
                // Atualizar a lista de tarefas se estiver visível
                const taskList = card.querySelector('.ansible-task-list');
                const output = card.querySelector('.ansible-output');
                
                if (taskList && taskList.classList.contains('visible') && data.output) {
                    // Extrair tarefas e atualizar lista
                    const tasks = extractTasks(data.output);
                    updateTaskList(taskList, tasks);
                }
                
                // Verificar se a execução foi concluída
                if (data.status === 'completed' || data.status === 'failed') {
                    // Se a saída estiver visível, processar de novo para finalizar
                    if (output && output.classList.contains('output-visible')) {
                        processBaselineOutput(card, output);
                        processTaskList(card, output);
                    }
                }
            })
            .catch(err => {
                console.error(`Erro ao atualizar card ${jobId}:`, err);
            });
    });
};

/**
 * Atualiza a lista de tarefas com os status mais recentes
 */
function updateTaskList(taskList, tasks) {
    const taskItems = taskList.querySelectorAll('.ansible-task-item');
    
    // Atualizar as tarefas existentes
    tasks.forEach((task, index) => {
        if (index < taskItems.length) {
            const statusElement = taskItems[index].querySelector('.task-status');
            const currentClass = Array.from(statusElement.classList)
                .find(cls => cls.startsWith('task-') && cls !== 'task-status');
            
            if (currentClass) {
                statusElement.classList.remove(currentClass);
            }
            
            if (task.status) {
                statusElement.classList.add(`task-${task.status}`);
                statusElement.innerHTML = getTaskStatusIcon(task.status);
            }
        }
    });
    
    // Adicionar novas tarefas, se houver
    if (tasks.length > taskItems.length) {
        for (let i = taskItems.length; i < tasks.length; i++) {
            const task = tasks[i];
            const taskItem = document.createElement('div');
            taskItem.className = 'ansible-task-item';
            taskItem.innerHTML = `
                <div class="task-status ${task.status ? 'task-' + task.status : ''}">
                    ${getTaskStatusIcon(task.status)}
                </div>
                <div class="task-name">${task.name}</div>
            `;
            taskList.appendChild(taskItem);
        }
    }
}

// Inicializar o polling para atualizar o progresso
setInterval(updateCardProgress, 2000);