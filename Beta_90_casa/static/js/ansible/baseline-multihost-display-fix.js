/**
 * baseline-multihost-display-fix.js
 * Correção específica para a exibição de múltiplos hosts em playbooks baseline
 * Versão 1.0.0
 */

(function() {
    console.log("Inicializando fix para exibição de múltiplos hosts no baseline...");
    
    // Verifica se o fix já foi aplicado
    if (window.baselineMultihostDisplayFixApplied) {
        console.log("Fix para exibição de múltiplos hosts no baseline já aplicado");
        return;
    }

    // Função auxiliar para log
    function log(message, type = 'info') {
        const timestamp = new Date().toTimeString().split(' ')[0];
        console.log(`[Baseline Fix ${timestamp}] [${type}] ${message}`);
    }

    // Verifica se uma playbook é do tipo baseline
    function isBaselinePlaybook(name) {
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return nameLower.includes('baseline') || 
               nameLower.includes('configuracao-base') || 
               nameLower.includes('config-base');
    }

    // Extrai informações de hosts da saída
    function extractHostsInfo(output) {
        const hostsInfo = [];
        
        // Regex para diferentes padrões de informação de host
        const hostPatterns = [
            // Padrão 1: Hostname, IP Público, IP Privado, Sistema em linhas separadas com **
            /\*\*Hostname:\*\*\s*([^\n]+)[\s\S]*?\*\*IP Público:\*\*\s*([^\n]+)[\s\S]*?\*\*IP Privado:\*\*\s*([^\n]+)[\s\S]*?\*\*Sistema:\*\*\s*([^\n]+)/g,
            
            // Padrão 2: Hostname: valor em formato json
            /"hostname":\s*"([^"]+)"[^}]*"private_ip":\s*"([^"]+)"[^}]*"public_ip":\s*"([^"]+)"[^}]*"system":\s*"([^"]+)"/g,
            
            // Padrão 3: Host details em modo de debug
            /host_details":\s*{\s*"hostname":\s*"([^"]+)",\s*"private_ip":\s*"([^"]+)",\s*"public_ip":\s*"([^"]+)",\s*"system":\s*"([^"]+)"/g
        ];
        
        // Tenta cada padrão para encontrar informações de host
        for (const pattern of hostPatterns) {
            pattern.lastIndex = 0; // Reinicia o índice de busca
            let match;
            while ((match = pattern.exec(output)) !== null) {
                // O ordem dos grupos pode variar dependendo do padrão
                // Padrão 1: hostname, ip_public, ip_private, system
                // Padrão 2 e 3: hostname, ip_private, ip_public, system
                const isPattern1 = pattern === hostPatterns[0];
                
                const hostname = match[1];
                const publicIp = isPattern1 ? match[2] : match[3];
                const privateIp = isPattern1 ? match[3] : match[2];
                const system = match[4];
                
                // Verifica se o host já foi adicionado
                const existingHost = hostsInfo.find(h => h.hostname === hostname);
                if (!existingHost) {
                    hostsInfo.push({
                        hostname,
                        publicIp,
                        privateIp,
                        system
                    });
                }
            }
        }
        
        // Se não encontrou nada com os padrões anteriores, tenta um padrão mais simples
        if (hostsInfo.length === 0) {
            const hostnameMatches = output.match(/\*\*Hostname:\*\*\s*([^\n]+)/g);
            
            if (hostnameMatches) {
                for (let i = 0; i < hostnameMatches.length; i++) {
                    const hostname = hostnameMatches[i].replace(/\*\*Hostname:\*\*\s*/, '').trim();
                    
                    // Tenta encontrar informações relacionadas a este hostname
                    const hostSection = output.split(hostnameMatches[i])[1]?.split(/\*\*Hostname:|PLAY RECAP/)[0] || '';
                    
                    const publicIpMatch = hostSection.match(/\*\*IP Público:\*\*\s*([^\n]+)/);
                    const privateIpMatch = hostSection.match(/\*\*IP Privado:\*\*\s*([^\n]+)/);
                    const systemMatch = hostSection.match(/\*\*Sistema:\*\*\s*([^\n]+)/);
                    
                    hostsInfo.push({
                        hostname,
                        publicIp: publicIpMatch ? publicIpMatch[1].trim() : 'N/A',
                        privateIp: privateIpMatch ? privateIpMatch[1].trim() : 'N/A',
                        system: systemMatch ? systemMatch[1].trim() : 'N/A'
                    });
                }
            }
        }
        
        return hostsInfo;
    }

    // Formata a saída com hosts separados
    function formatMultiHostOutput(output) {
        if (!output) return '<em>Aguardando saída...</em>';
        
        // Extrair informações de cada host
        const hostsInfo = extractHostsInfo(output);
        log(`Encontrados ${hostsInfo.length} hosts na saída`);
        
        // Se não encontrar múltiplos hosts, retorna a saída original formatada
        if (hostsInfo.length <= 1) {
            return formatBaselineOutput(output);
        }
        
        // Criar uma saída formatada para múltiplos hosts
        let formattedOutput = `
        <div class="multi-host-baseline-output">
            <style>
                .multi-host-baseline-output {
                    font-family: monospace;
                    white-space: pre-wrap;
                    line-height: 1.4;
                }
                .host-section {
                    margin-bottom: 20px;
                    padding: 12px;
                    border: 1px solid #2A2A2A;
                    border-radius: 6px;
                    background: rgba(10, 10, 10, 0.2);
                }
                .host-header {
                    color: #FFD600;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                }
                .host-details {
                    display: grid;
                    grid-template-columns: 120px 1fr;
                    gap: 6px;
                    margin-bottom: 10px;
                }
                .host-detail-label {
                    color: #9cdcfe;
                    font-weight: bold;
                }
                .host-detail-value {
                    color: #d4d4d4;
                }
                .host-status {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    background: rgba(78, 201, 176, 0.15);
                    color: #4EC9B0;
                }
                .host-recap {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px dashed #333;
                    font-size: 12px;
                    color: #B0B0B0;
                }
                .recap-title {
                    color: #569cd6;
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                .recap-ok { color: #4EC9B0; }
                .recap-changed { color: #CE9178; }
                .recap-failed { color: #F14C4C; }
                .recap-skipped { color: #808080; }
            </style>
        `;
        
        // Adicionar uma seção para cada host
        hostsInfo.forEach((host, index) => {
            // Tenta encontrar informações de recap para este host
            const recapRegex = new RegExp(`Host: ${host.hostname}[^\\n]*\\nok: (\\d+)[^\\n]*changed: (\\d+)[^\\n]*unreachable: (\\d+)[^\\n]*failed: (\\d+)[^\\n]*skipped: (\\d+)`, 'i');
            const recapMatch = output.match(recapRegex);
            
            formattedOutput += `
            <div class="host-section">
                <div class="host-header">
                    <span>Host #${index + 1}: ${host.hostname}</span>
                    <span class="host-status">Concluído</span>
                </div>
                <div class="host-details">
                    <span class="host-detail-label">Hostname:</span>
                    <span class="host-detail-value">${host.hostname}</span>
                    
                    <span class="host-detail-label">IP Público:</span>
                    <span class="host-detail-value">${host.publicIp}</span>
                    
                    <span class="host-detail-label">IP Privado:</span>
                    <span class="host-detail-value">${host.privateIp}</span>
                    
                    <span class="host-detail-label">Sistema:</span>
                    <span class="host-detail-value">${host.system}</span>
                </div>`;
                
            // Adicionar recap se disponível
            if (recapMatch) {
                formattedOutput += `
                <div class="host-recap">
                    <div class="recap-title">RECAP</div>
                    <span class="recap-ok">ok: ${recapMatch[1]}</span> | 
                    <span class="recap-changed">changed: ${recapMatch[2]}</span> | 
                    <span class="recap-failed">unreachable: ${recapMatch[3]} | failed: ${recapMatch[4]}</span> | 
                    <span class="recap-skipped">skipped: ${recapMatch[5]}</span>
                </div>`;
            }
            
            formattedOutput += `</div>`;
        });
        
        formattedOutput += '</div>';
        return formattedOutput;
    }

    // Formatação padrão para um único host
    function formatBaselineOutput(output) {
        if (!output) return '<em>Aguardando saída...</em>';
        
        // Formatação básica para baseline
        let formatted = output
            .replace(/\*\*([^:*]+):\*\*/g, '<span style="color: #FFD600; font-weight: bold;">$1:</span>')
            .replace(/^ok:/gm, '<span style="color: #4EC9B0; font-weight: bold;">ok:</span>')
            .replace(/^changed:/gm, '<span style="color: #CE9178; font-weight: bold;">changed:</span>')
            .replace(/^failed:/gm, '<span style="color: #F14C4C; font-weight: bold;">failed:</span>')
            .replace(/^skipping:/gm, '<span style="color: #808080; font-weight: bold;">skipping:</span>')
            .replace(/PLAY RECAP/g, '<div style="color: #569cd6; font-weight: bold; margin-top: 15px; border-top: 1px solid #333; padding-top: 5px;">PLAY RECAP</div>');
        
        return `
        <div style="font-family: monospace; white-space: pre-wrap; line-height: 1.5; padding: 10px;">
            ${formatted}
        </div>`;
    }

    // Intercepta a função de formatação de saída
    function interceptFormatFunctions() {
        // Verificar qual função de formatação existe e interceptá-la
        if (typeof window.formatAnsibleOutput === 'function') {
            const originalFormatAnsibleOutput = window.formatAnsibleOutput;
            
            window.formatAnsibleOutput = function(output) {
                // Detectar se é uma saída de baseline
                if (output && (
                    output.includes('**Hostname:**') || 
                    output.includes('**Sistema:**') ||
                    output.includes('**IP Público:**') ||
                    output.includes('**IP Privado:**') ||
                    output.includes('baseline_universal')
                )) {
                    return formatMultiHostOutput(output);
                }
                
                return originalFormatAnsibleOutput.apply(this, arguments);
            };
            
            log("Função formatAnsibleOutput interceptada");
        }
        
        if (typeof window.formatOutput === 'function') {
            const originalFormatOutput = window.formatOutput;
            
            window.formatOutput = function(output, isBaseline) {
                if (isBaseline || (output && (
                    output.includes('**Hostname:**') || 
                    output.includes('**Sistema:**') ||
                    output.includes('**IP Público:**') ||
                    output.includes('**IP Privado:**')
                ))) {
                    return formatMultiHostOutput(output);
                }
                
                return originalFormatOutput.apply(this, arguments);
            };
            
            log("Função formatOutput interceptada");
        }
    }

    // Intercepta a função toggleOutput
    function interceptToggleOutput() {
        if (typeof window.toggleOutput !== 'function') {
            log("Função toggleOutput não encontrada", "error");
            return;
        }
        
        const originalToggleOutput = window.toggleOutput;
        
        window.toggleOutput = function(button) {
            const card = button.closest('.execution-card');
            if (!card) {
                log("Card não encontrado", "error");
                return originalToggleOutput.apply(this, arguments);
            }
            
            const playbookName = card.getAttribute('data-playbook-name');
            if (!isBaselinePlaybook(playbookName)) {
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Para playbooks baseline, aplicamos nossa lógica personalizada
            const outputDiv = card.querySelector('.ansible-output');
            if (!outputDiv) {
                log("Elemento de saída não encontrado", "error");
                return originalToggleOutput.apply(this, arguments);
            }
            
            // Alternar visibilidade
            const isVisible = outputDiv.style.display === 'block';
            outputDiv.style.display = isVisible ? 'none' : 'block';
            
            // Atualizar o botão
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
            
            // Se estamos mostrando a saída, buscar dados atualizados
            if (!isVisible) {
                const jobId = card.getAttribute('data-job-id');
                
                // Mostrar indicador de carregamento
                outputDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Carregando saída de múltiplos hosts...</div>';
                
                // Buscar a saída atualizada
                fetch(`/api/status/${jobId}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Erro ao buscar status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Formatar usando nossa função personalizada
                        outputDiv.innerHTML = formatMultiHostOutput(data.output || '');
                        
                        // Rolar para a parte inferior
                        outputDiv.scrollTop = outputDiv.scrollHeight;
                        
                        // Atualizar o progresso se disponível
                        if (data.progress && typeof updateCardProgress === 'function') {
                            updateCardProgress(jobId, data.progress, data.status);
                        }
                    })
                    .catch(error => {
                        log(`Erro ao buscar saída: ${error.message}`, "error");
                        outputDiv.innerHTML = `<div style="color: #F44336; padding: 16px;">Erro ao buscar saída: ${error.message}</div>`;
                    });
            }
            
            return true;
        };
        
        log("Função toggleOutput interceptada com sucesso");
    }

    // Inicializa o fix
    function init() {
        try {
            // Adicionar estilos globais para a formatação
            const style = document.createElement('style');
            style.textContent = `
                .ansible-output .multi-host-baseline-output {
                    font-family: monospace;
                    white-space: pre-wrap;
                    line-height: 1.4;
                    padding: 0 !important;
                }
                
                /* Garantir que nossos estilos sobrescrevam os existentes */
                .multi-host-baseline-output .host-section {
                    margin-bottom: 20px !important;
                    padding: 12px !important;
                    border: 1px solid #2A2A2A !important;
                    border-radius: 6px !important;
                    background: rgba(10, 10, 10, 0.2) !important;
                }
            `;
            document.head.appendChild(style);
            
            // Interceptar funções de formatação
            interceptFormatFunctions();
            
            // Interceptar toggleOutput
            interceptToggleOutput();
            
            // Marcar como aplicado
            window.baselineMultihostDisplayFixApplied = true;
            
            log("Fix para exibição de múltiplos hosts no baseline aplicado com sucesso", "success");
        } catch (error) {
            log(`Erro ao aplicar fix: ${error.message}`, "error");
        }
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();