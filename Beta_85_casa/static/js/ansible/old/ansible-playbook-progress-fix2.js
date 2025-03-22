/**
 * ansible-playbook-progress-controlled.js
 * Barra de progresso com saltos controlados, sem retrocesso e paradas estratégicas
 */

(function() {
    console.log("Iniciando implementação de barra de progresso com saltos controlados");
    
    // Armazenar o progresso de cada job e seu temporizador
    const jobProgressMap = new Map();
    const jobTimerMap = new Map();
    
    /**
     * Implementa o avanço controlado da barra com paradas estratégicas
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Elemento do card de execução
     */
    function implementControlledProgressAdvance(jobId, card) {
        // Interromper temporizador existente, se houver
        if (jobTimerMap.has(jobId)) {
            clearTimeout(jobTimerMap.get(jobId));
        }
        
        // Obter barra de progresso
        const progressBar = card.querySelector('.progress-bar');
        if (!progressBar) return;
        
        // Inicializar com 10% imediatamente
        progressBar.style.width = '10%';
        jobProgressMap.set(jobId, 10);
        
        // Definir os estágios de progresso e seus tempos de espera (em milissegundos)
        const progressStages = [
            { target: 20, delay: 10000 },  // 10% -> 20% após 10 segundos
            { target: 30, delay: 10000 },  // 20% -> 30% após 10 segundos
            { target: 40, delay: 10000 },  // 30% -> 40% após 10 segundos
            { target: 50, delay: 10000 },  // 40% -> 50% após 10 segundos
            { target: 60, delay: 10000 },  // 50% -> 60% após 10 segundos
            { target: 70, delay: 10000 },  // 60% -> 70% após 10 segundos
            { target: 75, delay: 25000 },  // 70% -> 75% após 25 segundos
            { target: 80, delay: 25000 },  // 75% -> 80% após 25 segundos
            { target: 85, delay: 5 * 60000 }, // 80% -> 85% após 5 minutos
            { target: 90, delay: 5 * 60000 }, // 85% -> 90% após 5 minutos
            { target: 95, delay: 5 * 60000 }, // 90% -> 95% após 5 minutos
            { target: 99, delay: 5 * 60000 }  // 95% -> 99% após 5 minutos
            // 99% -> parar e aguardar a conclusão real
        ];
        
        // Índice do estágio atual
        let currentStageIndex = 0;
        
        // Função para avançar para o próximo estágio
        const advanceToNextStage = () => {
            // Verificar se o card já tem um status final
            if (card.classList.contains('success') || 
                card.classList.contains('failed') || 
                card.classList.contains('cancelled') ||
                !document.body.contains(card)) {
                return;
            }
            
            // Verificar se ainda há estágios
            if (currentStageIndex >= progressStages.length) {
                return;
            }
            
            // Obter o estágio atual
            const currentStage = progressStages[currentStageIndex];
            
            // Atualizar a barra com o novo valor
            progressBar.style.width = `${currentStage.target}%`;
            jobProgressMap.set(jobId, currentStage.target);
            
            console.log(`Job ${jobId}: Progresso avançado para ${currentStage.target}%, próximo em ${currentStage.delay/1000}s`);
            
            // Avançar para o próximo estágio após o delay especificado
            currentStageIndex++;
            
            // Se ainda houver estágios, agendar o próximo
            if (currentStageIndex < progressStages.length) {
                const timerId = setTimeout(advanceToNextStage, currentStage.delay);
                jobTimerMap.set(jobId, timerId);
            }
        };
        
        // Iniciar o avanço após um pequeno delay para garantir que a UI foi atualizada
        const timerId = setTimeout(advanceToNextStage, 500);
        jobTimerMap.set(jobId, timerId);
    }
    
    /**
     * Substitui o monitoramento original de progresso
     */
    function enhanceProgressMonitoring() {
        // Verificar se a função original existe
        const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
        
        if (typeof originalMonitorPlaybookExecution !== 'function') {
            console.error("Função monitorPlaybookExecution não encontrada");
            return;
        }
        
        // Sobrescrever a função
        window.monitorPlaybookExecution = function(jobId, card) {
            console.log(`Monitorando execução com progresso controlado: ${jobId}`);
            
            // Garantir que a barra de progresso exista
            ensureProgressBar(card);
            
            // Iniciar o avanço controlado da barra
            implementControlledProgressAdvance(jobId, card);
            
            // Configurar verificação periódica de status para finalizar corretamente
            setupStatusCheck(jobId, card);
            
            // Para compatibilidade, chamar a função original mas proteger nossa barra
            try {
                // Armazenar o valor atual da width
                const progressBar = card.querySelector('.progress-bar');
                const originalWidth = progressBar ? progressBar.style.width : '';
                
                // Chamar função original
                originalMonitorPlaybookExecution(jobId, card);
                
                // Restaurar nossa width se necessário (para evitar retrocesso)
                if (progressBar && jobProgressMap.has(jobId)) {
                    const currentProgress = jobProgressMap.get(jobId);
                    const storedWidth = `${currentProgress}%`;
                    
                    // Restaurar apenas se a largura for menor que a nossa
                    const newWidth = progressBar.style.width;
                    const newPercent = parseInt(newWidth) || 0;
                    
                    if (newPercent < currentProgress) {
                        progressBar.style.width = storedWidth;
                    }
                }
            } catch (error) {
                console.error(`Erro ao chamar função original: ${error.message}`);
            }
        };
        
        console.log("Monitoramento de progresso controlado aplicado");
    }
    
    /**
     * Configura verificação periódica do status real do job
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Elemento do card
     */
    function setupStatusCheck(jobId, card) {
        // Intervalo inicial de 15 segundos
        const checkInterval = 15000;
        
        function checkJobStatus() {
            // Não continuar se o card já tiver um status final
            if (card.classList.contains('success') || 
                card.classList.contains('failed') || 
                card.classList.contains('cancelled') ||
                !document.body.contains(card)) {
                return;
            }
            
            // Consultar o status real
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Se o job realmente terminou, atualizar a UI
                    if (data.status === 'completed' || data.status === 'success') {
                        completeProgress(jobId, card, 'success');
                    } else if (data.status === 'failed') {
                        completeProgress(jobId, card, 'failed');
                    } else if (data.status === 'cancelled') {
                        completeProgress(jobId, card, 'cancelled');
                    } else {
                        // Ainda em execução, verificar novamente mais tarde
                        setTimeout(checkJobStatus, checkInterval);
                    }
                })
                .catch(error => {
                    console.error(`Erro ao verificar status: ${error.message}`);
                    // Tentar novamente mais tarde
                    setTimeout(checkJobStatus, checkInterval);
                });
        }
        
        // Iniciar verificação
        setTimeout(checkJobStatus, checkInterval);
    }
    
    /**
     * Completa o progresso da barra com status final
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Elemento do card
     * @param {string} status - Status final ('success', 'failed', ou 'cancelled')
     */
    function completeProgress(jobId, card, status) {
        // Interromper avanço automático
        if (jobTimerMap.has(jobId)) {
            clearTimeout(jobTimerMap.get(jobId));
            jobTimerMap.delete(jobId);
        }
        
        // Atualizar a barra para 100%
        const progressBar = card.querySelector('.progress-bar');
        if (progressBar) {
            // Aplicar transição suave
            progressBar.style.transition = 'width 0.7s ease, background-color 0.3s ease';
            
            // Definir largura e cor
            progressBar.style.width = '100%';
            
            switch (status) {
                case 'success':
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
        
        // Atualizar status visual
        updateCardStatus(card, status);
        
        // Atualizar o mapa de progresso
        jobProgressMap.set(jobId, 100);
    }
    
    /**
     * Atualiza o visual do card de acordo com o status final
     * @param {HTMLElement} card - Elemento do card
     * @param {string} status - Status final
     */
    function updateCardStatus(card, status) {
        // Remover classes existentes
        card.classList.remove('success', 'failed', 'cancelled');
        
        // Adicionar classe de status
        card.classList.add(status);
        
        // Atualizar texto de status
        const statusDiv = card.querySelector('.task-status');
        if (statusDiv) {
            switch (status) {
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
                width: 0%;
                transition: width 0.5s ease;
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
        
        return progressBar;
    }
    
    /**
     * Corrige o manipulador de conclusão para finalizar a barra corretamente
     */
    function enhanceCompletionHandler() {
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
            
            // Completar a barra de progresso com o status apropriado
            if (jobId) {
                completeProgress(jobId, card, status);
            }
            
            // Chamar a função original para o restante do processamento
            try {
                originalHandleCompletion(status, card);
            } catch (error) {
                console.error(`Erro ao chamar manipulador original: ${error.message}`);
            }
        };
        
        console.log("Manipulador de conclusão aprimorado");
    }
    
    /**
     * Evita que o progresso retroceda em qualquer circunstância
     */
    function preventProgressRegression() {
        // Interceptar atualizações ao estilo da barra de progresso
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        
        CSSStyleDeclaration.prototype.setProperty = function(prop, value, priority) {
            // Verificar se é uma barra de progresso e a propriedade é width
            if (this.parentElement && 
                this.parentElement.classList && 
                this.parentElement.classList.contains('progress-bar') && 
                prop === 'width') {
                
                // Extrair o valor numérico
                const newValue = parseInt(value) || 0;
                
                // Obter o elemento do card
                let card = this.parentElement.closest('.execution-card');
                if (card) {
                    // Obter o ID do job
                    const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                    
                    if (jobId && jobProgressMap.has(jobId)) {
                        const storedProgress = jobProgressMap.get(jobId);
                        
                        // Se o novo valor é menor que o armazenado, não permitir retrocesso
                        if (newValue < storedProgress) {
                            console.log(`Prevenindo retrocesso: ${newValue}% < ${storedProgress}%`);
                            return; // Ignorar esta atualização
                        }
                        
                        // Atualizar o valor armazenado se for maior
                        if (newValue > storedProgress) {
                            jobProgressMap.set(jobId, newValue);
                        }
                    }
                }
            }
            
            // Chamar a função original
            return originalSetProperty.call(this, prop, value, priority);
        };
        
        console.log("Proteção contra retrocesso de progresso implementada");
    }
    
    /**
     * Adiciona estilos necessários
     */
    function addProgressStyles() {
        // Verificar se já existem
        if (document.getElementById('ansible-progress-styles-controlled')) return;
        
        const style = document.createElement('style');
        style.id = 'ansible-progress-styles-controlled';
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
                transition: width 0.5s ease;
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
        console.log("Estilos de progresso controlado adicionados");
    }
    
    /**
     * Corrige a criação de cards para adicionar barras de progresso
     */
    function enhanceCardCreation() {
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
            
            // Adicionar barra de progresso
            ensureProgressBar(card);
            
            // Obter o ID do job
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            
            // Inicializar progresso e iniciar avanço controlado
            if (jobId) {
                // Iniciar imediatamente em 10%
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '10%';
                }
                
                jobProgressMap.set(jobId, 10);
                
                // Iniciar o avanço controlado após um breve atraso
                setTimeout(() => {
                    implementControlledProgressAdvance(jobId, card);
                }, 200);
            }
            
            return card;
        };
        
        console.log("Função de criação de cards aprimorada");
    }
    
    /**
     * Aprimora cards existentes com progresso controlado
     */
    function enhanceExistingCards() {
        const cards = document.querySelectorAll('.execution-card');
        
        cards.forEach(card => {
            // Pular cards que já têm um status final
            if (card.classList.contains('success') || 
                card.classList.contains('failed') || 
                card.classList.contains('cancelled')) {
                return;
            }
            
            // Adicionar barra de progresso
            ensureProgressBar(card);
            
            // Obter ID do job e iniciar progresso controlado
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            if (jobId) {
                // Inicializar imediatamente com 10%
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '10%';
                }
                
                jobProgressMap.set(jobId, 10);
                
                // Iniciar o avanço controlado
                setTimeout(() => {
                    implementControlledProgressAdvance(jobId, card);
                }, 500);
                
                // Também configurar verificação de status
                setupStatusCheck(jobId, card);
            }
        });
        
        if (cards.length > 0) {
            console.log(`${cards.length} cards existentes aprimorados`);
        }
    }
    
    /**
     * Inicializa todas as melhorias
     */
    function init() {
        console.log("Inicializando barras de progresso com avanço controlado");
        
        // Adicionar estilos
        addProgressStyles();
        
        // Prevenir retrocesso do progresso
        preventProgressRegression();
        
        // Aprimorar monitoramento
        enhanceProgressMonitoring();
        
        // Aprimorar manipulador de conclusão
        enhanceCompletionHandler();
        
        // Aprimorar criação de cards
        enhanceCardCreation();
        
        // Aprimorar cards existentes
        enhanceExistingCards();
        
        console.log("✅ Barras de progresso com avanço controlado implementadas com sucesso");
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se já carregou, executar imediatamente
        init();
    }
})();