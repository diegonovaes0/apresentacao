document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const currentPath = window.location.pathname;

    // Função para atualizar visibilidade dos elementos (textos e setas)
    function updateElementsVisibility(isCollapsed) {
        const elements = document.querySelectorAll('.menu-text, .logo-text, .menu-arrow');
        elements.forEach(el => {
            el.style.display = isCollapsed ? 'none' : 'inline';
        });
    }

    // Função para rolar até o elemento
    function scrollToElement(element) {
        const menu = document.querySelector('.menu');
        if (!menu || !element) return;
        const elementRect = element.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        if (elementRect.bottom > menuRect.bottom || elementRect.top < menuRect.top) {
            menu.scrollTo({
                top: element.offsetTop - menuRect.height / 3,
                behavior: 'smooth'
            });
        }
    }

    // Função para fechar todos os menus, exceto o especificado
    function closeAllMenus(exceptMenuItem = null) {
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item !== exceptMenuItem) {
                item.classList.remove('open');
                const submenu = item.querySelector('.submenu');
                if (submenu) {
                    submenu.classList.remove('expanded');
                    submenu.style.maxHeight = '0px';
                }
            }
        });
    }

    // Função para fechar todos os painéis de documentação
    function closeAllDocsPanels(exceptDocsButton = null) {
        document.querySelectorAll('.docs-button').forEach(button => {
            if (button !== exceptDocsButton) {
                button.classList.remove('open');
                const targetId = button.getAttribute('data-target');
                const content = document.querySelector(`.docs-content[data-id="${targetId}"]`);
                if (content) {
                    content.classList.remove('expanded');
                    content.style.maxHeight = '0px';
                }
            }
        });
        const docsToggle = document.querySelector('.docs-toggle');
        const docsWrapper = document.querySelector('.docs-wrapper');
        if (docsToggle && docsWrapper && !exceptDocsButton) {
            docsToggle.classList.remove('open');
            docsWrapper.classList.remove('expanded');
            docsWrapper.style.maxHeight = '0px';
        }
    }

    // Atualizar altura do wrapper de documentação
    function updateDocsWrapperHeight() {
        const docsWrapper = document.querySelector('.docs-wrapper');
        if (docsWrapper && docsWrapper.classList.contains('expanded')) {
            let totalHeight = 0;
            document.querySelectorAll('.docs-button').forEach(button => {
                totalHeight += button.offsetHeight;
            });
            document.querySelectorAll('.docs-content.expanded').forEach(content => {
                totalHeight += content.scrollHeight + 20;
            });
            const minHeight = Math.max(totalHeight, 300);
            docsWrapper.style.maxHeight = `${minHeight}px`;
        }
    }

    // Toggle da sidebar
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed');
        updateElementsVisibility(!isCollapsed);
        const socialLinks = document.querySelector('.social-links');
        if (socialLinks) {
            socialLinks.style.width = isCollapsed ? '260px' : '80px';
        }
    });

    // Manipulação de cliques nos itens do menu
    document.querySelectorAll('.menu-item a, .docs-toggle, .docs-button').forEach(item => {
        item.addEventListener('click', (e) => {
            const menuItem = item.closest('.menu-item');
            const isLink = item.tagName === 'A';
            const href = isLink ? item.getAttribute('href') : null;

            // Remove seleção anterior
            document.querySelectorAll('.menu-item, .docs-toggle, .docs-button')
                .forEach(el => el.classList.remove('selected'));

            // Adiciona seleção ao item clicado
            item.classList.add('selected');

            if (isLink && href && href !== '#' && href !== currentPath) {
                // Permite navegação para links válidos
                return;
            }

            // Previne comportamento padrão para links com # ou mesma página
            e.preventDefault();

            // Lógica para links de menu com submenu
            if (isLink && item.classList.contains('has-submenu')) {
                const submenu = item.nextElementSibling;
                if (submenu && submenu.classList.contains('submenu')) {
                    closeAllMenus(menuItem);
                    closeAllDocsPanels();
                    menuItem.classList.toggle('open');
                    submenu.classList.toggle('expanded');
                    submenu.style.maxHeight = submenu.classList.contains('expanded') ? 
                        `${submenu.scrollHeight}px` : '0';
                    if (submenu.classList.contains('expanded')) {
                        scrollToElement(submenu);
                    }
                }
                return;
            }

            // Lógica para botão principal de documentação
            if (item.classList.contains('docs-toggle')) {
                const docsWrapper = document.querySelector('.docs-wrapper');
                if (docsWrapper) {
                    closeAllMenus();
                    closeAllDocsPanels();
                    item.classList.toggle('open');
                    docsWrapper.classList.toggle('expanded');
                    docsWrapper.style.maxHeight = docsWrapper.classList.contains('expanded') ? 
                        '500px' : '0';
                    if (docsWrapper.classList.contains('expanded')) {
                        setTimeout(updateDocsWrapperHeight, 200);
                        scrollToElement(docsWrapper);
                    }
                }
                return;
            }

            // Lógica para botões de documentação interna
            if (item.classList.contains('docs-button')) {
                const targetId = item.getAttribute('data-target');
                const targetContent = document.querySelector(`.docs-content[data-id="${targetId}"]`);
                if (targetContent) {
                    closeAllMenus();
                    closeAllDocsPanels(item);
                    item.classList.toggle('open');
                    targetContent.classList.toggle('expanded');
                    targetContent.style.maxHeight = targetContent.classList.contains('expanded') ? 
                        `${targetContent.scrollHeight}px` : '0';
                    const docsToggle = document.querySelector('.docs-toggle');
                    const docsWrapper = document.querySelector('.docs-wrapper');
                    if (docsToggle && docsWrapper) {
                        docsToggle.classList.add('open');
                        docsWrapper.classList.add('expanded');
                        setTimeout(() => {
                            updateDocsWrapperHeight();
                            scrollToElement(targetContent);
                        }, 200);
                    }
                }
            }
        });
    });

    // Ajustes de responsividade
    window.addEventListener('resize', () => {
        document.querySelectorAll('.submenu.expanded').forEach(submenu => {
            submenu.style.maxHeight = `${submenu.scrollHeight}px`;
        });
        updateDocsWrapperHeight();
    });

    // Configuração inicial
    if (sidebar.classList.contains('collapsed')) {
        updateElementsVisibility(true);
    }
});