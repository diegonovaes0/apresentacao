/**
 * Correção minimalista para restaurar a funcionalidade do botão Cancelar
 * No sistema Ansible Baseline Multihost
 */

// Função principal para corrigir o cancelamento
(function() {
    console.log("[Ansible Fix] Aplicando correção minimalista para o botão cancelar");
  
    // Restaurar a função cancelExecution original
    window.cancelExecution = async function(button) {
      try {
        const card = button.closest('.execution-card');
        if (!card) {
          throw new Error('Card de execução não encontrado');
        }
        
        // Verificar várias possibilidades de onde o ID do job pode estar armazenado
        const jobId = card.dataset.jobId || 
                     card.getAttribute('data-job-id') || 
                     card.id.replace('job-', '');
                     
        if (!jobId) {
          console.error('Card sem ID de job:', card);
          throw new Error('ID do job não encontrado no card');
        }
        
        console.log(`Tentando cancelar job: ${jobId}`);
        
        // Desabilitar o botão e mostrar indicador de carregamento
        button.disabled = true;
        button.innerHTML = `
          <div class="spinner" style="display: inline-block; margin-right: 5px;"></div>
          Cancelando...
        `;
        
        // Enviar a requisição para a API
        const response = await fetch(`/api/cancel`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
        }
        
        // Atualizar o status do card usando a função global original
        if (typeof window.handlePlaybookCompletion === 'function') {
          window.handlePlaybookCompletion('cancelled', card);
        }
        
        if (window.runningJobs && window.runningJobs.has(jobId)) {
          window.runningJobs.delete(jobId);
        }
        
        console.log(`Job ${jobId} cancelado com sucesso`);
        
        // Restaurar o botão
        button.disabled = false;
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Cancelar
        `;
        
        if (typeof window.showMessage === 'function') {
          window.showMessage(`Execução cancelada com sucesso`, 'success');
        }
        
      } catch (error) {
        console.error(`Erro ao cancelar job: ${error.message}`);
        
        // Restaurar o botão
        if (button) {
          button.disabled = false;
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Cancelar
          `;
        }
        
        if (typeof window.showMessage === 'function') {
          window.showMessage(`Erro ao cancelar execução: ${error.message}`, 'error');
        }
      }
    };
  
    // Restaurar a função cancelAllExecutions
    window.cancelAllExecutions = async function() {
      try {
        console.log('Iniciando cancelamento de todas as execuções');
        
        // Encontra todos os cards de execução que estão em andamento
        const executionCards = Array.from(document.querySelectorAll('.execution-card:not(.cancelled):not(.failed):not(.success)'));
        
        if (executionCards.length === 0) {
          if (typeof window.showMessage === 'function') {
            window.showMessage('Não há execuções em andamento para cancelar', 'warning');
          }
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
            // Obtém o ID do job
            const jobId = card.dataset.jobId || 
                        card.getAttribute('data-job-id') || 
                        card.id.replace('job-', '');
            
            if (!jobId) {
              console.error('Card sem ID de job:', card);
              errorCount++;
              continue;
            }
            
            // Fazer a requisição para cancelar
            cancelPromises.push(
              fetch(`/api/cancel`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: jobId })
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
                // Atualizar o card para status cancelado
                if (typeof window.handlePlaybookCompletion === 'function') {
                  window.handlePlaybookCompletion('cancelled', card);
                }
                
                if (window.runningJobs && window.runningJobs.has(jobId)) {
                  window.runningJobs.delete(jobId);
                }
                
                successCount++;
                console.log(`Job ${jobId} cancelado com sucesso`);
              })
              .catch(err => {
                console.error(`Erro ao cancelar job ${jobId}: ${err.message}`);
                errorCount++;
              })
            );
          } catch (cardError) {
            console.error(`Erro ao processar card para cancelamento: ${cardError.message}`);
            errorCount++;
          }
        }
        
        // Aguarda todas as promessas serem concluídas
        await Promise.allSettled(cancelPromises);
        
        // Remove o indicador de progresso
        document.querySelector('.cancel-progress-message')?.remove();
        
        // Exibe mensagem de resultado
        if (typeof window.showMessage === 'function') {
          if (successCount > 0) {
            window.showMessage(`${successCount} execuções canceladas com sucesso${errorCount > 0 ? ` (${errorCount} falhas)` : ''}`, 
                            errorCount > 0 ? 'warning' : 'success');
          } else if (errorCount > 0) {
            window.showMessage(`Falha ao cancelar execuções. Tente novamente ou atualize a página.`, 'error');
          }
        }
        
        console.log(`Cancelamento concluído: ${successCount} sucessos, ${errorCount} falhas`);
        
      } catch (error) {
        // Remove o indicador de progresso em caso de erro
        document.querySelector('.cancel-progress-message')?.remove();
        
        console.error(`Erro ao cancelar execuções: ${error.message}`);
        
        if (typeof window.showMessage === 'function') {
          window.showMessage(`Erro ao cancelar execuções: ${error.message}`, 'error');
        }
      }
    };
  
    // Garantir que os event listeners do botão Cancelar funcionem
    function fixCancelButtonListeners() {
      document.querySelectorAll('.cancel-btn').forEach(button => {
        // Remover todos os event listeners existentes (clonando o botão)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Adicionar o event listener correto
        newButton.addEventListener('click', function() {
          window.cancelExecution(this);
        });
      });
    }
  
    // Aplicar a correção aos botões existentes
    fixCancelButtonListeners();
  
    // Observar novos botões adicionados ao DOM
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          setTimeout(fixCancelButtonListeners, 100);
        }
      });
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  
    console.log("[Ansible Fix] Correção minimalista aplicada com sucesso");
  })();