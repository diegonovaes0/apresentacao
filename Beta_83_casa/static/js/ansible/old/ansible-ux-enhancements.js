/**
 * ansible-ux-enhancements.js
 * Melhorias visuais e de experiência do usuário para o módulo Ansible
 * Versão: 1.0
 */

// Classe para gerenciar notificações
class NotificationManager {
    constructor() {
        this.container = null;
        this.timeout = null;
        this.initContainer();
    }
    
    initContainer() {
        if (document.getElementById('notification-container')) {
            this.container = document.getElementById('notification-container');
            return;
        }
        
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        
        document.body.appendChild(this.container);
    }
    
    show(message, type = 'info', duration = 5000) {
        const types = {
            success: {
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>`,
                color: '#4CAF50',
                background: 'rgba(76, 175, 80, 0.1)'
            },
            info: {
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>`,
                color: '#2196F3',
                background: 'rgba(33, 150, 243, 0.1)'
            },
            warning: {
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`,
                color: '#FF9800',
                background: 'rgba(255, 152, 0, 0.1)'
            },
            error: {
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F44336" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>`,
                color: '#F44336',
                background: 'rgba(244, 67, 54, 0.1)'
            }
        };
        
        const typeConfig = types[type] || types.info;
        
        const notification = document.createElement('div');
        notification.className = 'ansible-notification';
        notification.style.cssText = `
            background: ${typeConfig.background};
            border-left: 4px solid ${typeConfig.color};
            border-radius: 6px;
            padding: 15px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
        `;
        
        notification.innerHTML = `
            <div class="notification-icon">
                ${typeConfig.icon}
            </div>
            <div class="notification-content" style="flex: 1;">
                <div class="notification-message" style="margin-right: 20px;">${message}</div>
            </div>
            <button class="notification-close" style="
                background: none;
                border: none;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                cursor: pointer;
                color: #999;
                position: absolute;
                top: 10px;
                right: 10px;
            ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.hide(notification);
        });
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
        
        return notification;
    }
    
    hide(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(120%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }
}

// Instanciar o gerenciador de notificações
const notificationManager = new NotificationManager();

// Substituir a função de mensagem padrão
function enhancedShowMessage(text, type = 'info', duration = 5000) {
    notificationManager.show(text, type, duration);
    console.log(`[${type.toUpperCase()}] ${text}`);
}

// Adicionar efeito de ondulação (ripple) aos botões
function addRippleEffect() {
    const buttons = document.querySelectorAll('.ansible-button, .ansible-core-btn, .ansible-orbital-btn, .toggle-output-btn, .cancel-btn');
    
    buttons.forEach(button => {
        if (button.classList.contains('ripple-effect')) return;
        
        button.classList.add('ripple-effect');
        
        button.addEventListener('click', function(e) {
            let ripple = button.querySelector('.ripple');
            
            if (ripple) {
                ripple.remove();
            }
            
            ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Animações para entrada dos elementos
function addEntranceAnimations() {
    const header = document.querySelector('.ansible-header');
    if (header && !header.classList.contains('animated')) {
        header.classList.add('animated');
        header.style.opacity = '0';
        header.style.transform = 'translateY(-20px)';
        header.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            header.style.opacity = '1';
            header.style.transform = 'translateY(0)';
        }, 100);
    }
    
    const containers = [
        document.querySelector('.ansible-hosts-container'),
        document.querySelector('.ansible-playbooks'),
        document.querySelector('.ansible-execution')
    ];
    
    containers.forEach((container, index) => {
        if (container && !container.classList.contains('animated')) {
            container.classList.add('animated');
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 200 + index * 100);
        }
    });
}

// Melhorar cards de execução com animações e efeitos visuais
function enhanceExecutionCards() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                        applyCardEnhancements(node);
                    }
                });
            }
        });
    });
    
    const executionContainer = document.getElementById('running-playbooks');
    if (executionContainer) {
        observer.observe(executionContainer, { childList: true });
        executionContainer.querySelectorAll('.execution-card').forEach(card => {
            applyCardEnhancements(card);
        });
    }
}

// Aplicar melhorias aos cards
function applyCardEnhancements(card) {
    if (card.classList.contains('enhanced-card')) return;
    
    card.classList.add('enhanced-card');
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 10);
    
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                handleCardStatusChange(card);
            }
        });
    });
    
    observer.observe(card, { attributes: true });
}

// Gerenciar mudanças de status dos cards
function handleCardStatusChange(card) {
    if (card.classList.contains('success')) {
        createConfetti(card);
        const playbookName = card.dataset.playbookName || 'Playbook';
        enhancedShowMessage(`${playbookName} concluído com sucesso!`, 'success');
    } 
    else if (card.classList.contains('failed')) {
        card.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        const playbookName = card.dataset.playbookName || 'Playbook';
        enhancedShowMessage(`${playbookName} falhou. Verifique os detalhes.`, 'error');
        setTimeout(() => {
            card.style.animation = '';
        }, 500);
    }
    else if (card.classList.contains('cancelled')) {
        const playbookName = card.dataset.playbookName || 'Playbook';
        enhancedShowMessage(`${playbookName} foi cancelado.`, 'info');
    }
}

// Efeito visual de confetes para playbooks com sucesso
function createConfetti(card) {
    const colors = ['#4CAF50', '#FFD600', '#2196F3', '#9C27B0', '#FF9800'];
    const particleCount = 50;
    
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
        z-index: 5;
    `;
    
    card.appendChild(confettiContainer);
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        
        const size = Math.random() * 10 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = Math.random() * 100;
        const speed = Math.random() * 3 + 2;
        const rotation = Math.random() * 360;
        
        particle.style.cssText = `
            position: absolute;
            top: -20px;
            left: ${x}%;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            transform: rotate(${rotation}deg);
            animation: confetti-fall ${speed}s linear forwards;
        `;
        
        confettiContainer.appendChild(particle);
    }
    
    setTimeout(() => {
        confettiContainer.remove();
    }, 5000); // Remove após 5 segundos
}

// Melhorar interatividade dos seletores
function enhanceSelectorFeedback() {
    // Adiciona estilos para feedback visual nos seletores
    if (!document.getElementById('ansible-selector-styles')) {
        const style = document.createElement('style');
        style.id = 'ansible-selector-styles';
        style.textContent = `
            .ansible-select {
                transition: box-shadow 0.3s ease, border-color 0.3s ease;
            }
            
            .ansible-select:focus {
                box-shadow: 0 0 0 2px rgba(255, 214, 0, 0.3);
                border-color: var(--accent-gold);
            }
            
            .ansible-select.changed {
                animation: selectChanged 1s ease;
            }
            
            @keyframes selectChanged {
                0% { background-color: rgba(255, 214, 0, 0.2); }
                100% { background-color: var(--black-smoke); }
            }
            
            .host-banner {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .host-banner:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .host-banner.selected {
                border-color: var(--accent-gold);
                box-shadow: 0 0 0 2px rgba(255, 214, 0, 0.3);
            }
            
            .playbook-item {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .playbook-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .playbook-item.selected {
                border-color: var(--accent-gold);
                box-shadow: 0 0 0 2px rgba(255, 214, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Adiciona event listeners para feedback visual
    const osFilter = document.getElementById('os-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    [osFilter, categoryFilter].forEach(select => {
        if (!select || select.classList.contains('feedback-enhanced')) return;
        select.classList.add('feedback-enhanced');
        
        select.addEventListener('change', function() {
            this.classList.remove('changed');
            void this.offsetWidth; // Força reflow para reiniciar a animação
            this.classList.add('changed');
        });
    });
}

// Função para tornar a saída do Ansible mais amigável ao usuário
function enhanceAnsibleOutputs() {
    // Aplicar parser em saídas existentes
    document.querySelectorAll('.ansible-output').forEach(outputElement => {
        if (outputElement.classList.contains('ansible-modern-output')) return;
        
        const rawOutput = outputElement.textContent;
        if (rawOutput && rawOutput.trim()) {
            const parser = new AnsibleOutputParser();
            parser.renderModernOutput(rawOutput, outputElement);
            
            // Observer para mudanças futuras neste elemento
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && !outputElement.classList.contains('ansible-modern-output')) {
                        const newOutput = outputElement.textContent;
                        if (newOutput && newOutput.trim()) {
                            parser.renderModernOutput(newOutput, outputElement);
                        }
                    }
                });
            });
            observer.observe(outputElement, { childList: true, subtree: true });
        }
    });
    
    // Observer para monitorar novas saídas
    const executionContainer = document.getElementById('running-playbooks');
    if (executionContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const outputElement = node.querySelector('.ansible-output');
                            if (outputElement && !outputElement.classList.contains('ansible-modern-output')) {
                                const rawOutput = outputElement.textContent;
                                if (rawOutput && rawOutput.trim()) {
                                    const parser = new AnsibleOutputParser();
                                    parser.renderModernOutput(rawOutput, outputElement);
                                }
                            }
                        }
                    });
                }
            });
        });
        observer.observe(executionContainer, { childList: true, subtree: true });
    }
}

// Adicionar feedback tátil para botões (se disponível)
function addTactileFeedback() {
    // Verificar se a API de vibração está disponível
    if ('vibrate' in navigator) {
        document.querySelectorAll('button').forEach(button => {
            if (button.classList.contains('tactile-enhanced')) return;
            
            button.classList.add('tactile-enhanced');
            button.addEventListener('click', () => {
                // Vibração suave de 50ms
                navigator.vibrate(50);
            });
        });
    }
}

// Substituir a função showMessage padrão para usar nosso gerenciador de notificações
function overrideShowMessage() {
    if (window.showMessage && !window.showMessage.enhanced) {
        const originalShowMessage = window.showMessage;
        window.showMessage = function(text, type = 'info', duration = 5000) {
            enhancedShowMessage(text, type, duration);
        };
        window.showMessage.enhanced = true;
        window.showMessage.original = originalShowMessage;
    }
}

// Adicionar atalhos de teclado
function addKeyboardShortcuts() {
    if (document.body.classList.contains('shortcuts-enabled')) return;
    
    document.body.classList.add('shortcuts-enabled');
    
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter para executar playbooks selecionadas
        if (e.ctrlKey && e.key === 'Enter') {
            const executeButton = document.getElementById('execute-selected');
            if (executeButton) {
                executeButton.click();
                e.preventDefault();
            }
        }
        
        // Ctrl+A para selecionar todos os hosts
        if (e.ctrlKey && e.key === 'a' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const selectAllHostsBtn = document.getElementById('select-all-hosts-btn');
            if (selectAllHostsBtn) {
                selectAllHostsBtn.click();
                e.preventDefault();
            }
        }
        
        // Ctrl+P para selecionar todas as playbooks
        if (e.ctrlKey && e.key === 'p' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const selectAllPlaybooksBtn = document.getElementById('select-all-playbooks');
            if (selectAllPlaybooksBtn) {
                selectAllPlaybooksBtn.click();
                e.preventDefault();
            }
        }
        
        // Esc para cancelar todas as execuções
        if (e.key === 'Escape') {
            const cancelAllBtn = document.getElementById('cancel-all');
            if (cancelAllBtn) {
                cancelAllBtn.click();
                e.preventDefault();
            }
        }
        
        // Ctrl+R para atualizar
        if (e.ctrlKey && e.key === 'r') {
            const refreshBtn = document.getElementById('refresh');
            if (refreshBtn) {
                refreshBtn.click();
                e.preventDefault();
            }
        }
    });
    
    // Tooltip para informar sobre os atalhos
    const helpTooltip = document.createElement('div');
    helpTooltip.className = 'shortcuts-tooltip';
    helpTooltip.innerHTML = `
        <div class="shortcuts-header">Atalhos de Teclado</div>
        <div class="shortcut-item">
            <div class="shortcut-key">Ctrl+Enter</div>
            <div class="shortcut-desc">Executar playbooks selecionadas</div>
        </div>
        <div class="shortcut-item">
            <div class="shortcut-key">Ctrl+A</div>
            <div class="shortcut-desc">Selecionar todos os hosts</div>
        </div>
        <div class="shortcut-item">
            <div class="shortcut-key">Ctrl+P</div>
            <div class="shortcut-desc">Selecionar todas as playbooks</div>
        </div>
        <div class="shortcut-item">
            <div class="shortcut-key">Esc</div>
            <div class="shortcut-desc">Cancelar todas as execuções</div>
        </div>
        <div class="shortcut-item">
            <div class="shortcut-key">Ctrl+R</div>
            <div class="shortcut-desc">Atualizar</div>
        </div>
    `;
    
    document.body.appendChild(helpTooltip);
    
    // Botão de ajuda para mostrar os atalhos
    const helpButton = document.createElement('button');
    helpButton.className = 'shortcuts-help-button';
    helpButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    `;
    document.body.appendChild(helpButton);
    
    helpButton.addEventListener('click', () => {
        helpTooltip.classList.toggle('active');
    });
    
    // Estilo para o tooltip e botão de ajuda
    const style = document.createElement('style');
    style.textContent = `
        .shortcuts-tooltip {
            position: fixed;
            right: 70px;
            bottom: 20px;
            background: #252526;
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            font-family: sans-serif;
            font-size: 12px;
            color: #d4d4d4;
            display: none;
            width: 300px;
            border: 1px solid #333;
            border-left: 3px solid var(--accent-gold, #FFD600);
        }
        
        .shortcuts-tooltip.active {
            display: block;
            animation: tooltipFadeIn 0.3s ease;
        }
        
        @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .shortcuts-header {
            font-weight: bold;
            color: var(--accent-gold, #FFD600);
            margin-bottom: 10px;
            font-size: 14px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
        }
        
        .shortcut-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .shortcut-key {
            background: #333;
            padding: 3px 6px;
            border-radius: 3px;
            color: #fff;
            font-family: monospace;
            font-weight: bold;
        }
        
        .shortcuts-help-button {
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--accent-gold, #FFD600);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 9998;
            color: #000;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .shortcuts-help-button:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        }
    `;
    
    document.head.appendChild(style);
}

// Adicionar melhorias de desempenho e otimizações
function addPerformanceOptimizations() {
    // Throttle para eventos de scroll e resize
    function throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return callback(...args);
        };
    }
    
    // Lazy loading para exibição de saídas longas
    const lazyLoadOutput = throttle(() => {
        document.querySelectorAll('.ansible-output').forEach(output => {
            const rect = output.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
            
            if (isVisible && output.dataset.lazyLoad === 'true') {
                output.dataset.lazyLoad = 'false';
                const rawOutput = output.dataset.rawOutput;
                if (rawOutput) {
                    const parser = new AnsibleOutputParser();
                    parser.renderModernOutput(rawOutput, output);
                    delete output.dataset.rawOutput;
                }
            }
        });
    }, 200);
    
    // Aplicar lazy loading
    document.addEventListener('scroll', lazyLoadOutput);
    window.addEventListener('resize', lazyLoadOutput);
    
    // Interseção observer para lazy loading mais eficiente
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const output = entry.target;
                    if (output.dataset.lazyLoad === 'true') {
                        output.dataset.lazyLoad = 'false';
                        const rawOutput = output.dataset.rawOutput;
                        if (rawOutput) {
                            const parser = new AnsibleOutputParser();
                            parser.renderModernOutput(rawOutput, output);
                            delete output.dataset.rawOutput;
                        }
                    }
                    observer.unobserve(output);
                }
            });
        });
        
        document.querySelectorAll('.ansible-output').forEach(output => {
            output.dataset.lazyLoad = 'true';
            if (output.textContent.length > 1000) {
                output.dataset.rawOutput = output.textContent;
                output.textContent = 'Carregando conteúdo...';
                observer.observe(output);
            }
        });
    }
}

// Estilo para o ripple e animações
function addAnimationStyles() {
    if (document.getElementById('ansible-animation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ansible-animation-styles';
    style.textContent = `
        .ripple-effect {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple {
            to { transform: scale(4); opacity: 0; }
        }
        
        @keyframes confetti-fall {
            0% { transform: translateY(-20px) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        
        @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .pulse-animation {
            animation: pulse 1s infinite;
        }
    `;
    
    document.head.appendChild(style);
}

// Inicializar todas as melhorias
function initializeUXEnhancements() {
    // Garantir que a inicialização ocorra apenas uma vez
    if (document.body.classList.contains('ux-enhanced')) return;
    document.body.classList.add('ux-enhanced');
    
    // Adicionar todos os estilos necessários
    addAnimationStyles();
    
    // Sobrepor a função showMessage
    overrideShowMessage();
    
    // Adicionar efeitos visuais
    addRippleEffect();
    addEntranceAnimations();
    enhanceExecutionCards();
    enhanceSelectorFeedback();
    
    // Melhorar saídas do Ansible
    enhanceAnsibleOutputs();
    
    // Adicionar feedback tátil (vibração)
    addTactileFeedback();
    
    // Adicionar atalhos de teclado
    addKeyboardShortcuts();
    
    // Adicionar otimizações de desempenho
    addPerformanceOptimizations();
    
    console.log('✨ Melhorias de UX do Ansible inicializadas com sucesso!');
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUXEnhancements);
} else {
    initializeUXEnhancements();
}

// Observar mudanças futuras na DOM
const observer = new MutationObserver(mutations => {
    // Reprocesar apenas quando necessário para não sobrecarregar
    let needsRefresh = false;
    
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Verifica se algum dos nós adicionados é um elemento que precisamos melhorar
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeType === 1) { // Elemento
                    if (node.tagName === 'BUTTON' || 
                        node.classList.contains('execution-card') ||
                        node.classList.contains('ansible-output') ||
                        node.querySelector('.ansible-output') ||
                        node.querySelector('button')) {
                        needsRefresh = true;
                        break;
                    }
                }
            }
        }
    });
    
    if (needsRefresh) {
        addRippleEffect();
        enhanceExecutionCards();
        enhanceAnsibleOutputs();
        addTactileFeedback();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
