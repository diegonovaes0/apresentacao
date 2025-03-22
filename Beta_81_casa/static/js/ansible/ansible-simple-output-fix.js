/**
 * ansible-simple-output-fix.js
 * 
 * Script simples para corrigir a exibição da saída do Ansible:
 * - Mantém a saída fechada por padrão
 * - Formata a saída em cards organizados quando aberta
 * - Evita conflitos com outros scripts
 * - Foca apenas em corrigir a visualização
 */

(function() {
    console.log("Inicializando correção simplificada para saída do Ansible...");
    
    // Armazenar função original de toggle
    const originalToggleOutput = window.toggleOutput;
    
    // Cache para armazenar saídas já processadas
    const processedOutputs = new Map();
    
    /**
     * Sobrescreve a função toggleOutput para melhorar a visualização
     * @param {HTMLElement} button - Botão clicado
     */
    window.toggleOutput = function(button) {
        try {
            // Encontrar o card pai
            const card = button.closest('.execution-card');
            if (!card) {
                console.error("Card não encontrado");
                return originalToggleOutput ? originalToggleOutput(button) : undefined;
            }
            
            // Encontrar o container de saída
            const outputDiv = card.querySelector('.ansible-output');
            if (!outputDiv) {
                console.error("Container de saída não encontrado");
                return originalToggleOutput ? originalToggleOutput(button) : undefined;
            }
            
            // Verificar se está visível
            const isVisible = outputDiv.style.display === 'block';
            
            // Alternar visibilidade
            outputDiv.style.display = isVisible ? 'none' : 'block';
            
            // Atualizar texto do botão
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
            
            // Se estamos mostrando a saída, verificar se precisamos formatá-la
            if (!isVisible) {
                const jobId = card.getAttribute('data-job-id') || card.dataset.jobId;
                if (!jobId) {
                    console.error("Job ID não encontrado no card");
                    return;
                }
                
                // Verificar se já processamos esta saída antes
                if (processedOutputs.has(jobId)) {
                    return; // Saída já processada
                }
                
                // Mostrar indicador de carregamento
                outputDiv.innerHTML = `
                    <div class="ansible-loading">
                        <div class="ansible-spinner"></div>
                        <span>Carregando saída...</span>
                    </div>
                `;
                
                // Buscar saída atual
                console.log(`Buscando saída para job: ${jobId}`);
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (!data || !data.output) {
                            outputDiv.innerHTML = '<div class="ansible-no-output">Ainda não há saída disponível</div>';
                            return;
                        }
                        
                        // Formatar a saída
                        outputDiv.innerHTML = formatAnsibleOutput(data.output);
                        
                        // Marcar como processada
                        processedOutputs.set(jobId, true);
                        
                        // Configurar monitoramento se ainda em execução
                        if (data.status === 'running') {
                            monitorOutput(jobId, outputDiv);
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao buscar saída: ${error.message}`);
                        outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                    });
            }
        } catch (error) {
            console.error(`Erro ao alternar saída: ${error.message}`);
            return originalToggleOutput ? originalToggleOutput(button) : undefined;
        }
    };
    
    /**
     * Monitora a saída de uma execução em andamento
     * @param {string} jobId - ID do job
     * @param {HTMLElement} outputDiv - Container de saída
     */
    function monitorOutput(jobId, outputDiv) {
        const intervalId = setInterval(() => {
            fetch(`/api/status/${jobId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.output) {
                        // Atualizar a saída apenas se o container ainda estiver visível
                        if (outputDiv.style.display === 'block') {
                            outputDiv.innerHTML = formatAnsibleOutput(data.output);
                        }
                    }
                    
                    // Parar o monitoramento se a execução terminou
                    if (data.status !== 'running') {
                        clearInterval(intervalId);
                    }
                })
                .catch(error => console.error(`Erro ao monitorar saída: ${error.message}`));
        }, 2000);
    }
    
    /**
     * Formata a saída do Ansible em HTML com cards
     * @param {string} output - Saída bruta do Ansible
     * @returns {string} HTML formatado
     */
    function formatAnsibleOutput(output) {
        if (!output) {
            return '<div class="ansible-no-output">Sem saída disponível</div>';
        }
        
        // Dividir por linhas
        const lines = output.split('\n');
        
        // Prepare containers for output
        let html = '<div class="ansible-formatted-output">';
        let currentPlay = null;
        let currentTask = null;
        let playCounter = 0;
        let taskCounter = 0;
        
        // Processar cada linha
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Detectar Play
            if (line.startsWith('PLAY [')) {
                playCounter++;
                const playName = line.match(/PLAY \[(.*?)\]/)[1];
                currentPlay = `play-${playCounter}`;
                
                // Fechar task anterior se existir
                if (currentTask) {
                    html += '</div></div>';
                    currentTask = null;
                }
                
                // Fechar play anterior se existir
                if (playCounter > 1) {
                    html += '</div>';
                }
                
                // Iniciar novo play
                html += `
                    <div class="ansible-play" id="${currentPlay}">
                        <div class="play-header">
                            <svg class="play-icon" viewBox="0 0 24 24" width="16" height="16">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <h3>${escapeHtml(playName)}</h3>
                        </div>
                `;
                continue;
            }
            
            // Detectar Task
            if (line.startsWith('TASK [')) {
                taskCounter++;
                const taskName = line.match(/TASK \[(.*?)\]/)[1];
                
                // Fechar task anterior se existir
                if (currentTask) {
                    html += '</div></div>';
                }
                
                currentTask = `task-${taskCounter}`;
                
                // Iniciar nova task
                html += `
                    <div class="ansible-task" id="${currentTask}">
                        <div class="task-header">
                            <svg class="task-icon" viewBox="0 0 24 24" width="14" height="14">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <h4>${escapeHtml(taskName)}</h4>
                        </div>
                        <div class="task-content">
                `;
                continue;
            }
            
            // Linhas de resultado (ok, changed, failed, etc.)
            const statusMatch = line.match(/^(ok|changed|failed|skipped|unreachable):/);
            if (statusMatch && currentTask) {
                const status = statusMatch[1];
                const hostMatch = line.match(/:\s*\[(.*?)\]/);
                const host = hostMatch ? hostMatch[1] : 'localhost';
                
                let details = '';
                if (line.includes(' => ')) {
                    details = line.split(' => ')[1];
                }
                
                html += `
                    <div class="result-line ${status}">
                        <span class="result-status">${status}</span>
                        <span class="result-host">[${escapeHtml(host)}]</span>
                        ${details ? `<span class="result-details">${escapeHtml(details)}</span>` : ''}
                    </div>
                `;
                continue;
            }
            
            // PLAY RECAP
            if (line.startsWith('PLAY RECAP')) {
                // Fechar task anterior se existir
                if (currentTask) {
                    html += '</div></div>';
                    currentTask = null;
                }
                
                // Fechar play anterior se existir
                if (currentPlay) {
                    html += '</div>';
                    currentPlay = null;
                }
                
                html += `
                    <div class="ansible-recap">
                        <div class="recap-header">
                            <svg class="recap-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                            </svg>
                            <h3>Resumo da Execução</h3>
                        </div>
                        <div class="recap-content">
                `;
                continue;
            }
            
            // Linhas de recap (stats)
            if (currentPlay === null && line.includes('ok=') && line.includes('changed=')) {
                const hostname = line.split(' ')[0];
                
                // Extrair estatísticas
                const statsMatches = {
                    ok: line.match(/ok=(\d+)/),
                    changed: line.match(/changed=(\d+)/),
                    unreachable: line.match(/unreachable=(\d+)/),
                    failed: line.match(/failed=(\d+)/),
                    skipped: line.match(/skipped=(\d+)/)
                };
                
                // Definir status geral
                let status = 'ok';
                if ((statsMatches.failed && statsMatches.failed[1] !== '0') || 
                    (statsMatches.unreachable && statsMatches.unreachable[1] !== '0')) {
                    status = 'failed';
                } else if (statsMatches.changed && statsMatches.changed[1] !== '0') {
                    status = 'changed';
                }
                
                html += `
                    <div class="recap-line ${status}">
                        <span class="recap-host">${escapeHtml(hostname)}</span>
                        <div class="recap-stats">
                `;
                
                // Adicionar cada estatística
                for (const [stat, match] of Object.entries(statsMatches)) {
                    if (match) {
                        html += `<span class="stat-${stat}">${stat}=${match[1]}</span>`;
                    }
                }
                
                html += `
                        </div>
                    </div>
                `;
                continue;
            }
            
            // Linhas genéricas
            if (currentTask) {
                html += `<div class="output-line">${escapeHtml(line)}</div>`;
            } else if (currentPlay === null) {
                // Estamos no RECAP
                html += `<div class="recap-detail">${escapeHtml(line)}</div>`;
            } else {
                // Linha solta dentro de um play
                html += `<div class="play-detail">${escapeHtml(line)}</div>`;
            }
        }
        
        // Fechar tags abertas
        if (currentTask) {
            html += '</div></div>';
        }
        
        if (currentPlay) {
            html += '</div>';
        } else {
            // Fechar o recap se foi iniciado
            if (html.includes('<div class="ansible-recap">')) {
                html += '</div></div>';
            }
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Escapa HTML para evitar XSS
     * @param {string} text - Texto a ser escapado
     * @returns {string} - Texto escapado
     */
    function escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Adiciona estilos CSS necessários
     */
    function addStyles() {
        if (document.getElementById('ansible-simple-output-fix-styles')) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'ansible-simple-output-fix-styles';
        styleEl.textContent = `
            /* Estilos para o container de carregamento */
            .ansible-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                gap: 10px;
                color: #aaa;
            }
            
            .ansible-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                border-top-color: #2196F3;
                animation: ansible-spin 1s linear infinite;
            }
            
            @keyframes ansible-spin {
                to { transform: rotate(360deg); }
            }
            
            /* Estilos para mensagens informativas */
            .ansible-no-output, .ansible-error {
                padding: 16px;
                text-align: center;
                color: #bbb;
            }
            
            .ansible-error {
                color: #e57373;
            }
            
            /* Estilos para saída formatada */
            .ansible-formatted-output {
                font-family: monospace;
                font-size: 13px;
                line-height: 1.4;
                color: #e0e0e0;
                padding: 10px;
            }
            
            /* Estilos para plays */
            .ansible-play {
                margin-bottom: 16px;
                border: 1px solid #333;
                border-radius: 4px;
                overflow: hidden;
                background: #1e1e1e;
            }
            
            .play-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: #252526;
                border-bottom: 1px solid #333;
            }
            
            .play-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #569cd6;
            }
            
            .play-icon {
                fill: none;
                stroke: #569cd6;
                stroke-width: 2;
            }
            
            .play-detail {
                padding: 4px 12px;
                color: #ddd;
            }
            
            /* Estilos para tarefas */
            .ansible-task {
                margin: 8px;
                border: 1px solid #333;
                border-radius: 4px;
                overflow: hidden;
                background: #252526;
            }
            
            .task-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: #1e1e1e;
                border-bottom: 1px solid #333;
            }
            
            .task-header h4 {
                margin: 0;
                font-size: 13px;
                font-weight: 500;
                color: #9cdcfe;
                flex: 1;
            }
            
            .task-icon {
                fill: none;
                stroke: #9cdcfe;
                stroke-width: 2;
            }
            
            .task-content {
                padding: 6px;
            }
            
            /* Estilos para linhas de resultado */
            .result-line {
                padding: 4px 6px;
                margin-bottom: 2px;
                border-radius: 3px;
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                gap: 6px;
            }
            
            .result-line.ok {
                background: rgba(76, 175, 80, 0.1);
                border-left: 2px solid #4CAF50;
            }
            
            .result-line.changed {
                background: rgba(255, 152, 0, 0.1);
                border-left: 2px solid #FF9800;
            }
            
            .result-line.failed, .result-line.unreachable {
                background: rgba(244, 67, 54, 0.1);
                border-left: 2px solid #F44336;
            }
            
            .result-line.skipped {
                background: rgba(158, 158, 158, 0.1);
                border-left: 2px solid #9E9E9E;
            }
            
            .result-status {
                font-weight: bold;
                min-width: 60px;
            }
            
            .result-line.ok .result-status { color: #4CAF50; }
            .result-line.changed .result-status { color: #FF9800; }
            .result-line.failed .result-status, .result-line.unreachable .result-status { color: #F44336; }
            .result-line.skipped .result-status { color: #9E9E9E; }
            
            .result-host {
                color: #9cdcfe;
                font-weight: 500;
            }
            
            .result-details {
                color: #ddd;
                flex: 1;
            }
            
            .output-line {
                padding: 2px 6px;
                margin-left: 4px;
                color: #ddd;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            /* Estilos para PLAY RECAP */
            .ansible-recap {
                margin-top: 16px;
                border: 1px solid #444;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .recap-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: #252526;
                border-bottom: 1px solid #444;
            }
            
            .recap-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #2196F3;
            }
            
            .recap-icon {
                fill: none;
                stroke: #2196F3;
                stroke-width: 2;
            }
            
            .recap-content {
                padding: 8px;
            }
            
            .recap-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                margin-bottom: 4px;
                border-radius: 3px;
                background: #252526;
            }
            
            .recap-line.ok {
                border-left: 3px solid #4CAF50;
            }
            
            .recap-line.changed {
                border-left: 3px solid #FF9800;
            }
            
            .recap-line.failed {
                border-left: 3px solid #F44336;
            }
            
            .recap-host {
                font-weight: 500;
                color: #e0e0e0;
            }
            
            .recap-stats {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .stat-ok { color: #4CAF50; }
            .stat-changed { color: #FF9800; }
            .stat-failed, .stat-unreachable { color: #F44336; }
            .stat-skipped { color: #9E9E9E; }
            
            .recap-detail {
                padding: 2px 8px;
                color: #bbb;
            }
            
            /* Certifique-se de que a saída começa fechada */
            .ansible-output {
                display: none !important;
                background: #1a1a1a !important;
                border-radius: 4px !important;
                margin-top: 8px !important;
                max-height: 600px !important;
                overflow-y: auto !important;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Inicializa o script
     */
    function init() {
        // Adicionar estilos
        addStyles();
        
        // Garantir que todas as saídas comecem fechadas
        document.querySelectorAll('.ansible-output').forEach(output => {
            output.style.display = 'none';
        });
        
        console.log("Correção simplificada para saída do Ansible inicializada");
    }
    
    // Inicializar o script quando a página estiver pronta
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();