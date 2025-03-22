/**
 * Fix para validação de baseline
 * 
 * Este patch combina a funcionalidade de validação do primeiro script
 * com a interface do segundo, sem usar alerts e garantindo que o usuário
 * configure o baseline antes de prosseguir.
 */

(function() {
    console.log("[Ansible Baseline Fix] Aplicando correção para validação de baseline");

    // Função para forçar a configuração de baseline
    function forceBaselineConfiguration() {
        // Melhorar a função showSimpleConfigRequiredMessage
        window.showSimpleConfigRequiredMessage = function(hostname) {
            const hostMsg = hostname ? ` para o host ${hostname}` : '';
            const message = `É necessário configurar o baseline${hostMsg} antes de executar esta playbook.`;
            
            // Usar função global de mensagem do sistema
            if (typeof window.showMessage === 'function') {
                window.showMessage(message, 'warning', 8000); // Aumenta para 8 segundos para maior visibilidade
            } else {
                // Implementação alternativa
                const container = document.querySelector('#running-playbooks') || document.body;
                
                // Remover mensagens existentes primeiro
                const existingMsgs = container.querySelectorAll('.baseline-warning-message');
                existingMsgs.forEach(el => el.remove());
                
                const msgElement = document.createElement('div');
                msgElement.className = 'baseline-warning-message';
                msgElement.style.cssText = `
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    border-radius: 6px;
                    border-left: 4px solid #FFD600;
                    background: rgba(255, 214, 0, 0.1);
                    color: #333;
                    animation: fadeIn 0.3s;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `;
                msgElement.innerHTML = `
                    <div>
                        <span style="color: #FFD600; margin-right: 10px;">⚠️</span>
                        <span>${message}</span>
                    </div>
                    <button style="background: #FFD600; border: none; color: black; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Configurar</button>
                `;
                container.insertBefore(msgElement, container.firstChild);
                
                // Adicionar evento ao botão "Configurar"
                const configBtn = msgElement.querySelector('button');
                if (configBtn) {
                    configBtn.addEventListener('click', () => {
                        // Abrir configuração para o primeiro host não configurado ou o host específico
                        if (hostname) {
                            openHostConfigBanner(hostname);
                        } else {
                            const unconfiguredHosts = getUnconfiguredHosts();
                            if (unconfiguredHosts.length > 0) {
                                openHostConfigBanner(unconfiguredHosts[0]);
                            }
                        }
                        
                        // Remover mensagem após clicar
                        msgElement.remove();
                    });
                }
                
                // Auto-remover após 8 segundos
                setTimeout(() => {
                    if (msgElement.parentNode) msgElement.remove();
                }, 8000);
            }
            
            // Abrir configurações automaticamente para os hosts não configurados
            setTimeout(() => {
                if (hostname) {
                    openHostConfigBanner(hostname);
                } else {
                    const unconfiguredHosts = getUnconfiguredHosts();
                    if (unconfiguredHosts.length > 0) {
                        openHostConfigBanner(unconfiguredHosts[0]);
                    }
                }
            }, 200);
        };
    }

    // Função para abrir banner de configuração para um host específico
    function openHostConfigBanner(hostname) {
        console.log(`[Ansible Baseline Fix] Abrindo banner para: ${hostname}`);
        
        // Verificar se a função para adicionar banners existe no segundo script
        if (typeof window.baselineMultiHostFix !== 'undefined' && 
            typeof window.baselineMultiHostFix.addConfigBanner === 'function') {
            window.baselineMultiHostFix.addConfigBanner(hostname);
        } else {
            // Usar a função do primeiro script como fallback
            if (typeof window.toggleBaselineBanner === 'function') {
                window.toggleBaselineBanner(hostname);
            } else {
                console.error(`[Ansible Baseline Fix] Nenhuma função disponível para abrir banner de configuração`);
            }
        }
        
        // Realçar o banner para chamar atenção
        setTimeout(() => {
            // Identificar o banner pelo hostname para realçar
            const banners = document.querySelectorAll('.baseline-config-banner, .baseline-banner');
            banners.forEach(banner => {
                if (banner.innerHTML.includes(hostname)) {
                    banner.style.boxShadow = '0 0 0 4px #FFD600';
                    banner.style.animation = 'pulse 1s infinite';
                    
                    // Parar a animação após alguns segundos
                    setTimeout(() => {
                        banner.style.animation = '';
                    }, 5000);
                }
            });
        }, 500);
    }
    
    // Função para obter hosts não configurados
    function getUnconfiguredHosts() {
        if (typeof window.baselineMultiHostFix !== 'undefined' && 
            typeof window.baselineMultiHostFix.STATE !== 'undefined') {
            
            const unconfiguredHosts = [];
            document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
                const input = hostElement.querySelector('input[type="checkbox"]');
                if (input) {
                    const hostname = input.getAttribute('data-hostname');
                    if (hostname) {
                        // Usar a função getHostConfig do segundo script
                        const config = window.baselineMultiHostFix.getHostConfig(hostname);
                        if (!config || 
                            !config.parceiroPassword || 
                            config.parceiroPassword.length < 8 || 
                            !config.rootPassword || 
                            config.rootPassword.length < 8) {
                            unconfiguredHosts.push(hostname);
                        }
                    }
                }
            });
            return unconfiguredHosts;
        } else {
            // Implementação alternativa baseada no primeiro script
            const unconfiguredHosts = [];
            document.querySelectorAll('.host-banner.selected').forEach(hostElement => {
                const checkbox = hostElement.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.dataset.hostname) {
                    const hostname = checkbox.dataset.hostname;
                    // Verificar se está configurado usando o primeiro script
                    if (!isHostConfigured(hostname)) {
                        unconfiguredHosts.push(hostname);
                    }
                }
            });
            return unconfiguredHosts;
        }
    }
    
    // Função para verificar se um host está configurado (compatível com o primeiro script)
    function isHostConfigured(hostname) {
        const parceiroPassword = document.getElementById(`baseline-parceiro-password-${hostname}`)?.value;
        const rootPassword = document.getElementById(`baseline-root-password-${hostname}`)?.value;
        
        return (
            parceiroPassword && parceiroPassword.length >= 8 && 
            rootPassword && rootPassword.length >= 8
        );
    }
    
    // Melhorar a função de interceptação de execução de playbooks
    function enhancePlaybookExecution() {
        console.log("[Ansible Baseline Fix] Modificando interceptação de execução");
        
        // Se a função já existe no segundo script, enhance-la
        if (typeof window.interceptPlaybookExecution === 'function') {
            const originalInterceptFunction = window.interceptPlaybookExecution;
            
            window.interceptPlaybookExecution = function() {
                // Chamar a função original
                originalInterceptFunction.apply(this, arguments);
                
                console.log("[Ansible Baseline Fix] Aplicando validação forçada");
                
                // Substituir a função executeSelectedPlaybooks novamente
                const originalExecuteFunc = window.executeSelectedPlaybooks;
                
                window.executeSelectedPlaybooks = function() {
                    console.log("[Ansible Baseline Fix] Validando antes da execução");
                    
                    // Verificar se estamos tentando executar um baseline
                    if (typeof window.baselineMultiHostFix !== 'undefined' && 
                        typeof window.baselineMultiHostFix.validateHostsConfiguration === 'function') {
                        
                        // Usar função do segundo script
                        if (!window.baselineMultiHostFix.validateHostsConfiguration()) {
                            console.warn("[Ansible Baseline Fix] Execução bloqueada: hosts não configurados");
                            
                            // Mostrar mensagem e forçar configuração
                            window.showSimpleConfigRequiredMessage();
                            
                            return; // Bloquear execução
                        }
                    } else if (typeof isAnyBaselineSelected === 'function') {
                        // Usar função do primeiro script
                        if (isAnyBaselineSelected()) {
                            const unconfiguredHosts = getUnconfiguredHosts();
                            if (unconfiguredHosts.length > 0) {
                                console.warn("[Ansible Baseline Fix] Execução bloqueada: hosts não configurados");
                                
                                // Mostrar mensagem e forçar configuração
                                window.showSimpleConfigRequiredMessage();
                                
                                return; // Bloquear execução
                            }
                        }
                    }
                    
                    // Se chegou aqui, continuar com a execução
                    return originalExecuteFunc.apply(this, arguments);
                };
            };
            
            // Chamar a função aprimorada
            window.interceptPlaybookExecution();
        } else {
            // Se não existe, implementar com base no primeiro script
            window.interceptPlaybookExecution = function() {
                console.log("[Ansible Baseline Fix] Implementando validação de baseline");
                
                // Guardar função original
                if (typeof window.originalExecuteSelectedPlaybooks === 'undefined' && 
                    typeof window.executeSelectedPlaybooks === 'function') {
                    
                    window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
                    
                    window.executeSelectedPlaybooks = function() {
                        console.log("[Ansible Baseline Fix] Verificando configuração antes de executar");
                        
                        // Verificar se é baseline
                        if (isAnyBaselineSelected()) {
                            // Verificar hosts não configurados
                            const unconfiguredHosts = getUnconfiguredHosts();
                            if (unconfiguredHosts.length > 0) {
                                console.warn("[Ansible Baseline Fix] Hosts não configurados: " + unconfiguredHosts.join(", "));
                                
                                // Mostrar mensagem e abrir configuração
                                window.showSimpleConfigRequiredMessage();
                                
                                return; // Bloquear execução
                            }
                        }
                        
                        // Se chegou aqui, executar normalmente
                        return window.originalExecuteSelectedPlaybooks.apply(this, arguments);
                    };
                } else {
                    console.warn("[Ansible Baseline Fix] Função executeSelectedPlaybooks não encontrada ou já modificada");
                }
            };
            
            // Executar a função
            window.interceptPlaybookExecution();
        }
    }
    
    // Função para verificar se alguma playbook de baseline está selecionada
    function isAnyBaselineSelected() {
        // Verificar se a função existe no segundo script
        if (typeof window.baselineMultiHostFix !== 'undefined' && 
            typeof window.baselineMultiHostFix.CONFIG !== 'undefined') {
            
            const selectedPlaybooks = document.querySelectorAll('.playbook-item.selected');
            const baselineKeywords = window.baselineMultiHostFix.CONFIG.baselineKeywords;
            
            for (const playbook of selectedPlaybooks) {
                const playbookName = playbook.getAttribute('data-playbook-name');
                if (playbookName) {
                    const lowerName = playbookName.toLowerCase();
                    if (baselineKeywords.some(kw => lowerName.includes(kw))) {
                        return true;
                    }
                }
            }
        } else {
            // Implementação do primeiro script
            const selectedItems = document.querySelectorAll('.playbook-item.selected');
            for (const item of selectedItems) {
                const name = item.getAttribute('data-playbook-name');
                if (name && isBaselinePlaybook(name)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Função básica para verificar playbook de baseline (compatível com o primeiro script)
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const lowerName = name.toLowerCase();
        const keywords = ['baseline', 'configuracao-base', 'configuração-base'];
        return keywords.some(kw => lowerName.includes(kw));
    }

    // Inicializar o fix
    function initialize() {
        // Adicionar CSS para mensagens
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 214, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0); }
            }
            
            .baseline-warning-message {
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(styleEl);
        
        // Inicializar funções principais
        forceBaselineConfiguration();
        enhancePlaybookExecution();
        
        console.log("[Ansible Baseline Fix] Inicialização concluída");
    }
    
    // Inicializar quando o documento estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Se o DOM já estiver carregado, inicializar imediatamente
        initialize();
    }
})();