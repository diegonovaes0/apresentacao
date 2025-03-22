document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos principais
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const loader = document.getElementById('loader');
    const footer = document.querySelector('.footer');
    const contentHeader = document.querySelector('.content-header');

    // Garantir que footer e header fiquem fixos independente da página
    if (footer) {
        footer.style.position = 'sticky';
        footer.style.bottom = '0';
        footer.style.zIndex = '100';
    }

    if (contentHeader) {
        contentHeader.style.position = 'sticky';
        contentHeader.style.top = '0';
        contentHeader.style.zIndex = '100';
    }

    // Remover sidebars duplicadas (se existirem)
    const sidebars = document.querySelectorAll('.sidebar');
    if (sidebars.length > 1) {
        for (let i = 1; i < sidebars.length; i++) {
            sidebars[i].remove();
        }
    }

    // Função para mostrar o loader durante a navegação
    const showLoader = () => {
        document.body.classList.add('loading');
        document.body.classList.remove('loaded');
        if (loader) {
            loader.style.opacity = '1';
            loader.style.pointerEvents = 'auto';
        }
    };

    // Função para esconder o loader após carregamento
    const hideLoader = () => {
        setTimeout(() => {
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.pointerEvents = 'none';
            }
        }, 300);
    };

    // Controle de visibilidade dos elementos da sidebar
    const updateElementsVisibility = (isCollapsed) => {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        elements.forEach(el => {
            el.style.opacity = isCollapsed ? '0' : '1';
            el.style.visibility = isCollapsed ? 'hidden' : 'visible';
        });
    };

    // Função para ajustar scroll quando um submenu é expandido
    const adjustScrollForSubmenu = (submenu) => {
        // Calcula o espaço necessário
        const submenuHeight = submenu.scrollHeight;
        const menu = document.querySelector('.menu');
        
        if (menu) {
            // Ajusta o menu para acomodar o submenu expandido
            const currentScroll = menu.scrollTop;
            const elementPosition = submenu.getBoundingClientRect().top;
            const menuPosition = menu.getBoundingClientRect().top;
            const relativePosition = elementPosition - menuPosition;
            
            // Calcula se o submenu está na parte inferior
            const menuHeight = menu.clientHeight;
            const needsScroll = (relativePosition + submenuHeight) > menuHeight;
            
            if (needsScroll) {
                menu.scrollTo({
                    top: currentScroll + ((relativePosition + submenuHeight) - menuHeight) + 20,
                    behavior: 'smooth'
                });
            }
        }
    };

    // Função para rolar até um elemento com ajuste para submenu expandido
    const scrollToElement = (element) => {
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
    };

    // Função para fechar todos os menus
    const closeAllMenus = () => {
        document.querySelectorAll('.menu-item.open, .menu-item.selected').forEach(item => {
            item.classList.remove('open', 'selected');
            const submenu = item.querySelector('.submenu');
            if (submenu) submenu.style.maxHeight = '0px';
            const link = item.querySelector('a.has-submenu');
            if (link) link.classList.remove('selected', 'icon-only');
        });
        closeAllDocs();
    };

    // Função para fechar toda a documentação
    const closeAllDocs = () => {
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
    };

    // Função para abrir menus pais
    const openParentMenus = (element) => {
        let current = element;
        while (current && current.classList.contains('menu-item')) {
            current.classList.add('open');
            const submenu = current.querySelector('.submenu');
            if (submenu) {
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                updateParentSubmenusHeight(submenu);
            }
            current = current.parentElement.closest('.menu-item');
        }
    };

    // Função para atualizar altura dos submenus pais
    const updateParentSubmenusHeight = (element) => {
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
    };

    // Gerenciamento do loader global
    document.body.classList.add('loading');
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
        }, 300);
    });

    // Restaurar estado da sidebar
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        sidebarToggle.querySelector('i').style.transform = 'rotate(180deg)';
        updateElementsVisibility(true);
    } else {
        sidebar.classList.remove('collapsed');
        sidebarToggle.querySelector('i').style.transform = 'rotate(0deg)';
        updateElementsVisibility(false);
    }

    // Toggle da sidebar - mantém o loader para simulação de carregamento
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            showLoader();
            const isCollapsing = !sidebar.classList.contains('collapsed');
            if (isCollapsing) {
                updateElementsVisibility(true);
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    sidebarToggle.querySelector('i').style.transform = 'rotate(180deg)';
                    localStorage.setItem('sidebarCollapsed', 'true');
                    hideLoader();
                }, 300);
            } else {
                sidebar.classList.remove('collapsed');
                sidebarToggle.querySelector('i').style.transform = 'rotate(0deg)';
                setTimeout(() => {
                    updateElementsVisibility(false);
                    hideLoader();
                }, 300);
                localStorage.setItem('sidebarCollapsed', 'false');
            }
        });
    }

    // Observer para mudanças no estado collapsed
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'class') {
                updateElementsVisibility(sidebar.classList.contains('collapsed'));
            }
        });
    });
    observer.observe(sidebar, { attributes: true });

    // Handler para itens com submenu
    document.querySelectorAll('a.has-submenu').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLoader();
            
            if (sidebar.classList.contains('collapsed')) {
                hideLoader();
                return;
            }

            const menuItem = link.parentElement;
            const wasOpen = menuItem.classList.contains('open');
            const submenu = menuItem.querySelector('.submenu');

            if (wasOpen) {
                closeAllMenus();
                hideLoader();
            } else {
                closeAllMenus();
                menuItem.classList.add('open');
                link.classList.add('selected');
                if (submenu) {
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    openParentMenus(menuItem);
                    setTimeout(() => {
                        adjustScrollForSubmenu(submenu);
                        hideLoader();
                    }, 300);
                } else {
                    hideLoader();
                }
            }
        });
    });

    // Handler para itens finais do menu - mantém o item selecionado
    document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript')) {
                showLoader();
                // Salva o item atual no localStorage para manter selecionado após navegação
                const menuItem = link.parentElement;
                if (menuItem) {
                    localStorage.setItem('selectedMenuItem', menuItem.querySelector('a').textContent.trim());
                }
                return; // Permite navegação sem interferência
            }

            e.preventDefault();
            e.stopPropagation();
            showLoader();
            
            if (sidebar.classList.contains('collapsed')) {
                hideLoader();
                return;
            }

            closeAllMenus();
            const menuItem = link.parentElement;
            menuItem.classList.add('selected');
            openParentMenus(menuItem);

            const mainMenuItem = menuItem.closest('.menu > .menu-item');
            if (mainMenuItem) {
                mainMenuItem.classList.add('open');
                const mainMenuLink = mainMenuItem.querySelector('a.has-submenu');
                if (mainMenuLink) mainMenuLink.classList.add('icon-only');
            }

            setTimeout(() => {
                scrollToElement(menuItem);
                hideLoader();
            }, 300);
        });
    });

    // Handler da documentação
    const docsToggle = document.querySelector('.docs-toggle');
    const docsWrapper = document.querySelector('.docs-wrapper');
    if (docsToggle && docsWrapper) {
        docsToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLoader();
            
            if (sidebar.classList.contains('collapsed')) {
                hideLoader();
                return;
            }

            const wasOpen = docsToggle.classList.contains('open');
            closeAllMenus();

            if (!wasOpen) {
                docsToggle.classList.add('open', 'selected');
                docsWrapper.classList.add('expanded');
                docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                setTimeout(() => {
                    scrollToElement(docsWrapper);
                    hideLoader();
                }, 300);
            } else {
                hideLoader();
            }
        });
    }

    // Handler para botões de documentação
    document.querySelectorAll('.docs-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLoader();
            
            if (sidebar.classList.contains('collapsed')) {
                hideLoader();
                return;
            }

            const content = button.nextElementSibling;
            const wasOpen = button.classList.contains('open');

            document.querySelectorAll('.docs-button').forEach(btn => {
                if (btn !== button) {
                    btn.classList.remove('open', 'selected');
                    const btnContent = btn.nextElementSibling;
                    if (btnContent) {
                        btnContent.classList.remove('expanded');
                        btnContent.style.maxHeight = '0px';
                    }
                }
            });

            button.classList.toggle('open', !wasOpen);
            button.classList.toggle('selected', !wasOpen);
            if (content) {
                content.classList.toggle('expanded', !wasOpen);
                content.style.maxHeight = !wasOpen ? `${content.scrollHeight}px` : '0px';
                if (!wasOpen) {
                    setTimeout(() => {
                        adjustScrollForSubmenu(content);
                        hideLoader();
                    }, 300);
                } else {
                    hideLoader();
                }
            } else {
                hideLoader();
            }

            if (docsToggle) {
                docsToggle.classList.remove('selected');
                docsToggle.classList.add('icon-only');
            }
        });

        const docContent = button.nextElementSibling;
        if (docContent) {
            docContent.querySelectorAll('.menu-item > a').forEach(item => {
                item.addEventListener('click', (e) => {
                    const href = item.getAttribute('href');
                    if (href && href !== '#' && !href.startsWith('javascript')) {
                        showLoader();
                        // Salva o item atual no localStorage
                        localStorage.setItem('selectedDocItem', item.textContent.trim());
                        return; // Permite navegação
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    showLoader();
                    
                    if (sidebar.classList.contains('collapsed')) {
                        hideLoader();
                        return;
                    }

                    docContent.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('selected'));
                    const menuItem = item.parentElement;
                    menuItem.classList.add('selected');

                    const parentButton = item.closest('.docs-content').previousElementSibling;
                    if (parentButton) {
                        parentButton.classList.remove('selected');
                        parentButton.classList.add('icon-only', 'open');
                        const parentContent = item.closest('.docs-content');
                        parentContent.classList.add('expanded');
                        parentContent.style.maxHeight = `${parentContent.scrollHeight}px`;
                    }

                    if (docsToggle) {
                        docsToggle.classList.remove('selected');
                        docsToggle.classList.add('icon-only', 'open');
                        docsWrapper.classList.add('expanded');
                        docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                    }

                    setTimeout(() => {
                        scrollToElement(menuItem);
                        hideLoader();
                    }, 300);
                });
            });
        }
    });

    // Prevenir fechamento de menus pais ao clicar em submenus
    document.querySelectorAll('.submenu, .docs-wrapper, .docs-content').forEach(submenu => {
        submenu.addEventListener('click', e => e.stopPropagation());
    });

    // Restaurar seleção após navegação
    const restoreSelection = () => {
        const selectedMenuItem = localStorage.getItem('selectedMenuItem');
        const selectedDocItem = localStorage.getItem('selectedDocItem');

        if (selectedMenuItem) {
            document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
                if (link.textContent.trim() === selectedMenuItem) {
                    const menuItem = link.parentElement;
                    menuItem.classList.add('selected');
                    openParentMenus(menuItem);
                }
            });
        }

        if (selectedDocItem) {
            document.querySelectorAll('.docs-content .menu-item > a').forEach(item => {
                if (item.textContent.trim() === selectedDocItem) {
                    const menuItem = item.parentElement;
                    menuItem.classList.add('selected');
                    
                    const parentContent = item.closest('.docs-content');
                    if (parentContent) {
                        parentContent.classList.add('expanded');
                        parentContent.style.maxHeight = `${parentContent.scrollHeight}px`;
                        
                        const parentButton = parentContent.previousElementSibling;
                        if (parentButton) {
                            parentButton.classList.add('open');
                        }
                    }
                    
                    if (docsToggle && docsWrapper) {
                        docsToggle.classList.add('open');
                        docsWrapper.classList.add('expanded');
                        docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                    }
                }
            });
        }
    };

    // Chama a função após o carregamento completo
    setTimeout(restoreSelection, 500);
    
    // Adiciona tratamento para erros 404 e 500
    const isErrorPage = document.querySelector('.error-container');
    if (isErrorPage) {
        // Ajuste de estilos para páginas de erro
        const errorContainer = document.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.style.display = 'flex';
            errorContainer.style.justifyContent = 'center';
            errorContainer.style.alignItems = 'center';
            errorContainer.style.minHeight = 'calc(100vh - 120px)';
            errorContainer.style.padding = '2rem';
        }
        
        const errorContent = document.querySelector('.error-content');
        if (errorContent) {
            errorContent.style.textAlign = 'center';
            errorContent.style.maxWidth = '500px';
            errorContent.style.padding = '2rem';
            errorContent.style.background = 'var(--black-smoke)';
            errorContent.style.borderRadius = '10px';
            errorContent.style.boxShadow = '0 10px 25px var(--shadow-dark)';
        }
        
        // Garante que o footer e header permaneçam fixos também nas páginas de erro
        if (footer) {
            footer.style.position = 'sticky';
            footer.style.bottom = '0';
            footer.style.width = '100%';
        }
    }
});