/**
 * ansible-baseline-multi-host-fix.js
 * 
 * Solução unificada para problemas com o baseline:
 * - Corrige problemas de saída do Ansible para playbooks de baseline em múltiplos hosts
 * - Elimina cards duplicados durante a execução do baseline
 * - Normaliza o comportamento do baseline para que funcione como outras playbooks
 * - Mantém compatibilidade com o sistema existente
 * 
 * @version 1.0.0
 */

(function() {
    console.log("Inicializando correções para baseline multi-host");
    
    // Registro global para rastrear execuções e evitar duplicações
    const executionTracker = {
        activeJobs: new Map(),
        hostExecutions: new Map(),
        
        // Verifica se uma playbook já está em execução para um host específico
        isRunning: function(playbookName, hostname) {
            const key = `${playbookName}|${hostname}`;
            return this.hostExecutions.has(key);
        },
        
        // Rastreia uma nova execução
        trackExecution: function(playbookName, hostname, jobId) {
            const key = `${playbookName}|${hostname}`;
            this.hostExecutions.set(key, jobId);
            this.activeJobs.set(jobId, {playbookName, hostname});
            
            // Define um timeout para remover automaticamente após 10 minutos
            setTimeout(() => {
                this.hostExecutions.delete(key);
                this.activeJobs.delete(jobId);
            }, 10 * 60 * 1000);
            
            return true;
        },
        
        // Remove uma execução do rastreamento
        removeExecution: function(jobId) {
            const execution = this.activeJobs.get(jobId);
            if (execution) {
                const key = `${execution.playbookName}|${execution.hostname}`;
                this.hostExecutions.delete(key);
                this.activeJobs.delete(jobId);
                return true;
            }
            return false;
        },
        
        // Limpa todas as execuções
        clearAll: function() {
            this.hostExecutions.clear();
            this.activeJobs.clear();
            return true;
        }
    };
    
    /**
     * Verifica se uma playbook é do tipo baseline
     * @param {string} name - Nome da playbook
     * @return {boolean} - Verdadeiro se for uma playbook de baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return nameLower.includes('baseline') || 
               nameLower.includes('configuracao-base') || 
               nameLower.includes('config-base');
    }
    
    /**
     * Intercepta a função executeSelectedPlaybooks para tratar corretamente múltiplos hosts
     */
    function fixBaselineExecutionFunction() {
        // Guarda referência para a função original
        if (typeof window.originalExecuteSelectedPlaybooks === 'undefined' && 
            typeof window.executeSelectedPlaybooks === 'function') {
                
            window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
            
            // Implementa a nova versão que trata corretamente múltiplos hosts
            window.executeSelectedPlaybooks = function() {
                console.log("Função executeSelectedPlaybooks interceptada para suporte a múltiplos hosts");
                
                // Verifica se tem playbook de baseline selecionada
                const selectedPlaybooks = getSelectedPlaybooks();
                const hasBaseline = selectedPlaybooks.some(isBaselinePlaybook);
                
                if (!hasBaseline) {
                    // Se não for baseline, simplesmente delega para a função original
                    return window.originalExecuteSelectedPlaybooks();
                }
                
                // Detectar hosts selecionados
                const selectedHosts = getSelectedHosts();
                
                if (selectedHosts.length === 0) {
                    // Sem hosts selecionados, chama a função original
                    return window.originalExecuteSelectedPlaybooks();
                }
                
                console.log(`Baseline selecionado com ${selectedHosts.length} hosts`);
                
                // Se for apenas um host, não precisamos de tratamento especial
                if (selectedHosts.length === 1) {
                    return window.originalExecuteSelectedPlaybooks();
                }
                
                // Com múltiplos hosts, precisamos tratar cada um separadamente
                // para evitar problemas com a saída
                executeMultiHostBaseline(selectedPlaybooks, selectedHosts);
                
                // Não chamamos a função original, pois implementamos nosso próprio método
                return false;
            };
        }
    }
    
    /**
     * Obtém todos os playbooks selecionados atualmente
     * @returns {Array} - Array de objetos de playbook
     */
    function getSelectedPlaybooks() {
        const selected = [];
        document.querySelectorAll('.playbook-item.selected').forEach(item => {
            const name = item.getAttribute('data-playbook-name');
            if (name) {
                selected.push({
                    name: name,
                    element: item
                });
            }
        });
        return selected;
    }
    
    /**
     * Obtém todos os hosts selecionados atualmente
     * @returns {Array} - Array de nomes de host
     */
    function getSelectedHosts() {
        const selected = [];
        document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.dataset.hostname) {
                selected.push(checkbox.dataset.hostname);
            }
        });
        return selected;
    }
    
    /**
     * Executa playbooks de baseline para múltiplos hosts individualmente
     * @param {Array} playbooks - Array de objetos de playbook
     * @param {Array} hosts - Array de nomes de host
     */
    function executeMultiHostBaseline(playbooks, hosts) {
        console.log(`Executando baseline para múltiplos hosts (${hosts.length})`);
        
        // Filtra apenas os playbooks de baseline
        const baselinePlaybooks = playbooks.filter(p => isBaselinePlaybook(p.name));
        
        if (baselinePlaybooks.length === 0) {
            console.log("Nenhum playbook de baseline selecionado");
            return;
        }
        
        // Executa cada host separadamente
        hosts.forEach((hostname, index) => {
            // Adiciona um pequeno atraso para evitar sobrecarga
            setTimeout(() => {
                console.log(`Executando baseline para host: ${hostname}`);
                
                // Obtém variáveis extras específicas para este host
                const extraVars = getHostExtraVars(hostname);
                
                // Executa cada playbook de baseline para este host
                baselinePlaybooks.forEach(playbook => {
                    executeSingleHostBaseline(playbook.name, hostname, extraVars);
                });
                
            }, index * 500); // Atraso escalonado para evitar problemas de concorrência
        });
        
        // Informa ao usuário o que está acontecendo
        showMessage(`Executando baseline para ${hosts.length} hosts individualmente. Os cards aparecerão em sequência.`, "info");
    }
    
    /**
     * Executa um único playbook de baseline para um único host
     * @param {string} playbookName - Nome do playbook
     * @param {string} hostname - Nome do host
     * @param {Object} extraVars - Variáveis extras para o playbook
     */
    function executeSingleHostBaseline(playbookName, hostname, extraVars = {}) {
        // Verifica se esta combinação já está em execução
        if (executionTracker.isRunning(playbookName, hostname)) {
            console.log(`Playbook ${playbookName} já está em execução para host ${hostname}`);
            showMessage(`O playbook ${playbookName} já está em execução para o host ${hostname}`, "warning");
            return;
        }
        
        // Prepara o payload para a API
        const payload = {
            playbook: playbookName,
            hosts: [hostname],
            extra_vars: extraVars
        };
        
        // Executa o playbook para este host
        fetch('/api/run', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        }).then(response => response.json())
          .then(data => {
              console.log(`Playbook iniciado para ${hostname}, job_id: ${data.job_id}`);
              
              // Rastreia a execução para evitar duplicação
              executionTracker.trackExecution(playbookName, hostname, data.job_id);
              
              // Cria manualmente o card se necessário
              ensureExecutionCard(playbookName, hostname, data.job_id);
          })
          .catch(error => {
              console.error(`Erro ao executar baseline para ${hostname}:`, error);
              showMessage(`Erro ao executar baseline para ${hostname}: ${error.message}`, "error");
          });
    }
    
    /**
     * Obtém variáveis extras específicas para um host
     * @param {string} hostname - Nome do host
     * @returns {Object} - Objeto com variáveis extras
     */
    function getHostExtraVars(hostname) {
        const extraVars = {};
        
        // Tenta obter valores de campos de configuração de baseline, se existirem
        const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
        const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
        const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
        
        if (hostnameField && hostnameField.value) {
            extraVars.new_hostname = hostnameField.value;
        }
        
        if (parceiroPasswordField && parceiroPasswordField.value) {
            extraVars.parceiro_password = parceiroPasswordField.value;
            extraVars.user_password = parceiroPasswordField.value;
        }
        
        if (rootPasswordField && rootPasswordField.value) {
            extraVars.root_password = rootPasswordField.value;
            extraVars.admin_password = rootPasswordField.value;
        }
        
        return extraVars;
    }
    
    /**
     * Garante que exista um card de execução para a combinação playbook/host
     * @param {string} playbookName - Nome do playbook
     * @param {string} hostname - Nome do host
     * @param {string} jobId - ID do job
     */
    function ensureExecutionCard(playbookName, hostname, jobId) {
        // Verifica se o card já existe
        const existingCard = document.querySelector(`.execution-card[data-job-id="${jobId}"]`);
        if (existingCard) return;
        
        // Verifica se a função de criação de card existe
        if (typeof window.createExecutionCard === 'function') {
            // Cria um novo card usando a função existente
            const hostSet = new Set([hostname]);
            window.createExecutionCard(playbookName, hostSet, jobId);
        } else {
            // Implementação alternativa para criar o card
            createFallbackExecutionCard(playbookName, hostname, jobId);
        }
    }
    
    /**
     * Implementação alternativa para criar o card de execução
     * @param {string} playbookName - Nome do playbook
     * @param {string} hostname - Nome do host
     * @param {string} jobId - ID do job
     */
    function createFallbackExecutionCard(playbookName, hostname, jobId) {
        const container = document.getElementById('running-playbooks');
        if (!container) return;
        
        const cardId = `execution-card-${jobId}`;
        
        const card = document.createElement('div');
        card.id = cardId;
        card.className = 'execution-card';
        card.setAttribute('data-job-id', jobId);
        card.setAttribute('data-playbook-name', playbookName);
        
        // HTML interno do card
        card.innerHTML = `
            <div class="card-header">
                <h3>${playbookName}</h3>
                <div class="button-group">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="toggle-output-btn">
                        Ver Mais
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="host-info">
                <div class="host-details" data-host="${hostname}">
                    <p><strong>Hostname:</strong> <span>${hostname}</span></p>
                </div>
            </div>
            <div class="ansible-output" style="display: none;"></div>
            <div class="task-status">Em execução...</div>
        `;
        
        // Adicionar eventos
        card.querySelector('.cancel-btn').addEventListener('click', function() {
            if (typeof window.cancelExecution === 'function') {
                window.cancelExecution(this);
            }
        });
        
        card.querySelector('.toggle-output-btn').addEventListener('click', function() {
            if (typeof window.toggleOutput === 'function') {
                window.toggleOutput(this);
            }
        });
        
        // Adicionar ao início do container
        if (container.firstChild) {
            container.insertBefore(card, container.firstChild);
        } else {
            container.appendChild(card);
        }
        
        // Iniciar monitoramento da execução
        if (typeof window.monitorPlaybookExecution === 'function') {
            window.monitorPlaybookExecution(jobId, card);
        }
    }
    
    /**
     * Intercepta a função monitorPlaybookExecution para melhorar a exibição da saída
     */
    function fixOutputDisplay() {
        if (typeof window.originalMonitorPlaybookExecution === 'undefined' && 
            typeof window.monitorPlaybookExecution === 'function') {
                
            window.originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
            
            window.monitorPlaybookExecution = function(jobId, card) {
                console.log(`Monitorando execução aprimorada para job ${jobId}`);
                
                const playbookName = card.getAttribute('data-playbook-name');
                const isBaseline = isBaselinePlaybook(playbookName);
                
                // Busca elementos importantes no card
                const outputDiv = card.querySelector('.ansible-output');
                const progressBar = card.querySelector('.progress-bar');
                
                // Rastreia para evitar duplicação
                if (executionTracker.activeJobs.has(jobId)) {
                    console.log(`Job ${jobId} já está sendo monitorado`);
                }
                
                // Função para processar a saída do baseline de forma melhorada
                function processBaselineOutput(output) {
                    // Formata a saída para melhor visualização
                    if (!output) return '<em>Aguardando saída...</em>';
                    
                    // Coloriza comandos e status
                    let formatted = output
                        .replace(/PLAY\s*\[(.*?)\]/g, '<div class="output-play">PLAY [$1]</div>')
                        .replace(/TASK\s*\[(.*?)\]/g, '<div class="output-task">TASK [$1]</div>')
                        .replace(/ok:/g, '<span class="output-ok">ok:</span>')
                        .replace(/changed:/g, '<span class="output-changed">changed:</span>')
                        .replace(/failed:/g, '<span class="output-failed">failed:</span>')
                        .replace(/skipping:/g, '<span class="output-skipped">skipping:</span>')
                        .replace(/PLAY RECAP/g, '<div class="output-recap">PLAY RECAP</div>');
                    
                    return formatted;
                }
                
                // Implementa a verificação periódica de status com processamento melhorado
                function checkStatus() {
                    fetch(`/api/status/${jobId}`)
                        .then(response => response.json())
                        .then(data => {
                            // Atualiza a barra de progresso se existir
                            if (progressBar) {
                                progressBar.style.width = `${data.progress || 0}%`;
                            }
                            
                            // Atualiza a saída com formatação melhorada
                            if (outputDiv && data.output) {
                                if (isBaseline) {
                                    outputDiv.innerHTML = processBaselineOutput(data.output);
                                } else if (typeof window.formatAnsibleOutput === 'function') {
                                    outputDiv.innerHTML = window.formatAnsibleOutput(data.output);
                                } else {
                                    outputDiv.innerHTML = `<pre>${data.output}</pre>`;
                                }
                                
                                // Rola para o final
                                outputDiv.scrollTop = outputDiv.scrollHeight;
                            }
                            
                            // Verificar se o job finalizou
                            if (data.status !== 'running') {
                                // Remover do rastreador
                                executionTracker.removeExecution(jobId);
                                
                                // Atualizar status do card
                                if (typeof window.handlePlaybookCompletion === 'function') {
                                    window.handlePlaybookCompletion(data.status, card);
                                }
                            } else {
                                // Continuar monitorando
                                setTimeout(checkStatus, 2000);
                            }
                        })
                        .catch(error => {
                            console.error(`Erro ao monitorar job ${jobId}:`, error);
                            // Tentar novamente após um período
                            setTimeout(checkStatus, 5000);
                        });
                }
                
                // Inicia a verificação
                checkStatus();
                
                // Também chama a função original para compatibilidade
                try {
                    window.originalMonitorPlaybookExecution(jobId, card);
                } catch (error) {
                    console.error("Erro ao chamar monitor original:", error);
                }
            };
        }
    }
    
    /**
     * Intercepta a função toggleOutput para melhorar a exibição da saída
     */
    function fixToggleOutputFunction() {
        if (typeof window.originalToggleOutput === 'undefined' && 
            typeof window.toggleOutput === 'function') {
                
            window.originalToggleOutput = window.toggleOutput;
            
            window.toggleOutput = function(button) {
                const card = button.closest('.execution-card');
                if (!card) return window.originalToggleOutput(button);
                
                const playbookName = card.getAttribute('data-playbook-name');
                const isBaseline = isBaselinePlaybook(playbookName);
                
                // Para baseline, adicionar classe especial
                if (isBaseline) {
                    card.classList.toggle('baseline-output-visible');
                }
                
                // Chamar função original
                return window.originalToggleOutput(button);
            };
        }
    }
    
    /**
     * Adiciona estilos necessários para melhorar a visualização
     */
    function addBaselineStyles() {
        // Verificar se os estilos já existem
        if (document.getElementById('baseline-multi-host-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'baseline-multi-host-styles';
        style.textContent = `
            /* Melhorias na visualização da saída */
            .ansible-output {
                max-height: 500px;
                overflow-y: auto;
                font-family: "Courier New", monospace;
                padding: 12px;
                background-color: #1e1e1e;
                color: #d4d4d4;
                border-radius: 4px;
            }
            
            /* Estilos de formatação para saídas do Ansible */
            .output-play {
                color: #569cd6;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
            }
            
            .output-task {
                color: #9cdcfe;
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
                margin-left: 8px;
            }
            
            .output-ok {
                color: #4EC9B0;
                font-weight: bold;
            }
            
            .output-changed {
                color: #CE9178;
                font-weight: bold;
            }
            
            .output-failed {
                color: #F14C4C;
                font-weight: bold;
            }
            
            .output-skipped {
                color: #808080;
                font-weight: bold;
            }
            
            .output-recap {
                color: #569cd6;
                font-weight: bold;
                margin-top: 15px;
                margin-bottom: 5px;
                padding-top: 5px;
                border-top: 1px solid #333;
            }
            
            /* Animação para o spinner de progresso */
            @keyframes rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .ansible-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #333;
                border-top-color: #4CAF50;
                border-radius: 50%;
                animation: rotate 1s linear infinite;
                margin-right: 5px;
            }
            
            /* Estilos para mensagens */
            .message-notification {
                padding: 10px 15px;
                border-radius: 4px;
                margin-bottom: 10px;
                border-left: 4px solid #2196F3;
                background-color: rgba(33, 150, 243, 0.1);
                color: #2196F3;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .message-notification.success {
                border-left-color: #4CAF50;
                background-color: rgba(76, 175, 80, 0.1);
                color: #4CAF50;
            }
            
            .message-notification.error {
                border-left-color: #F44336;
                background-color: rgba(244, 67, 54, 0.1);
                color: #F44336;
            }
            
            .message-notification.warning {
                border-left-color: #FF9800;
                background-color: rgba(255, 152, 0, 0.1);
                color: #FF9800;
            }
            
            /* Estilo específico para cards de baseline */
            .execution-card[data-playbook-name*="baseline"] .card-header,
            .execution-card[data-playbook-name*="configuracao-base"] .card-header {
                border-left: 3px solid #FFD600;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Mostra uma mensagem na interface
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
        
        // Implementação própria
        const container = document.getElementById('running-playbooks');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = `message-notification ${type}`;
        message.innerHTML = `
            <span>${text}</span>
            <button style="background: none; border: none; cursor: pointer;">✕</button>
        `;
        
        message.querySelector('button').addEventListener('click', () => {
            message.remove();
        });
        
        container.insertBefore(message, container.firstChild);
        
        if (duration > 0) {
            setTimeout(() => {
                if (document.body.contains(message)) {
                    message.remove();
                }
            }, duration);
        }
    }
    
    /**
     * Função para limpar os cards de execução de playbooks
     */
    function fixClearPlaybooksFunction() {
        // Sobrescreve a função clearRunningPlaybooks para limpar também o rastreador
        if (typeof window.originalClearRunningPlaybooks !== 'function' && 
            typeof window.clearRunningPlaybooks === 'function') {
                
            window.originalClearRunningPlaybooks = window.clearRunningPlaybooks;
            
            window.clearRunningPlaybooks = function() {
                // Limpar o rastreador
                executionTracker.clearAll();
                
                // Chamar a função original
                return window.originalClearRunningPlaybooks();
            };
        }
    }
    
    /**
     * Inicializa todas as correções
     */
    function initialize() {
        console.log("Inicializando correções para baseline multi-host");
        
        // Adicionar estilos
        addBaselineStyles();
        
        // Corrigir funções
        fixBaselineExecutionFunction();
        fixOutputDisplay();
        fixToggleOutputFunction();
        fixClearPlaybooksFunction();
        
        console.log("✅ Correções para baseline multi-host aplicadas com sucesso");
    }
    
    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Se o DOM já estiver carregado, inicializar imediatamente
        initialize();
    }
})();