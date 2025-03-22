/**
 * main.js - Script principal para integração com solução SPA da Automato Platform
 * Versão corrigida para resolver problemas de submenu e navegação
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cache para elementos DOM frequentemente acessados
    let mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    const loader = document.getElementById('loader') || createLoader();
    
    /**
     * Cria um loader caso não exista
     * @returns {HTMLElement} Elemento loader criado
     */
    function createLoader() {
        const newLoader = document.createElement('div');
        newLoader.id = 'loader';
        newLoader.className = 'ajax-loader';
        newLoader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.3);
            z-index: 9999;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Adiciona spinner dentro do loader
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #4285f4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        newLoader.appendChild(spinner);
        
        // Adiciona regra de animação
        if (!document.getElementById('loader-animation')) {
            const style = document.createElement('style');
            style.id = 'loader-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(newLoader);
        return newLoader;
    }
    
    /**
     * Gerencia exibição do loader de forma não bloqueante
     * @param {boolean} show - Se true, mostra o loader; se false, esconde
     */
    function manageLoader(show) {
        if (!loader) return;
        
        if (show) {
            loader.style.display = 'block';
            // Força reflow para garantir que a transição seja aplicada
            loader.offsetHeight;
            loader.style.opacity = '1';
        } else {
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.style.opacity === '0') {
                    loader.style.display = 'none';
                }
            }, 300);
        }
    }
    
    /**
     * Extrai o nome do módulo atual a partir da URL
     * @returns {string|null} Nome do módulo ou null se não for identificado
     */
    function getCurrentModule() {
        const path = window.location.pathname;
        
        if (path.includes('/ansible')) return 'ansible';
        if (path.includes('/inventory')) return 'inventory';
        if (path.includes('/terraform')) return 'terraform';
        if (path.includes('/python')) return 'python';
        
        return null;
    }
    
    /**
     * Configura manipuladores especiais para os links de submenu
     */
    function setupSubmenuHandlers() {
        // Limpa todos os event listeners atuais nos submenus
        document.querySelectorAll('a.has-submenu').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Adiciona novo event listener para toggle de submenu
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Não faz nada se a sidebar estiver colapsada
                if (sidebar && sidebar.classList.contains('collapsed')) return;
                
                const menuItem = this.parentElement;
                const wasOpen = menuItem.classList.contains('open');
                const submenu = menuItem.querySelector('.submenu');
                
                // Primeiro fecha todos os menus abertos no mesmo nível
                const siblings = Array.from(menuItem.parentNode.children);
                siblings.forEach(sibling => {
                    if (sibling !== menuItem && sibling.classList.contains('menu-item')) {
                        sibling.classList.remove('open');
                        const siblingSubmenu = sibling.querySelector('.submenu');
                        const siblingLink = sibling.querySelector('a.has-submenu');
                        
                        if (siblingLink) {
                            siblingLink.classList.remove('selected');
                        }
                        
                        if (siblingSubmenu) {
                            siblingSubmenu.style.maxHeight = '0';
                        }
                    }
                });
                
                // Alterna o estado do menu atual
                if (wasOpen) {
                    menuItem.classList.remove('open');
                    this.classList.remove('selected');
                    
                    if (submenu) {
                        submenu.style.maxHeight = '0';
                    }
                } else {
                    menuItem.classList.add('open');
                    this.classList.add('selected');
                    
                    if (submenu) {
                        submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                        
                        // Atualiza as alturas dos menus pais se necessário
                        updateParentSubmenusHeight(submenu);
                        
                        // Garante que o submenu seja visível
                        setTimeout(() => {
                            adjustScrollForSubmenu(submenu);
                        }, 100);
                    }
                }
            });
        });
        
        // Configura os links finais (sem submenu)
        document.querySelectorAll('.submenu .menu-item > a:not(.has-submenu)').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Adiciona novo event listener para navegação SPA
            newLink.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Se não for um link válido, não faz nada
                if (!href || href === '#' || href.startsWith('javascript:')) {
                    e.preventDefault();
                    return;
                }
                
                // Previne comportamento padrão para links SPA
                e.preventDefault();
                
                // Mostra loader e salva o estado atual
                manageLoader(true);
                
                // Marca este item como selecionado
                const menuItem = this.parentElement;
                
                // Remove seleção de outros itens
                document.querySelectorAll('.menu-item').forEach(item => {
                    if (item !== menuItem) {
                        item.classList.remove('selected');
                    }
                });
                
                menuItem.classList.add('selected');
                
                // Salva o item selecionado no localStorage
                localStorage.setItem('selectedMenuItem', menuItem.querySelector('a').textContent.trim());
                
                // Atualiza URL no histórico sem recarregar a página
                history.pushState({}, '', href);
                
                // Carrega o conteúdo via AJAX
                loadContent(href);
            });
        });
    }
    
    /**
     * Atualiza altura dos submenus pais
     * @param {HTMLElement} element - Elemento submenu
     */
    function updateParentSubmenusHeight(element) {
        if (!element || !element.parentElement) return;
        
        let parent = element.parentElement.closest('.menu-item');
        while (parent) {
            const parentSubmenu = parent.querySelector('.submenu');
            if (parentSubmenu) {
                // Calcula altura total dos filhos
                let totalHeight = 0;
                Array.from(parentSubmenu.children).forEach(child => {
                    totalHeight += child.offsetHeight || 0;
                });
                
                // Adiciona um pouco de margem para segurança
                parentSubmenu.style.maxHeight = `${totalHeight + 10}px`;
            }
            parent = parent.parentElement ? parent.parentElement.closest('.menu-item') : null;
        }
    }
    
    /**
     * Ajusta o scroll para mostrar o submenu expandido
     * @param {HTMLElement} submenu - Elemento submenu
     */
    function adjustScrollForSubmenu(submenu) {
        const menu = document.querySelector('.menu');
        if (!submenu || !menu) return;
        
        const submenuRect = submenu.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        // Se o submenu estiver abaixo da área visível
        if (submenuRect.bottom > menuRect.bottom) {
            menu.scrollTo({
                top: menu.scrollTop + (submenuRect.bottom - menuRect.bottom) + 20,
                behavior: 'smooth'
            });
        } 
        // Se o submenu estiver acima da área visível
        else if (submenuRect.top < menuRect.top) {
            menu.scrollTo({
                top: menu.scrollTop - (menuRect.top - submenuRect.top) - 20,
                behavior: 'smooth'
            });
        }
    }
    
    /**
     * Configura navegação SPA para links dentro do documento
     */
    function setupSpaNavigation() {
        // Configura navegação para links fora da sidebar
        document.addEventListener('click', function(e) {
            // Ignora cliques em links da sidebar, eles têm seu próprio handler
            if (e.target.closest('.sidebar')) {
                return;
            }
            
            // Verifica se é um link válido para navegação SPA
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            
            // Ignora links externos, âncoras ou links vazios
            if (!href || 
                href.startsWith('#') || 
                href.startsWith('http') || 
                href.startsWith('//') ||
                href.startsWith('javascript:') ||
                link.getAttribute('target') === '_blank') {
                return;
            }
            
            // Previne comportamento padrão do link
            e.preventDefault();
            
            // Mostra loader e salva o estado atual
            manageLoader(true);
            
            // Salva o estado de scroll atual
            const currentModule = getCurrentModule();
            if (currentModule) {
                localStorage.setItem(`${currentModule}_scrollPos`, mainContent?.scrollTop || 0);
            }
            
            // Atualiza URL no histórico sem recarregar a página
            history.pushState({}, '', href);
            
            // Carrega o conteúdo via AJAX
            loadContent(href);
        });
        
        // Configura navegação do histórico (botões voltar/avançar)
        window.addEventListener('popstate', function(e) {
            manageLoader(true);
            loadContent(window.location.pathname);
        });
    }
    
    /**
     * Carrega conteúdo da página via AJAX
     * @param {string} url - URL a ser carregada
     */
    function loadContent(url) {
        // Sempre mostra o loader primeiro
        manageLoader(true);
        
        // Verifica se temos um carregador AJAX existente no sistema
        if (window.AjaxLoader && window.AjaxLoader.loadContent) {
            // Usa o carregador existente
            window.AjaxLoader.loadContent(url).then(() => {
                // Atualiza referência ao mainContent
                mainContent = document.querySelector('.main-content');
                finalizeNavigation(url);
            }).catch(() => {
                manageLoader(false);
            });
            return;
        }
        
        // Implementação própria caso não exista AjaxLoader
        fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/html'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Processa o HTML recebido
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extrai o conteúdo principal
            const newContent = doc.querySelector('.main-content');
            if (!newContent) {
                throw new Error('Conteúdo principal não encontrado na resposta');
            }
            
            // Aguarda um pouco antes de trocar o conteúdo (evita piscar)
            setTimeout(() => {
                // Atualiza o conteúdo na página
                if (mainContent) {
                    // Aplica fade out antes de trocar o conteúdo
                    mainContent.style.opacity = '0';
                    
                    setTimeout(() => {
                        mainContent.innerHTML = newContent.innerHTML;
                        
                        // Força reflow para garantir que a transição seja aplicada
                        mainContent.offsetHeight;
                        
                        // Aplica fade in após trocar o conteúdo
                        mainContent.style.opacity = '1';
                        
                        // Atualiza referência ao mainContent
                        mainContent = document.querySelector('.main-content');
                        
                        finalizeNavigation(url);
                    }, 150);
                } else {
                    console.error('Elemento .main-content não encontrado na página atual');
                    manageLoader(false);
                }
            }, 300); // Aguarda 300ms para exibir o loader
        })
        .catch(error => {
            console.error('Erro ao carregar conteúdo:', error);
            manageLoader(false);
        });
    }
    
    /**
     * Finaliza processo de navegação
     * @param {string} url - URL carregada
     */
    function finalizeNavigation(url) {
        // Dispara evento de conteúdo carregado
        const moduleInfo = {
            module: getCurrentModule()
        };
        
        document.dispatchEvent(new CustomEvent('content-loaded', {
            detail: moduleInfo
        }));
        
        // Restaura posição de scroll se existir
        if (moduleInfo.module) {
            const savedScrollPos = localStorage.getItem(`${moduleInfo.module}_scrollPos`);
            if (savedScrollPos && mainContent) {
                setTimeout(() => {
                    mainContent.scrollTop = parseInt(savedScrollPos, 10);
                }, 50);
            }
        }
        
        // Reinicializa componentes específicos do módulo
        reinitializeComponents(moduleInfo.module);
        
        // Reconfigurar handlers de submenu após a navegação
        setTimeout(() => {
            setupSubmenuHandlers();
        }, 300);
        
        // Atualiza seleção do item no menu com base na URL atual
        updateMenuSelection(url);
        
        // Esconde loader com um pequeno atraso para garantir que tudo esteja renderizado
        setTimeout(() => {
            manageLoader(false);
        }, 500);
    }
    
    /**
     * Atualiza a seleção do menu com base na URL atual
     * @param {string} url - URL atual
     */
    function updateMenuSelection(url) {
        // Remove seleção atual
        document.querySelectorAll('.menu-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Busca o link que corresponde à URL atual
        let foundLink = null;
        
        // Primeiro, tenta encontrar um match exato
        document.querySelectorAll('.sidebar a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href === url) {
                foundLink = link;
            }
        });
        
        // Se não encontrou match exato, tenta um match parcial
        if (!foundLink) {
            document.querySelectorAll('.sidebar a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && url.includes(href) && href !== '/') {
                    // Escolhe o match mais longo
                    if (!foundLink || href.length > foundLink.getAttribute('href').length) {
                        foundLink = link;
                    }
                }
            });
        }
        
        // Se encontrou um link, seleciona e abre os menus pais
        if (foundLink) {
            const menuItem = foundLink.parentElement;
            menuItem.classList.add('selected');
            
            // Abre menus pai
            let parent = menuItem.parentElement;
            while (parent) {
                if (parent.classList.contains('submenu')) {
                    const parentMenuItem = parent.parentElement;
                    if (parentMenuItem.classList.contains('menu-item')) {
                        parentMenuItem.classList.add('open');
                        
                        const parentLink = parentMenuItem.querySelector('a.has-submenu');
                        if (parentLink) {
                            parentLink.classList.add('selected');
                        }
                        
                        parent.style.maxHeight = `${parent.scrollHeight}px`;
                    }
                }
                parent = parent.parentElement;
            }
        }
    }
    
    /**
     * Reinicializa componentes específicos de cada módulo
     * @param {string} moduleName - Nome do módulo a ser reinicializado
     */
    function reinitializeComponents(moduleName) {
        if (!moduleName) return;
        
        console.log(`Reinicializando componentes do módulo: ${moduleName}`);
        
        // Padrão para todos os módulos: garante que os elementos de UI estejam corretamente inicializados
        setupAnimations();
        fixMissingStyles(moduleName);
        
        // Reinicialização específica por módulo
        switch(moduleName) {
            case 'ansible':
                reinitializeAnsibleComponents();
                break;
                
            case 'inventory':
                reinitializeInventoryComponents();
                break;
                
            case 'terraform':
                reinitializeTerraformComponents();
                break;
                
            case 'python':
                reinitializePythonComponents();
                break;
        }
        
        // Corrige problema com a sidebar após navegação
        fixSidebarAfterNavigation();
    }

    

    
    /**
     * Reinicializa componentes específicos do módulo Ansible
     */
    function reinitializeAnsibleComponents() {
        console.log("Reinicializando componentes Ansible");
        
        // Verifica se estamos na página Ansible
        const ansibleContainer = document.querySelector('.ansible-container');
        if (!ansibleContainer) return;
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Reinicializa filtros
            if (window.initializeOSFilters) {
                window.initializeOSFilters();
            }
            
            // Carrega hosts
            if (window.loadHosts) {
                window.loadHosts(false);
            }
            
            // Carrega playbooks
            if (window.loadPlaybooks) {
                window.loadPlaybooks(false);
            }
            
            // Configura eventos para os filtros
            if (window.setupFilterEvents) {
                window.setupFilterEvents();
            }
            
            // Atualiza painel de informações do SO
            if (window.updateOSInfoPanel) {
                window.updateOSInfoPanel();
            }
            
            // Atualiza botão de execução
            if (window.updateExecuteButton) {
                window.updateExecuteButton();
            }
            
            // Inicializa posições dos botões
            if (window.initializeButtonPositions) {
                window.initializeButtonPositions();
            }
            
            // Reconfigura event listeners para os botões
            setupAnsibleEventListeners();
            
            console.log("Componentes Ansible reinicializados");
        }, 200);
    }
    
    /**
     * Configura event listeners para elementos do módulo Ansible
     */
    function setupAnsibleEventListeners() {
        // Seleciona todos os hosts
        setupButtonWithClone('select-all-hosts-btn', function() {
            if (window.toggleAllHosts) {
                const allSelected = document.querySelectorAll('.host-banner.selected').length ===
                                 document.querySelectorAll('.host-banner.valid').length;
                window.toggleAllHosts(!allSelected);
            }
        });
        
        // Seleciona todas as playbooks
        setupButtonWithClone('select-all-playbooks', function() {
            if (window.toggleAllPlaybooks) {
                const allSelected = document.querySelectorAll('.playbook-item.selected').length ===
                                 document.querySelectorAll('.playbook-item').length;
                window.toggleAllPlaybooks(!allSelected);
            }
        });
        
        // Executar playbooks selecionadas
        setupButtonWithClone('execute-selected', function() {
            if (window.executeSelectedPlaybooks) {
                window.executeSelectedPlaybooks();
            }
        });
        
        // Atualizar dados
        setupButtonWithClone('refresh', function() {
            if (window.refreshAll) {
                window.refreshAll();
            }
        });
        
        // Cancelar execuções
        setupButtonWithClone('cancel-all', function() {
            if (window.cancelAllExecutions) {
                window.cancelAllExecutions();
            }
        });
        
        // Toggle de debug
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
     * Reinicializa componentes específicos do módulo de Inventário
     */
    /**
 * Reinicializa módulo de inventário
 */
function reinitializeInventory() {
    console.log("Reinicializando módulo de inventário...");
    
    // Verifica se estamos na página de Inventário
    const inventoryContainer = document.querySelector('.inventory-container');
    if (!inventoryContainer) {
        window._initializingModule = null;
        return;
    }
    
    // Adiciona um mecanismo de estabilização para evitar piscar
    if (!mainContent) {
        mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.minHeight = '70vh'; // Garante que a página tenha um tamanho mínimo
        }
    }
    
    // Força um recarregamento limpo do script de inventário
    const scriptSrc = '/static/js/core_inventory/main.js';
    
    // Remove scripts antigos relacionados ao inventário para evitar conflitos
    document.querySelectorAll('script[src*="core_inventory"]').forEach(script => {
        script.remove();
    });
    
    // Tenta resolver problemas de cache
    const cacheBuster = `?_cache=${new Date().getTime()}`;
    const script = document.createElement('script');
    script.src = scriptSrc + cacheBuster;
    script.async = false; // Carrega em ordem
    
    // Define um tempo limite para verificar se as funções foram definidas
    let scriptLoaded = false;
    
    script.onload = function() {
        scriptLoaded = true;
        console.log("Script do inventário carregado com sucesso");
        
        // Configurar eventos após um curto atraso para garantir carregamento completo
        setTimeout(() => {
            if (window.loadServers) {
                console.log("Carregando servidores via loadServers()");
                window.loadServers();
            }
            
            if (window.initializeForm) {
                console.log("Inicializando formulário");
                window.initializeForm();
            }
            
            // Inicializa manualmente os eventos se necessário
            const serverForm = document.getElementById('server-form');
            if (serverForm) {
                serverForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    console.log("Formulário submetido");
                    
                    if (window.saveServer) {
                        const host = document.getElementById('host').value;
                        const usuario = document.getElementById('usuario').value;
                        const senha = document.getElementById('senha').value;
                        const os = document.getElementById('os').value;
                        const chave = document.getElementById('chave').value;
                        const originalHost = document.getElementById('original-host').value;
                        
                        window.saveServer(host, usuario, senha, os, chave, originalHost);
                    } else {
                        console.error("Função saveServer não disponível");
                    }
                });
            }
            
            // Configura botões de edição/exclusão para linhas da tabela
            setupTableButtons();
            
            // Configura outros botões do inventário
            setupInventoryButtons();
            
            window._initializingModule = null;
        }, 500);
    };
    
    script.onerror = function() {
        console.error("Erro ao carregar script do inventário");
        window._initializingModule = null;
    };
    
    // Adiciona ao documento
    document.head.appendChild(script);
    
    // Configura um mecanismo de fallback caso o script não carregue corretamente
    setTimeout(() => {
        if (!scriptLoaded) {
            console.warn("Timeout ao carregar script do inventário, tentando alternativa");
            // Tenta uma abordagem mais direta
            initializeInventoryManually();
        }
    }, 2000);
}

/**
 * Inicializa o inventário manualmente se o script falhar
 */
function initializeInventoryManually() {
    console.log("Inicializando inventário manualmente");
    
    // Tenta encontrar ou criar as funções necessárias
    if (!window.loadServers) {
        window.loadServers = function() {
            console.log("Função loadServers criada manualmente");
            
            // Implementação simplificada para mostrar dados de exemplo
            const serversList = document.getElementById('servers-list');
            if (serversList) {
                // Carrega dados do localStorage se existirem
                let servers = [];
                try {
                    const storedServers = localStorage.getItem('inventory_servers');
                    if (storedServers) {
                        servers = JSON.parse(storedServers);
                    }
                } catch (e) {
                    console.error("Erro ao carregar servidores do localStorage", e);
                }
                
                // Se não houver dados, mostra mensagem
                if (servers.length === 0) {
                    serversList.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum servidor cadastrado</td></tr>';
                    return;
                }
                
                // Limpa a lista
                serversList.innerHTML = '';
                
                // Adiciona servidores à lista
                servers.forEach(server => {
                    const template = document.getElementById('server-row-template');
                    if (template) {
                        const clone = document.importNode(template.content, true);
                        
                        clone.querySelector('.host-cell').textContent = server.host;
                        clone.querySelector('.user-cell').textContent = server.usuario;
                        clone.querySelector('.auth-cell').textContent = server.senha ? 'Senha' : 'Chave SSH';
                        clone.querySelector('.os-cell').textContent = server.os.charAt(0).toUpperCase() + server.os.slice(1);
                        
                        // Adiciona eventos
                        const editBtn = clone.querySelector('.btn-edit');
                        const deleteBtn = clone.querySelector('.btn-delete');
                        
                        if (editBtn) {
                            editBtn.addEventListener('click', () => {
                                window.editServer(server.host);
                            });
                        }
                        
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', () => {
                                window.deleteServer(server.host);
                            });
                        }
                        
                        serversList.appendChild(clone);
                    }
                });
            }
        };
    }
    
    if (!window.saveServer) {
        window.saveServer = function(host, usuario, senha, os, chave, originalHost) {
            console.log("Função saveServer criada manualmente");
            
            // Verifica campos obrigatórios
            if (!host || !usuario || (!senha && !chave) || !os) {
                showFeedback('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            // Carrega servidores existentes
            let servers = [];
            try {
                const storedServers = localStorage.getItem('inventory_servers');
                if (storedServers) {
                    servers = JSON.parse(storedServers);
                }
            } catch (e) {
                console.error("Erro ao carregar servidores", e);
            }
            
            // Se for uma edição, remove o servidor original
            if (originalHost) {
                servers = servers.filter(s => s.host !== originalHost);
            }
            
            // Verifica se o host já existe
            if (!originalHost && servers.some(s => s.host === host)) {
                showFeedback('Este servidor já existe', 'error');
                return;
            }
            
            // Adiciona o novo servidor
            servers.push({ host, usuario, senha, os, chave });
            
            // Salva no localStorage
            localStorage.setItem('inventory_servers', JSON.stringify(servers));
            
            // Limpa o formulário
            document.getElementById('host').value = '';
            document.getElementById('usuario').value = '';
            document.getElementById('senha').value = '';
            document.getElementById('chave').value = '';
            document.getElementById('original-host').value = '';
            document.getElementById('submit-text').textContent = 'Adicionar Servidor';
            document.getElementById('form-title').textContent = 'Adicionar Novo Servidor';
            document.getElementById('cancel-btn').style.display = 'none';
            
            // Mostra feedback
            showFeedback(originalHost ? 'Servidor atualizado com sucesso' : 'Servidor adicionado com sucesso', 'success');
            
            // Recarrega a lista
            window.loadServers();
        };
    }
    
    if (!window.deleteServer) {
        window.deleteServer = function(host) {
            console.log("Função deleteServer criada manualmente");
            
            if (confirm(`Tem certeza que deseja excluir o servidor ${host}?`)) {
                // Carrega servidores existentes
                let servers = [];
                try {
                    const storedServers = localStorage.getItem('inventory_servers');
                    if (storedServers) {
                        servers = JSON.parse(storedServers);
                    }
                } catch (e) {
                    console.error("Erro ao carregar servidores", e);
                }
                
                // Remove o servidor
                servers = servers.filter(s => s.host !== host);
                
                // Salva no localStorage
                localStorage.setItem('inventory_servers', JSON.stringify(servers));
                
                // Mostra feedback
                showFeedback('Servidor excluído com sucesso', 'success');
                
                // Recarrega a lista
                window.loadServers();
            }
        };
    }
    
    if (!window.editServer) {
        window.editServer = function(host) {
            console.log("Função editServer criada manualmente");
            
            // Carrega servidores existentes
            let servers = [];
            try {
                const storedServers = localStorage.getItem('inventory_servers');
                if (storedServers) {
                    servers = JSON.parse(storedServers);
                }
            } catch (e) {
                console.error("Erro ao carregar servidores", e);
            }
            
            // Encontra o servidor
            const server = servers.find(s => s.host === host);
            if (!server) {
                showFeedback('Servidor não encontrado', 'error');
                return;
            }
            
            // Preenche o formulário
            document.getElementById('host').value = server.host;
            document.getElementById('usuario').value = server.usuario;
            document.getElementById('senha').value = server.senha || '';
            document.getElementById('os').value = server.os;
            document.getElementById('chave').value = server.chave || '';
            document.getElementById('original-host').value = server.host;
            document.getElementById('submit-text').textContent = 'Atualizar Servidor';
            document.getElementById('form-title').textContent = 'Editar Servidor';
            document.getElementById('cancel-btn').style.display = 'inline-block';
        };
    }
    
    if (!window.cancelEdit) {
        window.cancelEdit = function() {
            console.log("Função cancelEdit criada manualmente");
            
            // Limpa o formulário
            document.getElementById('host').value = '';
            document.getElementById('usuario').value = '';
            document.getElementById('senha').value = '';
            document.getElementById('chave').value = '';
            document.getElementById('original-host').value = '';
            document.getElementById('submit-text').textContent = 'Adicionar Servidor';
            document.getElementById('form-title').textContent = 'Adicionar Novo Servidor';
            document.getElementById('cancel-btn').style.display = 'none';
        };
    }
    
    if (!window.showInventory) {
        window.showInventory = function() {
            console.log("Função showInventory criada manualmente");
            
            // Carrega servidores existentes
            let servers = [];
            try {
                const storedServers = localStorage.getItem('inventory_servers');
                if (storedServers) {
                    servers = JSON.parse(storedServers);
                }
            } catch (e) {
                console.error("Erro ao carregar servidores", e);
            }
            
            // Gera o inventário
            let inventoryText = "[linux]\n";
            servers.filter(s => s.os === 'linux').forEach(server => {
                inventoryText += `${server.host} ansible_user=${server.usuario} `;
                if (server.senha) {
                    inventoryText += `ansible_password=${server.senha}`;
                } else if (server.chave) {
                    inventoryText += "ansible_ssh_private_key_file=~/keys/key.pem";
                }
                inventoryText += "\n";
            });
            
            inventoryText += "\n[windows]\n";
            servers.filter(s => s.os === 'windows').forEach(server => {
                inventoryText += `${server.host} ansible_user=${server.usuario} `;
                if (server.senha) {
                    inventoryText += `ansible_password=${server.senha}`;
                } else if (server.chave) {
                    inventoryText += "ansible_ssh_private_key_file=~/keys/key.pem";
                }
                inventoryText += " ansible_connection=winrm ansible_winrm_transport=ntlm ansible_winrm_scheme=https\n";
            });
            
            // Mostra o modal
            const modal = document.getElementById('inventory-modal');
            const inventoryContainer = document.getElementById('full-inventory');
            
            if (modal && inventoryContainer) {
                inventoryContainer.textContent = inventoryText;
                modal.style.display = 'block';
            }
        };
    }
    
    if (!window.copyToClipboard) {
        window.copyToClipboard = function(text) {
            console.log("Função copyToClipboard criada manualmente");
            
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            showFeedback('Inventário copiado para a área de transferência', 'success');
        };
    }
    
    // Função auxiliar para mostrar feedback
    function showFeedback(message, type) {
        const feedbackContainer = document.getElementById('feedback-container');
        if (feedbackContainer) {
            const feedback = document.createElement('div');
            feedback.className = `feedback ${type}`;
            feedback.textContent = message;
            
            feedbackContainer.appendChild(feedback);
            
            setTimeout(() => {
                feedback.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                feedback.classList.remove('show');
                setTimeout(() => {
                    feedbackContainer.removeChild(feedback);
                }, 300);
            }, 3000);
        }
    }
    
    // Carrega os servidores
    window.loadServers();
    
    // Configura botões
    setupInventoryButtons();
    setupTableButtons();
}

/**
 * Configura os botões da tabela de servidores
 */
function setupTableButtons() {
    // Configura botões de edição e exclusão para cada linha da tabela
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const host = row.querySelector('.host-cell').textContent;
            if (window.editServer) {
                window.editServer(host);
            }
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const host = row.querySelector('.host-cell').textContent;
            if (window.deleteServer) {
                window.deleteServer(host);
            }
        });
    });
}

/**
 * Configura os botões do inventário
 */
function setupInventoryButtons() {
    setupButtonWithClone('cancel-btn', () => {
        if (window.cancelEdit) window.cancelEdit();
    });
    
    setupButtonWithClone('show-inventory-btn', () => {
        if (window.showInventory) window.showInventory();
    });
    
    setupButtonWithClone('copy-inventory-btn', () => {
        const inventoryText = document.getElementById('full-inventory');
        if (inventoryText && window.copyToClipboard) {
            window.copyToClipboard(inventoryText.textContent);
        }
    });
    
    // Botões para fechar o modal
    document.querySelectorAll('#close-modal-btn, #close-modal-btn-alt').forEach(btn => {
        if (btn) {
            setupButtonWithClone(btn.id, () => {
                const modal = document.getElementById('inventory-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}
    /**
     * Configura event listeners para elementos do módulo de Inventário
     */
    function setupInventoryEventListeners() {
        // Configuração do formulário de servidor
        const serverForm = document.getElementById('server-form');
        if (serverForm) {
            // Remove event listeners existentes
            const newForm = serverForm.cloneNode(true);
            serverForm.parentNode.replaceChild(newForm, serverForm);
            
            // Adiciona novo event listener
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
        
        // Outros botões específicos de Inventário
        setupButtonWithClone('cancel-btn', function() {
            if (window.cancelEdit) window.cancelEdit();
        });
        
        setupButtonWithClone('show-inventory-btn', function() {
            if (window.showInventory) window.showInventory();
        });
        
        setupButtonWithClone('copy-inventory-btn', function() {
            const inventoryText = document.getElementById('full-inventory');
            if (inventoryText && window.copyToClipboard) {
                window.copyToClipboard(inventoryText.textContent);
            }
        });
        
        // Modal de inventário
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
     * Reinicializa componentes específicos do módulo Terraform
     */
    function reinitializeTerraformComponents() {
        console.log("Reinicializando componentes Terraform");
        
        // Verifica se estamos na página Terraform
        const terraformContainer = document.querySelector('.terraform-container');
        if (!terraformContainer) return;
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Carrega os módulos
            if (window.loadModules) {
                window.loadModules();
            }
            
            // Carrega os estados
            if (window.loadStates) {
                window.loadStates();
            }
            
            // Inicializa os workspaces
            if (window.initializeWorkspaces) {
                window.initializeWorkspaces();
            }
            
            console.log("Componentes Terraform reinicializados");
        }, 200);
    }
    
    /**
     * Reinicializa componentes específicos do módulo Python
     */
    function reinitializePythonComponents() {
        console.log("Reinicializando componentes Python");
        
        // Verifica se estamos na página Python
        const pythonContainer = document.querySelector('.python-container');
        if (!pythonContainer) return;
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Carrega os scripts
            if (window.loadScripts) {
                window.loadScripts();
            }
            
            // Carrega as bibliotecas
            if (window.loadLibraries) {
                window.loadLibraries();
            }
            
            // Inicializa os módulos Python
            if (window.initializePythonModules) {
                window.initializePythonModules();
            }
            
            console.log("Componentes Python reinicializados");
        }, 200);
    }
    
    /**
     * Configura animações suaves para transições de página
     */
    function setupAnimations() {
        // Adiciona estilos para transições suaves
        if (!document.getElementById('spa-animation-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'spa-animation-styles';
            styleElement.textContent = `
                .main-content {
                    transition: opacity 0.15s ease;
                }
                
                .ajax-loader {
                    transition: opacity 0.3s ease;
                }
                
                .submenu {
                    transition: max-height 0.3s ease, opacity 0.3s ease;
                    overflow: hidden;
                }
                
                .fade-in {
                    animation: fadeIn 0.3s ease forwards;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // Aplica transição inicial se necessário
        if (mainContent && !mainContent.style.transition) {
            mainContent.style.transition = 'opacity 0.15s ease';
        }
    }
    
    /**
     * Corrige problemas com CSS que pode estar faltando
     * @param {string} moduleName - Nome do módulo atual
     */
    function fixMissingStyles(moduleName) {
        // Verifica se temos a função de carregar CSS específico do módulo
        if (window.ensureModuleCssLoaded && moduleName) {
            window.ensureModuleCssLoaded(moduleName);
        } else {
            // Lista de CSS comuns que devem estar sempre presentes
            const commonCss = [
                '/static/css/sidebar/layout.css',
                '/static/css/sidebar/menu-items.css',
                '/static/css/sidebar/submenus.css',
                '/static/css/sidebar/docs-menu.css'
            ];
            
            // Garante que os CSS comuns estejam carregados
            commonCss.forEach(cssPath => {
                if (!document.querySelector(`link[href="${cssPath}"]`)) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssPath;
                    document.head.appendChild(link);
                    console.log(`CSS comum carregado: ${cssPath}`);
                }
            });
        }
    }
    
    /**
     * Corrige problemas com a sidebar após a navegação
     */
    function fixSidebarAfterNavigation() {
        // Atualiza alturas de submenus
        document.querySelectorAll('.menu-item.open > .submenu').forEach(submenu => {
            let totalHeight = 0;
            Array.from(submenu.children).forEach(child => {
                totalHeight += child.offsetHeight || 0;
            });
            
            submenu.style.maxHeight = `${totalHeight + 10}px`;
        });
        
        // Restaura estado da sidebar do localStorage
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed && sidebar) {
            sidebar.classList.add('collapsed');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle) {
                const toggleIcon = sidebarToggle.querySelector('i');
                if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
            }
            
            // Atualiza visibilidade dos elementos
            const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
            elements.forEach(el => {
                el.style.opacity = '0';
                el.style.visibility = 'hidden';
            });
        }
        
        // Reinicializa os aprimoramentos da sidebar se disponível
        if (window.SidebarManager && window.SidebarManager.reinitialize) {
            setTimeout(() => window.SidebarManager.reinitialize(), 100);
        }
        
        // Reconfigura manipuladores de submenu
        setupSubmenuHandlers();
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
        }
    }
    
    /**
     * Restaura seleção do menu com base no localStorage
     */
    function restoreMenuSelection() {
        const selectedMenuItem = localStorage.getItem('selectedMenuItem');
        
        if (selectedMenuItem) {
            document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
                if (link.textContent.trim() === selectedMenuItem) {
                    const menuItem = link.parentElement;
                    menuItem.classList.add('selected');
                    
                    // Abre menus pai
                    let parent = menuItem.parentElement;
                    while (parent) {
                        if (parent.classList.contains('submenu')) {
                            const parentMenuItem = parent.parentElement;
                            if (parentMenuItem.classList.contains('menu-item')) {
                                parentMenuItem.classList.add('open');
                                
                                const parentLink = parentMenuItem.querySelector('a.has-submenu');
                                if (parentLink) {
                                    parentLink.classList.add('selected');
                                }
                                
                                // Atualiza altura do submenu
                                setTimeout(() => {
                                    parent.style.maxHeight = `${parent.scrollHeight}px`;
                                    updateParentSubmenusHeight(parent);
                                }, 100);
                            }
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Garante que o item está visível
                    const menu = document.querySelector('.menu');
                    if (menu) {
                        setTimeout(() => {
                            const elementRect = menuItem.getBoundingClientRect();
                            const menuRect = menu.getBoundingClientRect();
                            
                            if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
                                menu.scrollTo({
                                    top: menuItem.offsetTop - 100,
                                    behavior: 'smooth'
                                });
                            }
                        }, 200);
                    }
                }
            });
        }
    }
    
    /**
     * Corrige elementos duplicados no DOM
     */
    function fixDuplicateElements() {
        // Lista de seletores para elementos que não devem ter duplicatas
        const uniqueSelectors = [
            '.sidebar',
            '#loader',
            '.main-content',
            '.content-header',
            '.footer'
        ];
        
        uniqueSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 1) {
                console.warn(`Elementos duplicados encontrados: ${selector}`);
                
                // Mantém apenas o primeiro elemento
                for (let i = 1; i < elements.length; i++) {
                    elements[i].remove();
                }
            }
        });
    }
    
    // Inicializa o sistema
    function initialize() {
        // Corrige elementos duplicados
        fixDuplicateElements();
        
        // Configura animações para transições suaves
        setupAnimations();
        
        // Configura handlers para submenus
        setupSubmenuHandlers();
        
        // Verifica e corrige CSS faltante
        fixMissingStyles(getCurrentModule());
        
        // Configura navegação SPA
        setupSpaNavigation();
        
        // Restaura seleção do menu
        restoreMenuSelection();
        
        // Adiciona evento para reinicializar componentes quando o conteúdo for carregado
        document.addEventListener('content-loaded', function(e) {
            console.log("Evento content-loaded recebido");
            const moduleInfo = e.detail || {};
            reinitializeComponents(moduleInfo.module || getCurrentModule());
        });
        
        // Inicializa componentes do módulo atual durante o carregamento inicial
        const currentModule = getCurrentModule();
        if (currentModule) {
            console.log(`Módulo atual detectado: ${currentModule}`);
            reinitializeComponents(currentModule);
        }
        
        console.log("Sistema SPA inicializado");
    }
    
    // Inicializa tudo
    initialize();
    
    // Expõe API pública
    window.MainApp = {
        loadContent,
        reinitializeComponents,
        manageLoader,
        getCurrentModule,
        setupSubmenuHandlers
    };
});