# Importações necessárias
from flask import Flask, render_template, jsonify, request
import ansible_runner
from datetime import datetime
import threading
import yaml
import os
import json
import re
from ansible.parsing.dataloader import DataLoader
from ansible.inventory.manager import InventoryManager
import subprocess
import logging
import platform
from pathlib import Path

# Configuração do logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ansible_manager.log')
    ]
)
logger = logging.getLogger('AnsibleManager')

# Criação do app Flask
app = Flask(__name__, template_folder='templates', static_folder='static')

# Configuração de diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INVENTORY_DIR = os.path.join(BASE_DIR, 'inventory')
GROUP_VARS_DIR = os.path.join(INVENTORY_DIR, 'group_vars')
INVENTORY_FILE = os.path.join(INVENTORY_DIR, 'inventory.ini')

# Formatadores e utilidades
class AnsibleOutputFormatter:
    """Formata a saída do Ansible de forma organizada e com cores"""
    
    ANSIBLE_FORMATS = {
        'ok': '<span style="color: #4ec9b0">ok</span>',
        'changed': '<span style="color: #dcdcaa">changed</span>',
        'failed': '<span style="color: #f14c4c">failed</span>',
        'skipped': '<span style="color: #808080">skipped</span>',
        'unreachable': '<span style="color: #f14c4c">unreachable</span>'
    }

    @staticmethod
    def format_output(line: str) -> str:
        if not line.strip():
            return ""
        if line.startswith('PLAY'):
            play_match = line.strip()
            return (
                '<div class="ansible-play" style="color: #569cd6; font-weight: bold; '
                'margin: 8px 0; padding: 4px 0; border-bottom: 1px solid #333;">'
                f'{play_match} {"*" * 40}</div>'
            )
        if line.startswith('TASK'):
            task_match = line.strip()
            return (
                '<div class="ansible-task" style="color: #9cdcfe; font-weight: bold; '
                'margin: 8px 0 4px 0;">'
                f'{task_match} {"-" * 40}</div>'
            )
        if line.startswith('PLAY RECAP'):
            return (
                '<div class="ansible-recap" style="color: #569cd6; font-weight: bold; '
                'margin: 8px 0; padding-top: 8px; border-top: 1px solid #333;">'
                f'{line.strip()} {"*" * 40}</div>'
            )
        for status, format_html in AnsibleOutputFormatter.ANSIBLE_FORMATS.items():
            if line.startswith(f"{status}:"):
                parts = line.split('=>', 1)
                host_part = parts[0].replace(f"{status}:", '').strip()
                content_part = parts[1].strip() if len(parts) > 1 else ''
                result = f'<div class="ansible-{status}" style="margin: 4px 0;">'
                result += f'{format_html}: [{host_part}]'
                if content_part:
                    result += (
                        f'<div style="margin: 2px 0 2px 40px; color: #d4d4d4; '
                        f'font-family: monospace;">{content_part}</div>'
                    )
                result += '</div>'
                return result
        if any(x in line for x in ['ok=', 'changed=', 'unreachable=', 'failed=']):
            return f'<div class="ansible-stats" style="margin: 4px 0;">{line.strip()}</div>'
        return (
            '<div class="ansible-line" style="color: #d4d4d4; margin: 4px 0 4px 20px;">'
            f'{line.strip()}</div>'
        )

    @staticmethod
    def format_event(event: dict) -> str:
        if not event or 'event' not in event:
            return None
        event_type = event['event']
        event_data = event.get('event_data', {})
        if event_type in ['debug', 'verbose', 'runner_on_start', 'runner_item_on_ok',
                         'runner_item_on_failed', 'runner_item_on_skipped', 'runner_retry']:
            return None
        if event_type == 'playbook_on_play_start':
            line = f"PLAY [{event_data.get('name', 'unnamed play')}]"
            return AnsibleOutputFormatter.format_output(line)
        elif event_type == 'playbook_on_task_start':
            line = f"TASK [{event_data.get('name', event_data.get('task', 'unnamed task'))}]"
            return AnsibleOutputFormatter.format_output(line)
        elif event_type in ['runner_on_ok', 'runner_on_failed', 'runner_on_skipped', 'runner_on_unreachable']:
            status = event_type.replace('runner_on_', '')
            host = event_data.get('host', 'unknown')
            result = event_data.get('res', {})
            line = f"{status}: [{host}] => {result}"
            return AnsibleOutputFormatter.format_output(line)
        elif event_type == 'playbook_on_stats':
            line = "PLAY RECAP"
            return AnsibleOutputFormatter.format_output(line)
        return None

# Funções de gerenciamento de inventário
def ensure_inventory_exists():
    os.makedirs(GROUP_VARS_DIR, exist_ok=True)
    if not os.path.exists(INVENTORY_FILE):
        with open(INVENTORY_FILE, 'w') as f:
            f.write('[linux]\n\n[windows]\n\n')

def is_valid_ip(ip):
    pattern = r'^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.' \
              r'(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.' \
              r'(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.' \
              r'(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$'
    return bool(re.match(pattern, ip))

def parse_inventory():
    ensure_inventory_exists()
    linux_hosts = []
    windows_hosts = []
    current_section = None
    with open(INVENTORY_FILE, 'r') as f:
        for line in f:
            stripped = line.strip()
            if stripped == '[linux]':
                current_section = 'linux'
                continue
            elif stripped == '[windows]':
                current_section = 'windows'
                continue
            elif '[vars]' in stripped:
                current_section = None
                continue
            if current_section == 'linux' and stripped:
                linux_hosts.append(stripped)
            elif current_section == 'windows' and stripped:
                windows_hosts.append(stripped)
    return linux_hosts, windows_hosts

def write_inventory(linux_hosts, windows_hosts):
    with open(INVENTORY_FILE, 'w') as f:
        f.write('[linux]\n')
        f.writelines(f"{line}\n" for line in linux_hosts)
        f.write('\n')
        f.write('[windows]\n')
        f.writelines(f"{line}\n" for line in windows_hosts)
        f.write('\n')

def format_inventory_line(host, user, password, key, os_type):
    if os_type == 'linux':
        if key:
            formatted_key = key.replace('\n', '\\n')
            return f"{host} ansible_host={host} ansible_user={user} ansible_ssh_private_key_content=\"{formatted_key}\""
        elif password:
            return f"{host} ansible_host={host} ansible_user={user} ansible_ssh_pass={password}"
        else:
            return f"{host} ansible_host={host} ansible_user={user}"
    elif os_type == 'windows':
        if password:
            return f"{host} ansible_host={host} ansible_user={user} ansible_password={password}"
        else:
            return f"{host} ansible_host={host} ansible_user={user}"

def parse_server_line(line, os_type):
    parts = line.split()
    host = parts[0]
    ssh_user = ''
    ssh_pass = ''
    ssh_key = ''
    windows_password = ''
    for part in parts[1:]:
        if part.startswith('ansible_user='):
            ssh_user = part.split('=')[1]
        elif part.startswith('ansible_ssh_pass='):
            ssh_pass = part.split('=')[1]
        elif part.startswith('ansible_password='):
            windows_password = part.split('=')[1]
        elif part.startswith('ansible_ssh_private_key_content='):
            ssh_key = part.split('=')[1].replace('\\n', '\n')
    return {
        "host": host,
        "ssh_user": ssh_user,
        "ssh_pass": ssh_pass,
        "windows_password": windows_password,
        "ssh_key_content": ssh_key,
        "os": os_type
    }

class AnsibleManager:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.inventory_path = Path(INVENTORY_FILE)
        self.playbook_path = self.base_path / "playbooks"
        self.running_playbooks = {}
        self.inventory_path.parent.mkdir(parents=True, exist_ok=True)
        self.playbook_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Inicializado com inventory_path: {self.inventory_path}")
        logger.info(f"Inicializado com playbook_path: {self.playbook_path}")

    def _update_execution_status(self, job_id: str, line: str, formatted_line: str):
        if job_id not in self.running_playbooks:
            return
        playbook = self.running_playbooks[job_id]
        playbook["output"] += formatted_line
        if "TASK" in line:
            playbook["progress"] = min(95, playbook["progress"] + 5)
        elif "PLAY RECAP" in line:
            playbook["progress"] = 100
            if "failed=0" in line and "unreachable=0" in line:
                playbook["status"] = "completed"
            else:
                playbook["status"] = "failed"

    def get_execution_status(self, job_id: str) -> dict:
        if job_id not in self.running_playbooks:
            return {"status": "not_found", "output": "", "progress": 0}
        return self.running_playbooks[job_id]
    
    def gather_host_facts(self, hostname: str) -> dict:
        try:
            job_id = f"gather_facts_{hostname}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            logger.info(f"Iniciando coleta de fatos para {hostname} (Job ID: {job_id})")
            cmd = [
                'ansible-playbook',
                str(self.playbook_path / "gatherfact.yml"),
                '-i', str(self.inventory_path),
                '--limit', hostname,
                '-v'
            ]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, bufsize=1)
            output = ""
            host_details = {}
            debug_found = False
            json_buffer = ""
            for line in iter(process.stdout.readline, ''):
                line = line.strip()
                if line:
                    output += line + "\n"
                    logger.debug(f"Saída da playbook: {line}")
                    if "TASK [Debug informações coletadas]" in line:
                        debug_found = True
                    elif debug_found and "ok:" in line and "=>" in line:
                        json_start = line.find("=>") + 2
                        if json_start > 2:
                            json_content = line[json_start:].strip()
                            try:
                                host_details = json.loads(json_content)
                                logger.info(f"host_details capturado: {host_details}")
                                break
                            except json.JSONDecodeError as e:
                                logger.error(f"Erro ao parsear JSON inicial: {str(e)} - Conteúdo: {json_content}")
                                json_buffer = json_content
                    elif debug_found and json_buffer:
                        json_buffer += "\n" + line
                        if line.endswith("}"):
                            try:
                                host_details = json.loads(json_buffer)
                                logger.info(f"host_details capturado (multilinha): {host_details}")
                                break
                            except json.JSONDecodeError as e:
                                logger.error(f"Erro ao parsear JSON multilinha: {str(e)} - Conteúdo: {json_buffer}")
            process.wait()
            if process.returncode != 0:
                logger.error(f"Erro ao executar gatherfact.yml para {hostname}: {output}")
                return {"hostname": hostname, "public_ip": "N/A", "private_ip": "N/A", "system": "N/A"}
            if not host_details:
                logger.warning(f"Nenhum host_details encontrado na saída para {hostname}: {output}")
                return {"hostname": hostname, "public_ip": "N/A", "private_ip": "N/A", "system": "N/A"}
            logger.info(f"Fatos coletados para {hostname}: {host_details}")
            return host_details
        except Exception as e:
            logger.error(f"Erro ao coletar fatos do host {hostname}: {str(e)}", exc_info=True)
            return {"hostname": hostname, "public_ip": "N/A", "private_ip": "N/A", "system": "N/A"}

    def handle_ansible_event(self, job_id: str, event: dict):
        """
        Processa eventos do Ansible e atualiza o status da execução do playbook.
        
        Args:
            job_id (str): Identificador único do job de execução
            event (dict): Evento do Ansible a ser processado
        """
        # Verificar se o job_id existe nos playbooks em execução
        if job_id not in self.running_playbooks:
            return
            
        try:
            # Formatar a saída do evento
            formatted_output = AnsibleOutputFormatter.format_event(event)
            
            # Adicionar saída formatada ao registro do playbook, se disponível
            if formatted_output:
                # Inicializar campo 'output' se não existir
                if 'output' not in self.running_playbooks[job_id]:
                    self.running_playbooks[job_id]['output'] = ''
                    
                # Adicionar a saída formatada
                self.running_playbooks[job_id]['output'] += formatted_output
            
            # Processar eventos específicos
            if event['event'] == 'playbook_on_stats':
                # Evento de conclusão - atualizar progresso para 100%
                self.running_playbooks[job_id]['progress'] = 100
                
                # Analisar estatísticas para determinar sucesso ou falha
                stats = event.get('event_data', {}).get('stats', {})
                failed_hosts = sum(
                    1 for host_stats in stats.values() 
                    if host_stats.get('failures', 0) > 0 or host_stats.get('unreachable', 0) > 0
                )
                
                # Atualizar status baseado no resultado
                self.running_playbooks[job_id]['status'] = 'failed' if failed_hosts > 0 else 'completed'
            else:
                # Para outros eventos, calcular progresso baseado no tempo decorrido
                elapsed = (datetime.now() - self.running_playbooks[job_id]['start_time']).total_seconds()
                # Limitar o progresso a 95% até a conclusão
                self.running_playbooks[job_id]['progress'] = min(95, (elapsed / 60) * 100)
                
        except Exception as e:
            # Registrar erros no processamento do evento
            logger.error(f"Erro ao processar evento Ansible: {str(e)}", exc_info=True)

    def load_inventory(self) -> dict:
        try:
            if not self.inventory_path.exists():
                logger.error(f"Arquivo de inventário não encontrado: {self.inventory_path}")
                return {}
            data_loader = DataLoader()
            inventory = InventoryManager(loader=data_loader, sources=str(self.inventory_path))
            hosts_info = {}
            for host in inventory.get_hosts():
                host_vars = host.get_vars()
                ansible_vars = {
                    k: v for k, v in host_vars.items() 
                    if k.startswith('ansible_') and 
                    k not in {'ansible_password', 'ansible_ssh_pass', 'ansible_become_pass'}
                }
                hosts_info[host.name] = {
                    "name": host.name,
                    "connection": ansible_vars.get("ansible_connection", "ssh"),
                    "host": ansible_vars.get("ansible_host", host.name),
                    "user": ansible_vars.get("ansible_user", ""),
                    "vars": ansible_vars
                }
                logger.info(f"Host carregado: {host.name}")
                logger.debug(f"Variáveis do host {host.name}: {ansible_vars}")
            return hosts_info
        except Exception as e:
            logger.error(f"Erro ao carregar inventário: {str(e)}", exc_info=True)
            return {}

    def test_host(self, hostname: str, info: dict) -> bool:
        try:
            if info.get("connection") == "local":
                logger.debug(f"Host {hostname} é local, assumindo válido")
                return True
            host_to_test = info.get("host", hostname)
            logger.debug(f"Testando conectividade para {host_to_test}")
            param = "-n" if platform.system().lower() == "windows" else "-c"
            command = ["ping", param, "1", host_to_test]
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5, text=True, check=False)
            is_reachable = result.returncode == 0
            logger.info(f"Host {hostname} ({'acessível' if is_reachable else 'inacessível'})")
            return is_reachable
        except Exception as e:
            logger.error(f"Erro ao testar host {hostname}: {str(e)}", exc_info=True)
            return False

    def get_host_facts(self, hostname: str, info: dict) -> dict:
        try:
            if info.get("connection") == "local":
                import socket
                hostname_real = "127.0.0.1"
                ip_private = "127.0.0.1"
                return {
                    "hostname": hostname_real,
                    "public_ip": "127.0.0.1",
                    "private_ip": ip_private,
                    "system": "Linux 5.15.167.4-microsoft-standard-WSL2",
                }
            return {
                "hostname": hostname,
                "public_ip": info.get("host", "Não disponível"),
                "private_ip": info.get("vars", {}).get("ansible_host", hostname),
                "system": "Sistema Remoto",
            }
        except Exception as e:
            logger.error(f"Erro ao coletar fatos do host {hostname}: {str(e)}", exc_info=True)
            return {}

    def get_playbooks(self) -> list:
        try:
            logger.debug(f"Buscando playbooks em: {self.playbook_path}")
            playbooks = []
            if not self.playbook_path.exists():
                logger.error(f"Diretório de playbooks não encontrado: {self.playbook_path}")
                return []
            
            # Diretórios de SO principais
            os_dirs = {
                "linux": self.playbook_path / "linux",
                "windows": self.playbook_path / "windows"
            }
            
            # Mapeamento de diretórios para categorias
            category_mapping = {
                "agents": "agentes",
                "baseline": "baseline",
                "config": "configuracoes",
                "security": "seguranca"
            }
            
            # Arquivos a ignorar
            ignored_files = {"gather_fact.yml", "gatherfact.yml", "ping.yml", "ping_2.yml", "ping copy.yml"}
            
            # Processando arquivos .yml na raiz da pasta playbooks
            for file in self.playbook_path.glob("*.yml"):
                if file.name not in ignored_files:
                    try:
                        # Arquivo na raiz, tentar inferir metadados do conteúdo
                        meta = self._extract_metadata_from_file(file)
                        playbooks.append(meta)
                        logger.debug(f"Adicionada playbook da raiz: {file.name}")
                    except Exception as e:
                        logger.error(f"Erro ao processar playbook {file.name}: {str(e)}", exc_info=True)
            
            # Processar cada diretório de SO
            for os_name, os_dir in os_dirs.items():
                if os_dir.exists():
                    # Arquivos diretamente na pasta do SO (como sec.yml)
                    for file in os_dir.glob("*.yml"):
                        if file.name not in ignored_files:
                            try:
                                # Para arquivos como sec.yml, inferir categoria do nome do arquivo
                                category = "seguranca" if "sec" in file.name.lower() else "outros"
                                meta = self._extract_metadata_from_file(file, default_os=os_name, default_category=category)
                                playbooks.append(meta)
                                logger.debug(f"Adicionada playbook direta de {os_name}: {file.name}")
                            except Exception as e:
                                logger.error(f"Erro ao processar playbook {file.name}: {str(e)}", exc_info=True)
                    
                    # Processar cada subdiretório de categoria
                    for category_dir in os_dir.iterdir():
                        if category_dir.is_dir():
                            category_name = category_dir.name
                            # Mapear nome do diretório para categoria na UI
                            ui_category = category_mapping.get(category_name, "outros")
                            
                            # Processar arquivos neste subdiretório
                            for file in category_dir.glob("*.yml"):
                                if file.name not in ignored_files:
                                    try:
                                        meta = self._extract_metadata_from_file(
                                            file, 
                                            default_os=os_name, 
                                            default_category=ui_category
                                        )
                                        playbooks.append(meta)
                                        logger.debug(f"Adicionada playbook de {os_name}/{category_name}: {file.name}")
                                    except Exception as e:
                                        logger.error(f"Erro ao processar playbook {file.name}: {str(e)}", exc_info=True)
            
            logger.info(f"Total de playbooks encontradas: {len(playbooks)}")
            # Ordena as playbooks pelo nome para facilitar a visualização
            return sorted(playbooks, key=lambda x: x["name"])
        except Exception as e:
            logger.error(f"Erro ao listar playbooks: {str(e)}", exc_info=True)
            return []

    def _extract_metadata_from_file(self, file_path, default_os="all", default_category="outros"):
        """
        Extrai metadados de um arquivo YAML de playbook.
        Se os metadados não estiverem presentes no arquivo, usa os valores padrão informados.
        
        Args:
            file_path: Caminho do arquivo da playbook
            default_os: SO padrão a ser usado se não for encontrado no arquivo
            default_category: Categoria padrão a ser usada se não for encontrada no arquivo
            
        Returns:
            dict: Dicionário com metadados da playbook
        """
        try:
            # Valores padrão para os metadados
            meta = {
                "name": file_path.name,
                "path": str(file_path),
                "category": default_category,
                "os": default_os,
                "description": f"Playbook {file_path.stem}"
            }
            
            # Tentar extrair metadados do conteúdo do arquivo
            with file_path.open(encoding='utf-8') as f:
                content = yaml.safe_load(f)
                
                if content and isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict):
                            # Metadados diretamente no item
                            if any(key in item for key in ["category", "os", "description"]):
                                meta.update({
                                    "category": item.get("category", meta["category"]),
                                    "os": item.get("os", meta["os"]),
                                    "description": item.get("description", meta["description"])
                                })
                                break
                            
                            # Metadados dentro da seção 'vars'
                            if "vars" in item and isinstance(item["vars"], dict):
                                vars_dict = item["vars"]
                                if any(key in vars_dict for key in ["category", "os", "description"]):
                                    meta.update({
                                        "category": vars_dict.get("category", meta["category"]),
                                        "os": vars_dict.get("os", meta["os"]),
                                        "description": vars_dict.get("description", meta["description"])
                                    })
                                    break
                                
            # Inferir nome mais amigável a partir do nome do arquivo
            if meta["description"] == f"Playbook {file_path.stem}":
                name_parts = file_path.stem.replace('_', ' ').replace('-', ' ').split('.')
                meta["description"] = f"Playbook {name_parts[0].capitalize()}"
            
            return meta
        except Exception as e:
            logger.error(f"Erro ao extrair metadados de {file_path}: {str(e)}", exc_info=True)
            # Em caso de falha, retornar metadados básicos
            return {
                "name": file_path.name,
                "path": str(file_path),
                "category": default_category,
                "os": default_os,
                "description": f"Playbook {file_path.stem}"
            } 
        

    def run_playbook(self, playbook_name: str, hosts: list) -> str:
        job_id = f"{playbook_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        def run():
            try:
                cmd = [
                    'ansible-playbook',
                    str(self.playbook_path / playbook_name),
                    '-i', str(self.inventory_path),
                    '--limit', ','.join(hosts)
                ]
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, bufsize=1)
                output = []
                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        formatted_line = AnsibleOutputFormatter.format_output(line)
                        self._update_execution_status(job_id, line, formatted_line)
                process.wait()
                if process.returncode == 0:
                    self.running_playbooks[job_id]["status"] = "completed"
                else:
                    self.running_playbooks[job_id]["status"] = "failed"
            except Exception as e:
                logger.error(f"Erro na execução da playbook: {str(e)}", exc_info=True)
                self.running_playbooks[job_id]["status"] = "failed"
                self.running_playbooks[job_id]["output"] += f"\nErro: {str(e)}"
        self.running_playbooks[job_id] = {
            "status": "running",
            "output": "",
            "progress": 0,
            "start_time": datetime.now()
        }
        thread = threading.Thread(target=run)
        thread.daemon = True
        thread.start()
        return job_id

    def cancel_playbook(self, job_id: str) -> bool:
        if job_id in self.running_playbooks:
            self.running_playbooks[job_id]["status"] = "cancelled"
            return True
        return False


# Instância global do AnsibleManager
ansible_mgr = AnsibleManager()

# Rotas da API
@app.route("/")
def index():
    return render_template("base.html", module="dashboard", submodule="dashboard")

@app.route("/module/<module>/<submodule>")
def module_page(module, submodule):
    try:
        template_path = f"{module}/{submodule}.html"
        return render_template(template_path, module=module, submodule=submodule)
    except:
        # Fallback ajustado para um template existente
        return render_template("errors/404.html", module=module, submodule=submodule), 404

@app.route("/ansible/core_windows")
def core_windows():
    return render_template("ansible/core_windows.html")

@app.route("/ansible/core_linux")
def core_linux():
    return render_template("ansible/core_linux.html")

@app.route("/ansible/core_oci")
def core_oci():
    return render_template("ansible/core_oci.html")

@app.route("/ansible/inventory")
def ansible_inventory():
    return render_template("ansible/inventory.html")

@app.route("/ansible/playbooks")
def ansible_playbooks():
    return render_template("ansible/playbooks.html")

@app.route("/python/scripts")
def python_scripts():
    return render_template("python/scripts.html")

@app.route("/python/modules")
def python_modules():
    return render_template("python/modules.html")

@app.route("/python/libraries")
def python_libraries():
    return render_template("python/libraries.html")

@app.route("/terraform/modules")
def terraform_modules():
    return render_template("terraform/modules.html")

@app.route("/terraform/states")
def terraform_states():
    return render_template("terraform/states.html")

@app.route("/terraform/workspaces")
def terraform_workspaces():
    return render_template("terraform/workspaces.html")

@app.route("/inventory/core_inventory")
def core_inventory():
    """Rota para gerenciamento de inventário"""
    return render_template("inventory/core_inventory.html")

# Rotas de erro
@app.errorhandler(404)
def page_not_found(e):
    return render_template("errors/404.html"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template("errors/500.html"), 500

# Rotas da API do módulo principal
@app.route("/api/hosts")
def get_hosts():
    try:
        logger.info("Iniciando requisição /api/hosts")
        hosts = ansible_mgr.load_inventory()
        result = {}
        for hostname, info in hosts.items():
            logger.debug(f"Processando host: {hostname}")
            is_valid = ansible_mgr.test_host(hostname, info)
            facts = ansible_mgr.gather_host_facts(hostname) if is_valid else {}
            result[hostname] = {
                "valid": is_valid,
                "facts": facts if not facts.get("host_details") else facts["host_details"]
            }
            logger.info(f"Host {hostname} processado: válido={is_valid}, facts={facts}")
        logger.info(f"Resposta final da API /api/hosts: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erro ao processar hosts: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/playbooks")
def get_playbooks():
    try:
        playbooks = ansible_mgr.get_playbooks()
        logger.debug(f"Retornando {len(playbooks)} playbooks")
        return jsonify(playbooks)
    except Exception as e:
        logger.error(f"Erro na rota /api/playbooks: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/run", methods=["POST"])
def run_playbook():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400
        playbook = data.get("playbook")
        hosts = data.get("hosts")
        if not playbook or not hosts:
            return jsonify({"error": "Playbook e hosts são obrigatórios"}), 400
        job_id = ansible_mgr.run_playbook(playbook, hosts)
        return jsonify({"job_id": job_id}), 200
    except Exception as e:
        logger.error(f"Erro no endpoint /api/run: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route("/api/status/<job_id>")
def get_status(job_id):
    try:
        return jsonify(ansible_mgr.get_execution_status(job_id))
    except Exception as e:
        logger.error(f"Erro ao obter status do job {job_id}: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/cancel/<job_id>", methods=["POST"])
def cancel_playbook(job_id):
    try:
        success = ansible_mgr.cancel_playbook(job_id)
        return jsonify({"success": success})
    except Exception as e:
        logger.error(f"Erro ao cancelar playbook: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Rotas da API de gerenciamento de inventário
@app.route('/get-inventory')
def get_inventory():
    linux_hosts, windows_hosts = parse_inventory()
    servers = []
    for host in linux_hosts:
        servers.append(parse_server_line(host, 'linux'))
    for host in windows_hosts:
        servers.append(parse_server_line(host, 'windows'))
    for server in servers:
        server['ssh_pass'] = server.get('ssh_pass', '')
        server['windows_password'] = server.get('windows_password', '')
        server['ssh_key_content'] = server.get('ssh_key_content', '')
    return jsonify({'servers': servers})

@app.route('/add_server', methods=['POST'])
def add_or_update_server():
    data = request.get_json()
    host = data.get('host')
    ssh_user = data.get('ssh_user')
    ssh_pass = data.get('ssh_pass', '')
    ssh_key = data.get('ssh_key_content', '')
    os_type = data.get('os')
    original_host = data.get('original_host')
    if not is_valid_ip(host):
        return jsonify({"success": False, "message": "IP inválido!"}), 400
    linux_hosts, windows_hosts = parse_inventory()
    if original_host:
        linux_hosts = [line for line in linux_hosts if not line.startswith(f"{original_host} ")]
        windows_hosts = [line for line in windows_hosts if not line.startswith(f"{original_host} ")]
    existing_hosts = linux_hosts + windows_hosts
    if any(line.startswith(f"{host} ") for line in existing_hosts):
        return jsonify({"success": False, "message": "IP já existe!"}), 400
    new_line = format_inventory_line(host, ssh_user, ssh_pass, ssh_key, os_type)
    if os_type == 'linux':
        linux_hosts.append(new_line)
    else:
        windows_hosts.append(new_line)
    write_inventory(linux_hosts, windows_hosts)
    return jsonify({"success": True, "message": "Servidor adicionado com sucesso!"})

@app.route('/show-inventory')
def show_inventory():
    ensure_inventory_exists()
    with open(INVENTORY_FILE, 'r') as f:
        inventory_data = f.read()
    return jsonify({"inventory": inventory_data})

@app.route('/remove_server', methods=['POST'])
def remove_server():
    data = request.get_json()
    host = data.get('host')
    linux_hosts, windows_hosts = parse_inventory()
    linux_hosts = [line for line in linux_hosts if not line.startswith(f"{host} ")]
    windows_hosts = [line for line in windows_hosts if not line.startswith(f"{host} ")]
    write_inventory(linux_hosts, windows_hosts)
    return jsonify({"success": True, "message": "Servidor removido com sucesso!"})

if __name__ == "__main__":
    ensure_inventory_exists()
    app.run(debug=True)