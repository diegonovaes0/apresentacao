/**
 * multi-host-execution-controller.js
 * 
 * Controlador para criar execuções individuais por host em cards separados,
 * mantendo a exibição correta da saída do Ansible
 */

(function() {
    // Prevenir múltiplas inicializações
    if (window.multiHostControllerInitialized) {
        console.log("Controlador multi-host já inicializado");
        return;
    }
    
    // Guardar referências às funções originais
    const originalExecuteFunction = window.executeSelectedPlaybooks;
    const originalCreateExecutionCard = window.createExecutionCard;
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;

    // Substituir a função de execução
    window.executeSelectedPlaybooks = function() {
        console.log("Função de execução multi-host ativada");
        
        const selectedHostsElements = document.querySelectorAll('.host-banner.valid.selected');
        if (!selectedHostsElements.length) {
            console.log("Nenhum host selecionado");
            showMessage("Selecione pelo menos um host", "warning");
            return originalExecuteFunction();
        }

        const selectedPlaybooksElements = document.querySelectorAll('.playbook-item.selected');
        if (!selectedPlaybooksElements.length) {
            console.log("Nenhuma playbook selecionada");
            showMessage("Selecione pelo menos uma playbook", "warning");
            return originalExecuteFunction();
        }

        // Obter hosts e playbooks
        const hostsList = Array.from(selectedHostsElements)
            .map(host => host.querySelector('input[type="checkbox"]')?.dataset?.hostname)
            .filter(Boolean);
        
        const playbooks = Array.from(selectedPlaybooksElements)
            .map(item => ({
                name: item.getAttribute('data-playbook-name'),
                path: item.getAttribute('data-playbook-path')
            }))
            .filter(pb => pb.name && pb.path);

        // Executar para cada host individualmente
        hostsList.forEach(hostname => {
            playbooks.forEach(playbook => {
                // Criar um card para cada combinação host/playbook
                const jobId = `${playbook.name}_${hostname}_${Date.now()}`;
                const hostSet = new Set([hostname]);
                const card = originalCreateExecutionCard(playbook.name, hostSet, jobId);
                
                const executionContainer = document.getElementById('running-playbooks');
                if (executionContainer) {
                    executionContainer.insertBefore(card, executionContainer.firstChild);
                }

                // Executar a playbook para este host específico
                fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playbook: playbook.path,
                        hosts: [hostname],
                        extra_vars: getBaselineExtraVars(hostname) // Suporte para baseline
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);
                    
                    card.dataset.jobId = data.job_id;
                    runningJobs.set(data.job_id, card);
                    monitorPlaybookExecution(data.job_id, card);
                })
                .catch(error => {
                    console.error(`Erro ao executar ${playbook.name} em ${hostname}:`, error);
                    card.classList.add('failed');
                    handlePlaybookCompletion('failed', card);
                    card.querySelector('.ansible-output').innerHTML = 
                        `<div style="color: var(--error-red);">${error.message}</div>`;
                });
            });
        });

        return; // Evita chamar a função original
    };

    // Função auxiliar para obter variáveis extras do baseline
    function getBaselineExtraVars(hostname) {
        if (!window.BaselineIntegration) return {};
        
        const banner = document.getElementById(`baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (!banner) return {};

        return {
            new_hostname: banner.querySelector(`#baseline-hostname-${hostname}`)?.value || hostname,
            parceiro_password: banner.querySelector(`#baseline-parceiro-password-${hostname}`)?.value,
            root_password: banner.querySelector(`#baseline-root-password-${hostname}`)?.value,
            user_password: banner.querySelector(`#baseline-parceiro-password-${hostname}`)?.value,
            admin_password: banner.querySelector(`#baseline-root-password-${hostname}`)?.value
        };
    }

    // Ajustar o monitoramento para garantir saída correta
    window.monitorPlaybookExecution = function(jobId, card) {
        const progressBar = card.querySelector('.progress-bar');
        const outputDiv = card.querySelector('.ansible-output');
        const statusDiv = card.querySelector('.task-status');
        
        let pollInterval = 1000;
        const maxInterval = 5000;

        function updateProgress() {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Atualizar saída
                    if (data.output) {
                        outputDiv.innerHTML = formatAnsibleOutput(data.output);
                    }

                    // Atualizar progresso
                    if (progressBar && data.progress) {
                        progressBar.style.width = `${data.progress}%`;
                    }

                    // Atualizar status
                    if (statusDiv) {
                        statusDiv.textContent = data.status === 'running' ? 
                            'Em execução...' : 
                            data.status === 'completed' ? 'Concluído' : 
                            data.status === 'failed' ? 'Falhou' : 'Cancelado';
                    }

                    // Continuar monitoramento ou finalizar
                    if (data.status === 'running') {
                        pollInterval = Math.min(pollInterval * 1.2, maxInterval);
                        setTimeout(updateProgress, pollInterval);
                    } else {
                        handlePlaybookCompletion(data.status, card);
                    }
                })
                .catch(error => {
                    console.error(`Erro ao monitorar ${jobId}:`, error);
                    outputDiv.innerHTML = `<div style="color: var(--error-red);">${error.message}</div>`;
                    handlePlaybookCompletion('failed', card);
                });
        }

        updateProgress();
    };

    // Formatar saída preservando funcionalidade original
    function formatOutputForHost(output, hostname) {
        if (!output) return '<em>Aguardando saída...</em>';
        
        const lines = output.split('\n');
        let formatted = '<div class="ansible-output-container">';
        
        lines.forEach(line => {
            if (!line.trim()) {
                formatted += '<br>';
                return;
            }

            if (line.includes(hostname) || 
                line.startsWith('PLAY ') || 
                line.startsWith('TASK ') || 
                line.includes('PLAY RECAP')) {
                formatted += `<div>${formatAnsibleOutput(line)}</div>`;
            }
        });
        
        formatted += '</div>';
        return formatted;
    }

    // Adicionar estilos
    function addStyles() {
        if (document.getElementById('multi-host-controller-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'multi-host-controller-styles';
        style.textContent = `
            .execution-card {
                margin-bottom: 16px;
                position: relative;
            }
            .execution-card .host-details {
                font-size: 12px;
                margin: 8px 0;
            }
            .ansible-output-container {
                font-family: monospace;
                white-space: pre-wrap;
                max-height: 400px;
                overflow-y: auto;
            }
        `;
        document.head.appendChild(style);
    }

    // Inicializar
    function initialize() {
        addStyles();
        window.multiHostControllerInitialized = true;
        console.log("Controlador multi-host inicializado");
    }

    // Iniciar quando o DOM estiver carregado
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();