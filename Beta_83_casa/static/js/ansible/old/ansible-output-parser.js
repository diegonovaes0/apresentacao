/**
 * ansible-output-parser.js
 * Parser de saída do Ansible para exibição amigável
 * Versão: 1.0
 */

class AnsibleOutputParser {
    constructor() {
        this.tasks = [];
        this.stats = {
            ok: 0,
            changed: 0,
            failed: 0,
            skipped: 0,
            unreachable: 0
        };
    }

    /**
     * Renderiza a saída do Ansible em formato amigável
     * @param {string} output - Saída bruta do Ansible
     * @param {HTMLElement} container - Elemento contenedor onde a saída será exibida
     * @param {Object} hostInfo - Informações do host (opcional)
     */
    renderModernOutput(output, container, hostInfo = null) {
        // Limpa o container
        container.innerHTML = '';
        
        // Prepara o contenedor principal
        container.className = 'ansible-modern-output';
        
        // Cria elementos UI base
        const headerEl = document.createElement('div');
        headerEl.className = 'ansible-output-header';
        
        const contentEl = document.createElement('div');
        contentEl.className = 'ansible-output-content';
        
        const progressEl = document.createElement('div');
        progressEl.className = 'ansible-output-progress-container';
        progressEl.innerHTML = `
            <div class="ansible-output-progress-bar" style="width: 0%"></div>
        `;
        
        const tasksEl = document.createElement('div');
        tasksEl.className = 'ansible-task-list';
        
        const summaryEl = document.createElement('div');
        summaryEl.className = 'ansible-output-summary';
        
        const controlsEl = document.createElement('div');
        controlsEl.className = 'ansible-output-controls';
        controlsEl.innerHTML = `
            <button class="ansible-toggle-view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Visualização Detalhada</span>
            </button>
            <button class="copy-output">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copiar Resultado</span>
            </button>
        `;
        
        // Monta a estrutura
        headerEl.appendChild(controlsEl);
        container.appendChild(headerEl);
        container.appendChild(progressEl);
        container.appendChild(contentEl);
        contentEl.appendChild(tasksEl);
        contentEl.appendChild(summaryEl);
        
        // Adiciona informações do host, se fornecidas
        if (hostInfo) {
            const hostInfoEl = document.createElement('div');
            hostInfoEl.className = 'ansible-host-info';
            
            let hostInfoHTML = '<div class="host-info-title">Informações do Host</div>';
            
            if (hostInfo.hostname) {
                hostInfoHTML += `
                    <div class="host-info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M8 21h8"></path>
                            <path d="M12 17v4"></path>
                        </svg>
                        <span class="info-label">Hostname:</span>
                        <span class="info-value">${hostInfo.hostname}</span>
                    </div>
                `;
            }
            
            if (hostInfo.public_ip) {
                hostInfoHTML += `
                    <div class="host-info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <span class="info-label">IP Público:</span>
                        <span class="info-value">${hostInfo.public_ip}</span>
                    </div>
                `;
            }
            
            if (hostInfo.private_ip) {
                hostInfoHTML += `
                    <div class="host-info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span class="info-label">IP Privado:</span>
                        <span class="info-value">${hostInfo.private_ip}</span>
                    </div>
                `;
            }
            
            if (hostInfo.system) {
                hostInfoHTML += `
                    <div class="host-info-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span class="info-label">Sistema:</span>
                        <span class="info-value">${hostInfo.system}</span>
                    </div>
                `;
            }
            
            hostInfoEl.innerHTML = hostInfoHTML;
            contentEl.insertBefore(hostInfoEl, tasksEl);
        }
        
        // Processa a saída e preenche os elementos
        this.parseOutputToTasks(output);
        this.renderTaskList(tasksEl);
        this.renderSummary(summaryEl);
        this.updateProgressBar(progressEl.querySelector('.ansible-output-progress-bar'));
        
        // Adiciona event listeners para interatividade
        this.attachEventListeners(container);
        
        // Adiciona estilos para o novo formato
        this.injectStyles();
    }
    
    /**
     * Processa a saída do Ansible e extrai tarefas
     * @param {string} output - Saída bruta do Ansible
     */
    parseOutputToTasks(output) {
        // Reset das estatísticas
        this.tasks = [];
        this.stats = {
            ok: 0,
            changed: 0,
            failed: 0,
            skipped: 0,
            unreachable: 0
        };
        
        // Divide por linhas
        const lines = output.split('\n');
        let currentTask = null;
        let currentPlayName = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Ignora linhas vazias
            if (!line) continue;
            
            // Detecta início de Play
            if (line.match(/PLAY \[.*\]/)) {
                const playMatch = line.match(/PLAY \[(.*)\]/);
                if (playMatch) {
                    currentPlayName = playMatch[1];
                }
                continue;
            }
            
            // Detecta início de Task
            if (line.match(/TASK \[.*\]/)) {
                const taskMatch = line.match(/TASK \[(.*)\]/);
                if (taskMatch) {
                    const taskName = taskMatch[1];
                    
                    // Finaliza tarefa anterior se existir
                    if (currentTask) {
                        this.tasks.push(currentTask);
                    }
                    
                    // Inicia nova tarefa
                    currentTask = {
                        name: taskName,
                        play: currentPlayName,
                        status: 'pending',
                        details: [],
                        hosts: {},
                        startLine: i
                    };
                }
                continue;
            }
            
            // Processa resultados das tarefas
            if (currentTask) {
                // Resultados de tarefas
                const statusMatch = line.match(/^(ok|changed|failed|skipping|unreachable):/i);
                
                if (statusMatch) {
                    const status = statusMatch[1].toLowerCase();
                    const hostMatch = line.match(/\[(.*?)\]/);
                    
                    if (hostMatch) {
                        const host = hostMatch[1];
                        currentTask.hosts[host] = status;
                        
                        // Atualiza o status da tarefa baseado na prioridade
                        // (failed > unreachable > changed > skipped > ok)
                        if (status === 'failed' || (currentTask.status !== 'failed' && status === 'unreachable') ||
                            (currentTask.status !== 'failed' && currentTask.status !== 'unreachable' && status === 'changed') ||
                            (currentTask.status !== 'failed' && currentTask.status !== 'unreachable' && 
                             currentTask.status !== 'changed' && status === 'skipped') ||
                            (currentTask.status === 'pending')) {
                            currentTask.status = status === 'skipping' ? 'skipped' : status;
                        }
                        
                        // Adiciona os detalhes (texto depois de =>)
                        const detailsMatch = line.match(/=> (.*)/);
                        if (detailsMatch) {
                            currentTask.details.push({
                                host,
                                text: detailsMatch[1],
                                status
                            });
                        }
                    }
                }
                
                // Detecta PLAY RECAP para finalizar a última tarefa
                if (line.match(/PLAY RECAP/)) {
                    if (currentTask) {
                        this.tasks.push(currentTask);
                        currentTask = null;
                    }
                    
                    // Processa estatísticas
                    for (let j = i + 1; j < lines.length; j++) {
                        const recapLine = lines[j].trim();
                        
                        // Linhas de estatísticas são no formato: hostname : ok=X changed=Y unreachable=Z failed=W
                        if (recapLine.match(/\s*:\s*ok=/)) {
                            // Extrai os números
                            const okMatch = recapLine.match(/ok=(\d+)/);
                            const changedMatch = recapLine.match(/changed=(\d+)/);
                            const unreachableMatch = recapLine.match(/unreachable=(\d+)/);
                            const failedMatch = recapLine.match(/failed=(\d+)/);
                            const skippedMatch = recapLine.match(/skipped=(\d+)/);
                            
                            // Atualiza estatísticas
                            if (okMatch) this.stats.ok += parseInt(okMatch[1]);
                            if (changedMatch) this.stats.changed += parseInt(changedMatch[1]);
                            if (unreachableMatch) this.stats.unreachable += parseInt(unreachableMatch[1]);
                            if (failedMatch) this.stats.failed += parseInt(failedMatch[1]);
                            if (skippedMatch) this.stats.skipped += parseInt(skippedMatch[1]);
                        }
                    }
                    
                    break; // Podemos parar de processar após encontrar o PLAY RECAP
                }
            }
        }
        
        // Adiciona última tarefa se ainda não foi adicionada
        if (currentTask) {
            this.tasks.push(currentTask);
        }
    }
    
    /**
     * Renderiza a lista de tarefas
     * @param {HTMLElement} container - Elemento onde renderizar as tarefas
     */
    renderTaskList(container) {
        let html = '';
        
        this.tasks.forEach((task, index) => {
            // Determina ícone baseado no status
            let statusIcon, statusClass;
            
            switch (task.status) {
                case 'ok':
                    statusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>`;
                    statusClass = 'ansible-task-success';
                    break;
                    
                case 'changed':
                    statusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>`;
                    statusClass = 'ansible-task-changed';
                    break;
                    
                case 'failed':
                    statusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>`;
                    statusClass = 'ansible-task-failed';
                    break;
                    
                case 'skipped':
                    statusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 5L5 19"/>
                        <path d="M16 10l4-5-5 1"/>
                    </svg>`;
                    statusClass = 'ansible-task-skipped';
                    break;
                    
                case 'unreachable':
                    statusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 1l22 22"/>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 16.87"/>
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-8.94"/>
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                        <path d="M12 20h.01"/>
                    </svg>`;
                    statusClass = 'ansible-task-failed';
                    break;
                    
                default: // pending ou outro
                    statusIcon = `<div class="spinner"></div>`;
                    statusClass = 'ansible-task-pending';
            }
            
            // Cria o item da tarefa
            html += `
                <div class="ansible-task-item ${statusClass}" data-task-index="${index}" data-task-name="${task.name}">
                    <div class="ansible-task-header">
                        <div class="status-icon">${statusIcon}</div>
                        <div class="ansible-task-name">${task.name}</div>
                        <div class="ansible-task-expand">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="ansible-task-detail" style="display: none;">
                        <div class="task-play">Play: ${task.play}</div>
                        ${task.details.length > 0 ? `
                            <div class="task-details">
                                ${task.details.map(detail => `
                                    <div class="task-detail-item task-detail-${detail.status}">
                                        <div class="detail-host">[${detail.host}]</div>
                                        <div class="detail-text">${detail.text}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<div class="task-no-details">Sem detalhes disponíveis</div>'}
                    </div>
                </div>
            `;
        });
        
        // Se não houver tarefas
        if (this.tasks.length === 0) {
            html = `
                <div class="ansible-no-tasks">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <path d="M13 2v7h7"></path>
                    </svg>
                    <p>Nenhuma tarefa executada ainda</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    /**
     * Renderiza o resumo da execução
     * @param {HTMLElement} container - Elemento onde renderizar o resumo
     * @returns {string} HTML do resumo
     */
    renderSummary(container) {
        const total = this.stats.ok + this.stats.changed + this.stats.failed + 
                     this.stats.skipped + this.stats.unreachable;
        
        let statusText = 'Em execução';
        let statusClass = 'status-running';
        
        if (this.stats.failed > 0 || this.stats.unreachable > 0) {
            statusText = 'Falhou';
            statusClass = 'status-failed';
        } else if (total > 0 && this.stats.failed === 0 && this.stats.unreachable === 0) {
            statusText = 'Sucesso';
            statusClass = 'status-success';
        }
        
        const html = `
            <div class="summary-header">Resumo da Execução</div>
            <div class="summary-status ${statusClass}">
                <span class="status-label">Status:</span>
                <span class="status-value">${statusText}</span>
            </div>
            <div class="summary-stats">
                <div class="stat-item stat-ok">
                    <span class="stat-value">${this.stats.ok}</span>
                    <span class="stat-label">OK</span>
                </div>
                <div class="stat-item stat-changed">
                    <span class="stat-value">${this.stats.changed}</span>
                    <span class="stat-label">Alterados</span>
                </div>
                <div class="stat-item stat-failed">
                    <span class="stat-value">${this.stats.failed}</span>
                    <span class="stat-label">Falhas</span>
                </div>
                <div class="stat-item stat-skipped">
                    <span class="stat-value">${this.stats.skipped}</span>
                    <span class="stat-label">Ignorados</span>
                </div>
                <div class="stat-item stat-unreachable">
                    <span class="stat-value">${this.stats.unreachable}</span>
                    <span class="stat-label">Inacessíveis</span>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        return html;
    }
    
    /**
     * Atualiza a barra de progresso
     * @param {HTMLElement} progressBar - Elemento da barra de progresso
     */
    updateProgressBar(progressBar) {
        const progress = this.calculateProgress();
        progressBar.style.width = `${progress}%`;
        
        // Atualiza cor baseada no progresso e status
        if (this.stats.failed > 0 || this.stats.unreachable > 0) {
            progressBar.style.backgroundColor = '#f14c4c'; // Vermelho para falhas
        } else if (this.stats.changed > 0) {
            progressBar.style.backgroundColor = '#dcdcaa'; // Amarelo para alterações
        } else {
            progressBar.style.backgroundColor = '#4ec9b0'; // Verde para sucesso
        }
    }
    
    /**
     * Calcula o progresso baseado nas tarefas
     * @returns {number} Porcentagem de progresso (0-100)
     */
    calculateProgress() {
        if (this.tasks.length === 0) return 0;
        
        const completedTasks = this.tasks.filter(task => 
            task.status !== 'pending'
        ).length;
        
        return Math.floor((completedTasks / this.tasks.length) * 100);
    }
    
    /**
     * Adiciona os event listeners aos elementos da interface
     * @param {HTMLElement} container - Container da saída
     */
    attachEventListeners(container) {
        // Botão para alternar visualização detalhada
        const toggleButton = container.querySelector('.ansible-toggle-view');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                container.classList.toggle('detailed-view');
                const span = toggleButton.querySelector('span');
                if (container.classList.contains('detailed-view')) {
                    span.textContent = 'Visualização Simples';
                } else {
                    span.textContent = 'Visualização Detalhada';
                }
            });
        }
        
        // Botão para copiar saída
        const copyButton = container.querySelector('.copy-output');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                // Extrai o texto limpo da saída
                const textToCopy = this.tasks.map(task => {
                    const status = task.status === 'ok' ? 'Concluído' :
                                 task.status === 'changed' ? 'Alterado' :
                                 task.status === 'failed' ? 'Falhou' :
                                 task.status === 'skipped' ? 'Ignorado' :
                                 task.status === 'unreachable' ? 'Inacessível' : 'Pendente';
                    
                    return `${task.name} - ${status}`;
                }).join('\n');
                
                // Copia para a área de transferência
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        const originalText = copyButton.innerHTML;
                        copyButton.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Copiado!
                        `;
                        setTimeout(() => {
                            copyButton.innerHTML = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Erro ao copiar: ', err);
                    });
            });
        }
        
        // Clique nos itens de tarefa para expandir
        container.querySelectorAll('.ansible-task-item').forEach(item => {
            item.addEventListener('click', () => {
                // Se estivermos em modo detalhado, não fazer nada
                if (container.classList.contains('detailed-view')) return;
                
                // Expandir apenas o item clicado
                const wasExpanded = item.classList.contains('expanded');
                
                // Primeiro, fecha todos
                container.querySelectorAll('.ansible-task-item').forEach(i => {
                    i.classList.remove('expanded');
                    i.querySelector('.ansible-task-detail').style.display = 'none';
                });
                
                // Se não estava expandido, expande
                if (!wasExpanded) {
                    item.classList.add('expanded');
                    const detail = item.querySelector('.ansible-task-detail');
                    if (detail) {
                        detail.style.display = 'block';
                        // Anima a exibição
                        detail.style.opacity = '0';
                        detail.style.maxHeight = '0';
                        
                        requestAnimationFrame(() => {
                            detail.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
                            detail.style.opacity = '1';
                            detail.style.maxHeight = '300px';
                        });
                    }
                }
            });
        });
    }
    
    /**
     * Atualiza o status de uma tarefa específica
     * @param {string} taskName - Nome da tarefa
     * @param {string} newStatus - Novo status
     * @param {HTMLElement} container - Container da saída
     */
    updateTaskStatus(taskName, newStatus, container) {
        // Atualiza no modelo de dados
        const taskIndex = this.tasks.findIndex(task => task.name === taskName);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].status = newStatus;
            
            // Atualiza estatísticas
            if (newStatus === 'ok' || newStatus === 'success') {
                this.stats.ok++;
            } else if (newStatus === 'changed') {
                this.stats.changed++;
            } else if (newStatus === 'failed') {
                this.stats.failed++;
            } else if (newStatus === 'skipped') {
                this.stats.skipped++;
            } else if (newStatus === 'unreachable') {
                this.stats.unreachable++;
            }
            
            // Atualiza a barra de progresso
            const progressBar = container.querySelector('.ansible-output-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${this.calculateProgress()}%`;
            }
            
            // Atualiza o elemento na interface
            const taskElement = container.querySelector(`.ansible-task-item[data-task-name="${taskName}"]`);
            if (taskElement) {
                // Remove classes de status anteriores
                taskElement.classList.remove('ansible-task-pending', 'ansible-task-running', 'ansible-task-success', 'ansible-task-failed', 'ansible-task-skipped');
                
                // Adiciona a nova classe de status
                taskElement.classList.add(`ansible-task-${newStatus}`);
                
                // Atualiza o ícone
                const statusIcon = taskElement.querySelector('.status-icon');
                if (statusIcon) {
                    switch (newStatus) {
                        case 'ok':
                        case 'success':
                            statusIcon.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                            `;
                            break;
                            
                        case 'changed':
                            statusIcon.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                            `;
                            break;
                            
                        case 'failed':
                            statusIcon.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                            `;
                            break;
                            
                        case 'skipped':
                            statusIcon.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 5L5 19"/>
                                    <path d="M16 10l4-5-5 1"/>
                                </svg>
                            `;
                            break;
                            
                        case 'unreachable':
                            statusIcon.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 1l22 22"/>
                                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 16.87"/>
                                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-8.94"/>
                                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                                    <path d="M12 20h.01"/>
                                </svg>
                            `;
                            break;
                            
                        case 'running':
                            statusIcon.innerHTML = `<div class="spinner"></div>`;
                            break;
                    }
                }
                
                // Animação de conclusão
                if (newStatus === 'ok' || newStatus === 'success') {
                    taskElement.style.animation = 'none';
                    setTimeout(() => {
                        taskElement.style.animation = 'successPulse 0.5s ease';
                    }, 10);
                }
            }
            
            // Atualiza o resumo
            const summaryElement = container.querySelector('.ansible-output-summary');
            if (summaryElement) {
                summaryElement.innerHTML = this.renderSummary(document.createElement('div'));
            }
        }
    }
    
    /**
     * Injeta os estilos CSS necessários para o parser
     */
    injectStyles() {
        if (document.getElementById('ansible-modern-output-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'ansible-modern-output-styles';
        style.textContent = `
            .ansible-modern-output {
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                color: #d4d4d4;
                background: #1e1e1e;
                border-radius: 6px;
                overflow: hidden;
                border: 1px solid #333;
                margin: 10px 0;
                max-width: 100%;
            }
            
            .ansible-output-header {
                background: #252526;
                padding: 8px 10px;
                display: flex;
                justify-content: flex-end;
                border-bottom: 1px solid #333;
            }
            
            .ansible-output-controls {
                display: flex;
                gap: 10px;
            }
            
            .ansible-output-controls button {
                background: #333;
                border: none;
                border-radius: 4px;
                color: #d4d4d4;
                padding: 5px 10px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: background 0.2s;
            }
            
            .ansible-output-controls button:hover {
                background: #3e3e3e;
            }
            
            .ansible-output-progress-container {
                width: 100%;
                height: 4px;
                background: #333;
                overflow: hidden;
            }
            
            .ansible-output-progress-bar {
                height: 100%;
                background: #4ec9b0;
                width: 0%;
                transition: width 0.3s ease, background-color 0.3s ease;
            }
            
            .ansible-output-content {
                padding: 10px;
            }
            
            .ansible-host-info {
                background: rgba(30, 30, 30, 0.5);
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid #333;
            }
            
            .host-info-title {
                font-weight: bold;
                color: #569cd6;
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .host-info-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 5px;
                font-size: 12px;
            }
            
            .host-info-item .info-label {
                color: #9cdcfe;
                min-width: 80px;
            }
            
            .host-info-item .info-value {
                color: #dcdcaa;
            }
            
            .ansible-task-list {
                margin-bottom: 15px;
            }
            
            .ansible-task-item {
                background: #252526;
                border-radius: 4px;
                margin-bottom: 8px;
                overflow: hidden;
                border-left: 4px solid transparent;
                transition: border-color 0.2s ease, background 0.2s ease;
                cursor: pointer;
            }
            
            .ansible-task-item.expanded {
                border-left-color: #569cd6;
            }
            
            .ansible-task-header {
                padding: 8px 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
            }
            
            .status-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .ansible-task-name {
                flex: 1;
                font-size: 13px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .ansible-task-expand {
                transition: transform 0.2s ease;
            }
            
            .ansible-task-item.expanded .ansible-task-expand {
                transform: rotate(180deg);
            }
            
            .ansible-task-detail {
                padding: 0 10px 10px 35px;
                font-size: 12px;
                overflow: hidden;
            }
            
            .task-play {
                color: #9cdcfe;
                margin-bottom: 8px;
            }
            
            .task-details {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .task-detail-item {
                display: flex;
                flex-direction: column;
                padding: 5px;
                border-radius: 3px;
                background: rgba(0, 0, 0, 0.2);
            }
            
            .detail-host {
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .detail-text {
                font-family: monospace;
                word-break: break-word;
                white-space: pre-wrap;
                font-size: 11px;
            }
            
            .task-no-details {
                color: #808080;
                font-style: italic;
            }
            
            /* Status colors */
            .ansible-task-success, .task-detail-ok {
                border-left-color: #4ec9b0 !important;
            }
            
            .ansible-task-success .status-icon {
                color: #4ec9b0;
            }
            
            .ansible-task-changed, .task-detail-changed {
                border-left-color: #dcdcaa !important;
            }
            
            .ansible-task-changed .status-icon {
                color: #dcdcaa;
            }
            
            .ansible-task-failed, .task-detail-failed, .task-detail-unreachable {
                border-left-color: #f14c4c !important;
            }
            
            .ansible-task-failed .status-icon {
                color: #f14c4c;
            }
            
            .ansible-task-skipped, .task-detail-skipped {
                border-left-color: #808080 !important;
            }
            
            .ansible-task-skipped .status-icon {
                color: #808080;
            }
            
            .ansible-task-pending .status-icon {
                color: #569cd6;
            }
            
            /* Spinner animation */
            .spinner {
                border: 2px solid rgba(86, 156, 214, 0.2);
                border-top: 2px solid #569cd6;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Summary styles */
            .ansible-output-summary {
                background: #252526;
                border-radius: 4px;
                padding: 12px;
                border: 1px solid #333;
            }
            
            .summary-header {
                font-weight: bold;
                color: #569cd6;
                margin-bottom: 10px;
                font-size: 14px;
            }
            
            .summary-status {
                margin-bottom: 15px;
                padding: 8px 12px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0, 0, 0, 0.2);
            }
            
            .status-running {
                border-left: 4px solid #569cd6;
            }
            
            .status-success {
                border-left: 4px solid #4ec9b0;
            }
            
            .status-failed {
                border-left: 4px solid #f14c4c;
            }
            
            .status-label {
                font-weight: bold;
            }
            
            .status-running .status-value {
                color: #569cd6;
            }
            
            .status-success .status-value {
                color: #4ec9b0;
            }
            
            .status-failed .status-value {
                color: #f14c4c;
            }
            
            .summary-stats {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .stat-item {
                background: #333;
                padding: 8px 12px;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 60px;
                flex: 1;
                border-top: 2px solid transparent;
            }
            
            .stat-value {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 2px;
            }
            
            .stat-label {
                font-size: 10px;
                color: #9cdcfe;
            }
            
            .stat-ok {
                border-top-color: #4ec9b0;
            }
            
            .stat-ok .stat-value {
                color: #4ec9b0;
            }
            
            .stat-changed {
                border-top-color: #dcdcaa;
            }
            
            .stat-changed .stat-value {
                color: #dcdcaa;
            }
            
            .stat-failed {
                border-top-color: #f14c4c;
            }
            
            .stat-failed .stat-value {
                color: #f14c4c;
            }
            
            .stat-skipped {
                border-top-color: #808080;
            }
            
            .stat-skipped .stat-value {
                color: #808080;
            }
            
            .stat-unreachable {
                border-top-color: #f14c4c;
            }
            
            .stat-unreachable .stat-value {
                color: #f14c4c;
            }
            
            /* No tasks message */
            .ansible-no-tasks {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: #9cdcfe;
                opacity: 0.7;
                text-align: center;
            }
            
            .ansible-no-tasks svg {
                margin-bottom: 10px;
                stroke: #9cdcfe;
            }
            
            /* Detailed view */
            .ansible-modern-output.detailed-view .ansible-task-detail {
                display: block !important;
            }
            
            .ansible-modern-output.detailed-view .ansible-task-expand {
                display: none;
            }
            
            .ansible-modern-output.detailed-view .ansible-task-item {
                cursor: default;
            }
            
            /* Success animation */
            @keyframes successPulse {
                0% { background-color: rgba(78, 201, 176, 0.3); }
                100% { background-color: #252526; }
            }
        `;
        
        document.head.appendChild(style);
    }
}

/**
 * Função para substituir a renderização padrão da saída do Ansible
 * @param {string} output - Saída bruta do Ansible
 * @param {HTMLElement} container - Container para renderizar
 * @param {Object} hostInfo - Informações do host (opcional)
 */
function formatAnsibleOutput(output, container) {
    // Extrai informações do host da saída
    const hostInfo = extractHostInfoFromOutput(output);

    // Usa o parser moderno
    const parser = new AnsibleOutputParser();
    parser.renderModernOutput(output, container, hostInfo);

    return container.innerHTML;
}

/**
 * Extrai informações do host da saída do Ansible
 * @param {string} output - Saída do Ansible
 * @returns {Object} Informações do host
 */
function extractHostInfoFromOutput(output) {
    const hostInfo = {};

    // Extrai o hostname
    const hostnameMatch = output.match(/Hostname:\s*([^\n]+)/i);
    if (hostnameMatch) {
        hostInfo.hostname = hostnameMatch[1].trim();
    }

    // Extrai o IP Público
    const publicIpMatch = output.match(/IP\s*Público:\s*([^\n]+)/i);
    if (publicIpMatch) {
        hostInfo.public_ip = publicIpMatch[1].trim();
    }

    // Extrai o IP Privado
    const privateIpMatch = output.match(/IP\s*Privado:\s*([^\n]+)/i);
    if (privateIpMatch) {
        hostInfo.private_ip = privateIpMatch[1].trim();
    }

    // Extrai o Sistema
    const systemMatch = output.match(/Sistema:\s*([^\n]+)/i);
    if (systemMatch) {
        hostInfo.system = systemMatch[1].trim();
    }

    return hostInfo;
}

/**
 * Substitui a função original monitorPlaybookExecution para usar a nova visualização
 */
function enhanceMonitorPlaybookExecution() {
    // Guarda referência à função original
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;

    // Cria instância do parser para cada job
    const parserInstances = new Map();

    // Substitui com a nova função
    window.monitorPlaybookExecution = function(jobId, card) {
        // Cria uma instância do parser para esse job
        if (!parserInstances.has(jobId)) {
            parserInstances.set(jobId, new AnsibleOutputParser());
        }
        
        const parser = parserInstances.get(jobId);
        
        const progressBar = card.querySelector('.progress-bar');
        const outputDiv = card.querySelector('.ansible-output');
        const statusDiv = card.querySelector('.task-status');

        function updateProgress() {
            try {
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        // Atualiza o output com o novo estilo
                        if (data.output) {
                            parser.renderModernOutput(data.output, outputDiv);
                        }
                        
                        // Atualiza a barra de progresso principal
                        if (data.progress !== undefined) {
                            progressBar.style.width = `${data.progress}%`;
                        }
                        
                        // Verifica o status final baseado no PLAY RECAP
                        if (data.output && data.output.includes('PLAY RECAP')) {
                            const outputLines = data.output.split('\n');
                            const recapLine = outputLines.find(line => line.includes('PLAY RECAP'));
                            if (recapLine) {
                                const failedCount = parseInt(recapLine.match(/failed=(\d+)/)?.[1] || 0);
                                const unreachableCount = parseInt(recapLine.match(/unreachable=(\d+)/)?.[1] || 0);
                                if (failedCount === 0 && unreachableCount === 0) {
                                    handlePlaybookCompletion('completed', card);
                                } else {
                                    handlePlaybookCompletion('failed', card);
                                }
                                
                                // Limpa a instância do parser
                                parserInstances.delete(jobId);
                                
                                return; // Para o monitoramento após encontrar o recap
                            }
                        }
                        
                        // Continua monitorando se ainda estiver em execução
                        if (data.status === 'running') {
                            setTimeout(updateProgress, 1000);
                        } else {
                            handlePlaybookCompletion(data.status, card);
                            
                            // Limpa a instância do parser
                            parserInstances.delete(jobId);
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                        handlePlaybookCompletion('failed', card);
                        
                        // Limpa a instância do parser
                        parserInstances.delete(jobId);
                    });
            } catch (error) {
                console.error(error);
                debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                handlePlaybookCompletion('failed', card);
                
                // Limpa a instância do parser
                parserInstances.delete(jobId);
            }
        }

        // Inicia o monitoramento
        updateProgress();
    };
}

// Inicializa a substituição quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Substituir a função formatAnsibleOutput
    window.formatAnsibleOutput = formatAnsibleOutput;

    // Melhorar a função de monitoramento
    enhanceMonitorPlaybookExecution();

    // Carregar o CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/ansible/ansible-output-modern.css';
    document.head.appendChild(link);

    debugLog('Formatação moderna da saída do Ansible inicializada');
});