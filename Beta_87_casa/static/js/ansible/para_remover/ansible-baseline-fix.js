/**
 * ansible-baseline-fix.js
 * Bloqueia completamente a execução do baseline até que todos os campos obrigatórios sejam preenchidos
 */

(function() {
    console.log("Inicializando bloqueio rigoroso para playbooks de baseline");
    
    // Variável para armazenar funções originais
    const originalFunctions = {
        executeSelectedPlaybooks: window.executeSelectedPlaybooks,
        fetch: window.fetch
    };
    
    // Sobrescrever completamente a função de execução
    window.executeSelectedPlaybooks = function() {
        console.log("🔍 Verificação rigorosa para execução de playbooks iniciada");
        
        try {
            // Verificar se alguma playbook de baseline está selecionada
            if (isBaselinePlaybookSelected()) {
                console.log("🛑 Playbook de baseline detectada, validando campos");
                
                // Verificar todos os campos obrigatórios
                if (!areBaselineFieldsFilled()) {
                    console.log("❌ Validação falhou, bloqueando execução");
                    
                    // Destacar campos vazios
                    highlightEmptyFields();
                    
                    // Mostrar mensagem de erro
                    if (typeof window.showMessage === 'function') {
                        window.showMessage("Preencha todos os campos obrigatórios do baseline antes de executar", "error", 5000);
                    } else {
                        alert("ATENÇÃO: Você precisa preencher todos os campos obrigatórios no banner de baseline antes de executar a playbook!");
                    }
                    
                    return false;
                }
                
                console.log("✅ Validação passou, prosseguindo com execução");
            }
            
            // Se não for baseline ou validação passou, prosseguir com a execução original
            return originalFunctions.executeSelectedPlaybooks();
        } catch (error) {
            console.error("Erro durante verificação de baseline:", error);
            
            // Em caso de erro, bloquear execução por segurança
            if (typeof window.showMessage === 'function') {
                window.showMessage("Erro ao validar campos do baseline: " + error.message, "error");
            } else {
                alert("Erro ao validar campos do baseline: " + error.message);
            }
            
            return false;
        }
    };
    
    // BLOQUEIO ADICIONAL: Interceptar o fetch para evitar a execução direta da API
    window.fetch = function(url, options) {
        // Verificar se é uma requisição para a API de execução
        if (url === '/api/run' && options?.method === 'POST') {
            try {
                // Tentar analisar o corpo da requisição
                const requestData = JSON.parse(options.body);
                const playbookPath = requestData.playbook || '';
                
                // Verificar se é uma playbook de baseline
                if (playbookPath.toLowerCase().includes('baseline')) {
                    console.log("🔒 Interceptando tentativa de execução direta de baseline via API");
                    
                    // Verificar novamente todos os campos obrigatórios (segurança adicional)
                    if (!areBaselineFieldsFilled()) {
                        console.log("⛔ Bloqueando execução direta via API");
                        
                        // Mostrar mensagem de erro
                        if (typeof window.showMessage === 'function') {
                            window.showMessage("Execução do baseline bloqueada: campos obrigatórios não preenchidos", "error", 5000);
                        } else {
                            alert("EXECUÇÃO BLOQUEADA: Todos os campos obrigatórios do baseline devem ser preenchidos.");
                        }
                        
                        // Retornar uma promessa rejeitada para simular falha na requisição
                        return Promise.reject(new Error("Campos obrigatórios do baseline não preenchidos"));
                    }
                }
            } catch (error) {
                console.error("Erro ao analisar requisição de execução:", error);
            }
        }
        
        // Prosseguir com a requisição original
        return originalFunctions.fetch.apply(this, arguments);
    };
    
    // Função para verificar se alguma playbook de baseline está selecionada
    function isBaselinePlaybookSelected() {
        const selectedPlaybooks = document.querySelectorAll('.playbook-item.selected');
        
        for (const playbook of selectedPlaybooks) {
            const playbookName = playbook.getAttribute('data-playbook-name') || '';
            if (playbookName.toLowerCase().includes('baseline')) {
                return true;
            }
        }
        
        return false;
    }
    
    // Função para verificar se todos os campos obrigatórios do baseline estão preenchidos
    function areBaselineFieldsFilled() {
        const selectedHosts = document.querySelectorAll('.host-banner.valid.selected');
        let allFieldsFilled = true;
        
        // Se nenhum host selecionado, não há campos para verificar
        if (selectedHosts.length === 0) {
            return true;
        }
        
        // Verificar cada host selecionado
        for (const hostBanner of selectedHosts) {
            const hostname = hostBanner.querySelector('input[type="checkbox"]')?.dataset?.hostname;
            if (!hostname) continue;
            
            console.log(`Verificando campos para host: ${hostname}`);
            
            // Verificar se existe um banner de baseline para este host
            const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const baselineBanner = document.getElementById(bannerId);
            
            if (!baselineBanner) {
                console.log(`Banner de baseline não encontrado para host: ${hostname}`);
                
                // Tentar criar o banner automaticamente
                try {
                    if (typeof window.toggleBaselineBanner === 'function') {
                        window.toggleBaselineBanner(hostname);
                        console.log(`Banner de baseline criado para host: ${hostname}`);
                    }
                } catch (e) {
                    console.error(`Erro ao criar banner de baseline:`, e);
                }
                
                // Mesmo criando o banner, impedir execução neste ciclo
                allFieldsFilled = false;
                continue;
            }
            
            // Verificar os campos no banner existente
            const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
            const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
            const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
            
            // Verificar se os campos existem e estão preenchidos
            if (!hostnameField || !hostnameField.value.trim()) {
                console.log(`Campo de hostname vazio para ${hostname}`);
                allFieldsFilled = false;
            }
            
            if (!parceiroPasswordField || !parceiroPasswordField.value.trim()) {
                console.log(`Campo de senha parceiro vazio para ${hostname}`);
                allFieldsFilled = false;
            } else if (parceiroPasswordField.value.trim().length < 8) {
                console.log(`Senha de parceiro muito curta para ${hostname}`);
                allFieldsFilled = false;
            }
            
            if (!rootPasswordField || !rootPasswordField.value.trim()) {
                console.log(`Campo de senha root vazio para ${hostname}`);
                allFieldsFilled = false;
            } else if (rootPasswordField.value.trim().length < 8) {
                console.log(`Senha de root muito curta para ${hostname}`);
                allFieldsFilled = false;
            }
        }
        
        return allFieldsFilled;
    }
    
    // Função para destacar campos vazios
    function highlightEmptyFields() {
        const selectedHosts = document.querySelectorAll('.host-banner.valid.selected');
        
        for (const hostBanner of selectedHosts) {
            const hostname = hostBanner.querySelector('input[type="checkbox"]')?.dataset?.hostname;
            if (!hostname) continue;
            
            // Obter os campos
            const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
            const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
            const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
            
            // Aplicar destaque nos campos vazios
            if (hostnameField && !hostnameField.value.trim()) {
                applyErrorHighlight(hostnameField);
            }
            
            // Verificar senha parceiro
            if (parceiroPasswordField) {
                if (!parceiroPasswordField.value.trim()) {
                    applyErrorHighlight(parceiroPasswordField, "Senha do parceiro é obrigatória");
                } else if (parceiroPasswordField.value.trim().length < 8) {
                    applyErrorHighlight(parceiroPasswordField, "Senha muito curta (mínimo 8 caracteres)");
                }
            }
            
            // Verificar senha root
            if (rootPasswordField) {
                if (!rootPasswordField.value.trim()) {
                    applyErrorHighlight(rootPasswordField, "Senha do root é obrigatória");
                } else if (rootPasswordField.value.trim().length < 8) {
                    applyErrorHighlight(rootPasswordField, "Senha muito curta (mínimo 8 caracteres)");
                }
            }
        }
    }
    
    // Função para aplicar destaque de erro com tooltip
    function applyErrorHighlight(field, message = "Campo obrigatório") {
        // Guardar estilo original
        const originalBorder = field.style.border;
        const originalBoxShadow = field.style.boxShadow;
        const originalBackground = field.style.background;
        
        // Aplicar estilo de erro
        field.style.border = "2px solid #f44336";
        field.style.boxShadow = "0 0 8px rgba(244, 67, 54, 0.5)";
        field.style.background = "rgba(244, 67, 54, 0.05)";
        
        // Adicionar animação de shake
        field.style.animation = "shakeField 0.5s";
        
        // Adicionar tooltip
        field.title = message;
        
        // Adicionar classe para identificação
        field.classList.add("baseline-error-field");
        
        // Remover o destaque após 5 segundos
        setTimeout(() => {
            field.style.border = originalBorder;
            field.style.boxShadow = originalBoxShadow;
            field.style.background = originalBackground;
            field.style.animation = "";
            field.classList.remove("baseline-error-field");
        }, 5000);
        
        // Adicionar evento para remover destaque quando o campo for preenchido
        field.addEventListener("input", function fieldFixHandler() {
            if (field.value.trim().length >= (field.type === "password" ? 8 : 1)) {
                field.style.border = originalBorder;
                field.style.boxShadow = originalBoxShadow;
                field.style.background = originalBackground;
                field.style.animation = "";
                field.classList.remove("baseline-error-field");
                field.removeEventListener("input", fieldFixHandler);
            }
        });
    }
    
    // Adicionar estilos para erros e animações
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shakeField {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .baseline-error-field {
            transition: border 0.3s, box-shadow 0.3s, background 0.3s;
        }
        
        .baseline-banner {
            position: relative;
        }
        
        .baseline-validation-error {
            background: rgba(244, 67, 54, 0.1);
            color: #f44336;
            padding: 8px 12px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
    
    // Sobrescrever a função executePlaybooks se existir
    if (typeof window.executePlaybooks === 'function') {
        window.executePlaybooks = window.executeSelectedPlaybooks;
    }
    
    // Definir uma função global para validar campos do baseline
    window.validateBaselineFields = function() {
        return areBaselineFieldsFilled();
    };
    
    console.log("🔒 Bloqueio rigoroso para playbooks de baseline aplicado com sucesso");
})();