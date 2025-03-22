/**
 * spa-fix-integration.js - Solução integrada para problemas da plataforma Automato SPA
 * Resolve problemas de carregamento de hosts, CSS e navegação
 */
(function() {
    // Garante que este script seja executado apenas uma vez
    if (window.spaFixIntegrationInitialized) return;
    window.spaFixIntegrationInitialized = true;
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 Inicializando correções para SPA da Automato Platform');
        
        // Corrige caminhos de arquivos incorretos
        fixFilePaths();
        
        // Aprimora o carregamento de hosts
        enhanceHostsLoading();
        
        // Inicializa os eventos específicos para a página atual
        initCurrentPage();
        
        // Configura listeners para navegação SPA
        setupSpaNavigation();
    });
    
    /**
     * Corrige caminhos de arquivos que estão incorretos
     */
    function fixFilePaths() {
        // Mapeamento de caminhos incorretos para os corretos
        const pathMapping = {
            '/static/css/sidebar/docs-menu.css': '/static/css/sidebar/menu-docs.css',
            '/static/css/ansible/host-content-fix.css': '/static/css/ansible/hosts.css',
            '/static/js/spa/spa-navigation.js': '/static/js/spa-navigation.js',
            '/static/js/spa/css-manager.js': '/static/js/css-manager.js',
            '/static/js/spa/sidebar-enhancement.js': '/static/js/sidebar-enhancement.js',
            '/static/js/spa/module-initializers.js': '/static/js/module-initializers.js',
            '/static/js/ansible/24x7_antivirus-manager2.js': '/static/js/ansible/ansible-manager.js'
        };
        
        // Intercepta solicitações de recursos para corrigir caminhos
        const originalFetch = window.fetch;
        window.fetch = function(resource, options) {
            if (typeof resource === 'string') {
                // Verifica se o caminho está no mapeamento
                for (const [incorrectPath, correctPath] of Object.entries(pathMapping)) {
                    if (resource.includes(incorrectPath)) {
                        console.log(`🔄 Corrigindo caminho: ${incorrectPath} -> ${correctPath}`);
                        resource = resource.replace(incorrectPath, correctPath);
                        break;
                    }
                }
            }
            return originalFetch.call(this, resource, options);
        };
        
        // Função melhorada para carregar CSS
        window.ensureModuleCssLoaded = function(moduleName) {
            if (!moduleName) return;
            
            // CSS específicos para cada módulo
            const moduleCssMap = {
                'ansible': [
                    '/static/css/ansible/variables.css',
                    '/static/css/ansible/playbooks.css',
                    '/static/css/ansible/output.css',
                    '/static/css/ansible/layout.css',
                    '/static/css/ansible/hosts.css',
                    '/static/css/ansible/header.css',
                    '/static/css/ansible/execution.css',
                    '/static/css/ansible/debug.css',
                    '/static/css/ansible/ansible.css',
                    '/static/css/ansible/animations.css'
                ],
                'inventory': [
                    '/static/css/inventory/animations.css',
                    '/static/css/inventory/buttons.css',
                    '/static/css/inventory/cards.css',
                    '/static/css/inventory/feedback.css',
                    '/static/css/inventory/forms.css',
                    '/static/css/inventory/header.css',
                    '/static/css/inventory/layout.css',
                    '/static/css/inventory/main.css',
                    '/static/css/inventory/modals.css',
                    '/static/css/inventory/utils.css',
                    '/static/css/inventory/vars.css'
                ]
            };
            
            // CSS comuns para todas as páginas
            const commonCss = [
                '/static/css/sidebar/layout.css',
                '/static/css/sidebar/menu-items.css',
                '/static/css/sidebar/submenus.css',
                '/static/css/main.css'
            ];
            
            // Carrega CSS comuns
            commonCss.forEach(cssPath => {
                loadCssIfNeeded(cssPath);
            });
            
            // Carrega CSS específicos do módulo
            const cssFiles = moduleCssMap[moduleName] || [];
            cssFiles.forEach(cssPath => {
                loadCssIfNeeded(cssPath);
            });
        };
        
        // Função auxiliar para carregar CSS se não estiver já carregado
        function loadCssIfNeeded(cssPath) {
            // Ajusta caminhos incorretos
            for (const [incorrectPath, correctPath] of Object.entries(pathMapping)) {
                if (cssPath.includes(incorrectPath)) {
                    cssPath = cssPath.replace(incorrectPath, correctPath);
                    break;
                }
            }
            
            if (!document.querySelector(`link[href="${cssPath}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssPath;
                document.head.appendChild(link);
                console.log(`📝 CSS carregado: ${cssPath}`);
            }
        }
    }
    
    /**
     * Aprimora o carregamento de hosts para funcionar com navegação SPA
     */
    function enhanceHostsLoading() {
        // Substitui a função original de renderização de hosts
        const originalRenderHostsFromCache = window.renderHostsFromCache;
        
        window.renderHostsFromCache = function() {
            console.log('🔍 Renderizando hosts a partir do cache - versão aprimorada');
            
            const hostsContainer = document.getElementById('hosts-list');
            if (!hostsContainer || !window.hostData) {
                console.error("❌ Container de hosts não encontrado ou dados de hosts não disponíveis");
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
            
            // Gera o HTML para cada host
            sortedHosts.forEach(([hostname, info]) => {
                // Se não temos a função de atualizar banner, cria um do zero
                if (window.updateHostBanner) {
                    hostsContent.innerHTML += window.updateHostBanner(hostname, info);
                } else {
                    // Cria banner manualmente como fallback
                    const hostBanner = document.createElement('div');
                    hostBanner.className = `host-banner ${info.valid ? 'valid' : 'invalid'}`;
                    hostBanner.setAttribute('data-hostname', hostname);
                    
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
                }
            });
            
            hostsContainer.appendChild(hostsContent);
            
            // Adiciona os event listeners
            if (window.attachHostEventListeners) {
                window.attachHostEventListeners();
            } else {
                // Adiciona listeners básicos como fallback
                document.querySelectorAll('.host-banner.valid').forEach(banner => {
                    banner.addEventListener('click', function() {
                        this.classList.toggle('selected');
                        if (window.updateExecuteButton) {
                            window.updateExecuteButton();
                        }
                    });
                });
            }
            
            console.log(`✅ Renderização concluída: ${sortedHosts.length} hosts carregados`);
        };
        
        // Aprimora a função loadHosts para ser mais robusta
        const originalLoadHosts = window.loadHosts;
        
        window.loadHosts = async function(forceRefresh = false) {
            console.log('🔄 Carregando hosts com função aprimorada para SPA');
            
            try {
                // Verifica se o container de hosts existe
                const hostsContainer = document.getElementById('hosts-list');
                if (!hostsContainer) {
                    console.error("❌ Container hosts-list não encontrado no DOM");
                    return;
                }
                
                // Se temos dados em cache e não é forçada atualização, usa o cache
                const cachedHostData = sessionStorage.getItem('hostData');
                if (!forceRefresh && cachedHostData && !window.hostData) {
                    console.log('📋 Usando dados de hosts em cache');
                    window.hostData = JSON.parse(cachedHostData);
                    window.renderHostsFromCache();
                    return;
                }
                
                // Se temos a função original e não temos dados em cache ou forçamos atualização
                if (originalLoadHosts && (forceRefresh || !window.hostData)) {
                    await originalLoadHosts(forceRefresh);
                } else if (!window.hostData) {
                    // Falback se não temos dados nem função original
                    await fetchHostsData();
                } else {
                    // Temos dados, só renderiza
                    window.renderHostsFromCache();
                }
            } catch (error) {
                console.error("❌ Erro ao carregar hosts:", error);
                
                // Tenta recuperar do erro usando cache
                const cachedHostData = sessionStorage.getItem('hostData');
                if (cachedHostData) {
                    console.log("🔄 Recuperando dados de hosts do cache após erro");
                    window.hostData = JSON.parse(cachedHostData);
                    window.renderHostsFromCache();
                }
            }
        };
        
        // Função auxiliar para buscar dados de hosts se não temos a original
        async function fetchHostsData() {
            try {
                console.log('🔍 Buscando dados de hosts diretamente');
                
                // URL para buscar hosts (ajuste conforme sua API)
                const response = await fetch('/api/hosts');
                if (!response.ok) {
                    throw new Error(`Erro HTTP ${response.status}`);
                }
                
                const data = await response.json();
                window.hostData = data.hosts || data;
                
                // Salva no cache
                sessionStorage.setItem('hostData', JSON.stringify(window.hostData));
                
                // Renderiza os hosts
                window.renderHostsFromCache();
                
                console.log('✅ Dados de hosts carregados com sucesso');
            } catch (error) {
                console.error('❌ Erro ao buscar dados de hosts:', error);
                // Cria dados de exemplo se não conseguir buscar
                window.hostData = {
                    'example-host-1': { valid: true, os: 'Linux', user: 'admin' },
                    'example-host-2': { valid: true, os: 'Oracle Linux 8', user: 'admin' },
                    'example-host-3': { valid: false, os: 'Unknown', user: 'unknown' }
                };
                window.renderHostsFromCache();
            }
        }
        
        // Observa mudanças na DOM para detectar quando o container de hosts é adicionado
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1 && (
                            node.id === 'hosts-list' || 
                            node.querySelector('#hosts-list')
                        )) {
                            console.log("🔍 Container de hosts detectado sendo adicionado ao DOM");
                            setTimeout(() => {
                                if (window.loadHosts) {
                                    window.loadHosts(false);
                                }
                            }, 100);
                            break;
                        }
                    }
                }
            });
        });
        
        // Configurar o observer para observar o body
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * Inicializa componentes específicos para página atual
     */
    function initCurrentPage() {
        const currentPath = window.location.pathname;
        
        // Detecção de módulo com base na URL
        let moduleName = '';
        if (currentPath.includes('/ansible')) moduleName = 'ansible';
        else if (currentPath.includes('/inventory')) moduleName = 'inventory';
        else if (currentPath.includes('/terraform')) moduleName = 'terraform';
        else if (currentPath.includes('/python')) moduleName = 'python';
        
        console.log(`📄 Página atual: ${moduleName || 'Desconhecida'}`);
        
        // Garante que o CSS esteja carregado
        if (window.ensureModuleCssLoaded && moduleName) {
            window.ensureModuleCssLoaded(moduleName);
        }
        
        // Inicializa componentes específicos do módulo
        if (moduleName === 'ansible') {
            initializeAnsiblePage();
        } else if (moduleName === 'inventory') {
            initializeInventoryPage();
        }
    }
    
    /**
     * Inicializa componentes específicos para a página Ansible
     */
    function initializeAnsiblePage() {
        console.log('🔧 Inicializando página Ansible');
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Inicializa filtros
            if (window.initializeOSFilters) {
                try {
                    window.initializeOSFilters();
                    console.log('✅ Filtros de SO inicializados');
                } catch (error) {
                    console.error('❌ Erro ao inicializar filtros:', error);
                }
            }
            
            // Carrega hosts
            if (window.loadHosts) {
                try {
                    window.loadHosts(false);
                    console.log('✅ Carregamento de hosts iniciado');
                } catch (error) {
                    console.error('❌ Erro ao carregar hosts:', error);
                }
            }
            
            // Carrega playbooks
            if (window.loadPlaybooks) {
                try {
                    window.loadPlaybooks(false);
                    console.log('✅ Carregamento de playbooks iniciado');
                } catch (error) {
                    console.error('❌ Erro ao carregar playbooks:', error);
                }
            }
            
            // Configura eventos para os filtros
            if (window.setupFilterEvents) {
                try {
                    window.setupFilterEvents();
                    console.log('✅ Eventos de filtros configurados');
                } catch (error) {
                    console.error('❌ Erro ao configurar eventos de filtros:', error);
                }
            }
            
            // Atualiza botão de execução
            if (window.updateExecuteButton) {
                try {
                    window.updateExecuteButton();
                    console.log('✅ Botão de execução atualizado');
                } catch (error) {
                    console.error('❌ Erro ao atualizar botão de execução:', error);
                }
            }
            
            // Configura eventos específicos para botões da página
            setupAnsibleButtons();
        }, 200);
    }
    
    /**
     * Configura eventos para botões específicos da página Ansible
     */
    function setupAnsibleButtons() {
        // Seleciona todos os hosts
        const selectAllHostsBtn = document.getElementById('select-all-hosts-btn');
        if (selectAllHostsBtn) {
            // Remove listeners anteriores
            const newBtn = selectAllHostsBtn.cloneNode(true);
            selectAllHostsBtn.parentNode.replaceChild(newBtn, selectAllHostsBtn);
            
            newBtn.addEventListener('click', function() {
                if (window.toggleAllHosts) {
                    const allSelected = document.querySelectorAll('.host-banner.selected').length ===
                                      document.querySelectorAll('.host-banner.valid').length;
                    window.toggleAllHosts(!allSelected);
                } else {
                    // Fallback se a função não existir
                    const hostBanners = document.querySelectorAll('.host-banner.valid');
                    const allSelected = document.querySelectorAll('.host-banner.selected').length === hostBanners.length;
                    
                    hostBanners.forEach(banner => {
                        if (allSelected) {
                            banner.classList.remove('selected');
                        } else {
                            banner.classList.add('selected');
                        }
                    });
                    
                    if (window.updateExecuteButton) {
                        window.updateExecuteButton();
                    }
                }
            });
        }
        
        // Outros botões da página Ansible
        setupButtonWithClone('select-all-playbooks', function() {
            if (window.toggleAllPlaybooks) {
                const allSelected = document.querySelectorAll('.playbook-item.selected').length ===
                                document.querySelectorAll('.playbook-item').length;
                window.toggleAllPlaybooks(!allSelected);
            }
        });
        
        setupButtonWithClone('execute-selected', function() {
            if (window.executeSelectedPlaybooks) {
                window.executeSelectedPlaybooks();
            }
        });
        
        setupButtonWithClone('refresh', function() {
            if (window.refreshAll) {
                window.refreshAll();
            } else {
                // Fallback se a função não existir
                if (window.loadHosts) window.loadHosts(true);
                if (window.loadPlaybooks) window.loadPlaybooks(true);
            }
        });
        
        setupButtonWithClone('cancel-all', function() {
            if (window.cancelAllExecutions) {
                window.cancelAllExecutions();
            }
        });
        
        setupButtonWithClone('debug-toggle', function() {
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput) {
                const isVisible = debugOutput.style.display === 'block';
                debugOutput.style.display = isVisible ? 'none' : 'block';
                
                this.innerHTML = isVisible ? `
                    Mostrar Debug
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                ` : `
                    Esconder Debug
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                `;
            }
        });
    }
    
    /**
     * Inicializa componentes específicos para a página de Inventário
     */
    function initializeInventoryPage() {
        console.log('🔧 Inicializando página de Inventário');
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Carrega os servidores
            if (window.loadServers) {
                try {
                    window.loadServers();
                    console.log('✅ Carregamento de servidores iniciado');
                } catch (error) {
                    console.error('❌ Erro ao carregar servidores:', error);
                }
            }
            
            // Inicializa o formulário
            if (window.initializeForm) {
                try {
                    window.initializeForm();
                    console.log('✅ Formulário inicializado');
                } catch (error) {
                    console.error('❌ Erro ao inicializar formulário:', error);
                }
            }
            
            // Configura eventos específicos para formulários e botões
            setupInventoryForms();
        }, 200);
    }
    
    /**
     * Configura eventos para formulários e botões da página de Inventário
     */
    function setupInventoryForms() {
        // Formulário de servidor
        const serverForm = document.getElementById('server-form');
        if (serverForm) {
            // Remove listeners anteriores
            const newForm = serverForm.cloneNode(true);
            serverForm.parentNode.replaceChild(newForm, serverForm);
            
            // Adiciona novo listener
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (window.saveServer) {
                    const host = document.getElementById('host').value;
                    const usuario = document.getElementById('usuario').value;
                    const senha = document.getElementById('senha').value;
                    const os = document.getElementById('os').value;
                    const chave = document.getElementById('chave').value;
                    const originalHost = document.getElementById('original-host').value;
                    
                    window.saveServer(host, usuario, senha, os, chave, originalHost);
                }
            });
        }
        
        // Outros botões da página de Inventário
        setupButtonWithClone('cancel-btn', function() {
            if (window.cancelEdit) {
                window.cancelEdit();
            }
        });
        
        setupButtonWithClone('show-inventory-btn', function() {
            if (window.showInventory) {
                window.showInventory();
            }
        });
        
        setupButtonWithClone('copy-inventory-btn', function() {
            const inventoryText = document.getElementById('full-inventory');
            if (inventoryText && window.copyToClipboard) {
                window.copyToClipboard(inventoryText.textContent);
            }
        });
        
        // Botões de modal
        document.querySelectorAll('#close-modal-btn, #close-modal-btn-alt').forEach(btn => {
            if (btn) {
                setupButtonWithClone(btn.id, function() {
                    const modal = document.getElementById('inventory-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }
    
    /**
     * Configura a navegação SPA para evitar piscar durante a navegação
     */
    function setupSpaNavigation() {
        // Adiciona um evento de conteúdo carregado para reinicializar componentes
        document.addEventListener('content-loaded', function(e) {
            console.log('🔄 Evento content-loaded recebido');
            
            // Obtém informações do módulo se disponíveis
            const moduleInfo = e.detail || {};
            let moduleName = moduleInfo.module;
            
            // Se não temos info do módulo, tenta extrair da URL
            if (!moduleName) {
                const path = window.location.pathname;
                if (path.includes('/ansible')) moduleName = 'ansible';
                else if (path.includes('/inventory')) moduleName = 'inventory';
                else if (path.includes('/terraform')) moduleName = 'terraform';
                else if (path.includes('/python')) moduleName = 'python';
            }
            
            console.log(`📄 Reinicializando componentes para módulo: ${moduleName || 'desconhecido'}`);
            
            // Pequeno atraso para garantir que o DOM esteja pronto
            setTimeout(() => {
                // Garante que o CSS esteja carregado
                if (window.ensureModuleCssLoaded && moduleName) {
                    window.ensureModuleCssLoaded(moduleName);
                }
                
                // Inicializa componentes específicos do módulo
                if (moduleName === 'ansible') {
                    initializeAnsiblePage();
                } else if (moduleName === 'inventory') {
                    initializeInventoryPage();
                }
            }, 200);
        });
        
        // Também escuta eventos mais específicos para diferentes módulos
        document.addEventListener('ansible-loaded', function() {
            console.log('🔄 Evento ansible-loaded recebido');
            initializeAnsiblePage();
        });
        
        document.addEventListener('inventory-loaded', function() {
            console.log('🔄 Evento inventory-loaded recebido');
            initializeInventoryPage();
        });
    }
    
    /**
     * Função auxiliar para configurar botão com clonagem (remove listeners antigos)
     * @param {string} id - ID do botão
     * @param {Function} callback - Função de callback para o evento de clique
     */
    function setupButtonWithClone(id, callback) {
        const button = document.getElementById(id);
        if (button) {
            // Remove event listeners existentes
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Adiciona novo event listener
            newButton.addEventListener('click', callback);
            
            return newButton;
        }
        return null;
    }
})();