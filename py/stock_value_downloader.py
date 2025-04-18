import yfinance as yf
import json
import pandas as pd
import sys
import os

# Verifica che siano stati passati i parametri necessari
if len(sys.argv) != 4:
    print("Usage: python stock_value_downloader.py <stock_symbol> <file_name> <date>")

# Simbolo del cambio su Yahoo Finance
if len(sys.argv) == 1:
    # Parametri di default per il debug locale
    symbol = "AAPL"
    file_name = "apple_stock.json"
    start_date = "2022-01-01"
else:
    symbol = sys.argv[1]
    file_name = sys.argv[2]
    start_date = sys.argv[3]

print(f"Fetching data for symbol: {symbol}")

# Scaricare i dati storici
df = yf.download(symbol, start=start_date)

# Controllare se il DataFrame è vuoto
if df.empty:
    print("Nessun dato disponibile per il periodo specificato.")
    exit()

print("Data fetched successfully")

# *** Appiattire le colonne multi-livello ***
# Modifica le colonne per rimuovere la struttura multi-livello
df.columns = [col[0] if col[1] == "" else col[0] for col in df.columns]

# A questo punto, `df` avrà colonne come: ['Date', 'Close']

# Reset dell'indice per ottenere una colonna semplice per la data
df.reset_index(inplace=True)  # Rimuove l'indice gerarchico
df["Date"] = pd.to_datetime(df["Date"]).dt.date  # Converti DateTime in formato date (senza orario)

# Mantenere solo le colonne necessarie
df = df[["Date", "Close"]]

# Creare un DataFrame con tutte le date possibili
date_range = pd.date_range(start=df["Date"].min(), end=df["Date"].max())
full_df = pd.DataFrame(date_range, columns=["Date"])
full_df["Date"] = full_df["Date"].dt.date  # Converti in formato date senza ora

# *** Unione dei due DataFrame ***
# Ora che i nomi di colonna sono coerenti, esegui il merge
df = pd.merge(full_df, df, on="Date", how="left")  # Unione senza conflitti

# Riempire i valori mancanti con la chiusura del giorno precedente
df["Close"] = df["Close"].ffill()

# Convertire la colonna "Date" in stringa per il file JSON
df["Date"] = df["Date"].astype(str)

# Convertire i dati in una lista di dizionari
data_list = df.to_dict(orient="records")

# Ensure the directory exists
os.makedirs(os.path.dirname(f"json/{file_name}"), exist_ok=True)

# Salva i dati trasformati in un file JSON
file_path = f"json/{file_name}"
with open(file_path, "w") as f:
    json.dump(data_list, f, indent=2)

print(f"File salvato: {file_path}")