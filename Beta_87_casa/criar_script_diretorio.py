#!/usr/bin/env python3
"""
Script para configurar a estrutura de diretórios e arquivos necessários
para o sistema de gerenciamento de playbooks Ansible.
"""

import os
import shutil
import argparse
from pathlib import Path

def create_directory_structure(base_path):
    """
    Cria a estrutura básica de diretórios para o sistema.
    """
    print("Criando estrutura de diretórios...")
    
    # Diretórios de playbooks
    playbook_dirs = [
        "playbooks/windows/agents",
        "playbooks/windows/security",
        "playbooks/windows/baseline",
        "playbooks/windows/config",
        "playbooks/linux/agents",
        "playbooks/linux/security",
        "playbooks/linux/baseline",
        "playbooks/linux/config"
    ]
    
    # Diretórios de arquivos
    file_dirs = [
        "arquivos/windows",
        "arquivos/linux"
    ]
    
    # Diretórios de inventário
    inventory_dirs = [
        "inventory",
        "inventory/group_vars"
    ]
    
    # Cria todos os diretórios
    for dir_path in playbook_dirs + file_dirs + inventory_dirs:
        full_path = base_path / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ Diretório criado: {full_path}")
    
    # Cria arquivo de inventário se não existir
    inventory_file = base_path / "inventory" / "inventory.ini"
    if not inventory_file.exists():
        with open(inventory_file, 'w') as f:
            f.write("[linux]\n\n[windows]\n\n")
        print(f"  ✓ Arquivo de inventário criado: {inventory_file}")
    
    print("Estrutura de diretórios criada com sucesso!")

def copy_playbooks(base_path, source_dir=None):
    """
    Copia os playbooks de exemplo para a estrutura criada.
    Se source_dir for None, usa os playbooks incorporados no script.
    """
    if not source_dir:
        print("Usando playbooks incorporados...")
        return
    
    source_path = Path(source_dir)
    if not source_path.exists():
        print(f"Diretório de origem não encontrado: {source_path}")
        return
    
    print(f"Copiando playbooks de {source_path}...")
    
    # Mapeia extensões para diretórios de destino
    extension_map = {
        '.yml': 'playbooks',
        '.ps1': 'arquivos/windows',
        '.sh': 'arquivos/linux'
    }
    
    # Conta arquivos copiados
    copied_count = 0
    
    # Percorre todos os arquivos no diretório de origem
    for root, _, files in os.walk(source_path):
        for file in files:
            file_path = Path(root) / file
            
            # Determina destino baseado na extensão
            _, ext = os.path.splitext(file)
            if ext not in extension_map:
                continue
                
            if 'windows' in str(file_path).lower():
                if ext == '.yml':
                    # Para playbooks, tenta determinar o tipo
                    content = file_path.read_text(errors='ignore').lower()
                    if 'security' in content or 'antivirus' in content or 'wazuh' in content:
                        dest_dir = base_path / 'playbooks/windows/security'
                    elif 'agent' in content or 'site24x7' in content or 'patchmanager' in content:
                        dest_dir = base_path / 'playbooks/windows/agents'
                    elif 'baseline' in content:
                        dest_dir = base_path / 'playbooks/windows/baseline'
                    else:
                        dest_dir = base_path / 'playbooks/windows/config'
                else:
                    dest_dir = base_path / 'arquivos/windows'
            elif 'linux' in str(file_path).lower():
                if ext == '.yml':
                    # Mesmo processo para Linux
                    content = file_path.read_text(errors='ignore').lower()
                    if 'security' in content or 'antivirus' in content or 'wazuh' in content:
                        dest_dir = base_path / 'playbooks/linux/security'
                    elif 'agent' in content or 'site24x7' in content or 'patchmanager' in content:
                        dest_dir = base_path / 'playbooks/linux/agents'
                    elif 'baseline' in content:
                        dest_dir = base_path / 'playbooks/linux/baseline'
                    else:
                        dest_dir = base_path / 'playbooks/linux/config'
                else:
                    dest_dir = base_path / 'arquivos/linux'
            else:
                # Arquivos sem indicação clara de SO vão para pastsa genéricas
                if ext == '.yml':
                    dest_dir = base_path / 'playbooks'
                else:
                    continue  # Pula se não conseguir determinar
            
            # Copia o arquivo
            dest_file = dest_dir / file
            shutil.copy2(file_path, dest_file)
            copied_count += 1
            print(f"  → Copiado: {file_path.name} para {dest_dir}")
    
    print(f"Copiados {copied_count} arquivos.")

def create_sample_windows_scripts(base_path):
    """
    Cria scripts de exemplo para Windows se não existirem.
    """
    print("Criando scripts de exemplo para Windows...")
    
    # Script do Trend Micro
    trendmicro_script = base_path / "arquivos/windows/trendmicro.ps1"
    if not trendmicro_script.exists():
        trendmicro_script.write_text("""#requires -version 4.0
param (
    [string]$TenantID = "CFDEC234-D723-31B2-A5EE-91855A2696E4",
    [string]$Token = "D66CA5DF-3FEF-BF5E-1CEC-CCDCEB69D093",
    [string]$PolicyID = "39",
    [string]$GroupID = "2248"
)

# PowerShell 4 or up is required to run this script
# This script detects platform and architecture.  It then downloads and installs the relevant Deep Security Agent package

if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
   Write-Warning "You are not running as an Administrator. Please try again with admin privileges."
   exit 1
}

$managerUrl="https://app.deepsecurity.trendmicro.com:443/"

$env:LogPath = "$env:appdata\\Trend Micro\\Deep Security Agent\\installer"
New-Item -path $env:LogPath -type directory -Force | Out-Null
Start-Transcript -path "$env:LogPath\\dsa_deploy.log" -append

Write-Output "$(Get-Date -format T) - DSA download started"
if ( [intptr]::Size -eq 8 ) { 
   $sourceUrl=-join($managerUrl, "software/agent/Windows/x86_64/agent.msi") }
else {
   $sourceUrl=-join($managerUrl, "software/agent/Windows/i386/agent.msi") }
Write-Output "$(Get-Date -format T) - Download Deep Security Agent Package" $sourceUrl

$ACTIVATIONURL="dsm://agents.deepsecurity.trendmicro.com:443/"

$WebClient = New-Object System.Net.WebClient

# Add agent version control info
$WebClient.Headers.Add("Agent-Version-Control", "on")
$WebClient.QueryString.Add("tenantID", "98397")
$WebClient.QueryString.Add("windowsVersion", (Get-CimInstance Win32_OperatingSystem).Version)
$WebClient.QueryString.Add("windowsProductType", (Get-CimInstance Win32_OperatingSystem).ProductType)
$WebClient.QueryString.Add("windowsOperatingSystemSku", (Get-CimInstance Win32_OperatingSystem).OperatingSystemSku)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;

Try
{
     $WebClient.DownloadFile($sourceUrl,  "$env:temp\\agent.msi")
} Catch [System.Net.WebException]
{
      Write-Output " Please check that your Workload Security Manager TLS certificate is signed by a trusted root certificate authority."
      exit 2;
}

if ( (Get-Item "$env:temp\\agent.msi").length -eq 0 ) {
    Write-Output "Failed to download the Deep Security Agent. Please check if the package is imported into the Workload Security Manager. "
 exit 1
}
Write-Output "$(Get-Date -format T) - Downloaded File Size:" (Get-Item "$env:temp\\agent.msi").length

Write-Output "$(Get-Date -format T) - DSA install started"
Write-Output "$(Get-Date -format T) - Installer Exit Code:" (Start-Process -FilePath msiexec -ArgumentList "/i $env:temp\\agent.msi /qn ADDLOCAL=ALL /l*v "$env:LogPath\\dsa_install.log"" -Wait -PassThru).ExitCode 
Write-Output "$(Get-Date -format T) - DSA activation started"

Start-Sleep -s 50
& $Env:ProgramFiles"\\Trend Micro\\Deep Security Agent\\dsa_control" -r
& $Env:ProgramFiles"\\Trend Micro\\Deep Security Agent\\dsa_control" -a $ACTIVATIONURL "tenantID:$TenantID" "token:$Token" "policyid:$PolicyID" "groupid:$GroupID"
Stop-Transcript
Write-Output "$(Get-Date -format T) - DSA Deployment Finished"
""")
        print(f"  ✓ Criado script de exemplo do Trend Micro")
    
    # Script de configuração do antivírus
    antivirus_config_script = base_path / "arquivos/windows/antivirus_config.ps1"
    if not antivirus_config_script.exists():
        antivirus_config_script.write_text("""# Script para cadastro e configuração de agentes antivírus
param (
    [string]$Action = "menu",
    [string]$Type = "implantacao",
    [string]$AgentKey = "",
    [string]$TenantID = "",
    [string]$Token = "",
    [string]$PolicyID = "",
    [string]$GroupID = ""
)

# Arquivo de configuração para armazenar as chaves dos agentes
$configFile = "$PSScriptRoot\\antivirus_config.json"

# Função para carregar a configuração existente
function Load-Config {
    if (Test-Path $configFile) {
        $config = Get-Content $configFile | ConvertFrom-Json
    } else {
        $config = @{
            implantacao = @{ key = "" }
            cta = @{ key = "" }
            praxio = @{ key = "" }
            trendmicro = @{
                tenant_id = "CFDEC234-D723-31B2-A5EE-91855A2696E4"
                token = "D66CA5DF-3FEF-BF5E-1CEC-CCDCEB69D093"
                policy_id = "39"
                group_id = "2248"
            }
            custom = @{ key = "", file = "custom_antivirus.ps1" }
        }
    }
    return $config
}

# Função para salvar a configuração
function Save-Config($config) {
    $config | ConvertTo-Json -Depth 4 | Set-Content $configFile
    Write-Host "Configuração salva com sucesso!" -ForegroundColor Green
}

# Menu principal
if ($Action -eq "menu") {
    # (Código do menu omitido para abreviar)
    Write-Host "Script de configuração iniciado. Use -Action, -Type e outros parâmetros para automação."
} elseif ($Action -eq "get") {
    # Retorna configurações para o tipo especificado
    $config = Load-Config
    
    switch ($Type) {
        "trendmicro" {
            # Retorna todas as configurações do Trend Micro
            return @{
                tenant_id = $config.trendmicro.tenant_id
                token = $config.trendmicro.token
                policy_id = $config.trendmicro.policy_id
                group_id = $config.trendmicro.group_id
            }
        }
        "custom" {
            # Retorna configuração personalizada
            return @{
                key = $config.custom.key
                file = $config.custom.file
            }
        }
        default {
            # Retorna apenas a chave para tipos básicos
            return $config.$Type.key
        }
    }
} elseif ($Action -eq "set") {
    # Define configurações para o tipo especificado
    $config = Load-Config
    
    switch ($Type) {
        "trendmicro" {
            if ($TenantID) { $config.trendmicro.tenant_id = $TenantID }
            if ($Token) { $config.trendmicro.token = $Token }
            if ($PolicyID) { $config.trendmicro.policy_id = $PolicyID }
            if ($GroupID) { $config.trendmicro.group_id = $GroupID }
        }
        "custom" {
            if ($AgentKey) { $config.custom.key = $AgentKey }
        }
        default {
            if ($AgentKey) { $config.$Type.key = $AgentKey }
        }
    }
    
    Save-Config $config
}
""")
        print(f"  ✓ Criado script de configuração de antivírus")
    
    # Exemplo de script antivírus básico
    antivirus_basic = base_path / "arquivos/windows/antivirus_implantacao.ps1"
    if not antivirus_basic.exists():
        antivirus_basic.write_text("""param (
    [string]$AgentKey = ""
)

Write-Output "Instalando Antivírus de Implantação..."
if ($AgentKey) {
    Write-Output "Usando chave de ativação: $AgentKey"
}

# Simula instalação
Start-Sleep -Seconds 3
Write-Output "Antivírus instalado com sucesso!"
""")
        print(f"  ✓ Criado script de antivírus básico")

def create_sample_playbooks(base_path):
    """
    Cria alguns playbooks de exemplo
    """
    print("Criando playbooks de exemplo...")
    
    # Playbook do antivírus
    antivirus_playbook = base_path / "playbooks/windows/security/antivirus.yml"
    if not antivirus_playbook.exists():
        antivirus_playbook.write_text("""---
- name: Instalação do Antivirus no Windows Server
  hosts: windows
  vars:
    antivirus_type: "{{ antivirus_type | default('implantacao') }}"
    antivirus_list:
      implantacao: antivirus_implantacao.ps1
      cta: antivirus_cta.ps1
      praxio: antivirus_praxio.ps1
      trendmicro: trendmicro.ps1
      custom: "{{ custom_antivirus_file | default('custom_antivirus.ps1') }}"
    antivirus_file: "{{ antivirus_list[antivirus_type] }}"
    caminho_remoto_antivirus: C:\\Users\\_admin-skyone\\Desktop\\Agents_Skyone\\antivirus\\{{ antivirus_file }}
    arquivos_dir: "./arquivos/windows"
    agent_key: "{{ agent_key | default('') }}"
    tenant_id: "{{ tenant_id | default('CFDEC234-D723-31B2-A5EE-91855A2696E4') }}"
    policy_id: "{{ policy_id | default('39') }}"
    group_id: "{{ group_id | default('2248') }}"
    token: "{{ token | default('D66CA5DF-3FEF-BF5E-1CEC-CCDCEB69D093') }}"

  tasks:
    - name: "Criar diretório para antivirus"
      win_file:
        path: C:\\Users\\_admin-skyone\\Desktop\\Agents_Skyone\\antivirus
        state: directory
      ignore_errors: yes

    - name: "Copiar arquivo de instalação do antivirus para o servidor"
      win_copy:
        src: "{{ arquivos_dir }}/{{ antivirus_file }}"
        dest: "{{ caminho_remoto_antivirus }}"
      ignore_errors: yes

    - name: "Iniciar instalação do Antivirus"
      win_shell: |
        powershell -ExecutionPolicy Bypass -File "{{ caminho_remoto_antivirus }}"
      register: antivirus_installation
      ignore_errors: yes
""")
        print(f"  ✓ Criado playbook de antivírus")
    
    # Playbook do site24x7
    site24x7_playbook = base_path / "playbooks/windows/agents/site24x7.yml"
    if not site24x7_playbook.exists():
        site24x7_playbook.write_text("""---
- name: Install and Configure Site24x7 Windows Agent
  hosts: windows
  gather_facts: true

  vars:
    installer_url: "https://staticdownloads.site24x7.com/server/Site24x7WindowsAgent.msi"
    download_path: "C:\\\\Temp\\\\Site24x7WindowsAgent.msi"
    log_path: "C:\\\\Temp\\\\site24x7_install.log"
    agent_bin_path: "C:\\\\Program Files (x86)\\\\Site24x7\\\\WinAgent\\\\monitoring\\\\bin"
    device_key: "{{ device_key_input | default('us_8e715d1f97d4f0ec254a90079d2249db') }}"

  tasks:
    - name: Ensure Temp directory exists
      win_file:
        path: C:\\\\Temp
        state: directory

    - name: Download Site24x7 Agent
      win_get_url:
        url: "{{ installer_url }}"
        dest: "{{ download_path }}"
        validate_certs: yes
        force: yes

    - name: Install Site24x7 Agent with parameters
      win_package:
        path: "{{ download_path }}"
        state: present
        arguments: >-
          EDITA1={{ device_key }}
          ENABLESILENT=YES
          REBOOT=ReallySuppress
          /qn
      register: install_result
""")
        print(f"  ✓ Criado playbook do Site24x7")

def main():
    """
    Função principal do script.
    """
    parser = argparse.ArgumentParser(description='Configuração do sistema de gerenciamento de playbooks Ansible.')
    parser.add_argument('--dir', default='.', help='Diretório base para instalação (padrão: diretório atual)')
    parser.add_argument('--source', help='Diretório de origem para copiar playbooks existentes')
    
    args = parser.parse_args()
    
    base_path = Path(args.dir).absolute()
    print(f"Iniciando configuração no diretório: {base_path}")
    
    # Cria a estrutura de diretórios
    create_directory_structure(base_path)
    
    # Cria scripts de exemplo para Windows
    create_sample_windows_scripts(base_path)
    
    # Cria playbooks de exemplo
    create_sample_playbooks(base_path)
    
    # Copia playbooks existentes, se fornecido
    if args.source:
        copy_playbooks(base_path, args.source)
    
    print("\nConfiguração concluída com sucesso!")
    print("\nAgora você pode iniciar o servidor Flask com:")
    print(f"  cd {base_path}")
    print("  python app.py")

if __name__ == "__main__":
    main()