/**
 * ansible-cancel-fix.js
 * 
 * Correção para os botões "Cancelar" e "Cancelar Todos" no sistema Ansible Multi-Host
 */

(function() {
    console.log("[Cancel Fix] Aplicando correções para botões de cancelamento");

    // Interceptar a requisição fetch para garantir que o endpoint correto seja chamado
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Interceptar chamadas para cancelar jobs
        if (url === '/api/cancel' && options && options.method === 'POST') {
            try {
                // Converter para /api/cancel/<job_id> que é o que o backend espera
                const data = JSON.parse(options.body);
                const jobId = data.job_id;
                
                if (jobId) {
                    console.log(`[Cancel Fix] Redirecionando cancelamento para /api/cancel/${jobId}`);
                    // Chamar o endpoint correto no Flask
                    return originalFetch(`/api/cancel/${jobId}`, {
                        method: 'POST',
                        headers: options.headers
                    });
                }
            } catch (e) {
                console.error(`[Cancel Fix] Erro ao processar requisição de cancelamento:`, e);
            }
        }
        
        return originalFetch.apply(this, arguments);
    };

    // Implementação corrigida da função cancelPlaybookExecution
    window.cancelPlaybookExecution = function(jobId) {
        console.log(`[Cancel Fix] Cancelando execução: ${jobId}`);
        
        // Atualizar UI imediatamente para feedback ao usuário
        const card = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
        if (card) {
            // Desabilitar o botão e mudar texto
            const cancelButton = card.querySelector('.cancel-btn');
            if (cancelButton) {
                cancelButton.textContent = 'Cancelando...';
                cancelButton.disabled = true;
            }
            
            // Atualizar barra de progresso para indicar cancelamento
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.backgroundColor = '#FF9800';
            }
        }
        
        // Fazer requisição ao servidor
        return fetch(`/api/cancel/${jobId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao cancelar job: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`[Cancel Fix] Job ${jobId} cancelado com sucesso:`, data);
            
            // Atualizar UI após cancelamento bem-sucedido
            if (card) {
                // Atualizar botão
                const cancelButton = card.querySelector('.cancel-btn');
                if (cancelButton) {
                    cancelButton.textContent = 'Cancelado';
                    cancelButton.disabled = true;
                }
                
                // Atualizar status no card
                card.setAttribute('data-status', 'cancelled');
                
                // Atualizar elemento de status se existir
                const statusElement = card.querySelector('.task-status');
                if (statusElement) {
                    statusElement.textContent = 'Cancelado';
                    statusElement.className = 'task-status cancelled';
                }
                
                // Atualizar progresso para 100%
                if (window.STATE && window.STATE.progressState) {
                    window.STATE.progressState.set(jobId, 100);
                }
                
                // Atualizar barra de progresso
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#FF9800';
                }
            }
            
            // Exibir mensagem de sucesso
            if (typeof window.showMessage === 'function') {
                window.showMessage("Job cancelado com sucesso", "success");
            }
            
            return data;
        })
        .catch(error => {
            console.error(`[Cancel Fix] Erro ao cancelar job ${jobId}:`, error);
            
            // Mesmo com erro, atualizar UI para indicar cancelamento
            if (card) {
                // Marcar como cancelado de qualquer forma (UX melhor)
                card.setAttribute('data-status', 'cancelled');
                
                // Atualizar botão para indicar erro
                const cancelButton = card.querySelector('.cancel-btn');
                if (cancelButton) {
                    cancelButton.textContent = 'Cancelado';
                    cancelButton.disabled = true;
                }
            }
            
            // Mostrar mensagem de erro
            if (typeof window.showMessage === 'function') {
                window.showMessage(`Erro ao cancelar job: ${error.message}`, "error");
            }
            
            throw error;
        });
    };

    // Implementação corrigida da função cancelAllPlaybooks
    window.cancelAllPlaybooks = function() {
        console.log("[Cancel Fix] Cancelando todas as execuções");
        
        // Obter todos os cards em execução
        const runningCards = document.querySelectorAll('.execution-card[data-status="running"]');
        if (runningCards.length === 0) {
            console.log("[Cancel Fix] Nenhuma execução em andamento para cancelar");
            if (typeof window.showMessage === 'function') {
                window.showMessage("Nenhuma execução em andamento para cancelar", "info");
            }
            return Promise.resolve();
        }
        
        // Atualizar UI imediatamente para todos os cards
        runningCards.forEach(card => {
            const cancelButton = card.querySelector('.cancel-btn');
            if (cancelButton) {
                cancelButton.textContent = 'Cancelando...';
                cancelButton.disabled = true;
            }
            
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.backgroundColor = '#FF9800';
            }
        });
        
        // Criar uma array de promessas para cancelar cada job
        const jobIds = Array.from(runningCards).map(card => card.getAttribute('data-job-id')).filter(Boolean);
        console.log(`[Cancel Fix] Cancelando ${jobIds.length} jobs:`, jobIds);
        
        const cancelPromises = jobIds.map(jobId => {
            return window.cancelPlaybookExecution(jobId)
                .catch(error => {
                    console.error(`[Cancel Fix] Erro ao cancelar job ${jobId}:`, error);
                    return null; // Continuar mesmo com erros
                });
        });
        
        // Executar todos os cancelamentos e atualizar UI ao final
        return Promise.all(cancelPromises)
            .then(() => {
                console.log("[Cancel Fix] Todos os jobs foram cancelados");
                if (typeof window.showMessage === 'function') {
                    window.showMessage(`${jobIds.length} execuções canceladas com sucesso`, "success");
                }
            })
            .catch(error => {
                console.error("[Cancel Fix] Erro ao cancelar todos os jobs:", error);
                if (typeof window.showMessage === 'function') {
                    window.showMessage(`Erro ao cancelar todas as execuções: ${error.message}`, "error");
                }
            });
    };

    // Certificar que os botões Cancelar estão posicionados corretamente
    function fixCancelButtonsPosition() {
        console.log("[Cancel Fix] Corrigindo posição dos botões cancelar");
        
        // Adicionar estilo para botões de cancelar
        const style = document.createElement('style');
        style.id = 'cancel-buttons-style';
        style.textContent = `
            .execution-controls {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 10px !important;
            }
            
            .cancel-btn {
                background-color: #f44336 !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                padding: 6px 12px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                font-size: 12px !important;
                height: 34px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .cancel-btn:hover {
                background-color: #d32f2f !important;
            }
            
            .cancel-btn:disabled {
                background-color: #ffcdd2 !important;
                cursor: not-allowed !important;
            }
            
            /* Mostrar o botão Cancelar Todos sempre à direita */
            .cancel-all-btn {
                margin-left: auto !important;
            }
        `;
        document.head.appendChild(style);
        
        // Ajustar botões em cards existentes
        document.querySelectorAll('.execution-card').forEach(card => {
            adjustCancelButtonInCard(card);
        });
        
        // Verificar se o botão "Cancelar todos" existe
        let cancelAllBtn = document.querySelector('.cancel-all-btn');
        
        // Se não existe, criar e adicionar
        if (!cancelAllBtn && document.querySelector('#running-playbooks')) {
            const runningSection = document.querySelector('#running-playbooks');
            const headerSection = runningSection.querySelector('h2, .section-header');
            
            if (headerSection) {
                // Criar container flexível para o cabeçalho
                const headerContainer = document.createElement('div');
                headerContainer.style.display = 'flex';
                headerContainer.style.justifyContent = 'space-between';
                headerContainer.style.alignItems = 'center';
                headerContainer.style.width = '100%';
                
                // Mover o cabeçalho para o container
                headerSection.parentNode.insertBefore(headerContainer, headerSection);
                headerContainer.appendChild(headerSection);
                
                // Adicionar botão "Cancelar todos"
                cancelAllBtn = document.createElement('button');
                cancelAllBtn.className = 'cancel-all-btn';
                cancelAllBtn.textContent = 'Cancelar Todos';
                cancelAllBtn.style.backgroundColor = '#f44336';
                cancelAllBtn.style.color = 'white';
                cancelAllBtn.style.border = 'none';
                cancelAllBtn.style.borderRadius = '4px';
                cancelAllBtn.style.padding = '8px 16px';
                cancelAllBtn.style.cursor = 'pointer';
                cancelAllBtn.style.fontWeight = 'bold';
                
                // Adicionar evento de clique
                cancelAllBtn.addEventListener('click', function() {
                    window.cancelAllPlaybooks();
                });
                
                headerContainer.appendChild(cancelAllBtn);
                console.log("[Cancel Fix] Botão 'Cancelar Todos' criado e adicionado");
            }
        }
    }

    // Função auxiliar para ajustar botão cancelar em um card
    function adjustCancelButtonInCard(card) {
        if (!card) return;
        
        // Verificar se o card já tem um botão de cancelar
        let cancelBtn = card.querySelector('.cancel-btn');
        const jobId = card.getAttribute('data-job-id');
        
        if (!jobId) return;
        
        // Obter o botão "Ver Mais"
        const toggleBtn = card.querySelector('.toggle-output-btn');
        
        // Se não existe toggle ou já existe cancelar na posição correta, não fazer nada
        if (!toggleBtn) return;
        
        // Criar container para os controles se não existir
        let controlsContainer = toggleBtn.closest('.execution-controls');
        if (!controlsContainer) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'execution-controls';
            toggleBtn.parentNode.insertBefore(controlsContainer, toggleBtn);
            controlsContainer.appendChild(toggleBtn);
        }
        
        // Se não existe botão cancelar, criar um novo
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = 'Cancelar';
            
            // Status atual do card
            const status = card.getAttribute('data-status');
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                cancelBtn.disabled = true;
                cancelBtn.textContent = status === 'cancelled' ? 'Cancelado' : 
                                        status === 'completed' ? 'Concluído' : 'Falhou';
            } else {
                // Adicionar handler de clique
                cancelBtn.addEventListener('click', function() {
                    window.cancelPlaybookExecution(jobId);
                });
            }
            
            // Adicionar ao container
            controlsContainer.appendChild(cancelBtn);
        } 
        // Se existe mas não está no container correto, mover para o container
        else if (!controlsContainer.contains(cancelBtn)) {
            cancelBtn.parentNode.removeChild(cancelBtn);
            controlsContainer.appendChild(cancelBtn);
        }
    }

    // Observer para monitorar novos cards
    function setupCardObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                            console.log("[Cancel Fix] Novo card detectado, ajustando botão cancelar");
                            adjustCancelButtonInCard(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log("[Cancel Fix] Observer para novos cards configurado");
    }

    // Aplicar todas as correções
    setTimeout(() => {
        fixCancelButtonsPosition();
        setupCardObserver();
        console.log("[Cancel Fix] Todas as correções aplicadas");
    }, 1000);  // Atraso para garantir que o DOM esteja carregado

})();