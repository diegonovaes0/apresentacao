param (
    [string]$AgentKey = ""
)

Write-Output "Instalando Antivírus Implantacao..."
if ($AgentKey) {
    Write-Output "Usando chave de ativação: $AgentKey"
}

# Simula instalação
Start-Sleep -Seconds 3
Write-Output "Antivírus Implantacao instalado com sucesso!"
