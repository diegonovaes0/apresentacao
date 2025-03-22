/**
 * Aprimoramento da sidebar para comportamento SPA
 * 
 * Este script:
 * 1. Melhora a manipulação de menus e submenus
 * 2. Corrige problemas de altura dos menus expandidos
 * 3. Mantém o estado da navegação durante a SPA
 * 4. Evita o piscar durante a navegação
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM frequentemente usados
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const menu = document.querySelector('.menu');
    
    // Função para atualizar a visibilidade de elementos ao colapsar/expandir a sidebar
    function updateElementsVisibility(isCollapsed) {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        
        // Aplica animação com atraso para evitar piscar
        elements.forEach(el => {
            if (isCollapsed) {
                el.style.opacity = '0';
                setTimeout(() => {
                    el.style.visibility = 'hidden';
                }, 200);
            } else {
                // Define visibilidade primeiro, depois animação de opacidade
                el.style.visibility = 'visible';
                setTimeout(() => {
                    el.style.opacity = '1';
                }, 50);
            }
        });
    }
    
    // Helper para scroll suave
    function scrollToElement(element) {
        if (!menu || !element) return;
        
        const elementRect = element.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        const isBelow = elementRect.bottom > menuRect.bottom;
        const isAbove = elementRect.top < menuRect.top;
        
        if (isBelow || isAbove) {
            menu.scrollTo({
                top: element.offsetTop - menuRect.height / 2,
                behavior: 'smooth'
            });
        }
    }
    
    // Garantir abertura correta de todos os menus pais
    function openParentMenus(element, avoidScrollJump = false) {
        if (!element) return;
        
        let current = element;
        let submenuHeights = [];
        
        // Primeiro passo: coletar todos os submenus que precisam ser abertos
        while (current) {
            if (current.classList.contains('menu-item')) {
                current.classList.add('open');
                
                const submenu = current.querySelector('.submenu');
                if (submenu) {
                    submenuHeights.push({
                        submenu: submenu,
                        scrollHeight: submenu.scrollHeight
                    });
                }
            }
            
            current = current.parentElement ? current.parentElement.closest('.menu-item') : null;
        }
        
        // Segundo passo: aplicar alturas de baixo para cima para evitar saltos
        for (let i = submenuHeights.length - 1; i >= 0; i--) {
            submenuHeights[i].submenu.style.maxHeight = `${submenuHeights[i].scrollHeight}px`;
        }
        
        // Terceiro passo: atualizar altura de submenus pais após um delay
        if (!avoidScrollJump) {
            setTimeout(() => {
                updateParentSubmenusHeight(element.querySelector('.submenu'));
                // Scroll para o elemento atual apenas após a atualização das alturas
                setTimeout(() => scrollToElement(element), 50);
            }, 100);
        }
    }
    
    // Atualiza altura dos submenus pais quando o conteúdo muda
    function updateParentSubmenusHeight(element) {
        if (!element) return;
        
        let parent = element.parentElement ? element.parentElement.closest('.menu-item') : null;
        
        while (parent) {
            const parentSubmenu = parent.querySelector('.submenu');
            if (parentSubmenu) {
                // Calcula altura total dos filhos diretos (método mais preciso)
                let totalHeight = 0;
                Array.from(parentSubmenu.children).forEach(child => {
                    totalHeight += child.offsetHeight || 0;
                });
                
                // Aplica altura com margem de segurança
                parentSubmenu.style.maxHeight = `${totalHeight + 10}px`;
            }
            
            parent = parent.parentElement ? parent.parentElement.closest('.menu-item') : null;
        }
    }
    
    // Fecha todos os menus/submenus
    function closeAllMenus() {
        document.querySelectorAll('.menu-item.open').forEach(item => {
            item.classList.remove('open');
            const submenu = item.querySelector('.submenu');
            if (submenu) {
                submenu.style.maxHeight = '0';
            }
        });
        
        document.querySelectorAll('.menu-item.selected').forEach(item => {
            if (!item.classList.contains('active-route')) {
                item.classList.remove('selected');
            }
        });
        
        document.querySelectorAll('a.has-submenu.selected, a.has-submenu.icon-only').forEach(link => {
            if (!link.classList.contains('active-route')) {
                link.classList.remove('selected', 'icon-only');
            }
        });
        
        closeAllDocs();
    }
    
    // Fecha menus de documentação
    function closeAllDocs() {
        const docsToggle = document.querySelector('.docs-toggle');
        const docsWrapper = document.querySelector('.docs-wrapper');
        
        if (docsToggle && docsWrapper) {
            docsToggle.classList.remove('open', 'selected', 'icon-only');
            docsWrapper.classList.remove('expanded');
            docsWrapper.style.maxHeight = '0';
        }
        
        document.querySelectorAll('.docs-button').forEach(btn => {
            btn.classList.remove('open', 'selected');
            const content = btn.nextElementSibling;
            if (content) {
                content.classList.remove('expanded');
                content.style.maxHeight = '0';
            }
        });
    }
    
    // Configura o toggle da sidebar
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isCollapsing = !sidebar.classList.contains('collapsed');
            
            if (isCollapsing) {
                // Primeiro esconde os textos
                updateElementsVisibility(true);
                
                // Depois colapsa a sidebar com animação
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    const arrow = sidebarToggle.querySelector('i');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                    
                    // Salva o estado no localStorage
                    localStorage.setItem('sidebarCollapsed', 'true');
                }, 200);
            } else {
                // Primeiro expande a sidebar
                sidebar.classList.remove('collapsed');
                const arrow = sidebarToggle.querySelector('i');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
                
                // Depois mostra os textos
                setTimeout(() => {
                    updateElementsVisibility(false);
                    
                    // Salva o estado no localStorage
                    localStorage.setItem('sidebarCollapsed', 'false');
                    
                    // Atualiza as alturas dos menus abertos
                    document.querySelectorAll('.menu-item.open .submenu').forEach(submenu => {
                        submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    });
                }, 100);
            }
        });
    }
    
    // Inicializa a sidebar com base no estado salvo
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        updateElementsVisibility(true);
        
        const arrow = sidebarToggle?.querySelector('i');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
    
    // Aprimoramento para itens com submenu
    function enhanceSubmenuItems() {
        document.querySelectorAll('a.has-submenu').forEach(menuLink => {
            // Remove listeners antigos
            const newLink = menuLink.cloneNode(true);
            menuLink.parentNode.replaceChild(newLink, menuLink);
            
            // Adiciona novo listener
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const menuItem = this.parentElement;
                const wasOpen = menuItem.classList.contains('open');
                const submenu = menuItem.querySelector('.submenu');
                
                // Se estava aberto, fecha apenas este submenu
                if (wasOpen) {
                    menuItem.classList.remove('open');
                    this.classList.remove('selected');
                    
                    if (submenu) {
                        submenu.style.maxHeight = '0';
                    }
                    return;
                }
                
                // Fechar outros itens do mesmo nível
                const siblings = Array.from(menuItem.parentNode.children);
                siblings.forEach(sibling => {
                    if (sibling !== menuItem && sibling.classList.contains('menu-item')) {
                        sibling.classList.remove('open');
                        const siblingLink = sibling.querySelector('a.has-submenu');
                        const siblingSubmenu = sibling.querySelector('.submenu');
                        
                        if (siblingLink) {
                            siblingLink.classList.remove('selected');
                        }
                        
                        if (siblingSubmenu) {
                            siblingSubmenu.style.maxHeight = '0';
                        }
                    }
                });
                
                // Abrir o item atual
                menuItem.classList.add('open');
                this.classList.add('selected');
                
                if (submenu) {
                    // Define a altura máxima para o submenu
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    
                    // Atualiza alturas de submenus pais
                    updateParentSubmenusHeight(submenu);
                    
                    // Scroll para o item atual
                    setTimeout(() => scrollToElement(submenu), 150);
                }
                
                // Navegação SPA
                const href = this.getAttribute('href');
                if (href && href !== '#') {
                    // Usando history.pushState para mudar a URL sem recarregar
                    history.pushState({}, '', href);
                    
                    // Carrega o conteúdo via SPA
                    if (window.SPA && window.SPA.loadContent) {
                        window.SPA.loadContent(href);
                    }
                }
            });
        });
    }
    
    // Configura os links finais de menu (sem submenu)
    function enhanceFinalMenuItems() {
        document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
            // Remove listeners antigos
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Adiciona novo listener
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Primeiro, mantém o estado dos menus pais
                const menuItem = this.parentElement;
                openParentMenus(menuItem, true);
                
                // Remove seleção de outros itens finais
                document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(otherLink => {
                    if (otherLink !== this) {
                        otherLink.parentElement.classList.remove('selected');
                    }
                });
                
                // Marca este item como selecionado
                menuItem.classList.add('selected');
                
                // Scroll para o item selecionado
                setTimeout(() => scrollToElement(menuItem), 150);
                
                // Navegação SPA
                const href = this.getAttribute('href');
                if (href && href !== '#') {
                    // Usando history.pushState para mudar a URL sem recarregar
                    history.pushState({}, '', href);
                    
                    // Carrega o conteúdo via SPA
                    if (window.SPA && window.SPA.loadContent) {
                        window.SPA.loadContent(href);
                    }
                }
            });
        });
    }
    
    // Aprimoramento para o menu de documentação
    function enhanceDocsMenu() {
        const docsToggle = document.querySelector('.docs-toggle');
        const docsWrapper = document.querySelector('.docs-wrapper');
        
        if (docsToggle && docsWrapper) {
            // Remove listeners antigos
            const newDocsToggle = docsToggle.cloneNode(true);
            docsToggle.parentNode.replaceChild(newDocsToggle, docsToggle);
            
            // Adiciona novo listener
            newDocsToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Ignora se a sidebar estiver colapsada
                if (sidebar.classList.contains('collapsed')) return;
                
                const wasOpen = this.classList.contains('open');
                
                if (wasOpen) {
                    this.classList.remove('open', 'selected');
                    docsWrapper.classList.remove('expanded');
                    docsWrapper.style.maxHeight = '0';
                } else {
                    // Fecha outros menus abertos
                    closeAllMenus();
                    
                    // Abre documentação
                    this.classList.add('open', 'selected');
                    docsWrapper.classList.add('expanded');
                    docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                    
                    // Scroll para o menu de docs
                    setTimeout(() => scrollToElement(docsWrapper), 150);
                }
            });
        }
        
        // Configura botões de seções de documentação
        document.querySelectorAll('.docs-button').forEach(button => {
            // Remove listeners antigos
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Adiciona novo listener
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Ignora se a sidebar estiver colapsada
                if (sidebar.classList.contains('collapsed')) return;
                
                const content = this.nextElementSibling;
                const wasOpen = this.classList.contains('open');
                
                // Fecha outras seções de documentação
                document.querySelectorAll('.docs-button').forEach(btn => {
                    if (btn !== this) {
                        btn.classList.remove('open', 'selected');
                        const btnContent = btn.nextElementSibling;
                        if (btnContent) {
                            btnContent.classList.remove('expanded');
                            btnContent.style.maxHeight = '0';
                        }
                    }
                });
                
                // Alterna o estado desta seção
                this.classList.toggle('open', !wasOpen);
                this.classList.toggle('selected', !wasOpen);
                
                if (content) {
                    content.classList.toggle('expanded', !wasOpen);
                    content.style.maxHeight = !wasOpen ? `${content.scrollHeight}px` : '0';
                    
                    if (!wasOpen) {
                        setTimeout(() => scrollToElement(content), 150);
                    }
                }
                
                // Se estamos abrindo esta seção, certifique-se de que o menu de documentação está aberto
                if (!wasOpen && docsToggle && docsWrapper) {
                    docsToggle.classList.add('open', 'icon-only');
                    docsWrapper.classList.add('expanded');
                    docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                }
            });
        });
        
        // Configura itens de documentação
        document.querySelectorAll('.docs-content .menu-item > a').forEach(link => {
            // Remove listeners antigos
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Adiciona novo listener
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove seleção de outros itens
                document.querySelectorAll('.docs-content .menu-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Marca este item como selecionado
                this.parentElement.classList.add('selected');
                
                // Mantém a seção de documentação aberta
                const docSection = this.closest('.docs-content');
                const docButton = docSection?.previousElementSibling;
                
                if (docButton && docSection) {
                    docButton.classList.add('open', 'icon-only');
                    docSection.classList.add('expanded');
                    docSection.style.maxHeight = `${docSection.scrollHeight}px`;
                }
                
                // Mantém o menu de documentação aberto
                if (docsToggle && docsWrapper) {
                    docsToggle.classList.add('open', 'icon-only');
                    docsWrapper.classList.add('expanded');
                    docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                }
                
                // Scroll para o item selecionado
                setTimeout(() => scrollToElement(this.parentElement), 150);
                
                // Navegação SPA
                const href = this.getAttribute('href');
                if (href && href !== '#') {
                    // Usando history.pushState para mudar a URL sem recarregar
                    history.pushState({}, '', href);
                    
                    // Carrega o conteúdo via SPA
                    if (window.SPA && window.SPA.loadContent) {
                        window.SPA.loadContent(href);
                    }
                }
            });
        });
    }
    
    // Previne que cliques em submenus fechem o menu pai
    function preventSubmenuClosing() {
        document.querySelectorAll('.submenu, .docs-wrapper, .docs-content').forEach(submenu => {
            submenu.addEventListener('click', (e) => e.stopPropagation());
        });
    }
    
    // Inicializa todos os aprimoramentos da sidebar
    function initializeSidebarEnhancements() {
        enhanceSubmenuItems();
        enhanceFinalMenuItems();
        enhanceDocsMenu();
        preventSubmenuClosing();
        
        console.log('Aprimoramentos da sidebar inicializados com sucesso');
    }
    
    // Inicializa os aprimoramentos
    initializeSidebarEnhancements();
    
    // Expõe funções úteis globalmente
    window.SidebarManager = {
        openParentMenus,
        updateParentSubmenusHeight,
        closeAllMenus,
        closeAllDocs,
        scrollToElement,
        updateElementsVisibility,
        reinitialize: initializeSidebarEnhancements
    };
    
    // Adiciona evento para reinicializar após o carregamento de conteúdo
    document.addEventListener('content-loaded', () => {
        console.log('Conteúdo carregado, reinicializando sidebar...');
        setTimeout(initializeSidebarEnhancements, 100);
    });
});