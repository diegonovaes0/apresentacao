/**
 * Inicializadores específicos para cada módulo da Automato Platform
 * 
 * Este script contém funções de inicialização para cada módulo da plataforma,
 * garantindo que todos os componentes necessários sejam carregados e configurados
 * corretamente durante a navegação SPA.
 */

document.addEventListener('DOMContentLoaded', function() {
    /**
     * Inicializador para o módulo Ansible
     */
    window.initializeAnsible = function() {
        console.log('Inicializando módulo Ansible');
        
        // Verifica se os estilos CSS do módulo estão carregados
        if (window.ensureModuleCssLoaded) {
            window.ensureModuleCssLoaded('ansible');
        }
        
        // Inicializa os filtros de SO
        if (window.initializeOSFilters) {
            try {
                window.initializeOSFilters();
                console.log('Filtros de SO inicializados com sucesso');
            } catch (error) {
                console.error('Erro ao inicializar filtros de SO:', error);
            }
        }
        
        // Carrega os hosts
        if (window.loadHosts) {
            try {
                window.loadHosts(false);
                console.log('Carregamento de hosts iniciado');
            } catch (error) {
                console.error('Erro ao carregar hosts:', error);
            }
        }
        
        // Carrega as playbooks
        if (window.loadPlaybooks) {
            try {
                window.loadPlaybooks(false);
                console.log('Carregamento de playbooks iniciado');
            } catch (error) {
                console.error('Erro ao carregar playbooks:', error);
            }
        }
        
        // Configura eventos para os filtros
        if (window.setupFilterEvents) {
            try {
                window.setupFilterEvents();
                console.log('Eventos de filtros configurados');
            } catch (error) {
                console.error('Erro ao configurar eventos de filtros:', error);
            }
        }
        
        // Atualiza o painel de informações do SO
        if (window.updateOSInfoPanel) {
            try {
                window.updateOSInfoPanel();
                console.log('Painel de informações do SO atualizado');
            } catch (error) {
                console.error('Erro ao atualizar painel de informações do SO:', error);
            }
        }
        
        // Configura os botões de execução
        if (window.updateExecuteButton) {
            try {
                window.updateExecuteButton();
                console.log('Botão de execução atualizado');
            } catch (error) {
                console.error('Erro ao atualizar botão de execução:', error);
            }
        }
        
        // Configura eventos para a página Ansible
        setupAnsibleEvents();
    };
    
    /**
     * Inicializador para o módulo de Inventário
     */
    window.initializeInventory = function() {
        console.log('Inicializando módulo de Inventário');
        
        // Verifica se os estilos CSS do módulo estão carregados
        if (window.ensureModuleCssLoaded) {
            window.ensureModuleCssLoaded('inventory');
        }
        
        // Carrega os servidores
        if (window.loadServers) {
            try {
                window.loadServers();
                console.log('Carregamento de servidores iniciado');
            } catch (error) {
                console.error('Erro ao carregar servidores:', error);
            }
        }
        
        // Inicializa o formulário
        if (window.initializeForm) {
            try {
                window.initializeForm();
                console.log('Formulário inicializado');
            } catch (error) {
                console.error('Erro ao inicializar formulário:', error);
            }
        }
        
        // Configura eventos para a página de Inventário
        setupInventoryEvents();
    };
    
    /**
     * Inicializador para o módulo Terraform
     */
    window.initializeTerraform = function() {
        console.log('Inicializando módulo Terraform');
        
        // Verifica se os estilos CSS do módulo estão carregados
        if (window.ensureModuleCssLoaded) {
            window.ensureModuleCssLoaded('terraform');
        }
        
        // Carrega os módulos
        if (window.loadModules) {
            try {
                window.loadModules();
                console.log('Carregamento de módulos iniciado');
            } catch (error) {
                console.error('Erro ao carregar módulos:', error);
            }
        }
        
        // Carrega os estados
        if (window.loadStates) {
            try {
                window.loadStates();
                console.log('Carregamento de estados iniciado');
            } catch (error) {
                console.error('Erro ao carregar estados:', error);
            }
        }
        
        // Inicializa os workspaces
        if (window.initializeWorkspaces) {
            try {
                window.initializeWorkspaces();
                console.log('Workspaces inicializados');
            } catch (error) {
                console.error('Erro ao inicializar workspaces:', error);
            }
        }
        
        // Configura eventos para a página Terraform
        setupTerraformEvents();
    };
    
    /**
     * Inicializador para o módulo Python
     */
    window.initializePython = function() {
        console.log('Inicializando módulo Python');
        
        // Verifica se os estilos CSS do módulo estão carregados
        if (window.ensureModuleCssLoaded) {
            window.ensureModuleCssLoaded('python');
        }
        
        // Carrega os scripts
        if (window.loadScripts) {
            try {
                window.loadScripts();
                console.log('Carregamento de scripts iniciado');
            } catch (error) {
                console.error('Erro ao carregar scripts:', error);
            }
        }
        
        // Carrega as bibliotecas
        if (window.loadLibraries) {
            try {
                window.loadLibraries();
                console.log('Carregamento de bibliotecas iniciado');
            } catch (error) {
                console.error('Erro ao carregar bibliotecas:', error);
            }
        }
        
        // Inicializa os módulos Python
        if (window.initializePythonModules) {
            try {
                window.initializePythonModules();
                console.log('Módulos Python inicializados');
            } catch (error) {
                console.error('Erro ao inicializar módulos Python:', error);
            }
        }
        
        // Configura eventos para a página Python
        setupPythonEvents();
    };
    
    /**
     * Configura eventos específicos para a página Ansible
     */
    function setupAnsibleEvents() {
        // Seleciona todos os hosts
        const selectAllHostsBtn = document.getElementById('select-all-hosts-btn');
        if (selectAllHostsBtn) {
            selectAllHostsBtn.addEventListener('click', function() {
                if (window.toggleAllHosts) {
                    const allSelected = document.querySelectorAll('.host-banner.selected').length ===
                                     document.querySelectorAll('.host-banner.valid').length;
                    window.toggleAllHosts(!allSelected);
                }
            });
        }
        
        // Seleciona todas as playbooks
        const selectAllPlaybooksBtn = document.getElementById('select-all-playbooks');
        if (selectAllPlaybooksBtn) {
            selectAllPlaybooksBtn.addEventListener('click', function() {
                if (window.toggleAllPlaybooks) {
                    const allSelected = document.querySelectorAll('.playbook-item.selected').length ===
                                     document.querySelectorAll('.playbook-item').length;
                    window.toggleAllPlaybooks(!allSelected);
                }
            });
        }
        
        // Executar playbooks selecionadas
        const executeBtn = document.getElementById('execute-selected');
        if (executeBtn) {
            executeBtn.addEventListener('click', function() {
                if (window.executeSelectedPlaybooks) {
                    window.executeSelectedPlaybooks();
                }
            });
        }
        
        // Atualizar dados
        const refreshBtn = document.getElementById('refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                if (window.refreshAll) {
                    window.refreshAll();
                }
            });
        }
        
        // Cancelar todas as execuções
        const cancelAllBtn = document.getElementById('cancel-all');
        if (cancelAllBtn) {
            cancelAllBtn.addEventListener('click', function() {
                if (window.cancelAllExecutions) {
                    window.cancelAllExecutions();
                }
            });
        }
        
        // Toggle de debug
        const debugToggleBtn = document.getElementById('debug-toggle');
        if (debugToggleBtn) {
            debugToggleBtn.addEventListener('click', function() {
                const debugOutput = document.getElementById('debug-output');
                if (debugOutput) {
                    const isVisible = debugOutput.style.display === 'block';
                    debugOutput.style.display = isVisible ? 'none' : 'block';
                    
                    this.innerHTML = isVisible ? `
                        Mostrar Debug
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    ` : `
                        Esconder Debug
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    `;
                }
            });
        }
    }
    
    /**
     * Configura eventos específicos para a página de Inventário
     */
    function setupInventoryEvents() {
        // Formulário de servidor
        const serverForm = document.getElementById('server-form');
        if (serverForm) {
            serverForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (window.saveServer) {
                    const host = document.getElementById('host').value;
                    const usuario = document.getElementById('usuario').value;
                    const senha = document.getElementById('senha').value;
                    const os = document.getElementById('os').value;
                    const chave = document.getElementById('chave').value;
                    const originalHost = document.getElementById('original-host').value;
                    
                    window.saveServer(host, usuario, senha, os, chave, originalHost);
                }
            });
        }
        
        // Botão de cancelar edição
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (window.cancelEdit) {
                    window.cancelEdit();
                }
            });
        }
        
        // Botão para mostrar inventário
        const showInventoryBtn = document.getElementById('show-inventory-btn');
        if (showInventoryBtn) {
            showInventoryBtn.addEventListener('click', function() {
                if (window.showInventory) {
                    window.showInventory();
                }
            });
        }
        
        // Botões de fechar modal
        document.querySelectorAll('#close-modal-btn, #close-modal-btn-alt').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function() {
                    const modal = document.getElementById('inventory-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });
        
        // Botão de copiar inventário
        const copyInventoryBtn = document.getElementById('copy-inventory-btn');
        if (copyInventoryBtn) {
            copyInventoryBtn.addEventListener('click', function() {
                const inventoryText = document.getElementById('full-inventory');
                if (inventoryText && window.copyToClipboard) {
                    window.copyToClipboard(inventoryText.textContent);
                }
            });
        }
    }
    
    /**
     * Configura eventos específicos para a página Terraform
     */
    function setupTerraformEvents() {
        // Implementação para o módulo Terraform
        // A ser completado conforme necessário
    }
    
    /**
     * Configura eventos específicos para a página Python
     */
    function setupPythonEvents() {
        // Implementação para o módulo Python
        // A ser completado conforme necessário
    }
    
    /**
     * Função auxiliar para extrair o módulo atual da URL
     * @returns {string} Nome do módulo ou string vazia
     */
    function getCurrentModule() {
        const path = window.location.pathname;
        const moduleMatch = path.match(/\/module_page\/([^/]+)/);
        
        return moduleMatch && moduleMatch[1] ? moduleMatch[1] : '';
    }
    
    /**
     * Inicializa o módulo atual com base na URL
     */
    function initializeCurrentModule() {
        const currentModule = getCurrentModule();
        
        if (currentModule) {
            const initializerName = `initialize${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)}`;
            
            if (window[initializerName] && typeof window[initializerName] === 'function') {
                window[initializerName]();
            }
        }
    }
    
    // Inicializa o módulo atual ao carregar a página
    initializeCurrentModule();
    
    // Escuta ao evento de navegação SPA
    document.addEventListener('content-loaded', function() {
        // Inicializa o módulo atual após carregar o conteúdo
        initializeCurrentModule();
    });
});