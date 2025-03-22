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
        
        if (document.querySelector('.inventory-controls')) {
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
        
        if (elements.refreshInventoryBtn) {
            elements.refreshInventoryBtn.addEventListener('click', handleRefreshInventory);
        }
    }

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
                loadServers();
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

    async function handleExportClick() {
        try {
            elements.exportBtn.disabled = true;
            elements.exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

            const response = await fetch('/inventory/export-inventory', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Erro ao exportar inventário: ' + response.statusText);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `inventory_export_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showMessage('Inventário exportado com sucesso!', 'success');
        } catch (error) {
            showMessage('Erro ao exportar inventário: ' + error.message, 'error');
            console.error('Erro na exportação:', error);
        } finally {
            elements.exportBtn.disabled = false;
            elements.exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar Inventário';
        }
    }

    function handleImportClick() {
        if (elements.fileInput) {
            elements.fileInput.accept = ".json,.txt";
            elements.fileInput.click();
        }
    }
    
    async function handleExportTemplateClick() {
        try {
            elements.exportTemplateBtn.disabled = true;
            elements.exportTemplateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando Template...';

            window.location.href = '/inventory/export-inventory-template';

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

    // Função ajustada para importar arquivo usando FormData
    async function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) {
            showMessage('Nenhum arquivo selecionado', 'error');
            return;
        }
    
        showMessage(`Importando arquivo ${file.name}, aguarde...`, 'warning');
        elements.importBtn.disabled = true;
        elements.importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';

        const formData = new FormData();
        formData.append('inventory_file', file);

        try {
            const response = await fetch('/inventory/import-inventory', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ${response.status}: ${errorText}`);
            }

            const responseData = await response.json();
            
            if (responseData.success) {
                showMessage(responseData.message || 'Inventário importado com sucesso!', 'success');
                setTimeout(() => {
                    loadServers(); // Recarrega a lista após importação
                }, 1000);
            } else {
                throw new Error(responseData.message || 'Erro ao importar inventário');
            }
        } catch (error) {
            showMessage('Erro ao importar arquivo: ' + error.message, 'error');
            console.error('Erro na importação:', error);
        } finally {
            elements.importBtn.disabled = false;
            elements.importBtn.innerHTML = '<i class="fas fa-upload"></i> Importar Inventário';
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
        if (row && row.cells.length >= 5) {
            const statusCell = row.querySelector('.status-cell') || row.cells[3];
            statusCell.className = 'status-cell';
            statusCell.innerHTML = data.valid ? 
                '<span class="inventory-badge success"><i class="fas fa-check"></i> Ativo</span>' : 
                '<span class="inventory-badge error"><i class="fas fa-times"></i> Inativo</span>';
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
            original_host: state.originalHost
        };

        saveServer(serverData);
    }
    
    async function saveServer(serverData) {
        try {
            elements.submitBtn.disabled = true;
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
        
        const tableHeader = document.querySelector('table.table thead tr');
        const needStatusColumn = tableHeader && 
                                Array.from(tableHeader.cells)
                                    .every(cell => cell.textContent.trim() !== 'Status');
        
        if (needStatusColumn && tableHeader) {
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
            const template = document.getElementById('server-row-template');
            let row;
            
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
                
                if (needStatusColumn) {
                    const statusCell = document.createElement('td');
                    statusCell.className = 'status-cell';
                    statusCell.innerHTML = '<span class="inventory-badge pending"><i class="fas fa-question-circle"></i> Pendente</span>';
                    row.insertBefore(statusCell, row.querySelector('.action-buttons'));
                }
                
                const editBtn = row.querySelector('.btn-edit');
                if (editBtn) editBtn.dataset.server = JSON.stringify(server);
                
                const deleteBtn = row.querySelector('.btn-delete');
                if (deleteBtn) deleteBtn.dataset.host = server.host;
                
                const updateBtn = row.querySelector('.btn-update');
                if (updateBtn) updateBtn.dataset.host = server.host;
            } else {
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
                
                const statusCell = document.createElement('td');
                statusCell.className = 'status-cell';
                statusCell.innerHTML = '<span class="inventory-badge pending"><i class="fas fa-question-circle"></i> Pendente</span>';
                row.appendChild(statusCell);
                
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
                    color: var(--accent-gold);
                    box-shadow: var(--shadow-md);
                }
                .inventory-badge.success {
                    background-color: #2a2a2a;
                    color: var(--accent-gold);
                }
                .inventory-badge.error {
                    background-color: #2a2a2a;
                    color: var(--accent-gold);
                }
                .inventory-badge.pending {
                    background-color: #2a2a2a;
                    color: var(--accent-gold);
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
        } else if (type === 'error') {
            messageTitle.querySelector('span').textContent = 'Erro';
            messageIcon.className = 'fas fa-exclamation-circle';
            messageIcon.style.color = '#F44336';
        } else {
            messageTitle.querySelector('span').textContent = 'Aviso';
            messageIcon.className = 'fas fa-exclamation-triangle';
            messageIcon.style.color = '#FFA500';
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

window.InventoryManager = InventoryManager;