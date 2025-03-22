/**
 * baseline-output-fix.js
 * Corrige a exibição da saída para playbooks de baseline
 */

(function() {
    console.log("Inicializando correção para saída do baseline...");
    
    // Armazenar as funções originais
    const originalProcessAnsibleOutput = typeof processAnsibleOutput === 'function' ? 
        processAnsibleOutput : null;
    
    const originalFormatAnsibleOutput = window.formatAnsibleOutput;
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
    
    /**
     * Verifica se a playbook é do tipo baseline
     * @param {string} playbookName - Nome da playbook
     * @returns {boolean} - true se for baseline, false caso contrário
     */
    function isBaselinePlaybook(playbookName) {
        if (!playbookName) return false;
        const lowerName = playbookName.toLowerCase();
        return lowerName.includes('baseline') || lowerName.includes('configuracao-base');
    }
    
    /**
     * Sobrescreve a função monitorPlaybookExecution para tratar corretamente o baseline
     */
    if (typeof window.monitorPlaybookExecution === 'function') {
        const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
        window.monitorPlaybookExecution = function(jobId, card) { /* ... */ };
      }        console.log(`Monitorando job: ${jobId}`);
        
        // Verificar se é uma playbook de baseline
        const playbookName = card?.dataset?.playbookName || '';
        const isBaseline = isBaselinePlaybook(playbookName);
        
        if (isBaseline) {
            console.log(`Detectada playbook de baseline: ${playbookName}`);
        }
        
        const progressBar = card.querySelector('.progress-bar');
        const outputDiv = card.querySelector('.ansible-output');
        const statusDiv = card.querySelector('.task-status');
        const spinner = card.querySelector('.spinner');
        
        if (spinner) {
            spinner.innerHTML = '<div class="ansible-spinner"></div>';
        }
        
        // Inicializar o estado do job no cache local
        if (!window.jobOutputCache) {
            window.jobOutputCache = {};
        }
        
        window.jobOutputCache[jobId] = {
            lastOutput: '',
            updatedAt: Date.now(),
            status: 'running',
            isBaseline: isBaseline
        };
        
        // Garantir que o output seja visível para baseline
        if (isBaseline && outputDiv) {
            // Inicializar o conteúdo do output para baseline
            outputDiv.innerHTML = '<div class="loading-output">Aguardando saída do baseline...</div>';
            
            // Mostrar o output automaticamente para baselines
            outputDiv.style.display = 'block';
            
            // Atualizar o botão "Ver Mais" para "Ver Menos"
            const toggleBtn = card.querySelector('.toggle-output-btn');
            if (toggleBtn) {
                toggleBtn.innerHTML = `
                    Ver Menos
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                `;
            }
        }
        
        // Função para atualizar o progresso
        function updateProgress() {
            try {
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        const jobCache = window.jobOutputCache[jobId];
                        
                        // Atualizar o progresso
                        if (progressBar) {
                            progressBar.style.width = `${data.progress || 0}%`;
                            
                            // Ajustar cor do progresso
                            if (data.status === 'completed') {
                                progressBar.style.backgroundColor = '#4CAF50'; // Verde
                            } else if (data.status === 'failed') {
                                progressBar.style.backgroundColor = '#f44336'; // Vermelho
                            } else if (data.status === 'cancelled') {
                                progressBar.style.backgroundColor = '#ff9800'; // Laranja
                            }
                        }
                        
                        // Atualizar o status
                        if (statusDiv) {
                            if (data.status === 'running') {
                                statusDiv.textContent = 'Em execução...';
                            } else if (data.status === 'completed') {
                                statusDiv.textContent = 'Concluído com sucesso';
                                statusDiv.className = 'task-status success';
                            } else if (data.status === 'failed') {
                                statusDiv.textContent = 'Falhou';
                                statusDiv.className = 'task-status failed';
                            } else if (data.status === 'cancelled') {
                                statusDiv.textContent = 'Cancelado';
                                statusDiv.className = 'task-status cancelled';
                            }
                        }
                        
                        // Atualizar a saída se temos conteúdo novo
                        if (outputDiv && data.output && data.output !== jobCache.lastOutput) {
                            // Atualizar o cache
                            jobCache.lastOutput = data.output;
                            jobCache.updatedAt = Date.now();
                            
                            // Atualizar o output adequadamente para baseline
                            if (isBaseline) {
                                // Formatar saída específica para baseline
                                outputDiv.innerHTML = formatBaselineOutput(data.output, jobId);
                            } else if (typeof window.formatAnsibleOutput === 'function') {
                                // Usar formatação padrão para outros tipos
                                outputDiv.innerHTML = window.formatAnsibleOutput(data.output);
                            } else {
                                // Fallback para formatação simples
                                outputDiv.innerHTML = `<pre>${data.output}</pre>`;
                            }
                            
                            // Rolar para o final
                            outputDiv.scrollTop = outputDiv.scrollHeight;
                        }
                        
                        // Atualizar o estado do job
                        jobCache.status = data.status;
                        
                        // Continuar monitorando ou finalizar
                        if (data.status === 'running') {
                            // Continuar monitoramento com intervalo adaptativo
                            const timeSinceLastUpdate = Date.now() - jobCache.updatedAt;
                            
                            // Se não houve atualizações recentes, aumentar o intervalo
                            const nextInterval = timeSinceLastUpdate > 10000 ? 5000 : 2000;
                            
                            setTimeout(updateProgress, nextInterval);
                        } else {
                            // Remover spinner
                            if (spinner) {
                                spinner.innerHTML = '';
                            }
                            
                            // Atualizar o status do card
                            handlePlaybookCompletion(data.status, card);
                            
                            // Mostrar o output automaticamente em caso de falha
                            if (data.status === 'failed' && outputDiv) {
                                outputDiv.style.display = 'block';
                                
                                // Atualizar o botão "Ver Mais" para "Ver Menos"
                                const toggleBtn = card.querySelector('.toggle-output-btn');
                                if (toggleBtn) {
                                    toggleBtn.innerHTML = `
                                        Ver Menos
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                                            <path d="M18 15l-6-6-6 6"/>
                                        </svg>
                                    `;
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao monitorar job ${jobId}:`, error);
                        // Em caso de erro, tentar novamente em 5 segundos
                        setTimeout(updateProgress, 5000);
                    });
            } catch (error) {
                console.error(`Erro ao processar atualização para job ${jobId}:`, error);
                // Em caso de erro, tentar novamente em 5 segundos
                setTimeout(updateProgress, 5000);
            }
        }
        
        // Iniciar monitoramento
        updateProgress();
        
        // Chamar a função original se não for baseline
        if (!isBaseline && typeof originalMonitorPlaybookExecution === 'function') {
            try {
                // Chamar com try/catch para evitar que erros afetem nossa implementação
                originalMonitorPlaybookExecution(jobId, card);
            } catch (error) {
                console.error("Erro ao chamar monitoramento original:", error);
            }
        }
    };
    
    /**
     * Formata a saída do baseline para exibição
     * @param {string} output - Saída bruta do baseline
     * @param {string} jobId - ID do job
     * @returns {string} - HTML formatado
     */
    function formatBaselineOutput(output, jobId) {

        // Quando detectar uma linha de TASK
    if (line.startsWith('TASK [')) {
        // [código existente]
        
        // Adicionar o spinner à tarefa
        formattedOutput += `
            <div class="baseline-task">
                <div class="task-header">
                    <svg class="task-icon" viewBox="0 0 24 24" width="14" height="14">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span class="task-name">${escapeHtml(currentTaskName)}</span>
                    <div class="task-spinner"></div>
                </div>
                <div class="task-content">
        `;
        

        if (!output) return '<em>Aguardando saída do baseline...</em>';
        
        // Dividir em linhas para processamento
        const lines = output.split('\n');
        let formattedOutput = `
            <div class="baseline-output-container">
                <div class="copy-badge" onclick="copyAnsibleOutput(this)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar
                </div>
        `;
        
        // Variáveis para rastrear o estado atual
        let inPlaySection = false;
        let inTaskSection = false;
        let currentPlayName = '';
        let currentTaskName = '';
        let currentSection = '';
        
        // Processar linha por linha
        formattedOutput += '<div class="baseline-content">';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Detectar PLAY
            if (line.startsWith('PLAY [')) {
                if (inTaskSection) {
                    formattedOutput += '</div></div>'; // Fechar task anterior
                    inTaskSection = false;
                }
                
                if (inPlaySection) {
                    formattedOutput += '</div>'; // Fechar play anterior
                }
                
                currentPlayName = line.match(/PLAY \[(.*?)\]/)[1];
                inPlaySection = true;
                
                formattedOutput += `
                    <div class="baseline-play">
                        <div class="play-header">
                            <svg class="play-icon" viewBox="0 0 24 24" width="16" height="16">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span class="play-name">${escapeHtml(currentPlayName)}</span>
                        </div>
                `;
                
                continue;
            }
            
            // Detectar TASK
            if (line.startsWith('TASK [')) {
                if (inTaskSection) {
                    formattedOutput += '</div></div>'; // Fechar task anterior
                }
                
                currentTaskName = line.match(/TASK \[(.*?)\]/)[1];
                inTaskSection = true;
                
                formattedOutput += `
                    <div class="baseline-task">
                        <div class="task-header">
                            <svg class="task-icon" viewBox="0 0 24 24" width="14" height="14">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <span class="task-name">${escapeHtml(currentTaskName)}</span>
                        </div>
                        <div class="task-content">
                `;
                
                continue;
            }
            
            // Detectar resultados de task (ok, changed, failed, etc.)
            if (line.match(/^(ok|changed|failed|skipping|fatal|unreachable):/)) {
                const status = line.match(/^(ok|changed|failed|skipping|fatal|unreachable):/)[1];
                const parts = line.split('=>');
                const host = parts[0].split(':')[1].trim();
                const details = parts.length > 1 ? parts[1].trim() : '';
                
                formattedOutput += `
                    <div class="result-line ${status}">
                        <span class="result-status">${status}</span>
                        <span class="result-host">[${escapeHtml(host)}]</span>
                        ${details ? `<span class="result-details">${escapeHtml(details)}</span>` : ''}
                    </div>
                `;
                
                continue;
            }
            
            // Detectar linhas de resumo (PLAY RECAP)
            if (line.includes('PLAY RECAP')) {
                if (inTaskSection) {
                    formattedOutput += '</div></div>'; // Fechar task anterior
                    inTaskSection = false;
                }
                
                if (inPlaySection) {
                    formattedOutput += '</div>'; // Fechar play anterior
                    inPlaySection = false;
                }
                
                currentSection = 'recap';
                
                formattedOutput += `
                    <div class="baseline-recap">
                        <div class="recap-header">
                            <svg class="recap-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span class="recap-title">PLAY RECAP</span>
                        </div>
                `;
                
                continue;
            }
            
            // Processar estatísticas no PLAY RECAP
            if (currentSection === 'recap' && line.includes('ok=')) {
                let coloredLine = line;
                
                // Colorir estatísticas
                coloredLine = coloredLine.replace(/ok=(\d+)/, '<span class="stat-ok">ok=$1</span>');
                coloredLine = coloredLine.replace(/changed=(\d+)/, '<span class="stat-changed">changed=$1</span>');
                coloredLine = coloredLine.replace(/unreachable=(\d+)/, '<span class="stat-failed">unreachable=$1</span>');
                coloredLine = coloredLine.replace(/failed=(\d+)/, '<span class="stat-failed">failed=$1</span>');
                
                formattedOutput += `<div class="recap-line">${coloredLine}</div>`;
                continue;
            }
            
            // Linhas normais
            if (inTaskSection) {
                formattedOutput += `<div class="output-line">${escapeHtml(line)}</div>`;
            } else if (currentSection === 'recap') {
                formattedOutput += `<div class="recap-line">${escapeHtml(line)}</div>`;
            } else if (inPlaySection) {
                formattedOutput += `<div class="play-line">${escapeHtml(line)}</div>`;
            } else {
                formattedOutput += `<div class="output-line">${escapeHtml(line)}</div>`;
            }
        }
        
        // Fechar todas as seções abertas
        if (inTaskSection) {
            formattedOutput += '</div></div>'; // Fechar task
        }
        
        if (inPlaySection) {
            formattedOutput += '</div>'; // Fechar play
        }
        
        if (currentSection === 'recap') {
            formattedOutput += '</div>'; // Fechar recap
        }
        
        formattedOutput += '</div>'; // Fechar baseline-content
        formattedOutput += '</div>'; // Fechar baseline-output-container
        
        // Adicionar estilos específicos para baseline
        formattedOutput += `
            <style>
                .baseline-output-container {
                    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.5;
                    position: relative;
                    background: #1e1e1e;
                    color: #d4d4d4;
                    padding: 16px;
                    border-radius: 6px;
                    max-height: 500px;
                    overflow-y: auto;
                }
                
                .baseline-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .copy-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.6);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: white;
                    font-size: 11px;
                    z-index: 10;
                }
                
                .baseline-play {
                    background: #252526;
                    border-radius: 4px;
                    border: 1px solid #333;
                    overflow: hidden;
                }
                
                .play-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                    background: #333;
                    color: #569cd6;
                    font-weight: bold;
                }
                
                .play-icon {
                    fill: none;
                    stroke: #569cd6;
                    stroke-width: 2;
                }
                
                .baseline-task {
                    margin-left: 16px;
                    background: #2d2d2d;
                    border-radius: 4px;
                    border: 1px solid #333;
                    overflow: hidden;
                    margin-bottom: 8px;
                }
                
                .task-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 10px;
                    background: #333;
                    color: #9cdcfe;
                    font-weight: 500;
                }
                
                .task-icon {
                    fill: none;
                    stroke: #9cdcfe;
                    stroke-width: 2;
                }
                
                .task-content {
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .result-line {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding: 4px;
                    border-radius: 3px;
                }
                
                .result-line.ok {
                    background: rgba(76, 175, 80, 0.05);
                    border-left: 2px solid #4CAF50;
                }
                
                .result-line.changed {
                    background: rgba(255, 152, 0, 0.05);
                    border-left: 2px solid #FF9800;
                }
                
                .result-line.failed, .result-line.fatal, .result-line.unreachable {
                    background: rgba(244, 67, 54, 0.05);
                    border-left: 2px solid #F44336;
                }
                
                .result-line.skipping {
                    background: rgba(158, 158, 158, 0.05);
                    border-left: 2px solid #9e9e9e;
                }
                
                .result-status {
                    font-weight: bold;
                    min-width: 70px;
                }
                
                .result-line.ok .result-status { color: #4CAF50; }
                .result-line.changed .result-status { color: #FF9800; }
                .result-line.failed .result-status, 
                .result-line.fatal .result-status,
                .result-line.unreachable .result-status { color: #F44336; }
                .result-line.skipping .result-status { color: #9e9e9e; }
                
                .result-host {
                    color: #9cdcfe;
                    min-width: 120px;
                }
                
                .result-details {
                    flex: 1;
                    color: #bbb;
                    word-break: break-word;
                }
                
                .output-line {
                    white-space: pre-wrap;
                    word-break: break-all;
                    padding: 2px 4px;
                }
                
                .baseline-recap {
                    background: #252526;
                    border-radius: 4px;
                    border: 1px solid #333;
                    overflow: hidden;
                    margin-top: 12px;
                }
                
                .recap-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                    background: #333;
                    color: #569cd6;
                    font-weight: bold;
                }
                
                .recap-icon {
                    fill: none;
                    stroke: #569cd6;
                    stroke-width: 2;
                }
                
                .recap-line {
                    padding: 4px 8px;
                    white-space: pre-wrap;
                    word-break: break-all;
                    line-height: 1.6;
                }
                
                .stat-ok { color: #4CAF50; }
                .stat-changed { color: #FF9800; }
                .stat-failed { color: #F44336; }
                
                .loading-output {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    color: #9e9e9e;
                }
                     /* [estilos existentes] */
            
            .task-spinner {
                width: 12px;
                height: 12px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                border-top-color: var(--accent-gold, #FFD600);
                animation: ansible-spin 1s linear infinite;
                margin-left: auto;
            }
            
            /* Ocultar spinner quando a tarefa for concluída */
            .task-content:not(:empty) + .task-spinner {
                display: none;
            }
            </style>
        `;
        
        return formattedOutput;
    }
    
    /**
     * Sobrescreve a função toggleOutput para garantir compatibilidade com baseline
     */
    window.toggleOutput = function(button) {
        try {
            const card = button.closest('.execution-card');
            if (!card) {
                console.log("Card não encontrado para o botão");
                return;
            }
            
            const output = card.querySelector('.ansible-output');
            if (!output) {
                console.log("Elemento de saída não encontrado no card");
                return;
            }
            
            const isVisible = output.style.display === 'block';
            
            console.log("Alterando visibilidade da saída: " + (isVisible ? "ocultar" : "mostrar"));
            
            // Troca a visibilidade
            output.style.display = isVisible ? 'none' : 'block';
            
            // Atualiza o botão
            button.innerHTML = isVisible ? `
                Ver Mais
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            ` : `
                Ver Menos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M18 15l-6-6-6 6"/>
                </svg>
            `;
            
            // Se estamos mostrando a saída, garantir que seu conteúdo seja atualizado
            if (!isVisible) {
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                const playbookName = card?.dataset?.playbookName || '';
                const isBaseline = isBaselinePlaybook(playbookName);
                
                if (jobId) {
                    console.log(`Atualizando saída para job ${jobId}, baseline: ${isBaseline}`);
                    
                    // Mostrar indicador de carregamento
                    output.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="ansible-spinner"></div> Carregando saída...</div>';
                    
                    fetch(`/api/status/${jobId}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Erro ao buscar status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Armazenar no cache
                            if (!window.jobOutputCache) {
                                window.jobOutputCache = {};
                            }
                            
                            window.jobOutputCache[jobId] = {
                                lastOutput: data.output || '',
                                updatedAt: Date.now(),
                                status: data.status || 'unknown',
                                isBaseline: isBaseline
                            };
                            
                            // Formatar e exibir a saída com base no tipo de playbook
                            if (isBaseline) {
                                output.innerHTML = formatBaselineOutput(data.output || '', jobId);
                            } else if (typeof window.formatAnsibleOutput === 'function') {
                                output.innerHTML = window.formatAnsibleOutput(data.output || '');
                            } else {
                                output.innerHTML = `<pre>${data.output || ''}</pre>`;
                            }
                            
                            // Se a execução ainda estiver em andamento, iniciar monitoramento
                            if (data.status === 'running') {
                                if (!window.activeBaselineMonitoring) {
                                    window.activeBaselineMonitoring = {};
                                }
                                
                                // Cancelar monitoramento anterior se existir
                                if (window.activeBaselineMonitoring[jobId]) {
                                    clearInterval(window.activeBaselineMonitoring[jobId]);
                                }
                                
                                // Configurar novo monitoramento
                                window.activeBaselineMonitoring[jobId] = setInterval(() => {
                                    fetch(`/api/status/${jobId}`)
                                        .then(response => response.json())
                                        .then(data => {
                                            const cache = window.jobOutputCache[jobId] || {};
                                            
                                            // Se a saída mudou, atualizar
                                            if (data.output && data.output !== cache.lastOutput) {
                                                cache.lastOutput = data.output;
                                                cache.updatedAt = Date.now();
                                                
                                                if (isBaseline) {
                                                    output.innerHTML = formatBaselineOutput(data.output, jobId);
                                                } else if (typeof window.formatAnsibleOutput === 'function') {
                                                    output.innerHTML = window.formatAnsibleOutput(data.output);
                                                } else {
                                                    output.innerHTML = `<pre>${data.output}</pre>`;
                                                }
                                                
                                                // Rolar para o final
                                                output.scrollTop = output.scrollHeight;
                                            }
                                            
                                            // Se a execução terminou, parar o monitoramento
                                            if (data.status !== 'running') {
                                                clearInterval(window.activeBaselineMonitoring[jobId]);
                                                delete window.activeBaselineMonitoring[jobId];
                                            }
                                        })
                                        .catch(error => {
                                            console.error(`Erro ao atualizar saída para job ${jobId}:`, error);
                                        });
                                }, 2000);
                            }
                        })
                        .catch(error => {
                            console.error("Erro ao buscar saída:", error);
                            output.innerHTML = `<div style="color: var(--error-red); padding: 16px;">Erro ao buscar saída: ${error.message}</div>`;
                        });
                } else {
                    console.log("ID do job não encontrado no card");
                }
            } else {
                // Se estamos ocultando, cancelar qualquer monitoramento ativo
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (jobId && window.activeBaselineMonitoring && window.activeBaselineMonitoring[jobId]) {
                    clearInterval(window.activeBaselineMonitoring[jobId]);
                    delete window.activeBaselineMonitoring[jobId];
                }
            }
        } catch (error) {
            console.error("Erro ao alternar visibilidade da saída:", error);
        }
    };
    
    /**
     * Função auxiliar para escapar HTML
     * @param {string} unsafe - Texto não seguro
     * @returns {string} - Texto escapado
     */
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    /**
     * Inicializa monitoramento para cards existentes
     */
  /**
     * Inicializa monitoramento para cards existentes
     */
  function initializeExistingCards() {
    document.querySelectorAll('.execution-card').forEach(card => {
        const playbookName = card?.dataset?.playbookName || '';
        const isBaseline = isBaselinePlaybook(playbookName);
        
        if (isBaseline) {
            console.log(`Encontrado card de baseline existente: ${playbookName}`);
            
            // Verificar se o card tem um job em execução
            const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
            const statusDiv = card.querySelector('.task-status');
            const status = statusDiv ? statusDiv.textContent.trim().toLowerCase() : '';
            
            // Se o job ainda está em execução, reiniciar o monitoramento
            if (jobId && status.includes('execução')) {
                console.log(`Reiniciando monitoramento para job de baseline: ${jobId}`);
                
                // Abrir a saída automaticamente
                const outputDiv = card.querySelector('.ansible-output');
                if (outputDiv) {
                    outputDiv.style.display = 'block';
                }
                
                // Atualizar o botão "Ver Mais"
                const toggleBtn = card.querySelector('.toggle-output-btn');
                if (toggleBtn) {
                    toggleBtn.innerHTML = `
                        Ver Menos
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    `;
                }
                
                // Iniciar monitoramento
                fetch(`/api/status/${jobId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'running') {
                            // Monitorar o job
                            window.monitorPlaybookExecution(jobId, card);
                        } else {
                            // Atualizar a saída
                            if (outputDiv) {
                                outputDiv.innerHTML = formatBaselineOutput(data.output || '', jobId);
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao verificar status para job ${jobId}:`, error);
                    });
            }
        }
    });
}

/**
 * Inicializa observadores para novas playbooks de baseline
 */
function initializeObservers() {
    // Criar um observador para novas execuções
    const runningPlaybooksObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('execution-card')) {
                        // Verificar se é uma playbook de baseline
                        const playbookName = node.dataset.playbookName || '';
                        if (isBaselinePlaybook(playbookName)) {
                            console.log(`Detectada nova playbook de baseline: ${playbookName}`);
                            
                            // Aguardar um momento para garantir que todos os elementos estejam inicializados
                            setTimeout(() => {
                                // Abrir a saída automaticamente após um breve atraso
                                const toggleBtn = node.querySelector('.toggle-output-btn');
                                if (toggleBtn) {
                                    toggleBtn.click();
                                }
                            }, 500);
                        }
                    }
                });
            }
        });
    });
    
    // Iniciar observação do container de playbooks em execução
    const runningPlaybooksContainer = document.getElementById('running-playbooks');
    if (runningPlaybooksContainer) {
        runningPlaybooksObserver.observe(runningPlaybooksContainer, {
            childList: true
        });
        console.log("Observador de playbooks em execução inicializado");
    }
}

/**
 * Modificar a função executeSelectedPlaybooks para tratar corretamente as playbooks de baseline
 */
function enhanceExecuteFunction() {
    // Armazenar a função original
    const originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
    
    // Sobrescrever a função
    window.executeSelectedPlaybooks = function() {
        console.log("Executando playbooks com suporte melhorado para baseline");
        
        // Verificar se alguma playbook selecionada é do tipo baseline
        let hasBaseline = false;
        document.querySelectorAll('.playbook-item.selected').forEach(item => {
            const playbookName = item.getAttribute('data-playbook-name') || '';
            if (isBaselinePlaybook(playbookName)) {
                hasBaseline = true;
                console.log(`Detectada playbook de baseline na seleção: ${playbookName}`);
            }
        });
        
        // Se tivermos uma playbook de baseline, garantir que todos os campos foram preenchidos
        // Essa verificação está nos arquivos originais, então vamos manter compatibilidade
        if (hasBaseline && typeof validateBaselineFields === 'function') {
            const fieldsValid = validateBaselineFields();
            console.log(`Campos de baseline validados: ${fieldsValid}`);
            if (!fieldsValid) {
                // A função original irá lidar com os erros
                return originalExecuteSelectedPlaybooks();
            }
        }
        
        // Chamar a função original
        return originalExecuteSelectedPlaybooks();
    };
}

/**
 * Remove conflitos específicos com outros scripts
 */
function resolveConflicts() {
    // Corrigir os problemas de estilo do ansible-card-view.js
    const existingStyles = document.getElementById('ansible-cards-styles');
    if (existingStyles) {
        // Modificar estilos existentes para compatibilidade com baseline
        const additionalStyles = document.createElement('style');
        additionalStyles.id = 'baseline-compatibility-styles';
        additionalStyles.textContent = `
            /* Garantir que o output seja visível */
            .execution-card .ansible-output {
                max-height: 600px !important;
                overflow-y: auto !important;
            }
            
            /* Modificar estilos específicos para baseline */
            .baseline-output-container {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }
            
            /* Certificar que a saída tem precedência sobre outros estilos */
            .ansible-output {
                display: none;
            }
            
            /* Certificar que os cards abertos permanecem abertos */
            .execution-card.with-baseline-output .ansible-output {
                display: block !important;
            }
        `;
        document.head.appendChild(additionalStyles);
    }
    
    // Harmonizar com o script baseline-fix.js
    if (typeof window.validateBaselineFields === 'function') {
        const originalValidateBaselineFields = window.validateBaselineFields;
        
        // Sobrescrever para adicionar compatibilidade
        window.validateBaselineFields = function() {
            // Chamar a função original
            const result = originalValidateBaselineFields();
            
            // Se a validação falhar, garantir que a saída esteja visível
            if (!result) {
                document.querySelectorAll('.execution-card').forEach(card => {
                    const playbookName = card?.dataset?.playbookName || '';
                    if (isBaselinePlaybook(playbookName)) {
                        const outputDiv = card.querySelector('.ansible-output');
                        if (outputDiv) {
                            outputDiv.style.display = 'block';
                            card.classList.add('with-baseline-output');
                        }
                    }
                });
            }
            
            return result;
        };
    }
}

/**
 * Inicializa toda a solução
 */
function init() {
    // Adicionar correções de estilo
    const baselineStyles = document.createElement('style');
    baselineStyles.id = 'ansible-baseline-output-styles';
    baselineStyles.textContent = `
        /* Spinner de carregamento */
        .ansible-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(33, 150, 243, 0.3);
            border-radius: 50%;
            border-top-color: #2196F3;
            animation: ansible-spin 1s linear infinite;
        }
        
        @keyframes ansible-spin {
            to { transform: rotate(360deg); }
        }
        
        /* Garantir que a saída tenha altura máxima apropriada */
        .execution-card .ansible-output {
            max-height: 600px !important;
            overflow-y: auto !important;
        }
    `;
    document.head.appendChild(baselineStyles);
    
    // Inicializar melhorias
    resolveConflicts();
    enhanceExecuteFunction();
    initializeExistingCards();
    initializeObservers();
    
    console.log("Correção para saída do baseline inicializada com sucesso");
}

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM já está carregado, inicializar imediatamente
    init();
}
})();