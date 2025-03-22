/**
 * Script otimizado para navegação da sidebar
 * Corrige problemas de loader e interação
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elementos principais
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const loader = document.getElementById('loader');
    const footer = document.querySelector('.footer');
    const contentHeader = document.querySelector('.content-header');
    const menu = document.querySelector('.menu');

    document.querySelectorAll('a[href]:not([href^="#"]):not([href^="javascript"])').forEach(link => {
        link.addEventListener('click', (e) => {
            // Verifica se é link para outra página
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
                if (loader) {
                    loader.style.display = 'flex';
                    loader.style.opacity = '0.7';
                }
            }
        });
    });
    
    
    // Função para mostrar o loader sem bloquear a interface
    const showLoader = () => {
        if (loader) {
            loader.style.opacity = '0.7'; 
            loader.style.display = 'flex';
            // NÃO adicione pointer-events: auto aqui
            // Isso permitirá cliques através do loader
            
            // Simulamos um carregamento curto
            setTimeout(hideLoader, 300);
        }
    };
    
    // Função para esconder o loader
    const hideLoader = () => {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    };
    
    // Garante que o footer e header fiquem fixos
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
    
    // Remover elementos duplicados
    const removeDuplicates = (selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1) {
            for (let i = 1; i < elements.length; i++) {
                elements[i].remove();
            }
        }
    };
    
    removeDuplicates('.sidebar');
    removeDuplicates('.loader');
    
    // Função para atualizar visibilidade de elementos na sidebar
    const updateElementsVisibility = (isCollapsed) => {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        elements.forEach(el => {
            el.style.opacity = isCollapsed ? '0' : '1';
            el.style.visibility = isCollapsed ? 'hidden' : 'visible';
        });
    };
    
    // Restaurar estado da sidebar do localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
        if (sidebarToggle) {
            const toggleIcon = sidebarToggle.querySelector('i');
            if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
        }
        updateElementsVisibility(true);
    }
    
    // Toggle da sidebar
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            showLoader();
            const isCollapsing = !sidebar.classList.contains('collapsed');
            
            if (isCollapsing) {
                updateElementsVisibility(true);
                setTimeout(() => {
                    sidebar.classList.add('collapsed');
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
                    localStorage.setItem('sidebarCollapsed', 'true');
                }, 50);
            } else {
                sidebar.classList.remove('collapsed');
                const toggleIcon = sidebarToggle.querySelector('i');
                if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
                setTimeout(() => {
                    updateElementsVisibility(false);
                    localStorage.setItem('sidebarCollapsed', 'false');
                }, 50);
            }
        });
    }
    
    // Funções para gerenciamento de menus
    const closeAllMenus = () => {
        // Fecha todos os menus e remove seleções
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
    };
    
    const closeAllDocs = () => {
        // Fecha toda a documentação
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
    
    const openParentMenus = (element) => {
        // Abre todos os menus pais
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
    };
    
    const updateParentSubmenusHeight = (element) => {
        // Atualiza altura dos submenus pais
        if (!element || !element.parentElement) return;
        
        let parent = element.parentElement.closest('.menu-item');
        while (parent) {
            const parentSubmenu = parent.querySelector('.submenu');
            if (parentSubmenu) {
                const totalHeight = Array.from(parentSubmenu.children)
                    .reduce((height, child) => height + (child.offsetHeight || 0), 0);
                parentSubmenu.style.maxHeight = `${totalHeight}px`;
                parentSubmenu.classList.add('expanded');
            }
            parent = parent.parentElement ? parent.parentElement.closest('.menu-item') : null;
        }
    };
    
    const adjustScrollForSubmenu = (submenu) => {
        // Ajusta o scroll para mostrar o submenu expandido
        if (!submenu || !menu) return;
        
        setTimeout(() => {
            const submenuHeight = submenu.scrollHeight;
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
            // Se estiver completamente visível, não faz nada
        }, 100);
    };
    
    // Handler para itens com submenu
    document.querySelectorAll('a.has-submenu').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (sidebar && sidebar.classList.contains('collapsed')) return;
            
            showLoader();
            
            const menuItem = link.parentElement;
            const wasOpen = menuItem.classList.contains('open');
            const submenu = menuItem.querySelector('.submenu');
            
            if (wasOpen) {
                closeAllMenus();
            } else {
                closeAllMenus();
                menuItem.classList.add('open');
                link.classList.add('selected');
                
                if (submenu) {
                    submenu.classList.add('expanded');
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    openParentMenus(menuItem);
                    adjustScrollForSubmenu(submenu);
                }
            }
        });
    });
    
    // Handler para itens finais do menu (sem submenu)
    document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
        link.addEventListener('click', (e) => {
            // Se for um link real, deixa navegar normalmente
            const href = link.getAttribute('href');
            const docsToggle = document.querySelector('.docs-toggle');
            const docsWrapper = document.querySelector('.docs-wrapper');
            if (docsToggle && docsWrapper) {
                docsToggle.classList.remove('open', 'selected');
                docsWrapper.classList.remove('expanded');
                docsWrapper.style.maxHeight = '0px';
            }
    
            if (href && href !== '#' && !href.startsWith('javascript')) {
                showLoader();
                // Salva o item atual para manter selecionado
                const menuItem = link.parentElement;
                if (menuItem) {
                    localStorage.setItem('selectedMenuItem', menuItem.querySelector('a').textContent.trim());
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            if (sidebar && sidebar.classList.contains('collapsed')) return;
            
            showLoader();
            
            // Fecha todos e seleciona apenas este
            showLoader();
            
            // Fecha todos e seleciona apenas este item
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
        });
    });
    
    // Handler para toggle de documentação
    const docsToggle = document.querySelector('.docs-toggle');
    const docsWrapper = document.querySelector('.docs-wrapper');
    
    if (docsToggle && docsWrapper) {
        docsToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (sidebar && sidebar.classList.contains('collapsed')) return;
            
            showLoader();
            
            const wasOpen = docsToggle.classList.contains('open');
            closeAllMenus();
            
            if (!wasOpen) {
                // Abre a documentação
                docsToggle.classList.add('open', 'selected');
                docsWrapper.classList.add('expanded');
                docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                
                // Certifique-se que esteja visível
                if (menu) {
                    const elementRect = docsWrapper.getBoundingClientRect();
                    const menuRect = menu.getBoundingClientRect();
                    
                    if (elementRect.top < menuRect.top || elementRect.bottom > menuRect.bottom) {
                        menu.scrollTo({
                            top: docsToggle.offsetTop - 20,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        });
    }
    
    // Handler para botões de documentação
    document.querySelectorAll('.docs-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (sidebar && sidebar.classList.contains('collapsed')) return;
            
            showLoader();
            
            const content = button.nextElementSibling;
            const wasOpen = button.classList.contains('open');
            
            // Fecha outros botões de documentação
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
            
            // Toggle deste botão
            button.classList.toggle('open', !wasOpen);
            button.classList.toggle('selected', !wasOpen);
            
            if (content) {
                content.classList.toggle('expanded', !wasOpen);
                content.style.maxHeight = !wasOpen ? `${content.scrollHeight}px` : '0px';
                
                if (!wasOpen) {
                    // Ajusta scroll quando expandido
                    setTimeout(() => {
                        if (menu) {
                            const buttonRect = button.getBoundingClientRect();
                            const menuRect = menu.getBoundingClientRect();
                            const contentHeight = content.scrollHeight;
                            
                            if (buttonRect.top + contentHeight > menuRect.bottom) {
                                menu.scrollTo({
                                    top: menu.scrollTop + ((buttonRect.top + contentHeight) - menuRect.bottom) + 20,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    }, 100);
                }
            }
            
            if (docsToggle) {
                docsToggle.classList.remove('selected');
                docsToggle.classList.add('icon-only', 'open');
            }
        });
        
        // Handler para itens dentro da documentação
        const docContent = button.nextElementSibling;
        if (docContent) {
            docContent.querySelectorAll('.menu-item > a').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Se for um link real, deixa navegar normalmente
                    const href = item.getAttribute('href');
                    if (href && href !== '#' && !href.startsWith('javascript')) {
                        showLoader();
                        // Salva o item atual para manter selecionado
                        localStorage.setItem('selectedDocItem', item.textContent.trim());
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (sidebar && sidebar.classList.contains('collapsed')) return;
                    
                    showLoader();
                    
                    // Remove seleção de outros itens
                    docContent.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('selected'));
                    
                    // Seleciona este item
                    const menuItem = item.parentElement;
                    menuItem.classList.add('selected');
                    
                    // Mantém o botão pai aberto
                    const parentButton = item.closest('.docs-content').previousElementSibling;
                    if (parentButton) {
                        parentButton.classList.remove('selected');
                        parentButton.classList.add('icon-only', 'open');
                        const parentContent = item.closest('.docs-content');
                        parentContent.classList.add('expanded');
                        parentContent.style.maxHeight = `${parentContent.scrollHeight}px`;
                    }
                    
                    // Mantém a documentação aberta
                    if (docsToggle && docsWrapper) {
                        docsToggle.classList.remove('selected');
                        docsToggle.classList.add('icon-only', 'open');
                        docsWrapper.classList.add('expanded');
                        docsWrapper.style.maxHeight = 'calc(100vh - 280px)';
                    }
                    
                    // Garante que o item está visível
                    if (menu) {
                        const elementRect = menuItem.getBoundingClientRect();
                        const menuRect = menu.getBoundingClientRect();
                        
                        if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
                            menu.scrollTo({
                                top: menuItem.offsetTop - 100,
                                behavior: 'smooth'
                            });
                        }
                    }
                });
            });
        }
    });
    
    // Prevenir fechamento acidental ao clicar nos submenus
    document.querySelectorAll('.submenu, .docs-wrapper, .docs-content').forEach(submenu => {
        submenu.addEventListener('click', e => e.stopPropagation());
    });
    
    // Restaurar seleção anterior após navegação
    const restoreSelection = () => {
        const selectedMenuItem = localStorage.getItem('selectedMenuItem');
        const selectedDocItem = localStorage.getItem('selectedDocItem');
        
        if (selectedMenuItem) {
            document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
                if (link.textContent.trim() === selectedMenuItem) {
                    const menuItem = link.parentElement;
                    menuItem.classList.add('selected');
                    openParentMenus(menuItem);
                    
                    // Garante que o item está visível
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
                    
                    // Garante que o item está visível
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
    };
    
    // Aplica estilização para páginas de erro
    const applyErrorStyles = () => {
        const isErrorPage = document.querySelector('.error-container');
        
        if (isErrorPage) {
            const errorContainer = document.querySelector('.error-container');
            const errorContent = document.querySelector('.error-content');
            
            if (errorContainer) {
                errorContainer.style.display = 'flex';
                errorContainer.style.justifyContent = 'center';
                errorContainer.style.alignItems = 'center';
                errorContainer.style.minHeight = 'calc(100vh - 120px)';
                errorContainer.style.padding = '2rem';
            }
            
            if (errorContent) {
                errorContent.style.textAlign = 'center';
                errorContent.style.maxWidth = '500px';
                errorContent.style.padding = '2rem';
                errorContent.style.background = 'var(--black-smoke)';
                errorContent.style.borderRadius = '10px';
                errorContent.style.boxShadow = '0 10px 25px var(--shadow-dark)';
            }
            
            // Garante footer fixo nas páginas de erro
            if (footer) {
                footer.style.position = 'sticky';
                footer.style.bottom = '0';
                footer.style.width = '100%';
                footer.style.zIndex = '100';
            }
        }
    };
    
    // Executa as funções de restauração após carregar a página
    setTimeout(() => {
        restoreSelection();
        applyErrorStyles();
        hideLoader(); // Garante que o loader está escondido
    }, 300);
    
    // Adicionar suporte para dispositivos móveis
    const addMobileSupport = () => {
        // Verifica se o botão já existe
        if (!document.querySelector('.mobile-menu-toggle') && window.innerWidth <= 768) {
            const mobileToggle = document.createElement('button');
            mobileToggle.className = 'mobile-menu-toggle';
            mobileToggle.innerHTML = '<i class="ri-menu-line"></i>';
            mobileToggle.setAttribute('aria-label', 'Toggle Menu');
            
            const header = document.querySelector('.content-header');
            if (header) {
                header.prepend(mobileToggle);
                
                mobileToggle.addEventListener('click', () => {
                    if (sidebar) {
                        sidebar.classList.toggle('mobile-open');
                    }
                });
            }
        }
    };
    
    // Inicializa suporte móvel
    addMobileSupport();
    
    // Atualiza ao redimensionar a janela
    window.addEventListener('resize', addMobileSupport);
    
    // Garante interatividade durante o carregamento da página
    window.addEventListener('load', () => {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    });
});
