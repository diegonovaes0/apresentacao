/**
 * ansible-system-integration.js
 * Garante a integração das melhorias de usabilidade com o sistema Ansible existente
 */

// Executar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando integração com sistema Ansible existente");
    
    // Compatibilidade com funções existentes
    ensureCompatibility();
    
    // Interceptar função original de monitoramento
    interceptMonitorFunction();
    
    // Interceptar criação de elementos de UI
    setupUIInterceptors();
    
    // Adicionar suporte à visualização detalhada
    setupDetailedView();
});

/**
 * Garante compatibilidade com funções existentes
 */
function ensureCompatibility() {
    // Verificar se funções essenciais existem, senão criar versões de fallback
    if (typeof window.showMessage !== 'function') {
        window.showMessage = function(text, type = 'info', duration = 3000) {
            console.log(`[${type}] ${text}`);
            
            // Implementação básica
            const container = document.getElementById('running-playbooks');
            if (!container) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'execution-message';
            messageDiv.dataset.type = type;
            
            const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
                           type === 'error' ? 'rgba(244, 67, 54, 0.1)' : 
                           'rgba(255, 152, 0, 0.1)';
            
            const borderColor = type === 'success' ? '#4CAF50' : 
                              type === 'error' ? '#F44336' : 
                              '#FF9800';
            
            const textColor = type === 'success' ? '#4CAF50' : 
                            type === 'error' ? '#F44336' : 
                            '#FF9800';
            
            messageDiv.style.cssText = `
                padding: 12px 16px;
                margin-bottom: 16px;
                border-radius: 6px;
                border-left: 4px solid ${borderColor};
                background: ${bgColor};
                color: ${textColor};
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: fadeIn 0.3s ease;
            `;
            
            messageDiv.innerHTML = `
                <span>${text}</span>
                <button style="background: none; border: none; color: ${textColor}; cursor: pointer;" 
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
        };
    }
    
    // Implementar funções para manipulação de baseline
    window.copyBaselineSummary = function(button) {
        const summaryDiv = button.closest('.baseline-summary');
        if (!summaryDiv) return;
        
        // Se temos o extrator de baseline, usar ele
        if (window.BaselineExtractor) {
            // Coletar os valores dos itens
            const items = {};
            summaryDiv.querySelectorAll('.baseline-summary-item').forEach(item => {
                const label = item.querySelector('span:first-child').textContent.trim();
                const value = item.querySelector('span:last-child').textContent.trim();
                items[label.toLowerCase()] = value;
            });
            
            // Criar objeto com as informações
            const info = {
                hostname: items.hostname || '',
                system: items.sistema || '',
                ipPrivate: items['ip privado'] || '',
                ipPublic: items['ip público'] || '',
                userParceiro: items.usuário || 'parceiro',
                passwordParceiro: items.senha || '',
                userRoot: Object.keys(items).includes('usuário root') ? items['usuário root'] : 'root',
                passwordRoot: Object.keys(items).includes('senha root') ? items['senha root'] : ''
            };
            
            // Usar o formatador do extrator
            const text = BaselineExtractor.formatToText(info);
            navigator.clipboard.writeText(text);
        } else {
            // Método simples para coletar e copiar o texto
            const items = summaryDiv.querySelectorAll('.baseline-summary-item');
            let summaryText = "===== RESUMO DO BASELINE =====\n";
            
            items.forEach(item => {
                const label = item.querySelector('span:first-child').textContent;
                const value = item.querySelector('span:last-child').textContent;
                summaryText += `${label}: ${value}\n`;
            });
            
            summaryText += "=============================";
            navigator.clipboard.writeText(summaryText);
        }
        
        // Feedback visual
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
        
        // Notificar usuário
        if (typeof window.showMessage === 'function') {
            window.showMessage('Resumo do baseline copiado para a área de transferência', 'success');
        }
    };
    
    window.copyBaselineUserPass = function(user, password) {
        const text = `Usuário: ${user || 'parceiro'}\nSenha: ${password || ''}`;
        
        navigator.clipboard.writeText(text)
            .then(() => {
                if (typeof window.showMessage === 'function') {
                    window.showMessage('Usuário e senha copiados para a área de transferência', 'success');
                }
            })
            .catch(err => {
                console.error('Erro ao copiar usuário/senha:', err);
                if (typeof window.showMessage === 'function') {
                    window.showMessage('Erro ao copiar usuário e senha', 'error');
                }
            });
    };
}

/**
 * Intercepta a função de monitoramento do Ansible
 */
function interceptMonitorFunction() {
    // Guardar referência para função original
    if (typeof window.monitorPlaybookExecution === 'function') {
        window.originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
        
        // Substituir por nossa versão melhorada
        window.monitorPlaybookExecution = function(jobId, card) {
            console.log(`Monitorando execução melhorada para job ${jobId}`);
            
            // Chamar a versão original
            window.originalMonitorPlaybookExecution(jobId, card);
            
            // Implementar monitoramento adicional para atualizações em tempo real
            setupRealTimeUpdates(jobId, card);
        };
    }
}

/**
 * Configura atualizações em tempo real para a execução do playbook
 */
function setupRealTimeUpdates(jobId, card) {
    // ID para o intervalo, para poder cancelar depois
    const intervalId = setInterval(() => {
        // Verificar se o card ainda existe no DOM
        if (!document.body.contains(card)) {
            clearInterval(intervalId);
            return;
        }
        
        // Obter o status via API
        fetch(`/api/status/${jobId}`)
            .then(res => res.json())
            .then(data => {
                // Se o status não é mais "running", podemos parar de atualizar
                if (data.status !== 'running') {
                    clearInterval(intervalId);
                }
                
                // Extrair tarefas da saída
                const taskList = card.querySelector('.ansible-task-list');
                if (taskList && data.output) {
                    updateTaskVisualizations(taskList, data.output);
                }
                
                // Verificar se é baseline e atualizar resumo
                if (isBaselinePlaybook(card) && data.output) {
                    updateBaselineSummary(card, data.output);
                }
            })
            .catch(err => {
                console.error(`Erro ao atualizar job ${jobId}:`, err);
                // Se falhar mais de uma vez, podemos parar de tentar
                clearInterval(intervalId);
            });
    }, 3000); // Atualiza a cada 3 segundos
}

/**
 * Verifica se o card é de uma playbook de baseline
 */
function isBaselinePlaybook(card) {
    const playbookName = card.getAttribute('data-playbook-name') || '';
    return playbookName.toLowerCase().includes('baseline');
}

/**
 * Atualiza o resumo do baseline com as informações mais recentes
 */
function updateBaselineSummary(card, output) {
    // Verificar se temos o extrator de baseline
    if (!window.BaselineExtractor) return;
    
    // Verificar se parece ser uma saída de baseline
    if (!BaselineExtractor.isBaselineOutput(output)) return;
    
    // Extrair informações atualizadas
    const baselineInfo = BaselineExtractor.extract(output);
    
    // Localizar ou criar o elemento de resumo
    let summaryDiv = card.querySelector('.baseline-summary');
    
    if (!summaryDiv) {
        // Criar novo elemento de resumo
        summaryDiv = document.createElement('div');
        summaryDiv.className = 'baseline-summary visible';
        summaryDiv.innerHTML = `
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
            ${BaselineExtractor.formatToHtml(baselineInfo)}
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
        
        // Inserir após o cabeçalho do card
        const cardHeader = card.querySelector('.card-header');
        if (cardHeader && cardHeader.nextSibling) {
            card.insertBefore(summaryDiv, cardHeader.nextSibling);
        } else {
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv) {
                card.insertBefore(summaryDiv, outputDiv);
            } else {
                card.appendChild(summaryDiv);
            }
        }
    } else {
        // Atualizar apenas o conteúdo
        const contentDiv = summaryDiv.querySelector('.baseline-summary-content');
        if (contentDiv) {
            contentDiv.innerHTML = BaselineExtractor.formatToHtml(baselineInfo).trim();
        }
        
        // Atualizar botões de ação
        const actionsDiv = summaryDiv.querySelector('.baseline-summary-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = `
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
            `;
        }
    }
}

/**
 * Atualiza a visualização das tarefas
 */
function updateTaskVisualizations(taskList, output) {
    // Extrair tarefas da saída
    const tasks = extractTasksFromOutput(output);
    if (tasks.length === 0) return;
    
    // Obter itens de tarefa existentes
    const taskItems = taskList.querySelectorAll('.ansible-task-item');
    
    // Atualizar tarefas existentes
    for (let i = 0; i < Math.min(taskItems.length, tasks.length); i++) {
        updateTaskItem(taskItems[i], tasks[i]);
    }
    
    // Adicionar novas tarefas
    if (tasks.length > taskItems.length) {
        for (let i = taskItems.length; i < tasks.length; i++) {
            const newTask = createTaskItem(tasks[i]);
            taskList.appendChild(newTask);
        }
    }
}

/**
 * Extrai informações de tarefas da saída do Ansible
 */
function extractTasksFromOutput(output) {
    const tasks = [];
    const lines = output.split('\n');
    let currentTask = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detectar início de tarefa
        const taskMatch = line.match(/TASK\s*\[(.*?)\]/i);
        if (taskMatch) {
            if (currentTask) {
                tasks.push(currentTask);
            }
            
            currentTask = {
                name: taskMatch[1],
                status: null
            };
            continue;
        }
        
        // Atualizar status da tarefa atual
        if (currentTask) {
            if (line.match(/^ok:/i) || line.match(/^ok /i)) {
                currentTask.status = 'success';
            } else if (line.match(/^changed:/i) || line.match(/^changed /i)) {
                currentTask.status = 'changed';
            } else if (line.match(/^failed:/i) || line.match(/^failed /i) || line.includes('FAILED')) {
                currentTask.status = 'failed';
            } else if (line.match(/^skipping:/i) || line.match(/^skipped:/i) || line.includes('...skipping')) {
                currentTask.status = 'skipped';
            }
        }
    }
    
    // Adicionar a última tarefa
    if (currentTask) {
        tasks.push(currentTask);
    }
    
    return tasks;
}

/**
 * Atualiza um item de tarefa existente
 */
function updateTaskItem(taskItem, taskInfo) {
    const statusElement = taskItem.querySelector('.task-status');
    if (!statusElement) return;
    
    // Atualizar o texto da tarefa se necessário
    const nameElement = taskItem.querySelector('.task-name');
    if (nameElement && taskInfo.name && nameElement.textContent !== taskInfo.name) {
        nameElement.textContent = taskInfo.name;
    }
    
    // Se o status não mudou, não fazemos nada
    if (!taskInfo.status || statusElement.classList.contains(`task-${taskInfo.status}`)) {
        return;
    }
    
    // Limpar classes de status
    ['success', 'changed', 'failed', 'skipped'].forEach(status => {
        statusElement.classList.remove(`task-${status}`);
    });
    
    // Adicionar nova classe de status
    if (taskInfo.status) {
        statusElement.classList.add(`task-${taskInfo.status}`);
        
        // Atualizar o ícone
        statusElement.innerHTML = getTaskStatusIcon(taskInfo.status);
    }
}

/**
 * Cria um novo item de tarefa
 */
function createTaskItem(taskInfo) {
    const taskItem = document.createElement('div');
    taskItem.className = 'ansible-task-item';
    
    // Determinar o status e ícone
    const statusClass = taskInfo.status ? `task-${taskInfo.status}` : '';
    const statusIcon = getTaskStatusIcon(taskInfo.status);
    
    taskItem.innerHTML = `
        <div class="task-status ${statusClass}">
            ${statusIcon}
        </div>
        <div class="task-name">${taskInfo.name}</div>
    `;
    
    return taskItem;
}

/**
 * Obtém o ícone HTML para um status de tarefa
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
 * Configura interceptores para elementos de UI
 */
function setupUIInterceptors() {
    // Interceptar o botão Ver Mais quando criado
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Verificar se é um button com a classe toggle-output-btn
                    if (node.nodeType === 1 && node.tagName === 'BUTTON' && node.classList.contains('toggle-output-btn')) {
                        setupToggleOutputButton(node);
                    }
                    
                    // Ou se contém esse botão como filho
                    if (node.nodeType === 1) {
                        node.querySelectorAll('.toggle-output-btn').forEach(button => {
                            setupToggleOutputButton(button);
                        });
                    }
                });
            }
        });
    });
    
    // Observar todo o documento
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Também configurar botões já existentes
    document.querySelectorAll('.toggle-output-btn').forEach(button => {
        setupToggleOutputButton(button);
    });
}

/**
 * Configura um botão Ver Mais específico
 */
function setupToggleOutputButton(button) {
    // Verificar se o botão já foi configurado
    if (button.dataset.configured === 'true') return;
    
    // Marcar como configurado
    button.dataset.configured = 'true';
    
    // Substituir o evento de clique
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Adicionar novo evento
    newButton.addEventListener('click', function() {
        if (typeof window.toggleOutput === 'function') {
            window.toggleOutput(this);
        }
    });
}
