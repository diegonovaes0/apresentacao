/**
 * ansible-baseline-enhancer
 * Versão otimizada com layout compacto e integração com badges
 */

(function() {
    console.log("Inicializando otimização para baseline multi-host (versão compacta)");
    
    // Armazenar funções originais (apenas as essenciais)
    const originalFunctions = {
        executeSelectedPlaybooks: window.executeSelectedPlaybooks
    };
    
    // Configuração
    const config = {
        baselineKeywords: ['baseline', 'configuracao-base'],
        minPasswordLength: 8,
        passwordLength: 15,
        defaultHostnamePrefix: 'SKY-INT-SDL-',
        selectors: {
            hostsContainer: '#hosts-list',
            playbooksContainer: '#playbooks'
        }
    };
    
    // Estado mínimo necessário
    const state = {
        bannersAdded: new Set(),
        configuredHosts: new Set(),
        baselineMode: false,
        hostCounter: 1
    };
    
    // Verificar se uma playbook é do tipo baseline
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const lowerName = name.toLowerCase();
        return config.baselineKeywords.some(kw => lowerName.includes(kw));
    }
    
    // Gerar senha forte com comprimento especificado
    function generatePassword(length = config.passwordLength) {
        const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowerChars = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const specialChars = "!@#$%^&*()_-+=";
        const allChars = upperChars + lowerChars + numbers + specialChars;
        
        // Garantir que tenha pelo menos um caractere de cada tipo
        let password = 
            upperChars.charAt(Math.floor(Math.random() * upperChars.length)) +
            lowerChars.charAt(Math.floor(Math.random() * lowerChars.length)) +
            numbers.charAt(Math.floor(Math.random() * numbers.length)) +
            specialChars.charAt(Math.floor(Math.random() * specialChars.length));
        
        // Preencher o resto da senha
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Embaralhar a senha para garantir aleatoriedade
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
    
    // Gerar hostname padrão
    function generateDefaultHostname(hostname) {
        // Se o hostname atual já começa com o prefixo, use-o
        if (hostname.startsWith(config.defaultHostnamePrefix)) {
            return hostname;
        }
        
        // Caso contrário, gere um novo com contador sequencial
        return `${config.defaultHostnamePrefix}0${state.hostCounter++}`;
    }
    
    // Função para exibir mensagem de notificação em vez de alerta
    function showNotification(message, type = 'warning') {
        // Criar container para a mensagem
        const container = document.querySelector('#running-playbooks') || document.body;
        
        // Remover mensagens anteriores se existirem
        const existingMessages = document.querySelectorAll('.baseline-notification');
        existingMessages.forEach(msg => msg.remove());
        
        // Criar elemento de mensagem
        const notification = document.createElement('div');
        notification.className = 'baseline-notification';
        notification.style.backgroundColor = '#1a1a1a';
        notification.style.border = '1px solid #333';
        notification.style.borderLeft = type === 'warning' ? '4px solid #FF9800' : type === 'success' ? '4px solid #4CAF50' : '4px solid #FFD600';
        notification.style.borderRadius = '4px';
        notification.style.padding = '12px 16px';
        notification.style.margin = '10px 0';
        notification.style.color = '#fff';
        notification.style.fontSize = '13px';
        notification.style.position = 'relative';
        notification.style.animation = 'fadeIn 0.3s ease';
        
        // Conteúdo da mensagem
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="color: ${type === 'warning' ? '#FF9800' : type === 'success' ? '#4CAF50' : '#FFD600'}; margin-right: 10px;">
                        ${type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <span>${message}</span>
                </div>
                <button class="close-notification" style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px;">&times;</button>
            </div>
        `;
        
        // Adicionar ao início do container
        if (container.firstChild) {
            container.insertBefore(notification, container.firstChild);
        } else {
            container.appendChild(notification);
        }
        
        // Adicionar evento para fechar
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remover após 6 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s';
                setTimeout(() => notification.remove(), 300);
            }
        }, 6000);
        
        return notification;
    }
    
    // Função para criar banner compacto
    function createBaselineBanner(hostname) {
        const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Verificar se já existe
        if (document.getElementById(bannerId)) {
            return null;
        }
        
        // Gerar senhas fortes padrão
        const defaultParceiroPassword = generatePassword();
        const defaultRootPassword = generatePassword();
        
        // Gerar hostname padrão
        const defaultHostname = generateDefaultHostname(hostname);
        
        // Buscar o host para obter largura
        const hostBanner = findHostBanner(hostname);
        const hostWidth = hostBanner ? hostBanner.offsetWidth : null;
        
        const banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'baseline-banner';
        banner.style.backgroundColor = '#1a1a1a';
        banner.style.border = '1px solid #333';
        banner.style.borderLeft = '4px solid #FFD600';
        banner.style.borderRadius = '4px';
        banner.style.padding = '8px';
        banner.style.margin = '5px 0';
        banner.style.position = 'relative';
        banner.style.fontSize = '12px';
        banner.style.width = hostWidth ? `${hostWidth}px` : 'calc(100% - 12px)';
        banner.style.boxSizing = 'border-box';
        
        banner.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; align-items: center;">
                <h4 style="margin: 0; color: #FFD600; font-size: 13px;">Config: ${hostname}</h4>
                <button class="close-btn" style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; line-height: 1; padding: 0;">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Hostname</label>
                    <input type="text" id="baseline-hostname-${hostname}" value="${defaultHostname}" 
                           style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Senha Parceiro</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-parceiro-password-${hostname}" value="${defaultParceiroPassword}"
                               style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                        <button class="toggle-btn" data-for="baseline-parceiro-password-${hostname}" 
                                style="position: absolute; right: 3px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 18px; height: 18px; border-radius: 2px; cursor: pointer; font-size: 10px; line-height: 1; padding: 0;">👁</button>
                    </div>
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Senha Root</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-root-password-${hostname}" value="${defaultRootPassword}"
                               style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                        <button class="toggle-btn" data-for="baseline-root-password-${hostname}" 
                                style="position: absolute; right: 3px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 18px; height: 18px; border-radius: 2px; cursor: pointer; font-size: 10px; line-height: 1; padding: 0;">👁</button>
                    </div>
                </div>
                <div style="grid-column: 1 / -1; margin-top: 5px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="generate-btn" data-host="${hostname}" 
                            style="background: #333; border: none; color: #ccc; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px;">
                        Gerar Novas Senhas
                    </button>
                    <button class="save-config-btn" data-host="${hostname}" 
                            style="background: #FFD600; border: none; color: black; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px;">
                        Salvar Configuração
                    </button>
                </div>
                <div style="grid-column: 1 / -1; margin-top: 5px; font-size: 11px; color: #4CAF50; text-align: right; min-height: 14px;" class="save-status"></div>
            </div>
        `;
        
        // Adicionar eventos
        banner.querySelector('.close-btn').addEventListener('click', function() {
            banner.remove();
            state.bannersAdded.delete(hostname);
            state.configuredHosts.delete(hostname);
        });
        
        banner.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const inputId = this.getAttribute('data-for');
                const input = document.getElementById(inputId);
                if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    this.textContent = input.type === 'password' ? '👁' : '👁‍🗨';
                }
            });
        });
        
        banner.querySelector('.generate-btn').addEventListener('click', function() {
            const parceiroInput = document.getElementById(`baseline-parceiro-password-${hostname}`);
            const rootInput = document.getElementById(`baseline-root-password-${hostname}`);
            
            if (parceiroInput) {
                parceiroInput.value = generatePassword();
                parceiroInput.type = 'text';
                const toggleBtn = banner.querySelector(`button[data-for="baseline-parceiro-password-${hostname}"]`);
                if (toggleBtn) toggleBtn.textContent = '👁‍🗨';
            }
            
            if (rootInput) {
                rootInput.value = generatePassword();
                rootInput.type = 'text';
                const toggleBtn = banner.querySelector(`button[data-for="baseline-root-password-${hostname}"]`);
                if (toggleBtn) toggleBtn.textContent = '👁‍🗨';
            }
        });
        
        // Adicionar evento de salvar configuração
        banner.querySelector('.save-config-btn').addEventListener('click', function() {
            saveHostConfiguration(hostname);
        });
        
        // Carregar configuração existente, se disponível
        loadSavedConfiguration(hostname, banner);
        
        return banner;
    }
    
    // Função para carregar configuração salva
    function loadSavedConfiguration(hostname, banner) {
        try {
            const savedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            if (savedConfigs[hostname]) {
                const config = savedConfigs[hostname];
                const hostnameInput = banner.querySelector(`#baseline-hostname-${hostname}`);
                const parceiroInput = banner.querySelector(`#baseline-parceiro-password-${hostname}`);
                const rootInput = banner.querySelector(`#baseline-root-password-${hostname}`);
                
                if (hostnameInput && config.hostname) {
                    hostnameInput.value = config.hostname;
                }
                
                if (parceiroInput && config.parceiroPassword) {
                    parceiroInput.value = config.parceiroPassword;
                }
                
                if (rootInput && config.rootPassword) {
                    rootInput.value = config.rootPassword;
                }
                
                console.log(`Configuração carregada para ${hostname}`);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
        }
    }
    
    // Função para salvar configuração do host
    function saveHostConfiguration(hostname) {
        // Obter valores
        const hostnameInput = document.getElementById(`baseline-hostname-${hostname}`);
        const parceiroInput = document.getElementById(`baseline-parceiro-password-${hostname}`);
        const rootInput = document.getElementById(`baseline-root-password-${hostname}`);
        
        if (!hostnameInput || !parceiroInput || !rootInput) {
            console.error("Erro ao encontrar elementos de configuração");
            return false;
        }
        
        const newHostname = hostnameInput.value;
        const parceiroPassword = parceiroInput.value;
        const rootPassword = rootInput.value;
        
        // Validar valores
        if (!newHostname) {
            showNotification("O hostname não pode ser vazio", "warning");
            return false;
        }
        
        if (!parceiroPassword || parceiroPassword.length < config.minPasswordLength) {
            showNotification(`A senha do parceiro deve ter pelo menos ${config.minPasswordLength} caracteres`, "warning");
            return false;
        }
        
        if (!rootPassword || rootPassword.length < config.minPasswordLength) {
            showNotification(`A senha do root deve ter pelo menos ${config.minPasswordLength} caracteres`, "warning");
            return false;
        }
        
        // Salvar no localStorage
        try {
            const savedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            savedConfigs[hostname] = {
                hostname: newHostname,
                parceiroPassword: parceiroPassword,
                rootPassword: rootPassword,
                timestamp: Date.now()
            };
            localStorage.setItem('baseline_configs', JSON.stringify(savedConfigs));
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            return false;
        }
        
        // Atualizar estado
        state.configuredHosts.add(hostname);
        
        // Mostrar mensagem de sucesso no banner
        const saveStatus = document.querySelector(`#baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')} .save-status`);
        if (saveStatus) {
            saveStatus.textContent = "Configuração salva com sucesso!";
            setTimeout(() => {
                saveStatus.textContent = "";
            }, 3000);
        }
        
        // Atualizar o badge para "Baseline Ready"
        updateHostBadge(hostname);
        
        return true;
    }
    
    // Atualizar o badge do host para "Baseline Ready"
    function updateHostBadge(hostname) {
        const hostBanner = findHostBanner(hostname);
        if (!hostBanner) return;
        
        // Remover badges existentes
        hostBanner.querySelectorAll('.baseline-badge').forEach(badge => badge.remove());
        
        // Criar novo badge "Baseline Ready"
        const badge = document.createElement('div');
        badge.className = 'baseline-badge configured';
        badge.setAttribute('data-hostname', hostname);
        badge.textContent = 'Baseline Ready';
        badge.style.backgroundColor = '#4CAF50';
        badge.style.color = 'white';
        badge.style.position = 'absolute';
        badge.style.top = '8px';
        badge.style.right = '8px';
        badge.style.padding = '3px 6px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = 'bold';
        badge.style.cursor = 'pointer';
        badge.style.zIndex = '10';
        
        // Adicionar evento para editar configuração
        badge.addEventListener('click', (e) => {
            e.stopPropagation(); // Não propagar para o host
            toggleBaselineBanner(hostname);
        });
        
        hostBanner.appendChild(badge);
    }
    
    // Função para alternar a exibição do banner de configuração
    function toggleBaselineBanner(hostname) {
        const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const existingBanner = document.getElementById(bannerId);
        
        if (existingBanner) {
            // Fechar banner existente
            existingBanner.remove();
            state.bannersAdded.delete(hostname);
            return false;
        } else {
            // Abrir novo banner
            return addBaselineBanner(hostname);
        }
    }
    
    // Verifica se host está configurado
    function isHostConfigured(hostname) {
        // Primeiro, verificar configurações salvas
        try {
            const savedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            if (savedConfigs[hostname]) {
                const config = savedConfigs[hostname];
                if (config.parceiroPassword && config.parceiroPassword.length >= config.minPasswordLength && 
                    config.rootPassword && config.rootPassword.length >= config.minPasswordLength) {
                    return true;
                }
            }
        } catch (e) {
            console.error("Erro ao verificar configurações salvas:", e);
        }
        
        // Se não encontrou no localStorage, verificar os campos do formulário
        const parceiroPassword = document.getElementById(`baseline-parceiro-password-${hostname}`)?.value;
        const rootPassword = document.getElementById(`baseline-root-password-${hostname}`)?.value;
        
        return (
            parceiroPassword && parceiroPassword.length >= config.minPasswordLength && 
            rootPassword && rootPassword.length >= config.minPasswordLength
        );
    }
    
    // Encontrar o banner do host pelo hostname
    function findHostBanner(hostname) {
        const checkbox = document.querySelector(`input[type="checkbox"][data-hostname="${hostname}"]`);
        if (checkbox) {
            return checkbox.closest('.host-banner');
        }
        return null;
    }
    
    // Adicionar badge de configuração necessária ou "Baseline Ready"
    function addBaselineBadge(hostBanner, hostname) {
        // Remover badge existente se houver
        hostBanner.querySelectorAll('.baseline-badge').forEach(b => b.remove());
        
        // Verificar se o host já está configurado
        const isConfigured = state.configuredHosts.has(hostname) || isHostConfigured(hostname);
        
        // Criar novo badge
        const badge = document.createElement('div');
        
        if (isConfigured) {
            // Host configurado - "Baseline Ready"
            badge.className = 'baseline-badge configured';
            badge.textContent = 'Baseline Ready';
            badge.style.backgroundColor = '#4CAF50';
            badge.style.color = 'white';
            badge.style.position = 'absolute';
            badge.style.top = '8px';
            badge.style.right = '8px';
            badge.style.padding = '3px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '10px';
            badge.style.fontWeight = 'bold';
            
            // Adicionar ao conjunto de hosts configurados
            state.configuredHosts.add(hostname);
        } else {
            // Host não configurado - badge 'B'
            badge.className = 'baseline-badge';
            badge.style.position = 'absolute';
            badge.style.top = '-5px';
            badge.style.right = '-5px';
            badge.style.background = '#FFD600';
            badge.style.color = 'black';
            badge.style.borderRadius = '50%';
            badge.style.width = '18px';
            badge.style.height = '18px';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
            badge.style.fontWeight = 'bold';
            badge.style.fontSize = '10px';
            badge.style.zIndex = '100';
            badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            badge.style.cursor = 'pointer';
            badge.textContent = 'B';
            badge.title = 'Configurar Baseline';
            
            // Adicionar animação de pulso
            badge.style.animation = 'pulse 1.5s infinite';
        }
        
        badge.setAttribute('data-hostname', hostname);
        badge.style.cursor = 'pointer';
        badge.style.zIndex = '10';
        
        // Adicionar evento para abrir/editar banner
        badge.addEventListener('click', (e) => {
            e.stopPropagation(); // Não propagar para o host
            toggleBaselineBanner(hostname);
        });
        
        hostBanner.appendChild(badge);
    }
    
    // Adicionar banner de baseline ao host
    function addBaselineBanner(hostname) {
        // Buscar o host
        const hostBanner = findHostBanner(hostname);
        if (!hostBanner) {
            console.error(`Host banner não encontrado para ${hostname}`);
            return false;
        }
        
        // Criar banner
        const banner = createBaselineBanner(hostname);
        if (!banner) {
            // Banner já existe
            return false;
        }
        
        // Criar container principal para o banner
        const container = document.createElement('div');
        container.className = 'host-baseline-container';
        container.style.marginTop = '5px';
        container.style.marginBottom = '5px';
        container.appendChild(banner);
        
        // Adicionar após o host
        if (hostBanner.nextSibling) {
            hostBanner.parentNode.insertBefore(container, hostBanner.nextSibling);
        } else {
            hostBanner.parentNode.appendChild(container);
        }
        
        // Atualizar estado
        state.bannersAdded.add(hostname);
        
        return true;
    }
    
    // Carregar configurações salvas do localStorage
    function loadAllSavedConfigurations() {
        try {
            const savedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
            
            // Adicionar host configurados ao conjunto
            Object.keys(savedConfigs).forEach(hostname => {
                const config = savedConfigs[hostname];
                if (config.parceiroPassword && config.parceiroPassword.length >= config.minPasswordLength && 
                    config.rootPassword && config.rootPassword.length >= config.minPasswordLength) {
                    state.configuredHosts.add(hostname);
                }
            });
            
            console.log(`${state.configuredHosts.size} configurações carregadas`);
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        }
    }
    
    // Função principal para verificar hosts e playbooks
    function checkHostsAndPlaybooks() {
        // Verificar se alguma playbook de baseline está selecionada
        let baselineSelected = false;
        document.querySelectorAll('.playbook-item.selected').forEach(item => {
            const name = item.getAttribute('data-playbook-name');
            if (isBaselinePlaybook(name)) {
                baselineSelected = true;
            }
        });
        
        // Atualizar estado global
        state.baselineMode = baselineSelected;
        
        // Se não há baseline selecionado, não é necessário continuar
        if (!baselineSelected) return;
        
        // Verificar hosts selecionados
        document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const hostname = checkbox.dataset.hostname;
                
                // Verificar se o host precisa de badge
                if (hostname) {
                    // Verificar se já tem algum badge
                    const hasBadge = !!hostBanner.querySelector('.baseline-badge');
                    
                    if (!hasBadge) {
                        addBaselineBadge(hostBanner, hostname);
                    }
                }
            }
        });
    }
    
    // Sobrescrever a função de execução para garantir validação de baseline
    window.executeSelectedPlaybooks = function() {
        // Verificar modo baseline
        if (!state.baselineMode) {
            // Não estamos em modo baseline, usar função original
            return originalFunctions.executeSelectedPlaybooks();
        }
        
        // Obter hosts selecionados
        const selectedHosts = [];
        document.querySelectorAll('.host-banner.valid.selected').forEach(hostBanner => {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.dataset.hostname) {
                selectedHosts.push(checkbox.dataset.hostname);
            }
        });
        
        // Verificar hosts não configurados
        const unconfiguredHosts = [];
        for (const hostname of selectedHosts) {
            // Ver se está configurado
            if (!isHostConfigured(hostname)) {
                unconfiguredHosts.push(hostname);
                // Criar banner automaticamente se ainda não existir
                if (!document.getElementById(`baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`)) {
                    addBaselineBanner(hostname);
                }
            }
        }
        
        // Se há hosts não configurados, avisar e interromper
        if (unconfiguredHosts.length > 0) {
            // Mostrar notificação em vez de alerta
            const message = `Configure o baseline para os seguintes hosts: ${unconfiguredHosts.join(', ')}`;
            showNotification(message, 'warning');
            
            // Destacar banners que precisam de configuração
            unconfiguredHosts.forEach(hostname => {
                const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
                const banner = document.getElementById(bannerId);
                if (banner) {
                    banner.style.boxShadow = '0 0 0 2px #FF9800';
                    banner.style.animation = 'pulse 1.5s infinite';
                    
                    // Remover destaque após alguns segundos
                    setTimeout(() => {
                        banner.style.boxShadow = '';
                        banner.style.animation = '';
                    }, 5000);
                }
            });
            
            return;
        }
        
        // Interceptar o fetch para adicionar variáveis extras
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (url === '/api/run' && options?.method === 'POST') {
                try {
                    const data = JSON.parse(options.body);
                    
                    // Se tem apenas um host, adicionar variáveis específicas
                    if (data.hosts && data.hosts.length === 1) {
                        const hostname = data.hosts[0];
                        
                        // Buscar configuração do host
                        try {
                            const savedConfigs = JSON.parse(localStorage.getItem('baseline_configs') || '{}');
                            const hostConfig = savedConfigs[hostname];
                            
                            if (hostConfig) {
                                // Adicionar variáveis extra
                                data.extra_vars = {
                                    new_hostname: hostConfig.hostname || hostname,
                                    parceiro_password: hostConfig.parceiroPassword,
                                    root_password: hostConfig.rootPassword,
                                    user_password: hostConfig.parceiroPassword,
                                    admin_password: hostConfig.rootPassword
                                };
                                
                                // Atualizar corpo da requisição
                                options.body = JSON.stringify(data);
                            }
                        } catch (e) {
                            console.error("Erro ao processar configuração:", e);
                        }
                    }
                } catch (e) {
                    console.error("Erro ao processar requisição:", e);
                }
            }
            
            // Chamar fetch original
            return originalFetch.apply(this, arguments);
        };
        
        // Mostrar notificação de sucesso
        showNotification('Baseline configurado com sucesso. Iniciando execução...', 'success');
        
        // Executar função original
        const result = originalFunctions.executeSelectedPlaybooks();
        
        // Restaurar fetch original
        setTimeout(() => {
            window.fetch = originalFetch;}, 1000);
        
            return result;
        };
        
        // Função para redimensionar banners quando a janela mudar de tamanho
        function handleResize() {
            // Atualizar largura de todos os banners para corresponder aos hosts
            const hostBanners = document.querySelectorAll('.host-banner');
            if (!hostBanners.length) return;
            
            const hostWidth = hostBanners[0].offsetWidth;
            
            document.querySelectorAll('.baseline-banner').forEach(banner => {
                banner.style.width = `${hostWidth}px`;
            });
        }
        
        // Adicionar listener de redimensionamento
        window.addEventListener('resize', handleResize);
        
        // Expor globalmente
        window.toggleBaselineBanner = toggleBaselineBanner;
        window.saveHostConfiguration = saveHostConfiguration;
        window.updateHostBadge = updateHostBadge;
        
        // Adicionar event listener para detectar seleções
        document.addEventListener('click', (e) => {
            // Verificar se clicou em um host ou playbook
            if (e.target.closest('.host-banner') || e.target.closest('.playbook-item')) {
                // Usar setTimeout para garantir que as classes tenham sido atualizadas
                setTimeout(checkHostsAndPlaybooks, 100);
            }
        });
        
        // Carregar configurações salvas ao iniciar
        loadAllSavedConfigurations();
        
        // Verificar estado inicial
        setTimeout(checkHostsAndPlaybooks, 500);
        
        // Adicionar estilos globais para banners
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .host-baseline-container {
                margin: 5px 0;
                display: block;
            }
            
            .baseline-banner {
                transition: all 0.2s ease;
            }
            
            .baseline-banner:hover {
                box-shadow: 0 0 0 1px #FFD600;
            }
            
            .baseline-banner input:focus {
                outline: 1px solid #FFD600;
                box-shadow: 0 0 4px rgba(255, 214, 0, 0.5);
            }
            
            .baseline-notification {
                animation: fadeIn 0.3s ease;
            }
        `;
        document.head.appendChild(styleElement);
        
        console.log("Baseline otimizado (compacto) inicializado com sucesso");
    })();