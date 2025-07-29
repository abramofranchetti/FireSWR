import os
import requests
from datetime import datetime

# Crea la cartella xml se non esiste
dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'xml')
os.makedirs(dir_path, exist_ok=True)

# URL del file da scaricare
url = 'https://meteo.arpa.veneto.it/meteo/bollettini/it/xml/bollettino_utenti.xml'

# Nome file con data (opzionale, qui fisso)
file_path = os.path.join(dir_path, 'bollettino_utenti.xml')

try:
    response = requests.get(url)
    response.raise_for_status()
    with open(file_path, 'wb') as f:
        f.write(response.content)
    print(f"Scaricato con successo in {file_path}")
except Exception as e:
    print(f"Errore durante il download: {e}")
