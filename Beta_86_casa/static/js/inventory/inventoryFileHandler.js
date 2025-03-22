/**
 * inventoryFileHandler.js - Gerenciador de importação e exportação de inventário
 */
document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const importButton = document.getElementById('importButton');
    const exportButton = document.getElementById('exportButton');
    const fileInput = document.getElementById('inventoryFile');
    const feedbackContainer = document.getElementById('feedback-container');

    // Função para mostrar mensagens de feedback
    function showMessage(message, type = 'success', duration = 3000) {
        // Remove mensagens anteriores
        const existingMessages = document.querySelectorAll('.message-feedback');
        existingMessages.forEach(el => el.remove());
        
        // Cria o elemento de mensagem
        const messageElement = document.createElement('div');
        messageElement.className = `message-feedback message-${type}`;
        messageElement.textContent = message;
        
        // Adiciona ao contêiner de feedback
        if (feedbackContainer) {
            feedbackContainer.appendChild(messageElement);
            
            // Remove após a duração especificada
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, duration);
        } else {
            console.warn('Container de feedback não encontrado.');
        }
    }

    // Expõe a função showMessage globalmente
    window.showMessage = showMessage;

    // Manipulador de exportação de template
    if (exportButton) {
        exportButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Desabilita o botão durante a exportação
            exportButton.disabled = true;
            exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
            
            // Cria um iframe para download sem redirecionar a página
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '/inventory/export-inventory-template';
            document.body.appendChild(iframe);
            
            // Mostra mensagem de feedback
            showMessage('Download do template iniciado!', 'success');
            
            // Restaura o botão e remove o iframe após um tempo
            setTimeout(() => {
                exportButton.disabled = false;
                exportButton.innerHTML = '<i class="fas fa-file-export"></i> Baixar Template';
                document.body.removeChild(iframe);
            }, 1500);
        });
    }

    // Manipulador de importação de template
    if (importButton && fileInput) {
        importButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botão de importação clicado');
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                console.log('Arquivo selecionado:', this.files[0].name);
                
                // Mostra mensagem e desabilita botão
                showMessage('Importando inventário, aguarde...', 'warning');
                importButton.disabled = true;
                importButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
                
                // Cria o FormData para envio
                const formData = new FormData();
                formData.append('inventory_file', this.files[0]);
                
                // Envia para o servidor
                fetch('/inventory/import-inventory', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showMessage(data.message, 'success');
                        // Recarrega a página após sucesso
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showMessage(data.message || 'Erro ao importar inventário', 'error');
                    }
                })
                .catch(error => {
                    console.error('Erro durante a importação:', error);
                    showMessage('Erro ao processar o arquivo de inventário', 'error');
                })
                .finally(() => {
                    // Restaura o botão e limpa o input
                    importButton.disabled = false;
                    importButton.innerHTML = '<i class="fas fa-file-import"></i> Importar Inventário';
                    fileInput.value = '';
                });
            }
        });
    }

    // Botão de atualização de inventário
    const refreshButton = document.getElementById('refresh-inventory-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
            
            // Faz requisição para atualizar o inventário
            fetch('/inventory/refresh-inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showMessage(data.message || 'Erro ao atualizar inventário', 'error');
                }
            })
            .catch(error => {
                console.error('Erro ao atualizar inventário:', error);
                showMessage('Erro ao atualizar inventário: ' + error.message, 'error');
            })
            .finally(() => {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<i class="fas fa-sync"></i> Atualizar Inventário';
            });
        });
    }

    console.log('Módulo de gerenciamento de inventário inicializado com sucesso');
});