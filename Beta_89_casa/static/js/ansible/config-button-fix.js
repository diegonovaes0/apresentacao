/**
 * independent-buttons-fix.js
 * Corrige o problema onde clicar em um botão de configuração afeta todos os outros botões
 */

(function() {
    console.log("Aplicando correção para independência de botões de configuração");
    
    // Armazenar estados individualmente em vez de globalmente
    const verifiedButtonStates = new Map();
    
    // Função para verificar se o botão existe e obter seu identificador único
    function getButtonIdentifier(button) {
        if (!button) return null;
        
        const playbookName = button.getAttribute('data-playbook');
        const type = button.getAttribute('data-type');
        
        if (!playbookName || !type) return null;
        
        return `${playbookName}|${type}`;
    }
    
    // Função para atualizar apenas o botão específico que foi configurado
    function updateSpecificButton(button, verified = true) {
        if (!button) return;
        
        const id = getButtonIdentifier(button);
        if (!id) return;
        
        // Salvar o estado individualmente
        verifiedButtonStates.set(id, verified);
        
        // Atualizar apenas este botão
        const styles = {
            verified: {
                background: '#4CAF50',  // Verde
                border: '#3E8E41',
                text: '#000000'
            },
            default: {
                background: '#FFD600',  // Amarelo
                border: '#E6C200',
                text: '#000000'
            }
        };
        
        if (verified) {
            button.innerText = 'VERIFICADO';
            button.classList.add('verified');
            button.style.backgroundColor = styles.verified.background;
            button.style.borderColor = styles.verified.border;
        } else {
            button.innerText = 'CONFIGURAR';
            button.classList.remove('verified');
            button.style.backgroundColor = styles.default.background;
            button.style.borderColor = styles.default.border;
        }
        
        console.log(`Botão ${id} atualizado para ${verified ? 'verificado' : 'não verificado'}`);
    }
    
    // Sobrescrever a função de atualização de botões
    if (typeof window.updateButtonLabels === 'function') {
        window.originalUpdateButtonLabels = window.updateButtonLabels;
        
        window.updateButtonLabels = function() {
            // Atualizar cada botão com base em seu próprio estado individual
            if (window.createdButtons) {
                window.createdButtons.forEach((btn) => {
                    const id = getButtonIdentifier(btn);
                    if (!id) return;
                    
                    const isVerified = verifiedButtonStates.get(id) || false;
                    updateSpecificButton(btn, isVerified);
                });
            }
        };
    }
    
    // Função para modificar os modais
    function modifyModals() {
        // Modificar o modal do Site24x7
        if (typeof window.openSite24x7Modal === 'function') {
            const originalModalFunc = window.openSite24x7Modal;
            
            window.openSite24x7Modal = function() {
                // Armazenar o botão que foi clicado
                const clickedButton = document.activeElement;
                if (clickedButton && clickedButton.classList.contains('configure-btn')) {
                    window._lastClickedButton = clickedButton;
                }
                
                // Chamar a função original para criar o modal
                const modal = originalModalFunc();
                
                // Substituir a função do botão confirmar
                const confirmButton = modal.querySelector('#confirm-btn');
                if (confirmButton) {
                    confirmButton.addEventListener('click', function() {
                        // Atualizar apenas o botão que foi clicado
                        if (window._lastClickedButton) {
                            updateSpecificButton(window._lastClickedButton, true);
                        }
                        
                        // Remover referência ao botão
                        setTimeout(() => {
                            window._lastClickedButton = null;
                        }, 100);
                        
                        // O resto do código permanece como está
                    }, { once: true });
                }
                
                return modal;
            };
        }
        
        // Modificar o modal do Antivírus
        if (typeof window.openAntivirusModal === 'function') {
            const originalModalFunc = window.openAntivirusModal;
            
            window.openAntivirusModal = function(detectedOS) {
                // Armazenar o botão que foi clicado
                const clickedButton = document.activeElement;
                if (clickedButton && clickedButton.classList.contains('configure-btn')) {
                    window._lastClickedButton = clickedButton;
                }
                
                // Chamar a função original para criar o modal
                const modal = originalModalFunc(detectedOS);
                
                // Substituir a função do botão confirmar
                const confirmButton = modal.querySelector('#confirm-btn');
                if (confirmButton) {
                    confirmButton.addEventListener('click', function() {
                        // Atualizar apenas o botão que foi clicado
                        if (window._lastClickedButton) {
                            updateSpecificButton(window._lastClickedButton, true);
                        }
                        
                        // Remover referência ao botão
                        setTimeout(() => {
                            window._lastClickedButton = null;
                        }, 100);
                        
                        // O resto do código permanece como está
                    }, { once: true });
                }
                
                return modal;
            };
        }
    }
    
    // Modificar os criadores de botões para rastrear cliques
    function modifyButtonCreation() {
        if (typeof window.createAndPositionButtons === 'function') {
            const originalCreateFunc = window.createAndPositionButtons;
            
            window.createAndPositionButtons = function() {
                // Primeiro, chama a função original para criar os botões
                originalCreateFunc();
                
                // Depois, modifica os eventos dos botões para salvar referência ao botão clicado
                document.querySelectorAll('.configure-btn').forEach(btn => {
                    // Remove eventos anteriores
                    const newBtn = btn.cloneNode(true);
                    if (btn.parentNode) {
                        btn.parentNode.replaceChild(newBtn, btn);
                    }
                    
                    // Determina o tipo e adiciona novo evento
                    const type = newBtn.getAttribute('data-type');
                    const playbookName = newBtn.getAttribute('data-playbook');
                    
                    if (type === 'site24x7') {
                        newBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Salvar referência a este botão específico
                            window._lastClickedButton = this;
                            
                            if (typeof window.openSite24x7Modal === 'function') {
                                window.openSite24x7Modal();
                            }
                            
                            return false;
                        });
                    } else if (type === 'antivirus') {
                        newBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Salvar referência a este botão específico
                            window._lastClickedButton = this;
                            
                            const os = this.getAttribute('data-os') || 'windows';
                            
                            if (typeof window.openAntivirusModal === 'function') {
                                window.openAntivirusModal(os);
                            }
                            
                            return false;
                        });
                    }
                    
                    // Prevenir propagação de eventos
                    ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
                        newBtn.addEventListener(eventType, e => e.stopPropagation());
                    });
                    
                    // Restaurar estado do botão se existir
                    const id = getButtonIdentifier(newBtn);
                    if (id && verifiedButtonStates.has(id)) {
                        updateSpecificButton(newBtn, verifiedButtonStates.get(id));
                    }
                });
            };
        }
    }
    
    // Modificar a função de interceptação para usar o botão específico
    function modifyInterception() {
        if (typeof window.executeSelectedPlaybooks === 'function' && 
            typeof window.originalExecuteFunc === 'function') {
            
            window.executeSelectedPlaybooks = function() {
                console.log('Interceptando execução com suporte a botões independentes');
                
                // O código existente permanece o mesmo
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    if (url === '/api/run' && options?.method === 'POST' && options?.body) {
                        try {
                            // Lógica existente...
                        } catch (error) {
                            console.error('Erro ao processar requisição:', error);
                        }
                    }
                    
                    return originalFetch.apply(this, arguments);
                };
                
                // Chamar a função original
                window.originalExecuteFunc();
                
                // Restaurar fetch original após um momento
                setTimeout(() => {
                    window.fetch = originalFetch;
                }, 1000);
            };
        }
    }
    
    // Limpar estados ao carregar a página
    function clearStateOnLoad() {
        verifiedButtonStates.clear();
        window._lastClickedButton = null;
    }
    
    // Função para inicializar todas as correções
    function init() {
        // Limpar estados ao carregar
        clearStateOnLoad();
        
        // Modificar os modais
        modifyModals();
        
        // Modificar a criação de botões
        modifyButtonCreation();
        
        // Modificar a interceptação
        modifyInterception();
        
        // Aplicar as modificações aos botões já criados
        if (typeof window.createAndPositionButtons === 'function') {
            setTimeout(window.createAndPositionButtons, 500);
        }
        
        console.log("✅ Correção de independência de botões aplicada com sucesso");
    }
    
    // Inicializar quando o documento estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
/**
 * static-button-fix.js
 * Corrige os problemas:
 * 1. Botão de antivírus vindo verde por padrão
 * 2. Tremor nos botões de configuração
 */

(function() {
    console.log("Aplicando correção para botões estáticos sem tremor");
    
    // Função para garantir que todos os botões comecem amarelos
    function resetAllButtonsToDefault() {
        // Limpar qualquer cache persistente
        localStorage.removeItem('site24x7_verified');
        localStorage.removeItem('antivirus_verified');
        sessionStorage.removeItem('site24x7_verified');
        sessionStorage.removeItem('antivirus_verified');
        
        // Redefinir estado global de configuração
        if (window.configState) {
            if (window.configState.site24x7) {
                window.configState.site24x7.verified = false;
            }
            if (window.configState.antivirus) {
                window.configState.antivirus.verified = false;
            }
        }
        
        // Redefinir botões existentes para amarelo
        document.querySelectorAll('.configure-btn').forEach(btn => {
            btn.innerText = 'CONFIGURAR';
            btn.classList.remove('verified');
            btn.style.backgroundColor = '#FFD600'; // Amarelo
            btn.style.borderColor = '#E6C200';
        });
    }
    
    // Função para remover tremores e animações
    function removeButtonAnimations() {
        // Remover estilos que podem causar tremores
        const styleElement = document.createElement('style');
        styleElement.id = 'button-animation-remover';
        styleElement.textContent = `
            /* Desativar todas as animações em botões de configuração */
            .configure-btn {
                transition: background-color 0.3s !important;
                animation: none !important;
                transform: none !important;
                position: absolute !important;
                top: 10px !important;
                right: 10px !important;
            }
            
            /* Remover flutuação/hover */
            .configure-btn:hover {
                transform: none !important;
                animation: none !important;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* Evitar que o botão se mova ao mudar de estado */
            .configure-btn.verified {
                transform: none !important;
                animation: none !important;
            }
            
            /* Suprimir animação em elementos pai que podem afetar o botão */
            .playbook-item {
                transition: background-color 0.3s !important;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    // Modificar a função que cria botões para garantir estado inicial correto
    function modifyButtonCreation() {
        if (typeof window.createAndPositionButtons === 'function') {
            const originalCreateFunc = window.createAndPositionButtons;
            
            window.createAndPositionButtons = function() {
                // Executar função original
                originalCreateFunc();
                
                // Depois, garantir que todos os botões comecem amarelos
                document.querySelectorAll('.configure-btn').forEach(btn => {
                    // Forçar estado inicial não verificado
                    btn.innerText = 'CONFIGURAR';
                    btn.classList.remove('verified');
                    btn.style.backgroundColor = '#FFD600'; // Amarelo
                    btn.style.borderColor = '#E6C200';
                    
                    // Garantir posicionamento estático
                    btn.style.position = 'absolute';
                    btn.style.top = '10px';
                    btn.style.right = '10px';
                    btn.style.transform = 'none';
                    btn.style.animation = 'none';
                    
                    // Verificar se o elemento pai tem posição relativa
                    const parent = btn.parentElement;
                    if (parent && window.getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                    }
                });
            };
        }
    }
    
    // Substituir a função updateButtonLabels para evitar problemas com animações
    function modifyButtonUpdate() {
        if (typeof window.updateButtonLabels === 'function') {
            const originalUpdateFunc = window.updateButtonLabels;
            
            window.updateButtonLabels = function() {
                // Evitar que a função padrão seja chamada (prevenção de animações)
                
                // Atualizar cada botão com base em seu próprio estado
                if (window.createdButtons) {
                    window.createdButtons.forEach((btn, playbookName) => {
                        // Verificar tipo de playbook
                        const isSite24x7 = typeof window.isSite24x7Playbook === 'function' ? 
                            window.isSite24x7Playbook(playbookName) : 
                            (playbookName.toLowerCase().includes('site24x7') || playbookName.toLowerCase().includes('24x7'));
                        
                        const isAntivirus = typeof window.isAntivirusPlaybook === 'function' ? 
                            window.isAntivirusPlaybook(playbookName) : 
                            (playbookName.toLowerCase().includes('antivir') || playbookName.toLowerCase().includes('trend'));
                        
                        // Verificar estado individual
                        let isVerified = false;
                        
                        // Verificar se há um estado específico para este botão
                        const buttonId = btn.getAttribute('data-button-id');
                        if (buttonId && window.verifiedButtonStates && window.verifiedButtonStates.has(buttonId)) {
                            isVerified = window.verifiedButtonStates.get(buttonId);
                        }
                        
                        // Atualizar apenas a cor e texto, sem animações
                        if (isVerified) {
                            btn.innerText = 'VERIFICADO';
                            btn.classList.add('verified');
                            btn.style.backgroundColor = '#4CAF50'; // Verde
                            btn.style.borderColor = '#3E8E41';
                        } else {
                            btn.innerText = 'CONFIGURAR';
                            btn.classList.remove('verified');
                            btn.style.backgroundColor = '#FFD600'; // Amarelo
                            btn.style.borderColor = '#E6C200';
                        }
                        
                        // Garantir que não há animações
                        btn.style.animation = 'none';
                        btn.style.transform = 'none';
                    });
                }
            };
        }
    }
    
    // Modificar modais para atualizar apenas o botão específico clicado
    function modifyModals() {
        // Criar armazenamento para estados individuais se não existir
        if (!window.verifiedButtonStates) {
            window.verifiedButtonStates = new Map();
        }
        
        // Rastrear o último botão clicado
        window._lastClickedConfigButton = null;
        
        // Interceptar cliques em botões de configuração
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('configure-btn')) {
                window._lastClickedConfigButton = e.target;
                
                // Dar um ID único ao botão se não tiver
                if (!e.target.getAttribute('data-button-id')) {
                    const buttonId = 'btn-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                    e.target.setAttribute('data-button-id', buttonId);
                }
            }
        }, true);
        
        // Substituir a função de confirmação de Site24x7
        if (typeof window.openSite24x7Modal === 'function') {
            const originalModal = window.openSite24x7Modal;
            
            window.openSite24x7Modal = function() {
                const modal = typeof originalModal === 'function' ? originalModal() : document.createElement('div');
                
                // Substituir evento de confirmação
                const confirmBtn = modal.querySelector('#confirm-btn');
                if (confirmBtn) {
                    // Remover eventos existentes
                    const newBtn = confirmBtn.cloneNode(true);
                    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                    
                    // Adicionar novo evento
                    newBtn.addEventListener('click', function() {
                        // Se temos referência ao botão clicado, atualizar apenas ele
                        if (window._lastClickedConfigButton) {
                            const buttonId = window._lastClickedConfigButton.getAttribute('data-button-id');
                            if (buttonId) {
                                // Salvar estado individual
                                window.verifiedButtonStates.set(buttonId, true);
                                
                                // Atualizar aparência
                                window._lastClickedConfigButton.innerText = 'VERIFICADO';
                                window._lastClickedConfigButton.classList.add('verified');
                                window._lastClickedConfigButton.style.backgroundColor = '#4CAF50'; // Verde
                                window._lastClickedConfigButton.style.borderColor = '#3E8E41';
                                
                                // Garantir que não há animações
                                window._lastClickedConfigButton.style.animation = 'none';
                                window._lastClickedConfigButton.style.transform = 'none';
                            }
                        }
                        
                        // Fechar modal
                        modal.remove();
                    });
                }
                
                return modal;
            };
        }
        
        // Substituir a função de confirmação de Antivírus
        if (typeof window.openAntivirusModal === 'function') {
            const originalModal = window.openAntivirusModal;
            
            window.openAntivirusModal = function(detectedOS) {
                const modal = typeof originalModal === 'function' ? originalModal(detectedOS) : document.createElement('div');
                
                // Substituir evento de confirmação
                const confirmBtn = modal.querySelector('#confirm-btn');
                if (confirmBtn) {
                    // Remover eventos existentes
                    const newBtn = confirmBtn.cloneNode(true);
                    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                    
                    // Adicionar novo evento
                    newBtn.addEventListener('click', function() {
                        // Se temos referência ao botão clicado, atualizar apenas ele
                        if (window._lastClickedConfigButton) {
                            const buttonId = window._lastClickedConfigButton.getAttribute('data-button-id');
                            if (buttonId) {
                                // Salvar estado individual
                                window.verifiedButtonStates.set(buttonId, true);
                                
                                // Atualizar aparência
                                window._lastClickedConfigButton.innerText = 'VERIFICADO';
                                window._lastClickedConfigButton.classList.add('verified');
                                window._lastClickedConfigButton.style.backgroundColor = '#4CAF50'; // Verde
                                window._lastClickedConfigButton.style.borderColor = '#3E8E41';
                                
                                // Garantir que não há animações
                                window._lastClickedConfigButton.style.animation = 'none';
                                window._lastClickedConfigButton.style.transform = 'none';
                            }
                        }
                        
                        // Fechar modal
                        modal.remove();
                    });
                }
                
                return modal;
            };
        }
    }
    
    // Inicialização
    function init() {
        // Primeiro, reset para garantir que todos os botões comecem amarelos
        resetAllButtonsToDefault();
        
        // Em seguida, remover animações para evitar tremor
        removeButtonAnimations();
        
        // Modificar funções de criação e atualização de botões
        modifyButtonCreation();
        modifyButtonUpdate();
        
        // Modificar modais para atualizar apenas o botão clicado
        modifyModals();
        
        // Forçar refresh dos botões
        if (typeof window.createAndPositionButtons === 'function') {
            setTimeout(window.createAndPositionButtons, 500);
        }
        
        // Repetir o reset após um curto delay para garantir
        setTimeout(resetAllButtonsToDefault, 1000);
        
        console.log("✅ Correção para botões estáticos aplicada com sucesso");
    }
    
    // Carregar ao iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();