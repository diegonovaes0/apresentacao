/**
 * ansible-ui-fixes.js
 * Solução para problemas de seletores e estado de cards no gerenciador Ansible
 * 
 * Este script corrige dois problemas:
 * 1. Seletores não atualizam as playbooks na primeira abertura da página
 * 2. Cards restaurados aparecem com a saída expandida
 */

(function() {
    console.log("Inicializando correções para problemas de UI do Ansible");
    
    // Configurações
    const CONFIG = {
        debug: true,
        selectors: {
            osFilter: '#os-filter',
            categoryFilter: '#category-filter',
            playbooksContainer: '#playbooks',
            runningPlaybooks: '#running-playbooks',
            executionCards: '.execution-card'
        },
        maxRetries: 5,
        retryInterval: 500
    };
    
    // Função de log centralizada
    function log(message, type = 'info') {
        if (!CONFIG.debug && type !== 'error') return;
        
        const prefix = `[Ansible UI Fix] [${type.toUpperCase()}]`;
        
        switch (type) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * =======================================
     * CORREÇÃO PARA O PROBLEMA 1: SELETORES
     * =======================================
     * 
     * O problema ocorre porque o listener inicial dos seletores não força
     * uma atualização completa na primeira vez que a página é carregada.
     * Vamos substituir os listeners e forçar uma carga inicial completa.
     */
    
    // Variável de estado para controlar a inicialização
    let isFirstLoad = true;
    
    /**
     * Força o carregamento das playbooks para os filtros selecionados
     */
    function forcePlaybooksRefresh() {
        const osFilter = document.querySelector(CONFIG.selectors.osFilter);
        const categoryFilter = document.querySelector(CONFIG.selectors.categoryFilter);
        
        if (!osFilter || !categoryFilter) {
            log("Seletores não encontrados, tentando novamente em breve...", "warning");
            return false;
        }
        
        const osValue = osFilter.value;
        const categoryValue = categoryFilter.value;
        
        log(`Forçando atualização das playbooks - SO: ${osValue}, Categoria: ${categoryValue}`);
        
        // Limpar dados de cache no sessionStorage
        sessionStorage.removeItem('playbooksLoaded');
        sessionStorage.removeItem('playbooksData');
        
        // Mostrar indicador de carregamento
        const playbooksContainer = document.querySelector(CONFIG.selectors.playbooksContainer);
        if (playbooksContainer) {
            // Exibir mensagem de carregamento com nome do SO
            const osMapping = window.OS_MAPPING || {};
            const osDisplay = osMapping[osValue]?.display || osValue;
            
            playbooksContainer.innerHTML = `
                <div class="loading-playbooks">
                    <span class="ansible-spinner" style="
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 50%;
                        border-top-color: var(--accent-gold, #FFD600);
                        animation: ansible-spin 1s linear infinite;
                    "></span>
                    <span>Carregando playbooks para ${osDisplay}...</span>
                </div>
            `;
            
            // Adicionar keyframes de animação se não existir
            if (!document.getElementById('ansible-spinner-keyframes')) {
                const style = document.createElement('style');
                style.id = 'ansible-spinner-keyframes';
                style.textContent = `
                    @keyframes ansible-spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Chamar a função de carregamento com forceRefresh=true
        if (typeof window.loadPlaybooks === 'function') {
            log("Chamando loadPlaybooks(true) para forçar atualização");
            window.loadPlaybooks(true);
            return true;
        } else {
            // Se a função não existir, tentar uma abordagem alternativa
            log("Função loadPlaybooks não disponível, tentando refresh da página", "warning");
            
            // Verificar se existem outras funções para atualizar a interface
            if (typeof window.refreshAll === 'function') {
                window.refreshAll();
                return true;
            }
            
            return false;
        }
    }
    
    /**
     * Substitui os event listeners dos seletores para garantir atualização
     */
    function fixSelectors() {
        const osFilter = document.querySelector(CONFIG.selectors.osFilter);
        const categoryFilter = document.querySelector(CONFIG.selectors.categoryFilter);
        
        if (!osFilter || !categoryFilter) {
            log("Seletores não encontrados, tentativa adiada", "warning");
            return false;
        }
        
        log("Reconfigurando event listeners dos seletores");
        
        // Salvar valores iniciais para detectar mudanças reais
        const originalOS = osFilter.value;
        const originalCategory = categoryFilter.value;
        
        // Remover event listeners atuais (criar clones)
        const newOsFilter = osFilter.cloneNode(true);
        const newCategoryFilter = categoryFilter.cloneNode(true);
        
        osFilter.parentNode.replaceChild(newOsFilter, osFilter);
        categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
        
        // Adicionar novos event listeners com forceRefresh
        newOsFilter.addEventListener('change', function() {
            log(`Seletor de SO alterado para: ${this.value}`);
            forcePlaybooksRefresh();
            
            // Chamar updateOSInfoPanel se disponível
            if (typeof window.updateOSInfoPanel === 'function') {
                window.updateOSInfoPanel();
            }
        });
        
        newCategoryFilter.addEventListener('change', function() {
            log(`Seletor de categoria alterado para: ${this.value}`);
            forcePlaybooksRefresh();
        });
        
        log("Event listeners dos seletores reconfigurados com sucesso");
        
        // Se for a primeira carga, forçar uma atualização
        if (isFirstLoad) {
            log("Primeira carga detectada, forçando atualização inicial");
            setTimeout(() => {
                forcePlaybooksRefresh();
                isFirstLoad = false;
            }, 300);
        }
        
        return true;
    }
    
    /**
     * Tenta repetidamente corrigir os seletores até ter sucesso
     * @param {number} retriesLeft - Número de tentativas restantes
     */
    function attemptFixSelectors(retriesLeft = CONFIG.maxRetries) {
        if (retriesLeft <= 0) {
            log("Número máximo de tentativas excedido para corrigir seletores", "error");
            return;
        }
        
        if (!fixSelectors()) {
            log(`Não foi possível corrigir seletores, tentando novamente... (${retriesLeft} tentativas restantes)`);
            setTimeout(() => attemptFixSelectors(retriesLeft - 1), CONFIG.retryInterval);
        }
    }
    
    /**
     * =======================================
     * CORREÇÃO PARA O PROBLEMA 2: CARDS EXPANDIDOS
     * =======================================
     * 
     * Os cards são restaurados com a saída expandida. Precisamos modificar
     * o processo de restauração para garantir que eles sejam fechados.
     */
    
    /**
     * Garante que os cards restaurados estejam colapsados
     */
    function ensureCollapsedCards() {
        // Verificar se existe a função de restauração
        if (typeof window.restoreRunningJobsState === 'function' && !window.originalRestoreFunc) {
            log("Modificando restoreRunningJobsState para garantir cards colapsados");
            
            // Salvar referência da função original
            window.originalRestoreFunc = window.restoreRunningJobsState;
            
            // Sobrescrever com versão melhorada
            window.restoreRunningJobsState = function() {
                // Chamar função original para restaurar os cards
                window.originalRestoreFunc.apply(this, arguments);
                
                // Em seguida, garantir que todos os cards estejam colapsados
                setTimeout(() => {
                    const cards = document.querySelectorAll(CONFIG.selectors.executionCards);
                    log(`Verificando ${cards.length} cards restaurados`);
                    
                    cards.forEach(card => {
                        const outputDiv = card.querySelector('.ansible-output');
                        const toggleBtn = card.querySelector('.toggle-output-btn');
                        
                        if (outputDiv && outputDiv.style.display === 'block' && toggleBtn) {
                            log("Colapsando card expandido");
                            
                            // Colapsar a saída
                            outputDiv.style.display = 'none';
                            
                            // Atualizar o botão
                            toggleBtn.innerHTML = `
                                Ver Mais
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute, #000)" stroke-width="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            `;
                        }
                    });
                }, 300);
            };
            
            // Se existir, corrigir a função de salvar estado também
            if (typeof window.saveRunningJobsState === 'function' && !window.originalSaveFunc) {
                log("Modificando saveRunningJobsState para não armazenar estado de expansão");
                
                window.originalSaveFunc = window.saveRunningJobsState;
                
                window.saveRunningJobsState = function() {
                    // Temporariamente colapsar todos os cards antes de salvar
                    const cards = document.querySelectorAll(CONFIG.selectors.executionCards);
                    const expandedCards = [];
                    
                    // Registrar e colapsar todos os cards expandidos
                    cards.forEach(card => {
                        const outputDiv = card.querySelector('.ansible-output');
                        if (outputDiv && outputDiv.style.display === 'block') {
                            expandedCards.push({
                                card,
                                outputDiv
                            });
                            
                            // Colapsar temporariamente
                            outputDiv.style.display = 'none';
                        }
                    });
                    
                    // Chamar função original para salvar o estado
                    window.originalSaveFunc.apply(this, arguments);
                    
                    // Restaurar o estado anterior de expansão
                    expandedCards.forEach(item => {
                        item.outputDiv.style.display = 'block';
                    });
                };
            }
            
            return true;
        } else if (window.originalRestoreFunc) {
            // Já modificado
            return true;
        }
        
        log("Função restoreRunningJobsState não encontrada", "warning");
        return false;
    }
    
    /**
     * Tenta repetidamente corrigir os cards até ter sucesso
     * @param {number} retriesLeft - Número de tentativas restantes
     */
    function attemptFixCards(retriesLeft = CONFIG.maxRetries) {
        if (retriesLeft <= 0) {
            log("Número máximo de tentativas excedido para corrigir cards", "error");
            return;
        }
        
        if (!ensureCollapsedCards()) {
            log(`Não foi possível corrigir cards, tentando novamente... (${retriesLeft} tentativas restantes)`);
            setTimeout(() => attemptFixCards(retriesLeft - 1), CONFIG.retryInterval);
        }
    }
    
    /**
     * Inicializa todas as correções
     */
    function init() {
        log("Inicializando correções para problemas de UI do Ansible");
        
        // Correção 1: Problema dos seletores
        attemptFixSelectors();
        
        // Correção 2: Problema dos cards expandidos
        attemptFixCards();
        
        log("Inicialização das correções concluída");
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Se já estiver carregado, inicializar imediatamente
        init();
    }
})();