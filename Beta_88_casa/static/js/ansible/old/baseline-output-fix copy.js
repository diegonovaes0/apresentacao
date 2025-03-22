/**
 * baseline-output-fix.js
 * Garante a visualização normal da saída de playbooks de baseline
 */

(function() {
    console.log("Aplicando correção para visualização da saída de baseline");
    
    // Armazenar funções originais (apenas as essenciais)
    const originalFunctions = {
        executeSelectedPlaybooks: window.executeSelectedPlaybooks,
        toggleOutput: window.toggleOutput
    };
    
    // Configuração mínima
    const config = {
        baselineKeywords: ['baseline', 'configuracao-base', 'baseline_universal'],
        minPasswordLength: 8
    };
    
    // Estado mínimo necessário
    const state = {
        bannersAdded: new Set(),
        baselineMode: false
    };
    
    // Verificar se uma playbook é do tipo baseline (simples)
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const lowerName = name.toLowerCase();
        return config.baselineKeywords.some(kw => lowerName.includes(kw));
    }
    
    // Função simplificada para criar banner
    function createBaselineBanner(hostname) {
        const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Verificar se já existe
        if (document.getElementById(bannerId)) {
            return null;
        }
        
        const banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'baseline-banner';
        banner.style.backgroundColor = '#1a1a1a';
        banner.style.border = '1px solid #333';
        banner.style.borderLeft = '4px solid #FFD600';
        banner.style.borderRadius = '4px';
        banner.style.padding = '12px';
        banner.style.margin = '8px 0';
        banner.style.position = 'relative';
        
        banner.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #FFD600; font-size: 14px;">Baseline - ${hostname}</h4>
                <button class="close-btn" style="background: none; border: none; color: #999; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; color: #ccc; font-size: 12px; margin-bottom: 4px;">Hostname</label>
                    <input type="text" id="baseline-hostname-${hostname}" value="${hostname}" 
                           style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 12px; margin-bottom: 4px;">Senha Parceiro</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-parceiro-password-${hostname}" 
                               style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px;">
                        <button class="toggle-btn" data-for="baseline-parceiro-password-${hostname}" 
                                style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 25px; height: 25px; border-radius: 3px; cursor: pointer;">👁</button>
                    </div>
                </div>
                <div>
                    <label style="display: block; color: #ccc; font-size: 12px; margin-bottom: 4px;">Senha Root</label>
                    <div style="position: relative;">
                        <input type="password" id="baseline-root-password-${hostname}" 
                               style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px;">
                        <button class="toggle-btn" data-for="baseline-root-password-${hostname}" 
                                style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: #333; border: none; color: #ccc; width: 25px; height: 25px; border-radius: 3px; cursor: pointer;">👁</button>
                    </div>
                </div>
                <div style="grid-column: 1 / -1; margin-top: 8px;">
                    <button class="generate-btn" data-host="${hostname}" 
                            style="background: #FFD600; border: none; color: black; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Gerar Senhas Fortes
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar eventos (diretamente para evitar overheads)
        banner.querySelector('.close-btn').addEventListener('click', function() {
            banner.remove();
            state.bannersAdded.delete(hostname);
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
                parceiroInput.previousElementSibling.querySelector('.toggle-btn').textContent = '👁‍🗨';
            }
            
            if (rootInput) {
                rootInput.value = generatePassword();
                rootInput.type = 'text';
                rootInput.previousElementSibling.querySelector('.toggle-btn').textContent = '👁‍🗨';
            }
            
            alert('Senhas geradas com sucesso!');
        });
        
        return banner;
    }
    
    // Gerar senha forte
    function generatePassword() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    // Verificar se host está configurado
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
        badge.style.width = '22px';
        badge.style.height = '22px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '12px';
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
    
    // IMPORTANTE: Garantir que o toggle de saída funcione normalmente
    // Verificar se há alguma função de toggle existente e preservá-la
    if (window.toggleOutput) {
        const originalToggle = window.toggleOutput;
        
        window.toggleOutput = function(button) {
            // Executar a função original sem alterações
            return originalToggle(button);
        };
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
    
    // Verificar e corrigir qualquer problema com a exibição da saída
    function fixOutputDisplayIssues() {
        // Remover quaisquer estilos que possam estar escondendo a saída
        const styleFixEl = document.createElement('style');
        styleFixEl.textContent = `
            /* Garantir que a saída seja visível */
            .ansible-output {
                display: block !important;
                max-height: 500px !important;
                overflow: auto !important;
            }
            
            /* Remover qualquer escondimento de card */
            .execution-card {
                display: block !important;
            }
            
            /* Garantir que botões de toggle funcionem */
            .toggle-output-btn, 
            .ansible-btn,
            [onclick*="toggleOutput"] {
                pointer-events: auto !important;
                cursor: pointer !important;
            }
        `;
        document.head.appendChild(styleFixEl);
        
        // Verificar periodicamente os cards para garantir que a saída esteja visível
        function checkOutputVisibility() {
            document.querySelectorAll('.execution-card').forEach(card => {
                const playbookName = card.getAttribute('data-playbook-name') || '';
                
                if (isBaselinePlaybook(playbookName)) {
                    // Garantir que o card esteja visível
                    card.style.display = 'block';
                    
                    // Verificar a saída
                    const output = card.querySelector('.ansible-output');
                    if (output) {
                        // Garantir que a saída seja visível quando necessário
                        if (output.classList.contains('visible')) {
                            output.style.display = 'block';
                        }
                    }
                }
            });
        }
        
        // Verificar agora e em intervalos
        checkOutputVisibility();
        setInterval(checkOutputVisibility, 2000);
    }
    
    // Expor globalmente
    window.toggleBaselineBanner = addBaselineBanner;
    window.fixBaselineOutput = fixOutputDisplayIssues;
    
    // Adicionar event listener para detectar seleções (forma leve)
    document.addEventListener('click', (e) => {
        // Verificar se clicou em um host ou playbook
        if (e.target.closest('.host-banner') || e.target.closest('.playbook-item')) {
            // Usar setTimeout para garantir que as classes tenham sido atualizadas
            setTimeout(checkHostsAndPlaybooks, 100);
        }
        
        // Verificar se clicou em botão de ver mais/menos
        if (e.target.closest('.toggle-output-btn') || e.target.closest('[onclick*="toggleOutput"]')) {
            // Garantir que a saída seja visível
            setTimeout(fixOutputDisplayIssues, 100);
        }
    });
    
    // Verificar estado inicial
    setTimeout(checkHostsAndPlaybooks, 500);
    
    // Aplicar correção para problemas de saída
    setTimeout(fixOutputDisplayIssues, 1000);
    
    console.log("Correção para saída de baseline aplicada com sucesso");
})();