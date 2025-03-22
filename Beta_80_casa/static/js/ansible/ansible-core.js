/**
 * ansible-core.js
 * Módulo principal do gerenciador de playbooks Ansible.
 * 
 * Este arquivo contém:
 * - Configuração global e variáveis de estado
 * - Função de inicialização principal
 * - Funções de logging e utilitárias
 * - Funções de interface de usuário compartilhadas
 */

// Variáveis globais compartilhadas entre módulos
let selectedHosts = new Set();
let selectedPlaybooks = new Set();
let runningJobs = new Map();
let hostData = {};

// Constantes e mapeamentos
const OS_MAPPING = {
    // Linux
    'oracle_linux_8': { path: 'linux/oracle8', display: 'Oracle Linux 8', group: 'linux' },
    'oracle_linux_9': { path: 'linux/oracle9', display: 'Oracle Linux 9', group: 'linux' },
    'ubuntu_20': { path: 'linux/ubuntu20', display: 'Ubuntu 20.04', group: 'linux' },
    'ubuntu_22': { path: 'linux/ubuntu22', display: 'Ubuntu 22.04', group: 'linux' },
    'ubuntu_24': { path: 'linux/ubuntu24', display: 'Ubuntu 24.04', group: 'linux' },
    // Windows
    'windows_server_2019': { path: 'windows/server2019', display: 'Windows Server 2019', group: 'windows' },
    'windows_server_2022': { path: 'windows/server2022', display: 'Windows Server 2022', group: 'windows' },
};

const CATEGORY_MAPPING = {
    'agents': 'agentes',
    'baseline': 'baseline',
    'config': 'configuracoes',
    'security': 'seguranca'
};

const playbookDisplayNames = {
    'patchmanager.yml': 'Patchmanager',
    'site24x7_agent.yml': 'Site24x7 Agent',
    'trendmicro_agent.yml': 'Trend Micro Antivírus',
    'baseline_universal.yml': 'Baseline Universal',
};

/**
 * Registra mensagens de log padronizadas no console
 * @param {string} message - Mensagem de log
 * @param {string} type - Tipo de log (info, warning, error)
 */
function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    
    // Exibe no painel de debug se estiver visível
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        debugOutput.textContent = logMessage + '\n' + debugOutput.textContent;
        if (debugOutput.style.display === 'block') {
            debugOutput.scrollTop = 0;
        }
    }
}



/**
 * Exibe uma mensagem temporária na interface
 * @param {string} text - Texto da mensagem
 * @param {string} type - Tipo de mensagem ('success', 'warning' ou 'error')
 * @param {number} duration - Duração em ms antes da mensagem desaparecer
 */
function showMessage(text, type = 'warning', duration = 3000) {
    // Determina ícone e cor com base no tipo
    let iconPath, borderColor, bgColor, textColor;
    
    switch(type) {
        case 'success':
            iconPath = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
            borderColor = 'var(--success-green)';
            bgColor = 'rgba(76, 175, 80, 0.1)';
            textColor = 'var(--success-green)';
            break;
        case 'error':
            iconPath = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            borderColor = 'var(--error-red)';
            bgColor = 'rgba(244, 67, 54, 0.1)';
            textColor = 'var(--error-red)';
            break;
        default: // warning
            iconPath = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
            borderColor = 'var(--warning-orange)';
            bgColor = 'rgba(255, 152, 0, 0.1)';
            textColor = 'var(--warning-orange)';
    }
    
    const container = document.getElementById('running-playbooks');
    if (!container) {
      debugLog(`Container running-playbooks não encontrado`, 'error');
      return;
    }
  
    // Remove mensagens anteriores do mesmo tipo
    const existingMessages = container.querySelectorAll('.execution-message');
    existingMessages.forEach(msg => {
      if (msg.dataset.type === type) {
        msg.remove();
      }
    });
  
    const messageDiv = document.createElement('div');
    messageDiv.className = 'execution-message';
    messageDiv.dataset.type = type;
    messageDiv.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 6px;
      border-left: 4px solid ${borderColor};
      background: ${bgColor};
      color: ${textColor};
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      opacity: 1;
      transition: opacity 0.3s ease;
      position: relative;
    `;
    
    messageDiv.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="2">
        ${iconPath}
      </svg>
      <span style="flex: 1;">${text}</span>
      <button style="background: none; border: none; cursor: pointer; padding: 4px; opacity: 0.6;" 
              onclick="this.parentNode.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    container.insertBefore(messageDiv, container.firstChild);
    debugLog(text, type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info');
    
    // Remove a mensagem após o tempo definido com efeito de fade
    if (duration > 0) {
      setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.remove();
          }
        }, 300);
      }, duration);
    }
}

/**
 * Obtém o caminho para arquivos estáticos
 * @param {string} path - Caminho relativo para o arquivo
 * @returns {string} URL completa para o arquivo
 */
function getStaticPath(path) {
    return `/static/${path}`;
}

/**
 * Atualiza o botão de execução e seu status
 */
function updateExecuteButton() {
    const executeButton = document.getElementById('execute-selected');
    if (!executeButton) {
        debugLog('Botão "execute-selected" não encontrado', 'error');
        return;
    }

    let statusMessage = document.getElementById('execution-status');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'execution-status';
        statusMessage.style.cssText = `
            color: var(--text-secondary);
            margin-top: 5px;
            font-size: 11px;
            transition: color 0.3s ease;
        `;
        executeButton.parentNode.insertBefore(statusMessage, executeButton.nextSibling);
    }

    const hostsSelected = selectedHosts.size > 0;
    const playbooksSelected = selectedPlaybooks.size > 0;

    if (!hostsSelected && !playbooksSelected) {
        statusMessage.textContent = 'Selecione pelo menos um host e uma playbook';
        statusMessage.style.color = 'var(--error-red)';
    } else if (!hostsSelected) {
        statusMessage.textContent = 'Selecione pelo menos um host';
        statusMessage.style.color = 'var(--error-red)';
    } else if (!playbooksSelected) {
        statusMessage.textContent = 'Selecione pelo menos uma playbook';
        statusMessage.style.color = 'var(--error-red)';
    } else {
        statusMessage.textContent = `${selectedHosts.size} host(s) e ${selectedPlaybooks.size} playbook(s) selecionados`;
        statusMessage.style.color = 'var(--success-green)';
    }

    debugLog(`Botão de execução atualizado: ${statusMessage.textContent}`);
}

/**
 * Rotina principal para inicializar tudo
 */
function initializeApp() {
    debugLog('Inicializando aplicação');
    
    // Adicionar estilos para spinner e mensagens
    addGlobalStyles();
    
    // Inicializar os filtros
    initializeOSFilters();
    initializeFilters();
    
    // Carregar os dados iniciais
    loadHosts();
    loadPlaybooks();
    
    // Configurar os listeners de eventos
    setupEventListeners();
    
    // Inicializar após um pequeno delay para garantir que a DOM esteja completamente renderizada
    setTimeout(initializeButtonPositions, 100);
    
    // Corrigir o problema do sistema duplicado
    fixSystemDuplication();
    
    debugLog('Aplicação inicializada com sucesso');
}


/**
 * Adiciona estilos globais necessários, com escopo limitado para o spinner
 */
function addGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
      .ansible-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: ansible-spin 1s ease-in-out infinite;
      }
      
      @keyframes ansible-spin {
        to { transform: rotate(360deg); }
      }
      
      .execution-message {
        animation: ansible-slideIn 0.3s ease-out forwards;
      }
      
      @keyframes ansible-slideIn {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .cancel-progress-message {
        padding: 12px;
        margin-bottom: 16px;
        background: var(--background-secondary);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
      }
      
      .execution-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 8px 0;
        color: var(--text-secondary);
      }
      
      .execution-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top-color: var(--accent-gold);
        animation: ansible-spin 1s linear infinite;
      }
  `;
  document.head.appendChild(style);
  debugLog('Estilos globais adicionados com escopo limitado');
}

function setupEventListeners() {
    // Filtro de OS
    const osFilter = document.getElementById('os-filter');
    if (osFilter) {
      osFilter.addEventListener('change', function() {
        debugLog(`Filtro de SO alterado para: ${this.value}`);
        // Mostrar o indicador de carregamento
        togglePlaybooksLoading(true, this.value);
        // Sempre força refresh ao mudar SO para garantir dados atualizados
        loadPlaybooks(true);
        updateOSInfoPanel();
      });
    }
    
    // Filtro de categoria
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', function() {
        debugLog(`Filtro de categoria alterado para: ${this.value}`);
        // Sempre força refresh ao mudar categoria para garantir dados atualizados
        loadPlaybooks(true);
      });
    }
    // Criar alias para executePlaybooks
if (typeof window.executeSelectedPlaybooks === 'function' && typeof window.executePlaybooks !== 'function') {
  window.executePlaybooks = window.executeSelectedPlaybooks;
  console.log("Alias executePlaybooks criado para executeSelectedPlaybooks");
}
    
    // Botão de executar
    const executeButton = document.getElementById('execute-selected');
    if (executeButton) {
      executeButton.addEventListener('click', executeSelectedPlaybooks);
    }
    
    // Botão de atualizar explícito, recarrega tudo
    const refreshButton = document.getElementById('refresh');
    if (refreshButton) {
      refreshButton.addEventListener('click', function() {
        refreshAll();
      });
    }
    
    // Resto dos listeners... (mantido como estava)
  }
  
  // Função para renderizar playbooks do cache com melhorias de log e feedback
  function renderPlaybooksFromCache(playbooks, osValue, categoryValue) {
    const playbooksContainer = document.getElementById('playbooks');
    if (!playbooksContainer) return;
  
    // Obtém o caminho do SO selecionado
    const osPath = OS_MAPPING[osValue]?.path || '';
    debugLog(`Filtrando playbooks para o caminho: ${osPath}, categoria: ${categoryValue}`);
  
    // Filtra as playbooks com base no caminho do SO e na categoria
    const filteredPlaybooks = playbooks.filter(playbook => {
      // Verifica se o caminho da playbook inclui o caminho do SO selecionado
      const matchesOsPath = osPath && playbook.path.includes(osPath);
      
      // Verifica a categoria
      const categoryMatch = categoryValue === 'all' || playbook.category === categoryValue;
      
      return matchesOsPath && categoryMatch;
    });
  
    debugLog(`Após filtrar: ${filteredPlaybooks.length} playbooks correspondem aos critérios`);

    // Atualiza a interface com as playbooks filtradas
    if (filteredPlaybooks.length > 0) {
      let playbooksHTML = '';
      filteredPlaybooks.forEach(playbook => {
        playbooksHTML += updatePlaybookCard(playbook);
      });
  
      playbooksContainer.innerHTML = playbooksHTML;
      debugLog('HTML dos cards gerado e adicionado ao DOM');
      
      // Adiciona event listeners aos novos elementos
      attachPlaybookEventListeners();
      
      // Atualiza o contador de playbooks encontradas
      const selectedSystem = OS_MAPPING[osValue]?.display || osValue;
      playbooksContainer.insertAdjacentHTML('afterbegin', `
        <div class="playbooks-count">
          <span>${filteredPlaybooks.length} playbooks encontradas para ${selectedSystem}</span>
        </div>
      `);
    } else {
      playbooksContainer.innerHTML = `
        <div class="no-playbooks">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <path d="M13 2v7h7"></path>
          </svg>
          <p>Nenhuma playbook encontrada para ${OS_MAPPING[osValue]?.display || osValue} na categoria ${categoryValue === 'all' ? 'selecionada' : categoryValue}</p>
          <button onclick="refreshAll()" class="ansible-button ansible-primary">Atualizar Dados</button>
        </div>`;
    }
  }
  














// Inicia a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initializeApp, { once: true });

// Exportação de funções para uso global
window.debugLog = debugLog;
window.showMessage = showMessage;
window.updateExecuteButton = updateExecuteButton;
window.getStaticPath = getStaticPath;