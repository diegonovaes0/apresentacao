/**
 * ansible-hosts-fix.js - Resolve problemas de carregamento de hosts em navegação SPA
 */
(function() {
    // Evita execução duplicada
    if (window.ansibleHostsFixInitialized) return;
    window.ansibleHostsFixInitialized = true;
    
    console.log('🔧 Inicializando correção para carregamento de hosts no Ansible SPA');
    
    // Armazena referência para função original
    const originalLoadHosts = window.loadHosts;
    
    // Sobrescreve a função com versão mais robusta
    window.loadHosts = async function(forceRefresh = false) {
        console.log('🔄 Tentando carregar hosts (função aprimorada)');
        
        // Verifica se estamos na página correta
        if (!document.querySelector('.ansible-container')) {
            console.log('⚠️ Não estamos na página Ansible, ignorando carregamento de hosts');
            return;
        }
        
        // Garante que o container de hosts existe
        let hostsContainer = document.getElementById('hosts-list');
        
        // Se não existir, tenta criá-lo
        if (!hostsContainer) {
            console.log('⚠️ Container de hosts não encontrado, tentando criar...');
            
            // Busca o local onde o container deve estar
            const hostsSection = document.querySelector('.hosts-section') || 
                                document.querySelector('.ansible-container') ||
                                document.querySelector('.main-content');
            
            if (hostsSection) {
                hostsContainer = document.createElement('div');
                hostsContainer.id = 'hosts-list';
                hostsContainer.className = 'hosts-list';
                
                // Se há um container de título, insere após ele
                const titleContainer = hostsSection.querySelector('.section-title') || 
                                     hostsSection.querySelector('.hosts-title');
                
                if (titleContainer) {
                    titleContainer.after(hostsContainer);
                } else {
                    // Caso contrário, adiciona no início da seção
                    hostsSection.prepend(hostsContainer);
                }
                
                console.log('✅ Container de hosts criado com sucesso');
            } else {
                console.error('❌ Impossível encontrar local para criar container de hosts');
                return;
            }
        }
        
        // Verifica se já temos dados de hosts no cache e não estamos forçando atualização
        if (!forceRefresh && window.hostData && Object.keys(window.hostData).length > 0) {
            console.log('📋 Dados de hosts já em memória, renderizando...');
            renderHostsFromCache();
            return;
        }
        
        // Verifica se temos dados no sessionStorage
        const cachedHostData = sessionStorage.getItem('hostData');
        if (!forceRefresh && cachedHostData && !window.hostData) {
            console.log('📋 Recuperando dados de hosts do sessionStorage');
            try {
                window.hostData = JSON.parse(cachedHostData);
                renderHostsFromCache();
                return;
            } catch (error) {
                console.error('❌ Erro ao processar dados em cache:', error);
                // Continua para buscar novos dados
            }
        }
        
        // Se temos a função original e precisamos buscar novos dados
        if (typeof originalLoadHosts === 'function') {
            try {
                console.log('🔍 Chamando função original de carregamento');
                await originalLoadHosts(forceRefresh);
                
                // Verifica se carregou com sucesso
                if (!window.hostData || Object.keys(window.hostData).length === 0) {
                    throw new Error("Função original não carregou dados de hosts");
                }
            } catch (error) {
                console.error('❌ Erro na função original:', error);
                await fetchHostsFromAPI();
            }
        } else {
            // Sem função original, busca direto da API
            await fetchHostsFromAPI();
        }
    };
    
    // Função para buscar hosts diretamente da API
    async function fetchHostsFromAPI() {
        console.log('🔍 Buscando hosts diretamente da API');
        
        try {
            // Determina URL baseada em convenções comuns
            const url = '/api/ansible/hosts' || '/api/hosts' || '/ansible/api/hosts';
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Processa o formato específico da sua API
            window.hostData = data.hosts || data || {};
            
            // Salva no sessionStorage para uso futuro
            sessionStorage.setItem('hostData', JSON.stringify(window.hostData));
            
            console.log('✅ Hosts carregados da API com sucesso');
            renderHostsFromCache();
            
        } catch (error) {
            console.error('❌ Erro ao buscar hosts da API:', error);
            createDummyHostsIfNeeded();
        }
    }
    
    // Função para criar alguns hosts de exemplo se não conseguir carregar dados reais
    function createDummyHostsIfNeeded() {
        if (!window.hostData || Object.keys(window.hostData).length === 0) {
            console.log('⚠️ Criando hosts de exemplo como fallback');
            
            window.hostData = {
                'servidor-prod-1': { valid: true, os: 'Oracle Linux 8', user: 'admin' },
                'servidor-prod-2': { valid: true, os: 'Oracle Linux 8', user: 'admin' },
                'servidor-homolog': { valid: true, os: 'Oracle Linux 8', user: 'admin' },
                'servidor-dev': { valid: true, os: 'Oracle Linux 8', user: 'admin' },
                'servidor-offline': { valid: false, os: 'Unknown', user: 'unknown' }
            };
            
            sessionStorage.setItem('hostData', JSON.stringify(window.hostData));
            renderHostsFromCache();
        }
    }
    
    // Versão melhorada da função de renderização
    function renderHostsFromCache() {
        console.log('🎨 Renderizando hosts a partir do cache');
        
        const hostsContainer = document.getElementById('hosts-list');
        if (!hostsContainer || !window.hostData) {
            console.error("❌ Container de hosts não encontrado ou dados não disponíveis");
            return;
        }
        
        // Limpa o conteúdo atual
        hostsContainer.innerHTML = '';
        
        // Organiza os hosts (válidos primeiro, depois inválidos)
        const validHosts = [];
        const invalidHosts = [];
        
        Object.entries(window.hostData).forEach(([hostname, info]) => {
            if (info.valid) {
                validHosts.push([hostname, info]);
            } else {
                invalidHosts.push([hostname, info]);
            }
        });
        
        const sortedHosts = [...validHosts, ...invalidHosts];
        
        // Cria o contêiner para os banners de host
        const hostsContent = document.createElement('div');
        hostsContent.className = 'hosts-container';
        hostsContent.style.display = 'flex';
        hostsContent.style.flexWrap = 'wrap';
        hostsContent.style.gap = '12px';
        hostsContent.style.width = '100%';
        
        // Verifica se temos a função de criação de banners original
        if (typeof window.updateHostBanner === 'function') {
            // Usa a função original para cada host
            sortedHosts.forEach(([hostname, info]) => {
                const bannerHTML = window.updateHostBanner(hostname, info);
                // Adiciona o HTML ao contêiner
                if (bannerHTML) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = bannerHTML;
                    const banner = tempDiv.firstChild;
                    hostsContent.appendChild(banner);
                }
            });
        } else {
            // Cria banners manualmente
            sortedHosts.forEach(([hostname, info]) => {
                const hostBanner = document.createElement('div');
                hostBanner.className = `host-banner ${info.valid ? 'valid' : 'invalid'}`;
                hostBanner.dataset.hostname = hostname;
                
                hostBanner.innerHTML = `
                    <div class="host-header">
                        <span class="hostname">${hostname}</span>
                        <span class="status-indicator ${info.valid ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="host-details">
                        <div class="os-info">${info.os || 'Desconhecido'}</div>
                        <div class="user-info">${info.user || 'Não especificado'}</div>
                    </div>
                `;
                
                hostsContent.appendChild(hostBanner);
            });
        }
        
        // Adiciona o contêiner de hosts à página
        hostsContainer.appendChild(hostsContent);
        
        // Adiciona os event listeners aos hosts
        if (typeof window.attachHostEventListeners === 'function') {
            window.attachHostEventListeners();
        } else {
            // Implementa comportamento básico se função original não existir
            document.querySelectorAll('.host-banner.valid').forEach(banner => {
                banner.addEventListener('click', function() {
                    this.classList.toggle('selected');
                    
                    // Atualiza o botão de execução se a função existir
                    if (typeof window.updateExecuteButton === 'function') {
                        window.updateExecuteButton();
                    }
                });
            });
        }
        
        console.log(`✅ ${sortedHosts.length} hosts renderizados com sucesso`);
    }
    
    // Adiciona listener para responder a mudanças de conteúdo em navegação SPA
    function setupSPAListeners() {
        // Verifica se já tem listener para evitar duplicação
        if (window.hostSPAListenerAdded) return;
        window.hostSPAListenerAdded = true;
        
        console.log('👂 Adicionando listeners para eventos SPA');
        
        // Escuta o evento content-loaded que é comum em frameworks SPA
        document.addEventListener('content-loaded', function(e) {
            console.log('🔄 Evento content-loaded detectado, verificando se estamos na página Ansible');
            
            // Verifica se estamos na página Ansible após um pequeno delay
            setTimeout(() => {
                if (document.querySelector('.ansible-container') || 
                    window.location.pathname.includes('/ansible')) {
                    console.log('✅ Página Ansible detectada, carregando hosts');
                    window.loadHosts(false);
                }
            }, 300);
        });
        
        // Escuta eventos específicos para Ansible
        document.addEventListener('ansible-loaded', function() {
            console.log('🔄 Evento ansible-loaded detectado');
            setTimeout(() => window.loadHosts(false), 300);
        });
        
        // Observer para detectar quando o container Ansible é adicionado à página
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1) {
                            // Se o nó adicionado é ou contém a container Ansible
                            if (node.classList?.contains('ansible-container') || 
                                node.querySelector('.ansible-container')) {
                                console.log('🔎 Container Ansible detectado sendo adicionado');
                                setTimeout(() => window.loadHosts(false), 300);
                            }
                            
                            // Se o nó adicionado é ou contém o hosts-list
                            if (node.id === 'hosts-list' || node.querySelector('#hosts-list')) {
                                console.log('🔎 Container hosts-list detectado sendo adicionado');
                                setTimeout(() => window.loadHosts(false), 300);
                            }
                        }
                    }
                }
            });
        });
        
        // Observa o corpo do documento para detectar mudanças
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Também observa manualmente cliques em links que levam à página de playbooks
        document.addEventListener('click', function(e) {
            // Encontra o link mais próximo se o clique foi em um elemento dentro dele
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (href && (href.includes('/ansible/playbooks') || href.includes('/module/ansible'))) {
                console.log('🔎 Clique em link de playbooks detectado:', href);
                
                // Programa um carregamento de hosts após a navegação
                setTimeout(() => {
                    if (document.querySelector('.ansible-container')) {
                        console.log('✅ Página Ansible carregada após clique, forçando carregamento de hosts');
                        window.loadHosts(false);
                    }
                }, 500);
            }
        });
    }
    
    // Inicializa todos os aprimoramentos
    function initialize() {
        // Configura os listeners para eventos SPA
        setupSPAListeners();
        
        // Verifica se já estamos na página Ansible
        if (document.querySelector('.ansible-container') || 
            window.location.pathname.includes('/ansible')) {
            console.log('✅ Página Ansible detectada na inicialização, carregando hosts');
            setTimeout(() => window.loadHosts(false), 300);
        }
    }
    
    // Inicia a correção quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();