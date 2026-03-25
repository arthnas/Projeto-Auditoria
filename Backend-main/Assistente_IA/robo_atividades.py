botao.click()

import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import pandas as pd
from PyPDF2 import PdfReader
import os
import json

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

# Aguarda o clique no botão 🤖
botao = driver.find_element(By.ID, "botao_robo")
botao.click()

# Lê tarefa selecionada do localStorage
tarefa_json = driver.execute_script("return localStorage.getItem('tarefa_robo');")
if tarefa_json:
    tarefa = json.loads(tarefa_json)
    print('Tarefa:', tarefa['nome'])
    print('Descrição:', tarefa['descricao'])
else:
    print('Nenhuma tarefa selecionada!')

# Detecta novas abas e processa arquivos
abas_antes = driver.window_handles

def processar_aba(driver):
    url = driver.current_url
    print("Processando aba:", url)
    if "excel" in url.lower():
        print("Arquivo Excel detectado")
        # Aqui você pode clicar no botão de download do Excel
        # Exemplo: driver.find_element(By.ID, "botao_download_excel").click()
        time.sleep(5)  # Aguarda download
        arquivo = "C:/downloads/arquivo.xlsx"  # Ajuste o nome do arquivo
        if os.path.exists(arquivo):
            df = pd.read_excel(arquivo)
            print(df.head())
    elif "pdf" in url.lower():
        print("Arquivo PDF detectado")
        # driver.find_element(By.ID, "botao_download_pdf").click()
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
