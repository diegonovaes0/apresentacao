/**
 * ansible-baseline-enhancer
 * Versão otimizada com layout compacto e preenchimento automático
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
        
        const banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'baseline-banner';
        banner.style.backgroundColor = '#1a1a1a';
        banner.style.border = '1px solid #333';
        banner.style.borderLeft = '4px solid #FFD600';
        banner.style.borderRadius = '4px';
        banner.style.padding = '8px';  // Reduzido
        banner.style.margin = '5px 0';  // Reduzido
        banner.style.position = 'relative';
        banner.style.fontSize = '12px';  // Reduzido
        banner.style.width = 'calc(100% - 12px)';  // Para permitir organização
        banner.style.boxSizing = 'border-box';
        banner.style.display = 'inline-block';
        
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
                <div style="grid-column: 1 / -1; margin-top: 5px; text-align: right;">
                    <button class="generate-btn" data-host="${hostname}" 
                            style="background: #FFD600; border: none; color: black; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px;">
                        Gerar Novas Senhas
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar eventos
        banner.querySelector('.close-btn').addEventListener('click', function() {
            banner.remove();
            state.bannersAdded.delete(hostname);
            state.configuredHosts.delete(hostname);
            organizeBanners(); // Reorganizar após remover
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
        
        return banner;
    }
    
    // Organizar banners lado a lado
    function organizeBanners() {
        // Encontrar o container
        const container = document.querySelector(config.selectors.hostsContainer);
        if (!container) return;
        
        // Encontrar todos os banners
        const banners = document.querySelectorAll('.baseline-banner');
        if (!banners.length) return;
        
        // Largura do primeiro host para referência
        const hostBanner = document.querySelector('.host-banner');
        if (!hostBanner) return;
        
        const hostWidth = hostBanner.offsetWidth;
        const margin = 5; // Margem entre banners
        
        // Calcular quantos banners cabem por linha
        const containerWidth = container.offsetWidth;
        const bannersPerRow = Math.floor(containerWidth / (hostWidth + margin));
        
        // Aplicar grid ou flex layout
        container.style.position = 'relative';
        
        banners.forEach((banner, index) => {
            banner.style.width = `${hostWidth}px`;
            banner.style.margin = `${margin}px`;
            banner.style.display = 'inline-block';
            banner.style.verticalAlign = 'top';
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
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(styleEl);
        
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
        const banner = createBaselineBanner(hostname);
        if (!banner) {
            // Banner já existe
            return false;
        }
        
        // Adicionar após o host
        if (hostBanner.nextSibling) {
            hostBanner.parentNode.insertBefore(banner, hostBanner.nextSibling);
        } else {
            hostBanner.parentNode.appendChild(banner);
        }
        
        // Atualizar estado
        state.bannersAdded.add(hostname);
        
        // Reorganizar banners após adicionar novo
        setTimeout(organizeBanners, 50);
        
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
            alert(`Configure o baseline para os seguintes hosts: ${unconfiguredHosts.join(', ')}`);
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
        organizeBanners();
    }
    
    // Adicionar listerner de redimensionamento
    window.addEventListener('resize', handleResize);
    
    // Expor globalmente
    window.toggleBaselineBanner = addBaselineBanner;
    window.organizeBanners = organizeBanners;
    
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
        .baseline-banner-container {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 5px;
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
    `;
    document.head.appendChild(styleElement);
    
    console.log("Baseline otimizado (compacto) inicializado com sucesso");
})();