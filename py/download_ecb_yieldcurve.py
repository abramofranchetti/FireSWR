import os
import requests
from datetime import datetime

# Crea la cartella xml se non esiste
xml_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'xml')
os.makedirs(xml_dir, exist_ok=True)

# URL BCE
url = 'https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A+G_N_C.SV_C_YM.?lastNObservations=1'
file_path = os.path.join(xml_dir, 'data.xml')

try:
    response = requests.get(url)
    response.raise_for_status()
    with open(file_path, 'wb') as f:
        f.write(response.content)
    print(f"Scaricato con successo in {file_path}")
except Exception as e:
    print(f"Errore durante il download: {e}")
