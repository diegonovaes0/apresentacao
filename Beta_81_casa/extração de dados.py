# teste_facts.py
import json
import re

output = """
ok: [[127.0.0.1]]
{
"host_details": {
"hostname": "DIEGO",
"private_ip": "172.25.9.251",
"public_ip": "128.201.194.157",
"system": "Ubuntu 22.04 (Debian)"
}
}
**PLAY RECAP ********************************************************************* ******************************************
127.0.0.1 : ok=6 changed=0 unreachable=0 failed=0 ski
"""

# Extrai os dados usando regex
json_match = re.search(r'{\s*"host_details":\s*{[^}]*}[^}]*}', output)
if json_match:
    json_str = json_match.group(0)
    try:
        data = json.loads(json_str)
        print("Dados extraídos:", data)
    except json.JSONDecodeError as e:
        print(f"Erro de formatação JSON: {e}")
        # Limpa string para tentar novamente
        cleaned_json = re.sub(r'[\n\r\t]', '', json_str)
        try:
            data = json.loads(cleaned_json)
            print("Dados extraídos após limpeza:", data)
        except:
            print("Falha mesmo após limpeza")
else:
    print("Padrão JSON não encontrado")