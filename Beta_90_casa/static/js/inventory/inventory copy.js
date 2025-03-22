/**
 * Módulo de Gerenciamento de Inventário - Versão Otimizada
 * Preparada para integração com o SPA da Automato Platform
 */
const InventoryManager = (function() {
    // Cache de elementos DOM
    let elements = {};
    
    // Estado do módulo
    let state = {
        editMode: false,
        originalHost: null,
        existingHosts: new Set(),
        deleteCooldown: false,
        inventoryVisible: false
    };

    function initialize() {
        console.log('Inicializando módulo de Inventário');
        cacheElements();
        ensureCenterMessageModal();
        setupEventListeners();
        loadServers();
        console.log('Módulo de Inventário inicializado com sucesso');
    }

    function reinitialize() {
        elements = {};
        initialize();
    }
    
    function cacheElements() {
        elements = {
            serverForm: document.getElementById('server-form'),
            hostInput: document.getElementById('host'),
            userInput: document.getElementById('usuario'),
            passwordInput: document.getElementById('senha'),
            keyInput: document.getElementById('chave'),
            osSelect: document.getElementById('os'),
            submitBtn: document.getElementById('submit-btn'),
            submitText: document.getElementById('submit-text'),
            cancelBtn: document.getElementById('cancel-btn'),
            formTitle: document.getElementById('form-title'),
            serversList: document.getElementById('servers-list'),
            showInventoryBtn: document.getElementById('show-inventory-btn'),
            closeModalBtn: document.getElementById('close-modal-btn'),
            closeModalBtnAlt: document.getElementById('close-modal-btn-alt'),
            copyInventoryBtn: document.getElementById('copy-inventory-btn'),
            inventoryModal: document.getElementById('inventory-modal'),
            fullInventory: document.getElementById('full-inventory'),
            feedbackContainer: document.getElementById('feedback-container'),
            centerMessageModal: document.getElementById('center-message-modal'),
            importBtn: document.getElementById('import-inventory-btn'),
            exportBtn: document.getElementById('export-inventory-btn'),
            fileInput: document.getElementById('inventory-file-input'),
            exportTemplateBtn: document.getElementById('export-template-btn')
        };
        
        // Adiciona elemento para o botão de atualização de inventário se estiver na página
        if (document.querySelector('.inventory-controls')) {
            // Adiciona o botão de atualização de inventário se não existir
            if (!document.getElementById('refresh-inventory-btn')) {
                const refreshBtn = document.createElement('button');
                refreshBtn.id = 'refresh-inventory-btn';
                refreshBtn.className = 'inventory-btn';
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Atualizar Inventário';
                document.querySelector('.inventory-controls').appendChild(refreshBtn);
            }
            elements.refreshInventoryBtn = document.getElementById('refresh-inventory-btn');
        }
    }

    
    
    function ensureCenterMessageModal() {
        if (elements.centerMessageModal) return;
        
        const modal = document.createElement('div');
        modal.id = 'center-message-modal';
        modal.className = 'center-message-modal';
        
        modal.innerHTML = `
            <div class="center-message-content">
                <div class="center-message-title">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Aviso</span>
                </div>
                <div class="center-message-text" id="center-message-text">
                    Mensagem aqui
                </div>
                <button class="center-message-button" id="center-message-button">OK</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        elements.centerMessageModal = modal;
        
        document.getElementById('center-message-button').addEventListener('click', function() {
            elements.centerMessageModal.style.display = 'none';
        });

        // Adiciona estilos específicos para o modal de mensagem se não existirem
        if (!document.getElementById('center-message-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'center-message-modal-styles';
            styles.textContent = `
                .center-message-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                }
                .center-message-content {
                    background-color: white;
                    padding: 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    width: 100%;
                    max-width: 400px;
                    display: flex;
                    flex-direction: column;
                }
                .center-message-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 1.2em;
                    font-weight: 600;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #eee;
                }
                .center-message-text {
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                .center-message-button {
                    align-self: flex-end;
                    background-color: var(--accent-blue, #3498db);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.3s;
                }
                .center-message-button:hover {
                    background-color: var(--accent-blue-dark, #2980b9);
                }
            `;
            document.head.appendChild(styles);
        }
    }

    function setupEventListeners() {
        if (elements.serverForm) {
            elements.serverForm.addEventListener('submit', handleFormSubmit);
        }
        
        if (elements.serversList) {
            elements.serversList.addEventListener('click', handleServersListClick);
        }
        
        if (elements.exportTemplateBtn) {
            elements.exportTemplateBtn.addEventListener('click', handleExportTemplateClick);
        }
        
        if (elements.showInventoryBtn) {
            elements.showInventoryBtn.addEventListener('click', toggleInventoryModal);
        }
        
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', closeModal);
        }
        
        if (elements.closeModalBtnAlt) {
            elements.closeModalBtnAlt.addEventListener('click', closeModal);
        }
        
        if (elements.importBtn) {
            elements.importBtn.addEventListener('click', handleImportClick);
        }
        
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', handleExportClick);
        }
        
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileImport);
        }
        
        if (elements.inventoryModal) {
            elements.inventoryModal.addEventListener('click', function(e) {
                if (e.target === elements.inventoryModal) closeModal();
            });
        }
        
        if (elements.copyInventoryBtn) {
            elements.copyInventoryBtn.addEventListener('click', copyInventoryToClipboard);
        }
        
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', resetForm);
        }
        
        // Adiciona listener para o botão de atualização de inventário
        if (elements.refreshInventoryBtn) {
            elements.refreshInventoryBtn.addEventListener('click', handleRefreshInventory);
        }
    }

    // Função para atualizar o inventário
    async function handleRefreshInventory() {
        try {
            if (!elements.refreshInventoryBtn) return;
            
            elements.refreshInventoryBtn.disabled = true;
            elements.refreshInventoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';

            const response = await fetch('/inventory/refresh-inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (response.ok) {
                showMessage(data.message, 'success');
                loadServers(); // Recarrega a lista de servidores
            } else {
                showMessage(data.message || 'Erro ao atualizar inventário', 'error');
            }
        } catch (error) {
            showMessage('Erro ao atualizar inventário: ' + error.message, 'error');
            console.error('Erro na atualização do inventário:', error);
        } finally {
            if (elements.refreshInventoryBtn) {
                elements.refreshInventoryBtn.disabled = false;
                elements.refreshInventoryBtn.innerHTML = '<i class="fas fa-sync"></i> Atualizar Inventário';
            }
        }
    }

    function handleExportClick(format = 'yaml') {
        try {
          const button = document.querySelector('#exportDropdown');
          if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
          }
      
          // Redirecionar para o endpoint de exportação com o formato especificado
          window.location.href = `/inventory/export-inventory?format=${format}`;
          
          // Restaurar o botão após um breve período
          setTimeout(() => {
            if (button) {
              button.disabled = false;
              button.innerHTML = '<i class="ri-download-line"></i> Exportar Inventário';
            }
          }, 1000);
          
          // Mostrar mensagem de sucesso após o download começar
          setTimeout(() => {
            if (window.InventoryManager && typeof window.InventoryManager.showMessage === 'function') {
              window.InventoryManager.showMessage('Download do inventário iniciado!', 'success');
            }
          }, 1500);
        } catch (error) {
          console.error('Erro na exportação:', error);
          if (window.InventoryManager && typeof window.InventoryManager.showMessage === 'function') {
            window.InventoryManager.showMessage('Erro ao exportar inventário: ' + error.message, 'error');
          } else {
            alert('Erro ao exportar inventário: ' + error.message);
          }
        }
      }
      

    document.addEventListener('DOMContentLoaded', function() {
        // Manipulador para o botão de importação no modal Bootstrap
        const importButton = document.getElementById('importButton');
        if (importButton) {
          importButton.addEventListener('click', function() {
            const fileInput = document.getElementById('inventoryFile');
            if (!fileInput.files || fileInput.files.length === 0) {
              alert('Por favor, selecione um arquivo para importar.');
              return;
            }
            
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('inventory_file', file);
            
            // Mostrar indicador de carregamento
            importButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Importando...';
            importButton.disabled = true;
            
            fetch('/import-inventory', {
              method: 'POST',
              body: formData,
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                // Mostrar mensagem de sucesso usando a função do InventoryManager
                if (window.InventoryManager && typeof window.InventoryManager.showMessage === 'function') {
                  window.InventoryManager.showMessage(data.message, 'success');
                } else {
                  alert(data.message);
                }
                
                // Fechar o modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (modal) {
                  modal.hide();
                }
                
                // Recarregar a lista de servidores
                if (window.InventoryManager && typeof window.InventoryManager.loadServers === 'function') {
                  window.InventoryManager.loadServers();
                } else {
                  // Se não conseguir acessar o InventoryManager, recarregar a página
                  setTimeout(() => window.location.reload(), 1000);
                }
              } else {
                // Mostrar mensagem de erro
                if (window.InventoryManager && typeof window.InventoryManager.showMessage === 'function') {
                  window.InventoryManager.showMessage(data.message || 'Erro ao importar inventário', 'error');
                } else {
                  alert('Erro: ' + (data.message || 'Erro ao importar inventário'));
                }
              }
            })
            .catch(error => {
              console.error('Erro na importação:', error);
              if (window.InventoryManager && typeof window.InventoryManager.showMessage === 'function') {
                window.InventoryManager.showMessage('Erro ao processar a importação: ' + error.message, 'error');
              } else {
                alert('Erro ao processar a importação. Verifique o console para mais detalhes.');
              }
            })
            .finally(() => {
              // Restaurar o botão
              importButton.innerHTML = 'Importar';
              importButton.disabled = false;
            });
          });
        }
      });
    
    // Função ajustada para exportar template
    async function handleExportTemplateClick() {
        try {
            elements.exportTemplateBtn.disabled = true;
            elements.exportTemplateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando Template...';

            // Abre o endpoint diretamente no navegador para iniciar o download
            window.location.href = '/inventory/export-inventory-template';

            // Aguarda um momento para garantir que o download começou
            await new Promise(resolve => setTimeout(resolve, 1000));
            showMessage('Template de inventário exportado com sucesso!', 'success');
        } catch (error) {
            showMessage('Erro ao exportar template: ' + error.message, 'error');
            console.error('Erro na exportação do template:', error);
        } finally {
            elements.exportTemplateBtn.disabled = false;
            elements.exportTemplateBtn.innerHTML = '<i class="fas fa-file-download"></i> Exportar Template';
        }
    }

    // Função para importar arquivo melhorada
    async function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) {
            showMessage('Nenhum arquivo selecionado', 'error');
            return;
        }
    
        try {
            const text = await file.text();
            let importData;
    
            // Verifica se o arquivo é JSON
            if (file.name.toLowerCase().endsWith('.json')) {
                try {
                    importData = JSON.parse(text);
                    console.log('Conteúdo JSON válido:', importData);
                } catch (jsonError) {
                    throw new Error('Arquivo JSON inválido: ' + jsonError.message);
                }
            } else {
                // Assume que é um arquivo de texto (template)
                console.log('Conteúdo bruto do arquivo de texto:', text);
                
                if (!text.trim()) {
                    throw new Error('O arquivo está vazio');
                }
                
                // Converte o texto do template para JSON
                const lines = text.split('\n').map(line => line.trim());
                let currentServer = null;
                const servers = [];
                
                for (const line of lines) {
                    // Ignora comentários e linhas vazias
                    if (line.startsWith('#') || !line) continue;
                    
                    // Verifica se é uma nova seção de servidor
                    if (line === '[server]') {
                        if (currentServer && currentServer.host) {
                            servers.push(currentServer);
                        }
                        currentServer = {};
                        continue;
                    }
                    
                    // Processa pares chave=valor
                    if (line.includes('=') && currentServer !== null) {
                        const [key, value] = line.split('=').map(part => part.trim());
                        if (key && value !== undefined) {
                            currentServer[key] = value;
                        }
                    }
                }
                
                // Adiciona o último servidor se existir
                if (currentServer && currentServer.host) {
                    servers.push(currentServer);
                }
                
                if (servers.length === 0) {
                    throw new Error('Nenhum servidor válido encontrado no arquivo');
                }
                
                importData = { servers };
            }
            
            console.log('Dados processados para importação:', importData);
            
            // Envia os dados para o endpoint de importação
            const response = await fetch('/import_servers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importData)
            });
            
            const responseData = await response.json();
            
            if (response.ok) {
                showMessage(responseData.message || 'Inventário importado com sucesso!', 'success');
                loadServers(); // Recarrega a lista após importação
            } else {
                showMessage(responseData.message || 'Erro ao importar inventário', 'error');
            }
        } catch (error) {
            showMessage('Erro ao importar arquivo: ' + error.message, 'error');
            console.error('Erro na importação:', error);
        } finally {
            elements.fileInput.value = ''; // Limpa o campo de arquivo
        }
    }

    async function handleUpdateHost(updateBtn) {
        const host = updateBtn.dataset.host;
        
        try {
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const response = await fetch('/inventory/update-host', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host })
            });

            const data = await response.json();
            
            if (response.ok) {
                showMessage(`Host ${host} atualizado com sucesso!`, 'success');
                updateHostRow(host, data);
            } else {
                showMessage(data.message || 'Erro ao atualizar host', 'error');
            }
        } catch (error) {
            showMessage('Erro ao atualizar host: ' + error.message, 'error');
            console.error('Erro na atualização:', error);
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="fas fa-sync"></i>';
        }
    }

    function updateHostRow(host, data) {
        const row = Array.from(elements.serversList.querySelectorAll('tr')).find(
            tr => tr.cells[0].textContent === host
        );
        if (row) {
            // Verifica se já existe uma célula de status
            if (row.cells.length >= 5) {
                const statusCell = row.querySelector('.status-cell') || row.cells[3];
                statusCell.className = 'status-cell';
                statusCell.innerHTML = data.valid ? 
                    '<span class="inventory-badge success"><i class="fas fa-check"></i> Ativo</span>' : 
                    '<span class="inventory-badge error"><i class="fas fa-times"></i> Inativo</span>';
            } else {
                console.warn('Estrutura da tabela não possui célula de status');
            }
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const host = elements.hostInput.value.trim();
        
        if (!isValidIP(host)) {
            showMessage('IP inválido! Use o formato correto (ex: 192.168.1.1)', 'error');
            return;
        }
        
        if (!state.editMode && state.existingHosts.has(host)) {
            showMessage('Este servidor já existe no inventário', 'error');
            return;
        }
        const serverData = {
            host,
            ssh_user: elements.userInput.value.trim(),
            ssh_pass: elements.passwordInput.value,
            ssh_key_content: elements.keyInput.value.trim(),
            os: elements.osSelect.value,
            os_distribution: document.getElementById('os_distribution').value,
            os_version: document.getElementById('os_version').value,
            original_host: state.originalHost
        };

        saveServer(serverData);
    }
    
    
    
    async function saveServer(serverData) {
        try {
            elements.submitBtn.disabled = true;
            const originalButtonText = elements.submitBtn.innerHTML;
            elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
            const response = await fetch('/add_server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverData)
            });
    
            const data = await response.json();
            
            if (response.ok) {
                showMessage(data.message, 'success');
                resetForm();
                loadServers();
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            showMessage('Erro ao salvar servidor', 'error');
            console.error('Erro ao salvar servidor:', error);
        } finally {
            elements.submitBtn.disabled = false;
            elements.submitBtn.innerHTML = state.editMode ? 
                '<i class="fas fa-sync"></i> Atualizar Servidor' : 
                '<i class="fas fa-plus"></i> Adicionar Servidor';
        }
    }
    
    function handleServersListClick(e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const updateBtn = e.target.closest('.btn-update');

        if (editBtn) {
            handleEditServer(editBtn);
        }
        if (deleteBtn && !state.deleteCooldown) {
            handleDeleteServer(deleteBtn);
        }
        if (updateBtn) {
            handleUpdateHost(updateBtn);
        }
    }
    
    function handleEditServer(editBtn) {
        const serverData = JSON.parse(editBtn.dataset.server);
        elements.hostInput.value = serverData.host;
        elements.userInput.value = serverData.ssh_user;
        elements.passwordInput.value = serverData.ssh_pass || '';
        elements.keyInput.value = serverData.ssh_key_content || '';
        elements.osSelect.value = serverData.os;
        state.editMode = true;
        state.originalHost = serverData.host;
        elements.formTitle.textContent = 'Editar Servidor';
        elements.submitText.textContent = 'Atualizar Servidor';
        if (elements.cancelBtn) {
            elements.cancelBtn.style.display = 'inline-flex';
        }
        elements.hostInput.focus();
    }
    
    async function handleDeleteServer(deleteBtn) {
        const host = deleteBtn.dataset.host;
        const confirmed = confirm(`Deseja realmente remover o servidor ${host}?`);
        if (!confirmed) return;
        
        state.deleteCooldown = true;
        
        try {
            const response = await fetch('/remove_server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(data.message, 'success');
                loadServers();
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            showMessage('Erro ao remover servidor', 'error');
            console.error('Erro ao remover servidor:', error);
        } finally {
            setTimeout(() => {
                state.deleteCooldown = false;
            }, 1000);
        }
    }
    
    async function toggleInventoryModal() {
        if (state.inventoryVisible) {
            closeModal();
        } else {
            await showInventoryModal();
        }
    }
    
    async function showInventoryModal() {
        if (!elements.showInventoryBtn || !elements.inventoryModal) return;
        
        elements.showInventoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        elements.showInventoryBtn.disabled = true;

        try {
            const response = await fetch('/show-inventory');
            if (!response.ok) {
                throw new Error('Erro ao carregar inventário');
            }
            
            const data = await response.json();
            
            if (elements.fullInventory) {
                elements.fullInventory.textContent = data.inventory;
            }
            
            elements.inventoryModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            state.inventoryVisible = true;
            elements.showInventoryBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Fechar Inventário';
        } catch (error) {
            showMessage('Erro ao carregar inventário. Por favor, tente novamente.', 'error');
            console.error('Erro ao carregar inventário:', error);
        } finally {
            elements.showInventoryBtn.disabled = false;
        }
    }
    
    function closeModal() {
        if (!elements.inventoryModal || !elements.showInventoryBtn) return;
        elements.inventoryModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        state.inventoryVisible = false;
        elements.showInventoryBtn.innerHTML = '<i class="fas fa-eye"></i> Mostrar Inventário';
    }
    
    function copyInventoryToClipboard() {
        if (!elements.fullInventory || !elements.copyInventoryBtn) return;
        const text = elements.fullInventory.textContent;
        navigator.clipboard.writeText(text)
            .then(() => {
                elements.copyInventoryBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    elements.copyInventoryBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                }, 2000);
                showMessage('Inventário copiado para a área de transferência!', 'success');
            })
            .catch(err => {
                showMessage('Erro ao copiar texto', 'error');
                console.error('Erro ao copiar:', err);
            });
    }
    
    async function loadServers() {
        try {
            const response = await fetch('/get-inventory');
            if (!response.ok) {
                throw new Error('Erro ao carregar servidores');
            }
            const data = await response.json();
            state.existingHosts = new Set(data.servers.map(server => server.host));
            renderServers(data.servers);
            return data.servers;
        } catch (error) {
            showMessage(error.message, 'error');
            console.error('Erro ao carregar servidores:', error);
            return [];
        }
    }
    
    function renderServers(servers) {
        if (!elements.serversList) return;
        
        elements.serversList.innerHTML = '';
        
        if (servers.length === 0) {
            renderEmptyState();
            return;
        }
        
        // Verifica se precisamos adicionar cabeçalho de Status na tabela
        const tableHeader = document.querySelector('table.table thead tr');
        const needStatusColumn = tableHeader && 
                                Array.from(tableHeader.cells)
                                    .every(cell => cell.textContent.trim() !== 'Status');
        
        if (needStatusColumn && tableHeader) {
            // Adiciona coluna de status após a coluna Sistema
            const newCell = document.createElement('th');
            newCell.textContent = 'Status';
            const systemIndex = Array.from(tableHeader.cells)
                                    .findIndex(cell => cell.textContent.trim() === 'Sistema');
            if (systemIndex !== -1) {
                tableHeader.insertBefore(newCell, tableHeader.cells[systemIndex + 1]);
            } else {
                tableHeader.insertBefore(newCell, tableHeader.cells[tableHeader.cells.length - 1]);
            }
        }
        
        servers.forEach(server => {
            let row;
            
            // Usa o template se existir, senão cria manualmente
            const template = document.getElementById('server-row-template');
            if (template) {
                const clone = template.content.cloneNode(true);
                row = clone.querySelector('tr');
                elements.serversList.appendChild(clone);
                
                row.querySelector('.host-cell').textContent = server.host;
                row.querySelector('.user-cell').textContent = server.ssh_user;
                
                const authCell = row.querySelector('.auth-cell');
                authCell.innerHTML = server.ssh_key_content ? 
                    '<i class="fas fa-key"></i> Chave SSH' : 
                    '<i class="fas fa-lock"></i> Senha';
                
                const osCell = row.querySelector('.os-cell');
                osCell.innerHTML = server.os === 'linux' ? 
                    '<span class="inventory-badge"><i class="fab fa-linux"></i> Linux</span>' : 
                    '<span class="inventory-badge"><i class="fab fa-windows"></i> Windows</span>';
                
                // Adiciona célula de status se não existir
                if (needStatusColumn) {
                    const statusCell = document.createElement('td');
                    statusCell.className = 'status-cell';
                    statusCell.innerHTML = '<span class="inventory-badge pending"><i class="fas fa-question-circle"></i> Pendente</span>';
                    row.insertBefore(statusCell, row.querySelector('.action-buttons'));
                }
                
                // Configura botões
                const editBtn = row.querySelector('.btn-edit');
                if (editBtn) {
                    editBtn.dataset.server = JSON.stringify(server);
                }
                
                const deleteBtn = row.querySelector('.btn-delete');
                if (deleteBtn) {
                    deleteBtn.dataset.host = server.host;
                }
                
                const updateBtn = row.querySelector('.btn-update');
                if (updateBtn) {
                    updateBtn.dataset.host = server.host;
                }
            } else {
                // Fallback para criação manual se o template não existir
                row = document.createElement('tr');
                
                const hostCell = document.createElement('td');
                hostCell.textContent = server.host;
                row.appendChild(hostCell);
                
                const userCell = document.createElement('td');
                userCell.textContent = server.ssh_user;
                row.appendChild(userCell);
                
                const authCell = document.createElement('td');
                authCell.innerHTML = server.ssh_key_content ? 
                    '<i class="fas fa-key"></i> Chave SSH' : 
                    '<i class="fas fa-lock"></i> Senha';
                row.appendChild(authCell);
                
                const osCell = document.createElement('td');
                osCell.innerHTML = server.os === 'linux' ? 
                    '<span class="inventory-badge"><i class="fab fa-linux"></i> Linux</span>' : 
                    '<span class="inventory-badge"><i class="fab fa-windows"></i> Windows</span>';
                row.appendChild(osCell);
                
                // Célula de status
                const statusCell = document.createElement('td');
                statusCell.className = 'status-cell';
                statusCell.innerHTML = '<span class="inventory-badge pending"><i class="fas fa-question-circle"></i> Pendente</span>';
                row.appendChild(statusCell);
                
                // Célula de ações
                const actionsCell = document.createElement('td');
                actionsCell.className = 'action-buttons';
                actionsCell.innerHTML = `
                    <button class="btn-icon btn-update" data-host="${server.host}" title="Atualizar">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="btn-icon btn-edit" data-server='${JSON.stringify(server)}' title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" data-host="${server.host}" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                row.appendChild(actionsCell);
                
                elements.serversList.appendChild(row);
            }
        });
        
        // Adiciona estilos dos badges se necessário
        addBadgeStyles();
    }
    
    function addBadgeStyles() {
        if (!document.getElementById('inventory-badge-styles')) {
            const styles = document.createElement('style');
            styles.id = 'inventory-badge-styles';
            styles.textContent = `
                .inventory-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.85em;
                    font-weight: 500;
                    background-color: #2a2a2a;
                    color: #333;
                    color: var(--accent-gold); /* Letras amarelas */
  box-shadow: var(--shadow-md); /* Sombra no container */
                }
                .inventory-badge.success {
                    background-color: #2a2a2a;
                    color: #2c8c2c;
                       color: var(--accent-gold); /* Letras amarelas */
  box-shadow: var(--shadow-md); /* Sombra no container */
                }
                .inventory-badge.error {
                    background-color: #2a2a2a;
                    color: #c53030;
                       color: var(--accent-gold); /* Letras amarelas */
  box-shadow: var(--shadow-md); /* Sombra no container */
                }
                .inventory-badge.pending {
                    background-color: #2a2a2a;
                    color: #e0941b;
                       color: var(--accent-gold); /* Letras amarelas */
  box-shadow: var(--shadow-md); /* Sombra no container */
                }
                .inventory-badge i {
                    font-size: 0.9em;
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    
    function renderEmptyState() {
        if (!elements.serversList) return;
        
        const tableHeader = document.querySelector('table.table thead tr');
        const colSpan = tableHeader ? tableHeader.cells.length : 5;
        
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="${colSpan}" style="text-align: center; padding: 20px;">
                <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 24px; margin-bottom: 10px;"></i>
                <p style="color: var(--text-secondary);">Nenhum servidor cadastrado. Adicione seu primeiro servidor usando o formulário acima.</p>
            </td>
        `;
        elements.serversList.appendChild(emptyRow);
    }
    
    function resetForm() {
        if (!elements.serverForm) return;
        elements.serverForm.reset();
        state.editMode = false;
        state.originalHost = null;
        elements.formTitle.textContent = 'Adicionar Novo Servidor';
        elements.submitText.textContent = 'Adicionar Servidor';
        if (elements.cancelBtn) {
            elements.cancelBtn.style.display = 'none';
        }
    }
    
    
    function showMessage(message, type = 'success') {
        if (!elements.centerMessageModal) return;
        const messageTitle = elements.centerMessageModal.querySelector('.center-message-title');
        const messageText = document.getElementById('center-message-text');
        const messageIcon = messageTitle.querySelector('i');
        
        if (type === 'success') {
            messageTitle.querySelector('span').textContent = 'Sucesso';
            messageIcon.className = 'fas fa-check-circle';
            messageIcon.style.color = '#4CAF50';
        } else {
            messageTitle.querySelector('span').textContent = 'Erro';
            messageIcon.className = 'fas fa-exclamation-circle';
            messageIcon.style.color = '#F44336';
        }
        
        messageText.textContent = message;
        elements.centerMessageModal.style.display = 'flex';
    }
    
    function isValidIP(ip) {
        const ipPattern = /^((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
        return ipPattern.test(ip);
    }
    
    return {
        initialize,
        reinitialize,
        loadServers,
        resetForm,
        showMessage,
        closeModal
    };
})();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    InventoryManager.initialize();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        InventoryManager.initialize();
    });
}

// Script para gerenciar a seleção de sistema operacional e enviar dados corretos
document.addEventListener('DOMContentLoaded', function() {
    const osSelect = document.getElementById('os');
    const linuxOptionsDivs = document.querySelectorAll('.linux-options');
    const osDistributionSelect = document.getElementById('os_distribution');
    const osVersionSelect = document.getElementById('os_version');
    
    // Função para mostrar/ocultar opções de distribuição Linux
    function toggleLinuxOptions() {
        linuxOptionsDivs.forEach(div => {
            div.style.display = osSelect.value === 'linux' ? 'block' : 'none';
        });
        
        if (osSelect.value === 'linux') {
            updateVersionOptions(osDistributionSelect?.value || 'ubuntu');
        }
    }
    
    // Função para atualizar as opções de versão com base na distribuição selecionada
    function updateVersionOptions(distribution) {
        if (!osVersionSelect) return;
        
        // Limpa as opções atuais
        osVersionSelect.innerHTML = '';
        
        // Adiciona as opções específicas para cada distribuição
        switch(distribution.toLowerCase()) {
            case 'oracle':
                addOption(osVersionSelect, '8', 'Oracle Linux 8');
                addOption(osVersionSelect, '9', 'Oracle Linux 9');
                break;
            case 'ubuntu':
                addOption(osVersionSelect, '20.04', 'Ubuntu 20.04 LTS');
                addOption(osVersionSelect, '22.04', 'Ubuntu 22.04 LTS');
                addOption(osVersionSelect, '24.04', 'Ubuntu 24.04 LTS');
                break;
            case 'rhel':
                addOption(osVersionSelect, '8', 'RHEL 8');
                addOption(osVersionSelect, '9', 'RHEL 9');
                break;
            default:
                addOption(osVersionSelect, '22.04', 'Ubuntu 22.04 LTS');
        }
    }
    
    // Função auxiliar para adicionar opções
    function addOption(selectElement, value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    }
    
    // Configura os event listeners
    if (osSelect) {
        osSelect.addEventListener('change', toggleLinuxOptions);
        toggleLinuxOptions(); // Inicializa o estado
    }
    
    if (osDistributionSelect) {
        osDistributionSelect.addEventListener('change', function() {
            updateVersionOptions(this.value);
        });
    }
    
    // Modifica o formulário de servidor para incluir os campos de distribuição e versão
    const serverForm = document.getElementById('server-form');
    if (serverForm) {
        serverForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Cria objeto para enviar
            const serverData = {
                host: document.getElementById('host').value.trim(),
                ssh_user: document.getElementById('usuario').value.trim(),
                ssh_pass: document.getElementById('senha').value,
                ssh_key_content: document.getElementById('chave').value.trim(),
                original_host: document.getElementById('original-host').value || null
            };
            
            // Define o tipo de OS e informações relacionadas
            if (osSelect.value === 'linux') {
                serverData.os = 'linux';
                
                // Adiciona os campos de distribuição Linux
                if (osDistributionSelect && osVersionSelect) {
                    serverData.os_distribution = osDistributionSelect.value;
                    serverData.os_version = osVersionSelect.value;
                    
                    // Debug para verificar que os dados estão sendo enviados
                    console.log('Distribuição Linux:', osDistributionSelect.value);
                    console.log('Versão Linux:', osVersionSelect.value);
                }
            } else {
                // Para Windows, verifica se é server-2019 ou server-2022
                if (osSelect.value.includes('-')) {
                    serverData.os = osSelect.value;  // Já está no formato 'windows-server-2019'
                } else {
                    serverData.os = 'windows';
                }
            }
            
            console.log('Enviando dados do servidor:', serverData);
            
            // Envia para o servidor
            fetch('/add_server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serverData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    // Recarrega a página ou limpa o formulário
                    if (window.InventoryManager && typeof window.InventoryManager.resetForm === 'function') {
                        window.InventoryManager.resetForm();
                        window.InventoryManager.loadServers();
                    } else {
                        location.reload();
                    }
                } else {
                    alert('Erro: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro ao salvar servidor:', error);
                alert('Erro ao salvar servidor. Verifique o console para mais detalhes.');
            });
        });
    }
});

window.InventoryManager = InventoryManager;