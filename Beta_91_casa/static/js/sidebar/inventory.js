/**
 * Script corrigido para o gerenciamento de inventário
 * - Modal invisível por padrão
 * - Botão Mostrar Inventário alterna entre mostrar/esconder
 */
document.addEventListener('DOMContentLoaded', function() {
    // Verificação de elementos antes de adicionar eventos
    const serverForm = document.getElementById('server-form');
    const hostInput = document.getElementById('host');
    const userInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('senha');
    const keyInput = document.getElementById('chave');
    const osSelect = document.getElementById('os');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const serversList = document.getElementById('servers-list');
    const showInventoryBtn = document.getElementById('show-inventory-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const closeModalBtnAlt = document.getElementById('close-modal-btn-alt'); // Novo botão no footer
    const copyInventoryBtn = document.getElementById('copy-inventory-btn');
    const inventoryModal = document.getElementById('inventory-modal');
    const fullInventory = document.getElementById('full-inventory');
    const feedbackContainer = document.getElementById('feedback-container');

    // Verifica se todos os elementos necessários existem
    if (!serverForm || !serversList || !inventoryModal) {
        console.error('Um ou mais elementos essenciais não foram encontrados no DOM');
        return;
    }

    let editMode = false;
    let originalHost = null;
    let existingHosts = new Set();
    let deleteCooldown = false;
    let inventoryVisible = false;

    // Criar modal de mensagem centralizada
    function createCenterMessageModal() {
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
        return modal;
    }
    
    let centerMessageModal = document.getElementById('center-message-modal');
    if (!centerMessageModal) {
        centerMessageModal = createCenterMessageModal();
    }
    
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'center-message-button') {
            centerMessageModal.style.display = 'none';
        }
    });

    function showMessage(message, type = 'success') {
        const messageTitle = centerMessageModal.querySelector('.center-message-title');
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
        centerMessageModal.style.display = 'flex';
    }

    function isValidIP(ip) {
        const ipPattern = /^((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
        return ipPattern.test(ip);
    }

    function resetForm() {
        serverForm.reset();
        editMode = false;
        originalHost = null;
        formTitle.textContent = 'Adicionar Novo Servidor';
        submitText.textContent = 'Adicionar Servidor';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    async function loadServers() {
        try {
            const response = await fetch('/get-inventory');
            if (!response.ok) throw new Error('Erro ao carregar servidores');
            const data = await response.json();
            existingHosts = new Set(data.servers.map(server => server.host));
            renderServers(data.servers);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    function renderServers(servers) {
        serversList.innerHTML = '';
        
        if (servers.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 24px; margin-bottom: 10px;"></i>
                    <p style="color: var(--text-secondary);">Nenhum servidor cadastrado. Adicione seu primeiro servidor usando o formulário acima.</p>
                </td>
            `;
            serversList.appendChild(emptyRow);
            return;
        }
        
        servers.forEach(server => {
            const row = document.createElement('tr');
            const authType = server.ssh_key_content ? 
                '<i class="fas fa-key"></i> Chave SSH' : 
                '<i class="fas fa-lock"></i> Senha';
            const osBadge = server.os === 'linux' ? 
                '<span class="inventory-badge"><i class="fab fa-linux"></i> Linux</span>' : 
                '<span class="inventory-badge"><i class="fab fa-windows"></i> Windows</span>';
            
            row.innerHTML = `
                <td>${server.host}</td>
                <td>${server.ssh_user}</td>
                <td>${authType}</td>
                <td>${osBadge}</td>
                <td class="inventory-action-buttons">
                    <button class="inventory-btn-icon btn-edit" data-server='${JSON.stringify(server)}' title="Editar servidor">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="inventory-btn-icon btn-delete" data-host="${server.host}" title="Excluir servidor">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            serversList.appendChild(row);
        });
    }

    serverForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const host = hostInput.value.trim();
        
        if (!isValidIP(host)) {
            showMessage('IP inválido! Use o formato correto (ex: 192.168.1.1)', 'error');
            return;
        }
        
        if (!editMode && existingHosts.has(host)) {
            showMessage('Este servidor já existe no inventário', 'error');
            return;
        }

        const serverData = {
            host,
            ssh_user: userInput.value.trim(),
            ssh_pass: passwordInput.value,
            ssh_key_content: keyInput.value.trim(),
            os: osSelect.value,
            original_host: originalHost
        };

        try {
            submitBtn.disabled = true;
            submitText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

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
        } finally {
            submitBtn.disabled = false;
            submitText.innerHTML = editMode ? 'Atualizar Servidor' : 'Adicionar Servidor';
        }
    });

    serversList.addEventListener('click', async function(e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            const serverData = JSON.parse(editBtn.dataset.server);
            hostInput.value = serverData.host;
            userInput.value = serverData.ssh_user;
            passwordInput.value = serverData.ssh_pass || '';
            keyInput.value = serverData.ssh_key_content || '';
            osSelect.value = serverData.os;
            editMode = true;
            originalHost = serverData.host;
            formTitle.textContent = 'Editar Servidor';
            submitText.textContent = 'Atualizar Servidor';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
            hostInput.focus();
        }

        if (deleteBtn && !deleteCooldown) {
            const host = deleteBtn.dataset.host;
            
            const confirmed = confirm(`Deseja realmente remover o servidor ${host}?`);
            if (confirmed) {
                deleteCooldown = true;
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
                } finally {
                    setTimeout(() => deleteCooldown = false, 1000);
                }
            }
        }
    });

    // Evento para mostrar/esconder o inventário
    if (showInventoryBtn) {
        showInventoryBtn.addEventListener('click', async function() {
            if (inventoryVisible) {
                closeModal(); // Fecha o modal se já estiver visível
            } else {
                // Exibe o modal
                showInventoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
                showInventoryBtn.disabled = true;

                try {
                    const response = await fetch('/show-inventory');
                    if (!response.ok) {
                        throw new Error('Erro ao carregar inventário');
                    }
                    
                    const data = await response.json();
                    if (fullInventory) {
                        fullInventory.textContent = data.inventory;
                    }
                    
                    if (inventoryModal) {
                        inventoryModal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                        inventoryVisible = true;
                        showInventoryBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Fechar Inventário';
                    }
                } catch (error) {
                    showMessage('Erro ao carregar inventário. Por favor, tente novamente.', 'error');
                } finally {
                    showInventoryBtn.disabled = false;
                }
            }
        });
    }

    // Evento para o botão fechar do modal (cabeçalho e rodapé)
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (closeModalBtnAlt) {
        closeModalBtnAlt.addEventListener('click', closeModal);
    }
    
    // Fecha o modal quando clica fora dele
    if (inventoryModal) {
        inventoryModal.addEventListener('click', function(e) {
            if (e.target === inventoryModal) closeModal();
        });
    }

    function closeModal() {
        if (inventoryModal) {
            inventoryModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            inventoryVisible = false;
            if (showInventoryBtn) {
                showInventoryBtn.innerHTML = '<i class="fas fa-eye"></i> Mostrar Inventário';
            }
        }
    }

    if (copyInventoryBtn) {
        copyInventoryBtn.addEventListener('click', function() {
            const text = fullInventory.textContent;
            navigator.clipboard.writeText(text).then(() => {
                copyInventoryBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    copyInventoryBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                }, 2000);
                showMessage('Inventário copiado para a área de transferência!', 'success');
            });
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }

    loadServers();
});