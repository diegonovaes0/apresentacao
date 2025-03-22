/**
 * main.js - Script principal otimizado para integração SPA na Automato Platform
 * Corrige problemas de carregamento de JS/CSS e interações da sidebar
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cache para elementos DOM frequentemente acessados
    let mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const loader = document.getElementById('loader') || createLoader();
    const footer = document.querySelector('.footer');
    const contentHeader = document.querySelector('.content-header');
    const menu = document.querySelector('.menu');
    
    // Registro de módulos e suas dependências
    const moduleConfig = {
        ansible: {
            scripts: ['/static/js/core_ansible/main.js'],
            styles: ['/static/css/core_ansible/style.css'],
            initFunction: reinitializeAnsibleComponents
        },
        inventory: {
            scripts: ['/static/js/core_inventory/main.js'],
            styles: ['/static/css/core_inventory/style.css'],
            initFunction: reinitializeInventoryComponents
        },
        terraform: {
            scripts: ['/static/js/core_terraform/main.js'],
            styles: ['/static/css/core_terraform/style.css'],
            initFunction: reinitializeTerraformComponents
        },
        python: {
            scripts: ['/static/js/core_python/main.js'],
            styles: ['/static/css/core_python/style.css'],
            initFunction: reinitializePythonComponents
        }
    };
    
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
     * Carrega script dinamicamente com suporte a verificação de load e timeout
     * @param {string} src - URL do script
     * @param {Function} successCallback - Função de callback para sucesso
     * @param {Function} errorCallback - Função de callback para erro
     */
    function loadScriptWithRetry(src, successCallback, errorCallback) {
        console.log(`Carregando script: ${src}`);
        
        // Adiciona um parâmetro para evitar cache
        const cacheBuster = `?_v=${new Date().getTime()}`;
        const scriptSrc = src + cacheBuster;
        
        // Remove script anterior se existir
        const existingScript = document.querySelector(`script[src^="${src}"]`);
        if (existingScript) {
            existingScript.remove();
        }
        
        // Cria o novo script
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = false;
        
        // Define timeout para carregamento
        let timeoutId = setTimeout(() => {
            console.warn(`Timeout ao carregar ${src}, tentando novamente...`);
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            // Tenta carregar novamente com outro método
            const scriptRetry = document.createElement('script');
            scriptRetry.src = src + `?_retry=${new Date().getTime()}`;
            scriptRetry.async = false;
            
            scriptRetry.onload = () => {
                console.log(`Script carregado com sucesso (retry): ${src}`);
                if (successCallback) successCallback();
            };
            
            scriptRetry.onerror = () => {
                console.error(`Erro ao carregar script (retry): ${src}`);
                if (errorCallback) errorCallback();
            };
            
            document.head.appendChild(scriptRetry);
        }, 5000);
        
        script.onload = () => {
            clearTimeout(timeoutId);
            console.log(`Script carregado com sucesso: ${src}`);
            if (successCallback) successCallback();
        };
        
        script.onerror = () => {
            clearTimeout(timeoutId);
            console.error(`Erro ao carregar script: ${src}`);
            if (errorCallback) errorCallback();
        };
        
        document.head.appendChild(script);
    }
    
    /**
     * Carrega CSS dinamicamente
     * @param {string} href - URL do arquivo CSS
     */
    function loadCSS(href) {
        if (!document.querySelector(`link[href^="${href}"]`)) {
            console.log(`Carregando CSS: ${href}`);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href + `?_v=${new Date().getTime()}`;
            document.head.appendChild(link);
        }
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
                
                manageLoader(true);
                
                const menuItem = this.parentElement;
                const wasOpen = menuItem.classList.contains('open');
                const submenu = menuItem.querySelector('.submenu');
                
                if (wasOpen) {
                    closeAllMenus();
                } else {
                    closeAllMenus();
                    menuItem.classList.add('open');
                    this.classList.add('selected');
                    
                    if (submenu) {
                        submenu.classList.add('expanded');
                        submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                        openParentMenus(menuItem);
                        adjustScrollForSubmenu(submenu);
                    }
                }
                
                setTimeout(() => {
                    manageLoader(false);
                }, 300);
            });
        });
        
        // Configura os links finais (sem submenu)
        document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                const docsToggle = document.querySelector('.docs-toggle');
                const docsWrapper = document.querySelector('.docs-wrapper');
                
                if (docsToggle && docsWrapper) {
                    docsToggle.classList.remove('open', 'selected');
                    docsWrapper.classList.remove('expanded');
                    docsWrapper.style.maxHeight = '0px';
                }
                
                // Se for um link real para outra página
                if (href && href !== '#' && !href.startsWith('javascript:')) {
                    e.preventDefault();
                    
                    manageLoader(true);
                    
                    // Salva o item atual para manter selecionado
                    const menuItem = this.parentElement;
                    if (menuItem) {
                        localStorage.setItem('selectedMenuItem', menuItem.querySelector('a').textContent.trim());
                    }
                    
                    // Atualiza URL no histórico sem recarregar a página
                    history.pushState({}, '', href);
                    
                    // Carrega o conteúdo via AJAX
                    loadContent(href);
                    
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                if (sidebar && sidebar.classList.contains('collapsed')) return;
                
                manageLoader(true);
                
                // Fecha todos e seleciona apenas este
                closeAllMenus();
                const menuItem = this.parentElement;
                menuItem.classList.add('selected');
                openParentMenus(menuItem);
                
                const mainMenuItem = menuItem.closest('.menu > .menu-item');
                if (mainMenuItem) {
                    mainMenuItem.classList.add('open');
                    const mainMenuLink = mainMenuItem.querySelector('a.has-submenu');
                    if (mainMenuLink) mainMenuLink.classList.add('icon-only');
                }
                
                // Garantir que o item esteja visível
                if (menu) {
                    const elementRect = menuItem.getBoundingClientRect();
                    const menuRect = menu.getBoundingClientRect();
                    
                    if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
                        menu.scrollTo({
                            top: menuItem.offsetTop - menuRect.height / 3,
                            behavior: 'smooth'
                        });
                    }
                }
                
                setTimeout(() => {
                    manageLoader(false);
                }, 300);
            });
        });
    }
    
    /**
     * Fecha todos os menus e remove seleções
     */
    function closeAllMenus() {
        document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
            item.classList.remove('open', 'selected');
            const submenu = item.querySelector('.submenu');
            if (submenu) {
                submenu.classList.remove('expanded');
                submenu.style.maxHeight = '0px';
            }
            const link = item.querySelector('a.has-submenu');
            if (link) link.classList.remove('selected', 'icon-only');
        });
        
        closeAllDocs();
    }
    
    /**
     * Fecha toda a documentação
     */
    function closeAllDocs() {
        const docsToggle = document.querySelector('.docs-toggle');
        const docsWrapper = document.querySelector('.docs-wrapper');
        
        if (docsToggle && docsWrapper) {
            docsToggle.classList.remove('open', 'selected', 'icon-only');
            docsWrapper.classList.remove('expanded');
            docsWrapper.style.maxHeight = '0px';
        }
        
        document.querySelectorAll('.docs-button').forEach(btn => {
            btn.classList.remove('open', 'selected');
            const content = btn.nextElementSibling;
            if (content) {
                content.classList.remove('expanded');
                content.style.maxHeight = '0px';
            }
        });
    }
    
    /**
     * Abre todos os menus pais
     * @param {HTMLElement} element - Elemento do menu
     */
    function openParentMenus(element) {
        let current = element;
        while (current && current.classList.contains('menu-item')) {
            current.classList.add('open');
            const submenu = current.querySelector('.submenu');
            if (submenu) {
                submenu.classList.add('expanded');
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                updateParentSubmenusHeight(submenu);
            }
            current = current.parentElement ? current.parentElement.closest('.menu-item') : null;
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
                let totalHeight = 0;
                Array.from(parentSubmenu.children).forEach(child => {
                    totalHeight += child.offsetHeight || 0;
                });
                
                parentSubmenu.style.maxHeight = `${totalHeight + 10}px`;
                parentSubmenu.classList.add('expanded');
            }
            parent = parent.parentElement ? parent.parentElement.closest('.menu-item') : null;
        }
    }
    
    /**
     * Ajusta o scroll para mostrar o submenu expandido
     * @param {HTMLElement} submenu - Elemento submenu
     */
    function adjustScrollForSubmenu(submenu) {
        if (!submenu || !menu) return;
        
        setTimeout(() => {
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
        }, 100);
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
            window.AjaxLoader.loadContent(url)
                .then(() => {
                    // Atualiza referência ao mainContent
                    mainContent = document.querySelector('.main-content');
                    finalizeNavigation(url);
                })
                .catch((error) => {
                    console.error("Erro no carregamento AJAX:", error);
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
            }, 300);
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
        // Identifica o módulo atual
        const moduleInfo = {
            module: getCurrentModule()
        };
        
        // Carrega os recursos específicos do módulo
        loadModuleResources(moduleInfo.module)
            .then(() => {
                console.log(`Recursos do módulo ${moduleInfo.module} carregados com sucesso`);
                
                // Dispara evento de conteúdo carregado
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
            })
            .catch(error => {
                console.error(`Erro ao carregar recursos do módulo ${moduleInfo.module}:`, error);
                manageLoader(false);
            });
    }
    
    /**
     * Carrega os recursos (CSS e JS) específicos do módulo
     * @param {string} moduleName - Nome do módulo
     * @returns {Promise} Promise que resolve quando todos os recursos estão carregados
     */
    function loadModuleResources(moduleName) {
        return new Promise((resolve, reject) => {
            if (!moduleName || !moduleConfig[moduleName]) {
                resolve(); // Módulo não configurado, continua sem carregar recursos
                return;
            }
            
            const config = moduleConfig[moduleName];
            
            // Carrega os estilos
            if (config.styles && Array.isArray(config.styles)) {
                config.styles.forEach(style => loadCSS(style));
            }
            
            // Se não houver scripts, resolve imediatamente
            if (!config.scripts || !Array.isArray(config.scripts) || config.scripts.length === 0) {
                resolve();
                return;
            }
            
            // Carrega os scripts em sequência
            let scriptIndex = 0;
            
            function loadNextScript() {
                if (scriptIndex >= config.scripts.length) {
                    resolve(); // Todos os scripts foram carregados
                    return;
                }
                
                const script = config.scripts[scriptIndex];
                scriptIndex++;
                
                loadScriptWithRetry(
                    script,
                    loadNextScript, // Sucesso: carrega o próximo script
                    () => {
                        console.error(`Erro ao carregar script ${script} do módulo ${moduleName}`);
                        loadNextScript(); // Continua mesmo com erro
                    }
                );
            }
            
            // Inicia o carregamento do primeiro script
            loadNextScript();
        });
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
        
        // Verifica se temos uma função de inicialização específica para este módulo
        if (moduleConfig[moduleName] && moduleConfig[moduleName].initFunction) {
            moduleConfig[moduleName].initFunction();
        } else {
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
 * Implementação focada na correção do problema de carregamento de scripts
 */
function reinitializeInventoryComponents() {
    console.log("Reinicializando componentes do Inventário");
    
    // Verifica se estamos na página de Inventário
    const inventoryContainer = document.querySelector('.inventory-container');
    if (!inventoryContainer) return;
    
    // Define um flag para controlar inicializações simultâneas
    if (window._initializingInventory) {
        console.log("Inicialização de Inventário já em andamento, aguardando...");
        setTimeout(() => {
            if (window._initializingInventory) {
                console.warn("Timeout na inicialização do Inventário, forçando reinício");
                window._initializingInventory = false;
                reinitializeInventoryComponents();
            }
        }, 5000);
        return;
    }
    
    // Define flag de inicialização
    window._initializingInventory = true;
    
    // Verifica se já temos as funções necessárias carregadas
    const requiredFunctions = ['loadServers', 'saveServer', 'deleteServer', 'editServer'];
    const missingFunctions = requiredFunctions.filter(func => typeof window[func] !== 'function');
    
    if (missingFunctions.length === 0) {
        console.log("Funções do Inventário já estão carregadas, apenas reinicializando");
        reinitializeInventoryDirect();
        return;
    }
    
    console.log("Carregando scripts do Inventário...");
    
    // Força um recarregamento limpo do script de inventário
    const scriptSrc = '/static/js/core_inventory/main.js';
    
    // Remove scripts antigos relacionados ao inventário para evitar conflitos
    document.querySelectorAll('script[src*="core_inventory"]').forEach(script => {
        script.remove();
    });
    
    // Carrega o script com mecanismo de retry
    loadScriptWithRetry(
        scriptSrc,
        function() {
            console.log("Script de Inventário carregado com sucesso");
            setTimeout(() => {
                reinitializeInventoryDirect();
            }, 300);
        },
        function() {
            console.error("Falha ao carregar script do Inventário, implementando fallback");
            initializeInventoryManually();
        }
    );
}

/**
 * Inicializa diretamente os componentes do Inventário usando funções já carregadas
 */
function reinitializeInventoryDirect() {
    console.log("Inicializando componentes do Inventário");
    
    // Se as funções existirem, usa-as
    if (window.loadServers) {
        console.log("Carregando servidores via loadServers()");
        window.loadServers();
    }
    
    if (window.initializeForm) {
        console.log("Inicializando formulário de inventário");
        window.initializeForm();
    }
    
    // Configura os event listeners dos elementos do inventário
    setupInventoryEventListeners();
    
    // Configura botões da tabela
    setupInventoryTableButtons();
    
    // Libera o flag de inicialização
    window._initializingInventory = false;
    
    console.log("Componentes do Inventário inicializados com sucesso");
}

/**
 * Implementação manual das funções do Inventário caso o carregamento de script falhe
 */
function initializeInventoryManually() {
    console.log("Implementando funções do Inventário manualmente");
    
    // Implementação da função loadServers
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
    
    // Implementação da função saveServer
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
    
    // Implementação da função deleteServer
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
    
    // Implementação da função editServer
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
    
    // Implementação da função cancelEdit
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
    
    // Implementação da função showInventory
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
    
    // Implementação da função copyToClipboard
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
    
    // Função para mostrar feedback
    function showFeedback(message, type) {
        // Verifica se o container de feedback existe, senão cria
        let feedbackContainer = document.getElementById('feedback-container');
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.id = 'feedback-container';
            feedbackContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(feedbackContainer);
        }
        
        // Cria o elemento de feedback
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            padding: 10px 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: #fff;
            background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        feedbackContainer.appendChild(feedback);
        
        // Força reflow para iniciar animação
        feedback.offsetHeight;
        feedback.style.opacity = '1';
        
        // Remove após 3 segundos
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedbackContainer.contains(feedback)) {
                    feedbackContainer.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }
    
    // Configura os event listeners
    setupInventoryEventListeners();
    
    // Carrega os servidores
    window.loadServers();
    
    // Libera o flag de inicialização
    window._initializingInventory = false;
    
    console.log("Componentes do Inventário inicializados com implementação manual");
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
    
    // Configura botões específicos do Inventário
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
    
    // Botões para fechar o modal
    document.querySelectorAll('.close-modal-btn, #close-modal-btn, #close-modal-btn-alt').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                const modal = document.getElementById('inventory-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

/**
 * Configura botões na tabela de servidores do Inventário
 */
function setupInventoryTableButtons() {
    // Configura botões de edição
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            if (!row) return;
            
            const host = row.querySelector('.host-cell')?.textContent;
            if (host && window.editServer) {
                window.editServer(host);
            }
        });
    });
    
    // Configura botões de exclusão
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            if (!row) return;
            
            const host = row.querySelector('.host-cell')?.textContent;
            if (host && window.deleteServer) {
                window.deleteServer(host);
            }
        });
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
    // Lista de CSS comuns que devem estar sempre presentes
    const commonCss = [
        '/static/css/sidebar/layout.css',
        '/static/css/sidebar/menu-items.css',
        '/static/css/sidebar/submenus.css',
        '/static/css/sidebar/docs-menu.css'
    ];
    
    // Garante que os CSS comuns estejam carregados
    commonCss.forEach(cssPath => {
        loadCSS(cssPath);
    });
    
    // Carrega CSS específico do módulo
    if (moduleName && moduleConfig[moduleName] && moduleConfig[moduleName].styles) {
        moduleConfig[moduleName].styles.forEach(stylePath => {
            loadCSS(stylePath);
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
}

/**
 * Função auxiliar para configurar botão com clonagem (remove listeners antigos)
 * @param {string|Element} btn - ID do botão ou elemento do botão
 * @param {Function} callback - Função de callback para o evento de clique
 */
function setupButtonWithClone(btn, callback) {
    const button = typeof btn === 'string' ? document.getElementById(btn) : btn;
    if (button) {
        // Remove event listeners existentes
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Adiciona novo event listener
        newButton.addEventListener('click', callback);
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
    
    // Restaura posição fixa para footer e header
    if (footer) {
        footer.style.position = 'sticky';
        footer.style.bottom = '0';
        footer.style.zIndex = '100';
        footer.style.width = '100%';
    }

    if (contentHeader) {
        contentHeader.style.position = 'sticky';
        contentHeader.style.top = '0';
        contentHeader.style.zIndex = '100';
    }
    
    // Restaura estado da sidebar e seleção do menu
    setTimeout(() => {
        fixSidebarAfterNavigation();
        updateMenuSelection(window.location.pathname);
    }, 100);
    
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
        loadModuleResources(currentModule)
            .then(() => {
                reinitializeComponents(currentModule);
            })
            .catch(error => {
                console.error(`Erro ao carregar recursos do módulo ${currentModule}:`, error);
            });
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
    setupSubmenuHandlers,
    loadModuleResources
};
});