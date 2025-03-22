/**
 * ansible-fix-all.js
 * Solução completa para corrigir os problemas com os botões e erros JavaScript
 * Versão: 3.0
 */

// Executar imediatamente para consertar erros de referência
(function() {
    console.log("Iniciando correções prioritárias...");
    
    // Corrigir a referência para executePlaybooks -> executeSelectedPlaybooks
    if (typeof executePlaybooks === 'undefined' && typeof executeSelectedPlaybooks !== 'undefined') {
        window.executePlaybooks = executeSelectedPlaybooks;
        console.log("Corrigida referência: executePlaybooks → executeSelectedPlaybooks");
    } else if (typeof executePlaybooks === 'undefined' && typeof executeSelectedPlaybooks === 'undefined') {
        // Função de fallback para evitar erros
        window.executePlaybooks = window.executeSelectedPlaybooks = function() {
            console.warn("Função executeSelectedPlaybooks não definida - usando fallback");
            alert("A função de execução de playbooks não está disponível. Recarregue a página.");
        };
    }
    
    // Corrigir a função toggleOutput se estiver faltando
    if (typeof toggleOutput === 'undefined') {
        window.toggleOutput = function(button) {
            console.log("Usando função toggleOutput de emergência");
            try {
                const card = button.closest('.execution-card');
                if (!card) {
                    console.error("Card não encontrado");
                    return;
                }
                
                const output = card.querySelector('.ansible-output');
                if (!output) {
                    console.error("Output não encontrado");
                    return;
                }
                
                const isVisible = output.style.display === 'block';
                output.style.display = isVisible ? 'none' : 'block';
                
                button.innerHTML = isVisible ? 
                    'Ver Mais <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' : 
                    'Ver Menos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
            } catch (e) {
                console.error("Erro na função toggleOutput:", e);
            }
        };
    }
    
    // Detectar e tratar eventos de carregamento de página
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM carregado, iniciando correções completas...");
        initFixAll();
    });
    
    // Se o DOM já estiver carregado, iniciar imediatamente
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        console.log("DOM já carregado, iniciando correções completas...");
        initFixAll();
    }
})();

// Função principal para correções
function initFixAll() {
    console.log("Aplicando correções para Ansible...");
    
    // 1. Corrigir erros de referência a recursos
    fixResourceErrors();
    
    // 2. Desativar scripts problemáticos
    disableProblemScripts();
    
    // 3. Implementar nova solução para botões
    implementButtonFix();
    
    console.log("Correções aplicadas com sucesso!");
}

// Corrigir erros de recursos ausentes
function fixResourceErrors() {
    // Tratar imagens ausentes
    document.querySelectorAll('img[src$="linux.svg"], img[src$="windows.svg"]').forEach(img => {
        if (img.src.endsWith('linux.svg')) {
            // Substituir por uma versão inline do SVG para Linux
            img.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-svg linux-icon">
                <path d="M16 16L16 8A4 4 0 0 0 8 8L8 16A4 4 0 0 0 16 16Z"></path>
                <path d="M12 20L12 16"></path>
                <path d="M17 20L12 16L7 20"></path>
            </svg>`;
        } else if (img.src.endsWith('windows.svg')) {
            // Substituir por uma versão inline do SVG para Windows
            img.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-svg windows-icon">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>`;
        }
    });
    
    // Adicionar estilos para ícones inline
    const iconStyle = document.createElement('style');
    iconStyle.textContent = `
        .inline-svg.linux-icon {
            stroke: #1da1f2;
        }
        .inline-svg.windows-icon {
            stroke: #0078d7;
        }
    `;
    document.head.appendChild(iconStyle);
    
    console.log("Recursos ausentes foram corrigidos");
}

// Desativar scripts problemáticos
function disableProblemScripts() {
    // Identificar scripts problemáticos por conteúdo
    const problematicScripts = [
        'ansible-output-parser.js',
        'ansible-ux-enhancements.js',
        'toggle-output-fixes.js',
        'simple-toggle-fix.js'
    ];
    
    // Desabilitar temporariamente os scripts problemáticos
    document.querySelectorAll('script').forEach(script => {
        if (script.src) {
            const scriptName = script.src.split('/').pop();
            if (problematicScripts.some(name => scriptName.includes(name))) {
                console.log(`Desativando script problemático: ${scriptName}`);
                script.setAttribute('data-disabled', 'true');
                script.src = '';
            }
        }
    });
    
    console.log("Scripts problemáticos foram desativados");
}

// Implementar correção para botões Ver Mais/Ver Menos e Recolher
function implementButtonFix() {
    console.log("Implementando correções para botões Ver Mais/Ver Menos...");
    
    // Adicionar estilos necessários
    const buttonStyle = document.createElement('style');
    buttonStyle.id = 'ansible-button-fix-styles';
    buttonStyle.textContent = `
        /* Estilos para o botão de recolher */
        .recolher-button {
            display: flex;
            justify-content: center;
            width: 100%;
            padding: 15px 0;
            background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8) 30%);
            position: sticky;
            bottom: 0;
            z-index: 100;
        }
        
        .recolher-button button {
            background: var(--accent-gold, #FFD600);
            color: var(--black-rich, #030303);
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .recolher-button button:hover {
            background: var(--accent-gold-hover, #FFE033);
        }
        
        /* Fixar botões no topo */
        .execution-card .button-group {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--black-pearl, #121212);
            border-bottom: 1px solid var(--gray-dark, #2A2A2A);
        }
        
        /* Garantir que a saída não seja aberta automaticamente */
        .ansible-output {
            display: none !important;
        }
        
        .ansible-output.output-visible {
            display: block !important;
            padding-bottom: 60px !important; /* Espaço para o botão de recolher */
        }
    `;
    document.head.appendChild(buttonStyle);
    
    // Reimplementar a função toggleOutput
    window.toggleOutput = function(button) {
        try {
            console.log("Função toggleOutput executada");
            
            const card = button.closest('.execution-card');
            if (!card) {
                console.error("Card não encontrado");
                return;
            }
            
            const output = card.querySelector('.ansible-output');
            if (!output) {
                console.error("Elemento ansible-output não encontrado");
                return;
            }
            
            const isVisible = output.classList.contains('output-visible');
            
            if (isVisible) {
                // Ocultar output
                output.classList.remove('output-visible');
                
                // Atualizar o botão
                button.innerHTML = `
                    Ver Mais
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                `;
                
                // Remover botão de recolher
                const recolherButton = card.querySelector('.recolher-button');
                if (recolherButton) recolherButton.remove();
            } else {
                // Mostrar output
                output.classList.add('output-visible');
                
                // Atualizar o botão
                button.innerHTML = `
                    Ver Menos
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                `;
                
                // Adicionar botão de recolher
                addRecolherButton(card, output);
            }
            
            console.log("Toggle completado com sucesso");
        } catch (e) {
            console.error("Erro na função toggleOutput:", e);
        }
    };
    
    // Função para adicionar botão de recolher
    function addRecolherButton(card, output) {
        // Verificar se já existe
        if (card.querySelector('.recolher-button')) return;
        
        // Criar o botão
        const recolherContainer = document.createElement('div');
        recolherContainer.className = 'recolher-button';
        recolherContainer.innerHTML = `
            <button>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                    <path d="M18 15l-6-6-6 6"/>
                </svg>
                Recolher
            </button>
        `;
        
        // Adicionar ao final do output
        output.appendChild(recolherContainer);
        
        // Adicionar evento de clique
        recolherContainer.querySelector('button').addEventListener('click', function() {
            // Encontrar o botão Ver Mais/Menos
            const toggleButton = card.querySelector('.toggle-output-btn');
            if (toggleButton) {
                toggleButton.click();
            } else {
                // Fallback se o botão não for encontrado
                output.classList.remove('output-visible');
                recolherContainer.remove();
            }
        });
    }
    
    // Corrigir botões existentes
    function fixExistingButtons() {
        // Corrigir todos os botões já presentes na página
        document.querySelectorAll('.toggle-output-btn').forEach(button => {
            // Substituir o evento de clique
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Adicionar novo evento
            newButton.addEventListener('click', function() {
                toggleOutput(this);
            });
            
            // Garantir que o texto está correto
            const output = newButton.closest('.execution-card')?.querySelector('.ansible-output');
            if (output && output.classList.contains('output-visible')) {
                newButton.innerHTML = `
                    Ver Menos
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                `;
            } else {
                newButton.innerHTML = `
                    Ver Mais
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--black-absolute)" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                `;
            }
        });
        
        // Garantir que todas as saídas estejam ocultas inicialmente
        document.querySelectorAll('.ansible-output').forEach(output => {
            if (output.style.display === 'block') {
                output.style.display = 'none';
                output.classList.remove('output-visible');
                
                // Remover qualquer botão de recolher
                const card = output.closest('.execution-card');
                if (card) {
                    const recolherButton = card.querySelector('.recolher-button');
                    if (recolherButton) recolherButton.remove();
                }
            }
        });
    }
    
    // Observar novos cards
    function observeNewCards() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // Procurar cards adicionados diretamente
                            if (node.classList && node.classList.contains('execution-card')) {
                                fixCardButtons(node);
                            }
                            
                            // Procurar cards dentro do nó adicionado
                            node.querySelectorAll?.('.execution-card').forEach(card => {
                                fixCardButtons(card);
                            });
                        }
                    });
                }
            });
        });
        
        // Iniciar observação
        const container = document.getElementById('running-playbooks');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
            console.log("Observer para novos cards configurado");
        }
    }
    
    // Corrigir botões em um card específico
    function fixCardButtons(card) {
        const toggleButton = card.querySelector('.toggle-output-btn');
        if (toggleButton) {
            // Substituir o evento
            const newButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newButton, toggleButton);
            
            // Adicionar evento
            newButton.addEventListener('click', function() {
                toggleOutput(this);
            });
        }
    }
    
    // Executar correções
    fixExistingButtons();
    observeNewCards();
}