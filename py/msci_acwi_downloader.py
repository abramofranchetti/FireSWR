import requests
import json
from datetime import datetime
import os
import sys


# ---------------------------
# PARAMETRI
# ---------------------------

INDEX_CODE = "892400"
CURRENCY = "USD"
VARIANT = "NETR"  # attenzione: potrebbe NON essere supportato
START_DATE = "20000101"

OUTPUT_FILE = "json/msci_acwi.json"


# ---------------------------
# BUILD URL
# ---------------------------

def build_url(start_date, end_date):
    return (
        "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph"
        f"?currency_symbol={CURRENCY}"
        f"&index_variant={VARIANT}"
        f"&start_date={start_date}"
        f"&end_date={end_date}"
        f"&data_frequency=DAILY"
        f"&index_codes={INDEX_CODE}"
    )


# ---------------------------
# FETCH DATA
# ---------------------------

def fetch_data():
    today = datetime.today().strftime("%Y%m%d")
    url = build_url(START_DATE, today)

    print(f"Fetching MSCI data from {START_DATE} to {today}")
    print(f"URL: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"HTTP error: {response.status_code}")

    data = response.json()

    # ---------------------------
    # GESTIONE ERRORI MSCI
    # ---------------------------
    if "error_code" in data:
        raise Exception(
            f"MSCI ERROR {data.get('error_code')}: {data.get('error_message')}"
        )

    return data


# ---------------------------
# PARSE DATA
# ---------------------------

def parse_data(data):
    try:
        raw = data["indexes"]["INDEX_LEVELS"]
    except KeyError:
        raise Exception("Formato JSON inatteso")

    result = []

    for item in raw:
        date_raw = str(item["calc_date"])  # es: 20001229

        date_formatted = datetime.strptime(date_raw, "%Y%m%d").strftime("%Y-%m-%d")

        result.append({
            "Date": date_formatted,
            "Close": str(item["level_eod"])
        })

    return result


# ---------------------------
# SAVE FILE
# ---------------------------

def save_json(data):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(f"File salvato: {OUTPUT_FILE}")


# ---------------------------
# MAIN
# ---------------------------

def main():
    try:
        data = fetch_data()
        parsed = parse_data(data)
        save_json(parsed)

    except Exception as e:
        print(f"Errore: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()