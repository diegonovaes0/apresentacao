/**
 * ansible-card-enhancer.js
 * Melhora a estrutura e comportamento dos cards de execução do Ansible.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando melhorias para cards de execução");
    
    // Injetar estilos adicionais
    injectCardStyles();
    
    // Modificar a estrutura dos cards de execução
    setupCardInterceptor();
    
    // Configurar botão de limpar execuções concluídas
    setupClearCompletedButton();
});

/**
 * Injeta estilos específicos para a nova estrutura dos cards
 */
function injectCardStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilo melhorado para cards de execução */
        .execution-card {
            position: relative;
            margin-bottom: 16px;
            border-radius: 8px;
            background: var(--black-pearl, #121212);
            border: 1px solid var(--gray-dark, #2A2A2A);
            transition: box-shadow 0.3s ease;
        }
        
        .execution-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .execution-card.selected {
            border-color: var(--accent-gold, #FFD600);
        }
        
        /* Header do card */
        .card-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--gray-dark, #2A2A2A);
        }
        
        .playbook-title {
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Informações do host */
        .host-info {
            padding: 12px 15px;
            background: rgba(0, 0, 0, 0.2);
        }
        
        .host-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
        }
        
        .host-details p {
            margin: 4px 0;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-secondary, #B0B0B0);
        }
        
        .host-details p strong {
            color: var(--text-primary, #FFFFFF);
            margin-right: 4px;
        }
        
        /* Barra de progresso */
        .progress-container {
            width: 100%;
            height: 4px;
            background: var(--gray-dark, #2A2A2A);
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            width: 0;
            background: var(--accent-gold, #FFD600);
            transition: width 0.5s ease;
        }
        
        /* Grupo de botões no card */
        .button-group {
            display: flex;
            padding: 10px 15px;
            border-top: 1px solid var(--gray-dark, #2A2A2A);
            gap: 10px;
        }
        
        .button-group button {
            padding: 8px 12px;
            border-radius: 4px;
            border: none;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s ease;
        }
        
        .cancel-btn {
            background: var(--gray-dark, #2A2A2A);
            color: var(--text-primary, #FFFFFF);
        }
        
        .cancel-btn:hover {
            background: var(--gray-light, #3A3A3A);
        }
        
        .toggle-output-btn {
            background: var(--accent-gold, #FFD600);
            color: var(--black-rich, #030303);
            margin-left: auto;
        }
        
        .toggle-output-btn:hover {
            background: #ffde33;
        }
        
        /* Status da tarefa */
        .task-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .task-status.success {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
        }
        
        .task-status.failed {
            background: rgba(244, 67, 54, 0.2);
            color: #F44336;
        }
        
        .task-status.cancelled {
            background: rgba(255, 152, 0, 0.2);
            color: #FF9800;
        }
        
        /* Botão de limpar execuções concluídas */
        .clear-completed-btn {
            background: var(--gray-dark, #2A2A2A);
            color: var(--text-secondary, #B0B0B0);
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
        
        .clear-completed-btn:hover {
            background: var(--gray-light, #3A3A3A);
            color: var(--text-primary, #FFFFFF);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Configura o interceptor para modificar a estrutura dos cards recém-criados
 */
function setupCardInterceptor() {
    // Armazenar a função original
    window.originalCreateExecutionCard = window.createExecutionCard;
    
    // Substituir a função para usar nossa versão melhorada
    window.createExecutionCard = function(playbookName, hosts, jobId) {
        // Se não existe a função original, criar uma versão básica
        if (typeof window.originalCreateExecutionCard !== 'function') {
            return createBasicExecutionCard(playbookName, hosts, jobId);
        }
        
        // Usar a função original
        const card = window.originalCreateExecutionCard(playbookName, hosts, jobId);
        
        // Garantir que a saída esteja inicialmente oculta
        const output = card.querySelector('.ansible-output');
        if (output) {
            output.style.display = 'none';
        }
        
        // Retornar o card modificado
        return card;
    };
    
    // Melhorar cards existentes
    enhanceExistingCards();
}

/**
 * Melhora os cards já existentes na interface
 */
function enhanceExistingCards() {
    setTimeout(() => {
        const cards = document.querySelectorAll('.execution-card');
        cards.forEach(card => {
            // Garantir que a saída esteja inicialmente oculta
            const output = card.querySelector('.ansible-output');
            if (output) {
                output.style.display = 'none';
            }
            
            // Substituir o evento do botão Ver Mais
            const toggleButton = card.querySelector('.toggle-output-btn');
            if (toggleButton) {
                // Clonar para remover event listeners
                const newToggleButton = toggleButton.cloneNode(true);
                toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
                
                // Adicionar novo event listener
                newToggleButton.addEventListener('click', function() {
                    window.toggleOutput(this);
                });
            }
        });
    }, 500);
}

/**
 * Cria um card de execução básico caso a função original não exista
 */
function createBasicExecutionCard(playbookName, hosts, jobId) {
    const card = document.createElement('div');
    card.className = 'execution-card';
    card.setAttribute('data-job-id', jobId);
    card.setAttribute('data-playbook-name', playbookName);
    
    // Criar o conteúdo do card
    card.innerHTML = `
        <div class="card-header">
            <div class="playbook-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold, #FFD600)" stroke-width="2">
                    <path d="M12 2a10 10 0 0 0-7.35 16.83l7.35-12.66 7.35 12.66A10 10 0 0 0 12 2z"/>
                </svg>
                <strong>${playbookName}</strong>
                <span class="spinner"></span>
            </div>
            <div class="task-status">Em execução...</div>
        </div>
        
        <div class="host-info">
            <div class="host-details">
                ${Array.from(hosts).map(host => `
                    <div data-host="${host}">
                        <p>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M8 21h8"></path>
                                <path d="M12 17v4"></path>
                            </svg>
                            <strong>Host:</strong> ${host}
                        </p>
                    </div>
                `).join('')}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
        </div>
    `;
    
    // Adicionar event listeners
    card.querySelector('.cancel-btn').addEventListener('click', function() {
        // Se existir uma função global para cancelar, usá-la
        if (typeof window.cancelExecution === 'function') {
            window.cancelExecution(this);
        } else {
            console.warn('Função cancelExecution não disponível');
        }
    });
    
    card.querySelector('.toggle-output-btn').addEventListener('click', function() {
        window.toggleOutput(this);
    });
    
    return card;
}

/**
 * Configura o botão para limpar execuções concluídas
 */
function setupClearCompletedButton() {
    const executionHeader = document.querySelector('.ansible-execution h3.ansible-heading');
    if (executionHeader && !document.querySelector('.clear-completed-btn')) {
        setTimeout(() => {
            const clearButton = document.createElement('button');
            clearButton.className = 'clear-completed-btn';
            clearButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Limpar Concluídas
            `;
            
            // Adicionar após o header
            executionHeader.after(clearButton);
            
            // Adicionar evento de clique
            clearButton.addEventListener('click', function() {
                clearCompletedExecutions();
            });
        }, 1000);
    }
}

/**
 * Limpa as execuções concluídas
 */
function clearCompletedExecutions() {
    const executionCards = document.querySelectorAll('.execution-card');
    let removedCount = 0;
    
    // Verificar se há cards para remover
    if (executionCards.length === 0) {
        showMessage('Não há execuções para limpar');
        return;
    }
    
    // Filtrar cards concluídos ou falhados
    executionCards.forEach(card => {
        const statusElement = card.querySelector('.task-status');
        const statusText = statusElement ? statusElement.textContent : '';
        
        // Se status indica que já terminou, remover o card
        if (statusText.includes('Concluído') || statusText.includes('Falhou') || statusText.includes('Cancelado')) {
            card.remove();
            removedCount++;
        }
    });
    
    if (removedCount > 0) {
        showMessage(`${removedCount} execuções concluídas foram removidas`, 'success');
    } else {
        showMessage('Não há execuções concluídas para remover', 'info');
    }
}

/**
 * Função auxiliar para mostrar mensagens (caso não exista globalmente)
 */
function showMessage(text, type = 'info', duration = 3000) {
    // Se a função global showMessage existir, usá-la
    if (typeof window.showMessage === 'function') {
        window.showMessage(text, type, duration);
        return;
    }
    
    console.log(`[${type}] ${text}`);
}