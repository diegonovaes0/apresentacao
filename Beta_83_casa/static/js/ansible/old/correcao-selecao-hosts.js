/**
 * selecao-hosts-fix.js
 * Correção definitiva para problemas de seleção de hosts no Ansible UI
 * 
 * Este módulo resolve:
 * 1. Problema com checkbox não selecionável
 * 2. Problema de visualização da seleção
 * 3. Problema com execução imediata sem atualizar a página
 * 4. Problema com mensagens indesejadas
 */

(function() {
    console.log("Aplicando correção definitiva para problemas de seleção de hosts...");
    
    // Prevenir múltiplas inicializações
    if (window.hostSelectionFixFinalApplied) {
        console.log("Correção já aplicada. Ignorando.");
        return;
    }
    
    // Adicionar estilos para seleção visual clara
    function addSelectionStyles() {
        if (document.getElementById('host-selection-fix-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'host-selection-fix-styles';
        style.innerHTML = `
            /* Estilos para host selecionado */
            .host-banner.selected {
                border: 2px solid var(--accent-gold, #FFD600) !important;
                box-shadow: 0 0 8px rgba(255, 214, 0, 0.4) !important;
                position: relative;
            }
            
            /* Indicador visual claro de seleção */
            .host-banner.selected::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 214, 0, 0.05);
                pointer-events: none;
                z-index: 1;
            }
            
            /* Ícone de seleção */
            .host-banner.selected::after {
                content: "✓";
                position: absolute;
                top: -8px;
                right: -8px;
                background: var(--accent-gold, #FFD600);
                color: var(--black-absolute, #000000);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                z-index: 5;
            }
            
            /* Garantir que o checkbox seja visível e clicável */
            .host-banner input[type="checkbox"] {
                opacity: 1 !important;
                pointer-events: auto !important;
                margin-right: 5px !important;
            }
            
            /* Destaque para texto de seleção */
            .host-banner.selected label {
                color: var(--accent-gold, #FFD600) !important;
                font-weight: bold !important;
            }
            
            /* Efeito de hover mais claro */
            .host-banner:hover {
                border-color: rgba(255, 214, 0, 0.5) !important;
                transition: all 0.2s ease !important;
            }
        `;
        document.head.appendChild(style);
        console.log("Estilos de seleção injetados");
    }
    
    /**
     * Função principal para corrigir a seleção de hosts
     */
    function fixHostSelection() {
        // Sobrescrever a função executeSelectedPlaybooks
        const originalExecute = window.executeSelectedPlaybooks;
        if (!originalExecute) {
            console.error("A função executeSelectedPlaybooks não foi encontrada");
            return;
        }
        
        window.executeSelectedPlaybooks = function() {
            console.log("Execute interceptado: verificando seleção de hosts");
            
            // Verificar e atualizar a seleção global antes de prosseguir
            const hosts = updateGlobalSelectedHosts();
            
            if (hosts.size === 0) {
                // Forçar última verificação manual antes de desistir
                const manuallySelectedHosts = identifySelectedHostsFromDOM();
                if (manuallySelectedHosts.length > 0) {
                    console.log(`Encontrados ${manuallySelectedHosts.length} hosts selecionados manualmente`);
                    window.selectedHosts = new Set(manuallySelectedHosts);
                    syncSelectionState(); // Sincronizar estado visual
                    return originalExecute();
                }
                
                console.log("Sem hosts selecionados");
                showMessage("Selecione pelo menos um host para executar", "warning");
                return;
            }
            
            console.log(`Hosts selecionados: ${Array.from(hosts).join(', ')}`);
            return originalExecute();
        };
    }
    
    /**
     * Identifica hosts selecionados no DOM
     * @returns {Array} Lista de hostnames selecionados
     */
    function identifySelectedHostsFromDOM() {
        const selectedHosts = [];
        
        // Método 1: Verificar elementos com classe .selected
        document.querySelectorAll('.host-banner.selected').forEach(host => {
            const checkbox = host.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.dataset.hostname) {
                selectedHosts.push(checkbox.dataset.hostname);
            } else {
                const hostname = getHostnameFromElement(host);
                if (hostname) selectedHosts.push(hostname);
            }
        });
        
        // Método 2: Verificar checkboxes marcados
        document.querySelectorAll('.host-banner input[type="checkbox"]:checked').forEach(checkbox => {
            if (checkbox.dataset.hostname && !selectedHosts.includes(checkbox.dataset.hostname)) {
                selectedHosts.push(checkbox.dataset.hostname);
            }
        });
        
        return [...new Set(selectedHosts)]; // Remover duplicatas
    }
    
    /**
     * Obter hostname de um elemento
     */
    function getHostnameFromElement(element) {
        // Tentar obter do checkbox
        const checkbox = element.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.dataset.hostname) {
            return checkbox.dataset.hostname;
        }
        
        // Tentar obter do cabeçalho
        const header = element.querySelector('h4');
        if (header) {
            return header.textContent.trim();
        }
        
        return null;
    }
    
    /**
     * Corrige eventos de clique nos hosts
     */
    function fixHostClickEvents() {
        // Remover e recriar todos os listeners de host
        document.querySelectorAll('.host-banner').forEach(host => {
            const newHost = host.cloneNode(true);
            host.parentNode.replaceChild(newHost, host);
            
            // Adicionar novo listener limpo
            newHost.addEventListener('click', function(e) {
                // Garantir que cliques em checkbox sejam tratados pela função normal do checkbox
                if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                    // Código especial para garantir que o checkbox funcione
                    const isChecked = e.target.checked;
                    const hostname = e.target.dataset.hostname;
                    
                    setTimeout(() => {
                        // Garantir que o estado do checkbox seja respeitado
                        e.target.checked = isChecked;
                        
                        // Atualizar a visualização
                        newHost.classList.toggle('selected', isChecked);
                        
                        // Atualizar seleção global
                        if (isChecked) {
                            window.selectedHosts.add(hostname);
                        } else {
                            window.selectedHosts.delete(hostname);
                        }
                        
                        console.log(`Checkbox ${hostname} alterado para: ${isChecked ? 'selecionado' : 'não selecionado'}`);
                        updateGlobalSelectedHosts();
                    }, 0);
                    
                    return; // Não continuar o processamento para evitar conflitos
                }
                
                // Se não for um clique no checkbox, mas for em outro elemento interno que não deve
                // ativar a seleção, ignorar o evento
                if (e.target.tagName === 'BUTTON' || 
                    e.target.closest('button') || 
                    e.target.classList.contains('baseline-trigger')) {
                    return;
                }
                
                // Para outros cliques no host, alternar seleção
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.classList.toggle('selected', checkbox.checked);
                    
                    // Atualizar state global
                    const hostname = checkbox.dataset.hostname;
                    if (checkbox.checked) {
                        window.selectedHosts.add(hostname);
                    } else {
                        window.selectedHosts.delete(hostname);
                    }
                    
                    // Registrar no console para debug
                    console.log(`Host ${hostname} clicado, ${checkbox.checked ? 'selecionado' : 'desselecionado'}`);
                    updateGlobalSelectedHosts();
                }
            });
            
            // Adicionar listener específico para checkbox
            const checkbox = newHost.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', function(e) {
                    e.stopPropagation(); // Impedir propagação para evitar problema de evento duplo
                    
                    // Atualizar classe visual
                    newHost.classList.toggle('selected', this.checked);
                    
                    // Atualizar state global
                    const hostname = this.dataset.hostname;
                    if (this.checked) {
                        window.selectedHosts.add(hostname);
                    } else {
                        window.selectedHosts.delete(hostname);
                    }
                    
                    console.log(`Checkbox ${hostname} alterado: ${this.checked ? 'selecionado' : 'desselecionado'}`);
                    updateGlobalSelectedHosts();
                });
            }
        });
    }
    
    /**
     * Sobrescreve a função toggleHostSelection para garantir visualização correta
     */
    function fixToggleHostSelection() {
        const originalToggle = window.toggleHostSelection;
        if (!originalToggle) return;
        
        window.toggleHostSelection = function(banner, hostname) {
            // Chamar implementação original
            originalToggle(banner, hostname);
            
            // Garantir que a visualização esteja correta
            const checkbox = banner.querySelector(`input[data-hostname="${hostname}"]`);
            if (checkbox) {
                banner.classList.toggle('selected', checkbox.checked);
                
                // Garantir que a seleção global esteja atualizada
                if (checkbox.checked) {
                    window.selectedHosts.add(hostname);
                } else {
                    window.selectedHosts.delete(hostname);
                }
                
                updateGlobalSelectedHosts();
            }
        };
    }
    
    /**
     * Sincroniza o estado visual da seleção com o estado global
     */
    function syncSelectionState() {
        if (!window.selectedHosts) return;
        
        // Primeiramente, limpar todas as seleções visuais
        document.querySelectorAll('.host-banner').forEach(host => {
            const checkbox = host.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            
            const hostname = checkbox.dataset.hostname;
            const isSelected = window.selectedHosts.has(hostname);
            
            // Atualizar o estado do checkbox
            checkbox.checked = isSelected;
            
            // Atualizar a classe
            host.classList.toggle('selected', isSelected);
        });
        
        console.log(`Sincronizados ${window.selectedHosts.size} hosts com estado visual`);
    }
    
    /**
     * Atualiza a variável global selectedHosts com base nas seleções visuais
     */
    function updateGlobalSelectedHosts() {
        if (!window.selectedHosts) {
            window.selectedHosts = new Set();
        }
        
        // Combinar os hosts selecionados visualmente e os que já estão na variável global
        const visuallySelectedHosts = identifySelectedHostsFromDOM();
        
        // Opção 1: usar apenas o DOM (mais seguro)
        window.selectedHosts = new Set(visuallySelectedHosts);
        
        // Atualizar o botão de execução, se necessário
        if (typeof window.updateExecuteButton === 'function') {
            window.updateExecuteButton();
        }
        
        console.log(`selectedHosts atualizado: ${window.selectedHosts.size} hosts selecionados`);
        return window.selectedHosts;
    }
    
    /**
     * Corrige problemas de exibição de mensagens
     */
    function fixMessageDisplay() {
        if (typeof window.originalShowMessage !== 'function') {
            window.originalShowMessage = window.showMessage;
        }
        
        window.showMessage = function(text, type, duration) {
            // Se for mensagem de nenhum host selecionado, mas temos hosts selecionados, suprimir
            if (text === "Selecione pelo menos um host para executar" && window.selectedHosts && window.selectedHosts.size > 0) {
                console.log("Mensagem suprimida: há hosts selecionados");
                return;
            }
            
            // Se não for suprimida, mostrar normalmente
            window.originalShowMessage(text, type, duration);
        };
    }
    
    /**
     * Adiciona observer para manter consistência da seleção quando o DOM mudar
     */
    function setupConsistencyObserver() {
        // Observar mudanças que afetam a seleção de hosts
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            let needsRecheck = false;
            
            mutations.forEach(mutation => {
                // Verificar adição de novos nós
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1) { // É um elemento
                            if (node.classList && node.classList.contains('host-banner')) {
                                needsUpdate = true;
                                break;
                            } else if (node.querySelectorAll) {
                                if (node.querySelectorAll('.host-banner').length > 0) {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Verificar alterações de atributos que podem afetar a seleção
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'checked')) {
                    const target = mutation.target;
                    if ((target.classList && (target.classList.contains('host-banner') || target.classList.contains('selected'))) ||
                        (target.type === 'checkbox' && target.closest('.host-banner'))) {
                        needsRecheck = true;
                    }
                }
            });
            
            // Se detectamos mudanças importantes, reconstruir event listeners
            if (needsUpdate) {
                console.log("Mudanças no DOM detectadas, atualizando listeners");
                setTimeout(() => {
                    fixHostClickEvents();
                    syncSelectionState();
                }, 100);
            }
            
            // Se apenas mudanças de estado, atualizar seleção global
            if (needsRecheck && !needsUpdate) {
                setTimeout(updateGlobalSelectedHosts, 50);
            }
        });
        
        // Observar todo o documento para alterações na estrutura e atributos
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'checked']
        });
        
        console.log("Observer para consistência de seleção configurado");
    }
    
    /**
     * Inicializa e aplica todas as correções
     */
    function init() {
        try {
            console.log("Iniciando correção definitiva para seleção de hosts");
            
            // 1. Adicionar estilos para melhorar visualização
            addSelectionStyles();
            
            // 2. Garantir que a variável global existe
            if (!window.selectedHosts) {
                window.selectedHosts = new Set();
            }
            
            // 3. Aplicar correções
            fixHostSelection();
            fixToggleHostSelection();
            fixHostClickEvents();
            fixMessageDisplay();
            
            // 4. Sincronizar estado inicial
            syncSelectionState();
            
            // 5. Configurar observer para manter tudo consistente
            setupConsistencyObserver();
            
            // 6. Flag para prevenir múltiplas inicializações
            window.hostSelectionFixFinalApplied = true;
            
            console.log("✅ Correção definitiva para seleção de hosts aplicada com sucesso");
            
            // 7. Forçar última atualização após atraso
            setTimeout(updateGlobalSelectedHosts, 1000);
        } catch (error) {
            console.error("❌ Erro ao aplicar correção para seleção de hosts:", error);
        }
    }
    
    // Iniciar após um pequeno delay para garantir que outros scripts carregaram
    setTimeout(init, 300);
})();