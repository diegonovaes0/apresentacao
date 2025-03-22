// Solução radical para botões que não respondem aos cliques
(function() {
    console.log("Aplicando solução radical para botões de configuração");
    
    // 1. Remover todos os listeners de eventos que possam estar interferindo
    document.querySelectorAll('.playbook-item').forEach(item => {
        const clone = item.cloneNode(true);
        item.parentNode.replaceChild(clone, item);
    });
    
    // 2. Criar botões completamente novos e separados para cada playbook especial
    document.querySelectorAll('.playbook-item').forEach(item => {
        const playbookName = item.getAttribute('data-playbook-name');
        if (!playbookName) return;
        
        // Verificar se é uma playbook especial
        const isSite24x7 = playbookName.toLowerCase().includes('site24x7') || 
                           playbookName.toLowerCase().includes('24x7');
        const isAntivirus = playbookName.toLowerCase().includes('antivirus') || 
                            playbookName.toLowerCase().includes('trendmicro');
        
        if (!isSite24x7 && !isAntivirus) return;
        
        // Criar botão DIV flutuante (sem ser filho do playbook-item)
        const rect = item.getBoundingClientRect();
        const btn = document.createElement('div');
        
        btn.innerHTML = "CONFIGURAR";
        btn.style.cssText = `
            position: fixed;
            top: ${rect.top + 10}px;
            left: ${rect.right - 100}px;
            background-color: #FFD600;
            color: black;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1000000;
            user-select: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        // Adicionar evento de clique direto
        if (isSite24x7) {
            btn.onclick = function() {
                console.log("Abrindo modal Site24x7");
                openSite24x7Modal();
                return false;
            };
        } else {
            btn.onclick = function() {
                console.log("Abrindo modal Antivirus");
                openAntivirusModal();
                return false;
            };
        }
        
        // Adicionar ao body (fora da hierarquia normal)
        document.body.appendChild(btn);
    });
    
    // Funções simples para abrir modais
    function openSite24x7Modal() {
        // Remover qualquer modal existente
        document.querySelectorAll('.modal-overlay, .special-agent-modal').forEach(el => el.remove());
        
        // Criar modal simples
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999999;
        `;
        
        modal.innerHTML = `
            <div style="background-color: #121212; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 16px; background-color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A2A2A;">
                    <h3 style="margin: 0; color: #FFD600; font-size: 18px;">Configuração do Site24x7 Agent</h3>
                    <button id="close-modal" style="background: none; border: none; color: #808080; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Selecione o Grupo</label>
                        <select id="site24x7-group" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                            <option value="us_df8c061ef70463b255e8b575406addfc">Operação - AutoSky</option>
                            <option value="us_8e715d1f97d4f0ec254a90079d2249db">BGM - Praxio</option>
                            <option value="us_0216ce8dbb4b1913045cc79ee1370c74">CTA Sistemas [OPER]</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <input type="checkbox" id="site24x7-custom-key">
                        <label for="site24x7-custom-key" style="color: white;">Usar chave personalizada</label>
                    </div>
                    <div id="site24x7-key-container" style="display: none; margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Chave do dispositivo</label>
                        <input type="text" id="site24x7-key" placeholder="us_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                    </div>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; border-left: 3px solid #FFD600; margin-top: 20px;">
                        <p style="margin: 0; color: #B0B0B0; font-size: 13px;">A chave do dispositivo é necessária para autenticar o agente Site24x7 com o grupo correto. Se não for configurado, será utilizado o grupo padrão "Operação - AutoSky".</p>
                    </div>
                </div>
                <div style="padding: 15px; border-top: 1px solid #2A2A2A; display: flex; justify-content: flex-end; gap: 10px; background: #0A0A0A;">
                    <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #2A2A2A; color: white; cursor: pointer;">Cancelar</button>
                    <button id="confirm-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #FFD600; color: black; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('close-modal').onclick = () => modal.remove();
        document.getElementById('cancel-btn').onclick = () => modal.remove();
        
        document.getElementById('site24x7-custom-key').onchange = function() {
            document.getElementById('site24x7-key-container').style.display = this.checked ? 'block' : 'none';
        };
        
        document.getElementById('confirm-btn').onclick = function() {
            const useCustomKey = document.getElementById('site24x7-custom-key').checked;
            let deviceKey;
            
            if (useCustomKey) {
                deviceKey = document.getElementById('site24x7-key').value.trim();
                if (!deviceKey) {
                    alert('Por favor, insira uma chave de dispositivo válida.');
                    return;
                }
            } else {
                deviceKey = document.getElementById('site24x7-group').value;
            }
            
            // Salvar configuração
            window.site24x7Config = { deviceKey };
            console.log('Configuração Site24x7 salva:', window.site24x7Config);
            
            alert("Configuração do Site24x7 salva com sucesso!");
            modal.remove();
        };
    }
    
    function openAntivirusModal() {
        // Remover qualquer modal existente
        document.querySelectorAll('.modal-overlay, .special-agent-modal').forEach(el => el.remove());
        
        // Criar modal simples
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999999;
        `;
        
        modal.innerHTML = `
            <div style="background-color: #121212; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 16px; background-color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A2A2A;">
                    <h3 style="margin: 0; color: #FFD600; font-size: 18px;">Configuração do Agente Antivírus</h3>
                    <button id="close-modal" style="background: none; border: none; color: #808080; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: white;">Selecione o script de instalação</label>
                        <select id="antivirus-script" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                            <option value="antivirus.ps1">Antivírus Padrão (Windows)</option>
                            <option value="trend_micro_linux_server.sh">Trend Micro - Servidor Linux</option>
                            <option value="trend_micro_linux_workstation.sh">Trend Micro - Workstation Linux</option>
                            <option value="trend_micro_oracle_linux.sh">Trend Micro - Oracle Linux</option>
                            <option value="trend_micro_ubuntu.sh">Trend Micro - Ubuntu</option>
                            <option value="cta_antivirus.sh">CTA Antivírus</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <input type="checkbox" id="antivirus-custom-script">
                        <label for="antivirus-custom-script" style="color: white;">Usar script personalizado</label>
                    </div>
                    <div id="antivirus-custom" style="display: none;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: white;">Nome do arquivo</label>
                            <input type="text" id="antivirus-filename" placeholder="script_instalacao.sh" style="width: 100%; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: white;">Conteúdo do script</label>
                            <textarea id="antivirus-content" placeholder="#!/bin/bash" style="width: 100%; min-height: 100px; padding: 10px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px; color: white; font-family: monospace;"></textarea>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; border-left: 3px solid #FFD600; margin-top: 20px;">
                        <p style="margin: 0; color: #B0B0B0; font-size: 13px;">Escolha um script pré-definido ou forneça seu próprio script personalizado para instalação do antivírus. Se não for configurado, será utilizado o script padrão.</p>
                    </div>
                </div>
                <div style="padding: 15px; border-top: 1px solid #2A2A2A; display: flex; justify-content: flex-end; gap: 10px; background: #0A0A0A;">
                    <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #2A2A2A; color: white; cursor: pointer;">Cancelar</button>
                    <button id="confirm-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #FFD600; color: black; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        document.getElementById('close-modal').onclick = () => modal.remove();
        document.getElementById('cancel-btn').onclick = () => modal.remove();
        
        document.getElementById('antivirus-custom-script').onchange = function() {
            document.getElementById('antivirus-custom').style.display = this.checked ? 'block' : 'none';
        };
        
        document.getElementById('confirm-btn').onclick = function() {
            const useCustomScript = document.getElementById('antivirus-custom-script').checked;
            
            if (useCustomScript) {
                const filename = document.getElementById('antivirus-filename').value.trim();
                const content = document.getElementById('antivirus-content').value.trim();
                
                if (!filename || !content) {
                    alert('Por favor, preencha o nome do arquivo e o conteúdo do script.');
                    return;
                }
                
                // Salvar configuração
                window.antivirusConfig = {
                    customScript: true,
                    filename: filename,
                    content: content
                };
            } else {
                const script = document.getElementById('antivirus-script').value;
                
                // Salvar configuração
                window.antivirusConfig = {
                    customScript: false,
                    script: script
                };
            }
            
            console.log('Configuração Antivírus salva:', window.antivirusConfig);
            
            alert("Configuração do Antivírus salva com sucesso!");
            modal.remove();
        };
    }
    
    // Adicionar funções globais
    window.openSite24x7Modal = openSite24x7Modal;
    window.openAntivirusModal = openAntivirusModal;
    
    console.log("Solução radical aplicada - botões criados fora da hierarquia do DOM");
    console.log("Use window.openSite24x7Modal() ou window.openAntivirusModal() para abrir os modais diretamente");
})();