/**
 * main.js - Script principal para integração com solução SPA da Automato Platform
 * Versão otimizada para resolver problemas de navegação, sidebar e submenu
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cache para elementos DOM frequentemente acessados
    let mainContent = document.querySelector('.main-content');
    let sidebar = document.querySelector('.sidebar');
    let loader = document.getElementById('loader') || createLoader();
    
    // Constantes para melhorar a manutenção
    const ANIMATION_DURATION = 300;
    const TRANSITION_SHORT = 150;
    const DOM_READY_DELAY = 200;
    
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
            }, ANIMATION_DURATION);
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
        if (path.includes('/docs')) return 'documentation'; // Adicionado suporte explícito para documentação
        
        return null;
    }
    
    /**
     * Configura manipuladores especiais para os links de submenu
     * Corrigido para evitar tremulação (jitter) dos submenus
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
                
                // Reflete estado da sidebar - corrigido para verificar estado real
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    // Se sidebar estiver colapsada, expande primeiro
                    toggleSidebar(false);
                    
                    // Aguarda um pouco para então abrir o submenu
                    setTimeout(() => {
                        toggleSubmenu(this);
                    }, TRANSITION_SHORT);
                    return;
                }
                
                toggleSubmenu(this);
            });
        });
        
        // Configura todos os links finais (sem submenu) incluindo o link de documentação
        document.querySelectorAll('.sidebar .menu-item > a:not(.has-submenu)').forEach(link => {
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
                
                // Evita um clique duplo durante a transição
                if (loader && loader.style.opacity === '1') {
                    return;
                }
                
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
     * Alterna o estado de um submenu com animação suave
     * @param {HTMLElement} link - Link do submenu
     */
    function toggleSubmenu(link) {
        const menuItem = link.parentElement;
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
                    // Colocamos a altura explicitamente para evitar tremulação
                    siblingSubmenu.style.maxHeight = `${siblingSubmenu.scrollHeight}px`;
                    
                    // Forçamos um reflow para garantir uma transição suave
                    siblingSubmenu.offsetHeight;
                    
                    // Agora configuramos para zero
                    siblingSubmenu.style.maxHeight = '0';
                }
            }
        });
        
        // Alterna o estado do menu atual
        if (wasOpen) {
            menuItem.classList.remove('open');
            link.classList.remove('selected');
            
            if (submenu) {
                // Configuramos a altura real antes de animar para zero
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                submenu.offsetHeight; // Força reflow
                submenu.style.maxHeight = '0';
            }
        } else {
            menuItem.classList.add('open');
            link.classList.add('selected');
            
            if (submenu) {
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                
                // Atualiza as alturas dos menus pais
                updateParentSubmenusHeight(submenu);
                
                // Garante que o submenu seja visível
                setTimeout(() => {
                    adjustScrollForSubmenu(submenu);
                }, 100);
            }
        }
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
                    totalHeight += child.scrollHeight || 0;
                });
                
                // Adiciona um pouco de margem para segurança
                parentSubmenu.style.maxHeight = `${totalHeight + 20}px`;
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
            
            // Evita ações durante o carregamento
            if (loader && loader.style.opacity === '1') {
                return;
            }
            
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
        
        // Configura o botão de toggle da sidebar
        setupSidebarToggle();
    }
    
    /**
     * Configura o botão de toggle da sidebar
     */
    function setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            // Remove listeners existentes
            const newToggle = sidebarToggle.cloneNode(true);
            sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);
            
            // Adiciona um novo listener
            newToggle.addEventListener('click', function() {
                toggleSidebar();
            });
            
            // Configura o estado inicial da sidebar
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed && sidebar) {
                toggleSidebar(true, false); // Não animar na inicialização
            }
        }
    }
    
    /**
     * Alterna o estado da sidebar
     * @param {boolean|undefined} forceState - Se definido, força o estado (true = colapsado)
     * @param {boolean} animate - Se verdadeiro, aplica animação
     */
    function toggleSidebar(forceState, animate = true) {
        if (!sidebar) return;
        
        const isCollapsed = typeof forceState !== 'undefined' ? 
            forceState : !sidebar.classList.contains('collapsed');
        
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const toggleIcon = sidebarToggle ? sidebarToggle.querySelector('i') : null;
        
        // Elementos para animar
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        
        if (isCollapsed) {
            // Colapsar sidebar
            if (animate) {
                // Primeiro anima o conteúdo para fora
                elements.forEach(el => {
                    el.style.transition = 'opacity 0.2s ease, visibility 0.2s ease';
                    el.style.opacity = '0';
                });
                
                // Depois de um breve atraso, colapsa a sidebar
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    elements.forEach(el => {
                        el.style.visibility = 'hidden';
                    });
                    
                    if (toggleIcon) {
                        toggleIcon.style.transition = 'transform 0.3s ease';
                        toggleIcon.style.transform = 'rotate(180deg)';
                    }
                }, 150);
            } else {
                // Sem animação
                sidebar.classList.add('collapsed');
                elements.forEach(el => {
                    el.style.opacity = '0';
                    el.style.visibility = 'hidden';
                });
                
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(180deg)';
                }
            }
        } else {
            // Expandir sidebar
            sidebar.classList.remove('collapsed');
            
            if (animate) {
                // Primeiro expande a sidebar
                setTimeout(() => {
                    // Depois anima o conteúdo para dentro
                    elements.forEach(el => {
                        el.style.visibility = 'visible';
                        el.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
                        
                        // Força reflow
                        el.offsetHeight;
                        
                        el.style.opacity = '1';
                    });
                    
                    if (toggleIcon) {
                        toggleIcon.style.transition = 'transform 0.3s ease';
                        toggleIcon.style.transform = 'rotate(0deg)';
                    }
                }, 50);
            } else {
                // Sem animação
                elements.forEach(el => {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                });
                
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(0deg)';
                }
            }
        }
        
        // Salva o estado no localStorage
        localStorage.setItem('sidebarCollapsed', isCollapsed);
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
            }).catch((error) => {
                console.error('Erro ao carregar conteúdo:', error);
                manageLoader(false);
            });
            return;
        }
        
        // Implementação própria caso não exista AjaxLoader
        fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
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
                    }, TRANSITION_SHORT);
                } else {
                    console.error('Elemento .main-content não encontrado na página atual');
                    manageLoader(false);
                }
            }, ANIMATION_DURATION); // Aguarda para exibir o loader
        })
        .catch(error => {
            console.error('Erro ao carregar conteúdo:', error);
            manageLoader(false);
            
            // Exibe mensagem de erro amigável
            showErrorMessage('Não foi possível carregar o conteúdo solicitado. Por favor, tente novamente.');
        });
    }
    
    /**
     * Exibe mensagem de erro para o usuário
     * @param {string} message - Mensagem de erro
     */
    function showErrorMessage(message) {
        // Verifica se temos um elemento para exibir erros
        let errorContainer = document.getElementById('error-message');
        
        if (!errorContainer) {
            // Cria um container para exibir erros
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-message';
            errorContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background-color: #f44336;
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                max-width: 80%;
            `;
            
            // Adiciona botão de fechar
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                margin-left: 15px;
                color: white;
                font-weight: bold;
                float: right;
                font-size: 22px;
                line-height: 20px;
                cursor: pointer;
            `;
            
            closeBtn.addEventListener('click', function() {
                errorContainer.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (errorContainer.parentNode) {
                        errorContainer.parentNode.removeChild(errorContainer);
                    }
                }, ANIMATION_DURATION);
            });
            
            errorContainer.appendChild(closeBtn);
            
            const messageElement = document.createElement('div');
            errorContainer.appendChild(messageElement);
            
            document.body.appendChild(errorContainer);
        }
        
        // Atualiza a mensagem
        const messageElement = errorContainer.querySelector('div');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        // Exibe o elemento de erro
        setTimeout(() => {
            errorContainer.style.transform = 'translateX(0)';
            
            // Auto-fecha após 5 segundos
            setTimeout(() => {
                errorContainer.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (errorContainer.parentNode) {
                        errorContainer.parentNode.removeChild(errorContainer);
                    }
                }, ANIMATION_DURATION);
            }, 5000);
        }, 100);
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
        if (moduleInfo.module && mainContent) {
            const savedScrollPos = localStorage.getItem(`${moduleInfo.module}_scrollPos`);
            if (savedScrollPos) {
                setTimeout(() => {
                    if (mainContent) {
                        mainContent.scrollTop = parseInt(savedScrollPos, 10);
                    }
                }, 50);
            }
        }
        
        // Reinicializa componentes específicos do módulo
        reinitializeComponents(moduleInfo.module);
        
        // Reconfigurar handlers de submenu após a navegação
        setTimeout(() => {
            setupSubmenuHandlers();
        }, ANIMATION_DURATION);
        
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
            
            // Abre menus pai sem animação para evitar tremulação
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
                        
                        // Define altura diretamente para evitar animação
                        parent.style.maxHeight = `${parent.scrollHeight + 20}px`;
                    }
                }
                parent = parent.parentElement;
            }
            
            // Garante que o item selecionado seja visível
            setTimeout(() => {
                const menu = document.querySelector('.menu');
                if (menu && menuItem) {
                    const menuItemRect = menuItem.getBoundingClientRect();
                    const menuRect = menu.getBoundingClientRect();
                    
                    if (menuItemRect.bottom > menuRect.bottom || menuItemRect.top < menuRect.top) {
                        menu.scrollTo({
                            top: menuItem.offsetTop - 100,
                            behavior: 'smooth'
                        });
                    }
                }
            }, 200);
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
                
            case 'documentation':
                reinitializeDocumentationComponents();
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
        }, DOM_READY_DELAY);
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
    function reinitializeInventoryComponents() {
        console.log("Reinicializando componentes de Inventário");
        
        // Verifica se estamos na página de Inventário
        const inventoryContainer = document.querySelector('.inventory-container');
        if (!inventoryContainer) return;
        
        // Verifica se o InventoryManager está disponível
        if (window.InventoryManager) {
            // Usa a API pública do módulo de inventário
            window.InventoryManager.reinitialize();
            console.log("Componentes de Inventário reinicializados via InventoryManager");
        } else {
            console.warn("Módulo InventoryManager não encontrado! Usando métodos legados...");
            
            // Fallback para métodos legados como backup
            setTimeout(() => {
                if (window.loadServers) {
                    window.loadServers();
                }
                
                if (window.initializeForm) {
                    window.initializeForm();
                }
                
                setupInventoryEventListeners();
                
                console.log("Componentes de Inventário reinicializados via método fallback");
            }, DOM_READY_DELAY);
        }
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
                
                // Feedback visual
                this.classList.add('copied');
                this.innerText = 'Copiado!';
                
                setTimeout(() => {
                    this.classList.remove('copied');
                    this.innerText = 'Copiar Inventário';
                }, 2000);
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
        }, DOM_READY_DELAY);
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
        }, DOM_READY_DELAY);
    }
    
    /**
     * Reinicializa componentes específicos do módulo de Documentação
     */
    function reinitializeDocumentationComponents() {
        console.log("Reinicializando componentes de Documentação");
        
        // Verifica se estamos na página de Documentação
        const docsContainer = document.querySelector('.docs-container, .documentation-container');
        if (!docsContainer) return;
        
        // Aguarda um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Configura a navegação da documentação
            setupDocumentationNavigation();
            
            // Aplica syntax highlighting se necessário
            if (window.applyCodeHighlighting) {
                window.applyCodeHighlighting();
            } else if (window.Prism) {
                window.Prism.highlightAll();
            } else if (window.hljs) {
                window.hljs.highlightAll();
            }
            
            // Configura a busca na documentação
            const searchInput = document.getElementById('docs-search');
            if (searchInput) {
                setupButtonWithClone(searchInput, function() {
                    const term = this.value.toLowerCase();
                    const sections = document.querySelectorAll('.doc-section');
                    
                    sections.forEach(section => {
                        const content = section.textContent.toLowerCase();
                        section.style.display = content.includes(term) ? 'block' : 'none';
                    });
                });
            }
            
            console.log("Componentes de Documentação reinicializados");
        }, DOM_READY_DELAY);
    }
    
    /**
     * Configura navegação específica da documentação
     */
    function setupDocumentationNavigation() {
        // Configura links para funcionar com SPA
        document.querySelectorAll('.docs-navigation a, .docs-menu a').forEach(link => {
            // Remove event listeners existentes
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Adiciona novo event listener
            newLink.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Se for link interno ou âncora, deixa o comportamento padrão
                if (!href || href.startsWith('#')) {
                    return;
                }
                
                // Se for link para documentação, usa SPA
                if (href.includes('/docs/')) {
                    e.preventDefault();
                    
                    // Evita ações durante carregamento
                    if (loader && loader.style.opacity === '1') {
                        return;
                    }
                    
                    // Mostra loader
                    manageLoader(true);
                    
                    // Atualiza URL e carrega conteúdo
                    history.pushState({}, '', href);
                    loadContent(href);
                }
            });
        });
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
                
                /* Corrige problemas de tremulação nos submenus */
                .menu-item {
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }
                
                /* Assegura que a documentação seja facilmente visível */
                .docs-container h1, .docs-container h2, .docs-container h3 {
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                
                .docs-container pre {
                    margin: 1em 0;
                    padding: 1em;
                    background-color: #f5f5f5;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                
                /* Estilo para o botão de toggle da sidebar */
                #sidebar-toggle {
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                #sidebar-toggle:hover {
                    color: var(--accent-color, #4285f4);
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
               // '/static/css/sidebar/layout.css',
               // '/static/css/sidebar/menu-items.css',
              //  '/static/css/sidebar/submenus.css',
               // '/static/css/sidebar/docs-menu.css',
               // '/static/css/sidebar/sidebar.css',

               // '/static/css/ansible/variables.css',
               // '/static/css/ansible/ansible.css',
               // '/static/css/ansible/header.css',
               // '/static/css/ansible/hosts.css',
               // '/static/css/ansible/playbooks.css',
               // '/static/css/ansible/execution.css',
               // '/static/css/ansible/output.css',
               // '/static/css/ansible/debug.css',
               // '/static/css/ansible/animations.css',
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
     * Configuração específica para o botão de toggle da sidebar
     */
    function setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (!sidebarToggle) return;
        
        // Remove event listeners existentes
        const newToggle = sidebarToggle.cloneNode(true);
        sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);
        
        // Adiciona novo event listener
        newToggle.addEventListener('click', function() {
            if (!sidebar) return;
            
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expandir
                sidebar.classList.remove('collapsed');
                
                const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
                elements.forEach(el => {
                    el.style.visibility = 'visible';
                    // Forçar reflow para garantir transição suave
                    el.offsetHeight;
                    el.style.opacity = '1';
                });
                
                const toggleIcon = this.querySelector('i');
                if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
            } else {
                // Colapsar
                const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
                elements.forEach(el => {
                    el.style.opacity = '0';
                });
                
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    elements.forEach(el => {
                        el.style.visibility = 'hidden';
                    });
                    
                    const toggleIcon = this.querySelector('i');
                    if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
                }, 300);
            }
            
            localStorage.setItem('sidebarCollapsed', !isCollapsed);
        });
    }
    
    /**
     * Função auxiliar para configurar botão com clonagem (remove listeners antigos)
     * @param {string|HTMLElement} idOrElement - ID do botão ou elemento
     * @param {Function} callback - Função de callback para o evento de clique
     */
    function setupButtonWithClone(idOrElement, callback) {
        let button = null;
        
        if (typeof idOrElement === 'string') {
            button = document.getElementById(idOrElement);
        } else if (idOrElement instanceof HTMLElement) {
            button = idOrElement;
        }
        
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
        
        // Configura o botão de toggle da sidebar
        setupSidebarToggle();
        
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
/**
 * Script para corrigir problemas com o footer e melhorar o carregamento da SPA
 * Adicione este script após o main.js original
 */
document.addEventListener('DOMContentLoaded', function() {
    // Referências para elementos importantes
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const contentArea = document.querySelector('.content-area');
    
    /**
     * 1. Correção para evitar duplicação de footers
     */
    function fixDuplicateFooters() {
        const footers = document.querySelectorAll('.footer');
        
        // Se houver mais de um footer, mantém apenas o primeiro
        if (footers.length > 1) {
            console.log('Detectados footers duplicados, corrigindo...');
            
            // Manter apenas o primeiro footer
            for (let i = 1; i < footers.length; i++) {
                if (footers[i].parentNode) {
                    footers[i].parentNode.removeChild(footers[i]);
                }
            }
        }
        
        // Verificar onde o footer está posicionado e reposicioná-lo se necessário
        const footer = document.querySelector('.footer');
        if (footer) {
            // Se o footer não for filho direto do content-area, movê-lo para lá
            if (footer.parentNode !== contentArea) {
                console.log('Reposicionando footer para o local correto');
                
                // Guardar uma referência para possibilitar a remoção
                const oldParent = footer.parentNode;
                
                // Mover para o final do content-area
                contentArea.appendChild(footer);
                
                // Se o footer anterior estava dentro do main-content, remover o vazio
                if (oldParent && oldParent.classList.contains('main-content') && 
                    oldParent.childNodes.length === 0) {
                    oldParent.remove();
                }
            }
        }
    }
    
    /**
     * 2. Verificar carregamento da página e garantir que o conteúdo seja exibido
     */
    function ensureVisibleContent() {
        // Se o mainContent ficar preto/invisível, forçar sua exibição
        if (mainContent) {
            // Garante que o conteúdo seja visível
            mainContent.style.display = 'flex';
            mainContent.style.opacity = '1';
            mainContent.style.visibility = 'visible';
            
            // Verifica se o conteúdo está com altura mínima adequada
            if (mainContent.offsetHeight < 100) {
                mainContent.style.minHeight = 'calc(100vh - 106px)';
            }
        }
        
        // Garantir que a área de conteúdo esteja exibindo corretamente
        if (contentArea) {
            contentArea.style.display = 'flex';
            contentArea.style.opacity = '1';
            contentArea.style.visibility = 'visible';
        }
    }
    
    /**
     * 3. Função para corrigir a hierarquia DOM após carregamento AJAX
     */
    function fixDOMHierarchy() {
        // Verificar se há divs soltas que deveriam estar na hierarquia correta
        const orphanContainers = Array.from(document.querySelectorAll('body > .inventory-container'));
        
        orphanContainers.forEach(container => {
            // Se a div estiver fora da hierarquia correta, movê-la
            if (container.parentNode === document.body && mainContent) {
                console.log('Movendo container órfão para dentro do main-content');
                
                // Limpar mainContent antes de adicionar
                mainContent.innerHTML = '';
                
                // Mover para dentro do main-content
                mainContent.appendChild(container);
            }
        });
    }
    
    /**
     * 4. Observador de mutações para detectar alterações no DOM
     */
    function setupMutationObserver() {
        // Configurar um observador para detectar alterações no DOM
        const observer = new MutationObserver((mutations) => {
            // Verificar se alguma mutação adicionou um novo footer ou alterou a estrutura
            let needsFixing = mutations.some(mutation => 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && 
                    (node.classList && node.classList.contains('footer') || 
                     node.querySelector && node.querySelector('.footer'))));
            
            if (needsFixing) {
                // Dar tempo para o DOM se atualizar completamente
                setTimeout(() => {
                    fixDuplicateFooters();
                    fixDOMHierarchy();
                    ensureVisibleContent();
                }, 100);
            }
        });
        
        // Observar o body para quaisquer alterações
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }
    
    /**
     * 5. Melhorar a experiência durante carregamento
     */
    function enhanceLoadingExperience() {
        // Adicionar classe loading durante carregamentos AJAX
        if (window.MainApp && window.MainApp.manageLoader) {
            const originalManageLoader = window.MainApp.manageLoader;
            
            // Sobrescrever a função original para adicionar classe loading
            window.MainApp.manageLoader = function(show) {
                // Chamar a função original
                originalManageLoader(show);
                
                // Adicionar ou remover classe loading no body
                if (show) {
                    document.body.classList.add('loading');
                } else {
                    document.body.classList.remove('loading');
                    
                    // Verificar e corrigir problemas após carregamento
                    setTimeout(() => {
                        fixDuplicateFooters();
                        fixDOMHierarchy();
                        ensureVisibleContent();
                    }, 300);
                }
            };
        }
        
        // Monitorar o evento content-loaded para corrigir problemas
        document.addEventListener('content-loaded', function() {
            setTimeout(() => {
                fixDuplicateFooters();
                fixDOMHierarchy();
                ensureVisibleContent();
            }, 300);
        });
    }
    
    // Executar todas as correções
    fixDuplicateFooters();
    ensureVisibleContent();
    fixDOMHierarchy();
    setupMutationObserver();
    enhanceLoadingExperience();
    
    // Verificar periodicamente para garantir a estrutura correta
    setInterval(() => {
        fixDuplicateFooters();
        ensureVisibleContent();
    }, 2000);
    
    // Verificar e corrigir após carregamento completo da página
    window.addEventListener('load', function() {
        setTimeout(() => {
            fixDuplicateFooters();
            ensureVisibleContent();
        }, 500);
    });
});
/**
 * Script para corrigir problemas com rolagem da página
 * Adicione após os outros scripts
 */
document.addEventListener('DOMContentLoaded', function() {
    // Referências para elementos importantes
    const contentArea = document.querySelector('.content-area');
    const mainContent = document.querySelector('.main-content');
    
    /**
     * 1. Função para corrigir o comportamento de overflow da página
     */
    function fixScrollBehavior() {
        // Verifica se os elementos existem
        if (!contentArea || !mainContent) return;
        
        // Verifica se a área de conteúdo tem overflow definido corretamente
        const contentAreaStyle = window.getComputedStyle(contentArea);
        if (contentAreaStyle.overflowY !== 'auto' && contentAreaStyle.overflowY !== 'scroll') {
            contentArea.style.overflowY = 'auto';
        }
        
        // Verifica se o conteúdo principal tem overflow definido corretamente
        const mainContentStyle = window.getComputedStyle(mainContent);
        if (mainContentStyle.overflowY !== 'auto' && mainContentStyle.overflowY !== 'scroll') {
            mainContent.style.overflowY = 'auto';
        }
    }
    
    /**
     * 2. Função para restaurar comportamento de rolagem após navegação SPA
     */
    function restoreScrollAfterNavigation() {
        // Observar mudanças no DOM para detectar quando o conteúdo é carregado
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verifica se foram adicionados elementos significativos
                    let needsFix = Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === 1 && 
                        (node.classList && 
                         (node.classList.contains('main-content') || 
                          node.classList.contains('inventory-container')))
                    );
                    
                    if (needsFix) {
                        // Corrige overflow após breve delay para garantir que o DOM está atualizado
                        setTimeout(fixScrollBehavior, 100);
                    }
                }
            });
        });
        
        // Observa o contentArea para detectar mudanças
        if (contentArea) {
            observer.observe(contentArea, { 
                childList: true, 
                subtree: true 
            });
        }
        
        // Observa também o evento content-loaded
        document.addEventListener('content-loaded', function() {
            setTimeout(fixScrollBehavior, 200);
        });
    }
    
    /**
     * 3. Função para corrigir problemas com a altura do conteúdo
     */
    function fixContentHeight() {
        if (!mainContent) return;
        
        // Verificar e corrigir altura do conteúdo principal
        function checkAndFixHeight() {
            // Obter altura da janela e do header
            const windowHeight = window.innerHeight;
            const headerHeight = document.querySelector('.content-header')?.offsetHeight || 56;
            const footerHeight = document.querySelector('.footer')?.offsetHeight || 50;
            
            // Calcular a altura disponível
            const availableHeight = windowHeight - headerHeight - footerHeight;
            
            // Definir altura mínima para o conteúdo
            mainContent.style.minHeight = `${availableHeight}px`;
            
            // Garantir que a área de conteúdo tenha pelo menos a altura da viewport
            if (contentArea) {
                contentArea.style.minHeight = `${windowHeight}px`;
            }
        }
        
        // Verificar quando a janela é redimensionada
        window.addEventListener('resize', checkAndFixHeight);
        
        // Verificar após carregamento da página
        checkAndFixHeight();
        
        // Verificar após navegação SPA
        document.addEventListener('content-loaded', function() {
            setTimeout(checkAndFixHeight, 200);
        });
    }
    
    /**
     * 4. Função para corrigir problemas de rolagem em dispositivos móveis
     */
    function fixMobileScroll() {
        // Prevenir comportamento de rolagem travada em dispositivos touch
        document.addEventListener('touchmove', function(e) {
            // Permitir rolagem em elementos com overflow
            const target = e.target;
            const scrollableParent = findScrollableParent(target);
            
            if (!scrollableParent || 
                (scrollableParent.scrollHeight <= scrollableParent.clientHeight &&
                 scrollableParent.scrollWidth <= scrollableParent.clientWidth)) {
                // Se não houver elemento rolável, previne o comportamento padrão
                e.preventDefault();
            }
        }, { passive: false });
        
        // Função auxiliar para encontrar o primeiro elemento pai com rolagem
        function findScrollableParent(element) {
            if (!element) return null;
            
            // Verifica se o elemento tem overflow
            const style = window.getComputedStyle(element);
            const hasOverflow = style.overflow === 'auto' || 
                               style.overflow === 'scroll' ||
                               style.overflowY === 'auto' || 
                               style.overflowY === 'scroll';
            
            if (hasOverflow) {
                return element;
            }
            
            // Recursivamente verifica o elemento pai
            return findScrollableParent(element.parentElement);
        }
    }
    
    /**
     * 5. Função para garantir que formulários grandes tenham rolagem adequada
     */
    function fixFormScroll() {
        // Procura por formulários grandes que possam precisar de rolagem
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Verifica se o formulário é maior que a área visível
            if (form.offsetHeight > window.innerHeight * 0.7) {
                // Garante que o container pai tenha overflow adequado
                const formParent = form.parentElement;
                if (formParent) {
                    formParent.style.maxHeight = '70vh';
                    formParent.style.overflowY = 'auto';
                }
            }
        });
    }
    
    // Executar todas as correções
    fixScrollBehavior();
    restoreScrollAfterNavigation();
    fixContentHeight();
    fixMobileScroll();
    fixFormScroll();
    
    // Correr novamente após o carregamento completo da página
    window.addEventListener('load', function() {
        fixScrollBehavior();
        fixContentHeight();
        fixFormScroll();
    });
    
    // Verificar periodicamente para garantir que a rolagem funcione
    setInterval(fixScrollBehavior, 5000);
});