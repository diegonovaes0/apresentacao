/**
 * ansible-persistence-fix.js
 * Solução para problemas de persistência, barras de progresso e atualização de seletores no Ansible
 */

(function() {
    console.log("Inicializando soluções para os problemas do gerenciador Ansible");
    
    // --------- PROBLEMA 1: Cards desaparecem ao trocar de página ---------

    /**
     * Implementa persistência de cards entre navegações de página
     */
    function implementCardPersistence() {
        // Verifica se a função já existe, para evitar redefinição
        if (typeof window.setupCardPersistence !== 'function') {
            console.log("Implementando persistência de cards entre páginas");
            
            /**
             * Salva o estado dos cards de execução na sessionStorage
             */
            window.saveRunningJobsState = function() {
                try {
                    if (!window.sessionStorage) return;
                    
                    const runningCards = Array.from(document.querySelectorAll('.execution-card'));
                    if (runningCards.length === 0) return;
                    
                    // Armazenar dados necessários para recriar os cards
                    const cardsData = runningCards.map(card => {
                        return {
                            id: card.id,
                            jobId: card.dataset.jobId || card.getAttribute('data-job-id'),
                            playbookName: card.dataset.playbookName,
                            innerHTML: card.innerHTML,
                            className: card.className,
                            hosts: Array.from(card.querySelectorAll('.host-details')).map(hostDetail => hostDetail.getAttribute('data-host'))
                        };
                    });
                    
                    // Salvar no sessionStorage
                    sessionStorage.setItem('runningAnsibleCards', JSON.stringify(cardsData));
                    console.log(`Estado de ${cardsData.length} cards salvos na sessão`);
                } catch (error) {
                    console.error(`Erro ao salvar estado dos cards: ${error.message}`);
                }
            };
            
            /**
             * Restaura os cards de execução da sessionStorage
             */
            window.restoreRunningJobsState = function() {
                try {
                    if (!window.sessionStorage) return;
                    
                    const savedCardsData = sessionStorage.getItem('runningAnsibleCards');
                    if (!savedCardsData) return;
                    
                    const cardsData = JSON.parse(savedCardsData);
                    if (!cardsData || !cardsData.length) return;
                    
                    const executionContainer = document.getElementById('running-playbooks');
                    if (!executionContainer) {
                        console.error('Container de execução não encontrado');
                        return;
                    }
                    
                    // Restaurar cada card
                    cardsData.forEach(cardData => {
                        // Verificar se já existe
                        if (document.getElementById(cardData.id)) {
                            console.log(`Card ${cardData.id} já existe na página`);
                            return;
                        }
                        
                        const card = document.createElement('div');
                        card.id = cardData.id;
                        card.className = cardData.className;
                        
                        // Definir atributos de dados
                        if (cardData.jobId) {
                            card.dataset.jobId = cardData.jobId;
                            card.setAttribute('data-job-id', cardData.jobId);
                        }
                        
                        if (cardData.playbookName) {
                            card.dataset.playbookName = cardData.playbookName;
                        }
                        
                        card.innerHTML = cardData.innerHTML;
                        
                        // Adicionar no início da lista
                        executionContainer.insertBefore(card, executionContainer.firstChild);
                        
                        // Re-anexar event listeners
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
                        
                        // Atualizar a barra de progresso - PROBLEMA 2
                        fixProgressBar(card);
                        
                        // Retomar monitoramento se estiver em execução
                        if (cardData.jobId && 
                            !card.classList.contains('success') && 
                            !card.classList.contains('failed') && 
                            !card.classList.contains('cancelled')) {
                            
                            if (window.runningJobs && typeof window.runningJobs.set === 'function') {
                                window.runningJobs.set(cardData.jobId, card);
                                
                                if (typeof window.monitorPlaybookExecution === 'function') {
                                    window.monitorPlaybookExecution(cardData.jobId, card);
                                }
                            }
                        }
                        
                        console.log(`Card restaurado: ${cardData.playbookName}`);
                    });
                    
                    console.log(`${cardsData.length} cards restaurados da sessão`);
                } catch (error) {
                    console.error(`Erro ao restaurar estado dos cards: ${error.message}`);
                }
            };
            
            /**
             * Função para inicializar o comportamento de persistência
             */
            window.setupCardPersistence = function() {
                console.log("Configurando persistência dos cards entre páginas");
                
                // Restaurar os cards da sessão anterior
                window.restoreRunningJobsState();
                
                // Adicionar event listeners para detectar quando a página será recarregada ou fechada
                window.addEventListener('beforeunload', window.saveRunningJobsState);
                
                // Salvar periodicamente o estado dos cards
                setInterval(window.saveRunningJobsState, 5000);
                
                // Detectar navegação interna
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link && link.href.includes(window.location.origin)) {
                        window.saveRunningJobsState();
                    }
                });
                
                // Sobrescrever handlePlaybookCompletion para salvar estado
                if (typeof window.handlePlaybookCompletion === 'function' && 
                    !window.originalHandlePlaybookCompletion) {
                    
                    window.originalHandlePlaybookCompletion = window.handlePlaybookCompletion;
                    
                    window.handlePlaybookCompletion = function(status, card) {
                        // Chamar função original
                        window.originalHandlePlaybookCompletion(status, card);
                        
                        // Salvar o estado após a conclusão
                        setTimeout(window.saveRunningJobsState, 100);
                    };
                }
                
                console.log("Persistência de cards configurada com sucesso");
            };
        }
    }

    // --------- PROBLEMA 2: Barras de progresso não aparecem ---------

    /**
     * Corrige as barras de progresso nos cards
     * @param {HTMLElement} card - Card de execução a ser corrigido
     */
    function fixProgressBar(card) {
        if (!card) return;
        
        // Verificar se já tem uma barra de progresso
        let progressContainer = card.querySelector('.progress-container');
        let progressBar = card.querySelector('.progress-bar');
        
        // Se não existir o container ou a barra, criar
        if (!progressContainer) {
            // Encontrar o melhor lugar para inserir a barra
            const hostInfo = card.querySelector('.host-info');
            const outputDiv = card.querySelector('.ansible-output');
            
            progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.style.cssText = `
                width: 100%;
                height: 4px;
                background-color: #222;
                border-radius: 2px;
                overflow: hidden;
                margin: 10px 0;
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
            
            // Inserir após o host-info, ou antes do output
            if (hostInfo && hostInfo.nextSibling) {
                card.insertBefore(progressContainer, hostInfo.nextSibling);
            } else if (outputDiv) {
                card.insertBefore(progressContainer, outputDiv);
            } else {
                // Último recurso: inserir antes do grupo de botões
                const buttonGroup = card.querySelector('.button-group');
                if (buttonGroup) {
                    card.insertBefore(progressContainer, buttonGroup);
                } else {
                    // Se nada mais funcionar, adicionar ao final
                    card.appendChild(progressContainer);
                }
            }
        }
        
        // Verificar o status do card para definir a largura da barra
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
            // Se estiver em execução, mostrar 50% por padrão
            progressBar.style.width = '50%';
            progressBar.style.backgroundColor = 'var(--accent-gold)';
        }
    }

    /**
     * Corrige o monitoramento para atualizar a barra de progresso
     */
    function fixProgressBarMonitoring() {
        // Verificar se a função monitorPlaybookExecution existe e se ainda não foi modificada
        if (typeof window.monitorPlaybookExecution === 'function' && 
            !window.originalMonitorPlaybookExecution) {
            
            // Guardar referência para função original
            window.originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
            
            // Sobrescrever função
            window.monitorPlaybookExecution = function(jobId, card) {
                console.log(`Monitorando job ${jobId} com barra de progresso melhorada`);
                
                // Garantir que a barra de progresso exista
                fixProgressBar(card);
                
                // Chamar função original
                window.originalMonitorPlaybookExecution(jobId, card);
                
                // Adicionar monitoramento extra para a barra de progresso
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    let progress = 10; // Iniciar com 10%
                    
                    const updateProgress = function() {
                        // Verificar se o card ainda existe
                        if (!document.body.contains(card)) return;
                        
                        // Verificar se já foi concluído
                        if (card.classList.contains('success') || 
                            card.classList.contains('failed') || 
                            card.classList.contains('cancelled')) {
                            return;
                        }
                        
                        // Incrementar progresso gradualmente até 90%
                        progress = Math.min(90, progress + 5);
                        progressBar.style.width = `${progress}%`;
                        
                        // Continuar atualizando a cada 2 segundos
                        setTimeout(updateProgress, 2000);
                    };
                    
                    // Iniciar atualização
                    updateProgress();
                }
            };
            
            console.log("Monitoramento de barras de progresso aprimorado");
        }
    }

    /**
     * Corrige barras de progresso nos cards existentes
     */
    function fixExistingProgressBars() {
        const cards = document.querySelectorAll('.execution-card');
        cards.forEach(card => {
            fixProgressBar(card);
        });
        
        if (cards.length > 0) {
            console.log(`Barras de progresso corrigidas em ${cards.length} cards existentes`);
        }
    }

    // --------- PROBLEMA 3: Seletores não atualizam playbooks ---------

    /**
     * Corrige os seletores para atualizar playbooks imediatamente
     */
    function fixSelectorsRefresh() {
        console.log("Corrigindo atualização de playbooks nos seletores");
        
        // Verificar se o loadPlaybooks existe
        if (typeof window.loadPlaybooks !== 'function') {
            console.error("Função loadPlaybooks não encontrada - não é possível corrigir seletores");
            return;
        }
        
        // Re-anexar event listeners aos seletores para garantir atualização imediata
        const osFilter = document.getElementById('os-filter');
        const categoryFilter = document.getElementById('category-filter');
        
        if (osFilter) {
            // Clonar para remover event listeners antigos
            const newOsFilter = osFilter.cloneNode(true);
            osFilter.parentNode.replaceChild(newOsFilter, osFilter);
            
            // Adicionar novo event listener com força de atualização
            newOsFilter.addEventListener('change', function() {
                console.log(`Seletor de SO alterado para: ${this.value} - Forçando atualização`);
                
                // Mostrar indicador de carregamento
                const playbooksContainer = document.getElementById('playbooks');
                if (playbooksContainer) {
                    playbooksContainer.innerHTML = `
                        <div class="loading-playbooks">
                            <span class="spinner"></span>
                            <span>Carregando playbooks para ${OS_MAPPING[this.value]?.display || this.value}...</span>
                        </div>
                    `;
                }
                
                // Forçar refresh
                if (typeof window.loadPlaybooks === 'function') {
                    window.loadPlaybooks(true);
                }
                
                // Atualizar painel de informações do SO
                if (typeof window.updateOSInfoPanel === 'function') {
                    window.updateOSInfoPanel();
                }
            });
            
            console.log("Event listener do seletor de SO reconfigurado");
        }
        
        if (categoryFilter) {
            // Clonar para remover event listeners antigos
            const newCategoryFilter = categoryFilter.cloneNode(true);
            categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
            
            // Adicionar novo event listener com força de atualização
            newCategoryFilter.addEventListener('change', function() {
                console.log(`Seletor de categoria alterado para: ${this.value} - Forçando atualização`);
                
                // Forçar refresh
                if (typeof window.loadPlaybooks === 'function') {
                    window.loadPlaybooks(true);
                }
            });
            
            console.log("Event listener do seletor de categoria reconfigurado");
        }
    }
    
    /**
     * Melhora a função de carregamento de playbooks para sempre atualizar ao mudar filtros
     */
    function enhancePlaybooksLoading() {
        // Verificar se a função loadPlaybooks existe e ainda não foi modificada
        if (typeof window.loadPlaybooks === 'function' && !window.originalLoadPlaybooks) {
            // Guardar referência para função original
            window.originalLoadPlaybooks = window.loadPlaybooks;
            
            // Sobrescrever função
            window.loadPlaybooks = function(forceRefresh = false) {
                try {
                    // Obter valores dos filtros
                    const osFilter = document.getElementById('os-filter');
                    const categoryFilter = document.getElementById('category-filter');
                    
                    if (!osFilter || !categoryFilter) {
                        throw new Error('Seletores não encontrados');
                    }
                    
                    const osValue = osFilter.value;
                    const categoryValue = categoryFilter.value;
                    
                    // Obter valores anteriores
                    const lastOsFilter = sessionStorage.getItem('lastOsFilter');
                    const lastCategoryFilter = sessionStorage.getItem('lastCategoryFilter');
                    
                    // Se os filtros mudaram, forçar refresh
                    if (lastOsFilter !== osValue || lastCategoryFilter !== categoryValue) {
                        console.log(`Filtros mudaram: SO ${lastOsFilter} -> ${osValue}, Categoria ${lastCategoryFilter} -> ${categoryValue}`);
                        forceRefresh = true;
                    }
                    
                    // Salvar valores atuais
                    sessionStorage.setItem('lastOsFilter', osValue);
                    sessionStorage.setItem('lastCategoryFilter', categoryValue);
                    
                    // Mostrar indicador de carregamento
                    const playbooksContainer = document.getElementById('playbooks');
                    if (playbooksContainer) {
                        playbooksContainer.innerHTML = `
                            <div class="loading-playbooks">
                                <span class="spinner"></span>
                                <span>Carregando playbooks para ${OS_MAPPING[osValue]?.display || osValue}...</span>
                            </div>
                        `;
                    }
                    
                    // Chamar a função original com parâmetro forceRefresh
                    return window.originalLoadPlaybooks(forceRefresh);
                } catch (error) {
                    console.error(`Erro ao carregar playbooks: ${error.message}`);
                    // Em caso de erro, tentar chamar a função original diretamente
                    return window.originalLoadPlaybooks(forceRefresh);
                }
            };
            
            console.log("Função de carregamento de playbooks aprimorada");
        }
    }

    /**
     * Inicializa todas as correções
     */
    function init() {
        console.log("Inicializando correções para o gerenciador Ansible");
        
        // Problema 1: Cards desaparecem
        implementCardPersistence();
        if (typeof window.setupCardPersistence === 'function') {
            // Chamar imediatamente para restaurar cards
            window.setupCardPersistence();
        }
        
        // Problema 2: Barras de progresso
        fixProgressBarMonitoring();
        fixExistingProgressBars();
        
        // Problema 3: Seletores não atualizam
        enhancePlaybooksLoading();
        
        // Esperar DOM estar totalmente carregado para corrigir seletores
        if (document.readyState === 'complete') {
            fixSelectorsRefresh();
        } else {
            // Se não estiver, aguardar o evento load
            window.addEventListener('load', fixSelectorsRefresh);
        }
        
        // Adicionar hook para monitorar o DOM e corrigir novos elementos
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('execution-card')) {
                            // Corrigir barra de progresso em novos cards
                            fixProgressBar(node);
                        }
                    }
                }
            });
        });
        
        // Iniciar observação
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log("✅ Todas as correções aplicadas com sucesso");
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se já carregou, executar imediatamente
        init();
    }
})();