/**
 * Script principal de integração SPA para Automato Platform
 * 
 * Este script:
 * 1. Inicializa todos os componentes SPA
 * 2. Gerencia as dependências entre os módulos
 * 3. Implementa mecanismos de fallback para garantir compatibilidade
 * 4. Resolve problemas específicos com CSS e navegação
 */

// Garante que este script seja executado apenas uma vez
if (!window.automato_spa_initialized) {
    (function() {
        window.automato_spa_initialized = true;
        
        // Inicializa quando o DOM estiver pronto
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Inicializando sistema SPA da Automato Platform');
            
            // Objeto principal para o sistema SPA
            const AutomatoSPA = {
                /**
                 * Inicializa todos os componentes do sistema SPA
                 */
                init: function() {
                    this.loadDependencies();
                    this.setupGlobalEventHandlers();
                    this.fixKnownIssues();
                    
                    console.log('Sistema SPA inicializado com sucesso');
                },
                
                /**
                 * Carrega as dependências necessárias para o sistema SPA
                 */
                loadDependencies: function() {
                    // Verifica se o script spa-navigation.js já foi carregado
                    if (!window.SPA) {
                        this.loadScript('/static/js/spa-navigation.js');
                    }
                    
                    // Verifica se o script sidebar-enhancement.js já foi carregado
                    if (!window.SidebarManager) {
                        this.loadScript('/static/js/sidebar-enhancement.js');
                    }
                    
                    // Verifica se o script css-manager.js já foi carregado
                    if (!window.CssManager) {
                        this.loadScript('/static/js/css-manager.js');
                    }
                    
                    // Verifica se o script fixed-ajax-loader.js já foi carregado
                    if (!window.AjaxLoader) {
                        this.loadScript('/static/js/fixed-ajax-loader.js');
                    }
                },
                
                /**
                 * Carrega um script de forma assíncrona
                 * @param {string} src - URL do script
                 */
                loadScript: function(src) {
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    document.head.appendChild(script);
                    
                    console.log(`Carregando script: ${src}`);
                },
                
                /**
                 * Configura manipuladores de eventos globais
                 */
                setupGlobalEventHandlers: function() {
                    // Manipulador para evento de conteúdo carregado
                    document.addEventListener('content-loaded', function(e) {
                        const moduleInfo = e.detail || {};
                        console.log(`Conteúdo carregado para módulo: ${moduleInfo.module || 'desconhecido'}`);
                        
                        // Invoca função específica do módulo se existir
                        if (moduleInfo.module && window[`initialize${moduleInfo.module.charAt(0).toUpperCase() + moduleInfo.module.slice(1)}`]) {
                            window[`initialize${moduleInfo.module.charAt(0).toUpperCase() + moduleInfo.module.slice(1)}`]();
                        }
                    });
                    
                    // Manipulador para erros não capturados
                    window.addEventListener('error', function(e) {
                        console.error('Erro não capturado:', e.error || e.message);
                        
                        // Evita que erros não críticos afetem a experiência do usuário
                        if (e.message && (
                            e.message.includes('Cannot read property') ||
                            e.message.includes('is not a function') ||
                            e.message.includes('is undefined')
                        )) {
                            e.preventDefault();
                            console.warn('Erro não crítico capturado e impedido de afetar a UI');
                        }
                    });
                },
                
                /**
                 * Corrige problemas conhecidos com a implementação SPA
                 */
                fixKnownIssues: function() {
                    // Corrige problema com a sidebar piscando
                    this.fixSidebarFlickering();
                    
                    // Corrige problema com carregamento de CSS
                    this.fixCssLoading();
                    
                    // Corrige problema com dimensionamento da sidebar
                    this.fixSidebarDimensions();
                    
                    // Corrige problema com formulários
                    this.fixFormSubmission();
                },
                
                /**
                 * Corrige o problema da sidebar piscando durante a navegação
                 */
                fixSidebarFlickering: function() {
                    // Adiciona estilo para impedir a piscar
                    const style = document.createElement('style');
                    style.textContent = `
                        .sidebar {
                            transition: width 0.3s ease, transform 0.3s ease;
                            will-change: width, transform;
                        }
                        .sidebar.collapsed {
                            width: 60px;
                            overflow: hidden;
                        }
                        .sidebar .menu-text,
                        .sidebar .logo-text,
                        .sidebar .menu-arrow {
                            transition: opacity 0.2s ease, visibility 0.2s ease;
                        }
                        .ajax-loader {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 3px;
                            background: linear-gradient(to right, #4285f4, #34a853, #fbbc05, #ea4335);
                            z-index: 9999;
                            transform-origin: left;
                            animation: loading-bar 2s linear infinite;
                        }
                        @keyframes loading-bar {
                            0% { transform: scaleX(0); }
                            50% { transform: scaleX(0.5); }
                            100% { transform: scaleX(1); }
                        }
                    `;
                    document.head.appendChild(style);
                    
                    // Sobrescreve a função que pode causar flickering
                    if (window.updateElementsVisibility) {
                        const originalFunction = window.updateElementsVisibility;
                        window.updateElementsVisibility = function(isCollapsed) {
                            const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
                            
                            if (isCollapsed) {
                                elements.forEach(el => {
                                    el.style.opacity = '0';
                                    // Usa um atraso para visibility para evitar flickering
                                    setTimeout(() => {
                                        el.style.visibility = 'hidden';
                                    }, 200);
                                });
                            } else {
                                elements.forEach(el => {
                                    // Define visibility primeiro
                                    el.style.visibility = 'visible';
                                    // Adiciona um pequeno atraso antes de mostrar
                                    setTimeout(() => {
                                        el.style.opacity = '1';
                                    }, 50);
                                });
                            }
                        };
                        
                        console.log('A função updateElementsVisibility foi aprimorada para evitar flickering');
                    }
                },
                
                /**
                 * Corrige problemas com o carregamento de CSS
                 */
                fixCssLoading: function() {
                    // Lista de CSS comuns que devem ser sempre carregados
                    const commonCss = [
                        '/static/css/sidebar/layout.css',
                        '/static/css/sidebar/menu-items.css',
                        '/static/css/sidebar/submenus.css',
                        '/static/css/sidebar/docs-menu.css'
                    ];
                    
                    // Verifica e carrega CSS comuns se não estiverem presentes
                    commonCss.forEach(cssPath => {
                        if (!document.querySelector(`link[href="${cssPath}"]`)) {
                            const link = document.createElement('link');
                            link.rel = 'stylesheet';
                            link.href = cssPath;
                            document.head.appendChild(link);
                            
                            console.log(`CSS comum carregado: ${cssPath}`);
                        }
                    });
                    
                    // Função para garantir que CSS específicos dos módulos sejam carregados
                    window.ensureModuleCssLoaded = function(module) {
                        if (!module) return;
                        
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
                                '/static/css/core_inventory/animations.css',
                                '/static/css/core_inventory/buttons.css',
                                '/static/css/core_inventory/cards.css',
                                '/static/css/core_inventory/feedback.css',
                                '/static/css/core_inventory/forms.css',
                                '/static/css/core_inventory/header.css',
                                '/static/css/core_inventory/layout.css',
                                '/static/css/core_inventory/main.css',
                                '/static/css/core_inventory/modals.css',
                                '/static/css/core_inventory/reset.css',
                                '/static/css/core_inventory/utils.css',
                                '/static/css/core_inventory/vars.css'
                            ]
                        };
                        
                        const cssFiles = moduleCssMap[module] || [];
                        cssFiles.forEach(cssPath => {
                            if (!document.querySelector(`link[href="${cssPath}"]`)) {
                                const link = document.createElement('link');
                                link.rel = 'stylesheet';
                                link.href = cssPath;
                                document.head.appendChild(link);
                                
                                console.log(`CSS de módulo carregado: ${cssPath}`);
                            }
                        });
                    };
                },
                
                /**
                 * Corrige problemas com dimensionamento da sidebar
                 */
                fixSidebarDimensions: function() {
                    // Função para atualizar altura dos submenus
                    function updateSubmenuHeights() {
                        document.querySelectorAll('.menu-item.open > .submenu').forEach(submenu => {
                            let totalHeight = 0;
                            Array.from(submenu.children).forEach(child => {
                                totalHeight += child.offsetHeight || 0;
                            });
                            
                            submenu.style.maxHeight = `${totalHeight + 10}px`;
                        });
                    }
                    
                    // Atualiza as alturas durante o redimensionamento da janela
                    window.addEventListener('resize', function() {
                        updateSubmenuHeights();
                    });
                    
                    // Atualiza quando o conteúdo é carregado
                    document.addEventListener('content-loaded', function() {
                        setTimeout(updateSubmenuHeights, 100);
                    });
                },
                
                /**
                 * Corrige problemas com envio de formulários em páginas SPA
                 */
                fixFormSubmission: function() {
                    // Intercepta envios de formulário para usar AJAX quando apropriado
                    document.addEventListener('submit', function(e) {
                        const form = e.target;
                        
                        // Ignora formulários com atributo data-no-ajax ou target definido
                        if (form.dataset.noAjax || form.getAttribute('target')) {
                            return;
                        }
                        
                        // Verifica se é um formulário interno ao site
                        const action = form.getAttribute('action') || '';
                        if (action.startsWith('http') && !action.includes(window.location.hostname)) {
                            return; // Formulário externo, não intercepta
                        }
                        
                        // Intercepta o envio para usar AJAX
                        e.preventDefault();
                        
                        // Mostra indicador de carregamento
                        if (window.AjaxLoader && window.AjaxLoader.showLoadingIndicator) {
                            window.AjaxLoader.showLoadingIndicator();
                        }
                        
                        // Coleta os dados do formulário
                        const formData = new FormData(form);
                        
                        // Envia via AJAX
                        fetch(action || window.location.href, {
                            method: form.method.toUpperCase() || 'POST',
                            body: formData,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
                            }
                            
                            // Verifica se a resposta é JSON ou HTML
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                return response.json().then(data => {
                                    // Se tiver uma URL de redirecionamento, navega para ela
                                    if (data.redirect) {
                                        history.pushState({}, '', data.redirect);
                                        if (window.AjaxLoader && window.AjaxLoader.loadContent) {
                                            window.AjaxLoader.loadContent(data.redirect);
                                        } else {
                                            window.location.href = data.redirect;
                                        }
                                    } else if (data.message) {
                                        // Exibe mensagem de sucesso
                                        this.showNotification(data.message, 'success');
                                    }
                                });
                            } else {
                                // Processa como HTML
                                return response.text().then(html => {
                                    // Extrai o conteúdo principal
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(html, 'text/html');
                                    const content = doc.querySelector('.main-content');
                                    
                                    if (content) {
                                        // Atualiza o conteúdo principal
                                        document.querySelector('.main-content').innerHTML = content.innerHTML;
                                        
                                        // Dispara evento de conteúdo carregado
                                        document.dispatchEvent(new CustomEvent('content-loaded'));
                                    } else {
                                        // Não encontrou conteúdo principal, recarrega a página
                                        window.location.reload();
                                    }
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Erro ao enviar formulário:', error);
                            this.showNotification(`Erro ao processar formulário: ${error.message}`, 'error');
                        })
                        .finally(() => {
                            // Esconde indicador de carregamento
                            if (window.AjaxLoader && window.AjaxLoader.hideLoadingIndicator) {
                                window.AjaxLoader.hideLoadingIndicator();
                            }
                        });
                    }.bind(this));
                },
                
                /**
                 * Exibe uma notificação temporária
                 * @param {string} message - Mensagem a ser exibida
                 * @param {string} type - Tipo de notificação (success, error, warning, info)
                 */
                showNotification: function(message, type = 'info') {
                    // Verifica se já existe um container de notificações
                    let notifContainer = document.getElementById('notification-container');
                    if (!notifContainer) {
                        notifContainer = document.createElement('div');
                        notifContainer.id = 'notification-container';
                        notifContainer.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            z-index: 9999;
                            max-width: 300px;
                        `;
                        document.body.appendChild(notifContainer);
                    }
                    
                    // Cria o elemento de notificação
                    const notification = document.createElement('div');
                    notification.className = `notification notification-${type}`;
                    notification.style.cssText = `
                        background-color: ${type === 'success' ? '#4caf50' : 
                                          type === 'error' ? '#f44336' : 
                                          type === 'warning' ? '#ff9800' : '#2196f3'};
                        color: white;
                        padding: 12px 16px;
                        margin-bottom: 10px;
                        border-radius: 4px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        opacity: 0;
                        transform: translateY(-20px);
                        transition: opacity 0.3s, transform 0.3s;
                    `;
                    
                    // Adiciona ícone com base no tipo
                    let icon = '';
                    switch(type) {
                        case 'success':
                            icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
                            break;
                        case 'error':
                            icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                            break;
                        case 'warning':
                            icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                            break;
                        default:
                            icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
                    }
                    
                    notification.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            <span style="margin-right: 8px;">${icon}</span>
                            <span>${message}</span>
                        </div>
                    `;
                    
                    // Adiciona ao container
                    notifContainer.appendChild(notification);
                    
                    // Anima entrada
                    setTimeout(() => {
                        notification.style.opacity = '1';
                        notification.style.transform = 'translateY(0)';
                    }, 10);
                    
                    // Remove após 5 segundos
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateY(-20px)';
                        
                        setTimeout(() => {
                            notification.remove();
                        }, 300);
                    }, 5000);
                }
            };
            
            // Inicializa o sistema SPA
            AutomatoSPA.init();
            
            // Expõe a instância para uso global
            window.AutomatoSPA = AutomatoSPA;
        });
    })();
}