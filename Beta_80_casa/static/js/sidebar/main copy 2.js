document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const currentPath = window.location.pathname;

    // Verifica se todos os elementos necessários existem
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }

    // Funções utilitárias
    function updateElementsVisibility(isCollapsed) {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        elements.forEach(el => {
            el.style.opacity = isCollapsed ? '0' : '1';
            el.style.visibility = isCollapsed ? 'hidden' : 'visible';
        });
    }

    function scrollToElement(element) {
        const menu = document.querySelector('.menu');
        if (!menu) return;

        const elementRect = element.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
            menu.scrollTo({
                top: element.offsetTop - menuRect.height / 2,
                behavior: 'smooth'
            });
        }
    }

    function closeAllMenus() {
        document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
            if (!item.querySelector('a[href="' + currentPath + '"]')) {
                item.classList.remove('selected');
            }
            item.classList.remove('open');
            
            const submenu = item.querySelector('.submenu');
            if (submenu) submenu.style.maxHeight = '0px';
            
            const link = item.querySelector('a.has-submenu');
            if (link && !link.getAttribute('href') === currentPath) {
                link.classList.remove('selected', 'icon-only');
            }
        });
    }

    // Setup do toggle da sidebar
    if (sidebarToggle) {
        console.log('Sidebar toggle button found, adding event listener');
        sidebarToggle.addEventListener('click', () => {
            console.log('Sidebar toggle clicked');
            const isCollapsing = !sidebar.classList.contains('collapsed');
            
            if (isCollapsing) {
                document.querySelectorAll('.menu-text, .logo-text, .menu-arrow')
                    .forEach(el => {
                        el.style.opacity = '0';
                        el.style.visibility = 'hidden';
                    });
                
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    if (sidebarToggle.querySelector('i')) {
                        sidebarToggle.querySelector('i').style.transform = 'rotate(180deg)';
                    }
                    
                    // Ajusta os links sociais
                    const socialLinks = document.querySelector('.social-links');
                    if (socialLinks) {
                        socialLinks.classList.add('horizontal');
                    }
                }, 200);
            } else {
                sidebar.classList.remove('collapsed');
                if (sidebarToggle.querySelector('i')) {
                    sidebarToggle.querySelector('i').style.transform = 'rotate(0deg)';
                }
                
                // Ajusta os links sociais
                const socialLinks = document.querySelector('.social-links');
                if (socialLinks) {
                    socialLinks.classList.remove('horizontal');
                }
                
                setTimeout(() => {
                    document.querySelectorAll('.menu-text, .logo-text, .menu-arrow')
                        .forEach(el => {
                            el.style.opacity = '1';
                            el.style.visibility = 'visible';
                        });
                }, 200);
            }
        });
    } else {
        console.error('Sidebar toggle button not found');
    }

    // Marca o menu atual como ativo e configura a visualização inicial
    function setInitialActiveState() {
        document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
            item.classList.remove('open', 'selected');
            const submenu = item.querySelector('.submenu');
            if (submenu) submenu.style.maxHeight = '0px';
        });
        
        // Configura o item atualmente selecionado
        let activeFound = false;
        document.querySelectorAll('.menu-item a').forEach(link => {
            const linkPath = link.getAttribute('href');
            // Verifica se o link atual corresponde exatamente ao path atual
            if (linkPath === currentPath) {
                activeFound = true;
                const menuItem = link.closest('.menu-item');
                menuItem.classList.add('selected');
                
                // Se for um submenu, abre o parent
                const parentMenuItem = menuItem.closest('.submenu')?.closest('.menu-item');
                if (parentMenuItem) {
                    parentMenuItem.classList.add('open');
                    // Adiciona a classe icon-only para o menu pai
                    const parentLink = parentMenuItem.querySelector('a.has-submenu');
                    if (parentLink) {
                        parentLink.classList.add('icon-only');
                    }
                    
                    const submenu = parentMenuItem.querySelector('.submenu');
                    if (submenu) {
                        submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    }
                    
                    // Se este for um menu de segundo nível, também abre o avô
                    const grandParentMenuItem = parentMenuItem.closest('.submenu')?.closest('.menu-item');
                    if (grandParentMenuItem) {
                        grandParentMenuItem.classList.add('open');
                        // Adiciona a classe icon-only para o menu avô
                        const grandParentLink = grandParentMenuItem.querySelector('a.has-submenu');
                        if (grandParentLink) {
                            grandParentLink.classList.add('icon-only');
                        }
                        
                        const grandSubmenu = grandParentMenuItem.querySelector('.submenu');
                        if (grandSubmenu) {
                            grandSubmenu.style.maxHeight = `${grandSubmenu.scrollHeight}px`;
                        }
                    }
                }
            }
        });
        
        // Se nenhum item estiver ativo, configura o Dashboard como padrão
        if (!activeFound && (currentPath === '/' || currentPath.includes('/dashboard'))) {
            const dashboardLink = document.querySelector('.menu-item a[href="/dashboard"]') || 
                                 document.querySelector('.menu-item a[href="/dashboard/dashboard"]');
            if (dashboardLink) {
                const menuItem = dashboardLink.closest('.menu-item');
                menuItem.classList.add('selected');
            }
        }
        
        // Verifica se a sidebar está colapsada
        if (sidebar.classList.contains('collapsed')) {
            const socialLinks = document.querySelector('.social-links');
            if (socialLinks) {
                socialLinks.classList.add('horizontal');
            }
            updateElementsVisibility(true);
        }
    }

    // Setup inicial da sidebar
    setInitialActiveState();

    // Adicionar delegação de eventos para toda a sidebar para melhor compatibilidade
    sidebar.addEventListener('click', function(e) {
        // Lidar com cliques em a.has-submenu
        if (e.target.closest('a.has-submenu')) {
            const menuLink = e.target.closest('a.has-submenu');
            // Previne navegação se for apenas toggle de submenu
            if (!menuLink.getAttribute('href') || menuLink.getAttribute('href') === '#') {
                e.preventDefault();
            }
            e.stopPropagation();

            // Não faz nada se a sidebar estiver recolhida
            if (this.classList.contains('collapsed')) return;

            const menuItem = menuLink.closest('.menu-item');
            const wasOpen = menuItem.classList.contains('open');

            // Se for um link com href real, não fecha os menus ao clicar
            if (menuLink.getAttribute('href') && menuLink.getAttribute('href') !== '#') {
                // Apenas abre os pais se necessário
                if (!wasOpen) {
                    // Fecha outros menus do mesmo nível
                    const siblingMenus = Array.from(menuItem.parentElement.children)
                        .filter(item => item !== menuItem && item.classList.contains('menu-item'));
                    
                    siblingMenus.forEach(item => {
                        item.classList.remove('open');
                        const submenu = item.querySelector('.submenu');
                        if (submenu) submenu.style.maxHeight = '0px';
                    });
                    
                    // Abre este menu
                    menuItem.classList.add('open');
                    const submenu = menuItem.querySelector('.submenu');
                    if (submenu) {
                        submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    }
                }
                return;
            }

            if (wasOpen) {
                menuItem.classList.remove('open');
                const submenu = menuItem.querySelector('.submenu');
                if (submenu) submenu.style.maxHeight = '0px';
                
                // Remove a classe icon-only quando fechar
                menuLink.classList.remove('icon-only');
            } else {
                // Fecha todos os menus do mesmo nível
                const siblings = Array.from(menuItem.parentElement.children)
                    .filter(item => item !== menuItem && item.classList.contains('menu-item'));
                
                siblings.forEach(item => {
                    item.classList.remove('open');
                    const submenu = item.querySelector('.submenu');
                    if (submenu) submenu.style.maxHeight = '0px';
                    
                    // Remove a classe icon-only dos irmãos
                    const siblingLink = item.querySelector('a.has-submenu');
                    if (siblingLink) {
                        siblingLink.classList.remove('icon-only');
                    }
                });
                
                // Abre este menu
                menuItem.classList.add('open');
                menuLink.classList.add('selected');
                
                const submenu = menuItem.querySelector('.submenu');
                if (submenu) {
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    setTimeout(() => scrollToElement(submenu), 150);
                }
            }
        }
        
        // Lidar com cliques em links finais (não has-submenu)
        if (e.target.closest('.submenu .menu-item a:not(.has-submenu)')) {
            const link = e.target.closest('.submenu .menu-item a:not(.has-submenu)');
            // Não previne a navegação, apenas marca como selecionado
            e.stopPropagation();
            
            // Remove seleção de TODOS os itens, não apenas do mesmo nível
            document.querySelectorAll('.menu-item').forEach(item => {
                if (item !== link.closest('.menu-item')) {
                    item.classList.remove('selected');
                }
            });
            
            // Marca este item como selecionado
            link.closest('.menu-item').classList.add('selected');
            
            // Adiciona icon-only aos menus pai
            let parent = link.closest('.submenu')?.closest('.menu-item');
            while (parent) {
                const parentLink = parent.querySelector('a.has-submenu');
                if (parentLink) {
                    parentLink.classList.add('icon-only');
                }
                parent = parent.closest('.submenu')?.closest('.menu-item');
            }
        }
        
        // Previne que cliques no submenu fechem o menu pai
        if (e.target.classList.contains('submenu')) {
            e.stopPropagation();
            e.preventDefault();
        }
    });

    // Botão de documentação - mantido separado
    const docsToggle = document.querySelector('.docs-toggle');
    if (docsToggle) {
        docsToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const docsWrapper = document.querySelector('.docs-wrapper');
            if (!docsWrapper) return;
            
            const isOpen = this.classList.contains('selected');
            
            if (isOpen) {
                this.classList.remove('selected');
                docsWrapper.classList.add('closing');
                
                setTimeout(() => {
                    docsWrapper.classList.remove('expanded');
                    docsWrapper.classList.remove('closing');
                }, 300);
            } else {
                // Primeiro, fecha todos os outros menus
                closeAllMenus();
                
                // Remove seleção de outros botões/itens
                document.querySelectorAll('.docs-button.selected, .docs-content .menu-item.selected').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Abre documentação
                this.classList.add('selected');
                docsWrapper.classList.add('expanded');
            }
        });
    }

    // Botões dentro da documentação
    document.querySelectorAll('.docs-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const target = this.getAttribute('data-target');
            const content = document.querySelector(`.docs-content[data-id="${target}"]`);
            if (!content) return;
            
            // Verifica se já está aberto
            const isOpen = this.classList.contains('selected');
            
            // Fecha todos os conteúdos
            document.querySelectorAll('.docs-content').forEach(content => {
                content.classList.remove('expanded');
            });
            
            // Remove seleção de todos os botões
            document.querySelectorAll('.docs-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            if (!isOpen) {
                // Abre este conteúdo
                this.classList.add('selected');
                content.classList.add('expanded');
            }
        });
    });

    // Observer para mudanças na sidebar
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'class') {
                updateElementsVisibility(sidebar.classList.contains('collapsed'));
            }
        });
    }).observe(sidebar, { attributes: true });
    
    // Log para verificar se o script foi carregado
    console.log('Sidebar script initialized');
});