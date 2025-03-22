/**
 * ansible-duplicte-fix.js
 * Corrige o problema de duplicação durante a execução de playbooks.
 * 
 * Este arquivo contém:
 * - Sistema de rastreamento para evitar execução duplicada de playbooks
 * - Interceptação da criação de cards para evitar duplicação visual
 * - Limpeza de saídas duplicadas do Ansible dentro dos cards
 * - Integração com o botão de limpar playbooks
 * - Sistema de timeout para prevenir playbooks travadas no rastreador
 */

(function() {
    console.log("Inicializando correção para duplicação de cards de playbooks...");
    
    // Prevenir múltiplas inicializações
    if (window.duplicatePlaybookFixApplied) {
        console.log("Correção já aplicada. Ignorando.");
        return;
    }
    
    // Controle de execuções de playbooks para evitar duplicações
    const executionTracker = {
        // Armazena os IDs das playbooks em execução para evitar duplicação
        runningPlaybooks: new Set(),
        
        // Verificar se uma playbook já está em execução
        isRunning: function(playbookId) {
            return this.runningPlaybooks.has(playbookId);
        },
        
        // Adicionar uma playbook à lista de execução
        startTracking: function(playbookId) {
            this.runningPlaybooks.add(playbookId);
            
            // Configurar timeout para limpar automaticamente caso a execução trave
            setTimeout(() => {
                this.stopTracking(playbookId);
            }, 30000); // 30 segundos de timeout
            
            return true;
        },
        
        // Remover uma playbook da lista de execução
        stopTracking: function(playbookId) {
            return this.runningPlaybooks.delete(playbookId);
        },
        
        // Limpar todos os rastreamentos
        clearAll: function() {
            this.runningPlaybooks.clear();
            return true;
        }
    };
    
    /**
     * Função para interceptar e corrigir a execução de playbooks
     */
    function fixPlaybookExecution() {
        // Verificar se a função original existe
        if (typeof window.originalExecutePlaybooks !== 'function' && typeof window.executeSelectedPlaybooks === 'function') {
            // Salvar a referência para a função original
            window.originalExecutePlaybooks = window.executeSelectedPlaybooks;
            
            // Sobrescrever a função de execução
            window.executeSelectedPlaybooks = function() {
                console.log("Chamada para execução de playbooks interceptada para prevenir duplicação");
                
                // Verificar playbooks selecionadas e prevenir duplicação
                const selectedPlaybooks = Array.from(document.querySelectorAll('.playbook-item.selected'));
                if (selectedPlaybooks.length === 0) {
                    showMessage("Nenhuma playbook selecionada para execução.", "warning");
                    return;
                }
                
                // Verificar hosts selecionados
                const selectedHosts = Array.from(document.querySelectorAll('.host-item.selected'));
                if (selectedHosts.length === 0) {
                    showMessage("Nenhum host selecionado para execução.", "warning");
                    return;
                }
                
                // Prevenir duplicação para cada playbook
                let hasSkippedPlaybooks = false;
                const playbooksToRun = [];
                
                selectedPlaybooks.forEach(playbook => {
                    const playbookName = playbook.getAttribute('data-playbook-name');
                    const playbookId = generatePlaybookId(playbookName, selectedHosts);
                    
                    if (executionTracker.isRunning(playbookId)) {
                        hasSkippedPlaybooks = true;
                        console.log(`Playbook "${playbookName}" já está em execução. Ignorando.`);
                    } else {
                        executionTracker.startTracking(playbookId);
                        playbooksToRun.push(playbook);
                    }
                });
                
                if (hasSkippedPlaybooks) {
                    showMessage("Algumas playbooks já estão em execução e foram ignoradas.", "info");
                }
                
                if (playbooksToRun.length === 0) {
                    showMessage("Todas as playbooks selecionadas já estão em execução.", "warning");
                    return;
                }
                
                // Interceptar a criação de cards de execução
                interceptExecutionCardCreation();
                
                // Chamar a função original
                window.originalExecutePlaybooks();
            };
            
            console.log("Função de execução de playbooks corrigida para prevenir duplicação");
        }
    }
    
    /**
     * Intercepta a criação de cards de execução para prevenir duplicação
     */
    function interceptExecutionCardCreation() {
        // Referência para a função original de criação de elementos
        const originalCreateElement = document.createElement;
        
        // Sobrescrever temporariamente a função de criação de elementos
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(document, tagName);
            
            // Interceptar apenas elementos div (possíveis cards de execução)
            if (tagName.toLowerCase() === 'div') {
                // Adicionar um callback quando o elemento é adicionado ao DOM
                const originalAppendChild = Element.prototype.appendChild;
                
                element.onAddedToDom = function(callback) {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                for (let i = 0; i < mutation.addedNodes.length; i++) {
                                    if (mutation.addedNodes[i] === this) {
                                        callback();
                                        observer.disconnect();
                                        break;
                                    }
                                }
                            }
                        });
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                };
                
                // Verificar e prevenir duplicação de cards de execução
                element.onAddedToDom(function() {
                    if (element.classList.contains('execution-card')) {
                        const playbookName = element.getAttribute('data-playbook-name');
                        if (playbookName) {
                            deduplicateOutputElements(element, playbookName);
                        }
                    }
                });
            }
            
            return element;
        };
        
        // Restaurar a função original após 5 segundos
        setTimeout(() => {
            document.createElement = originalCreateElement;
            console.log("Função createElement restaurada ao original");
        }, 5000);
    }
    
    /**
     * Remove saídas duplicadas dentro de um card de execução
     * @param {HTMLElement} card - O card de execução
     * @param {string} playbookName - Nome da playbook
     */
    function deduplicateOutputElements(card, playbookName) {
        // Aguardar um momento para que todos os elementos de saída sejam adicionados
        setTimeout(() => {
            // Encontrar todos os elementos de saída
            const outputElements = card.querySelectorAll('.ansible-output');
            
            if (outputElements.length <= 1) {
                return; // Não há duplicação para corrigir
            }
            
            console.log(`Encontradas ${outputElements.length} saídas duplicadas para "${playbookName}". Corrigindo...`);
            
            // Manter apenas o primeiro elemento de saída e remover os demais
            for (let i = 1; i < outputElements.length; i++) {
                outputElements[i].remove();
            }
            
            // Adicionar indicador de que foi corrigido
            const outputElement = outputElements[0];
            if (outputElement) {
                const infoElement = document.createElement('div');
                infoElement.className = 'output-fix-info';
                infoElement.style.cssText = 'font-size: 10px; color: #999; margin-top: 5px; text-align: right;';
                infoElement.textContent = 'Saída unificada';
                
                outputElement.appendChild(infoElement);
            }
        }, 1000);
    }
    
    /**
     * Gera um ID único para uma playbook com base no nome e hosts
     * @param {string} playbookName - Nome da playbook
     * @param {Array} hosts - Array de hosts selecionados
     * @return {string} ID único da execução
     */
    function generatePlaybookId(playbookName, hosts) {
        const hostIds = hosts.map(host => host.getAttribute('data-host-id') || host.textContent).join(',');
        return `${playbookName}:${hostIds}`;
    }
    
    /**
     * Sobrescreve a função clearRunningPlaybooks para limpar também o rastreador
     */
    function fixClearRunningPlaybooks() {
        // Verificar se a função existe
        if (typeof window.originalClearRunningPlaybooks !== 'function' && typeof window.clearRunningPlaybooks === 'function') {
            // Salvar a função original
            window.originalClearRunningPlaybooks = window.clearRunningPlaybooks;
            
            // Sobrescrever a função
            window.clearRunningPlaybooks = function() {
                // Limpar o rastreador de execuções
                executionTracker.clearAll();
                
                // Chamar a função original
                window.originalClearRunningPlaybooks();
                
                console.log("Rastreador de execuções de playbooks limpo");
            };
        } else {
            // Criar a função se não existir
            window.clearRunningPlaybooks = function() {
                // Limpar o rastreador de execuções
                executionTracker.clearAll();
                
                // Limpar o container de playbooks em execução
                const runningPlaybooks = document.getElementById('running-playbooks');
                if (runningPlaybooks) {
                    runningPlaybooks.innerHTML = '';
                }
                
                showMessage("Playbooks em execução foram limpos com sucesso!", "success");
            };
        }
    }
    
    /**
     * Função auxiliar para mostrar mensagens
     * @param {string} text - Texto da mensagem
     * @param {string} type - Tipo da mensagem ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duração em ms (0 para não fechar automaticamente)
     */
    function showMessage(text, type = 'info', duration = 3000) {
        // Verificar se a função global showMessage existe
        if (typeof window.showMessage === 'function') {
            window.showMessage(text, type, duration);
            return;
        }
        
        // Implementação própria se a função global não existir
        const container = document.getElementById('running-playbooks');
        if (!container) return;
        
        const colors = {
            'success': { bg: 'rgba(76, 175, 80, 0.1)', border: '#4CAF50', text: '#4CAF50' },
            'error': { bg: 'rgba(244, 67, 54, 0.1)', border: '#F44336', text: '#F44336' },
            'warning': { bg: 'rgba(255, 152, 0, 0.1)', border: '#FF9800', text: '#FF9800' },
            'info': { bg: 'rgba(33, 150, 243, 0.1)', border: '#2196F3', text: '#2196F3' }
        };
        
        const color = colors[type] || colors.info;
        
        const message = document.createElement('div');
        message.className = 'message-notification';
        message.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 6px;
            border-left: 4px solid ${color.border};
            background: ${color.bg};
            color: ${color.text};
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: fadeIn 0.3s ease;
        `;
        
        message.innerHTML = `
            <span>${text}</span>
            <button style="background: none; border: none; color: ${color.text}; cursor: pointer;">✕</button>
        `;
        
        message.querySelector('button').addEventListener('click', () => message.remove());
        container.insertBefore(message, container.firstChild);
        
        if (duration > 0) {
            setTimeout(() => {
                if (document.body.contains(message)) {
                    message.style.opacity = '0';
                    message.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => message.remove(), 300);
                }
            }, duration);
        }
    }
    
    /**
     * Inicializa a correção
     */
    function init() {
        try {
            // Aplicar correções
            fixPlaybookExecution();
            fixClearRunningPlaybooks();
            
            // Marcar como aplicado
            window.duplicatePlaybookFixApplied = true;
            
            console.log("✅ Correção para duplicação de cards de playbooks aplicada com sucesso");
        } catch (error) {
            console.error("❌ Erro ao aplicar correção:", error);
        }
    }
    
    // Verificar se o DOM já foi carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();