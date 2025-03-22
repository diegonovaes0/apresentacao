/**
 * ansible-playbook-progress-fix-improved.js
 * Corrige a barra de progresso dos cards de execução para avanço consistente
 */

(function() {
    console.log("Iniciando correção aprimorada para barras de progresso em playbooks");
    
    // Armazenar o progresso de cada job para garantir que nunca retroceda
    const jobProgressMap = new Map();
    
    /**
     * Corrige o monitoramento das barras de progresso
     */
    function fixPlaybookProgressMonitoring() {
        // Verificar se a função original existe
        const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
        
        if (typeof originalMonitorPlaybookExecution !== 'function') {
            console.error("Função monitorPlaybookExecution não encontrada");
            return;
        }
        
        // Sobrescrever a função
        window.monitorPlaybookExecution = function(jobId, card) {
            console.log(`Monitorando execução com barra de progresso melhorada: ${jobId}`);
            
            // Inicializar o progresso para este job se ainda não existir
            if (!jobProgressMap.has(jobId)) {
                jobProgressMap.set(jobId, 5); // Começa com 5%
            }
            
            // Garantir que a barra de progresso exista e esteja configurada
            ensureProgressBar(card);
            
            // Configurar o intervalo de polling
            let pollInterval = 1000; // Começa com 1 segundo
            const maxInterval = 5000; // Máximo de 5 segundos
            
            // Função para validar o status diretamente com o backend
            function checkStatus() {
                if (!document.body.contains(card)) {
                    return; // Card foi removido do DOM
                }
                
                // Verificar se o card já tem um status final
                if (card.classList.contains('success') || 
                    card.classList.contains('failed') || 
                    card.classList.contains('cancelled')) {
                    return; // Já está finalizado
                }
                
                // Consultar o status atual
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        // Obter barra de progresso
                        const progressBar = card.querySelector('.progress-bar');
                        if (!progressBar) return;
                        
                        // Status finalizado
                        if (data.status === 'completed' || data.status === 'success') {
                            // Completar a barra com sucesso
                            progressBar.style.width = '100%';
                            progressBar.style.backgroundColor = '#4CAF50'; // Verde
                            jobProgressMap.set(jobId, 100);
                            
                            // Atualizar status visual
                            const statusDiv = card.querySelector('.task-status');
                            if (statusDiv) statusDiv.textContent = 'Concluído com sucesso';
                            
                            // Esconder o spinner
                            const spinner = card.querySelector('.spinner');
                            if (spinner) spinner.style.display = 'none';
                            
                            // Adicionar classe de sucesso ao card
                            card.classList.add('success');
                            
                            return; // Finalizar monitoramento
                        } 
                        else if (data.status === 'failed') {
                            // Completar a barra com erro
                            progressBar.style.width = '100%';
                            progressBar.style.backgroundColor = '#f44336'; // Vermelho
                            jobProgressMap.set(jobId, 100);
                            
                            // Atualizar status visual
                            const statusDiv = card.querySelector('.task-status');
                            if (statusDiv) statusDiv.textContent = 'Falhou';
                            
                            // Esconder o spinner
                            const spinner = card.querySelector('.spinner');
                            if (spinner) spinner.style.display = 'none';
                            
                            // Adicionar classe de falha ao card
                            card.classList.add('failed');
                            
                            return; // Finalizar monitoramento
                        } 
                        else if (data.status === 'cancelled') {
                            // Completar a barra com cancelamento
                            progressBar.style.width = '100%';
                            progressBar.style.backgroundColor = '#ff9800'; // Laranja
                            jobProgressMap.set(jobId, 100);
                            
                            // Atualizar status visual
                            const statusDiv = card.querySelector('.task-status');
                            if (statusDiv) statusDiv.textContent = 'Cancelado';
                            
                            // Esconder o spinner
                            const spinner = card.querySelector('.spinner');
                            if (spinner) spinner.style.display = 'none';
                            
                            // Adicionar classe de cancelamento ao card
                            card.classList.add('cancelled');
                            
                            return; // Finalizar monitoramento
                        }
                        else if (data.status === 'running') {
                            // Extrair dados da saída e estimar progresso
                            const newProgress = estimateProgressFromOutput(data.output);
                            
                            // Obter o último progresso registrado
                            const currentProgress = jobProgressMap.get(jobId);
                            
                            // Só avançar, nunca retroceder
                            if (newProgress > currentProgress) {
                                jobProgressMap.set(jobId, newProgress);
                                progressBar.style.width = `${newProgress}%`;
                            }
                            
                            // Manter cor amarela durante execução
                            progressBar.style.backgroundColor = 'var(--accent-gold)';
                            
                            // Continuar verificando com intervalo aumentado
                            pollInterval = Math.min(pollInterval * 1.2, maxInterval);
                            setTimeout(checkStatus, pollInterval);
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao verificar status: ${error.message}`);
                        
                        // Continuar verificando mesmo em caso de erro
                        pollInterval = Math.min(pollInterval * 1.5, maxInterval * 2);
                        setTimeout(checkStatus, pollInterval);
                    });
            }
            
            // Iniciar a verificação de status
            checkStatus();
            
            // Também chamar a função original para compatibilidade
            try {
                originalMonitorPlaybookExecution(jobId, card);
            } catch (error) {
                console.error(`Erro ao chamar função original: ${error.message}`);
            }
        };
        
        console.log("Monitoramento de progresso melhorado aplicado");
    }
    
    /**
     * Garante que o card tenha uma barra de progresso adequada
     * @param {HTMLElement} card - Card de execução
     */
    function ensureProgressBar(card) {
        if (!card) return;
        
        // Verificar se já existe uma barra de progresso
        let progressContainer = card.querySelector('.progress-container');
        let progressBar = card.querySelector('.progress-bar');
        
        // Se não existir, criar
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.style.cssText = `
                width: 100%;
                height: 4px;
                background-color: #222;
                border-radius: 2px;
                overflow: hidden;
                margin: 10px 0;
                position: relative;
            `;
            
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.cssText = `
                height: 100%;
                background-color: var(--accent-gold);
                border-radius: 2px;
                width: 5%;
                transition: width 0.3s ease;
            `;
            
            progressContainer.appendChild(progressBar);
            
            // Encontrar local adequado para inserir
            const hostInfo = card.querySelector('.host-info');
            const outputDiv = card.querySelector('.ansible-output');
            
            if (hostInfo && hostInfo.nextSibling) {
                card.insertBefore(progressContainer, hostInfo.nextSibling);
            } else if (outputDiv) {
                card.insertBefore(progressContainer, outputDiv);
            } else {
                // Se nenhum ponto de inserção for encontrado, adicionar antes dos botões
                const buttonGroup = card.querySelector('.button-group');
                if (buttonGroup) {
                    card.insertBefore(progressContainer, buttonGroup);
                } else {
                    // Último recurso: adicionar ao final
                    card.appendChild(progressContainer);
                }
            }
        }
        
        // Atualizar estilo e cor inicial
        if (progressBar) {
            // Para cards existentes, verificar status
            if (card.classList.contains('success')) {
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#4CAF50'; // Verde
            } else if (card.classList.contains('failed')) {
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#f44336'; // Vermelho
            } else if (card.classList.contains('cancelled')) {
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#ff9800'; // Laranja
            } else {
                // Em execução: amarelo e status inicial
                progressBar.style.backgroundColor = 'var(--accent-gold)';
                
                // Obter o ID do job para verificar progresso existente
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId && jobProgressMap.has(jobId)) {
                    progressBar.style.width = `${jobProgressMap.get(jobId)}%`;
                } else {
                    progressBar.style.width = '5%';
                }
            }
        }
    }
    
    /**
     * Estima o progresso da execução com base na saída
     * @param {string} output - Saída do Ansible
     * @returns {number} - Porcentagem de conclusão estimada (0-100)
     */
    function estimateProgressFromOutput(output) {
        if (!output) return 5;
        
        // Procurar "PLAY RECAP" que indica conclusão
        if (output.includes('PLAY RECAP')) {
            return 100;
        }
        
        // Contar diferentes tipos de linhas para estimar progresso
        const lines = output.split('\n');
        let playCount = 0;
        let taskCount = 0;
        let completedTaskCount = 0;
        
        for (const line of lines) {
            if (line.includes('PLAY [')) {
                playCount++;
            }
            if (line.includes('TASK [')) {
                taskCount++;
            }
            if (line.match(/^ok:/i) || line.match(/^changed:/i) || 
                line.match(/^skipping:/i) || line.match(/^failed:/i)) {
                completedTaskCount++;
            }
        }
        
        // Basear progresso em tasks completadas
        let progress = 5; // Mínimo inicial
        
        if (taskCount > 0) {
            // Tasks são o indicador principal de progresso
            progress = Math.max(progress, 5 + Math.min(85, (completedTaskCount / Math.max(1, taskCount)) * 85));
        } else if (playCount > 0) {
            // Se não temos tasks mas temos plays, usamos plays
            progress = Math.max(progress, 15 + Math.min(50, playCount * 15));
        }
        
        // Verificar outros indicadores de progresso
        if (output.includes('GATHERING FACTS')) {
            progress = Math.max(progress, 10);
        }
        
        // Assegurar que o valor está dentro dos limites (5-95)
        return Math.min(95, Math.max(5, progress));
    }
    
    /**
     * Corrige a função handlePlaybookCompletion para finalizar a barra adequadamente
     */
    function fixCompletionHandler() {
        // Verificar se a função existe
        if (typeof window.handlePlaybookCompletion !== 'function') {
            console.log("Função handlePlaybookCompletion não encontrada");
            return;
        }
        
        // Guardar referência para função original
        const originalHandleCompletion = window.handlePlaybookCompletion;
        
        // Sobrescrever a função
        window.handlePlaybookCompletion = function(status, card) {
            console.log(`Finalizando card com status: ${status}`);
            
            // Obter o ID do job
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            
            // Atualizar a barra de progresso para 100%
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
                
                // Definir cor com base no status
                if (status === 'completed' || status === 'success') {
                    progressBar.style.backgroundColor = '#4CAF50'; // Verde
                } else if (status === 'failed') {
                    progressBar.style.backgroundColor = '#f44336'; // Vermelho
                } else if (status === 'cancelled') {
                    progressBar.style.backgroundColor = '#ff9800'; // Laranja
                }
                
                // Desativar a transição para que a mudança seja instantânea
                progressBar.style.transition = 'background-color 0.3s ease';
                
                // Atualizar o mapa de progresso
                if (jobId) {
                    jobProgressMap.set(jobId, 100);
                }
            }
            
            // Chamar a função original
            try {
                originalHandleCompletion(status, card);
            } catch (error) {
                console.error(`Erro ao chamar manipulador original: ${error.message}`);
                
                // Implementação de fallback
                if (progressBar) {
                    // Já configuramos a barra acima, mas garantir que está 100%
                    progressBar.style.width = '100%';
                }
                
                // Atualizar status visual
                const statusDiv = card.querySelector('.task-status');
                if (statusDiv) {
                    switch (status) {
                        case 'completed':
                        case 'success':
                            statusDiv.textContent = 'Concluído com sucesso';
                            statusDiv.className = 'task-status success';
                            break;
                        case 'failed':
                            statusDiv.textContent = 'Falhou';
                            statusDiv.className = 'task-status failed';
                            break;
                        case 'cancelled':
                            statusDiv.textContent = 'Cancelado';
                            statusDiv.className = 'task-status cancelled';
                            break;
                    }
                }
                
                // Esconder o spinner
                const spinner = card.querySelector('.spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
                
                // Atualizar classes do card
                card.classList.remove('success', 'failed', 'cancelled');
                if (status === 'completed' || status === 'success') {
                    card.classList.add('success');
                } else {
                    card.classList.add(status);
                }
            }
        };
        
        console.log("Manipulador de conclusão corrigido");
    }
    
    /**
     * Corrige a criação de cards para incluir barras de progresso
     */
    function fixCardCreation() {
        // Verificar se a função existe
        if (typeof window.createExecutionCard !== 'function') {
            console.log("Função createExecutionCard não encontrada");
            return;
        }
        
        // Guardar referência para função original
        const originalCreateCard = window.createExecutionCard;
        
        // Sobrescrever a função
        window.createExecutionCard = function(...args) {
            // Chamar a função original
            const card = originalCreateCard.apply(this, args);
            
            // Garantir que o card tem uma barra de progresso
            ensureProgressBar(card);
            
            // Obter o ID do job para inicializar seu progresso
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            if (jobId && !jobProgressMap.has(jobId)) {
                jobProgressMap.set(jobId, 5); // Inicializar com 5%
            }
            
            return card;
        };
        
        console.log("Função de criação de cards corrigida");
    }
    
    /**
     * Corrige cards existentes
     */
    function fixExistingCards() {
        const cards = document.querySelectorAll('.execution-card');
        
        cards.forEach(card => {
            // Garantir barra de progresso
            ensureProgressBar(card);
            
            // Se o card está em execução, reiniciar monitoramento
            if (!card.classList.contains('success') && 
                !card.classList.contains('failed') && 
                !card.classList.contains('cancelled')) {
                
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId && typeof window.monitorPlaybookExecution === 'function') {
                    // Inicializar progresso se necessário
                    if (!jobProgressMap.has(jobId)) {
                        jobProgressMap.set(jobId, 5);
                    }
                    
                    // Reiniciar monitoramento após breve atraso
                    setTimeout(() => {
                        window.monitorPlaybookExecution(jobId, card);
                    }, 1000);
                }
            }
        });
        
        if (cards.length > 0) {
            console.log(`${cards.length} cards existentes corrigidos`);
        }
    }
    
    /**
     * Adiciona estilos necessários
     */
    function addProgressStyles() {
        // Verificar se já existem
        if (document.getElementById('ansible-progress-styles-improved')) return;
        
        const style = document.createElement('style');
        style.id = 'ansible-progress-styles-improved';
        style.textContent = `
            .progress-container {
                width: 100%;
                height: 4px;
                background-color: #222;
                border-radius: 2px;
                overflow: hidden;
                margin: 8px 0;
                position: relative;
            }
            
            .progress-bar {
                height: 100%;
                background-color: var(--accent-gold);
                border-radius: 2px;
                width: 0%;
                transition: width 0.3s ease;
            }
            
            /* Estilos para status específicos */
            .execution-card.success .progress-bar {
                background-color: #4CAF50 !important;
            }
            
            .execution-card.failed .progress-bar {
                background-color: #f44336 !important;
            }
            
            .execution-card.cancelled .progress-bar {
                background-color: #ff9800 !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log("Estilos de progresso adicionados");
    }
    
    /**
     * Adiciona observador para novos cards
     */
    function setupCardObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('execution-card')) {
                            // Novo card adicionado
                            ensureProgressBar(node);
                        }
                    }
                }
            });
        });
        
        // Observar o container de playbooks em execução
        const container = document.getElementById('running-playbooks');
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: false
            });
            console.log("Observador de novos cards configurado");
        }
    }
    
    /**
     * Inicializa todas as correções
     */
    function init() {
        console.log("Inicializando correções aprimoradas para barras de progresso");
        
        // Adicionar estilos
        addProgressStyles();
        
        // Corrigir monitoramento
        fixPlaybookProgressMonitoring();
        
        // Corrigir manipulador de conclusão
        fixCompletionHandler();
        
        // Corrigir criação de cards
        fixCardCreation();
        
        // Corrigir cards existentes
        fixExistingCards();
        
        // Configurar observador
        setupCardObserver();
        
        console.log("✅ Correções aprimoradas para barras de progresso aplicadas com sucesso");
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se já carregou, executar imediatamente
        init();
    }
})();