/**
 * ansible-fix-selection.js
 * Corrige problemas de detecção de hosts selecionados e execução de playbooks
 */

(function() {
    console.log("Inicializando correção para problema de seleção de hosts");

    // Função que corrige a detecção de hosts selecionados
    function fixHostSelection() {
        // Sobrescrever a função para obter hosts selecionados
        window.getSelectedHosts = function() {
            const hosts = [];
            document.querySelectorAll('.host-banner.valid.selected, .host-banner.selected').forEach(hostBanner => {
                const checkbox = hostBanner.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.dataset.hostname) {
                    hosts.push(checkbox.dataset.hostname);
                } else {
                    // Tenta obter o hostname de outras formas
                    const header = hostBanner.querySelector('h4');
                    if (header) {
                        hosts.push(header.textContent.trim());
                    }
                }
            });
            console.log("Hosts selecionados:", hosts);
            return hosts;
        };

        // Corrigir a execução de playbooks para usar a função atualizada
        const originalExecute = window.executeSelectedPlaybooks;
        window.executeSelectedPlaybooks = function() {
            // Obter diretamente do DOM em vez de usar as variáveis globais
            const selectedHosts = window.getSelectedHosts();
            const selectedPlaybooks = [];
            
            document.querySelectorAll('.playbook-item.selected').forEach(item => {
                const name = item.getAttribute('data-playbook-name');
                if (name) {
                    selectedPlaybooks.push({
                        name: name,
                        element: item
                    });
                }
            });
            
            console.log("Verificando seleção:", selectedPlaybooks.length, "playbooks,", selectedHosts.length, "hosts");
            
            if (selectedHosts.length === 0) {
                alert("Por favor, selecione pelo menos um host para executar a playbook.");
                return;
            }
            
            if (selectedPlaybooks.length === 0) {
                alert("Por favor, selecione pelo menos uma playbook para executar.");
                return;
            }
            
            // Continuar com a execução
            if (originalExecute) {
                originalExecute();
            }
        };
        
        // Corrigir função updateExecuteButton se existir
        if (typeof window.updateExecuteButton === 'function') {
            const originalUpdateButton = window.updateExecuteButton;
            window.updateExecuteButton = function() {
                // Verificar as seleções diretamente
                const hostsSelected = document.querySelectorAll('.host-banner.valid.selected, .host-banner.selected').length > 0;
                const playbooksSelected = document.querySelectorAll('.playbook-item.selected').length > 0;
                
                const executeButton = document.getElementById('execute-selected');
                if (executeButton) {
                    executeButton.disabled = !(hostsSelected && playbooksSelected);
                }
                
                // Chamar a função original
                originalUpdateButton();
            };
        }
    }

    // Corrigir eventos de clique para garantir seleção correta
    function fixSelectionEvents() {
        // Corrigir eventos de clique nos hosts
        document.querySelectorAll('.host-banner').forEach(banner => {
            banner.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.classList.toggle('selected', checkbox.checked);
                        
                        // Atualizar botão de execução
                        if (typeof window.updateExecuteButton === 'function') {
                            window.updateExecuteButton();
                        }
                    }
                }
            });
        });
        
        // Corrigir eventos de clique nas playbooks
        document.querySelectorAll('.playbook-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.classList.toggle('selected', checkbox.checked);
                        
                        // Atualizar botão de execução
                        if (typeof window.updateExecuteButton === 'function') {
                            window.updateExecuteButton();
                        }
                    }
                }
            });
        });
    }

    // Inicializar as correções
    function initialize() {
        try {
            fixHostSelection();
            
            // Aguardar pelo carregamento completo dos elementos de DOM
            setTimeout(fixSelectionEvents, 1000);
            
            // Verificar periodicamente para elementos novos
            setInterval(fixSelectionEvents, 5000);
            
            console.log("Correção de seleção de hosts aplicada com sucesso!");
        } catch (error) {
            console.error("Erro ao aplicar correção:", error);
        }
    }
    
    // Inicializar quando o DOM estiver completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();