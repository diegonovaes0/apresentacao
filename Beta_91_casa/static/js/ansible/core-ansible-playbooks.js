/**
 * ansible-playbooks.js
 * Gerencia a exibição, seleção e carregamento de playbooks do Ansible.
 * 
 * Este arquivo contém:
 * - Funções para carregar playbooks da API
 * - Funções para renderizar playbooks na interface
 * - Funcionalidades de seleção de playbooks
 * - Filtros de sistema operacional e categorias
 */

/**
 * Aprimoramento para atualização em tempo real do seletor
 * Este código garante que, ao mudar entre opções de SO (por exemplo, Oracle 8 para 9),
 * os dados sejam imediatamente recarregados sem usar cache.
 */
function loadPlaybooks(forceRefresh = false) {
  try {
      // Evitar chamadas recursivas
      if (window._loadPlaybooksInProgress) {
          console.log('Evitando chamada recursiva de loadPlaybooks');
          return Promise.resolve();
      }
      
      window._loadPlaybooksInProgress = true;
      
      const osFilter = document.getElementById('os-filter');
      const categoryFilter = document.getElementById('category-filter');
      
      if (!osFilter || !categoryFilter) {
          window._loadPlaybooksInProgress = false;
          throw new Error('Elementos de filtro não encontrados');
      }
      

      // Função para carregar hosts e playbooks
function loadInitialData() {
  // Simulação de carregamento de hosts e playbooks (substitua por chamadas reais à API)
  fetch('/api/hosts')
      .then(response => response.json())
      .then(hosts => {
          const hostContainer = document.getElementById('host-container');
          hostContainer.innerHTML = ''; // Limpa o container antes de adicionar novos elementos
          hosts.forEach(host => {
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.className = 'host-checkbox';
              checkbox.dataset.host = host.name;
              hostContainer.appendChild(checkbox);

              const label = document.createElement('label');
              label.textContent = host.name;
              hostContainer.appendChild(label);
          });
          setupSelectionListeners(); // Configura os listeners após carregar os hosts
      })
      .catch(error => console.error('Erro ao carregar hosts:', error));

  fetch('/api/playbooks')
      .then(response => response.json())
      .then(playbooks => {
          const playbookContainer = document.getElementById('playbook-container');
          playbookContainer.innerHTML = ''; // Limpa o container antes de adicionar novos elementos
          playbooks.forEach(playbook => {
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.className = 'playbook-checkbox';
              checkbox.dataset.playbook = playbook.name;
              playbookContainer.appendChild(checkbox);

              const label = document.createElement('label');
              label.textContent = playbook.name;
              playbookContainer.appendChild(label);
          });
          setupSelectionListeners(); // Configura os listeners após carregar as playbooks
      })
      .catch(error => console.error('Erro ao carregar playbooks:', error));
}


      const osValue = osFilter.value;
      const categoryValue = categoryFilter.value;
      
      // Guarda os valores atuais dos filtros
      const lastOsFilter = sessionStorage.getItem('lastOsFilter');
      const lastCategoryFilter = sessionStorage.getItem('lastCategoryFilter');
      
      // Verifica se os filtros mudaram
      const filtersChanged = lastOsFilter !== osValue || lastCategoryFilter !== categoryValue;
      
      // Força refresh se os filtros mudaram ou se foi explicitamente solicitado
      forceRefresh = forceRefresh || filtersChanged;
      
      debugLog(`Filtros: SO=${osValue}, Categoria=${categoryValue}, Mudaram=${filtersChanged}, ForceRefresh=${forceRefresh}`);
      
      // Atualiza os valores dos filtros no sessionStorage
      sessionStorage.setItem('lastOsFilter', osValue);
      sessionStorage.setItem('lastCategoryFilter', categoryValue);
      
      const playbooksContainer = document.getElementById('playbooks');
      if (!playbooksContainer) {
          window._loadPlaybooksInProgress = false;
          throw new Error('Container de playbooks não encontrado');
      }
      
      // Mostra indicador de carregamento
      playbooksContainer.innerHTML = `
          <div class="loading-playbooks">
              Carregando playbooks para ${OS_MAPPING[osValue]?.display || osValue}...
          </div>`;
      
      // Se temos playbooks em cache e não estamos forçando refresh, use-os
      const cachedPlaybooks = sessionStorage.getItem('playbooksData');
      if (cachedPlaybooks && !forceRefresh) {
          debugLog('Usando dados de playbooks em cache da sessão');
          renderPlaybooksFromCache(JSON.parse(cachedPlaybooks), osValue, categoryValue);
          window._loadPlaybooksInProgress = false;
          return Promise.resolve();
      }
      
      // Limpar o cache se os filtros mudaram para garantir dados atualizados
      if (filtersChanged) {
          sessionStorage.removeItem('playbooksData');
          debugLog('Cache de playbooks removido devido à mudança de filtros');
      }
      
      // Busca da API
      debugLog('Fazendo requisição à API de playbooks...');
      return fetch('/api/playbooks')
          .then(response => {
              if (!response.ok) {
                  throw new Error(`Erro na API: ${response.status}`);
              }
              return response.json();
          })
          .then(playbooks => {
              debugLog(`Recebidas ${playbooks.length} playbooks da API`);
              
              // Salva todas as playbooks no sessionStorage
              sessionStorage.setItem('playbooksData', JSON.stringify(playbooks));
              sessionStorage.setItem('playbooksLoaded', 'true');
              
              // Renderiza as playbooks com os filtros atuais
              renderPlaybooksFromCache(playbooks, osValue, categoryValue);
              window._loadPlaybooksInProgress = false;
          })
          .catch(error => {
              debugLog(`Erro ao processar playbooks: ${error.message}`, 'error');
              playbooksContainer.innerHTML = `
                  <div style="color: var(--error-red); padding: 16px; text-align: center;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p>Erro ao carregar playbooks: ${error.message}</p>
                      <button onclick="refreshAll()" class="ansible-button">Tentar Novamente</button>
                  </div>`;
              window._loadPlaybooksInProgress = false;
          });
  } catch (error) {
      window._loadPlaybooksInProgress = false;
      debugLog(`Erro ao iniciar carregamento de playbooks: ${error.message}`, 'error');
      document.getElementById('playbooks').innerHTML = `
          <div style="color: var(--error-red); padding: 16px; text-align: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Erro ao carregar playbooks: ${error.message}</p>
              <button onclick="refreshAll()" class="ansible-button">Tentar Novamente</button>
          </div>`;
      return Promise.reject(error);
  }
}

// Substituir a função global
window.loadPlaybooks = loadPlaybooks;


/**
 * Renderiza as playbooks do cache com base nos filtros aplicados
 * @param {Array} playbooks - Array de objetos de playbook
 * @param {string} osValue - Valor do filtro de sistema operacional
 * @param {string} categoryValue - Valor do filtro de categoria
 */
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
      attachPlaybookEventListeners();
    } else {
      playbooksContainer.innerHTML = `
        <div class="no-playbooks">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <path d="M13 2v7h7"></path>
          </svg>
          <p>Nenhuma playbook encontrada para ${OS_MAPPING[osValue]?.display || osValue} na categoria ${categoryValue}</p>
          <button onclick="refreshAll()" class="ansible-button ansible-primary">Tentar Novamente</button>
        </div>`;
    }
}

/**
 * Cria o HTML para o card de uma playbook
 * @param {Object} playbook - Objeto com dados da playbook
 * @returns {string} HTML do card
 */
function updatePlaybookCard(playbook) {
    debugLog(`Gerando card para playbook: ${playbook.name}`);
    
    // Obter o nome a ser exibido do mapeamento ou usar o nome original do arquivo
    // Extrai apenas o nome do arquivo a partir do caminho completo
    const filename = playbook.name.split('/').pop();
    const displayName = playbookDisplayNames[filename] || filename.replace('.yml', '');
    
    return `
        <div class="playbook-item ${selectedPlaybooks.has(playbook.name) ? 'selected' : ''}" 
             data-playbook-name="${playbook.name}" 
             data-playbook-os="${playbook.os}" 
             data-playbook-path="${playbook.path}"
             data-playbook-category="${playbook.category}">
            <input type="checkbox" data-playbook="${playbook.name}" ${selectedPlaybooks.has(playbook.name) ? 'checked' : ''}>
            <div>
                <h4>${displayName}</h4>
                <small>${playbook.description || 'Sem descrição'}</small>
                <div>
                    <span>SO: ${playbook.os}</span> | <span>Categoria: ${playbook.category}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Anexa event listeners aos cards de playbook
 */
function attachPlaybookEventListeners() {
    document.querySelectorAll('.playbook-item').forEach(item => {
        // Remove os listeners existentes para evitar duplicação
        const oldItem = item.cloneNode(true);
        item.parentNode.replaceChild(oldItem, item);
        item = oldItem;
        
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') { // Não toggle se clicar no checkbox
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    togglePlaybookSelection(item, checkbox.dataset.playbook);
                }
            }
        });
    });
    
    document.querySelectorAll('.playbook-item input[type="checkbox"]').forEach(checkbox => {
        // Remove os listeners existentes para evitar duplicação
        const oldCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(oldCheckbox, checkbox);
        checkbox = oldCheckbox;
        
        checkbox.addEventListener('change', (e) => {
            const item = checkbox.closest('.playbook-item');
            togglePlaybookSelection(item, checkbox.dataset.playbook);
            e.stopPropagation();
        });
    });
    
    debugLog('Event listeners das playbooks configurados');
}

/**
 * Alterna a seleção de uma playbook
 * @param {HTMLElement} item - Elemento DOM do item da playbook
 * @param {string} playbookName - Nome da playbook
 */
function togglePlaybookSelection(item, playbookName) {
    debugLog(`Alternando seleção para: ${playbookName}`);
    const checkbox = item.querySelector(`input[data-playbook="${playbookName}"]`);
    
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        debugLog(`Checkbox alterado para: ${checkbox.checked ? 'selecionado' : 'não selecionado'}`);
        item.classList.toggle('selected', checkbox.checked);
        
        if (checkbox.checked) {
            selectedPlaybooks.add(playbookName);
            debugLog(`Adicionado à seleção: ${playbookName}`);
        } else {
            selectedPlaybooks.delete(playbookName);
            debugLog(`Removido da seleção: ${playbookName}`);
        }
        
        updateExecuteButton();

        document.querySelectorAll(`.execution-card[data-playbook-name="${playbookName}"]`).forEach(card => {
            card.classList.toggle('selected', checkbox.checked);
        });
    } else {
        debugLog(`ERRO: Checkbox não encontrado para playbook ${playbookName}`, 'error');
    }
}

/**
 * Seleciona ou deseleciona todas as playbooks visíveis
 * @param {boolean} checked - Se verdadeiro, seleciona todos; caso contrário, deseleciona
 */
function toggleAllPlaybooks(checked) {
    const playbookCheckboxes = document.querySelectorAll('.playbook-item input[type="checkbox"]');
    
    if (checked) {
        selectedPlaybooks.clear();
        playbookCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            const item = checkbox.closest('.playbook-item');
            item.classList.add('selected');
            selectedPlaybooks.add(checkbox.dataset.playbook);
            
            document.querySelectorAll(`.execution-card[data-playbook-name="${checkbox.dataset.playbook}"]`).forEach(card => {
                card.classList.add('selected');
            });
        });
        debugLog(`Selecionou todas as playbooks. Total: ${selectedPlaybooks.size}`);
    } else {
        selectedPlaybooks.clear();
        playbookCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            const item = checkbox.closest('.playbook-item');
            item.classList.remove('selected');
            
            document.querySelectorAll(`.execution-card[data-playbook-name="${checkbox.dataset.playbook}"]`).forEach(card => {
                card.classList.remove('selected');
            });
        });
        debugLog(`Desselecionou todas as playbooks. Total: ${selectedPlaybooks.size}`);
    }
    
    updateExecuteButton();
}

/**
 * Inicializa os filtros de sistema operacional
 */
function initializeOSFilters() {
    try {
      debugLog('Inicializando filtros de sistema operacional');
      
      const osFilter = document.getElementById('os-filter');
      if (!osFilter) {
        throw new Error('Elemento de filtro OS não encontrado');
      }
      
      // Limpar as opções existentes
      osFilter.innerHTML = '';
      
      // Adicionar grupos de SO
      const windowsGroup = document.createElement('optgroup');
      windowsGroup.label = 'Windows';
      
      const linuxGroup = document.createElement('optgroup');
      linuxGroup.label = 'Linux';
      
      // Mapear cada SO para seu grupo correspondente
      Object.entries(OS_MAPPING).forEach(([key, data]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = data.display;
        
        if (data.group === 'windows') {
          windowsGroup.appendChild(option);
        } else if (data.group === 'linux') {
          linuxGroup.appendChild(option);
        }
      });
      
      // Adicionar os grupos ao seletor
      osFilter.appendChild(linuxGroup);
      osFilter.appendChild(windowsGroup);
      
      // Definir valor padrão para 'oracle_linux_8'
      osFilter.value = 'oracle_linux_8';
      
      debugLog(`Filtros de SO inicializados. Valor inicial: ${osFilter.value}`);
    } catch (error) {
      debugLog(`Erro ao inicializar filtros de SO: ${error.message}`, 'error');
    }
}

/**
 * Inicializa os filtros de categoria
 */
function initializeFilters() {
    debugLog('Inicializando filtros');
    
    // Inicializa o filtro de categoria
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      // Verifica se já possui um valor armazenado no sessionStorage
      const savedCategory = sessionStorage.getItem('lastCategoryFilter');
      if (savedCategory) {
        categoryFilter.value = savedCategory;
      }
    }
    
    // Inicializa os filtros de sistema operacional (já existia no código original)
    initializeOSFilters();
    
    debugLog('Filtros inicializados com sucesso');
}

// Função para atualizar o painel de informações do SO selecionado com feedback visual
function updateOSInfoPanel() {
  try {
    const osFilter = document.getElementById('os-filter');
    if (!osFilter) return;
    
    const selectedOS = osFilter.value;
    const osMapping = OS_MAPPING[selectedOS];
    
    if (!osMapping) return;
    
    // Verifica se o painel já existe, se não, cria-o
    let osInfoPanel = document.querySelector('.os-info-panel');
    if (!osInfoPanel) {
      osInfoPanel = document.createElement('div');
      osInfoPanel.className = 'os-info-panel';
      
      // Insere antes do container de playbooks
      const playbooksContainer = document.getElementById('playbooks');
      if (playbooksContainer && playbooksContainer.parentNode) {
        playbooksContainer.parentNode.insertBefore(osInfoPanel, playbooksContainer);
      }
    }
    
    // Adiciona classe de animação para feedback visual da mudança
    osInfoPanel.classList.remove('animate-update');
    void osInfoPanel.offsetWidth; // Força reflow para reiniciar a animação
    osInfoPanel.classList.add('animate-update');
    
    // Atualiza o conteúdo do painel com o sistema selecionado
    osInfoPanel.className = `os-info-panel ${osMapping.group} animate-update`;
    osInfoPanel.innerHTML = `
      <div class="os-info-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${osMapping.group === 'windows' 
            ? '<rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="3" x2="12" y2="21"></line>'
            : '<path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path><path d="M12 20L12 16"></path><path d="M17 20L12 16L7 20"></path>'}
        </svg>
        <span class="os-name">${osMapping.display}</span>
      </div>
    `;
    
    // Adicionando estilos para a animação se não existirem
    if (!document.getElementById('os-panel-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'os-panel-animation-styles';
      style.textContent = `
        @keyframes panelUpdate {
          0% { background-color: rgba(255, 214, 0, 0.3); }
          100% { background-color: transparent; }
        }
        
        .os-info-panel.animate-update {
          animation: panelUpdate 1.5s ease-out;
        }
      `;
      document.head.appendChild(style);
    }
    
    debugLog(`Painel de informações do SO atualizado: ${osMapping.display}`);
  } catch (error) {
    debugLog(`Erro ao atualizar painel de informações do SO: ${error.message}`, 'error');
  }
}

// Exportar funções para uso global
window.loadPlaybooks = loadPlaybooks;
window.togglePlaybookSelection = togglePlaybookSelection;
window.toggleAllPlaybooks = toggleAllPlaybooks;
window.initializeOSFilters = initializeOSFilters;
window.initializeFilters = initializeFilters;
window.updateOSInfoPanel = updateOSInfoPanel;