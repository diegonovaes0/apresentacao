/**
 * ansible-progress-animation.js
 * Adiciona animação contínua à barra de progresso para melhorar a experiência do usuário
 */

(function() {
    console.log("Adicionando animação contínua à barra de progresso");
    
    // Mapa para armazenar estado de animação por job
    const animationStateMap = new Map();
    
    /**
     * Adiciona animação contínua à barra de progresso
     * @param {string} jobId - ID do job
     * @param {HTMLElement} card - Card de execução
     */
    function addContinuousProgressAnimation(jobId, card) {
        // Verificar se já existe uma animação para este job
        if (animationStateMap.has(jobId)) {
            return;
        }
        
        const progressBar = card.querySelector('.progress-bar');
        if (!progressBar) return;
        
        // Definir incrementos progressivamente mais lentos
        const progressSteps = [
            { target: 10, duration: 5000 },    // 0-10% em 5 segundos
            { target: 25, duration: 15000 },   // 10-25% em 15 segundos
            { target: 40, duration: 30000 },   // 25-40% em 30 segundos
            { target: 55, duration: 60000 },   // 40-55% em 1 minuto
            { target: 70, duration: 180000 },  // 55-70% em 3 minutos
            { target: 80, duration: 300000 },  // 70-80% em 5 minutos
            { target: 90, duration: 600000 },  // 80-90% em 10 minutos
            { target: 94, duration: 1800000 }  // 90-94% em 30 minutos
        ];
        
        // Inicializar estado de animação
        const animState = {
            currentStep: 0,
            isRunning: true,
            currentProgress: parseFloat(progressBar.style.width) || 5,
            timerId: null
        };
        
        // Salvar estado no mapa
        animationStateMap.set(jobId, animState);
        
        // Função para animar a barra suavemente
        function animateToTarget(fromProgress, targetProgress, duration) {
            if (!animState.isRunning) return;
            if (!document.body.contains(card)) {
                // Card foi removido, parar animação
                stopAnimation(jobId);
                return;
            }
            
            // Verificar status final
            if (card.classList.contains('success') || 
                card.classList.contains('failed') || 
                card.classList.contains('cancelled')) {
                // Card já terminou, completar a barra e parar
                progressBar.style.width = '100%';
                stopAnimation(jobId);
                return;
            }
            
            const startTime = Date.now();
            const incrementPerFrame = (targetProgress - fromProgress) / (duration / 16);
            
            function step() {
                if (!animState.isRunning) return;
                if (!document.body.contains(card)) {
                    stopAnimation(jobId);
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                
                if (elapsed >= duration) {
                    // Atingiu o tempo de duração
                    animState.currentProgress = targetProgress;
                    progressBar.style.width = `${targetProgress}%`;
                    
                    // Passar para o próximo passo
                    animState.currentStep++;
                    if (animState.currentStep < progressSteps.length) {
                        const nextStep = progressSteps[animState.currentStep];
                        animateToTarget(
                            targetProgress, 
                            nextStep.target, 
                            nextStep.duration
                        );
                    } else {
                        // Manter-se nos 94% e aguardar conclusão real
                        checkCompletionStatus();
                    }
                    return;
                }
                
                // Calcular progresso atual
                const progress = fromProgress + (incrementPerFrame * (elapsed / 16));
                animState.currentProgress = progress;
                progressBar.style.width = `${progress}%`;
                
                // Continuar animação
                animState.timerId = requestAnimationFrame(step);
            }
            
            // Iniciar animação
            animState.timerId = requestAnimationFrame(step);
        }
        
        // Função para verificar se a playbook terminou
        function checkCompletionStatus() {
            if (!animState.isRunning) return;
            if (!document.body.contains(card)) {
                stopAnimation(jobId);
                return;
            }
            
            // Verificar status no backend
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'completed' || data.status === 'success') {
                        // Completar com sucesso
                        progressBar.style.width = '100%';
                        progressBar.style.backgroundColor = '#4CAF50'; // Verde
                        stopAnimation(jobId);
                        
                        // Atualizar status visual
                        const statusDiv = card.querySelector('.task-status');
                        if (statusDiv) statusDiv.textContent = 'Concluído com sucesso';
                        
                        // Esconder spinner
                        const spinner = card.querySelector('.spinner');
                        if (spinner) spinner.style.display = 'none';
                        
                        // Adicionar classe de sucesso
                        card.classList.add('success');
                    } else if (data.status === 'failed') {
                        // Completar com falha
                        progressBar.style.width = '100%';
                        progressBar.style.backgroundColor = '#f44336'; // Vermelho
                        stopAnimation(jobId);
                        
                        // Atualizar status visual
                        const statusDiv = card.querySelector('.task-status');
                        if (statusDiv) statusDiv.textContent = 'Falhou';
                        
                        // Esconder spinner
                        const spinner = card.querySelector('.spinner');
                        if (spinner) spinner.style.display = 'none';
                        
                        // Adicionar classe de falha
                        card.classList.add('failed');
                    } else if (data.status === 'cancelled') {
                        // Completar com cancelamento
                        progressBar.style.width = '100%';
                        progressBar.style.backgroundColor = '#ff9800'; // Laranja
                        stopAnimation(jobId);
                        
                        // Atualizar status visual
                        const statusDiv = card.querySelector('.task-status');
                        if (statusDiv) statusDiv.textContent = 'Cancelado';
                        
                        // Esconder spinner
                        const spinner = card.querySelector('.spinner');
                        if (spinner) spinner.style.display = 'none';
                        
                        // Adicionar classe de cancelamento
                        card.classList.add('cancelled');
                    } else if (data.status === 'running') {
                        // Verificar novamente após 5 segundos
                        setTimeout(checkCompletionStatus, 5000);
                    }
                })
                .catch(error => {
                    console.error(`Erro ao verificar status: ${error.message}`);
                    // Tentar novamente após 10 segundos em caso de erro
                    setTimeout(checkCompletionStatus, 10000);
                });
        }
        
        // Função para parar a animação
        function stopAnimation(jobId) {
            const animState = animationStateMap.get(jobId);
            if (animState) {
                animState.isRunning = false;
                if (animState.timerId) {
                    cancelAnimationFrame(animState.timerId);
                }
                animationStateMap.delete(jobId);
            }
        }
        
        // Iniciar com o primeiro passo
        const firstStep = progressSteps[0];
        animateToTarget(
            animState.currentProgress, 
            firstStep.target, 
            firstStep.duration
        );
    }
    
    /**
     * Melhora a função de monitoramento
     */
    function enhanceMonitorPlaybookExecution() {
        // Verificar se a função existe
        if (typeof window.monitorPlaybookExecution !== 'function') {
            console.error("Função monitorPlaybookExecution não encontrada");
            return;
        }
        
        // Salvar referência para função original
        const originalMonitor = window.monitorPlaybookExecution;
        
        // Sobrescrever função
        window.monitorPlaybookExecution = function(jobId, card) {
            // Adicionar animação contínua
            addContinuousProgressAnimation(jobId, card);
            
            // Chamar a função original
            return originalMonitor(jobId, card);
        };
        
        console.log("Função de monitoramento aprimorada");
    }
    
    /**
     * Processa cards existentes
     */
    function processExistingCards() {
        const cards = document.querySelectorAll('.execution-card');
        
        cards.forEach(card => {
            // Verificar se está em execução
            if (!card.classList.contains('success') && 
                !card.classList.contains('failed') && 
                !card.classList.contains('cancelled')) {
                
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId) {
                    // Adicionar animação
                    addContinuousProgressAnimation(jobId, card);
                }
            }
        });
        
        if (cards.length > 0) {
            console.log(`Animação adicionada a ${cards.length} cards existentes`);
        }
    }
    
    /**
     * Inicializa as melhorias
     */
    function init() {
        console.log("Inicializando animação de progresso contínuo");
        
        // Melhorar monitoramento
        enhanceMonitorPlaybookExecution();
        
        // Processar cards existentes
        processExistingCards();
        
        // Adicionar observador para novos cards
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('execution-card')) {
                            // Novo card adicionado
                            const jobId = node.getAttribute('data-job-id') || node.dataset.jobId;
                            if (jobId) {
                                // Adicionar animação com pequeno atraso para garantir que o card está pronto
                                setTimeout(() => {
                                    addContinuousProgressAnimation(jobId, node);
                                }, 500);
                            }
                        }
                    }
                }
            });
        });
        
        // Observar container de playbooks
        const container = document.getElementById('running-playbooks');
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: false
            });
            console.log("Observador para novos cards configurado");
        }
        
        console.log("✅ Animação de progresso contínuo aplicada com sucesso");
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se já carregou, executar imediatamente
        init();
    }
})();