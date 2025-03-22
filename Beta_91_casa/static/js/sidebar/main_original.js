document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    // Função para atualizar visibilidade dos elementos
    function updateElementsVisibility(isCollapsed) {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        elements.forEach(el => {
            el.style.opacity = isCollapsed ? '0' : '1';
            el.style.visibility = isCollapsed ? 'hidden' : 'visible';
        });
    }

    // Scroll helper
    function scrollToElement(element) {
        const menu = document.querySelector('.menu');
        if (!menu) return;

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

    // Fechar todos os menus
    function closeAllMenus() {
        document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
            item.classList.remove('open', 'selected');
            const submenu = item.querySelector('.submenu');
            if (submenu) {
                submenu.style.maxHeight = '0px';
            }
            const link = item.querySelector('a.has-submenu');
            if (link) {
                link.classList.remove('selected', 'icon-only');
            }
        });

        closeAllDocs();
    }

    // Fechar documentação
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

    // Abrir menus pais
    function openParentMenus(element) {
        let current = element;
        while (current) {
            if (current.classList.contains('menu-item')) {
                current.classList.add('open');
                const submenu = current.querySelector('.submenu');
                if (submenu) {
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    updateParentSubmenusHeight(submenu);
                }
            }
            current = current.parentElement.closest('.menu-item');
        }
    }

    // Atualizar altura dos submenus pais
    function updateParentSubmenusHeight(element) {
        let parent = element.parentElement.closest('.menu-item');
        while (parent) {
            const parentSubmenu = parent.querySelector('.submenu');
            if (parentSubmenu) {
                const totalHeight = Array.from(parentSubmenu.children)
                    .reduce((height, child) => height + (child.offsetHeight || 0), 0);
                parentSubmenu.style.maxHeight = `${totalHeight}px`;
            }
            parent = parent.parentElement.closest('.menu-item');
        }
    }

    // Toggle da Sidebar com animação melhorada
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isCollapsing = !sidebar.classList.contains('collapsed');
            
            if (isCollapsing) {
                // Primeiro esconde os textos
                document.querySelectorAll('.menu-text, .logo-text, .menu-arrow').forEach(el => {
                    el.style.opacity = '0';
                    el.style.visibility = 'hidden';
                });
                
                // Depois colapsa a sidebar
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    const arrow = sidebarToggle.querySelector('i');
                    arrow.style.transform = 'rotate(180deg)';
                }, 200);
            } else {
                // Primeiro expande a sidebar
                sidebar.classList.remove('collapsed');
                const arrow = sidebarToggle.querySelector('i');
                arrow.style.transform = 'rotate(0deg)';
                
                // Depois mostra os textos
                setTimeout(() => {
                    document.querySelectorAll('.menu-text, .logo-text, .menu-arrow').forEach(el => {
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                    });
                }, 200);
            }
        });
    }

    // Observer para detectar mudanças na classe collapsed
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isCollapsed = sidebar.classList.contains('collapsed');
                updateElementsVisibility(isCollapsed);
            }
        });
    });

    // Inicia o observer
    observer.observe(sidebar, {
        attributes: true
    });

    // Handler para itens com submenu
    document.querySelectorAll('a.has-submenu').forEach(menuLink => {
        menuLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (sidebar.classList.contains('collapsed')) return;

            const menuItem = this.parentElement;
            const wasOpen = menuItem.classList.contains('open');
            const submenu = menuItem.querySelector('.submenu');

            if (wasOpen) {
                closeAllMenus();
                return;
            }

            closeAllMenus();

            menuItem.classList.add('open');
            this.classList.add('selected');
            
            if (submenu) {
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                openParentMenus(menuItem);
                setTimeout(() => scrollToElement(submenu), 150);
            }
        });
    });

    // Handler para itens finais do menu
    document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (sidebar.classList.contains('collapsed')) return;

            closeAllMenus();

            const menuItem = this.parentElement;
            menuItem.classList.add('selected');
            openParentMenus(menuItem);

            const mainMenuItem = menuItem.closest('.menu > .menu-item');
            if (mainMenuItem) {
                mainMenuItem.classList.add('open');
                const mainMenuLink = mainMenuItem.querySelector('a.has-submenu');
                if (mainMenuLink) {
                    mainMenuLink.classList.add('icon-only');
                }
            }

            setTimeout(() => scrollToElement(menuItem), 150);
        });
    });

    // Handler da Documentação
    const docsToggle = document.querySelector('.docs-toggle');
    const docsWrapper = document.querySelector('.docs-wrapper');
    
    if (docsToggle && docsWrapper) {
        docsToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (sidebar.classList.contains('collapsed')) return;

            const wasOpen = this.classList.contains('open');

            document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
                item.classList.remove('open', 'selected');
                const submenu = item.querySelector('.submenu');
                if (submenu) {
                    submenu.style.maxHeight = '0px';
                }
                const link = item.querySelector('a.has-submenu');
                if (link) {
                    link.classList.remove('selected', 'icon-only');
                }
            });

            if (wasOpen) {
                closeAllDocs();
            } else {
                this.classList.add('open', 'selected');
                docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                docsWrapper.classList.add('expanded');
                setTimeout(() => scrollToElement(docsWrapper), 150);
            }
        });
    }

    // Handler para botões de documentação
    document.querySelectorAll('.docs-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (sidebar.classList.contains('collapsed')) return;

            const content = this.nextElementSibling;
            const wasOpen = this.classList.contains('open');

            document.querySelectorAll('.docs-button').forEach(btn => {
                if (btn !== this) {
                    btn.classList.remove('open', 'selected');
                    const btnContent = btn.nextElementSibling;
                    if (btnContent) {
                        btnContent.classList.remove('expanded');
                        btnContent.style.maxHeight = '0px';
                    }
                }
            });

            this.classList.toggle('open', !wasOpen);
            this.classList.toggle('selected', !wasOpen);
            
            if (content) {
                content.classList.toggle('expanded', !wasOpen);
                content.style.maxHeight = !wasOpen ? `${content.scrollHeight}px` : '0px';
                
                if (!wasOpen) {
                    setTimeout(() => scrollToElement(content), 150);
                }
            }

            if (docsToggle) {
                docsToggle.classList.remove('selected');
                docsToggle.classList.add('icon-only');
            }
        });

        // Handler para itens de conteúdo da documentação
        const docContent = button.nextElementSibling;
        if (docContent) {
            const menuItems = docContent.querySelectorAll('.menu-item > a');
            menuItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (sidebar.classList.contains('collapsed')) return;

                    document.querySelectorAll('.docs-content .menu-item').forEach(mi => {
                        mi.classList.remove('selected');
                    });

                    this.parentElement.classList.add('selected');

                    const parentButton = this.closest('.docs-content').previousElementSibling;
                    if (parentButton) {
                        parentButton.classList.remove('selected');
                        parentButton.classList.add('icon-only', 'open');
                        
                        const parentContent = this.closest('.docs-content');
                        parentContent.classList.add('expanded');
                        parentContent.style.maxHeight = `${parentContent.scrollHeight}px`;
                    }

                    if (docsToggle) {
                        docsToggle.classList.remove('selected');
                        docsToggle.classList.add('icon-only', 'open');
                        docsWrapper.classList.add('expanded');
                        docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                    }

                    setTimeout(() => scrollToElement(this.parentElement), 150);
                });
            });
        }
    });

    // Previne que cliques no submenu fechem o menu pai
    document.querySelectorAll('.submenu, .docs-wrapper, .docs-content').forEach(submenu => {
        submenu.addEventListener('click', (e) => e.stopPropagation());
    });
});