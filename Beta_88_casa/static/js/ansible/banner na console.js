(function() {
    // Função para criar o banner
    function createPersistentBanner() {
        // Remover qualquer banner existente para evitar duplicatas
        const existingBanner = document.querySelector('#persistent-config-banner');
        if (existingBanner) existingBanner.remove();

        // Criar o banner
        const banner = document.createElement('div');
        banner.id = 'persistent-config-banner';
        banner.innerHTML = `
            <div class="banner-container">
                <div class="banner-header">
                    <h3>Configuração Rápida</h3>
                    <button type="button" class="banner-close">✕</button>
                </div>
                <div class="banner-body">
                    <p>Este é um banner persistente para configuração.</p>
                    <label>Exemplo de Campo:<input type="text" placeholder="Digite algo"></label>
                    <button type="button" class="banner-save">Salvar</button>
                </div>
            </div>
        `;

        // Estilos embutidos para garantir que o banner seja visível e persistente
        banner.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 999999 !important;
            background: none !important;
            font-family: Arial, sans-serif !important;
        `;

        const containerStyles = `
            background-color: #121212 !important;
            border-radius: 8px !important;
            width: 400px !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5) !important;
            color: #FFFFFF !important;
        `;

        const headerStyles = `
            padding: 10px 15px !important;
            background-color: #0A0A0A !important;
            border-bottom: 1px solid #2A2A2A !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
        `;

        const bodyStyles = `
            padding: 15px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
        `;

        const closeButtonStyles = `
            background: none !important;
            border: none !important;
            color: #808080 !important;
            font-size: 20px !important;
            cursor: pointer !important;
            padding: 0 !important;
        `;

        const saveButtonStyles = `
            background-color: #FFD600 !important;
            color: #000000 !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 8px 12px !important;
            cursor: pointer !important;
            font-weight: bold !important;
        `;

        const inputStyles = `
            background-color: #1A1A1A !important;
            border: 1px solid #2A2A2A !important;
            border-radius: 4px !important;
            padding: 5px !important;
            color: #FFFFFF !important;
            width: 100% !important;
        `;

        // Aplicar estilos aos elementos internos
        banner.querySelector('.banner-container').style.cssText = containerStyles;
        banner.querySelector('.banner-header').style.cssText = headerStyles;
        banner.querySelector('.banner-body').style.cssText = bodyStyles;
        banner.querySelector('.banner-close').style.cssText = closeButtonStyles;
        banner.querySelector('.banner-save').style.cssText = saveButtonStyles;
        banner.querySelector('input').style.cssText = inputStyles;
        banner.querySelector('h3').style.cssText = 'margin: 0 !important; color: #FFD600 !important;';
        banner.querySelector('label').style.cssText = 'display: flex !important; flex-direction: column !important; gap: 5px !important;';

        // Adicionar ao DOM
        document.body.appendChild(banner);

        // Configurar eventos
        setupBannerEvents(banner);

        // Iniciar monitoramento para persistência
        ensureBannerPersistence(banner);

        console.log('Banner persistente criado com sucesso!');
    }

    // Configurar eventos do banner
    function setupBannerEvents(banner) {
        const closeButton = banner.querySelector('.banner-close');
        const saveButton = banner.querySelector('.banner-save');

        // Fechar o banner apenas com clique explícito
        closeButton.addEventListener('click', () => {
            clearInterval(banner.dataset.persistenceInterval); // Parar o monitoramento
            banner.remove();
            console.log('Banner fechado pelo usuário.');
        }, { once: true });

        // Exemplo de ação ao salvar (pode ser personalizado)
        saveButton.addEventListener('click', () => {
            const inputValue = banner.querySelector('input').value;
            console.log('Valor salvo:', inputValue);
            alert('Configuração salva: ' + inputValue);
        }, { once: true });
    }

    // Garantir que o banner permaneça no DOM
    function ensureBannerPersistence(banner) {
        const persistenceInterval = setInterval(() => {
            if (!document.body.contains(banner)) {
                console.warn('Banner removido detectado, restaurando...');
                document.body.appendChild(banner);
                setupBannerEvents(banner); // Reconfigurar eventos
            }
        }, 200); // Verifica a cada 200ms para resposta rápida

        // Armazenar o ID do intervalo no elemento para limpeza
        banner.dataset.persistenceInterval = persistenceInterval;
    }

    // Executar a criação do banner
    createPersistentBanner();
})();