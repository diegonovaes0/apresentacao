/**
 * Script otimizado para navegação da sidebar
 * Corrige problemas de: piscadas, posicionamento, focos e menus
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elementos principais
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const loader = document.getElementById('loader');
    const footer = document.querySelector('.footer');
    const contentHeader = document.querySelector('.content-header');
    const menu = document.querySelector('.menu');
    
    // Garantir que o footer e header fiquem fixos
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
    removeDuplicates('.footer');
    
    // Reposicionar links sociais se necessário
    const socialLinks = document.querySelector('.social-links');
    if (socialLinks && menu) {
        menu.appendChild(socialLinks);
        socialLinks.style.position = 'sticky';
        socialLinks.style.bottom = '0';
        socialLinks.style.marginTop = 'auto';
        socialLinks.style.zIndex = '10';
    }
    
    // Controle de loader
    const showLoader = () => {
        if (loader) {
            loader.style.opacity = '1';
            loader.style.display = 'flex';
            document.body.classList.add('loading');
            document.body.classList.remove('loaded');
        }
    };
    
    const hideLoader = () => {
        setTimeout(() => {
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 300);
                document.body.classList.remove('loading');
                document.body.classList.add('loaded');
            }
        }, 300);
    };
    
    // Inicialização do loader
    document.body.classList.add('loading');
    window.addEventListener('load', () => {
        hideLoader();
    });
    
    // Função para atualizar visibilidade de elementos na sidebar
    const updateElementsVisibility = (isCollapsed) => {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        const method = isCollapsed ? 'add' : 'remove';
        
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
                    hideLoader();
                }, 200);
            } else {
                sidebar.classList.remove('collapsed');
                const toggleIcon = sidebarToggle.querySelector('i');
                if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
                setTimeout(() => {
                    updateElementsVisibility(false);
                    localStorage.setItem('sidebarCollapsed', 'false');
                    hideLoader();
                }, 200);
            }
        });
    }
    
    // Observador para mudanças na classe da sidebar
    if (sidebar) {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    updateElementsVisibility(sidebar.classList.contains('collapsed'));
                }
            });
        });
        observer.observe(sidebar, { attributes: true });
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
        
        // Espera pela transição para calcular a altura correta
        setTimeout(() => {
            const submenuHeight = submenu.scrollHeight;
            const elementPosition = submenu.getBoundingClientRect().top;
            const menuPosition = menu.getBoundingClientRect().top;
            const relativePosition = elementPosition - menuPosition;
            const menuHeight = menu.clientHeight;
            
            // Verifica se precisamos rolar para mostrar todo o conteúdo
            if ((relativePosition + submenuHeight) > menuHeight) {
                menu.scrollTo({
                    top: menu.scrollTop + ((relativePosition + submenuHeight) - menuHeight) + 20,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };
    
    const scrollToElement = (element) => {
        // Rola até o elemento para garantir visibilidade
        if (!element || !menu) return;
        
        setTimeout(() => {
            const elementRect = element.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            
            if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
                menu.scrollTo({
                    top: element.offsetTop - menuRect.height / 3,
                    behavior: 'smooth'
                });
            }
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
            
            // Fecha todos os menus primeiro
            closeAllMenus();
            
            if (!wasOpen) {
                // Abre este menu
                menuItem.classList.add('open');
                link.classList.add('selected');
                
                if (submenu) {
                    submenu.classList.add('expanded');
                    submenu.style.maxHeight = `${submenu.scrollHeight}px`;
                    openParentMenus(menuItem);
                    adjustScrollForSubmenu(submenu);
                }
            }
            
            hideLoader();
        });
    });
    
    // Handler para itens finais do menu (sem submenu)
    document.querySelectorAll('.menu-item > a:not(.has-submenu)').forEach(link => {
        link.addEventListener('click', (e) => {
            // Se for um link real, deixa navegar normalmente
            const href = link.getAttribute('href');
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
            
            scrollToElement(menuItem);
            hideLoader();
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
                scrollToElement(docsWrapper);
            }
            
            hideLoader();
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
                    adjustScrollForSubmenu(content);
                }
            }
            
            if (docsToggle) {
                docsToggle.classList.remove('selected');
                docsToggle.classList.add('icon-only', 'open');
            }
            
            hideLoader();
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
                    
                    scrollToElement(menuItem);
                    hideLoader();
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
                    scrollToElement(menuItem);
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
                    
                    scrollToElement(menuItem);
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
                errorContent.style.animation = 'fadeIn 0.5s ease-out';
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
        
        // Corrige tamanhos dos submenus após restauração
        document.querySelectorAll('.submenu.expanded, .docs-content.expanded').forEach(submenu => {
            submenu.style.maxHeight = `${submenu.scrollHeight}px`;
        });
        
        // Garante que elementos pais tenham altura correta
        document.querySelectorAll('.menu-item.open').forEach(item => {
            updateParentSubmenusHeight(item.querySelector('.submenu'));
        });
        
    }, 500);
    
    // Implementa detecção de navegação para mostrar loader entre páginas
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        
        if (target && 
            target.getAttribute('href') && 
            !target.getAttribute('href').startsWith('#') && 
            !target.getAttribute('href').startsWith('javascript') &&
            target.getAttribute('href') !== window.location.pathname) {
            
            showLoader();
        }
    });
    
    // Previne que elementos piscantes afetem a interação do usuário
    document.addEventListener('click', (e) => {
        if (e.target.closest('.menu-item') || 
            e.target.closest('.docs-button') || 
            e.target.closest('.docs-toggle')) {
            
            const link = e.target.closest('a');
            if (!link || 
                !link.getAttribute('href') || 
                link.getAttribute('href') === '#' || 
                link.getAttribute('href').startsWith('javascript')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true);
    
    // Melhora a responsividade em telas pequenas
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMobileLayout = (e) => {
        if (e.matches) {
            // É mobile
            if (sidebar) sidebar.classList.add('mobile-mode');
            
            // Cria o botão de toggle para mobile se não existir
            if (!document.querySelector('.mobile-menu-toggle')) {
                const mobileToggle = document.createElement('button');
                mobileToggle.className = 'mobile-menu-toggle';
                mobileToggle.innerHTML = '<i class="ri-menu-line"></i>';
                mobileToggle.setAttribute('aria-label', 'Toggle Mobile Menu');
                
                const header = document.querySelector('.content-header');
                if (header) {
                    header.prepend(mobileToggle);
                    
                    mobileToggle.addEventListener('click', () => {
                        if (sidebar) sidebar.classList.toggle('mobile-open');
                    });
                }
            }
        } else {
            // Não é mobile
            if (sidebar) sidebar.classList.remove('mobile-mode', 'mobile-open');
        }
    };
    
    // Aplicar layout mobile na inicialização
    handleMobileLayout(mediaQuery);
    // Atualizar quando o tamanho da tela mudar
    mediaQuery.addEventListener('change', handleMobileLayout);
    
    // Adiciona efeitos de hover para ícones e animações sutis
    document.querySelectorAll('.menu-icon, .tech-icon, .automation-icon').forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.15)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        icon.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Implementa transições suaves para os submenus
    const enableSmoothTransitions = () => {
        const allSubmenus = document.querySelectorAll('.submenu, .docs-content');
        
        allSubmenus.forEach(submenu => {
            // Armazena a altura máxima como atributo
            if (!submenu.hasAttribute('data-height')) {
                submenu.setAttribute('data-height', submenu.scrollHeight + 'px');
            }
            
            // Configura observador para mudanças de conteúdo
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const target = entry.target;
                    
                    if (target.classList.contains('expanded') && target.style.maxHeight !== 'none') {
                        // Atualiza a altura quando o conteúdo mudar
                        target.style.maxHeight = `${target.scrollHeight}px`;
                        target.setAttribute('data-height', target.scrollHeight + 'px');
                    }
                }
            });
            
            resizeObserver.observe(submenu);
        });
    };
    
    // Ativar transições suaves
    enableSmoothTransitions();
    
    // Fix para páginas de erro
    const setupErrorPages = () => {
        const errorContainer = document.querySelector('.error-container');
        if (!errorContainer) return;
        
        // Aplica estilos específicos para páginas de erro
        errorContainer.style.display = 'flex';
        errorContainer.style.justifyContent = 'center';
        errorContainer.style.alignItems = 'center';
        errorContainer.style.minHeight = 'calc(100vh - 120px)';
        
        // Adiciona animação de entrada
        const errorContent = errorContainer.querySelector('.error-content');
        if (errorContent) {
            errorContent.style.animation = 'fadeIn 0.5s ease-out';
        }
        
        // Garante que o footer fique fixo
        if (footer) {
            footer.style.position = 'sticky';
            footer.style.bottom = '0';
            footer.style.width = '100%';
        }
    };
    
    // Configura páginas de erro
    setupErrorPages();
    
    // Otimiza scrollbar para melhor usabilidade
    const setupCustomScrollbars = () => {
        const scrollableElements = document.querySelectorAll('.menu, .docs-wrapper, .submenu.expanded');
        
        scrollableElements.forEach(el => {
            el.classList.add('custom-scrollbar');
        });
    };
    
    setupCustomScrollbars();
    
    // Verifica e corrige a posição de todos os elementos após o carregamento
    window.addEventListener('load', () => {
        // Timeout para garantir que todos os elementos estejam renderizados
        setTimeout(() => {
            // Atualiza o tamanho de todos os submenus expandidos
            document.querySelectorAll('.submenu.expanded, .docs-content.expanded').forEach(submenu => {
                submenu.style.maxHeight = `${submenu.scrollHeight}px`;
            });
            
            // Corrige posicionamento do footer
            if (footer) {
                const contentHeight = document.querySelector('.content-area').offsetHeight;
                const windowHeight = window.innerHeight;
                
                if (contentHeight < windowHeight) {
                    footer.style.position = 'fixed';
                    footer.style.bottom = '0';
                    footer.style.width = '100%';
                } else {
                    footer.style.position = 'sticky';
                }
            }
            
            // Remove completamente o loader após a página estar pronta
            hideLoader();
        }, 800);
    });