/**
 * ansible-emergency-fix.js
 * Correção de emergência para problemas críticos no Ansible UI
 */

(function() {
    console.log("INICIANDO CORREÇÃO DE EMERGÊNCIA PARA ANSIBLE UI");
    
    // =================== CORREÇÃO PARA EXECUÇÕES DUPLICADAS ===================
    
    // Variáveis de controle
    let executionLock = false;
    let lastExecutionTime = 0;
    let createdJobs = new Set();
    
    // Sobrescrever completamente a função de execução
    function replaceExecuteFunction() {
        window.originalExecuteSelectedPlaybooks = window.executeSelectedPlaybooks;
        
        window.executeSelectedPlaybooks = function() {
            console.log("🔒 Controle de execução ativado");
            
            // Verificar bloqueio de execução
            if (executionLock) {
                console.log("⛔ Execução bloqueada - operação já em andamento");
                alert("Aguarde a conclusão da operação atual antes de iniciar uma nova execução.");
                return false;
            }
            
            // Verificar intervalo mínimo
            const now = Date.now();
            if (now - lastExecutionTime < 3000) {
                console.log("⏱️ Execução muito rápida - aguardando intervalo");
                alert("Aguarde pelo menos 3 segundos entre execuções.");
                return false;
            }
            
            // Adquirir bloqueio
            executionLock = true;
            lastExecutionTime = now;
            console.log("🔐 Bloqueio adquirido");
            
            try {
                // Remover cards duplicados existentes
                removeDuplicateCards();
                
                // Chamar função original
                if (typeof window.originalExecuteSelectedPlaybooks === 'function') {
                    window.originalExecuteSelectedPlaybooks();
                }
            } catch (error) {
                console.error("Erro durante execução:", error);
            } finally {
                // Liberar bloqueio após 3 segundos
                setTimeout(() => {
                    executionLock = false;
                    console.log("🔓 Bloqueio liberado");
                }, 3000);
            }
        };
        
        // Criar alias para executePlaybooks se necessário
        window.executePlaybooks = window.executeSelectedPlaybooks;
        
        console.log("✅ Função de execução substituída com sucesso");
    }
    
    // =================== CORREÇÃO PARA CARDS DUPLICADOS ===================
    
    // Substituir a função de criação de cards
    function replaceCardCreationFunction() {
        window.originalCreateExecutionCard = window.createExecutionCard;
        
        window.createExecutionCard = function(playbookName, hosts, jobId) {
            console.log(`🔍 Verificando criação de card: ${playbookName}, ${jobId}`);
            
            // Verificar se já existe um card para esta playbook recentemente criado
            const executionContainer = document.getElementById('running-playbooks');
            if (executionContainer) {
                const existingCards = Array.from(executionContainer.querySelectorAll('.execution-card'));
                
                for (const card of existingCards) {
                    const cardPlaybookName = card.getAttribute('data-playbook-name');
                    
                    // Se encontrou um card recente para a mesma playbook, reutilizá-lo
                    if (cardPlaybookName === playbookName && Date.now() - lastExecutionTime < 5000) {
                        console.log(`♻️ Reutilizando card existente para ${playbookName}`);
                        return card;
                    }
                }
            }
            
            // Se não encontrou card existente, criar um novo
            const card = window.originalCreateExecutionCard(playbookName, hosts, jobId);
            
            // Guardar referência para evitar duplicação
            createdJobs.add(jobId);
            
            console.log(`✅ Card criado para ${playbookName}`);
            return card;
        };
        
        console.log("✅ Função de criação de card substituída com sucesso");
    }
    
    // Remover cards duplicados existentes
    function removeDuplicateCards() {
        const executionContainer = document.getElementById('running-playbooks');
        if (!executionContainer) return;
        
        // Mapear playbooks para cards
        const playbookCards = {};
        
        Array.from(executionContainer.querySelectorAll('.execution-card')).forEach(card => {
            const playbookName = card.getAttribute('data-playbook-name');
            if (!playbookName) return;
            
            if (!playbookCards[playbookName]) {
                playbookCards[playbookName] = [];
            }
            
            playbookCards[playbookName].push(card);
        });
        
        // Remover duplicados, mantendo o mais recente
        Object.entries(playbookCards).forEach(([playbookName, cards]) => {
            if (cards.length <= 1) return;
            
            console.log(`🧹 Limpando ${cards.length - 1} cards duplicados para ${playbookName}`);
            
            // Ordenar por timestamp (mais recente primeiro)
            cards.sort((a, b) => {
                const idA = a.getAttribute('data-job-id') || '';
                const idB = b.getAttribute('data-job-id') || '';
                
                // Extrair timestamp do ID
                const timestampA = idA.includes('_') ? parseInt(idA.split('_').pop()) : 0;
                const timestampB = idB.includes('_') ? parseInt(idB.split('_').pop()) : 0;
                
                return timestampB - timestampA;
            });
            
            // Manter apenas o primeiro (mais recente)
            for (let i = 1; i < cards.length; i++) {
                try {
                    cards[i].remove();
                } catch (e) {
                    console.error("Erro ao remover card:", e);
                }
            }
        });
    }
    
    // =================== CORREÇÃO PARA SAÍDA DUPLICADA ===================
    
    // Substituir a função de formatação de saída
    function replaceOutputFunction() {
        window.originalFormatAnsibleOutput = window.formatAnsibleOutput;
        
        window.formatAnsibleOutput = function(output) {
            console.log("📝 Formatando saída do Ansible");
            
            if (!output) return "<em>Nenhuma saída disponível</em>";
            
            // Remover duplicações
            const cleanedOutput = removeDuplicateLines(output);
            
            // Usar a função original com a saída limpa
            if (typeof window.originalFormatAnsibleOutput === 'function') {
                return window.originalFormatAnsibleOutput(cleanedOutput);
            } else {
                // Formatação básica
                return `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${cleanedOutput}</pre>`;
            }
        };
        
        // Função para remover linhas duplicadas
        function removeDuplicateLines(text) {
            const lines = text.split('\n');
            const result = [];
            const seenLines = new Set();
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Verificar duplicação imediata (linha seguinte idêntica)
                if (i < lines.length - 1 && line === lines[i + 1]) {
                    continue;
                }
                
                // Verificar duplicação de estrutura (PLAY, TASK, etc)
                if (line.includes('PLAY ') || line.includes('TASK ') || line.includes('ok:')) {
                    // Criar uma versão normalizada para comparação
                    const normalizedLine = line.replace(/\*\*/g, '').trim();
                    
                    if (seenLines.has(normalizedLine)) {
                        continue;
                    }
                    
                    seenLines.add(normalizedLine);
                }
                
                result.push(line);
            }
            
            return result.join('\n');
        }
        
        console.log("✅ Função de formatação de saída substituída com sucesso");
    }
    
    // Substituir a função de toggle da saída
    function replaceToggleFunction() {
        window.originalToggleOutput = window.toggleOutput;
        
        window.toggleOutput = function(button) {
            console.log("🔄 Toggle de saída interceptado");
            
            const card = button.closest('.execution-card');
            if (!card) return;
            
            const output = card.querySelector('.ansible-output');
            if (!output) return;
            
            const isVisible = output.style.display === 'block';
            
            if (isVisible) {
                // Ocultar saída
                output.style.display = 'none';
                button.innerHTML = `
                    Ver Mais
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                `;
            } else {
                // Mostrar saída
                const jobId = card.getAttribute('data-job-id');
                
                // Mostrar indicador de carregamento
                output.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Carregando saída...</div>';
                output.style.display = 'block';
                
                if (jobId) {
                    // Buscar saída atualizada
                    fetch(`/api/status/${jobId}`)
                        .then(response => response.json())
                        .then(data => {
                            // Formatar saída sem duplicações
                            output.innerHTML = window.formatAnsibleOutput(data.output || "");
                        })
                        .catch(error => {
                            console.error("Erro ao buscar saída:", error);
                            output.innerHTML = `<div style="color: red; padding: 20px;">Erro ao buscar saída: ${error.message}</div>`;
                        });
                } else {
                    output.innerHTML = '<div style="color: red; padding: 20px;">ID do job não encontrado</div>';
                }
                
                // Atualizar botão
                button.innerHTML = `
                    Ver Menos
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                `;
            }
        };
        
        console.log("✅ Função de toggle substituída com sucesso");
    }
    
    // =================== INICIALIZAÇÃO ===================
    
    // Executar todas as correções
    function applyAllFixes() {
        // Substituir funções
        replaceExecuteFunction();
        replaceCardCreationFunction();
        replaceOutputFunction();
        replaceToggleFunction();
        
        // Limpar duplicações existentes
        setTimeout(removeDuplicateCards, 1000);
        
        // Adicionar correções aos botões existentes
        setTimeout(fixExistingButtons, 1000);
        
        console.log("✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO");
    }
    
    // Corrigir botões existentes
    function fixExistingButtons() {
        // Corrigir botões de toggle
        document.querySelectorAll('.toggle-output-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                window.toggleOutput(this);
            });
        });
        
        // Corrigir botões de execução
        document.querySelectorAll('[onclick*="executePlaybooks"]').forEach(button => {
            button.setAttribute('onclick', 'executeSelectedPlaybooks(); return false;');
        });
        
        console.log("✅ Botões existentes corrigidos");
    }
    
    // Executar agora
    applyAllFixes();
    
    // Também garantir que seja aplicado após carregamento completo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAllFixes);
    }
    
    // Fornecer API de correção global
    window.fixAnsibleUI = function() {
        applyAllFixes();
        removeDuplicateCards();
        alert("Correções reaplicadas com sucesso!");
    };
    
    // Adicionar botão de correção emergencial na página
    setTimeout(() => {
        const fixButton = document.createElement('button');
        fixButton.textContent = "Corrigir Ansible UI";
        fixButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #ff9800;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            font-weight: bold;
            z-index: 9999;
            cursor: pointer;
        `;
        fixButton.onclick = window.fixAnsibleUI;
        document.body.appendChild(fixButton);
    }, 2000);
})();