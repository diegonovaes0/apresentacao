/**
 * ansible-progress-interceptor.js
 * Intercepta alterações na barra de progresso para prevenir recuos,
 * mas permite que a barra complete normalmente e exiba os estados de sucesso/erro
 */

(function() {
    console.log("Iniciando interceptador seletivo da barra de progresso");
    
    // Variável para armazenar o valor máximo que a barra de progresso já atingiu
    let globalMaxProgress = 0;
    
    // Flag para indicar se estamos em fase de conclusão
    let isCompletingPhase = false;
    
    // Função para permitir a conclusão da barra
    function allowCompletion() {
        isCompletingPhase = true;
        console.log("Modo de conclusão ativado: permitindo alterações finais na barra de progresso");
    }
    
    // Função para interceptar alterações no style.width de qualquer elemento progress-bar
    function interceptProgressBarUpdates() {
        // Sobrescrever o método Element.prototype.setAttribute para interceptar mudanças de estilo
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            // Verifica se é um style sendo alterado em uma barra de progresso
            if (name === 'style' && 
                (this.classList.contains('progress-bar') || 
                (this.id && this.id.includes('progress')) ||
                (this.className && this.className.includes('progress')))
            ) {
                // Verifica se contém width
                if (value.includes('width:')) {
                    const widthMatch = value.match(/width:\s*(\d+(?:\.\d+)?%)/);
                    if (widthMatch) {
                        const newPercentage = parseFloat(widthMatch[1]);
                        
                        // Se estamos na fase de conclusão ou o novo valor é maior, permitir a mudança
                        if (isCompletingPhase || newPercentage >= globalMaxProgress) {
                            // Atualiza o valor máximo se necessário
                            if (newPercentage > globalMaxProgress) {
                                globalMaxProgress = newPercentage;
                                console.log(`Progresso atualizado para: ${globalMaxProgress}%`);
                            }
                            
                            // Se o valor é 100%, estamos completando
                            if (newPercentage >= 100) {
                                allowCompletion();
                            }
                        } else {
                            // Caso contrário, mantém o valor máximo
                            console.warn(`Bloqueando recuo: ${newPercentage}% → ${globalMaxProgress}%`);
                            const replacedValue = value.replace(
                                /width:\s*\d+(?:\.\d+)?%/, 
                                `width: ${globalMaxProgress}%`
                            );
                            return originalSetAttribute.call(this, name, replacedValue);
                        }
                    }
                }
            }
            
            // Comportamento normal para outros casos
            return originalSetAttribute.apply(this, arguments);
        };
        
        // Sobrescrever o método CSSStyleDeclaration.prototype.setProperty para capturar alterações de estilo
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        CSSStyleDeclaration.prototype.setProperty = function(propertyName, value, priority) {
            // Verifica se é uma alteração de width em uma barra de progresso
            if (propertyName === 'width' && this.parentElement && 
                (this.parentElement.classList.contains('progress-bar') ||
                (this.parentElement.id && this.parentElement.id.includes('progress')) ||
                (this.parentElement.className && this.parentElement.className.includes('progress')))
            ) {
                // Verifica se o valor é uma porcentagem
                if (typeof value === 'string' && value.endsWith('%')) {
                    const newPercentage = parseFloat(value);
                    
                    // Se estamos na fase de conclusão ou o novo valor é maior, permitir a mudança
                    if (isCompletingPhase || newPercentage >= globalMaxProgress) {
                        // Atualiza o valor máximo se necessário
                        if (newPercentage > globalMaxProgress) {
                            globalMaxProgress = newPercentage;
                            console.log(`Progresso atualizado para: ${globalMaxProgress}%`);
                        }
                        
                        // Se o valor é 100%, estamos completando
                        if (newPercentage >= 100) {
                            allowCompletion();
                        }
                    } else {
                        // Caso contrário, mantém o valor máximo
                        console.warn(`Bloqueando recuo da barra: ${newPercentage}% → ${globalMaxProgress}%`);
                        return originalSetProperty.call(this, propertyName, `${globalMaxProgress}%`, priority);
                    }
                }
            }
            
            // Monitorar alterações nas classes para identificar sucesso ou erro
            if (propertyName === 'className' && this.parentElement) {
                const newValue = String(value);
                if (newValue.includes('success') || newValue.includes('error') || 
                    newValue.includes('complete') || newValue.includes('fail')) {
                    allowCompletion();
                    console.log(`Detectada mudança para estado final: ${newValue}`);
                }
            }
            
            // Comportamento normal para outros casos
            return originalSetProperty.apply(this, arguments);
        };
        
        // Observar mudanças na classe dos elementos para detectar conclusão
        const classObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const newClass = mutation.target.className;
                    if (typeof newClass === 'string' && 
                        (newClass.includes('success') || newClass.includes('error') || 
                         newClass.includes('complete') || newClass.includes('fail'))) {
                        allowCompletion();
                        console.log(`Detectada mudança para estado final via classe: ${newClass}`);
                    }
                }
            });
        });
        
        // Iniciar observação de mudanças de classe
        classObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });
        
        console.log("Interceptador seletivo de barras de progresso ativado");
        
        // Monitorar fim de carregamento
        window.addEventListener('load', function() {
            setTimeout(function() {
                // Verificar se alguma operação de carregamento foi concluída
                const loadingElements = document.querySelectorAll(
                    '.loading-banner, .loading-indicator, [id*="loading"]'
                );
                
                if (loadingElements.length === 0) {
                    // Se não houver mais elementos de carregamento, permitir conclusão
                    allowCompletion();
                    console.log("Carregamento da página concluído, permitindo conclusão das barras");
                }
            }, 1000);
        });
        
        // Monitorar ações de clique que possam indicar mudança de estado
        document.addEventListener('click', function(e) {
            // Verificar se é um botão relacionado a ações de conclusão
            if (e.target && (
                e.target.classList.contains('ansible-button') || 
                e.target.id === 'execute-selected' ||
                e.target.id === 'refresh'
            )) {
                // Restaurar capacidade de progresso completo após cliques
                setTimeout(function() {
                    globalMaxProgress = 0;
                    isCompletingPhase = false;
                    console.log("Resetando controle de progresso após clique em botão de ação");
                }, 100);
            }
        });
    }
    
    // Adicionar um estilo para suavizar as transições
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .progress-bar, [id*="progress"], [class*="progress"] {
            transition: width 0.3s ease-out !important;
        }
        
        /* Estilos para garantir visibilidade dos estados finais */
        .loading-banner.success .progress-bar, 
        .success .progress-bar, 
        .progress-bar.success {
            background-color: var(--success-green, #4CAF50) !important;
            width: 100% !important;
        }
        
        .loading-banner.error .progress-bar, 
        .error .progress-bar, 
        .progress-bar.error {
            background-color: var(--error-red, #F44336) !important;
            width: 100% !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Detectar e resetar para novos carregamentos
    function setupResetTriggers() {
        // Lista de seletores que, quando clicados, devem resetar o controle de progresso
        const resetTriggers = [
            '#refresh', '.refresh-button', '#execute-selected',
            '[onclick*="refresh"]', '[onclick*="reload"]',
            '.host-banner', '.playbook-item'
        ];
        
        document.addEventListener('click', function(e) {
            // Verificar se o clique foi em um dos gatilhos de reset
            for (const selector of resetTriggers) {
                if (e.target.matches(selector) || e.target.closest(selector)) {
                    setTimeout(function() {
                        globalMaxProgress = 0;
                        isCompletingPhase = false;
                        console.log("Controle de progresso resetado após clique em elemento de ação");
                    }, 100);
                    break;
                }
            }
        });
        
        // Verificar mudanças na URL
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                globalMaxProgress = 0;
                isCompletingPhase = false;
                console.log("Controle de progresso resetado após mudança de URL");
            }
        }).observe(document, {subtree: true, childList: true});
    }
    
    // Iniciar interceptação e configurar gatilhos de reset
    interceptProgressBarUpdates();
    setupResetTriggers();
    
    console.log("Interceptador da barra de progresso com suporte a estados finais instalado com sucesso");
})();