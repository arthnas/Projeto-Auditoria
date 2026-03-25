# Exemplo de conexão com PostgreSQL para buscar tarefa
import psycopg2
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import pandas as pd
from PyPDF2 import PdfReader
import os

# Configurações do Chrome
options = Options()
options.add_argument("--user-data-dir=C:/Users/SEU_USUARIO/AppData/Local/Google/Chrome/User Data")
prefs = {
    "download.default_directory": "C:/downloads",  # Altere para o caminho desejado
    "download.prompt_for_download": False
}
options.add_experimental_option("prefs", prefs)

driver = webdriver.Chrome(options=options)
driver.get("URL_DO_SEU_SISTEMA")  # Altere para o endereço do seu sistema

# Função para buscar tarefa no banco

def buscar_tarefa_por_nome(nome_tarefa):
    conn = psycopg2.connect(
        dbname="NOME_DO_BANCO",
        user="USUARIO",
        password="SENHA",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    cur.execute("SELECT id, nome, descricao FROM tarefas WHERE nome = %s", (nome_tarefa,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row

# Aguarda o clique no botão 🤖
botao = driver.find_element(By.ID, "botao_robo")
botao.click()

# Captura a tarefa selecionada (exemplo: pega texto da linha selecionada)
tarefa_element = driver.find_element(By.CLASS_NAME, "linha-tarefa-selecionada")  # Ajuste para o seletor correto
nome_tarefa = tarefa_element.text
print("Tarefa selecionada:", nome_tarefa)

# Busca no banco
tarefa = buscar_tarefa_por_nome(nome_tarefa)
if tarefa:
    print(f"ID: {tarefa[0]} | Nome: {tarefa[1]} | Descrição: {tarefa[2]}")
else:
    print("Tarefa não encontrada no banco.")

# Detecta novas abas e processa arquivos
abas_antes = driver.window_handles

def processar_aba(driver):
    url = driver.current_url
    print("Processando aba:", url)
    if "excel" in url.lower():
        print("Arquivo Excel detectado")
        time.sleep(5)
        arquivo = "C:/downloads/arquivo.xlsx"
        if os.path.exists(arquivo):
            df = pd.read_excel(arquivo)
            print(df.head())
    elif "pdf" in url.lower():
        print("Arquivo PDF detectado")
        time.sleep(5)
        arquivo = "C:/downloads/arquivo.pdf"
        if os.path.exists(arquivo):
            reader = PdfReader(arquivo)
            texto = ""
            for page in reader.pages:
                texto += page.extract_text()
            print(texto)

while True:
    abas_depois = driver.window_handles
    novas_abas = [aba for aba in abas_depois if aba not in abas_antes]
    if novas_abas:
        for aba in novas_abas:
            driver.switch_to.window(aba)
            print("Nova aba detectada!")
            processar_aba(driver)
        abas_antes = abas_depois
    time.sleep(2)

# Ao finalizar, exibe modal com resultado (exemplo: usando Selenium para abrir modal)
resultado = "Resultado da análise..."  # Substitua pelo texto real
script_modal = f'''
var modal = document.createElement('div');
modal.style.position = 'fixed';
modal.style.top = '50%';
modal.style.left = '50%';
modal.style.transform = 'translate(-50%, -50%)';
modal.style.background = '#fff';
modal.style.padding = '30px';
modal.style.zIndex = 9999;
modal.style.boxShadow = '0 0 10px #0003';
modal.innerText = `{resultado}`;
document.body.appendChild(modal);
'''
driver.execute_script(script_modal)
