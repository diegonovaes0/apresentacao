/**
 * baseline-multihost-fix.js
 * Corrige a execução de playbooks de baseline com múltiplos hosts
 */

(function() {
    console.log("Inicializando correção para execução de baseline com múltiplos hosts");
    
    // Função para escapar caracteres especiais nos IDs
    function escapeSelector(str) {
        return str.replace(/[ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
    }
    
    // Desabilitar script de integração problemático
    function disableProblemScripts() {
        // Remover função problemática que está causando erro
        if (window.BaselineIntegration) {
            console.log("Desativando integração de baseline que está causando erros");
            // Substituir a função problemática
            window.BaselineIntegration.injectLog = function() {
                console.log("Função injectLog desativada");
                return null;
            };
        }
    }
    
    // Corrigir a função de detecção de hosts selecionados
    function fixHostSelection() {
        if (typeof window.getSelectedHosts === 'function') {
            const originalGetHosts = window.getSelectedHosts;
            
            window.getSelectedHosts = function() {
                // Buscar diretamente do DOM
                const hosts = [];
                document.querySelectorAll('.host-banner.valid.selected, .host-banner.selected').forEach(hostBanner => {
                    const checkbox = hostBanner.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.dataset.hostname) {
                        hosts.push(checkbox.dataset.hostname);
                    }
                });
                
                // Se não encontrou nada, usar a função original
                if (hosts.length === 0) {
                    return originalGetHosts();
                }
                
                console.log("Hosts selecionados:", hosts);
                return hosts;
            };
            
            console.log("Função getSelectedHosts corrigida");
        }
    }
    
    // Corrigir a execução de playbooks de baseline
    function fixBaselineExecution() {
        if (typeof window.executeSelectedPlaybooks === 'function') {
            const originalExecute = window.executeSelectedPlaybooks;
            
            window.executeSelectedPlaybooks = function() {
                // Obter hosts selecionados
                const hosts = window.getSelectedHosts ? window.getSelectedHosts() : [];
                
                // Se não houver hosts selecionados, informar o usuário
                if (hosts.length === 0) {
                    alert("Por favor, selecione pelo menos um host.");
                    return;
                }
                
                // Criar função fetch original temporária
                const originalFetch = window.fetch;
                
                // Restaurar o comportamento normal do fetch para playbooks de baseline
                window.fetch = function(url, options) {
                    return originalFetch.apply(this, arguments);
                };
                
                // Chamar a função original
                try {
                    originalExecute();
                } catch (error) {
                    console.error("Erro ao executar playbooks:", error);
                    // Se der erro, tentar uma abordagem alternativa
                    if (typeof window.executeSelectedPlaybooksOriginal === 'function') {
                        window.executeSelectedPlaybooksOriginal();
                    }
                }
                
                // Restaurar fetch original após um momento
                setTimeout(() => {
                    window.fetch = originalFetch;
                }, 500);
            };
            
            console.log("Função executeSelectedPlaybooks corrigida");
        }
    }
    
    // Corrigir a barra de progresso para baseline
    function fixProgressBar() {
        if (typeof window.monitorPlaybookExecution === 'function') {
            const originalMonitor = window.monitorPlaybookExecution;
            
            window.monitorPlaybookExecution = function(jobId, card) {
                // Verificar se o card já tem uma barra de progresso
                const progressBar = card.querySelector('.progress-bar');
                if (!progressBar) {
                    // Criar uma barra de progresso se não existir
                    const progressContainer = document.createElement('div');
                    progressContainer.className = 'progress-container';
                    progressContainer.style.cssText = `
                        width: 100%;
                        height: 4px;
                        background-color: #2A2A2A;
                        border-radius: 2px;
                        overflow: hidden;
                        margin: 10px 0;
                    `;
                    
                    const newProgressBar = document.createElement('div');
                    newProgressBar.className = 'progress-bar';
                    newProgressBar.style.cssText = `
                        height: 100%;
                        background-color: #FFD600;
                        border-radius: 2px;
                        width: 0%;
                        transition: width 0.3s ease, background-color 0.3s ease;
                    `;
                    
                    progressContainer.appendChild(newProgressBar);
                    
                    // Adicionar ao card
                    const hostInfo = card.querySelector('.host-info');
                    if (hostInfo) {
                        card.insertBefore(progressContainer, hostInfo.nextSibling);
                    } else {
                        card.appendChild(progressContainer);
                    }
                }
                
                // Chamar o monitor original
                return originalMonitor(jobId, card);
            };
            
            console.log("Função monitorPlaybookExecution corrigida para barras de progresso");
        }
    }
    
    // Inicializar as correções
    function initialize() {
        try {
            // Aplicar correções
            disableProblemScripts();
            fixHostSelection();
            fixBaselineExecution();
            fixProgressBar();
            
            console.log("Correções aplicadas com sucesso!");
        } catch (error) {
            console.error("Erro ao aplicar correções:", error);
        }
    }
    
    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();