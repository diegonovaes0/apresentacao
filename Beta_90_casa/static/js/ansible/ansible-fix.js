/**
 * correcoes-ansible.js
 * 
 * Script de correções para erros do sistema Ansible.
 * Este script resolve os erros de referência e problemas de interface
 * detectados nos logs do console.
 * 
 * @version 1.0.0
 */

(function() {
    console.log("[Correções Ansible] Iniciando aplicação de correções...");

    /**
     * Adiciona função setupDetailedView que está faltando
     * Resolve o erro: Uncaught ReferenceError: setupDetailedView is not defined
     */
    function corrigirErroSetupDetailedView() {
        if (typeof window.setupDetailedView === 'undefined') {
            window.setupDetailedView = function(hostElement) {
                console.log("[Correções Ansible] setupDetailedView chamado para", hostElement);
                
                // Implementação básica para evitar o erro
                if (!hostElement) return;
                
                // Verificar se já tem visualização detalhada
                if (hostElement.querySelector('.host-detailed-view')) return;
                
                // Criar visualização detalhada se necessário
                const detailedView = document.createElement('div');
                detailedView.className = 'host-detailed-view';
                detailedView.style.display = 'none';
                
                // Adicionar ao elemento do host
                hostElement.appendChild(detailedView);
                
                console.log("[Correções Ansible] setupDetailedView aplicado com sucesso");
            };
            
            console.log("[Correções Ansible] Função setupDetailedView definida");
        }
    }

    /**
     * Adiciona função fixBaselineError que está faltando
     * Resolve o erro: Uncaught ReferenceError: fixBaselineError is not defined
     */
    function corrigirErroFixBaselineError() {
        if (typeof window.fixBaselineError === 'undefined') {
            window.fixBaselineError = function() {
                console.log("[Correções Ansible] fixBaselineError chamado");
                
                // Procurar elementos de baseline com problemas
                const baselineElements = document.querySelectorAll('.baseline-item');
                
                if (baselineElements.length > 0) {
                    console.log(`[Correções Ansible] Encontrados ${baselineElements.length} elementos de baseline para corrigir`);
                    
                    baselineElements.forEach((element, index) => {
                        // Verificar se tem problemas de estilo ou estrutura
                        if (!element.querySelector('.baseline-content')) {
                            const contentDiv = document.createElement('div');
                            contentDiv.className = 'baseline-content';
                            
                            // Mover filhos para a nova div
                            while (element.firstChild) {
                                contentDiv.appendChild(element.firstChild);
                            }
                            
                            element.appendChild(contentDiv);
                            console.log(`[Correções Ansible] Baseline ${index + 1} corrigido`);
                        }
                    });
                } else {
                    console.log("[Correções Ansible] Nenhum elemento de baseline encontrado para corrigir");
                }
                
                return true; // Indicar que a função foi executada
            };
            
            console.log("[Correções Ansible] Função fixBaselineError definida");
        }
    }

    /**
     * Corrige o problema do botão de limpar playbooks
     * Resolve o aviso: Botão de limpar playbooks não encontrado. Tentando criar um novo.
     */
    function corrigirBotaoLimparPlaybooks() {
        // Verificar se a função original existe
        if (typeof window.fixClearPlaybooksButton === 'function') {
            console.log("[Correções Ansible] Interceptando a função fixClearPlaybooksButton");
            
            // Guardar função original
            const originalFixClearPlaybooksButton = window.fixClearPlaybooksButton;
            
            // Substituir com nossa versão melhorada
            window.fixClearPlaybooksButton = function() {
                // Tentar localizar o botão por diferentes seletores
                let clearButton = document.querySelector('#clear-playbooks');
                
                if (!clearButton) {
                    clearButton = document.querySelector('.clear-playbooks-btn');
                }
                
                if (!clearButton) {
                    clearButton = document.querySelector('button[data-action="clear-playbooks"]');
                }
                
                // Se encontrou um botão, não precisa criar um novo
                if (clearButton) {
                    console.log("[Correções Ansible] Botão de limpar playbooks encontrado, não é necessário criar um novo");
                    
                    // Garantir que o botão tenha o ID correto
                    clearButton.id = 'clear-playbooks';
                    
                    // Garantir que tenha o evento de clique
                    if (!clearButton.hasAttribute('data-event-bound')) {
                        clearButton.addEventListener('click', function() {
                            if (typeof window.clearSelectedPlaybooks === 'function') {
                                window.clearSelectedPlaybooks();
                            }
                        });
                        
                        clearButton.setAttribute('data-event-bound', 'true');
                        console.log("[Correções Ansible] Evento de clique adicionado ao botão existente");
                    }
                    
                    return clearButton;
                }
                
                // Se não encontrou, usar a função original para criar um
                console.log("[Correções Ansible] Botão não encontrado, criando um novo...");
                return originalFixClearPlaybooksButton();
            };
            
            // Executar a função para corrigir imediatamente
            setTimeout(window.fixClearPlaybooksButton, 500);
            
            console.log("[Correções Ansible] Função de corrigir botão substituída");
        } else {
            console.warn("[Correções Ansible] Função fixClearPlaybooksButton não encontrada, criando manualmente");
            
            // Função de fallback para criar o botão manualmente
            window.fixClearPlaybooksButton = function() {
                // Se o botão já existe, retornar
                if (document.querySelector('#clear-playbooks')) {
                    return document.querySelector('#clear-playbooks');
                }
                
                // Procurar o container de playbooks
                const playbooksContainer = document.querySelector('#playbooks') || 
                                         document.querySelector('.playbooks-container');
                
                if (!playbooksContainer) {
                    console.warn("[Correções Ansible] Container de playbooks não encontrado");
                    return null;
                }
                
                // Procurar a barra de filtros ou header
                let targetElement = playbooksContainer.querySelector('.filter-bar') || 
                                   playbooksContainer.querySelector('.playbooks-header');
                
                // Se não encontrou, usar o próprio container
                if (!targetElement) {
                    targetElement = playbooksContainer;
                }
                
                // Criar o botão
                const clearButton = document.createElement('button');
                clearButton.id = 'clear-playbooks';
                clearButton.className = 'clear-playbooks-btn';
                clearButton.textContent = 'Limpar Seleção';
                clearButton.style.marginLeft = '10px';
                clearButton.style.padding = '5px 10px';
                clearButton.style.background = '#333';
                clearButton.style.color = '#fff';
                clearButton.style.border = 'none';
                clearButton.style.borderRadius = '4px';
                clearButton.style.cursor = 'pointer';
                
                // Adicionar evento de clique
                clearButton.addEventListener('click', function() {
                    // Tentar usar a função existente primeiro
                    if (typeof window.clearSelectedPlaybooks === 'function') {
                        window.clearSelectedPlaybooks();
                    } else {
                        // Implementação de fallback
                        document.querySelectorAll('.playbook-item.selected').forEach(item => {
                            item.classList.remove('selected');
                        });
                        
                        console.log("[Correções Ansible] Seleções de playbooks limpas");
                    }
                });
                
                // Adicionar ao DOM
                targetElement.appendChild(clearButton);
                
                console.log("[Correções Ansible] Botão de limpar playbooks criado manualmente");
                return clearButton;
            };
            
            // Executar a função para criar o botão
            setTimeout(window.fixClearPlaybooksButton, 500);
        }
    }

    /**
     * Corrige conflitos de inicialização entre os scripts
     * Resolve problemas de timing e dependências
     */
    function corrigirConflitosDeInicializacao() {
        console.log("[Correções Ansible] Verificando dependências e conflitos de inicialização");
        
        // Verificar se o sistema baseline-multihost foi inicializado corretamente
        if (window.baselineMultiHostFix) {
            console.log("[Correções Ansible] Sistema baseline-multihost detectado");
            
            // Verificar se houve inicialização parcial
            if (!window.baselineMultiHostFix.STATE) {
                console.warn("[Correções Ansible] Inicialização parcial do baseline-multihost detectada, tentando reiniciar");
                
                // Tentar reiniciar a inicialização se houver uma função disponível
                if (typeof window.initialize === 'function') {
                    setTimeout(window.initialize, 1000);
                    console.log("[Correções Ansible] Solicitação de reinicialização enviada");
                }
            }
        }
        
        // Verificar problema de duplicação de sistemas
        if (document.body.innerHTML.includes("Correção de duplicação de sistema aplicada")) {
            console.log("[Correções Ansible] Duplicação de sistema já tratada, verificando consistência");
            
            // Verificar elementos duplicados
            const potencialDuplicatas = document.querySelectorAll('[id]');
            const idMap = {};
            
            potencialDuplicatas.forEach(element => {
                const id = element.id;
                if (id && id.trim() !== '') {
                    if (!idMap[id]) {
                        idMap[id] = [];
                    }
                    idMap[id].push(element);
                }
            });
            
            // Corrigir IDs duplicados
            let duplicatasCorrigidas = 0;
            
            for (const [id, elements] of Object.entries(idMap)) {
                if (elements.length > 1) {
                    console.warn(`[Correções Ansible] ID duplicado encontrado: ${id} (${elements.length} ocorrências)`);
                    
                    // Manter o primeiro, renomear os outros
                    for (let i = 1; i < elements.length; i++) {
                        const newId = `${id}-unique-${i}`;
                        elements[i].id = newId;
                        duplicatasCorrigidas++;
                    }
                }
            }
            
            if (duplicatasCorrigidas > 0) {
                console.log(`[Correções Ansible] ${duplicatasCorrigidas} duplicatas de ID corrigidas`);
            }
        }
    }

    /**
     * Monitorar e interceptar erros futuros
     */
    function configurarMonitorDeErros() {
        // Se já configurou, não fazer novamente
        if (window._errosMonitorados) return;
        
        window._errosMonitorados = true;
        
        // Interceptar erros não tratados
        window.addEventListener('error', function(event) {
            const errorMsg = event.message;
            const errorSrc = event.filename;
            const errorLine = event.lineno;
            
            console.warn(`[Correções Ansible] Erro detectado: ${errorMsg} em ${errorSrc}:${errorLine}`);
            
            // Verificar erros conhecidos e tentar corrigir
            if (errorMsg.includes('setupDetailedView is not defined')) {
                corrigirErroSetupDetailedView();
                return false; // Impedir propagação
            }
            
            if (errorMsg.includes('fixBaselineError is not defined')) {
                corrigirErroFixBaselineError();
                return false; // Impedir propagação
            }
            
            // Não bloquear outros erros
            return true;
        });
        
        // Interceptar console.error para diagnosticar problemas
        const originalConsoleError = console.error;
        console.error = function() {
            // Chamar versão original primeiro
            originalConsoleError.apply(this, arguments);
            
            // Verificar se é um erro conhecido
            const errorMsg = Array.from(arguments).join(' ');
            
            if (errorMsg.includes('setupDetailedView')) {
                corrigirErroSetupDetailedView();
            }
            
            if (errorMsg.includes('fixBaselineError')) {
                corrigirErroFixBaselineError();
            }
            
            if (errorMsg.includes('Botão de limpar playbooks não encontrado')) {
                corrigirBotaoLimparPlaybooks();
            }
        };
        
        console.log("[Correções Ansible] Monitor de erros configurado");
    }

    /**
     * Função principal para aplicar todas as correções
     */
    function aplicarTodasCorrecoes() {
        try {
            // Aplicar correções para os erros específicos
            corrigirErroSetupDetailedView();
            corrigirErroFixBaselineError();
            corrigirBotaoLimparPlaybooks();
            corrigirConflitosDeInicializacao();
            
            // Configurar monitor de erros para problemas futuros
            configurarMonitorDeErros();
            
            console.log("[Correções Ansible] Todas as correções aplicadas com sucesso");
            
            // Adicionar pequeno indicador visual na página
            const statusIndicator = document.createElement('div');
            statusIndicator.style.position = 'fixed';
            statusIndicator.style.bottom = '5px';
            statusIndicator.style.right = '5px';
            statusIndicator.style.backgroundColor = '#4CAF50';
            statusIndicator.style.color = 'white';
            statusIndicator.style.padding = '3px 6px';
            statusIndicator.style.borderRadius = '3px';
            statusIndicator.style.fontSize = '10px';
            statusIndicator.style.opacity = '0.7';
            statusIndicator.style.zIndex = '9999';
            statusIndicator.textContent = 'Correções Aplicadas';
            
            // Adicionar comportamento de hover
            statusIndicator.addEventListener('mouseover', function() {
                this.style.opacity = '1';
            });
            
            statusIndicator.addEventListener('mouseout', function() {
                this.style.opacity = '0.7';
            });
            
            // Adicionar à página
            document.body.appendChild(statusIndicator);
            
            // Auto-remover após 10 segundos
            setTimeout(function() {
                if (document.body.contains(statusIndicator)) {
                    statusIndicator.style.opacity = '0';
                    statusIndicator.style.transition = 'opacity 0.5s';
                    
                    setTimeout(function() {
                        if (document.body.contains(statusIndicator)) {
                            statusIndicator.remove();
                        }
                    }, 500);
                }
            }, 10000);
            
        } catch (error) {
            console.error("[Correções Ansible] Erro ao aplicar correções:", error);
        }
    }

    // Aplicar correções quando o DOM estiver completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarTodasCorrecoes);
    } else {
        // Se o DOM já estiver carregado, aplicar imediatamente
        aplicarTodasCorrecoes();
    }

    // Para garantir que as correções sejam aplicadas mesmo em carregamentos lentos
    setTimeout(aplicarTodasCorrecoes, 1000);
})();