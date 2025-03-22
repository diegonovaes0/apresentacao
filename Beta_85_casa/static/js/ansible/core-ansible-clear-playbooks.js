/**
 * ansible-clear-playbooks.js
 * Implementa o botão para limpar playbooks em execução na interface Ansible.
 * 
 * Este arquivo contém:
 * - Substituição do botão não-funcional existente
 * - Estilização visual compatível com os botões orbitais
 * - Funcionalidade para limpar a área de playbooks em execução
 * - Sistema de notificação para feedback ao usuário
 * - Preservação de mensagens importantes durante a limpeza
 */

(function() {
    // Função para substituir o botão atual por um novo botão funcional
    function fixClearPlaybooksButton() {
        console.log("Aplicando correção para o botão de limpar playbooks...");
        
        // Encontrar o botão existente
        const existingButton = document.querySelector('.clear-playbooks-btn');
        if (!existingButton) {
            console.warn("Botão de limpar playbooks não encontrado. Tentando criar um novo.");
            addNewClearButton();
            return;
        }
        
        // Remover o botão existente
        const parentElement = existingButton.parentElement;
        existingButton.remove();
        
        // Criar o novo botão com estilo correspondente aos outros botões orbitais
        const newButton = document.createElement('button');
        newButton.id = 'clear-playbooks';
        newButton.className = 'ansible-orbital-btn';
        newButton.title = 'Limpar Playbooks';
        newButton.innerHTML = `
            <i class="ri-delete-bin-line"></i>
            <span class="orbital-label">Limpar Playbooks</span>
        `;
        
        // Adicionar evento ao novo botão
        newButton.addEventListener('click', clearRunningPlaybooks);
        
        // Adicionar o novo botão ao cabeçalho de execução
        parentElement.appendChild(newButton);
        
        console.log("Botão de limpar playbooks substituído com sucesso!");
    }
    
    // Função para adicionar um novo botão caso o original não seja encontrado
    function addNewClearButton() {
        const executionHeader = document.querySelector('.ansible-execution-header');
        if (!executionHeader) {
            console.error("Cabeçalho de execução não encontrado!");
            return;
        }
        
        const newButton = document.createElement('button');
        newButton.id = 'clear-playbooks';
        newButton.className = 'ansible-orbital-btn';
        newButton.title = 'Limpar Playbooks';
        newButton.innerHTML = `
            <i class="ri-delete-bin-line"></i>
            <span class="orbital-label">Limpar Playbooks</span>
        `;
        
        newButton.addEventListener('click', clearRunningPlaybooks);
        executionHeader.appendChild(newButton);
        
        console.log("Novo botão de limpar playbooks criado!");
    }
    
    // Função para limpar playbooks em execução
    function clearRunningPlaybooks() {
        console.log("Limpando playbooks em execução...");
        
        const runningPlaybooks = document.getElementById('running-playbooks');
        if (!runningPlaybooks) {
            console.error("Contêiner de playbooks em execução não encontrado!");
            return;
        }
        
        // Verificar se há playbooks para limpar
        if (runningPlaybooks.children.length === 0) {
            showMessage("Não há playbooks em execução para limpar.", "info");
            return;
        }
        
        // Guardar quaisquer notificações importantes
        const notifications = [];
        document.querySelectorAll('#running-playbooks > div').forEach(item => {
            if (item.classList.contains('message-notification') || 
                item.classList.contains('error-notification') || 
                item.classList.contains('success-notification')) {
                notifications.push(item.cloneNode(true));
            }
        });
        
        // Limpar o conteúdo
        runningPlaybooks.innerHTML = '';
        
        // Readicionar notificações importantes se necessário
        notifications.forEach(notification => {
            runningPlaybooks.appendChild(notification);
        });
        
        showMessage("Playbooks em execução foram limpos com sucesso!", "success");
    }
    
    // Função auxiliar para mostrar mensagens
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
        message.classList.add('message-notification');
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
    
    // Adicionar estilos necessários
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ansible-execution-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            #clear-playbooks {
                background-color: var(--ansible-dark-alt);
                color: var(--ansible-white);
                border: none;
                border-radius: 4px;
                margin-left: 8px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                padding: 6px 12px;
                cursor: pointer;
            }
            
            #clear-playbooks:hover {
                background-color: #dc3545;
                transform: translateY(-2px);
            }
            
            #clear-playbooks i {
                font-size: 16px;
                margin-right: 6px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Função principal de inicialização
    function init() {
        // Verificar se o DOM já foi carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                addStyles();
                fixClearPlaybooksButton();
            });
        } else {
            addStyles();
            fixClearPlaybooksButton();
        }
        
        // Também verificar a função global e sobrescrevê-la se necessário
        window.clearRunningPlaybooks = clearRunningPlaybooks;
    }
    
    // Inicializar
    init();
})();