/**
 * Manipulador de Templates de Inventário
 * Otimizado para importação e exportação de templates de inventário
 */
class InventoryTemplateHandler {
  constructor() {
    this.cacheElements();
    this.attachEventListeners();
  }

  cacheElements() {
    this.importButton = document.getElementById('importButton');
    this.exportButton = document.getElementById('exportButton');
    this.inventoryFile = document.getElementById('inventoryFile');
    this.feedbackContainer = document.getElementById('feedback-container');
  }

  attachEventListeners() {
    if (this.importButton) {
      this.importButton.addEventListener('click', () => this.handleImportClick());
    }

    if (this.exportButton) {
      this.exportButton.addEventListener('click', () => this.handleExportClick());
    }

    if (this.inventoryFile) {
      this.inventoryFile.addEventListener('change', (e) => this.handleFileSelected(e));
    }
  }

  handleImportClick() {
    // Define o atributo directory para tentar abrir em Meus Documentos
    // Nota: Por segurança, navegadores modernos limitam essa funcionalidade
    if (this.inventoryFile) {
      // O navegador pode não permitir definir o diretório inicial por segurança
      // A abertura do diálogo de arquivo é controlada pelo navegador
      this.inventoryFile.click();
    }
  }

  async handleExportClick() {
    try {
      this.exportButton.disabled = true;
      this.exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

      const response = await fetch('/inventory/export-inventory-template');
      
      if (!response.ok) {
        throw new Error('Falha ao exportar o template');
      }
      
      // Cria um blob com os dados para download
      const templateText = await response.text();
      
      // Usa o método Blob para download
      const blob = new Blob([this.generateFormattedTemplate()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Cria um link para download e clica automaticamente
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_template_${this.getFormattedDate()}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Limpa o objeto URL e remove o elemento
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showMessage('Template exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar template:', error);
      this.showMessage('Erro ao exportar template: ' + error.message, 'error');
    } finally {
      this.exportButton.disabled = false;
      this.exportButton.innerHTML = '<i class="fas fa-file-export"></i> Baixar Template';
    }
  }

  getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  generateFormattedTemplate() {
    return `# Template de Inventário Ansible
# Instruções: 
# 1. Preencha as seções abaixo para cada servidor
# 2. Use uma seção [server] para cada servidor
# 3. Para Linux use 'os=linux', para Windows use 'os=windows'
# 4. Use SSH_PASS ou SSH_KEY_CONTENT (não ambos)

# ====== EXEMPLO 1: Servidor Linux com Senha ======
[server]
host=192.168.1.10
ssh_user=admin
ssh_pass=senhasegura123
ssh_key_content=
os=linux

# ====== EXEMPLO 2: Servidor Linux com Chave SSH ======
[server]
host=192.168.1.11
ssh_user=ubuntu
ssh_pass=
ssh_key_content=-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA6NF8iallvQVp22WDkTkyrtvp9eWW6A8YVr+kz4TjGYe7gHzI
w+niNltGEFHzD8+v1I2YJ6oXevct1YeS0o9HZyN1Q9qgCgzUFtdOKLv6IedplqoP
kcmF0aYet2PkEDo3MlTBckFXPITAMzF8dJSIFo9D8HfdOV0IAdx4O7PtixWKn5y2
hMNG0zQPyUecp4pzC6kivAIhyfHilFR61RGL+GPXQ2MWZWFYbAGjyiYJnAmCP3NO
Td0jMZEnDkbUvxhMmBYSdETk1rRgm+R4LOzFUGaHqHDLKLX+FIPKcF96hrucXzcW
yLbIbEgE98OHlnVYCzRdK8jlqm8tehUc9c9WhQIBIwKCAQEA4iqWPJXtzZA68mKd
ELs4jJsdyky+ewdZeNds5tjcnHU5zUYE25K+ffJED9qUWICcLZDc81TGWjHyAqD1
Bw7XpgUwFgeUJwUlzQurAv+/ySnxiwuaGJfhFM1CaQHzfXphgVml+fZUvnJUTzv5
POUjW+W1lqLdLrTMv9DKrIMKSjlsLM+CI5Ub3hOTsV0X0WQID69/ssMf4SfLV3Kq
l+0We8oo4XUiV71Qs5u2KnBPXCM/+QiF5ci5b1TruccV2VS9qhfRisCyc3z0zHun
Jm1m1fGXkKMX6OmJAzv+/1O3ZKI9j16lfJ8b1KLAUZMZODx6fUUzfMwLXztjyGQQ
6Q9MbQKBgHb/XqPJTnEeGVLdJaUE4NYtC9MAIQXJzWZJJLBEoUCCjhFQ0efQkrUp
90k3MXKmpcm8S1iRNa7C29WYUzPymXYHMGFskSaoQV0i1CR1k8UfSlr2Y3iKy2/W
cvmJCzXEwF5oR7beAjOQy3lbJC9Y2ogBnyqhbzZ2XcrbQ8AMJYqBGMhDAoGBANkU
1hqfnw7+aXncJ9bjysr1ZWbqOE5Nd8AFgfwaKuGTTVX2NsUQnCMWdOp+wFak40JH
PKWkJNdBG+ex0H9JNQsTK3X5PBMAS8AfX0GrKeuwKWA6erytVTqjOfLYcdp5+z9s
8DtVCxDuVsM+i4X8UqIGOlvGbtKEVokHPFXP1q/dAoGAcHg5YX7WEehCgCYTzpO+
xysX8ScM2qS6xuZ3MqUWAxUWkh7NGZvhe0sGy9iOdANzwKw7mUUFViaCMR/t54W1
GC83sOs3D7n5Mj8x3NdO8xFit7dT9a245TvaoYQ7KgmqpSg/ScKCw4c3eiLava+J
3btnJeSIU+8ZXq9XjPRpKwg=
-----END RSA PRIVATE KEY-----
os=linux

# ====== EXEMPLO 3: Servidor Windows ======
[server]
host=192.168.1.20
ssh_user=Administrator
ssh_pass=Windows@2022
ssh_key_content=
os=windows

# ====== ADICIONE SEUS SERVIDORES ABAIXO ======
[server]
host=
ssh_user=
ssh_pass=
ssh_key_content=
os=

`;
  }

  async handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      this.showMessage('Importando arquivo, aguarde...', 'warning');
      this.importButton.disabled = true;
      this.importButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

      // Cria o FormData e adiciona o arquivo
      const formData = new FormData();
      formData.append('inventory_file', file);

      // Envia para o servidor
      const response = await fetch('/inventory/import-inventory', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage(data.message || 'Inventário importado com sucesso!', 'success');
        // Recarrega a página após sucesso
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        this.showMessage(data.message || 'Erro ao importar inventário', 'error');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      this.showMessage('Erro ao processar o arquivo: ' + error.message, 'error');
    } finally {
      // Limpa o campo de arquivo e restaura o botão
      event.target.value = '';
      this.importButton.disabled = false;
      this.importButton.innerHTML = '<i class="fas fa-file-import"></i> Importar Inventário';
    }
  }

  showMessage(message, type = 'success', duration = 3000) {
    // Remove mensagens anteriores
    const existingMessages = document.querySelectorAll('.message-feedback');
    existingMessages.forEach(el => el.remove());
    
    // Cria o elemento de mensagem
    const messageElement = document.createElement('div');
    messageElement.className = `message-feedback message-${type}`;
    messageElement.textContent = message;
    
    // Adiciona ao contêiner de feedback
    if (this.feedbackContainer) {
      this.feedbackContainer.appendChild(messageElement);
      
      // Remove após a duração especificada
      setTimeout(() => {
        messageElement.remove();
      }, duration);
    }
  }
}

// Inicializa o manipulador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const templateHandler = new InventoryTemplateHandler();
  
  // Torna o manipulador disponível globalmente
  window.inventoryTemplateHandler = templateHandler;
});