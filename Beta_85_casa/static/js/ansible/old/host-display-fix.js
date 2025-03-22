/**
 * host-display-fix.js
 * 
 * Corrige a exibição dos hosts no banner e garante que os dados
 * sejam corretamente sincronizados com a API.
 */

(function() {
    console.log("[HostFix] Iniciando correção para exibição de hosts...");
    
    // Configuration
    const CONFIG = {
        autoRefreshInterval: 10000,  // Intervalo para atualização automática (10s)
        fetchRetries: 3,             // Número de tentativas para buscar dados
        debugEnabled: true           // Habilita logs detalhados
    };
    
    // Função de log
    function logDebug(message, type = 'info') {
        if (!CONFIG.debugEnabled && type !== 'error') return;
        const prefix = '[HostFix]';
        if (type === 'error') {
            console.error(`${prefix} ${message}`);
        } else if (type === 'warning') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * Busca dados de hosts diretamente da API
     * Isso garante que tenhamos os dados mais atualizados
     */
    async function fetchHostsData() {
        logDebug("Buscando dados de hosts da API...");
        try {
            const response = await fetch('/api/hosts');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            logDebug(`Dados recebidos para ${Object.keys(data).length} hosts`);
            return data;
        } catch (error) {
            logDebug(`Erro ao buscar hosts: ${error.message}`, 'error');
            return null;
        }
    }
    
    /**
     * Atualiza os banners de hosts com os dados recebidos da API
     */
    function updateHostBanners(hostsData) {
        if (!hostsData) return;
        
        const hostBanners = document.querySelectorAll('.host-banner');
        logDebug(`Encontrados ${hostBanners.length} banners de hosts para atualizar`);
        
        if (hostBanners.length === 0) {
            logDebug("Nenhum banner de host encontrado, tentando novamente em 2s...");
            setTimeout(() => tryRefreshAllHosts(), 2000);
            return;
        }
        
        let updatedCount = 0;
        
        hostBanners.forEach(banner => {
            try {
                // Tenta encontrar o hostname deste banner
                const hostname = findHostnameFromBanner(banner);
                if (!hostname) {
                    logDebug("Banner sem hostname identificável", 'warning');
                    return;
                }
                
                // Verifica se temos dados para este host
                if (!(hostname in hostsData)) {
                    logDebug(`Dados não encontrados para host: ${hostname}`, 'warning');
                    return;
                }
                
                const hostInfo = hostsData[hostname];
                if (!hostInfo.valid || !hostInfo.facts) {
                    logDebug(`Host inválido ou sem facts: ${hostname}`, 'warning');
                    // Ainda podemos atualizar o status como offline
                    const statusBadge = banner.querySelector('.host-status-badge');
                    if (statusBadge) {
                        statusBadge.textContent = 'OFFLINE';
                        banner.classList.add('invalid');
                        banner.classList.remove('valid');
                    }
                    return;
                }
                
                // Atualiza os dados do host no banner
                if (updateBannerContent(banner, hostname, hostInfo.facts)) {
                    updatedCount++;
                }
                
                // Atualiza o status como online
                const statusBadge = banner.querySelector('.host-status-badge');
                if (statusBadge) {
                    statusBadge.textContent = 'ONLINE';
                    banner.classList.add('valid');
                    banner.classList.remove('invalid');
                }
            } catch (error) {
                logDebug(`Erro ao processar banner: ${error.message}`, 'error');
            }
        });
        
        logDebug(`${updatedCount} banners de hosts atualizados com sucesso`);
        
        // Se nenhum host foi atualizado, talvez seja um problema estrutural - tente recriar os banners
        if (updatedCount === 0 && hostBanners.length > 0) {
            logDebug("Nenhum host atualizado, tentando recarregar...", 'warning');
            triggerHostsReload();
        }
    }
    
    /**
     * Encontra o hostname associado a um banner
     */
    function findHostnameFromBanner(banner) {
        // Método 1: Checkbox com data-hostname
        const checkbox = banner.querySelector('input[type="checkbox"][data-hostname]');
        if (checkbox && checkbox.dataset.hostname) {
            return checkbox.dataset.hostname;
        }
        
        // Método 2: Título do cabeçalho
        const header = banner.querySelector('h4');
        if (header && header.textContent.trim()) {
            return header.textContent.trim();
        }
        
        // Método 3: Qualquer valor de IP que pareça ser um hostname
        const ipElements = banner.querySelectorAll('.host-info-item-value');
        for (const element of ipElements) {
            if (element.textContent.trim().match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
                return element.textContent.trim();
            }
        }
        
        return null;
    }
    
    /**
     * Atualiza o conteúdo de um banner com os dados do host
     */
    function updateBannerContent(banner, hostname, facts) {
        let updated = false;
        
        // Atualizar hostname no header
        if (facts.hostname) {
            const header = banner.querySelector('h4');
            if (header && header.textContent !== facts.hostname) {
                header.textContent = facts.hostname;
                header.title = facts.hostname;
                updated = true;
            }
        }
        
        // Estrutura esperada dos elementos de informação
        const infoMap = [
            { selector: '.host-info-item:nth-child(1) .host-info-item-value', property: 'public_ip' },
            { selector: '.host-info-item:nth-child(2) .host-info-item-value', property: 'private_ip' },
            { selector: '.host-info-item:nth-child(3) .host-info-item-value', property: 'system' }
        ];
        
        // Atualizar cada elemento de informação
        infoMap.forEach(info => {
            if (facts[info.property]) {
                const element = banner.querySelector(info.selector);
                if (element && element.textContent !== facts[info.property]) {
                    element.textContent = facts[info.property];
                    element.title = facts[info.property];
                    updated = true;
                }
            }
        });
        
        // Se algo foi atualizado, adiciona efeito visual
        if (updated) {
            // Adiciona classe para animação de destaque
            banner.classList.add('banner-updated');
            
            // Remove a classe após a animação
            setTimeout(() => {
                banner.classList.remove('banner-updated');
            }, 3000);
        }
        
        return updated;
    }
    
    /**
     * Força o recarregamento de todos os hosts
     */
    function triggerHostsReload() {
        logDebug("Forçando recarregamento de hosts...");
        if (typeof window.loadHosts === 'function') {
            window.loadHosts(true);  // true força o refresh
        } else {
            logDebug("Função loadHosts não encontrada", 'error');
        }
    }
    
    /**
     * Tenta atualizar todos os hosts com retry
     */
    async function tryRefreshAllHosts(retryCount = 0) {
        const maxRetries = CONFIG.fetchRetries;
        
        try {
            const hostsData = await fetchHostsData();
            if (hostsData) {
                updateHostBanners(hostsData);
                setupAutoRefresh(); // Configura atualização periódica
                return;
            }
            
            // Falha ao buscar dados, tenta novamente
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
                logDebug(`Tentativa ${retryCount + 1}/${maxRetries} falhou, tentando novamente em ${delay}ms...`);
                setTimeout(() => tryRefreshAllHosts(retryCount + 1), delay);
            } else {
                logDebug(`Falha após ${maxRetries} tentativas. Desistindo.`, 'error');
            }
        } catch (error) {
            logDebug(`Erro ao atualizar hosts: ${error.message}`, 'error');
            
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
                logDebug(`Tentativa ${retryCount + 1}/${maxRetries} falhou, tentando novamente em ${delay}ms...`);
                setTimeout(() => tryRefreshAllHosts(retryCount + 1), delay);
            } else {
                logDebug(`Falha após ${maxRetries} tentativas. Desistindo.`, 'error');
            }
        }
    }
    
    /**
     * Configura a atualização periódica dos hosts
     */
    function setupAutoRefresh() {
        if (window.hostRefreshInterval) {
            clearInterval(window.hostRefreshInterval);
        }
        
        window.hostRefreshInterval = setInterval(async () => {
            logDebug("Atualizando hosts automaticamente...");
            const hostsData = await fetchHostsData();
            if (hostsData) {
                updateHostBanners(hostsData);
            }
        }, CONFIG.autoRefreshInterval);
        
        logDebug(`Atualização automática configurada a cada ${CONFIG.autoRefreshInterval/1000}s`);
    }
    
    /**
     * Injeta CSS necessário para as animações de atualização
     */
    function injectStyles() {
        const styleId = 'host-display-fix-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Animação de destaque para hosts atualizados */
            @keyframes host-updated-pulse {
                0%, 100% { box-shadow: none; }
                50% { box-shadow: 0 0 15px rgba(255, 214, 0, 0.6); }
            }
            
            .banner-updated {
                animation: host-updated-pulse 1s ease-in-out 3;
            }
            
            /* Melhora na visualização do status */
            .host-status-badge {
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .valid .host-status-badge {
                background-color: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }
            
            .invalid .host-status-badge {
                background-color: rgba(244, 67, 54, 0.2);
                color: #F44336;
            }
        `;
        
        document.head.appendChild(style);
        logDebug("Estilos injetados");
    }
    
    /**
     * Inicializa o fix depois de um breve atraso
     * para garantir que todos os componentes foram carregados
     */
    function initialize() {
        logDebug("Inicializando correção para exibição de hosts...");
        
        // Injeta estilos necessários
        injectStyles();
        
        // Espera um pouco para ter certeza que todos os elementos estão carregados
        setTimeout(() => {
            // Tenta atualizar todos os hosts
            tryRefreshAllHosts();
            
            // Monitora mudanças no DOM e aplica a correção quando necessário
            setupDOMMonitoring();
        }, 1000);
    }
    
    /**
     * Monitora mudanças no DOM e aplica correções quando necessário
     */
    function setupDOMMonitoring() {
        const observer = new MutationObserver(mutations => {
            let shouldRefresh = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        
                        // Verifica se novos hosts foram adicionados
                        if (node.classList && (
                            node.classList.contains('host-banner') ||
                            node.querySelectorAll('.host-banner').length > 0
                        )) {
                            shouldRefresh = true;
                            break;
                        }
                    }
                }
            });
            
            if (shouldRefresh) {
                logDebug("Novos hosts detectados, atualizando...");
                setTimeout(() => tryRefreshAllHosts(), 500);
            }
        });
        
        // Observa o container de hosts
        const hostsContainer = document.getElementById('hosts-list');
        if (hostsContainer) {
            observer.observe(hostsContainer, {
                childList: true,
                subtree: true
            });
            logDebug("Monitoramento do DOM configurado");
        } else {
            logDebug("Container de hosts não encontrado para monitoramento", 'warning');
        }
    }
    
    // Iniciar a correção quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Expor funções úteis globalmente
    window.refreshHostBanners = tryRefreshAllHosts;
})();