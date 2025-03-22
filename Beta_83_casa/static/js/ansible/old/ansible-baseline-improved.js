/**
 * ansible-baseline-improved.js
 * Solução aprimorada para gerenciamento de playbooks baseline
 */

(function() {
    console.log("Inicializando solução aprimorada para playbooks baseline");
    
    // Configurações
    const CONFIG = {
        defaultHostname: "SKY-IMP-CLI-01", // Nome padrão para o hostname
        minPasswordLength: 8,              // Comprimento mínimo para senhas
        extraVarsForLocalhostSudo: true    // Adicionar variáveis para sudo no localhost
    };
    
    // Armazenar referências às funções originais
    const ORIGINAL = {
        executeSelectedPlaybooks: window.executeSelectedPlaybooks,
        fetch: window.fetch,
        toggleBaselineBanner: window.toggleBaselineBanner
    };
    
    // Sobrescrever a função de execução de playbooks
    window.executeSelectedPlaybooks = function() {
        console.log("Verificação de playbooks baseline iniciada");
        
        try {
            // Verificar se há playbooks baseline selecionadas
            if (isBaselineSelected()) {
                console.log("Playbook baseline detectada");
                
                // Verificar quais hosts precisam de configuração
                const hostsNeedingConfig = getHostsWithoutBaselineConfig();
                
                if (hostsNeedingConfig.length > 0) {
                    // Mostrar mensagem com os hosts que precisam de configuração
                    showBaselineConfigMessage(hostsNeedingConfig);
                    
                    // Criar banners para esses hosts
                    hostsNeedingConfig.forEach(hostname => {
                        try {
                            if (typeof window.toggleBaselineBanner === 'function') {
                                window.toggleBaselineBanner(hostname);
                                console.log(`Banner criado para ${hostname}`);
                                
                                // Definir valores padrão após curto delay para garantir que o DOM foi atualizado
                                setTimeout(() => {
                                    setDefaultValues(hostname);
                                }, 300);
                            }
                        } catch (e) {
                            console.error(`Erro ao criar banner para ${hostname}:`, e);
                        }
                    });
                    
                    return false; // Impedir execução
                }
                
                // Verificar se os banners existentes têm todos os campos preenchidos
                if (!areAllBaselineFieldsValid()) {
                    console.log("Campos inválidos ou incompletos encontrados");
                    highlightInvalidFields();
                    return false; // Impedir execução
                }
            }
            
            // Se chegou até aqui, tudo está em ordem
            return ORIGINAL.executeSelectedPlaybooks();
        } catch (error) {
            console.error("Erro na verificação de baseline:", error);
            showMessage("Erro ao validar campos de baseline: " + error.message, "error");
            return false;
        }
    };
    
    // Interceptar fetch para adicionar variáveis especiais para o localhost
    window.fetch = function(url, options) {
        // Verificar se é uma requisição para executar playbook
        if (url === '/api/run' && options?.method === 'POST') {
            try {
                const requestData = JSON.parse(options.body);
                const playbookPath = requestData.playbook || '';
                const hosts = requestData.hosts || [];
                
                // Verificar se é uma playbook baseline
                if (playbookPath.toLowerCase().includes('baseline')) {
                    console.log("Interceptando execução de baseline via API");
                    
                    // Verificar hosts e configuração
                    if (!areAllBaselineFieldsValid()) {
                        showMessage("Configure todos os campos do baseline antes de executar", "error");
                        return Promise.reject(new Error("Configuração de baseline incompleta"));
                    }
                    
                    // Coletar dados dos campos para cada host
                    const extraVars = requestData.extra_vars || {};
                    
                    // Verificar se está executando no localhost
                    const includesLocalhost = hosts.some(h => h === '127.0.0.1' || h === 'localhost');
                    
                    if (includesLocalhost && CONFIG.extraVarsForLocalhostSudo) {
                        console.log("Adicionando variáveis para sudo no localhost");
                        extraVars.ansible_become = true;
                        extraVars.ansible_become_method = "sudo";
                        extraVars.ansible_become_pass = extraVars.root_password || ""; // Usar a senha do root para sudo
                    }
                    
                    // Atualizar o corpo da requisição
                    requestData.extra_vars = extraVars;
                    options.body = JSON.stringify(requestData);
                }
            } catch (error) {
                console.error("Erro ao processar requisição:", error);
            }
        }
        
        // Prosseguir com a requisição original
        return ORIGINAL.fetch.apply(this, arguments);
    };
    
    // Verificar se alguma playbook baseline está selecionada
    function isBaselineSelected() {
        const selectedItems = document.querySelectorAll('.playbook-item.selected');
        
        for (const item of selectedItems) {
            const name = item.getAttribute('data-playbook-name') || '';
            if (name.toLowerCase().includes('baseline')) {
                return true;
            }
        }
        
        return false;
    }
    
    // Encontrar hosts selecionados que não têm configuração de baseline
    function getHostsWithoutBaselineConfig() {
        const result = [];
        const selectedHosts = document.querySelectorAll('.host-banner.valid.selected');
        
        for (const hostBanner of selectedHosts) {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;
            
            const hostname = checkbox.dataset.hostname;
            if (!hostname) continue;
            
            // Verificar se já existe um banner de baseline para este host
            const bannerId = `baseline-banner-${hostname.replace(/[^a-zA-Z0-9]/g, '-')}`;
            if (!document.getElementById(bannerId)) {
                result.push(hostname);
            }
        }
        
        return result;
    }
    
    // Verificar se todos os campos em todos os banners estão preenchidos corretamente
    function areAllBaselineFieldsValid() {
        const selectedHosts = document.querySelectorAll('.host-banner.valid.selected');
        
        for (const hostBanner of selectedHosts) {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;
            
            const hostname = checkbox.dataset.hostname;
            if (!hostname) continue;
            
            // Verificar campos para este host
            if (!areFieldsValidForHost(hostname)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Verificar se os campos para um host específico são válidos
    function areFieldsValidForHost(hostname) {
        // Obter referências aos campos
        const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
        const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
        const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
        
        // Verificar se os campos existem
        if (!hostnameField || !parceiroPasswordField || !rootPasswordField) {
            console.log(`Campos não encontrados para ${hostname}`);
            return false;
        }
        
        // Verificar se o hostname está preenchido
        if (!hostnameField.value.trim()) {
            console.log(`Hostname vazio para ${hostname}`);
            return false;
        }
        
        // Verificar senha do parceiro
        if (!parceiroPasswordField.value.trim()) {
            console.log(`Senha do parceiro vazia para ${hostname}`);
            return false;
        }
        
        if (parceiroPasswordField.value.trim().length < CONFIG.minPasswordLength) {
            console.log(`Senha do parceiro muito curta para ${hostname}`);
            return false;
        }
        
        // Verificar senha do root
        if (!rootPasswordField.value.trim()) {
            console.log(`Senha do root vazia para ${hostname}`);
            return false;
        }
        
        if (rootPasswordField.value.trim().length < CONFIG.minPasswordLength) {
            console.log(`Senha do root muito curta para ${hostname}`);
            return false;
        }
        
        return true;
    }
    
    // Destacar campos inválidos
    function highlightInvalidFields() {
        const selectedHosts = document.querySelectorAll('.host-banner.valid.selected');
        
        for (const hostBanner of selectedHosts) {
            const checkbox = hostBanner.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;
            
            const hostname = checkbox.dataset.hostname;
            if (!hostname) continue;
            
            // Obter referências aos campos
            const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
            const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
            const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
            
            // Verificar e destacar campos inválidos
            if (hostnameField && !hostnameField.value.trim()) {
                highlightField(hostnameField, "Campo obrigatório");
            }
            
            if (parceiroPasswordField) {
                if (!parceiroPasswordField.value.trim()) {
                    highlightField(parceiroPasswordField, "Campo obrigatório");
                } else if (parceiroPasswordField.value.trim().length < CONFIG.minPasswordLength) {
                    highlightField(parceiroPasswordField, `Mínimo ${CONFIG.minPasswordLength} caracteres`);
                }
            }
            
            if (rootPasswordField) {
                if (!rootPasswordField.value.trim()) {
                    highlightField(rootPasswordField, "Campo obrigatório");
                } else if (rootPasswordField.value.trim().length < CONFIG.minPasswordLength) {
                    highlightField(rootPasswordField, `Mínimo ${CONFIG.minPasswordLength} caracteres`);
                }
            }
        }
        
        // Mostrar mensagem de erro
        showMessage("Preencha todos os campos obrigatórios do baseline", "error");
    }
    
    // Destacar um campo com erro
    function highlightField(field, message) {
        if (!field) return;
        
        // Guardar estilo original
        const originalStyle = {
            border: field.style.border,
            boxShadow: field.style.boxShadow,
            background: field.style.background
        };
        
        // Aplicar estilo de erro
        field.style.border = "2px solid #f44336";
        field.style.boxShadow = "0 0 5px rgba(244, 67, 54, 0.5)";
        field.style.background = "rgba(244, 67, 54, 0.05)";
        field.title = message;
        
        // Adicionar animação
        field.style.animation = "shakeField 0.5s";
        
        // Adicionar listener para remover o destaque quando o campo for corrigido
        const inputListener = function() {
            const isPassword = field.type === "password";
            const isValid = isPassword 
                ? field.value.trim().length >= CONFIG.minPasswordLength 
                : field.value.trim().length > 0;
            
            if (isValid) {
                // Restaurar estilo original
                field.style.border = originalStyle.border;
                field.style.boxShadow = originalStyle.boxShadow;
                field.style.background = originalStyle.background;
                field.style.animation = "";
                field.title = "";
                
                // Remover listener
                field.removeEventListener("input", inputListener);
            }
        };
        
        field.addEventListener("input", inputListener);
        
        // Auto-resetar após 5 segundos
        setTimeout(() => {
            field.style.border = originalStyle.border;
            field.style.boxShadow = originalStyle.boxShadow;
            field.style.background = originalStyle.background;
            field.style.animation = "";
        }, 5000);
    }
    
    // Mostrar mensagem para configurar hosts
    function showBaselineConfigMessage(hostsList) {
        // Criar conteúdo da mensagem
        let messageContent = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                    <div style="margin-bottom: 8px; font-weight: bold;">Configure o baseline para os seguintes hosts:</div>
                    <ul style="margin: 0; padding-left: 20px;">
        `;
        
        // Adicionar cada host à lista
        hostsList.forEach(hostname => {
            messageContent += `<li>${hostname}</li>`;
        });
        
        // Fechar a mensagem
        messageContent += `
                    </ul>
                </div>
            </div>
        `;
        
        // Mostrar a mensagem
        showCustomMessage(messageContent, "warning", 10000);
    }
    
    // Mostrar mensagem customizada
    function showCustomMessage(htmlContent, type = "info", duration = 5000) {
        // Se a função global showMessage existir, usar uma versão modificada
        if (typeof window.showMessage === 'function') {
            try {
                // Verificar se há uma implementação para mensagens HTML
                if (typeof window._showMessageInProgress !== 'undefined') {
                    // Encontrar o container
                    const container = document.getElementById('running-playbooks');
                    if (!container) {
                        console.log("Container de mensagens não encontrado");
                        return;
                    }
                    
                    // Prevenir recursão
                    if (window._showMessageInProgress) {
                        console.log("Evitando recursão em showMessage");
                        return;
                    }
                    
                    window._showMessageInProgress = true;
                    
                    try {
                        // Criar ID único para a mensagem
                        const messageId = `msg-${Date.now()}`;
                        
                        // Determinar cores baseadas no tipo
                        let bgColor, borderColor, iconColor;
                        
                        switch (type) {
                            case 'success':
                                bgColor = 'rgba(76, 175, 80, 0.1)';
                                borderColor = '#4CAF50';
                                iconColor = '#4CAF50';
                                break;
                            case 'error':
                                bgColor = 'rgba(244, 67, 54, 0.1)';
                                borderColor = '#F44336';
                                iconColor = '#F44336';
                                break;
                            default: // warning ou info
                                bgColor = 'rgba(255, 152, 0, 0.1)';
                                borderColor = '#FF9800';
                                iconColor = '#FF9800';
                        }
                        
                        // Criar elemento da mensagem
                        const messageElement = document.createElement('div');
                        messageElement.id = messageId;
                        messageElement.style.cssText = `
                            padding: 12px 16px;
                            margin-bottom: 16px;
                            border-radius: 6px;
                            border-left: 4px solid ${borderColor};
                            background: ${bgColor};
                            color: var(--text-primary, #FFFFFF);
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            animation: fadeIn 0.3s ease;
                        `;
                        
                        // Definir conteúdo
                        messageElement.innerHTML = `
                            <div style="flex: 1;">${htmlContent}</div>
                            <button style="background: none; border: none; color: ${iconColor}; cursor: pointer; margin-left: 12px; padding: 0;">✕</button>
                        `;
                        
                        // Adicionar evento ao botão de fechar
                        messageElement.querySelector('button').addEventListener('click', () => {
                            messageElement.remove();
                        });
                        
                        // Adicionar ao container
                        container.insertBefore(messageElement, container.firstChild);
                        
                        // Auto-remover após a duração especificada
                        if (duration > 0) {
                            setTimeout(() => {
                                if (document.getElementById(messageId)) {
                                    document.getElementById(messageId).style.opacity = '0';
                                    document.getElementById(messageId).style.transition = 'opacity 0.3s ease';
                                    
                                    setTimeout(() => {
                                        if (document.getElementById(messageId)) {
                                            document.getElementById(messageId).remove();
                                        }
                                    }, 300);
                                }
                            }, duration);
                        }
                    } finally {
                        window._showMessageInProgress = false;
                    }
                } else {
                    // Fallback para a função showMessage normal
                    window.showMessage(stripHtml(htmlContent), type, duration);
                }
            } catch (e) {
                console.error("Erro ao mostrar mensagem customizada:", e);
                window.showMessage(stripHtml(htmlContent), type, duration);
            }
        } else {
            // Implementação básica se showMessage não existir
            console.log(`[${type.toUpperCase()}] ${stripHtml(htmlContent)}`);
        }
    }
    
    // Remover HTML para texto plano
    function stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }
    
    // Função para definir valores padrão nos campos
    function setDefaultValues(hostname) {
        try {
            // Definir hostname padrão
            const hostnameField = document.getElementById(`baseline-hostname-${hostname}`);
            if (hostnameField && !hostnameField.value.trim()) {
                hostnameField.value = CONFIG.defaultHostname;
            }
            
            // Gerar senhas automáticas só se os campos estiverem vazios
            const parceiroPasswordField = document.getElementById(`baseline-parceiro-password-${hostname}`);
            const rootPasswordField = document.getElementById(`baseline-root-password-${hostname}`);
            
            if (parceiroPasswordField && !parceiroPasswordField.value.trim()) {
                parceiroPasswordField.value = generateSecurePassword();
            }
            
            if (rootPasswordField && !rootPasswordField.value.trim()) {
                rootPasswordField.value = generateSecurePassword();
            }
        } catch (e) {
            console.error("Erro ao definir valores padrão:", e);
        }
    }
    
    // Gerar senha segura
    function generateSecurePassword() {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
        let password = "";
        
        // Garantir pelo menos um caractere de cada tipo
        password += charset.substring(0, 26).charAt(Math.floor(Math.random() * 26)); // minúscula
        password += charset.substring(26, 52).charAt(Math.floor(Math.random() * 26)); // maiúscula
        password += charset.substring(52, 62).charAt(Math.floor(Math.random() * 10)); // número
        password += charset.substring(62).charAt(Math.floor(Math.random() * (charset.length - 62))); // especial
        
        // Completar com caracteres aleatórios
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        // Embaralhar a senha
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
    
    // Mostrar mensagem simples
    function showMessage(text, type = "info", duration = 5000) {
        if (typeof window.showMessage === 'function') {
            window.showMessage(text, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${text}`);
        }
    }
    
    // Adicionar estilos CSS
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shakeField {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .baseline-error {
                border: 2px solid #f44336 !important;
                box-shadow: 0 0 5px rgba(244, 67, 54, 0.5) !important;
                background-color: rgba(244, 67, 54, 0.05) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Inicializar
    addStyles();
    
    console.log("Solução aprimorada para playbooks baseline inicializada com sucesso");
})();