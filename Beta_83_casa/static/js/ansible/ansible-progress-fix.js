/**
 * ansible-progress-fix.js
 * Restaura a funcionalidade da barra de progresso para carregamento de hosts
 */

(function() {
    console.log("Iniciando correção da barra de progresso");
    
    // Verificar se a função loadHosts existe e salvá-la
    const originalLoadHosts = window.loadHosts;
    
    if (typeof originalLoadHosts !== 'function') {
        console.error("Função loadHosts não encontrada, não é possível corrigir barra de progresso");
        return;
    }
    
    // Substituir a função loadHosts para restaurar a barra de progresso
    window.loadHosts = function(forceRefresh = false) {
        console.log("Carregando hosts com barra de progresso:", forceRefresh ? "(forçado)" : "");
        
        try {
            // Obter o container de hosts
            const hostsContainer = document.getElementById('hosts-list');
            if (!hostsContainer) {
                throw new Error('Container de hosts não encontrado');
            }
            
            // Criar banner de carregamento com barra de progresso
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
            
            // Limpar o container e adicionar o banner
            hostsContainer.innerHTML = '';
            hostsContainer.appendChild(loadingBanner);
            
            const loadingMessage = document.getElementById('loading-message');
            const progressBar = document.getElementById('loading-progress');
            
            let progress = 0;
            
            // Função para atualizar a barra de progresso
            const updateProgress = async (targetPercentage, duration) => {
                const start = progress;
                const steps = duration / 50;
                const increment = (targetPercentage - start) / steps;
                
                for (let i = 0; i < steps; i++) {
                    progress = start + increment * i;
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                progress = targetPercentage;
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                console.log(`Progresso atualizado: ${progress.toFixed(2)}%`);
            };
            
            // Iniciar a animação de progresso
            updateProgress(25, 1000).then(() => {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Verificando hosts...';
                }
                return updateProgress(50, 1000);
            }).then(() => {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Processando informações...';
                }
                return updateProgress(75, 1000);
            }).then(() => {
                return updateProgress(90, 500);
            });
            
            // Chamar a função original para fazer o carregamento real
            const result = originalLoadHosts(forceRefresh);
            
            // Se for uma Promise, encadear para mostrar conclusão
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    if (progressBar) {
                        progressBar.style.width = '100%';
                    }
                    
                    // Verificar se o banner ainda existe antes de modificá-lo
                    const banner = document.getElementById('loading-banner');
                    if (banner) {
                        banner.className = 'loading-banner success';
                        banner.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-green)" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Hosts carregados com sucesso!</span>
                        `;
                        
                        setTimeout(() => {
                            if (banner && banner.parentNode) {
                                banner.remove();
                            }
                        }, 1000);
                    }
                }).catch(error => {
                    // Em caso de erro, atualizar o banner
                    const banner = document.getElementById('loading-banner');
                    if (banner) {
                        banner.className = 'loading-banner error';
                        banner.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <span>Erro ao carregar hosts: ${error.message}</span>
                            <button onclick="refreshAll()" class="ansible-button" style="margin-left: 10px; margin-bottom: 0;">Tentar Novamente</button>
                        `;
                    }
                });
            }
            
            return result;
        } catch (error) {
            console.error("Erro ao carregar hosts com barra de progresso:", error);
            
            // Em caso de erro, tentar usar a função original diretamente
            return originalLoadHosts(forceRefresh);
        }
    };
    
    console.log("Correção da barra de progresso aplicada com sucesso");
})();