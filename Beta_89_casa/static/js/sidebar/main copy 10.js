/**
 * main.js - Script principal otimizado para integração SPA na Automato Platform
 * Inclui a lógica do inventory.js integrada diretamente com correção para o botão de deletar
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cache para elementos DOM frequentemente acessados
    let mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    const loader = document.getElementById('loader') || createLoader();
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const footer = document.querySelector('.footer');
    const contentHeader = document.querySelector('.content-header');
    const menu = document.querySelector('.menu');

    // Registro de módulos e suas dependências
    const moduleConfig = {
        ansible: {
            scripts: ['/static/js/ansible/main.js'],
            styles: ['/static/css/core_ansible/style.css'],
            initFunction: reinitializeAnsibleComponents
        },
        inventory: {
            scripts: [], // Removido o carregamento externo, pois o inventory.js está embutido
            styles: ['/static/css/inventory/inventory.css'],
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
    const scriptLoadStatus = {};

    // Funções utilitárias do main.js (mantidas como estão)
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

    function manageLoader(show) {
        if (!loader) return;
        
        if (show) {
            loader.style.display = 'block';
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

    function getCurrentModule() {
        const path = window.location.pathname;
        if (path.includes('/ansible')) return 'ansible';
        if (path.includes('/inventory')) return 'inventory';
        if (path.includes('/terraform')) return 'terraform';
        if (path.includes('/python')) return 'python';
        return null;
    }

    function loadScriptWithRetry(src, successCallback, errorCallback) {
        console.log(`Carregando script: ${src}`);
        const cacheBuster = `?_v=${new Date().getTime()}`;
        const scriptSrc = src + cacheBuster;
        
        const existingScript = document.querySelector(`script[src^="${src}"]`);
        if (existingScript) existingScript.remove();
        
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = false;
        
        let timeoutId = setTimeout(() => {
            console.warn(`Timeout ao carregar ${src}, tentando novamente...`);
            if (script.parentNode) script.parentNode.removeChild(script);
            const scriptRetry = document.createElement('script');
            scriptRetry.src = src + `?_retry=${new Date().getTime()}`;
            scriptRetry.async = false;
            scriptRetry.onload = () => successCallback && successCallback();
            scriptRetry.onerror = () => errorCallback && errorCallback();
            document.head.appendChild(scriptRetry);
        }, 5000);
        
        script.onload = () => {
            clearTimeout(timeoutId);
            console.log(`Script carregado com sucesso: ${src}`);
            successCallback && successCallback();
        };
        
        script.onerror = () => {
            clearTimeout(timeoutId);
            console.error(`Erro ao carregar script: ${src}`);
            errorCallback && errorCallback();
        };
        
        document.head.appendChild(script);
    }

    function loadCSS(href) {
        if (!document.querySelector(`link[href^="${href}"]`)) {
            console.log(`Carregando CSS: ${href}`);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href + `?_v=${new Date().getTime()}`;
            document.head.appendChild(link);
        }
    }

    function setupSubmenuHandlers() {
        document.querySelectorAll('a.has-submenu').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
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
                setTimeout(() => manageLoader(false), 300);
            });
        });

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
                
                if (href && href !== '#' && !href.startsWith('javascript:')) {
                    e.preventDefault();
                    manageLoader(true);
                    const menuItem = this.parentElement;
                    if (menuItem) localStorage.setItem('selectedMenuItem', menuItem.querySelector('a').textContent.trim());
                    history.pushState({}, '', href);
                    loadContent(href);
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                if (sidebar && sidebar.classList.contains('collapsed')) return;
                
                manageLoader(true);
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
                setTimeout(() => manageLoader(false), 300);
            });
        });
    }

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

    function adjustScrollForSubmenu(submenu) {
        if (!submenu || !menu) return;
        setTimeout(() => {
            const submenuRect = submenu.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            if (submenuRect.bottom > menuRect.bottom) {
                menu.scrollTo({
                    top: menu.scrollTop + (submenuRect.bottom - menuRect.bottom) + 20,
                    behavior: 'smooth'
                });
            } else if (submenuRect.top < menuRect.top) {
                menu.scrollTo({
                    top: menu.scrollTop - (menuRect.top - submenuRect.top) - 20,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    function setupSpaNavigation() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.sidebar')) return;
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || href.startsWith('javascript:') || link.getAttribute('target') === '_blank') return;
            
            e.preventDefault();
            manageLoader(true);
            const currentModule = getCurrentModule();
            if (currentModule && mainContent) localStorage.setItem(`${currentModule}_scrollPos`, mainContent.scrollTop || 0);
            history.pushState({}, '', href);
            loadContent(href);
        });
        
        window.addEventListener('popstate', function(e) {
            manageLoader(true);
            loadContent(window.location.pathname);
        });
    }

    function loadContent(url) {
        manageLoader(true);
        if (window.AjaxLoader && window.AjaxLoader.loadContent) {
            window.AjaxLoader.loadContent(url)
                .then(() => {
                    mainContent = document.querySelector('.main-content');
                    finalizeNavigation(url);
                })
                .catch(error => {
                    console.error("Erro no carregamento AJAX:", error);
                    manageLoader(false);
                });
            return;
        }
        
        fetch(url, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html' }
        })
        .then(response => {
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('.main-content');
            if (!newContent) throw new Error('Conteúdo principal não encontrado na resposta');
            setTimeout(() => {
                if (mainContent) {
                    mainContent.style.opacity = '0';
                    setTimeout(() => {
                        mainContent.innerHTML = newContent.innerHTML;
                        mainContent.offsetHeight;
                        mainContent.style.opacity = '1';
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

    function finalizeNavigation(url) {
        const moduleInfo = { module: getCurrentModule() };
        loadModuleResources(moduleInfo.module)
            .then(() => {
                console.log(`Recursos do módulo ${moduleInfo.module} carregados com sucesso`);
                document.dispatchEvent(new CustomEvent('content-loaded', { detail: moduleInfo }));
                if (moduleInfo.module && mainContent) {
                    const savedScrollPos = localStorage.getItem(`${moduleInfo.module}_scrollPos`);
                    if (savedScrollPos) setTimeout(() => mainContent.scrollTop = parseInt(savedScrollPos, 10), 50);
                }
                reinitializeComponents(moduleInfo.module);
                setTimeout(() => setupSubmenuHandlers(), 300);
                updateMenuSelection(url);
                setTimeout(() => manageLoader(false), 500);
            })
            .catch(error => {
                console.error(`Erro ao carregar recursos do módulo ${moduleInfo.module}:`, error);
                manageLoader(false);
            });
    }

    function loadModuleResources(moduleName) {
        return new Promise((resolve, reject) => {
            if (!moduleName || !moduleConfig[moduleName]) {
                resolve();
                return;
            }
            const config = moduleConfig[moduleName];
            if (config.styles && Array.isArray(config.styles)) config.styles.forEach(style => loadCSS(style));
            if (!config.scripts || !Array.isArray(config.scripts) || config.scripts.length === 0) {
                resolve();
                return;
            }
            let scriptIndex = 0;
            function loadNextScript() {
                if (scriptIndex >= config.scripts.length) {
                    resolve();
                    return;
                }
                const script = config.scripts[scriptIndex];
                scriptIndex++;
                loadScriptWithRetry(script, loadNextScript, () => {
                    console.error(`Erro ao carregar script ${script} do módulo ${moduleName}`);
                    loadNextScript();
                });
            }
            loadNextScript();
        });
    }

    function updateMenuSelection(url) {
        document.querySelectorAll('.menu-item.selected').forEach(item => item.classList.remove('selected'));
        let foundLink = null;
        document.querySelectorAll('.sidebar a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href === url) foundLink = link;
        });
        if (!foundLink) {
            document.querySelectorAll('.sidebar a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && url.includes(href) && href !== '/') {
                    if (!foundLink || href.length > foundLink.getAttribute('href').length) foundLink = link;
                }
            });
        }
        if (foundLink) {
            const menuItem = foundLink.parentElement;
            menuItem.classList.add('selected');
            let parent = menuItem.parentElement;
            while (parent) {
                if (parent.classList.contains('submenu')) {
                    const parentMenuItem = parent.parentElement;
                    if (parentMenuItem.classList.contains('menu-item')) {
                        parentMenuItem.classList.add('open');
                        const parentLink = parentMenuItem.querySelector('a.has-submenu');
                        if (parentLink) parentLink.classList.add('selected');
                        parent.style.maxHeight = `${parent.scrollHeight}px`;
                    }
                }
                parent = parent.parentElement;
            }
        }
    }

    function reinitializeComponents(moduleName) {
        if (!moduleName) return;
        console.log(`Reinicializando componentes do módulo: ${moduleName}`);
        setupAnimations();
        fixMissingStyles(moduleName);
        if (moduleConfig[moduleName] && moduleConfig[moduleName].initFunction) {
            moduleConfig[moduleName].initFunction();
        } else {
            switch(moduleName) {
                case 'ansible': reinitializeAnsibleComponents(); break;
                case 'inventory': reinitializeInventoryComponents(); break;
                case 'terraform': reinitializeTerraformComponents(); break;
                case 'python': reinitializePythonComponents(); break;
            }
        }
        fixSidebarAfterNavigation();
    }

    function reinitializeAnsibleComponents() {
        console.log("Reinicializando componentes Ansible");
        const ansibleContainer = document.querySelector('.ansible-container');
        if (!ansibleContainer) return;
        setTimeout(() => {
            if (window.initializeOSFilters) window.initializeOSFilters();
            if (window.loadHosts) window.loadHosts(false);
            if (window.loadPlaybooks) window.loadPlaybooks(false);
            if (window.setupFilterEvents) window.setupFilterEvents();
            if (window.updateOSInfoPanel) window.updateOSInfoPanel();
            if (window.updateExecuteButton) window.updateExecuteButton();
            setupAnsibleEventListeners();
            console.log("Componentes Ansible reinicializados");
        }, 200);
    }

    function setupAnsibleEventListeners() {
        setupButtonWithClone('select-all-hosts-btn', () => window.toggleAllHosts && window.toggleAllHosts(document.querySelectorAll('.host-banner.selected').length !== document.querySelectorAll('.host-banner.valid').length));
        setupButtonWithClone('select-all-playbooks', () => window.toggleAllPlaybooks && window.toggleAllPlaybooks(document.querySelectorAll('.playbook-item.selected').length !== document.querySelectorAll('.playbook-item').length));
        setupButtonWithClone('execute-selected', () => window.executeSelectedPlaybooks && window.executeSelectedPlaybooks());
        setupButtonWithClone('refresh', () => window.refreshAll && window.refreshAll());
        setupButtonWithClone('cancel-all', () => window.cancelAllExecutions && window.cancelAllExecutions());
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
     * Reinicializa componentes do módulo de Inventário
     * Integração direta do inventory.js com correção para o botão de deletar
     */
    function reinitializeInventoryComponents() {
        console.log("Reinicializando componentes do Inventário");
        const inventoryContainer = document.querySelector('.inventory-container');
        if (!inventoryContainer) return;

        // Elementos do DOM para o Inventário
        const serverForm = document.getElementById('server-form');
        const hostInput = document.getElementById('host');
        const userInput = document.getElementById('usuario');
        const passwordInput = document.getElementById('senha');
        const keyInput = document.getElementById('chave');
        const osSelect = document.getElementById('os');
        const submitBtn = document.getElementById('submit-btn');
        const submitText = document.getElementById('submit-text');
        const cancelBtn = document.getElementById('cancel-btn');
        const formTitle = document.getElementById('form-title');
        const serversList = document.getElementById('servers-list');
        const showInventoryBtn = document.getElementById('show-inventory-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const closeModalBtnAlt = document.getElementById('close-modal-btn-alt');
        const copyInventoryBtn = document.getElementById('copy-inventory-btn');
        const inventoryModal = document.getElementById('inventory-modal');
        const fullInventory = document.getElementById('full-inventory');

        if (!serverForm || !serversList || !inventoryModal) {
            console.error('Um ou mais elementos essenciais não foram encontrados no DOM');
            return;
        }

        let editMode = false;
        let originalHost = null;
        let existingHosts = new Set();
        let deleteCooldown = false;
        let inventoryVisible = false;

        function createCenterMessageModal() {
            const modal = document.createElement('div');
            modal.id = 'center-message-modal';
            modal.className = 'center-message-modal';
            modal.innerHTML = `
                <div class="center-message-content">
                    <div class="center-message-title">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Aviso</span>
                    </div>
                    <div class="center-message-text" id="center-message-text">
                        Mensagem aqui
                    </div>
                    <button class="center-message-button" id="center-message-button">OK</button>
                </div>
            `;
            document.body.appendChild(modal);
            return modal;
        }

        let centerMessageModal = document.getElementById('center-message-modal');
        if (!centerMessageModal) centerMessageModal = createCenterMessageModal();

        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'center-message-button') centerMessageModal.style.display = 'none';
        });

        function showMessage(message, type = 'success') {
            const messageTitle = centerMessageModal.querySelector('.center-message-title');
            const messageText = document.getElementById('center-message-text');
            const messageIcon = messageTitle.querySelector('i');
            if (type === 'success') {
                messageTitle.querySelector('span').textContent = 'Sucesso';
                messageIcon.className = 'fas fa-check-circle';
                messageIcon.style.color = '#4CAF50';
            } else {
                messageTitle.querySelector('span').textContent = 'Erro';
                messageIcon.className = 'fas fa-exclamation-circle';
                messageIcon.style.color = '#F44336';
            }
            messageText.textContent = message;
            centerMessageModal.style.display = 'flex';
        }

        function isValidIP(ip) {
            const ipPattern = /^((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
            return ipPattern.test(ip);
        }

        function resetForm() {
            serverForm.reset();
            editMode = false;
            originalHost = null;
            formTitle.textContent = 'Adicionar Novo Servidor';
            submitText.textContent = 'Adicionar Servidor';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }

        async function loadServers() {
            try {
                console.log('Carregando servidores...');
                const response = await fetch('/get-inventory');
                if (!response.ok) throw new Error(`Erro ao carregar servidores: ${response.status}`);
                const data = await response.json();
                console.log('Dados recebidos:', data);
                existingHosts = new Set(data.servers.map(server => server.host));
                renderServers(data.servers);
            } catch (error) {
                console.error('Erro em loadServers:', error);
                showMessage(error.message, 'error');
            }
        }

        function renderServers(servers) {
            serversList.innerHTML = '';
            if (servers.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 24px; margin-bottom: 10px;"></i>
                        <p style="color: var(--text-secondary);">Nenhum servidor cadastrado. Adicione seu primeiro servidor usando o formulário acima.</p>
                    </td>
                `;
                serversList.appendChild(emptyRow);
                return;
            }
            servers.forEach(server => {
                const row = document.createElement('tr');
                const authType = server.ssh_key_content ? '<i class="fas fa-key"></i> Chave SSH' : '<i class="fas fa-lock"></i> Senha';
                const osBadge = server.os === 'linux' ? '<span class="inventory-badge"><i class="fab fa-linux"></i> Linux</span>' : '<span class="inventory-badge"><i class="fab fa-windows"></i> Windows</span>';
                row.innerHTML = `
                    <td>${server.host}</td>
                    <td>${server.ssh_user}</td>
                    <td>${authType}</td>
                    <td>${osBadge}</td>
                    <td class="inventory-action-buttons">
                        <button class="inventory-btn-icon btn-edit" data-server='${JSON.stringify(server)}' title="Editar servidor">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="inventory-btn-icon btn-delete" data-host="${server.host}" title="Excluir servidor">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                serversList.appendChild(row);
            });
        }

        serverForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const host = hostInput.value.trim();
            if (!isValidIP(host)) {
                showMessage('IP inválido! Use o formato correto (ex: 192.168.1.1)', 'error');
                return;
            }
            if (!editMode && existingHosts.has(host)) {
                showMessage('Este servidor já existe no inventário', 'error');
                return;
            }
            const serverData = {
                host,
                ssh_user: userInput.value.trim(),
                ssh_pass: passwordInput.value,
                ssh_key_content: keyInput.value.trim(),
                os: osSelect.value,
                original_host: editMode ? originalHost : undefined
            };
            try {
                submitBtn.disabled = true;
                submitText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
                const response = await fetch('/add_server', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serverData)
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message, 'success');
                    resetForm();
                    await loadServers();
                } else {
                    showMessage(data.message || 'Erro ao salvar servidor', 'error');
                }
            } catch (error) {
                showMessage('Erro ao salvar servidor: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitText.innerHTML = editMode ? 'Atualizar Servidor' : 'Adicionar Servidor';
            }
        });

        serversList.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (editBtn) {
                console.log('Botão de edição clicado');
                const serverData = JSON.parse(editBtn.dataset.server);
                hostInput.value = serverData.host;
                userInput.value = serverData.ssh_user;
                passwordInput.value = serverData.ssh_pass || '';
                keyInput.value = serverData.ssh_key_content || '';
                osSelect.value = serverData.os;
                editMode = true;
                originalHost = serverData.host;
                formTitle.textContent = 'Editar Servidor';
                submitText.textContent = 'Atualizar Servidor';
                if (cancelBtn) cancelBtn.style.display = 'inline-flex';
                hostInput.focus();
            }

            if (deleteBtn) {
                console.log('Botão de deletar clicado');
                if (deleteCooldown) {
                    console.log('Cooldown ativo, tentativa ignorada');
                    return;
                }

                const host = deleteBtn.dataset.host;
                if (!host) {
                    console.error('Host não encontrado no dataset do botão');
                    showMessage('Erro: Host não identificado', 'error');
                    return;
                }

                const confirmed = confirm(`Deseja realmente remover o servidor ${host}?`);
                if (confirmed) {
                    deleteCooldown = true;
                    manageLoader(true); // Mostra o loader durante a exclusão
                    console.log(`Tentando deletar host: ${host}`);

                    const rowToRemove = deleteBtn.closest('tr');
                    if (rowToRemove) rowToRemove.style.opacity = '0.5'; // Feedback visual

                    try {
                        console.log('Enviando requisição para /remove_server');
                        const response = await fetch('/remove_server', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ host: host })
                        });

                        console.log('Resposta recebida do servidor:', response.status);
                        const data = await response.json();
                        console.log('Dados da resposta:', data);

                        if (response.ok && data.success) {
                            console.log(`Host ${host} removido com sucesso`);
                            showMessage(data.message || 'Servidor removido com sucesso', 'success');
                            existingHosts.delete(host);
                            if (rowToRemove) rowToRemove.remove();
                            await loadServers(); // Recarrega a lista para sincronizar
                        } else {
                            console.error('Erro ao remover servidor:', data.message);
                            showMessage(data.message || 'Erro ao remover servidor', 'error');
                            if (rowToRemove) rowToRemove.style.opacity = '1';
                        }
                    } catch (error) {
                        console.error('Erro na requisição:', error);
                        showMessage('Erro ao remover servidor: ' + error.message, 'error');
                        if (rowToRemove) rowToRemove.style.opacity = '1';
                    } finally {
                        deleteCooldown = false;
                        manageLoader(false);
                        console.log('Cooldown de deleção finalizado');
                    }
                } else {
                    console.log('Exclusão cancelada pelo usuário');
                }
            }
        });

        if (showInventoryBtn) {
            showInventoryBtn.addEventListener('click', async function() {
                if (inventoryVisible) {
                    closeModal();
                } else {
                    showInventoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
                    showInventoryBtn.disabled = true;
                    try {
                        const response = await fetch('/show-inventory');
                        if (!response.ok) throw new Error('Erro ao carregar inventário');
                        const data = await response.json();
                        if (fullInventory) {
                            fullInventory.textContent = data.inventory;
                            if (!data.inventory.includes('[linux]') && !data.inventory.includes('[windows]')) {
                                console.warn('Inventário retornado em formato inválido:', data.inventory);
                                showMessage('Aviso: O inventário retornado pode estar mal formatado.', 'error');
                            }
                        }
                        if (inventoryModal) {
                            inventoryModal.style.display = 'block';
                            document.body.style.overflow = 'hidden';
                            inventoryVisible = true;
                            showInventoryBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Fechar Inventário';
                        }
                    } catch (error) {
                        showMessage('Erro ao carregar inventário: ' + error.message, 'error');
                    } finally {
                        showInventoryBtn.disabled = false;
                    }
                }
            });
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (closeModalBtnAlt) closeModalBtnAlt.addEventListener('click', closeModal);
        if (inventoryModal) {
            inventoryModal.addEventListener('click', function(e) {
                if (e.target === inventoryModal) closeModal();
            });
        }

        function closeModal() {
            if (inventoryModal) {
                inventoryModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                inventoryVisible = false;
                if (showInventoryBtn) showInventoryBtn.innerHTML = '<i class="fas fa-eye"></i> Mostrar Inventário';
            }
        }

        if (copyInventoryBtn) {
            copyInventoryBtn.addEventListener('click', function() {
                const text = fullInventory.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    copyInventoryBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    setTimeout(() => copyInventoryBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar', 2000);
                    showMessage('Inventário copiado para a área de transferência!', 'success');
                });
            });
        }

        if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

        loadServers();
    }

    function reinitializeTerraformComponents() {
        console.log("Reinicializando componentes Terraform");
        const terraformContainer = document.querySelector('.terraform-container');
        if (!terraformContainer) return;
        setTimeout(() => {
            if (window.loadModules) window.loadModules();
            if (window.loadStates) window.loadStates();
            if (window.initializeWorkspaces) window.initializeWorkspaces();
            console.log("Componentes Terraform reinicializados");
        }, 200);
    }

    function reinitializePythonComponents() {
        console.log("Reinicializando componentes Python");
        const pythonContainer = document.querySelector('.python-container');
        if (!pythonContainer) return;
        setTimeout(() => {
            if (window.loadScripts) window.loadScripts();
            if (window.loadLibraries) window.loadLibraries();
            if (window.initializePythonModules) window.initializePythonModules();
            console.log("Componentes Python reinicializados");
        }, 200);
    }

    function setupAnimations() {
        if (!document.getElementById('spa-animation-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'spa-animation-styles';
            styleElement.textContent = `
                .main-content { transition: opacity 0.15s ease; }
                .ajax-loader { transition: opacity 0.3s ease; }
                .submenu { transition: max-height 0.3s ease, opacity 0.3s ease; overflow: hidden; }
                .fade-in { animation: fadeIn 0.3s ease forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
            `;
            document.head.appendChild(styleElement);
        }
        if (mainContent && !mainContent.style.transition) mainContent.style.transition = 'opacity 0.15s ease';
    }

    function fixMissingStyles(moduleName) {
        const commonCss = [
            '/static/css/sidebar/layout.css',
            '/static/css/sidebar/menu-items.css',
            '/static/css/sidebar/submenus.css',
            '/static/css/sidebar/docs-menu.css'
        ];
        commonCss.forEach(cssPath => loadCSS(cssPath));
        if (moduleName && moduleConfig[moduleName] && moduleConfig[moduleName].styles) {
            moduleConfig[moduleName].styles.forEach(stylePath => loadCSS(stylePath));
        }
    }

    function fixSidebarAfterNavigation() {
        document.querySelectorAll('.menu-item.open > .submenu').forEach(submenu => {
            let totalHeight = 0;
            Array.from(submenu.children).forEach(child => totalHeight += child.offsetHeight || 0);
            submenu.style.maxHeight = `${totalHeight + 10}px`;
        });
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed && sidebar) {
            sidebar.classList.add('collapsed');
            if (sidebarToggle) {
                const toggleIcon = sidebarToggle.querySelector('i');
                if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
            }
            const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
            elements.forEach(el => {
                el.style.opacity = '0';
                el.style.visibility = 'hidden';
            });
        }
    }

    function setupButtonWithClone(btn, callback) {
        const button = typeof btn === 'string' ? document.getElementById(btn) : btn;
        if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', callback);
        }
    }

    function fixDuplicateElements() {
        const uniqueSelectors = ['.sidebar', '#loader', '.main-content', '.content-header', '.footer'];
        uniqueSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 1) {
                console.warn(`Elementos duplicados encontrados: ${selector}`);
                for (let i = 1; i < elements.length; i++) elements[i].remove();
            }
        });
    }

    function initialize() {
        fixDuplicateElements();
        setupAnimations();
        setupSubmenuHandlers();
        fixMissingStyles(getCurrentModule());
        setupSpaNavigation();
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
        setTimeout(() => {
            fixSidebarAfterNavigation();
            updateMenuSelection(window.location.pathname);
        }, 100);
        document.addEventListener('content-loaded', e => {
            console.log("Evento content-loaded recebido");
            const moduleInfo = e.detail || {};
            reinitializeComponents(moduleInfo.module || getCurrentModule());
        });
        const currentModule = getCurrentModule();
        if (currentModule) {
            console.log(`Módulo atual detectado: ${currentModule}`);
            loadModuleResources(currentModule)
                .then(() => reinitializeComponents(currentModule))
                .catch(error => console.error(`Erro ao carregar recursos do módulo ${currentModule}:`, error));
        }
        console.log("Sistema SPA inicializado");
    }

    initialize();

    window.MainApp = {
        loadContent,
        reinitializeComponents,
        manageLoader,
        getCurrentModule,
        setupSubmenuHandlers,
        loadModuleResources
    };
});