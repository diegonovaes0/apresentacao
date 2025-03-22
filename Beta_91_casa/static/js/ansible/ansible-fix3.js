/**
 * ansible-baseline-enhancer
 * Versão otimizada com layout compacto e notificações aprimoradas
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
            playbooksContainer: '#playbooks',
            runningPlaybooks: '#running-playbooks'
        },
        styles: {
            primary: '#FFD600',
            text: '#FFFFFF',
            background: '#1a1a1a',
            border: '#333',
            input: '#222',
            warning: '#FF9800',
            success: '#4CAF50',
            error: '#F44336'
        }
    };
    
    // Estado mínimo necessário
    const state = {
        bannersAdded: new Set(),
        configuredHosts: new Set(),
        baselineMode: false,
        hostCounter: 1,
        notificationTimers: {}
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
    
    // Função para exibir notificação customizada
    function showNotification(message, type = 'warning', duration = 6000) {
        // Remover notificações anteriores
        const existingNotifications = document.querySelectorAll('.baseline-notification');
        existingNotifications.forEach(notification => {
            if (notification.dataset.timer) {
                clearTimeout(parseInt(notification.dataset.timer));
            }
            notification.remove();
        });
        
        // Container para notificações
        let container = document.querySelector('.baseline-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'baseline-notification-container';
            container.style.position = 'fixed';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }
        
        // Cores de acordo com o tipo
        const colors = {
            warning: config.styles.warning,
            success: config.styles.success,
            error: config.styles.error,
            info: config.styles.primary
        };
        
        // Criar elemento da notificação
        const notification = document.createElement('div');
        notification.className = 'baseline-notification';
        notification.style.backgroundColor = config.styles.background;
        notification.style.color = config.styles.text;
        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        notification.style.borderRadius = '4px';
        notification.style.padding = '12px 15px';
        notification.style.marginBottom = '10px';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.justifyContent = 'space-between';
        notification.style.animation = 'slideInRight 0.3s ease';
        
        // Conteúdo da notificação
        notification.innerHTML = `
            <div style="flex: 1;">
                <div style="display: flex; align-items: center;">
                    <span style="color: ${colors[type] || colors.info}; margin-right: 10px;">
                        ${type === 'warning' ? '⚠️' : type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <span>${message}</span>
                </div>
            </div>
            <button style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; margin-left: 10px;">×</button>
        `;
        
        // Adicionar à tela
        container.appendChild(notification);
        
        // Adicionar evento de fechar
        const closeButton = notification.querySelector('button');
        closeButton.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
            if (notification.dataset.timer) {
                clearTimeout(parseInt(notification.dataset.timer));
            }
        });
        
        // Auto-remover após o tempo especificado
        if (duration > 0) {
            const timerId = setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, duration);
            notification.dataset.timer = timerId.toString();
            state.notificationTimers[timerId] = true;
        }
        
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
        
        // Criar container principal
        const container = document.createElement('div');
        container.className = 'host-baseline-container';
        container.style.marginTop = '5px';
        container.style.marginBottom = '5px';
        
        // Obter dimensões do host para ajustar o tamanho
        const hostBanner = findHostBanner(hostname);
        const hostWidth = hostBanner ? hostBanner.offsetWidth : '100%';
        
        // Criar o banner
        const banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'baseline-banner';
        banner.style.backgroundColor = config.styles.background;
        banner.style.border = `1px solid ${config.styles.border}`;
        banner.style.borderLeft = `4px solid ${config.styles.primary}`;
        banner.style.borderRadius = '4px';
        banner.style.padding = '8px';
        banner.style.position = 'relative';
        banner.style.fontSize = '12px';
        banner.style.width = hostWidth ? `${hostWidth}px` : '100%';
        banner.style.boxSizing = 'border-box';
        
        banner.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; align-items: center;">
                <h4 style="margin: 0; color: ${config.styles.primary}; font-size: 13px;">Config: ${hostname}</h4>
                <button class="close-btn" style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; line-height: 1; padding: 0;">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Hostname</label>
                    <input type="text" id="baseline-hostname-${hostname}" value="${defaultHostname}" 
                           style="width: 100%; background: ${config.styles.input}; border: 1px solid ${config.styles.border}; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Senha Parceiro</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-parceiro-password-${hostname}" value="${defaultParceiroPassword}"
                               style="width: 100%; background: ${config.styles.input}; border: 1px solid ${config.styles.border}; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                        <button class="toggle-btn" data-for="baseline-parceiro-password-${hostname}" 
                                style="position: absolute; right: 3px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 18px; height: 18px; border-radius: 2px; cursor: pointer; font-size: 10px; line-height: 1; padding: 0;">👁</button>
                    </div>
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 11px; margin-bottom: 2px;">Senha Root</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-root-password-${hostname}" value="${defaultRootPassword}"
                               style="width: 100%; background: ${config.styles.input}; border: 1px solid ${config.styles.border}; color: white; padding: 4px; border-radius: 3px; font-size: 11px;">
                        <button class="toggle-btn" data-for="baseline-root-password-${hostname}" 
                                style="position: absolute; right: 3px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 18px; height: 18px; border-radius: 2px; cursor: pointer; font-size: 10px; line-height: 1; padding: 0;">👁</button>
                    </div>
                </div>
                <div style="grid-column: 1 / -1; margin-top: 5px; text-align: right;">
                    <button class="generate-btn" data-host="${hostname}" 
                            style="background: ${config.styles.primary}; border: none; color: black; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px;">
                        Gerar Novas Senhas
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar o banner ao container
        container.appendChild(banner);
        
        // Adicionar eventos
        banner.querySelector('.close-btn').addEventListener('click', function() {
            container.remove();
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
        
        return container;
    }
    
    // Atualiza a largura dos banners para corresponder aos hosts
    function updateBannerWidths() {
        const hostBanners = document.querySelectorAll('.host-banner');
        const baselineBanners = document.querySelectorAll('.baseline-banner');
        
        // Se não houver hosts ou banners, não há nada para fazer
        if (!hostBanners.length || !baselineBanners.length) return;
        
        const hostWidth = hostBanners[0].offsetWidth;
        
        // Atualizar todos os banners para ter a mesma largura que os hosts
        baselineBanners.forEach(banner => {
            banner.style.width = `${hostWidth}px`;
        });
    }
    
    // Verifica se host está configurado
    function isHostConfigured(hostname) {
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
    
    // Adicionar badge de configuração necessária
    function addBaselineBadge(hostBanner, hostname) {
        // Remover badge existente se houver
        hostBanner.querySelectorAll('.baseline-badge').forEach(b => b.remove());
        
        // Criar novo badge
        const badge = document.createElement('div');
        badge.className = 'baseline-badge';
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-5px';
        badge.style.background = config.styles.primary;
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
        
        // Adicionar evento para abrir banner
        badge.addEventListener('click', (e) => {
            e.stopPropagation(); // Não propagar para o host
            addBaselineBanner(hostname);
            badge.remove();
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
        const bannerContainer = createBaselineBanner(hostname);
        if (!bannerContainer) {
            // Banner já existe
            return false;
        }
        
        // Adicionar após o host
        if (hostBanner.nextSibling) {
            hostBanner.parentNode.insertBefore(bannerContainer, hostBanner.nextSibling);
        } else {
            hostBanner.parentNode.appendChild(bannerContainer);
        }
        
        // Atualizar estado
        state.bannersAdded.add(hostname);
        
        // Atualizar a largura do banner para corresponder ao host
        updateBannerWidths();
        
        return true;
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
                
                // Verificar se o host precisa de banner
                if (hostname && !state.bannersAdded.has(hostname)) {
                    addBaselineBadge(hostBanner, hostname);
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
            // Ver se tem banner
            if (!state.bannersAdded.has(hostname)) {
                unconfiguredHosts.push(hostname);
                // Criar banner automaticamente
                addBaselineBanner(hostname);
                continue;
            }
            
            // Verificar se está configurado
            if (!isHostConfigured(hostname)) {
                unconfiguredHosts.push(hostname);
            }
        }
        
        // Se há hosts não configurados, avisar e interromper
        if (unconfiguredHosts.length > 0) {
            // Substituir alert por notificação personalizada
            const message = `É necessário configurar o baseline para os seguintes hosts: ${unconfiguredHosts.join(', ')}`;
            showNotification(message, 'warning', 10000);
            
            // Destacar os banners não configurados
            unconfiguredHosts.forEach(hostname => {
                const banner = document.getElementById(`baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`);
                if (banner) {
                    banner.style.boxShadow = `0 0 0 2px ${config.styles.warning}`;
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
                        
                        // Se o host tem banner configurado
                        if (state.bannersAdded.has(hostname)) {
                            // Obter valores dos campos
                            const newHostname = document.getElementById(`baseline-hostname-${hostname}`)?.value || hostname;
                            const parceiroPassword = document.getElementById(`baseline-parceiro-password-${hostname}`)?.value;
                            const rootPassword = document.getElementById(`baseline-root-password-${hostname}`)?.value;
                            
                            // Adicionar variáveis extra
                            data.extra_vars = {
                                new_hostname: newHostname,
                                parceiro_password: parceiroPassword,
                                root_password: rootPassword,
                                user_password: parceiroPassword,
                                admin_password: rootPassword
                            };
                            
                            // Atualizar corpo da requisição
                            options.body = JSON.stringify(data);
                        }
                    }
                } catch (e) {
                    console.error("Erro ao processar requisição:", e);
                }
            }
            
            // Chamar fetch original
            return originalFetch.apply(this, arguments);
        };
        
        // Mostrar mensagem de sucesso
        showNotification('Baseline configurado com sucesso. Iniciando execução...', 'success');
        
        // Executar função original
        const result = originalFunctions.executeSelectedPlaybooks();
        
        // Restaurar fetch original
        setTimeout(() => {
            window.fetch = originalFetch;
        }, 1000);
        
        return result;
    };
    
    // Função para redimensionar banners quando a janela mudar de tamanho
    function handleResize() {
        updateBannerWidths();
    }
    
    // Adicionar listener de redimensionamento
    window.addEventListener('resize', handleResize);
    
    // Expor globalmente
    window.toggleBaselineBanner = addBaselineBanner;
    window.updateBannerWidths = updateBannerWidths;
    
    // Adicionar event listener para detectar seleções
    document.addEventListener('click', (e) => {
        // Verificar se clicou em um host ou playbook
        if (e.target.closest('.host-banner') || e.target.closest('.playbook-item')) {
            // Usar setTimeout para garantir que as classes tenham sido atualizadas
            setTimeout(checkHostsAndPlaybooks, 100);
        }
    });
    
    // Verificar estado inicial
    setTimeout(checkHostsAndPlaybooks, 500);
    
    // Adicionar estilos globais para banners
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .host-baseline-container {
            margin: 5px 0;
        }
        
        .baseline-banner {
            transition: all 0.2s ease;
        }
        
        .baseline-banner:hover {
            box-shadow: 0 0 0 1px ${config.styles.primary};
        }
        
        .baseline-banner input:focus {
            outline: 1px solid ${config.styles.primary};
            box-shadow: 0 0 4px rgba(255, 214, 0, 0.5);
        }
    `;
    document.head.appendChild(styleElement);
    
    console.log("Baseline otimizado (compacto) inicializado com sucesso");
})();