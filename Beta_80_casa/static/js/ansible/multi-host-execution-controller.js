/**
 * multi-host-execution-controller.js
 * 
 * Este script melhora o sistema Ansible criando execuções individuais 
 * para cada host quando múltiplos hosts são selecionados.
 * 
 * Cada host terá seu próprio card de execução, facilitando o monitoramento
 * e controle de cada host de forma independente.
 */

(function() {
    // Registrar início da inicialização
    console.log("Inicializando controlador de execução multi-host...");
    
    // Prevenir múltiplas inicializações
    if (window.multiHostControllerInitialized) {
        console.log("Controlador multi-host já inicializado");
        return;
    }
    
    // Guardar referência à função original de execução
    const originalExecuteFunction = window.executeSelectedPlaybooks;
    
    // Substituir a função de execução
    window.executeSelectedPlaybooks = function() {
        console.log("Função de execução multi-host ativada");
        
        // Verificar se há hosts selecionados
        const selectedHostsElements = document.querySelectorAll('.host-banner.valid.selected');
        if (!selectedHostsElements || selectedHostsElements.length === 0) {
            console.log("Nenhum host selecionado, usando função original");
            showMessage("Selecione pelo menos um host para executar", "warning");
            return;
        }
        
        // Obter hosts selecionados
        const hostsList = Array.from(selectedHostsElements).map(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            return checkbox?.dataset?.hostname;
        }).filter(Boolean);
        
        console.log(`Hosts selecionados: ${hostsList.join(", ")}`);
        
        // Verificar se há playbooks selecionadas
        const selectedPlaybooksElements = document.querySelectorAll('.playbook-item.selected');
        if (!selectedPlaybooksElements || selectedPlaybooksElements.length === 0) {
            console.log("Nenhuma playbook selecionada, usando função original");
            showMessage("Selecione pelo menos uma playbook para executar", "warning");
            return;
        }
        
        // Obter playbooks selecionadas
        const playbooks = Array.from(selectedPlaybooksElements).map(item => {
            return {
                name: item.getAttribute('data-playbook-name'),
                path: item.getAttribute('data-playbook-path'),
                description: item.querySelector('h4')?.textContent || item.getAttribute('data-playbook-name')
            };
        }).filter(pb => pb.name && pb.path);
        
        console.log(`Playbooks selecionadas: ${playbooks.map(p => p.name).join(", ")}`);
        
        // Interceptar a função fetch para processar cada host individualmente
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            // Verificar se é uma execução de playbook
            if (url === '/api/run' && options && options.method === 'POST') {
                try {
                    // Verificar se estamos tentando executar em múltiplos hosts
                    const data = JSON.parse(options.body);
                    const executingMultipleHosts = data.hosts && data.hosts.length > 1;
                    
                    // Se estiver executando em múltiplos hosts, bloquear esta requisição e fazer uma por host
                    if (executingMultipleHosts) {
                        console.log(`Interceptando execução para ${data.hosts.length} hosts`);
                        
                        // Criar uma requisição separada para cada host
                        const singleHostPromises = data.hosts.map(host => {
                            const singleHostData = {...data, hosts: [host]};
                            
                            // Criar URL de API
                            return fetch('/api/run', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(singleHostData)
                            }).then(response => response.json());
                        });
                        
                        // Executar todas as requisições paralelamente
                        return Promise.all(singleHostPromises)
                            .then(results => {
                                console.log("Execução multi-host concluída com sucesso", results);
                                return new Response(JSON.stringify({
                                    success: true,
                                    message: `Execução iniciada para ${data.hosts.length} hosts individualmente`
                                }));
                            })
                            .catch(error => {
                                console.error("Erro na execução multi-host:", error);
                                return new Response(JSON.stringify({
                                    error: `Erro ao executar para múltiplos hosts: ${error.message}`
                                }), { status: 500 });
                            });
                    }
                } catch (error) {
                    console.error("Erro ao processar requisição:", error);
                }
            }
            
            // Para outros casos ou hosts únicos, usar função original
            return originalFetch.apply(this, arguments);
        };
        
        // Executar a função original (que agora terá o fetch interceptado)
        const result = originalExecuteFunction();
        
        // Restaurar a função fetch original
        setTimeout(() => {
            window.fetch = originalFetch;
        }, 2000);  // 2 segundos devem ser suficientes para processar todas as requisições
        
        return result;
    };
    
    /**
     * Injeta função de formatação da saída aprimorada para cards individuais por host
     */
    function injectOutputFormatter() {
        window.formatTaskOutput = function(output, hostname) {
            // Filtrar apenas as linhas relevantes para este host
            const lines = output.split('\n');
            let filteredLines = [];
            let isRelevantSection = false;
            let relevantHost = '';
            
            for (const line of lines) {
                // Detectar início de seção de host relevante
                if (line.includes(`TASK [`) && line.includes(`]`)) {
                    isRelevantSection = true;
                    filteredLines.push(line);
                    continue;
                }
                
                // Se é uma linha com "ok:", "changed:", "failed:", verificar o host
                const statusMatch = line.match(/^(ok|changed|failed|skipping|unreachable):\s*\[(.*?)\]/i);
                if (statusMatch) {
                    const currentHost = statusMatch[2].trim();
                    
                    if (currentHost === hostname) {
                        // Este host é relevante para nós
                        relevantHost = currentHost;
                        isRelevantSection = true;
                        filteredLines.push(line);
                    } else {
                        // Outro host, não é relevante
                        isRelevantSection = false;
                    }
                    continue;
                }
                
                // Sempre incluir cabeçalhos de PLAY e TASK
                if (line.startsWith('PLAY [') || line.startsWith('TASK [')) {
                    filteredLines.push(line);
                    continue;
                }
                
                // Incluir linhas de PLAY RECAP para este host
                if (line.includes('PLAY RECAP') || (line.includes(hostname) && line.includes('ok=') && line.includes('changed='))) {
                    filteredLines.push(line);
                    continue;
                }
                
                // Se estamos em uma seção relevante, incluir a linha
                if (isRelevantSection || (relevantHost === hostname)) {
                    filteredLines.push(line);
                }
            }
            
            // Formatar saída filtrada (usando formatação existente, se disponível)
            const formattedOutput = window.formatAnsibleOutput ? 
                window.formatAnsibleOutput(filteredLines.join('\n')) :
                `<pre>${filteredLines.join('\n')}</pre>`;
                
            return formattedOutput;
        };
    }
    
    /**
     * Inicializa o monitoramento para correção de saídas de playbooks
     */
    function initializeOutputFixer() {
        // Monitorar novos cards adicionados ao DOM
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('execution-card')) {
                            enhanceExecutionCard(node);
                        }
                    });
                }
            });
        });
        
        // Iniciar observação no container de execuções
        const runningContainer = document.getElementById('running-playbooks');
        if (runningContainer) {
            observer.observe(runningContainer, { childList: true });
            console.log("Monitoramento de cards de execução iniciado");
            
            // Melhorar cards existentes
            document.querySelectorAll('.execution-card').forEach(card => {
                enhanceExecutionCard(card);
            });
        } else {
            console.log("Container de execução não encontrado, tentando novamente em 1s");
            setTimeout(initializeOutputFixer, 1000);
        }
    }
    
    /**
     * Melhora um card de execução para mostrar apenas resultados relacionados ao host específico
     * @param {HTMLElement} card - Card de execução a ser melhorado
     */
    function enhanceExecutionCard(card) {
        try {
            // Verificar se já foi processado
            if (card.getAttribute('data-multi-host-enhanced') === 'true') {
                return;
            }
            
            card.setAttribute('data-multi-host-enhanced', 'true');
            
            // Obter informações do host deste card
            const hostDetails = card.querySelector('.host-details');
            if (!hostDetails) return;
            
            const hostname = hostDetails.getAttribute('data-host');
            if (!hostname) return;
            
            console.log(`Melhorando card para host: ${hostname}`);
            
            // Identificar o host no título do card
            const titleElement = card.querySelector('.playbook-title strong');
            if (titleElement) {
                const playbookName = titleElement.textContent;
                titleElement.innerHTML = `${playbookName} <span style="font-size: 80%; opacity: 0.8;">[${hostname}]</span>`;
            }
            
            // Override da função de toggle para usar nosso formatador específico por host
            const toggleButton = card.querySelector('.toggle-output-btn');
            if (toggleButton) {
                // Remover listener existente
                const newToggle = toggleButton.cloneNode(true);
                toggleButton.parentNode.replaceChild(newToggle, toggleButton);
                
                // Adicionar novo listener
                newToggle.addEventListener('click', function() {
                    const outputDiv = card.querySelector('.ansible-output');
                    if (!outputDiv) return;
                    
                    const isVisible = outputDiv.style.display === 'block';
                    
                    // Alternar visibilidade
                    outputDiv.style.display = isVisible ? 'none' : 'block';
                    
                    // Atualizar texto do botão
                    this.innerHTML = isVisible ? 
                        'Ver Mais <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' : 
                        'Ver Menos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
                    
                    // Se estamos abrindo a saída, buscar dados atualizados
                    if (!isVisible) {
                        const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                        if (!jobId) return;
                        
                        // Mostrar indicador de carregamento
                        outputDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Carregando saída...</div>';
                        
                        // Buscar dados atualizados
                        fetch(`/api/status/${jobId}`)
                            .then(response => response.json())
                            .then(data => {
                                // Formatar a saída para mostrar apenas os resultados deste host
                                const formattedOutput = window.formatTaskOutput(data.output || "", hostname);
                                outputDiv.innerHTML = formattedOutput;
                            })
                            .catch(error => {
                                console.error(`Erro ao buscar saída para host ${hostname}:`, error);
                                outputDiv.innerHTML = `<div style="color: var(--error-red); padding: 16px;">Erro ao buscar saída: ${error.message}</div>`;
                            });
                    }
                });
            }
        } catch (error) {
            console.error("Erro ao melhorar card de execução:", error);
        }
    }
    
    /**
     * Adiciona estilos necessários
     */
    function addStyles() {
        // Verificar se os estilos já foram adicionados
        if (document.getElementById('multi-host-controller-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'multi-host-controller-styles';
        style.textContent = `
            /* Estilos para melhorar a visualização de cards de execução individuais */
            .execution-card {
                position: relative;
            }
            
            .execution-card[data-multi-host-enhanced="true"] .playbook-title strong {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            
            .execution-card[data-multi-host-enhanced="true"] .host-info {
                padding: 6px 10px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            /* Animação para notificações */
            @keyframes highlightCard {
                0%, 100% { box-shadow: 0 0 0 rgba(255, 214, 0, 0); }
                50% { box-shadow: 0 0 10px rgba(255, 214, 0, 0.5); }
            }
            
            .highlight-animation {
                animation: highlightCard 1.5s ease-in-out 3;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Inicializa o controlador
     */
    function initialize() {
        // Adicionar estilos
        addStyles();
        
        // Injetar formatador de saída
        injectOutputFormatter();
        
        // Inicializar melhorias em cards
        initializeOutputFixer();
        
        // Registrar como inicializado para evitar duplicação
        window.multiHostControllerInitialized = true;
        
        console.log("Controlador de execução multi-host inicializado com sucesso");
    }
    
    // Iniciar quando o DOM estiver completamente carregado
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();