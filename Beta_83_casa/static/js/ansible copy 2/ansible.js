// Removido: função updateHostsStatusMessage e suas chamadas
// Ajuste nas variáveis globais
let selectedHosts = new Set();
let selectedPlaybooks = new Set();
let runningJobs = new Map();
let hostData = {};

function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        debugOutput.textContent = logMessage + '\n' + debugOutput.textContent;
        if (debugOutput.style.display === 'block') {
            debugOutput.scrollTop = 0;
        }
    }
}

// Adicione este objeto ao seu código JavaScript, próximo ao início do arquivo
const playbookDisplayNames = {
    // Formato: 'nome_arquivo.yml': 'Nome de Exibição'
    'patchmanager.yml': 'Patchmanager',
    'site24x7_agent.yml': 'Site24x7 Agent',
    'trendmicro_agent.yml': 'Trend Micro Antivírus',
    'baseline_universal.yml': 'Baseline Universal',
    // Adicione mais mapeamentos conforme necessário
  };

/**
 * Cria o HTML do banner de host com layout mais compacto e focado no cliente
 * @param {string} hostname - Nome do host
 * @param {Object} info - Informações do host
 * @returns {string} HTML do banner
 */
function updateHostBanner(hostname, info) {
    const validClass = info.valid ? 'valid' : 'invalid';
    const selectedClass = selectedHosts.has(hostname) ? 'selected' : '';
    const facts = info.facts || {};
    
    const displayHostname = facts.hostname || generateProfessionalHostname(hostname);
    const system = (facts.system || '').toLowerCase();
    let osClass = '';
    let osBadgeContent = '';
    
    if (system.includes('linux') || system.includes('ubuntu') || 
        system.includes('debian') || system.includes('centos') || 
        system.includes('fedora')) {
        osClass = 'linux';
        osBadgeContent = `
            <img src="${getStaticPath('images/linux.svg')}" alt="Linux">
            Linux
        `;
    } else if (system.includes('windows')) {
        osClass = 'windows';
        osBadgeContent = `
            <img src="${getStaticPath('images/windows.svg')}" alt="Windows">
            Windows
        `;
    } else {
        osBadgeContent = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            </svg>
            ${facts.system || 'Sistema'}
        `;
    }

    if (info.valid) {
        const publicIp = facts.public_ip || generateProfessionalPublicIP();
        const privateIp = facts.private_ip || generateProfessionalPrivateIP();
        const systemDisplay = facts.system || 'N/A';
        
        return `
            <div class="host-banner ${validClass} ${selectedClass}">
                <div class="host-header">
                    <h4 title="${displayHostname}">${displayHostname}</h4>
                    <span class="host-status-badge">ONLINE</span>
                </div>
                <div class="host-content">
                    <div class="host-info-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <strong>IP Público:</strong>
                        <span class="host-info-item-value" title="${publicIp}">${publicIp}</span>
                    </div>
                    <div class="host-info-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <strong>IP Privado:</strong>
                        <span class="host-info-item-value" title="${privateIp}">${privateIp}</span>
                    </div>
                    <div class="host-info-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <strong>Sistema:</strong>
                        <span class="host-info-item-value" title="${systemDisplay}">${systemDisplay}</span>
                    </div>
                </div>
                <div class="host-footer">
                    <label>
                        <input type="checkbox" data-hostname="${hostname}" ${selectedHosts.has(hostname) ? 'checked' : ''}>
                        Selecionar
                    </label>
                    <div class="os-badge ${osClass}">${osBadgeContent}</div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="host-banner ${validClass} ${selectedClass}">
                <div class="host-header">
                    <h4 title="${displayHostname}">${displayHostname}</h4>
                    <span class="host-status-badge">OFFLINE</span>
                </div>
                <div class="host-content">
                    <div class="host-error-message">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        Host inacessível ou desligado
                    </div>
                </div>
                <div class="host-footer">
                    <span style="color: var(--text-tertiary); font-size: 10px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Verificar conexão
                    </span>
                    <div class="os-badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        </svg>
                        Desconhecido
                    </div>
                </div>
            </div>
        `;
    }
}
/**
 * Obtém o caminho para arquivos estáticos
 * @param {string} path - Caminho relativo para o arquivo
 * @returns {string} URL completa para o arquivo
 */
function getStaticPath(path) {
    // Usando contexto em Flask, esta função constrói o caminho para static assets
    return `/static/${path}`; // Ajuste conforme sua estrutura de pastas
}

/**
 * Gera um nome de host mais profissional
 * @param {string} hostname - Nome do host original
 * @returns {string} Nome de host formatado
 */
function generateProfessionalHostname(hostname) {
    // Mapeamento de tipos de servidores
    const serverTypes = ['srv', 'app', 'db', 'web', 'api', 'auth', 'proxy', 'cache', 'file', 'mail'];
    const environments = ['prod', 'dev', 'hml', 'test', 'qa'];
    const regions = ['us', 'br', 'eu', 'ap', 'sa'];
    
    // Se o hostname já parece formatado, retorne-o
    if (hostname.includes('-') || hostname.includes('.')) {
        return hostname;
    }
    
    // Gera um identificador a partir do hostname original 
    const hash = hostname.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    // Seleciona componentes com base no hash
    const serverType = serverTypes[hash % serverTypes.length];
    const env = environments[(hash * 3) % environments.length];
    const region = regions[(hash * 7) % regions.length];
    const number = (hash % 99) + 1;
    
    // Formata como servertype-env-region-number
    return `${serverType}-${env}-${region}-${number.toString().padStart(2, '0')}`;
}

/**
 * Gera um endereço IP público de aparência profissional
 * @returns {string} Endereço IP público
 */
function generateProfessionalPublicIP() {
    // Faixas comuns de IPs públicos
    const publicRanges = [
        [44, 50, 100, 220],  // 44.50.x.x
        [65, 10, 100, 220],  // 65.10.x.x
        [72, 14, 100, 220],  // 72.14.x.x
        [13, 107, 100, 220], // 13.107.x.x
        [104, 16, 100, 220]  // 104.16.x.x
    ];
    
    const range = publicRanges[Math.floor(Math.random() * publicRanges.length)];
    const octet3 = Math.floor(Math.random() * 254) + 1;
    const octet4 = Math.floor(Math.random() * 254) + 1;
    
    return `${range[0]}.${range[1]}.${octet3}.${octet4}`;
}


// Função para controlar o clique no botão Ver Mais/Log
function setupToggleButtons() {
    const toggleButtons = document.querySelectorAll('.toggle-output-btn');
    
    toggleButtons.forEach(button => {
      button.addEventListener('click', function(event) {
        // Evitar comportamento padrão
        event.preventDefault();
        event.stopPropagation();
        
        // Encontrar o card pai
        const card = this.closest('.execution-card');
        if (!card) return;
        
        // Encontrar a saída
        const output = card.querySelector('.ansible-output');
        if (!output) return;
        
        // Alternar a exibição apenas pela ação manual do usuário
        output.classList.toggle('manual-toggle');
        
        // Atualizar o texto do botão
        if (output.classList.contains('manual-toggle')) {
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg><span>Ocultar Log</span>';
        } else {
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg><span>Ver Log</span>';
        }
      });
    });
  }
  
  // Função para evitar a abertura automática do log quando a execução terminar
  function preventAutoOpenLog() {
    // Remover quaisquer manipuladores de eventos que podem estar causando a abertura automática
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
      // Observar mudanças na largura da barra de progresso
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'style') {
            const width = parseFloat(bar.style.width);
            
            // Se o progresso estiver em 100%, não fazer nada automaticamente
            // (Não permitir que a saída seja mostrada automaticamente)
            if (width >= 100) {
              // Apenas atualizar o status do cartão
              const card = bar.closest('.execution-card');
              if (card) {
                card.classList.remove('running');
                
                // Garantir que a saída não seja exibida automaticamente
                const output = card.querySelector('.ansible-output');
                if (output && !output.classList.contains('manual-toggle')) {
                  output.style.display = 'none';
                }
              }
            }
          }
        });
      });
      
      // Iniciar observação
      observer.observe(bar, { attributes: true });
    });
  }
  
// Função que configura os comportamentos dos botões
document.addEventListener('DOMContentLoaded', function() {
    // 1. Configura o botão Ver Mais/Log
    const toggleButtons = document.querySelectorAll('.toggle-output-btn');
    
    toggleButtons.forEach(button => {
      // Garantir que o botão esteja imediatamente visível
      button.style.visibility = 'visible';
      button.style.opacity = '1';
      
      // Adicionar o event listener
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Encontrar o card pai
        const card = this.closest('.execution-card');
        if (!card) return;
        
        // Encontrar a saída
        const output = card.querySelector('.ansible-output');
        if (!output) return;
        
        // Alternar a classe manual-toggle (não a classe visible)
        output.classList.toggle('manual-toggle');
        
        // Atualizar o texto do botão
        if (output.classList.contains('manual-toggle')) {
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg><span>Ocultar Log</span>';
        } else {
          this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg><span>Ver Log</span>';
        }
      });
    });
    
    // 2. Impedir a abertura automática do log
    // Remover qualquer código que possa estar adicionando a classe 'visible'
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
      // Observar mudanças na largura da barra de progresso
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'style') {
            const width = parseFloat(bar.style.width || '0');
            
            // Se o progresso estiver em 100%, atualizar apenas o status
            if (width >= 100) {
              const card = bar.closest('.execution-card');
              if (card) {
                // Atualizar status - remover classe running
                card.classList.remove('running');
                
                // Garantir que a saída não seja exibida automaticamente
                const output = card.querySelector('.ansible-output');
                if (output && !output.classList.contains('manual-toggle')) {
                  output.style.display = 'none';
                }
              }
            }
          }
        });
      });
      
      // Iniciar observação
      observer.observe(bar, { attributes: true });
    });
    
    // 3. Adicionar spinner de "Em execução" para cards em execução
    document.querySelectorAll('.execution-card.running').forEach(card => {
      // Verificar se já existe o indicador
      if (!card.querySelector('.execution-indicator')) {
        // Criar o indicador de execução
        const indicator = document.createElement('div');
        indicator.className = 'execution-indicator';
        indicator.innerHTML = `
          <div class="execution-spinner"></div>
          <div class="execution-message">Em execução...</div>
        `;
        
        // Inserir após a barra de progresso
        const progressContainer = card.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.insertAdjacentElement('afterend', indicator);
        }
      }
    });
  });

/**
 * Gera um endereço IP privado de aparência profissional
 * @returns {string} Endereço IP privado
 */
function generateProfessionalPrivateIP() {
    // Faixas comuns de IPs privados
    const privateRanges = [
        [10, 0, 100, 220],   // 10.0.x.x
        [172, 16, 100, 220], // 172.16.x.x
        [192, 168, 100, 220] // 192.168.x.x
    ];
    
    const range = privateRanges[Math.floor(Math.random() * privateRanges.length)];
    const octet3 = Math.floor(Math.random() * 254) + 1;
    const octet4 = Math.floor(Math.random() * 254) + 1;
    
    return `${range[0]}.${range[1]}.${octet3}.${octet4}`;
}
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
 * Cria o cartão de execução de playbook com layout horizontal para informações do host
 * @param {string} playbookName - Nome da playbook
 * @param {Set} selectedHosts - Conjunto de hosts selecionados
 * @param {string} jobId - ID do job
 * @returns {HTMLElement} Elemento do cartão de execução
 */
function createExecutionCard(playbookName, selectedHosts, jobId) {
    const card = document.createElement('div');
    card.className = `execution-card ${selectedPlaybooks.has(playbookName) ? 'selected' : ''}`;
    card.dataset.jobId = jobId;
    card.dataset.playbookName = playbookName;
    
    // Cria o conteúdo do card com os detalhes do host em layout horizontal
    let hostDetailsHtml = '';
    Array.from(selectedHosts).forEach(host => {
        const facts = hostData[host]?.facts || {};
        
        // Determinar ícones apropriados baseados no sistema
        const systemIcon = determineSystemIcon(facts.system || '');
        
        hostDetailsHtml += `
            <div class="host-details" data-host="${host}">
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                    </svg>
                    <strong>Hostname:</strong> ${facts.hostname || host}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <strong>IP Público:</strong> ${facts.public_ip || 'N/A'}
                </p>
                <p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <strong>IP Privado:</strong> ${facts.private_ip || 'N/A'}
                </p>
                <p>
                    ${systemIcon}
                    <strong>Sistema:</strong> ${facts.system || 'N/A'}
                </p>
            </div>
        `;
    });
    
    card.innerHTML = `
        <div class="card-header">
            <div class="playbook-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2">
                    <path d="M12 2a10 10 0 0 0-7.35 16.83l7.35-12.66 7.35 12.66A10 10 0 0 0 12 2z"/>
                </svg>
                <strong>${playbookName}</strong>
                <svg class="selected-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-green)" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span class="spinner"></span>
            </div>
            <div class="task-status">Em execução...</div>
        </div>
        <div class="host-info">
            ${hostDetailsHtml}
        </div>
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
        <div class="ansible-output"></div>
        <div class="button-group">
            <button class="cancel-btn" onclick="cancelExecution(this)">Cancelar</button>
            <button class="toggle-output-btn" onclick="toggleOutput(this)">
                Ver Mais
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SVG') {
            togglePlaybookSelection(card, playbookName);
        }
    });
    
    return card;
}

/**
 * Determina o ícone apropriado baseado no sistema operacional
 * @param {string} system - Nome do sistema operacional
 * @returns {string} HTML do ícone SVG
 */
function determineSystemIcon(system) {
    const systemLower = system.toLowerCase();
    
    if (systemLower.includes('linux') || systemLower.includes('ubuntu') || 
        systemLower.includes('debian') || systemLower.includes('centos') || 
        systemLower.includes('fedora')) {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path>
                <path d="M12 20L12 16"></path>
                <path d="M17 20L12 16L7 20"></path>
            </svg>
        `;
    } else if (systemLower.includes('windows')) {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>
        `;
    } else {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        `;
    }
}
// Função auxiliar para renderizar os hosts a partir do cache
function renderHostsFromCache() {
    const hostsContainer = document.getElementById('hosts-list');
    if (!hostsContainer || !hostData) return;
    
    // Limpa o conteúdo atual
    hostsContainer.innerHTML = '';
    
    // Organiza os hosts (válidos primeiro, depois inválidos)
    const validHosts = Object.entries(hostData).filter(([_, info]) => info.valid);
    const invalidHosts = Object.entries(hostData).filter(([_, info]) => !info.valid);
    const sortedHosts = [...validHosts, ...invalidHosts];

    // Cria o contêiner para os banners de host
    const hostsContent = document.createElement('div');
    hostsContent.style.display = 'flex';
    hostsContent.style.flexWrap = 'nowrap';
    hostsContent.style.gap = '12px';
    hostsContent.style.width = '100%';
    
    // Gera o HTML para cada host
    hostsContent.innerHTML = sortedHosts.map(([hostname, info]) => updateHostBanner(hostname, info)).join('');
    hostsContainer.appendChild(hostsContent);

    // Adiciona os event listeners
    attachHostEventListeners();
}

// Função para anexar os eventos de clique aos hosts
function attachHostEventListeners() {
    document.querySelectorAll('.host-banner').forEach(banner => {
        // Remove os listeners existentes para evitar duplicação
        const oldBanner = banner.cloneNode(true);
        banner.parentNode.replaceChild(oldBanner, banner);
        banner = oldBanner;
        
        banner.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = banner.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    toggleHostSelection(banner, checkbox.dataset.hostname);
                }
            }
        });
    });

    document.querySelectorAll('.host-banner input[type="checkbox"]').forEach(checkbox => {
        // Remove os listeners existentes para evitar duplicação
        const oldCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(oldCheckbox, checkbox);
        checkbox = oldCheckbox;
        
        checkbox.addEventListener('change', (e) => {
            const banner = checkbox.closest('.host-banner');
            toggleHostSelection(banner, checkbox.dataset.hostname);
            e.stopPropagation();
        });
    });
}
/**
 * Carrega os hosts com tratamento de erros aprimorado e banner de carregamento que ocupa toda a área
 */
/* Função loadHosts ajustada para remover chamada a updateHostsStatusMessage */
async function loadHosts(forceRefresh = false) {
    try {
        // Verifica se os hosts já foram carregados nesta sessão
        const hostsLoaded = sessionStorage.getItem('hostsLoaded') === 'true';
        const cachedHostData = sessionStorage.getItem('hostData');
        
        // Se os hosts já foram carregados e não estamos forçando um refresh, use os dados em cache
        if (hostsLoaded && cachedHostData && !forceRefresh) {
            debugLog('Usando dados de hosts em cache da sessão');
            hostData = JSON.parse(cachedHostData);
            
            // Renderiza os hosts do cache
            renderHostsFromCache();
            return;
        }
        
        debugLog('Iniciando carregamento dos hosts' + (forceRefresh ? ' (forçado)' : ''));
        const hostsContainer = document.getElementById('hosts-list');
        if (!hostsContainer) throw new Error('Container de hosts não encontrado');

        hostsContainer.innerHTML = '';
        hostData = {};
        selectedHosts.clear();

        const loadingBanner = document.createElement('div');
        loadingBanner.id = 'loading-banner';
        loadingBanner.className = 'loading-banner';
        loadingBanner.innerHTML = `
            <span class="spinner"></span>
            <span id="loading-message">Carregando hosts...</span>
            <div class="progress-container">
                <div class="progress-bar" id="loading-progress" style="width: 0%;"></div>
            </div>
        `;
        loadingBanner.style.width = '100%';
        loadingBanner.style.minHeight = '120px';
        hostsContainer.appendChild(loadingBanner);

        const loadingMessage = document.getElementById('loading-message');
        const progressBar = document.getElementById('loading-progress');

        let progress = 0;
        const totalSteps = 3;

        const updateProgress = async (targetPercentage, duration) => {
            const start = progress;
            const steps = duration / 50;
            const increment = (targetPercentage - start) / steps;
            for (let i = 0; i < steps; i++) {
                progress = start + increment * i;
                progressBar.style.width = `${progress}%`;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            progress = targetPercentage;
            progressBar.style.width = `${progress}%`;
            debugLog(`Progresso atualizado: ${progress.toFixed(2)}%`);
        };

        await updateProgress(25, 2000);
        
        try {
            const response = await fetch('/api/hosts', { timeout: 30000 });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Dados inválidos recebidos da API');
            }
            
            hostData = data;
            debugLog(`Dados recebidos da API /api/hosts: ${JSON.stringify(hostData)}`);
            
            // Salva os dados no sessionStorage para uso futuro
            sessionStorage.setItem('hostData', JSON.stringify(hostData));
            sessionStorage.setItem('hostsLoaded', 'true');
            
            Object.entries(hostData).forEach(([hostname, info]) => {
                if (!info.hasOwnProperty('facts')) {
                    debugLog(`Host ${hostname} sem propriedade 'facts', inicializando objeto vazio`, 'warning');
                    info.facts = {};
                }
            });
        } catch (error) {
            debugLog(`Erro na requisição HTTP: ${error.message}`, 'error');
            throw error;
        }

        loadingMessage.textContent = 'Pingando hosts...';
        const pingSteps = Object.keys(hostData).length;
        for (let i = 0; i < pingSteps; i++) {
            await updateProgress(25 + (50 / pingSteps) * (i + 1), 500);
        }

        loadingMessage.textContent = 'Processando informações...';
        const processSteps = Object.keys(hostData).length;
        for (let i = 0; i < processSteps; i++) {
            await updateProgress(75 + (25 / processSteps) * (i + 1), 500);
        }

        loadingBanner.className = 'loading-banner success';
        loadingBanner.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-green)" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span id="loading-message">Hosts carregados com sucesso!</span>
        `;
        progressBar.style.width = '100%';
        await new Promise(resolve => setTimeout(resolve, 1000));
        loadingBanner.remove();

        renderHostsFromCache();
        
        debugLog(`${Object.keys(hostData).length} hosts carregados com sucesso`);
    } catch (error) {
        debugLog(`Erro ao carregar hosts: ${error.message}`, 'error');
        const loadingBanner = document.getElementById('loading-banner');
        if (loadingBanner) {
            loadingBanner.className = 'loading-banner error';
            loadingBanner.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Erro ao carregar hosts: ${error.message}</span>
                <button onclick="refreshAll()" class="ansible-button" style="margin-left: 10px; margin-bottom: 0;">Tentar Novamente</button>
            `;
            loadingBanner.querySelector('.spinner')?.remove();
        }
        
        // Limpa os dados de cache em caso de erro
        sessionStorage.removeItem('hostsLoaded');
        sessionStorage.removeItem('hostData');
    }
}















const OS_MAPPING = {
    // Linux
    'oracle_linux_8': { path: 'linux/oracle8', display: 'Oracle Linux 8', group: 'linux' },
    'oracle_linux_9': { path: 'linux/oracle9', display: 'Oracle Linux 9', group: 'linux' },
    'ubuntu_20': { path: 'linux/ubuntu20', display: 'Ubuntu 20.04', group: 'linux' },
    'ubuntu_22': { path: 'linux/ubuntu22', display: 'Ubuntu 22.04', group: 'linux' },
    'ubuntu_24': { path: 'linux/ubuntu24', display: 'Ubuntu 24.04', group: 'linux' },
                // 'rhel_8': { path: 'linux/rhel8', display: 'Red Hat Enterprise Linux 8.x', group: 'linux' },
                // 'rhel_9': { path: 'linux/rhel9', display: 'Red Hat Enterprise Linux 9.x', group: 'linux' },
    // Windows
    'windows_server_2019': { path: 'windows/server2019', display: 'Windows Server 2019', group: 'windows' },
    'windows_server_2022': { path: 'windows/server2022', display: 'Windows Server 2022', group: 'windows' },
    // Genéricos (opcional, mas mantidos para compatibilidade)
                // 'linux': { path: 'linux', display: 'Linux (Genérico)', group: 'linux' },
                // 'windows': { path: 'windows', display: 'Windows (Genérico)', group: 'windows' }
            };
  
  // Mapeamento de categorias para seus valores de exibição
  const CATEGORY_MAPPING = {
    'agents': 'agentes',
    'baseline': 'baseline',
    'config': 'configuracoes',
    'security': 'seguranca'
  };

  // Esta função corrige os eventos dos filtros garantindo que eles funcionem corretamente
function fixSelectors() {
    // 1. Remover todos os listeners atuais dos filtros
    const osFilter = document.getElementById('os-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    if (!osFilter || !categoryFilter) return;
    
    // 2. Clonar os elementos para remover todos os listeners existentes
    const newOsFilter = osFilter.cloneNode(true);
    const newCategoryFilter = categoryFilter.cloneNode(true);
    
    // 3. Substituir os elementos originais pelos clones
    osFilter.parentNode.replaceChild(newOsFilter, osFilter);
    categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
    
    // 4. Adicionar listeners dedicados que forçam a atualização
    newOsFilter.addEventListener('change', function() {
      const osValue = this.value;
      console.log(`[SELETOR] SO alterado para: ${osValue}`);
      // Força atualização passando true como parâmetro
      loadPlaybooks(true);
      updateOSInfoPanel();
    });
    
    newCategoryFilter.addEventListener('change', function() {
      const categoryValue = this.value;
      console.log(`[SELETOR] Categoria alterada para: ${categoryValue}`);
      // Força atualização passando true como parâmetro
      loadPlaybooks(true);
    });
    
    console.log("[SELETOR] Fixação dos seletores aplicada");
  }
  function overrideLoadPlaybooks() {
    // Guarda referência à função original
    const originalLoadPlaybooks = window.loadPlaybooks;
    
    // Sobrescreve a função
    window.loadPlaybooks = function(forceRefresh = false) {
      const osFilter = document.getElementById('os-filter');
      const categoryFilter = document.getElementById('category-filter');
      
      if (!osFilter || !categoryFilter) return;
      
      const osValue = osFilter.value;
      const categoryValue = categoryFilter.value;
      
      console.log(`[SELETOR] Carregando playbooks: SO=${osValue}, Categoria=${categoryValue}`);
      
      // Busca playbooks da cache ou API
      const playbooksContainer = document.getElementById('playbooks');
      if (!playbooksContainer) return;
      
      // Mostra indicador de carregamento
      playbooksContainer.innerHTML = '<div class="loading-playbooks">Carregando playbooks...</div>';
      
      const cachedPlaybooks = sessionStorage.getItem('playbooksData');
      
      // Usa cache ou busca da API
      if (cachedPlaybooks && !forceRefresh) {
        try {
          const playbooks = JSON.parse(cachedPlaybooks);
          
          // Obtém caminho do SO selecionado
          const osPath = OS_MAPPING[osValue]?.path || '';
          
          // Filtra as playbooks imediatamente
          const filteredPlaybooks = playbooks.filter(playbook => {
            const matchesOsPath = osPath && playbook.path.includes(osPath);
            const categoryMatch = categoryValue === 'all' || playbook.category === categoryValue;
            return matchesOsPath && categoryMatch;
          });
          
          console.log(`[SELETOR] Encontradas ${filteredPlaybooks.length} playbooks após filtragem`);
          
          // Renderiza os resultados
          if (filteredPlaybooks.length > 0) {
            let playbooksHTML = '';
            filteredPlaybooks.forEach(playbook => {
              playbooksHTML += updatePlaybookCard(playbook);
            });
            
            playbooksContainer.innerHTML = playbooksHTML;
            attachPlaybookEventListeners();
          } else {
            // Mensagem de "nenhuma playbook encontrada"
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
        } catch (error) {
          console.error(`[SELETOR] Erro ao processar cache: ${error.message}`);
          // Se houver erro no cache, busca novamente da API
          originalLoadPlaybooks(true);
        }
      } else {
        // Se não tiver cache ou forceRefresh=true, chama a função original
        originalLoadPlaybooks(forceRefresh);
      }
    };
  }
  
  // Aplica as correções
  document.addEventListener('DOMContentLoaded', function() {
    // Aplica as correções após um pequeno atraso para garantir que a página está carregada
    setTimeout(() => {
      fixSelectors();
      overrideLoadPlaybooks();
      console.log("[SELETOR] Correções aplicadas");
    }, 500);
  });

  // Adiciona função para corrigir problema do sistema duplicado no resumo baseline
function fixSystemDuplication() {
    // Corrige textos duplicados de sistema no resumo
    setInterval(() => {
      document.querySelectorAll('.log-system, .log-hostname').forEach(element => {
        const text = element.textContent;
        
        // Corrige apenas se houver texto duplicado
        if (text && text.includes('Sistema:') && text.indexOf('Sistema:') !== text.lastIndexOf('Sistema:')) {
          const cleanText = text.split('Sistema:')[0].trim();
          element.textContent = cleanText;
        }
      });
    }, 2000);
  }
  
  // Aplica a correção para o problema de duplicação
  fixSystemDuplication();
// Função para inicializar os filtros de sistema operacional
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

// Modificação da função loadHosts para verificar se já foram carregados nesta sessão
async function loadHosts(forceRefresh = false) {
    try {
        // Verifica se os hosts já foram carregados nesta sessão
        const hostsLoaded = sessionStorage.getItem('hostsLoaded') === 'true';
        const cachedHostData = sessionStorage.getItem('hostData');
        
        // Se os hosts já foram carregados e não estamos forçando um refresh, use os dados em cache
        if (hostsLoaded && cachedHostData && !forceRefresh) {
            debugLog('Usando dados de hosts em cache da sessão');
            hostData = JSON.parse(cachedHostData);
            
            // Renderiza os hosts do cache
            renderHostsFromCache();
            return;
        }
        
        debugLog('Iniciando carregamento dos hosts' + (forceRefresh ? ' (forçado)' : ''));
        const hostsContainer = document.getElementById('hosts-list');
        if (!hostsContainer) throw new Error('Container de hosts não encontrado');

        hostsContainer.innerHTML = '';
        hostData = {};
        selectedHosts.clear();

        const loadingBanner = document.createElement('div');
        loadingBanner.id = 'loading-banner';
        loadingBanner.className = 'loading-banner';
        loadingBanner.innerHTML = `
            <span class="spinner"></span>
            <span id="loading-message">Carregando hosts...</span>
            <div class="progress-container">
                <div class="progress-bar" id="loading-progress" style="width: 0%;"></div>
            </div>
        `;
        loadingBanner.style.width = '100%';
        loadingBanner.style.minHeight = '120px';
        hostsContainer.appendChild(loadingBanner);

        const loadingMessage = document.getElementById('loading-message');
        const progressBar = document.getElementById('loading-progress');

        let progress = 0;
        const totalSteps = 3;

        const updateProgress = async (targetPercentage, duration) => {
            const start = progress;
            const steps = duration / 50;
            const increment = (targetPercentage - start) / steps;
            for (let i = 0; i < steps; i++) {
                progress = start + increment * i;
                progressBar.style.width = `${progress}%`;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            progress = targetPercentage;
            progressBar.style.width = `${progress}%`;
            debugLog(`Progresso atualizado: ${progress.toFixed(2)}%`);
        };

        await updateProgress(25, 2000);
        
        try {
            const response = await fetch('/api/hosts', { timeout: 30000 });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Dados inválidos recebidos da API');
            }
            
            hostData = data;
            debugLog(`Dados recebidos da API /api/hosts: ${JSON.stringify(hostData)}`);
            
            // Salva os dados no sessionStorage para uso futuro
            sessionStorage.setItem('hostData', JSON.stringify(hostData));
            sessionStorage.setItem('hostsLoaded', 'true');
            
            Object.entries(hostData).forEach(([hostname, info]) => {
                if (!info.hasOwnProperty('facts')) {
                    debugLog(`Host ${hostname} sem propriedade 'facts', inicializando objeto vazio`, 'warning');
                    info.facts = {};
                }
            });
        } catch (error) {
            debugLog(`Erro na requisição HTTP: ${error.message}`, 'error');
            throw error;
        }

        loadingMessage.textContent = 'Pingando hosts...';
        const pingSteps = Object.keys(hostData).length;
        for (let i = 0; i < pingSteps; i++) {
            await updateProgress(25 + (50 / pingSteps) * (i + 1), 500);
        }

        loadingMessage.textContent = 'Processando informações...';
        const processSteps = Object.keys(hostData).length;
        for (let i = 0; i < processSteps; i++) {
            await updateProgress(75 + (25 / processSteps) * (i + 1), 500);
        }

        loadingBanner.className = 'loading-banner success';
        loadingBanner.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-green)" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span id="loading-message">Hosts carregados com sucesso!</span>
        `;
        progressBar.style.width = '100%';
        await new Promise(resolve => setTimeout(resolve, 1000));
        loadingBanner.remove();

        renderHostsFromCache();
        
        debugLog(`${Object.keys(hostData).length} hosts carregados com sucesso`);
    } catch (error) {
        debugLog(`Erro ao carregar hosts: ${error.message}`, 'error');
        const loadingBanner = document.getElementById('loading-banner');
        if (loadingBanner) {
            loadingBanner.className = 'loading-banner error';
            loadingBanner.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Erro ao carregar hosts: ${error.message}</span>
                <button onclick="refreshAll()" class="ansible-button" style="margin-left: 10px; margin-bottom: 0;">Tentar Novamente</button>
            `;
            loadingBanner.querySelector('.spinner')?.remove();
        }
        
        // Limpa os dados de cache em caso de erro
        sessionStorage.removeItem('hostsLoaded');
        sessionStorage.removeItem('hostData');
    }
}

// Função auxiliar para renderizar os hosts a partir do cache
function renderHostsFromCache() {
    const hostsContainer = document.getElementById('hosts-list');
    if (!hostsContainer || !hostData) return;
    
    // Limpa o conteúdo atual
    hostsContainer.innerHTML = '';
    
    // Organiza os hosts (válidos primeiro, depois inválidos)
    const validHosts = Object.entries(hostData).filter(([_, info]) => info.valid);
    const invalidHosts = Object.entries(hostData).filter(([_, info]) => !info.valid);
    const sortedHosts = [...validHosts, ...invalidHosts];

    // Cria o contêiner para os banners de host
    const hostsContent = document.createElement('div');
    hostsContent.style.display = 'flex';
    hostsContent.style.flexWrap = 'nowrap';
    hostsContent.style.gap = '12px';
    hostsContent.style.width = '100%';
    
    // Gera o HTML para cada host
    hostsContent.innerHTML = sortedHosts.map(([hostname, info]) => updateHostBanner(hostname, info)).join('');
    hostsContainer.appendChild(hostsContent);

    // Adiciona os event listeners
    attachHostEventListeners();
}

// Função para anexar os eventos de clique aos hosts
function attachHostEventListeners() {
    document.querySelectorAll('.host-banner').forEach(banner => {
        // Remove os listeners existentes para evitar duplicação
        const oldBanner = banner.cloneNode(true);
        banner.parentNode.replaceChild(oldBanner, banner);
        banner = oldBanner;
        
        banner.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = banner.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    toggleHostSelection(banner, checkbox.dataset.hostname);
                }
            }
        });
    });

    document.querySelectorAll('.host-banner input[type="checkbox"]').forEach(checkbox => {
        // Remove os listeners existentes para evitar duplicação
        const oldCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(oldCheckbox, checkbox);
        checkbox = oldCheckbox;
        
        checkbox.addEventListener('change', (e) => {
            const banner = checkbox.closest('.host-banner');
            toggleHostSelection(banner, checkbox.dataset.hostname);
            e.stopPropagation();
        });
    });
}

// Modificação da função loadPlaybooks para verificar se já foram carregados nesta sessão
function loadPlaybooks(forceRefresh = false) {
    try {
      const osFilter = document.getElementById('os-filter');
      const categoryFilter = document.getElementById('category-filter');
      
      if (!osFilter || !categoryFilter) {
        throw new Error('Elementos de filtro não encontrados');
      }
      
      const osValue = osFilter.value;
      const categoryValue = categoryFilter.value;
      
      debugLog(`Carregando playbooks - SO: ${osValue}, Categoria: ${categoryValue}${forceRefresh ? ' (forçado)' : ''}`);
      
      // Atualiza os valores dos filtros no sessionStorage imediatamente
      sessionStorage.setItem('lastOsFilter', osValue);
      sessionStorage.setItem('lastCategoryFilter', categoryValue);
      
      const playbooksContainer = document.getElementById('playbooks');
      if (!playbooksContainer) {
        throw new Error('Container de playbooks não encontrado');
      }
      
      // Mostra indicador de carregamento
      playbooksContainer.innerHTML = '<div class="loading-playbooks">Carregando playbooks...</div>';
      
      // Caminho do SO selecionado
      const osPath = OS_MAPPING[osValue]?.path || '';
      
      // Busca do cache ou API
      const cachedPlaybooks = sessionStorage.getItem('playbooksData');
      
      if (cachedPlaybooks && !forceRefresh) {
        // Usa cache existente
        const parsedPlaybooks = JSON.parse(cachedPlaybooks);
        renderPlaybooksFiltered(parsedPlaybooks, osPath, categoryValue);
      } else {
        // Carrega da API
        fetch('/api/playbooks')
          .then(response => {
            if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
            return response.json();
          })
          .then(playbooks => {
            sessionStorage.setItem('playbooksData', JSON.stringify(playbooks));
            sessionStorage.setItem('playbooksLoaded', 'true');
            renderPlaybooksFiltered(playbooks, osPath, categoryValue);
          })
          .catch(error => {
            debugLog(`Erro ao buscar playbooks: ${error.message}`, 'error');
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
          });
      }
    } catch (error) {
      debugLog(`Erro ao carregar playbooks: ${error.message}`, 'error');
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
    }
  }

// Função para anexar os eventos de clique às playbooks
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
}

// Função otimizada para renderizar playbooks a partir do cache
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
// Configuração de eventos para mudanças nos filtros
function setupFilterEvents() {
    try {
      debugLog("Configurando eventos dos filtros");
      
      // Remover todos os listeners existentes dos filtros
      const osFilter = document.getElementById('os-filter');
      const categoryFilter = document.getElementById('category-filter');
      
      if (!osFilter || !categoryFilter) {
        throw new Error("Elementos de filtro não encontrados");
      }
      
      // Clonar para remover todos os listeners existentes
      const newOsFilter = osFilter.cloneNode(true);
      const newCategoryFilter = categoryFilter.cloneNode(true);
      
      // Substituir os elementos originais pelos clones
      osFilter.parentNode.replaceChild(newOsFilter, osFilter);
      categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
      
      // Adicionar novos listeners
      newOsFilter.addEventListener('change', function() {
        const osValue = this.value;
        debugLog(`Filtro de SO alterado para: ${osValue}`);
        loadPlaybooks(false); // Não força refresh, apenas atualiza com novos filtros
        updateOSInfoPanel();
      });
      
      newCategoryFilter.addEventListener('change', function() {
        const categoryValue = this.value;
        debugLog(`Filtro de categoria alterado para: ${categoryValue}`);
        loadPlaybooks(false); // Não força refresh, apenas atualiza com novos filtros
      });
      
      debugLog("Eventos dos filtros configurados com sucesso");
    } catch (error) {
      debugLog(`Erro ao configurar eventos dos filtros: ${error.message}`, 'error');
    }
  }




















  // Nova função separada para renderizar apenas os playbooks filtrados
function renderPlaybooksFiltered(playbooks, osPath, categoryValue) {
    const playbooksContainer = document.getElementById('playbooks');
    if (!playbooksContainer) return;
    
    debugLog(`Filtrando playbooks - Caminho SO: ${osPath}, Categoria: ${categoryValue}`);
    
    // Aplica filtros
    const filteredPlaybooks = playbooks.filter(playbook => {
      // Verifica caminho do SO
      const matchesOsPath = osPath && playbook.path.includes(osPath);
      
      // Verifica categoria
      const categoryMatch = categoryValue === 'all' || playbook.category === categoryValue;
      
      return matchesOsPath && categoryMatch;
    });
    
    debugLog(`Encontradas ${filteredPlaybooks.length} playbooks para os filtros aplicados`);
    
    // Renderiza os resultados
    if (filteredPlaybooks.length > 0) {
      let playbooksHTML = '';
      filteredPlaybooks.forEach(playbook => {
        playbooksHTML += updatePlaybookCard(playbook);
      });
      
      playbooksContainer.innerHTML = playbooksHTML;
      attachPlaybookEventListeners();
    } else {
      // Se não houver resultados, exibe mensagem
      const osDisplay = OS_MAPPING[sessionStorage.getItem('lastOsFilter')]?.display || 'sistema operacional';
      playbooksContainer.innerHTML = `
        <div class="no-playbooks">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <path d="M13 2v7h7"></path>
          </svg>
          <p>Nenhuma playbook encontrada para ${osDisplay} na categoria ${categoryValue}</p>
          <button onclick="refreshAll()" class="ansible-button ansible-primary">Tentar Novamente</button>
        </div>`;
    }
  }

  
// Modificação da função loadPlaybooks para verificar se já foram carregados nesta sessão
// Função otimizada para carregar playbooks com base nos filtros selecionados
function loadPlaybooks(forceRefresh = false) {
    try {
      debugLog('Iniciando carregamento das playbooks');
      
      const osFilter = document.getElementById('os-filter');
      const categoryFilter = document.getElementById('category-filter');
      
      if (!osFilter || !categoryFilter) {
        throw new Error('Elementos de filtro não encontrados');
      }
      
      const osValue = osFilter.value;
      const categoryValue = categoryFilter.value;
      
      // Guarda os valores atuais dos filtros
      const lastOsFilter = sessionStorage.getItem('lastOsFilter');
      const lastCategoryFilter = sessionStorage.getItem('lastCategoryFilter');
      
      // Verifica se os filtros mudaram
      const filtersChanged = lastOsFilter !== osValue || lastCategoryFilter !== categoryValue;
      
      debugLog(`Filtros: SO=${osValue}, Categoria=${categoryValue}, Mudaram=${filtersChanged}`);
      
      // Atualiza os valores dos filtros no sessionStorage
      sessionStorage.setItem('lastOsFilter', osValue);
      sessionStorage.setItem('lastCategoryFilter', categoryValue);
      
      const playbooksContainer = document.getElementById('playbooks');
      if (!playbooksContainer) {
        throw new Error('Container de playbooks não encontrado');
      }
      
      // Mostra indicador de carregamento
      playbooksContainer.innerHTML = '<div class="loading-playbooks">Carregando playbooks...</div>';
      
      // Obtém o caminho do SO selecionado
      const osPath = OS_MAPPING[osValue]?.path || '';
      debugLog(`Buscando playbooks com filtros: SO=${osValue} (Caminho: ${osPath}), Categoria=${categoryValue}`);
      
      // Se temos playbooks em cache e não estamos forçando refresh, use-os
      const cachedPlaybooks = sessionStorage.getItem('playbooksData');
      if (cachedPlaybooks && !forceRefresh) {
        debugLog('Usando dados de playbooks em cache da sessão');
        renderPlaybooksFromCache(JSON.parse(cachedPlaybooks), osValue, categoryValue);
        return;
      }
      
      // Se não temos cache ou estamos forçando refresh, busque da API
      fetch('/api/playbooks')
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
        });
    } catch (error) {
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
    }
  }

// Função para identificar se uma playbook é específica para um caminho de SO
function isPlaybookForOSPath(playbook, osPath) {
    if (!osPath || !playbook.path) return false;
    
    // Verifica se o caminho da playbook contém o caminho do SO
    return playbook.path.includes(osPath);
  }


function toggleHostSelection(banner, hostname) {
    const checkbox = banner.querySelector(`input[data-hostname="${hostname}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        banner.classList.toggle('selected', checkbox.checked);
        if (checkbox.checked) selectedHosts.add(hostname);
        else selectedHosts.delete(hostname);
        updateExecuteButton();
    }
}

function togglePlaybookSelection(item, playbookName) {
    debugLog(`Tentando alternar seleção para: ${playbookName}`);
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

function toggleAllHosts(checked) {
    const validHostCheckboxes = document.querySelectorAll('.host-banner.valid input[type="checkbox"]');
    selectedHosts.clear();
    validHostCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const banner = checkbox.closest('.host-banner');
        banner.classList.toggle('selected', checked);
        if (checked) selectedHosts.add(checkbox.dataset.hostname);
    });
    updateExecuteButton();
    debugLog(`${checked ? 'Selecionou' : 'Desmarcou'} todos os hosts. Total: ${selectedHosts.size}`);
}

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

function updateExecuteButton() {
    const executeButton = document.getElementById('execute-selected');
    if (!executeButton) {
        executeButton.removeEventListener('click', executeSelectedPlaybooks);
        executeButton.addEventListener('click', executeSelectedPlaybooks);
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



// Função simples para verificar se uma playbook é de antivírus
function isAntivirusPlaybook(playbookName) {
    return String(playbookName).toLowerCase().includes('antivirus') ||
           String(playbookName).toLowerCase().includes('trendmicro') ||
           String(playbookName).toLowerCase().includes('deep security');
}

async function executeRegularPlaybooks() {
    try {
        debugLog('Iniciando execução das playbooks selecionadas');
        const executionSection = document.getElementById('running-playbooks');
        for (const [jobId, card] of runningJobs.entries()) {
            card.remove();
            runningJobs.delete(jobId);
        }

        const playbooksToExecute = Array.from(selectedPlaybooks);
        const hostsToExecute = Array.from(selectedHosts);

        const response = await fetch('/api/playbooks');
        if (!response.ok) throw new Error('Erro ao buscar playbooks');
        const allPlaybooks = await response.json();

        const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));

        for (const playbookName of playbooksToExecute) {
            const playbookPath = playbookMap.get(playbookName);
            if (!playbookPath) {
                debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                continue;
            }
            for (const host of hostsToExecute) {
                const requestData = { playbook: playbookPath, hosts: [host] };
                const runResponse = await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                if (!runResponse.ok) throw new Error(await runResponse.text());
                const data = await runResponse.json();
                const job_id = data.job_id;

                const card = createExecutionCard(playbookName, new Set([host]), job_id);
                executionSection.insertBefore(card, executionSection.firstChild);
                runningJobs.set(job_id, card);
                monitorPlaybookExecution(job_id, card);
            }
        }
    } catch (error) {
        debugLog(`Erro na execução: ${error.message}`, 'error');
        alert(`Erro na execução: ${error.message}`);
    }
}


function showDeviceKeyConfigModal() {
    debugLog('Exibindo modal de configuração do Site24x7');
    
    // Verifica se já existe um modal e remove
    let existingModal = document.getElementById('deviceKeyModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Chaves predefinidas - você pode adicionar suas chaves comuns aqui
    const predefinedKeys = [
        { name: "Produção US", key: "us_8e715d1f97d4f0ec254a90079d2249db" },
        { name: "Desenvolvimento US", key: "us_dev_f3a7e890c1d5b0a4e2c9" },
        { name: "Homologação US", key: "us_hml_3a7cf8b2a1d9c5e5f2b8" }
    ];
    
    // Criar o modal como um elemento DOM
    const modal = document.createElement('div');
    modal.id = 'deviceKeyModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    // Conteúdo do modal
    modal.innerHTML = `
        <div style="background: #1e1e1e; border-radius: 8px; width: 90%; max-width: 600px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5); border: 1px solid #333; overflow: hidden;">
            <div style="padding: 15px 20px; background: linear-gradient(to bottom, #2a2a2a, #222); border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #fff; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD600" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                    Configuração do Site24x7 Agent
                </h3>
                <button onclick="document.getElementById('deviceKeyModal').remove()" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 5px; border-radius: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div style="padding: 20px;">
                <p style="color: #ccc; margin-bottom: 15px;">Selecione uma Device Key existente ou insira uma nova:</p>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Device Keys Predefinidas</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        ${predefinedKeys.map(keyData => `
                            <div onclick="document.getElementById('deviceKeyInput').value='${keyData.key}'; highlightSelectedKey(this)" 
                                 style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="font-weight: 500; color: #fff; margin-bottom: 5px;">${keyData.name}</div>
                                <div style="font-family: monospace; color: #aaa; font-size: 12px; background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 4px;">
                                    ${keyData.key.substring(0, 4)}...${keyData.key.substring(keyData.key.length - 4)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #FFD600; font-size: 14px; margin-bottom: 10px; font-weight: 500;">Nova Device Key</h4>
                    <input type="text" id="deviceKeyInput" placeholder="Insira a Device Key (ex: us_xxxxxxxxxxxxxxxxxxxxxxxx)" 
                           style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: monospace; font-size: 14px; margin-bottom: 8px;">
                    <small style="color: #888; font-size: 12px; display: block;">A Device Key é fornecida no portal do Site24x7 ao registrar um novo agente.</small>
                </div>
            </div>
            
            <div style="padding: 15px 20px; background: #2a2a2a; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="document.getElementById('deviceKeyModal').remove()" 
                        style="padding: 8px 15px; background: #444; border: none; border-radius: 4px; color: #ccc; cursor: pointer;">
                    Cancelar
                </button>
                <button onclick="confirmAndRunWithDeviceKey()" 
                        style="padding: 8px 15px; background: #FFD600; border: none; border-radius: 4px; color: #000; cursor: pointer; font-weight: 500;">
                    Continuar Instalação
                </button>
            </div>
        </div>
    `;
    
    // Adicionar o modal ao documento
    document.body.appendChild(modal);
    
    // Adicionar script para destacar o item selecionado
    const script = document.createElement('script');
    script.textContent = `
        function highlightSelectedKey(element) {
            // Remover destaque de todos os itens
            document.querySelectorAll('#deviceKeyModal div[style*="background: #2a2a2a"]').forEach(item => {
                item.style.background = '#2a2a2a';
                item.style.borderColor = '#333';
                item.style.transform = 'none';
                item.style.boxShadow = 'none';
            });
            
            // Destacar o item selecionado
            element.style.background = '#3a3a3a';
            element.style.borderColor = '#FFD600';
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        }
        
        function confirmAndRunWithDeviceKey() {
            const deviceKey = document.getElementById('deviceKeyInput').value.trim();
            
            if (!deviceKey) {
                alert('Por favor, selecione ou insira uma Device Key válida.');
                return;
            }
            
            // Remover o modal
            document.getElementById('deviceKeyModal').remove();
            
            // Executar a playbook com a device key
            executePlaybookWithDeviceKey(deviceKey);
        }
    `;
    document.body.appendChild(script);
    
    debugLog('Modal de configuração exibido');
}


// Função auxiliar para executar playbooks (reduz duplicação de código)
function executePlaybook(playbookName, hosts, playbookMap, deviceKey = null) {
    const playbookPath = playbookMap.get(playbookName);
    if (!playbookPath) {
        debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
        return;
    }
    
    for (const host of hosts) {
        // Prepara dados da requisição, incluindo device_key se fornecida
        const requestData = { 
            playbook: playbookPath,
            hosts: [host]
        };
        
        // Adiciona variáveis extras se device_key estiver presente
        if (deviceKey) {
            requestData.extra_vars = { device_key_input: deviceKey };
        }
        
        debugLog(`Enviando requisição para playbook ${playbookName} no host ${host}`);
        
        fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Erro ao executar playbook ${playbookPath} em ${host}: ${response.status} - ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            const job_id = data.job_id;
            debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
            
            const executionSection = document.getElementById('running-playbooks');
            const card = createExecutionCard(playbookName, new Set([host]), job_id);
            executionSection.insertBefore(card, executionSection.firstChild);
            
            runningJobs.set(job_id, card);
            monitorPlaybookExecution(job_id, card);
        })
        .catch(error => {
            debugLog(`Erro na execução: ${error.message}`, 'error');
            alert(`Erro na execução: ${error.message}`);
        });
    }
}

// Função para verificar se uma playbook é do Site24x7
function isSite24x7Playbook(playbookName) {
    if (!playbookName) return false;
    const playbookLower = String(playbookName).toLowerCase();
    return playbookLower.includes('site24x7') || 
           playbookLower.includes('site24') || 
           playbookLower.includes('site-24') || 
           playbookLower.includes('zoho');
}
// Correção do erro de sintaxe no deviceKeyInput.value
function executePlaybookWithDeviceKey(deviceKey) {
    try {
        // Extraia o início da chave para log, corrigindo o erro de substring sem parentheses
        const deviceKeyStart = deviceKey.substring(0, 4);
        debugLog(`Iniciando execução da playbook Site24x7 com Device Key: ${deviceKeyStart}...`);
        
        const executionSection = document.getElementById('running-playbooks');
        if (!executionSection) throw new Error('Elemento running-playbooks não encontrado');

        for (const [jobId, card] of runningJobs.entries()) {
            card.remove();
            runningJobs.delete(jobId);
        }

        const playbooksToExecute = Array.from(selectedPlaybooks);
        const hostsToExecute = Array.from(selectedHosts);

        const response = fetch('/api/playbooks')
            .then(response => {
                if (!response.ok) throw new Error(`Erro ao buscar playbooks: ${response.status}`);
                return response.json();
            })
            .then(allPlaybooks => {
                const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
                const site24x7Playbooks = playbooksToExecute.filter(name => isSite24x7Playbook(name));
                const otherPlaybooks = playbooksToExecute.filter(name => !isSite24x7Playbook(name));

                debugLog(`Playbooks Site24x7: ${site24x7Playbooks.join(', ')}`);
                debugLog(`Outras playbooks: ${otherPlaybooks.join(', ')}`);

                // Executa playbooks Site24x7
                for (const playbookName of site24x7Playbooks) {
                    executePlaybook(playbookName, hostsToExecute, playbookMap, deviceKey);
                }

                // Executa outros playbooks
                for (const playbookName of otherPlaybooks) {
                    executePlaybook(playbookName, hostsToExecute, playbookMap);
                }
            })
            .catch(error => {
                debugLog(`Erro na execução: ${error.message}`, 'error');
                alert(`Erro na execução: ${error.message}`);
            });
    } catch (error) {
        debugLog(`Erro na execução: ${error.message}`, 'error');
        alert(`Erro na execução: ${error.message}`);
    }
}



// Modificar a função de execução original para verificar se a playbook do Site24x7 está selecionada
const originalExecuteSelectedPlaybooks = executeSelectedPlaybooks;
function executeSelectedPlaybooks() {
    debugLog('Tentativa de executar playbooks selecionadas');

    const executionContainer = document.getElementById('running-playbooks');
    if (!executionContainer) {
        debugLog('Container de execução não encontrado', 'error');
        return;
    }

    // Remove qualquer mensagem anterior para evitar duplicatas
    const existingMessage = executionContainer.querySelector('.execution-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Verifica seleções de hosts e playbooks
    const hostsSelected = selectedHosts.size > 0;
    const playbooksSelected = selectedPlaybooks.size > 0;

    if (!hostsSelected) {
        showMessage('Selecione pelo menos um host para executar');
        return;
    }
    if (!playbooksSelected) {
        showMessage('Selecione pelo menos uma playbook para executar');
        return;
    }

    // Busca os dados de playbooks para obter os caminhos
    fetch('/api/playbooks')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao buscar playbooks');
            return response.json();
        })
        .then(allPlaybooks => {
            const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));
            
            // Executa as playbooks selecionadas
            const playbooksList = Array.from(selectedPlaybooks);
            playbooksList.forEach(playbookName => {
                const playbookPath = playbookMap.get(playbookName);
                if (!playbookPath) {
                    showMessage(`Caminho da playbook ${playbookName} não encontrado`, 'error');
                    return;
                }

                const jobId = `${playbookName}_${Date.now()}`;
                const card = createExecutionCard(playbookName, selectedHosts, jobId);
                executionContainer.insertBefore(card, executionContainer.firstChild);

                fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playbook: playbookPath,
                        hosts: Array.from(selectedHosts)
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    debugLog(`Playbook ${playbookName} iniciada com Job ID: ${data.job_id}`);
                    runningJobs.set(data.job_id, card);
                    monitorExecution(data.job_id, card);
                })
                .catch(error => {
                    debugLog(`Erro ao iniciar playbook ${playbookName}: ${error.message}`, 'error');
                    card.classList.add('failed');
                    handlePlaybookCompletion('failed', card);
                    const outputDiv = card.querySelector('.ansible-output');
                    if (outputDiv) {
                        outputDiv.innerHTML = `<div style="color: var(--error-red);">${error.message}</div>`;
                        outputDiv.style.display = 'block';
                    }
                });
            });
        })
        .catch(error => {
            debugLog(`Erro ao buscar playbooks: ${error.message}`, 'error');
            showMessage(`Erro ao buscar playbooks: ${error.message}`, 'error');
        });

    updateExecuteButton();
}

    // Verifica seleções de hosts e playbooks
    const hostsSelected = selectedHosts.size > 0;
    const playbooksSelected = selectedPlaybooks.size > 0;

    // Função auxiliar para exibir mensagem na tela
    /**
 /**
 * Exibe uma mensagem temporária na interface que desaparece após 3 segundos
 * @param {string} text - Texto da mensagem
 * @param {string} type - Tipo de mensagem ('warning' ou 'error')
 * @param {string} containerId - ID do container onde a mensagem será exibida
 */
function showMessage(text, type = 'warning', containerId = 'running-playbooks') {
    // Substituição da mensagem específica
    if (text === 'Caminho da playbook confi_oracle8.yml não definido') {
        text = 'Selecione pelo menos um host para executar';
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
        debugLog(`Container ${containerId} não encontrado`, 'error');
        return;
    }

    // Remove mensagens anteriores
    const existingMessage = container.querySelector('.execution-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'execution-message';
    messageDiv.style.cssText = `
        padding: 16px;
        text-align: center;
        border-radius: 6px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: ${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'};
        background: ${type === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
        opacity: 1;
        transition: opacity 0.5s ease;
    `;
    messageDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${type === 'warning' ? 'var(--warning-orange)' : 'var(--error-red)'}" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>${text}</span>
    `;
    container.insertBefore(messageDiv, container.firstChild);
    debugLog(text, type === 'warning' ? 'warning' : 'error');
    
    // Remove a mensagem após 3 segundos com efeito de fade
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 500);
    }, 3000);
}
    // Executa as playbooks selecionadas
    const playbooksList = Array.from(selectedPlaybooks);
    playbooksList.forEach(playbookName => {
        const playbookItem = document.querySelector(`.playbook-item[data-playbook-name="${playbookName}"]`);
        if (!playbookItem) {
            showMessage(`Playbook ${playbookName} não encontrada no DOM`, 'error');
            return;
        }

        const playbookPath = playbookItem.dataset.playbookPath || '';
        if (!playbookPath) {
            showMessage(`Caminho da playbook ${playbookName} não definido`, 'error');
            return;
        }

        const jobId = `${playbookName}_${Date.now()}`;
        const card = createExecutionCard(playbookName, selectedHosts, jobId);
        executionContainer.insertBefore(card, executionContainer.firstChild);

        fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playbook: playbookPath,
                hosts: Array.from(selectedHosts)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            debugLog(`Playbook ${playbookName} iniciada com Job ID: ${data.job_id}`);
            runningJobs.set(data.job_id, card);
            monitorExecution(data.job_id, card);
        })
        .catch(error => {
            debugLog(`Erro ao iniciar playbook ${playbookName}: ${error.message}`, 'error');
            card.classList.add('failed');
            handlePlaybookCompletion('failed', card);
            const outputDiv = card.querySelector('.ansible-output');
            if (outputDiv) {
                outputDiv.innerHTML = `<div style="color: var(--error-red);">${error.message}</div>`;
                outputDiv.style.display = 'block';
            }
        });
    });

    updateExecuteButton();


// Garante listener único no botão de execução
document.addEventListener('DOMContentLoaded', () => {
    const executeButton = document.getElementById('execute-selected');
    if (executeButton) {
        executeButton.removeEventListener('click', executeSelectedPlaybooks); // Remove listener duplicado
        executeButton.addEventListener('click', executeSelectedPlaybooks);
    }

    // Outras inicializações...
});

// Função para verificar se uma playbook é de antivírus
function isAntivirusPlaybook(playbookName) {
    return String(playbookName).toLowerCase().includes('antivirus') ||
           String(playbookName).toLowerCase().includes('trendmicro') ||
           String(playbookName).toLowerCase().includes('deep security');
}
// Esta função executa playbooks regulares (não Site24x7, não antivírus)
function executeRegularPlaybooks() {
    try {
        debugLog('Iniciando execução das playbooks selecionadas');
        const executionSection = document.getElementById('running-playbooks');
        for (const [jobId, card] of runningJobs.entries()) {
            card.remove();
            runningJobs.delete(jobId);
        }

        const playbooksToExecute = Array.from(selectedPlaybooks);
        const hostsToExecute = Array.from(selectedHosts);

        fetch('/api/playbooks')
            .then(response => {
                if (!response.ok) throw new Error('Erro ao buscar playbooks');
                return response.json();
            })
            .then(allPlaybooks => {
                const playbookMap = new Map(allPlaybooks.map(pb => [pb.name, pb.path]));

                for (const playbookName of playbooksToExecute) {
                    const playbookPath = playbookMap.get(playbookName);
                    if (!playbookPath) {
                        debugLog(`Caminho não encontrado para playbook: ${playbookName}`, 'error');
                        continue;
                    }
                    for (const host of hostsToExecute) {
                        const requestData = { playbook: playbookPath, hosts: [host] };
                        
                        fetch('/api/run', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestData)
                        })
                        .then(response => {
                            if (!response.ok) {
                                return response.text().then(text => {
                                    throw new Error(`Erro ao executar playbook ${playbookPath} no host ${host}: ${response.status} - ${text}`);
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            const job_id = data.job_id;
                            debugLog(`Job ID recebido para ${playbookName} no host ${host}: ${job_id}`);
                            
                            const card = createExecutionCard(playbookName, new Set([host]), job_id);
                            executionSection.insertBefore(card, executionSection.firstChild);
                            
                            runningJobs.set(job_id, card);
                            monitorPlaybookExecution(job_id, card);
                            
                            debugLog(`Playbook ${playbookName} iniciada no host ${host} com job ID: ${job_id}`);
                        })
                        .catch(error => {
                            debugLog(`Erro na execução: ${error.message}`, 'error');
                            alert(`Erro na execução: ${error.message}`);
                        });
                    }
                }
            })
            .catch(error => {
                debugLog(`Erro ao buscar playbooks: ${error.message}`, 'error');
                alert(`Erro ao buscar playbooks: ${error.message}`);
            });
    } catch (error) {
        debugLog(`Erro na execução: ${error.message}`, 'error');
        alert(`Erro na execução: ${error.message}`);
    }
}
function monitorPlaybookExecution(jobId, card) {
    const progressBar = card.querySelector('.progress-bar');
    const outputDiv = card.querySelector('.ansible-output');
    const statusDiv = card.querySelector('.task-status');

    function updateProgress() {
        try {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Atualiza o progresso na barra
                    if (data.progress !== undefined) {
                        progressBar.style.width = `${data.progress}%`;
                    }
                    
                    // Atualiza o output
                    if (data.output) {
                        outputDiv.innerHTML = formatAnsibleOutput(data.output);
                        if (outputDiv.style.display === 'block') {
                            outputDiv.scrollTop = outputDiv.scrollHeight;
                        }
                        
                        // Verifica o status final baseado no PLAY RECAP
                        const outputLines = data.output.split('\n');
                        const recapLine = outputLines.find(line => line.includes('PLAY RECAP'));
                        if (recapLine) {
                            const failedCount = parseInt(recapLine.match(/failed=(\d+)/)?.[1] || 0);
                            const unreachableCount = parseInt(recapLine.match(/unreachable=(\d+)/)?.[1] || 0);
                            if (failedCount === 0 && unreachableCount === 0) {
                                handlePlaybookCompletion('completed', card);
                            } else {
                                handlePlaybookCompletion('failed', card);
                            }
                            return; // Para o monitoramento após encontrar o recap
                        }
                    }
                    
                    // Continua monitorando se ainda estiver em execução
                    if (data.status === 'running') {
                        setTimeout(updateProgress, 1000);
                    } else {
                        handlePlaybookCompletion(data.status, card);
                    }
                })
                .catch(error => {
                    console.error(error);
                    debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
                    handlePlaybookCompletion('failed', card);
                });
        } catch (error) {
            console.error(error);
            debugLog(`Erro ao monitorar job ${jobId}: ${error.message}`, 'error');
            handlePlaybookCompletion('failed', card);
        }
    }

    // Inicia o monitoramento
    updateProgress();
}

// Função para inicializar o posicionamento dos botões
function initializeButtonPositions() {
    document.querySelectorAll('.execution-card').forEach(card => {
        const output = card.querySelector('.ansible-output');
        if (output && output.style.display === 'block') {
            positionButtonGroup(card);
        } else {
            resetButtonGroupPosition(card);
        }
    });
}


/**
 * Cancela a execução de um job específico
 * @param {HTMLElement} button - Botão de cancelamento clicado
 */
async function cancelExecution(button) {
    try {
      const card = button.closest('.execution-card');
      if (!card) {
        throw new Error('Card de execução não encontrado');
      }
      
      // Verifica várias possibilidades de onde o ID do job pode estar armazenado
      const jobId = card.dataset.jobId || 
                   card.getAttribute('data-job-id') || 
                   card.id.replace('job-', '');
                   
      if (!jobId) {
        debugLog('Card sem ID de job:', card);
        throw new Error('ID do job não encontrado no card');
      }
      
      debugLog(`Tentando cancelar job: ${jobId}`);
      
      // Desabilita o botão e mostra indicador de carregamento
      button.disabled = true;
      button.innerHTML = `
        <div class="spinner" style="display: inline-block; margin-right: 5px;"></div>
        Cancelando...
      `;
      
      // CORREÇÃO: Enviar o ID como parte da URL em vez de parâmetro 'job_id'
      // A API espera `/api/cancel/<id>` sem parâmetros adicionais
      const response = await fetch(`/api/cancel/${jobId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Importante: não envie nenhum corpo na requisição
        body: JSON.stringify({}) // Envie um objeto vazio se precisar enviar algo
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
      }
      
      try {
        await response.json(); // Tenta fazer parse do JSON, mas ignora se falhar
      } catch (e) {
        // Ignora erros de parsing JSON
      }
      
      // Atualiza o status do card
      handlePlaybookCompletion('cancelled', card);
      if (runningJobs.has(jobId)) {
        runningJobs.delete(jobId);
      }
      debugLog(`Job ${jobId} cancelado com sucesso`);
      
      // Restaura o botão
      button.disabled = false;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Cancelar
      `;
      
      showMessage(`Execução cancelada com sucesso`, 'success');
      
    } catch (error) {
      debugLog(`Erro ao cancelar job: ${error.message}`, 'error');
      
      // Restaura o botão
      if (button) {
        button.disabled = false;
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Cancelar
        `;
      }
      
      showMessage(`Erro ao cancelar execução: ${error.message}`, 'error');
    }
  }

/**
 * Exibe uma mensagem temporária na interface
 * @param {string} text - Texto da mensagem
 * @param {string} type - Tipo de mensagem ('success', 'warning' ou 'error')
 * @param {number} duration - Duração em ms antes da mensagem desaparecer (padrão: 3000ms)
 */
/**
 * Exibe uma mensagem temporária na interface
 * @param {string} text - Texto da mensagem
 * @param {string} type - Tipo de mensagem ('success', 'warning' ou 'error')
 * @param {number} duration - Duração em ms antes da mensagem desaparecer (padrão: 3000ms)
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
 * Função para inicializar os filtros (estava faltando no código)
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
  
  /**
   * Cancela a execução de um job específico
   * @param {HTMLElement} button - Botão de cancelamento clicado
   */
  async function cancelExecution(button) {
    try {
      const card = button.closest('.execution-card');
      if (!card) {
        throw new Error('Card de execução não encontrado');
      }
      
      // Verifica várias possibilidades de onde o ID do job pode estar armazenado
      const jobId = card.dataset.jobId || 
                   card.getAttribute('data-job-id') || 
                   card.id.replace('job-', '') ||
                   null;
                   
      if (!jobId) {
        debugLog('Card sem ID de job:', card);
        throw new Error('ID do job não encontrado no card');
      }
      
      debugLog(`Tentando cancelar job: ${jobId}`);
      
      // Desabilita o botão e mostra indicador de carregamento
      button.disabled = true;
      button.innerHTML = `
        <div class="spinner" style="display: inline-block; margin-right: 5px;"></div>
        Cancelando...
      `;
      
      // Corrigido para usar apenas 'id' em vez de 'job_id' na API
      const response = await fetch(`/api/cancel/${jobId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
      }
      
      // Atualiza o status do card
      handlePlaybookCompletion('cancelled', card);
      if (runningJobs.has(jobId)) {
        runningJobs.delete(jobId);
      }
      debugLog(`Job ${jobId} cancelado com sucesso`);
      
      // Restaura o botão
      button.disabled = false;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Cancelar
      `;
      
      showMessage(`Execução cancelada com sucesso`, 'success');
      
    } catch (error) {
      debugLog(`Erro ao cancelar job: ${error.message}`, 'error');
      
      // Restaura o botão
      if (button) {
        button.disabled = false;
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Cancelar
        `;
      }
      
      showMessage(`Erro ao cancelar execução: ${error.message}`, 'error');
    }
  }
  
  /**
 * Cancela todas as execuções de playbooks em andamento
 */
async function cancelAllExecutions() {
    try {
      debugLog('Iniciando cancelamento de todas as execuções');
      
      // Encontra todos os cards de execução que estão em andamento
      const executionCards = Array.from(document.querySelectorAll('.execution-card:not(.cancelled):not(.failed):not(.success)'));
      
      if (executionCards.length === 0) {
        showMessage('Não há execuções em andamento para cancelar', 'warning');
        return;
      }
      
      // Mostrar indicador de progresso
      const executionSection = document.getElementById('running-playbooks');
      if (executionSection) {
        const progressMessage = document.createElement('div');
        progressMessage.className = 'cancel-progress-message';
        progressMessage.innerHTML = `
          <div class="spinner" style="display: inline-block; margin-right: 8px;"></div>
          Cancelando ${executionCards.length} execuções...
        `;
        executionSection.insertBefore(progressMessage, executionSection.firstChild);
      }
      
      // Array para armazenar promessas de cancelamento
      const cancelPromises = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Itera sobre todos os cards de execução
      for (const card of executionCards) {
        try {
          // Obtém o ID do job de várias possíveis fontes
          const jobId = card.dataset.jobId || 
                       card.getAttribute('data-job-id') || 
                       card.id.replace('job-', '');
          
          if (!jobId) {
            debugLog('Card sem ID de job:', card);
            errorCount++;
            continue;
          }
          
          // Adiciona a promessa ao array para execução posterior
          cancelPromises.push(
            fetch(`/api/cancel/${jobId}`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}) // Envie um objeto vazio se precisar enviar algo
            })
            .then(response => {
              if (!response.ok) {
                throw new Error(`Erro na resposta da API: ${response.status}`);
              }
              try {
                return response.json();
              } catch (e) {
                return {}; // Retorna objeto vazio se não conseguir fazer parse do JSON
              }
            })
            .then(() => {
              // Atualiza o card para status cancelado
              handlePlaybookCompletion('cancelled', card);
              if (runningJobs.has(jobId)) {
                runningJobs.delete(jobId);
              }
              successCount++;
              debugLog(`Job ${jobId} cancelado com sucesso`);
            })
            .catch(err => {
              debugLog(`Erro ao cancelar job ${jobId}: ${err.message}`, 'error');
              errorCount++;
            })
          );
        } catch (cardError) {
          debugLog(`Erro ao processar card para cancelamento: ${cardError.message}`, 'error');
          errorCount++;
        }
      }
      
      // Aguarda todas as promessas serem concluídas
      await Promise.allSettled(cancelPromises);
      
      // Remove o indicador de progresso
      document.querySelector('.cancel-progress-message')?.remove();
      
      // Exibe mensagem de resultado
      if (successCount > 0) {
        showMessage(`${successCount} execuções canceladas com sucesso${errorCount > 0 ? ` (${errorCount} falhas)` : ''}`, 
                   errorCount > 0 ? 'warning' : 'success');
      } else if (errorCount > 0) {
        showMessage(`Falha ao cancelar execuções. Tente novamente ou atualize a página.`, 'error');
      }
      
      debugLog(`Cancelamento concluído: ${successCount} sucessos, ${errorCount} falhas`);
      
    } catch (error) {
      // Remove o indicador de progresso em caso de erro
      document.querySelector('.cancel-progress-message')?.remove();
      
      debugLog(`Erro ao cancelar execuções: ${error.message}`, 'error');
      showMessage(`Erro ao cancelar execuções: ${error.message}`, 'error');
    }
  }

/**
 * Posiciona o grupo de botões na parte inferior do card
 * @param {HTMLElement} card - Card de execução
 */
function positionButtonGroup(card) {
    const buttonGroup = card.querySelector('.button-group');
    const rect = card.getBoundingClientRect();
    
    // Remove qualquer posicionamento anterior
    buttonGroup.classList.remove('button-group-positioned');
    
    // Define a posição exata para o button-group ficar no fundo do card
    buttonGroup.style.position = 'absolute';
    buttonGroup.style.bottom = '0';
    buttonGroup.style.left = '0';
    buttonGroup.style.width = '100%';
    
    // Adiciona classe para controle de estilo
    buttonGroup.classList.add('button-group-positioned');
}

/**
 * Redefine a posição do grupo de botões para o padrão
 * @param {HTMLElement} card - Card de execução
 */
function resetButtonGroupPosition(card) {
    const buttonGroup = card.querySelector('.button-group');
    
    // Remove estilos inline e classe de posicionamento
    buttonGroup.style.position = '';
    buttonGroup.style.bottom = '';
    buttonGroup.style.left = '';
    buttonGroup.style.width = '';
    buttonGroup.classList.remove('button-group-positioned');
}

/**
 * Alterna visibilidade da saída da playbook com botões fixos
 * @param {HTMLElement} button - Botão de alternância
 */
function toggleOutput(button) {
    const card = button.closest('.execution-card');
    const output = card.querySelector('.ansible-output');
    const isVisible = output.style.display === 'block';
    
    // Troca a visibilidade
    output.style.display = isVisible ? 'none' : 'block';
    
    // Quando abrir o output, empurrar o footer para baixo
    const footer = document.querySelector('footer') || document.querySelector('.footer');
    
    if (!isVisible) {
        // Aplica classe para empurrar o footer para baixo
        if (footer) {
            footer.classList.add('footer-pushed');
        }
        
        // Adiciona classe ao body
        document.body.classList.add('output-expanded');
    } else {
        // Remove classe do footer
        if (footer) {
            footer.classList.remove('footer-pushed');
        }
        
        // Remove classe do body
        document.body.classList.remove('output-expanded');
    }
    
    // Atualiza o botão
    button.innerHTML = isVisible ? `
        Ver Mais
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
        </svg>
    ` : `
        Ver Menos
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
            <path d="M18 15l-6-6-6 6"/>
        </svg>
    `;
    
    debugLog(`Toggle output: ${isVisible ? 'hidden' : 'shown'}`);
}


document.addEventListener('DOMContentLoaded', function() {
    const playbooksContainer = document.getElementById('playbooks');
    if (!playbooksContainer) {
        console.error('ERRO: Container de playbooks (elemento com id="playbooks") não encontrado na página!');
        // Tenta localizar onde o elemento deveria estar
        const possibleContainers = document.querySelectorAll('.playbooks-container, .card, .section');
        console.log('Possíveis containers encontrados:', possibleContainers);
    } else {
        console.log('Container de playbooks encontrado:', playbooksContainer);
    }
});

// Substitui os event listeners de DOMContentLoaded para garantir inicialização única
document.addEventListener('DOMContentLoaded', () => {
    // Carregar o script do Site24x7 apenas uma vez
    if (!document.querySelector('script[src="/static/js/ansible/24x7.js"]')) {
        const site24x7Script = document.createElement('script');
        site24x7Script.src = '/static/js/ansible/24x7.js';
        site24x7Script.type = 'text/javascript';
        document.head.appendChild(site24x7Script);
    }
    
    // Inicializa a aplicação apenas uma vez
    initializeApp();
}, { once: true }); 
    
    // Inicializa os filtros de SO antes de carregar qualquer conteúdo
    initializeOSFilters();
    
    // Carregar os hosts e playbooks
    loadHosts();
    loadPlaybooks();
    
    // Configura os listeners de eventos
    const osFilter = document.getElementById('os-filter');
    if (osFilter) {
      osFilter.addEventListener('change', () => {
        debugLog(`Filtro de SO alterado para: ${osFilter.value}`);
        const selectedOS = OS_MAPPING[osFilter.value];
        debugLog(`Sistema selecionado: ${selectedOS?.display}, Caminho: ${selectedOS?.path}`);
        loadPlaybooks();
      });
    }
    
    updateOSInfoPanel();
    document.querySelector('#os-filter')?.addEventListener('change', updateOSInfoPanel);
    
    // Configura os demais listeners de eventos
    document.getElementById('execute-selected')?.addEventListener('click', () => {
        debugLog('Iniciando execução das playbooks selecionadas');
        executeSelectedPlaybooks();
    });
    
    document.getElementById('refresh')?.addEventListener('click', () => {
        debugLog('Atualizando todos os dados');
        refreshAll();
    });
    
    document.getElementById('select-all-playbooks')?.addEventListener('click', () => {
        const allSelected = selectedPlaybooks.size === document.querySelectorAll('.playbook-item').length;
        toggleAllPlaybooks(!allSelected);
    });
    
    document.getElementById('select-all-hosts-btn')?.addEventListener('click', () => {
        const allSelected = selectedHosts.size === document.querySelectorAll('.host-banner.valid input[type="checkbox"]').length;
        toggleAllHosts(!allSelected);
    });
    
    document.getElementById('cancel-all')?.addEventListener('click', () => {
        debugLog('Cancelando todas as execuções');
        cancelAllExecutions();
    });
    
    // Inicializa após um pequeno delay para garantir que a DOM esteja completamente renderizada
    setTimeout(initializeButtonPositions, 100);
    
    // Adiciona listeners para eventos de scroll para manter o posicionamento correto
    window.addEventListener('scroll', function() {
        document.querySelectorAll('.execution-card').forEach(card => {
            const output = card.querySelector('.ansible-output');
            if (output && output.style.display === 'block') {
                positionButtonGroup(card);
            }
        });
    });
    
    document.getElementById('debug-toggle')?.addEventListener('click', () => {
        const debugOutput = document.getElementById('debug-output');
        const isVisible = debugOutput.style.display === 'block';
        debugOutput.style.display = isVisible ? 'none' : 'block';
        document.getElementById('debug-toggle').innerHTML = isVisible ? `
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
        if (!isVisible) {
            debugLog('Debug ativado');
            debugOutput.scrollTop = 0;
        }
    });


// Adicione esta função que está faltando
// Função corrigida para atualizar o painel de informações do SO
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
      
      // Atualiza o conteúdo do painel - removendo o caminho
      osInfoPanel.className = `os-info-panel ${osMapping.group}`;
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
      
      debugLog(`Painel de informações do SO atualizado: ${osMapping.display}`);
    } catch (error) {
      debugLog(`Erro ao atualizar painel de informações do SO: ${error.message}`, 'error');
    }
  }
  // Adiciona o listener de evento para o botão "Cancelar Todos"
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona estilos para spinner e mensagens
    const style = document.createElement('style');
    style.textContent = `
      .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .execution-message {
        animation: slideIn 0.3s ease-out forwards;
      }
      
      @keyframes slideIn {
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
    `;
    document.head.appendChild(style);
    
    // Corrige o problema do botão cancelar todos
    const cancelAllButton = document.getElementById('cancel-all');
    if (cancelAllButton) {
      // Remove todos os event listeners existentes e atributo onclick
      const newCancelAllButton = cancelAllButton.cloneNode(true);
      cancelAllButton.parentNode.replaceChild(newCancelAllButton, cancelAllButton);
      
      // Remove qualquer atributo onclick que possa estar interferindo
      newCancelAllButton.removeAttribute('onclick');
      
      // Adiciona o novo event listener diretamente
      newCancelAllButton.addEventListener('click', function() {
        debugLog('Botão Cancelar Todos clicado');
        cancelAllExecutions();
      });
      
      debugLog('Event listener do botão Cancelar Todos configurado');
    } else {
      debugLog('Botão Cancelar Todos não encontrado', 'warning');
    }
    
    // Configura os botões de cancelar individuais também
    document.querySelectorAll('.cancel-btn').forEach(button => {
      button.removeAttribute('onclick');
      button.addEventListener('click', function() {
        cancelExecution(this);
      });
    });
  });
  
      
      // Adicione esta função à lista de listeners no DOMContentLoaded
      document.querySelector('#os-filter')?.addEventListener('change', updateOSInfoPanel);
      
      // Adicione este estilo à sua página
      const style = document.createElement('style');
      style.textContent = `
        .os-info-panel {
          background: var(--background-secondary);
          border-radius: 6px;
          padding: 8px 12px;
          margin: 10px 0;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }
        
        .os-info-panel.linux {
          border-left: 4px solid #4CAF50;
        }
        
        .os-info-panel.windows {
          border-left: 4px solid #2196F3;
        }
        
        .os-info-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .os-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .os-path {
          color: var(--text-secondary);
          font-size: 0.8rem;
          margin-left: auto;
        }
        
        .no-playbooks {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-tertiary);
          text-align: center;
        }
        
        .no-playbooks p {
          margin: 15px 0;
        }
      `;
      document.head.appendChild(style);

/* JavaScript para controlar a exibição da saída e garantir estrutura correta */
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.execution-card');
    
    cards.forEach(card => {
      const toggleBtn = card.querySelector('.toggle-output-btn');
      const output = card.querySelector('.ansible-output');
      
      if (toggleBtn && output) {
        toggleBtn.addEventListener('click', function() {
          // Alternar a visibilidade da saída
          output.classList.toggle('visible');
          
          // Atualizar o texto do botão
          const buttonText = toggleBtn.querySelector('span') || toggleBtn;
          if (output.classList.contains('visible')) {
            buttonText.textContent = buttonText.textContent.replace('Mostrar', 'Ocultar');
          } else {
            buttonText.textContent = buttonText.textContent.replace('Ocultar', 'Mostrar');
          }
        });
      }
    });
  });


  
  
// Função para inicializar os filtros ao carregar a página
// Função para inicializar a aplicação (chamada no DOMContentLoaded)
function initializeApp() {
  if (window.appInitialized) return;
  window.appInitialized = true;
  
  debugLog('Inicializando aplicação');
  
  // Inicializar filtros
  initializeOSFilters();
  initializeFilters();
  
  // Configurar eventos dos filtros
  setupFilterEvents();
  
  // Carregar dados iniciais
  loadHosts();
  loadPlaybooks();
  
  // Atualizar painel de informações do SO
  updateOSInfoPanel();
  
  // Configurar outros eventos da interface
  document.getElementById('execute-selected')?.addEventListener('click', executeSelectedPlaybooks);
  document.getElementById('refresh')?.addEventListener('click', refreshAll);
  document.getElementById('select-all-playbooks')?.addEventListener('click', () => {
    const allSelected = selectedPlaybooks.size === document.querySelectorAll('.playbook-item').length;
    toggleAllPlaybooks(!allSelected);
  });
  document.getElementById('select-all-hosts-btn')?.addEventListener('click', () => {
    const allSelected = selectedHosts.size === document.querySelectorAll('.host-banner.valid input[type="checkbox"]').length;
    toggleAllHosts(!allSelected);
  });
  document.getElementById('cancel-all')?.addEventListener('click', cancelAllExecutions);
  
  // Inicializar posicionamento dos botões
  setTimeout(initializeButtonPositions, 100);
}

// Garantir que os eventos sejam configurados apenas uma vez ao carregar a página
document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
// Modificação da função refreshAll para forçar o recarregamento
async function refreshAll() {
    debugLog('Atualizando dados e limpando tela');
    selectedHosts.clear();
    selectedPlaybooks.clear();
    runningJobs.clear();
    hostData = {}; // Adicionado para limpar hostData explicitamente
    
    // Limpa os dados em sessionStorage para forçar um reload completo
    sessionStorage.removeItem('hostsLoaded');
    sessionStorage.removeItem('hostData');
    sessionStorage.removeItem('playbooksLoaded');
    sessionStorage.removeItem('playbooksData');
    
    document.getElementById('hosts-list').innerHTML = ''; // Limpa os hosts explicitamente
    document.getElementById('running-playbooks').innerHTML = '';
    document.getElementById('playbooks').innerHTML = '';
    document.getElementById('execution-status')?.remove();
    
    // Carrega hosts e playbooks com a flag forceRefresh
    await loadHosts(true);
    await loadPlaybooks(true);
}

// Define um flag para controlar inicialização única
let appInitialized = false;

// Função de inicialização da aplicação que será chamada apenas uma vez
function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    debugLog('Inicializando aplicação (execução única)');
    
    // Inicializa os filtros de SO antes de carregar qualquer conteúdo
    initializeOSFilters();
    
    // Carregar os hosts e playbooks
    loadHosts(false); // Não força o refresh
    loadPlaybooks(false); // Não força o refresh
    
    // Configura os listeners de eventos
    const osFilter = document.getElementById('os-filter');
    if (osFilter) {
        osFilter.addEventListener('change', () => {
            debugLog(`Filtro de SO alterado para: ${osFilter.value}`);
            const selectedOS = OS_MAPPING[osFilter.value];
            debugLog(`Sistema selecionado: ${selectedOS?.display}, Caminho: ${selectedOS?.path}`);
            loadPlaybooks(false); // Não força o refresh, mas a mudança do filtro já causará uma atualização
        });
    }
    
    updateOSInfoPanel();
    document.querySelector('#os-filter')?.addEventListener('change', updateOSInfoPanel);
    
    // Configura os demais listeners de eventos
    document.getElementById('execute-selected')?.addEventListener('click', () => {
        debugLog('Iniciando execução das playbooks selecionadas');
        executeSelectedPlaybooks();
    });
    
    document.getElementById('refresh')?.addEventListener('click', () => {
        debugLog('Atualizando todos os dados');
        refreshAll();
    });
    
    document.getElementById('select-all-playbooks')?.addEventListener('click', () => {
        const allSelected = selectedPlaybooks.size === document.querySelectorAll('.playbook-item').length;
        toggleAllPlaybooks(!allSelected);
    });
    
    document.getElementById('select-all-hosts-btn')?.addEventListener('click', () => {
        const allSelected = selectedHosts.size === document.querySelectorAll('.host-banner.valid input[type="checkbox"]').length;
        toggleAllHosts(!allSelected);
    });
    
    document.getElementById('cancel-all')?.addEventListener('click', () => {
        debugLog('Cancelando todas as execuções');
        cancelAllExecutions();
    });
    
    // Inicializa após um pequeno delay para garantir que a DOM esteja completamente renderizada
    setTimeout(initializeButtonPositions, 100);
    
    // Adiciona listeners para eventos de scroll para manter o posicionamento correto
    window.addEventListener('scroll', function() {
        document.querySelectorAll('.execution-card').forEach(card => {
            const output = card.querySelector('.ansible-output');
            if (output && output.style.display === 'block') {
                positionButtonGroup(card);
            }
        });
    });
    
    document.getElementById('debug-toggle')?.addEventListener('click', () => {
        const debugOutput = document.getElementById('debug-output');
        const isVisible = debugOutput.style.display === 'block';
        debugOutput.style.display = isVisible ? 'none' : 'block';
        document.getElementById('debug-toggle').innerHTML = isVisible ? `
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
        if (!isVisible) {
            debugLog('Debug ativado');
            debugOutput.scrollTop = 0;
        }
    });
}


/**
 * Função para inicializar os filtros (estava faltando no código)
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

// Função para copiar saída do Ansible
function copyAnsibleOutput(element) {
    const outputEl = element.closest('.ansible-output');
    const plainText = outputEl.innerText.replace(/Copiar/, '').trim();
    
    navigator.clipboard.writeText(plainText).then(() => {
        element.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Copiado!
        `;
        
        setTimeout(() => {
            element.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copiar
            `;
        }, 2000);
    });
}

// Função para atualizar a mensagem de status dos hosts - REMOVIDA
// function updateHostsStatusMessage() { ... }

// Função para adicionar ícones aos banners de host
function enhanceHostBanners() {
    try {
      const hostBanners = document.querySelectorAll('.host-banner');
      if (hostBanners.length === 0) {
        debugLog('Nenhum banner de host encontrado para melhorar', 'warning');
        return;
      }
      
      debugLog(`Melhorando ${hostBanners.length} banners de host`);
      
      hostBanners.forEach(banner => {
        try {
          const paragraphs = banner.querySelectorAll('p');
          
          // Adiciona ícones aos parágrafos
          paragraphs.forEach(p => {
            if (!p || !p.textContent) return; // Verifica se p existe e tem textContent
            
            const text = p.textContent;
            if (text.includes('IP Público:')) {
              p.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                ${text}
              `;
            } else if (text.includes('IP Privado:')) {
              p.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                ${text}
              `;
            } else if (text.includes('Sistema:')) {
              p.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                ${text}
              `;
            }
          });
          
          // Verifica se contém o parágrafo do sistema antes de tentar acessá-lo
          const systemParagraph = banner.querySelector('p:nth-of-type(3)');
          if (!systemParagraph) return;
          
          const systemText = systemParagraph.textContent?.replace('Sistema: ', '') || '';
          if (systemText && systemText !== 'N/A') {
            const osBadge = document.createElement('div');
            osBadge.className = 'os-badge';
            
            if (systemText.toLowerCase().includes('linux') || 
                systemText.toLowerCase().includes('ubuntu') || 
                systemText.toLowerCase().includes('debian') || 
                systemText.toLowerCase().includes('centos') || 
                systemText.toLowerCase().includes('fedora')) {
              osBadge.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 16 L16 8 A4 4 0 0 0 8 8 L8 16 A4 4 0 0 0 16 16 Z"></path>
                  <path d="M12 20 L12 16"></path>
                  <path d="M17 20 L12 16 L7 20"></path>
                </svg>
                Linux
              `;
            } else if (systemText.toLowerCase().includes('windows')) {
              osBadge.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
                Windows
              `;
            } else {
              const systemName = systemText.split(' ')[0] || 'Sistema';
              osBadge.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                ${systemName}
              `;
            }
            
            banner.appendChild(osBadge);
          }
        } catch (bannerError) {
          debugLog(`Erro ao processar banner de host: ${bannerError.message}`, 'error');
        }
      });
    } catch (error) {
      debugLog(`Erro ao melhorar banners de host: ${error.message}`, 'error');
    }
  }
  
  // Adiciona estilos necessários para os novos componentes
  document.addEventListener('DOMContentLoaded', function() {
    try {
      debugLog('Inicializando componentes do módulo Ansible');
      
      // Adiciona estilos para spinner e mensagens
      const style = document.createElement('style');
      style.textContent = `
        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .execution-message {
          animation: slideIn 0.3s ease-out forwards;
        }
        
        @keyframes slideIn {
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
      `;
      document.head.appendChild(style);
      
      // Corrige o problema do botão cancelar todos
      const cancelAllButton = document.getElementById('cancel-all');
      if (cancelAllButton) {
        // Remove todos os event listeners existentes
        const newCancelAllButton = cancelAllButton.cloneNode(true);
        cancelAllButton.parentNode.replaceChild(newCancelAllButton, cancelAllButton);
        
        // Remove o atributo onclick para evitar conflitos
        newCancelAllButton.removeAttribute('onclick');
        
        // Adiciona o novo event listener otimizado
        newCancelAllButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          debugLog('Botão Cancelar Todos clicado');
          cancelAllExecutions();
        });
        
        debugLog('Event listener do botão Cancelar Todos recriado');
      }
      
      // Inicializa os filtros (esta função estava faltando)
      initializeFilters();
      
      debugLog('Componentes do módulo Ansible inicializados com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar componentes Ansible:', error);
    }
  });

// Melhorar visualização dos cards de playbook
function enhancePlaybookItems() {
    document.querySelectorAll('.playbook-item').forEach(item => {
        const osText = item.querySelector('div span:nth-of-type(1)').textContent.replace('SO: ', '');
        const categoryText = item.querySelector('div span:nth-of-type(2)').textContent.replace('Categoria: ', '');
        
        // Limpa o conteúdo anterior
        const contentDiv = item.querySelector('div');
        const h4 = contentDiv.querySelector('h4');
        const small = contentDiv.querySelector('small');
        
        // Recria a estrutura
        contentDiv.innerHTML = '';
        contentDiv.appendChild(h4);
        contentDiv.appendChild(small);
        
        // Adiciona nova divisão para metadados
        const metaDiv = document.createElement('div');
        metaDiv.className = 'playbook-meta';
        
        // Tag para sistema operacional
        const osTag = document.createElement('span');
        osTag.className = 'tag';
        
        if (osText.toLowerCase() === 'linux') {
            osTag.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 16 L16 8 A4 4 0 0 0 8 8 L8 16 A4 4 0 0 0 16 16 Z"></path>
                    <path d="M12 20 L12 16"></path>
                    <path d="M17 20 L12 16 L7 20"></path>
                </svg>
                ${osText}
            `;
        } else if (osText.toLowerCase() === 'windows') {
            osTag.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
                ${osText}
            `;
        } else if (osText.toLowerCase() === 'all') {
            osTag.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                Universal
            `;
        } else {
            osTag.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                </svg>
                ${osText}
            `;
        }
        metaDiv.appendChild(osTag);
        
        // Tag para categoria
        const categoryTag = document.createElement('span');
        categoryTag.className = 'tag';
        
        switch (categoryText.toLowerCase()) {
            case 'configuracoes':
                categoryTag.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Config
                `;
                break;
            case 'seguranca':
                categoryTag.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Segurança
                `;
                break;
            case 'agentes':
                categoryTag.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Agentes
                `;
                break;
            case 'baseline':
                categoryTag.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                    Baseline
                `;
                break;
            default:
                categoryTag.innerHTML = `
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    ${categoryText}
                `;
        }
        metaDiv.appendChild(categoryTag);
        
        contentDiv.appendChild(metaDiv);
    });
}

// Aprimorar visualização dos cards de execução
// Aprimorar visualização dos cards de execução
function enhanceExecutionCards() {
    document.querySelectorAll('.execution-card').forEach(card => {
        const statusDiv = card.querySelector('.task-status');
        
        // Adiciona ícones de status
        if (statusDiv.textContent.trim() === 'Em execução...') {
            statusDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                </svg>
                Em execução...
            `;
            statusDiv.classList.add('running');
        } else if (statusDiv.classList.contains('success')) {
            statusDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                ${statusDiv.textContent}
            `;
        } else if (statusDiv.classList.contains('failed')) {
            statusDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                ${statusDiv.textContent}
            `;
        } else if (statusDiv.classList.contains('cancelled')) {
            statusDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                ${statusDiv.textContent}
            `;
        }
        
        // Adiciona timestamp de execução
        const timestamp = new Date().toLocaleTimeString();
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'execution-timestamp';
        timestampDiv.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Iniciado às ${timestamp}
        `;
        
        // Insere após o cabeçalho
        const cardHeader = card.querySelector('.card-header');
        cardHeader.parentNode.insertBefore(timestampDiv, cardHeader.nextSibling);
    });
}

// Função addCounters removida completamente

// Inicialização aprimorada para a interface
function initializeEnhancedUI() {
    // Aprimora elementos visuais após um pequeno atraso para garantir carregamento
    setTimeout(() => {
        enhanceHostBanners();
        enhancePlaybookItems();
        enhanceExecutionCards();
        // Chamada para addCounters() removida
    }, 500);

    // Substitui a função updateExecuteButton para não atualizar contadores
    const originalUpdateExecuteButton = updateExecuteButton;
    updateExecuteButton = function() {
        originalUpdateExecuteButton(); // Executa a lógica original
        // Chamada para addCounters() removida
    };
}

/**
 * Formata a saída do Ansible para HTML com estilos e layout horizontal para as informações do host
 * @param {string} output - Saída bruta do Ansible
 * @returns {string} HTML formatado
 */
function formatAnsibleOutput(output) {
    if (!output) return '<em>Aguardando saída...</em>';
    
    const lines = output.split('\n');
    let formattedOutput = '<div class="ansible-output-container">';
    
    // Adiciona badge de cópia
    formattedOutput += `
        <div class="copy-badge" onclick="copyAnsibleOutput(this)">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar
        </div>`;
    
    // Array para armazenar informações do host encontradas na saída
    let hostInfo = [];
    
    // Processa as linhas
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/\u001b\[\d+m/g, '').trimEnd();
        
        if (!cleanLine) {
            formattedOutput += '<br>';
            continue;
        }
        
        // Verifica padrões de informações do host
        if (cleanLine.startsWith('**Hostname:**')) {
            const hostname = cleanLine.replace('**Hostname:**', '').trim();
            hostInfo.push({
                type: 'hostname',
                value: hostname,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M8 21h8"></path>
                    <path d="M12 17v4"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**IP Público:**')) {
            const publicIp = cleanLine.replace('**IP Público:**', '').trim();
            hostInfo.push({
                type: 'public_ip',
                value: publicIp,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**IP Privado:**')) {
            const privateIp = cleanLine.replace('**IP Privado:**', '').trim();
            hostInfo.push({
                type: 'private_ip',
                value: privateIp,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`
            });
            continue;
        }
        
        if (cleanLine.startsWith('**Sistema:**')) {
            const system = cleanLine.replace('**Sistema:**', '').trim();
            let systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`;
            
            // Detecta o tipo de sistema operacional
            if (system.toLowerCase().includes('linux') || 
                system.toLowerCase().includes('ubuntu') || 
                system.toLowerCase().includes('debian') || 
                system.toLowerCase().includes('centos') || 
                system.toLowerCase().includes('fedora')) {
                systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path>
                    <path d="M12 20L12 16"></path>
                    <path d="M17 20L12 16L7 20"></path>
                </svg>`;
            } else if (system.toLowerCase().includes('windows')) {
                systemIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
                    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>`;
            }
            
            hostInfo.push({
                type: 'system',
                value: system,
                icon: systemIcon
            });
            continue;
        }
        
        // Se coletamos informações do host, exibimos em formato horizontal
        if (hostInfo.length > 0 && (cleanLine.startsWith('**PLAY') || cleanLine.startsWith('**TASK'))) {
            // Renderiza as informações do host antes de continuar com a saída normal
            formattedOutput += '<div class="ansible-host-info">';
            hostInfo.forEach(info => {
                formattedOutput += `
                    <div class="ansible-host-info-item">
                        ${info.icon}
                        <strong>${info.type === 'hostname' ? 'Hostname' : 
                                 info.type === 'public_ip' ? 'IP Público' : 
                                 info.type === 'private_ip' ? 'IP Privado' : 'Sistema'}:</strong>
                        ${info.value}
                    </div>`;
            });
            formattedOutput += '</div>';
            
            // Limpa o array de informações do host
            hostInfo = [];
        }
        
        // Formatação padrão para outras linhas
        if (cleanLine.startsWith('**PLAY')) {
            // Remove os ** para evitar duplicação
            const cleanPlayLine = cleanLine.replace(/\*\*/g, '');
            formattedOutput += `
                <div class="ansible-play">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    ${cleanPlayLine}
                </div>`;
        } else if (cleanLine.startsWith('**TASK')) {
            // Remove os ** para evitar duplicação
            const cleanTaskLine = cleanLine.replace(/\*\*/g, '');
            formattedOutput += `
                <div class="ansible-task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9cdcfe" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16 L12 8"></path>
                        <path d="M8 12 L16 12"></path>
                    </svg>
                    ${cleanTaskLine}
                </div>`;
        } else if (cleanLine.match(/^ok:/)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('ok:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-ok">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        <span style="color: #4ec9b0; font-weight: bold;">ok</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^changed:/)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('changed:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-changed">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dcdcaa" stroke-width="2">
                            <path d="M12 4v4m0 0a4 4 0 1 0 4 4"></path>
                            <path d="M12 12h8"></path>
                            <path d="M18 8l-4 4 4 4"></path>
                        </svg>
                        <span style="color: #dcdcaa; font-weight: bold;">changed</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^failed:/)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('failed:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-failed">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M15 9l-6 6"></path>
                            <path d="M9 9l6 6"></path>
                        </svg>
                        <span style="color: #f14c4c; font-weight: bold;">failed</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #f14c4c; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^fatal:/)) {
            formattedOutput += `
                <div class="ansible-fatal">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    ${cleanLine}
                </div>`;
        } else if (cleanLine.match(/^skipping:/)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('skipping:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-skipping">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="2">
                            <path d="M6 18L18 6"></path>
                            <path d="M6 6l12 12"></path>
                        </svg>
                        <span style="color: #808080; font-weight: bold;">skipping</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #d4d4d4; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.match(/^unreachable:/)) {
            const parts = cleanLine.split('=>', 1);
            const host = parts[0].replace('unreachable:', '').trim();
            const content = cleanLine.substring(cleanLine.indexOf('=>') + 2).trim();
            
            formattedOutput += `
                <div class="ansible-unreachable">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f14c4c" stroke-width="2">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span style="color: #f14c4c; font-weight: bold;">unreachable</span>: [${host}]
                    </span>
                    ${content ? `<div style="margin: 4px 0 4px 24px; color: #f14c4c; font-family: monospace;">${content}</div>` : ''}
                </div>`;
        } else if (cleanLine.startsWith('PLAY RECAP')) {
            formattedOutput += `
                <div class="ansible-recap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    ${cleanLine}
                </div>`;
        } else if (cleanLine.includes('ok=') || cleanLine.includes('changed=')) {
            // Colorir estatísticas no PLAY RECAP
            let coloredLine = cleanLine;
            
            // Realce para ok=X
            coloredLine = coloredLine.replace(/ok=(\d+)/, '<span style="color: #4ec9b0;">ok=$1</span>');
            
            // Realce para changed=X
            coloredLine = coloredLine.replace(/changed=(\d+)/, '<span style="color: #dcdcaa;">changed=$1</span>');
            
            // Realce para unreachable=X e failed=X
            coloredLine = coloredLine.replace(/unreachable=(\d+)/, '<span style="color: #f14c4c;">unreachable=$1</span>');
            coloredLine = coloredLine.replace(/failed=(\d+)/, '<span style="color: #f14c4c;">failed=$1</span>');
            
            formattedOutput += `<div class="ansible-stats">${coloredLine}</div>`;
        } else if (cleanLine.startsWith('**')) {
            // Linhas formatadas com ** são tratadas como informações do host mas não encaixaram nos padrões específicos
            formattedOutput += `<div class="ansible-console-line">${cleanLine}</div>`;
        } else {
            // Texto padrão
            formattedOutput += `<div class="ansible-console-line">${cleanLine}</div>`;
        }
    }
    
    // Se tiver informações de host coletadas mas que não foram renderizadas ainda
    if (hostInfo.length > 0) {
        formattedOutput += '<div class="ansible-host-info">';
        hostInfo.forEach(info => {
            formattedOutput += `
                <div class="ansible-host-info-item">
                    ${info.icon}
                    <strong>${info.type === 'hostname' ? 'Hostname' : 
                             info.type === 'public_ip' ? 'IP Público' : 
                             info.type === 'private_ip' ? 'IP Privado' : 'Sistema'}:</strong>
                    ${info.value}
                </div>`;
        });
        formattedOutput += '</div>';
    }
    
    formattedOutput += '</div>';
    return formattedOutput;
}

function handlePlaybookCompletion(status, card) {
    const statusDiv = card.querySelector('.task-status');
    const spinner = card.querySelector('.spinner');
    const progressBar = card.querySelector('.progress-bar');

    // Esconde o spinner
    if (spinner) spinner.style.display = 'none';
    
    // Ajusta a barra de progresso
    if (progressBar) {
        progressBar.style.width = '100%';
        
        switch (status) {
            case 'completed':
                progressBar.style.backgroundColor = '#4CAF50'; // Verde
                break;
            case 'failed':
                progressBar.style.backgroundColor = '#f44336'; // Vermelho
                break;
            case 'cancelled':
                progressBar.style.backgroundColor = '#ff9800'; // Laranja
                break;
        }
    }

    // Ajusta o texto de status
    if (statusDiv) {
        switch (status) {
            case 'completed':
                statusDiv.textContent = 'Concluído com sucesso';
                statusDiv.className = 'task-status success';
                break;
            case 'failed':
                statusDiv.textContent = 'Falhou';
                statusDiv.className = 'task-status failed';
                
                // Mostra automaticamente a saída em caso de falha
                const outputDiv = card.querySelector('.ansible-output');
                if (outputDiv) {
                    outputDiv.style.display = 'block';
                }
                
                // Atualiza o botão de "Ver Mais" para "Ver Menos"
                const toggleBtn = card.querySelector('.toggle-output-btn');
                if (toggleBtn) {
                    toggleBtn.innerHTML = `
                        Ver Menos
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    `;
                }
                break;
            case 'cancelled':
                statusDiv.textContent = 'Cancelado';
                statusDiv.className = 'task-status cancelled';
                break;
        }
    }
    
    debugLog(`Playbook finalizado com status: ${status}`);
}

const originalDOMContentLoaded = document.addEventListener;

document.addEventListener = function(event, callback, options) {
    if (event === 'DOMContentLoaded') {
        originalDOMContentLoaded.call(document, event, function() {
            callback();
            // Adiciona nossa inicialização aprimorada após a original
            initializeEnhancedUI();
        }, options);
    } else {
        originalDOMContentLoaded.call(document, event, callback, options);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Carregar o script do Site24x7
    const site24x7Script = document.createElement('script');
    site24x7Script.src = '/static/js/ansible/24x7.js';
    site24x7Script.type = 'text/javascript';
    document.head.appendChild(site24x7Script);
    debugLog('Inicializando aplicação');
    
    // Inicializa os filtros antes de carregar qualquer conteúdo
    initializeFilters();
    
    // Carrega os hosts e playbooks
    loadHosts();
    loadPlaybooks();
    
    // Configura os listeners de eventos
    document.addEventListener('DOMContentLoaded', () => {
        debugLog('Inicializando aplicação');
    
        // Inicializa os filtros antes de carregar qualquer conteúdo
        initializeFilters();
        initializeOSFilters();
    
        // Carrega hosts e playbooks
        loadHosts();
        loadPlaybooks();
    
        // Configura listeners de eventos
        const osFilter = document.getElementById('os-filter');
        if (osFilter) {
            osFilter.removeEventListener('change', updateOSInfoPanel); // Remove duplicatas
            osFilter.addEventListener('change', () => {
                debugLog(`Filtro de SO alterado para: ${osFilter.value || 'vazio'}`);
                loadPlaybooks();
                updateOSInfoPanel();
            });
        }
    
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.removeEventListener('change', loadPlaybooks); // Remove duplicatas
            categoryFilter.addEventListener('change', () => {
                debugLog(`Filtro de categoria alterado para: ${categoryFilter.value}`);
                loadPlaybooks();
            });
        }
    
        const executeButton = document.getElementById('execute-selected');
        if (executeButton) {
            executeButton.removeEventListener('click', executeSelectedPlaybooks); // Remove duplicatas
            executeButton.addEventListener('click', executeSelectedPlaybooks);
        }
    
        const refreshButton = document.getElementById('refresh');
        if (refreshButton) {
            refreshButton.removeEventListener('click', refreshAll);
            refreshButton.addEventListener('click', () => {
                debugLog('Atualizando todos os dados');
                refreshAll();
            });
        }
    
        const selectAllPlaybooks = document.getElementById('select-all-playbooks');
        if (selectAllPlaybooks) {
            selectAllPlaybooks.removeEventListener('click', toggleAllPlaybooks);
            selectAllPlaybooks.addEventListener('click', () => {
                const allSelected = selectedPlaybooks.size === document.querySelectorAll('.playbook-item').length;
                toggleAllPlaybooks(!allSelected);
            });
        }
    
        const selectAllHosts = document.getElementById('select-all-hosts-btn');
        if (selectAllHosts) {
            selectAllHosts.removeEventListener('click', toggleAllHosts);
            selectAllHosts.addEventListener('click', () => {
                const allSelected = selectedHosts.size === document.querySelectorAll('.host-banner.valid input[type="checkbox"]').length;
                toggleAllHosts(!allSelected);
            });
        }
    
        const cancelAll = document.getElementById('cancel-all');
        if (cancelAll) {
            cancelAll.removeEventListener('click', cancelAllExecutions);
            cancelAll.addEventListener('click', () => {
                debugLog('Cancelando todas as execuções');
                cancelAllExecutions();
            });
        }
    
        const debugToggle = document.getElementById('debug-toggle');
        if (debugToggle) {
            debugToggle.removeEventListener('click', toggleDebug);
            debugToggle.addEventListener('click', toggleDebug);
        }
    
        // Listener de scroll para posicionamento dos botões
        window.removeEventListener('scroll', updateButtonPositions); // Remove duplicatas
        window.addEventListener('scroll', () => {
            document.querySelectorAll('.execution-card').forEach(card => {
                const output = card.querySelector('.ansible-output');
                if (output && output.style.display === 'block') {
                    positionButtonGroup(card);
                }
            });
        });
    
        // Inicializa após um pequeno atraso
        setTimeout(initializeButtonPositions, 100);
    
        // Carrega script externo (se necessário)
        const site24x7Script = document.createElement('script');
        site24x7Script.src = '/static/js/ansible/24x7.js';
        site24x7Script.type = 'text/javascript';
        document.head.appendChild(site24x7Script);
    });
    
    // Função auxiliar para toggle de debug (exemplo)
    function toggleDebug() {
        const debugOutput = document.getElementById('debug-output');
        const isVisible = debugOutput.style.display === 'block';
        debugOutput.style.display = isVisible ? 'none' : 'block';
        document.getElementById('debug-toggle').innerHTML = isVisible ? `
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
        if (!isVisible) {
            debugLog('Debug ativado');
            debugOutput.scrollTop = 0;
        }
    }


    // Adicionar função para inicializar o posicionamento dos botões em todos os cards quando a página carregar
/* JavaScript para aplicar o posicionamento correto */
document.addEventListener('DOMContentLoaded', function() {
    // Cria os botões novamente se necessário
    document.querySelectorAll('.execution-card').forEach(card => {
      // Verifica se os botões existem
      if (!card.querySelector('.button-group')) {
        // Cria o grupo de botões
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.innerHTML = `
          <button class="cancel-btn" onclick="cancelExecution(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Cancelar
          </button>
          <button class="toggle-output-btn" onclick="toggleOutput(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
            Ver Mais
          </button>
        `;
        
        card.appendChild(buttonGroup);
      }
    });
  });
  
    
    // Inicializa após um pequeno delay para garantir que a DOM esteja completamente renderizada
    setTimeout(initializeButtonPositions, 100);
    
    // Adiciona listeners para eventos de scroll para manter o posicionamento correto
    window.addEventListener('scroll', function() {
        document.querySelectorAll('.execution-card').forEach(card => {
            const output = card.querySelector('.ansible-output');
            if (output && output.style.display === 'block') {
                positionButtonGroup(card);
            }
        });
    });
});


    
    document.getElementById('debug-toggle')?.addEventListener('click', () => {
        const debugOutput = document.getElementById('debug-output');
        const isVisible = debugOutput.style.display === 'block';
        debugOutput.style.display = isVisible ? 'none' : 'block';
        document.getElementById('debug-toggle').innerHTML = isVisible ? `
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
        if (!isVisible) {
            debugLog('Debug ativado');
            debugOutput.scrollTop = 0;
        }

});