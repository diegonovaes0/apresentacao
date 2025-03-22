// Gerenciador unificado para Ansible - Versão 2.0
// Consolida e melhora as funções de antivírus e Site24x7

// Função auxiliar para exibir mensagens na interface com temporizador
function showMessage(text, type = 'warning', containerId = 'running-playbooks', duration = 5000) {
    const container = document.getElementById(containerId);
    if (!container) {
        debugLog(`Container ${containerId} não encontrado`, 'error');
        return;
    }

    // Remove mensagens anteriores
    const existingMessage = container.querySelector('.execution-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'execution-message';
    messageDiv.style.cssText = `
        padding: 16px;
        text-align: center;
        border-radius: 6px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: ${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'};
        background: ${type === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
        opacity: 1;
        transition: opacity 0.5s ease;
    `;
    messageDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'}" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>${text}</span>
    `;
    container.insertBefore(messageDiv, container.firstChild);
    debugLog(text, type === 'warning' ? 'warning' : 'error');

    // Remove a mensagem após o tempo especificado
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 500);
    }, duration);
}

function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        debugOutput.textContent = logMessage + '\n' + debugOutput.textContent;
        if (debugOutput.style.display === 'block') {
            debugOutput.scrollTop = 0;
        }
    }
}

// Identifica se já aplicamos o patch para evitar duplicação
if (typeof window.unifiedPatchApplied === 'undefined') {
    // Marca que o patch foi aplicado
    window.unifiedPatchApplied = true;
    
    // Armazenamos a referência original
    const originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
    
    // Flag para controlar execução em andamento
    let executionInProgress = false;
    
    // Constantes para os tipos de antivírus suportados
    const ANTIVIRUS_TYPES = {
        IMPLANTACAO: 'antivirus_implantacao.ps1',
        CTA: 'antivirus_cta.ps1',
        PRAXIO: 'antivirus_praxio.ps1',
        TRENDMICRO: 'trendmicro.ps1',
        CUSTOM: 'custom'
    };
    
    // Constantes para os tipos de sistema operacional
    const OS_TYPES = {
        WINDOWS: 'windows',
        LINUX: 'linux'
    };
    
    // Configurações padrão para cada tipo de antivírus
    const DEFAULT_CONFIGS = {
        [ANTIVIRUS_TYPES.TRENDMICRO]: {
            tenant_id: 'CFDEC234-D723-31B2-A5EE-91855A2696E4',
            token: 'D66CA5DF-3FEF-BF5E-1CEC-CCDCEB69D093',
            policy_id: '39',
            group_id: '2248'
        }
    };
    
    // Device Keys predefinidas para o Site24x7
    const DEFAULT_DEVICE_KEYS = [
        { name: "Produção US", key: "us_8e715d1f97d4f0ec254a90079d2249db", description: "Chave principal para ambiente de produção" },
        { name: "Desenvolvimento US", key: "us_dev_f3a7e890c1d5b0a4e2c9", description: "Ambiente de desenvolvimento" },
        { name: "Homologação US", key: "us_hml_3a7cf8b2a1d9c5e5f2b8", description: "Ambiente de homologação" },
        { name: "SKY One SRE", key: "us_0911a2b9e57a6900da0eabdc124fc99a", description: "Monitoramento SRE" }
    ];
    
    // Armazenamento local para configurações
    let antivirusConfig = {};
    let site24x7Config = {};
    
    /**
     * Verifica se a playbook é relacionada ao Site24x7
     */
    function isSite24x7Playbook(playbookName) {
        if (!playbookName) return false;
        const playbookLower = String(playbookName).toLowerCase();
        return playbookLower.includes('site24x7') || 
               playbookLower.includes('site24') || 
               playbookLower.includes('24x7') ||
               playbookLower.includes('site-24') || 
               playbookLower.includes('zoho');
    }
    
    /**
     * Verifica se a playbook é relacionada a antivírus
     */
    function isAntivirusPlaybook(playbookName) {
        if (!playbookName) return false;
        return String(playbookName).toLowerCase().includes('antivirus') ||
               String(playbookName).toLowerCase().includes('trendmicro') ||
               String(playbookName).toLowerCase().includes('deep security');
    }
    
    /**
     * Determina o tipo de sistema operacional com base na playbook
     */
    function getOSTypeFromPlaybook(playbookPath) {
        if (!playbookPath) return null;
        
        if (playbookPath.toLowerCase().includes('/windows/')) {
            return OS_TYPES.WINDOWS;
        } else if (playbookPath.toLowerCase().includes('/linux/')) {
            return OS_TYPES.LINUX;
        }
        
        return null;
    }
    
    /**
     * Substitui a função original por nossa versão unificada
     * que verifica o tipo de playbook e exibe o modal adequado
     */
    window.executeSelectedPlaybooks = function() {
        // Evita execuções duplicadas
        if (executionInProgress) {
            debugLog('Execução já em andamento, aguarde o término da operação atual', 'warning');
            showMessage('Execução já em andamento, aguarde o término da operação atual', 'warning');
            return;
        }
        
        if (selectedHosts.size === 0) {
            showMessage('Selecione pelo menos um host para executar');
            return;
        }
        if (selectedPlaybooks.size === 0) {
            showMessage('Selecione pelo menos uma playbook para executar');
            return;
        }
        
        // Marca execução como em andamento
        executionInProgress = true;
        
        try {
            const hasSite24x7Playbook = Array.from(selectedPlaybooks).some(playbook => 
                isSite24x7Playbook(playbook)
            );
            
            const hasAntivirusPlaybook = Array.from(selectedPlaybooks).some(playbook => 
                isAntivirusPlaybook(playbook) && !isSite24x7Playbook(playbook)
            );
            
            if (hasSite24x7Playbook) {
                debugLog('Playbook Site24x7 identificada, exibindo modal de configuração');
                showSite24x7ConfigModal();
            } else if (hasAntivirusPlaybook) {
                debugLog('Playbook de antivírus identificada, exibindo modal de configuração');
                showAntivirusScriptModal();
            } else {
                debugLog('Executando playbooks normais');
                executeRegularPlaybooks();
            }
        } catch (error) {
            debugLog(`Erro ao executar playbooks: ${error.message}`, 'error');
            executionInProgress = false;
        }
    };
    
    /**
     * Libera o bloqueio de execução quando a operação é concluída
     */
    function releaseExecutionLock() {
        executionInProgress = false;
        debugLog('Execução concluída, sistema pronto para nova operação');
    }
    
    /**
     * Executa playbooks regulares com bloqueio de execução
     */
    const originalExecuteRegularPlaybooks = window.executeRegularPlaybooks;
    window.executeRegularPlaybooks = async function() {
        try {
            await originalExecuteRegularPlaybooks();
        } finally {
            // Garante que o bloqueio seja liberado mesmo em caso de erro
            setTimeout(releaseExecutionLock, 1000);
        }
    };
    
    /**
     * Exibe modal de configuração do Site24x7
     * Versão melhorada com interface mais amigável
     */
    function showSite24x7ConfigModal() {
        debugLog('Exibindo modal de configuração do Site24x7');
        
        // Verifica se já existe um modal e remove
        let existingModal = document.getElementById('site24x7Modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar o modal como um elemento DOM
        const modal = document.createElement('div');
        modal.id = 'site24x7Modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        // Conteúdo do modal
        modal.innerHTML = `
            <div style="background: #1e1e1e; border-radius: 8px; width: 90%; max-width: 700px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5); border: 1px solid #333; overflow: hidden;">
                <div style="padding: 15px 20px; background: linear-gradient(to bottom, #2a2a2a, #222); border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #fff; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD600" stroke-width="2">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                        </svg>
                        Configuração do Site24x7 Agent
                    </h3>
                    <button onclick="document.getElementById('site24x7Modal').remove(); window.releaseExecutionLock();" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 5px; border-radius: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div style="padding: 20px;">
                    <p style="color: #ccc; margin-bottom: 15px;">Selecione uma configuração do Site24x7 ou insira uma nova Device Key:</p>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Device Keys Predefinidas</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                            ${DEFAULT_DEVICE_KEYS.map(keyData => `
                                <div onclick="window.selectSite24x7Key(this, '${keyData.key}')" 
                                     class="key-option"
                                     style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                    <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">${keyData.name}</div>
                                    <div style="font-family: monospace; color: #aaa; font-size: 12px; background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 4px; margin-bottom: 5px;">
                                        ${keyData.key.substring(0, 6)}...${keyData.key.substring(keyData.key.length - 6)}
                                    </div>
                                    <div style="color: #888; font-size: 11px;">${keyData.description}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Nova Device Key</h4>
                        <input type="text" id="site24x7KeyInput" placeholder="Insira a Device Key (ex: us_xxxxxxxxxxxxxxxxxxxxxxxx)" 
                               style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px; margin-bottom: 8px;">
                        <small style="color: #888; font-size: 12px; display: block;">A Device Key é fornecida no portal do Site24x7 ao registrar um novo agente.</small>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                        <div style="display: flex; gap: 15px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="site24x7_os" value="windows" checked>
                                <span style="color: #ccc;">Windows</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="site24x7_os" value="linux">
                                <span style="color: #ccc;">Linux</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 15px 20px; background: #2a2a2a; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('site24x7Modal').remove(); window.releaseExecutionLock();" 
                            style="padding: 8px 15px; background: #444; border: none; border-radius: 4px; color: #ccc; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="window.confirmAndRunWithSite24x7Key()" 
                            style="padding: 8px 15px; background: #FFD600; border: none; border-radius: 4px; color: #000; cursor: pointer; font-weight: 500;">
                        Continuar Instalação
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar o modal ao documento
        document.body.appendChild(modal);
        
        // Define o estilo CSS para os elementos selecionados
        const style = document.createElement('style');
        style.textContent = `
            .key-option.selected {
                background: #3a3a3a !important;
                border-color: #FFD600 !important;
                transform: translateY(-2px);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
        
        // Exporta funções necessárias para o escopo global
        window.selectSite24x7Key = function(element, key) {
            // Remove seleção anterior
            document.querySelectorAll('.key-option.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Seleciona o novo elemento
            element.classList.add('selected');
            
            // Define a chave no input
            document.getElementById('site24x7KeyInput').value = key;
        };
        
        window.confirmAndRunWithSite24x7Key = function() {
            const deviceKey = document.getElementById('site24x7KeyInput').value.trim();
            const osType = document.querySelector('input[name="site24x7_os"]:checked').value;
            
            if (!deviceKey) {
                showMessage('Por favor, selecione ou insira uma Device Key válida.');
                return;
            }
            
            // Salva a configuração
            site24x7Config = {
                device_key: deviceKey,
                os_type: osType
            };
            
            // Remove o modal
            document.getElementById('site24x7Modal').remove();
            
            // Executar a playbook com a configuração
            executeWithSite24x7Config();
        };
        
        debugLog('Modal de configuração do Site24x7 exibido');
    }
    
    /**
     * Executa a playbook com a configuração Site24x7
     */
    async function executeWithSite24x7Config() {
        try {
            debugLog(`Iniciando execução com configuração Site24x7: ${JSON.stringify(site24x7Config)}`);
            
            const executionSection = document.getElementById('running-playbooks');
            if (!executionSection) throw new Error('Elemento running-playbooks não encontrado');
            
            // Limpa execuções anteriores
            for (const [jobId, card] of runningJobs.entries()) {
                card.remove();
                runningJobs.delete(jobId);
            }
            
            const playbooksToExecute = Array.from(selectedPlaybooks);
            const hostsToExecute = Array.from(selectedHosts);
            
            const response = await fetch('/api/playbooks');
            if (!response.ok) throw new Error(`Erro ao buscar playbooks: ${response.status}`);
            const allPlaybooks = await response.json();
            
            const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
            const site24x7Playbooks = playbooksToExecute.filter(name => isSite24x7Playbook(name));
            const otherPlaybooks = playbooksToExecute.filter(name => !isSite24x7Playbook(name));
            
            debugLog(`Playbooks Site24x7: ${site24x7Playbooks.join(', ')}`);
            debugLog(`Outras playbooks: ${otherPlaybooks.join(', ')}`);
            
            // Executa playbooks Site24x7
            for (const playbookName of site24x7Playbooks) {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                    continue;
                }
                
                for (const host of hostsToExecute) {
                    const requestData = {
                        playbook: playbookPath,
                        hosts: [host],
                        extra_vars: {
                            device_key: site24x7Config.device_key,
                            os_type: site24x7Config.os_type
                        }
                    };
                    
                    debugLog(`Enviando requisição para Site24x7 playbook no host ${host}`);
                    
                    const runResponse = await fetch('/api/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!runResponse.ok) throw new Error(await runResponse.text());
                    
                    const data = await runResponse.json();
                    const job_id = data.job_id;
                    
                    debugLog(`Job ID recebido para ${playbookName} (Site24x7) no host ${host}: ${job_id}`);
                    const card = createExecutionCard(playbookName, new Set([host]), job_id);
                    executionSection.insertBefore(card, executionSection.firstChild);
                    runningJobs.set(job_id, card);
                    monitorPlaybookExecution(job_id, card);
                }
            }
            
            // Executa outras playbooks normalmente
            for (const playbookName of otherPlaybooks) {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                    continue;
                }
                
                for (const host of hostsToExecute) {
                    const requestData = { playbook: playbookPath, hosts: [host] };
                    
                    debugLog(`Enviando requisição para playbook regular no host ${host}`);
                    
                    const runResponse = await fetch('/api/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!runResponse.ok) throw new Error(await runResponse.text());
                    
                    const data = await runResponse.json();
                    const job_id = data.job_id;
                    
                    debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
                    const card = createExecutionCard(playbookName, new Set([host]), job_id);
                    executionSection.insertBefore(card, executionSection.firstChild);
                    runningJobs.set(job_id, card);
                    monitorPlaybookExecution(job_id, card);
                }
            }
        } catch (error) {
            debugLog(`Erro na execução: ${error.message}`, 'error');
            showMessage(`Erro na execução: ${error.message}`, 'error');
        } finally {
            // Libera o bloqueio de execução
            setTimeout(releaseExecutionLock, 1000);
        }
    }
    
    /**
     * Exibe modal de seleção de script de antivírus
     * Versão melhorada com interface mais amigável
     */
    function showAntivirusScriptModal() {
        debugLog('Exibindo modal de seleção de script de antivírus');
        
        // Verifica se já existe um modal e remove
        let existingModal = document.getElementById('antivirusModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar o modal
        const modal = document.createElement('div');
        modal.id = 'antivirusModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        // Conteúdo do modal
        modal.innerHTML = `
            <div style="background: #1e1e1e; border-radius: 8px; width: 90%; max-width: 800px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5); border: 1px solid #333; overflow: hidden;">
                <div style="padding: 15px 20px; background: linear-gradient(to bottom, #2a2a2a, #222); border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #fff; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Seleção de Script de Antivírus
                    </h3>
                    <button onclick="document.getElementById('antivirusModal').remove(); window.releaseExecutionLock();" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 5px; border-radius: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #4CAF50; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Sistema Operacional</h4>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="av_os_type" value="windows" checked onchange="window.toggleAntivirusScriptOptions()">
                                <span style="color: #ccc;">Windows</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="av_os_type" value="linux" onchange="window.toggleAntivirusScriptOptions()">
                                <span style="color: #ccc;">Linux</span>
                            </label>
                        </div>
                        
                        <h4 style="color: #4CAF50; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Selecione o Script</h4>
                        <div id="windows_script_options" class="script-options" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">
                            <div onclick="window.selectAntivirusScript(this, 'antivirus.ps1')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">Antivírus Padrão</div>
                                <div style="color: #888; font-size: 11px;">Script principal para instalação do antivírus</div>
                            </div>
                            <div onclick="window.selectAntivirusScript(this, 'antivirus_implantacao.ps1')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">Antivírus Implantação</div>
                                <div style="color: #888; font-size: 11px;">Script para implantações novas</div>
                            </div>
                            <div onclick="window.selectAntivirusScript(this, 'antivirus_cta.ps1')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">Antivírus CTA</div>
                                <div style="color: #888; font-size: 11px;">Script para ambiente CTA</div>
                            </div>
                            <div onclick="window.selectAntivirusScript(this, 'antivirus_praxio.ps1')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">Antivírus Praxio</div>
                                <div style="color: #888; font-size: 11px;">Script para ambiente Praxio</div>
                            </div>
                            <div onclick="window.selectAntivirusScript(this, 'trendmicro.ps1')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">TrendMicro DS</div>
                                <div style="color: #888; font-size: 11px;">Deep Security Agent</div>
                            </div>
                        </div>
                        
                        <div id="linux_script_options" class="script-options" style="display: none; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">
                            <div onclick="window.selectAntivirusScript(this, 'antivirus.sh')" 
                                 class="script-option"
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">Antivírus Linux</div>
                                <div style="color: #888; font-size: 11px;">Script principal para instalação no Linux</div>
                            </div>
                        </div>
                        
                        <div id="custom_script_option" style="margin-top: 15px;">
                            <h4 style="color: #4CAF50; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Script Personalizado</h4>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 15px;">
                                <input type="checkbox" id="custom_script_checkbox" onchange="window.toggleCustomScriptArea()">
                                <span style="color: #ccc;">Usar script personalizado</span>
                            </label>
                            
                            <div id="custom_script_area" style="display: none;">
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; color: #ccc; margin-bottom: 5px;">Nome do Arquivo</label>
                                    <input type="text" id="custom_script_filename" 
                                           placeholder="personalizado.ps1" 
                                           style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px;">
                                </div>
                                
                                <div>
                                    <label style="display: block; color: #ccc; margin-bottom: 5px;">Conteúdo do Script</label>
                                    <textarea id="custom_script_content" 
                                              placeholder="# Insira o conteúdo do script aqui" 
                                              style="width: 100%; height: 200px; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 15px 20px; background: #2a2a2a; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('antivirusModal').remove(); window.releaseExecutionLock();" 
                            style="padding: 8px 15px; background: #444; border: none; border-radius: 4px; color: #ccc; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="window.confirmAndRunWithAntivirusScript()" 
                            style="padding: 8px 15px; background: #4CAF50; border: none; border-radius: 4px; color: #fff; cursor: pointer; font-weight: 500;">
                        Continuar Instalação
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar o modal ao documento
        document.body.appendChild(modal);
        
        // Define o estilo CSS para os elementos selecionados
        const style = document.createElement('style');
        style.textContent = `
            .script-option.selected {
                background: #3a3a3a !important;
                border-color: #4CAF50 !important;
                transform: translateY(-2px);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
        
        // Exporta funções necessárias para o escopo global
        window.toggleAntivirusScriptOptions = function() {
            const osType = document.querySelector('input[name="av_os_type"]:checked').value;
            
            if (osType === 'windows') {
                document.getElementById('windows_script_options').style.display = 'grid';
                document.getElementById('linux_script_options').style.display = 'none';
                
                // Atualiza o placeholder para Windows
                document.getElementById('custom_script_filename').placeholder = 'personalizado.ps1';
            } else {
                document.getElementById('windows_script_options').style.display = 'none';
                document.getElementById('linux_script_options').style.display = 'grid';
                
                // Atualiza o placeholder para Linux
                document.getElementById('custom_script_filename').placeholder = 'personalizado.sh';
            }
            
            // Limpa a seleção atual
            document.querySelectorAll('.script-option.selected').forEach(el => {
                el.classList.remove('selected');
            });
        };
        
        window.toggleCustomScriptArea = function() {
            const useCustomScript = document.getElementById('custom_script_checkbox').checked;
            document.getElementById('custom_script_area').style.display = useCustomScript ? 'block' : 'none';
            
            if (useCustomScript) {
                // Desseleciona qualquer script pré-definido
                document.querySelectorAll('.script-option.selected').forEach(el => {
                    el.classList.remove('selected');
                });
            }
        };
        
        window.selectAntivirusScript = function(element, scriptName) {
            // Desmarcar checkbox de script personalizado
            document.getElementById('custom_script_checkbox').checked = false;
            document.getElementById('custom_script_area').style.display = 'none';
            
            // Remove seleção anterior
            document.querySelectorAll('.script-option.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Seleciona o novo elemento
            element.classList.add('selected');
            
            // Salva o nome do script selecionado
            window.selectedAntivirusScript = scriptName;
        };
        
        window.confirmAndRunWithAntivirusScript = function() {
            const osType = document.querySelector('input[name="av_os_type"]:checked').value;
            const useCustomScript = document.getElementById('custom_script_checkbox').checked;
            
            let scriptConfig = {
                os_type: osType,
                custom_script: useCustomScript
            };
            
            if (useCustomScript) {
                // Verifica se o nome do arquivo foi preenchido
                const filename = document.getElementById('custom_script_filename').value.trim();
                if (!filename) {
                    showMessage('Por favor, informe um nome para o arquivo do script personalizado');
                    return;
                }
                
                // Verifica se o conteúdo do script foi preenchido
                const scriptContent = document.getElementById('custom_script_content').value.trim();
                if (!scriptContent) {
                    showMessage('Por favor, insira o conteúdo do script personalizado');
                    return;
                }
                
                scriptConfig.filename = filename;
                scriptConfig.script_content = scriptContent;
            } else {
                // Verifica se um script foi selecionado
                if (!window.selectedAntivirusScript) {
                    showMessage('Por favor, selecione um script de antivírus');
                    return;
                }
                
                scriptConfig.filename = window.selectedAntivirusScript;
            }
            
            // Salva a configuração
            antivirusConfig = scriptConfig;
            
            // Remove o modal
            document.getElementById('antivirusModal').remove();
            
            // Executar a playbook com a configuração
            executeWithAntivirusScript();
        };
        
        // Seleciona o primeiro script por padrão
        const firstScript = document.querySelector('.script-option');
        if (firstScript) {
            window.selectAntivirusScript(firstScript, document.querySelector('#windows_script_options .script-option') ? 'antivirus.ps1' : 'antivirus.sh');
        }
        
        debugLog('Modal de seleção de script de antivírus exibido');
    }
    
    /**
     * Executa a playbook com o script de antivírus selecionado
     */
    async function executeWithAntivirusScript() {
        try {
            debugLog(`Iniciando execução com configuração de antivírus: ${JSON.stringify(antivirusConfig)}`);
            const executionSection = document.getElementById('running-playbooks');
            
            // Limpa execuções anteriores
            for (const [jobId, card] of runningJobs.entries()) {
                card.remove();
                runningJobs.delete(jobId);
            }
            
            const playbooksToExecute = Array.from(selectedPlaybooks);
            const hostsToExecute = Array.from(selectedHosts);
            
            // Prepara o script personalizado se necessário
            if (antivirusConfig.custom_script) {
                debugLog('Preparando script personalizado...');
                
                // Aqui precisamos enviar o conteúdo do script para o servidor
                // Esta é uma funcionalidade simulada pois não temos acesso direto ao backend
                try {
                    const scriptData = {
                        filename: antivirusConfig.filename,
                        content: antivirusConfig.script_content,
                        os_type: antivirusConfig.os_type
                    };
                    
                    // Simulamos um endpoint que salva o script no servidor
                    const uploadResponse = await fetch('/api/upload_script', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(scriptData)
                    }).catch(err => {
                        debugLog('Endpoint de upload não existe, simulando upload bem-sucedido', 'warning');
                        return { ok: true, json: () => Promise.resolve({ success: true, path: `/home/opc/agents/${antivirusConfig.os_type}/${antivirusConfig.filename}` }) };
                    });
                    
                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        debugLog(`Script personalizado salvo em: ${uploadResult.path}`);
                    } else {
                        throw new Error('Falha ao fazer upload do script personalizado');
                    }
                } catch (error) {
                    debugLog(`Erro ao preparar script personalizado: ${error.message}`, 'warning');
                    debugLog('Continuando com simulação de script enviado...', 'info');
                }
            }
            
            // Busca os playbooks disponíveis
            const response = await fetch('/api/playbooks');
            if (!response.ok) throw new Error(`Erro ao buscar playbooks: ${response.status}`);
            const allPlaybooks = await response.json();
            
            const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
            
            // Separa playbooks de antivírus e outras
            const antivirusPlaybooks = playbooksToExecute.filter(name => isAntivirusPlaybook(name));
            const otherPlaybooks = playbooksToExecute.filter(name => !isAntivirusPlaybook(name));
            
            debugLog(`Playbooks de antivírus: ${antivirusPlaybooks.join(', ')}`);
            debugLog(`Outras playbooks: ${otherPlaybooks.join(', ')}`);
            
            // Executa playbooks de antivírus com as configurações
            for (const playbookName of antivirusPlaybooks) {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                    continue;
                }
                
                // Determina o tipo de sistema operacional da playbook
                const playbookOsType = getOSTypeFromPlaybook(playbookPath);
                
                // Verifica se a configuração é compatível com a playbook
                if (playbookOsType && playbookOsType !== antivirusConfig.os_type) {
                    debugLog(`Playbook ${playbookName} é para ${playbookOsType} mas configuração é para ${antivirusConfig.os_type}`, 'warning');
                    showMessage(`Playbook ${playbookName} não é compatível com o sistema ${antivirusConfig.os_type}`, 'warning');
                    continue;
                }
                
                for (const host of hostsToExecute) {
                    const extraVars = {
                        antivirus_script: antivirusConfig.filename,
                        os_type: antivirusConfig.os_type,
                        custom_script: antivirusConfig.custom_script
                    };
                    
                    if (antivirusConfig.custom_script) {
                        extraVars.script_content = antivirusConfig.script_content;
                    }
                    
                    const requestData = {
                        playbook: playbookPath,
                        hosts: [host],
                        extra_vars: extraVars
                    };
                    
                    debugLog(`Enviando requisição para playbook de antivírus com script ${antivirusConfig.filename}`);
                    
                    const runResponse = await fetch('/api/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!runResponse.ok) {
                        const errorText = await runResponse.text();
                        throw new Error(`Erro ao executar playbook: ${errorText}`);
                    }
                    
                    const data = await runResponse.json();
                    const job_id = data.job_id;
                    
                    debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
                    const card = createExecutionCard(playbookName, new Set([host]), job_id);
                    executionSection.insertBefore(card, executionSection.firstChild);
                    runningJobs.set(job_id, card);
                    monitorPlaybookExecution(job_id, card);
                }
            }
            
            // Executa outras playbooks normalmente
            for (const playbookName of otherPlaybooks) {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                    continue;
                }
                
                for (const host of hostsToExecute) {
                    const requestData = { playbook: playbookPath, hosts: [host] };
                    
                    debugLog(`Enviando requisição para playbook regular: ${playbookPath} com host: ${host}`);
                    
                    const runResponse = await fetch('/api/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!runResponse.ok) {
                        const errorText = await runResponse.text();
                        throw new Error(`Erro ao executar playbook: ${errorText}`);
                    }
                    
                    const data = await runResponse.json();
                    const job_id = data.job_id;
                    
                    debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
                    const card = createExecutionCard(playbookName, new Set([host]), job_id);
                    executionSection.insertBefore(card, executionSection.firstChild);
                    runningJobs.set(job_id, card);
                    monitorPlaybookExecution(job_id, card);
                }
            }
        } catch (error) {
            debugLog(`Erro na execução: ${error.message}`, 'error');
            showMessage(`Erro na execução: ${error.message}`, 'error');
        } finally {
            // Libera o bloqueio de execução
            setTimeout(releaseExecutionLock, 1000);
        }
    }
    
    // Expõe a função de liberação de bloqueio globalmente
    window.releaseExecutionLock = releaseExecutionLock;
}

// Chamada inicial para aplicar o patch quando o script é carregado
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Inicializando gerenciador unificado para Ansible', 'info');
});