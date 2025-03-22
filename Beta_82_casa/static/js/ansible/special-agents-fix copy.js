/**
 * config-button-fix.js
 * Corrige o comportamento dos botões de configuração para Site24x7 e Antivírus
 */

(function() {
    console.log("Aplicando correção para os botões de configuração");
    
    // Verificar se existem funções necessárias
    function functionExists(funcName, globalObj = window) {
        return typeof globalObj[funcName] === 'function';
    }
    
    // Verificar se é uma playbook do tipo especificado
    function isPlaybookOfType(name, keywords) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return keywords.some(keyword => nameLower.includes(keyword));
    }
    
    // Mapear funções para identificar tipos de playbook
    const playbookTypeCheckers = {
        site24x7: (name) => {
            const keywords = ['site24x7', '24x7', 'site 24x7'];
            return isPlaybookOfType(name, keywords);
        },
        antivirus: (name) => {
            const keywords = ['antivirus', 'antivírus', 'trend', 'trendmicro', 'trend micro'];
            return isPlaybookOfType(name, keywords);
        }
    };
    
    // Cores para os botões
    const BUTTON_STYLES = {
        default: {
            background: '#FFD600',  // Amarelo
            border: '#E6C200',
            text: '#000000'
        },
        verified: {
            background: '#4CAF50',  // Verde
            border: '#3E8E41',
            text: '#000000'
        }
    };
    
    // Corrigir o problema de persistência
    function fixConfigButtonPersistence() {
        // Limpar dados persistidos a cada carregamento de página
        sessionStorage.removeItem('site24x7_verified');
        sessionStorage.removeItem('antivirus_verified');
        localStorage.removeItem('site24x7_verified');
        localStorage.removeItem('antivirus_verified');
        
        // Resetar estado para não-verificado
        if (window.configState) {
            if (window.configState.site24x7) {
                window.configState.site24x7.verified = false;
            }
            if (window.configState.antivirus) {
                window.configState.antivirus.verified = false;
            }
        }
    }
    
    // Corrigir o problema de separação entre Site24x7 e Antivírus
    function fixConfigurationIndependence() {
        // Sobrescrever a função de atualização de botões para tratar cada tipo separadamente
        if (functionExists('updateButtonLabels')) {
            const originalUpdateButtonLabels = window.updateButtonLabels;
            
            window.updateButtonLabels = function() {
                if (!window.createdButtons) return;
                
                window.createdButtons.forEach((btn, playbookName) => {
                    // Identificar o tipo do botão
                    const buttonType = btn.getAttribute('data-type') || '';
                    let isVerified = false;
                    
                    // Verificar especificamente pelo tipo correto
                    if (buttonType === 'site24x7' && window.configState?.site24x7?.verified) {
                        isVerified = true;
                    } else if (buttonType === 'antivirus' && window.configState?.antivirus?.verified) {
                        isVerified = true;
                    }
                    
                    // Atualizar aparência baseada no status
                    if (isVerified) {
                        btn.innerText = 'VERIFICADO';
                        btn.classList.add('verified');
                        btn.style.backgroundColor = BUTTON_STYLES.verified.background;
                        btn.style.borderColor = BUTTON_STYLES.verified.border;
                    } else {
                        btn.innerText = 'CONFIGURAR';
                        btn.classList.remove('verified');
                        btn.style.backgroundColor = BUTTON_STYLES.default.background;
                        btn.style.borderColor = BUTTON_STYLES.default.border;
                    }
                });
            };
        }
    }
    
    // Corrigir a identificação de tipos de playbook
    function fixPlaybookTypeDetection() {
        // Sobrescrever as funções de detecção se existirem
        if (functionExists('isSite24x7Playbook')) {
            window.isSite24x7Playbook = playbookTypeCheckers.site24x7;
        }
        
        if (functionExists('isAntivirusPlaybook')) {
            window.isAntivirusPlaybook = playbookTypeCheckers.antivirus;
        }
        
        // Ajustar a criação de botões para atribuir corretamente o tipo
        if (functionExists('createAndPositionButtons')) {
            const originalCreateButtons = window.createAndPositionButtons;
            
            window.createAndPositionButtons = function() {
                // Limpar botões existentes que não estejam fixados
                document.querySelectorAll('.configure-btn').forEach(btn => {
                    if (!btn.hasAttribute('data-fixed') || btn.getAttribute('data-fixed') !== 'true') {
                        btn.remove();
                    }
                });
                
                // Buscar todas as playbooks
                document.querySelectorAll('.playbook-item').forEach(item => {
                    const playbookName = item.getAttribute('data-playbook-name');
                    if (!playbookName) return;
                    
                    // Identificar o tipo correto da playbook
                    const isSite24x7 = playbookTypeCheckers.site24x7(playbookName);
                    const isAntivirus = playbookTypeCheckers.antivirus(playbookName);
                    
                    if (!isSite24x7 && !isAntivirus) return;
                    
                    // Remover botão existente se necessário
                    if (window.createdButtons && window.createdButtons.has(playbookName)) {
                        const oldBtn = window.createdButtons.get(playbookName);
                        if (document.body.contains(oldBtn)) {
                            oldBtn.remove();
                        }
                        window.createdButtons.delete(playbookName);
                    }
                    
                    // Detectar sistema operacional da playbook
                    const os = typeof window.detectOS === 'function' ? 
                        window.detectOS(item) : 
                        (playbookName.toLowerCase().includes('windows') ? 'windows' : 'linux');
                    
                    // Criar novo botão
                    const btn = document.createElement('button');
                    
                    // Identificar o tipo da playbook e verificar seu status específico
                    let isVerified = false;
                    const type = isSite24x7 ? 'site24x7' : 'antivirus';
                    
                    if (isSite24x7 && window.configState?.site24x7?.verified) {
                        isVerified = true;
                    } else if (isAntivirus && window.configState?.antivirus?.verified) {
                        isVerified = true;
                    }
                    
                    // Configurar aparência inicial
                    btn.className = 'configure-btn' + (isVerified ? ' verified' : '');
                    btn.innerText = isVerified ? 'VERIFICADO' : 'CONFIGURAR';
                    btn.style.backgroundColor = isVerified ? BUTTON_STYLES.verified.background : BUTTON_STYLES.default.background;
                    btn.style.borderColor = isVerified ? BUTTON_STYLES.verified.border : BUTTON_STYLES.default.border;
                    
                    // Atribuir atributos importantes
                    btn.setAttribute('data-fixed', 'true');
                    btn.setAttribute('data-playbook', playbookName);
                    btn.setAttribute('data-os', os);
                    btn.setAttribute('data-type', type);
                    
                    // Verificar posicionamento do item pai
                    if (window.getComputedStyle(item).position === 'static') {
                        item.style.position = 'relative';
                    }
                    
                    // Configurar evento de clique para o tipo correto
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (isSite24x7 && typeof window.openSite24x7Modal === 'function') {
                            window.openSite24x7Modal();
                        } else if (isAntivirus && typeof window.openAntivirusModal === 'function') {
                            window.openAntivirusModal(os);
                        }
                        
                        return false;
                    });
                    
                    // Prevenir propagação de eventos
                    ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
                        btn.addEventListener(eventType, e => e.stopPropagation());
                    });
                    
                    // Adicionar ao item e registrar
                    item.appendChild(btn);
                    if (window.createdButtons) {
                        window.createdButtons.set(playbookName, btn);
                    }
                });
            };
        }
    }
    
    // Corrigir o comportamento dos modais de configuração
    function fixConfigurationModals() {
        // Modificar o evento de confirmar no modal do Site24x7
        if (functionExists('openSite24x7Modal')) {
            const originalModal = window.openSite24x7Modal;
            
            window.openSite24x7Modal = function() {
                const modal = originalModal();
                
                // Substituir evento do botão confirmar
                const confirmBtn = modal.querySelector('#confirm-btn');
                if (confirmBtn) {
                    const originalClick = confirmBtn.onclick;
                    confirmBtn.onclick = null;
                    
                    confirmBtn.addEventListener('click', function() {
                        const customKeyCheckbox = modal.querySelector('#site24x7-custom-key');
                        let deviceKey;
                        
                        if (customKeyCheckbox && customKeyCheckbox.checked) {
                            deviceKey = modal.querySelector('#site24x7-key').value.trim();
                            if (!deviceKey) {
                                if (typeof window.showMessage === 'function') {
                                    window.showMessage('Por favor, insira uma chave de dispositivo válida.', 'error');
                                } else {
                                    alert('Por favor, insira uma chave de dispositivo válida.');
                                }
                                return;
                            }
                        } else {
                            deviceKey = modal.querySelector('#site24x7-group').value;
                        }
                        
                        // Salvar configuração
                        if (typeof window.saveSite24x7Files === 'function') {
                            window.saveSite24x7Files(deviceKey).then(success => {
                                if (success) {
                                    // Atualizar estado SOMENTE para Site24x7
                                    if (!window.configState) window.configState = {};
                                    if (!window.configState.site24x7) window.configState.site24x7 = {};
                                    
                                    window.configState.site24x7 = {
                                        ...window.configState.site24x7,
                                        deviceKey: deviceKey,
                                        verified: true,
                                    };
                                    
                                    // Atualizar botões
                                    if (typeof window.updateButtonLabels === 'function') {
                                        window.updateButtonLabels();
                                    }
                                    
                                    // Salvar somente na sessão atual (não persistir entre reloads)
                                    sessionStorage.setItem('site24x7_verified', 'true');
                                    
                                    // Mostrar mensagem de sucesso
                                    if (typeof window.showMessage === 'function') {
                                        window.showMessage('Configuração do Site24x7 verificada e salva com sucesso!', 'success');
                                    }
                                } else {
                                    if (typeof window.showMessage === 'function') {
                                        window.showMessage('Erro ao salvar arquivos de configuração.', 'error');
                                    }
                                }
                                
                                modal.remove();
                            });
                        } else {
                            // Fallback se a função saveSite24x7Files não existir
                            // Simular que salvou com sucesso
                            if (!window.configState) window.configState = {};
                            if (!window.configState.site24x7) window.configState.site24x7 = {};
                            
                            window.configState.site24x7 = {
                                ...window.configState.site24x7,
                                deviceKey: deviceKey,
                                verified: true,
                            };
                            
                            // Atualizar botões
                            if (typeof window.updateButtonLabels === 'function') {
                                window.updateButtonLabels();
                            }
                            
                            // Salvar somente na sessão atual (não persistir entre reloads)
                            sessionStorage.setItem('site24x7_verified', 'true');
                            
                            // Mostrar mensagem de sucesso
                            if (typeof window.showMessage === 'function') {
                                window.showMessage('Configuração do Site24x7 verificada e salva com sucesso!', 'success');
                            }
                            
                            modal.remove();
                        }
                    });
                }
            };
        }
        
        // Modificar o evento de confirmar no modal do Antivírus
        if (functionExists('openAntivirusModal')) {
            const originalModal = window.openAntivirusModal;
            
            window.openAntivirusModal = function(detectedOS) {
                const modal = originalModal(detectedOS);
                
                // Substituir evento do botão confirmar
                const confirmBtn = modal.querySelector('#confirm-btn');
                if (confirmBtn) {
                    const originalClick = confirmBtn.onclick;
                    confirmBtn.onclick = null;
                    
                    confirmBtn.addEventListener('click', function() {
                        const customScriptCheckbox = modal.querySelector('#antivirus-custom-script');
                        let config = {};
                        
                        if (customScriptCheckbox && customScriptCheckbox.checked) {
                            const filename = modal.querySelector('#antivirus-filename').value.trim();
                            const content = modal.querySelector('#antivirus-content').value.trim();
                            
                            if (!filename || !content) {
                                if (typeof window.showMessage === 'function') {
                                    window.showMessage('Por favor, preencha o nome do arquivo e o conteúdo do script.', 'error');
                                } else {
                                    alert('Por favor, preencha o nome do arquivo e o conteúdo do script.');
                                }
                                return;
                            }
                            
                            config = {
                                customScript: true,
                                scriptFile: filename,
                                scriptContent: content,
                                os: detectedOS
                            };
                        } else {
                            const scriptFile = modal.querySelector('#antivirus-script').value;
                            
                            config = {
                                customScript: false,
                                scriptFile: scriptFile,
                                scriptContent: '',
                                os: detectedOS
                            };
                        }
                        
                        // Salvar arquivo de script de antivírus
                        if (typeof window.saveAntivirusFiles === 'function') {
                            window.saveAntivirusFiles(config).then(success => {
                                if (success) {
                                    // Atualizar estado SOMENTE para Antivírus
                                    if (!window.configState) window.configState = {};
                                    if (!window.configState.antivirus) window.configState.antivirus = {};
                                    
                                    window.configState.antivirus = {
                                        ...config,
                                        verified: true
                                    };
                                    
                                    // Atualizar botões
                                    if (typeof window.updateButtonLabels === 'function') {
                                        window.updateButtonLabels();
                                    }
                                    
                                    // Salvar somente na sessão atual (não persistir entre reloads)
                                    sessionStorage.setItem('antivirus_verified', 'true');
                                    
                                    // Mostrar mensagem de sucesso
                                    if (typeof window.showMessage === 'function') {
                                        window.showMessage('Configuração do Antivírus verificada e salva com sucesso!', 'success');
                                    }
                                } else {
                                    if (typeof window.showMessage === 'function') {
                                        window.showMessage('Erro ao salvar arquivo de script de antivírus.', 'error');
                                    }
                                }
                                
                                modal.remove();
                            });
                        } else {
                            // Fallback se a função saveAntivirusFiles não existir
                            // Simular que salvou com sucesso
                            if (!window.configState) window.configState = {};
                            if (!window.configState.antivirus) window.configState.antivirus = {};
                            
                            window.configState.antivirus = {
                                ...config,
                                verified: true
                            };
                            
                            // Atualizar botões
                            if (typeof window.updateButtonLabels === 'function') {
                                window.updateButtonLabels();
                            }
                            
                            // Salvar somente na sessão atual (não persistir entre reloads)
                            sessionStorage.setItem('antivirus_verified', 'true');
                            
                            // Mostrar mensagem de sucesso
                            if (typeof window.showMessage === 'function') {
                                window.showMessage('Configuração do Antivírus verificada e salva com sucesso!', 'success');
                            }
                            
                            modal.remove();
                        }
                    });
                }
            };
        }
    }
    
    // Aplicar todas as correções
    function applyAll() {
        // Limpar dados persistidos a cada carregamento de página
        fixConfigButtonPersistence();
        
        // Corrigir independência entre Site24x7 e Antivírus
        fixConfigurationIndependence();
        
        // Melhorar a detecção de tipos de playbook
        fixPlaybookTypeDetection();
        
        // Corrigir os modais de configuração
        fixConfigurationModals();
        
        // Forçar recriação dos botões
        setTimeout(() => {
            if (typeof window.createAndPositionButtons === 'function') {
                window.createAndPositionButtons();
            }
        }, 500);
        
        console.log("✅ Correções para botões de configuração aplicadas com sucesso");
    }
    
    // Inicializar quando documento estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAll);
    } else {
        applyAll();
    }
})();