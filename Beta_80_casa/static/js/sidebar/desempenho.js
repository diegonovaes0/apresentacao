/**
 * Otimizações de desempenho para a Automato Platform
 * Adicione este script ao final do seu main.js para melhorar a velocidade de carregamento
 */
(function() {
    /**
     * Otimiza recursos críticos e melhora o tempo de carregamento
     */
    function optimizePageLoading() {
        // Adiciona estilos otimizados para melhorar o desempenho de renderização
        const style = document.createElement('style');
        style.textContent = `
            /* Prevenir layout shifts e melhorar desempenho de renderização */
            .sidebar, .content-area, .main-content {
                will-change: transform;
                transform: translateZ(0);
                backface-visibility: hidden;
                transition: opacity 0.15s ease, transform 0.2s ease;
            }
            
            /* Reduzir carga de trabalho durante animações */
            .submenu, .menu-item {
                contain: content;
            }
            
            /* Melhorar performance de scroll */
            .content-area, .main-content {
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            /* Garantir que elementos críticos sejam carregados primeiro */
            .sidebar-header, .content-header {
                content-visibility: auto;
                contain-intrinsic-size: 0 80px;
            }
            
            /* Lazy-loading para elementos não críticos */
            .social-links, .footer {
                content-visibility: auto;
                contain-intrinsic-size: 0 50px;
            }
            
            /* Otimizar animações do loader */
            #loader .spinner {
                animation-timing-function: linear;
                animation-duration: 0.8s;
                transform: translate3d(-50%, -50%, 0) rotate(0deg);
            }
            
            /* Otimizações para dispositivos móveis */
            @media (max-width: 768px) {
                * {
                    transition-duration: 0.15s !important;
                }
            }
            
            /* Melhorar desempenho para usuários com preferência por movimento reduzido */
            @media (prefers-reduced-motion: reduce) {
                * {
                    transition-duration: 0.001ms !important;
                    animation-duration: 0.001ms !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Lazy loading para scripts não críticos
        function deferNonCriticalScripts() {
            // Identificar scripts não críticos
            const nonCriticalScripts = document.querySelectorAll('script[defer]');
            
            nonCriticalScripts.forEach(script => {
                // Adiar carregamento
                script.setAttribute('defer', '');
                
                // Se for script interno (não src), mover para o final do body
                if (!script.src && script.textContent) {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    script.remove();
                    
                    // Usar setTimeout para adiar execução
                    setTimeout(() => {
                        document.body.appendChild(newScript);
                    }, 100);
                }
            });
        }
        
        // Otimização de imagens
        function optimizeImages() {
            // Adicionar atributo loading=lazy para imagens
            document.querySelectorAll('img:not([loading])').forEach(img => {
                img.loading = 'lazy';
                
                // Adicionar dimensões explícitas para evitar layout shifts
                if (img.width && img.height && !img.style.width && !img.style.height) {
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.aspectRatio = `${img.width} / ${img.height}`;
                }
            });
            
            // Fazer o mesmo para SVGs embarcados
            document.querySelectorAll('svg:not(.tech-icon):not(.automation-icon)').forEach(svg => {
                if (!svg.hasAttribute('width') || !svg.hasAttribute('height')) {
                    svg.style.width = '100%';
                    svg.style.height = 'auto';
                }
            });
        }
        
        // Redução de repaints
        function reduceRepaints() {
            // Usar requestAnimationFrame para mudanças visuais
            const batchDOMUpdates = (callback) => {
                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(callback);
                } else {
                    callback();
                }
            };
            
            // Aplicar a elementos que mudam frequentemente
            const dynamicElements = [
                '.sidebar', 
                '.main-content', 
                '.content-area'
            ];
            
            dynamicElements.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.dataset.optimized = "true";
                });
            });
            
            // Sobrescrever métodos que causam repaints frequentes
            const originalToggleClass = Element.prototype.classList.toggle;
            Element.prototype.classList.toggle = function(className) {
                if (this.dataset && this.dataset.optimized) {
                    return batchDOMUpdates(() => originalToggleClass.apply(this.classList, arguments));
                } else {
                    return originalToggleClass.apply(this.classList, arguments);
                }
            };
        }
        
        // Otimizar carregamento inicial
        function optimizeInitialLoad() {
            // Esconder loader depois de certo tempo mesmo que a página não esteja totalmente carregada
            const hideLoaderTimeout = 2000; // 2 segundos
            setTimeout(() => {
                const loader = document.getElementById('loader');
                if (loader && getComputedStyle(loader).opacity !== '0') {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                    }, 300);
                }
            }, hideLoaderTimeout);
            
            // Expandir menu relevante com base na URL atual
            const path = window.location.pathname;
            document.querySelectorAll('.sidebar .menu-item > a').forEach(link => {
                const href = link.getAttribute('href');
                if (href && path.includes(href) && href !== '/') {
                    // Encontrar menu-item pai
                    let parent = link.parentElement;
                    
                    // Expandir menus pais
                    while (parent) {
                        if (parent.classList.contains('menu-item')) {
                            parent.classList.add('selected');
                            
                            // Se tiver submenu
                            const submenu = parent.querySelector('.submenu');
                            const menuLink = parent.querySelector('a.has-submenu');
                            
                            if (submenu && menuLink) {
                                parent.classList.add('open');
                                menuLink.classList.add('selected');
                                submenu.style.maxHeight = `${submenu.scrollHeight + 20}px`;
                            }
                        }
                        parent = parent.parentElement;
                    }
                }
            });
        }
        
        // Precarregamento de páginas
        function setupPagePreloading() {
            // Pré-carregar páginas importantes ao passar o mouse sobre os links
            document.querySelectorAll('a[href^="/"]:not([href^="#"]):not([href*="javascript:"])').forEach(link => {
                link.addEventListener('mouseenter', function() {
                    const href = this.getAttribute('href');
                    if (href && !sessionStorage.getItem('preloaded-' + href)) {
                        setTimeout(() => {
                            const preloadLink = document.createElement('link');
                            preloadLink.rel = 'prefetch';
                            preloadLink.href = href;
                            document.head.appendChild(preloadLink);
                            sessionStorage.setItem('preloaded-' + href, 'true');
                        }, 100);
                    }
                });
            });
        }
        
        // Otimização de manipulação de eventos
        function optimizeEventHandlers() {
            // Usar delegação de eventos para reduzir o número de listeners
            function setupEventDelegation(container, selector, eventType, handler) {
                const containerElement = document.querySelector(container);
                if (!containerElement) return;
                
                containerElement.addEventListener(eventType, function(e) {
                    const target = e.target.closest(selector);
                    if (target && containerElement.contains(target)) {
                        handler.call(target, e);
                    }
                });
            }
            
            // Exemplo: delegar eventos de clique para links na sidebar
            setupEventDelegation('.sidebar', 'a', 'click', function(e) {
                // Handler comum para todos os links da sidebar
                const href = this.getAttribute('href');
                if (!href || href === '#' || href.startsWith('javascript:')) {
                    return;
                }
                
                // O restante da lógica será aplicado apenas uma vez
                // em vez de adicionar event listeners a cada link
            });
        }
        
        // Executar otimizações em ordem
        deferNonCriticalScripts();
        optimizeImages();
        reduceRepaints();
        
        // Executar otimizações após o carregamento básico do DOM
        setTimeout(() => {
            optimizeInitialLoad();
            setupPagePreloading();
            optimizeEventHandlers();
        }, 50);
        
        // Limpar caches e recursos não utilizados após certo tempo
        setTimeout(() => {
            // Limpar caches de performance
            if (window.performance && window.performance.clearResourceTimings) {
                window.performance.clearResourceTimings();
            }
            
            // Remover scripts e estilos temporários
            document.querySelectorAll('script[data-temp="true"], style[data-temp="true"]').forEach(el => {
                el.remove();
            });
        }, 5000);
    }
    
    /**
     * Otimização específica para carregamento de conteúdo AJAX
     */
    function optimizeAjaxLoading() {
        // Cache de conteúdo para páginas visitadas recentemente
        const pageCache = {};
        
        // Interceptar fetch para adicionar cache
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            // Só aplicar para requisições GET de páginas
            if (!options || options.method === undefined || options.method === 'GET') {
                const urlString = url.toString();
                
                // Verificar se é uma página HTML e não uma API
                if (urlString.startsWith('/') && 
                    !urlString.includes('/api/') && 
                    !urlString.includes('/static/')) {
                    
                    // Verificar cache
                    if (pageCache[urlString]) {
                        console.log('Carregando do cache:', urlString);
                        const cachedResponse = new Response(new Blob([pageCache[urlString]], 
                            { type: 'text/html' }));
                        return Promise.resolve(cachedResponse);
                    }
                    
                    // Fazer a requisição e armazenar em cache
                    return originalFetch.apply(this, arguments)
                        .then(response => {
                            // Clonar a resposta para não consumir o stream
                            const clonedResponse = response.clone();
                            
                            // Armazenar em cache se for bem-sucedida
                            if (response.ok) {
                                clonedResponse.text().then(html => {
                                    pageCache[urlString] = html;
                                    
                                    // Limitar tamanho do cache (máximo 10 páginas)
                                    const urls = Object.keys(pageCache);
                                    if (urls.length > 10) {
                                        delete pageCache[urls[0]];
                                    }
                                });
                            }
                            
                            return response;
                        });
                }
            }
            
            // Comportamento padrão para outras requisições
            return originalFetch.apply(this, arguments);
        };
        
        // Otimizar transições de página
        function optimizePageTransitions() {
            // Pré-renderizar conteúdo antes de mostrar
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                // Criar elemento invisível para pré-renderização
                const prerender = document.createElement('div');
                prerender.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';
                document.body.appendChild(prerender);
                
                // Substituir o conteúdo original
                const originalInnerHTML = mainContent.innerHTML;
                mainContent.innerHTML = '';
                
                // Renderizar em segundo plano e depois mostrar
                prerender.innerHTML = originalInnerHTML;
                
                // Forçar layout e depois copiar de volta
                prerender.offsetHeight;
                mainContent.innerHTML = prerender.innerHTML;
                
                // Remover elemento temporário
                prerender.remove();
            }
        }
        
        // Aplicar otimizações de transição após carregar conteúdo
        document.addEventListener('content-loaded', function() {
            // Otimizar a transição
            optimizePageTransitions();
            
            // Aplicar otimizações de imagem novamente
            setTimeout(() => {
                document.querySelectorAll('img:not([loading])').forEach(img => {
                    img.loading = 'lazy';
                });
            }, 100);
        });
    }
    
    // Iniciar otimizações
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            optimizePageLoading();
            optimizeAjaxLoading();
        });
    } else {
        optimizePageLoading();
        optimizeAjaxLoading();
    }
    
    // Medir e reportar desempenho
    window.addEventListener('load', function() {
        if (window.performance && window.performance.timing) {
            setTimeout(function() {
                const timing = window.performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                console.log(`Página carregada em ${loadTime}ms`);
                
                // Monitorar interatividade
                const tti = timing.domInteractive - timing.navigationStart;
                console.log(`Tempo até interatividade: ${tti}ms`);
            }, 0);
        }
    });
})();
/**
 * Solução que preserva o estilo original do botão Execute Selected
 * Este script corrige o problema do tamanho do botão sem alterar seu estilo visual
 */
(function() {
    /**
     * Função que corrige o botão preservando seu estilo original
     */
    function fixExecuteButton() {
        // Procurar pelo botão execute-selected
        const executeButton = document.getElementById('execute-selected');
        if (!executeButton) return;
        
        console.log("Aplicando correção ao botão execute-selected preservando o estilo original");
        
        // Remover quaisquer estilos inline que possam estar causando o problema
        if (executeButton.hasAttribute('style')) {
            executeButton.removeAttribute('style');
        }
        
        // Verificar se o conteúdo interno do botão está correto
        // Se o conteúdo estiver muito grande, restaurar para o padrão
        if (executeButton.innerHTML.length > 100 || !executeButton.innerHTML.includes('Executar')) {
            executeButton.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                EXECUTAR
            `;
        }
        
        // Adicionar uma classe que preserva o estilo original
        executeButton.classList.add('original-execute-btn');
        
        // Adicionar CSS que garante que o estilo original seja mantido
        // e que previne que outros scripts o alterem
     
    /**
     * Observa mudanças no DOM para aplicar a correção quando necessário
     */
    function setupObservers() {
        // Usar MutationObserver para detectar quando o botão é adicionado ou modificado
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Verificar se o botão existe ou foi modificado
                    const executeButton = document.getElementById('execute-selected');
                    if (executeButton) {
                        // Apenas aplicar se o botão não tiver a classe que indica que já foi corrigido
                        // ou se algum atributo estilo foi modificado
                        if (!executeButton.classList.contains('original-execute-btn') || 
                            (mutation.target === executeButton && mutation.attributeName === 'style')) {
                            fixExecuteButton();
                        }
                    }
                }
            });
        });
        
        // Observar o body para quaisquer alterações
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    /**
     * Inicializa a correção
     */
    function init() {
        // Aplicar a correção imediatamente se o botão já existir
        const executeButton = document.getElementById('execute-selected');
        if (executeButton) {
            fixExecuteButton();
        }
        
        // Configurar observadores para aplicar a correção quando necessário
        setupObservers();
        
        // Adicionar correção após eventos de carregamento de conteúdo
        document.addEventListener('content-loaded', function() {
            setTimeout(fixExecuteButton, 100);
        });
        
        // Verificar novamente após o carregamento completo da página
        window.addEventListener('load', function() {
            setTimeout(fixExecuteButton, 200);
        });
        
        // Adicionar um evento para o carregamento do módulo ansible
        document.addEventListener('ansible-module-loaded', function() {
            setTimeout(fixExecuteButton, 100);
        });
    }
    
    // Iniciar a correção
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
};