
# Importações organizadas por origem
from flask import (
    Flask, Blueprint, render_template, jsonify, request, 
    send_file, redirect, url_for, session, flash, current_app
)
from functools import wraps

import jinja2
import signal
import secrets
import ansible_runner
from datetime import datetime
import threading
import yaml  # Certifique-se que esta importação esteja presente
import os
import json
import re
import getpass
from ansible.parsing.dataloader import DataLoader
from ansible.inventory.manager import InventoryManager
import subprocess
import logging
import platform
from pathlib import Path
import configparser
import tempfile
import os
import tempfile
from datetime import datetime
import logging

# Configuração do Blueprint
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = secrets.token_hex(16)  # Chave secreta para sessões


inventory_bp = Blueprint('inventory', __name__)
template_bp = Blueprint('template', __name__)
localhost_bp = Blueprint('localhost', __name__)

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


# Criação e configuração do app Flask (apenas uma vez)
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = secrets.token_hex(16)  # Chave secreta para sessões

# Simulação de usuários (substituir por banco de dados em produção)
USERS = {
    "admin": {
        "username": "admin",
        "password": "admin123"  # Use hash de senhas em produção (ex: bcrypt)
    },
    "diego.novaes": {
        "username": "diego.novaes",
        "password": "admin123"  # Use hash de senhas em produção (ex: bcrypt)
    }
}

# Decorador para exigir login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Rotas de autenticação
# Rotas de autenticação aprimoradas
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'logged_in' in session:
        return redirect(url_for('module_page', module='dashboard', submodule='dashboard'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = 'remember' in request.form
        
        if username in USERS and USERS[username]['password'] == password:
            session['logged_in'] = True
            session['username'] = username
            
            if remember:
                session.permanent = True
                
            logger.info(f"Login bem-sucedido para o usuário: {username}")
            flash('Login realizado com sucesso!', 'success')
            
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('module_page', module='dashboard', submodule='dashboard'))
        else:
            logger.warning(f"Tentativa de login mal-sucedida para o usuário: {username}")
            flash('Usuário ou senha inválidos!', 'error')
    
    return render_template('login.html')


@app.route('/logout')
def logout():
    # Registra o logout
    if 'username' in session:
        logger.info(f"Logout para o usuário: {session['username']}")
    
    # Remove as variáveis de sessão
    session.pop('logged_in', None)
    session.pop('username', None)
    session.clear()  # Limpa toda a sessão para garantir
    
    flash('Você foi desconectado com sucesso!', 'success')
    return redirect(url_for('login'))

# Rotas principais com autenticação
# Rota principal
@app.route("/")
def index():
    if 'logged_in' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('module_page', module='dashboard', submodule='dashboard'))

@app.route("/dashboard")
@login_required
def dashboard():
    try:
        return render_template(
            "dashboard.html",
            module="dashboard",
            submodule="dashboard",
            recent_playbooks=[],
            hosts_count=0,
            linux_count=0,
            windows_count=0,
            username=session.get('username', 'Usuário')
        )
    except jinja2.exceptions.TemplateNotFound:
        return "Erro: Template 'dashboard.html' não encontrado. Verifique o diretório 'templates/'.", 500
    
    
# API assíncrona para dados do dashboard
@app.route("/api/dashboard_data")
@login_required
def dashboard_data():
    try:
        # Verifica se os dados estão no cache
        cache_key = f"dashboard_{session['username']}"
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.debug("Retornando dados do dashboard do cache")
            return jsonify(cached_data)

        # Função para carregar playbooks e hosts em segundo plano
        def load_dashboard_data():
            playbooks_data = []
            hosts_data = {'hosts_count': 0, 'linux_count': 0, 'windows_count': 0}
            
            try:
                playbooks = ansible_mgr.get_playbooks()
                recent_playbooks = sorted(playbooks, key=lambda x: os.path.getmtime(x["path"]), reverse=True)[:5]
                playbooks_data = recent_playbooks
            except Exception as e:
                logger.error(f"Erro ao carregar playbooks: {str(e)}")
            
            try:
                hosts = ansible_mgr.load_inventory()
                hosts_data['hosts_count'] = len(hosts)
                hosts_data['linux_count'] = sum(1 for info in hosts.values() if info.get("connection") != "winrm")
                hosts_data['windows_count'] = sum(1 for info in hosts.values() if info.get("connection") == "winrm")
            except Exception as e:
                logger.error(f"Erro ao carregar hosts: {str(e)}")
            
            # Armazena no cache
            cache[cache_key] = {
                "recent_playbooks": playbooks_data,
                "hosts_count": hosts_data['hosts_count'],
                "linux_count": hosts_data['linux_count'],
                "windows_count": hosts_data['windows_count']
            }
        
        # Executa em thread para não bloquear a resposta
        threading.Thread(target=load_dashboard_data, daemon=True).start()
        
        # Retorna dados iniciais ou do cache se já estiver disponível
        data = cache.get(cache_key, {
            "recent_playbooks": [],
            "hosts_count": 0,
            "linux_count": 0,
            "windows_count": 0
        })
        return jsonify(data)
    except Exception as e:
        logger.error(f"Erro na API /api/dashboard_data: {str(e)}")
        return jsonify({"error": str(e)}), 500
@app.route("/ansible/inventory")
@login_required
def ansible_inventory():
    return render_template("ansible/inventory.html")

# Configuração de diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INVENTORY_DIR = os.path.join(BASE_DIR, 'inventory')
GROUP_VARS_DIR = os.path.join(INVENTORY_DIR, 'group_vars')
INVENTORY_FILE = os.path.join(INVENTORY_DIR, 'inventory.ini')

# Classe para formatação de saída do Ansible
class AnsibleOutputFormatter:
    """
    Classe para formatar a saída do Ansible em HTML com uma interface amigável e interativa.
    Transforma a saída de texto padrão em componentes visuais organizados por tipo de tarefa.
    """
    
    # Configurações de estilo para diferentes status de tarefas
    STATUS_STYLES = {
        'ok': {
            'color': '#4CAF50',
            'bg_color': 'rgba(76, 175, 80, 0.1)',
            'icon': 'check-circle'
        },
        'changed': {
            'color': '#FF9800',
            'bg_color': 'rgba(255, 152, 0, 0.1)',
            'icon': 'edit'
        },
        'failed': {
            'color': '#F44336',
            'bg_color': 'rgba(244, 67, 54, 0.1)',
            'icon': 'alert-circle'
        },
        'skipped': {
            'color': '#9E9E9E',
            'bg_color': 'rgba(158, 158, 158, 0.1)',
            'icon': 'skip-forward'
        },
        'unreachable': {
            'color': '#F44336',
            'bg_color': 'rgba(244, 67, 54, 0.1)',
            'icon': 'wifi-off'
        }
    }
    
    # Ícones SVG para diferentes status
    ICONS = {
        'check-circle': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>''',
        
        'alert-circle': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>''',
        
        'edit': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>''',
        
        'skip-forward': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>''',
        
        'wifi-off': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>''',
        
        'play': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>''',
        
        'list': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>''',
        
        'clipboard': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>''',
        
        'chevron-down': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>''',
        
        'chevron-right': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>'''
    }
    
    
    @staticmethod
    def format_output(line: str) -> str:
        """Formata uma linha de saída do Ansible para HTML com design aprimorado"""
        if not line.strip():
            return ""
        
        # Formata cabeçalhos de PLAY com design destacado
        if line.startswith('PLAY'):
            play_name = line.replace('PLAY', '').strip('[] *')
            return (
                '<div class="ansible-play" style="background-color: #252526; color: #569cd6; '
                'font-weight: bold; margin: 12px 0; padding: 10px 15px; border-radius: 6px; '
                'box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center;">'
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="2" style="margin-right: 10px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
                f'Playbook: {play_name}</div>'
            )
        
        # Formata cabeçalhos de TASK com design moderno
        if line.startswith('TASK'):
            task_name = line.replace('TASK', '').strip('[] *')
            return (
                '<div class="ansible-task" style="background-color: #2d2d2d; color: #9cdcfe; '
                'font-weight: 500; margin: 8px 0; padding: 8px 15px; border-radius: 4px; '
                'border-left: 3px solid #0e639c; display: flex; align-items: center;">'
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="2" style="margin-right: 10px;"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>'
                f'Tarefa: {task_name}</div>'
            )
        
        # Formata resumo (PLAY RECAP) com design visual destacado
        if line.startswith('PLAY RECAP'):
            return (
                '<div class="ansible-recap" style="background-color: #252526; color: #569cd6; '
                'font-weight: bold; margin: 15px 0 5px 0; padding: 10px 15px; border-radius: 6px; '
                'border-top: 2px solid #0e639c; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">'
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="2" style="margin-right: 10px; vertical-align: middle;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>'
                '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>'
                'Resumo da Execução</div>'
            )
        
        # Formata resultado de tarefas (ok, changed, failed, etc.) com cards visuais
        for status in ['ok', 'changed', 'failed', 'skipped', 'unreachable']:
            if line.startswith(f"{status}:"):
                parts = line.split('=>', 1)
                host_part = parts[0].replace(f"{status}:", '').strip('[] ')
                content_part = parts[1].strip() if len(parts) > 1 else ''
                
                status_colors = {
                    'ok': '#4CAF50',
                    'changed': '#FF9800',
                    'failed': '#F44336',
                    'skipped': '#9E9E9E',
                    'unreachable': '#F44336'
                }
                
                status_icons = {
                    'ok': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>'
                        '<polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
                    'changed': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                            '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>'
                            '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
                    'failed': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                            '<circle cx="12" cy="12" r="10"></circle>'
                            '<line x1="12" y1="8" x2="12" y2="12"></line>'
                            '<line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
                    'skipped': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                            '<polygon points="5 4 15 12 5 20 5 4"></polygon>'
                            '<line x1="19" y1="5" x2="19" y2="19"></line></svg>',
                    'unreachable': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                                '<line x1="1" y1="1" x2="23" y2="23"></line>'
                                '<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>'
                                '<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path></svg>'
                }
                
                status_labels = {
                    'ok': 'Sucesso',
                    'changed': 'Alterado',
                    'failed': 'Falha',
                    'skipped': 'Ignorado',
                    'unreachable': 'Inacessível'
                }
                
                status_color = status_colors.get(status, '#d4d4d4')
                status_icon = status_icons.get(status, '')
                status_label = status_labels.get(status, status.capitalize())
                
                bg_color = f"rgba({','.join(str(int(status_color[1:][i:i+2], 16)) for i in (0, 2, 4))}, 0.1)"
                
                result = (
                    f'<div class="ansible-task-status" style="margin: 6px 0; padding: 10px 15px; '
                    f'background-color: {bg_color}; border-left: 3px solid {status_color}; '
                    f'border-radius: 4px; display: flex; align-items: flex-start;">'
                    f'<div style="color: {status_color}; margin-right: 10px;">{status_icon}</div>'
                    f'<div style="flex: 1;">'
                    f'<div style="font-weight: 500; display: flex; justify-content: space-between;">'
                    f'<span>{status_label}</span>'
                    f'<span style="font-size: 12px; color: #666; background: rgba(0,0,0,0.1); '
                    f'padding: 2px 6px; border-radius: 12px;">Host: {host_part}</span>'
                    f'</div>'
                )
                
                if content_part:
                    # Se for um JSON, tenta formatá-lo bonito
                    if content_part.strip().startswith('{') and content_part.strip().endswith('}'):
                        try:
                            import json
                            json_obj = json.loads(content_part)
                            json_str = json.dumps(json_obj, indent=2)
                            result += (
                                f'<div style="margin-top: 6px; padding: 8px; background-color: #1e1e1e; '
                                f'border-radius: 4px; font-family: monospace; white-space: pre-wrap; '
                                f'font-size: 13px; overflow: auto; max-height: 300px;">{json_str}</div>'
                            )
                        except:
                            result += (
                                f'<div style="margin-top: 6px; color: #d4d4d4; '
                                f'font-family: monospace;">{content_part}</div>'
                            )
                    else:
                        result += (
                            f'<div style="margin-top: 6px; color: #d4d4d4; '
                            f'font-family: monospace;">{content_part}</div>'
                        )
                
                result += '</div></div>'
                return result
        
        # Formata linhas de resumo com estatísticas coloridas
        if any(x in line for x in ['ok=', 'changed=', 'unreachable=', 'failed=']):
            parts = []
            host = line.split(' ', 1)[0]
            
            stats_text = line.split(' : ')[1] if ' : ' in line else line
            stats = {}
            
            for stat in stats_text.split():
                if '=' in stat:
                    key, value = stat.split('=')
                    stats[key] = int(value)
            
            status_colors = {
                'ok': '#4CAF50',
                'changed': '#FF9800',
                'unreachable': '#F44336',
                'failed': '#F44336',
                'skipped': '#9E9E9E',
                'rescued': '#29B6F6',
                'ignored': '#BDBDBD'
            }
            
            result = (
                f'<div style="margin: 8px 0; padding: 12px 15px; background-color: #252526; '
                f'border-radius: 6px; font-family: monospace;">'
                f'<div style="margin-bottom: 8px; font-weight: 500;">Host: {host}</div>'
                f'<div style="display: flex; flex-wrap: wrap; gap: 8px;">'
            )
            
            for key, value in stats.items():
                color = status_colors.get(key, '#d4d4d4')
                result += (
                    f'<div style="padding: 4px 8px; background-color: {color}; color: white; '
                    f'border-radius: 4px; font-weight: 500; display: inline-flex; align-items: center;">'
                    f'{key}: {value}</div>'
                )
            
            result += '</div></div>'
            return result
        
        # Formata linhas de saída JSON com estilo especial para melhor leitura
        if line.strip().startswith('{') and line.strip().endswith('}'):
            try:
                import json
                json_obj = json.loads(line)
                json_str = json.dumps(json_obj, indent=2)
                return (
                    f'<div style="margin: 8px 15px; padding: 12px; background-color: #1e1e1e; '
                    f'border-radius: 6px; font-family: monospace; white-space: pre-wrap; '
                    f'font-size: 13px; overflow: auto; max-height: 400px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">{json_str}</div>'
                )
            except:
                pass
        
        # Formato padrão para outras linhas
        return (
            '<div style="color: #d4d4d4; margin: 4px 0 4px 20px; '
            'padding: 2px 0; font-family: monospace;">'
            f'{line.strip()}</div>'
        )
        
    
    
    @staticmethod
    def get_css():
        """Retorna o CSS necessário para estilizar a saída formatada"""
        return '''
        <style>
            .ansible-output-container {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
                margin: 20px 0;
                color: #d4d4d4;
                background-color: #1e1e1e;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .ansible-header {
                background: #252526;
                padding: 15px 20px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ansible-title {
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                color: white;
                margin: 0;
            }
            
            .ansible-actions {
                display: flex;
                gap: 10px;
            }
            
            .ansible-btn {
                background: none;
                border: 1px solid #555;
                color: #d4d4d4;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: all 0.2s ease;
            }
            
            .ansible-btn:hover {
                background: #333;
                border-color: #666;
            }
            
            .ansible-btn.primary {
                background: #0e639c;
                border-color: #0e639c;
                color: white;
            }
            
            .ansible-btn.primary:hover {
                background: #1177bb;
            }
            
            .ansible-progress {
                height: 4px;
                background: #333;
                width: 100%;
                overflow: hidden;
            }
            
            .ansible-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #0e639c, #73c991);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .ansible-content {
                padding: 0;
            }
            
            .ansible-tabs {
                display: flex;
                background: #252526;
                border-bottom: 1px solid #333;
            }
            
            .ansible-tab {
                padding: 10px 15px;
                font-size: 13px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s ease;
            }
            
            .ansible-tab.active {
                border-bottom-color: #0e639c;
                background: #1e1e1e;
            }
            
            .ansible-tab:hover:not(.active) {
                background: #2a2a2a;
            }
            
            .ansible-tab-content {
                display: none;
                padding: 15px;
                max-height: 500px;
                overflow: auto;
            }
            
            .ansible-tab-content.active {
                display: block;
            }
            
            /* Estilo para a lista de tarefas */
            .ansible-task-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .ansible-play {
                margin: 10px 0;
                padding: 10px 15px;
                background: #252526;
                border-radius: 6px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #569cd6;
            }
            
            .ansible-task-item {
                padding: 12px 15px;
                background: #252526;
                border-radius: 6px;
                display: flex;
                transition: all 0.2s ease;
                border-left: 3px solid transparent;
                cursor: pointer;
            }
            
            .ansible-task-item:hover {
                background: #2d2d2d;
            }
            
            .ansible-task-item.expanded {
                background: #2d2d2d;
            }
            
            .ansible-task-item.task-ok {
                border-left-color: #4CAF50;
            }
            
            .ansible-task-item.task-changed {
                border-left-color: #FF9800;
            }
            
            .ansible-task-item.task-failed {
                border-left-color: #F44336;
            }
            
            .ansible-task-item.task-skipped {
                border-left-color: #9E9E9E;
            }
            
            .ansible-task-item.task-unreachable {
                border-left-color: #F44336;
            }
            
            .task-icon {
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .task-icon svg {
                stroke: currentColor;
            }
            
            .task-content {
                flex: 1;
            }
            
            .task-name {
                font-weight: 500;
                margin-bottom: 5px;
            }
            
            .task-host {
                font-size: 12px;
                color: #999;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .task-detail {
                display: none;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #333;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 12px;
                white-space: pre-wrap;
                color: #d4d4d4;
            }
            
            .ansible-task-item.expanded .task-detail {
                display: block;
            }
            
            .task-toggle {
                margin-left: 10px;
                color: #999;
                transition: transform 0.2s ease;
            }
            
            .ansible-task-item.expanded .task-toggle {
                transform: rotate(90deg);
            }
            
            .task-ok .task-icon {
                color: #4CAF50;
            }
            
            .task-changed .task-icon {
                color: #FF9800;
            }
            
            .task-failed .task-icon {
                color: #F44336;
            }
            
            .task-skipped .task-icon {
                color: #9E9E9E;
            }
            
            .task-unreachable .task-icon {
                color: #F44336;
            }
            
            /* Estilo para saída bruta */
            .ansible-raw-output {
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 13px;
                white-space: pre-wrap;
                padding: 15px;
                color: #d4d4d4;
                line-height: 1.6;
            }
            
            /* Cores para diferentes partes da saída */
            .ansible-raw-output .play {
                color: #569cd6;
                font-weight: bold;
                padding: 5px 0;
                margin: 10px 0;
                border-bottom: 1px solid #333;
            }
            
            .ansible-raw-output .task {
                color: #9cdcfe;
                font-weight: bold;
                margin: 10px 0 5px 0;
            }
            
            .ansible-raw-output .ok {
                color: #4ec9b0;
            }
            
            .ansible-raw-output .changed {
                color: #dcdcaa;
            }
            
            .ansible-raw-output .failed {
                color: #f14c4c;
            }
            
            .ansible-raw-output .skipped {
                color: #808080;
            }
            
            .ansible-raw-output .unreachable {
                color: #f14c4c;
            }
            
            .ansible-raw-output .recap {
                color: #569cd6;
                font-weight: bold;
                margin: 10px 0;
                padding-top: 10px;
                border-top: 1px solid #333;
            }
            
            /* Estilo para o resumo */
            .ansible-summary {
                padding: 15px;
            }
            
            .ansible-summary-item {
                padding: 10px 15px;
                background: #252526;
                border-radius: 6px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ansible-summary-label {
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .ansible-summary-value {
                padding: 2px 10px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
            }
            
            .status-success {
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }
            
            .status-warning {
                background: rgba(255, 152, 0, 0.2);
                color: #FF9800;
            }
            
            .status-danger {
                background: rgba(244, 67, 54, 0.2);
                color: #F44336;
            }
            
            /* Animação de carregamento */
            .task-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #999;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Responsividade */
            @media (max-width: 768px) {
                .ansible-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .ansible-actions {
                    width: 100%;
                }
                
                .ansible-btn {
                    flex: 1;
                    justify-content: center;
                }
            }
        </style>
        
        <script>
            function toggleTaskDetail(taskId) {
                const taskElement = document.getElementById(taskId);
                if (taskElement) {
                    taskElement.classList.toggle('expanded');
                }
            }
            
            function switchTab(tabName) {
                // Hide all tabs
                document.querySelectorAll('.ansible-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.ansible-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show selected tab
                document.getElementById('tab-' + tabName).classList.add('active');
                document.getElementById('content-' + tabName).classList.add('active');
            }
            
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(function() {
                    alert('Saída copiada para a área de transferência!');
                }, function(err) {
                    console.error('Erro ao copiar texto:', err);
                });
            }
        </script>
        '''
    
    def __init__(self, job_id=None, playbook_name="Execução do Ansible"):
        """
        Inicializa o formatador
        
        Args:
            job_id: ID do job (opcional)
            playbook_name: Nome do playbook sendo executado
        """
        self.job_id = job_id or f"job_{self._generate_random_id()}"
        self.playbook_name = playbook_name
        self.plays = []
        self.tasks = []
        self.current_play = None
        self.current_task = None
        self.progress = 0
        self.status = "running"
        self.raw_output = ""
        self.start_time = None
        self.end_time = None
        self.stats = {
            "ok": 0,
            "changed": 0,
            "failed": 0,
            "skipped": 0,
            "unreachable": 0
        }
    
    def _generate_random_id(self):
        """Gera um ID aleatório para uso interno"""
        import uuid
        return uuid.uuid4().hex[:8]
    
    def update_progress(self, progress):
        """Atualiza o progresso da execução"""
        self.progress = min(100, max(0, progress))
    
    def add_play(self, name):
        """Adiciona um novo play"""
        play_id = f"play_{len(self.plays)}"
        play = {
            "id": play_id,
            "name": name,
            "tasks": []
        }
        self.plays.append(play)
        self.current_play = play
        
        play_line = f"PLAY [{name}]"
        self.raw_output += f'<div class="play">{play_line}</div>\n'
    
    def add_task(self, name, host=None):
        """Adiciona uma nova tarefa"""
        if not self.current_play:
            self.add_play("Unnamed Play")
        
        task_id = f"task_{len(self.tasks)}"
        task = {
            "id": task_id,
            "name": name,
            "play_id": self.current_play["id"],
            "status": None,
            "host": host or "localhost",
            "detail": ""
        }
        self.tasks.append(task)
        self.current_play["tasks"].append(task)
        self.current_task = task
        
        task_line = f"TASK [{name}]"
        self.raw_output += f'<div class="task">{task_line}</div>\n'
    
    def update_task_status(self, status, detail=""):
        """Atualiza o status da tarefa atual"""
        if not self.current_task:
            return
        
        self.current_task["status"] = status
        if detail:
            self.current_task["detail"] += detail + "\n"
        
        # Atualizar estatísticas
        if status in self.stats:
            self.stats[status] += 1
        
        # Atualizar saída bruta
        status_line = f"{status}: [{self.current_task['host']}]"
        if detail:
            status_line += f" => {detail}"
        
        status_class = status.lower()
        self.raw_output += f'<span class="{status_class}">{status_line}</span>\n'
    
    def add_play_recap(self):
        """Adiciona o resumo do play"""
        recap = "PLAY RECAP"
        self.raw_output += f'<div class="recap">{recap}</div>\n'
        
        for status, count in self.stats.items():
            self.raw_output += f'<span class="{status.lower()}">{status}={count} </span>'
        
        self.raw_output += "\n"
        
        # Determinar status geral
        if self.stats["failed"] > 0 or self.stats["unreachable"] > 0:
            self.status = "failed"
        else:
            self.status = "completed"
    
    def process_output_line(self, line):
        """Processa uma linha de saída do Ansible"""
        line = line.strip()
        if not line:
            return
        
        # Detectar Play
        if line.startswith("PLAY ["):
            play_name = line.split("PLAY [")[1].split("]")[0]
            self.add_play(play_name)
            return
        
        # Detectar Task
        if line.startswith("TASK ["):
            task_name = line.split("TASK [")[1].split("]")[0]
            self.add_task(task_name)
            return
        
        # Detectar status de tarefa
        for status in ["ok", "changed", "failed", "skipped", "unreachable"]:
            if line.startswith(f"{status}:"):
                parts = line.split(" => ", 1)
                host_part = parts[0].replace(f"{status}:", "").strip()
                detail_part = parts[1] if len(parts) > 1 else ""
                
                if not self.current_task:
                    self.add_task("Unnamed Task", host_part)
                else:
                    self.current_task["host"] = host_part
                
                self.update_task_status(status, detail_part)
                return
        
        # Detectar Play Recap
        if line.startswith("PLAY RECAP"):
            self.add_play_recap()
            return
        
        # Adicionar linha à saída bruta
        self.raw_output += line + "\n"
        
        # Se temos uma tarefa atual e não é uma linha especial, adicionar ao detalhe
        if self.current_task:
            self.current_task["detail"] += line + "\n"
    
    def render_html(self):
        """Renderiza a saída formatada como HTML"""
        # Progresso calculado com base nas estatísticas
        total_tasks = sum(self.stats.values())
        if total_tasks > 0:
            self.progress = min(100, int((total_tasks / max(1, len(self.tasks))) * 100))
        
        # Se não temos progresso definido e o status é completed, definir como 100%
        if self.status == "completed" and self.progress < 100:
            self.progress = 100
        
        html = self.get_css()
        
        # Container principal
        html += f'''
        <div class="ansible-output-container" id="ansible-{self.job_id}">
            <div class="ansible-header">
                <h3 class="ansible-title">
                    {self.ICONS['play']}
                    {self.playbook_name}
                </h3>
                <div class="ansible-actions">
                    <button class="ansible-btn" onclick="copyToClipboard(`{self._escape_js(self.raw_output)}`)">
                        {self.ICONS['clipboard']}
                        Copiar Saída
                    </button>
                    <button class="ansible-btn primary" onclick="window.location.reload()">
                        Recarregar
                    </button>
                </div>
            </div>
            
            <div class="ansible-progress">
                <div class="ansible-progress-bar" style="width: {self.progress}%"></div>
            </div>
            
            <div class="ansible-tabs">
                <div class="ansible-tab active" id="tab-tasks" onclick="switchTab('tasks')">
                    Tarefas
                </div>
                <div class="ansible-tab" id="tab-summary" onclick="switchTab('summary')">
                    Resumo
                </div>
                <div class="ansible-tab" id="tab-output" onclick="switchTab('output')">
                    Saída Completa
                </div>
            </div>
            
            <div class="ansible-content">
                <!-- Visualização de Tarefas -->
                <div class="ansible-tab-content active" id="content-tasks">
                    <div class="ansible-task-list">
        '''
        
        # Renderizar plays e tarefas
        for play in self.plays:
            html += f'''
                        <div class="ansible-play">
                            {self.ICONS['list']}
                            {play['name']}
                        </div>
            '''
            
            for task in play['tasks']:
                status = task['status'] or 'running'
                status_class = f"task-{status}" if status else ""
                icon = self.STATUS_STYLES.get(status, {}).get('icon', 'chevron-right')
                
                if not icon or icon not in self.ICONS:
                    icon = 'chevron-right'
                
                detail = task['detail'].strip()
                
                html += f'''
                        <div class="ansible-task-item {status_class}" id="{task['id']}" onclick="toggleTaskDetail('{task['id']}')">
                            <div class="task-icon">
                                {self.ICONS[icon] if status else '<div class="task-spinner"></div>'}
                            </div>
                            <div class="task-content">
                                <div class="task-name">{task['name']}</div>
                                <div class="task-host">
                                    <span>Host: {task['host']}</span>
                                    <span class="task-toggle">{self.ICONS['chevron-right']}</span>
                                </div>
                                <div class="task-detail">{detail if detail else "Sem detalhes disponíveis."}</div>
                            </div>
                        </div>
                '''
        
        # Fechamento da lista de tarefas
        html += '''
                    </div>
                </div>
        '''
        
        # Resumo
        status_text = "Em andamento" if self.status == "running" else "Concluído com sucesso" if self.status == "completed" else "Falhou"
        status_class = "status-warning" if self.status == "running" else "status-success" if self.status == "completed" else "status-danger"
        
        html += f'''
                <!-- Resumo -->
                <div class="ansible-tab-content" id="content-summary">
                    <div class="ansible-summary">
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                Status Geral
                            </div>
                            <div class="ansible-summary-value {status_class}">
                                {status_text}
                            </div>
                        </div>
                        
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                <div class="task-icon" style="color: #4CAF50">
                                    {self.ICONS['check-circle']}
                                </div>
                                Tarefas OK
                            </div>
                            <div class="ansible-summary-value status-success">
                                {self.stats['ok']}
                            </div>
                        </div>
                        
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                <div class="task-icon" style="color: #FF9800">
                                    {self.ICONS['edit']}
                                </div>
                                Tarefas Alteradas
                            </div>
                            <div class="ansible-summary-value status-warning">
                                {self.stats['changed']}
                            </div>
                        </div>
                        
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                <div class="task-icon" style="color: #F44336">
                                    {self.ICONS['alert-circle']}
                                </div>
                                Tarefas Falhas
                            </div>
                            <div class="ansible-summary-value status-danger">
                                {self.stats['failed']}
                            </div>
                        </div>
                        
                       <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                <div class="task-icon" style="color: #9E9E9E">
                                    {self.ICONS['skip-forward']}
                                </div>
                                Tarefas Ignoradas
                            </div>
                            <div class="ansible-summary-value">
                                {self.stats['skipped']}
                            </div>
                        </div>
                        
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                <div class="task-icon" style="color: #F44336">
                                    {self.ICONS['wifi-off']}
                                </div>
                                Hosts Inacessíveis
                            </div>
                            <div class="ansible-summary-value status-danger">
                                {self.stats['unreachable']}
                            </div>
                        </div>
                        
                        <div class="ansible-summary-item">
                            <div class="ansible-summary-label">
                                Progresso
                            </div>
                            <div class="ansible-summary-value {status_class}">
                                {self.progress}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Saída Completa -->
                <div class="ansible-tab-content" id="content-output">
                    <div class="ansible-raw-output">
                        {self.raw_output}
                    </div>
                </div>
            </div>
        </div>
        '''
        
        return html
    
    def _escape_js(self, text):
        """Escapa texto para uso em JavaScript"""
        if not text:
            return ""
        return text.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    
    def parse_ansible_output(self, output):
        """
        Analisa a saída completa do Ansible e atualiza o formatador
        
        Args:
            output: String com a saída completa do Ansible
        """
        lines = output.strip().split('\n')
        for line in lines:
            self.process_output_line(line)
    
    @staticmethod
    def format_event(event):
        """
        Formata um evento do Ansible Runner
        
        Args:
            event: Dicionário contendo dados do evento Ansible
        
        Returns:
            Instância do formatador processada
        """
        if not event or 'event' not in event:
            return None
            
        formatter = AnsibleOutputFormatter()
        event_type = event['event']
        event_data = event.get('event_data', {})
        
        if event_type == 'playbook_on_play_start':
            play_name = event_data.get('name', 'unnamed play')
            formatter.add_play(play_name)
            
        elif event_type == 'playbook_on_task_start':
            task_name = event_data.get('name', event_data.get('task', 'unnamed task'))
            formatter.add_task(task_name)
            
        elif event_type in ['runner_on_ok', 'runner_on_failed', 'runner_on_skipped', 'runner_on_unreachable']:
            status = event_type.replace('runner_on_', '')
            host = event_data.get('host', 'unknown')
            result = event_data.get('res', {})
            formatter.current_task['host'] = host
            formatter.update_task_status(status, str(result))
            
        elif event_type == 'playbook_on_stats':
            stats = event_data.get('stats', {})
            for host, host_stats in stats.items():
                for stat, value in host_stats.items():
                    if stat in formatter.stats and value > 0:
                        formatter.stats[stat] += value
            formatter.add_play_recap()
            
        return formatter
    
    @staticmethod
    def create_from_output(output, job_id=None, playbook_name=None):
        """
        Cria uma instância do formatador a partir de uma saída bruta do Ansible
        
        Args:
            output: String com a saída do Ansible
            job_id: ID opcional do job
            playbook_name: Nome opcional do playbook
            
        Returns:
            Instância do formatador processada
        """
        formatter = AnsibleOutputFormatter(job_id, playbook_name)
        formatter.parse_ansible_output(output)
        return formatter
    
    @staticmethod
    def register_flask_route(app):
        """
        Registra uma rota na aplicação Flask para renderizar a saída do Ansible
        
        Args:
            app: Instância do aplicativo Flask
        """
        @app.route('/ansible/output/<job_id>')
        def ansible_output(job_id):
            from flask import render_template_string, request
            
            # Obtém o status da execução
            status_response = app.view_functions['get_status'](job_id)
            import json
            status_data = json.loads(status_response.get_data(as_text=True))
            
            # Criar o formatador
            formatter = AnsibleOutputFormatter.create_from_output(
                status_data.get('output', ''),
                job_id,
                request.args.get('playbook', 'Execução do Ansible')
            )
            
            # Atualizar o progresso e status
            formatter.progress = status_data.get('progress', 0)
            formatter.status = status_data.get('status', 'running')
            
            # Renderizar o HTML
            html = formatter.render_html()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Saída do Ansible</title>
            </head>
            <body style="background-color: #1e1e1e; margin: 0; padding: 20px;">
                {{ html|safe }}
                
                <script>
                    // Se o status ainda for "running", recarregar a página a cada 5 segundos
                    {% if status == 'running' %}
                    setTimeout(function() {
                        window.location.reload();
                    }, 5000);
                    {% endif %}
                </script>
            </body>
            </html>
            ''', html=html, status=formatter.status)
                        
                                
                                
                                
                                

# Funções de gerenciamento de inventário
def ensure_inventory_exists():
    global INVENTORY_FILE
    
    os.makedirs(GROUP_VARS_DIR, exist_ok=True)
    inventory_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.yml')
    
    if not os.path.exists(inventory_path):
        # Estrutura padrão do inventário YAML
        default_inventory = {
            'all': {
                'children': {
                    'linux': {
                        'hosts': {},
                        'vars': {
                            'ansible_connection': 'ssh',
                            'ansible_port': 22
                        }
                    },
                    'windows': {
                        'hosts': {},
                        'vars': {
                            'ansible_connection': 'winrm',
                            'ansible_winrm_server_cert_validation': 'ignore'
                        }
                    }
                }
            }
        }
        
        with open(inventory_path, 'w') as f:
            f.write("# Arquivo de Inventário Ansible (YAML)\n")
            f.write("# Gerado automaticamente pela Automato Platform\n\n")
            yaml.dump(default_inventory, f, default_flow_style=False, sort_keys=False)
        
        # Atualiza a constante INVENTORY_FILE para referenciar o arquivo YAML
        INVENTORY_FILE = inventory_path

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
    
    try:
        inventory_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.yml')
        
        # Verifica se o arquivo existe
        if not os.path.exists(inventory_path):
            logger.warning(f"Arquivo YAML de inventário não encontrado: {inventory_path}")
            return linux_hosts, windows_hosts
        
        # Carrega o arquivo YAML
        with open(inventory_path, 'r') as f:
            inventory_data = yaml.safe_load(f)
        
        # Verifica se a estrutura está correta
        if not inventory_data or 'all' not in inventory_data or 'children' not in inventory_data['all']:
            logger.warning("Estrutura de inventário YAML inválida")
            return linux_hosts, windows_hosts
        
        # Extrai hosts Linux
        if 'linux' in inventory_data['all']['children'] and 'hosts' in inventory_data['all']['children']['linux']:
            for host_name, host_vars in inventory_data['all']['children']['linux']['hosts'].items():
                user = host_vars.get('ansible_user', '')
                password = host_vars.get('ansible_ssh_pass', '')
                key_content = host_vars.get('ansible_ssh_private_key_content', '')
                
                formatted_line = format_inventory_line(host_name, user, password, key_content, 'linux')
                linux_hosts.append(formatted_line)
        
        # Extrai hosts Windows
        if 'windows' in inventory_data['all']['children'] and 'hosts' in inventory_data['all']['children']['windows']:
            for host_name, host_vars in inventory_data['all']['children']['windows']['hosts'].items():
                user = host_vars.get('ansible_user', '')
                password = host_vars.get('ansible_password', '')
                
                formatted_line = format_inventory_line(host_name, user, password, '', 'windows')
                windows_hosts.append(formatted_line)
        
        return linux_hosts, windows_hosts
        
    except Exception as e:
        logger.error(f"Erro ao analisar inventário YAML: {str(e)}")
        return linux_hosts, windows_hosts
    
def get_python_interpreter(os_distribution, os_version):
    """
    Determina o intérprete Python padrão para diferentes distribuições Linux
    
    Args:
        os_distribution (str): Nome da distribuição (ubuntu, oracle, rhel)
        os_version (str): Versão da distribuição
    
    Returns:
        dict: Dicionário com informações de interpretadores Python
    """
    python_interpreters = {
        'py27': '/usr/bin/python2.7',
        'py36': '/usr/bin/python3.6',
        'py37': '/usr/bin/python3.7',
        'py38': '/usr/bin/python3.8',
        'py39': '/usr/bin/python3.9',
        'py310': '/usr/bin/python3.10',
        'py311': '/usr/bin/python3.11',
        'py312': '/usr/bin/python3.12'
    }
    
    # Mapeamento de distribuições e versões para Python padrão
    distribution_python_map = {
        'oracle': {
            '8': {'default_python': 'py36', 'available_pythons': ['py36', 'py38']},
            '9': {'default_python': 'py39', 'available_pythons': ['py39']}
        },
        'ubuntu': {
            '20.04': {'default_python': 'py38', 'available_pythons': ['py38']},
            '22.04': {'default_python': 'py310', 'available_pythons': ['py310']},
            '24.04': {'default_python': 'py312', 'available_pythons': ['py312']}
        },
        'rhel': {
            '8': {'default_python': 'py36', 'available_pythons': ['py36', 'py38']},
            '9': {'default_python': 'py39', 'available_pythons': ['py39']}
        }
    }
    
    # Normaliza entrada
    os_distribution = os_distribution.lower()
    os_version = str(os_version)
    
    # Busca configuração
    if (os_distribution in distribution_python_map and 
        os_version in distribution_python_map[os_distribution]):
        config = distribution_python_map[os_distribution][os_version]
        
        return {
            'python_interpreters': {
                py: python_interpreters.get(py, f'/usr/bin/python{py[2:]}') 
                for py in config['available_pythons']
            },
            'ansible_python_interpreter': python_interpreters[config['default_python']]
        }
    
    # Fallback para Python 3.8 se não encontrar
    return {
        'python_interpreters': {
            'py38': python_interpreters['py38']
        },
        'ansible_python_interpreter': python_interpreters['py38']
    } 

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

def ensure_extended_directory_structure():
    """Cria estrutura de diretórios para sistemas operacionais específicos"""
    base_path = Path(__file__).parent
    os_systems = {
        "linux": ["oracle8", "oracle9", "ubuntu20", "ubuntu22", "ubuntu24", "rhel8", "rhel9"],
        "windows": ["server2019", "server2022"]
    }
    categories = ["agents", "baseline", "config", "security"]
    
    for os_type, systems in os_systems.items():
        for system in systems:
            system_path = base_path / "playbooks" / os_type / system
            system_path.mkdir(parents=True, exist_ok=True)
            for category in categories:
                category_path = system_path / category
                category_path.mkdir(parents=True, exist_ok=True)
                readme_path = category_path / "README.md"
                if not readme_path.exists():
                    with open(readme_path, 'w') as f:
                        f.write(f"# Playbooks {system.capitalize()} - {category.capitalize()}\n\n")
                        f.write(f"Coloque seus playbooks YAML para {system} na categoria {category} neste diretório.\n")
    
    logger.info("Estrutura de diretórios estendida criada com sucesso")

def ensure_directory_structure():
    """Garante a estrutura de diretórios para playbooks e arquivos"""
    base_path = Path(__file__).parent
    paths = [
        base_path / "playbooks" / "windows" / category for category in ["agents", "security", "baseline", "config"]
    ] + [
        base_path / "playbooks" / "linux" / category for category in ["agents", "security", "baseline", "config"]
    ]
    file_paths = [base_path / "arquivos" / os_type for os_type in ["windows", "linux"]]
    
    for path in paths + file_paths:
        path.mkdir(parents=True, exist_ok=True)
    
    for path in paths:
        readme_path = path / "README.md"
        if not readme_path.exists():
            with open(readme_path, 'w') as f:
                f.write(f"# Playbooks {path.parent.name.capitalize()} - {path.name.capitalize()}\n\n")
                f.write("Coloque seus playbooks YAML neste diretório.\n")
    
    for path in file_paths:
        readme_path = path / "README.md"
        if not readme_path.exists():
            with open(readme_path, 'w') as f:
                f.write(f"# Arquivos para {path.name.capitalize()}\n\n")
                f.write("Coloque seus scripts e arquivos de instalação neste diretório.\n")

# Inicializa a estrutura de diretórios
ensure_directory_structure()

# Classe AnsibleManager
# Classe AnsibleManager
class AnsibleManager:
    def __init__(self):
        self.base_path = Path(__file__).parent
        # Altere o caminho do inventário para usar inventory.yml
        self.inventory_path = self.base_path / "inventory" / "inventory.yml"
        self.playbook_path = self.base_path / "playbooks"
        self.arquivos_path = self.base_path / "arquivos"
        self.running_playbooks = {}
        
        self.inventory_path.parent.mkdir(parents=True, exist_ok=True)
        self.playbook_path.mkdir(parents=True, exist_ok=True)
        self.arquivos_path.mkdir(parents=True, exist_ok=True)
        
        for os_type in ["windows", "linux"]:
            (self.playbook_path / os_type).mkdir(exist_ok=True)
            (self.arquivos_path / os_type).mkdir(exist_ok=True)
            for category in ["agents", "security", "baseline", "config"]:
                (self.playbook_path / os_type / category).mkdir(exist_ok=True)
        
        # Criar playbooks específicos para coletar fatos
        self.create_linux_facts_playbook()
        self.create_windows_facts_playbook()
        
        logger.info(f"Inicializado com inventory_path: {self.inventory_path}")
        logger.info(f"Inicializado com playbook_path: {self.playbook_path}")
        logger.info(f"Inicializado com arquivos_path: {self.arquivos_path}")
    
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


    def create_linux_facts_playbook(self):
        """Cria playbook para coleta de fatos de hosts Linux"""
        playbook_path = self.playbook_path / "gather_facts_linux.yml"
        
        if playbook_path.exists():
            return
            
        logger.info(f"Criando playbook gather_facts_linux.yml")
        content = """---
    - name: Coletar Informações do Host Linux
    hosts: all
    gather_facts: yes
    become: no
    
    tasks:
        - name: Coletar informações básicas do sistema
        set_fact:
            system_info: "{{ ansible_distribution }} {{ ansible_distribution_version }}{% if ansible_os_family == 'Debian' %} (Debian){% elif ansible_os_family == 'RedHat' %} (RedHat){% endif %}"

        - name: Formatar informações do sistema
        set_fact:
            formatted_info:
            hostname: "{{ ansible_hostname }}"
            private_ip: "{{ ansible_default_ipv4.address | default('N/A') }}"
            system: "{{ system_info }}"

        - name: Obter IP Público
        uri:
            url: https://api.ipify.org?format=json
            return_content: yes
        register: public_ip_response
        ignore_errors: yes

        - name: Criar JSON com informações
        set_fact:
            host_details:
            hostname: "{{ formatted_info.hostname }}"
            private_ip: "{{ formatted_info.private_ip }}"
            public_ip: "{{ public_ip_response.json.ip | default('N/A') }}"
            system: "{{ formatted_info.system }}"

        - name: Debug informações coletadas
        debug:
            var: host_details
    """
        with open(playbook_path, 'w') as f:
            f.write(content)
            
            

    def create_windows_facts_playbook(self):
        """Cria playbook para coleta de fatos de hosts Windows"""
        playbook_path = self.playbook_path / "gather_facts_windows.yml"
        
        if playbook_path.exists():
            # Remover o playbook existente para garantir que ele seja recriado corretamente
            os.remove(playbook_path)
            
        logger.info(f"Criando playbook gather_facts_windows.yml")
        content = """---
    - name: Coletar Informações do Host Windows
    hosts: all
    gather_facts: yes
    vars:
        ansible_connection: winrm
        ansible_winrm_transport: ntlm
        ansible_winrm_server_cert_validation: ignore
    
    tasks:
        - name: Coletar informações básicas do sistema Windows
        set_fact:
            system_info: "{{ ansible_distribution }} {{ ansible_distribution_version | default('') }}"

        - name: Formatar informações do sistema Windows
        set_fact:
            formatted_info:
            hostname: "{{ ansible_hostname }}"
            private_ip: "{{ ansible_ip_addresses[0] | default('N/A') }}"
            system: "{{ system_info }}"

        - name: Obter IP Público Windows
        win_uri:
            url: https://api.ipify.org?format=json
            return_content: yes
        register: public_ip_response
        ignore_errors: yes

        - name: Definir IP público alternativo
        set_fact:
            public_ip_alt: "{{ inventory_hostname }}"
        when: not public_ip_response.status_code is defined or public_ip_response.status_code != 200
        
        - name: Criar JSON com informações Windows
        set_fact:
            host_details:
            hostname: "{{ formatted_info.hostname }}"
            private_ip: "{{ formatted_info.private_ip | default(inventory_hostname) }}"
            public_ip: "{{ public_ip_response.json.ip | default(public_ip_alt) | default(inventory_hostname) }}"
            system: "{{ formatted_info.system | default('Windows Server') }}"

        - name: Debug informações coletadas Windows
        debug:
            var: host_details
            verbosity: 0
    """
        with open(playbook_path, 'w') as f:
            f.write(content)      

    def get_execution_status(self, job_id: str) -> dict:
        if job_id not in self.running_playbooks:
            return {"status": "not_found", "output": "", "progress": 0}
        return self.running_playbooks[job_id]
    
    def gather_host_facts(self, hostname: str) -> dict:
        try:
            job_id = f"gather_facts_{hostname}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            logger.info(f"Iniciando coleta de fatos para {hostname} (Job ID: {job_id})")
            
            # Determinar se o host é Windows ou Linux
            inventory_yaml_path = self.base_path / "inventory" / "inventory.yml"
            is_windows = False
            
            if inventory_yaml_path.exists():
                with open(inventory_yaml_path, 'r') as f:
                    inventory_data = yaml.safe_load(f)
                    
                if 'all' in inventory_data and 'children' in inventory_data['all']:
                    if 'windows' in inventory_data['all']['children'] and 'hosts' in inventory_data['all']['children']['windows']:
                        if hostname in inventory_data['all']['children']['windows']['hosts']:
                            is_windows = True
            
            # Sempre recriar os playbooks para garantir que estejam atualizados e corretamente formatados
            if is_windows:
                self.create_windows_facts_playbook()
                gather_facts_path = self.playbook_path / "gather_facts_windows.yml"
                
                # Configurações específicas para Windows
                ansible_opts = [
                    '-e', 'ansible_winrm_transport=ntlm',
                    '-e', 'ansible_winrm_server_cert_validation=ignore'
                ]
                system_type = "Windows Server"
            else:
                self.create_linux_facts_playbook()
                gather_facts_path = self.playbook_path / "gather_facts_linux.yml"
                ansible_opts = []
                system_type = "Linux"
            
            # Adicionar verbosidade para ajudar na depuração
                    
            ansible_playbook_path = "ansible-playbook"
            cmd = [
                ansible_playbook_path,
                str(gather_facts_path),
                '-i', str(self.inventory_path),
                '--limit', hostname
            ] + ansible_opts
            
            logger.info(f"Executando comando: {' '.join(cmd)}")
            
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)
            stdout, _ = process.communicate()
            
            # Registrar a saída completa para depuração
            logger.debug(f"Saída completa do playbook para {hostname}:\n{stdout}")
            
            # Nova abordagem: Procurar pelo bloco de facts delimitado
            facts_match = re.search(r'FACTS_BEGIN\s*(.*?)\s*FACTS_END', stdout, re.DOTALL)
            if facts_match:
                facts_block = facts_match.group(1)
                host_details = {}
                
                # Extrair cada linha de propriedade do bloco
                for line in facts_block.strip().split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        host_details[key.strip()] = value.strip()
                
                if all(k in host_details for k in ['hostname', 'public_ip', 'private_ip', 'system']):
                    logger.info(f"Fatos extraídos com sucesso para {hostname}: {host_details}")
                    return host_details
            
            # Se a nova abordagem falhar, tentamos as anteriores
            
            # Tentar encontrar o bloco JSON nos resultados
            host_details_output = re.findall(r'TASK \[Debug informações coletadas.*?\].*?\n.*?({.*?})', stdout, re.DOTALL)
            if host_details_output:
                debug_output = host_details_output[-1]  # Pegar o último resultado que encontramos
                try:
                    # Limpar a saída para facilitar o parsing
                    cleaned_output = re.sub(r'ok:.*?\=>\s*', '', debug_output)
                    cleaned_output = cleaned_output.strip()
                    logger.debug(f"Tentando parsear JSON: {cleaned_output}")
                    host_details = json.loads(cleaned_output)
                    
                    # Verificar se temos todos os campos esperados
                    if all(k in host_details for k in ['hostname', 'public_ip', 'private_ip', 'system']):
                        logger.info(f"Fatos extraídos com sucesso para {hostname}: {host_details}")
                        return host_details
                except Exception as e:
                    logger.error(f"Erro ao parsear saída do Ansible para {hostname}: {str(e)}")
            
            # Método alternativo - procurar a variável host_details no YAML
            json_match = re.search(r'{\s*"host_details":\s*({[^}]*})', stdout)
            if json_match:
                try:
                    json_str = "{" + json_match.group(1) + "}"
                    data = json.loads(json_str)
                    logger.info(f"Fatos extraídos via regex JSON para {hostname}: {data}")
                    return data
                except json.JSONDecodeError as e:
                    logger.error(f"Erro decodificando JSON: {e}")
            
            # Extração de campos específicos via regex se o JSON completo falhar
            hostname_match = re.search(r'"hostname":\s*"([^"]+)"', stdout)
            public_ip_match = re.search(r'"public_ip":\s*"([^"]+)"', stdout)
            private_ip_match = re.search(r'"private_ip":\s*"([^"]+)"', stdout)
            system_match = re.search(r'"system":\s*"([^"]+)"', stdout)
            
            # Verificar se temos pelo menos algumas informações
            if hostname_match or public_ip_match or private_ip_match or system_match:
                host_details = {
                    "hostname": hostname_match.group(1) if hostname_match else hostname,
                    "public_ip": public_ip_match.group(1) if public_ip_match else hostname,
                    "private_ip": private_ip_match.group(1) if private_ip_match else hostname,
                    "system": system_match.group(1) if system_match else system_type
                }
                
                logger.info(f"Fatos extraídos via regex para {hostname}: {host_details}")
                return host_details
            
            # Fallback para valores básicos
            basic_details = {
                "hostname": hostname,
                "public_ip": hostname,
                "private_ip": hostname,
                "system": system_type
            }
            
            logger.warning(f"Usando informações básicas para {hostname}: {basic_details}")
            return basic_details
            
        except Exception as e:
            logger.error(f"Erro ao coletar fatos do host {hostname}: {str(e)}", exc_info=True)
            return {
                "hostname": hostname,
                "public_ip": hostname,
                "private_ip": hostname,
                "system": "Windows Server" if is_windows else "Linux"
            }

    def create_gather_facts_playbook(self, playbook_path):
        """Cria playbook para coleta de fatos"""
        logger.info(f"Criando playbook gather_facts.yml em {playbook_path}")
        content = """---
- name: Coletar Informações do Host
  hosts: all
  gather_facts: yes
  become: no
  
  tasks:
    - name: Coletar informações básicas do sistema
      set_fact:
        system_info: "{{ ansible_distribution }} {{ ansible_distribution_version }}{% if ansible_os_family == 'Debian' %} (Debian){% elif ansible_os_family == 'RedHat' %} (RedHat){% endif %}"

    - name: Formatar informações do sistema
      set_fact:
        formatted_info:
          hostname: "{{ ansible_hostname }}"
          private_ip: "{{ ansible_default_ipv4.address | default('N/A') }}"
          system: "{{ system_info }}"

    - name: Obter IP Público
      uri:
        url: https://api.ipify.org?format=json
        return_content: yes
      register: public_ip_response
      ignore_errors: yes

    - name: Criar JSON com informações
      set_fact:
        host_details:
          hostname: "{{ formatted_info.hostname }}"
          private_ip: "{{ formatted_info.private_ip }}"
          public_ip: "{{ public_ip_response.json.ip | default('N/A') }}"
          system: "{{ formatted_info.system }}"

    - name: Debug informações coletadas
      debug:
        var: host_details
"""
        with open(playbook_path, 'w') as f:
            f.write(content)
            
    def get_os_info(os_value):
        parts = os_value.split('-')
        if len(parts) >= 3:
            return {
                'os_type': parts[0],                  # 'linux' ou 'windows'
                'os_distribution': parts[1],          # 'ubuntu', 'oracle', 'rhel', 'server', etc.
                'os_version': '-'.join(parts[2:])     # '22.04', '8', '2019', etc.
            }
        else:
            # Valores padrão para compatibilidade
            return {
                'os_type': parts[0] if parts else 'linux',
                'os_distribution': 'ubuntu',
                'os_version': '22.04'
            }        

    def handle_ansible_event(self, job_id: str, event: dict):
        """Processa eventos do Ansible e atualiza o status da execução do playbook"""
        if job_id not in self.running_playbooks:
            return
            
        try:
            formatted_output = AnsibleOutputFormatter.format_event(event)
            
            if formatted_output:
                if 'output' not in self.running_playbooks[job_id]:
                    self.running_playbooks[job_id]['output'] = ''
                self.running_playbooks[job_id]['output'] += formatted_output
            
            if event['event'] == 'playbook_on_stats':
                self.running_playbooks[job_id]['progress'] = 100
                stats = event.get('event_data', {}).get('stats', {})
                failed_hosts = sum(
                    1 for host_stats in stats.values() 
                    if host_stats.get('failures', 0) > 0 or host_stats.get('unreachable', 0) > 0
                )
                self.running_playbooks[job_id]['status'] = 'failed' if failed_hosts > 0 else 'completed'
            else:
                elapsed = (datetime.now() - self.running_playbooks[job_id]['start_time']).total_seconds()
                self.running_playbooks[job_id]['progress'] = min(95, (elapsed / 60) * 100)
                
        except Exception as e:
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
        
    @app.route("/api/host/<hostname>")
    def get_host_facts(hostname):
        """
        Endpoint API para coletar fatos de um host específico.
        Útil para atualizar os dados de um host no card de execução.
        """
        try:
            logger.info(f"Solicitada coleta de fatos para o host: {hostname}")
            
            # Busca informações do inventário primeiro
            hosts_inventory = ansible_mgr.load_inventory()
            if hostname not in hosts_inventory:
                return jsonify({
                    "error": f"Host {hostname} não encontrado no inventário"
                }), 404
                
            # Coleta os fatos do host
            host_facts = ansible_mgr.gather_host_facts(hostname)
            
            if not host_facts:
                return jsonify({
                    "error": f"Não foi possível coletar fatos para o host {hostname}"
                }), 500
                
            return jsonify(host_facts)
        
        except Exception as e:
            logger.error(f"Erro ao coletar fatos para o host {hostname}: {str(e)}", exc_info=True)
            return jsonify({
                "error": str(e),
                "hostname": hostname,
                "public_ip": hostname,
                "private_ip": hostname,
                "system": "Sistema não identificado"
            }), 500

    def get_playbooks(self) -> list:
        try:
            logger.debug(f"Buscando playbooks em: {self.playbook_path}")
            playbooks = []
            if not self.playbook_path.exists():
                logger.error(f"Diretório de playbooks não encontrado: {self.playbook_path}")
                return []

            folder_to_category = {
                "agents": "agentes",
                "baseline": "baseline",
                "config": "configuracoes",
                "security": "seguranca"
            }
            ignored_files = {"gather_facts.yml", "README.md"}

            linux_dir = self.playbook_path / "linux"
            if linux_dir.exists():
                for os_dir in linux_dir.iterdir():
                    if os_dir.is_dir():
                        os_name = os_dir.name
                        for category_dir in os_dir.iterdir():
                            if category_dir.is_dir() and category_dir.name in folder_to_category:
                                category_name = category_dir.name
                                ui_category = folder_to_category.get(category_name, "outros")
                                for file in category_dir.glob("*.yml"):
                                    if file.name not in ignored_files:
                                        try:
                                            meta = self._extract_metadata_from_file(
                                                file,
                                                default_os="linux",
                                                default_category=ui_category
                                            )
                                            playbooks.append(meta)
                                            logger.debug(f"Adicionada playbook de linux/{os_name}/{category_name}: {file.name}")
                                        except Exception as e:
                                            logger.error(f"Erro ao processar playbook {file.name}: {str(e)}", exc_info=True)

            windows_dir = self.playbook_path / "windows"
            if windows_dir.exists():
                for os_dir in windows_dir.iterdir():
                    if os_dir.is_dir():
                        os_name = os_dir.name
                        for category_dir in os_dir.iterdir():
                            if category_dir.is_dir() and category_dir.name in folder_to_category:
                                category_name = category_dir.name
                                ui_category = folder_to_category.get(category_name, "outros")
                                for file in category_dir.glob("*.yml"):
                                    if file.name not in ignored_files:
                                        try:
                                            meta = self._extract_metadata_from_file(
                                                file,
                                                default_os="windows",
                                                default_category=ui_category
                                            )
                                            playbooks.append(meta)
                                            logger.debug(f"Adicionada playbook de windows/{os_name}/{category_name}: {file.name}")
                                        except Exception as e:
                                            logger.error(f"Erro ao processar playbook {file.name}: {str(e)}", exc_info=True)

            logger.info(f"Total de playbooks encontradas: {len(playbooks)}")
            return sorted(playbooks, key=lambda x: x["name"])
        except Exception as e:
            logger.error(f"Erro ao listar playbooks: {str(e)}", exc_info=True)
            return []

    def _extract_metadata_from_file(self, file_path, default_os="all", default_category="outros"):
        """Extrai metadados de um arquivo YAML de playbook"""
        try:
            meta = {
                "name": file_path.name,
                "path": str(file_path),
                "category": default_category,
                "os": default_os,
                "description": f"Playbook {file_path.stem}"
            }
            
            with file_path.open(encoding='utf-8') as f:
                content = yaml.safe_load(f)
                
                if content and isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict):
                            if any(key in item for key in ["category", "os", "description"]):
                                meta.update({
                                    "category": item.get("category", meta["category"]),
                                    "os": item.get("os", meta["os"]),
                                    "description": item.get("description", meta["description"])
                                })
                                break
                            
                            if "vars" in item and isinstance(item["vars"], dict):
                                vars_dict = item["vars"]
                                if any(key in vars_dict for key in ["category", "os", "description"]):
                                    meta.update({
                                        "category": vars_dict.get("category", meta["category"]),
                                        "os": vars_dict.get("os", meta["os"]),
                                        "description": vars_dict.get("description", meta["description"])
                                    })
                                    break
                                
            if meta["description"] == f"Playbook {file_path.stem}":
                name_parts = file_path.stem.replace('_', ' ').replace('-', ' ').split('.')
                meta["description"] = f"Playbook {name_parts[0].capitalize()}"
            
            return meta
        except Exception as e:
            logger.error(f"Erro ao extrair metadados de {file_path}: {str(e)}", exc_info=True)
            return {
                "name": file_path.name,
                "path": str(file_path),
                "category": default_category,
                "os": default_os,
                "description": f"Playbook {file_path.stem}"
            }
    def run_playbook(self, playbook_path: str, hosts: list) -> str:
        """Executa um playbook com os hosts especificados."""
        return self.run_playbook_with_vars(playbook_path, hosts, None)
        
            
    def run_playbook_with_vars(self, playbook_path: str, hosts: list, extra_vars: dict = None) -> str:
        """Executa um playbook com variáveis extras."""
        job_id = f"{os.path.basename(playbook_path)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        def run():
            try:
                # Verificar existência do inventário e playbook
                if not os.path.exists(self.inventory_path):
                    logger.error(f"Arquivo de inventário não encontrado: {self.inventory_path}")
                    self.running_playbooks[job_id]["status"] = "failed"
                    self.running_playbooks[job_id]["output"] += f"\nErro: Arquivo de inventário não encontrado"
                    return
                    
                if not os.path.exists(playbook_path):
                    logger.error(f"Arquivo de playbook não encontrado: {playbook_path}")
                    self.running_playbooks[job_id]["status"] = "failed"
                    self.running_playbooks[job_id]["output"] += f"\nErro: Arquivo de playbook não encontrado"
                    return
                
                # Verificar se é um playbook baseline com hosts múltiplos
                is_baseline = 'baseline' in playbook_path.lower() or 'configuracao-base' in playbook_path.lower()
                has_multiple_hosts = len(hosts) > 1
                has_host_configs = extra_vars and isinstance(extra_vars, dict) and extra_vars.get('hosts_config')
                
                cmd = [
                    'ansible-playbook',
                    playbook_path,
                    '-i', str(self.inventory_path),
                    '--limit', ','.join(hosts)
                ]
                
                # Para baseline com múltiplos hosts e configuração por host
                if is_baseline and has_multiple_hosts and has_host_configs:
                    logger.info(f"Executando baseline para múltiplos hosts: {', '.join(hosts)}")
                    hosts_config = extra_vars.get('hosts_config', {})
                    
                    # Modificar o output para incluir identificação clara dos hosts
                    self.running_playbooks[job_id]["output"] += f"\n==== EXECUTANDO BASELINE EM MÚLTIPLOS HOSTS ====\n"
                    
                    # Para cada host no baseline
                    for host_idx, hostname in enumerate(hosts):
                        host_config = hosts_config.get(hostname, {})
                        if not host_config:
                            logger.warning(f"Configuração não encontrada para o host {hostname}")
                            continue
                        
                        # Adicionar separador claro no output
                        self.running_playbooks[job_id]["output"] += f"\n\n==== HOST {host_idx+1}/{len(hosts)}: {hostname} ====\n"
                        
                        # Criar tempfile com configuração específica para este host
                        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as vars_file:
                            json.dump(host_config, vars_file)
                            vars_path = vars_file.name
                        
                        # Construir comando específico para este host
                        host_cmd = [
                            'ansible-playbook',
                            playbook_path,
                            '-i', str(self.inventory_path),
                            '--limit', hostname,
                            '-e', f"@{vars_path}"
                        ]
                        
                        logger.info(f"Executando comando para {hostname}: {' '.join(host_cmd)}")
                        self.running_playbooks[job_id]["output"] += f"Comando para {hostname}: {' '.join(host_cmd)}\n\n"
                        
                        # Executar comando para este host
                        process = subprocess.Popen(
                            host_cmd, 
                            stdout=subprocess.PIPE, 
                            stderr=subprocess.STDOUT, 
                            universal_newlines=True, 
                            bufsize=1
                        )
                        
                        # Coletar output com prefixo do hostname para fácil identificação
                        for line in iter(process.stdout.readline, ''):
                            if line.strip():
                                # Prefixo para ajudar a identificar a qual host a linha pertence
                                if not (line.startswith('PLAY') or line.startswith('TASK')):
                                    line = f"[{hostname}] {line}"
                                self.running_playbooks[job_id]["output"] += line
                                self.running_playbooks[job_id]["progress"] = min(95, self.running_playbooks[job_id]["progress"] + 1)
                        
                        # Aguardar término do processo deste host
                        process.wait()
                        os.unlink(vars_path)  # Limpar arquivo temporário
                        
                        # Atualizar progresso
                        progress_increment = 95 / len(hosts)
                        current_progress = host_idx * progress_increment + (progress_increment if process.returncode == 0 else 0)
                        self.running_playbooks[job_id]["progress"] = min(95, current_progress)
                    
                    # Adicionar resumo final
                    self.running_playbooks[job_id]["output"] += f"\n\n==== BASELINE CONCLUÍDO PARA TODOS OS HOSTS ====\n"
                    self.running_playbooks[job_id]["status"] = "completed"
                    self.running_playbooks[job_id]["progress"] = 100
                    return
                    
                # Caso não seja baseline com múltiplos hosts, executa normalmente
                if extra_vars and isinstance(extra_vars, dict):
                    extra_vars_str = json.dumps(extra_vars)
                    cmd.extend(['-e', extra_vars_str])
                    logger.info(f"Executando com variáveis extras: {extra_vars_str}")
                
                # Registro detalhado do comando
                logger.info(f"Executando comando: {' '.join(cmd)}")
                self.running_playbooks[job_id]["output"] += f"Comando: {' '.join(cmd)}\n\n"
                
                # Executar o comando Ansible
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.STDOUT, 
                    universal_newlines=True, 
                    bufsize=1
                )
                process.job_id = job_id
                if not hasattr(subprocess.Popen, 'running_processes'):
                    subprocess.Popen.running_processes = []
                subprocess.Popen.running_processes.append(process)
                
                # Coletar e processar a saída
                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        logger.debug(f"Saída Ansible: {line}")
                        formatted_line = AnsibleOutputFormatter.format_output(line)
                        self._update_execution_status(job_id, line, formatted_line)
                
                # Aguardar conclusão do processo
                process.wait()
                exit_code = process.returncode
                
                # Atualizar status com base no código de saída
                if exit_code == 0:
                    logger.info(f"Playbook executado com sucesso (job_id: {job_id})")
                    self.running_playbooks[job_id]["status"] = "completed"
                else:
                    logger.error(f"Falha na execução do playbook (job_id: {job_id}, exit_code: {exit_code})")
                    self.running_playbooks[job_id]["status"] = "failed"
                    
                    # Adicionar informações de diagnóstico
                    if "No hosts matched" in self.running_playbooks[job_id]["output"]:
                        self.running_playbooks[job_id]["output"] += "\n\nERRO: Nenhum host correspondeu ao padrão especificado. Verifique se os hosts existem no inventário."
                    elif "Could not match supplied host pattern" in self.running_playbooks[job_id]["output"]:
                        self.running_playbooks[job_id]["output"] += "\n\nERRO: Padrão de host fornecido não corresponde a nenhum host no inventário."
                    
                    subprocess.Popen.running_processes.remove(process)

            except Exception as e:
                logger.error(f"Erro na execução da playbook: {str(e)}", exc_info=True)
                self.running_playbooks[job_id]["status"] = "failed"
                self.running_playbooks[job_id]["output"] += f"\nErro: {str(e)}"
        
        # Inicializar o estado da execução
        self.running_playbooks[job_id] = {
            "status": "running",
            "output": f"Iniciando execução do playbook: {playbook_path}\nHosts: {', '.join(hosts)}\n\n",
            "progress": 0,
            "start_time": datetime.now()
        }
        
        # Executar em thread separada
        thread = threading.Thread(target=run)
        thread.daemon = True
        thread.start()
        
        return job_id
    
    def cancel_playbook(self, job_id: str) -> bool:
        if job_id in self.running_playbooks:
            self.running_playbooks[job_id]["status"] = "cancelled"
            return True
        return False


ansible_mgr = AnsibleManager()
def cancel_playbook(self, job_id: str) -> bool:
    """
    Cancela a execução de um playbook em andamento.
    
    Args:
        job_id (str): ID do job a ser cancelado
    
    Returns:
        bool: True se o cancelamento foi bem-sucedido, False caso contrário
    """
    try:
        if job_id not in self.running_playbooks:
            logger.warning(f"Job {job_id} não encontrado para cancelamento")
            return False
        
        # Marca o status como cancelado
        self.running_playbooks[job_id]["status"] = "cancelled"
        
        # Encontrar o processo do Ansible associado ao job
        if hasattr(subprocess.Popen, 'running_processes'):
            for process in subprocess.Popen.running_processes:
                if hasattr(process, 'job_id') and process.job_id == job_id:
                    try:
                        # Enviar sinal para interromper o processo
                        os.kill(process.pid, signal.SIGINT)
                        logger.info(f"Processo do Ansible para job {job_id} interrompido")
                        subprocess.Popen.running_processes.remove(process)
                    except ProcessLookupError:
                        logger.warning(f"Processo do job {job_id} não encontrado")
                    except Exception as e:
                        logger.error(f"Erro ao interromper processo do job {job_id}: {str(e)}")
        
        return True
    
    except Exception as e:
        logger.error(f"Erro ao cancelar job {job_id}: {str(e)}")
        return False
    
@app.route('/debug-inventory', methods=['GET'])
def debug_inventory():
    """Função para depurar o inventário e verificar problemas."""
    try:
        # Verificar a existência do arquivo de inventário
        inventory_path = str(ansible_mgr.inventory_path)
        if not os.path.exists(inventory_path):
            return jsonify({
                'success': False,
                'message': f'Arquivo de inventário não encontrado: {inventory_path}'
            }), 404
        
        # Verificar se o arquivo de inventário está vazio
        file_size = os.path.getsize(inventory_path)
        if file_size == 0:
            return jsonify({
                'success': False,
                'message': 'Arquivo de inventário está vazio'
            }), 400
        
        # Carregar e analisar o inventário YAML
        with open(inventory_path, 'r') as f:
            inventory_content = f.read()
            
        try:
            inventory_data = yaml.safe_load(inventory_content)
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Erro ao parsear inventário YAML: {str(e)}',
                'content': inventory_content
            }), 400
        
        # Verificar a estrutura do inventário
        if not inventory_data or 'all' not in inventory_data or 'children' not in inventory_data['all']:
            return jsonify({
                'success': False,
                'message': 'Estrutura de inventário inválida',
                'content': inventory_data
            }), 400
        
        # Extrair hosts de cada grupo
        linux_hosts = {}
        windows_hosts = {}
        
        if 'linux' in inventory_data['all']['children'] and 'hosts' in inventory_data['all']['children']['linux']:
            linux_hosts = inventory_data['all']['children']['linux']['hosts']
        
        if 'windows' in inventory_data['all']['children'] and 'hosts' in inventory_data['all']['children']['windows']:
            windows_hosts = inventory_data['all']['children']['windows']['hosts']
        
        # Testar se o Ansible pode ler o inventário
        try:
            data_loader = DataLoader()
            inventory = InventoryManager(loader=data_loader, sources=inventory_path)
            ansible_hosts = [host.name for host in inventory.get_hosts()]
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Erro ao carregar inventário com Ansible: {str(e)}',
                'content': inventory_data
            }), 400
        
        # Testar o arquivo de inventário com ansible-inventory
        try:
            process = subprocess.run(
                ['ansible-inventory', '-i', inventory_path, '--list'], 
                capture_output=True, 
                text=True, 
                check=False
            )
            ansible_inventory_output = process.stdout
            ansible_inventory_error = process.stderr
            ansible_inventory_exit_code = process.returncode
        except Exception as e:
            ansible_inventory_output = ""
            ansible_inventory_error = str(e)
            ansible_inventory_exit_code = -1
        
        # Retornar informações detalhadas para depuração
        return jsonify({
            'success': True,
            'file_info': {
                'path': inventory_path,
                'size': file_size,
                'last_modified': datetime.fromtimestamp(os.path.getmtime(inventory_path)).isoformat()
            },
            'inventory_structure': {
                'linux_hosts': linux_hosts,
                'windows_hosts': windows_hosts,
                'total_hosts': len(linux_hosts) + len(windows_hosts)
            },
            'ansible_hosts': ansible_hosts,
            'ansible_inventory_test': {
                'output': ansible_inventory_output,
                'error': ansible_inventory_error,
                'exit_code': ansible_inventory_exit_code
            },
            'raw_content': inventory_content,
            'parsed_content': inventory_data
        })
    
    except Exception as e:
        logger.error(f"Erro ao depurar inventário: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Erro ao depurar inventário: {str(e)}'
        }), 500

@app.route('/validate-playbook', methods=['POST'])
def validate_playbook():
    """Função para validar um playbook."""
    try:
        data = request.get_json()
        if not data or 'playbook_path' not in data:
            return jsonify({
                'success': False,
                'message': 'Caminho do playbook não fornecido'
            }), 400
        
        playbook_path = data['playbook_path']
        
        # Verificar se o arquivo existe
        if not os.path.exists(playbook_path):
            return jsonify({
                'success': False,
                'message': f'Arquivo não encontrado: {playbook_path}'
            }), 404
        
        # Verificar se o arquivo é um playbook YAML válido
        try:
            with open(playbook_path, 'r') as f:
                playbook_content = f.read()
                playbook_data = yaml.safe_load(playbook_content)
                
            if not playbook_data or not isinstance(playbook_data, list):
                return jsonify({
                    'success': False,
                    'message': 'Formato de playbook inválido (deve ser uma lista de plays)',
                    'content': playbook_data
                }), 400
            
            # Verificar cada play no playbook
            hosts_patterns = []
            for i, play in enumerate(playbook_data):
                if not isinstance(play, dict):
                    return jsonify({
                        'success': False,
                        'message': f'Play #{i+1} não é um dicionário',
                        'content': play
                    }), 400
                
                if 'hosts' not in play:
                    return jsonify({
                        'success': False,
                        'message': f'Play #{i+1} não tem a seção "hosts" obrigatória',
                        'content': play
                    }), 400
                
                hosts_patterns.append(play['hosts'])
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Erro ao ler playbook: {str(e)}',
                'content': playbook_path
            }), 400
        
        # Testar o playbook com ansible-playbook --syntax-check
        try:
            process = subprocess.run(
                ['ansible-playbook', '--syntax-check', playbook_path], 
                capture_output=True, 
                text=True, 
                check=False
            )
            syntax_check_output = process.stdout
            syntax_check_error = process.stderr
            syntax_check_exit_code = process.returncode
        except Exception as e:
            syntax_check_output = ""
            syntax_check_error = str(e)
            syntax_check_exit_code = -1
        
        # Retornar informações detalhadas
        return jsonify({
            'success': syntax_check_exit_code == 0,
            'file_info': {
                'path': playbook_path,
                'size': os.path.getsize(playbook_path),
                'last_modified': datetime.fromtimestamp(os.path.getmtime(playbook_path)).isoformat()
            },
            'playbook_structure': {
                'play_count': len(playbook_data),
                'hosts_patterns': hosts_patterns
            },
            'syntax_check': {
                'output': syntax_check_output,
                'error': syntax_check_error,
                'exit_code': syntax_check_exit_code
            },
            'raw_content': playbook_content,
            'parsed_content': playbook_data
        })
    
    except Exception as e:
        logger.error(f"Erro ao validar playbook: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Erro ao validar playbook: {str(e)}'
        }), 500
    


def run_playbook(self, playbook_path: str, hosts: list) -> str:
    job_id = f"{os.path.basename(playbook_path)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    def run():
        try:
            cmd = [
                'ansible-playbook',
                playbook_path,
                '-i', str(self.inventory_path),
                '--limit', ','.join(hosts)
            ]
            logger.debug(f"Executando comando: {' '.join(cmd)}")
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, bufsize=1)
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



# Funções auxiliares para gerenciamento de inventário
def get_current_hosts():
    """Obtém a lista de hosts atual do sistema"""
    try:
        inventory_json_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.json')
        if os.path.exists(inventory_json_path):
            with open(inventory_json_path, 'r') as file:
                return json.load(file).get('servers', [])
        
        linux_hosts, windows_hosts = parse_inventory()
        servers = []
        for host in linux_hosts:
            servers.append(parse_server_line(host, 'linux'))
        for host in windows_hosts:
            servers.append(parse_server_line(host, 'windows'))
        
        with open(inventory_json_path, 'w') as file:
            json.dump({'servers': servers}, file, indent=2)
        
        return servers
    except Exception as e:
        logger.error(f"Erro ao buscar hosts: {str(e)}")
        return []

def add_host(host_data):
    """Adiciona um novo host ao sistema"""
    try:
        inventory_json_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.json')
        
        if os.path.exists(inventory_json_path):
            with open(inventory_json_path, 'r') as file:
                inventory = json.load(file)
        else:
            inventory = {'servers': []}
        
        # Certifique-se de que todos os campos necessários estão presentes
        if 'host' not in host_data:
            logger.error("Dados do host não contêm o campo 'host'")
            return False
            
        # Verifique se não há host duplicado
        for existing_host in inventory['servers']:
            if existing_host['host'] == host_data['host']:
                logger.warning(f"Host {host_data['host']} já existe no inventário")
                # Atualize o host existente em vez de adicionar um novo
                existing_host.update(host_data)
                break
        else:
            # Adiciona o novo host se não existir
            inventory['servers'].append(host_data)
            logger.info(f"Host adicionado: {host_data['host']}")
        
        # Salva o arquivo JSON atualizado
        with open(inventory_json_path, 'w') as file:
            json.dump(inventory, file, indent=2)
        
        # Atualiza o arquivo de inventário YAML
        update_inventory_file()
        
        return True
    except Exception as e:
        logger.error(f"Erro ao adicionar host: {str(e)}")
        return False

def update_host(host_data):
    """Atualiza um host existente"""
    try:
        inventory_json_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.json')
        
        if os.path.exists(inventory_json_path):
            with open(inventory_json_path, 'r') as file:
                inventory = json.load(file)
            
            for i, host in enumerate(inventory['servers']):
                if host['host'] == host_data['host']:
                    inventory['servers'][i] = host_data
                    break
            
            with open(inventory_json_path, 'w') as file:
                json.dump(inventory, file, indent=2)
            
            update_inventory_file()
            
            logger.info(f"Host atualizado: {host_data['host']}")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Erro ao atualizar host: {str(e)}")
        return False

def remove_host(ip):
    """Remove um host do sistema"""
    try:
        inventory_json_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.json')
        
        if os.path.exists(inventory_json_path):
            with open(inventory_json_path, 'r') as file:
                inventory = json.load(file)
            
            inventory['servers'] = [host for host in inventory['servers'] if host['host'] != ip]
            
            with open(inventory_json_path, 'w') as file:
                json.dump(inventory, file, indent=2)
            
            update_inventory_file()
            
            logger.info(f"Host removido: {ip}")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Erro ao remover host: {str(e)}")
        return False
#FUNCAO PARA FUNCIONAR A CHVE SSH
###############################################
@app.route('/test-ssh-connection', methods=['POST'])
def test_ssh_connection():
    """Testa a conexão SSH com um host específico."""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host:
            return jsonify({
                'success': False,
                'message': 'Host não especificado'
            }), 400
        
        # Carregar dados do inventário
        inventory_data = yaml.safe_load(open(INVENTORY_FILE, 'r'))
        
        if ('all' not in inventory_data or 'children' not in inventory_data['all'] or
            'linux' not in inventory_data['all']['children'] or 
            'hosts' not in inventory_data['all']['children']['linux'] or
            host not in inventory_data['all']['children']['linux']['hosts']):
            
            return jsonify({
                'success': False,
                'message': f'Host {host} não encontrado no inventário ou não é um host Linux'
            }), 404
        
        host_data = inventory_data['all']['children']['linux']['hosts'][host]
        username = host_data.get('ansible_user', 'root')
        key_file = host_data.get('ansible_ssh_private_key_file')
        
        if not key_file:
            return jsonify({
                'success': False,
                'message': f'Host {host} não tem arquivo de chave SSH configurado'
            }), 400
        
        if not os.path.exists(key_file):
            return jsonify({
                'success': False,
                'message': f'Arquivo de chave SSH não encontrado: {key_file}'
            }), 400
        
        # Verificar permissões do arquivo
        file_stat = os.stat(key_file)
        if file_stat.st_mode & 0o777 != 0o600:
            # Tentar corrigir permissões
            try:
                os.chmod(key_file, 0o600)
                logger.info(f"Permissões corrigidas para {key_file}")
            except Exception as e:
                logger.error(f"Não foi possível corrigir permissões para {key_file}: {str(e)}")
        
        # Testar conexão SSH
        cmd = [
            "ssh", 
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            "-o", "ConnectTimeout=10",
            "-v",  # Modo verbose para obter mais informações de diagnóstico
            "-i", key_file,
            f"{username}@{host}",
            "echo 'SSH connection test successful'"
        ]
        
        logger.info(f"Testando conexão SSH para {host} com comando: {' '.join(cmd)}")
        
        # Executar comando SSH
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
            text=True,
            check=False
        )
        
        if process.returncode == 0:
            return jsonify({
                'success': True,
                'message': 'Conexão SSH bem-sucedida',
                'output': process.stdout
            })
        else:
            # Analisar saída de erro para diagnóstico
            stderr = process.stderr
            
            # Mensagens comuns de erro SSH
            error_diagnosis = "Erro desconhecido"
            
            if "Permission denied" in stderr:
                if "publickey" in stderr:
                    error_diagnosis = "Permissão negada (chave pública). A chave SSH pode estar no formato incorreto ou não ter permissões para o usuário."
                elif "password" in stderr:
                    error_diagnosis = "Permissão negada (senha). A senha pode estar incorreta ou autenticação por senha está desabilitada."
            elif "Connection refused" in stderr:
                error_diagnosis = "Conexão recusada. O servidor pode não estar executando SSH ou uma firewall está bloqueando."
            elif "Connection timed out" in stderr:
                error_diagnosis = "Tempo limite de conexão. O host pode estar inacessível ou uma firewall está bloqueando."
            elif "Host key verification failed" in stderr:
                error_diagnosis = "Verificação de chave do host falhou. As chaves de host mudaram ou há um potencial ataque MITM."
            
            return jsonify({
                'success': False,
                'message': f'Falha na conexão SSH: {error_diagnosis}',
                'error': stderr,
                'exit_code': process.returncode
            }), 400
    
    except Exception as e:
        logger.error(f"Erro ao testar conexão SSH: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f"Erro: {str(e)}"
        }), 500
        
        
@app.route('/fix-ssh-keys', methods=['POST'])
def fix_ssh_keys():
    """Corrige permissões de arquivos de chaves SSH existentes."""
    try:
        hosts = get_current_hosts()
        fixed_count = 0
        errors = []
        
        for host in hosts:
            ip = host.get('host')
            if host.get('os', '').lower() != 'linux':
                continue
                
            # Verificar se o host usa um arquivo de chave SSH
            inventory_data = yaml.safe_load(open(INVENTORY_FILE, 'r'))
            
            if ('all' in inventory_data and 'children' in inventory_data['all'] and
                'linux' in inventory_data['all']['children'] and 
                'hosts' in inventory_data['all']['children']['linux'] and
                ip in inventory_data['all']['children']['linux']['hosts']):
                
                host_data = inventory_data['all']['children']['linux']['hosts'][ip]
                key_file = host_data.get('ansible_ssh_private_key_file')
                
                if key_file and os.path.exists(key_file):
                    try:
                        # Corrigir permissões
                        os.chmod(key_file, 0o600)
                        
                        # Verificar se as permissões foram aplicadas corretamente
                        file_stat = os.stat(key_file)
                        if file_stat.st_mode & 0o777 == 0o600:
                            fixed_count += 1
                            logger.info(f"Permissões corrigidas para chave SSH de {ip}: {key_file}")
                        else:
                            errors.append(f"Falha ao corrigir permissões para {ip}: {key_file}")
                    except Exception as e:
                        errors.append(f"Erro ao processar chave SSH para {ip}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f"Permissões corrigidas para {fixed_count} chaves SSH",
            'fixed_count': fixed_count,
            'errors': errors
        })
    
    except Exception as e:
        logger.error(f"Erro ao corrigir permissões de chaves SSH: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f"Erro: {str(e)}"
        }), 500
        
def setup_ssh_key(key_content, hostname, username):
    """
    Configura uma chave SSH para uso com Ansible:
    - Converte para formato OpenSSH se necessário
    - Salva em um local permanente dentro do diretório do programa com permissões corretas
    - Verifica se a chave é válida
    
    Args:
        key_content (str): Conteúdo da chave SSH
        hostname (str): Nome do host
        username (str): Nome de usuário para SSH
        
    Returns:
        tuple: (caminho_da_chave, mensagem_de_erro)
    """
    try:
        if not key_content or not key_content.strip():
            return None, "Conteúdo da chave SSH vazio"
        
        # Criar diretório para chaves SSH dentro do diretório do programa
        # Usando BASE_DIR que já está definido na aplicação
        ssh_dir = os.path.join(BASE_DIR, 'inventory', 'ssh_keys')
        try:
            os.makedirs(ssh_dir, exist_ok=True)
            logger.info(f"Diretório para chaves SSH criado/verificado: {ssh_dir}")
        except PermissionError as e:
            logger.error(f"Erro de permissão ao criar diretório para chaves SSH: {str(e)}")
            return None, f"Erro de permissão ao criar diretório para chaves SSH: {str(e)}"
        
        # Nome do arquivo baseado no hostname (sanitizado)
        sanitized_hostname = ''.join(c if c.isalnum() else '_' for c in hostname)
        key_file = os.path.join(ssh_dir, f"key_{sanitized_hostname}")
        
        # Verificar se a chave está no formato PuTTY e converter se necessário
        if "PuTTY-User-Key-File" in key_content:
            logger.info(f"Convertendo chave PPK para OpenSSH para host {hostname}")
            key_content = convert_ppk_to_openssh(key_content)
        
        # Garantir que a chave comece com a linha correta para OpenSSH
        if not key_content.strip().startswith("-----BEGIN"):
            return None, "Formato de chave SSH inválido"
        
        # Salvar a chave no arquivo
        with open(key_file, 'w') as f:
            f.write(key_content)
        
        # Aplicar permissões 600 (leitura/escrita apenas para o proprietário)
        try:
            os.chmod(key_file, 0o600)
            logger.info(f"Permissões 600 aplicadas à chave SSH: {key_file}")
        except Exception as chmod_error:
            logger.error(f"Erro ao definir permissões para chave SSH: {str(chmod_error)}")
            return None, f"Erro ao definir permissões para chave SSH: {str(chmod_error)}"
        
        # Verificar se as permissões foram aplicadas corretamente
        file_stat = os.stat(key_file)
        if file_stat.st_mode & 0o777 != 0o600:
            logger.warning(f"Não foi possível definir permissões 600 para a chave SSH: {key_file}. Permissões atuais: {file_stat.st_mode & 0o777:o}")
        
        # Obter usuário dono do arquivo para diagnóstico
        import pwd
        try:
            owner = pwd.getpwuid(file_stat.st_uid).pw_name
            logger.info(f"Chave SSH pertence ao usuário: {owner}")
        except KeyError:
            logger.warning(f"Não foi possível determinar o proprietário da chave SSH. UID: {file_stat.st_uid}")
        
        # Registrar o caminho da chave
        logger.info(f"Chave SSH salva em {key_file} com permissões {file_stat.st_mode & 0o777:o}")
        
        # Testar a chave (opcional)
        try:
            # Comando para testar a existência e leitura da chave
            test_cmd = [
                "ssh-keygen", "-l", "-f", key_file
            ]
            
            result = subprocess.run(
                test_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=5,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info(f"Chave SSH validada com sucesso: {result.stdout.strip()}")
            else:
                logger.warning(f"Validação da chave SSH falhou: {result.stderr}")
                # Não bloqueamos por falha na validação
        except Exception as e:
            logger.warning(f"Erro ao validar chave SSH: {str(e)}")
        
        return str(key_file), None
    
    except Exception as e:
        logger.error(f"Erro ao configurar chave SSH: {str(e)}", exc_info=True)
        return None, f"Erro ao configurar chave SSH: {str(e)}"

def fix_ssh_key_permissions():
    """
    Verifica e corrige as permissões de todas as chaves SSH no diretório do programa.
    Útil para executar durante a inicialização da aplicação.
    
    Returns:
        dict: Estatísticas sobre as chaves processadas
    """
    try:
        # Diretório das chaves SSH
        ssh_dir = os.path.join(BASE_DIR, 'inventory', 'ssh_keys')
        
        if not os.path.exists(ssh_dir):
            os.makedirs(ssh_dir, exist_ok=True)
            logger.info(f"Diretório para chaves SSH criado: {ssh_dir}")
            return {"status": "success", "message": "Diretório de chaves SSH criado", "fixed": 0, "total": 0}
        
        # Verificar cada arquivo de chave
        total_keys = 0
        fixed_keys = 0
        failed_keys = 0
        errors = []
        
        for filename in os.listdir(ssh_dir):
            if not filename.startswith('key_'):
                continue
                
            key_path = os.path.join(ssh_dir, filename)
            total_keys += 1
            
            try:
                # Verificar permissões atuais
                current_perms = os.stat(key_path).st_mode & 0o777
                
                if current_perms != 0o600:
                    # Corrigir permissões
                    os.chmod(key_path, 0o600)
                    
                    # Verificar se a correção funcionou
                    new_perms = os.stat(key_path).st_mode & 0o777
                    if new_perms == 0o600:
                        fixed_keys += 1
                        logger.info(f"Permissões corrigidas para chave SSH: {key_path} (de {current_perms:o} para 600)")
                    else:
                        failed_keys += 1
                        error_msg = f"Não foi possível corrigir permissões para {key_path}: permissões atuais {new_perms:o}"
                        logger.warning(error_msg)
                        errors.append(error_msg)
            except Exception as e:
                failed_keys += 1
                error_msg = f"Erro ao processar chave {key_path}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        result = {
            "status": "success",
            "message": f"Verificação concluída: {total_keys} chaves encontradas, {fixed_keys} corrigidas",
            "total": total_keys,
            "fixed": fixed_keys,
            "failed": failed_keys,
            "errors": errors
        }
        
        logger.info(f"Verificação de permissões de chaves SSH concluída: {result['message']}")
        return result
        
    except Exception as e:
        logger.error(f"Erro ao verificar permissões de chaves SSH: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Erro ao verificar permissões: {str(e)}",
            "total": 0,
            "fixed": 0,
            "failed": 0,
            "errors": [str(e)]
        }

# Função para adicionar à inicialização do sistema
def initialize_ssh_keys():
    """
    Função para inicializar o sistema de chaves SSH.
    Deve ser chamada durante a inicialização da aplicação.
    """
    # Cria o diretório de chaves se não existir
    ssh_dir = os.path.join(BASE_DIR, 'inventory', 'ssh_keys')
    os.makedirs(ssh_dir, exist_ok=True)
    
    # Verifica e corrige permissões das chaves existentes
    result = fix_ssh_key_permissions()
    
    # Registra início do sistema de chaves SSH
    logger.info(f"Sistema de gerenciamento de chaves SSH inicializado: {result['message']}")
    
    return result

# Adicionar nova rota para diagnóstico
@app.route('/api/ssh/diagnostics', methods=['GET'])
@login_required
def ssh_diagnostics():
    """Endpoint para diagnosticar problemas com o sistema de chaves SSH"""
    try:
        ssh_dir = os.path.join(BASE_DIR, 'inventory', 'ssh_keys')
        
        # Verificar diretório
        dir_exists = os.path.exists(ssh_dir)
        dir_info = {}
        
        if dir_exists:
            dir_stat = os.stat(ssh_dir)
            dir_info = {
                "permissions": f"{dir_stat.st_mode & 0o777:o}",
                "uid": dir_stat.st_uid,
                "gid": dir_stat.st_gid
            }
            
            try:
                import pwd, grp
                dir_info["owner"] = pwd.getpwuid(dir_stat.st_uid).pw_name
                dir_info["group"] = grp.getgrgid(dir_stat.st_gid).gr_name
            except:
                pass
        
        # Listar chaves
        keys = []
        if dir_exists:
            for filename in os.listdir(ssh_dir):
                if filename.startswith('key_'):
                    key_path = os.path.join(ssh_dir, filename)
                    key_stat = os.stat(key_path)
                    
                    key_info = {
                        "filename": filename,
                        "path": key_path,
                        "size": key_stat.st_size,
                        "permissions": f"{key_stat.st_mode & 0o777:o}",
                        "uid": key_stat.st_uid,
                        "gid": key_stat.st_gid,
                        "ctime": datetime.fromtimestamp(key_stat.st_ctime).isoformat(),
                        "mtime": datetime.fromtimestamp(key_stat.st_mtime).isoformat()
                    }
                    
                    try:
                        import pwd, grp
                        key_info["owner"] = pwd.getpwuid(key_stat.st_uid).pw_name
                        key_info["group"] = grp.getgrgid(key_stat.st_gid).gr_name
                    except:
                        pass
                    
                    # Verificar formato da chave
                    try:
                        with open(key_path, 'r') as f:
                            first_line = f.readline().strip()
                            key_info["valid_format"] = first_line.startswith("-----BEGIN")
                            key_info["format"] = "OpenSSH" if first_line.startswith("-----BEGIN") else "Unknown"
                    except:
                        key_info["valid_format"] = False
                        key_info["format"] = "Error"
                    
                    keys.append(key_info)
        
        # Verificar ferramentas do sistema
        tools = {}
        for tool in ["ssh", "ssh-keygen", "puttygen"]:
            try:
                result = subprocess.run(["which", tool], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                tools[tool] = {
                    "available": result.returncode == 0,
                    "path": result.stdout.strip() if result.returncode == 0 else None
                }
            except:
                tools[tool] = {"available": False, "path": None}
        
        # Verificar usuário do processo
        process_info = {
            "user": getpass.getuser(),
            "uid": os.getuid(),
            "gid": os.getgid()
        }
        
        # Verificar permissões correntes
        umask_original = os.umask(0)
        os.umask(umask_original)  # Restaurar umask sem alterar
        
        return jsonify({
            "success": True,
            "directory": {
                "path": ssh_dir,
                "exists": dir_exists,
                "info": dir_info
            },
            "keys": keys,
            "tools": tools,
            "process": process_info,
            "umask": f"{umask_original:o}",
            "timestamp": datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Erro no diagnóstico SSH: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Rota para corrigir permissões
@app.route('/api/ssh/fix-permissions', methods=['POST'])
@login_required
def fix_ssh_permissions():
    """Endpoint para corrigir permissões das chaves SSH"""
    try:
        result = fix_ssh_key_permissions()
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Erro ao corrigir permissões SSH: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
            
def convert_ppk_to_openssh(ppk_content):
    """
    Converte uma chave PPK (formato PuTTY) para o formato OpenSSH.
    
    Args:
        ppk_content (str): Conteúdo da chave PPK
        
    Returns:
        str: Conteúdo da chave em formato OpenSSH ou a chave original se a conversão falhar
    """
    try:
        # Verificar se parece ser uma chave PPK
        if "PuTTY-User-Key-File" in ppk_content:
            logger.info("Detectada chave no formato PPK, convertendo para OpenSSH")
            
            # Criar arquivo temporário com o conteúdo PPK
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as ppk_file:
                ppk_file.write(ppk_content)
                ppk_path = ppk_file.name
            
            # Criar caminho para o arquivo de saída
            openssh_path = f"{ppk_path}.openssh"
            
            # Verificar se o puttygen está instalado
            try:
                # Tentar converter usando puttygen
                cmd = ["puttygen", ppk_path, "-O", "private-openssh", "-o", openssh_path]
                process = subprocess.run(cmd, capture_output=True, text=True, check=True)
                
                # Ler o arquivo convertido
                with open(openssh_path, 'r') as f:
                    openssh_content = f.read()
                
                # Limpar arquivos temporários
                os.unlink(ppk_path)
                os.unlink(openssh_path)
                
                logger.info("Chave PPK convertida com sucesso para formato OpenSSH")
                return openssh_content
                
            except (subprocess.SubprocessError, FileNotFoundError) as e:
                logger.warning(f"Erro ao converter chave PPK usando puttygen: {str(e)}")
                logger.warning("Puttygen não disponível, a chave pode não funcionar corretamente")
                os.unlink(ppk_path)
                return ppk_content
        
        # Se não for PPK, retorna a chave original
        return ppk_content
        
    except Exception as e:
        logger.error(f"Erro ao processar chave PPK: {str(e)}")
        return ppk_content


def save_ssh_key_with_permissions(key_content, hostname):
    """
    Salva a chave SSH em um arquivo temporário com permissões 600
    
    Args:
        key_content (str): Conteúdo da chave SSH
        hostname (str): Nome do host para identificação do arquivo
        
    Returns:
        str: Caminho para o arquivo de chave ou None se falhar
    """
    try:
        if not key_content or not key_content.strip():
            logger.warning("Conteúdo da chave SSH vazio")
            return None
            
        # Criar diretório para chaves SSH se não existir
        ssh_dir = Path(tempfile.gettempdir()) / "ansible_manager_keys"
        ssh_dir.mkdir(parents=True, exist_ok=True)
        
        # Definir nome de arquivo baseado no hostname
        sanitized_hostname = "".join(c if c.isalnum() else "_" for c in hostname)
        key_file = ssh_dir / f"key_{sanitized_hostname}"
        
        # Verificar se é uma chave PPK e converter se necessário
        processed_key = convert_ppk_to_openssh(key_content)
        
        # Salvar a chave no arquivo
        with open(key_file, 'w') as f:
            f.write(processed_key)
        
        # Aplicar permissões 600 (leitura/escrita apenas para o proprietário)
        os.chmod(key_file, 0o600)
        
        logger.info(f"Chave SSH salva em {key_file} com permissões 600")
        return str(key_file)
        
    except Exception as e:
        logger.error(f"Erro ao salvar chave SSH: {str(e)}")
        return None
    
    
def update_inventory_file():
    """Atualiza o arquivo inventory.yml com base nos dados do inventory.json"""
    global INVENTORY_FILE
    
    try:
        hosts = get_current_hosts()
        
        # Estrutura YAML do inventário
        inventory = {
            'all': {
                'children': {
                    'linux': {
                        'hosts': {},
                        'vars': {
                            'ansible_connection': 'ssh',
                            'ansible_port': 22
                        }
                    },
                    'windows': {
                        'hosts': {},
                        'vars': {
                            'ansible_connection': 'winrm',
                            'ansible_port': 5986,
                            'ansible_winrm_transport': 'ntlm',
                            'ansible_winrm_server_cert_validation': 'ignore'
                        }
                    }
                }
            }
        }
        
        # Processar cada host
        for host in hosts:
            ip = host.get('host')
            if not ip:
                logger.warning(f"Host sem IP encontrado: {host}")
                continue
                
            # Processar OS info
            os_value = host.get('os', 'linux')
            os_info = {'os_type': 'linux', 'os_distribution': 'ubuntu', 'os_version': '22.04'}
            
            # Extrair informações de OS
            if '-' in os_value:
                parts = os_value.split('-')
                if len(parts) >= 3:
                    os_info = {
                        'os_type': parts[0],
                        'os_distribution': parts[1],
                        'os_version': '-'.join(parts[2:])
                    }
            else:
                os_info['os_type'] = os_value
                if 'os_distribution' in host:
                    os_info['os_distribution'] = host['os_distribution']
                if 'os_version' in host:
                    os_info['os_version'] = host['os_version']
            
            # Linux hosts
            if os_info['os_type'].lower() == 'linux':
                group = 'linux'
                host_data = {}
                
                # User
                if host.get('ssh_user'):
                    host_data['ansible_user'] = host['ssh_user']
                
                # Password
                if host.get('ssh_pass'):
                    host_data['ansible_ssh_pass'] = host['ssh_pass']
                    host_data['ansible_become_pass'] = host['ssh_pass']
                    host_data['ansible_become'] = True
                    host_data['ansible_become_method'] = 'sudo'
                
                # SSH Key
                if host.get('ssh_key_content'):
                    key_path, error = setup_ssh_key(
                        host['ssh_key_content'], 
                        ip, 
                        host.get('ssh_user', 'root')
                    )
                    
                    if key_path:
                        host_data['ansible_ssh_private_key_file'] = key_path
                    else:
                        logger.error(f"Erro ao configurar chave SSH para {ip}: {error}")
                
                # Python interpreter
                python_config = get_python_interpreter(os_info['os_distribution'], os_info['os_version'])
                
                if 'python_interpreters' in python_config:
                    host_data['python_interpreters'] = python_config['python_interpreters']
                
                if 'ansible_python_interpreter' in python_config:
                    host_data['ansible_python_interpreter'] = python_config['ansible_python_interpreter']
                
                # OS info
                host_data['os_distribution'] = os_info['os_distribution']
                host_data['os_version'] = os_info['os_version']
                
                # Adicionar ao inventário
                inventory['all']['children'][group]['hosts'][ip] = host_data
            
            # Windows hosts
            elif os_info['os_type'].lower() == 'windows':
                group = 'windows'
                host_data = {}
                
                if host.get('ssh_user'):
                    host_data['ansible_user'] = host['ssh_user']
                
                if host.get('windows_password') or host.get('ssh_pass'):
                    host_data['ansible_password'] = host.get('windows_password') or host.get('ssh_pass')
                
                host_data['ansible_connection'] = 'winrm'
                host_data['ansible_winrm_transport'] = 'ntlm'
                host_data['ansible_winrm_server_cert_validation'] = 'ignore'
                
                inventory['all']['children'][group]['hosts'][ip] = host_data
        
        # Salvar o inventário
        inventory_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.yml')
        
        with open(inventory_path, 'w') as file:
            file.write("# Arquivo de Inventário Ansible (YAML)\n")
            file.write("# Gerado automaticamente pela Automato Platform\n\n")
            yaml.dump(inventory, file, default_flow_style=False, sort_keys=False)
        
        INVENTORY_FILE = inventory_path
        
        logger.info(f"Arquivo de inventário YAML atualizado: {INVENTORY_FILE}")
        return True
    
    except Exception as e:
        logger.error(f"Erro ao atualizar arquivo de inventário YAML: {str(e)}", exc_info=True)
        return False
    

# Rotas adicionais
@app.route("/maintenance/<module>")
def maintenance_page(module):
    """Exibe a página de manutenção para o módulo especificado"""
    return render_template("errors/maintenance.html", module=module)

def is_maintenance_page_needed(module, submodule=None):
    """Determina se deve mostrar a página de manutenção"""
    production_modules = ['ansible']
    return module not in production_modules

@app.route("/module/<module>/<submodule>")
def module_page(module, submodule):
    try:
        template_path = f"{module}/{submodule}.html"
        return render_template(template_path, module=module, submodule=submodule)
    except:
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

@app.route("/ansible/playbooks")
def ansible_playbooks():
    return render_template("ansible/playbooks.html")

@app.route("/python/scripts")
def python_scripts():
    if is_maintenance_page_needed('python'):
        return render_template("errors/maintenance.html", module='python', submodule='scripts')
    return render_template("python/scripts.html")

@app.route("/python/modules")
def python_modules():
    if is_maintenance_page_needed('python'):
        return render_template("errors/maintenance.html", module='python', submodule='modules')
    return render_template("python/modules.html")

@app.route("/python/libraries")
def python_libraries():
    if is_maintenance_page_needed('python'):
        return render_template("errors/maintenance.html", module='python', submodule='libraries')
    return render_template("python/libraries.html")

@app.route("/terraform/modules")
def terraform_modules():
    if is_maintenance_page_needed('terraform'):
        return render_template("errors/maintenance.html", module='terraform', submodule='modules')
    return render_template("terraform/modules.html")

@app.route("/terraform/states")
def terraform_states():
    if is_maintenance_page_needed('terraform'):
        return render_template("errors/maintenance.html", module='terraform', submodule='states')
    return render_template("terraform/states.html")

@app.route("/terraform/workspaces")
def terraform_workspaces():
    if is_maintenance_page_needed('terraform'):
        return render_template("errors/maintenance.html", module='terraform', submodule='workspaces')
    return render_template("terraform/workspaces.html")

@app.route("/inventory/core_inventory")
def core_inventory():
    return render_template("inventory/core_inventory.html")

# Rotas de erro
@app.errorhandler(404)
def page_not_found(e):
    return render_template("errors/404.html"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template("errors/500.html"), 500

# Rotas da API
@app.route("/api/hosts")
def get_hosts():
    try:
        logger.info("Iniciando requisição /api/hosts")
        hosts = ansible_mgr.load_inventory()
        result = {}
        for hostname, info in hosts.items():
            logger.debug(f"Processando host: {hostname}")
            is_valid = ansible_mgr.test_host(hostname, info)
            
            # Valores padrão caso não consiga coletar fatos
            facts = {
                "hostname": hostname,
                "public_ip": hostname,
                "private_ip": hostname,
                "system": "Windows Server" if info.get("connection") == "winrm" else "Linux"
            }
            
            if is_valid:
                try:
                    host_facts = ansible_mgr.gather_host_facts(hostname)
                    if host_facts and isinstance(host_facts, dict):
                        # Verificar se obtivemos valores válidos e garantir que sejam usados
                        if "hostname" in host_facts and host_facts["hostname"] and host_facts["hostname"] != "N/A":
                            facts["hostname"] = host_facts["hostname"]
                        
                        if "public_ip" in host_facts and host_facts["public_ip"] and host_facts["public_ip"] != "N/A":
                            facts["public_ip"] = host_facts["public_ip"]
                        
                        if "private_ip" in host_facts and host_facts["private_ip"] and host_facts["private_ip"] != "N/A":
                            facts["private_ip"] = host_facts["private_ip"]
                        
                        if "system" in host_facts and host_facts["system"] and host_facts["system"] != "N/A":
                            facts["system"] = host_facts["system"]
                            
                        logger.info(f"Fatos coletados para {hostname}: {facts}")
                    else:
                        logger.warning(f"Fatos inválidos para {hostname}: {host_facts}")
                except Exception as e:
                    logger.error(f"Erro coletando fatos para {hostname}: {str(e)}", exc_info=True)
            
            result[hostname] = {
                "valid": is_valid,
                "facts": facts
            }
            
        logger.info(f"Retornando dados para {len(result)} hosts")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erro processando hosts: {str(e)}", exc_info=True)
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
        logger.info(f"Dados recebidos para execução de playbook: {data}")
        
        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400
        
        playbook_path = data.get("playbook")
        hosts = data.get("hosts", [])
        extra_vars = data.get("extra_vars")
        
        if not playbook_path:
            logger.error("Caminho do playbook não fornecido")
            return jsonify({"error": "Playbook é obrigatório"}), 400
            
        if not hosts or not isinstance(hosts, list) or len(hosts) == 0:
            logger.error("Lista de hosts não fornecida ou vazia")
            return jsonify({"error": "Pelo menos um host é obrigatório"}), 400
        
        # Verificar se os hosts existem no inventário
        logger.info(f"Verificando hosts no inventário: {hosts}")
        inventory = ansible_mgr.load_inventory()
        valid_hosts = [h for h in hosts if h in inventory]
        
        if not valid_hosts:
            logger.error(f"Nenhum host válido encontrado. Hosts solicitados: {hosts}, Hosts no inventário: {list(inventory.keys())}")
            return jsonify({"error": f"Nenhum dos hosts solicitados ({', '.join(hosts)}) foi encontrado no inventário. Hosts disponíveis: {', '.join(list(inventory.keys()))}"}), 400
        
        logger.info(f"Hosts válidos: {valid_hosts}")
        
        # Verificar se o arquivo de playbook existe
        if not os.path.exists(playbook_path):
            logger.error(f"Arquivo de playbook não encontrado: {playbook_path}")
            return jsonify({"error": f"Playbook {playbook_path} não encontrado"}), 404
        
        # Verificar o conteúdo do playbook para garantir que pode ser executado
        try:
            with open(playbook_path, 'r') as f:
                playbook_content = yaml.safe_load(f)
                
            if not playbook_content or not isinstance(playbook_content, list):
                logger.error(f"Formato de playbook inválido: {playbook_path}")
                return jsonify({"error": "Formato de playbook inválido"}), 400
                
            # Verificar se o playbook tem pelo menos um play
            if not any('hosts' in play for play in playbook_content if isinstance(play, dict)):
                logger.error(f"Playbook sem seção 'hosts' válida: {playbook_path}")
                return jsonify({"error": "Playbook não contém uma seção 'hosts' válida"}), 400
        except Exception as e:
            logger.error(f"Erro ao ler playbook {playbook_path}: {str(e)}")
            return jsonify({"error": f"Erro ao ler playbook: {str(e)}"}), 400
        
        # Logs detalhados para depuração
        logger.info(f"Executando playbook: {playbook_path}")
        logger.info(f"Hosts selecionados: {valid_hosts}")
        if extra_vars:
            logger.info(f"Variáveis extras: {extra_vars}")
        
        # Verificar o arquivo de inventário
        inventory_path = str(ansible_mgr.inventory_path)
        logger.info(f"Usando arquivo de inventário: {inventory_path}")
        
        if not os.path.exists(inventory_path):
            logger.error(f"Arquivo de inventário não encontrado: {inventory_path}")
            return jsonify({"error": f"Arquivo de inventário não encontrado: {inventory_path}"}), 500
        
        # Executar o playbook
        if extra_vars:
            logger.info(f"Executando com variáveis extras: {extra_vars}")
            job_id = ansible_mgr.run_playbook_with_vars(playbook_path, valid_hosts, extra_vars)
        else:
            job_id = ansible_mgr.run_playbook(playbook_path, valid_hosts)
        
        logger.info(f"Job ID gerado: {job_id}")
        return jsonify({"job_id": job_id, "hosts": valid_hosts}), 200
    except Exception as e:
        logger.error(f"Erro no endpoint /api/run: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/status/<job_id>")
def get_status(job_id):
    try:
        status = ansible_mgr.get_execution_status(job_id)
        logger.debug(f"Retornando status para job {job_id}: {status}")
        return jsonify(status)
    except Exception as e:
        logger.error(f"Erro ao obter status do job {job_id}: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/cancel", methods=["POST"])
def cancel_playbook():
    try:
        data = request.get_json()
        if not data or 'job_id' not in data:
            return jsonify({"error": "Parâmetro job_id não fornecido"}), 400
            
        job_id = data.get('job_id')
        
        logger.info(f"Cancelando job: {job_id}")
        
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
    try:
        data = request.get_json()
        logger.info(f"Dados recebidos para adicionar/atualizar servidor: {data}")
        
        host = data.get('host')
        ssh_user = data.get('ssh_user')
        ssh_pass = data.get('ssh_pass', '')
        ssh_key = data.get('ssh_key_content', '')
        os_type = data.get('os')
        original_host = data.get('original_host')
        
        # Processar os campos de distribuição Linux
        os_distribution = 'ubuntu'  # Valor padrão
        os_version = '22.04'  # Valor padrão
        
        # Verificar se é uma chave PPK e converter
        if ssh_key and "PuTTY-User-Key-File" in ssh_key:
            ssh_key = convert_ppk_to_openssh(ssh_key)
        
        # Verifica se o OS tem formato combinado (linux-ubuntu-22.04)
        if os_type and '-' in os_type:
            parts = os_type.split('-')
            if len(parts) >= 3:
                os_type = parts[0]  # 'linux' ou 'windows'
                os_distribution = parts[1]
                os_version = '-'.join(parts[2:])
                logger.info(f"OS combinado detectado: tipo={os_type}, dist={os_distribution}, versão={os_version}")
        else:
            # Usa os campos separados se fornecidos
            os_distribution = data.get('os_distribution', os_distribution)
            os_version = data.get('os_version', os_version)
            logger.info(f"Campos separados: tipo={os_type}, dist={os_distribution}, versão={os_version}")
        
        # Validação básica
        if not host:
            return jsonify({"success": False, "message": "IP não fornecido!"}), 400
            
        if not is_valid_ip(host):
            return jsonify({"success": False, "message": "IP inválido!"}), 400
            
        # Primeiro remove o host original se for uma atualização
        if original_host and original_host != host:
            remove_host(original_host)
        
        # Prepara os dados do host
        host_data = {
            "host": host,
            "ssh_user": ssh_user or "",
            "ssh_pass": ssh_pass or "",
            "ssh_key_content": ssh_key or "",
            "os": os_type or "linux",
            "os_distribution": os_distribution,
            "os_version": os_version
        }
        
        # Para hosts Windows, usar ssh_pass como windows_password
        if os_type and os_type.lower() == 'windows':
            host_data["windows_password"] = ssh_pass or ""
        else:
            host_data["windows_password"] = ""
        
        logger.info(f"Dados finais do host para adicionar: {host_data}")
        
        # Adiciona ou atualiza o host
        success = add_host(host_data)
        
        if success:
            message = "Servidor adicionado com sucesso!"
            if original_host:
                message = "Servidor atualizado com sucesso!"
            return jsonify({"success": True, "message": message})
        else:
            return jsonify({"success": False, "message": "Erro ao adicionar servidor"}), 500
            
    except Exception as e:
        logger.error(f"Erro ao adicionar/atualizar servidor: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"Erro: {str(e)}"}), 500
    

@app.route('/show-inventory')
def show_inventory():
    ensure_inventory_exists()
    inventory_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.yml')
    
    try:
        with open(inventory_path, 'r') as f:
            inventory_data = f.read()
        return jsonify({"inventory": inventory_data})
    except Exception as e:
        logger.error(f"Erro ao ler arquivo de inventário: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/remove_server', methods=['POST'])
@app.route('/remove_server', methods=['POST'])
def remove_server():
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host:
            return jsonify({"success": False, "message": "Host não especificado"}), 400
        
        # Usar a função remove_host que atualiza o inventário YAML
        success = remove_host(host)
        
        if success:
            return jsonify({"success": True, "message": "Servidor removido com sucesso!"})
        else:
            return jsonify({"success": False, "message": "Erro ao remover o servidor"}), 500
    except Exception as e:
        logger.error(f"Erro ao remover servidor: {str(e)}")
        return jsonify({"success": False, "message": f"Erro: {str(e)}"}), 500

@app.route('/inventory/refresh-inventory', methods=['POST'])
def inventory_refresh():
    """Atualiza o inventário lendo o arquivo YAML e sincronizando com o banco de dados ou estado interno"""
    try:
        inventory_path = os.path.join(os.path.dirname(INVENTORY_FILE), 'inventory.yml')
        
        if not os.path.exists(inventory_path):
            return jsonify({
                'success': False,
                'message': f'Arquivo de inventário não encontrado: {inventory_path}'
            }), 404
        
        # Carrega o arquivo YAML
        with open(inventory_path, 'r') as f:
            inventory_data = yaml.safe_load(f)
        
        if not inventory_data or 'all' not in inventory_data or 'children' not in inventory_data['all']:
            return jsonify({
                'success': False,
                'message': f'Formato de inventário YAML inválido'
            }), 400
        
        # Coleta os hosts do YAML
        inventory_hosts = set()
        
        # Para hosts Linux
        linux_hosts = inventory_data['all']['children'].get('linux', {}).get('hosts', {})
        for host_name in linux_hosts:
            inventory_hosts.add(host_name)
        
        # Para hosts Windows
        windows_hosts = inventory_data['all']['children'].get('windows', {}).get('hosts', {})
        for host_name in windows_hosts:
            inventory_hosts.add(host_name)
        
        current_hosts = get_current_hosts()
        current_hosts_ips = {host['host'] for host in current_hosts}
        
        removed_hosts = current_hosts_ips - inventory_hosts
        
        for host_ip in removed_hosts:
            remove_host(host_ip)
        
        added_count = 0
        for host_ip in inventory_hosts - current_hosts_ips:
            # Determina o tipo de host e suas credenciais
            host_os = 'linux'  # Padrão
            host_user = ''
            host_pass = ''
            host_key = ''
            
            # Verifica se é um host Linux
            if host_ip in linux_hosts:
                host_os = 'linux'
                host_vars = linux_hosts[host_ip]
                host_user = host_vars.get('ansible_user', '')
                host_pass = host_vars.get('ansible_ssh_pass', '')
                host_key = host_vars.get('ansible_ssh_private_key_content', '')
            
            # Verifica se é um host Windows
            elif host_ip in windows_hosts:
                host_os = 'windows'
                host_vars = windows_hosts[host_ip]
                host_user = host_vars.get('ansible_user', '')
                host_pass = host_vars.get('ansible_password', '')
            
            # Adiciona o host ao sistema
            add_host({
                'host': host_ip,
                'ssh_user': host_user,
                'ssh_pass': host_pass,
                'ssh_key_content': host_key,
                'os': host_os
            })
            added_count += 1
        
        logger.info(f"Inventário atualizado: {len(removed_hosts)} host(s) removido(s) e {added_count} host(s) adicionado(s)")
        
        return jsonify({
            'success': True,
            'message': f'Inventário atualizado com sucesso! {len(removed_hosts)} host(s) removido(s) e {added_count} host(s) adicionado(s).',
            'removed': len(removed_hosts),
            'added': added_count
        }), 200
    
    except Exception as e:
        logger.error(f"Erro ao atualizar inventário: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao atualizar inventário: {str(e)}'
        }), 500

@inventory_bp.route('/export-inventory', methods=['GET'])
def export_inventory():
    try:
        hosts = get_current_hosts()
        export_data = {
            "servers": [{
                "host": host["host"],
                "ssh_user": host.get("ssh_user", ""),
                "ssh_pass": host.get("ssh_pass", ""),
                "ssh_key_content": host.get("ssh_key_content", ""),
                "os": host["os"]
            } for host in hosts]
        }
        
        response = jsonify(export_data)
        response.headers["Content-Disposition"] = "attachment; filename=inventory_export.json"
        response.headers["Content-Type"] = "application/json"
        
        logger.info("Inventário exportado com sucesso")
        return response
    
    except Exception as e:
        logger.error(f"Erro ao exportar inventário: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao exportar inventário: {str(e)}'
        }), 500

@inventory_bp.route('/update-host', methods=['POST'])
def update_host_status():
    """Atualiza o status de um host em tempo real"""
    try:
        data = request.json
        hostname = data.get('host')
        
        if not hostname:
            return jsonify({
                'success': False,
                'message': 'Host não especificado'
            }), 400
            
        hosts = ansible_mgr.load_inventory()
        host_info = hosts.get(hostname)
        
        if not host_info:
            return jsonify({
                'success': False,
                'message': 'Host não encontrado no inventário'
            }), 404
            
        is_valid = ansible_mgr.test_host(hostname, host_info)
        facts = ansible_mgr.gather_host_facts(hostname) if is_valid else {
            "hostname": hostname,
            "public_ip": "N/A",
            "private_ip": "N/A",
            "system": "N/A"
        }
        
        logger.info(f"Host {hostname} atualizado: {'acessível' if is_valid else 'inacessível'}")
        
        return jsonify({
            'success': True,
            'host': hostname,
            'valid': is_valid,
            'facts': facts
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao atualizar host: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao atualizar host: {str(e)}'
        }), 500

@inventory_bp.route('/export-inventory-template', methods=['GET'])
def export_inventory_template():
    """Exporta um template amigável de inventário com exemplos para Linux e Windows"""
    try:
        template_text = """# Template de Inventário Ansible
# Instruções: 
# 1. Preencha as seções abaixo para cada servidor
# 2. Use uma seção [server] para cada servidor
# 3. Para Linux use 'os=linux', para Windows use 'os=windows'
# 4. Use SSH_PASS ou SSH_KEY_CONTENT (não ambos)

# ====== EXEMPLO 1: Servidor Linux com Senha ======
[server]
host=192.168.1.10
ssh_user=admin
ssh_pass=senhasegura123
ssh_key_content=
os=linux

# ====== EXEMPLO 2: Servidor Linux com Chave SSH ======
[server]
host=192.168.1.11
ssh_user=ubuntu
ssh_pass=
ssh_key_content=-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA6NF8iallvQVp22WDkTkyrtvp9eWW6A8YVr+kz4TjGYe7gHzI
w+niNltGEFHzD8+v1I2YJ6oXevct1YeS0o9HZyN1Q9qgCgzUFtdOKLv6IedplqoP
kcmF0aYet2PkEDo3MlTBckFXPITAMzF8dJSIFo9D8HfdOV0IAdx4O7PtixWKn5y2
hMNG0zQPyUecp4pzC6kivAIhyfHilFR61RGL+GPXQ2MWZWFYbAGjyiYJnAmCP3NO
Td0jMZEnDkbUvxhMmBYSdETk1rRgm+R4LOzFUGaHqHDLKLX+FIPKcF96hrucXzcW
yLbIbEgE98OHlnVYCzRdK8jlqm8tehUc9c9WhQIBIwKCAQEA4iqWPJXtzZA68mKd
ELs4jJsdyky+ewdZeNds5tjcnHU5zUYE25K+ffJED9qUWICcLZDc81TGWjHyAqD1
Bw7XpgUwFgeUJwUlzQurAv+/ySnxiwuaGJfhFM1CaQHzfXphgVml+fZUvnJUTzv5
POUjW+W1lqLdLrTMv9DKrIMKSjlsLM+CI5Ub3hOTsV0X0WQID69/ssMf4SfLV3Kq
l+0We8oo4XUiV71Qs5u2KnBPXCM/+QiF5ci5b1TruccV2VS9qhfRisCyc3z0zHun
Jm1m1fGXkKMX6OmJAzv+/1O3ZKI9j16lfJ8b1KLAUZMZODx6fUUzfMwLXztjyGQQ
6Q9MbQKBgHb/XqPJTnEeGVLdJaUE4NYtC9MAIQXJzWZJJLBEoUCCjhFQ0efQkrUp
90k3MXKmpcm8S1iRNa7C29WYUzPymXYHMGFskSaoQV0i1CR1k8UfSlr2Y3iKy2/W
cvmJCzXEwF5oR7beAjOQy3lbJC9Y2ogBnyqhbzZ2XcrbQ8AMJYqBGMhDAoGBANkU
1hqfnw7+aXncJ9bjysr1ZWbqOE5Nd8AFgfwaKuGTTVX2NsUQnCMWdOp+wFak40JH
PKWkJNdBG+ex0H9JNQsTK3X5PBMAS8AfX0GrKeuwKWA6erytVTqjOfLYcdp5+z9s
8DtVCxDuVsM+i4X8UqIGOlvGbtKEVokHPFXP1q/dAoGAcHg5YX7WEehCgCYTzpO+
xysX8ScM2qS6xuZ3MqUWAxUWkh7NGZvhe0sGy9iOdANzwKw7mUUFViaCMR/t54W1
GC83sOs3D7n5Mj8x3NdO8xFit7dT9a245TvaoYQ7KgmqpSg/ScKCw4c3eiLava+J
3btnJeSIU+8ZXq9XjPRpKwg=
-----END RSA PRIVATE KEY-----
os=linux

# ====== EXEMPLO 3: Servidor Windows ======
[server]
host=192.168.1.20
ssh_user=Administrator
ssh_pass=Windows@2022
ssh_key_content=
os=windows

# ====== ADICIONE SEUS SERVIDORES ABAIXO ======
[server]
host=
ssh_user=
ssh_pass=
ssh_key_content=
os=

"""
        # Verificar se o usuário espera receber o arquivo diretamente
        date_str = datetime.now().strftime('%Y-%m-%d')
        filename = f"inventory_template_{date_str}.txt"
        
        # Criar arquivo temporário para download
        with tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='.txt') as temp_file:
            temp_file.write(template_text)
            temp_path = temp_file.name
        
        logger.info(f"Template criado em: {temp_path}")
        
        # Retornar o arquivo para download
        return send_file(
            temp_path, 
            as_attachment=True,
            download_name=filename,
            mimetype='text/plain'
        )
        
    except Exception as e:
        logger.error(f"Erro ao exportar template de inventário: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao exportar template: {str(e)}'
        }), 500
            
# Rota para importar o inventário
# Rota para importar o inventário
@inventory_bp.route('/import-inventory', methods=['POST'])
def import_inventory():
    try:
        logger.info("Iniciando processamento de importação de inventário")

        if 'inventory_file' not in request.files:
            logger.warning("Requisição sem arquivo de inventário")
            return jsonify({'success': False, 'message': 'Nenhum arquivo fornecido'}), 400

        file = request.files['inventory_file']
        if not file or file.filename == '':
            logger.warning("Arquivo de inventário vazio ou sem nome")
            return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400

        content = file.read().decode('utf-8')
        logger.info(f"Arquivo lido: {file.filename}, tamanho: {len(content)} bytes")

        if not content.strip():
            logger.warning("Conteúdo do arquivo vazio")
            return jsonify({'success': False, 'message': 'Arquivo vazio'}), 400

        servers = []
        if file.filename.lower().endswith('.txt'):
            logger.info("Processando como template de texto")
            current_server = None
            multi_line_key = None
            multi_line_value = ""

            for line in content.split('\n'):
                line_original = line
                line = line.strip()

                if not line or line.startswith('#'):
                    continue

                if multi_line_key:
                    if line == '[server]' or ('=' in line and not line.startswith('=')):
                        if current_server:
                            current_server[multi_line_key] = multi_line_value.strip()
                        multi_line_key = None
                        multi_line_value = ""
                    else:
                        multi_line_value += line_original + "\n"
                        continue

                if line == '[server]':
                    if current_server and 'host' in current_server and current_server['host']:
                        servers.append(current_server)
                        logger.debug(f"Adicionado servidor: {current_server['host']}")
                    current_server = {}
                    continue

                if '=' in line and current_server is not None:
                    key, value = line.split('=', 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if key == 'ssh_key_content' and not value:
                        multi_line_key = 'ssh_key_content'
                        multi_line_value = ""
                        continue

                    if key == 'host':
                        current_server['host'] = value
                    elif key == 'ssh_user':
                        current_server['ssh_user'] = value
                    elif key == 'ssh_pass':
                        current_server['ssh_pass'] = value
                    elif key == 'ssh_key_content':
                        current_server['ssh_key_content'] = value
                    elif key == 'os':
                        current_server['os'] = value

            if multi_line_key and current_server:
                current_server[multi_line_key] = multi_line_value.strip()

            if current_server and 'host' in current_server and current_server['host']:
                servers.append(current_server)
                logger.debug(f"Adicionado último servidor: {current_server['host']}")

        if not servers:
            logger.warning("Nenhum servidor válido encontrado no arquivo")
            return jsonify({'success': False, 'message': 'Nenhum servidor válido encontrado no arquivo'}), 400

        logger.info(f"Total de servidores encontrados: {len(servers)}")

        success_count = 0
        errors = []

        for server in servers:
            if not server.get('host'):
                errors.append("Servidor sem IP/host especificado")
                logger.warning("Servidor sem IP/host especificado")
                continue

            server.setdefault('ssh_user', '')
            server.setdefault('ssh_pass', '')
            server.setdefault('ssh_key_content', '')
            server.setdefault('os', 'linux')

            try:
                logger.debug(f"Tentando adicionar servidor: {server}")
                success = add_host(server)
                if success:
                    success_count += 1
                    logger.info(f"Servidor adicionado com sucesso: {server['host']}")
                else:
                    error_msg = f"Falha ao adicionar {server['host']}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            except Exception as e:
                error_msg = f"Erro ao adicionar {server['host']}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)

        update_success = update_inventory_file()
        if not update_success:
            logger.error("Falha ao atualizar o arquivo inventory.yml")
            return jsonify({'success': False, 'message': 'Erro ao atualizar o arquivo de inventário'}), 500

        message = f"Importação concluída! {success_count}/{len(servers)} servidor(es) adicionado(s)."
        if errors:
            message += f" Erros: {'; '.join(errors[:3])}" + (f" e mais {len(errors) - 3} erro(s)" if len(errors) > 3 else "")

        logger.info(message)
        return jsonify({
            'success': True,
            'message': message,
            'total': len(servers),
            'imported': success_count,
            'errors': errors
        }), 200

    except Exception as e:
        error_msg = f"Erro ao importar inventário: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({'success': False, 'message': error_msg}), 500
  


if __name__ == "__main__":
    ensure_inventory_exists()
    ensure_directory_structure()
    app.register_blueprint(inventory_bp, url_prefix='/inventory')  # Verifique esta linha
    ensure_extended_directory_structure()
    app.run(debug=True)