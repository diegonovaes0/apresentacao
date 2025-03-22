/**
 * Implementação de um fallback para a API de hosts
 * Este código será executado se a API /api/host/{hostname} não existir
 */
(function() {
    // Sobrescreve fetchUpdatedHostData para usar um fallback se a API não existir
    const originalFetchUpdatedHostData = window.fetchUpdatedHostData;
    
    window.fetchUpdatedHostData = async function(hostname) {
        try {
            // Tentar usar a implementação original primeiro
            return await originalFetchUpdatedHostData(hostname);
        } catch (error) {
            debugLog(`Erro na API regular, tentando fallback para ${hostname}`, 'warning');
            
            // Implementar um fallback usando a API /api/hosts completa
            try {
                // Se já temos dados válidos para este host, podemos usá-los
                if (hostData[hostname] && 
                    hostData[hostname].facts && 
                    hostData[hostname].facts.hostname && 
                    hostData[hostname].facts.public_ip && 
                    hostData[hostname].facts.private_ip && 
                    hostData[hostname].facts.system) {
                    return hostData[hostname];
                }
                
                // Tentar buscar a lista completa de hosts
                const response = await fetch('/api/hosts');
                if (!response.ok) {
                    throw new Error(`Erro ao buscar lista de hosts: ${response.status}`);
                }
                
                const allHostsData = await response.json();
                
                // Procurar o host específico nos dados
                if (allHostsData && allHostsData[hostname]) {
                    // Atualizar o cache
                    hostData[hostname] = allHostsData[hostname];
                    
                    // Garantir que temos facts
                    if (!hostData[hostname].facts) {
                        hostData[hostname].facts = {
                            hostname: hostname,
                            public_ip: hostname,
                            private_ip: hostname,
                            system: 'Sistema não identificado'
                        };
                    }
                    
                    // Preencher campos obrigatórios se não existirem
                    const facts = hostData[hostname].facts;
                    if (!facts.hostname) facts.hostname = hostname;
                    if (!facts.public_ip) facts.public_ip = hostname;
                    if (!facts.private_ip) facts.private_ip = hostname;
                    if (!facts.system) facts.system = 'Sistema não identificado';
                    
                    // Salvar na sessionStorage
                    saveRunningJobsState();
                    
                    return hostData[hostname];
                }
                
                // Se não encontrou o host, criar dados padrão
                hostData[hostname] = {
                    valid: true,
                    facts: {
                        hostname: hostname,
                        public_ip: hostname,
                        private_ip: hostname,
                        system: 'Sistema não identificado'
                    }
                };
                
                return hostData[hostname];
                
            } catch (fallbackError) {
                debugLog(`Erro no fallback: ${fallbackError.message}`, 'error');
                
                // Último recurso: criar dados padrão
                if (!hostData[hostname]) {
                    hostData[hostname] = {
                        valid: true,
                        facts: {
                            hostname: hostname,
                            public_ip: hostname,
                            private_ip: hostname,
                            system: 'Sistema não identificado'
                        }
                    };
                } else if (!hostData[hostname].facts) {
                    hostData[hostname].facts = {
                        hostname: hostname,
                        public_ip: hostname,
                        private_ip: hostname,
                        system: 'Sistema não identificado'
                    };
                }
                
                return hostData[hostname];
            }
        }
    };
    
    // Adiciona um interceptor de rede para simular a API /api/host/{hostname} se ela não existir
    const originalFetch = window.fetch;
    window.fetch = async function(resource, options) {
        // Verificar se a chamada é para a API de host específico
        const hostApiPattern = /\/api\/host\/([^/]+)$/;
        const match = typeof resource === 'string' ? resource.match(hostApiPattern) : null;
        
        if (match) {
            const hostname = match[1];
            
            try {
                // Tentar fazer a chamada original primeiro
                const response = await originalFetch(resource, options);
                if (response.ok) return response;
                
                // Se a API retornou 404, implementar o fallback
                if (response.status === 404) {
                    debugLog(`API ${resource} não encontrada, usando fallback`, 'warning');
                    
                    // Buscar dados de todos os hosts se disponível
                    const allHostsResponse = await originalFetch('/api/hosts', options);
                    if (allHostsResponse.ok) {
                        const allHostsData = await allHostsResponse.json();
                        
                        // Se temos dados para este host específico, retorná-los
                        if (allHostsData && allHostsData[hostname]) {
                            const hostInfo = allHostsData[hostname];
                            
                            // Formatamos a resposta para simular a API específica
                            const specificHostData = {
                                hostname: hostInfo.facts?.hostname || hostname,
                                public_ip: hostInfo.facts?.public_ip || hostname,
                                private_ip: hostInfo.facts?.private_ip || hostname,
                                system: hostInfo.facts?.system || 'Sistema não identificado'
                            };
                            
                            // Criar uma resposta simulada para a API
                            return new Response(JSON.stringify(specificHostData), {
                                status: 200,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                        }
                    }
                    
                    // Se não conseguimos obter dados específicos, retornar dados genéricos
                    const defaultHostData = {
                        hostname: hostname,
                        public_ip: hostname,
                        private_ip: hostname,
                        system: 'Sistema não identificado'
                    };
                    
                    return new Response(JSON.stringify(defaultHostData), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                // Para outros erros, simplesmente retorna a resposta original
                return response;
            } catch (error) {
                debugLog(`Erro na chamada de API ${resource}: ${error.message}`, 'error');
                
                // Criar uma resposta de erro
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
        }
        
        // Para todas as outras chamadas, usa o fetch original
        return originalFetch(resource, options);
    };
    
    debugLog('Interceptor de API de hosts configurado com fallback');
})();