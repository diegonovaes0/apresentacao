/**
 * ansible-output-fix.js
 * 
 * Ajuste simplificado para corrigir a visualização da saída do Ansible
 * Melhora a exibição da saída para playbooks de baseline em múltiplos hosts
 * 
 * @version 1.0.0
 */

(function() {
    console.log("Inicializando correção de visualização de saída do Ansible");
    
    // Verificar se já inicializado
    if (window.ansibleOutputFixInitialized) {
        console.log("Correção já inicializada, ignorando");
        return;
    }
    
    // Interceptar a função toggleOutput para melhorar a exibição da saída
    function fixOutputToggle() {
        // Verificar se a função existe e ainda não foi interceptada
        if (typeof window.toggleOutputOriginal === 'undefined' && 
            typeof window.toggleOutput === 'function') {
            
            // Guardar a função original
            window.toggleOutputOriginal = window.toggleOutput;
            
            // Substituir pela versão melhorada
            window.toggleOutput = function(button) {
                // Obter o card
                const card = button.closest('.execution-card');
                if (!card) {
                    console.log("Card não encontrado para o botão");
                    return window.toggleOutputOriginal.apply(this, arguments);
                }
                
                // Obter a div de saída
                const outputDiv = card.querySelector('.ansible-output');
                if (!outputDiv) {
                    console.log("Elemento de saída não encontrado");
                    return window.toggleOutputOriginal.apply(this, arguments);
                }
                
                // Verificar se é uma playbook de baseline
                const playbookName = card.getAttribute('data-playbook-name') || '';
                const isBaseline = isBaselinePlaybook(playbookName);
                const jobId = card.getAttribute('data-job-id');
                
                // Alternar visibilidade
                const isVisible = outputDiv.style.display === 'block';
                outputDiv.style.display = isVisible ? 'none' : 'block';
                
                // Atualizar o botão
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
                
                // Se estamos mostrando a saída, buscar os dados mais recentes
                if (!isVisible) {
                    // Mostrar indicador de carregamento
                    outputDiv.innerHTML = '<div class="ansible-loading">Carregando saída...</div>';
                    
                    // Verificar se é um card multi-host
                    const isMultiHostCard = card.querySelectorAll('.host-details').length > 1;
                    
                    // Para multi-host em baseline, precisamos tratar de forma especial
                    if (isBaseline && isMultiHostCard) {
                        // Buscar a saída com formatação especial
                        fetch(`/api/status/${jobId}`)
                            .then(response => {
                                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                                return response.json();
                            })
                            .then(data => {
                                // Extrair e formatar a saída
                                const formattedOutput = formatOutputForMultiHost(data.output || '', card);
                                
                                // Aplicar a saída formatada
                                outputDiv.innerHTML = formattedOutput;
                                
                                // Rolar para o final
                                outputDiv.scrollTop = outputDiv.scrollHeight;
                                
                                // Configurar atualização automática
                                setupAutoRefresh(jobId, card, outputDiv);
                            })
                            .catch(error => {
                                console.error(`Erro ao buscar saída para job ${jobId}: ${error.message}`);
                                outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                            });
                    } else {
                        // Para outros casos, usar o fluxo normal
                        fetch(`/api/status/${jobId}`)
                            .then(response => {
                                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                                return response.json();
                            })
                            .then(data => {
                                // Formatar e exibir a saída
                                if (isBaseline) {
                                    outputDiv.innerHTML = formatBaselineOutput(data.output || '');
                                } else if (typeof window.formatAnsibleOutput === 'function') {
                                    outputDiv.innerHTML = window.formatAnsibleOutput(data.output || '');
                                } else {
                                    outputDiv.innerHTML = `<pre>${data.output || ''}</pre>`;
                                }
                                
                                // Rolar para o final
                                outputDiv.scrollTop = outputDiv.scrollHeight;
                            })
                            .catch(error => {
                                console.error(`Erro ao buscar saída para job ${jobId}: ${error.message}`);
                                outputDiv.innerHTML = `<div class="ansible-error">Erro ao carregar saída: ${error.message}</div>`;
                            });
                    }
                } else {
                    // Limpar timers de atualização
                    const timerId = outputDiv.getAttribute('data-refresh-timer');
                    if (timerId) {
                        clearInterval(parseInt(timerId));
                        outputDiv.removeAttribute('data-refresh-timer');
                    }
                }
                
                return true;
            };
            
            console.log("Função toggleOutput melhorada para exibição de saída");
        }
    }
    
    /**
     * Verifica se uma playbook é do tipo baseline
     */
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return nameLower.includes('baseline') || 
               nameLower.includes('configuracao-base') || 
               nameLower.includes('config-base');
    }
    
    /**
     * Configura a atualização automática da saída
     */
    function setupAutoRefresh(jobId, card, outputDiv) {
        // Limpar timer anterior
        const existingTimerId = outputDiv.getAttribute('data-refresh-timer');
        if (existingTimerId) {
            clearInterval(parseInt(existingTimerId));
        }
        
        // Criar novo timer
        const timerId = setInterval(() => {
            // Verificar se o card ou outputDiv ainda existe
            if (!document.body.contains(card) || !document.body.contains(outputDiv)) {
                clearInterval(timerId);
                return;
            }
            
            // Verificar se a saída está visível
            if (outputDiv.style.display !== 'block') {
                clearInterval(timerId);
                return;
            }
            
            // Atualizar a saída
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Verificar se o status foi alterado
                    const formattedOutput = formatOutputForMultiHost(data.output || '', card);
                    outputDiv.innerHTML = formattedOutput;
                    
                    // Se o job foi concluído, parar a atualização
                    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                        clearInterval(timerId);
                        outputDiv.removeAttribute('data-refresh-timer');
                    }
                })
                .catch(error => {
                    console.error(`Erro ao atualizar saída para job ${jobId}: ${error.message}`);
                });
        }, 5000);
        
        // Armazenar o ID do timer
        outputDiv.setAttribute('data-refresh-timer', timerId.toString());
    }
    
    /**
     * Formata a saída para exibição multi-host
     */
    function formatOutputForMultiHost(output, card) {
        // Obter os hosts do card
        const hosts = Array.from(card.querySelectorAll('.host-details'))
            .map(hostDetail => hostDetail.getAttribute('data-host'))
            .filter(Boolean);
        
        // Se não houver hosts, usar o formato padrão
        if (!hosts.length) {
            return formatBaselineOutput(output);
        }
        
        // Extrair informações dos hosts a partir da saída
        const hostsInfo = extractHostsInfo(output, hosts);
        
        // Extrair tarefas da saída
        const tasks = extractTasks(output);
        
        // Construir HTML formatado no estilo da playbook "teste"
        let html = `
        <div class="ansible-multi-output">
            <div class="playbook-header">
                <strong>${card.getAttribute('data-playbook-name')}</strong>
            </div>
        `;
        
        // Adicionar seção para cada host
        hosts.forEach(hostname => {
            const hostInfo = hostsInfo[hostname] || {};
            
            html += `
            <div class="host-section">
                <div class="host-header">
                    <strong>${hostname}</strong>
                </div>
                <div class="host-details-info">
                    ${hostInfo.hostname ? `<div><strong>Hostname:</strong> ${hostInfo.hostname}</div>` : ''}
                    ${hostInfo.publicIp ? `<div><strong>IP Público:</strong> ${hostInfo.publicIp}</div>` : ''}
                    ${hostInfo.privateIp ? `<div><strong>IP Privado:</strong> ${hostInfo.privateIp}</div>` : ''}
                    ${hostInfo.system ? `<div><strong>Sistema:</strong> ${hostInfo.system}</div>` : ''}
                </div>
            `;
            
            // Adicionar tarefas
            const hostTasks = tasks.filter(task => {
                return task.hosts.some(h => h.name === hostname);
            });
            
            if (hostTasks.length > 0) {
                html += `<div class="tasks-list">`;
                
                // Agrupar por playbook
                const groupedTasks = {};
                hostTasks.forEach(task => {
                    if (!groupedTasks[task.playbook]) {
                        groupedTasks[task.playbook] = [];
                    }
                    groupedTasks[task.playbook].push(task);
                });
                
                // Adicionar cada grupo
                Object.entries(groupedTasks).forEach(([playbook, playbookTasks]) => {
                    html += `
                    <div class="playbook-group">
                        <div class="playbook-title"><strong>Playbook: ${playbook || 'Desconhecido'}</strong></div>
                    `;
                    
                    // Adicionar cada tarefa
                    playbookTasks.forEach(task => {
                        const hostStatus = task.hosts.find(h => h.name === hostname);
                        const status = hostStatus ? hostStatus.status : 'unknown';
                        
                        html += `
                        <div class="task-item status-${status.toLowerCase()}">
                            <div class="task-title"><strong>Tarefa: ${task.name}</strong></div>
                            <div class="task-status"><strong>${capitalizeFirstLetter(status)}</strong>Host: ${hostname}</div>
                        </div>
                        `;
                    });
                    
                    html += `</div>`;
                });
                
                html += `</div>`;
            }
            
            // Adicionar RECAP se disponível
            if (hostInfo.recap) {
                html += `
                <div class="recap-section">
                    <div class="recap-title"><strong>Playbook: RECAP</strong></div>
                    <div class="recap-host"><strong>Host: ${hostname}</strong></div>
                    <div class="recap-details">
                        <span><strong>ok:</strong> ${hostInfo.recap.ok || 0}</span>
                        <span><strong>changed:</strong> ${hostInfo.recap.changed || 0}</span>
                        <span><strong>unreachable:</strong> ${hostInfo.recap.unreachable || 0}</span>
                        <span><strong>failed:</strong> ${hostInfo.recap.failed || 0}</span>
                        <span><strong>skipped:</strong> ${hostInfo.recap.skipped || 0}</span>
                        <span><strong>rescued:</strong> ${hostInfo.recap.rescued || 0}</span>
                        <span><strong>ignored:</strong> ${hostInfo.recap.ignored || 0}</span>
                    </div>
                </div>
                `;
            }
            
            html += `</div>`;
        });
        
        html += `</div>`;
        
        // Adicionar estilos
        html = `
        <style>
            .ansible-multi-output {
                font-family: sans-serif;
                color: #333;
                background: #fff;
                padding: 0;
                line-height: 1.4;
            }
            .playbook-header {
                background: #f5f5f5;
                padding: 10px;
                margin-bottom: 15px;
                border-bottom: 1px solid #ddd;
                font-size: 16px;
            }
            .host-section {
                margin-bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 4px;
                overflow: hidden;
            }
            .host-header {
                background: #4a5568;
                color: white;
                padding: 10px;
                font-size: 14px;
            }
            .host-details-info {
                padding: 10px;
                background: #f9f9f9;
                border-bottom: 1px solid #eee;
            }
            .host-details-info > div {
                margin-bottom: 5px;
            }
            .tasks-list {
                padding: 10px;
            }
            .playbook-group {
                margin-bottom: 15px;
            }
            .playbook-title {
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #eee;
            }
            .task-item {
                margin-bottom: 8px;
                padding: 8px;
                border-left: 3px solid #ddd;
                background: #f9f9f9;
            }
            .task-title {
                margin-bottom: 3px;
            }
            .task-status {
                font-size: 0.9em;
            }
            .status-ok, .status-changed, .status-success {
                border-left-color: #48bb78;
            }
            .status-failed, .status-unreachable {
                border-left-color: #f56565;
            }
            .status-skipped, .status-skipping {
                border-left-color: #a0aec0;
            }
            .recap-section {
                background: #f5f5f5;
                padding: 10px;
                border-top: 1px solid #eee;
            }
            .recap-title {
                margin-bottom: 5px;
            }
            .recap-details {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 5px;
            }
            .recap-details span {
                background: #edf2f7;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
            }
            .ansible-loading {
                padding: 20px;
                text-align: center;
                color: #666;
            }
            .ansible-error {
                padding: 10px;
                background-color: #fff5f5;
                border-left: 3px solid #f56565;
                color: #c53030;
                margin: 10px 0;
            }
        </style>
        ${html}`;
        
        return html;
    }
    
    /**
     * Formata a saída de baseline normal
     */
    function formatBaselineOutput(output) {
        if (!output) return '<em>Aguardando saída...</em>';
        
        // Extrair informações do host
        const hostInfo = {};
        
        // Regex para extrair informações do host
        const hostRegex = /(Hostname|IP Público|IP Privado|Sistema):\s*([^\n]+)/g;
        
        // Extrair todas as ocorrências
        let match;
        while ((match = hostRegex.exec(output)) !== null) {
            const key = match[1];
            const value = match[2].trim();
            
            if (!hostInfo[key]) {
                hostInfo[key] = [];
            }
            
            if (!hostInfo[key].includes(value)) {
                hostInfo[key].push(value);
            }
        }
        
        // Criar HTML formatado
        let html = `
        <div class="baseline-output">
            <div class="baseline-title">${getBaselineStatus(output)}</div>
        `;
        
        // Adicionar informações do host
        Object.entries(hostInfo).forEach(([key, values]) => {
            values.forEach(value => {
                html += `<div class="baseline-row"><strong>${key}:</strong> ${value}</div>`;
            });
        });
        
        html += `</div>`;
        
        // Adicionar estilos
        html = `
        <style>
            .baseline-output {
                font-family: sans-serif;
                color: #333;
                background: #fff;
                padding: 15px;
                border-radius: 4px;
                line-height: 1.5;
            }
            .baseline-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c5282;
            }
            .baseline-row {
                margin-bottom: 8px;
            }
            .baseline-row strong {
                margin-right: 5px;
            }
        </style>
        ${html}`;
        
        return html;
    }
    
    /**
     * Obtém o status de uma saída de baseline
     */
    function getBaselineStatus(output) {
        if (output.includes('Concluído com sucesso')) {
            return 'Concluído com sucesso';
        } else if (output.includes('Falhou')) {
            return 'Falhou';
        } else if (output.includes('Cancelado')) {
            return 'Cancelado';
        } else {
            return 'Em execução...';
        }
    }
    
    /**
     * Extrai informações dos hosts a partir da saída
     */
    function extractHostsInfo(output, hostsList) {
        const hostsInfo = {};
        
        // Inicializar objetos para cada host
        hostsList.forEach(hostname => {
            hostsInfo[hostname] = {};
        });
        
        // Regex para extrair informações do host
        const hostInfoRegex = /(Hostname|IP Público|IP Privado|Sistema):\s*([^\n]+)/g;
        let match;
        
        while ((match = hostInfoRegex.exec(output)) !== null) {
            const infoType = match[1].trim();
            const infoValue = match[2].trim();
            
            // Tentar associar a um host específico
            let associatedHost = findAssociatedHost(output, match.index, hostsList);
            if (!associatedHost && hostsList.length === 1) {
                associatedHost = hostsList[0];
            }
            
            if (associatedHost && hostsInfo[associatedHost]) {
                switch (infoType) {
                    case 'Hostname':
                        hostsInfo[associatedHost].hostname = infoValue;
                        break;
                    case 'IP Público':
                        hostsInfo[associatedHost].publicIp = infoValue;
                        break;
                    case 'IP Privado':
                        hostsInfo[associatedHost].privateIp = infoValue;
                        break;
                    case 'Sistema':
                        hostsInfo[associatedHost].system = infoValue;
                        break;
                }
            }
        }
        
        // Extrair informações de RECAP
        const recapRegex = /([^\s:]+)\s*:\s*ok=(\d+)\s*changed=(\d+)\s*unreachable=(\d+)\s*failed=(\d+)(?:\s*skipped=(\d+))?(?:\s*rescued=(\d+))?(?:\s*ignored=(\d+))?/g;
        
        while ((match = recapRegex.exec(output)) !== null) {
            const hostname = match[1];
            
            if (hostsInfo[hostname]) {
                hostsInfo[hostname].recap = {
                    ok: parseInt(match[2] || 0),
                    changed: parseInt(match[3] || 0),
                    unreachable: parseInt(match[4] || 0),
                    failed: parseInt(match[5] || 0),
                    skipped: parseInt(match[6] || 0),
                    rescued: parseInt(match[7] || 0),
                    ignored: parseInt(match[8] || 0)
                };
            }
        }
        
        return hostsInfo;
    }
    
    /**
     * Tenta encontrar o host associado a uma parte da saída
     */
    function findAssociatedHost(output, index, hostsList) {
        // Procurar por menções do host antes do índice atual
        const previousText = output.substring(0, index);
        
        for (const hostname of hostsList) {
            // Procurar pela última menção do hostname
            const lastIndex = previousText.lastIndexOf(hostname);
            if (lastIndex !== -1 && index - lastIndex < 500) {
                return hostname;
            }
        }
        
        return null;
    }
    
    /**
     * Extrai informações de tarefas da saída
     */
    function extractTasks(output) {
        const tasks = [];
        const lines = output.split('\n');
        
        let currentPlaybook = null;
        let currentTask = null;
        
        // Regex para correspondência
        const playRegex = /PLAY\s*\[(.*?)\]/;
        const taskRegex = /TASK\s*\[(.*?)\]/;
        const hostStatusRegex = /^(ok|changed|failed|skipping|unreachable):\s*\[([^\]]+)\]/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) continue;
            
            // Detectar Playbook
            const playMatch = line.match(playRegex);
            if (playMatch) {
                currentPlaybook = playMatch[1].trim();
                continue;
            }
            
            // Detectar Tarefa
            const taskMatch = line.match(taskRegex);
            if (taskMatch) {
                currentTask = {
                    name: taskMatch[1].trim(),
                    playbook: currentPlaybook,
                    hosts: []
                };
                tasks.push(currentTask);
                continue;
            }
            
            // Detectar Status do Host
            if (currentTask) {
                const hostStatusMatch = line.match(hostStatusRegex);
                if (hostStatusMatch) {
                    const status = hostStatusMatch[1];
                    const hostname = hostStatusMatch[2];
                    
                    // Verificar se já existe este host
                    const existingHost = currentTask.hosts.find(h => h.name === hostname);
                    if (!existingHost) {
                        currentTask.hosts.push({
                            name: hostname,
                            status: status
                        });
                    }
                }
            }
        }
        
        return tasks;
    }
    
    /**
     * Capitaliza a primeira letra de uma string
     */
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    /**
     * Adiciona estilos globais necessários
     */
    function addGlobalStyles() {
        // Verificar se já existe
        if (document.getElementById('ansible-output-fix-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ansible-output-fix-styles';
        style.textContent = `
            .ansible-output {
                background-color: white !important;
                color: #333 !important;
            }
            
            .ansible-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #666;
            }
            
            .ansible-error {
                padding: 10px;
                background-color: #fff5f5;
                border-left: 3px solid #f56565;
                color: #c53030;
                margin: 10px 0;
            }
        `;
        
        document.head.appendChild(style);
        console.log("Estilos globais adicionados");
    }
    
    /**
     * Inicializa a correção
     */
    function initialize() {
        try {
            console.log("Inicializando correção de visualização para saída do Ansible");
            
            // Adicionar estilos globais
            addGlobalStyles();
            
            // Aplicar correção ao toggle de output
            fixOutputToggle();
            
            // Marcar como inicializado
            window.ansibleOutputFixInitialized = true;
            
            console.log("Correção de visualização inicializada com sucesso");
        } catch (error) {
            console.error(`Erro ao inicializar correção: ${error.message}`);
        }
    }
    
    // Inicializar imediatamente
    initialize();
})();