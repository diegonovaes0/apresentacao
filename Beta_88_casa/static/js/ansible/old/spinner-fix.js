/**
 * Função para remover o spinner global que está afetando o header
 * Esta função deve ser chamada após o carregamento do DOM
 */
function removerSpinnerGlobal() {
    // Seleciona todos os possíveis spinners globais no topo da página
    const spinnersGlobais = document.querySelectorAll('.spinner:not([id]), .loading-banner:not([id])');
    
    // Remove os spinners que estão diretamente no body ou no header
    spinnersGlobais.forEach(spinner => {
      // Verifica se o spinner está em uma posição que pode afetar o header
      const rect = spinner.getBoundingClientRect();
      const style = window.getComputedStyle(spinner);
      
      // Se o spinner estiver fixo ou absoluto no topo da página
      if ((style.position === 'fixed' || style.position === 'absolute') && 
          rect.top < 100) {
        console.log('Removendo spinner global que afeta o header:', spinner);
        spinner.remove();
      }
    });
    
    // Procura também por qualquer elemento com classe contendo 'spinner' no topo
    document.querySelectorAll('[class*="spinner"]:not([id])').forEach(elemento => {
      const rect = elemento.getBoundingClientRect();
      const style = window.getComputedStyle(elemento);
      
      if ((style.position === 'fixed' || style.position === 'absolute') && 
          rect.top < 100) {
        console.log('Removendo elemento com classe spinner:', elemento);
        elemento.remove();
      }
    });
    
    // Adiciona uma regra CSS global para ocultar spinners que possam ser adicionados dinamicamente
    const estiloGlobal = document.createElement('style');
    estiloGlobal.textContent = `
      body > .spinner, 
      header .spinner, 
      .header .spinner, 
      body > [class*="loading"], 
      body > [class*="spinner"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(estiloGlobal);
    
    debugLog('Verificação e remoção do spinner global concluída');
  }
  
  /**
   * Função modificada para adicionar estilos globais sem criar spinner global
   */
  function addGlobalStyles() {
      const style = document.createElement('style');
      style.textContent = `
          /* Mantido apenas para spinners locais dentro de componentes específicos */
          .host-banner .spinner,
          .playbook-card .spinner,
          .execution-message .spinner {
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
            animation: spin 1s linear infinite;
          }
      `;
      document.head.appendChild(style);
      debugLog('Estilos globais adicionados (sem spinner global)');
  }
  
  /**
   * Função para corrigir posição dos elementos do header quando houver zoom
   */
  function corrigirHeaderNoZoom() {
    // Adiciona estilos específicos para garantir que o header permaneça fixo mesmo com zoom
    const headerStyles = document.createElement('style');
    headerStyles.textContent = `
      header, .header, .app-header, #main-header {
        position: sticky !important;
        top: 0 !important;
        z-index: 1000 !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
      }
      
      /* Prevenção para qualquer spinner global que possa aparecer */
      body > .spinner, 
      body > .loading-banner,
      body > [class*="spinner-global"],
      body > [class*="loading-global"] {
        display: none !important;
      }
    `;
    document.head.appendChild(headerStyles);
    
    // Verifica se existe algum spinner no header e remove
    const header = document.querySelector('header') || 
                  document.querySelector('.header') || 
                  document.querySelector('.app-header') ||
                  document.querySelector('#main-header');
    
    if (header) {
      const spinnersNoHeader = header.querySelectorAll('.spinner, [class*="spinner"], [class*="loading"]');
      spinnersNoHeader.forEach(spinner => {
        console.log('Removendo spinner do header:', spinner);
        spinner.remove();
      });
    }
    
    debugLog('Correção do header para zoom aplicada');
  }
  
  /**
   * Função atualizada para inicializar a aplicação sem criar spinners globais
   */
  function initializeApp() {
      debugLog('Inicializando aplicação');
      
      // Primeiro remove qualquer spinner global existente
      removerSpinnerGlobal();
      
      // Adicionar estilos para spinner e mensagens (apenas componentes locais)
      addGlobalStyles();
      
      // Corrige o header para suportar zoom
      corrigirHeaderNoZoom();
      
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
      
      // Executar novamente a remoção de spinners após o carregamento completo
      setTimeout(removerSpinnerGlobal, 1000);
      
      debugLog('Aplicação inicializada com sucesso');
  }
  
  // Exporta funções para uso global
  window.removerSpinnerGlobal = removerSpinnerGlobal;
  window.corrigirHeaderNoZoom = corrigirHeaderNoZoom;