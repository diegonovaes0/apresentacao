/**
 * Carregador AJAX otimizado para navegação SPA na Automato Platform
 * 
 * Este script:
 * 1. Implementa carregamento AJAX otimizado para conteúdo da página
 * 2. Preserva o estado da sidebar durante a navegação
 * 3. Gerencia o carregamento de scripts dinâmicos
 * 4. Adiciona suporte para back/forward do navegador
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elemento principal de conteúdo
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Elemento .main-content não encontrado');
        return;
    }
    
    // Cache para conteúdo já carregado
    const pageCache = new Map();
    
    // Rastreia scripts já carregados (para evitar duplicação)
    const loadedScripts = new Set();
    
    // Rastreia URLs de módulos para gerenciamento de cache
    const moduleUrls = new Map();
    
    /**
     * Carrega uma página via AJAX com gerenciamento de caching
     * @param {string} url - URL a ser carregada
     * @param {boolean} forceRefresh - Forçar atualização do cache
     */
    async function loadContent(url, forceRefresh = false) {
        // Mostra indicador de carregamento
        showLoadingIndicator();
        
        try {
            // Verifica se o conteúdo está em cache e se não estamos forçando atualização
            if (!forceRefresh && pageCache.has(url)) {
                const cachedData = pageCache.get(url);
                await processContent(cachedData.content, cachedData.scripts, url);
                
                // Oculta indicador de carregamento e atualiza a UI
                hideLoadingIndicator();
                updateBreadcrumbs(url);
                return;
            }
            
            // Não está em cache ou precisa atualizar, carrega via AJAX
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'text/html'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Processa o HTML recebido
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extrai o conteúdo principal
            const newContent = doc.querySelector('.main-content');
            if (!newContent) {
                throw new Error('Conteúdo principal não encontrado na resposta');
            }
            
            // Extrai scripts específicos da página
            const scriptsToLoad = Array.from(doc.querySelectorAll('script[src]'))
                .map(script => script.getAttribute('src'))
                .filter(src => src && !src.includes('sidebar/main.js') && !loadedScripts.has(src));
            
            // Armazena no cache
            pageCache.set(url, {
                content: newContent.innerHTML,
                scripts: scriptsToLoad
            });
            
            // Extrai informações do módulo a partir da URL
            const moduleInfo = extractModuleInfo(url);
            if (moduleInfo.module) {
                moduleUrls.set(moduleInfo.module, url);
            }
            
            // Processa o conteúdo
            await processContent(newContent.innerHTML, scriptsToLoad, url);
            
            // Oculta indicador de carregamento e atualiza breadcrumbs
            hideLoadingIndicator();
            updateBreadcrumbs(url);
            
        } catch (error) {
            console.error('Erro ao carregar conteúdo:', error);
            
            // Exibe mensagem de erro no conteúdo principal
            mainContent.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3>Erro ao carregar o conteúdo</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()" class="btn">Recarregar Página</button>
                </div>
            `;
            
            hideLoadingIndicator();
        }
    }
    
    /**
     * Processa o conteúdo HTML e scripts carregados
     * @param {string} html - Conteúdo HTML a ser inserido
     * @param {Array} scripts - Scripts a serem carregados
     * @param {string} url - URL atual
     */
    async function processContent(html, scripts, url) {
        // Atualiza o conteúdo principal
        mainContent.innerHTML = html;
        
        // Extrai informações do módulo
        const moduleInfo = extractModuleInfo(url);
        
        // Carrega CSS necessário para o módulo
        if (window.CssManager && moduleInfo.module) {
            window.CssManager.loadModuleStyles(moduleInfo.module);
        }
        
        // Carrega scripts de forma sequencial
        for (const scriptSrc of scripts) {
            await loadScript(scriptSrc);
        }
        
        // Inicializa scripts específicos do módulo
        initializeModuleScripts(moduleInfo.module, moduleInfo.submodule);
        
        // Dispara evento de conteúdo carregado
        document.dispatchEvent(new CustomEvent('content-loaded', { 
            detail: moduleInfo
        }));
    }
    
    /**
     * Carrega um script de forma assíncrona
     * @param {string} src - URL do script
     * @returns {Promise} Promise que resolve quando o script é carregado
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Verifica se o script já foi carregado
            if (loadedScripts.has(src)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                loadedScripts.add(src);
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error(`Erro ao carregar script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Inicializa scripts específicos do módulo após o carregamento
     * @param {string} module - Nome do módulo
     * @param {string} submodule - Nome do submódulo
     */
    function initializeModuleScripts(module, submodule) {
        if (!module) return;
        
        switch (module) {
            case 'ansible':
                // Inicializa funções específicas do módulo Ansible
                if (window.loadHosts) window.loadHosts();
                if (window.loadPlaybooks) window.loadPlaybooks();
                if (window.initializeOSFilters) window.initializeOSFilters();
                if (window.setupFilterEvents) window.setupFilterEvents();
                break;
                
            case 'inventory':
                // Inicializa funções específicas do módulo Inventário
                if (window.loadServers) window.loadServers();
                if (window.initializeForm) window.initializeForm();
                break;
                
            case 'terraform':
                // Inicializa funções específicas do módulo Terraform
                if (window.loadModules) window.loadModules();
                if (window.initializeWorkspaces) window.initializeWorkspaces();
                break;
                
            case 'python':
                // Inicializa funções específicas do módulo Python
                if (window.loadScripts) window.loadScripts();
                if (window.initializeLibraries) window.initializeLibraries();
                break;
                
            default:
                console.log(`Nenhuma inicialização específica para o módulo: ${module}`);
        }
        
        // Dispara evento específico de módulo
        document.dispatchEvent(new CustomEvent(`${module}-loaded`, { 
            detail: { module, submodule }
        }));
    }
    
    /**
     * Extrai informações do módulo a partir da URL
     * @param {string} url - URL a ser analisada
     * @returns {Object} Objeto com informações do módulo
     */
    function extractModuleInfo(url) {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        
        // Tenta extrair informações do módulo da URL
        const moduleMatch = path.match(/\/module_page\/([^/]+)(?:\/([^/]+))?/);
        
        if (moduleMatch) {
            return {
                module: moduleMatch[1] || '',
                submodule: moduleMatch[2] || ''
            };
        }
        
        return { module: '', submodule: '' };
    }
    
    /**
     * Mostra indicador de carregamento
     */
    function showLoadingIndicator() {
        // Verifica se já existe um loader
        let loader = document.getElementById('ajax-loader');
        
        if (!loader) {
            // Cria um novo loader
            loader = document.createElement('div');
            loader.id = 'ajax-loader';
            loader.className = 'ajax-loader';
            loader.innerHTML = `
                <div class="spinner"></div>
                <span>Carregando...</span>
            `;
            
            // Adiciona estilo inline para o loader
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(to right, #4285f4, #34a853, #fbbc05, #ea4335);
                z-index: 9999;
                animation: loading-bar 2s linear infinite;
                transform-origin: left;
            `;
            
            // Adiciona animação de loading
            const style = document.createElement('style');
            style.textContent = `
                @keyframes loading-bar {
                    0% {
                        transform: scaleX(0);
                    }
                    50% {
                        transform: scaleX(0.5);
                    }
                    100% {
                        transform: scaleX(1);
                    }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(loader);
        } else {
            // Mostra loader existente
            loader.style.display = 'block';
        }
    }
    
    /**
     * Esconde indicador de carregamento
     */
    function hideLoadingIndicator() {
        const loader = document.getElementById('ajax-loader');
        if (loader) {
            // Anima o desaparecimento
            loader.style.opacity = '0';
            
            // Remove após a animação
            setTimeout(() => {
                loader.style.display = 'none';
                loader.style.opacity = '1';
            }, 500);
        }
    }
    
    /**
     * Atualiza os breadcrumbs com base na URL atual
     * @param {string} url - URL atual
     */
    function updateBreadcrumbs(url) {
        const breadcrumbsContainer = document.querySelector('.breadcrumbs');
        if (!breadcrumbsContainer) return;
        
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        const urlParts = path.split('/').filter(part => part);
        
        // Constrói HTML dos breadcrumbs
        let breadcrumbsHTML = '<a href="/" class="breadcrumb-item">Home</a>';
        
        // Caso especial para módulos
        const moduleInfo = extractModuleInfo(url);
        
        if (moduleInfo.module) {
            breadcrumbsHTML += '<span class="separator">/</span>';
            
            const moduleDisplayName = formatDisplayName(moduleInfo.module);
            
            breadcrumbsHTML += `<a href="/module_page/${moduleInfo.module}" class="breadcrumb-item">${moduleDisplayName}</a>`;
            
            if (moduleInfo.submodule) {
                breadcrumbsHTML += '<span class="separator">/</span>';
                
                const submoduleDisplayName = formatDisplayName(moduleInfo.submodule);
                
                breadcrumbsHTML += `<span class="breadcrumb-item active">${submoduleDisplayName}</span>`;
            }
        } else {
            // URL genérica, constrói breadcrumbs normalmente
            urlParts.forEach((part, index) => {
                const isLast = index === urlParts.length - 1;
                const partURL = '/' + urlParts.slice(0, index + 1).join('/');
                const displayName = formatDisplayName(part);
                
                breadcrumbsHTML += '<span class="separator">/</span>';
                
                if (isLast) {
                    breadcrumbsHTML += `<span class="breadcrumb-item active">${displayName}</span>`;
                } else {
                    breadcrumbsHTML += `<a href="${partURL}" class="breadcrumb-item">${displayName}</a>`;
                }
            });
        }
        
        // Atualiza o HTML
        breadcrumbsContainer.innerHTML = breadcrumbsHTML;
        
        // Adiciona eventos SPA aos links de breadcrumb
        breadcrumbsContainer.querySelectorAll('a.breadcrumb-item').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                if (href) {
                    history.pushState({}, '', href);
                    loadContent(href);
                }
            });
        });
    }
    
    /**
     * Formata um nome para exibição nos breadcrumbs
     * @param {string} name - Nome original
     * @returns {string} Nome formatado
     */
    function formatDisplayName(name) {
        if (!name) return '';
        
        // Substitui underscores e hifens por espaços
        let displayName = name.replace(/[_-]/g, ' ');
        
        // Capitaliza as primeiras letras de cada palavra
        displayName = displayName.replace(/\b\w/g, letter => letter.toUpperCase());
        
        // Substitui nomes especiais conhecidos
        const specialNames = {
            'Ansible': 'Ansible',
            'Terraform': 'Terraform',
            'Core Inventory': 'Inventário',
            'Python': 'Python',
            'Scripts': 'Scripts',
            'Api': 'API',
            'Apis': 'APIs',
            'Docs': 'Documentação'
        };
        
        Object.entries(specialNames).forEach(([key, value]) => {
            displayName = displayName.replace(key, value);
        });
        
        return displayName;
    }
    
    /**
     * Configurar eventos para navegação do histórico (botões voltar/avançar)
     */
    function setupHistoryNavigation() {
        window.addEventListener('popstate', (event) => {
            const url = window.location.pathname;
            loadContent(url);
            
            // Tenta encontrar e selecionar o link correspondente na sidebar
            const sidebarLinks = document.querySelectorAll('.sidebar a[href]');
            
            for (const link of sidebarLinks) {
                const href = link.getAttribute('href');
                if (href === url) {
                    // Encontrou o link correspondente, atualiza a seleção na sidebar
                    if (window.SidebarManager) {
                        const menuItem = link.closest('.menu-item');
                        if (menuItem) {
                            // Remove seleção anterior
                            document.querySelectorAll('.menu-item.selected').forEach(item => {
                                if (item !== menuItem) {
                                    item.classList.remove('selected');
                                }
                            });
                            
                            // Adiciona seleção ao item atual
                            menuItem.classList.add('selected');
                            
                            // Abre os menus pai
                            window.SidebarManager.openParentMenus(menuItem);
                        }
                    }
                    break;
                }
            }
        });
    }
    
    /**
     * Configura links para usar navegação SPA
     */
    function setupSpaLinks() {
        // Intercepta cliques em links dentro do documento
        document.addEventListener('click', (e) => {
            // Ignora se o clique já foi tratado ou não é um elemento de link
            if (e.defaultPrevented || e.target.tagName !== 'A') return;
            
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            
            // Ignora links externos, âncoras ou links vazios
            if (!href || 
                href.startsWith('#') || 
                href.startsWith('http') || 
                href.startsWith('//') ||
                link.getAttribute('target') === '_blank') {
                return;
            }
            
            // Previne o comportamento padrão
            e.preventDefault();
            
            // Atualiza URL no histórico
            history.pushState({}, '', href);
            
            // Carrega o conteúdo
            loadContent(href);
        });
    }
    // No processContent da spa-navigation.js, adicione:

// Dispara um evento específico para a página atual
const pageType = url.includes('/ansible/') ? 'ansible' : 
url.includes('/inventory/') ? 'inventory' :
url.includes('/terraform/') ? 'terraform' :
url.includes('/python/') ? 'python' : 'unknown';

document.dispatchEvent(new CustomEvent(`${pageType}-page-loaded`, { 
detail: { url }
}));

// E também chama explicitamente a função de inicialização do módulo
if (pageType === 'ansible' && window.initializeAnsible) {
setTimeout(() => window.initializeAnsible(), 200);
}
    
    /**
     * Inicializa o carregador AJAX
     */
    function initialize() {
        // Configura eventos de navegação
        setupHistoryNavigation();
        setupSpaLinks();
        
        // Carrega conteúdo inicial se necessário (para páginas carregadas diretamente)
        const initialModule = extractModuleInfo(window.location.pathname);
        if (initialModule.module) {
            // Atualiza breadcrumbs para a página inicial
            updateBreadcrumbs(window.location.pathname);
        }
        
        console.log('Carregador AJAX inicializado com sucesso');
    }
    
    // Inicializa o carregador
    initialize();
    
    // Expõe API pública
    window.AjaxLoader = {
        loadContent,
        loadScript,
        showLoadingIndicator,
        hideLoadingIndicator,
        updateBreadcrumbs,
        getModuleInfo: extractModuleInfo
    };
});