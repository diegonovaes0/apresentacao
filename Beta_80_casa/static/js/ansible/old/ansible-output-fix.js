/**
 * ansible-execution-fix.js
 * Corrige problemas com duplicação de execuções e saídas do Ansible
 */

(function() {
    console.log("Aplicando correções para execuções de playbooks");
    
    // Flag para controlar se uma execução está em andamento
    window._executionInProgress = false;
    
    // Guarda o timestamp do último clique para limitar a frequência
    window._lastExecutionTime = 0;
    
    // Conjunto para rastrear IDs de job já criados
    window._createdJobIds = new Set();
    
    // Interceptar a função de execução de playbooks
    const originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
    
    window.executeSelectedPlaybooks = function() {
        console.log("Interceptando execução de playbooks");
        
        // Verificar se já há uma execução em andamento
        if (window._executionInProgress) {
            console.log("Execução já em andamento, ignorando clique");
            window.showMessage("Há uma execução em andamento, aguarde...", "warning");
            return;
        }
        
        // Verificar tempo desde a última execução (limitar a 1 clique a cada 3 segundos)
        const now = Date.now();
        if (now - window._lastExecutionTime < 3000) {
            const remainingTime = Math.ceil((3000 - (now - window._lastExecutionTime)) / 1000);
            console.log(`Aguarde ${remainingTime} segundo(s) antes de executar novamente`);
            window.showMessage(`Aguarde ${remainingTime} segundo(s) antes de executar novamente`, "warning");
            return;
        }
        
        // Atualizar timestamp da última execução
        window._lastExecutionTime = now;
        window._executionInProgress = true;
        
        try {
            // Limpar qualquer execução anterior
            clearDuplicateExecutionCards();
            
            // Chamar a função original
            if (typeof originalExecuteSelectedPlaybooks === 'function') {
                originalExecuteSelectedPlaybooks();
            } else {
                console.error("Função original executeSelectedPlaybooks não encontrada");
            }
        } finally {
            // Liberar o bloqueio após um atraso (para evitar que o usuário clique novamente imediatamente)
            setTimeout(() => {
                window._executionInProgress = false;
                console.log("Bloqueio de execução liberado");
            }, 3000);
        }
    };
    
    // Também criar o alias executePlaybooks se necessário
    if (typeof window.executePlaybooks !== 'function') {
        window.executePlaybooks = window.executeSelectedPlaybooks;
        console.log("Alias executePlaybooks criado para executeSelectedPlaybooks");
    }
    
    // Limpar cards de execução duplicados
    function clearDuplicateExecutionCards() {
        const executionContainer = document.getElementById('running-playbooks');
        if (!executionContainer) return;
        
        // Obter os cards de execução
        const cards = Array.from(executionContainer.querySelectorAll('.execution-card'));
        
        // Mapear playbooks para cards
        const playbookCards = {};
        
        cards.forEach(card => {
            const playbookName = card.getAttribute('data-playbook-name');
            if (playbookName) {
                if (!playbookCards[playbookName]) {
                    playbookCards[playbookName] = [];
                }
                playbookCards[playbookName].push(card);
            }
        });
        
        // Remover cards duplicados (manter apenas o mais recente)
        Object.values(playbookCards).forEach(cardsForPlaybook => {
            if (cardsForPlaybook.length > 1) {
                console.log(`Encontrados ${cardsForPlaybook.length} cards para a playbook ${cardsForPlaybook[0].getAttribute('data-playbook-name')}`);
                
                // Ordenar por data de criação (mais recentes primeiro)
                cardsForPlaybook.sort((a, b) => {
                    const idA = a.getAttribute('data-job-id') || '';
                    const idB = b.getAttribute('data-job-id') || '';
                    
                    // Extrair timestamp do ID (formato: nome_timestamp)
                    const timestampA = parseInt(idA.split('_').pop()) || 0;
                    const timestampB = parseInt(idB.split('_').pop()) || 0;
                    
                    return timestampB - timestampA;
                });
                
                // Manter apenas o card mais recente
                for (let i = 1; i < cardsForPlaybook.length; i++) {
                    console.log(`Removendo card duplicado para ${cardsForPlaybook[i].getAttribute('data-playbook-name')}`);
                    cardsForPlaybook[i].remove();
                }
            }
        });
    }
    
    // Interceptar a função de criação de cards
    const originalCreateExecutionCard = window.createExecutionCard;
    
    window.createExecutionCard = function(playbookName, hosts, jobId) {
        console.log("Interceptando criação de card de execução:", playbookName, jobId);
        
        // Verificar se já temos um card para esse job
        if (window._createdJobIds.has(jobId)) {
            console.log(`Card para o job ${jobId} já foi criado, ignorando duplicação`);
            return document.querySelector(`[data-job-id="${jobId}"]`);
        }
        
        // Registrar o job ID
        window._createdJobIds.add(jobId);
        
        // Chamar a função original
        const card = originalCreateExecutionCard(playbookName, hosts, jobId);
        
        return card;
    };
    
    // Corrigir formatação de saída duplicada
    const originalFormatAnsibleOutput = window.formatAnsibleOutput;
    
    window.formatAnsibleOutput = function(output) {
        console.log("Interceptando formatação de saída do Ansible");
        
        // Remover linhas duplicadas na saída
        if (output) {
            const uniqueLines = [];
            const lines = output.split('\n');
            const seenLines = new Set();
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Verificar se a linha e a próxima são idênticas (padrão de duplicação)
                if (i < lines.length - 1 && line === lines[i + 1].trim()) {
                    // Ignorar linha duplicada
                    continue;
                }
                
                // Verificar padrões específicos de duplicação (como cabeçalhos)
                if (line.startsWith('**PLAY') || line.startsWith('**TASK')) {
                    if (seenLines.has(line)) {
                        continue;
                    }
                    seenLines.add(line);
                }
                
                uniqueLines.push(lines[i]);
            }
            
            output = uniqueLines.join('\n');
        }
        
        // Chamar a função original com saída limpa
        if (typeof originalFormatAnsibleOutput === 'function') {
            return originalFormatAnsibleOutput(output);
        } else {
            // Formatação básica se a função original não estiver disponível
            return `<pre style="font-family: monospace; white-space: pre-wrap; font-size: 12px; line-height: 1.5;">${output}</pre>`;
        }
    };
    
    // Correção adicional para a função toggleOutput (remover duplicações na saída ao mostrar)
    const originalToggleOutput = window.toggleOutput;
    
    window.toggleOutput = function(button) {
        console.log("Interceptando toggle de saída");
        
        const card = button.closest('.execution-card');
        if (!card) return;
        
        const output = card.querySelector('.ansible-output');
        if (!output) return;
        
        const isVisible = output.style.display === 'block';
        
        // Se estamos mostrando a saída, garantir que ela não tenha duplicações
        if (!isVisible) {
            const jobId = card.getAttribute('data-job-id');
            if (jobId) {
                // Buscar a saída atualizada do servidor
                console.log("Buscando saída atualizada para o job:", jobId);
                
                fetch(`/api/status/${jobId}`)
                    .then(response => response.json())
                    .then(data => {
                        // Formatar a saída (com remoção de duplicações)
                        output.innerHTML = window.formatAnsibleOutput(data.output || "");
                        
                        // Alternar a visibilidade
                        output.style.display = 'block';
                        
                        // Atualizar o botão
                        button.innerHTML = `
                            Ver Menos
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                                <path d="M18 15l-6-6-6 6"/>
                            </svg>
                        `;
                    })
                    .catch(error => {
                        console.error("Erro ao buscar saída:", error);
                        
                        // Cair para o método original em caso de erro
                        if (typeof originalToggleOutput === 'function') {
                            originalToggleOutput(button);
                        } else {
                            output.style.display = 'block';
                            button.textContent = 'Ver Menos';
                        }
                    });
                
                return; // Retorna aqui para evitar chamada da função original
            }
        }
        
        // Se estamos escondendo a saída, ou não conseguimos buscar a saída atualizada, use a função original
        if (typeof originalToggleOutput === 'function') {
            originalToggleOutput(button);
        } else {
            // Implementação básica
            output.style.display = isVisible ? 'none' : 'block';
            button.textContent = isVisible ? 'Ver Mais' : 'Ver Menos';
        }
    };
    
    console.log("Correções para execuções de playbooks aplicadas com sucesso");
})();