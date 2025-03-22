/**
 * correcao-selecao-hosts.js
 * Corrige o problema de seleção de hosts durante a execução de playbooks.
 * 
 * Este módulo resolve o problema onde o sistema não reconhece hosts selecionados
 * ao executar playbooks, garantindo que a seleção seja corretamente identificada e visualizada.
 */

(function() {
  console.log("Inicializando correção para problemas de seleção de hosts...");
  
  // Prevenir múltiplas inicializações
  if (window.hostSelectionFixApplied) {
      console.log("Correção de seleção de hosts já aplicada. Ignorando.");
      return;
  }
  
  // Adicionar estilos CSS para reforçar visualização da seleção
  function injectSelectionStyles() {
      const styleEl = document.createElement('style');
      styleEl.id = 'host-selection-styles';
      styleEl.innerHTML = `
          /* Estilos para hosts selecionados */
          .host-banner.selected {
              border: 2px solid var(--accent-gold, #FFD600) !important;
              box-shadow: 0 0 8px rgba(255, 214, 0, 0.4) !important;
              transform: translateY(-2px) !important;
              transition: all 0.2s ease !important;
              position: relative;
          }
          
          /* Adiciona um indicador visual claro de seleção */
          .host-banner.selected::after {
              content: "✓";
              position: absolute;
              top: -10px;
              right: -10px;
              background: var(--accent-gold, #FFD600);
              color: var(--black-absolute, #000000);
              width: 22px;
              height: 22px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              z-index: 10;
              animation: pulse-selection 1.5s infinite alternate;
          }
          
          @keyframes pulse-selection {
              from { transform: scale(1); }
              to { transform: scale(1.1); }
          }
          
          /* Garante que o checkbox fique visível */
          .host-banner.selected input[type="checkbox"] {
              opacity: 1 !important;
              pointer-events: all !important;
              visibility: visible !important;
              display: inline-block !important;
              position: relative !important;
              appearance: auto !important;
              -webkit-appearance: checkbox !important;
              -moz-appearance: checkbox !important;
          }
          
          .host-banner.selected label {
              color: var(--accent-gold, #FFD600) !important;
              font-weight: bold !important;
          }
      `;
      document.head.appendChild(styleEl);
      console.log("Estilos de seleção de hosts injetados");
  }
  
  /**
   * Função para rastrear e corrigir a seleção de hosts
   */
  function fixHostSelection() {
      const originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
      
      // Sobrescrever a função de execução de playbooks
      window.executeSelectedPlaybooks = function() {
          console.log("Interceptando execução para verificar seleção de hosts");
          
          try {
              // Atualiza a seleção global antes de prosseguir
              forceUpdateSelection();
              
              // Verifica seleções de hosts baseado em múltiplos métodos
              const selectedHostsSet = getSelectedHosts();
              
              if (!selectedHostsSet || selectedHostsSet.size === 0) {
                  console.warn("Nenhum host selecionado encontrado, verificando manualmente");
                  
                  // Forçar identificação manual de hosts selecionados
                  const manuallySelectedHosts = identifySelectedHosts();
                  
                  if (manuallySelectedHosts.length > 0) {
                      console.log(`Encontrados ${manuallySelectedHosts.length} hosts selecionados manualmente`);
                      
                      // Atualizar a variável global selectedHosts
                      window.selectedHosts = new Set(manuallySelectedHosts);
                      
                      // Atualizar visualização
                      updateSelectionVisuals();
                      
                      // Chamada segura para a função original
                      return originalExecuteSelectedPlaybooks();
                  } else {
                      // Não mostrar a mensagem se o usuário já viu recentemente
                      if (!window.lastNoHostsMessage || (Date.now() - window.lastNoHostsMessage > 5000)) {
                          window.lastNoHostsMessage = Date.now();
                          console.log("Nenhum host selecionado");
                      }
                      return;
                  }
              }
              
              // Se chegou aqui, a seleção de hosts está ok, executar normalmente
              return originalExecuteSelectedPlaybooks();
          } catch (error) {
              console.error("Erro ao executar correção de seleção de hosts:", error);
              
              // Tentar executar a função original como fallback
              return originalExecuteSelectedPlaybooks();
          }
      };
      
      console.log("Função de execução de playbooks corrigida para problema de seleção de hosts");
  }
  
  /**
   * Força uma atualização completa da seleção
   */
  function forceUpdateSelection() {
      // Atualizar baseado nos elementos visuais
      const manuallySelectedHosts = identifySelectedHosts();
      if (manuallySelectedHosts.length > 0) {
          window.selectedHosts = new Set(manuallySelectedHosts);
          console.log(`Seleção forçada atualizada: ${manuallySelectedHosts.length} hosts`);
      }
      
      // Garantir que a representação visual está atualizada
      updateSelectionVisuals();
  }
  
  /**
   * Atualiza os elementos visuais para refletir a seleção atual
   */
  function updateSelectionVisuals() {
      if (!window.selectedHosts || !(window.selectedHosts instanceof Set)) return;
      
      // Remover seleção visual de todos os hosts primeiro
      document.querySelectorAll('.host-banner').forEach(banner => {
          banner.classList.remove('selected');
          const checkbox = banner.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
      });
      
      // Aplicar seleção visual apenas nos hosts selecionados
      window.selectedHosts.forEach(hostname => {
          const checkbox = document.querySelector(`input[data-hostname="${hostname}"]`);
          if (checkbox) {
              const banner = checkbox.closest('.host-banner');
              if (banner) {
                  banner.classList.add('selected');
                  checkbox.checked = true;
                  
                  // Garantir que o checkbox está visível
                  checkbox.style.opacity = "1";
                  checkbox.style.visibility = "visible";
                  checkbox.style.display = "inline-block";
              }
          }
      });
      
      console.log(`Atualizados ${window.selectedHosts.size} hosts visualmente`);
  }
  
  /**
   * Obtém os hosts selecionados de várias fontes possíveis
   * @returns {Set} Conjunto de hosts selecionados
   */
  function getSelectedHosts() {
      // Verificar a variável global selectedHosts
      if (window.selectedHosts && window.selectedHosts instanceof Set && window.selectedHosts.size > 0) {
          console.log(`Encontrados ${window.selectedHosts.size} hosts na variável global selectedHosts`);
          return window.selectedHosts;
      }
      
      // Buscar elementos selecionados no DOM
      const manuallySelectedHosts = identifySelectedHosts();
      if (manuallySelectedHosts.length > 0) {
          console.log(`Encontrados ${manuallySelectedHosts.length} hosts selecionados no DOM`);
          return new Set(manuallySelectedHosts);
      }
      
      // Nenhum host selecionado encontrado
      return new Set();
  }
  
  /**
   * Identifica hosts selecionados no DOM usando múltiplos seletores
   * @returns {Array} Lista de hostnames selecionados
   */
  function identifySelectedHosts() {
      const selectedHosts = [];
      
      try {
          // Método 1: Verificar elementos com classe .host-item.selected ou .host-banner.selected
          document.querySelectorAll('.host-item.selected, .host-banner.selected, .host-banner.valid.selected').forEach(host => {
              // Tentar obter o hostname de várias fontes possíveis
              const hostname = getHostnameFromElement(host);
              if (hostname) {
                  selectedHosts.push(hostname);
              }
          });
          
          // Método 2: Verificar checkboxes marcados
          document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
              // Verificar se o checkbox pertence a um host
              if (checkbox.closest('.host-item') || checkbox.closest('.host-banner')) {
                  const hostname = checkbox.dataset.hostname || 
                                  checkbox.getAttribute('data-hostname') || 
                                  checkbox.id?.replace('host-', '');
                  
                  if (hostname && !selectedHosts.includes(hostname)) {
                      selectedHosts.push(hostname);
                  }
              }
          });
          
          // Remover duplicatas
          return [...new Set(selectedHosts)];
      } catch (error) {
          console.error("Erro ao identificar hosts selecionados:", error);
          return [];
      }
  }
  
  /**
   * Extrai o nome do host de um elemento DOM
   * @param {HTMLElement} element - Elemento do host
   * @returns {string|null} Nome do host ou null se não encontrado
   */
  function getHostnameFromElement(element) {
      // Tentar obter do checkbox dentro do elemento
      const checkbox = element.querySelector('input[type="checkbox"]');
      if (checkbox) {
          const hostname = checkbox.dataset.hostname || 
                          checkbox.getAttribute('data-hostname') || 
                          checkbox.id?.replace('host-', '');
          if (hostname) return hostname;
      }
      
      // Tentar obter do atributo data-host ou data-hostname do próprio elemento
      const dataHost = element.dataset.host || 
                      element.dataset.hostname || 
                      element.getAttribute('data-host') || 
                      element.getAttribute('data-hostname');
      if (dataHost) return dataHost;
      
      // Tentar obter do título ou texto dentro do elemento
      const title = element.querySelector('h3, h4');
      if (title) return title.textContent.trim();
      
      // Última tentativa: verificar se o próprio elemento tem um ID do formato host-NOME
      if (element.id && element.id.startsWith('host-')) {
          return element.id.replace('host-', '');
      }
      
      return null;
  }
  
  /**
   * Função para corrigir a atualização da seleção de hosts
   */
  function fixHostSelectionEvents() {
      // Encontrar todos os elementos que podem ser hosts
      document.querySelectorAll('.host-item, .host-banner').forEach(hostElement => {
          // Remover event listeners existentes para evitar duplicação
          const newElement = hostElement.cloneNode(true);
          hostElement.parentNode.replaceChild(newElement, hostElement);
          
          // Adicionar novo event listener
          newElement.addEventListener('click', function(event) {
              // Ignorar cliques em botões e elementos interativos dentro do host
              if (event.target.tagName === 'BUTTON' || 
                  event.target.closest('button') || 
                  event.target.tagName === 'INPUT' ||
                  event.target.classList.contains('baseline-trigger')) {
                  return;
              }
              
              // Toggle da classe selected de forma mais visível
              this.classList.toggle('selected');
              
              // Atualizar checkbox se existir
              const checkbox = this.querySelector('input[type="checkbox"]');
              if (checkbox) {
                  checkbox.checked = this.classList.contains('selected');
              }
              
              // Atualizar a variável global selectedHosts
              updateGlobalSelectedHosts();
              
              // Debug
              console.log("Host clicado:", getHostnameFromElement(this), "| Selecionado:", this.classList.contains('selected'));
              console.log("Total de hosts selecionados:", window.selectedHosts ? window.selectedHosts.size : 0);
          });
      });
      
      // Adicionar um observer para monitorar novos hosts que forem carregados
      const hostsObserver = new MutationObserver(mutations => {
          let needsUpdate = false;
          
          mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                  mutation.addedNodes.forEach(node => {
                      if (node.nodeType === 1) { // Elemento
                          // Verificar se é um host ou contém hosts
                          if (node.classList && (node.classList.contains('host-item') || node.classList.contains('host-banner'))) {
                              attachHostClickHandler(node);
                              needsUpdate = true;
                          } else if (node.querySelectorAll) {
                              // Verificar filhos
                              node.querySelectorAll('.host-item, .host-banner').forEach(host => {
                                  attachHostClickHandler(host);
                                  needsUpdate = true;
                              });
                          }
                      }
                  });
              }
          });
          
          if (needsUpdate) {
              updateGlobalSelectedHosts();
              // Também atualizar visualização após atualizar os dados
              updateSelectionVisuals();
          }
      });
      
      // Iniciar observação no container de hosts
      const hostContainer = document.getElementById('hosts-list');
      if (hostContainer) {
          hostsObserver.observe(hostContainer, { childList: true, subtree: true });
      }
  }
  
  /**
   * Adiciona handler de clique em um elemento de host
   */
  function attachHostClickHandler(hostElement) {
      // Remover handlers existentes
      hostElement.removeEventListener('click', hostClickHandler);
      
      // Adicionar novo handler
      hostElement.addEventListener('click', hostClickHandler);
  }
  
  /**
   * Função de manipulação de cliques em hosts
   */
  function hostClickHandler(event) {
      // Ignorar cliques em botões e elementos interativos dentro do host
      if (event.target.tagName === 'BUTTON' || 
          event.target.closest('button') || 
          event.target.tagName === 'INPUT' ||
          event.target.classList.contains('baseline-trigger')) {
          return;
      }
      
      // Toggle da classe selected
      this.classList.toggle('selected');
      
      // Atualizar checkbox se existir
      const checkbox = this.querySelector('input[type="checkbox"]');
      if (checkbox) {
          checkbox.checked = this.classList.contains('selected');
      }
      
      // Atualizar a variável global selectedHosts
      updateGlobalSelectedHosts();
      
      // Debug
      console.log("Host clicado via observador:", getHostnameFromElement(this), "| Selecionado:", this.classList.contains('selected'));
  }
  
  /**
   * Atualiza a variável global selectedHosts com base nos elementos selecionados no DOM
   */
  function updateGlobalSelectedHosts() {
      // Criar novo Set para evitar problemas de referência
      window.selectedHosts = new Set();
      
      // Adicionar hosts selecionados pelo DOM
      const manuallySelectedHosts = identifySelectedHosts();
      manuallySelectedHosts.forEach(host => {
          window.selectedHosts.add(host);
      });
      
      // Atualizar botão de execução se a função existir
      if (typeof window.updateExecuteButton === 'function') {
          try {
              window.updateExecuteButton();
          } catch (error) {
              console.warn("Erro ao atualizar botão de execução:", error);
          }
      }
      
      console.log("selectedHosts atualizado:", window.selectedHosts);
  }
  
  /**
   * Corrige a função updateExecuteButton para considerar hosts selecionados corretamente
   */
  function fixUpdateExecuteButton() {
      if (typeof window.updateExecuteButton !== 'function') return;
      
      const originalUpdateExecuteButton = window.updateExecuteButton;
      
      window.updateExecuteButton = function() {
          // Verificar seleção de hosts manualmente se necessário
          if (!window.selectedHosts || window.selectedHosts.size === 0) {
              const manuallySelectedHosts = identifySelectedHosts();
              if (manuallySelectedHosts.length > 0) {
                  window.selectedHosts = new Set(manuallySelectedHosts);
              }
          }
          
          // Chamar a função original
          return originalUpdateExecuteButton();
      };
  }
  
  /**
   * Sobrescreve a função showMessage para evitar mensagens repetitivas de "nenhum host selecionado"
   */
  function fixShowMessage() {
      if (typeof window.originalShowMessage !== 'function') {
          window.originalShowMessage = window.showMessage;
      }
      
      window.showMessage = function(text, type, duration) {
          // Se for uma mensagem sobre nenhum host selecionado
          if (text === "Selecione pelo menos um host para executar") {
              // Verificar se realmente não há hosts selecionados
              const hosts = identifySelectedHosts();
              if (hosts.length > 0) {
                  // Se há hosts selecionados, não mostrar mensagem
                  console.log("Mensagem suprimida: hosts estão selecionados mas não reconhecidos");
                  
                  // Atualizar a seleção global
                  window.selectedHosts = new Set(hosts);
                  
                  // Atualizar visualização para garantir feedback
                  updateSelectionVisuals();
                  
                  return;
              }
          }
          
          // Se chegou aqui, mostrar a mensagem normalmente
          window.originalShowMessage(text, type, duration);
      };
  }
  
  /**
   * Inicializa a correção
   */
  function init() {
      try {
          console.log("Inicializando correção para seleção de hosts...");
          
          // Injetar estilos para melhorar visualização de seleção
          injectSelectionStyles();
          
          // Criar a variável global selectedHosts se não existir
          if (!window.selectedHosts) {
              window.selectedHosts = new Set();
          }
          
          // Aplicar correções
          fixHostSelection();
          fixHostSelectionEvents();
          fixUpdateExecuteButton();
          fixShowMessage();
          
          // Forçar uma atualização inicial
          setTimeout(() => {
              updateGlobalSelectedHosts();
              updateSelectionVisuals();
          }, 1000);
          
          // Marcar como aplicado
          window.hostSelectionFixApplied = true;
          
          console.log("✅ Correção para seleção de hosts aplicada com sucesso");
      } catch (error) {
          console.error("❌ Erro ao aplicar correção para seleção de hosts:", error);
      }
  }
  
  // Verificar se o DOM já foi carregado
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
  } else {
      // Se já carregou, aguardar um pouco para outras inicializações terminarem
      setTimeout(init, 500);
  }
})();