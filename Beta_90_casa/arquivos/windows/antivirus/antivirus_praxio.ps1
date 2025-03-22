param (
    [string]$AgentKey = ""
)

Write-Output "Instalando Antivírus Praxio..."
if ($AgentKey) {
    Write-Output "Usando chave de ativação: $AgentKey"
}

# Simula instalação
Start-Sleep -Seconds 3
Write-Output "Antivírus Praxio instalado com sucesso!"
