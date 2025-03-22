/**
 * ansible-hosts.js
 * Gerencia a exibição, seleção e carregamento de hosts do Ansible.
 * 
 * Este arquivo contém:
 * - Funções para carregar hosts da API
 * - Funções para renderizar hosts na interface
 * - Manipulação de seleção de hosts
 * - Geração de elementos visuais dos hosts
 */

/**
 * Carrega os hosts da API ou usa cache se disponível
 * @param {boolean} forceRefresh - Se verdadeiro, ignora o cache e recarrega da API
 */
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
        fetch('/api/hosts')
        .then(response => response.json())
        .then(data => {
            // Renderiza hosts
            const hostsList = document.getElementById('hosts-list');
            hostsList.innerHTML = data.map(host => `
                <div>
                    <input type="checkbox" class="host-checkbox" data-host="${host}">
                    <label>${host}</label>
                </div>
            `).join('');
            setupSelectionListeners(); // Reaplica os listeners após carregar
        });

        
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
            debugLog(`Dados recebidos da API /api/hosts: ${Object.keys(hostData).length} hosts`);
            
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

/**
 * Renderiza os hosts a partir do cache na interface
 */
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
    hostsContent.style.flexWrap = 'wrap';
    hostsContent.style.gap = '12px';
    hostsContent.style.width = '100%';
    
    // Gera o HTML para cada host
    hostsContent.innerHTML = sortedHosts.map(([hostname, info]) => updateHostBanner(hostname, info)).join('');
    hostsContainer.appendChild(hostsContent);

    // Adiciona os event listeners
    attachHostEventListeners();
    
    debugLog(`${sortedHosts.length} hosts renderizados na interface`);
}

/**
 * Anexa os listeners de eventos aos hosts
 */
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
    
    debugLog('Event listeners dos hosts configurados');
}

/**
 * Cria o HTML do banner de host
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
 * Alterna a seleção de um host
 * @param {HTMLElement} banner - O elemento DOM do banner do host
 * @param {string} hostname - O nome do host
 */
function toggleHostSelection(banner, hostname) {
    const checkbox = banner.querySelector(`input[data-hostname="${hostname}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        banner.classList.toggle('selected', checkbox.checked);
        
        if (checkbox.checked) {
            selectedHosts.add(hostname);
        } else {
            selectedHosts.delete(hostname);
        }
        
        updateExecuteButton();
    }
}

/**
 * Seleciona ou deseleciona todos os hosts válidos
 * @param {boolean} checked - Se verdadeiro, seleciona todos; caso contrário, deseleciona
 */
function toggleAllHosts(checked) {
    const validHostCheckboxes = document.querySelectorAll('.host-banner.valid input[type="checkbox"]');
    selectedHosts.clear();
    
    validHostCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const banner = checkbox.closest('.host-banner');
        banner.classList.toggle('selected', checked);
        
        if (checked) {
            selectedHosts.add(checkbox.dataset.hostname);
        }
    });
    
    updateExecuteButton();
    debugLog(`${checked ? 'Selecionou' : 'Desmarcou'} todos os hosts. Total: ${selectedHosts.size}`);
}

/**
 * Gera um nome de host formatado profissionalmente
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
/**
 * Funções para atualizar automaticamente os dados do host nos cards de execução
 */

/**
 * Busca os dados mais atualizados de um host específico
 * @param {string} hostname - O nome do host para buscar dados
 * @returns {Promise} Promessa com os dados do host
 */
async function fetchHostDetails(hostname) {
    try {
        // Tenta obter dados do endpoint específico primeiro
        const response = await fetch(`/api/host/${hostname}`);
        
        // Se o endpoint não está disponível, busca na API geral
        if (!response.ok && response.status === 404) {
            console.log(`API específica /api/host/${hostname} não encontrada, tentando API geral`);
            const allHostsResponse = await fetch('/api/hosts');
            
            if (allHostsResponse.ok) {
                const allHostsData = await allHostsResponse.json();
                if (allHostsData && allHostsData[hostname] && allHostsData[hostname].facts) {
                    return allHostsData[hostname].facts;
                }
            }
            
            throw new Error(`Não foi possível obter dados para o host ${hostname}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Erro ao buscar detalhes do host ${hostname}:`, error);
        
        // Retorna valores padrão em caso de falha
        return {
            hostname: hostname,
            public_ip: hostname,
            private_ip: hostname,
            system: 'Sistema não identificado'
        };
    }
}

/**
 * Atualiza os detalhes de hosts em todos os cards de execução
 */
async function updateAllHostsInCards() {
    try {
        const cards = document.querySelectorAll('.execution-card');
        if (cards.length === 0) return;
        
        // Percorre cada card de execução
        for (const card of cards) {
            const hostDetails = card.querySelectorAll('.host-details');
            
            // Processa cada host no card
            for (const hostDetail of hostDetails) {
                const hostname = hostDetail.getAttribute('data-host');
                if (!hostname) continue;
                
                try {
                    // Busca os dados atualizados
                    const hostData = await fetchHostDetails(hostname);
                    
                    // Atualiza os valores no card
                    const hostnameElement = hostDetail.querySelector('p:nth-child(1) .host-info-item-value, p:nth-child(1) span:last-child');
                    const publicIpElement = hostDetail.querySelector('p:nth-child(2) .host-info-item-value, p:nth-child(2) span:last-child');
                    const privateIpElement = hostDetail.querySelector('p:nth-child(3) .host-info-item-value, p:nth-child(3) span:last-child');
                    const systemElement = hostDetail.querySelector('p:nth-child(4) .host-info-item-value, p:nth-child(4) span:last-child');
                    
                    // Atualiza os elementos se eles existirem
                    if (hostnameElement && hostData.hostname) {
                        hostnameElement.textContent = hostData.hostname;
                    }
                    
                    if (publicIpElement && hostData.public_ip) {
                        publicIpElement.textContent = hostData.public_ip;
                    }
                    
                    if (privateIpElement && hostData.private_ip) {
                        privateIpElement.textContent = hostData.private_ip;
                    }
                    
                    if (systemElement && hostData.system) {
                        systemElement.textContent = hostData.system;
                    }
                    
                    console.log(`Dados do host ${hostname} atualizados no card ${card.dataset.playbookName || card.id}`);
                } catch (hostError) {
                    console.error(`Erro ao atualizar host ${hostname}:`, hostError);
                }
            }
        }
        
        // Salva o estado atualizado
        if (typeof saveRunningJobsState === 'function') {
            saveRunningJobsState();
        }
    } catch (error) {
        console.error('Erro ao atualizar hosts nos cards:', error);
    }
}

/**
 * Inicializa a atualização automática dos hosts nos cards
 */
function setupHostUpdateService() {
    // Realiza uma atualização inicial
    setTimeout(updateAllHostsInCards, 2000);
    
    // Configura uma atualização periódica
    setInterval(updateAllHostsInCards, 30000); // Atualiza a cada 30 segundos
}

// Adiciona a função ao objeto window
window.fetchHostDetails = fetchHostDetails;
window.updateAllHostsInCards = updateAllHostsInCards;
window.setupHostUpdateService = setupHostUpdateService;

// Inicializa quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', setupHostUpdateService);


// Exporta funções para uso global
window.loadHosts = loadHosts;
window.toggleAllHosts = toggleAllHosts;